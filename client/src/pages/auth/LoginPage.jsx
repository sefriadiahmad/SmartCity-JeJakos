import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import background from '../../assets/background.jpeg';

const googleLoginUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/google`;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.3 3.1-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 3 14.7 2 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.7 9.4 6 12 6Z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => (
    searchParams.get('error') === 'google-callback'
      ? 'Login Google gagal diproses oleh server. Periksa log backend untuk detailnya.'
      : searchParams.get('error')
        ? 'Login Google gagal. Coba lagi atau gunakan email.'
        : ''
  ));

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
      const data = await login(formData.email, formData.password);
      navigate(data.user?.role === 'admin' ? '/admin/dashboard' : data.user?.role === 'pemilik' ? '/dashboard' : '/bookings');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Email atau kata sandi tidak sesuai.');
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <div className="w-full max-w-md px-6 py-10 sm:px-10 lg:py-12 motion-safe:animate-[auth-rise_.55s_ease-out_both]">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">JeJakos Jambi</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Masuk, cari tempat pulang.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Kelola pencarian dan pemesanan kos dari satu akun.</p>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <a href={googleLoginUrl} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
        <GoogleIcon /> Login Dengan Google
      </a>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau dengan email<span className="h-px flex-1 bg-slate-200" /></div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} placeholder="nama@email.com" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label htmlFor="login-pass" className="mb-1.5 block text-xs font-bold text-slate-700">Kata Sandi</label>
          <div className="relative">
            <input id="login-pass" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500">
              {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50">
          {loading ? 'Memeriksa Kredensial...' : 'Masuk'}
        </button>
      </form>
      <div className="mt-7 space-y-2 text-center text-xs text-slate-600">
        <p>Belum memiliki akun? <Link to="/register" className="font-bold text-emerald-700 hover:underline">Daftar sekarang</Link></p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 bg-white lg:min-h-[calc(100vh-8rem)]">
      <aside className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:block">
        <img src={background} alt="Hunian nyaman di Jambi" className="h-full w-full object-cover motion-safe:animate-[auth-zoom_12s_ease-out_both]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/30 to-emerald-800/20" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white motion-safe:animate-[auth-rise_.7s_.15s_ease-out_both]">
          <p className="max-w-md text-3xl font-bold leading-tight">Temukan kos yang pas untuk ritme hidupmu di Jambi.</p>
          <p className="mt-4 text-sm text-white/75">Pencarian jelas. Pemesanan tenang.</p>
        </div>
      </aside>
      <section className="flex min-h-full flex-1 items-center justify-center">{form}</section>
    </div>
  );
}
