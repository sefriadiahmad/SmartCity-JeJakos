import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiX, FiSearch, FiHome, FiClock, FiEye, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function KosTab() {
  const [kosList, setKosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmTarget, setConfirmTarget] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !actionLoadingId) setConfirmTarget(null);
    };
    if (confirmTarget) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmTarget, actionLoadingId]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (search.trim()) params.append('search', search.trim());
        if (approvalFilter !== '') params.append('is_approved', approvalFilter);
        if (typeFilter) params.append('type', typeFilter);
        if (statusFilter) params.append('status', statusFilter);

        const res = await api.get(`/admin/kos?${params.toString()}`);
        if (active) {
          setKosList(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (active) showFeedback('error', err.response?.data?.error || 'Gagal memuat daftar kos');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, search, approvalFilter, typeFilter, statusFilter, refreshKey]);

  const handleToggleApproval = (kos) => {
    setConfirmTarget(kos);
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    const kos = confirmTarget;
    const nextApproved = !kos.is_approved;

    setActionLoadingId(kos.id);
    try {
      const res = await api.put(`/admin/kos/${kos.id}/approve`, { is_approved: nextApproved });
      showFeedback('success', res.data?.message || 'Status persetujuan kos berhasil diperbarui');
      setRefreshKey((k) => k + 1);
      setConfirmTarget(null);
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Gagal mengubah status persetujuan kos');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verifikasi & Listing Kos</h1>
          <p className="text-sm text-slate-600 mt-1">Moderasi dan verifikasi listing properti kos di platform</p>
        </div>

        {feedback.message && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border transition flex items-center gap-1.5 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
            {feedback.type === 'success' ? <FiCheck className="w-4 h-4 text-emerald-600 shrink-0" /> : <FiX className="w-4 h-4 text-red-600 shrink-0" />}{feedback.message}
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama kos, alamat, nama pemilik..." className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs"><FiSearch className="w-3.5 h-3.5" /></span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Persetujuan</option>
              <option value="false">Menunggu Persetujuan</option>
              <option value="true">Disetujui / Publik</option>
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Tipe</option>
              <option value="putra">Putra</option>
              <option value="putri">Putri</option>
              <option value="campur">Campur</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(search || approvalFilter || typeFilter || statusFilter) && (
              <button type="button" onClick={() => { setSearch(''); setApprovalFilter(''); setTypeFilter(''); setStatusFilter(''); setPage(1); }} className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline">Reset</button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan {kosList.length} dari {total} properti kos</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3" />
              Memuat daftar kos...
            </div>
          ) : kosList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <FiHome className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">Tidak ada data kos ditemukan</p>
              <p className="text-[11px] mt-0.5">Coba sesuaikan filter pencarian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Properti Kos</th>
                    <th className="py-3 px-4">Pemilik</th>
                    <th className="py-3 px-4">Tipe & Lokasi</th>
                    <th className="py-3 px-4">Kamar</th>
                    <th className="py-3 px-4">Harga Terendah</th>
                    <th className="py-3 px-4">Status Listing</th>
                    <th className="py-3 px-4">Verifikasi Admin</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kosList.map((k) => {
                    const photo = getPhotoUrl(k.primary_photo);
                    return (
                      <tr key={k.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {photo ? (
                              <img src={photo} alt={k.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 text-lg border border-slate-200"><FiHome className="w-5 h-5 text-slate-400" /></div>
                            )}
                            <div>
                              <Link to={`/kos/${k.id}`} target="_blank" className="font-bold text-slate-900 hover:text-emerald-600 transition">{k.name}</Link>
                              <p className="text-slate-500 text-[11px] truncate max-w-xs">{k.address}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{k.owner_name || 'Pemilik #' + k.owner_id}</p>
                          <p className="text-slate-500 text-[11px]">{k.owner_phone || '-'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${k.type === 'putra' ? 'bg-blue-100 text-blue-800' : k.type === 'putri' ? 'bg-pink-100 text-pink-800' : 'bg-purple-100 text-purple-800'}`}>{k.type}</span>
                          <p className="text-slate-500 text-[11px] mt-1">{k.district || 'Kota Jambi'}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700"><span className="font-semibold">{k.available_rooms || 0}</span> / {k.total_rooms || 0} unit</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{k.min_price > 0 ? `${formatCurrency(k.min_price)}/bln` : '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${k.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>{k.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          {k.is_approved
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800"><FiCheck className="w-3 h-3" /> Terverifikasi</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800"><FiClock className="w-3 h-3" /> Menunggu Verifikasi</span>}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/kos/${k.id}`} target="_blank" className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 hover:border-emerald-300 transition" title="Lihat Pratinjau"><FiEye className="w-3.5 h-3.5" /></Link>
                            <button type="button" disabled={actionLoadingId === k.id} onClick={() => handleToggleApproval(k)} className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs ${k.is_approved ? 'bg-amber-100 hover:bg-amber-200 text-amber-900' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                              {actionLoadingId === k.id ? 'Memproses...' : k.is_approved ? 'Tolak / Batalkan' : 'Setujui Listing'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

        {/* Floating Modal Konfirmasi Persetujuan Kos */}
        {confirmTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={(e) => {
              if (e.target === e.currentTarget && !actionLoadingId) setConfirmTarget(null);
            }}
          >
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${confirmTarget.is_approved ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {confirmTarget.is_approved ? <FiAlertTriangle className="w-5 h-5" /> : <FiCheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {confirmTarget.is_approved ? 'Tolak / Batalkan Persetujuan' : 'Setujui Listing Kos'}
                    </h3>
                    <p className="text-xs text-slate-500">Konfirmasi publikasi properti kos</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!!actionLoadingId}
                  onClick={() => setConfirmTarget(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                  aria-label="Tutup"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {confirmTarget.is_approved ? (
                  <p>
                    Apakah Anda yakin ingin membatalkan persetujuan dan menyembunyikan listing kos <span className="font-bold text-slate-900">{confirmTarget.name}</span> dari publik? Kos tidak akan muncul di hasil pencarian pencari kos.
                  </p>
                ) : (
                  <p>
                    Apakah Anda yakin ingin menyetujui listing kos <span className="font-bold text-slate-900">{confirmTarget.name}</span>? Kos akan langsung terverifikasi dan muncul di pencarian publik pencari kos.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={!!actionLoadingId}
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!!actionLoadingId}
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 ${
                    confirmTarget.is_approved
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionLoadingId === confirmTarget.id
                    ? 'Memproses...'
                    : confirmTarget.is_approved
                    ? 'Ya, Batalkan Listing'
                    : 'Ya, Setujui Listing'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
