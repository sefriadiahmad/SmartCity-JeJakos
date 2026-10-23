const express = require('express');
const { body } = require('express-validator');
const kosController = require('../controllers/kos.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const validate = require('../middleware/validate');
const upload = require('../config/multer');

const router = express.Router();

// GET /api/kos/facilities — list master data fasilitas
router.get('/facilities', kosController.getFacilities);

// GET /api/kos/nearby — pencarian geospasial
router.get('/nearby', auth.optional, kosController.nearbyKos);

// GET /api/kos — list kos (public/filter/search)
router.get('/', auth.optional, kosController.listKos);

// GET /api/kos/:id — detail kos
router.get('/:id', auth.optional, kosController.getKosById);

// POST /api/kos — [pemilik, admin] tambah kos
router.post(
  '/',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  [
    body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Nama kos minimal 3 karakter'),
    body('address').trim().isLength({ min: 5 }).withMessage('Alamat kos minimal 5 karakter'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude harus angka valid antara -90 dan 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude harus angka valid antara -180 dan 180'),
    body('type').isIn(['putra', 'putri', 'campur']).withMessage('Tipe kos harus salah satu dari: putra, putri, campur'),
    body('district').optional().trim(),
    body('description').optional().trim(),
    validate,
  ],
  kosController.createKos
);

// PUT /api/kos/:id — [pemilik, admin] edit kos
router.put(
  '/:id',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  [
    body('name').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Nama kos minimal 3 karakter'),
    body('address').optional().trim().isLength({ min: 5 }).withMessage('Alamat kos minimal 5 karakter'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude harus angka valid antara -90 dan 90'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude harus angka valid antara -180 dan 180'),
    body('type').optional().isIn(['putra', 'putri', 'campur']).withMessage('Tipe kos harus salah satu dari: putra, putri, campur'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status harus active atau inactive'),
    body('district').optional().trim(),
    body('description').optional().trim(),
    validate,
  ],
  kosController.updateKos
);

// DELETE /api/kos/:id — [pemilik, admin] hapus kos
router.delete('/:id', auth, rbac('pemilik', 'admin'), rbac.requireApproved, kosController.deleteKos);

// POST /api/kos/:id/photos — [pemilik, admin] upload foto
router.post(
  '/:id/photos',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  upload.any(),
  kosController.uploadPhotos
);

// DELETE /api/kos/:id/photos/:photoId — [pemilik, admin] hapus foto
router.delete(
  '/:id/photos/:photoId',
  auth,
  rbac('pemilik', 'admin'),
  rbac.requireApproved,
  kosController.deletePhoto
);

// Rooms sub-router (/api/kos/:kosId/rooms)
router.use('/:kosId/rooms', require('./room'));

module.exports = router;
