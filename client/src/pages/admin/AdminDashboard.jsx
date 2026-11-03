import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const COLORS = ['#059669', '#0284c7', '#d946ef', '#f59e0b', '#ef4444'];
const TYPE_COLORS = { putra: '#2563eb', putri: '#ec4899', campur: '#8b5cf6' };

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/admin/dashboard')
      .then((res) => { if (active) setData(res.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 bg-slate-50 py-20 text-center text-sm text-slate-500">
        Gagal memuat data ringkasan.
      </div>
    );
  }

  const statCards = [
    { label: 'Total Pengguna', value: data.totalUsers, sub: 'Pemilik, pencari, admin', to: '/admin/users', warn: false },
    { label: 'Pemilik Baru', value: data.pendingOwners, sub: data.pendingOwners > 0 ? 'Perlu verifikasi' : 'Semua terverifikasi', to: '/admin/users', warn: data.pendingOwners > 0 },
    { label: 'Total Kos', value: data.totalKos, sub: 'Semua properti kos', to: '/admin/kos', warn: false },
    { label: 'Kos Baru', value: data.pendingKos, sub: data.pendingKos > 0 ? 'Perlu verifikasi' : 'Semua disetujui', to: '/admin/kos', warn: data.pendingKos > 0 },
    { label: 'Total Kamar', value: data.totalRooms, sub: `${data.availableRooms || 0} tersedia`, to: '/admin/rooms', warn: false },
    { label: 'Ulasan', value: data.totalReviews, sub: 'Moderasi konten', to: '/admin/reviews', warn: false },
  ];

  // Build trend data — merge monthlyUsers + monthlyKos
  const monthSet = new Set();
  (data.monthlyUsers || []).forEach((r) => monthSet.add(r.month));
  (data.monthlyKos || []).forEach((r) => monthSet.add(r.month));
  const trendData = [...monthSet].sort().map((m) => ({
    month: formatMonth(m),
    pengguna: (data.monthlyUsers || []).find((r) => r.month === m)?.count || 0,
    kos: (data.monthlyKos || []).find((r) => r.month === m)?.count || 0,
  }));

  const kosByType = (data.kosByType || []).map((r) => ({ name: r.type, value: Number(r.count) }));
  const usersByRole = (data.usersByRole || []).map((r) => ({ name: r.role, value: Number(r.count) }));
  const kosByDistrict = (data.kosByDistrict || []).map((r) => ({ name: r.district, value: Number(r.count) }));
  const ratingDist = (data.ratingDist || []).map((r) => ({ name: `${r.rating}★`, value: Number(r.count) }));

  const roomsPie = [
    { name: 'Tersedia', value: data.availableRooms || 0 },
    { name: 'Terisi', value: data.occupiedRooms || 0 },
  ];

  const roleLabels = { admin: 'Admin', pemilik: 'Pemilik', pencari: 'Pencari' };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Panel Admin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Selamat Datang Kembali, {user?.name || 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Berikut ringkasan platform JeJakos Jambi saat ini. Kelola pengguna, kos, kamar, dan ulasan melalui menu sidebar.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className={`p-4 rounded-2xl border transition hover:shadow-md shadow-xs ${c.warn ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${c.warn ? 'text-amber-800' : 'text-slate-500'}`}>{c.label}</p>
              <p className={`text-xl font-bold mt-1 ${c.warn ? 'text-amber-700' : 'text-slate-900'}`}>{c.value}</p>
              <p className={`text-[10px] mt-0.5 ${c.warn ? 'text-amber-600' : 'text-slate-400'}`}>{c.sub}</p>
            </Link>
          ))}
        </div>

        {/* Charts Row 1: Trend + Kos by Type */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Tren Pendaftaran (6 Bulan Terakhir)</h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="pengguna" name="Pengguna Baru" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="kos" name="Kos Baru" stroke="#0284c7" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada data tren</p>
            )}
          </div>

          {/* Kos by Type Pie */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Kos berdasarkan Tipe</h3>
            {kosByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={kosByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {kosByType.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Charts Row 2: Users by Role + Rooms + Rating Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Users by Role */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Pengguna berdasarkan Role</h3>
            {usersByRole.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={usersByRole} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${roleLabels[name] || name} (${value})`} labelLine={false}>
                    {usersByRole.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada data</p>
            )}
          </div>

          {/* Room Availability */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Ketersediaan Kamar</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roomsPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  <Cell fill="#059669" />
                  <Cell fill="#cbd5e1" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Distribusi Rating Ulasan</h3>
            {ratingDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="value" name="Jumlah" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada ulasan</p>
            )}
          </div>
        </div>

        {/* Kos by District Bar Chart */}
        {kosByDistrict.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Kos berdasarkan Kecamatan (Top 10)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={kosByDistrict} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Bar dataKey="value" name="Jumlah Kos" fill="#059669" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Preview Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Users */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Pengguna Terbaru</h3>
              <Link to="/admin/users" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-left">Nama</th>
                    <th className="py-2.5 px-4 text-left">Role</th>
                    <th className="py-2.5 px-4 text-left">Status</th>
                    <th className="py-2.5 px-4 text-left">Terdaftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.latestUsers || []).map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-slate-900">{u.name || 'Tanpa Nama'}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'pemilik' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        {u.role === 'pemilik' ? (
                          u.is_approved
                            ? <span className="text-emerald-700 font-medium text-[10px]">✓ Disetujui</span>
                            : <span className="text-amber-700 font-medium text-[10px]">⏳ Pending</span>
                        ) : <span className="text-slate-400 text-[10px]">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latest Kos */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Kos Terbaru</h3>
              <Link to="/admin/kos" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-left">Nama Kos</th>
                    <th className="py-2.5 px-4 text-left">Tipe</th>
                    <th className="py-2.5 px-4 text-left">Kecamatan</th>
                    <th className="py-2.5 px-4 text-left">Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.latestKos || []).map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <Link to={`/kos/${k.id}`} target="_blank" className="font-semibold text-slate-900 hover:text-emerald-600">{k.name}</Link>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${k.type === 'putra' ? 'bg-blue-100 text-blue-800' : k.type === 'putri' ? 'bg-pink-100 text-pink-800' : 'bg-purple-100 text-purple-800'}`}>{k.type}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{k.district || '-'}</td>
                      <td className="py-2.5 px-4">
                        {k.is_approved
                          ? <span className="text-emerald-700 font-medium text-[10px]">✓ Terverifikasi</span>
                          : <span className="text-amber-700 font-medium text-[10px]">⏳ Menunggu</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Latest Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Ulasan Terbaru</h3>
            <Link to="/admin/reviews" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/75 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4 text-left">Penyewa</th>
                  <th className="py-2.5 px-4 text-left">Kos</th>
                  <th className="py-2.5 px-4 text-left">Rating</th>
                  <th className="py-2.5 px-4 text-left">Ulasan</th>
                  <th className="py-2.5 px-4 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.latestReviews || []).map((rv) => (
                  <tr key={rv.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{rv.user_name}</td>
                    <td className="py-2.5 px-4 text-emerald-800 font-medium">{rv.kos_name}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-amber-600">{'★'.repeat(rv.rating)}<span className="text-slate-300">{'★'.repeat(5 - rv.rating)}</span></span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">{rv.content || <span className="italic text-slate-400">—</span>}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                      {rv.created_at ? new Date(rv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
