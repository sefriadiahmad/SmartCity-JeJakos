import { useState, useEffect } from 'react';
import api from '../../services/api';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
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
        if (roleFilter) params.append('role', roleFilter);
        if (approvalFilter !== '') params.append('is_approved', approvalFilter);

        const res = await api.get(`/admin/users?${params.toString()}`);
        if (active) {
          setUsers(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (active) showFeedback('error', err.response?.data?.error || 'Gagal memuat daftar pengguna');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, search, roleFilter, approvalFilter, refreshKey]);

  const handleToggleApproval = async (targetUser) => {
    const nextApproved = !targetUser.is_approved;
    const confirmMsg = nextApproved
      ? `Setujui akun pemilik "${targetUser.name || targetUser.email}"? Akun ini akan dapat mempublikasikan kos ke pencari.`
      : `Batalkan persetujuan akun pemilik "${targetUser.name || targetUser.email}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    try {
      const res = await api.put(`/admin/users/${targetUser.id}/approve`, { is_approved: nextApproved });
      showFeedback('success', res.data?.message || 'Status persetujuan pemilik berhasil diperbarui');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Gagal mengubah status persetujuan');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Pengguna</h1>
          <p className="text-sm text-slate-600 mt-1">Verifikasi pemilik kos dan kelola akun pengguna platform</p>
        </div>

        {feedback.message && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border transition ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
            {feedback.type === 'success' ? '✓ ' : '✕ '}{feedback.message}
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama, email, atau nomor HP pengguna..."
              className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Peran</option>
              <option value="pemilik">Pemilik Kos</option>
              <option value="pencari">Pencari Kos</option>
              <option value="admin">Admin</option>
            </select>
            <select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Status Persetujuan</option>
              <option value="false">Menunggu Persetujuan</option>
              <option value="true">Disetujui</option>
            </select>
            {(search || roleFilter || approvalFilter) && (
              <button type="button" onClick={() => { setSearch(''); setRoleFilter(''); setApprovalFilter(''); setPage(1); }} className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline">Reset</button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan {users.length} dari {total} pengguna</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3" />
              Memuat daftar pengguna...
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <p className="text-2xl mb-1">👤</p>
              <p className="font-semibold text-slate-700">Tidak ada pengguna ditemukan</p>
              <p className="text-[11px] mt-0.5">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Kontak</th>
                    <th className="py-3 px-4">Verifikasi Email</th>
                    <th className="py-3 px-4">Persetujuan Pemilik</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const avatarUrl = getPhotoUrl(u.photo_url);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={u.name || u.email} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs border border-emerald-300">
                                {(u.name || u.email || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{u.name || 'Tanpa Nama'}</p>
                              <p className="text-slate-500 text-[11px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'pemilik' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.phone || <span className="text-slate-400 italic">-</span>}</td>
                        <td className="py-3 px-4">
                          {u.is_verified
                            ? <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><span>✓</span> Terverifikasi</span>
                            : <span className="inline-flex items-center gap-1 text-slate-400"><span>⏳</span> Belum</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.role === 'pemilik' ? (
                            u.is_approved
                              ? <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">✓ Disetujui</span>
                              : <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">⏳ Menunggu Persetujuan</span>
                          ) : <span className="text-slate-400 italic text-[11px]">N/A (Bukan Pemilik)</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {u.role === 'pemilik' && (
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleToggleApproval(u)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs ${u.is_approved ? 'bg-amber-100 hover:bg-amber-200 text-amber-900' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                            >
                              {actionLoadingId === u.id ? 'Memproses...' : u.is_approved ? 'Batalkan Persetujuan' : 'Setujui Pemilik'}
                            </button>
                          )}
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
      </div>
    </div>
  );
}
