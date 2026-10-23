const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const KosModel = {
  async create({
    owner_id,
    name,
    address,
    latitude,
    longitude,
    district = null,
    type,
    description = null,
    is_approved = false,
    status = 'active',
    facility_ids = [],
  }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const pointWkt = `POINT(${parseFloat(latitude)} ${parseFloat(longitude)})`;
      const [res] = await conn.execute(
        `INSERT INTO kos (owner_id, name, address, location, district, type, description, is_approved, status)
         VALUES (?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?, ?, ?)`,
        [
          owner_id,
          name,
          address,
          pointWkt,
          district,
          type,
          description,
          is_approved ? 1 : 0,
          status,
        ]
      );
      const kosId = res.insertId;

      if (Array.isArray(facility_ids) && facility_ids.length > 0) {
        const uniqueIds = [...new Set(facility_ids.map((id) => parseInt(id, 10)).filter(Boolean))];
        if (uniqueIds.length > 0) {
          const values = [];
          const placeholders = uniqueIds.map((facId) => {
            values.push(kosId, facId);
            return '(?, ?)';
          }).join(', ');
          await conn.execute(
            `INSERT INTO kos_facilities (kos_id, facility_id) VALUES ${placeholders}`,
            values
          );
        }
      }

      await conn.commit();
      return kosId;
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
        k.id, k.owner_id, k.name, k.address,
        ST_Latitude(k.location) AS latitude,
        ST_Longitude(k.location) AS longitude,
        k.district, k.type, k.description,
        k.is_approved, k.status,
        k.created_at, k.updated_at,
        u.name AS owner_name, u.phone AS owner_phone, u.photo_url AS owner_photo
      FROM kos k
      JOIN users u ON k.owner_id = u.id
      WHERE k.id = ?
      LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const kos = rows[0];

    // Facilities
    const [facilities] = await db.execute(
      `SELECT f.id, f.name
       FROM facilities f
       JOIN kos_facilities kf ON f.id = kf.facility_id
       WHERE kf.kos_id = ?
       ORDER BY f.name ASC`,
      [id]
    );

    // Photos
    const [photos] = await db.execute(
      `SELECT id, kos_id, room_id, photo_url, sort_order, created_at
       FROM kos_photos
       WHERE kos_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    // Rooms
    const [rooms] = await db.execute(
      `SELECT id, kos_id, room_number, price, pay_period, description, is_available, created_at, updated_at
       FROM rooms
       WHERE kos_id = ?
       ORDER BY room_number ASC, id ASC`,
      [id]
    );

    // Rating summary
    const [ratingSummary] = await db.execute(
      `SELECT 
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(r.id) AS total_reviews
       FROM reviews r
       WHERE r.kos_id = ? AND r.is_moderated = FALSE`,
      [id]
    );

    // Recent reviews
    const [reviews] = await db.execute(
      `SELECT 
        r.id, r.user_id, r.rating, r.content, r.created_at,
        u.name AS user_name, u.photo_url AS user_photo
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.kos_id = ? AND r.is_moderated = FALSE
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    const avgRating = parseFloat(ratingSummary[0]?.avg_rating || 0);
    const totalReviews = parseInt(ratingSummary[0]?.total_reviews || 0, 10);

    return {
      ...kos,
      latitude: parseFloat(kos.latitude),
      longitude: parseFloat(kos.longitude),
      is_approved: Boolean(kos.is_approved),
      facilities,
      photos,
      primary_photo: photos[0]?.photo_url || null,
      rooms: rooms.map((r) => ({
        ...r,
        price: parseFloat(r.price),
        is_available: Boolean(r.is_available),
      })),
      avg_rating: Number(avgRating.toFixed(1)),
      total_reviews: totalReviews,
      reviews,
    };
  },

  async findAll({
    page = 1,
    limit = 10,
    search = null,
    district = null,
    type = null,
    owner_id = null,
    status = null,
    is_approved = null,
    facility_ids = [],
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push('(k.name LIKE ? OR k.address LIKE ? OR k.district LIKE ? OR k.description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (district) {
      whereConditions.push('k.district = ?');
      params.push(district);
    }

    if (type) {
      whereConditions.push('k.type = ?');
      params.push(type);
    }

    if (owner_id !== null && owner_id !== undefined) {
      whereConditions.push('k.owner_id = ?');
      params.push(owner_id);
    }

    if (status) {
      whereConditions.push('k.status = ?');
      params.push(status);
    }

    if (is_approved !== null && is_approved !== undefined) {
      whereConditions.push('k.is_approved = ?');
      params.push(is_approved ? 1 : 0);
    }

    if (Array.isArray(facility_ids) && facility_ids.length > 0) {
      const validFacIds = facility_ids.map((id) => parseInt(id, 10)).filter(Boolean);
      if (validFacIds.length > 0) {
        whereConditions.push(
          `k.id IN (
            SELECT kf.kos_id
            FROM kos_facilities kf
            WHERE kf.facility_id IN (${validFacIds.map(() => '?').join(', ')})
            GROUP BY kf.kos_id
            HAVING COUNT(DISTINCT kf.facility_id) = ?
          )`
        );
        params.push(...validFacIds, validFacIds.length);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total matches
    const [countRows] = await db.execute(
      `SELECT COUNT(DISTINCT k.id) AS total
       FROM kos k
       JOIN users u ON k.owner_id = u.id
       ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Fetch items with aggregates
    const queryParams = [...params, limitNum, offset];
    const [rows] = await db.execute(
      `SELECT 
        k.id, k.owner_id, k.name, k.address,
        ST_Latitude(k.location) AS latitude,
        ST_Longitude(k.location) AS longitude,
        k.district, k.type, k.description,
        k.is_approved, k.status,
        k.created_at, k.updated_at,
        u.name AS owner_name, u.phone AS owner_phone,
        COALESCE(MIN(r.price), 0) AS min_price,
        COUNT(DISTINCT r.id) AS total_rooms,
        COUNT(DISTINCT CASE WHEN r.is_available = 1 THEN r.id END) AS available_rooms,
        COALESCE(AVG(rv.rating), 0) AS avg_rating,
        COUNT(DISTINCT rv.id) AS total_reviews
      FROM kos k
      JOIN users u ON k.owner_id = u.id
      LEFT JOIN rooms r ON k.id = r.kos_id
      LEFT JOIN reviews rv ON k.id = rv.kos_id AND rv.is_moderated = 0
      ${whereClause}
      GROUP BY k.id, u.id
      ORDER BY k.created_at DESC
      LIMIT ? OFFSET ?`,
      queryParams
    );

    if (rows.length === 0) {
      return {
        data: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }

    const kosIds = rows.map((r) => r.id);
    const placeholders = kosIds.map(() => '?').join(', ');

    // Batch photos
    const [photoRows] = await db.execute(
      `SELECT id, kos_id, room_id, photo_url, sort_order
       FROM kos_photos
       WHERE kos_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
      kosIds
    );

    // Batch facilities
    const [facRows] = await db.execute(
      `SELECT kf.kos_id, f.id, f.name
       FROM facilities f
       JOIN kos_facilities kf ON f.id = kf.facility_id
       WHERE kf.kos_id IN (${placeholders})
       ORDER BY f.name ASC`,
      kosIds
    );

    const photosByKos = {};
    for (const p of photoRows) {
      if (!photosByKos[p.kos_id]) photosByKos[p.kos_id] = [];
      photosByKos[p.kos_id].push(p);
    }

    const facilitiesByKos = {};
    for (const f of facRows) {
      if (!facilitiesByKos[f.kos_id]) facilitiesByKos[f.kos_id] = [];
      facilitiesByKos[f.kos_id].push({ id: f.id, name: f.name });
    }

    const data = rows.map((k) => {
      const photos = photosByKos[k.id] || [];
      const facilities = facilitiesByKos[k.id] || [];
      return {
        ...k,
        latitude: parseFloat(k.latitude),
        longitude: parseFloat(k.longitude),
        is_approved: Boolean(k.is_approved),
        min_price: parseFloat(k.min_price),
        avg_rating: Number(parseFloat(k.avg_rating).toFixed(1)),
        total_reviews: parseInt(k.total_reviews, 10),
        total_rooms: parseInt(k.total_rooms, 10),
        available_rooms: parseInt(k.available_rooms, 10),
        photos,
        primary_photo: photos[0]?.photo_url || null,
        facilities,
      };
    });

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  async update(id, fields) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const updates = [];
      const values = [];

      if (fields.name !== undefined) {
        updates.push('name = ?');
        values.push(fields.name);
      }
      if (fields.address !== undefined) {
        updates.push('address = ?');
        values.push(fields.address);
      }
      if (fields.district !== undefined) {
        updates.push('district = ?');
        values.push(fields.district);
      }
      if (fields.type !== undefined) {
        updates.push('type = ?');
        values.push(fields.type);
      }
      if (fields.description !== undefined) {
        updates.push('description = ?');
        values.push(fields.description);
      }
      if (fields.status !== undefined) {
        updates.push('status = ?');
        values.push(fields.status);
      }
      if (fields.is_approved !== undefined) {
        updates.push('is_approved = ?');
        values.push(fields.is_approved ? 1 : 0);
      }
      if (fields.latitude !== undefined && fields.longitude !== undefined) {
        updates.push('location = ST_GeomFromText(?, 4326)');
        values.push(`POINT(${parseFloat(fields.latitude)} ${parseFloat(fields.longitude)})`);
      }

      if (updates.length > 0) {
        values.push(id);
        await conn.execute(
          `UPDATE kos SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      if (fields.facility_ids !== undefined && Array.isArray(fields.facility_ids)) {
        await conn.execute('DELETE FROM kos_facilities WHERE kos_id = ?', [id]);
        const uniqueIds = [...new Set(fields.facility_ids.map((fid) => parseInt(fid, 10)).filter(Boolean))];
        if (uniqueIds.length > 0) {
          const facValues = [];
          const placeholders = uniqueIds.map((facId) => {
            facValues.push(id, facId);
            return '(?, ?)';
          }).join(', ');
          await conn.execute(
            `INSERT INTO kos_facilities (kos_id, facility_id) VALUES ${placeholders}`,
            facValues
          );
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
    // Delete local photo files
    try {
      const [photos] = await db.execute(
        'SELECT photo_url FROM kos_photos WHERE kos_id = ?',
        [id]
      );
      for (const p of photos) {
        if (p.photo_url && p.photo_url.startsWith('/uploads/')) {
          const filePath = path.resolve(__dirname, '../../', p.photo_url.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch {
      // ignore photo cleanup failure
    }

    const [res] = await db.execute('DELETE FROM kos WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },

  // Photos
  async addPhoto(kosId, { photo_url, room_id = null, sort_order = 0 }) {
    const [res] = await db.execute(
      `INSERT INTO kos_photos (kos_id, room_id, photo_url, sort_order)
       VALUES (?, ?, ?, ?)`,
      [kosId, room_id, photo_url, sort_order]
    );
    return {
      id: res.insertId,
      kos_id: kosId,
      room_id,
      photo_url,
      sort_order,
    };
  },

  async addPhotos(kosId, photos) {
    if (!Array.isArray(photos) || photos.length === 0) return [];
    const inserted = [];
    for (const p of photos) {
      const row = await this.addPhoto(kosId, p);
      inserted.push(row);
    }
    return inserted;
  },

  async findPhotoById(photoId) {
    const [rows] = await db.execute(
      'SELECT id, kos_id, room_id, photo_url, sort_order, created_at FROM kos_photos WHERE id = ? LIMIT 1',
      [photoId]
    );
    return rows[0] || null;
  },

  async deletePhoto(photoId) {
    const photo = await this.findPhotoById(photoId);
    if (!photo) return false;

    if (photo.photo_url && photo.photo_url.startsWith('/uploads/')) {
      try {
        const filePath = path.resolve(__dirname, '../../', photo.photo_url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // ignore disk file error
      }
    }

    const [res] = await db.execute('DELETE FROM kos_photos WHERE id = ?', [photoId]);
    return res.affectedRows > 0;
  },

  // Facilities
  async findAllFacilities() {
    const [rows] = await db.execute('SELECT id, name FROM facilities ORDER BY id ASC');
    return rows;
  },
};

module.exports = KosModel;
