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
};

module.exports = UserModel;
