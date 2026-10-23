import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import KosFilter from '../../components/kos/KosFilter';
import KosCard from '../../components/kos/KosCard';
import api from '../../services/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [featuredKos, setFeaturedKos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchFeatured() {
      try {
        const res = await api.get('/kos?limit=4');
        if (active) {
          setFeaturedKos(res.data?.data || []);
        }
      } catch {
        // ignore error on home preview
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchFeatured();
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (filterParams) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filterParams)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    }
    navigate(`/kos?${params.toString()}`);
  };

  const handleQuickTagClick = (tagParams) => {
    handleSearch(tagParams);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-emerald-50/80 via-teal-50/30 to-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>🏛️ Jambi Smart City Challenge 2026</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Temukan Kos Idaman di{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Provinsi Jambi
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Platform digitalisasi rekam jejak hunian sewa pertama di Jambi. Dilengkapi pencarian geospasial akurat, ulasan penyewa asli, dan chatbot rekomendasi cerdas.
          </p>

          {/* Integrated Search Bar & Filter Panel */}
          <div className="pt-2 text-left">
            <KosFilter onSearch={handleSearch} />
          </div>

          {/* Shortcut Tags */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Paling Banyak Dicari:</span>
            <button
              type="button"
              onClick={() => handleQuickTagClick({ q: 'Mendalo', campus: 'UNJA Mendalo', lat: -1.6140, lng: 103.5200, sort: 'nearest' })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition shadow-2xs"
            >
              🎓 Dekat UNJA Mendalo
            </button>
            <button
              type="button"
              onClick={() => handleQuickTagClick({ q: 'Sungai Duren', campus: 'UIN STS Jambi', lat: -1.6065, lng: 103.5095, sort: 'nearest' })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition shadow-2xs"
            >
              🕌 Dekat UIN STS
            </button>
            <button
              type="button"
              onClick={() => handleQuickTagClick({ district: 'Danau Teluk', q: 'UNBARI' })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition shadow-2xs"
            >
              📚 Sekitar UNBARI
            </button>
            <button
              type="button"
              onClick={() => handleQuickTagClick({ type: 'putri' })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-pink-700 hover:border-pink-500 transition shadow-2xs"
            >
              👧 Khusus Putri
            </button>
            <button
              type="button"
              onClick={() => handleQuickTagClick({ max_price: 700000 })}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-emerald-700 hover:border-emerald-500 transition shadow-2xs"
            >
              💰 Di Bawah 700rb
            </button>
          </div>
        </div>
      </section>

      {/* Featured Kos Populer Section (Wireframe 10.2) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <span>🌟 Rekomendasi Teratas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Kos Populer di Jambi
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Pilihan terverifikasi dekat kampus dan pusat perkantoran
            </p>
          </div>

          <Link
            to="/kos"
            className="text-xs sm:text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group"
          >
            <span>Lihat Semua Kos</span>
            <span className="group-hover:translate-x-0.5 transition">→</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
          </div>
        ) : featuredKos.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm">Belum ada kos terverifikasi saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredKos.map((kos) => (
              <KosCard key={kos.id} kos={kos} />
            ))}
          </div>
        )}
      </section>

      {/* AI Chatbot Banner (Design §5 & §7) */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold tracking-wider uppercase">
              🤖 Fitur Smart City JeJakos
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bingung Memilih Kos? Tanya JeJakos Bot!
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Cukup ceritakan kebutuhan Anda lewat percakapan santai. Bot kami berbasis Google Gemini dengan RAG ketat yang hanya merekomendasikan kos yang benar-benar ada di database Jambi.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSearch({ q: 'WiFi AC Mendalo', max_price: 800000 })}
                className="px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition shadow-sm"
              >
                Cari "Kos Dekat UNJA Ada AC & WiFi"
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Keunggulan Platform */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-100">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Mengapa Memilih JeJakos?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Solusi digital cerdas untuk pemilik dan pencari kos di Provinsi Jambi
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 text-2xl flex items-center justify-center font-bold">
              📍
            </div>
            <h3 className="text-base font-bold text-slate-900">Peta & Jarak Geospasial Akurat</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hitung jarak rute dari titik acuan kampus UNJA Mendalo, UIN STS, UNBARI, atau kantor pemerintahan di Kota Jambi.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 text-2xl flex items-center justify-center font-bold">
              🛡️
            </div>
            <h3 className="text-base font-bold text-slate-900">Listing Terverifikasi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap pemilik kos dan properti melalui verifikasi admin JeJakos untuk menjamin keamanan dari penipuan deposit.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 text-2xl flex items-center justify-center font-bold">
              ⭐
            </div>
            <h3 className="text-base font-bold text-slate-900">Rekam Jejak Transparan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ulasan asli dari penyewa yang terbukti pernah tinggal, pencatatan pembayaran rapi, dan fasilitas pengaduan terintegrasi.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
