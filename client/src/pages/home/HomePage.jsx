import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiChevronDown,
  FiCpu,
  FiDollarSign,
  FiMap,
  FiMapPin,
  FiMessageCircle,
  FiSearch,
  FiShield,
  FiStar,
  FiUser,
} from 'react-icons/fi';
import KosFilter from '../../components/kos/KosFilter';
import KosCard from '../../components/kos/KosCard';
import api from '../../services/api';

const quickSearches = [
  { label: 'Dekat UNJA Mendalo', icon: FiBookOpen, params: { q: 'Mendalo', campus: 'UNJA Mendalo', lat: -1.6140, lng: 103.5200, sort: 'nearest' } },
  { label: 'Dekat UIN STS', icon: FiMapPin, params: { q: 'Sungai Duren', campus: 'UIN STS Jambi', lat: -1.6065, lng: 103.5095, sort: 'nearest' } },
  { label: 'Khusus putri', icon: FiUser, params: { type: 'putri' } },
  { label: 'Di bawah 700rb', icon: FiDollarSign, params: { max_price: 700000 } },
];

const trustItems = [
  { icon: FiMapPin, title: 'Cari berdasarkan jarak', text: 'Lihat kos yang dekat kampus, kantor, dan kawasan pilihan Anda.' },
  { icon: FiShield, title: 'Informasi lebih jelas', text: 'Bandingkan detail hunian dengan konteks yang lebih jelas.' },
  { icon: FiCheckCircle, title: 'Rekam jejak nyata', text: 'Gunakan rating, ulasan, fasilitas, dan ketersediaan kamar.' },
];

const steps = [
  ['01', 'Tentukan kebutuhan', 'Pilih kawasan, kampus, anggaran, atau fasilitas yang penting.'],
  ['02', 'Bandingkan pilihan', 'Lihat detail kos, foto, fasilitas, rating, dan jarak dalam satu tempat.'],
  ['03', 'Hubungi pemilik', 'Temukan pilihan yang cocok lalu lanjutkan komunikasi dengan pemilik.'],
];

const faqs = [
  ['Apakah saya harus punya akun untuk mencari kos?', 'Tidak. Anda bisa menjelajah dan mencari listing publik tanpa akun. Akun diperlukan saat ingin memakai fitur yang membutuhkan identitas.'],
  ['Bagaimana cara mencari kos dekat kampus?', 'Masukkan nama kampus atau pilih pencarian cepat di bagian atas. Hasil akan membawa parameter lokasi yang sesuai.'],
  ['Apakah semua listing sudah diverifikasi?', 'JeJakos menampilkan informasi listing dari database platform. Tetap periksa detail dan konfirmasi langsung sebelum mengambil keputusan.'],
];

