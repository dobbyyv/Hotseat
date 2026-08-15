const express = require('express');
const { pool } = require('../config/db');
const { strictLimiter } = require('../middleware/rateLimiter');
const { uploadChat, saveImage } = require('../middleware/upload');
const { requireGroupMember } = require('../middleware/requireMember');

const router = express.Router();

router.get('/chat/:group_id', requireGroupMember, async (req, res) => {
  const { group_id } = req.params;
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
    if (err) return res.status(400).json({ error: 'Invalid image.' });
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    try {
      const filename = await saveImage(req.file.buffer, 'chat', true);
      res.json({ url: `/uploads/${filename}` });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Invalid image.' });
    }
  });
});

module.exports = router;
