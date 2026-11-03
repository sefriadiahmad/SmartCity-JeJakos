import { BrowserRouter as Router, Outlet, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ProfilePage from './pages/profile/ProfilePage';
import SearchResultsPage from './pages/kos/SearchResultsPage';
import KosDetailPage from './pages/kos/KosDetailPage';
import PemilikDashboard from './pages/dashboard/PemilikDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersTab from './pages/admin/UsersTab';
import KosTab from './pages/admin/KosTab';
import RoomsTab from './pages/admin/RoomsTab';
import ReviewsTab from './pages/admin/ReviewsTab';
import ConversationsPage from './pages/chat/ConversationsPage';
import MyBookingsPage from './pages/booking/MyBookingsPage';
import MyInvoicesPage from './pages/invoice/MyInvoicesPage';
import ComplaintsPage from './pages/complaint/ComplaintsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { AuthProvider } from './context/AuthContext';

function PublicLayout() {
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800"><Navbar /><main className="flex flex-1 flex-col"><Outlet /></main><Footer /><ChatbotWidget /></div>;
}

function AuthLayout() {
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800"><main className="flex flex-1 flex-col"><Outlet /></main></div>;
}

export default function App() {
  return <AuthProvider><Router><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/kos" element={<SearchResultsPage />} />
      <Route path="/kos/:id" element={<KosDetailPage />} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/dashboard/search" element={<SearchResultsPage />} />
        <Route path="/invoices" element={<MyInvoicesPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route element={<ProtectedRoute allowedRoles={['pemilik', 'admin']} />}>
          <Route path="/dashboard" element={<PemilikDashboard />} />
          <Route path="/my-kos" element={<PemilikDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersTab />} />
          <Route path="/admin/kos" element={<KosTab />} />
          <Route path="/admin/rooms" element={<RoomsTab />} />
          <Route path="/admin/reviews" element={<ReviewsTab />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<div className="mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-3xl font-bold text-slate-900">404</h1><p className="mt-2 text-sm text-slate-600">Halaman tidak ditemukan.</p></div>} />
  </Routes></Router></AuthProvider>;
}
