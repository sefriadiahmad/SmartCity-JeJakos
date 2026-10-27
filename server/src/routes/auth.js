const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../config/multer');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
    body('name').optional().trim(),
    body('phone').optional().trim(),
    validate,
  ],
  authController.register
);

// Google OAuth creates new accounts as pencari.
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
    validate,
  ],
  authController.login
);

// POST /api/auth/verify-email
router.post('/verify-email', authController.verifyEmail);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Format email tidak valid'), validate],
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token reset password wajib diisi'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
    validate,
  ],
  authController.resetPassword
);

// POST /api/auth/refresh-token
router.post('/refresh-token', authController.refreshToken);

// GET /api/auth/me
router.get('/me', auth, authController.getMe);

// PUT /api/auth/profile
router.put(
  '/profile',
  auth,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  [
    body('name').optional().trim(),
    body('phone').optional().trim(),
    validate,
  ],
  authController.updateProfile
);

// Pencari mengajukan akun mitra; admin tetap menentukan persetujuannya.
router.post('/become-partner', auth, authController.becomePartner);

// POST /api/auth/logout
router.post('/logout', authController.logout);

module.exports = router;
