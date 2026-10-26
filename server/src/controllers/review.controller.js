const BookingModel = require('../models/booking.model');
const KosModel = require('../models/kos.model');
const ReviewModel = require('../models/review.model');

const ReviewController = {
  async createReview(req, res, next) {
    try {
      const bookingId = parseInt(req.body.booking_id, 10);
      const booking = await BookingModel.findById(bookingId);
      if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
      if (booking.tenant_id !== req.user.id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan penghuni dari pemesanan ini' });
      }
      if (!['active', 'completed'].includes(booking.status)) {
        return res.status(400).json({ error: 'Ulasan hanya dapat dibuat untuk hunian aktif atau selesai' });
      }
      if (await ReviewModel.findByBookingId(bookingId)) {
        return res.status(400).json({ error: 'Ulasan untuk pemesanan ini sudah dibuat' });
      }

      const reviewId = await ReviewModel.create({
        kos_id: booking.kos.id,
        booking_id: bookingId,
        user_id: req.user.id,
        rating: req.body.rating,
        content: req.body.content?.trim() || null,
      });
      const review = await ReviewModel.findById(reviewId);
      const rating_summary = await ReviewModel.getRatingSummary(booking.kos.id);
      res.status(201).json({ message: 'Ulasan berhasil dikirim', review, rating_summary });
    } catch (err) {
      next(err);
    }
  },

  async listKosReviews(req, res, next) {
    try {
      const kosId = parseInt(req.params.kosId, 10);
      if (isNaN(kosId)) return res.status(400).json({ error: 'ID kos tidak valid' });
      const kos = await KosModel.findById(kosId);
      if (!kos) return res.status(404).json({ error: 'Kos tidak ditemukan' });
      const result = await ReviewModel.findAll({
        kos_id: kosId,
        is_moderated: false,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
      });
      res.json({ reviews: result.data, ...result, rating_summary: await ReviewModel.getRatingSummary(kosId) });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ReviewController;
