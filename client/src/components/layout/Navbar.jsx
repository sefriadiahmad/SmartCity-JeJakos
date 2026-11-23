import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';

const navItems = [
  { label: 'Beranda', to: '/' },
  { label: 'Cari Kos', to: '/kos' },
];

const linkBase = 'rounded-[14px] px-3 py-2.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9784a]';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (to) => {
    const [pathname, search] = to.split('?');
    return location.pathname === pathname && (!search || location.search === `?${search}`);
  };
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#dce7e1] bg-[#fffcf7]/95 shadow-[0_8px_24px_-20px_rgba(24,53,47,0.5)] backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" onClick={closeMobile} className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9784a]">
          <img src="/logo_jejakos.png" alt="JeJakos" className="h-12 w-12 rounded-xl object-contain" />
          <span><strong className="block text-lg leading-tight text-[#18352f]">JeJakos</strong><span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1f6b58]">Jambi</span></span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 text-sm font-semibold sm:flex">
          {navItems.map(({ label, to }) => (
            <Link key={to} to={to} className={`${linkBase} ${isActive(to) ? 'bg-[#e6eee9] text-[#18352f]' : 'text-[#60736d] hover:bg-[#e6eee9] hover:text-[#18352f]'}`}>
              {label}
            </Link>
          ))}
          <span className="mx-2 h-6 w-px bg-[#dce7e1]" aria-hidden="true" />
          {isAuthenticated ? (
            <Link to="/bookings" className="rounded-[14px] bg-[#1f6b58] px-4 py-2.5 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#18352f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9784a]">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className={`${linkBase} text-[#60736d] hover:bg-[#e6eee9] hover:text-[#18352f]`}>Masuk</Link>
              <Link to="/register" className="rounded-[14px] bg-[#c9784a] px-4 py-2.5 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#a95f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9784a]">Daftar</Link>
            </>
          )}
        </nav>

        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-[#31564c] transition-colors duration-200 hover:bg-[#e6eee9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9784a] sm:hidden">
          {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
        </button>
      </div>

      <nav id="mobile-navigation" aria-label="Navigasi mobile" aria-hidden={!mobileOpen} inert={!mobileOpen} className={`overflow-hidden border-t border-[#dce7e1] bg-[#fffcf7] px-4 shadow-lg transition-[max-height,opacity] duration-200 ease-out sm:hidden ${mobileOpen ? 'max-h-[28rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
        <div className="mx-auto grid max-w-7xl gap-1 py-3 text-sm font-semibold">
          <div className="grid gap-1" aria-label="Navigasi halaman">
            {navItems.map(({ label, to }) => (
              <Link key={to} to={to} onClick={closeMobile} tabIndex={mobileOpen ? 0 : -1} className={`${linkBase} min-h-11 text-[#60736d] hover:bg-[#e6eee9] hover:text-[#18352f] ${isActive(to) ? 'bg-[#e6eee9] text-[#18352f]' : ''}`}>{label}</Link>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#dce7e1] pt-3" aria-label="Akun">
            {isAuthenticated ? (
              <Link to="/bookings" onClick={closeMobile} tabIndex={mobileOpen ? 0 : -1} className="col-span-2 min-h-11 rounded-[14px] bg-[#1f6b58] px-3 py-2.5 text-center text-white hover:bg-[#18352f]">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile} tabIndex={mobileOpen ? 0 : -1} className="min-h-11 rounded-[14px] border border-[#dce7e1] px-3 py-2.5 text-center text-[#60736d] hover:border-[#1f6b58] hover:text-[#18352f]">Masuk</Link>
                <Link to="/register" onClick={closeMobile} tabIndex={mobileOpen ? 0 : -1} className="min-h-11 rounded-[14px] bg-[#c9784a] px-3 py-2.5 text-center text-white hover:bg-[#a95f39]">Daftar</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
