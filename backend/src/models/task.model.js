/**
 * Task model — all SQL touching the `tasks` table lives here.
 */
const { query } = require('../config/db');

// Whitelist of columns the client is allowed to sort by
const SORTABLE = new Set(['created_at', 'due_date', 'status', 'title']);

function parseTask(t) {
  if (!t) return null;
  if (typeof t.attachments === 'string') {
    try {
      t.attachments = JSON.parse(t.attachments);
    } catch {
      t.attachments = [];
    }
  } else if (!t.attachments) {
    t.attachments = [];
  }

  if (typeof t.completion_attachments === 'string') {
    try {
      t.completion_attachments = JSON.parse(t.completion_attachments);
    } catch {
      t.completion_attachments = [];
    }
  } else if (!t.completion_attachments) {
    t.completion_attachments = [];
  }
  return t;
}

function formatMySqlDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const TaskModel = {
  async create({ title, description, assignedTo, status, dueDate, audioUrl, attachments }) {
    const result = await query(
      `INSERT INTO tasks (title, description, assigned_to, status, due_date, audio_url, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        assignedTo || null,
        status || 'pending',
        formatMySqlDateTime(dueDate),
        audioUrl || null,
        attachments ? JSON.stringify(attachments) : null,
      ]
    );
    return this.findById(result.insertId);
  },

  /** Single task with assignee details (JOIN). */
  async findById(id) {
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.status, t.due_date,
              t.audio_url, t.attachments, t.viewed_at, t.submitted_at, t.completed_at,
              t.completion_note, t.completion_audio, t.completion_attachments,
              t.rework_required, t.rework_reason, t.rework_requested_at,
              t.rework_requested_by, t.rework_count,
              t.created_at, t.updated_at,
              t.assigned_to,
              u.name  AS assignee_name,
              u.email AS assignee_email,
              u.position AS assignee_position,
              u.avatar AS assignee_avatar,
              u.hierarchy_rank AS assignee_rank,
              reviewer.name AS rework_requested_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users reviewer ON reviewer.id = t.rework_requested_by
       WHERE t.id = ?
       LIMIT 1`,
      [id]
    );
    return parseTask(rows[0] || null);
  },

  /**
   * Paginated, filterable list of tasks with assignee details (JOIN).
   */
  async findAll(opts = {}) {
    const {
      status,
      dueBefore,
      dueAfter,
      assignedTo,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      order = 'desc',
    } = opts;

    const where = [];
    const params = [];

    if (status === 'rework') {
      where.push('t.rework_required = TRUE');
    } else if (status) {
      where.push('t.status = ?');
      params.push(status);
    }
    if (assignedTo) {
      where.push('t.assigned_to = ?');
      params.push(assignedTo);
    }
    if (dueBefore) {
      where.push('t.due_date <= ?');
      params.push(dueBefore);
    }
    if (dueAfter) {
      where.push('t.due_date >= ?');
      params.push(dueAfter);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Sanitize sort inputs
    const sortCol = SORTABLE.has(sortBy) ? sortBy : 'created_at';
    const sortDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Total count
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM tasks t ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * safeLimit;

    const rows = await query(
      `SELECT t.id, t.title, t.description, t.status, t.due_date,
              t.audio_url, t.attachments, t.viewed_at, t.submitted_at, t.completed_at,
              t.completion_note, t.completion_audio, t.completion_attachments,
              t.rework_required, t.rework_reason, t.rework_requested_at,
              t.rework_requested_by, t.rework_count,
              t.created_at, t.updated_at,
              t.assigned_to,
              u.name  AS assignee_name,
              u.email AS assignee_email,
              u.position AS assignee_position,
              u.avatar AS assignee_avatar,
              u.hierarchy_rank AS assignee_rank,
              reviewer.name AS rework_requested_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users reviewer ON reviewer.id = t.rework_requested_by
       ${whereSql}
       ORDER BY t.${sortCol} ${sortDir}
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    const countsRows = await query(`SELECT status, COUNT(*) AS count FROM tasks GROUP BY status`);
    const statusCounts = {
      total: 0,
      pending: 0,
      in_progress: 0,
      submitted: 0,
      completed: 0,
    };
    countsRows.forEach((r) => {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status] = Number(r.count);
      }
      statusCounts.total += Number(r.count);
    });

    const data = rows.map(parseTask);

    return { data, total, page: safePage, limit: safeLimit, statusCounts };
  },

  async update(id, fields) {
    const allowed = [
      'title',
      'description',
      'status',
      'due_date',
      'assigned_to',
      'audio_url',
      'attachments',
      'viewed_at',
      'submitted_at',
      'completed_at',
      'completion_note',
      'completion_audio',
      'completion_attachments',
    ];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        let val = fields[key];
        if ((key === 'attachments' || key === 'completion_attachments') && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        if (key === 'due_date') {
          val = formatMySqlDateTime(val);
        }
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }
    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  /**
   * Called when employee opens/views task.
   * If task was 'pending', moves it to 'in_progress' and sets viewed_at = NOW().
   */
  async markViewed(id, userId) {
    await query(
      `UPDATE tasks 
       SET status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
           viewed_at = COALESCE(viewed_at, NOW())
       WHERE id = ? AND (assigned_to = ? OR ? IS NULL)`,
      [id, userId, userId]
    );
    return this.findById(id);
  },

  /**
   * Called when employee submits the result for manager approval.
   */
  async complete(id, { note, audioUrl, attachments }) {
    const attStr = attachments ? JSON.stringify(attachments) : null;
    await query(
      `UPDATE tasks 
       SET status = 'submitted',
           submitted_at = NOW(),
           completed_at = NULL,
           completion_note = ?, 
           completion_audio = ?, 
           completion_attachments = ?,
           rework_required = FALSE
       WHERE id = ?`,
      [note || null, audioUrl || null, attStr, id]
    );
    return this.findById(id);
  },

  /** Manager approves a submitted result and completes the task. */
  async approve(id) {
    await query(
      `UPDATE tasks
       SET status = 'completed',
           completed_at = NOW(),
           rework_required = FALSE
       WHERE id = ?`,
      [id]
    );
    return this.findById(id);
  },

  /** Return a completed task to the employee for rework. */
  async sendToRework(id, { reason, requestedBy }) {
    await query(
      `UPDATE tasks
       SET status = 'in_progress',
           completed_at = NULL,
           rework_required = TRUE,
           rework_reason = ?,
           rework_requested_at = NOW(),
           rework_requested_by = ?,
           rework_count = rework_count + 1
       WHERE id = ?`,
      [reason, requestedBy, id]
    );
    return this.findById(id);
  },
};

module.exports = TaskModel;
