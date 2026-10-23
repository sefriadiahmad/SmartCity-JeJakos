const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/room.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const validate = require('../middleware/validate');
const upload = require('../config/multer');

const router = express.Router({ mergeParams: true });

// GET /api/kos/:kosId/rooms — list kamar
router.get('/', auth.optional, roomController.listRooms);

// GET /api/kos/:kosId/rooms/:id — detail kamar
router.get('/:id', auth.optional, roomController.getRoomById);

// POST /api/kos/:kosId/rooms — [pemilik, admin] tambah kamar
router.post(
  '/',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  upload.any(),
  [
    body('price').isFloat({ min: 0 }).withMessage('Harga kamar harus angka positif'),
    body('pay_period')
      .optional()
      .isIn(['bulanan', 'tahunan'])
      .withMessage('Periode bayar harus bulanan atau tahunan'),
    body('room_number').optional().trim(),
    body('description').optional().trim(),
    validate,
  ],
  roomController.createRoom
);

// PUT /api/kos/:kosId/rooms/:id — [pemilik, admin] edit kamar
router.put(
  '/:id',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  upload.any(),
  [
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Harga kamar harus angka positif'),
    body('pay_period')
      .optional()
      .isIn(['bulanan', 'tahunan'])
      .withMessage('Periode bayar harus bulanan atau tahunan'),
    body('room_number').optional().trim(),
    body('description').optional().trim(),
    validate,
  ],
  roomController.updateRoom
);

// DELETE /api/kos/:kosId/rooms/:id — [pemilik, admin] hapus kamar
router.delete(
  '/:id',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  roomController.deleteRoom
);

module.exports = router;
