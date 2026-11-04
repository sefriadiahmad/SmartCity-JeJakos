import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { FaBed } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function addMonthsToDate(dateStr, months) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().split('T')[0];
}

function BookingModalContent({ onClose, kos, initialRoom, onBookingSuccess }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const availableRooms = useMemo(() => {
    return (kos?.rooms || []).filter((r) => r.is_available);
  }, [kos]);

  const [selectedRoomId, setSelectedRoomId] = useState(() => {
    if (initialRoom && initialRoom.id) return String(initialRoom.id);
    const firstAvail = (kos?.rooms || []).find((r) => r.is_available);
    return firstAvail ? String(firstAvail.id) : '';
  });

  const [checkInDate, setCheckInDate] = useState(getTomorrowDate);
  const [durationMonths, setDurationMonths] = useState(1);
  const [customCheckOut, setCustomCheckOut] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return initialRoom || availableRooms[0] || null;
    return (
      (kos?.rooms || []).find((r) => String(r.id) === String(selectedRoomId)) ||
      initialRoom ||
      null
    );
  }, [selectedRoomId, kos, initialRoom, availableRooms]);

  const calculatedCheckOut = useMemo(() => {
    if (isCustomDuration) {
      return customCheckOut;
    }
    return addMonthsToDate(checkInDate, durationMonths);
  }, [checkInDate, durationMonths, isCustomDuration, customCheckOut]);

  const estimatedTotal = useMemo(() => {
    if (!selectedRoom?.price) return 0;
    const price = Number(selectedRoom.price);
    if (selectedRoom.pay_period === 'tahunan') {
      return price * Math.max(1, Math.round(durationMonths / 12));
    }
    return price * (isCustomDuration ? 1 : durationMonths);
  }, [selectedRoom, durationMonths, isCustomDuration]);

  const isOwner = user && user.id === kos.owner_id;
  const isPemilikRole = user && user.role === 'pemilik';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (isOwner) {
      setError('Pemilik tidak dapat memesan kamar di kos sendiri.');
      return;
    }

    if (isPemilikRole && user.role !== 'admin') {
      setError(
        'Akun Anda terdaftar sebagai Pemilik Kos. Pemesanan kamar hanya dapat dilakukan oleh akun Pencari Kos.'
      );
      return;
    }

    if (!selectedRoom || !selectedRoom.id) {
      setError('Pilih kamar yang ingin dipesan.');
      return;
    }

    if (!checkInDate) {
      setError('Pilih tanggal check-in.');
      return;
    }

    if (calculatedCheckOut && calculatedCheckOut < checkInDate) {
      setError('Tanggal check-out tidak boleh lebih awal dari tanggal check-in.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        room_id: Number(selectedRoom.id),
        check_in_date: checkInDate,
        check_out_date: calculatedCheckOut || null,
        notes: notes ? notes.trim() : null,
      };

      const res = await api.post('/bookings', payload);
      const createdBooking = res.data?.booking;

      setSuccessBooking(createdBooking);
      if (onBookingSuccess) {
        onBookingSuccess(createdBooking);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error;
      setError(
        serverMsg || 'Gagal mengajukan pemesanan. Silakan periksa kembali formulir Anda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-100 text-left my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl text-emerald-600">
              <FaBed className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900">Form Pemesanan Kamar</h3>
              <p className="text-xs text-slate-500">{kos.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Success View */}
        {successBooking ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              <FiCheck className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-extrabold text-slate-900">
                Pemesanan Berhasil Diajukan!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Pemesanan Anda untuk <span className="font-bold text-slate-800">{kos.name}</span>{' '}
                (Unit:{' '}
                <span className="font-bold text-emerald-700">
                  {selectedRoom?.room_number || `Kamar #${selectedRoom?.id}`}
                </span>
                ) telah diterima sistem dengan status{' '}
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  Menunggu Konfirmasi
                </span>
                .
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Pemesanan</span>
                <span className="font-bold text-slate-800">#{successBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Check-in</span>
                <span className="font-bold text-slate-800">{successBooking.check_in_date}</span>
              </div>
              {successBooking.check_out_date && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Check-out</span>
                  <span className="font-bold text-slate-800">
                    {successBooking.check_out_date}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Harga Sewa</span>
                <span className="font-extrabold text-emerald-700">
                  {formatCurrency(selectedRoom?.price)} /{' '}
                  {selectedRoom?.pay_period || 'bulan'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pemilik kos ({kos.owner_name || 'Bapak/Ibu'}) akan memeriksa pesanan Anda. Anda
              dapat memeriksa kemajuan status dan tagihan di halaman Pemesanan Saya.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/bookings');
                }}
                className="flex-1 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                Lihat Pemesanan Saya
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auth / Role Warnings */}
            {!user && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <FiInfo className="w-4 h-4 shrink-0" />
                  <span>Autentikasi Diperlukan</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Silakan masuk terlebih dahulu dengan akun pencari kos Anda untuk mengajukan
                  pemesanan kamar ini.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </div>
            )}

            {isOwner && (
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                <FiAlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Anda adalah pemilik properti ini. Anda tidak dapat memesan kos milik sendiri.</span>
              </div>
            )}

            {isPemilikRole && !isOwner && user?.role !== 'admin' && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
                <FiAlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Akun Anda terdaftar sebagai <strong>Pemilik Kos</strong>. Fitur pemesanan hanya
                dapat digunakan oleh akun <strong>Pencari Kos</strong>.</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Room Card Preview & Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Kamar yang Dipesan
              </label>

              {availableRooms.length > 1 ? (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 cursor-pointer"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_number || `Kamar #${r.id}`} — {formatCurrency(r.price)} /{' '}
                      {r.pay_period || 'bulan'}
                    </option>
                  ))}
                </select>
              ) : null}

              {selectedRoom ? (
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedRoom.primary_photo || selectedRoom.photos?.[0]?.photo_url ? (
                      <img
                        src={getPhotoUrl(
                          selectedRoom.primary_photo || selectedRoom.photos?.[0]?.photo_url
                        )}
                        alt={selectedRoom.room_number || 'Kamar'}
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-200/60 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        KM
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">
                        {selectedRoom.room_number || `Kamar #${selectedRoom.id}`}
                      </p>
                      <p className="text-[11px] text-emerald-800 truncate">
                        {selectedRoom.description || 'Kamar standar'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-emerald-700">
                      {formatCurrency(selectedRoom.price)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium">
                      per {selectedRoom.pay_period || 'bulan'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 text-center">
                  Tidak ada kamar yang tersedia saat ini.
                </div>
              )}
            </div>

            {/* Check-in Date */}
            <div className="space-y-1.5">
              <label htmlFor="check_in_date" className="text-xs font-bold text-slate-700 block">
                Tanggal Rencana Masuk (Check-in) <span className="text-red-500">*</span>
              </label>
              <input
                id="check_in_date"
                type="date"
                min={getTodayDate()}
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 cursor-pointer"
              />
            </div>

            {/* Duration Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Durasi Sewa</label>
                <button
                  type="button"
                  onClick={() => setIsCustomDuration(!isCustomDuration)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  {isCustomDuration ? 'Pilih Preset Durasi' : 'Atur Tanggal Check-out Manual'}
                </button>
              </div>

              {!isCustomDuration ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMonths(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        durationMonths === m
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 12 ? '1 Tahun' : `${m} Bln`}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="date"
                  min={checkInDate || getTodayDate()}
                  value={customCheckOut}
                  onChange={(e) => setCustomCheckOut(e.target.value)}
                  placeholder="Tanggal Check-out"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 cursor-pointer"
                />
              )}

              {calculatedCheckOut && (
                <p className="text-[11px] text-slate-500 pt-0.5">
                  Estimasi berakhir:{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(calculatedCheckOut).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              )}
            </div>

            {/* Notes / Special Requests */}
            <div className="space-y-1.5">
              <label htmlFor="booking_notes" className="text-xs font-bold text-slate-700 block">
                Catatan untuk Pemilik (Opsional)
              </label>
              <textarea
                id="booking_notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                placeholder="Contoh: Mahasiswa UNJA semester 3, bawa motor, rencana masuk pagi..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 resize-none"
              />
            </div>

            {/* Price Estimation Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>
                  Estimasi Biaya Sewa ({isCustomDuration ? '1 periode' : `${durationMonths} bulan`})
                </span>
                <span className="font-bold text-slate-800">{formatCurrency(estimatedTotal)}</span>
              </div>
              <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">Total Tagihan Awal</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatCurrency(estimatedTotal)}
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !user ||
                  isOwner ||
                  (isPemilikRole && user?.role !== 'admin') ||
                  !selectedRoom?.is_available
                }
                className="py-2.5 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Ajukan Pemesanan</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BookingModal({
  isOpen,
  onClose,
  kos,
  initialRoom = null,
  onBookingSuccess,
}) {
  if (!isOpen || !kos) return null;

  return (
    <BookingModalContent
      key={`${kos.id}_${initialRoom?.id || 'default'}`}
      onClose={onClose}
      kos={kos}
      initialRoom={initialRoom}
      onBookingSuccess={onBookingSuccess}
    />
  );
}
