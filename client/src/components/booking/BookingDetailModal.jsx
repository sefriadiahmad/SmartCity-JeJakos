import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiHome, FiFlag, FiXCircle, FiSlash, FiX, FiMapPin, FiMessageCircle } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import api from '../../services/api';

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu Konfirmasi',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: FiClock,
    desc: 'Menunggu persetujuan dari pemilik kos.',
  },
  accepted: {
    label: 'Diterima',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: FiCheckCircle,
    desc: 'Pemilik menyetujui pesanan. Lakukan pembayaran atau hubungi pemilik untuk proses masuk.',
  },
  active: {
    label: 'Penghuni Aktif',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: FiHome,
    desc: 'Anda saat ini tercatat sebagai penghuni aktif di kos ini.',
  },
  completed: {
    label: 'Selesai',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: FiFlag,
    desc: 'Masa sewa kamar telah berakhir.',
  },
  rejected: {
    label: 'Ditolak',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: FiXCircle,
    desc: 'Pemesanan tidak dapat diterima oleh pemilik.',
  },
  cancelled: {
    label: 'Dibatalkan',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: FiSlash,
    desc: 'Pemesanan telah dibatalkan.',
  },
};

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  onBookingCancelled,
}) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  if (!isOpen || !booking) return null;

  const statusInfo = STATUS_CONFIG[booking.status] || {
    label: booking.status,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: FiClock,
    desc: '',
  };
  const StatusIcon = statusInfo.icon;

  const canCancel = booking.status === 'pending' || booking.status === 'accepted';

  const handleCancelBooking = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await api.put(`/bookings/${booking.id}/status`, {
        status: 'cancelled',
        notes: 'Dibatalkan oleh pencari kos',
      });
      setShowConfirmCancel(false);
      if (onBookingCancelled) {
        onBookingCancelled(booking.id);
      }
      onClose();
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Gagal membatalkan pemesanan');
    } finally {
      setCancelling(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const res = await api.post('/conversations', {
        kos_id: booking.kos?.id,
        recipient_id: booking.owner?.id || booking.kos?.owner_id,
      });
      const convId = res.data?.conversation?.id;
      if (convId) {
        onClose();
        navigate(`/conversations?id=${convId}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghubungkan percakapan');
    }
  };

  const ownerPhone = booking.owner?.phone;
  const waUrl = ownerPhone
    ? `https://wa.me/${ownerPhone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Halo ${booking.owner?.name || 'Bapak/Ibu'}, mengenai pemesanan #${booking.id} untuk kamar ${
          booking.room?.room_number || ''
        } di ${booking.kos?.name || ''} via JeJakos.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-100 text-left my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xl text-slate-700">
              <StatusIcon className="w-5 h-5 shrink-0" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Detail Pemesanan #{booking.id}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Diajukan pada{' '}
                {new Date(booking.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Status Explanation Card */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">{statusInfo.desc}</p>
          {booking.notes && (
            <p className="text-[11px] text-slate-500 italic">
              Catatan: &ldquo;{booking.notes}&rdquo;
            </p>
          )}
        </div>

        {/* Kos & Unit Information */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Informasi Properti
          </span>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3.5">
            {booking.room?.primary_photo || booking.kos?.primary_photo ? (
              <img
                src={getPhotoUrl(booking.room?.primary_photo || booking.kos?.primary_photo)}
                alt={booking.kos?.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                KOS
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <Link
                to={`/kos/${booking.kos?.id}`}
                className="font-bold text-sm text-slate-900 hover:text-emerald-700 transition block truncate"
              >
                {booking.kos?.name}
              </Link>
              <p className="text-xs text-slate-600 truncate flex items-center gap-1">
                <FiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{booking.kos?.address}, {booking.kos?.district}</span>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-emerald-700">
                  Unit: {booking.room?.room_number || `Kamar #${booking.room?.id}`}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(booking.room?.price)} / {booking.room?.pay_period || 'bulan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rent Schedule & Dates */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Jadwal Sewa
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Tanggal Check-in</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {booking.check_in_date || '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Tanggal Check-out</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {booking.check_out_date || 'Fleksibel / Belum Ditentukan'}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Information & Contact */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Kontak Pemilik Kos
          </span>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                {(booking.owner?.name || 'P')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {booking.owner?.name || 'Pemilik Kos'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {booking.owner?.phone || 'Nomor HP belum tersedia'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleStartChat}
                className="py-1.5 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <FiMessageCircle className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Section */}
        {showConfirmCancel ? (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2.5 text-xs text-rose-900">
            <p className="font-bold">Konfirmasi Pembatalan</p>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Apakah Anda yakin ingin membatalkan pemesanan kamar ini? Tindakan ini tidak dapat diurungkan.
            </p>
            {cancelError && (
              <p className="text-xs font-semibold text-rose-700">{cancelError}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowConfirmCancel(false)}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Jangan Batalkan
              </button>
            </div>
          </div>
        ) : null}

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          {canCancel && !showConfirmCancel ? (
            <button
              type="button"
              onClick={() => setShowConfirmCancel(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Batalkan Pemesanan
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
