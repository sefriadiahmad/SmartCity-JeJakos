import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiChevronRight, FiClipboard, FiGrid, FiHome, FiLayers, FiLogOut, FiMenu, FiMessageCircle, FiPieChart, FiSearch, FiSettings, FiUsers, FiX } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { connectSocket, socket } from '../../services/socket';

const baseLink = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors';

function UserAvatar({ avatar, user, size = 'h-10 w-10' }) {
  return <span className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700`}>
    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (user?.name || user?.email || 'U')[0].toUpperCase()}
  </span>;
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const serverBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5001';
  const avatar = user?.photo_url ? (user.photo_url.startsWith('http') ? user.photo_url : `${serverBase}${user.photo_url}`) : null;
  const home = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'pemilik' ? '/dashboard/ringkasan' : '/bookings';

  const mainLinks = user?.role === 'admin'
    ? [{ to: '/admin/dashboard', label: 'Ringkasan', Icon: FiGrid }, { to: '/admin/users', label: 'Pengguna', Icon: FiUsers }, { to: '/admin/kos', label: 'Data Kos', Icon: FiHome }, { to: '/admin/rooms', label: 'Daftar Kamar', Icon: FiLayers }, { to: '/admin/reviews', label: 'Ulasan', Icon: FiBookOpen }]
    : user?.role === 'pemilik'
      ? [{ to: '/dashboard/ringkasan', label: 'Ringkasan', Icon: FiPieChart }, { to: '/dashboard', label: 'Kelola Kos', Icon: FiGrid }, { to: '/dashboard?tab=bookings', label: 'Pesanan Masuk', Icon: FiClipboard }, { to: '/dashboard?tab=invoices', label: 'Tagihan', Icon: FiBookOpen }]
      : [{ to: '/dashboard/search', label: 'Cari Kos', Icon: FiSearch }, { to: '/bookings', label: 'Pemesanan Saya', Icon: FiClipboard }, { to: '/invoices', label: 'Tagihan Saya', Icon: FiBookOpen }];
  const accountLinks = [{ to: '/conversations', label: 'Pesan', Icon: FiMessageCircle }, { to: '/profile', label: 'Profil Saya', Icon: FiSettings }];
  const titleByPath = { '/bookings': 'Pemesanan Saya', '/dashboard/search': 'Cari Kos', '/invoices': 'Tagihan Saya', '/conversations': 'Pesan', '/profile': 'Profil Saya', '/dashboard': 'Kelola Kos', '/dashboard/ringkasan': 'Ringkasan', '/admin/dashboard': 'Ringkasan', '/admin/users': 'Kelola Pengguna', '/admin/kos': 'Data Kos', '/admin/rooms': 'Daftar Kamar', '/admin/reviews': 'Moderasi Ulasan' };
  const pemilikTabTitles = { bookings: 'Pesanan Masuk', invoices: 'Tagihan Penghuni' };
  const tabParam = new URLSearchParams(location.search).get('tab');
  const title = (location.pathname === '/dashboard' && pemilikTabTitles[tabParam]) || titleByPath[location.pathname] || (location.pathname.startsWith('/admin') ? 'Panel Admin' : 'Dashboard');

  useEffect(() => {
    let timer;
    const loadUnread = async () => { try { const res = await api.get('/conversations/unread-count'); setUnread(res.data?.unread_count || 0); } catch { setUnread(0); } };
    const onMessage = (payload) => {
      const message = payload?.message || payload;
      if (!message || message.sender_id === user?.id) return;
      setUnread((value) => value + 1);
      setToast({ id: payload?.conversationId || message.conversation_id, name: message.sender?.name || 'Pesan baru', content: message.content });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 5000);
    };
    connectSocket();
    loadUnread();
    socket.on('newMessage', onMessage);
    return () => { clearTimeout(timer); socket.off('newMessage', onMessage); };
  }, [user?.id]);

  const logoutUser = async () => { setMobileOpen(false); await logout(); navigate('/'); };
  const menuLink = ({ to, label, Icon }, mobile = false) => {
    // Custom active detection: match pathname + search params for query-param routes
    const [linkPath, linkSearch] = to.split('?');
    const currentSearch = location.search;
    const isActive = location.pathname === linkPath && (linkSearch ? currentSearch === `?${linkSearch}` : !currentSearch || currentSearch === '?');
    return <Link key={`${to}-${label}`} to={to} onClick={() => setMobileOpen(false)} className={`${baseLink} ${mobile ? 'text-slate-700 hover:bg-slate-100' : isActive ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon className="h-4 w-4" /><span>{label}</span>{to === '/conversations' && unread > 0 && <span className="ml-auto min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] leading-5 text-white">{unread > 99 ? '99+' : unread}</span>}</Link>;
  };
  const profile = <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3"><UserAvatar avatar={avatar} user={user} /><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{user?.name || user?.email}</strong><span className="block pt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">{user?.role}</span></span></Link>;

  return <div className="min-h-screen bg-[#f5f7f6] md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[17rem] flex-col border-r border-slate-200 bg-white p-4 md:flex">
      <Link to={home} className="flex items-center gap-3 rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg font-black">J</span><span><strong className="block text-lg leading-tight">JeJakos</strong><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Jambi</span></span></Link>
      <div className="mt-7"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p><nav className="space-y-1">{mainLinks.map((item) => menuLink(item))}</nav></div>
      <div className="mt-6 border-t border-slate-100 pt-6"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Akun</p><nav className="space-y-1">{accountLinks.map((item) => menuLink(item))}</nav></div>
      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-3.5">{profile}<button type="button" onClick={logoutUser} className="mt-3 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-rose-700">Keluar <FiLogOut className="h-3.5 w-3.5" /></button></div>
    </aside>
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden"><Link to={home} className="font-extrabold text-emerald-700">JeJakos</Link><button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Buka menu dashboard" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100">{mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}</button></header>
    {mobileOpen && <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-white p-4 shadow-xl md:hidden"><div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">{profile}</div><nav className="space-y-1">{[...mainLinks, ...accountLinks].map((item) => menuLink(item, true))}</nav><button type="button" onClick={logoutUser} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><FiLogOut className="h-4 w-4" />Keluar</button></div>}
    <section className="min-w-0 md:col-start-2"><header className="hidden h-20 items-center justify-between border-b border-slate-200 bg-white px-7 lg:px-10 md:flex"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">JeJakos / Workspace</p><h1 className="mt-1 text-xl font-extrabold text-slate-900">{title}</h1></div><div className="flex items-center gap-3"><Link to="/dashboard/search" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"><FiSearch className="h-4 w-4" />Cari Kos</Link><Link to="/profile" className="flex items-center gap-2 border-l border-slate-200 pl-4"><span className="text-right"><strong className="block max-w-36 truncate text-xs text-slate-900">{user?.name || user?.email}</strong><span className="text-[10px] font-semibold uppercase text-slate-500">{user?.role}</span></span><UserAvatar avatar={avatar} user={user} /></Link></div></header><main className="min-h-[calc(100vh-5rem)]"><Outlet /></main></section>
    {toast && <Link to={`/conversations?id=${toast.id}`} onClick={() => { setToast(null); setUnread((value) => Math.max(0, value - 1)); }} className="fixed right-4 top-20 z-60 flex w-[calc(100%-2rem)] gap-3 rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-xl sm:w-90 md:top-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><FiMessageCircle /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-900">Pesan baru dari {toast.name}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{toast.content}</span></span><FiChevronRight className="mt-2 h-4 w-4 text-emerald-600" /></Link>}
  </div>;
}
