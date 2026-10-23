const db = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id, includePassword = false) {
    const fields = includePassword
      ? '*'
      : 'id, email, role, name, phone, photo_url, is_verified, is_approved, created_at, updated_at';
    const [rows] = await db.execute(`SELECT ${fields} FROM users WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async create({ email, password_hash, role, name = null, phone = null, photo_url = null, is_verified = false, is_approved = false }) {
    const [result] = await db.execute(
      `INSERT INTO users (email, password_hash, role, name, phone, photo_url, is_verified, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, password_hash, role, name, phone, photo_url, is_verified ? 1 : 0, is_approved ? 1 : 0]
    );
    return result.insertId;
  },

  async updateProfile(id, { name, phone, photo_url }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (photo_url !== undefined) {
      updates.push('photo_url = ?');
      values.push(photo_url);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async updatePassword(id, password_hash) {
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );
    return result.affectedRows > 0;
  },

  async setVerified(id, is_verified = true) {
    const [result] = await db.execute(
      'UPDATE users SET is_verified = ? WHERE id = ?',
      [is_verified ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  async setApproved(id, is_approved = true) {
    const [result] = await db.execute(
      'UPDATE users SET is_approved = ? WHERE id = ?',
      [is_approved ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  async findAll({ page = 1, limit = 10, role = null, search = null, is_approved = null, is_verified = null } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (is_approved !== null && is_approved !== undefined) {
      whereConditions.push('is_approved = ?');
      params.push(is_approved ? 1 : 0);
    }

    if (is_verified !== null && is_verified !== undefined) {
      whereConditions.push('is_verified = ?');
      params.push(is_verified ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
    const total = countRows[0].total;

    if (total === 0) {
      return {
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const selectSql = `
      SELECT id, email, role, name, phone, photo_url, is_verified, is_approved, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);

    const data = rows.map((u) => ({
      ...u,
      is_verified: Boolean(u.is_verified),
      is_approved: Boolean(u.is_approved),
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },
};

module.exports = UserModel;
