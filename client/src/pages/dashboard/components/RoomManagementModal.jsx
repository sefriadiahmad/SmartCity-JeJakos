import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import api from '../../../services/api';
import { formatCurrency } from '../../../utils/formatCurrency';
import { getPhotoUrl } from '../../../utils/imageUrl';

export default function RoomManagementModal({ isOpen, onClose, kos, onRoomsUpdated }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    room_number: '',
    price: '',
    pay_period: 'bulanan',
    is_available: true,
    description: '',
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const kosId = kos?.id;

  const refreshRooms = useCallback(async () => {
    if (!kosId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/kos/${kosId}/rooms`);
      setRooms(res.data?.rooms || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat daftar kamar');
    } finally {
      setLoading(false);
    }
  }, [kosId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!kosId) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/kos/${kosId}/rooms`);
        if (active) setRooms(res.data?.rooms || []);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat daftar kamar');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [kosId]);

  if (!isOpen || !kos) return null;

  const handleOpenAddForm = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      price: '',
      pay_period: 'bulanan',
      is_available: true,
      description: '',
    });
    setSelectedPhotoFile(null);
    setPhotoPreview(null);
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEditForm = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number || '',
      price: room.price || '',
      pay_period: room.pay_period || 'bulanan',
      is_available: Boolean(room.is_available),
      description: room.description || '',
    });
    setSelectedPhotoFile(null);
    setPhotoPreview(room.photos?.[0]?.photo_url ? getPhotoUrl(room.photos[0].photo_url) : null);
    setFormError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    setSelectedPhotoFile(null);
    setPhotoPreview(null);
    setFormError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleToggleAvailability = async (room) => {
    try {
      await api.put(`/kos/${kos.id}/rooms/${room.id}`, {
        is_available: !room.is_available,
      });
      refreshRooms();
      if (onRoomsUpdated) onRoomsUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status kamar');
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Yakin ingin menghapus kamar ${room.room_number || `#${room.id}`}?`)) {
      return;
    }
    try {
      await api.delete(`/kos/${kos.id}/rooms/${room.id}`);
      refreshRooms();
      if (onRoomsUpdated) onRoomsUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus kamar');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setFormError('Harga kamar harus angka positif.');
      return;
    }

    setFormSubmitting(true);
    try {
      const data = new FormData();
      if (formData.room_number) data.append('room_number', formData.room_number.trim());
      data.append('price', parseFloat(formData.price));
      data.append('pay_period', formData.pay_period);
      data.append('is_available', formData.is_available ? 'true' : 'false');
      if (formData.description) data.append('description', formData.description.trim());
      if (selectedPhotoFile) {
        data.append('photo', selectedPhotoFile);
      }

      if (editingRoom) {
        await api.put(`/kos/${kos.id}/rooms/${editingRoom.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post(`/kos/${kos.id}/rooms`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      handleCloseForm();
      refreshRooms();
      if (onRoomsUpdated) onRoomsUpdated();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Gagal menyimpan kamar. Silakan coba lagi.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col my-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Kelola Kamar — {kos.name}
            </h2>
            <p className="text-xs text-slate-500">
              Total {rooms.length} kamar terdaftar ({rooms.filter((r) => r.is_available).length} tersedia)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {showForm ? (
            /* Sub-view: Form Tambah/Edit Kamar */
            <form onSubmit={handleFormSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRoom ? 'Edit Kamar' : 'Tambah Kamar Baru'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Kembali ke Daftar
                </button>
              </div>

              {formError && (
                <div className="p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor / Nama Kamar
                  </label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="Contoh: Kamar 101, VIP A, Melati 1"
                    className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Sewa (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Contoh: 650000"
                    className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periode Bayar
                  </label>
                  <select
                    value={formData.pay_period}
                    onChange={(e) => setFormData({ ...formData, pay_period: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="bulanan">Bulanan</option>
                    <option value="tahunan">Tahunan</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Kamar Tersedia untuk Disewa</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Fasilitas Kamar
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kamar 3x3 meter, ventilasi baik, kasur busa + lemari baju..."
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Upload Foto Kamar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Kamar (Opsional)
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : editingRoom ? 'Simpan Perubahan' : 'Tambah Kamar'}
                </button>
              </div>
            </form>
          ) : (
            /* Button Tambah Kamar */
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-600">
                Kelola status ketersediaan dan harga sewa kamar
              </span>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <span>+</span>
                <span>Tambah Kamar</span>
              </button>
            </div>
          )}

          {/* List Kamar */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-medium">Belum ada kamar yang didaftarkan</p>
              <p className="text-xs text-slate-400 mt-1">
                Klik tombol "Tambah Kamar" di atas untuk menambahkan kamar pertama.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {rooms.map((room) => {
                const photoSrc = room.photos?.[0]?.photo_url
                  ? getPhotoUrl(room.photos[0].photo_url)
                  : null;

                return (
                  <div
                    key={room.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={room.room_number || 'Kamar'}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-medium border border-slate-200 shrink-0">
                          Tanpa Foto
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {room.room_number || `Kamar #${room.id}`}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(room)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer inline-flex items-center gap-1 ${
                              room.is_available
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Klik untuk ubah ketersediaan"
                          >
                            {room.is_available ? <><FiCheck className="w-3 h-3" /> Tersedia</> : <><FiX className="w-3 h-3" /> Terisi</>}
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                          {formatCurrency(room.price)}
                          <span className="text-[11px] font-normal text-slate-500">
                            /{room.pay_period}
                          </span>
                        </p>
                        {room.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(room)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
