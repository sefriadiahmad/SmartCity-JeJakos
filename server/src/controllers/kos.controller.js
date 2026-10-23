const KosModel = require('../models/kos.model');

const KosController = {
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
        owner_id,
        facility_ids,
        is_approved,
      } = req.query;

      const isAdmin = req.user && req.user.role === 'admin';
      const isOwnerSelf = req.user && owner_id && String(req.user.id) === String(owner_id);

      let effectiveStatus = 'active';
      let effectiveIsApproved = true;

      if (isAdmin) {
        effectiveStatus = status || null;
        effectiveIsApproved = is_approved !== undefined ? is_approved === 'true' || is_approved === '1' : null;
      } else if (isOwnerSelf) {
        effectiveStatus = status || null;
        effectiveIsApproved = is_approved !== undefined ? is_approved === 'true' || is_approved === '1' : null;
      }

      let parsedFacilityIds = [];
      if (facility_ids) {
        if (Array.isArray(facility_ids)) {
          parsedFacilityIds = facility_ids;
        } else if (typeof facility_ids === 'string') {
          parsedFacilityIds = facility_ids.split(',').map((id) => id.trim()).filter(Boolean);
        }
      }

      const result = await KosModel.findAll({
        page,
        limit,
        search: search || q || null,
        district: district || null,
        type: type || null,
        owner_id: owner_id ? parseInt(owner_id, 10) : null,
        status: effectiveStatus,
        is_approved: effectiveIsApproved,
        facility_ids: parsedFacilityIds,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getKosById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user && req.user.role === 'admin';
      const isOwner = req.user && req.user.id === kos.owner_id;

      if ((!kos.is_approved || kos.status !== 'active') && !isAdmin && !isOwner) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      res.json({ kos });
    } catch (err) {
      next(err);
    }
  },

  async createKos(req, res, next) {
    try {
      const {
        name,
        address,
        latitude,
        longitude,
        district,
        type,
        description,
        facility_ids,
        owner_id,
        is_approved,
      } = req.body;

      const isAdmin = req.user.role === 'admin';
      const targetOwnerId = isAdmin && owner_id ? parseInt(owner_id, 10) : req.user.id;
      const initialApproved = isAdmin && is_approved !== undefined ? Boolean(is_approved) : false;

      let parsedFacilityIds = [];
      if (facility_ids) {
        if (Array.isArray(facility_ids)) {
          parsedFacilityIds = facility_ids;
        } else if (typeof facility_ids === 'string') {
          try {
            parsedFacilityIds = JSON.parse(facility_ids);
          } catch {
            parsedFacilityIds = facility_ids.split(',').map((id) => id.trim()).filter(Boolean);
          }
        }
      }

      const kosId = await KosModel.create({
        owner_id: targetOwnerId,
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        district: district || null,
        type,
        description: description || null,
        is_approved: initialApproved,
        status: 'active',
        facility_ids: parsedFacilityIds,
      });

      const newKos = await KosModel.findById(kosId);
      res.status(201).json({
        message: 'Kos berhasil didaftarkan',
        kos: newKos,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateKos(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const {
        name,
        address,
        latitude,
        longitude,
        district,
        type,
        description,
        status,
        facility_ids,
        is_approved,
      } = req.body;

      const updateFields = {};
      if (name !== undefined) updateFields.name = name;
      if (address !== undefined) updateFields.address = address;
      if (district !== undefined) updateFields.district = district;
      if (type !== undefined) updateFields.type = type;
      if (description !== undefined) updateFields.description = description;
      if (status !== undefined) updateFields.status = status;
      if (latitude !== undefined && longitude !== undefined) {
        updateFields.latitude = parseFloat(latitude);
        updateFields.longitude = parseFloat(longitude);
      }
      if (isAdmin && is_approved !== undefined) {
        updateFields.is_approved = Boolean(is_approved);
      }

      if (facility_ids !== undefined) {
        let parsed = [];
        if (Array.isArray(facility_ids)) {
          parsed = facility_ids;
        } else if (typeof facility_ids === 'string') {
          try {
            parsed = JSON.parse(facility_ids);
          } catch {
            parsed = facility_ids.split(',').map((f) => f.trim()).filter(Boolean);
          }
        }
        updateFields.facility_ids = parsed;
      }

      await KosModel.update(id, updateFields);
      const updatedKos = await KosModel.findById(id);

      res.json({
        message: 'Kos berhasil diperbarui',
        kos: updatedKos,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteKos(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      await KosModel.delete(id);
      res.json({ message: 'Kos berhasil dihapus' });
    } catch (err) {
      next(err);
    }
  },

  async uploadPhotos(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID kos tidak valid' });
      }

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const roomId = req.body.room_id ? parseInt(req.body.room_id, 10) : null;
      const sortOrder = req.body.sort_order ? parseInt(req.body.sort_order, 10) : 0;

      const photosToAdd = [];

      // Files from multipart upload
      const files = req.files || (req.file ? [req.file] : []);
      for (let i = 0; i < files.length; i++) {
        photosToAdd.push({
          photo_url: `/uploads/${files[i].filename}`,
          room_id: roomId,
          sort_order: sortOrder + i,
        });
      }

      // URLs from JSON payload
      if (req.body.photo_url) {
        photosToAdd.push({
          photo_url: req.body.photo_url,
          room_id: roomId,
          sort_order: sortOrder,
        });
      }

      if (Array.isArray(req.body.photos)) {
        for (let i = 0; i < req.body.photos.length; i++) {
          const item = req.body.photos[i];
          const url = typeof item === 'string' ? item : item.photo_url;
          if (url) {
            photosToAdd.push({
              photo_url: url,
              room_id: item.room_id ? parseInt(item.room_id, 10) : roomId,
              sort_order: item.sort_order !== undefined ? parseInt(item.sort_order, 10) : sortOrder + i,
            });
          }
        }
      }

      if (photosToAdd.length === 0) {
        return res.status(400).json({ error: 'File foto atau photo_url wajib disertakan' });
      }

      const createdPhotos = await KosModel.addPhotos(id, photosToAdd);
      res.status(201).json({
        message: 'Foto berhasil diunggah',
        photos: createdPhotos,
      });
    } catch (err) {
      next(err);
    }
  },

  async deletePhoto(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const photoId = parseInt(req.params.photoId, 10);

      if (isNaN(id) || isNaN(photoId)) {
        return res.status(400).json({ error: 'ID kos atau ID foto tidak valid' });
      }

      const kos = await KosModel.findById(id);
      if (!kos) {
        return res.status(404).json({ error: 'Kos tidak ditemukan' });
      }

      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && req.user.id !== kos.owner_id) {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan pemilik kos ini' });
      }

      const photo = await KosModel.findPhotoById(photoId);
      if (!photo || photo.kos_id !== id) {
        return res.status(404).json({ error: 'Foto tidak ditemukan' });
      }

      await KosModel.deletePhoto(photoId);
      res.json({ message: 'Foto berhasil dihapus' });
    } catch (err) {
      next(err);
    }
  },

  async getFacilities(req, res, next) {
    try {
      const facilities = await KosModel.findAllFacilities();
      res.json({ facilities });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = KosController;
