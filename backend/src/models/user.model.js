/**
 * User model — all SQL touching the `users` table lives here.
 * Keeping queries in the model layer keeps services free of raw SQL.
 */
const { query } = require('../config/db');

const UserModel = {
  async create({
    name,
    email,
    passwordHash,
    role,
    position,
    hierarchyRank,
    territoryType,
    region,
    district,
    avatar,
  }) {
    const result = await query(
      `INSERT INTO users
        (name, email, password, role, position, hierarchy_rank, territory_type, region, district, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        passwordHash,
        role || 'employee',
        position || 'Xodim',
        hierarchyRank ?? 4,
        territoryType || 'region',
        region || 'Andijon viloyati',
        district || null,
        avatar || null,
      ]
    );
    return {
      id: result.insertId,
      name,
      email,
      role: role || 'employee',
      position: position || 'Xodim',
      hierarchy_rank: hierarchyRank ?? 4,
      territory_type: territoryType || 'region',
      region: region || 'Andijon viloyati',
      district: district || null,
      avatar: avatar || null,
    };
  },

  async findByEmail(email) {
    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(
      `SELECT id, name, email, role, position, hierarchy_rank,
              territory_type, region, district, avatar, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** List all users. Optionally filter by role or exclude role. Ordered by hierarchy_rank ASC, name ASC. */
  async findAll(opts = {}) {
    const role = typeof opts === 'string' ? opts : opts?.role;
    const excludeRole = typeof opts === 'object' ? opts?.excludeRole : null;

    if (role) {
      return query(
        `SELECT id, name, email, role, position, hierarchy_rank,
                territory_type, region, district, avatar, created_at
         FROM users WHERE role = ?
         ORDER BY territory_type ASC, district ASC, hierarchy_rank ASC, name ASC`,
        [role]
      );
    }
    if (excludeRole) {
      return query(
        `SELECT id, name, email, role, position, hierarchy_rank,
                territory_type, region, district, avatar, created_at
         FROM users WHERE role != ?
         ORDER BY territory_type ASC, district ASC, hierarchy_rank ASC, name ASC`,
        [excludeRole]
      );
    }
    return query(
      `SELECT id, name, email, role, position, hierarchy_rank,
              territory_type, region, district, avatar, created_at
       FROM users
       ORDER BY territory_type ASC, district ASC, hierarchy_rank ASC, name ASC`
    );
  },

  async updateProfile(id, { name, position, avatar }) {
    const fields = [];
    const params = [];
    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (position !== undefined) {
      fields.push('position = ?');
      params.push(position);
    }
    if (avatar !== undefined) {
      fields.push('avatar = ?');
      params.push(avatar);
    }
    if (fields.length) {
      params.push(id);
      await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return this.findById(id);
  },
};

module.exports = UserModel;
