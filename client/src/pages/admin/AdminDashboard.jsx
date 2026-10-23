import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Active tab: 'users' | 'kos' | 'rooms' | 'reviews'
  const getInitialTab = () => {
    const paramTab = searchParams.get('tab');
    if (paramTab) return paramTab;
    if (location.pathname.endsWith('/kos')) return 'kos';
    if (location.pathname.endsWith('/reviews')) return 'reviews';
    if (location.pathname.endsWith('/rooms')) return 'rooms';
    return 'users';
  };

  const activeTab = getInitialTab();
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Toast / feedback message
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  // Platform stats overview
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingOwners: 0,
    totalKos: 0,
    pendingKos: 0,
    totalReviews: 0,
  });
  const [statsKey, setStatsKey] = useState(0);
  const handleStatsChange = () => setStatsKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const res = await api.get('/admin/dashboard');
        if (active && res.data) {
          setStats({
            totalUsers: res.data.totalUsers || 0,
            pendingOwners: res.data.pendingOwners || 0,
            totalKos: res.data.totalKos || 0,
            pendingKos: res.data.pendingKos || 0,
            totalReviews: res.data.totalReviews || 0,
          });
        }
      } catch {
        // stats error suppressed to avoid blocking UI
      }
    }
    loadStats();
    return () => {
      active = false;
    };
  }, [statsKey]);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Panel Admin
              </span>
              <span className="text-xs text-slate-500">
                Masuk sebagai: <strong className="text-slate-800">{user?.name || user?.email}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              Manajemen Platform JeJakos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Verifikasi pemilik kos, moderasi listing properti, audit kamar, dan pantau ulasan pengguna
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border transition ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? '✓ ' : '✕ '}
            {feedback.message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab('users')}
            className={`p-4 sm:p-5 bg-white rounded-2xl border transition cursor-pointer hover:border-emerald-500 shadow-xs ${
              activeTab === 'users' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pengguna</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pemilik, pencari, admin</p>
          </div>

          <div
            onClick={() => setActiveTab('users')}
            className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer hover:border-amber-500 shadow-xs ${
              stats.pendingOwners > 0
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-white border-slate-200'
            } ${activeTab === 'users' ? 'border-amber-500 ring-2 ring-amber-500/20' : ''}`}
          >
            <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pemilik Baru</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{stats.pendingOwners}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              {stats.pendingOwners > 0 ? 'Perlu verifikasi' : 'Semua terverifikasi'}
            </p>
          </div>

          <div
            onClick={() => setActiveTab('kos')}
            className={`p-4 sm:p-5 bg-white rounded-2xl border transition cursor-pointer hover:border-emerald-500 shadow-xs ${
              activeTab === 'kos' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Listing Kos</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalKos}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Semua properti kos</p>
          </div>

          <div
            onClick={() => setActiveTab('kos')}
            className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer hover:border-amber-500 shadow-xs ${
              stats.pendingKos > 0
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-white border-slate-200'
            } ${activeTab === 'kos' ? 'border-amber-500 ring-2 ring-amber-500/20' : ''}`}
          >
            <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Kos Baru</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">{stats.pendingKos}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              {stats.pendingKos > 0 ? 'Perlu verifikasi' : 'Semua disetujui'}
            </p>
          </div>

          <div
            onClick={() => setActiveTab('reviews')}
            className={`col-span-2 lg:col-span-1 p-4 sm:p-5 bg-white rounded-2xl border transition cursor-pointer hover:border-emerald-500 shadow-xs ${
              activeTab === 'reviews' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ulasan Pengguna</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalReviews}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Moderasi konten</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <div className="flex gap-2 sm:gap-6 overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>👥 Kelola Pengguna</span>
              {stats.pendingOwners > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {stats.pendingOwners}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kos')}
              className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 ${
                activeTab === 'kos'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🏠 Verifikasi & Listing Kos</span>
              {stats.pendingKos > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {stats.pendingKos}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 ${
                activeTab === 'rooms'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🛏️ Daftar Kamar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>⭐ Moderasi Ulasan</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <UsersTab onStatsChange={handleStatsChange} onFeedback={showFeedback} />
        )}
        {activeTab === 'kos' && (
          <KosTab onStatsChange={handleStatsChange} onFeedback={showFeedback} />
        )}
        {activeTab === 'rooms' && (
          <RoomsTab />
        )}
        {activeTab === 'reviews' && (
          <ReviewsTab onStatsChange={handleStatsChange} onFeedback={showFeedback} />
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// TAB 1: USERS TAB (F-15, F-17)
// ==============================================================================
function UsersTab({ onStatsChange, onFeedback }) {
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

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
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
        if (active) {
          onFeedback('error', err.response?.data?.error || 'Gagal memuat daftar pengguna');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, search, roleFilter, approvalFilter, onFeedback, refreshKey]);

  const handleToggleApproval = async (targetUser) => {
    const nextApproved = !targetUser.is_approved;
    const confirmMsg = nextApproved
      ? `Setujui akun pemilik "${targetUser.name || targetUser.email}"? Akun ini akan dapat mempublikasikan kos ke pencari.`
      : `Batalkan persetujuan akun pemilik "${targetUser.name || targetUser.email}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser.id);
    try {
      const res = await api.put(`/admin/users/${targetUser.id}/approve`, {
        is_approved: nextApproved,
      });
      onFeedback('success', res.data?.message || 'Status persetujuan pemilik berhasil diperbarui');
      setRefreshKey((k) => k + 1);
      onStatsChange();
    } catch (err) {
      onFeedback('error', err.response?.data?.error || 'Gagal mengubah status persetujuan');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau nomor HP pengguna..."
            className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Peran</option>
            <option value="pemilik">Pemilik Kos</option>
            <option value="pencari">Pencari Kos</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={approvalFilter}
            onChange={(e) => {
              setApprovalFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status Persetujuan</option>
            <option value="false">Menunggu Persetujuan</option>
            <option value="true">Disetujui</option>
          </select>

          {(search || roleFilter || approvalFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setApprovalFilter('');
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Total count badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Menampilkan {users.length} dari {total} pengguna</span>
      </div>

      {/* Table / List */}
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
                            <img
                              src={avatarUrl}
                              alt={u.name || u.email}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
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
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'pemilik'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {u.phone || <span className="text-slate-400 italic">-</span>}
                      </td>

                      <td className="py-3 px-4">
                        {u.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <span>✓</span> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <span>⏳</span> Belum
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'pemilik' ? (
                          u.is_approved ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                              ✓ Disetujui
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">
                              ⏳ Menunggu Persetujuan
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">N/A (Bukan Pemilik)</span>
                        )}
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
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs ${
                              u.is_approved
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {actionLoadingId === u.id
                              ? 'Memproses...'
                              : u.is_approved
                              ? 'Batalkan Persetujuan'
                              : 'Setujui Pemilik'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// TAB 2: KOS TAB (F-16, F-17)
// ==============================================================================
function KosTab({ onStatsChange, onFeedback }) {
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

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
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
        if (active) {
          onFeedback('error', err.response?.data?.error || 'Gagal memuat daftar kos');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, search, approvalFilter, typeFilter, statusFilter, onFeedback, refreshKey]);

  const handleToggleApproval = async (kos) => {
    const nextApproved = !kos.is_approved;
    const confirmMsg = nextApproved
      ? `Setujui listing kos "${kos.name}"? Kos akan muncul dalam pencarian publik pencari kos.`
      : `Batalkan persetujuan / sembunyikan listing kos "${kos.name}" dari publik?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(kos.id);
    try {
      const res = await api.put(`/admin/kos/${kos.id}/approve`, {
        is_approved: nextApproved,
      });
      onFeedback('success', res.data?.message || 'Status persetujuan kos berhasil diperbarui');
      setRefreshKey((k) => k + 1);
      onStatsChange();
    } catch (err) {
      onFeedback('error', err.response?.data?.error || 'Gagal mengubah status persetujuan kos');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama kos, alamat, nama pemilik..."
            className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={approvalFilter}
            onChange={(e) => {
              setApprovalFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Persetujuan</option>
            <option value="false">Menunggu Persetujuan</option>
            <option value="true">Disetujui / Publik</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Tipe</option>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
            <option value="campur">Campur</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {(search || approvalFilter || typeFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setApprovalFilter('');
                setTypeFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Reset
            </button>
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
            <p className="text-2xl mb-1">🏠</p>
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
                            <img
                              src={photo}
                              alt={k.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 text-lg border border-slate-200">
                              🏠
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/kos/${k.id}`}
                              target="_blank"
                              className="font-bold text-slate-900 hover:text-emerald-600 transition"
                            >
                              {k.name}
                            </Link>
                            <p className="text-slate-500 text-[11px] truncate max-w-xs">{k.address}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{k.owner_name || 'Pemilik #' + k.owner_id}</p>
                        <p className="text-slate-500 text-[11px]">{k.owner_phone || '-'}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            k.type === 'putra'
                              ? 'bg-blue-100 text-blue-800'
                              : k.type === 'putri'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {k.type}
                        </span>
                        <p className="text-slate-500 text-[11px] mt-1">{k.district || 'Kota Jambi'}</p>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold">{k.available_rooms || 0}</span> / {k.total_rooms || 0} unit
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {k.min_price > 0 ? `${formatCurrency(k.min_price)}/bln` : '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            k.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {k.is_approved ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            ✓ Terverifikasi
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">
                            ⏳ Menunggu Verifikasi
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/kos/${k.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 hover:border-emerald-300 transition"
                            title="Lihat Pratinjau"
                          >
                            👁️
                          </Link>
                          <button
                            type="button"
                            disabled={actionLoadingId === k.id}
                            onClick={() => handleToggleApproval(k)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs ${
                              k.is_approved
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {actionLoadingId === k.id
                              ? 'Memproses...'
                              : k.is_approved
                              ? 'Tolak / Batalkan'
                              : 'Setujui Listing'}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// TAB 3: ROOMS TAB (F-17)
// ==============================================================================
function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [availFilter, setAvailFilter] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
        if (availFilter !== '') params.append('is_available', availFilter);

        const res = await api.get(`/admin/rooms?${params.toString()}`);
        if (active) {
          setRooms(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch {
        // room error suppressed
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, availFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Filter Status Kamar:</label>
          <select
            value={availFilter}
            onChange={(e) => {
              setAvailFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Kamar</option>
            <option value="true">Tersedia (Siap Huni)</option>
            <option value="false">Terisi / Penuh</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Total: {total} unit kamar terdaftar
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3" />
            Memuat daftar kamar...
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <p className="text-2xl mb-1">🛏️</p>
            <p className="font-semibold text-slate-700">Tidak ada kamar ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">No / Nama Kamar</th>
                  <th className="py-3 px-4">Properti Kos</th>
                  <th className="py-3 px-4">Harga Sewa</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.room_number || `Kamar #${r.id}`}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-800">
                      <Link to={`/kos/${r.kos_id}`} target="_blank" className="hover:underline">
                        {r.kos_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(r.price)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {r.pay_period}
                    </td>
                    <td className="py-3 px-4">
                      {r.is_available ? (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                          ✓ Tersedia
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-600">
                          Terisi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">
                      {r.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/kos/${r.kos_id}`}
                        target="_blank"
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        Lihat Kos
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// TAB 4: REVIEWS TAB (F-18)
// ==============================================================================
function ReviewsTab({ onStatsChange, onFeedback }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modFilter, setModFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '10',
        });
        if (search.trim()) params.append('search', search.trim());
        if (modFilter !== '') params.append('is_moderated', modFilter);

        const res = await api.get(`/admin/reviews?${params.toString()}`);
        if (active) {
          setReviews(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (active) {
          onFeedback('error', err.response?.data?.error || 'Gagal memuat daftar ulasan');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, search, modFilter, onFeedback, refreshKey]);

  const handleToggleModerate = async (review) => {
    const nextMod = !review.is_moderated;
    const confirmMsg = nextMod
      ? `Tandai ulasan dari "${review.user_name}" sebagai konten yang dimoderasi (disembunyikan dari publik)?`
      : `Buka moderasi ulasan ini agar tampil kembali secara publik?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(review.id);
    try {
      const res = await api.put(`/admin/reviews/${review.id}/moderate`, {
        is_moderated: nextMod,
      });
      onFeedback('success', res.data?.message || 'Status moderasi ulasan berhasil diperbarui');
      setRefreshKey((k) => k + 1);
      onStatsChange();
    } catch (err) {
      onFeedback('error', err.response?.data?.error || 'Gagal memperbarui moderasi ulasan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm(`Hapus permanen ulasan dari "${review.user_name}" untuk kos "${review.kos_name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setActionLoadingId(review.id);
    try {
      const res = await api.delete(`/admin/reviews/${review.id}`);
      onFeedback('success', res.data?.message || 'Ulasan berhasil dihapus');
      setRefreshKey((k) => k + 1);
      onStatsChange();
    } catch (err) {
      onFeedback('error', err.response?.data?.error || 'Gagal menghapus ulasan');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari teks ulasan, nama penyewa, atau nama kos..."
            className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={modFilter}
            onChange={(e) => {
              setModFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status Moderasi</option>
            <option value="false">Normal (Tampil Publik)</option>
            <option value="true">Dimoderasi (Disembunyikan)</option>
          </select>

          {(search || modFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setModFilter('');
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Reset
            </button>
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
                      <Link to={`/kos/${rv.kos_id}`} target="_blank" className="hover:underline">
                        {rv.kos_name}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-amber-600">
                        {'★'.repeat(rv.rating)}
                        <span className="text-slate-300">{'★'.repeat(5 - rv.rating)}</span>
                      </span>
                      <span className="ml-1 text-slate-600 font-semibold">{rv.rating}/5</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      <p className="line-clamp-2">{rv.content || <span className="italic text-slate-400">Tanpa ulasan teks</span>}</p>
                    </td>

                    <td className="py-3 px-4">
                      {rv.is_moderated ? (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-800">
                          🚫 Dimoderasi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                          ✓ Normal
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {rv.created_at ? new Date(rv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionLoadingId === rv.id}
                          onClick={() => handleToggleModerate(rv)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            rv.is_moderated
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-300 text-amber-800 hover:bg-amber-50'
                          }`}
                        >
                          {rv.is_moderated ? 'Buka Moderasi' : 'Tandai Melanggar'}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === rv.id}
                          onClick={() => handleDeleteReview(rv)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
