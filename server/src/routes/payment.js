const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Webhook Midtrans dipanggil oleh server Midtrans (tanpa user Bearer token)
router.post('/callback', paymentController.handleCallback);

module.exports = router;
