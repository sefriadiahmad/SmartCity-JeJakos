import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const serverBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

  const avatarSrc = user?.photo_url
    ? user.photo_url.startsWith('http')
      ? user.photo_url
      : `${serverBase}${user.photo_url}`
    : null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              JeJakos
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              Jambi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <Link to="/" className="hover:text-emerald-600 transition">
              Beranda
            </Link>
            <Link to="/kos" className="hover:text-emerald-600 transition">
              Cari Kos
            </Link>
            {isAuthenticated && user?.role === 'pemilik' && (
              <Link to="/dashboard" className="hover:text-emerald-600 transition">
                Kelola Kos
              </Link>
            )}
            {isAuthenticated && user?.role === 'pencari' && (
              <Link to="/dashboard" className="hover:text-emerald-600 transition">
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="hover:text-emerald-600 transition">
                Panel Admin
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/conversations" className="hover:text-emerald-600 transition flex items-center gap-1">
                <span>Pesan</span>
              </Link>
            )}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 py-1 px-2.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user?.name || user?.email}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center border border-emerald-500">
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-left text-xs leading-tight">
                    <p className="font-semibold text-slate-900 truncate max-w-[120px]">
                      {user?.name || user?.email}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {user?.role}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                  aria-label="Logout"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium px-4 py-2 text-slate-700 hover:text-emerald-600 transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-2">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Beranda
            </Link>
            <Link
              to="/kos"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Cari Kos
            </Link>

            {isAuthenticated && user?.role === 'pemilik' && (
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Kelola Kos
              </Link>
            )}
            {isAuthenticated && user?.role === 'pencari' && (
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Panel Admin
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/conversations"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <span>💬</span>
                <span>Pesan</span>
              </Link>
            )}

            {/* Mobile Auth Status */}
            {isAuthenticated ? (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user?.name || user?.email}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold flex items-center justify-center border border-emerald-500">
                      {(user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-900">{user?.name || user?.email}</p>
                    <p className="text-slate-500">{user?.email}</p>
                    <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 rounded">
                      {user?.role}
                    </span>
                  </div>
                </Link>

                <div className="flex flex-col gap-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-medium text-sm"
                  >
                    Profil Saya
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-center px-4 py-2 rounded-md bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-md border border-slate-300 text-slate-700 font-medium"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
