const db = require('../config/db');

function formatComplaint(row) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    user_id: row.user_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    booking: {
      id: row.booking_id,
      room_id: row.room_id,
      room_number: row.room_number,
      kos_id: row.kos_id,
      kos_name: row.kos_name,
      owner_id: row.owner_id,
    },
    reporter: {
      id: row.user_id,
      name: row.reporter_name,
      email: row.reporter_email,
      photo_url: row.reporter_photo || null,
    },
  };
}

const ComplaintModel = {
  async create({ booking_id, user_id, subject, description }) {
    const [result] = await db.execute(
      'INSERT INTO complaints (booking_id, user_id, subject, description) VALUES (?, ?, ?, ?)',
      [booking_id, user_id, subject, description]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, b.room_id, r.room_number, k.id AS kos_id, k.name AS kos_name, k.owner_id,
              u.name AS reporter_name, u.email AS reporter_email, u.photo_url AS reporter_photo
       FROM complaints c
       JOIN bookings b ON c.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return null;

    const complaint = formatComplaint(rows[0]);
    const [responses] = await db.execute(
      `SELECT cr.id, cr.complaint_id, cr.user_id, cr.content, cr.created_at,
              u.name AS user_name, u.email AS user_email, u.photo_url AS user_photo
       FROM complaint_responses cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.complaint_id = ?
       ORDER BY cr.created_at ASC, cr.id ASC`,
      [id]
    );
    complaint.responses = responses.map((response) => ({
      ...response,
      user: {
        id: response.user_id,
        name: response.user_name,
        email: response.user_email,
        photo_url: response.user_photo || null,
      },
    }));
    return complaint;
  },

  async findAll({ tenant_id = null, owner_id = null, status = null, page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    const params = [];

    if (tenant_id) {
      conditions.push('b.tenant_id = ?');
      params.push(tenant_id);
    }
    if (owner_id) {
      conditions.push('k.owner_id = ?');
      params.push(owner_id);
    }
    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const fromClause = `FROM complaints c
      JOIN bookings b ON c.booking_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      JOIN users u ON c.user_id = u.id`;

    const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
    const total = countRows[0].total;
    if (!total) return { complaints: [], data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };

    const [rows] = await db.execute(
      `SELECT c.*, b.room_id, r.room_number, k.id AS kos_id, k.name AS kos_name, k.owner_id,
              u.name AS reporter_name, u.email AS reporter_email, u.photo_url AS reporter_photo
       ${fromClause} ${whereClause}
       ORDER BY c.updated_at DESC, c.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    const complaints = rows.map(formatComplaint);
    return { complaints, data: complaints, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async addResponse({ complaint_id, user_id, content }) {
    const [result] = await db.execute(
      'INSERT INTO complaint_responses (complaint_id, user_id, content) VALUES (?, ?, ?)',
      [complaint_id, user_id, content]
    );
    return result.insertId;
  },

  async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = ComplaintModel;
