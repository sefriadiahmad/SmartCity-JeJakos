const express = require('express');
const { body } = require('express-validator');
const chatbotController = require('../controllers/chatbot.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Semua endpoint chatbot memerlukan autentikasi
router.use(auth);

// POST /api/chatbot/message — kirim pesan ke chatbot
router.post(
  '/message',
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Pesan wajib diisi')
      .isLength({ max: 2000 })
      .withMessage('Pesan maksimal 2000 karakter'),
    body('session_id').optional().trim(),
    body('history').optional().isArray().withMessage('Riwayat harus berupa array'),
    validate,
  ],
  chatbotController.sendMessage
);

// GET /api/chatbot/history — riwayat pesan per sesi/user
router.get('/history', chatbotController.getHistory);

module.exports = router;