export default function HomePage() {
  const navigate = useNavigate();
  const [featuredKos, setFeaturedKos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const controllerRef = useRef(null);

  const fetchFeatured = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/kos?limit=4', { signal: controller.signal });
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setFeaturedKos(res.data?.data || []);
    } catch (error) {
      if (!mountedRef.current || error?.code === 'ERR_CANCELED' || requestId !== requestIdRef.current) return;
      setFeaturedKos([]);
      setLoadError(true);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFeatured();
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, [fetchFeatured]);

  const handleSearch = (filterParams) => {
    const params = new URLSearchParams();
    Object.entries(filterParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    });
    navigate(`/kos?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-[#fffcf7]">
      <section className="relative overflow-hidden border-b border-[#dce7e1] bg-[#f5efe4] px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#c9784a]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)] lg:gap-16">
            <div className="max-w-xl">
              <div className="jk-label mb-5 inline-flex items-center gap-2"><FiAward className="h-4 w-4" /> Temukan tempat pulang di Jambi</div>
              <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight text-[#18352f] sm:text-6xl">Cari kos tanpa menebak-nebak.</h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#60736d] sm:text-base">Temukan kos di Jambi berdasarkan kawasan, kampus, anggaran, fasilitas, dan pengalaman penyewa.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#cari-kos" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#1f6b58] px-5 text-sm font-extrabold text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#18352f]">Cari kos sekarang <FiSearch className="h-4 w-4" /></a>
                <a href="#cara-kerja" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#b9d5c7] px-5 text-sm font-bold text-[#31564c] hover:border-[#1f6b58]">Lihat cara kerja <FiArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
            <div id="cari-kos" className="relative scroll-mt-24 rounded-[24px] border border-[#dce7e1] bg-[#fffcf7] p-4 shadow-[0_24px_50px_-32px_rgba(24,53,47,.55)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4"><div><p className="jk-label">Mulai dari kebutuhan Anda</p><p className="mt-1 text-sm font-bold text-[#18352f]">Cari kos di kawasan pilihan</p></div><FiMap className="h-5 w-5 text-[#c9784a]" aria-hidden="true" /></div>
              <KosFilter onSearch={handleSearch} />
            </div>
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickSearches.map(({ label, icon: Icon, params }) => <button key={label} type="button" onClick={() => handleSearch(params)} className="flex min-h-11 items-center gap-2 rounded-[14px] border border-[#cbdcd4] bg-[#fffcf7] px-3.5 text-left text-xs font-bold text-[#31564c] hover:-translate-y-0.5 hover:border-[#1f6b58] hover:text-[#1f6b58]"><Icon className="h-3.5 w-3.5 shrink-0 text-[#c9784a]" aria-hidden="true" />{label}</button>)}
          </div>
        </div>
      </section>

      <div className="border-b border-[#dce7e1] bg-[#e6eee9] px-4 py-4 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2 text-xs font-bold text-[#31564c]"><span>Jelajah kawasan Jambi</span><span>Peta dan jarak membantu orientasi</span><span>Bandingkan detail sebelum memilih</span></div></div>

      <section aria-labelledby="featured-kos-heading" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="jk-label mb-2 inline-flex items-center gap-2"><FiStar className="h-3.5 w-3.5 text-[#c9784a]" /> Pilihan untuk Anda</p><h2 id="featured-kos-heading" className="font-[family-name:var(--font-display)] text-3xl text-[#18352f] sm:text-4xl">Kos yang layak dilihat</h2><p className="mt-2 text-sm text-[#60736d]">Listing yang tersedia untuk Anda jelajahi.</p></div><Link to="/kos" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#1f6b58] hover:text-[#18352f]">Lihat semua kos <FiArrowRight className="h-4 w-4" /></Link></div>
        {loading && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Memuat listing"><span className="sr-only">Memuat listing...</span>{[1, 2, 3, 4].map((item) => <div key={item} className="h-[360px] animate-pulse rounded-[20px] border border-[#dce7e1] bg-[#e6eee9]" aria-hidden="true" />)}</div>}
        {!loading && loadError && <div role="alert" className="rounded-[20px] border border-[#e7c5b4] bg-[#fff4ed] p-8 text-center"><FiAlertTriangle className="mx-auto h-6 w-6 text-[#c9784a]" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-[#18352f]">Listing belum dapat dimuat.</p><p className="mt-1 text-sm text-[#60736d]">Periksa koneksi lalu coba lagi.</p><button type="button" onClick={fetchFeatured} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#1f6b58] px-4 text-sm font-bold text-white hover:bg-[#18352f]"><FiSearch className="h-4 w-4" aria-hidden="true" /> Coba lagi</button></div>}
        {!loading && !loadError && featuredKos.length === 0 && <div role="status" className="rounded-[20px] border border-dashed border-[#cbdcd4] bg-[#f5efe4] p-10 text-center text-sm text-[#60736d]">Belum ada kos yang dapat ditampilkan saat ini.</div>}
        {!loading && !loadError && featuredKos.length > 0 && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">{featuredKos.map((kos) => <KosCard key={kos.id} kos={kos} />)}</div>}
      </section>

      <section id="cara-kerja" className="scroll-mt-20 border-y border-[#dce7e1] bg-[#f5efe4] px-4 py-14 sm:px-6 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><p className="jk-label mb-2">Cara kerja</p><h2 className="font-[family-name:var(--font-display)] text-3xl text-[#18352f] sm:text-4xl">Dari kebutuhan ke pilihan yang lebih yakin.</h2><div className="mt-9 grid gap-5 md:grid-cols-3">{steps.map(([number, title, text]) => <article key={number} className="rounded-[20px] border border-[#dce7e1] bg-[#fffcf7] p-6"><span className="text-sm font-extrabold text-[#c9784a]">{number}</span><h3 className="mt-8 text-base font-extrabold text-[#18352f]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#60736d]">{text}</p></article>)}</div></div></section>

      <section className="border-y border-[#31564c] bg-[#18352f] px-4 py-14 text-[#fffcf7] sm:px-6 sm:py-16 lg:px-8"><div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_auto]"><div className="max-w-2xl"><p className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#b9d5c7]"><FiCpu className="h-4 w-4 text-[#c9784a]" /> Asisten JeJakos</p><h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">Punya kriteria spesifik?</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#c6d7cf]">Buka chatbot untuk memulai percakapan tentang kawasan, harga, fasilitas, atau tipe kos.</p><div className="mt-5 flex flex-wrap gap-2">{['Kos dekat UNJA Mendalo', 'Kos putri ada WiFi & AC', 'Kos murah budget 600rb'].map((prompt) => <button key={prompt} type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))} className="min-h-11 rounded-full border border-[#6d9788] px-3.5 text-xs font-bold text-[#fffcf7] hover:bg-[#31564c]">{prompt}</button>)}</div></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#c9784a] px-5 text-sm font-extrabold text-white hover:-translate-y-0.5 hover:bg-[#b76238]"><FiMessageCircle className="h-4 w-4" /> Buka JeJakos Bot</button></div></section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"><div className="mb-9 max-w-xl"><p className="jk-label mb-2">Mengapa JeJakos</p><h2 className="font-[family-name:var(--font-display)] text-3xl text-[#18352f] sm:text-4xl">Lebih tenang saat memilih tempat tinggal.</h2></div><div className="grid gap-5 sm:grid-cols-3">{trustItems.map(({ icon: Icon, title, text }) => <article key={title} className="jk-card jk-card-interactive p-6"><div className="mb-8 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e6eee9] text-[#1f6b58]"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="text-base font-extrabold text-[#18352f]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#60736d]">{text}</p></article>)}</div></section>

      <section className="bg-[#e6eee9] px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><p className="jk-label mb-2">Untuk pemilik kos</p><h2 className="font-[family-name:var(--font-display)] text-3xl text-[#18352f]">Siap memperkenalkan kos Anda?</h2><p className="mt-2 text-sm text-[#60736d]">Daftarkan akun pemilik untuk mulai mengelola listing.</p></div><Link to="/register?role=pemilik" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#1f6b58] px-5 text-sm font-extrabold text-white hover:bg-[#18352f]">Daftar sebagai pemilik <FiArrowRight className="h-4 w-4" /></Link></div></section>

      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20"><p className="jk-label mb-2">Pertanyaan umum</p><h2 className="font-[family-name:var(--font-display)] text-3xl text-[#18352f] sm:text-4xl">Sebelum mulai mencari</h2><div className="mt-7 divide-y divide-[#dce7e1] border-y border-[#dce7e1]">{faqs.map(([question, answer], index) => { const isOpen = openFaq === index; const panelId = `faq-panel-${index}`; return <div key={question}><button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenFaq(isOpen ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-sm font-extrabold text-[#18352f]"><span>{question}</span><FiChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button><div id={panelId} hidden={!isOpen} className="pb-5 pr-8 text-sm leading-6 text-[#60736d]">{answer}</div></div>; })}</div></section>
    </div>
  );
}
