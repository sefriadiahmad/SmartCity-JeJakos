import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiClock, FiHome, FiSearch } from 'react-icons/fi';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

const STATUS = {
  pending: ['Menunggu', '#f59e0b'], accepted: ['Diterima', '#3b82f6'], active: ['Aktif', '#059669'],
  completed: ['Selesai', '#64748b'], rejected: ['Ditolak', '#ef4444'], cancelled: ['Dibatalkan', '#94a3b8'],
};
const INVOICE = { unpaid: ['Belum Bayar', '#f59e0b'], paid: ['Lunas', '#059669'], overdue: ['Tertunggak', '#ef4444'] };

function monthLabel(value) {
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString('id-ID', { month: 'short' });
}

export default function PencariRingkasan() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/bookings', { params: { limit: 50 } }),
      api.get('/invoices', { params: { limit: 50 } }),
    ]).then(([bookingRes, invoiceRes]) => {
      if (!active) return;
      setBookings(bookingRes.data?.bookings || bookingRes.data?.data || []);
      setInvoices(invoiceRes.data?.invoices || invoiceRes.data?.data || []);
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    total: bookings.length,
    active: bookings.filter((b) => b.status === 'active').length,
    waiting: bookings.filter((b) => b.status === 'pending' || b.status === 'accepted').length,
    unpaid: invoices.filter((i) => i.status === 'unpaid' || i.status === 'overdue').length,
  }), [bookings, invoices]);

  const statusData = useMemo(() => Object.keys(STATUS).map((status) => ({
    name: STATUS[status][0], value: bookings.filter((b) => b.status === status).length, fill: STATUS[status][1],
  })).filter((item) => item.value), [bookings]);
  const invoiceData = useMemo(() => Object.keys(INVOICE).map((status) => ({
    name: INVOICE[status][0], value: invoices.filter((i) => i.status === status).length, fill: INVOICE[status][1],
  })).filter((item) => item.value), [invoices]);
  const trendData = useMemo(() => {
    const months = [...Array(6)].map((_, index) => { const date = new Date(); date.setMonth(date.getMonth() - 5 + index); return date.toISOString().slice(0, 7); });
    return months.map((month) => ({ month: monthLabel(month), pesanan: bookings.filter((b) => b.created_at?.slice(0, 7) === month).length }));
  }, [bookings]);
  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const latest = bookings.slice(0, 5);

  if (loading) return <div className="flex-1 bg-slate-50 py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" /></div>;

  return <div className="flex-1 bg-slate-50 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
    <div><h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Selamat Datang, {user?.name || 'Pencari Kos'}</h1><p className="text-sm text-slate-600 mt-1">Pantau perjalanan pencarian kos, pemesanan, dan tagihan Anda di satu tempat.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[['Total Pemesanan', stats.total, 'Seluruh riwayat', 'text-slate-900'], ['Menunggu / Diterima', stats.waiting, 'Perlu dipantau', 'text-amber-700'], ['Kos Aktif', stats.active, 'Sedang dihuni', 'text-emerald-700'], ['Tagihan Berjalan', stats.unpaid, formatCurrency(outstanding), outstanding ? 'text-red-700' : 'text-slate-900']].map(([label, value, note, color]) => <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p><p className={`text-xl font-bold mt-1 ${color}`}>{value}</p><p className="text-[10px] text-slate-400 mt-0.5">{note}</p></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs"><h3 className="text-sm font-bold text-slate-900 mb-4">Aktivitas Pemesanan (6 Bulan)</h3><ResponsiveContainer width="100%" height={240}><AreaChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} /><Area type="monotone" dataKey="pesanan" name="Pesanan" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs"><h3 className="text-sm font-bold text-slate-900 mb-4">Status Pemesanan</h3>{statusData.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={statusData} dataKey="value" outerRadius={75} label={({ name, value }) => `${name} (${value})`} labelLine={false}>{statusData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="text-xs text-slate-400 py-12 text-center">Belum ada pemesanan</p>}</div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs"><h3 className="text-sm font-bold text-slate-900 mb-4">Status Tagihan</h3>{invoiceData.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={invoiceData} dataKey="value" outerRadius={75} label={({ name, value }) => `${name} (${value})`} labelLine={false}>{invoiceData.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="text-xs text-slate-400 py-12 text-center">Belum ada tagihan</p>}</div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex justify-between"><h3 className="text-sm font-bold text-slate-900">Pemesanan Terbaru</h3><Link to="/bookings" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat Semua →</Link></div><div className="divide-y divide-slate-100">{latest.map((booking) => <Link to="/bookings" key={booking.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"><div><p className="text-xs font-semibold text-slate-900">{booking.kos?.name || booking.kos_name || 'Kos'}</p><p className="text-[10px] text-slate-500">{booking.room?.room_number ? `Kamar ${booking.room.room_number}` : 'Detail pemesanan'}</p></div><span className="text-[10px] font-bold" style={{ color: STATUS[booking.status]?.[1] || '#64748b' }}>{STATUS[booking.status]?.[0] || booking.status}</span></Link>)}{!latest.length && <p className="py-10 text-center text-xs text-slate-400">Belum ada pemesanan</p>}</div></div>
    </div>
    <div className="flex flex-wrap gap-3"><Link to="/kos" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"><FiSearch /> Cari Kos</Link><Link to="/invoices" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><FiHome /> Lihat Tagihan</Link></div>
  </div></div>;
}
