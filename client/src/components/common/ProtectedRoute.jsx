import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      return (
        <div className="max-w-md mx-auto my-16 p-6 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
          <h2 className="text-xl font-bold text-slate-900">Akses Ditolak</h2>
          <p className="text-sm text-slate-600 mt-2">
            Peran Anda ({user.role}) tidak memiliki izin untuk mengakses halaman ini.
          </p>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
}
