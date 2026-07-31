const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function scheduleDailyDrop() {
  cron.schedule('0 9 * * *', async () => {
    console.log("\n9am daily drop started");

    try {
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      const dayOfWeek = today.getDay();

      console.log("archiving yesterday's answers...");
      await pool.query(`
        INSERT INTO answers_archive
          (user_id, user_name, group_id, question_id, question_text, question_text_it, question_date, answer_text, submitted_at)
        SELECT
          a.user_id, u.name, a.group_id, a.question_id,
          COALESCE(q.injected_text, q.text),
          COALESCE(q.injected_text_it, q.text_it),
          CURRENT_DATE - INTERVAL '1 day', a.answer_text, a.submitted_at
        FROM answers a
        JOIN users u ON a.user_id = u.id
        JOIN questions q ON a.question_id = q.id
      `);

      await pool.query("DELETE FROM answers");
      await pool.query("DELETE FROM daily_chat");

      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          if (file.startsWith('chat-')) {
            try { fs.unlinkSync(path.join(uploadsDir, file)); } catch { /* file may already be gone */ }
          }
        }
      }

      let queryFilter;
      if (dayOfYear % 10 === 0) {
        queryFilter = "is_targeted = true";
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        queryFilter = "ui_type = 'tag' AND is_targeted = false";
      } else {
        queryFilter = "ui_type IN ('text', 'slider', 'choice') AND is_targeted = false";
      }

      await pool.query("UPDATE questions SET is_active = false, injected_text = NULL, injected_text_it = NULL");

      let qRes = await pool.query(
        `SELECT * FROM questions WHERE used_date IS NULL AND ${queryFilter} ORDER BY RANDOM() LIMIT 1`
      );

      if (qRes.rows.length === 0) {
        qRes = await pool.query("SELECT * FROM questions WHERE used_date IS NULL ORDER BY RANDOM() LIMIT 1");
      }
      if (qRes.rows.length === 0) {
        console.log("question bank exhausted. resetting...");
        await pool.query("UPDATE questions SET used_date = NULL");
        qRes = await pool.query("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1");
      }
      if (qRes.rows.length === 0) return console.log("no questions in db.");

      const q = qRes.rows[0];
      let finalEn = q.text;
      let finalIt = q.text_it;

      if (q.is_targeted) {
        const targetRes = await pool.query(`
          SELECT u.* FROM users u
          WHERE EXISTS (
            SELECT 1 FROM answers_archive aa
            WHERE aa.user_id = u.id AND aa.question_date >= NOW() - INTERVAL '60 days'
          )
          ORDER BY u.last_targeted_at ASC NULLS FIRST LIMIT 1
        `);

        const candidateRes = targetRes.rows.length > 0
          ? targetRes
          : await pool.query("SELECT * FROM users ORDER BY last_targeted_at ASC NULLS FIRST LIMIT 1");

        if (candidateRes.rows.length > 0) {
          const target = candidateRes.rows[0];
          console.log(`target: ${target.name}`);
          finalEn = finalEn.replace(/\{TARGET\}/g, target.name);
          if (finalIt) finalIt = finalIt.replace(/\{TARGET\}/g, target.name);
          await pool.query("UPDATE users SET last_targeted_at = NOW() WHERE id = $1", [target.id]);
        }
      }

      await pool.query(
        "UPDATE questions SET is_active = true, used_date = CURRENT_DATE, injected_text = $1, injected_text_it = $2 WHERE id = $3",
        [finalEn, finalIt, q.id]
      );
      console.log(`drop: "${finalEn}"`);

      const webpush = require('web-push');
      const allSubs = await pool.query("SELECT user_id, subscription FROM push_subscriptions");
      const payload = JSON.stringify({
        title: 'Daily question is live!',
        body: finalEn.length > 60 ? finalEn.substring(0, 57) + '...' : finalEn,
        url: '/'
      });

      for (const row of allSubs.rows) {
        webpush.sendNotification(row.subscription, payload).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            pool.query("DELETE FROM push_subscriptions WHERE user_id = $1", [row.user_id]);
          }
        });
      }

    } catch (err) {
      console.error("cron failed:", err);
    }
  }, { timezone: "Europe/Rome" });
}

module.exports = { scheduleDailyDrop };