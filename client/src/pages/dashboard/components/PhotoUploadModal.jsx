import { useState, useEffect, useCallback } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import api from '../../../services/api';
import { getPhotoUrl } from '../../../utils/imageUrl';

export default function PhotoUploadModal({ isOpen, onClose, kos, onPhotosUpdated }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'url'

  const kosId = kos?.id;

  const refreshKosDetail = useCallback(async () => {
    if (!kosId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/kos/${kosId}`);
      setPhotos(res.data?.kos?.photos || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat galeri foto');
    } finally {
      setLoading(false);
    }
  }, [kosId]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!kosId) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/kos/${kosId}`);
        if (active) setPhotos(res.data?.kos?.photos || []);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat galeri foto');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [kosId]);

  if (!isOpen || !kos) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      for (const file of selectedFiles) {
        data.append('photos', file);
      }

      await api.post(`/kos/${kos.id}/photos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSelectedFiles([]);
      refreshKosDetail();
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Gagal mengunggah foto. Pastikan ukuran < 5MB dan format JPG/PNG/WebP.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleUploadUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUploading(true);
    setError('');
    try {
      await api.post(`/kos/${kos.id}/photos`, {
        photo_url: urlInput.trim(),
      });

      setUrlInput('');
      refreshKosDetail();
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambahkan tautan foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Yakin ingin menghapus foto ini?')) return;
    try {
      await api.delete(`/kos/${kos.id}/photos/${photoId}`);
      refreshKosDetail();
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus foto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Galeri Foto — {kos.name}
            </h2>
            <p className="text-xs text-slate-500">
              Foto properti akan ditampilkan di kartu pencarian dan halaman detail kos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Upload Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Unggah Foto Baru</span>
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTab === 'file'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  File Lokal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTab === 'url'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tautan URL
                </button>
              </div>
            </div>

            {activeTab === 'file' ? (
              <form onSubmit={handleUploadFiles} className="space-y-3">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-600 font-medium">
                      {selectedFiles.length} file dipilih
                    </span>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {uploading ? 'Mengunggah...' : 'Unggah Sekarang'}
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleUploadUrl} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={uploading || !urlInput.trim()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {uploading ? 'Menambahkan...' : 'Tambah'}
                </button>
              </form>
            )}
          </div>

          {/* Galeri Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Foto Tersimpan ({photos.length})
            </h3>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : photos.length === 0 ? (
              <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs">Belum ada foto untuk kos ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, idx) => {
                  const src = getPhotoUrl(photo.photo_url);
                  return (
                    <div
                      key={photo.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3"
                    >
                      <img
                        src={src}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                          Foto Utama
                        </span>
                      )}
                      {photo.room_id && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-slate-900/70 text-white px-1.5 py-0.5 rounded-md">
                          Kamar #{photo.room_id}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm hover:bg-red-700 cursor-pointer"
                        title="Hapus foto"
                        aria-label="Hapus foto"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
