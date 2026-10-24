const db = require('../config/db');
const UserModel = require('../models/user.model');
const KosModel = require('../models/kos.model');
const RoomModel = require('../models/room.model');
const ReviewModel = require('../models/review.model');
const ChatbotModel = require('../models/chatbot.model');

const AdminController = {
  // GET /api/admin/dashboard — statistik platform (design.md §3 line 332)
  async getDashboard(req, res, next) {
    try {
      const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) AS totalUsers FROM users');
      const [[{ pendingOwners }]] = await db.execute("SELECT COUNT(*) AS pendingOwners FROM users WHERE role = 'pemilik' AND is_approved = 0");
      const [[{ totalKos }]] = await db.execute('SELECT COUNT(*) AS totalKos FROM kos');
      const [[{ pendingKos }]] = await db.execute('SELECT COUNT(*) AS pendingKos FROM kos WHERE is_approved = 0');
      const [[{ totalReviews }]] = await db.execute('SELECT COUNT(*) AS totalReviews FROM reviews');
      const [[{ totalRooms }]] = await db.execute('SELECT COUNT(*) AS totalRooms FROM rooms');

      res.json({
        totalUsers: Number(totalUsers),
        pendingOwners: Number(pendingOwners),
        totalKos: Number(totalKos),
        pendingKos: Number(pendingKos),
        totalReviews: Number(totalReviews),
        totalRooms: Number(totalRooms),
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/users — list pengguna (filter & pagination)
  async listUsers(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        search,
        q,
        is_approved,
        is_verified,
      } = req.query;

      let parsedApproved = null;
      if (is_approved !== undefined && is_approved !== '') {
        parsedApproved = is_approved === 'true' || is_approved === '1' || is_approved === true;
      }

      let parsedVerified = null;
      if (is_verified !== undefined && is_verified !== '') {
        parsedVerified = is_verified === 'true' || is_verified === '1' || is_verified === true;
      }

      const result = await UserModel.findAll({
        page,
        limit,
        role: role || null,
        search: search || q || null,
        is_approved: parsedApproved,
        is_verified: parsedVerified,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/users/:id — detail pengguna
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      res.json({
        ...user,
        is_verified: Boolean(user.is_verified),
        is_approved: Boolean(user.is_approved),
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/admin/users/:id/approve — verifikasi pemilik kos (approve/reject)
  async approveUser(req, res, next) {
    try {
      const { id } = req.params;
      const { is_approved, approve } = req.body || {};

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      if (user.role !== 'pemilik') {
        return res.status(400).json({ error: 'Hanya akun pemilik yang memerlukan persetujuan' });
      }

      let targetApproved = true;
      if (is_approved !== undefined) {
        targetApproved = is_approved === true || is_approved === 'true' || is_approved === 1 || is_approved === '1';
      } else if (approve !== undefined) {
        targetApproved = approve === true || approve === 'true' || approve === 1 || approve === '1';
      }

      await UserModel.setApproved(id, targetApproved);
      const updatedUser = await UserModel.findById(id);

      res.json({
        message: targetApproved
          ? 'Pemilik berhasil disetujui'
          : 'Persetujuan pemilik berhasil dibatalkan',
        user: {
          ...updatedUser,
          is_verified: Boolean(updatedUser.is_verified),
          is_approved: Boolean(updatedUser.is_approved),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/kos — list semua kos (semua status & approval)
  async listKos(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        q,
        district,
        type,
        status,
        is_approved,
        owner_id,
        sort,
      } = req.query;

      let parsedApproved = null;
      if (is_approved !== undefined && is_approved !== '') {
        parsedApproved = is_approved === 'true' || is_approved === '1' || is_approved === true;
      }

      const result = await KosModel.findAll({
        page,
        limit,
        search: search || q || null,
        district: district || null,
        type: type || null,
        status: status || null,
        is_approved: parsedApproved,
        owner_id: owner_id ? parseInt(owner_id, 10) : null,
        sort: sort || null,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/kos/:id — detail kos untuk admin
  async getKosById(req, res, next) {
    try {
      const { id } = req.params;
      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      res.json(kos);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/admin/kos/:id/approve — verifikasi listing kos (approve/reject)
  async approveKos(req, res, next) {
    try {
      const { id } = req.params;
      const { is_approved, approve } = req.body || {};

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      let targetApproved = true;
      if (is_approved !== undefined) {
        targetApproved = is_approved === true || is_approved === 'true' || is_approved === 1 || is_approved === '1';
      } else if (approve !== undefined) {
        targetApproved = approve === true || approve === 'true' || approve === 1 || approve === '1';
      }

      await KosModel.update(id, { is_approved: targetApproved });
      const updatedKos = await KosModel.findById(id);

      res.json({
        message: targetApproved
          ? 'Kos berhasil disetujui'
          : 'Persetujuan kos berhasil dibatalkan',
        kos: updatedKos,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/rooms — list kamar
  async listRooms(req, res, next) {
    try {
      const { page = 1, limit = 10, kos_id, is_available } = req.query;

      let parsedAvailable = null;
      if (is_available !== undefined && is_available !== '') {
        parsedAvailable = is_available === 'true' || is_available === '1' || is_available === true;
      }

      const result = await RoomModel.findAll({
        page,
        limit,
        kos_id: kos_id ? parseInt(kos_id, 10) : null,
        is_available: parsedAvailable,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/reviews — list ulasan untuk moderasi
  async listReviews(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        kos_id,
        user_id,
        is_moderated,
        search,
        q,
      } = req.query;

      let parsedModerated = null;
      if (is_moderated !== undefined && is_moderated !== '') {
        parsedModerated = is_moderated === 'true' || is_moderated === '1' || is_moderated === true;
      }

      const result = await ReviewModel.findAll({
        page,
        limit,
        kos_id: kos_id ? parseInt(kos_id, 10) : null,
        user_id: user_id ? parseInt(user_id, 10) : null,
        is_moderated: parsedModerated,
        search: search || q || null,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/admin/reviews/:id/moderate — moderasi ulasan (tandai/sembunyikan)
  async moderateReview(req, res, next) {
    try {
      const { id } = req.params;
      const { is_moderated, moderate } = req.body || {};

      const review = await ReviewModel.findById(id);
      if (!review) {
        return res.status(404).json({ error: 'Ulasan tidak ditemukan' });
      }

      let targetModerated = true;
      if (is_moderated !== undefined) {
        targetModerated = is_moderated === true || is_moderated === 'true' || is_moderated === 1 || is_moderated === '1';
      } else if (moderate !== undefined) {
        targetModerated = moderate === true || moderate === 'true' || moderate === 1 || moderate === '1';
      }

      await ReviewModel.setModerated(id, targetModerated);
      const updatedReview = await ReviewModel.findById(id);

      res.json({
        message: targetModerated
          ? 'Ulasan berhasil dimoderasi'
          : 'Status moderasi ulasan berhasil dibatalkan',
        review: updatedReview,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/admin/reviews/:id — hapus ulasan melanggar
  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      const review = await ReviewModel.findById(id);
      if (!review) {
        return res.status(404).json({ error: 'Ulasan tidak ditemukan' });
      }

      await ReviewModel.delete(id);
      res.json({ message: 'Ulasan berhasil dihapus' });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/chatbot-logs — pantau log chatbot (data pribadi disamarkan, F-23)
  async listChatbotLogs(req, res, next) {
    try {
      const { page, limit, user_id, search, q, start_date, end_date } = req.query;

      const result = await ChatbotModel.findAllLogs({
        page,
        limit,
        user_id: user_id ? parseInt(user_id, 10) : null,
        search: search || q || null,
        start_date: start_date || null,
        end_date: end_date || null,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AdminController;
