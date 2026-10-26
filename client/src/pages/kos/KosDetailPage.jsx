import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import KosMap from '../../components/kos/KosMap';
import BookingModal from '../../components/booking/BookingModal';
import ReviewForm from '../../components/review/ReviewForm';
import ReviewList from '../../components/review/ReviewList';

// Jambi Campus & City Landmarks for Distance Reference
const JAMBI_LANDMARKS = [
  { name: 'Universitas Jambi (UNJA Mendalo)', lat: -1.6140, lng: 103.5200, icon: '🎓' },
  { name: 'UIN STS Jambi (Sungai Duren)', lat: -1.6065, lng: 103.5095, icon: '🕌' },
  { name: 'Universitas Batanghari (UNBARI)', lat: -1.6045, lng: 103.5930, icon: '📚' },
  { name: 'WTC Batanghari (Pusat Kota)', lat: -1.5920, lng: 103.6180, icon: '🏢' },
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function KosDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kos, setKos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhotoModal, setActivePhotoModal] = useState(false);
  const [bookingModalRoom, setBookingModalRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [reviewBookings, setReviewBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ avg_rating: 0, total_reviews: 0 });

  const handleChatOwner = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === kos?.owner_id) {
      alert('Ini adalah kos milik Anda sendiri.');
      return;
    }

    setStartingChat(true);
    try {
      const res = await api.post('/conversations', {
        kos_id: kos.id,
        recipient_id: kos.owner_id,
      });
      const convId = res.data?.conversation?.id;
      if (convId) {
        navigate(`/conversations?id=${convId}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memulai percakapan');
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadKosDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/kos/${id}`);
        if (active) {
          setKos(res.data?.kos || null);
          setReviews(res.data?.kos?.reviews || []);
          setRatingSummary({ avg_rating: res.data?.kos?.avg_rating || 0, total_reviews: res.data?.kos?.total_reviews || 0 });
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Kos tidak ditemukan.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadKosDetail();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (user?.role !== 'pencari') return;
    api.get('/bookings', { params: { status: 'active', limit: 100 } })
      .then((res) => setReviewBookings((res.data?.bookings || []).filter((booking) => String(booking.kos?.id) === String(id))))
      .catch(() => setReviewBookings([]));
  }, [id, user]);

  useEffect(() => {
    api.get(`/reviews/kos/${id}`, { params: { limit: 50 } })
      .then((res) => {
        setReviews(res.data?.reviews || []);
        setRatingSummary(res.data?.rating_summary || { avg_rating: 0, total_reviews: 0 });
      })
      .catch(() => {});
  }, [id]);

  const handleReviewCreated = (result) => {
    setReviews((current) => [result.review, ...current]);
    setRatingSummary(result.rating_summary);
    setKos((current) => ({ ...current, ...result.rating_summary }));
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-28 bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !kos) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-4 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="text-4xl">🏠</div>
          <h2 className="text-xl font-bold text-slate-900">Kos Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            {error || 'Properti kos yang Anda cari mungkin telah dinonaktifkan atau belum disetujui.'}
          </p>
          <Link
            to="/kos"
            className="inline-block px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
          >
            ← Kembali ke Pencarian Kos
          </Link>
        </div>
      </div>
    );
  }

  const photos = kos.photos || [];
  const primaryPhoto = getPhotoUrl(kos.primary_photo || photos[0]?.photo_url);
  const otherPhotos = photos.slice(1, 5);

  const minRoomPrice = kos.rooms?.length
    ? Math.min(...kos.rooms.map((r) => r.price))
    : kos.min_price || 0;

  const availableRoomsCount = kos.rooms
    ? kos.rooms.filter((r) => r.is_available).length
    : kos.available_rooms || 0;

  // Type styling
  const typeBadgeStyles = {
    putra: 'bg-blue-600 text-white',
    putri: 'bg-pink-600 text-white',
    campur: 'bg-emerald-600 text-white',
  };

  return (
    <div className="flex-1 bg-slate-50 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-emerald-700 transition">
              Beranda
            </Link>
            <span>/</span>
            <Link to="/kos" className="hover:text-emerald-700 transition">
              Cari Kos
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
              {kos.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition font-medium text-slate-700 flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>{copied ? 'Tautan Disalin!' : 'Bagikan'}</span>
          </button>
        </div>

        {/* Gallery Mosaic (Airbnb / Modern Wireframe Style) */}
        <section className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100">
            {photos.length === 0 ? (
              <div className="aspect-16/9 sm:aspect-21/9 flex flex-col items-center justify-center text-slate-400 text-sm">
                <span className="text-4xl mb-2">📷</span>
                <span>Belum ada foto yang diunggah</span>
              </div>
            ) : photos.length === 1 ? (
              <div className="aspect-16/9 sm:aspect-21/9 overflow-hidden">
                <img
                  src={primaryPhoto}
                  alt={kos.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 aspect-16/10 sm:aspect-21/9">
                {/* Main large photo */}
                <div className="md:col-span-2 h-full overflow-hidden">
                  <img
                    src={primaryPhoto}
                    alt={kos.name}
                    className="w-full h-full object-cover hover:scale-102 transition duration-500 cursor-pointer"
                    onClick={() => setActivePhotoModal(true)}
                  />
                </div>

                {/* 2x2 side grid */}
                <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-full">
                  {otherPhotos.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="relative overflow-hidden h-full cursor-pointer group"
                      onClick={() => setActivePhotoModal(true)}
                    >
                      <img
                        src={getPhotoUrl(p.photo_url)}
                        alt={`${kos.name} ${idx + 2}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  ))}
                  {/* Fill empty spots if fewer than 5 photos */}
                  {Array.from({ length: Math.max(0, 4 - otherPhotos.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="bg-slate-200/50 flex items-center justify-center text-slate-400 text-xs"
                    >
                      JeJakos
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View All Photos Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePhotoModal(true)}
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs transition shadow-md flex items-center gap-1.5"
              >
                <span>📷</span>
                <span>Lihat Semua ({photos.length} Foto)</span>
              </button>
            )}
          </div>
        </section>

        {/* Main Grid: Details (Left 8 cols) + Sticky Booking Card (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Details Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Title & Key Meta */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs uppercase font-extrabold px-3 py-1 rounded-lg ${
                    typeBadgeStyles[kos.type] || 'bg-slate-700 text-white'
                  }`}
                >
                  Kos {kos.type}
                </span>

                {kos.is_approved && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span>✓</span> Terverifikasi JeJakos
                  </span>
                )}

                {kos.avg_rating > 0 && (
                  <div className="flex items-center gap-1 font-bold text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    <span>★</span>
                    <span>{kos.avg_rating}</span>
                    <span className="text-slate-400 font-normal">
                      ({kos.total_reviews || 0} ulasan)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {kos.name}
                </h1>
                <p className="text-sm text-slate-600 mt-1 flex items-start gap-1">
                  <span>📍</span>
                  <span>
                    {kos.district ? `${kos.district}, ` : ''}{kos.address}
                  </span>
                </p>
              </div>

              {/* Quick Summary Row */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                <div className="p-3 rounded-2xl bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-medium block">Tipe Hunian</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 capitalize">
                    {kos.type}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-medium block">Kamar Tersedia</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700">
                    {availableRoomsCount} Unit
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-medium block">Kecamatan</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                    {kos.district || 'Kota Jambi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📝</span>
                <span>Deskripsi Properti</span>
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {kos.description ||
                  'Kos bersih, aman, dan nyaman di lingkungan strategis Provinsi Jambi. Dekat fasilitas umum, warung makan, dan akses jalan utama.'}
              </p>
            </div>

            {/* Facilities */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>✨</span>
                <span>Fasilitas Kos</span>
              </h2>
              {kos.facilities && kos.facilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {kos.facilities.map((f) => (
                    <div
                      key={f.id || f.name}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700"
                    >
                      <span className="text-emerald-600">✓</span>
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Belum ada daftar fasilitas terperinci.</p>
              )}
            </div>

            {/* Rooms Available (Daftar Kamar) */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🚪</span>
                  <span>Daftar Kamar & Pilihan Sewa</span>
                </h2>
                <span className="text-xs text-slate-500">
                  {kos.rooms?.length || 0} unit terdaftar
                </span>
              </div>

              {!kos.rooms || kos.rooms.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada data kamar untuk kos ini.</p>
              ) : (
                <div className="space-y-3">
                  {kos.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {room.room_number || `Kamar #${room.id}`}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              room.is_available
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {room.is_available ? '✓ Tersedia' : '✕ Terisi'}
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-emerald-700 mt-1">
                          {formatCurrency(room.price)}
                          <span className="text-[11px] font-normal text-slate-500">
                            /{room.pay_period}
                          </span>
                        </p>
                        {room.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setBookingModalRoom(room)}
                        disabled={!room.is_available}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-xs shrink-0 ${
                          room.is_available
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {room.is_available ? 'Pesan Kamar' : 'Sudah Terisi'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Map & Landmark Distances (F-12 & F-13) */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📍</span>
                <span>Lokasi & Jarak ke Kampus / Kantor</span>
              </h2>

              {/* Distance Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {JAMBI_LANDMARKS.map((lm) => {
                  const dist = calculateDistanceKm(
                    kos.latitude,
                    kos.longitude,
                    lm.lat,
                    lm.lng
                  );

                  return (
                    <div
                      key={lm.name}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-1"
                    >
                      <div className="text-base">{lm.icon}</div>
                      <span className="text-[11px] font-bold text-slate-800 block line-clamp-1">
                        {lm.name.split(' (')[0]}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 block">
                        {dist} km
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Embedded Leaflet Map */}
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <KosMap
                  kosList={[kos]}
                  center={[kos.latitude, kos.longitude]}
                  zoom={15}
                  className="h-[360px]"
                />
              </div>
            </div>

            {/* Reviews Section */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <ReviewList reviews={reviews} summary={ratingSummary} />
              {user?.role === 'pencari' && <ReviewForm bookings={reviewBookings} onCreated={handleReviewCreated} />}
            </div>
          </div>

          {/* Right Sticky Booking & Owner Card */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md space-y-5">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Harga Sewa Mulai</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                    {formatCurrency(minRoomPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/bulan</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setBookingModalRoom(
                      kos.rooms?.find((r) => r.is_available) ||
                        kos.rooms?.[0] || { price: minRoomPrice, room_number: 'Kamar Pilihan' }
                    )
                  }
                  disabled={availableRoomsCount === 0}
                  className={`w-full py-3 text-xs sm:text-sm font-bold rounded-xl transition shadow-sm ${
                    availableRoomsCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {availableRoomsCount > 0 ? 'Pesan Kamar Sekarang' : 'Kamar Saat Ini Penuh'}
                </button>

                <button
                  type="button"
                  onClick={handleChatOwner}
                  disabled={startingChat}
                  className="w-full py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <span>💬</span>
                  <span>{startingChat ? 'Menghubungkan...' : 'Chat Pemilik di JeJakos'}</span>
                </button>

                {kos.owner_phone && (
                  <a
                    href={`https://wa.me/${kos.owner_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${kos.owner_name || 'Pemilik Kos'}, saya tertarik dengan ${kos.name} di JeJakos.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>💬 Hubungi Pemilik (WhatsApp)</span>
                  </a>
                )}
              </div>

              {/* Owner Info Profile Snippet */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                {kos.owner_photo ? (
                  <img
                    src={getPhotoUrl(kos.owner_photo)}
                    alt={kos.owner_name || 'Pemilik'}
                    className="w-11 h-11 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center border border-emerald-500 shrink-0">
                    {(kos.owner_name || 'P')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-xs leading-tight">
                  <p className="font-bold text-slate-900">{kos.owner_name || 'Pemilik Kos Terverifikasi'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pemilik Properti di Jambi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / All Photos Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Galeri Foto — {kos.name} ({photos.length} Foto)
              </h3>
              <button
                type="button"
                onClick={() => setActivePhotoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((p, idx) => (
                <div key={p.id || idx} className="rounded-2xl overflow-hidden border border-slate-200 aspect-16/10">
                  <img
                    src={getPhotoUrl(p.photo_url)}
                    alt={`${kos.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal (F-27) */}
      <BookingModal
        isOpen={Boolean(bookingModalRoom)}
        onClose={() => setBookingModalRoom(null)}
        kos={kos}
        initialRoom={bookingModalRoom}
        onBookingSuccess={() => {
          // Re-fetch kos detail to update room status if needed
          api.get(`/kos/${id}`).then((res) => {
            if (res.data?.kos) setKos(res.data.kos);
          }).catch(() => {});
        }}
      />
    </div>
  );
}
