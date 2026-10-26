import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { formatCurrency } from '../../../utils/formatCurrency';
import { getPhotoUrl } from '../../../utils/imageUrl';

const TABS = [
  { id: 'pending', label: 'Menunggu Konfirmasi' },
  { id: 'accepted', label: 'Diterima' },
  { id: 'active', label: 'Penghuni Aktif' },
  { id: 'rejected_cancelled', label: 'Ditolak / Batal' },
  { id: 'completed', label: 'Selesai' },
  { id: 'all', label: 'Semua' },
];

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu Konfirmasi',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⏳',
  },
  accepted: {
    label: 'Diterima',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '✓',
  },
  active: {
    label: 'Penghuni Aktif',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '🏠',
  },
  completed: {
    label: 'Selesai',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: '🏁',
  },
  rejected: {
    label: 'Ditolak',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '✕',
  },
  cancelled: {
    label: 'Dibatalkan',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: '🚫',
  },
};

export default function PesananMasukTab({ onStatsUpdated }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Reject modal state
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bookings', { params: { limit: 100 } });
      const data = res.data?.bookings || [];
      setBookings(data);
      if (onStatsUpdated) {
        onStatsUpdated(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat pesanan masuk');
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get('/bookings', { params: { limit: 100 } });
        const data = res.data?.bookings || [];
        if (active) {
          setBookings(data);
          if (onStatsUpdated) onStatsUpdated(data);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Gagal memuat pesanan masuk');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [onStatsUpdated]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      all: bookings.length,
      pending: 0,
      accepted: 0,
      active: 0,
      rejected_cancelled: 0,
      completed: 0,
    };
    bookings.forEach((b) => {
      if (b.status === 'pending') counts.pending += 1;
      else if (b.status === 'accepted') counts.accepted += 1;
      else if (b.status === 'active') counts.active += 1;
      else if (b.status === 'rejected' || b.status === 'cancelled') counts.rejected_cancelled += 1;
      else if (b.status === 'completed') counts.completed += 1;
    });
    return counts;
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (activeTab === 'pending') {
      list = list.filter((b) => b.status === 'pending');
    } else if (activeTab === 'accepted') {
      list = list.filter((b) => b.status === 'accepted');
    } else if (activeTab === 'active') {
      list = list.filter((b) => b.status === 'active');
    } else if (activeTab === 'rejected_cancelled') {
      list = list.filter((b) => b.status === 'rejected' || b.status === 'cancelled');
    } else if (activeTab === 'completed') {
      list = list.filter((b) => b.status === 'completed');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.tenant?.name?.toLowerCase().includes(q) ||
          b.tenant?.phone?.includes(q) ||
          b.kos?.name?.toLowerCase().includes(q) ||
          b.room?.room_number?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [bookings, activeTab, searchQuery]);

  // Accept booking (F-28)
  const handleAcceptBooking = async (booking) => {
    setProcessingId(booking.id);
    setActionFeedback(null);
    try {
      const res = await api.put(`/bookings/${booking.id}/status`, {
        status: 'accepted',
        notes: 'Pemesanan diterima oleh pemilik kos',
      });
      const updated = res.data?.booking;

      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? updated || { ...b, status: 'accepted' } : b))
      );

      setActionFeedback({
        type: 'success',
        text: `Pesanan #${booking.id} dari ${booking.tenant?.name || 'Calon Penghuni'} berhasil DITERIMA.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Gagal menerima pemesanan.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Open reject modal
  const handleOpenReject = (booking) => {
    setRejectingBooking(booking);
    setRejectReason('Kamar sudah terisi atau tidak tersedia');
  };

  // Submit reject (F-28)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingBooking) return;

    setProcessingId(rejectingBooking.id);
    setActionFeedback(null);
    try {
      const res = await api.put(`/bookings/${rejectingBooking.id}/status`, {
        status: 'rejected',
        notes: rejectReason.trim() || 'Pemesanan ditolak oleh pemilik',
      });
      const updated = res.data?.booking;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === rejectingBooking.id
            ? updated || { ...b, status: 'rejected', notes: rejectReason }
            : b
        )
      );

      setActionFeedback({
        type: 'info',
        text: `Pesanan #${rejectingBooking.id} dari ${
          rejectingBooking.tenant?.name || 'Calon Penghuni'
        } telah DITOLAK.`,
      });
      setRejectingBooking(null);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Gagal menolak pemesanan.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Activate booking (F-30)
  const handleActivateBooking = async (booking) => {
    setProcessingId(booking.id);
    setActionFeedback(null);
    try {
      const res = await api.put(`/bookings/${booking.id}/status`, {
        status: 'active',
        notes: 'Penghuni aktif dikonfirmasi oleh pemilik',
      });
      const updated = res.data?.booking;

      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? updated || { ...b, status: 'active' } : b))
      );

      setActionFeedback({
        type: 'success',
        text: `Penghuni #${booking.id} (${booking.tenant?.name || 'Penyewa'}) kini berstatus AKTIF. Ketersediaan kamar telah otomatis diperbarui.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Gagal mengaktifkan status penghuni.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Complete rental
  const handleCompleteBooking = async (booking) => {
    if (
      !window.confirm(
        `Konfirmasi masa sewa kamar ${booking.room?.room_number || ''} untuk ${
          booking.tenant?.name || 'penyewa'
        } telah SELESAI? Kamar akan otomatis kembali tersedia untuk calon penghuni baru.`
      )
    ) {
      return;
    }

    setProcessingId(booking.id);
    setActionFeedback(null);
    try {
      const res = await api.put(`/bookings/${booking.id}/status`, {
        status: 'completed',
        notes: 'Masa sewa selesai (check-out)',
      });
      const updated = res.data?.booking;

      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? updated || { ...b, status: 'completed' } : b))
      );

      setActionFeedback({
        type: 'success',
        text: `Masa sewa #${booking.id} telah diselesaikan. Kamar kembali berstatus TERSEDIA.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Gagal menyelesaikan masa sewa.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartChat = async (booking) => {
    try {
      const res = await api.post('/conversations', {
        kos_id: booking.kos?.id,
        recipient_id: booking.tenant?.id,
      });
      const convId = res.data?.conversation?.id;
      if (convId) {
        navigate(`/conversations?id=${convId}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memulai percakapan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-xs">
          <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">
            Menunggu Persetujuan
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{tabCounts.pending}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Perlu tindakan accept / reject</p>
        </div>

        <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200/80 shadow-xs">
          <p className="text-xs font-medium text-blue-800 uppercase tracking-wider">
            Pesanan Diterima
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{tabCounts.accepted}</p>
          <p className="text-[11px] text-blue-700 mt-0.5">Menunggu pembayaran / check-in</p>
        </div>

        <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 shadow-xs">
          <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
            Penghuni Aktif
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{tabCounts.active}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Sedang menempati kamar</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Riwayat
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{tabCounts.all}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Seluruh pesanan masuk</p>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : actionFeedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span>
              {actionFeedback.type === 'success' ? '✓' : actionFeedback.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="font-semibold break-words">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => {
            const count = tabCounts[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, kamar, no HP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            🔍
          </span>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-3">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchBookings}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 text-slate-400 text-2xl flex items-center justify-center font-bold border border-slate-200">
            📋
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {searchQuery ? 'Pencarian Tidak Ditemukan' : 'Tidak Ada Pesanan di Tab Ini'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              {searchQuery
                ? `Tidak ada pesanan cocok dengan "${searchQuery}".`
                : 'Belum ada pesanan masuk dengan status ini dari calon penghuni.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const badge = STATUS_CONFIG[b.status] || {
              label: b.status,
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
              icon: '•',
            };

            const tenantPhoto = b.tenant?.photo_url;
            const isProcessing = processingId === b.id;

            const waUrl = b.tenant?.phone
              ? `https://wa.me/${b.tenant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Halo ${b.tenant.name || 'Calon Penghuni'}, mengenai pemesanan kamar ${
                    b.room?.room_number || ''
                  } di ${b.kos?.name || ''} via JeJakos.`
                )}`
              : null;

            return (
              <div
                key={b.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4 text-left"
              >
                {/* Header Row: ID, Time, Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-slate-800">Pesanan #{b.id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">
                      Diajukan{' '}
                      {new Date(b.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${badge.badgeClass}`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Column 1: Calon Penghuni (Tenant) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Calon Penghuni
                    </span>
                    <div className="flex items-start gap-3">
                      {tenantPhoto ? (
                        <img
                          src={getPhotoUrl(tenantPhoto)}
                          alt={b.tenant?.name}
                          className="w-11 h-11 rounded-full object-cover border border-emerald-500 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm border border-emerald-300 shrink-0">
                          {(b.tenant?.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-bold text-slate-900 truncate">
                          {b.tenant?.name || 'Pencari Kos'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {b.tenant?.phone || 'No. HP belum diisi'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {b.tenant?.email}
                        </p>
                      </div>
                    </div>

                    {b.notes && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700 block">Pesan Pemesan:</span>
                        <p className="italic mt-0.5">&ldquo;{b.notes}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Properti & Kamar */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kamar & Kos
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm line-clamp-1">
                        {b.kos?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        📍 {b.kos?.address}
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Unit:</span>
                        <span className="font-bold text-emerald-800">
                          {b.room?.room_number || `Kamar #${b.room?.id}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tarif Sewa:</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(b.room?.price)} / {b.room?.pay_period || 'bulan'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-slate-500">Rencana Masuk:</span>
                        <span className="font-semibold text-slate-800">
                          {b.check_in_date || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Actions & Contacts */}
                  <div className="space-y-2 md:pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tindakan Pemilik
                    </span>

                    {/* Pending Action Buttons: Terima atau Tolak (F-28) */}
                    {b.status === 'pending' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleAcceptBooking(b)}
                            className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <span>✓</span>
                            <span>{isProcessing ? 'Memproses...' : 'Terima Pesanan'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleOpenReject(b)}
                            className="py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Menerima pesanan memberi calon penghuni kesempatan untuk menyelesaikan pembayaran sewa.
                        </p>
                      </div>
                    )}

                    {/* Accepted: Activate Tenant Button (F-30) */}
                    {b.status === 'accepted' && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleActivateBooking(b)}
                          className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span>🏠</span>
                          <span>{isProcessing ? 'Memproses...' : 'Catat Penghuni Aktif'}</span>
                        </button>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Klik setelah penghuni membayar atau check-in untuk menandai kamar terisi.
                        </p>
                      </div>
                    )}

                    {/* Active: Complete Rental Button */}
                    {b.status === 'active' && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleCompleteBooking(b)}
                          className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span>🏁</span>
                          <span>{isProcessing ? 'Memproses...' : 'Selesaikan Masa Sewa'}</span>
                        </button>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Penghuni selesai sewa dan kamar otomatis kembali tersedia.
                        </p>
                      </div>
                    )}

                    {/* Quick Contacts */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStartChat(b)}
                        className="flex-1 py-1.5 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>💬</span>
                        <span>Chat</span>
                      </button>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 px-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition text-center shadow-xs"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal (F-28) */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="my-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 space-y-4 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Tolak Pemesanan #{rejectingBooking.id}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingBooking(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menolak pemesanan dari{' '}
              <span className="font-bold text-slate-800">
                {rejectingBooking.tenant?.name || 'Calon Penghuni'}
              </span>{' '}
              untuk kamar{' '}
              <span className="font-bold text-slate-800">
                {rejectingBooking.room?.room_number || ''}
              </span>
              ?
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="reject_reason" className="text-xs font-bold text-slate-700 block">
                  Alasan Penolakan (akan dikirimkan ke calon penghuni):
                </label>
                <textarea
                  id="reject_reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Kamar sudah terisi secara offline atau sedang dalam perbaikan..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingBooking.id}
                  className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {processingId === rejectingBooking.id ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
