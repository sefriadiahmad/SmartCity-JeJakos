import { Link } from 'react-router-dom';

const CURRENT_YEAR = new Date().getFullYear();

const quickLinks = [
  { label: 'Beranda', to: '/' },
  { label: 'Cari Kos', to: '/kos' },
  { label: 'Untuk Pemilik', to: '/register?role=pemilik' },
  { label: 'Masuk', to: '/login' },
  { label: 'Daftar', to: '/register' },
];

export default function Footer() {
  return (
    <footer className="mt-auto overflow-hidden border-t border-[#31564c] bg-[#18352f] text-[#c6d7cf]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          <div>
            <Link to="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg text-[#fffcf7] focus-visible:outline-3 focus-visible:outline-[#c9784a] focus-visible:outline-offset-3">
              <img src="/logo_jejakos.png" alt="" className="h-11 w-11 object-contain" />
              <span className="font-[var(--font-display)] text-2xl">JeJakos</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#c6d7cf]">
              Platform pencarian dan pengelolaan hunian sewa yang membantu warga Jambi menemukan tempat tinggal dengan lebih mudah.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#91b3a6]">Temukan hunian, mulai jejak baru.</p>
          </div>

          <nav aria-label="Tautan cepat">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#fffcf7]">Tautan cepat</h2>
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-flex min-h-11 items-center rounded-lg py-2 text-sm text-[#c6d7cf] underline-offset-4 hover:text-[#fffcf7] hover:underline focus-visible:outline-3 focus-visible:outline-[#c9784a] focus-visible:outline-offset-3"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#fffcf7]">Tetap terhubung</h2>
            <p className="mt-5 text-sm text-[#c6d7cf]">Jambi, Indonesia</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#91b3a6]">Masuk untuk mengakses fitur Pesan dan terhubung dengan pengguna JeJakos.</p>
            <Link
              to="/login"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#c9784a] px-5 py-2.5 text-sm font-bold text-[#18352f] shadow-sm hover:bg-[#d4865b] focus-visible:outline-3 focus-visible:outline-[#fffcf7] focus-visible:outline-offset-3"
            >
              Masuk untuk mulai
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-[#31564c] pt-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="text-xs text-[#91b3a6]">&copy; {CURRENT_YEAR} JeJakos - All Rights Reserved</p>
          <p className="mt-2 text-xs text-[#91b3a6] sm:mt-0">Platform Aplikasi Berbasis Web Untuk Pencarian Hunian Sewa Kos By <a href="https://www.sefriadiahmad.site/" target="_blank" rel="noopener noreferrer" className="text-[#c9784a] hover:underline">sefriadiahmad.site</a></p>
        </div>

        <p aria-hidden="true" className="-mb-6 mt-8 whitespace-nowrap text-[clamp(4rem,14vw,11rem)] font-bold leading-[0.7] tracking-[-0.08em] text-[#21483e]">
          JeJakos
        </p>
      </div>
    </footer>
  );
}
