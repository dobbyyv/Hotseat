const { pool } = require('../config/db');

// Mandatory group membership guard for group-scoped GET routes.
// Reads `user_id` from the query string and `group_id` from the URL param.
// Rejects anonymous requests (no user_id) and non-members, closing the
// IDOR that previously allowed unauthenticated enumeration of group data.
async function requireGroupMember(req, res, next) {
  const userId = parseInt(req.query.user_id, 10);
  const groupId = parseInt(req.params.group_id, 10);

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!groupId) {
    return res.status(400).json({ error: 'Invalid group.' });
  }

  try {
    const result = await pool.query(
      'SELECT 1 FROM group_members WHERE user_id = $1 AND group_id = $2',
      [userId, groupId]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }
    next();
  } catch (err) {
    console.error('[security] membership check failed:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { requireGroupMember };
