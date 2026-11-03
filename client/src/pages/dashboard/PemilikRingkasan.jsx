import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

const STATUS_COLORS = {
  pending: '#f59e0b', accepted: '#3b82f6', active: '#059669',
  completed: '#64748b', rejected: '#ef4444', cancelled: '#94a3b8',
};
const INVOICE_COLORS = { unpaid: '#f59e0b', paid: '#059669', overdue: '#ef4444' };
const INVOICE_LABELS = { unpaid: 'Belum Bayar', paid: 'Lunas', overdue: 'Tertunggak' };
const BOOKING_LABELS = {
  pending: 'Pending', accepted: 'Diterima', active: 'Aktif',
  completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};

function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

export default function PemilikRingkasan() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/kos/owner-dashboard')
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

  // Derived stats
  const pendingBookings = (data.bookingsByStatus || []).find((b) => b.status === 'pending')?.count || 0;
  const activeBookings = (data.bookingsByStatus || []).find((b) => b.status === 'active')?.count || 0;
  const totalBookings = (data.bookingsByStatus || []).reduce((s, b) => s + Number(b.count), 0);

  const overdueInvoices = (data.invoicesByStatus || []).find((i) => i.status === 'overdue');
  const unpaidInvoices = (data.invoicesByStatus || []).find((i) => i.status === 'unpaid');
  const overdueAmount = Number(overdueInvoices?.total_amount || 0);
  const unpaidAmount = Number(unpaidInvoices?.total_amount || 0);

  const occupancyRate = data.totalRooms > 0
    ? Math.round((data.occupiedRooms / data.totalRooms) * 100)
    : 0;

  // Chart data
  const bookingsByStatus = (data.bookingsByStatus || []).map((b) => ({
    name: BOOKING_LABELS[b.status] || b.status,
    value: Number(b.count),
    fill: STATUS_COLORS[b.status] || '#94a3b8',
  }));

  const invoicesByStatus = (data.invoicesByStatus || []).map((i) => ({
    name: INVOICE_LABELS[i.status] || i.status,
    value: Number(i.count),
    fill: INVOICE_COLORS[i.status] || '#94a3b8',
  }));

  const monthlyRevenue = (data.monthlyRevenue || []).map((r) => ({
    month: formatMonth(r.month),
    pendapatan: Number(r.revenue),
  }));

  // Merge monthly bookings trend
  const monthSet = new Set();
  (data.monthlyBookings || []).forEach((r) => monthSet.add(r.month));
  (data.monthlyRevenue || []).forEach((r) => monthSet.add(r.month));
  const trendData = [...monthSet].sort().map((m) => ({
    month: formatMonth(m),
    pesanan: (data.monthlyBookings || []).find((r) => r.month === m)?.count || 0,
    pendapatan: Number((data.monthlyRevenue || []).find((r) => r.month === m)?.revenue || 0),
  }));

  const roomsPie = [
    { name: 'Tersedia', value: data.availableRooms || 0 },
    { name: 'Terisi', value: data.occupiedRooms || 0 },
  ];

  const kosOccupancy = (data.kosOccupancy || []).map((k) => ({
    name: k.name.length > 18 ? k.name.slice(0, 18) + '...' : k.name,
    terisi: Number(k.total_rooms) - Number(k.available_rooms),
    tersedia: Number(k.available_rooms),
  }));

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Selamat Datang Kembali, {user?.name || 'Pemilik'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Berikut ringkasan usaha kos Anda di Provinsi Jambi saat ini.
          </p>
        </div>

        {/* Unapproved Banner */}
        {user?.role === 'pemilik' && !user?.is_approved && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
            <span className="text-xl">⚠️</span>
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sm">Akun Dalam Verifikasi Admin</p>
              <p className="mt-0.5">Akun pemilik Anda sedang ditinjau. Listing kos akan dipublikasikan setelah verifikasi admin.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/dashboard" className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Kos</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{data.totalKos}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Properti terdaftar</p>
          </Link>

          <Link to="/dashboard" className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Kamar</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{data.totalRooms}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Okupansi {occupancyRate}%</p>
          </Link>

          <Link to="/dashboard?tab=bookings" className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition ${pendingBookings > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${pendingBookings > 0 ? 'text-amber-800' : 'text-slate-500'}`}>Pesanan Pending</p>
            <p className={`text-xl font-bold mt-1 ${pendingBookings > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pendingBookings}</p>
            <p className={`text-[10px] mt-0.5 ${pendingBookings > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{pendingBookings > 0 ? 'Perlu ditanggapi' : 'Tidak ada pending'}</p>
          </Link>

          <Link to="/dashboard?tab=bookings" className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Penyewa Aktif</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{activeBookings}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sedang menghuni</p>
          </Link>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 shadow-xs">
            <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Sudah dibayar</p>
          </div>

          <Link to="/dashboard?tab=invoices" className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition ${overdueAmount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${overdueAmount > 0 ? 'text-red-800' : 'text-slate-500'}`}>Tertunggak</p>
            <p className={`text-xl font-bold mt-1 ${overdueAmount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrency(overdueAmount)}</p>
            <p className={`text-[10px] mt-0.5 ${overdueAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{overdueAmount > 0 ? 'Perlu follow-up' : 'Tidak ada tunggakan'}</p>
          </Link>
        </div>

        {/* Charts Row 1: Revenue Trend + Occupancy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Tren Pendapatan (6 Bulan Terakhir)</h3>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada data pendapatan</p>
            )}
          </div>

          {/* Room Occupancy Pie */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Ketersediaan Kamar</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={roomsPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  <Cell fill="#059669" />
                  <Cell fill="#cbd5e1" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-slate-500 mt-1">Tingkat okupansi: <strong className="text-slate-900">{occupancyRate}%</strong></p>
          </div>
        </div>

        {/* Charts Row 2: Bookings Trend + Booking Status + Invoice Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bookings Trend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Tren Pesanan (6 Bulan)</h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Line type="monotone" dataKey="pesanan" name="Pesanan" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada data</p>
            )}
          </div>

          {/* Booking Status Pie */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Status Pesanan</h3>
            {bookingsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bookingsByStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {bookingsByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada pesanan</p>
            )}
            <p className="text-center text-xs text-slate-500 mt-1">Total: <strong>{totalBookings}</strong> pesanan</p>
          </div>

          {/* Invoice Status Pie */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Status Tagihan</h3>
            {invoicesByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={invoicesByStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {invoicesByStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">Belum ada tagihan</p>
            )}
            {(unpaidAmount > 0 || overdueAmount > 0) && (
              <div className="text-center text-[10px] text-slate-500 mt-1 space-x-3">
                {unpaidAmount > 0 && <span>Belum bayar: <strong className="text-amber-700">{formatCurrency(unpaidAmount)}</strong></span>}
                {overdueAmount > 0 && <span>Tertunggak: <strong className="text-red-700">{formatCurrency(overdueAmount)}</strong></span>}
              </div>
            )}
          </div>
        </div>

        {/* Occupancy per Kos Bar Chart */}
        {kosOccupancy.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Okupansi per Properti Kos</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, kosOccupancy.length * 40)}>
              <BarChart data={kosOccupancy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="terisi" name="Terisi" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tersedia" name="Tersedia" stackId="a" fill="#cbd5e1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Preview Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Bookings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Pesanan Terbaru</h3>
              <Link to="/dashboard?tab=bookings" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-left">Penyewa</th>
                    <th className="py-2.5 px-4 text-left">Kos / Kamar</th>
                    <th className="py-2.5 px-4 text-left">Status</th>
                    <th className="py-2.5 px-4 text-left">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.latestBookings || []).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{b.tenant_name || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span>{b.kos_name}</span>
                        {b.room_number && <span className="text-slate-400 ml-1">#{b.room_number}</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px]" style={{ backgroundColor: `${STATUS_COLORS[b.status]}20`, color: STATUS_COLORS[b.status] }}>
                          {BOOKING_LABELS[b.status] || b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))}
                  {(!data.latestBookings || data.latestBookings.length === 0) && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs">Belum ada pesanan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latest Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tagihan Terbaru</h3>
              <Link to="/dashboard?tab=invoices" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-600 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-left">Penyewa</th>
                    <th className="py-2.5 px-4 text-left">Jumlah</th>
                    <th className="py-2.5 px-4 text-left">Status</th>
                    <th className="py-2.5 px-4 text-left">Jatuh Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.latestInvoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-slate-900">{inv.tenant_name || '-'}</p>
                        <p className="text-[10px] text-slate-400">{inv.kos_name}{inv.room_number ? ` #${inv.room_number}` : ''}</p>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{formatCurrency(inv.amount)}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px]" style={{ backgroundColor: `${INVOICE_COLORS[inv.status]}20`, color: INVOICE_COLORS[inv.status] }}>
                          {INVOICE_LABELS[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))}
                  {(!data.latestInvoices || data.latestInvoices.length === 0) && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs">Belum ada tagihan</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
