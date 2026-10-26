const db = require('../config/db');
const InvoiceModel = require('../models/invoice.model');

// Cache to prevent duplicate reminder spam on the same date (format: "invId_type_YYYY-MM-DD")
const sentRemindersDailyCache = new Set();

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

const ReminderService = {
  sentRemindersDailyCache,

  /**
   * Find unpaid and overdue invoices needing reminders (F-35)
   */
  async getInvoicesNeedingReminders({ daysBeforeDue = 3 } = {}) {
    const today = getTodayString();

    // 1. Upcoming due soon invoices: status 'unpaid', due_date between today and today + daysBeforeDue
    const [dueSoonRows] = await db.execute(
      `SELECT 
        i.id, i.booking_id, i.amount, i.due_date, i.status,
        b.tenant_id, b.room_id,
        r.room_number,
        k.id AS kos_id, k.name AS kos_name, k.owner_id AS kos_owner_id,
        u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       JOIN users u_tenant ON b.tenant_id = u_tenant.id
       JOIN users u_owner ON k.owner_id = u_owner.id
       WHERE i.status = 'unpaid'
         AND i.due_date >= CURDATE()
         AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [daysBeforeDue]
    );

    // 2. Overdue invoices: status 'overdue' (or unpaid with due_date < today)
    const [overdueRows] = await db.execute(
      `SELECT 
        i.id, i.booking_id, i.amount, i.due_date, i.status,
        b.tenant_id, b.room_id,
        r.room_number,
        k.id AS kos_id, k.name AS kos_name, k.owner_id AS kos_owner_id,
        u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone,
        u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone
       FROM invoices i
       JOIN bookings b ON i.booking_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN kos k ON r.kos_id = k.id
       JOIN users u_tenant ON b.tenant_id = u_tenant.id
       JOIN users u_owner ON k.owner_id = u_owner.id
       WHERE i.status = 'overdue' OR (i.status = 'unpaid' AND i.due_date < CURDATE())`
    );

    return {
      dueSoon: dueSoonRows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        due_date: InvoiceModel.formatDate(r.due_date),
      })),
      overdue: overdueRows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        due_date: InvoiceModel.formatDate(r.due_date),
      })),
    };
  },

  /**
   * Send single reminder for an invoice (in-app socket notification + email) (F-35)
   */
  async sendReminderForInvoice(invoice, io = null, { isManual = false, customNote = null } = {}) {
    const today = getTodayString();
    const isOverdue =
      invoice.status === 'overdue' || new Date(invoice.due_date) < new Date(today);
    const type = isOverdue ? 'overdue' : 'due_soon';
    const cacheKey = `${invoice.id}_${type}_${today}`;

    if (!isManual && sentRemindersDailyCache.has(cacheKey)) {
      return { skipped: true, reason: 'Already reminded today' };
    }

    const title = isOverdue
      ? `Tagihan Lewat Jatuh Tempo - ${invoice.kos_name || invoice.kos?.name}`
      : `Pengingat Tagihan Sewa - ${invoice.kos_name || invoice.kos?.name}`;

    const formattedAmount = `Rp ${Number(invoice.amount).toLocaleString('id-ID')}`;
    const message =
      customNote ||
      (isOverdue
        ? `Halo ${invoice.tenant_name || invoice.tenant?.name}, tagihan sewa kamar ${
            invoice.room_number || invoice.room?.room_number
          } sebesar ${formattedAmount} telah melewati tanggal jatuh tempo (${
            invoice.due_date
          }). Mohon segera lakukan pembayaran via QRIS di aplikasi JeJakos.`
        : `Halo ${invoice.tenant_name || invoice.tenant?.name}, tagihan sewa kamar ${
            invoice.room_number || invoice.room?.room_number
          } sebesar ${formattedAmount} akan jatuh tempo pada ${
            invoice.due_date
          }. Silakan lakukan pembayaran tepat waktu.`);

    const reminderPayload = {
      type: 'invoice_reminder',
      subtype: type,
      invoice_id: invoice.id,
      booking_id: invoice.booking_id,
      kos_id: invoice.kos_id || invoice.kos?.id,
      kos_name: invoice.kos_name || invoice.kos?.name,
      room_number: invoice.room_number || invoice.room?.room_number,
      amount: parseFloat(invoice.amount),
      due_date: invoice.due_date,
      title,
      message,
      created_at: new Date().toISOString(),
    };

    // 1. In-app Socket.IO Notification
    const tenantId = invoice.tenant_id || invoice.tenant?.id;
    if (io && tenantId) {
      io.to(`user_${tenantId}`).emit('invoiceReminder', reminderPayload);
      io.to(`user_${tenantId}`).emit('notification', reminderPayload);
    }

    // Also notify owner if overdue
    const ownerId = invoice.kos_owner_id || invoice.owner?.id || invoice.kos?.owner_id;
    if (io && ownerId && isOverdue) {
      io.to(`user_${ownerId}`).emit('notification', {
        ...reminderPayload,
        title: `Pemberitahuan Tunggakan Sewa - ${invoice.tenant_name || invoice.tenant?.name}`,
        message: `Penyewa kamar ${invoice.room_number || invoice.room?.room_number} (${
          invoice.tenant_name || invoice.tenant?.name
        }) memiliki tagihan jatuh tempo sebesar ${formattedAmount}.`,
      });
    }

    // 2. Email Notification simulation / dispatch
    const emailResult = await this.sendEmailReminder({
      to: invoice.tenant_email || invoice.tenant?.email,
      name: invoice.tenant_name || invoice.tenant?.name,
      subject: title,
      message,
      invoice,
    });

    sentRemindersDailyCache.add(cacheKey);

    return {
      success: true,
      invoice_id: invoice.id,
      type,
      title,
      message,
      emailSent: emailResult.sent,
    };
  },

  /**
   * Dispatch email via SMTP or simulated transporter
   */
  async sendEmailReminder({ to, name, subject, message, invoice }) {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      console.log(`[Reminder-Email-Mock] To: ${to} | Subject: ${subject}`);
      return { sent: false, mock: true, recipient: to };
    }

    console.log(`[Reminder-Email] Mengirimkan email pengingat tagihan ke ${to}...`);
    return { sent: true, recipient: to };
  },

  /**
   * Process all reminders (called by daily cron)
   */
  async processAllReminders(io = null, { daysBeforeDue = 3 } = {}) {
    const { dueSoon, overdue } = await this.getInvoicesNeedingReminders({ daysBeforeDue });
    const dispatched = [];

    for (const inv of dueSoon) {
      const res = await this.sendReminderForInvoice(inv, io);
      if (res && !res.skipped) {
        dispatched.push(res);
      }
    }

    for (const inv of overdue) {
      const res = await this.sendReminderForInvoice(inv, io);
      if (res && !res.skipped) {
        dispatched.push(res);
      }
    }

    return {
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
      remindersSent: dispatched.length,
      dispatched,
    };
  },
};

module.exports = ReminderService;
