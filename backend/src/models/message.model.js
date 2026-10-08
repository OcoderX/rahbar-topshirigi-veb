/**
 * Message model — SQL queries for 1-to-1 and task messaging.
 */
const { query } = require('../config/db');

const MessageModel = {
  /**
   * Insert a new message (text and/or voice note).
   */
  async create({ senderId, receiverId, taskId, message, audioUrl }) {
    const res = await query(
      `INSERT INTO messages (sender_id, receiver_id, task_id, message, audio_url)
       VALUES (?, ?, ?, ?, ?)`,
      [senderId, receiverId, taskId || null, message || null, audioUrl || null]
    );
    return this.findById(res.insertId);
  },

  /**
   * Find single message by ID with sender and receiver details.
   */
  async findById(id) {
    const rows = await query(
      `SELECT m.*,
              s.name AS sender_name, s.avatar AS sender_avatar, s.role AS sender_role, s.position AS sender_position,
              r.name AS receiver_name, r.avatar AS receiver_avatar, r.role AS receiver_role, r.position AS receiver_position,
              t.title AS task_title, t.status AS task_status
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       LEFT JOIN tasks t ON t.id = m.task_id
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Get complete conversation between two users (chat history).
   */
  async getConversation(userAId, userBId) {
    const rows = await query(
      `SELECT m.*,
              s.name AS sender_name, s.avatar AS sender_avatar, s.role AS sender_role, s.position AS sender_position,
              r.name AS receiver_name, r.avatar AS receiver_avatar, r.role AS receiver_role, r.position AS receiver_position,
              t.title AS task_title, t.status AS task_status
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       LEFT JOIN tasks t ON t.id = m.task_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userAId, userBId, userBId, userAId]
    );
    return rows;
  },

  /**
   * Get conversations overview (Facebook-style inbox list) for a user.
   * Returns a list of dialog partners with their latest message and unread count.
   */
  async getConversationsList(userId) {
    // 1. Find all distinct partners
    const sql = `
      SELECT 
        u.id, u.name, u.email, u.role, u.position, u.avatar, u.district, u.region,
        last_m.id AS last_message_id,
        last_m.message AS last_message,
        last_m.audio_url AS last_audio_url,
        last_m.sender_id AS last_sender_id,
        last_m.created_at AS last_message_at,
        last_m.task_id AS last_task_id,
        t.title AS last_task_title,
        COALESCE(unread.unread_count, 0) AS unread_count
      FROM users u
      INNER JOIN (
        SELECT 
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id,
          MAX(id) AS max_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY partner_id
      ) p ON p.partner_id = u.id
      INNER JOIN messages last_m ON last_m.id = p.max_id
      LEFT JOIN tasks t ON t.id = last_m.task_id
      LEFT JOIN (
        SELECT sender_id, COUNT(*) AS unread_count
        FROM messages
        WHERE receiver_id = ? AND is_read = FALSE
        GROUP BY sender_id
      ) unread ON unread.sender_id = u.id
      ORDER BY last_m.created_at DESC
    `;

    return query(sql, [userId, userId, userId, userId]);
  },

  /**
   * Get unread messages count for a user.
   */
  async getUnreadCount(userId) {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM messages
       WHERE receiver_id = ? AND is_read = FALSE`,
      [userId]
    );
    return rows[0] ? Number(rows[0].total) : 0;
  },

  /**
   * Mark all unread messages from a partner to this user as read.
   */
  async markAsRead(userId, partnerId) {
    await query(
      `UPDATE messages
       SET is_read = TRUE, read_at = NOW()
       WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE`,
      [userId, partnerId]
    );
  },

  /**
   * Get messages attached to a specific task.
   */
  async getTaskMessages(taskId) {
    const rows = await query(
      `SELECT m.*,
              s.name AS sender_name, s.avatar AS sender_avatar, s.role AS sender_role, s.position AS sender_position,
              r.name AS receiver_name, r.avatar AS receiver_avatar
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       WHERE m.task_id = ?
       ORDER BY m.created_at ASC`,
      [taskId]
    );
    return rows;
  },

  /**
   * Update message text and record edit in history.
   */
  async updateMessage(id, newMessage, editorId) {
    const current = await this.findById(id);
    if (!current) return null;

    // Record old message in history
    await query(
      `INSERT INTO message_edits (message_id, old_message, new_message, edited_by)
       VALUES (?, ?, ?, ?)`,
      [id, current.message || '', newMessage, editorId]
    );

    // Update message
    await query(
      `UPDATE messages
       SET message = ?, is_edited = TRUE, edited_at = NOW()
       WHERE id = ?`,
      [newMessage, id]
    );

    return this.findById(id);
  },

  /**
   * Get edit versions history for a message.
   */
  async getEditHistory(messageId) {
    const rows = await query(
      `SELECT me.*,
              u.name AS editor_name, u.avatar AS editor_avatar, u.role AS editor_role
       FROM message_edits me
       JOIN users u ON u.id = me.edited_by
       WHERE me.message_id = ?
       ORDER BY me.created_at ASC`,
      [messageId]
    );
    return rows;
  },
};

module.exports = MessageModel;
