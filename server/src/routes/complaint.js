const express = require('express');
const { body } = require('express-validator');
const complaintController = require('../controllers/complaint.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

router.post('/', [
  body('booking_id').isInt().withMessage('ID pemesanan harus berupa angka'),
  body('subject').trim().isLength({ min: 3, max: 255 }).withMessage('Subjek harus berisi 3-255 karakter'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Deskripsi harus berisi 10-5000 karakter'),
  validate,
], complaintController.createComplaint);
router.get('/', complaintController.listComplaints);
router.get('/:id', complaintController.getComplaintById);
router.post('/:id/responses', [
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Tanggapan harus berisi 1-5000 karakter'),
  validate,
], complaintController.addResponse);
router.put('/:id/status', [
  body('status').isIn(['open', 'in_progress', 'resolved']).withMessage('Status pengaduan tidak valid'),
  validate,
], complaintController.updateStatus);

module.exports = router;
