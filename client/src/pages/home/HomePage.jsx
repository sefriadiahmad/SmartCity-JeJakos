import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [keyword, setKeyword] = useState('');
  const [district, setDistrict] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    if (district) params.append('district', district);
    navigate(`/kos?${params.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero section */}
      <section className="bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-4">
            Provinsi Jambi
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Temukan Kos Idaman Tanpa Ribet
          </h1>
          <p className="mt-4 text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Cari kos dekat kampus & kantor di Jambi dengan verifikasi terpercaya, ulasan penghuni nyata, dan peta interaktif.
          </p>

          {/* Search box - mobile-first stack, row on sm+ */}
          <form
            onSubmit={handleSearch}
            className="mt-8 bg-white p-3 sm:p-4 rounded-2xl shadow-lg border border-slate-200 flex flex-col sm:flex-row gap-3 text-left"
          >
            <div className="flex-1">
              <label htmlFor="search-keyword" className="block text-xs font-semibold text-slate-500 mb-1">
                Kata Kunci / Area / Kampus
              </label>
              <input
                id="search-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="cth. UNJA, Telanaipura, Mendalo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:w-48">
              <label htmlFor="search-district" className="block text-xs font-semibold text-slate-500 mb-1">
                Kecamatan
              </label>
              <select
                id="search-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Semua Kecamatan</option>
                <option value="Telanaipura">Telanaipura</option>
                <option value="Jelutung">Jelutung</option>
                <option value="Kotabaru">Kotabaru</option>
                <option value="Danau Sipin">Danau Sipin</option>
                <option value="Jambi Selatan">Jambi Selatan</option>
                <option value="Pasar Jambi">Pasar Jambi</option>
                <option value="Muaro Jambi">Muaro Jambi (UNJA Mendalo)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-sm"
              >
                Cari Kos
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Info features */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
              1
            </div>
            <h3 className="text-base font-semibold text-slate-900">Peta & Jarak Akurat</h3>
            <p className="mt-1 text-sm text-slate-600">
              Lihat lokasi kos di peta dan hitung jarak langsung ke titik kampus UNJA, UNBARI, atau kantor Anda.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-3">
              2
            </div>
            <h3 className="text-base font-semibold text-slate-900">Chatbot Cerdas RAG</h3>
            <p className="mt-1 text-sm text-slate-600">
              Tanyakan kriteria kos yang Anda inginkan. Chatbot berbasis Google Gemini hanya merekomendasikan data kos nyata.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold mb-3">
              3
            </div>
            <h3 className="text-base font-semibold text-slate-900">Rekam Jejak Transparan</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ulasan terverifikasi dari penyewa nyata, tagihan otomatis terstruktur, dan penanganan tiket pengaduan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
