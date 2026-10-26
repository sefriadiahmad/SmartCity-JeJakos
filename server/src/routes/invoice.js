const express = require('express');
const invoiceController = require('../controllers/invoice.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Semua rute tagihan membutuhkan autentikasi
router.use(auth);

// GET /api/invoices — list tagihan (filter by role & status)
router.get('/', invoiceController.listInvoices);

// POST /api/invoices/generate — [admin] manual trigger pemrosesan tagihan berulang (F-31)
router.post('/generate', rbac('admin'), invoiceController.triggerGenerate);

// POST /api/invoices/reminders/process — [admin] manual trigger scheduler pengingat (F-35)
router.post('/reminders/process', rbac('admin'), invoiceController.triggerReminders);

// GET /api/invoices/:id — detail tagihan
router.get('/:id', invoiceController.getInvoiceById);

// POST /api/invoices/:id/pay — [pencari, admin] siapkan pembayaran via Midtrans QRIS (F-32)
router.post('/:id/pay', invoiceController.payInvoice);

// POST /api/invoices/:id/manual — [pemilik, admin] catat bayar manual (F-33)
router.post('/:id/manual', rbac('pemilik', 'admin'), invoiceController.recordManualPayment);

// POST /api/invoices/:id/remind — [pemilik, admin] kirim pengingat tagihan ke penyewa (F-35)
router.post('/:id/remind', rbac('pemilik', 'admin'), invoiceController.sendSingleReminder);

module.exports = router;
