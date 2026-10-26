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

function formatDateTime(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof val === 'string') {
    if (val.includes('T')) {
      return val.replace('T', ' ').replace('Z', '').split('.')[0];
    }
    return val;
  }
  return val;
}

function addCycleToDate(dateVal, payPeriod = 'bulanan') {
  const d = new Date(dateVal);
  if (payPeriod === 'tahunan') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatInvoice(row) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    amount: parseFloat(row.amount),
    due_date: formatDate(row.due_date),
    status: row.status,
    payment_method: row.payment_method,
    payment_ref: row.payment_ref,
    paid_at: row.paid_at,
    created_at: row.created_at,
    booking: {
      id: row.booking_id,
      status: row.booking_status,
      check_in_date: formatDate(row.booking_check_in),
      check_out_date: formatDate(row.booking_check_out),
      notes: row.booking_notes,
    },
    room: {
      id: row.room_id,
      room_number: row.room_number,
      price: parseFloat(row.room_price),
      pay_period: row.pay_period,
    },
    kos: {
      id: row.kos_id,
      name: row.kos_name,
      address: row.kos_address,
      district: row.kos_district,
      owner_id: row.kos_owner_id,
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

const InvoiceModel = {
  formatDate,
  addCycleToDate,
  formatInvoice,

  /**
   * Create a new invoice
   */
  async create({
    booking_id,
    amount,
    due_date,
    status = 'unpaid',
    payment_method = null,
    payment_ref = null,
    paid_at = null,
  }) {
    const formattedDueDate = formatDate(due_date);
    const formattedPaidAt = formatDateTime(paid_at);
    const [res] = await db.execute(
      `INSERT INTO invoices (booking_id, amount, due_date, status, payment_method, payment_ref, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        parseFloat(amount),
        formattedDueDate,
        status,
        payment_method,
        payment_ref,
        formattedPaidAt,
      ]
    );
    return res.insertId;
  },

  /**
   * Find invoice by ID with rich joined relations
   */
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
        i.id, i.booking_id, i.amount, i.due_date, i.status, i.payment_method, i.payment_ref, i.paid_at, i.created_at,
        b.status AS booking_status, b.check_in_date AS booking_check_in, b.check_out_date AS booking_check_out, b.notes AS booking_notes,
        r.id AS room_id, r.room_number, r.price AS room_price, r.pay_period,
        k.id AS kos_id, k.name AS kos_name, k.address AS kos_address, k.district AS kos_district, k.owner_id AS kos_owner_id,
        u_tenant.id AS tenant_id, u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone, u_tenant.photo_url AS tenant_photo,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone, u_owner.photo_url AS owner_photo,
        (SELECT photo_url FROM kos_photos WHERE kos_id = k.id AND room_id IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       JOIN users u_tenant ON b.tenant_id = u_tenant.id
       JOIN users u_owner ON k.owner_id = u_owner.id
       WHERE i.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    return formatInvoice(rows[0]);
  },

  /**
   * List invoices with role-based filtering and pagination
   */
  async findAll({
    tenant_id = null,
    owner_id = null,
    kos_id = null,
    booking_id = null,
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

    if (booking_id) {
      whereConditions.push('i.booking_id = ?');
      params.push(parseInt(booking_id, 10));
    }

    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(`i.status IN (${status.map(() => '?').join(', ')})`);
        params.push(...status);
      } else {
        whereConditions.push('i.status = ?');
        params.push(status);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM invoices i
      JOIN bookings b ON i.booking_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      ${whereClause}
    `;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].total;

    if (total === 0) {
      return {
        invoices: [],
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
        i.id, i.booking_id, i.amount, i.due_date, i.status, i.payment_method, i.payment_ref, i.paid_at, i.created_at,
        b.status AS booking_status, b.check_in_date AS booking_check_in, b.check_out_date AS booking_check_out, b.notes AS booking_notes,
        r.id AS room_id, r.room_number, r.price AS room_price, r.pay_period,
        k.id AS kos_id, k.name AS kos_name, k.address AS kos_address, k.district AS kos_district, k.owner_id AS kos_owner_id,
        u_tenant.id AS tenant_id, u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone, u_tenant.photo_url AS tenant_photo,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone, u_owner.photo_url AS owner_photo,
        (SELECT photo_url FROM kos_photos WHERE kos_id = k.id AND room_id IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
      FROM invoices i
      JOIN bookings b ON i.booking_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN kos k ON r.kos_id = k.id
      JOIN users u_tenant ON b.tenant_id = u_tenant.id
      JOIN users u_owner ON k.owner_id = u_owner.id
      ${whereClause}
      ORDER BY i.id ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(selectSql, [...params, limitNum, offset]);
    const invoices = rows.map(formatInvoice);

    return {
      invoices,
      data: invoices,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  /**
   * Find invoices by booking ID
   */
  async findByBookingId(bookingId) {
    const [rows] = await db.execute(
      `SELECT id, booking_id, amount, due_date, status, payment_method, payment_ref, paid_at, created_at
       FROM invoices
       WHERE booking_id = ?
       ORDER BY due_date ASC, id ASC`,
      [bookingId]
    );

    return rows.map((inv) => ({
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
  },

  /**
   * Update invoice status and payment metadata
   */
  async updateStatus(id, { status, payment_method = null, payment_ref = null, paid_at = null }) {
    const updates = ['status = ?'];
    const params = [status];

    if (payment_method !== undefined && payment_method !== null) {
      updates.push('payment_method = ?');
      params.push(payment_method);
    }

    if (payment_ref !== undefined && payment_ref !== null) {
      updates.push('payment_ref = ?');
      params.push(payment_ref);
    }

    if (paid_at !== undefined) {
      updates.push('paid_at = ?');
      params.push(formatDateTime(paid_at));
    }

    params.push(id);

    const [res] = await db.execute(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return res.affectedRows > 0;
  },

  /**
   * Automatically flag unpaid invoices as 'overdue' if due_date has passed
   */
  async checkOverdueInvoices() {
    const [res] = await db.execute(
      `UPDATE invoices
       SET status = 'overdue'
       WHERE status = 'unpaid' AND due_date < CURDATE()`
    );
    return res.affectedRows;
  },

  /**
   * Auto-generate recurring invoices according to pay_period (F-31)
   */
  async generateRecurringInvoices({ issueDaysBefore = 7 } = {}) {
    // 1. First, mark any past-due unpaid invoices as overdue
    await this.checkOverdueInvoices();

    // 2. Query bookings that should receive invoices: active or accepted
    const [eligibleBookings] = await db.execute(
      `SELECT 
        b.id AS booking_id, b.room_id, b.tenant_id, b.status AS booking_status,
        b.check_in_date, b.check_out_date,
        r.price AS room_price, r.pay_period,
        k.id AS kos_id, k.name AS kos_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       WHERE b.status IN ('active', 'accepted')`
    );

    const generated = [];

    for (const b of eligibleBookings) {
      const bookingId = b.booking_id;
      const amount = parseFloat(b.room_price);
      const payPeriod = b.pay_period || 'bulanan';
      const checkInStr = formatDate(b.check_in_date);
      const checkOutStr = formatDate(b.check_out_date);

      // Get all existing invoices for this booking
      const [existingInvoices] = await db.execute(
        `SELECT id, amount, due_date, status, paid_at
         FROM invoices
         WHERE booking_id = ?
         ORDER BY due_date DESC, id DESC`,
        [bookingId]
      );

      // Case 1: Initial invoice has never been generated
      if (existingInvoices.length === 0) {
        const initialDueDate = checkInStr || new Date().toISOString().split('T')[0];
        const invoiceId = await this.create({
          booking_id: bookingId,
          amount,
          due_date: initialDueDate,
          status: 'unpaid',
        });
        generated.push({
          id: invoiceId,
          booking_id: bookingId,
          amount,
          due_date: initialDueDate,
          type: 'initial',
        });
        continue;
      }

      // Case 2: Subsequent recurring invoices
      // Only generate if current/latest invoice is paid and active lease continues
      const latestInvoice = existingInvoices[0];
      const hasUnpaid = existingInvoices.some((inv) =>
        ['unpaid', 'overdue'].includes(inv.status)
      );

      // If tenant still has an unpaid or overdue invoice, wait until settled
      if (hasUnpaid) {
        continue;
      }

      // Calculate next due date
      const latestDueDate = formatDate(latestInvoice.due_date);
      const nextDueDate = addCycleToDate(latestDueDate, payPeriod);

      // Check if next cycle exceeds check_out_date
      if (checkOutStr && nextDueDate > checkOutStr) {
        continue;
      }

      // Check issue threshold (e.g. issue invoice 7 days before due date)
      const now = new Date();
      const nextDue = new Date(nextDueDate);
      const daysUntilDue = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= issueDaysBefore) {
        // Double-check no invoice already exists with this due date
        const [dupCheck] = await db.execute(
          `SELECT id FROM invoices WHERE booking_id = ? AND due_date = ? LIMIT 1`,
          [bookingId, nextDueDate]
        );

        if (dupCheck.length === 0) {
          const invoiceId = await this.create({
            booking_id: bookingId,
            amount,
            due_date: nextDueDate,
            status: 'unpaid',
          });
          generated.push({
            id: invoiceId,
            booking_id: bookingId,
            amount,
            due_date: nextDueDate,
            type: 'recurring',
          });
        }
      }
    }

    return {
      count: generated.length,
      generated,
    };
  },

  /**
   * Delete invoice by ID (testing cleanup)
   */
  async delete(id) {
    const [res] = await db.execute('DELETE FROM invoices WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },
};

module.exports = InvoiceModel;
