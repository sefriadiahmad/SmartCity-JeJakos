import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClock,
  FiCheckCircle,
  FiHome,
  FiFlag,
  FiXCircle,
  FiSlash,
  FiSearch,
  FiMapPin,
  FiMessageCircle,
} from 'react-icons/fi';
import { FaBed } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import BookingDetailModal from '../../components/booking/BookingDetailModal';

const TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'pending', label: 'Menunggu' },
  { id: 'active', label: 'Aktif' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Batal / Ditolak' },
];

const STATUS_BADGES = {
  pending: {
    label: 'Menunggu Konfirmasi',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: FiClock,
  },
  accepted: {
    label: 'Diterima',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: FiCheckCircle,
  },
  active: {
    label: 'Penghuni Aktif',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: FiHome,
  },
  completed: {
    label: 'Selesai',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: FiFlag,
  },
  rejected: {
    label: 'Ditolak',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: FiXCircle,
  },
  cancelled: {
    label: 'Dibatalkan',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: FiSlash,
  },
};

export default function MyBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'pemilik') {
      navigate('/dashboard?tab=bookings', { replace: true });
    }
  }, [user, navigate]);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bookings', { params: { limit: 50 } });
      setBookings(res.data?.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat daftar pemesanan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get('/bookings', { params: { limit: 50 } });
        if (active) setBookings(res.data?.bookings || []);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat daftar pemesanan');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Tab count metrics
  const tabCounts = useMemo(() => {
    const counts = { all: bookings.length, pending: 0, active: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (b.status === 'pending' || b.status === 'accepted') counts.pending += 1;
      else if (b.status === 'active') counts.active += 1;
      else if (b.status === 'completed') counts.completed += 1;
      else if (b.status === 'cancelled' || b.status === 'rejected') counts.cancelled += 1;
    });
    return counts;
  }, [bookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (activeTab === 'pending') {
      list = list.filter((b) => b.status === 'pending' || b.status === 'accepted');
    } else if (activeTab === 'active') {
      list = list.filter((b) => b.status === 'active');
    } else if (activeTab === 'completed') {
      list = list.filter((b) => b.status === 'completed');
    } else if (activeTab === 'cancelled') {
      list = list.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.kos?.name?.toLowerCase().includes(q) ||
          b.room?.room_number?.toLowerCase().includes(q) ||
          b.kos?.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [bookings, activeTab, searchQuery]);

  const handleBookingCancelled = (cancelledId) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === cancelledId ? { ...b, status: 'cancelled' } : b))
    );
  };

  const handleStartChat = async (booking) => {
    try {
      const res = await api.post('/conversations', {
        kos_id: booking.kos?.id,
        recipient_id: booking.owner?.id || booking.kos?.owner_id,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pemesanan Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau status permohonan sewa, kamar aktif, dan riwayat pesanan kos Anda.
          </p>
        </div>

        <Link
          to="/kos"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FiSearch className="w-3.5 h-3.5" />
          <span>Cari Kos Lain</span>
        </Link>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => {
              const count = tabCounts[tab.id] || 0;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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

          {/* Quick Search Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kos atau kamar..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              <FiSearch className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs animate-pulse flex flex-col sm:flex-row gap-4"
            >
              <div className="w-full sm:w-36 h-28 bg-slate-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                <div className="h-3 bg-slate-200 rounded-md w-1/4" />
              </div>
            </div>
          ))}
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
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <FaBed className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800">
              {searchQuery ? 'Tidak Ada Pemesanan yang Cocok' : 'Belum Ada Pemesanan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `Tidak ditemukan pemesanan dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                : 'Anda belum memiliki pemesanan kos dalam status ini. Temukan kos pilihan Anda sekarang di JeJakos Jambi.'}
            </p>
          </div>
          <Link
            to="/kos"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
          >
            Jelajahi Kos di Jambi
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const badge = STATUS_BADGES[b.status] || {
              label: b.status,
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
              icon: FiClock,
            };
            const BadgeIcon = badge.icon;

            const roomPhoto =
              b.room?.primary_photo ||
              b.kos?.primary_photo ||
              b.room?.photos?.[0]?.photo_url;

            const ownerPhone = b.owner?.phone;
            const waUrl = ownerPhone
              ? `https://wa.me/${ownerPhone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Halo ${b.owner?.name || 'Bapak/Ibu'}, mengenai pesanan #${b.id} di ${
                    b.kos?.name || ''
                  } via JeJakos.`
                )}`
              : null;

            return (
              <div
                key={b.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-slate-800">
                      ID Pemesanan #{b.id}
                    </span>
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
                    <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Photo */}
                  <div className="w-full md:w-44 h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    {roomPhoto ? (
                      <img
                        src={getPhotoUrl(roomPhoto)}
                        alt={b.kos?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-sm">
                        Foto Tidak Tersedia
                      </div>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <Link
                        to={`/kos/${b.kos?.id}`}
                        className="font-bold text-base text-slate-900 hover:text-emerald-700 transition line-clamp-1"
                      >
                        {b.kos?.name}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1">
                        <FiMapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{b.kos?.address}, {b.kos?.district}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400">Unit Kamar:</span>{' '}
                        <span className="font-bold text-slate-800">
                          {b.room?.room_number || `Kamar #${b.room?.id}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Harga:</span>{' '}
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(b.room?.price)} / {b.room?.pay_period || 'bulan'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400">Check-in:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {b.check_in_date || '-'}
                        </span>
                      </div>
                      {b.check_out_date && (
                        <div>
                          <span className="text-slate-400">Check-out:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {b.check_out_date}
                          </span>
                        </div>
                      )}
                      {b.owner?.name && (
                        <div>
                          <span className="text-slate-400">Pemilik:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {b.owner.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="w-full md:w-44 flex flex-col gap-2 shrink-0 pt-2 md:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="w-full py-2.5 px-3 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-center"
                    >
                      Lihat Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartChat(b)}
                      className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <FiMessageCircle className="w-3.5 h-3.5" />
                      <span>Chat Pemilik</span>
                    </button>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition text-center"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        onBookingCancelled={handleBookingCancelled}
      />
    </div>
  );
}
