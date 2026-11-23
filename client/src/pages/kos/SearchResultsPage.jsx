import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiX, FiBookOpen, FiList, FiMap, FiSearch } from 'react-icons/fi';
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
    <div className="flex-1 bg-[#f5f7f3] py-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="border-b border-[#dce7e1] pb-5"><p className="jk-label mb-2">Jelajahi hunian</p><p className="text-sm text-[#60736d]">Gunakan filter untuk mempersempit pilihan berdasarkan kebutuhan Anda.</p></div>
        {/* Top Filter Bar */}
        <div>
          <KosFilter onSearch={handleApplyFilter} initialValues={queryObj} />
        </div>

        {/* Results Header with View Mode & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#18352f] sm:text-4xl">
              Hasil Pencarian Kos
            </h1>
            <p className="mt-1 text-xs text-[#60736d] sm:text-sm">
              Ditemukan <span className="font-bold text-[#1f6b58]">{total}</span> hunian sewa
              {currentCampus && ` dekat ${currentCampus}`}
              {currentDistrict && ` di Kec. ${currentDistrict}`}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#60736d] font-medium hidden sm:inline">Urutkan:</span>
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="rounded-[14px] border border-[#dce7e1] bg-[#fffcf7] px-3 py-2 text-xs font-bold text-[#18352f] focus:border-[#1f6b58] focus:outline-none focus:ring-2 focus:ring-[#1f6b58]/15"
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
            <div className="hidden rounded-[14px] border border-[#dce7e1] bg-[#e6eee9] p-1 text-xs font-bold lg:flex">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'both' ? 'bg-[#fffcf7] text-[#18352f] shadow-xs font-bold' : 'text-[#60736d]'
                }`}
              >
                Split Peta
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-[#fffcf7] text-[#18352f] shadow-xs font-bold' : 'text-[#60736d]'
                }`}
              >
                Daftar Saja
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'map' ? 'bg-[#fffcf7] text-[#18352f] shadow-xs font-bold' : 'text-[#60736d]'
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
            <span className="text-[11px] font-bold text-[#91a69d] mr-1">Filter Aktif:</span>

            {currentQ && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6eee9] text-[#31564c] font-medium">
                <span>Kata Kunci: "{currentQ}"</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('q')}
                  aria-label="Hapus filter kata kunci"
                  className="hover:text-[#b84c4c] ml-1 font-bold cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {currentCampus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6eee9] text-[#1f6b58] font-medium border border-[#b9d5c7]">
                <span className="inline-flex items-center gap-1"><FiBookOpen className="w-3.5 h-3.5" /> {currentCampus}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('campus')}
                  aria-label="Hapus filter kampus"
                  className="hover:text-[#b84c4c] ml-1 font-bold cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {currentDistrict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6eee9] text-[#31564c] font-medium">
                <span>Kec. {currentDistrict}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('district')}
                  aria-label="Hapus filter kecamatan"
                  className="hover:text-[#b84c4c] ml-1 font-bold cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {currentType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium capitalize">
                <span>Kos {currentType}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('type')}
                  aria-label="Hapus filter tipe"
                  className="hover:text-[#b84c4c] ml-1 font-bold cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {currentMaxPrice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6eee9] text-[#31564c] font-medium">
                <span>Maks Rp {parseInt(currentMaxPrice, 10).toLocaleString('id-ID')}</span>
                <button
                  type="button"
                  onClick={() => handleClearSingleParam('max_price')}
                  aria-label="Hapus filter harga"
                  className="hover:text-[#b84c4c] ml-1 font-bold cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-[#b84c4c] hover:text-[#943e3e] font-semibold underline text-xs ml-2 cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>
        )}

        {/* Mobile View Toggle Buttons */}
        <div className="flex w-full rounded-[14px] border border-[#dce7e1] bg-[#e6eee9] p-1 text-xs font-bold lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              mobileTab === 'list'
                ? 'bg-[#fffcf7] text-[#1f6b58] shadow-xs'
                : 'text-[#60736d]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5"><FiList className="w-3.5 h-3.5" /> Daftar Kos ({kosList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              mobileTab === 'map'
                ? 'bg-[#fffcf7] text-[#1f6b58] shadow-xs'
                : 'text-[#60736d]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5"><FiMap className="w-3.5 h-3.5" /> Peta Interaktif</span>
          </button>
        </div>

        {/* Content Area */}
        {error && (
          <div className="rounded-[16px] border border-[#e7b7a6] bg-[#fff2ed] p-4 text-xs text-[#9c402e]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#1f6b58] border-t-transparent" />
          </div>
        ) : kosList.length === 0 ? (
          <div className="space-y-3 rounded-[20px] border border-dashed border-[#cbdcd4] bg-[#f5efe4] p-12 text-center">
            <FiSearch className="w-10 h-10 text-[#b9d5c7] mx-auto" />
            <h3 className="text-base font-bold text-[#18352f]">
              Tidak Ada Kos yang Cocok
            </h3>
            <p className="text-xs text-[#60736d] max-w-md mx-auto">
              Coba longgarkan filter pencarian Anda, perluas radius, atau kosongkan kata kunci untuk melihat kos lainnya di Jambi.
            </p>
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="min-h-11 rounded-[14px] bg-[#1f6b58] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#18352f]"
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
                        className={selectedKos?.id === kos.id ? 'ring-2 ring-[#1f6b58]' : ''}
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
