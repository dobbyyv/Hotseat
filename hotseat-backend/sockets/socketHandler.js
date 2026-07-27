const { pool } = require('../config/db');
const webpush = require('web-push');
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = require('../config/env');

// Initialize VAPID details once at module scope
webpush.setVapidDetails(
  'mailto:' + VAPID_EMAIL.replace(/^mailto:/i, ''),
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * Sends a push notification to all group members except the sender.
 * Stale subscriptions (410/404) are automatically removed from the database.
 */
async function broadcastToGroup(groupId, senderId, title, body, targetUrl = '/') {
  try {
    const result = await pool.query(`
      SELECT ps.subscription, ps.user_id
      FROM push_subscriptions ps
      JOIN group_members gm ON ps.user_id = gm.user_id
      WHERE gm.group_id = $1 AND ps.user_id != $2
    `, [groupId, senderId]);

    const payload = JSON.stringify({ title, body, url: targetUrl });

    for (const row of result.rows) {
      webpush.sendNotification(row.subscription, payload).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          pool.query("DELETE FROM push_subscriptions WHERE user_id = $1", [row.user_id]);
        }
      });
    }
  } catch (err) {
    console.error('[Push] Broadcast error:', err);
  }
}

/**
 * Attaches Socket.io event handlers for room management and real-time chat.
 * Membership validation is performed against the database on every room join.
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', async (data) => {
      const { groupId, userId } = data || {};
      if (!groupId || !userId) return;

      try {
        const membership = await pool.query(
          "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
          [userId, groupId]
        );
        if (membership.rows.length === 0) {
          console.warn(`WS: blocked join_room for user ${userId} on group ${groupId} — not a member`);
          return;
        }
        socket.join(String(groupId));
      } catch (err) {
        console.error("WS join_room error:", err);
      }
    });

    socket.on('leave_room', (data) => {
      const groupId = data?.groupId || data;
      socket.leave(String(groupId));
    });

    socket.on('typing_start', async (data) => {
      // Validate group membership before broadcasting typing event
      const { group_id, user_id } = data || {};
      if (!group_id || !user_id) return;
      try {
        const memberCheck = await pool.query(
          "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
          [user_id, group_id]
        );
        if (memberCheck.rows.length === 0) return;
        socket.to(String(group_id)).emit('user_typing', data);
      } catch (err) {
        console.error("WS typing_start validation error:", err);
      }
    });

    socket.on('typing_end', async (data) => {
      const { group_id, user_id } = data || {};
      if (!group_id || !user_id) return;
      try {
        const memberCheck = await pool.query(
          "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
          [user_id, group_id]
        );
        if (memberCheck.rows.length === 0) return;
        socket.to(String(group_id)).emit('user_stopped_typing', data);
      } catch (err) {
        console.error("WS typing_end validation error:", err);
      }
    });

    socket.on('send_message', async (data) => {
      const { group_id, user_id } = data || {};
      if (!group_id || !user_id) return;

      // Validate group membership before broadcasting and persisting
      try {
        const memberCheck = await pool.query(
          "SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2",
          [user_id, group_id]
        );
        if (memberCheck.rows.length === 0) {
          console.warn(`WS: blocked send_message for user ${user_id} on group ${group_id} — not a member`);
          return;
        }
      } catch (err) {
        console.error("WS send_message validation error:", err);
        return;
      }

      // Broadcast to all other clients in the room
      socket.to(String(group_id)).emit('receive_message', data);

      // Persist to daily_chat
      try {
        await pool.query(
          `INSERT INTO daily_chat (id, group_id, user_id, name, avatar_url, avatar_text, type, text, media_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [data.id, group_id, user_id, data.name, data.avatar_url,
           data.avatar_text, data.type, data.text, data.media_url]
        );
      } catch (e) {
        console.error("Chat save failed:", e);
      }
    });
  });
}

module.exports = { registerSocketHandlers, broadcastToGroup };