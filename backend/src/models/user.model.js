/**
 * User model — all SQL touching the `users` table lives here.
 * Keeping queries in the model layer keeps services free of raw SQL.
 */
const { query } = require('../config/db');

const UserModel = {
  async create({ name, email, passwordHash, role }) {
    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );
    return { id: result.insertId, name, email, role };
  },

  async findByEmail(email) {
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  /** List all users. Optionally filter by role (e.g. only employees). */
  async findAll({ role } = {}) {
    if (role) {
      return query(
        'SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY name ASC',
        [role]
      );
    }
    return query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name ASC'
    );
  },
};

module.exports = UserModel;
