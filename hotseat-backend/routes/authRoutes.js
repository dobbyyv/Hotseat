const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { strictLimiter } = require('../middleware/rateLimiter');
const { uploadPfp, saveImage } = require('../middleware/upload');

const router = express.Router();

// Cryptographically secure, unguessable group codes.
function generateGroupCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

router.post('/join', strictLimiter, async (req, res) => {
  const { name, code } = req.body;
  if (!name || name.trim().length < 1) return res.status(400).json({ error: "Name required." });
  if (name.trim().length > 30) return res.status(400).json({ error: "Name too long. Max 30 characters." });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const avatarText = name.trim().substring(0, 2).toUpperCase();
    const userResult = await client.query(
      "INSERT INTO users (name, avatar_text) VALUES ($1, $2) RETURNING *",
      [name.trim(), avatarText]
    );
    const user = userResult.rows[0];

    let group;
    if (code && code.trim().length > 0) {
      const groupResult = await client.query(
        "SELECT * FROM groups WHERE code = $1",
        [code.trim().toUpperCase()]
      );
      if (groupResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Group not found. Check the code and try again." });
      }
      group = groupResult.rows[0];
    } else {
      let newCode;
      for (let i = 0; i < 5; i++) {
        newCode = generateGroupCode();
        const existing = await client.query("SELECT id FROM groups WHERE code = $1", [newCode]);
        if (existing.rows.length === 0) break;
      }
      const newGroupResult = await client.query(
        "INSERT INTO groups (code) VALUES ($1) RETURNING *",
        [newCode]
      );
      group = newGroupResult.rows[0];
    }

    await client.query(
      "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [user.id, group.id]
    );

    const rosterResult = await client.query(`
      SELECT users.id, users.name, users.avatar_text, users.avatar_url, group_members.streak_count
      FROM users JOIN group_members ON users.id = group_members.user_id
      WHERE group_members.group_id = $1
    `, [group.id]);

    await client.query('COMMIT');

    res.json({
      user,
      group: { id: group.id, code: group.code, name: group.name, members: rosterResult.rows }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to join." });
  } finally {
    client.release();
  }
});

router.post('/set-password', strictLimiter, async (req, res) => {
  const { user_id, password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters." });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, user_id]);
    res.json({ success: true, message: "Password locked in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post('/recover-account', strictLimiter, async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Name and password required." });

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE name = $1 AND password_hash IS NOT NULL ORDER BY id ASC",
      [name]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found or no recovery password set." });
    }

    let matchedUser = null;
    for (const u of userResult.rows) {
      const match = await bcrypt.compare(password, u.password_hash);
      if (match) { matchedUser = u; break; }
    }
    if (!matchedUser) return res.status(401).json({ error: "Incorrect password." });

    const groupsResult = await pool.query(`
      SELECT
        g.id, g.code, g.name, gm.streak_count,
        COUNT(DISTINCT gm2.user_id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
      JOIN group_members gm2 ON g.id = gm2.group_id
      GROUP BY g.id, g.code, g.name, gm.streak_count
      ORDER BY g.id ASC
    `, [matchedUser.id]);

    res.json({
      success: true,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        avatar_url: matchedUser.avatar_url,
        avatar_text: matchedUser.avatar_text,
        hasPassword: true
      },
      groups: groupsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get('/user-groups/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        g.id, g.code, g.name, gm.streak_count,
        COUNT(DISTINCT gm2.user_id) as member_count,
        (SELECT COUNT(*) FROM answers a WHERE a.group_id = g.id) as todays_answers
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
      JOIN group_members gm2 ON g.id = gm2.group_id
      GROUP BY g.id, g.code, g.name, gm.streak_count
      ORDER BY g.id ASC
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});

router.post('/upload-pfp', strictLimiter, (req, res) => {
  uploadPfp.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'Invalid image.' });
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    try {
      const filename = await saveImage(req.file.buffer, 'pfp', false);
      const fileUrl = `/uploads/${filename}`;
      await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [fileUrl, req.body.user_id]);
      res.json({ avatar_url: fileUrl });
    } catch (dbErr) {
      console.error(dbErr);
      if (dbErr && dbErr.message === 'Invalid image content.') {
        return res.status(400).json({ error: 'Invalid image.' });
      }
      res.status(500).json({ error: "DB update failed." });
    }
  });
});

module.exports = router;