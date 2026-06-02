/**
 * ActivityLog model (bonus) — records who did what, when.
 * Reads use a JOIN to include the actor's name.
 */
const { query } = require('../config/db');

const ActivityLogModel = {
  async create({ userId, action, entity, entityId, details }) {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, entity, entityId ?? null, details ?? null]
    );
  },

  async findRecent(limit = 50) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
    return query(
      `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.created_at,
              u.name AS actor_name
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT ${safeLimit}`
    );
  },
};

module.exports = ActivityLogModel;
