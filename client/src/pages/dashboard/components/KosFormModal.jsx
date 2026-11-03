import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FiMapPin, FiCrosshair, FiX, FiLayers, FiCamera, FiCheckCircle, FiPlus } from 'react-icons/fi';
import api from '../../../services/api';

const JAMBI_DISTRICTS = [
  'Jambi Luar Kota',
  'Telanaipura',
  'Danau Teluk',
  'Pasar Jambi',
  'Kotabaru',
  'Jelutung',
  'Danau Sipin',
  'Alam Barajo',
  'Jambi Timur',
  'Jambi Selatan',
  'Pelayangan',
  'Muara Bulian',
];

const PRESET_COORDS = [
  { label: 'UNJA Mendalo', lat: -1.6140, lng: 103.5200 },
  { label: 'UIN STS', lat: -1.6065, lng: 103.5095 },
  { label: 'UNBARI', lat: -1.6045, lng: 103.5930 },
  { label: 'WTC Pasar', lat: -1.5920, lng: 103.6180 },
];

// Map helper: click to set location
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    },
  });
  return null;
}

// Map helper: draggable marker
function DraggableMarker({ lat, lng, onDragEnd }) {
  const markerRef = useRef(null);

  const pinSvg = renderToStaticMarkup(<FiMapPin style={{ width: 18, height: 18, color: 'white', strokeWidth: 2.5 }} />);
  const pinIcon = L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${pinSvg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      }
    },
  };

  return (
    <Marker
      draggable
      position={[lat, lng]}
      ref={markerRef}
      eventHandlers={eventHandlers}
      icon={pinIcon}
    />
  );
}

// Map helper: fly to new coords when they change
function FlyToUpdater({ lat, lng }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (lat && lng && (lat !== prevRef.current.lat || lng !== prevRef.current.lng)) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

export default function KosFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const isEdit = Boolean(initialData?.id);

  const initialFacIds = initialData?.facilities
    ? initialData.facilities.map((f) => (typeof f === 'object' ? f.id : f))
    : [];

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'campur',
    district: initialData?.district || 'Jambi Luar Kota',
    address: initialData?.address || '',
    latitude: initialData?.latitude !== undefined ? initialData.latitude : -1.6140,
    longitude: initialData?.longitude !== undefined ? initialData.longitude : 103.5200,
    description: initialData?.description || '',
    status: initialData?.status || 'active',
    facility_ids: initialFacIds,
  });

  const [availableFacilities, setAvailableFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [createdKos, setCreatedKos] = useState(null); // post-creation success step

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const res = await api.get('/kos/facilities');
        if (res.data?.facilities) {
          setAvailableFacilities(res.data.facilities);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar fasilitas', err);
      }
    }
    fetchFacilities();
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFacilityToggle = (facId) => {
    setFormData((prev) => {
      const exists = prev.facility_ids.includes(facId);
      const nextIds = exists
        ? prev.facility_ids.filter((id) => id !== facId)
        : [...prev.facility_ids, facId];
      return { ...prev, facility_ids: nextIds };
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setGeoLoading(false);
      },
      () => {
        setError('Gagal membaca lokasi saat ini. Silakan pilih titik acuan atau isi manual.');
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || formData.name.length < 3) {
      setError('Nama kos minimal 3 karakter.');
      return;
    }
    if (!formData.address.trim() || formData.address.length < 5) {
      setError('Alamat lengkap kos minimal 5 karakter.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        district: formData.district,
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        description: formData.description.trim() || null,
        facility_ids: formData.facility_ids,
        status: formData.status,
      };

      let res;
      if (isEdit) {
        res = await api.put(`/kos/${initialData.id}`, payload);
        onSuccess(res.data?.kos);
        onClose();
      } else {
        res = await api.post('/kos', payload);
        onSuccess(res.data?.kos);
        setCreatedKos(res.data?.kos);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Gagal menyimpan data kos. Silakan coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit Properti Kos' : 'Tambah Kos Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              Isi data detail kos Anda untuk dipublikasikan di JeJakos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Post-creation success step */}
        {createdKos ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-center">
            <div className="py-4">
              <FiCheckCircle className="h-16 w-16 mx-auto text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-900 mt-4">Kos Berhasil Didaftarkan!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Properti <strong>"{createdKos.name}"</strong> telah terdaftar. Langkah selanjutnya, tambahkan unit kamar dan foto agar kos Anda siap dipublikasikan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // Defer to let parent re-render, then open rooms modal
                  setTimeout(() => {
                    if (typeof window.__jejakos_openRooms === 'function') {
                      window.__jejakos_openRooms(createdKos);
                    }
                  }, 100);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <FiLayers className="h-4 w-4" />
                Tambah Kamar Sekarang
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    if (typeof window.__jejakos_openPhotos === 'function') {
                      window.__jejakos_openPhotos(createdKos);
                    }
                  }, 100);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200"
              >
                <FiCamera className="h-4 w-4" />
                Upload Foto Kos
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 underline mt-2"
            >
              Lewati, tambahkan nanti
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Nama Kos */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kos <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: Kos Putri Melati UNJA"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              required
            />
          </div>

          {/* Tipe & Kecamatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Kos <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="putra">Khusus Putra</option>
                <option value="putri">Khusus Putri</option>
                <option value="campur">Campur</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kecamatan <span className="text-red-500">*</span>
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                {JAMBI_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Alamat Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              rows={2}
              value={formData.address}
              onChange={handleChange}
              placeholder="Jl. Lintas Sumatera, Lr. Nirwana No. 12, Mendalo Darat"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              required
            />
          </div>

          {/* Koordinat & Peta Interaktif */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Koordinat Lokasi (Peta & Jarak) <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
              >
                {geoLoading ? 'Mendeteksi...' : <><FiCrosshair className="inline -mt-0.5 mr-1 h-3.5 w-3.5" />Gunakan Lokasi Saya</>}
              </button>
            </div>

            {/* Presets buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-medium">Titik Cepat Jambi:</span>
              {PRESET_COORDS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: p.lat,
                      longitude: p.lng,
                    }))
                  }
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Interactive Map Picker */}
            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 260 }}>
              <MapContainer
                center={[Number(formData.latitude) || -1.6140, Number(formData.longitude) || 103.5200]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler
                  onLocationSelect={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                />
                <DraggableMarker
                  lat={Number(formData.latitude) || -1.6140}
                  lng={Number(formData.longitude) || 103.5200}
                  onDragEnd={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                />
                <FlyToUpdater lat={Number(formData.latitude)} lng={Number(formData.longitude)} />
              </MapContainer>
            </div>
            <p className="text-[10px] text-slate-400">Klik pada peta atau geser pin untuk menentukan lokasi kos. Anda juga bisa memilih titik cepat di atas.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Fasilitas & Lingkungan
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Jelaskan kenyamanan, akses jalan, keamanan 24 jam, dan info pendukung lainnya..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Status (jika edit) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Listing
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="active">Aktif (Dapat Ditemukan)</option>
                <option value="inactive">Nonaktif (Disembunyikan Sementara)</option>
              </select>
            </div>
          )}

          {/* Fasilitas Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilihan Fasilitas Kos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {availableFacilities.map((fac) => {
                const checked = formData.facility_ids.includes(fac.id);
                return (
                  <label
                    key={fac.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleFacilityToggle(fac.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="truncate">{fac.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm hover:shadow disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Kos'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
