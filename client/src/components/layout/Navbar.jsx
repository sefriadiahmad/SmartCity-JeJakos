import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-emerald-700">JeJakos</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Jambi</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
          <Link to="/" className="hidden px-3 py-2 text-slate-600 hover:text-emerald-700 sm:block">Beranda</Link>
          <Link to="/kos" className="hidden px-3 py-2 text-slate-600 hover:text-emerald-700 sm:block">Cari Kos</Link>
          {isAuthenticated ? (
            <Link to="/bookings" className="rounded-xl bg-emerald-700 px-3.5 py-2 text-white shadow-sm hover:bg-emerald-800">Masuk Ke Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-slate-700 hover:text-emerald-700">Masuk</Link>
              <Link to="/register" className="rounded-xl bg-emerald-700 px-3.5 py-2 text-white shadow-sm hover:bg-emerald-800">Daftar</Link>
            </>
          )}
        </nav>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 sm:hidden"
        >
          {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
        </button>
      </div>
      {mobileOpen && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg sm:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 text-sm font-semibold">
            <Link to="/" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-50">Beranda</Link>
            <Link to="/kos" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-50">Cari Kos</Link>
            {isAuthenticated ? (
              <Link to="/bookings" onClick={() => setMobileOpen(false)} className="mt-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-center text-white hover:bg-emerald-800">Masuk Ke Dashboard</Link>
            ) : (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-center text-slate-700">Masuk</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="rounded-xl bg-emerald-700 px-3 py-2.5 text-center text-white hover:bg-emerald-800">Daftar</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
