const db = require('../config/db');

const RoomModel = {
  async create({
    kos_id,
    room_number = null,
    price,
    pay_period = 'bulanan',
    description = null,
    is_available = true,
    photo_urls = [],
  }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.execute(
        `INSERT INTO rooms (kos_id, room_number, price, pay_period, description, is_available)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          kos_id,
          room_number,
          parseFloat(price),
          pay_period,
          description,
          is_available ? 1 : 0,
        ]
      );
      const roomId = res.insertId;

      if (Array.isArray(photo_urls) && photo_urls.length > 0) {
        for (let i = 0; i < photo_urls.length; i++) {
          const item = photo_urls[i];
          const url = typeof item === 'string' ? item : item.photo_url;
          const sortOrder = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
          if (url) {
            await conn.execute(
              `INSERT INTO kos_photos (kos_id, room_id, photo_url, sort_order)
               VALUES (?, ?, ?, ?)`,
              [kos_id, roomId, url, sortOrder]
            );
          }
        }
      }

      await conn.commit();
      return roomId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
        r.id, r.kos_id, r.room_number, r.price, r.pay_period,
        r.description, r.is_available, r.created_at, r.updated_at,
        k.owner_id, k.name AS kos_name
       FROM rooms r
       JOIN kos k ON r.kos_id = k.id
       WHERE r.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const room = rows[0];

    const [photos] = await db.execute(
      `SELECT id, kos_id, room_id, photo_url, sort_order, created_at
       FROM kos_photos
       WHERE room_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    return {
      ...room,
      price: parseFloat(room.price),
      is_available: Boolean(room.is_available),
      photos,
      primary_photo: photos[0]?.photo_url || null,
    };
  },

  async findByKosId(kos_id, { available = null } = {}) {
    let query = `
      SELECT 
        r.id, r.kos_id, r.room_number, r.price, r.pay_period,
        r.description, r.is_available, r.created_at, r.updated_at
      FROM rooms r
      WHERE r.kos_id = ?
    `;
    const params = [kos_id];

    if (available !== null && available !== undefined) {
      query += ' AND r.is_available = ?';
      params.push(available ? 1 : 0);
    }

    query += ' ORDER BY r.room_number ASC, r.id ASC';

    const [rows] = await db.execute(query, params);
    if (rows.length === 0) return [];

    const roomIds = rows.map((r) => r.id);
    const placeholders = roomIds.map(() => '?').join(', ');

    const [photos] = await db.execute(
      `SELECT id, kos_id, room_id, photo_url, sort_order, created_at
       FROM kos_photos
       WHERE room_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
      roomIds
    );

    const photosByRoom = {};
    for (const p of photos) {
      if (!photosByRoom[p.room_id]) photosByRoom[p.room_id] = [];
      photosByRoom[p.room_id].push(p);
    }

    return rows.map((r) => {
      const roomPhotos = photosByRoom[r.id] || [];
      return {
        ...r,
        price: parseFloat(r.price),
        is_available: Boolean(r.is_available),
        photos: roomPhotos,
        primary_photo: roomPhotos[0]?.photo_url || null,
      };
    });
  },

  async update(id, fields) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const updates = [];
      const values = [];

      if (fields.room_number !== undefined) {
        updates.push('room_number = ?');
        values.push(fields.room_number);
      }
      if (fields.price !== undefined) {
        updates.push('price = ?');
        values.push(parseFloat(fields.price));
      }
      if (fields.pay_period !== undefined) {
        updates.push('pay_period = ?');
        values.push(fields.pay_period);
      }
      if (fields.description !== undefined) {
        updates.push('description = ?');
        values.push(fields.description);
      }
      if (fields.is_available !== undefined) {
        updates.push('is_available = ?');
        values.push(fields.is_available ? 1 : 0);
      }

      if (updates.length > 0) {
        values.push(id);
        await conn.execute(
          `UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      if (Array.isArray(fields.photo_urls)) {
        // Find kos_id for this room
        const [rRows] = await conn.execute('SELECT kos_id FROM rooms WHERE id = ?', [id]);
        if (rRows.length > 0) {
          const kosId = rRows[0].kos_id;
          for (let i = 0; i < fields.photo_urls.length; i++) {
            const item = fields.photo_urls[i];
            const url = typeof item === 'string' ? item : item.photo_url;
            const sortOrder = typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : i;
            if (url) {
              await conn.execute(
                `INSERT INTO kos_photos (kos_id, room_id, photo_url, sort_order)
                 VALUES (?, ?, ?, ?)`,
                [kosId, id, url, sortOrder]
              );
            }
          }
        }
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async delete(id) {
    // Delete room photos
    await db.execute('DELETE FROM kos_photos WHERE room_id = ?', [id]);
    const [res] = await db.execute('DELETE FROM rooms WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  async findAll({ page = 1, limit = 10, kos_id = null, is_available = null } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (kos_id) {
      whereConditions.push('r.kos_id = ?');
      params.push(parseInt(kos_id, 10));
    }

    if (is_available !== null && is_available !== undefined) {
      whereConditions.push('r.is_available = ?');
      params.push(is_available ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM rooms r ${whereClause}`;
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
        r.id, r.kos_id, r.room_number, r.price, r.pay_period,
        r.description, r.is_available, r.created_at, r.updated_at,
        k.name AS kos_name, k.owner_id
      FROM rooms r
      JOIN kos k ON r.kos_id = k.id
      ${whereClause}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);

    const data = rows.map((r) => ({
      ...r,
      price: parseFloat(r.price),
      is_available: Boolean(r.is_available),
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

module.exports = RoomModel;
