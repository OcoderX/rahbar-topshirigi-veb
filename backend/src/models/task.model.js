/**
 * Task model — all SQL touching the `tasks` table lives here.
 *
 * Several reads use a JOIN against `users` so the API can return the
 * assignee's name/email alongside each task (satisfies the "at least one
 * API must use a SQL JOIN" requirement).
 */
const { query } = require('../config/db');

// Whitelist of columns the client is allowed to sort by — prevents SQL
// injection through the `sortBy` query param (column names can't be parameterized).
const SORTABLE = new Set(['created_at', 'due_date', 'status', 'title']);

const TaskModel = {
  async create({ title, description, assignedTo, status, dueDate }) {
    const result = await query(
      `INSERT INTO tasks (title, description, assigned_to, status, due_date)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, assignedTo, status, dueDate]
    );
    return this.findById(result.insertId);
  },

  /** Single task with assignee details (JOIN). */
  async findById(id) {
    const rows = await query(
      `SELECT t.id, t.title, t.description, t.status, t.due_date,
              t.created_at, t.updated_at,
              t.assigned_to,
              u.name  AS assignee_name,
              u.email AS assignee_email
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Paginated, filterable list of tasks with assignee details (JOIN).
   * @param {object} opts
   * @param {string} [opts.status]      filter by status
   * @param {string} [opts.dueBefore]   tasks due on/before this date (YYYY-MM-DD)
   * @param {string} [opts.dueAfter]    tasks due on/after this date (YYYY-MM-DD)
   * @param {number} [opts.assignedTo]  restrict to one employee
   * @param {number} [opts.page]        1-based page number
   * @param {number} [opts.limit]       page size
   * @param {string} [opts.sortBy]      column to sort by
   * @param {string} [opts.order]       'asc' | 'desc'
   * @returns {Promise<{data: object[], total: number, page: number, limit: number}>}
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

    if (status) {
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

    // Sanitize sort inputs (can't be parameterized).
    const sortCol = SORTABLE.has(sortBy) ? sortBy : 'created_at';
    const sortDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Total count for pagination metadata.
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM tasks t ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    // LIMIT/OFFSET are injected as numbers (validated upstream) because some
    // MySQL versions reject placeholders in LIMIT under prepared statements.
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * safeLimit;

    const data = await query(
      `SELECT t.id, t.title, t.description, t.status, t.due_date,
              t.created_at, t.updated_at,
              t.assigned_to,
              u.name  AS assignee_name,
              u.email AS assignee_email
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       ${whereSql}
       ORDER BY t.${sortCol} ${sortDir}
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    return { data, total, page: safePage, limit: safeLimit };
  },

  async update(id, fields) {
    const allowed = ['title', 'description', 'status', 'due_date', 'assigned_to'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }
    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },
};

module.exports = TaskModel;
