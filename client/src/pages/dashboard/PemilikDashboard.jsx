import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiAlertTriangle, FiHome, FiCamera, FiMapPin, FiLayers, FiEdit2, FiTrash2, FiPlus, FiClock, FiCheckCircle } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import KosFormModal from './components/KosFormModal';
import RoomManagementModal from './components/RoomManagementModal';
import PhotoUploadModal from './components/PhotoUploadModal';
import PesananMasukTab from './components/PesananMasukTab';
import TagihanPenghuniTab from './components/TagihanPenghuniTab';

export default function PemilikDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'bookings' ? 'bookings' : rawTab === 'invoices' ? 'invoices' : 'kos';

  const [kosList, setKosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [kosModalOpen, setKosModalOpen] = useState(false);
  const [selectedKosForEdit, setSelectedKosForEdit] = useState(null);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [selectedKosForRooms, setSelectedKosForRooms] = useState(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedKosForPhotos, setSelectedKosForPhotos] = useState(null);

  // Delete Confirmation Modal
  const [kosToDelete, setKosToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const userId = user?.id;

  const fetchMyKos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/kos?owner_id=${userId}&limit=100`);
      setKosList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data kos Anda');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/kos?owner_id=${userId}&limit=100`);
        if (active) setKosList(res.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat data kos Anda');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  // Actions
  const handleOpenCreateKos = () => {
    setSelectedKosForEdit(null);
    setKosModalOpen(true);
  };

  const handleOpenEditKos = (kos) => {
    setSelectedKosForEdit(kos);
    setKosModalOpen(true);
  };

  const handleDeleteKos = (kos) => {
    setKosToDelete(kos);
    setDeleteError('');
  };

  const handleConfirmDeleteKos = async () => {
    if (!kosToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/kos/${kosToDelete.id}`);
      setKosToDelete(null);
      fetchMyKos();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Gagal menghapus kos');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenRooms = (kos) => {
    setSelectedKosForRooms(kos);
    setRoomModalOpen(true);
  };

  const handleOpenPhotos = (kos) => {
    setSelectedKosForPhotos(kos);
    setPhotoModalOpen(true);
  };

  // Register global callbacks for post-creation flow in KosFormModal
  useEffect(() => {
    window.__jejakos_openRooms = (kos) => {
      setSelectedKosForRooms(kos);
      setRoomModalOpen(true);
    };
    window.__jejakos_openPhotos = (kos) => {
      setSelectedKosForPhotos(kos);
      setPhotoModalOpen(true);
    };
    return () => {
      delete window.__jejakos_openRooms;
      delete window.__jejakos_openPhotos;
    };
  }, []);

  // Stat calculations
  const totalKos = kosList.length;
  const totalRooms = kosList.reduce((acc, k) => acc + (k.total_rooms || 0), 0);
  const availableRooms = kosList.reduce((acc, k) => acc + (k.available_rooms || 0), 0);
  const occupiedRooms = totalRooms - availableRooms;

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Unapproved Notice Banner */}
        {user?.role === 'pemilik' && !user?.is_approved && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <FiAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sm">Akun Dalam Verifikasi Admin</p>
              <p className="mt-0.5">
                Akun pemilik Anda saat ini sedang ditinjau oleh Admin JeJakos. Setelah diverifikasi oleh admin, seluruh listing kos yang Anda daftarkan dapat dipublikasikan untuk pencari kos.
              </p>
            </div>
          </div>
        )}

        {/* Header & Main CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard Pemilik Kos
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Kelola properti kos, pesanan sewa masuk, dan ketersediaan kamar di Jambi
            </p>
          </div>

          {activeTab === 'kos' && (
            <button
              type="button"
              onClick={handleOpenCreateKos}
              className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
            >
              <FiPlus className="h-4 w-4" />
              <span>Tambah Kos Baru</span>
            </button>
          )}
        </div>

        {/* Tab Content — driven by sidebar ?tab= query param */}
        {activeTab === 'bookings' ? (
          <PesananMasukTab />
        ) : activeTab === 'invoices' ? (
          /* Tab 3: Tagihan Penghuni & Catat Manual (F-33, F-35) */
          <TagihanPenghuniTab kosList={kosList} />
        ) : (
          /* Tab 1: Properti Kos */
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Kos</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalKos}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Properti terdaftar</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Kamar</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalRooms}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Semua unit kamar</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
                <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Kamar Tersedia</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{availableRooms}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Siap dihuni</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kamar Terisi</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">{occupiedRooms}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sedang disewa</p>
              </div>
            </div>

            {/* Kos List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Daftar Properti Kos Anda
                </h2>
                <span className="text-xs text-slate-500">
                  {kosList.length} properti
                </span>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
                </div>
              ) : kosList.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FiHome className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Belum Ada Properti Kos
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Mulai digitalisasikan usaha kos Anda di Provinsi Jambi dengan mendaftarkan kos pertama Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateKos}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    + Tambah Kos Sekarang
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {kosList.map((kos) => {
                    const photoSrc = getPhotoUrl(kos.primary_photo || kos.photos?.[0]?.photo_url);

                    return (
                      <div
                        key={kos.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Header with Badges */}
                          <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={kos.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                                <FiCamera className="h-6 w-6 mb-1" />
                                <span>Belum ada foto</span>
                              </div>
                            )}

                            {/* Badges Overlay */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                              {/* Type */}
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shadow-xs ${
                                  kos.type === 'putra'
                                    ? 'bg-blue-600 text-white'
                                    : kos.type === 'putri'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                Kos {kos.type}
                              </span>

                              {/* Approval */}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs ${
                                  kos.is_approved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {kos.is_approved ? '✓ Terverifikasi' : 'Menunggu Approval'}
                              </span>
                            </div>

                            {/* Status Active/Inactive Badge */}
                            <div className="absolute top-3 right-3">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs ${
                                  kos.status === 'active'
                                    ? 'bg-white/90 text-slate-800'
                                    : 'bg-slate-800 text-white'
                                }`}
                              >
                                {kos.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5 space-y-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                                {kos.name}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                                <FiMapPin className="h-3 w-3 shrink-0" /> {kos.district ? `${kos.district}, ` : ''}{kos.address}
                              </p>
                            </div>

                            {/* Room stats & Price */}
                            <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-slate-500">Unit: </span>
                                <span className="font-bold text-slate-800">
                                  {kos.total_rooms || 0} Kamar
                                </span>
                                <span className="text-emerald-700 font-medium ml-1">
                                  ({kos.available_rooms || 0} tersedia)
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Mulai: </span>
                                <span className="font-bold text-slate-900">
                                  {kos.min_price > 0 ? formatCurrency(kos.min_price) : '-'}
                                </span>
                              </div>
                            </div>

                            {/* Facilities tags */}
                            {kos.facilities && kos.facilities.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {kos.facilities.slice(0, 4).map((f) => (
                                  <span
                                    key={f.id || f.name}
                                    className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md"
                                  >
                                    {f.name}
                                  </span>
                                ))}
                                {kos.facilities.length > 4 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md">
                                    +{kos.facilities.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenRooms(kos)}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                            >
                              <FiLayers className="inline h-3.5 w-3.5 -mt-0.5" /> Kelola Kamar ({kos.total_rooms || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPhotos(kos)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <FiCamera className="inline h-3.5 w-3.5 -mt-0.5" /> Galeri ({kos.photos?.length || 0})
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditKos(kos)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            >
                              <FiEdit2 className="inline h-3.5 w-3.5 -mt-0.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKos(kos)}
                              className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer"
                            >
                              <FiTrash2 className="inline h-3.5 w-3.5 -mt-0.5" /> Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {kosModalOpen && (
        <KosFormModal
          key={selectedKosForEdit?.id || 'new'}
          isOpen={kosModalOpen}
          onClose={() => setKosModalOpen(false)}
          onSuccess={() => fetchMyKos()}
          initialData={selectedKosForEdit}
        />
      )}

      {roomModalOpen && (
        <RoomManagementModal
          key={selectedKosForRooms?.id}
          isOpen={roomModalOpen}
          onClose={() => setRoomModalOpen(false)}
          kos={selectedKosForRooms}
          onRoomsUpdated={() => fetchMyKos()}
        />
      )}

      {photoModalOpen && (
        <PhotoUploadModal
          key={selectedKosForPhotos?.id}
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          kos={selectedKosForPhotos}
          onPhotosUpdated={() => fetchMyKos()}
        />
      )}

      {/* Delete Confirmation Floating Modal */}
      {kosToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) {
              setKosToDelete(null);
              setDeleteError('');
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <FiTrash2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Properti Kos
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Yakin ingin menghapus properti kos <strong className="text-slate-900">"{kosToDelete.name}"</strong>? Semua kamar dan foto terkait juga akan terhapus.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setKosToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKos}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {deleteLoading ? (
                  'Menghapus...'
                ) : (
                  <>
                    <FiTrash2 className="h-3.5 w-3.5" />
                    <span>Hapus Properti</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
