const db = require('../config/db');

function formatDate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    return val.includes('T') ? val.split('T')[0] : val.substring(0, 10);
  }
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val);
}

function formatBooking(row) {
  return {
    id: row.id,
    room_id: row.room_id,
    tenant_id: row.tenant_id,
    status: row.status,
    check_in_date: formatDate(row.check_in_date),
    check_out_date: formatDate(row.check_out_date),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    room: {
      id: row.room_id,
      room_number: row.room_number,
      price: parseFloat(row.room_price),
      pay_period: row.pay_period,
      description: row.room_description,
      is_available: Boolean(row.room_is_available),
      primary_photo: row.room_photo || null,
    },
    kos: {
      id: row.kos_id,
      owner_id: row.kos_owner_id,
      name: row.kos_name,
      address: row.kos_address,
      district: row.kos_district,
      type: row.kos_type,
      primary_photo: row.kos_photo || null,
    },
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      email: row.tenant_email,
      phone: row.tenant_phone,
      photo_url: row.tenant_photo || null,
    },
    owner: {
      id: row.kos_owner_id,
      name: row.owner_name,
      email: row.owner_email,
      phone: row.owner_phone,
      photo_url: row.owner_photo || null,
    },
  };
}

const BookingModel = {
  formatDate,
  formatBooking,

  /**
   * Create a new booking
   */
  async create({
    room_id,
    tenant_id,
    status = 'pending',
    check_in_date,
    check_out_date = null,
    notes = null,
  }) {
    const [res] = await db.execute(
      `INSERT INTO bookings (room_id, tenant_id, status, check_in_date, check_out_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [room_id, tenant_id, status, check_in_date, check_out_date, notes]
    );
    return res.insertId;
  },

  /**
   * Find booking by ID with room, kos, tenant, owner, and invoices
   */
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
        b.id, b.room_id, b.tenant_id, b.status, b.check_in_date, b.check_out_date, b.notes,
        b.created_at, b.updated_at,
        r.room_number, r.price AS room_price, r.pay_period, r.description AS room_description, r.is_available AS room_is_available,
        k.id AS kos_id, k.owner_id AS kos_owner_id, k.name AS kos_name, k.address AS kos_address, k.district AS kos_district, k.type AS kos_type,
        u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone, u_tenant.photo_url AS tenant_photo,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone, u_owner.photo_url AS owner_photo,
        (SELECT photo_url FROM kos_photos WHERE room_id = r.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS room_photo,
        (SELECT photo_url FROM kos_photos WHERE kos_id = k.id AND room_id IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       JOIN users u_tenant ON b.tenant_id = u_tenant.id
       JOIN users u_owner ON k.owner_id = u_owner.id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const booking = formatBooking(rows[0]);

    // Fetch invoices if any
    const [invoiceRows] = await db.execute(
      `SELECT id, booking_id, amount, due_date, status, payment_method, payment_ref, paid_at, created_at
       FROM invoices
       WHERE booking_id = ?
       ORDER BY id ASC`,
      [id]
    );

    booking.invoices = invoiceRows.map((inv) => ({
      id: inv.id,
      booking_id: inv.booking_id,
      amount: parseFloat(inv.amount),
      due_date: formatDate(inv.due_date),
      status: inv.status,
      payment_method: inv.payment_method,
      payment_ref: inv.payment_ref,
      paid_at: inv.paid_at,
      created_at: inv.created_at,
    }));

    return booking;
  },

  /**
   * List bookings with filters and pagination
   */
  async findAll({
    tenant_id = null,
    owner_id = null,
    kos_id = null,
    room_id = null,
    status = null,
    page = 1,
    limit = 10,
    sort = 'desc',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (tenant_id) {
      whereConditions.push('b.tenant_id = ?');
      params.push(parseInt(tenant_id, 10));
    }

    if (owner_id) {
      whereConditions.push('k.owner_id = ?');
      params.push(parseInt(owner_id, 10));
    }

    if (kos_id) {
      whereConditions.push('k.id = ?');
      params.push(parseInt(kos_id, 10));
    }

    if (room_id) {
      whereConditions.push('b.room_id = ?');
      params.push(parseInt(room_id, 10));
    }

    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(`b.status IN (${status.map(() => '?').join(', ')})`);
        params.push(...status);
      } else {
        whereConditions.push('b.status = ?');
        params.push(status);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      ${whereClause}
    `;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].total;

    if (total === 0) {
      return {
        bookings: [],
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const orderDirection = String(sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const selectSql = `
      SELECT 
        b.id, b.room_id, b.tenant_id, b.status, b.check_in_date, b.check_out_date, b.notes,
        b.created_at, b.updated_at,
        r.room_number, r.price AS room_price, r.pay_period, r.description AS room_description, r.is_available AS room_is_available,
        k.id AS kos_id, k.owner_id AS kos_owner_id, k.name AS kos_name, k.address AS kos_address, k.district AS kos_district, k.type AS kos_type,
        u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone, u_tenant.photo_url AS tenant_photo,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone, u_owner.photo_url AS owner_photo,
        (SELECT photo_url FROM kos_photos WHERE room_id = r.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS room_photo,
        (SELECT photo_url FROM kos_photos WHERE kos_id = k.id AND room_id IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      JOIN users u_tenant ON b.tenant_id = u_tenant.id
      JOIN users u_owner ON k.owner_id = u_owner.id
      ${whereClause}
      ORDER BY b.id ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);
    const bookings = rows.map(formatBooking);

    return {
      bookings,
      data: bookings,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  /**
   * Find if tenant already has an active or pending booking for this room
   */
  async findActiveOrPendingByTenantAndRoom(tenant_id, room_id) {
    const [rows] = await db.execute(
      `SELECT id, room_id, tenant_id, status
       FROM bookings
       WHERE tenant_id = ? AND room_id = ? AND status IN ('pending', 'accepted', 'active')
       LIMIT 1`,
      [tenant_id, room_id]
    );
    return rows[0] || null;
  },

  /**
   * Update booking status and synchronize room availability atomically (F-30)
   */
  async updateStatus(id, newStatus, notes = null) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Fetch current booking and room state with row lock
      const [rows] = await conn.execute(
        `SELECT b.id, b.room_id, b.tenant_id, b.status, r.is_available, r.kos_id
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         WHERE b.id = ?
         FOR UPDATE`,
        [id]
      );

      if (!rows || rows.length === 0) {
        await conn.rollback();
        return {
          success: false,
          error: 'Pemesanan tidak ditemukan',
          notFound: true,
          affectedRows: 0,
        };
      }

      const currentBooking = rows[0];
      const prevStatus = currentBooking.status;

      // Terminal state check
      if (['rejected', 'cancelled', 'completed'].includes(prevStatus)) {
        await conn.rollback();
        return {
          success: false,
          error: 'Status pemesanan sudah final dan tidak dapat diubah lagi',
          terminal: true,
          affectedRows: 0,
        };
      }

      // If activating booking: room must be available
      if (newStatus === 'active') {
        if (!currentBooking.is_available && prevStatus !== 'active') {
          await conn.rollback();
          return {
            success: false,
            error: 'Kamar sudah tidak tersedia atau sudah ditempati',
            affectedRows: 0,
          };
        }

        // Room is now occupied
        await conn.execute(
          `UPDATE rooms SET is_available = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [currentBooking.room_id]
        );
      }

      // If active booking ends (completed or cancelled): release room back to available
      if (prevStatus === 'active' && ['completed', 'cancelled'].includes(newStatus)) {
        const [otherActive] = await conn.execute(
          `SELECT COUNT(*) AS total FROM bookings WHERE room_id = ? AND status = 'active' AND id != ?`,
          [currentBooking.room_id, id]
        );

        if (otherActive[0].total === 0) {
          await conn.execute(
            `UPDATE rooms SET is_available = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [currentBooking.room_id]
          );
        }
      }

      // Update booking row
      if (notes !== null && notes !== undefined) {
        await conn.execute(
          `UPDATE bookings SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newStatus, notes, id]
        );
      } else {
        await conn.execute(
          `UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newStatus, id]
        );
      }

      await conn.commit();
      return {
        success: true,
        prevStatus,
        newStatus,
        affectedRows: 1,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Catat penghuni aktif setelah pemesanan diterima & dibayar (F-30)
   */
  async recordActiveTenant(bookingId, notes = null) {
    return await this.updateStatus(bookingId, 'active', notes);
  },

  /**
   * Selesaikan masa sewa penghuni aktif (checkout / kamar kembali tersedia)
   */
  async completeBooking(bookingId, notes = null) {
    return await this.updateStatus(bookingId, 'completed', notes);
  },

  /**
   * List penghuni aktif (F-30)
   */
  async findActiveTenants({
    owner_id = null,
    kos_id = null,
    page = 1,
    limit = 10,
    search = null,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = ["b.status = 'active'"];
    const params = [];

    if (owner_id) {
      whereConditions.push('k.owner_id = ?');
      params.push(parseInt(owner_id, 10));
    }

    if (kos_id) {
      whereConditions.push('k.id = ?');
      params.push(parseInt(kos_id, 10));
    }

    if (search) {
      whereConditions.push('(u_tenant.name LIKE ? OR u_tenant.phone LIKE ? OR r.room_number LIKE ? OR k.name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      JOIN users u_tenant ON b.tenant_id = u_tenant.id
      ${whereClause}
    `;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].total;

    if (total === 0) {
      return {
        tenants: [],
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const selectSql = `
      SELECT 
        b.id, b.room_id, b.tenant_id, b.status, b.check_in_date, b.check_out_date, b.notes,
        b.created_at, b.updated_at,
        r.room_number, r.price AS room_price, r.pay_period, r.description AS room_description, r.is_available AS room_is_available,
        k.id AS kos_id, k.owner_id AS kos_owner_id, k.name AS kos_name, k.address AS kos_address, k.district AS kos_district, k.type AS kos_type,
        u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone, u_tenant.photo_url AS tenant_photo,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone, u_owner.photo_url AS owner_photo,
        (SELECT photo_url FROM kos_photos WHERE room_id = r.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS room_photo,
        (SELECT photo_url FROM kos_photos WHERE kos_id = k.id AND room_id IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      JOIN users u_tenant ON b.tenant_id = u_tenant.id
      JOIN users u_owner ON k.owner_id = u_owner.id
      ${whereClause}
      ORDER BY b.check_in_date DESC, b.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);
    const tenants = rows.map(formatBooking);

    return {
      tenants,
      data: tenants,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  /**
   * Delete booking by ID (mainly for testing cleanup)
   */
  async delete(id) {
    const [res] = await db.execute('DELETE FROM bookings WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },
};

module.exports = BookingModel;
