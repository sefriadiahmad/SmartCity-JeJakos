const db = require('../config/db');

const ReviewModel = {
  async findAll({ page = 1, limit = 10, kos_id = null, user_id = null, is_moderated = null, search = null } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (kos_id) {
      whereConditions.push('rv.kos_id = ?');
      params.push(parseInt(kos_id, 10));
    }

    if (user_id) {
      whereConditions.push('rv.user_id = ?');
      params.push(parseInt(user_id, 10));
    }

    if (is_moderated !== null && is_moderated !== undefined) {
      whereConditions.push('rv.is_moderated = ?');
      params.push(is_moderated ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(rv.content LIKE ? OR u.name LIKE ? OR k.name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM reviews rv
      JOIN users u ON rv.user_id = u.id
      JOIN kos k ON rv.kos_id = k.id
      ${whereClause}
    `;
    const [countRows] = await db.execute(countSql, params);
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
      SELECT 
        rv.id, rv.kos_id, rv.booking_id, rv.user_id, rv.rating, rv.content,
        rv.is_moderated, rv.created_at,
        u.name AS user_name, u.email AS user_email, u.photo_url AS user_photo,
        k.name AS kos_name, k.owner_id
      FROM reviews rv
      JOIN users u ON rv.user_id = u.id
      JOIN kos k ON rv.kos_id = k.id
      ${whereClause}
      ORDER BY rv.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);

    const data = rows.map((r) => ({
      ...r,
      rating: parseInt(r.rating, 10),
      is_moderated: Boolean(r.is_moderated),
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
        rv.id, rv.kos_id, rv.booking_id, rv.user_id, rv.rating, rv.content,
        rv.is_moderated, rv.created_at,
        u.name AS user_name, u.email AS user_email, u.photo_url AS user_photo,
        k.name AS kos_name, k.owner_id
      FROM reviews rv
      JOIN users u ON rv.user_id = u.id
      JOIN kos k ON rv.kos_id = k.id
      WHERE rv.id = ?
      LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      ...r,
      rating: parseInt(r.rating, 10),
      is_moderated: Boolean(r.is_moderated),
    };
  },

  async setModerated(id, is_moderated = true) {
    const [result] = await db.execute(
      'UPDATE reviews SET is_moderated = ? WHERE id = ?',
      [is_moderated ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async create({ kos_id, booking_id, user_id, rating, content = null, is_moderated = false }) {
    const [result] = await db.execute(
      `INSERT INTO reviews (kos_id, booking_id, user_id, rating, content, is_moderated)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kos_id, booking_id, user_id, rating, content, is_moderated ? 1 : 0]
    );
    return result.insertId;
  },
};

module.exports = ReviewModel;
