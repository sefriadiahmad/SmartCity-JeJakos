import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import KosCard from '../../components/kos/KosCard';
import KosFilter from '../../components/kos/KosFilter';
import KosMap from '../../components/kos/KosMap';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [kosList, setKosList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKos, setSelectedKos] = useState(null);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'list' | 'map'
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'map' on mobile screens

  // Parse initial values from searchParams
  const queryObj = Object.fromEntries(searchParams.entries());

  useEffect(() => {
    let active = true;
    async function loadResults() {
      setLoading(true);
      setError('');
      try {
        const queryString = searchParams.toString();
        const endpoint = queryString ? `/kos?${queryString}` : '/kos';
        const res = await api.get(endpoint);
        if (active) {
          setKosList(res.data?.data || []);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Gagal memuat hasil pencarian kos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResults();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleApplyFilter = (filterParams) => {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filterParams)) {
      if (value !== undefined && value !== null && value !== '') {
        nextParams.append(key, value);
      }
    }
    setSearchParams(nextParams);
  };

  const handleSortChange = (newSort) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newSort) {
      nextParams.set('sort', newSort);
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams);
  };

  const handleClearSingleParam = (key) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(key);
    if (key === 'campus') {
      nextParams.delete('lat');
      nextParams.delete('lng');
      if (nextParams.get('sort') === 'nearest') {
        nextParams.delete('sort');
      }
    }
    setSearchParams(nextParams);
  };

  const currentSort = searchParams.get('sort') || '';
  const currentCampus = searchParams.get('campus');
  const currentQ = searchParams.get('q');
  const currentDistrict = searchParams.get('district');
  const currentType = searchParams.get('type');
  const currentMaxPrice = searchParams.get('max_price');

  return (
    <div className="flex-1 bg-slate-50 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Filter Bar */}
        <div>
          <KosFilter onSearch={handleApplyFilter} initialValues={queryObj} />
        </div>

        {/* Results Header with View Mode & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Hasil Pencarian Kos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Ditemukan <span className="font-bold text-emerald-700">{total}</span> hunian sewa
              {currentCampus && ` dekat ${currentCampus}`}
              {currentDistrict && ` di Kec. ${currentDistrict}`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium hidden sm:inline">Urutkan:</span>
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="">Terbaru</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
                <option value="rating_desc">Rating Tertinggi</option>
                {(searchParams.get('lat') || searchParams.get('campus')) && (
                  <option value="nearest">Jarak Terdekat</option>
                )}
              </select>
            </div>

            {/* Desktop View Mode Toggle */}
            <div className="hidden lg:flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'both' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Split Peta
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Daftar Saja
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Peta Penuh
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(currentQ || currentDistrict || currentType || currentMaxPrice || currentCampus) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Filter Aktif:</span>

            {currentQ && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                <span>Kata Kunci: "{currentQ}"</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('q')}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            )}

            {currentCampus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                <span>🎓 {currentCampus}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('campus')}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            )}

            {currentDistrict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                <span>Kec. {currentDistrict}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('district')}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            )}

            {currentType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium capitalize">
                <span>Kos {currentType}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('type')}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            )}

            {currentMaxPrice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                <span>Maks Rp {parseInt(currentMaxPrice, 10).toLocaleString('id-ID')}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('max_price')}
                  className="hover:text-red-600 ml-1 font-bold"
                >
                  ✕
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-red-600 hover:text-red-700 font-semibold underline text-xs ml-2"
            >
              Hapus Semua
            </button>
          </div>
        )}

        {/* Mobile View Toggle Buttons */}
        <div className="flex lg:hidden bg-slate-200/90 p-1 rounded-xl text-xs font-bold w-full">
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              mobileTab === 'list'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            📋 Daftar Kos ({kosList.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              mobileTab === 'map'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            🗺️ Peta Interaktif
          </button>
        </div>

        {/* Content Area */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
          </div>
        ) : kosList.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <div className="text-3xl">🔍</div>
            <h3 className="text-base font-bold text-slate-900">
              Tidak Ada Kos yang Cocok
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Coba longgarkan filter pencarian Anda, perluas radius, atau kosongkan kata kunci untuk melihat kos lainnya di Jambi.
            </p>
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
            >
              Lihat Semua Kos
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Desktop Layout depending on viewMode */}
            {viewMode === 'both' ? (
              <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
                {/* Left Cards Grid */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {kosList.map((kos) => (
                      <KosCard
                        key={kos.id}
                        kos={kos}
                        onHover={(k) => setSelectedKos(k)}
                        className={selectedKos?.id === kos.id ? 'ring-2 ring-emerald-500' : ''}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Sticky Map */}
                <div className="lg:col-span-5 sticky top-20">
                  <KosMap
                    kosList={kosList}
                    selectedKos={selectedKos}
                    onKosSelect={(k) => setSelectedKos(k)}
                    className="h-[calc(100vh-140px)] min-h-[480px]"
                  />
                </div>
              </div>
            ) : viewMode === 'list' ? (
              <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {kosList.map((kos) => (
                  <KosCard key={kos.id} kos={kos} />
                ))}
              </div>
            ) : (
              <div className="hidden lg:block">
                <KosMap
                  kosList={kosList}
                  selectedKos={selectedKos}
                  onKosSelect={(k) => setSelectedKos(k)}
                  className="h-[calc(100vh-180px)] min-h-[500px]"
                />
              </div>
            )}

            {/* Mobile Layout controlled by mobileTab */}
            <div className="block lg:hidden">
              {mobileTab === 'list' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kosList.map((kos) => (
                    <KosCard key={kos.id} kos={kos} />
                  ))}
                </div>
              ) : (
                <div className="h-[70vh] min-h-[400px]">
                  <KosMap
                    kosList={kosList}
                    selectedKos={selectedKos}
                    onKosSelect={(k) => setSelectedKos(k)}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
