import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiBookOpen,
  FiMapPin,
  FiHome,
  FiShare2,
  FiCamera,
  FiCheck,
  FiStar,
  FiFileText,
  FiGrid,
  FiMessageCircle,
  FiMessageSquare,
  FiX,
} from 'react-icons/fi';
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
  { name: 'Universitas Jambi (UNJA Mendalo)', lat: -1.6140, lng: 103.5200, icon: FiBookOpen },
  { name: 'UIN STS Jambi (Sungai Duren)', lat: -1.6065, lng: 103.5095, icon: FiMapPin },
  { name: 'Universitas Batanghari (UNBARI)', lat: -1.6045, lng: 103.5930, icon: FiBookOpen },
  { name: 'WTC Batanghari (Pusat Kota)', lat: -1.5920, lng: 103.6180, icon: FiHome },
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
      <div className="flex flex-1 items-center justify-center bg-[#f5f7f3] py-28">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1f6b58] border-t-transparent" />
      </div>
    );
  }

  if (error || !kos) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f5f7f3] px-4 py-20">
        <div className="jk-card w-full max-w-md space-y-4 p-8 text-center">
          <FiHome className="w-12 h-12 text-[#b9d5c7] mx-auto" />
          <h2 className="text-xl font-bold text-[#18352f]">Kos Tidak Ditemukan</h2>
          <p className="text-xs text-[#60736d]">
            {error || 'Properti kos yang Anda cari mungkin telah dinonaktifkan atau belum disetujui.'}
          </p>
          <Link
            to="/kos"
            className="inline-flex min-h-11 items-center rounded-[14px] bg-[#1f6b58] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#18352f]"
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
    putra: 'bg-[var(--jk-badge-putra)] text-white',
    putri: 'bg-[var(--jk-badge-putri)] text-white',
    campur: 'bg-[var(--jk-badge-campur)] text-white',
  };

  return (
    <div className="flex-1 bg-[#f5f7f3] py-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs text-[#60736d]">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1f6b58] transition">
              Beranda
            </Link>
            <span>/</span>
            <Link to="/kos" className="hover:text-[#1f6b58] transition">
              Cari Kos
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#18352f] truncate max-w-[200px] sm:max-w-xs">
              {kos.name}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 rounded-[14px] border border-[#dce7e1] bg-[#fffcf7] hover:bg-[#e6eee9] transition font-medium text-[#31564c] flex items-center gap-1.5 cursor-pointer"
          >
            <FiShare2 className="w-4 h-4 text-[#60736d]" />
            <span>{copied ? 'Tautan Disalin!' : 'Bagikan'}</span>
          </button>
        </div>

        {/* Gallery Mosaic (Airbnb / Modern Wireframe Style) */}
        <section className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden border border-[#dce7e1] bg-[#e6eee9]">
            {photos.length === 0 ? (
              <div className="aspect-16/9 sm:aspect-21/9 flex flex-col items-center justify-center text-[#91a69d] text-sm">
                <FiCamera className="w-8 h-8 text-[#b9d5c7] mb-2" />
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

                {/* Sub photos grid */}
                <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-full">
                  {otherPhotos.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="h-full overflow-hidden cursor-pointer"
                      onClick={() => setActivePhotoModal(true)}
                    >
                      <img
                        src={getPhotoUrl(p.photo_url)}
                        alt={`${kos.name} preview ${idx + 2}`}
                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                      />
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
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-[14px] bg-[#18352f]/85 hover:bg-[#18352f] text-white text-xs font-bold backdrop-blur-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FiCamera className="w-3.5 h-3.5" />
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
            <div className="jk-card space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs uppercase font-extrabold px-3 py-1 rounded-lg ${
                    typeBadgeStyles[kos.type] || 'bg-slate-700 text-white'
                  }`}
                >
                  Kos {kos.type}
                </span>

                {kos.is_approved && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#e6eee9] text-[#1f6b58] border border-[#b9d5c7] flex items-center gap-1">
                    <FiCheck className="w-3.5 h-3.5 text-[#1f6b58]" /> Terverifikasi JeJakos
                  </span>
                )}

                {kos.avg_rating > 0 && (
                  <div className="flex items-center gap-1 font-bold text-xs text-[var(--jk-rating)] bg-[var(--jk-rating-bg)] border border-[#e7c68a] px-2.5 py-1 rounded-lg">
                    <FiStar className="w-3.5 h-3.5 fill-[var(--jk-rating)] text-[var(--jk-rating)]" />
                    <span>{kos.avg_rating}</span>
                    <span className="text-[#91a69d] font-normal">
                      ({kos.total_reviews || 0} ulasan)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[#18352f] sm:text-5xl">
                  {kos.name}
                </h1>
                <p className="text-sm text-[#60736d] mt-1 flex items-start gap-1">
                  <FiMapPin className="w-4 h-4 text-[#c9784a] shrink-0 mt-0.5" />
                  <span>
                    {kos.district ? `${kos.district}, ` : ''}{kos.address}
                  </span>
                </p>
              </div>

              {/* Quick Summary Row */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#dce7e1] text-center">
                <div className="p-3 rounded-2xl bg-[#f5efe4]/40">
                  <span className="text-[11px] text-[#60736d] font-medium block">Tipe Hunian</span>
                  <span className="text-xs sm:text-sm font-bold text-[#18352f] capitalize">
                    {kos.type}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#f5efe4]/40">
                  <span className="text-[11px] text-[#60736d] font-medium block">Kamar Tersedia</span>
                  <span className="text-xs sm:text-sm font-bold text-[#1f6b58]">
                    {availableRoomsCount} Unit
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#f5efe4]/40">
                  <span className="text-[11px] text-[#60736d] font-medium block">Kecamatan</span>
                  <span className="text-xs sm:text-sm font-bold text-[#18352f] truncate block">
                    {kos.district || 'Kota Jambi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 bg-[#fffcf7] rounded-3xl border border-[#dce7e1] shadow-xs space-y-3">
              <h2 className="text-base font-bold text-[#18352f] flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-[#1f6b58]" />
                <span>Deskripsi Properti</span>
              </h2>
              <p className="text-sm text-[#60736d] leading-relaxed whitespace-pre-line">
                {kos.description ||
                  'Kos bersih, aman, dan nyaman di lingkungan strategis Provinsi Jambi. Dekat fasilitas umum, warung makan, dan akses jalan utama.'}
              </p>
            </div>

            {/* Facilities */}
            <div className="jk-card space-y-4 p-6">
              <h2 className="text-base font-bold text-[#18352f] flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-[#1f6b58]" />
                <span>Fasilitas Kos</span>
              </h2>
              {kos.facilities && kos.facilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {kos.facilities.map((f) => (
                    <div
                      key={f.id || f.name}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-[#e6eee9]/50 border border-[#dce7e1] text-xs font-semibold text-[#31564c]"
                    >
                      <FiCheck className="w-3.5 h-3.5 text-[#1f6b58]" />
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#60736d]">Belum ada daftar fasilitas terperinci.</p>
              )}
            </div>

            {/* Rooms Available (Daftar Kamar) */}
            <div className="jk-card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#18352f] flex items-center gap-2">
                  <FiGrid className="w-4 h-4 text-[#1f6b58]" />
                  <span>Daftar Kamar & Pilihan Sewa</span>
                </h2>
                <span className="text-xs text-[#60736d]">
                  {kos.rooms?.length || 0} unit terdaftar
                </span>
              </div>

              {!kos.rooms || kos.rooms.length === 0 ? (
                <p className="text-xs text-[#60736d]">Belum ada data kamar untuk kos ini.</p>
              ) : (
                <div className="space-y-3">
                  {kos.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 rounded-2xl border border-[#dce7e1] hover:border-[#1f6b58]/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#f5efe4]/30"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#18352f]">
                            {room.room_number || `Kamar #${room.id}`}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              room.is_available
                                ? 'bg-[#e6eee9] text-[#1f6b58]'
                                : 'bg-[#dce7e1] text-[#60736d]'
                            }`}
                          >
                            {room.is_available ? (
                              <>
                                <FiCheck className="w-3 h-3" /> Tersedia
                              </>
                            ) : (
                              <>
                                <FiX className="w-3 h-3" /> Terisi
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-[#1f6b58] mt-1">
                          {formatCurrency(room.price)}
                          <span className="text-[11px] font-normal text-[#60736d]">
                            /{room.pay_period}
                          </span>
                        </p>
                        {room.description && (
                          <p className="text-xs text-[#60736d] mt-1 line-clamp-1">
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
                            ? 'bg-[#1f6b58] hover:bg-[#18352f] text-white'
                            : 'bg-[#dce7e1] text-[#91a69d] cursor-not-allowed'
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
            <div className="jk-card space-y-4 p-6">
              <h2 className="text-base font-bold text-[#18352f] flex items-center gap-2">
                <FiMapPin className="w-4 h-4 text-[#c9784a]" />
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
                  const LandmarkIcon = lm.icon;

                  return (
                    <div
                      key={lm.name}
                      className="p-3 bg-[#f5efe4]/40 rounded-2xl border border-[#dce7e1] text-left space-y-1"
                    >
                      <div className="text-[#c9784a]">
                        <LandmarkIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-[#18352f] block line-clamp-1">
                        {lm.name.split(' (')[0]}
                      </span>
                      <span className="text-xs font-extrabold text-[#1f6b58] block">
                        {dist} km
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Embedded Leaflet Map */}
              <div className="rounded-2xl overflow-hidden border border-[#dce7e1]">
                <KosMap
                  kosList={[kos]}
                  center={[kos.latitude, kos.longitude]}
                  zoom={15}
                  className="h-[360px]"
                />
              </div>
            </div>

            {/* Reviews Section */}
            <div className="jk-card space-y-4 p-6">
              <ReviewList reviews={reviews} summary={ratingSummary} />
              {user?.role === 'pencari' && <ReviewForm bookings={reviewBookings} onCreated={handleReviewCreated} />}
            </div>
          </div>

          {/* Right Sticky Booking & Owner Card */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="p-6 bg-[#fffcf7] rounded-3xl border border-[#dce7e1] shadow-md space-y-5">
              <div>
                <span className="text-xs text-[#91a69d] block font-medium">Harga Sewa Mulai</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#1f6b58]">
                    {formatCurrency(minRoomPrice)}
                  </span>
                  <span className="text-xs text-[#60736d] font-medium">/bulan</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#dce7e1]">
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
                      ? 'bg-[#1f6b58] hover:bg-[#18352f] text-white cursor-pointer'
                      : 'bg-[#dce7e1] text-[#91a69d] cursor-not-allowed'
                  }`}
                >
                  {availableRoomsCount > 0 ? 'Pesan Kamar Sekarang' : 'Kamar Saat Ini Penuh'}
                </button>

                <button
                  type="button"
                  onClick={handleChatOwner}
                  disabled={startingChat}
                  className="w-full py-2.5 text-xs font-bold text-[#1f6b58] bg-[#e6eee9] hover:bg-[#dce7e1] border border-[#b9d5c7] rounded-[14px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <FiMessageCircle className="w-3.5 h-3.5" />
                  <span>{startingChat ? 'Menghubungkan...' : 'Chat Pemilik di JeJakos'}</span>
                </button>

                {kos.owner_phone && (
                  <a
                    href={`https://wa.me/${kos.owner_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${kos.owner_name || 'Pemilik Kos'}, saya tertarik dengan ${kos.name} di JeJakos.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 text-xs font-bold text-[#1f6b58] bg-[#e6eee9] hover:bg-[#dce7e1] border border-[#b9d5c7] rounded-[14px] transition flex items-center justify-center gap-1.5"
                  >
                    <FiMessageSquare className="w-3.5 h-3.5" />
                    <span>Hubungi Pemilik (WhatsApp)</span>
                  </a>
                )}
              </div>

              {/* Owner Info Profile Snippet */}
              <div className="pt-4 border-t border-[#dce7e1] flex items-center gap-3">
                {kos.owner_photo ? (
                  <img
                    src={getPhotoUrl(kos.owner_photo)}
                    alt={kos.owner_name || 'Pemilik'}
                    className="w-11 h-11 rounded-full object-cover border border-[#1f6b58]"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#e6eee9] text-[#1f6b58] text-sm font-bold flex items-center justify-center border border-[#1f6b58] shrink-0">
                    {(kos.owner_name || 'P')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-xs leading-tight">
                  <p className="font-bold text-[#18352f]">{kos.owner_name || 'Pemilik Kos Terverifikasi'}</p>
                  <p className="text-[11px] text-[#60736d] mt-0.5">Pemilik Properti di Jambi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / All Photos Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18352f]/85 backdrop-blur-xs">
          <div className="bg-[#fffcf7] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#dce7e1]">
              <h3 className="font-bold text-sm text-[#18352f]">
                Galeri Foto — {kos.name} ({photos.length} Foto)
              </h3>
              <button
                type="button"
                onClick={() => setActivePhotoModal(false)}
                aria-label="Tutup"
                className="p-1 rounded-lg text-[#91a69d] hover:text-[#18352f] cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((p, idx) => (
                <div key={p.id || idx} className="rounded-2xl overflow-hidden border border-[#dce7e1] aspect-16/10">
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
