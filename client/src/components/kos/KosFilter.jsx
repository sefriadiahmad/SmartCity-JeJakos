import { useState, useEffect } from 'react';
import api from '../../services/api';

const JAMBI_DISTRICTS = [
  'Jambi Luar Kota',
  'Telanaipura',
  'Danau Teluk',
  'Pasar Jambi',
  'Kotabaru',
  'Jelutung',
  'Danau Sipin',
  'Alam Barajo',
  'Jambi Timur',
  'Jambi Selatan',
  'Pelayangan',
];

const CAMPUS_PRESETS = [
  { label: 'Semua Lokasi', lat: null, lng: null },
  { label: 'UNJA Mendalo', lat: -1.6140, lng: 103.5200 },
  { label: 'UIN STS Jambi', lat: -1.6065, lng: 103.5095 },
  { label: 'UNBARI Telanaipura', lat: -1.6045, lng: 103.5930 },
  { label: 'WTC Pasar Jambi', lat: -1.5920, lng: 103.6180 },
];

const DEFAULT_FACILITIES = [
  { id: 1, name: 'WiFi' },
  { id: 2, name: 'AC' },
  { id: 3, name: 'Kamar Mandi Dalam' },
  { id: 7, name: 'Parkir Motor' },
  { id: 9, name: 'Dapur Bersama' },
  { id: 11, name: 'Listrik Termasuk' },
  { id: 13, name: 'CCTV 24 Jam' },
];

export default function KosFilter({ onSearch, initialValues = {} }) {
  const [keyword, setKeyword] = useState(initialValues.q || initialValues.search || '');
  const [district, setDistrict] = useState(initialValues.district || '');
  const [type, setType] = useState(initialValues.type || '');
  const [minPrice, setMinPrice] = useState(initialValues.min_price || '');
  const [maxPrice, setMaxPrice] = useState(initialValues.max_price || '');
  const [payPeriod, setPayPeriod] = useState(initialValues.pay_period || '');
  const [selectedFacilities, setSelectedFacilities] = useState(
    initialValues.facility_ids ? String(initialValues.facility_ids).split(',').map((id) => parseInt(id, 10)).filter(Boolean) : []
  );
  const [selectedCampus, setSelectedCampus] = useState(initialValues.campus || 'Semua Lokasi');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableFacilities, setAvailableFacilities] = useState(DEFAULT_FACILITIES);

  useEffect(() => {
    async function loadFacilities() {
      try {
        const res = await api.get('/kos/facilities');
        if (res.data?.facilities?.length) {
          setAvailableFacilities(res.data.facilities);
        }
      } catch {
        // Fallback to DEFAULT_FACILITIES
      }
    }
    loadFacilities();
  }, []);

  const handleFacilityToggle = (facId) => {
    setSelectedFacilities((prev) =>
      prev.includes(facId) ? prev.filter((id) => id !== facId) : [...prev, facId]
    );
  };

  const handleCampusSelect = (preset) => {
    setSelectedCampus(preset.label);
  };

  const handleQuickTypeSelect = (selectedType) => {
    setType((prev) => (prev === selectedType ? '' : selectedType));
  };

  const handleQuickBudgetSelect = (max) => {
    setMaxPrice((prev) => (prev === max ? '' : max));
  };

  const handleReset = () => {
    setKeyword('');
    setDistrict('');
    setType('');
    setMinPrice('');
    setMaxPrice('');
    setPayPeriod('');
    setSelectedFacilities([]);
    setSelectedCampus('Semua Lokasi');
  };

  const activeFilterCount =
    (type ? 1 : 0) +
    (district ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (payPeriod ? 1 : 0) +
    selectedFacilities.length +
    (selectedCampus !== 'Semua Lokasi' ? 1 : 0);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const params = {};
    if (keyword.trim()) params.q = keyword.trim();
    if (district) params.district = district;
    if (type) params.type = type;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (payPeriod) params.pay_period = payPeriod;
    if (selectedFacilities.length > 0) {
      params.facility_ids = selectedFacilities.join(',');
    }

    const campus = CAMPUS_PRESETS.find((c) => c.label === selectedCampus);
    if (campus && campus.lat !== null && campus.lng !== null) {
      params.lat = campus.lat;
      params.lng = campus.lng;
      params.sort = 'nearest';
      params.campus = campus.label;
    }

    if (onSearch) {
      onSearch(params);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-4 sm:p-6 transition">
      {/* Primary Search Bar */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Kata Kunci */}
          <div className="flex-1 relative">
            <label htmlFor="filter-q" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Kata Kunci / Nama Kos / Area
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                id="filter-q"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="cth. Mendalo, UNJA, AC, Mandiri"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          {/* Kecamatan Dropdown */}
          <div className="sm:w-56">
            <label htmlFor="filter-district" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Kecamatan
            </label>
            <select
              id="filter-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
            >
              <option value="">Semua Kecamatan</option>
              {JAMBI_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Submit & Filter Toggle Buttons */}
          <div className="flex items-end gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 h-[42px] ${
                showAdvanced || activeFilterCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Filter Lanjutan"
            >
              <span>⚙️ Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 h-[42px]"
            >
              <span>Cari Kos</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Filter Cepat:
          </span>

          {/* Tipe Kos quick pills */}
          {['putra', 'putri', 'campur'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleQuickTypeSelect(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                type === t
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t === 'putra' ? '👦 Khusus Putra' : t === 'putri' ? '👧 Khusus Putri' : '👥 Campur'}
            </button>
          ))}

          {/* Budget quick pills */}
          <button
            type="button"
            onClick={() => handleQuickBudgetSelect(600000)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
              maxPrice === 600000
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ≤ 600rb
          </button>

          <button
            type="button"
            onClick={() => handleQuickBudgetSelect(1000000)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
              maxPrice === 1000000
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ≤ 1 Juta
          </button>

          {/* Reset link if filters active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-600 hover:text-red-700 font-semibold ml-auto transition"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Expandable Advanced Filter Panel */}
        {showAdvanced && (
          <div className="pt-4 mt-2 border-t border-slate-200/80 space-y-5 animate-in fade-in duration-200">
            {/* Kampus / Titik Acuan Jambi (F-13) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                🎓 Hitung Jarak Terdekat Dari Kampus / Pusat Kota Jambi (F-13)
              </label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleCampusSelect(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      selectedCampus === preset.label
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rentang Harga (F-10) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Minimum (Rp)
                </label>
                <input
                  type="number"
                  step="50000"
                  placeholder="cth. 400000"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Maksimum (Rp)
                </label>
                <input
                  type="number"
                  step="50000"
                  placeholder="cth. 1500000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>

            {/* Periode Bayar (F-10) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Periode Pembayaran (F-10)
              </label>
              <div className="flex gap-3">
                {[
                  { value: '', label: 'Semua Periode' },
                  { value: 'bulanan', label: 'Bulanan' },
                  { value: 'tahunan', label: 'Tahunan' },
                ].map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition ${
                      payPeriod === p.value
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay_period"
                      value={p.value}
                      checked={payPeriod === p.value}
                      onChange={() => setPayPeriod(p.value)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fasilitas Filter (F-10) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Fasilitas Kos Wajib Ada (F-10)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {availableFacilities.map((fac) => {
                  const checked = selectedFacilities.includes(fac.id);
                  return (
                    <label
                      key={fac.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition ${
                        checked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleFacilityToggle(fac.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">{fac.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons inside Panel */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Kosongkan Semua Filter
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
              >
                Terapkan & Cari Kos
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
