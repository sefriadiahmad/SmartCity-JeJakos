const KosModel = require('../models/kos.model');
const RoomModel = require('../models/room.model');

function getKosId(req) {
  return parseInt(req.params.kosId || req.params.id, 10);
}

const RoomController = {
  async listRooms(req, res, next) {
    try {
      const kosId = getKosId(req);
      if (isNaN(kosId)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(kosId);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const available = req.query.available !== undefined
        ? (req.query.available === 'true' || req.query.available === '1')
        : null;

      const rooms = await RoomModel.findByKosId(kosId, { available });
      res.json({ rooms });
    } catch (err) {
      next(err);
    }
  },

  async getRoomById(req, res, next) {
    try {
      const kosId = getKosId(req);
      const roomId = parseInt(req.params.roomId || req.params.id, 10);

      if (isNaN(kosId) || isNaN(roomId)) {
        return res.status(400).json({ error: 'ID kos atau ID kamar tidak valid' });
      }

      const kos = await KosModel.findById(kosId);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const room = await RoomModel.findById(roomId);
      if (!room || room.kos_id !== kosId) {
        return res.status(404).json({ error: 'Kamar tidak ditemukan' });
      }

      res.json({ room });
    } catch (err) {
      next(err);
    }
  },

  async createRoom(req, res, next) {
    try {
      const kosId = getKosId(req);
      if (isNaN(kosId)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(kosId);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const {
        room_number,
        price,
        pay_period,
        description,
        is_available,
        photos,
        photo_urls,
      } = req.body;

      const uploadedFiles = req.files || (req.file ? [req.file] : []);
      const uploadedUrls = uploadedFiles.map((f) => `/uploads/${f.filename}`);

      let inputPhotoUrls = [];
      const rawPhotos = photo_urls || photos;
      if (rawPhotos) {
        if (Array.isArray(rawPhotos)) {
          inputPhotoUrls = rawPhotos;
        } else if (typeof rawPhotos === 'string') {
          try {
            inputPhotoUrls = JSON.parse(rawPhotos);
          } catch {
            inputPhotoUrls = [rawPhotos];
          }
        }
      }

      const combinedPhotos = [...uploadedUrls, ...inputPhotoUrls];

      const roomId = await RoomModel.create({
        kos_id: kosId,
        room_number: room_number || null,
        price: parseFloat(price),
        pay_period: pay_period || 'bulanan',
        description: description || null,
        is_available: is_available !== undefined ? (is_available === true || is_available === 'true' || is_available === '1' || is_available === 1) : true,
        photo_urls: combinedPhotos,
      });

      const newRoom = await RoomModel.findById(roomId);
      res.status(201).json({
        message: 'Kamar berhasil ditambahkan',
        room: newRoom,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRoom(req, res, next) {
    try {
      const kosId = getKosId(req);
      const roomId = parseInt(req.params.roomId || req.params.id, 10);

      if (isNaN(kosId) || isNaN(roomId)) {
        return res.status(400).json({ error: 'ID kos atau ID kamar tidak valid' });
      }

      const kos = await KosModel.findById(kosId);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const room = await RoomModel.findById(roomId);
      if (!room || room.kos_id !== kosId) {
        return res.status(404).json({ error: 'Kamar tidak ditemukan' });
      }

      const {
        room_number,
        price,
        pay_period,
        description,
        is_available,
        photos,
        photo_urls,
      } = req.body;

      const updateFields = {};
      if (room_number !== undefined) updateFields.room_number = room_number;
      if (price !== undefined) updateFields.price = parseFloat(price);
      if (pay_period !== undefined) updateFields.pay_period = pay_period;
      if (description !== undefined) updateFields.description = description;
      if (is_available !== undefined) {
        updateFields.is_available = is_available === true || is_available === 'true' || is_available === '1' || is_available === 1;
      }

      const uploadedFiles = req.files || (req.file ? [req.file] : []);
      const uploadedUrls = uploadedFiles.map((f) => `/uploads/${f.filename}`);

      let inputPhotoUrls = [];
      const rawPhotos = photo_urls || photos;
      if (rawPhotos) {
        if (Array.isArray(rawPhotos)) {
          inputPhotoUrls = rawPhotos;
        } else if (typeof rawPhotos === 'string') {
          try {
            inputPhotoUrls = JSON.parse(rawPhotos);
          } catch {
            inputPhotoUrls = [rawPhotos];
          }
        }
      }

      const combinedPhotos = [...uploadedUrls, ...inputPhotoUrls];
      if (combinedPhotos.length > 0) {
        updateFields.photo_urls = combinedPhotos;
      }

      await RoomModel.update(roomId, updateFields);
      const updatedRoom = await RoomModel.findById(roomId);

      res.json({
        message: 'Kamar berhasil diperbarui',
        room: updatedRoom,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteRoom(req, res, next) {
    try {
      const kosId = getKosId(req);
      const roomId = parseInt(req.params.roomId || req.params.id, 10);

      if (isNaN(kosId) || isNaN(roomId)) {
        return res.status(400).json({ error: 'ID kos atau ID kamar tidak valid' });
      }

      const kos = await KosModel.findById(kosId);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const room = await RoomModel.findById(roomId);
      if (!room || room.kos_id !== kosId) {
        return res.status(404).json({ error: 'Kamar tidak ditemukan' });
      }

      await RoomModel.delete(roomId);
      res.json({ message: 'Kamar berhasil dihapus' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = RoomController;
