const InvoiceModel = require('../models/invoice.model');
const MidtransService = require('../services/midtrans.service');

const InvoiceController = {
  /**
   * GET /api/invoices — list tagihan (filter by role & status) (F-34)
   */
  async listInvoices(req, res, next) {
    try {
      const {
        status,
        booking_id,
        kos_id,
        page = 1,
        limit = 10,
        sort = 'desc',
      } = req.query;

      let tenant_id = null;
      let owner_id = null;

      if (req.user.role === 'pencari') {
        tenant_id = req.user.id;
      } else if (req.user.role === 'pemilik') {
        owner_id = req.user.id;
      } else if (req.user.role === 'admin') {
        if (req.query.tenant_id) tenant_id = parseInt(req.query.tenant_id, 10);
        if (req.query.owner_id) owner_id = parseInt(req.query.owner_id, 10);
      }

      const result = await InvoiceModel.findAll({
        tenant_id,
        owner_id,
        kos_id: kos_id ? parseInt(kos_id, 10) : null,
        booking_id: booking_id ? parseInt(booking_id, 10) : null,
        status: status || null,
        page,
        limit,
        sort,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/invoices/:id — detail tagihan
   */
  async getInvoiceById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID tagihan tidak valid' });
      }

      const invoice = await InvoiceModel.findById(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Tagihan tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      const isTenant = req.user.id === invoice.tenant.id;
      const isOwner = req.user.id === invoice.owner.id;

      if (!isAdmin && !isTenant && !isOwner) {
        return res.status(403).json({
          error: 'Akses ditolak. Anda tidak memiliki akses ke tagihan ini',
        });
      }

      res.json({ invoice });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/invoices/:id/pay — [pencari] siapkan pembayaran via gateway Midtrans QRIS (F-32)
   */
  async payInvoice(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID tagihan tidak valid' });
      }

      const invoice = await InvoiceModel.findById(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Tagihan tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      const isTenant = req.user.id === invoice.tenant.id;

      if (!isAdmin && !isTenant) {
        return res.status(403).json({
          error: 'Akses ditolak. Hanya penyewa terkait yang dapat membayar tagihan ini',
        });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({
          error: 'Tagihan ini sudah lunas',
        });
      }

      const snapData = await MidtransService.createSnapTransaction(invoice);

      res.json({
        message: 'Transaksi Midtrans berhasil disiapkan',
        invoice_id: invoice.id,
        amount: invoice.amount,
        ...snapData,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/invoices/generate — [admin] trigger pemrosesan tagihan berulang manual (F-31)
   */
  async triggerGenerate(req, res, next) {
    try {
      const result = await InvoiceModel.generateRecurringInvoices();
      res.json({
        message: 'Pemrosesan tagihan berulang selesai',
        count: result.count,
        generated: result.generated,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = InvoiceController;
