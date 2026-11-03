import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modFilter, setModFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search.trim()) params.append('search', search.trim());
        if (modFilter !== '') params.append('is_moderated', modFilter);

        const res = await api.get(`/admin/reviews?${params.toString()}`);
        if (active) {
          setReviews(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (active) showFeedback('error', err.response?.data?.error || 'Gagal memuat daftar ulasan');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, search, modFilter, refreshKey]);

  const handleToggleModerate = async (review) => {
    const nextMod = !review.is_moderated;
    const confirmMsg = nextMod
      ? `Tandai ulasan dari "${review.user_name}" sebagai konten yang dimoderasi (disembunyikan dari publik)?`
      : `Buka moderasi ulasan ini agar tampil kembali secara publik?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(review.id);
    try {
      const res = await api.put(`/admin/reviews/${review.id}/moderate`, { is_moderated: nextMod });
      showFeedback('success', res.data?.message || 'Status moderasi ulasan berhasil diperbarui');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Gagal memperbarui moderasi ulasan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm(`Hapus permanen ulasan dari "${review.user_name}" untuk kos "${review.kos_name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    setActionLoadingId(review.id);
    try {
      const res = await api.delete(`/admin/reviews/${review.id}`);
      showFeedback('success', res.data?.message || 'Ulasan berhasil dihapus');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Gagal menghapus ulasan');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Moderasi Ulasan</h1>
          <p className="text-sm text-slate-600 mt-1">Pantau dan moderasi ulasan pengguna terhadap properti kos</p>
        </div>

        {feedback.message && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border transition ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
            {feedback.type === 'success' ? '✓ ' : '✕ '}{feedback.message}
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari teks ulasan, nama penyewa, atau nama kos..." className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={modFilter} onChange={(e) => { setModFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Status Moderasi</option>
              <option value="false">Normal (Tampil Publik)</option>
              <option value="true">Dimoderasi (Disembunyikan)</option>
            </select>
            {(search || modFilter) && (
              <button type="button" onClick={() => { setSearch(''); setModFilter(''); setPage(1); }} className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline">Reset</button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan {reviews.length} dari {total} ulasan pengguna</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3" />
              Memuat daftar ulasan...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <p className="text-2xl mb-1">⭐</p>
              <p className="font-semibold text-slate-700">Tidak ada ulasan ditemukan</p>
              <p className="text-[11px] mt-0.5">Belum ada ulasan yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Penyewa</th>
                    <th className="py-3 px-4">Properti Kos</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Isi Ulasan</th>
                    <th className="py-3 px-4">Status Moderasi</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((rv) => (
                    <tr key={rv.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{rv.user_name}</p>
                        <p className="text-slate-500 text-[11px]">{rv.user_email}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-emerald-800">
                        <Link to={`/kos/${rv.kos_id}`} target="_blank" className="hover:underline">{rv.kos_name}</Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-600">
                          {'★'.repeat(rv.rating)}<span className="text-slate-300">{'★'.repeat(5 - rv.rating)}</span>
                        </span>
                        <span className="ml-1 text-slate-600 font-semibold">{rv.rating}/5</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-sm">
                        <p className="line-clamp-2">{rv.content || <span className="italic text-slate-400">Tanpa ulasan teks</span>}</p>
                      </td>
                      <td className="py-3 px-4">
                        {rv.is_moderated
                          ? <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-800">🚫 Dimoderasi</span>
                          : <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">✓ Normal</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {rv.created_at ? new Date(rv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" disabled={actionLoadingId === rv.id} onClick={() => handleToggleModerate(rv)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${rv.is_moderated ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
                            {rv.is_moderated ? 'Buka Moderasi' : 'Tandai Melanggar'}
                          </button>
                          <button type="button" disabled={actionLoadingId === rv.id} onClick={() => handleDeleteReview(rv)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Halaman {page} dari {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Sebelumnya</button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
