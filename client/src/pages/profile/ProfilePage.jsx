import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

export default function ProfilePage() {
  const { user, updateProfile, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile edit state
  const [prevUserId, setPrevUserId] = useState(user?.id);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Adjust state during render if user loaded after initial mount
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    setName(user?.name || '');
    setPhone(user?.phone || '');
  }

  // Password reset state (F-05)
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState({ type: '', text: '' });
  const [requestResetLoading, setRequestResetLoading] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState({ type: '', text: '' });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      if (photoFile) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('photo', photoFile);
        await updateProfile(formData);
      } else {
        await updateProfile({ name, phone });
      }
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui!' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Gagal memperbarui profil.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRequestResetToken = async () => {
    if (!user?.email) return;
    setRequestResetLoading(true);
    setResetMsg({ type: '', text: '' });

    try {
      const res = await api.post('/auth/forgot-password', { email: user.email });
      setResetMsg({
        type: 'success',
        text: res.data?.message || 'Instruksi reset telah dikirim.',
      });
    } catch (err) {
      setResetMsg({
        type: 'error',
        text: err.response?.data?.error || 'Gagal meminta reset password.',
      });
    } finally {
      setRequestResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setResetMsg({ type: 'error', text: 'Token dan kata sandi baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 8) {
      setResetMsg({ type: 'error', text: 'Kata sandi baru minimal 8 karakter.' });
      return;
    }

    setResetLoading(true);
    setResetMsg({ type: '', text: '' });

    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken.trim(),
        password: newPassword,
      });
      setResetMsg({
        type: 'success',
        text: res.data?.message || 'Kata sandi berhasil direset!',
      });
      setNewPassword('');
    } catch (err) {
      setResetMsg({
        type: 'error',
        text: err.response?.data?.error || 'Gagal mereset kata sandi.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBecomePartner = async () => {
    setPartnerLoading(true);
    setPartnerMsg({ type: '', text: '' });
    try {
      const res = await api.post('/auth/become-partner');
      await refreshUser();
      setPartnerMsg({ type: 'success', text: res.data.message });
    } catch (err) {
      setPartnerMsg({
        type: 'error',
        text: err.response?.data?.error || 'Pendaftaran mitra gagal dikirim.',
      });
    } finally {
      setPartnerLoading(false);
    }
  };

  const serverBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

  const avatarSrc =
    photoPreview ||
    (user?.photo_url
      ? user.photo_url.startsWith('http')
        ? user.photo_url
        : `${serverBase}${user.photo_url}`
      : null);

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header / User Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user?.name || user?.email}
                className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 text-3xl font-bold flex items-center justify-center border-2 border-emerald-500 shadow-xs">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Tanpa Nama'}</h1>
              <span className="text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {user?.role}
              </span>
            </div>

            <p className="text-sm text-slate-600">{user?.email}</p>
            {user?.phone && <p className="text-sm text-slate-600">{user.phone}</p>}

            {/* Status Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {user?.role !== 'pencari' && user?.is_verified ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Email Terverifikasi</span>
                </span>
              ) : user?.role !== 'pencari' ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Email Belum Diverifikasi
                  <Link to="/verify-email" className="underline font-semibold ml-1">
                    Verifikasi
                  </Link>
                </span>
              ) : null}

              {user?.role === 'pemilik' && (
                user?.is_approved ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Disetujui Admin</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Menunggu Persetujuan Admin
                  </span>
                )
              )}
            </div>
          </div>

          {/* Logout Action (F-06) */}
          <div className="sm:self-start">
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition"
            >
              Keluar
            </button>
          </div>
        </div>

        {user?.role === 'pencari' && (
          <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Kemitraan JeJakos</p>
            <h2 className="mt-2 text-xl font-bold">Punya atau mengelola kos?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Daftarkan diri sebagai mitra untuk mengelola listing kos. Admin akan meninjau pengajuan Anda.
            </p>
            {partnerMsg.text && (
              <div
                className={`mt-4 rounded-lg border p-3 text-sm ${
                  partnerMsg.type === 'success'
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                    : 'border-red-300/30 bg-red-400/10 text-red-100'
                }`}
              >
                {partnerMsg.text}
              </div>
            )}
            <button
              type="button"
              onClick={handleBecomePartner}
              disabled={partnerLoading}
              className="mt-5 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {partnerLoading ? 'Mengirim Pengajuan...' : 'Daftar Sebagai Mitra'}
            </button>
          </div>
        )}

        {/* Section 1: Edit Profile (F-04) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Kelola Profil</h2>
          <p className="text-xs text-slate-500 mb-6">
            Perbarui nama lengkap, nomor telepon, dan foto profil Anda
          </p>

          {profileMsg.text && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm border ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prof-photo" className="block text-xs font-semibold text-slate-700 mb-1">
                Foto Profil (Maks. 5MB JPG, PNG, WebP)
              </label>
              <input
                id="prof-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="py-2.5 px-6 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {profileLoading ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </form>
        </div>

        {/* Section 2: Reset Password (F-05) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ubah Kata Sandi</h2>
              <p className="text-xs text-slate-500">
                Atur ulang kata sandi Anda menggunakan token reset
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestResetToken}
              disabled={requestResetLoading}
              className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {requestResetLoading ? 'Mengirim...' : 'Minta Token Reset'}
            </button>
          </div>

          {resetMsg.text && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm border ${
                resetMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {resetMsg.text}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="pwd-token" className="block text-xs font-semibold text-slate-700 mb-1">
                Token Reset
              </label>
              <input
                id="pwd-token"
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Tempel token reset di sini"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="pwd-new" className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru (Min. 8 karakter)
              </label>
              <div className="relative">
                <input
                  id="pwd-new"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-11 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((visible) => !visible)}
                  aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-500 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                >
                  {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="py-2.5 px-6 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition disabled:opacity-50"
            >
              {resetLoading ? 'Mereset...' : 'Perbarui Kata Sandi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
