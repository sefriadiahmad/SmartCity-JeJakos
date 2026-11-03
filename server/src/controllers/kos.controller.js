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
        min_price,
        max_price,
        pay_period,
        lat,
        latitude,
        lng,
        longitude,
        radius,
        sort,
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

      const rawLat = lat !== undefined ? lat : latitude;
      const rawLng = lng !== undefined ? lng : longitude;
      const parsedLat = rawLat !== undefined && !isNaN(parseFloat(rawLat)) ? parseFloat(rawLat) : null;
      const parsedLng = rawLng !== undefined && !isNaN(parseFloat(rawLng)) ? parseFloat(rawLng) : null;

      let radiusMeters = null;
      if (radius !== undefined && !isNaN(parseFloat(radius))) {
        radiusMeters = parseFloat(radius);
        if (radiusMeters <= 50) radiusMeters *= 1000;
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
        min_price: min_price !== undefined && !isNaN(parseFloat(min_price)) ? parseFloat(min_price) : null,
        max_price: max_price !== undefined && !isNaN(parseFloat(max_price)) ? parseFloat(max_price) : null,
        pay_period: pay_period || null,
        lat: parsedLat,
        lng: parsedLng,
        radius: radiusMeters,
        sort: sort || null,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async nearbyKos(req, res, next) {
    try {
      const {
        lat,
        latitude,
        lng,
        longitude,
        radius = 5000,
        page = 1,
        limit = 10,
        search,
        q,
        district,
        type,
        facility_ids,
        min_price,
        max_price,
        pay_period,
        sort,
      } = req.query;

      const rawLat = lat !== undefined ? lat : latitude;
      const rawLng = lng !== undefined ? lng : longitude;

      if (rawLat === undefined || rawLng === undefined) {
        return res.status(400).json({ error: 'Parameter lat dan lng wajib diisi dengan koordinat valid' });
      }

      const parsedLat = parseFloat(rawLat);
      const parsedLng = parseFloat(rawLng);

      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({ error: 'Parameter lat dan lng wajib diisi dengan koordinat valid' });
      }

      let radiusMeters = parseFloat(radius) || 5000;
      if (radiusMeters <= 50) {
        radiusMeters *= 1000;
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
        status: 'active',
        is_approved: true,
        facility_ids: parsedFacilityIds,
        min_price: min_price !== undefined && !isNaN(parseFloat(min_price)) ? parseFloat(min_price) : null,
        max_price: max_price !== undefined && !isNaN(parseFloat(max_price)) ? parseFloat(max_price) : null,
        pay_period: pay_period || null,
        lat: parsedLat,
        lng: parsedLng,
        radius: radiusMeters,
        sort: sort || 'nearest',
      });

      res.json({
        ...result,
        center: { lat: parsedLat, lng: parsedLng },
        radius_meters: radiusMeters,
      });
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
      const initialApproved = isAdmin && is_approved !== undefined
        ? (is_approved === true || is_approved === 'true' || is_approved === 1 || is_approved === '1')
        : false;

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
        updateFields.is_approved = is_approved === true || is_approved === 'true' || is_approved === 1 || is_approved === '1';
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

  // GET /api/kos/owner-dashboard — ringkasan dashboard pemilik kos
  async ownerDashboard(req, res, next) {
    const db = require('../config/db');
    const ownerId = req.user.id;

    try {
      // Aggregate stats
      const [[{ totalKos }]] = await db.execute('SELECT COUNT(*) AS totalKos FROM kos WHERE owner_id = ?', [ownerId]);
      const [[{ totalRooms }]] = await db.execute(
        'SELECT COUNT(*) AS totalRooms FROM rooms r JOIN kos k ON r.kos_id = k.id WHERE k.owner_id = ?', [ownerId]
      );
      const [[{ availableRooms }]] = await db.execute(
        'SELECT COUNT(*) AS availableRooms FROM rooms r JOIN kos k ON r.kos_id = k.id WHERE k.owner_id = ? AND r.is_available = 1', [ownerId]
      );

      // Booking stats
      const [bookingsByStatus] = await db.execute(
        `SELECT b.status, COUNT(*) AS count FROM bookings b
         JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         WHERE k.owner_id = ? GROUP BY b.status`, [ownerId]
      );

      // Invoice stats
      const [invoicesByStatus] = await db.execute(
        `SELECT i.status, COUNT(*) AS count, COALESCE(SUM(i.amount), 0) AS total_amount FROM invoices i
         JOIN bookings b ON i.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         WHERE k.owner_id = ? GROUP BY i.status`, [ownerId]
      );

      // Revenue: total paid
      const [[{ totalRevenue }]] = await db.execute(
        `SELECT COALESCE(SUM(i.amount), 0) AS totalRevenue FROM invoices i
         JOIN bookings b ON i.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         WHERE k.owner_id = ? AND i.status = 'paid'`, [ownerId]
      );

      // Monthly revenue (6 months)
      const [monthlyRevenue] = await db.execute(
        `SELECT DATE_FORMAT(i.paid_at, '%Y-%m') AS month, SUM(i.amount) AS revenue, COUNT(*) AS count
         FROM invoices i JOIN bookings b ON i.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         WHERE k.owner_id = ? AND i.status = 'paid' AND i.paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY month ORDER BY month`, [ownerId]
      );

      // Monthly bookings (6 months)
      const [monthlyBookings] = await db.execute(
        `SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month, COUNT(*) AS count
         FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         WHERE k.owner_id = ? AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY month ORDER BY month`, [ownerId]
      );

      // Latest 5 bookings
      const [latestBookings] = await db.execute(
        `SELECT b.id, b.status, b.check_in_date, b.created_at,
                u.name AS tenant_name, k.name AS kos_name, r.room_number
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         LEFT JOIN users u ON b.tenant_id = u.id
         WHERE k.owner_id = ? ORDER BY b.created_at DESC LIMIT 5`, [ownerId]
      );

      // Latest 5 invoices
      const [latestInvoices] = await db.execute(
        `SELECT i.id, i.amount, i.due_date, i.status, i.paid_at,
                u.name AS tenant_name, k.name AS kos_name, r.room_number
         FROM invoices i
         JOIN bookings b ON i.booking_id = b.id JOIN rooms r ON b.room_id = r.id JOIN kos k ON r.kos_id = k.id
         LEFT JOIN users u ON b.tenant_id = u.id
         WHERE k.owner_id = ? ORDER BY i.created_at DESC LIMIT 5`, [ownerId]
      );

      // Occupancy per kos
      const [kosOccupancy] = await db.execute(
        `SELECT k.id, k.name,
                COUNT(r.id) AS total_rooms,
                SUM(CASE WHEN r.is_available = 1 THEN 1 ELSE 0 END) AS available_rooms
         FROM kos k LEFT JOIN rooms r ON r.kos_id = k.id
         WHERE k.owner_id = ? GROUP BY k.id ORDER BY k.name`, [ownerId]
      );

      res.json({
        totalKos: Number(totalKos),
        totalRooms: Number(totalRooms),
        availableRooms: Number(availableRooms),
        occupiedRooms: Number(totalRooms) - Number(availableRooms),
        totalRevenue: Number(totalRevenue),
        bookingsByStatus,
        invoicesByStatus,
        monthlyRevenue,
        monthlyBookings,
        latestBookings,
        latestInvoices,
        kosOccupancy,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = KosController;
