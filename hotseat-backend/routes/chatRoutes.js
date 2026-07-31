const express = require('express');
const { pool } = require('../config/db');
const { strictLimiter } = require('../middleware/rateLimiter');
const { uploadChat } = require('../middleware/upload');

const router = express.Router();

router.get('/chat/:group_id', async (req, res) => {
  const { group_id } = req.params;
  const userId = parseInt(req.query.user_id, 10);

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
    const result = await pool.query(
      "SELECT * FROM daily_chat WHERE group_id = $1 ORDER BY created_at ASC",
      [group_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat." });
  }
});

router.post('/chat-image', strictLimiter, (req, res) => {
  uploadChat.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;