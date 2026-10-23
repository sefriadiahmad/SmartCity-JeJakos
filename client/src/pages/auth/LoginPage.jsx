import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { accessToken, user } = res.data;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Redirect based on role
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Email atau kata sandi tidak sesuai.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Masuk ke JeJakos</h1>
          <p className="text-sm text-slate-600 mt-1">
            Silakan masukkan email dan kata sandi Anda
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-pass" className="block text-xs font-semibold text-slate-700">
                Kata Sandi
              </label>
            </div>
            <input
              id="login-pass"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition disabled:opacity-50"
          >
            {loading ? 'Memeriksa Kredensial...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-600 space-y-2">
          <div>
            Belum memiliki akun?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Daftar sekarang
            </Link>
          </div>
          <div>
            Punya token verifikasi email?{' '}
            <Link to="/verify-email" className="text-emerald-600 hover:underline">
              Verifikasi di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
