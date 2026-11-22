const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#31564c] bg-[#18352f] py-10 text-[#c6d7cf]">
      <div className="mx-auto max-w-7xl px-4 text-center sm:flex sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <div>
          <p className="font-semibold text-lg text-[#fffcf7]">JeJakos</p>
          <p className="mt-1 text-xs text-[#c6d7cf]">
            Digitalisasi Rekam Jejak & Pemasaran Hunian Sewa Provinsi Jambi
          </p>
          <p className="mt-0.5 text-xs text-[#91b3a6]">Jambi Smart City Application Challenge 2026</p>
        </div>
        <div className="mt-4 text-xs text-[#91b3a6] sm:mt-0">
          &copy; {CURRENT_YEAR} Tim Tri Nova - Universitas Nurdin Hamzah
        </div>
      </div>
    </footer>
  );
}
