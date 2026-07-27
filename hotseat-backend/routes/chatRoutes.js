const express = require('express');
const { pool } = require('../config/db');
const { strictLimiter } = require('../middleware/rateLimiter');
const { uploadChat } = require('../middleware/upload');

const router = express.Router();

// GET /api/chat/:group_id — fetch today's chat messages
router.get('/chat/:group_id', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM daily_chat WHERE group_id = $1 ORDER BY created_at ASC",
      [req.params.group_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat." });
  }
});

// POST /api/chat-image — upload an image to the group chat
router.post('/chat-image', strictLimiter, (req, res) => {
  uploadChat.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;