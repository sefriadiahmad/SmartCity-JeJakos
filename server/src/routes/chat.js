const express = require('express');
const { body } = require('express-validator');
const chatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Semua endpoint chat memerlukan autentikasi login
router.use(auth);

// GET /api/conversations/unread-count — total pesan belum dibaca
router.get('/unread-count', chatController.getUnreadCount);

// GET /api/conversations — list percakapan user (F-25)
router.get('/', chatController.listConversations);

// POST /api/conversations — mulai percakapan baru atau ambil yang sudah ada (F-24)
router.post(
  '/',
  [
    body('recipient_id').optional().isInt().withMessage('ID penerima harus berupa angka'),
    body('kos_id').optional().isInt().withMessage('ID kos harus berupa angka'),
    body('message').optional().isString().trim().isLength({ max: 5000 }).withMessage('Pesan maksimal 5000 karakter'),
    body('content').optional().isString().trim().isLength({ max: 5000 }).withMessage('Pesan maksimal 5000 karakter'),
    validate,
  ],
  chatController.startConversation
);

// GET /api/conversations/:id — detail percakapan
router.get('/:id', chatController.getConversation);

// GET /api/conversations/:id/messages — list pesan dalam percakapan (F-25)
router.get('/:id/messages', chatController.listMessages);

// POST /api/conversations/:id/messages — kirim pesan baru (F-24, F-25)
router.post(
  '/:id/messages',
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Isi pesan wajib diisi')
      .isLength({ max: 5000 })
      .withMessage('Pesan maksimal 5000 karakter'),
    validate,
  ],
  chatController.sendMessage
);

// PUT /api/conversations/:id/read — tandai pesan sudah dibaca
router.put('/:id/read', chatController.markRead);

module.exports = router;
