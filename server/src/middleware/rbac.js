const UserModel = require('../models/user.model');

/**
 * RBAC middleware to restrict access based on user role(s).
 * @param  {...string|string[]} allowedRoles
 */
const rbac = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Peran tidak memiliki izin' });
    }
    next();
  };
};

/**
 * Middleware to require admin approval (mainly for 'pemilik').
 */
const requireApproved = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autentikasi diperlukan' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Akun belum disetujui oleh admin' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to require email verification.
 */
const requireVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autentikasi diperlukan' });
  }

  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email belum diverifikasi' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

rbac.rbac = rbac;
rbac.requireApproved = requireApproved;
rbac.requireVerified = requireVerified;

module.exports = rbac;
