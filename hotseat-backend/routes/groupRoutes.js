const express = require('express');
const { pool } = require('../config/db');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/join-group — add user to existing group by code
router.post('/join-group', strictLimiter, async (req, res) => {
  const { user_id, code } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required." });
  if (!code || code.trim().length === 0) return res.status(400).json({ error: "Group code required." });

  try {
    const userCheck = await pool.query("SELECT id, name, avatar_text, avatar_url FROM users WHERE id = $1", [user_id]);
    if (userCheck.rows.length === 0) return res.status(404).json({ error: "User not found." });

    const groupResult = await pool.query(
      "SELECT * FROM groups WHERE code = $1",
      [code.trim().toUpperCase()]
    );
    if (groupResult.rows.length === 0) return res.status(404).json({ error: "Group not found. Check the code." });
    const group = groupResult.rows[0];

    const alreadyMember = await pool.query(
      "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
      [user_id, group.id]
    );
    if (alreadyMember.rows.length > 0) {
      return res.status(400).json({ error: "You're already in this group." });
    }

    await pool.query(
      "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
      [user_id, group.id]
    );

    const rosterResult = await pool.query(`
      SELECT users.id, users.name, users.avatar_text, users.avatar_url, group_members.streak_count
      FROM users JOIN group_members ON users.id = group_members.user_id
      WHERE group_members.group_id = $1
    `, [group.id]);

    res.json({
      success: true,
      group: { id: group.id, code: group.code, name: group.name, members: rosterResult.rows }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join group." });
  }
});

// POST /api/create-group — create a new group
router.post('/create-group', strictLimiter, async (req, res) => {
  const { user_id, group_name } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id required." });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userCheck = await client.query("SELECT id FROM users WHERE id = $1", [user_id]);
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User not found." });
    }

    let newCode;
    for (let i = 0; i < 5; i++) {
      newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await client.query("SELECT id FROM groups WHERE code = $1", [newCode]);
      if (existing.rows.length === 0) break;
    }

    const newGroupResult = await client.query(
      "INSERT INTO groups (code, name) VALUES ($1, $2) RETURNING *",
      [newCode, group_name?.trim() || null]
    );
    const group = newGroupResult.rows[0];

    await client.query(
      "INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)",
      [user_id, group.id]
    );
    await client.query('COMMIT');

    res.json({
      success: true,
      group: { id: group.id, code: group.code, name: group.name, members: [] }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to create group." });
  } finally {
    client.release();
  }
});

// POST /api/leave-group — leave a group
router.post('/leave-group', async (req, res) => {
  const { user_id, group_id } = req.body;
  if (!user_id || !group_id) return res.status(400).json({ error: "user_id and group_id required." });
  try {
    await pool.query("DELETE FROM group_members WHERE user_id = $1 AND group_id = $2", [user_id, group_id]);
    await pool.query("DELETE FROM answers WHERE user_id = $1 AND group_id = $2", [user_id, group_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to leave." });
  }
});

// POST /api/update-group — rename a group (requires group membership)
router.post('/update-group', strictLimiter, async (req, res) => {
  const { group_id, name, user_id } = req.body;
  if (!name || name.trim().length === 0) return res.status(400).json({ error: "Invalid name." });
  if (name.trim().length > 50) return res.status(400).json({ error: "Group name too long. Max 50 characters." });

  // Verify the requester is a member of the group
  if (user_id) {
    const memberCheck = await pool.query(
      "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
      [user_id, group_id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "You are not a member of this group." });
    }
  }

  try {
    await pool.query("UPDATE groups SET name = $1 WHERE id = $2", [name.trim(), group_id]);
    const ioInstance = req.app.get('io');
    if (ioInstance) ioInstance.to(String(group_id)).emit('group_name_updated', { newName: name.trim() });
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to rename." });
  }
});

// POST /api/admin/kick-member — kick a user from a group
router.post('/admin/kick-member', async (req, res) => {
  const { requester_user_id, target_user_id, group_id } = req.body;
  if (!requester_user_id || !target_user_id || !group_id) return res.status(400).json({ error: "Missing parameters." });

  const requesterCheck = await pool.query(
    "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
    [requester_user_id, group_id]
  );
  if (requesterCheck.rows.length === 0) {
    return res.status(403).json({ error: "You are not a member of this group." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query("DELETE FROM answers WHERE user_id = $1 AND group_id = $2", [target_user_id, group_id]);
    await client.query("DELETE FROM group_members WHERE user_id = $1 AND group_id = $2", [target_user_id, group_id]);

    const otherGroups = await client.query(
      "SELECT COUNT(*) as count FROM group_members WHERE user_id = $1",
      [target_user_id]
    );
    if (parseInt(otherGroups.rows[0].count) === 0) {
      await client.query("DELETE FROM users WHERE id = $1", [target_user_id]);
    }

    await client.query('COMMIT');

    const ioInstance = req.app.get('io');
    if (ioInstance) ioInstance.to(String(group_id)).emit('user_kicked', { target_user_id });

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Failed to kick." });
  } finally {
    client.release();
  }
});

// GET /api/group-members/:group_id — list group members
router.get('/group-members/:group_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.id, users.name, users.avatar_text, users.avatar_url, group_members.streak_count
      FROM users JOIN group_members ON users.id = group_members.user_id
      WHERE group_members.group_id = $1
    `, [req.params.group_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch members." });
  }
});

module.exports = router;