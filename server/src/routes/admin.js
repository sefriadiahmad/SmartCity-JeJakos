const express = require('express');
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Semua route admin mewajibkan login dan role 'admin'
router.use(auth);
router.use(rbac('admin'));

// F-17, F-15: Manajemen User & Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/approve', adminController.approveUser);

// F-17, F-16: Verifikasi & Listing Kos
router.get('/kos', adminController.listKos);
router.get('/kos/:id', adminController.getKosById);
router.put('/kos/:id/approve', adminController.approveKos);

// F-17: Daftar Kamar
router.get('/rooms', adminController.listRooms);

// F-18: Moderasi Ulasan
router.get('/reviews', adminController.listReviews);
router.put('/reviews/:id/moderate', adminController.moderateReview);
router.delete('/reviews/:id', adminController.deleteReview);

module.exports = router;
