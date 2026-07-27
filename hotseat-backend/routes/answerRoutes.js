const express = require('express');
const { pool } = require('../config/db');
const { strictLimiter, suggestionLimiter } = require('../middleware/rateLimiter');
const { broadcastToGroup } = require('../sockets/socketHandler');

const router = express.Router();

// GET /api/daily-question — return the currently active question
router.get('/daily-question', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM questions WHERE is_active = true");
    if (result.rows.length === 0) return res.status(404).json({ error: "No active question" });
    const q = result.rows[0];
    res.json({
      ...q,
      text: q.injected_text || q.text,
      text_it: q.injected_text_it || q.text_it,
      type: q.ui_type
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/answer — submit today's answer for a group
router.post('/answer', strictLimiter, async (req, res) => {
  const { user_id, group_id, question_id, answer_text } = req.body;
  if (!answer_text || answer_text.trim().length === 0) return res.status(400).json({ error: "Answer cannot be empty." });
  if (answer_text.length > 1000) return res.status(400).json({ error: "Answer too long." });

  try {
    const memberCheck = await pool.query(
      "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
      [user_id, group_id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }

    await pool.query(
      "INSERT INTO answers (user_id, group_id, question_id, answer_text) VALUES ($1, $2, $3, $4)",
      [user_id, group_id, question_id, answer_text.trim()]
    );
    await pool.query(`
      UPDATE group_members
      SET
        streak_count = CASE
          WHEN last_answered_date = (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '9 hours')::DATE THEN streak_count
          WHEN last_answered_date = (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '9 hours')::DATE - INTERVAL '1 day' THEN streak_count + 1
          ELSE 1
        END,
        last_answered_date = (NOW() AT TIME ZONE 'Europe/Rome' - INTERVAL '9 hours')::DATE
      WHERE user_id = $1 AND group_id = $2
    `, [user_id, group_id]);

    const ioInstance = req.app.get('io');
    if (ioInstance) ioInstance.to(String(group_id)).emit('answer_submitted');

    broadcastToGroup(group_id, user_id, 'Hotseat', 'Someone just dropped an answer!', '/');

    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "Already answered today." });
    console.error("/api/answer error:", err.message);
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

// GET /api/answers/:group_id/:question_id — fetch answers (requires group membership)
router.get('/answers/:group_id/:question_id', async (req, res) => {
  const { group_id, question_id } = req.params;
  const userId = parseInt(req.query.user_id, 10);

  // Verify group membership before serving data
  if (userId) {
    const memberCheck = await pool.query(
      "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
      [userId, group_id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }
  }

  try {
    const result = await pool.query(`
      SELECT
        users.id as user_id, users.name, users.avatar_text, users.avatar_url,
        answers.answer_text, answers.submitted_at
      FROM answers
      JOIN users ON answers.user_id = users.id
      WHERE answers.group_id = $1 AND answers.question_id = $2
      ORDER BY answers.submitted_at ASC
    `, [group_id, question_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch error." });
  }
});

// POST /api/suggest-question — user-submitted question idea
router.post('/suggest-question', suggestionLimiter, async (req, res) => {
  const { user_name, question_text } = req.body;
  if (!question_text || question_text.trim().length < 5) {
    return res.status(400).json({ error: "Question too short." });
  }
  if (question_text.trim().length > 300) {
    return res.status(400).json({ error: "Question too long. Max 300 characters." });
  }
  try {
    await pool.query(
      "INSERT INTO suggested_questions (user_name, question_text) VALUES ($1, $2)",
      [user_name || 'Anonymous', question_text.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Suggestion error:", err.message);
    res.status(500).json({ error: "Failed to save suggestion." });
  }
});

// POST /api/push/subscribe — store push notification subscription
router.post('/push/subscribe', async (req, res) => {
  const { user_id, subscription } = req.body;
  if (!user_id || !subscription) return res.status(400).json({ error: 'Missing parameters.' });
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [user_id, JSON.stringify(subscription)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// GET /api/calendar/:group_id — list dates with archived answers
router.get('/calendar/:group_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT question_date, question_text, question_text_it, COUNT(*) as answer_count
      FROM answers_archive WHERE group_id = $1
      GROUP BY question_date, question_text, question_text_it
      ORDER BY question_date DESC
    `, [req.params.group_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Calendar fetch failed." });
  }
});

// GET /api/calendar/:group_id/:date — archived answers for a specific date
router.get('/calendar/:group_id/:date', async (req, res) => {
  const { group_id, date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  try {
    const result = await pool.query(`
      SELECT user_name, answer_text, submitted_at, question_text, question_text_it
      FROM answers_archive WHERE group_id = $1 AND question_date = $2
      ORDER BY submitted_at ASC
    `, [group_id, date]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Day fetch failed." });
  }
});

// GET /api/recap/:group_id/:period — weekly/monthly recap stats
router.get('/recap/:group_id/:period', async (req, res) => {
  const { group_id, period } = req.params;
  if (!['weekly', 'monthly'].includes(period)) {
    return res.status(400).json({ error: "Period must be 'weekly' or 'monthly'." });
  }

  const days = period === 'monthly' ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];

  try {
    const [mvpRes, novelistRes, ghostRes, speedsterRes, hottestRes, statsRes] = await Promise.all([
      pool.query(`SELECT user_name, COUNT(*) as count FROM answers_archive WHERE group_id = $1 AND question_date >= $2 GROUP BY user_name ORDER BY count DESC LIMIT 1`, [group_id, sinceDate]),
      pool.query(`SELECT user_name, ROUND(AVG(LENGTH(answer_text))) as avg_len, MAX(LENGTH(answer_text)) as max_len FROM answers_archive WHERE group_id = $1 AND question_date >= $2 GROUP BY user_name ORDER BY avg_len DESC LIMIT 1`, [group_id, sinceDate]),
      pool.query(`SELECT user_name, COUNT(*) as count FROM answers_archive WHERE group_id = $1 AND question_date >= $2 GROUP BY user_name ORDER BY count ASC LIMIT 1`, [group_id, sinceDate]),
      pool.query(`WITH ranked AS (SELECT user_name, question_date, ROW_NUMBER() OVER (PARTITION BY question_date ORDER BY submitted_at ASC) as rn FROM answers_archive WHERE group_id = $1 AND question_date >= $2) SELECT user_name, COUNT(*) as first_count FROM ranked WHERE rn = 1 GROUP BY user_name ORDER BY first_count DESC LIMIT 1`, [group_id, sinceDate]),
      pool.query(`SELECT question_date, question_text, COUNT(*) as count FROM answers_archive WHERE group_id = $1 AND question_date >= $2 GROUP BY question_date, question_text ORDER BY count DESC LIMIT 1`, [group_id, sinceDate]),
      pool.query(`SELECT COUNT(*) as total_answers, COUNT(DISTINCT user_name) as unique_participants, COUNT(DISTINCT question_date) as days_active FROM answers_archive WHERE group_id = $1 AND question_date >= $2`, [group_id, sinceDate]),
    ]);

    res.json({
      period, days, since: sinceDate,
      mvp: mvpRes.rows[0] || null,
      novelist: novelistRes.rows[0] || null,
      ghost: ghostRes.rows[0] || null,
      speedster: speedsterRes.rows[0] || null,
      hottest_day: hottestRes.rows[0] || null,
      stats: statsRes.rows[0] || null,
    });
  } catch (err) {
    console.error("Recap error:", err);
    res.status(500).json({ error: "Recap failed." });
  }
});

module.exports = router;