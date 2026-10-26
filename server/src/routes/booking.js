const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// Semua rute booking membutuhkan login
router.use(auth);

// POST /api/bookings — [pencari, admin] buat pemesanan baru (F-27)
router.post(
  '/',
  rbac('pencari', 'admin'),
  [
    body('room_id').isInt().withMessage('ID kamar harus berupa angka'),
    body('check_in_date').isISO8601().withMessage('Format tanggal check-in tidak valid (YYYY-MM-DD)'),
    body('check_out_date')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Format tanggal check-out tidak valid (YYYY-MM-DD)'),
    body('notes')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Catatan maksimal 1000 karakter'),
    validate,
  ],
  bookingController.createBooking
);

// GET /api/bookings — list pemesanan sesuai peran (F-29)
router.get('/', bookingController.listBookings);

// GET /api/bookings/tenants — [pemilik, admin] list penghuni aktif (F-30)
router.get('/tenants', rbac('pemilik', 'admin'), bookingController.getActiveTenants);

// GET /api/bookings/:id — detail pemesanan (F-29)
router.get('/:id', bookingController.getBookingById);

// PUT /api/bookings/:id/status — [pemilik, admin, pencari] update status pemesanan (F-28)
router.put(
  '/:id/status',
  [
    body('status')
      .isIn(['pending', 'accepted', 'rejected', 'active', 'completed', 'cancelled'])
      .withMessage('Status pemesanan tidak valid'),
    body('notes')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Catatan maksimal 1000 karakter'),
    validate,
  ],
  bookingController.updateStatus
);

module.exports = router;
