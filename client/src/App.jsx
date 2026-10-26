import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ProfilePage from './pages/profile/ProfilePage';
import SearchResultsPage from './pages/kos/SearchResultsPage';
import KosDetailPage from './pages/kos/KosDetailPage';
import PemilikDashboard from './pages/dashboard/PemilikDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ConversationsPage from './pages/chat/ConversationsPage';
import MyBookingsPage from './pages/booking/MyBookingsPage';
import MyInvoicesPage from './pages/invoice/MyInvoicesPage';
import ComplaintsPage from './pages/complaint/ComplaintsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/kos" element={<SearchResultsPage />} />
              <Route path="/kos/:id" element={<KosDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conversations"
                element={
                  <ProtectedRoute>
                    <ConversationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <MyInvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/complaints" element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                    <PemilikDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-kos"
                element={
                  <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                    <PemilikDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kos"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
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
          <ChatbotWidget />
        </div>
      </Router>
    </AuthProvider>
  );
}
