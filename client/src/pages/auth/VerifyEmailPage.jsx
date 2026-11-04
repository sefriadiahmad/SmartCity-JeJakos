import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import api from '../../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState(urlToken);
  const [status, setStatus] = useState(() => (urlToken ? 'verifying' : 'idle')); // 'idle' | 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!urlToken) return;

    let ignore = false;
    api
      .post('/auth/verify-email', { token: urlToken.trim() })
      .then((res) => {
        if (ignore) return;
        setStatus('success');
        setMessage(res.data.message || 'Email Anda berhasil diverifikasi!');

        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            user.is_verified = true;
            localStorage.setItem('user', JSON.stringify(user));
          } catch {
            // ignore parsing error
          }
        }
      })
      .catch((err) => {
        if (ignore) return;
        setStatus('error');
        setMessage(
          err.response?.data?.error ||
            'Verifikasi email gagal. Token mungkin tidak valid atau sudah kedaluwarsa.'
        );
      });

    return () => {
      ignore = true;
    };
  }, [urlToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = token.trim();
    if (!t) {
      setStatus('error');
      setMessage('Token verifikasi tidak boleh kosong.');
      return;
    }

    setStatus('verifying');
    setMessage('');

    try {
      const res = await api.post('/auth/verify-email', { token: t });
      setStatus('success');
      setMessage(res.data.message || 'Email Anda berhasil diverifikasi!');

      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          user.is_verified = true;
          localStorage.setItem('user', JSON.stringify(user));
        } catch {
          // ignore parsing error
        }
      }
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.error ||
          'Verifikasi email gagal. Token mungkin tidak valid atau sudah kedaluwarsa.'
      );
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verifikasi Email</h1>
          <p className="text-sm text-slate-600 mt-1">
            Konfirmasikan alamat email Anda untuk mengaktifkan akun JeJakos
          </p>
        </div>

        {status === 'verifying' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3" />
            <p className="text-sm font-medium text-slate-700">Sedang memverifikasi email Anda...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white mb-2">
                <FiCheck className="w-6 h-6" />
              </span>
              <h2 className="text-lg font-bold text-emerald-800">Verifikasi Berhasil!</h2>
              <p className="text-sm text-slate-600 mt-1">{message}</p>
            </div>
            <Link
              to="/login"
              className="block w-full text-center py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              Masuk ke Akun Anda
            </Link>
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="verify-token" className="block text-xs font-semibold text-slate-700 mb-1">
                Token Verifikasi
              </label>
              <textarea
                id="verify-token"
                rows={3}
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Tempel token verifikasi Anda di sini..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              Verifikasi Sekarang
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-600">
          <Link to="/" className="text-emerald-600 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
