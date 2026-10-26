const BookingModel = require('../models/booking.model');
const RoomModel = require('../models/room.model');

const BookingController = {
  /**
   * POST /api/bookings — [pencari] pesan kamar (F-27)
   */
  async createBooking(req, res, next) {
    try {
      const { room_id, check_in_date, check_out_date, notes } = req.body;

      const roomId = parseInt(room_id, 10);
      if (isNaN(roomId)) {
        return res.status(400).json({ error: 'ID kamar tidak valid' });
      }

      if (check_out_date) {
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        if (checkOut < checkIn) {
          return res.status(400).json({
            error: 'Tanggal check-out tidak boleh lebih awal dari tanggal check-in',
          });
        }
      }

      const room = await RoomModel.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Kamar tidak ditemukan' });
      }

      if (!room.is_available) {
        return res.status(400).json({ error: 'Kamar sudah tidak tersedia' });
      }

      if (room.owner_id === req.user.id) {
        return res.status(400).json({ error: 'Pemilik tidak dapat memesan kamar di kos sendiri' });
      }

      const existingBooking = await BookingModel.findActiveOrPendingByTenantAndRoom(
        req.user.id,
        roomId
      );
      if (existingBooking) {
        return res.status(400).json({
          error: 'Anda sudah memiliki pemesanan aktif atau menunggu konfirmasi untuk kamar ini',
        });
      }

      const bookingId = await BookingModel.create({
        room_id: roomId,
        tenant_id: req.user.id,
        status: 'pending',
        check_in_date,
        check_out_date: check_out_date || null,
        notes: notes ? notes.trim() : null,
      });

      const booking = await BookingModel.findById(bookingId);

      res.status(201).json({
        message: 'Pemesanan berhasil diajukan',
        booking,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/bookings — list booking (filter by role & status) (F-29)
   */
  async listBookings(req, res, next) {
    try {
      const {
        status,
        kos_id,
        room_id,
        page = 1,
        limit = 10,
        sort = 'desc',
      } = req.query;

      let tenant_id = null;
      let owner_id = null;

      if (req.user.role === 'pencari') {
        tenant_id = req.user.id;
      } else if (req.user.role === 'pemilik') {
        owner_id = req.user.id;
      } else if (req.user.role === 'admin') {
        if (req.query.tenant_id) tenant_id = parseInt(req.query.tenant_id, 10);
        if (req.query.owner_id) owner_id = parseInt(req.query.owner_id, 10);
      }

      const result = await BookingModel.findAll({
        tenant_id,
        owner_id,
        kos_id: kos_id ? parseInt(kos_id, 10) : null,
        room_id: room_id ? parseInt(room_id, 10) : null,
        status: status || null,
        page,
        limit,
        sort,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/bookings/:id — detail pemesanan (F-29)
   */
  async getBookingById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID pemesanan tidak valid' });
      }

      const booking = await BookingModel.findById(id);
      if (!booking) {
        return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      const isTenant = req.user.id === booking.tenant_id;
      const isOwner = req.user.id === booking.kos.owner_id;

      if (!isAdmin && !isTenant && !isOwner) {
        return res.status(403).json({
          error: 'Akses ditolak. Anda tidak memiliki akses ke pemesanan ini',
        });
      }

      res.json({ booking });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/bookings/tenants — [pemilik, admin] list penghuni aktif (F-30)
   */
  async getActiveTenants(req, res, next) {
    try {
      const { kos_id, page = 1, limit = 10, search } = req.query;

      let owner_id = null;
      if (req.user.role === 'pemilik') {
        owner_id = req.user.id;
      } else if (req.user.role === 'admin') {
        if (req.query.owner_id) owner_id = parseInt(req.query.owner_id, 10);
      }

      const result = await BookingModel.findActiveTenants({
        owner_id,
        kos_id: kos_id ? parseInt(kos_id, 10) : null,
        page,
        limit,
        search: search || null,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/bookings/:id/status — [pemilik/admin/pencari] update status pemesanan (F-28, F-30)
   */
  async updateStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID pemesanan tidak valid' });
      }

      const { status, notes } = req.body;

      const booking = await BookingModel.findById(id);
      if (!booking) {
        return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
      }

      // Check if current status is already terminal
      if (['rejected', 'cancelled', 'completed'].includes(booking.status)) {
        return res.status(400).json({
          error: 'Status pemesanan sudah final dan tidak dapat diubah lagi',
        });
      }

      const isAdmin = req.user.role === 'admin';
      const isOwner = req.user.id === booking.kos.owner_id;
      const isTenant = req.user.id === booking.tenant_id;

      if (!isAdmin && !isOwner && !isTenant) {
        return res.status(403).json({
          error: 'Akses ditolak. Anda tidak memiliki izin untuk mengubah status pemesanan ini',
        });
      }

      // Tenant authorization rules
      if (isTenant && !isAdmin && !isOwner) {
        if (status !== 'cancelled') {
          return res.status(403).json({
            error: 'Pencari hanya dapat membatalkan pemesanan',
          });
        }
        if (booking.status !== 'pending' && booking.status !== 'accepted') {
          return res.status(400).json({
            error: 'Hanya pemesanan pending atau diterima yang dapat dibatalkan',
          });
        }
      }

      // Owner authorization rules
      if (isOwner && !isAdmin) {
        if (booking.status === 'pending' && !['accepted', 'rejected', 'active'].includes(status)) {
          return res.status(400).json({
            error: 'Pemilik hanya dapat menerima, menolak, atau mengaktifkan pemesanan yang berstatus pending',
          });
        }

        if (booking.status === 'accepted' && !['active', 'cancelled'].includes(status)) {
          return res.status(400).json({
            error: 'Pemesanan yang telah diterima hanya dapat diaktifkan atau dibatalkan',
          });
        }

        if (booking.status === 'active' && !['completed', 'cancelled'].includes(status)) {
          return res.status(400).json({
            error: 'Pemesanan aktif hanya dapat diselesaikan atau dibatalkan',
          });
        }

        if (status === 'accepted' || status === 'active') {
          const room = await RoomModel.findById(booking.room_id);
          if (!room || !room.is_available) {
            return res.status(400).json({
              error: 'Kamar sudah tidak tersedia atau sudah ditempati',
            });
          }
        }
      }

      const updateResult = await BookingModel.updateStatus(
        booking.id,
        status,
        notes !== undefined ? notes : null
      );

      if (!updateResult.success) {
        return res.status(400).json({ error: updateResult.error });
      }

      const updated = await BookingModel.findById(booking.id);

      res.json({
        message: 'Status pemesanan berhasil diperbarui',
        booking: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = BookingController;
