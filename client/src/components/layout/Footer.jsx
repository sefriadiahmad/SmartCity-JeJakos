export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left sm:flex sm:justify-between sm:items-center">
        <div>
          <p className="text-white font-semibold text-lg">JeJakos</p>
          <p className="text-xs text-slate-400 mt-1">
            Digitalisasi Rekam Jejak & Pemasaran Hunian Sewa Provinsi Jambi
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Jambi Smart City Application Challenge 2026</p>
        </div>
        <div className="mt-4 sm:mt-0 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Tim Tri Nova - Universitas Nurdin Hamzah
        </div>
      </div>
    </footer>
  );
}
