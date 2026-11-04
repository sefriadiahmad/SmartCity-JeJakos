import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import api from '../../services/api';

export default function ReviewForm({ bookings, onCreated }) {
  const [bookingId, setBookingId] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) return setError('Pilih rating terlebih dahulu.');
    setSaving(true); setError('');
    try {
      const result = await api.post('/reviews', { booking_id: Number(bookingId), rating, content: content.trim() || null });
      setBookingId(''); setRating(0); setContent('');
      onCreated(result.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Gagal mengirim ulasan.');
    } finally { setSaving(false); }
  };

  if (!bookings.length) return null;
  return <form onSubmit={submit} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
    <div><h3 className="text-sm font-bold text-slate-900">Bagikan pengalaman hunian</h3><p className="mt-0.5 text-[11px] text-slate-600">Ulasan tampil untuk membantu pencari kos lain.</p></div>
    {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
    <select required value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
      <option value="">Pilih kamar yang ditempati</option>
      {bookings.map((booking) => <option key={booking.id} value={booking.id}>Kamar {booking.room?.room_number || booking.room_id}</option>)}
    </select>
    <div className="flex gap-1" aria-label="Pilih rating">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setRating(star)} className="p-1 cursor-pointer transition hover:scale-110" aria-label={`${star} bintang`}><FiStar className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>)}</div>
    <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength="2000" rows="3" placeholder="Ceritakan pengalaman Anda (opsional)." className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
    <div className="flex justify-end"><button disabled={saving || !bookingId || !rating} className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Mengirim...' : 'Kirim Ulasan'}</button></div>
  </form>;
}
