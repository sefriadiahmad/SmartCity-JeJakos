import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/home/HomePage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/kos"
              element={
                <div className="max-w-7xl mx-auto px-4 py-8 w-full text-center">
                  <h1 className="text-2xl font-bold text-slate-900">Daftar Kos</h1>
                  <p className="text-sm text-slate-600 mt-2">
                    Halaman hasil pencarian dan peta (siap untuk task T-24 ~ T-27).
                  </p>
                </div>
              }
            />
            <Route
              path="/login"
              element={
                <div className="max-w-md mx-auto px-4 py-12 w-full text-center">
                  <h1 className="text-2xl font-bold text-slate-900">Masuk ke JeJakos</h1>
                  <p className="text-sm text-slate-600 mt-2">Siap untuk task T-12.</p>
                </div>
              }
            />
            <Route
              path="/register"
              element={
                <div className="max-w-md mx-auto px-4 py-12 w-full text-center">
                  <h1 className="text-2xl font-bold text-slate-900">Daftar Akun Baru</h1>
                  <p className="text-sm text-slate-600 mt-2">Siap untuk task T-12.</p>
                </div>
              }
            />
            <Route
              path="*"
              element={
                <div className="max-w-md mx-auto px-4 py-16 text-center">
                  <h1 className="text-3xl font-bold text-slate-900">404</h1>
                  <p className="text-sm text-slate-600 mt-2">Halaman tidak ditemukan.</p>
                </div>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
