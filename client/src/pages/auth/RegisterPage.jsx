import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState('pencari');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

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

    if (formData.password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!agreed) {
      setError('Anda harus menyetujui syarat & kebijakan privasi.');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        email: formData.email,
        password: formData.password,
        role,
        name: formData.name || undefined,
        phone: formData.phone || undefined,
      });

      setSuccessInfo({
        message: data.message || 'Registrasi berhasil.',
        email: formData.email,
      });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Gagal melakukan pendaftaran. Silakan coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Daftar Akun JeJakos</h1>
          <p className="text-sm text-slate-600 mt-1">
            Bergabung dengan platform digitalisasi hunian kos di Jambi
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setRole('pencari')}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              role === 'pencari'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pencari Kos
          </button>
          <button
            type="button"
            onClick={() => setRole('pemilik')}
            className={`py-2 text-sm font-semibold rounded-lg transition ${
              role === 'pemilik'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemilik Kos
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {successInfo ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-3">
            <h2 className="text-base font-semibold text-emerald-800">
              Registrasi Berhasil!
            </h2>
            <p className="text-sm text-slate-600">
              Akun <strong className="text-slate-900">{successInfo.email}</strong> sebagai{' '}
              <strong className="capitalize text-slate-900">{role}</strong> telah dibuat.
              Silakan lakukan verifikasi email.
            </p>
            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-medium text-emerald-600 hover:underline">
                Menuju Halaman Masuk
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="cth. Budi Santoso"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="081234567890"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="reg-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi <span className="text-red-500">*</span> (min. 8 karakter)
              </label>
              <input
                id="reg-pass"
                name="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1">
                Konfirmasi Kata Sandi <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-confirm"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Privacy & Terms Consent (NF-06) */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="reg-consent"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="reg-consent" className="text-xs text-slate-600 leading-tight">
                Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi JeJakos, serta mengizinkan
                pemrosesan data untuk penyewaan kos di Jambi.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition disabled:opacity-50"
            >
              {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-600">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
