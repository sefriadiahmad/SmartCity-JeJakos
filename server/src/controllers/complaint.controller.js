const BookingModel = require('../models/booking.model');
const ComplaintModel = require('../models/complaint.model');

function canAccess(user, complaint) {
  return user.role === 'admin' || user.id === complaint.booking.owner_id || user.id === complaint.user_id;
}

const ComplaintController = {
  async createComplaint(req, res, next) {
    try {
      const bookingId = parseInt(req.body.booking_id, 10);
      const booking = await BookingModel.findById(bookingId);
      if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
      if (booking.tenant_id !== req.user.id) {
        return res.status(403).json({ error: 'Akses ditolak. Hanya penghuni terkait yang dapat membuat pengaduan' });
      }
      if (booking.status !== 'active') {
        return res.status(400).json({ error: 'Pengaduan hanya dapat dibuat untuk hunian aktif' });
      }

      const complaintId = await ComplaintModel.create({
        booking_id: bookingId,
        user_id: req.user.id,
        subject: req.body.subject.trim(),
        description: req.body.description.trim(),
      });
      const complaint = await ComplaintModel.findById(complaintId);
      res.status(201).json({ message: 'Pengaduan berhasil dibuat', complaint });
    } catch (err) {
      next(err);
    }
  },

  async listComplaints(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const tenant_id = req.user.role === 'pencari' ? req.user.id : req.user.role === 'admin' && req.query.tenant_id ? parseInt(req.query.tenant_id, 10) : null;
      const owner_id = req.user.role === 'pemilik' ? req.user.id : req.user.role === 'admin' && req.query.owner_id ? parseInt(req.query.owner_id, 10) : null;
      res.json(await ComplaintModel.findAll({ tenant_id, owner_id, status: status || null, page, limit }));
    } catch (err) {
      next(err);
    }
  },

  async getComplaintById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID pengaduan tidak valid' });
      const complaint = await ComplaintModel.findById(id);
      if (!complaint) return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
      if (!canAccess(req.user, complaint)) return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki akses ke pengaduan ini' });
      res.json({ complaint });
    } catch (err) {
      next(err);
    }
  },

  async addResponse(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID pengaduan tidak valid' });
      const complaint = await ComplaintModel.findById(id);
      if (!complaint) return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
      if (req.user.role !== 'admin' && req.user.id !== complaint.booking.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Hanya pemilik kos terkait yang dapat menanggapi pengaduan' });
      }
      await ComplaintModel.addResponse({ complaint_id: id, user_id: req.user.id, content: req.body.content.trim() });
      res.status(201).json({ message: 'Tanggapan berhasil dikirim', complaint: await ComplaintModel.findById(id) });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID pengaduan tidak valid' });
      const complaint = await ComplaintModel.findById(id);
      if (!complaint) return res.status(404).json({ error: 'Pengaduan tidak ditemukan' });
      if (req.user.role !== 'admin' && req.user.id !== complaint.booking.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Hanya pemilik kos terkait yang dapat mengubah status pengaduan' });
      }
      await ComplaintModel.updateStatus(id, req.body.status);
      res.json({ message: 'Status pengaduan berhasil diperbarui', complaint: await ComplaintModel.findById(id) });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ComplaintController;
