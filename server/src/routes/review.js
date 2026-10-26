const express = require('express');
const { body } = require('express-validator');
const reviewController = require('../controllers/review.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/kos/:kosId', reviewController.listKosReviews);
router.post('/', auth, rbac('pencari'), [
  body('booking_id').isInt().withMessage('ID pemesanan harus berupa angka'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating harus antara 1 sampai 5'),
  body('content').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('Ulasan maksimal 2000 karakter'),
  validate,
], reviewController.createReview);

module.exports = router;
