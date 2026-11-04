import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiCheck,
  FiBell,
  FiX,
  FiSearch,
  FiFileText,
  FiMapPin,
  FiCreditCard,
} from 'react-icons/fi';
import { FaBed } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { socket, connectSocket } from '../../services/socket';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import InvoiceDetailModal from '../../components/invoice/InvoiceDetailModal';
import PaymentModal from '../../components/payment/PaymentModal';

const TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'unpaid', label: 'Belum Dibayar' },
  { id: 'overdue', label: 'Lewat Jatuh Tempo' },
  { id: 'paid', label: 'Lunas' },
];

const STATUS_CONFIG = {
  unpaid: {
    label: 'Belum Dibayar',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: FiClock,
  },
  overdue: {
    label: 'Lewat Jatuh Tempo',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: FiAlertTriangle,
  },
  paid: {
    label: 'Lunas',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: FiCheckCircle,
  },
};

export default function MyInvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'pemilik') {
      navigate('/dashboard?tab=invoices', { replace: true });
    }
  }, [user, navigate]);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [activePaymentData, setActivePaymentData] = useState(null);
  const [reminderToast, setReminderToast] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/invoices', { params: { limit: 100 } });
      setInvoices(res.data?.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat daftar tagihan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get('/invoices', { params: { limit: 100 } });
        if (active) setInvoices(res.data?.invoices || []);
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat daftar tagihan');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    // Socket.IO real-time reminder listener (F-35)
    connectSocket();
    const handleInvoiceReminder = (payload) => {
      setReminderToast({
        title: payload.title || 'Pengingat Tagihan',
        message: payload.message,
        invoiceId: payload.invoice_id,
      });
      // Refresh list to update any state changes
      load();
    };

    socket.on('invoiceReminder', handleInvoiceReminder);

    return () => {
      active = false;
      socket.off('invoiceReminder', handleInvoiceReminder);
    };
  }, []);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: invoices.length, unpaid: 0, overdue: 0, paid: 0 };
    invoices.forEach((inv) => {
      if (inv.status === 'unpaid') counts.unpaid += 1;
      else if (inv.status === 'overdue') counts.overdue += 1;
      else if (inv.status === 'paid') counts.paid += 1;
    });
    return counts;
  }, [invoices]);

  // Total outstanding unpaid / overdue calculation
  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (activeTab === 'unpaid') {
      list = list.filter((i) => i.status === 'unpaid');
    } else if (activeTab === 'overdue') {
      list = list.filter((i) => i.status === 'overdue');
    } else if (activeTab === 'paid') {
      list = list.filter((i) => i.status === 'paid');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.kos?.name?.toLowerCase().includes(q) ||
          i.room?.room_number?.toLowerCase().includes(q) ||
          String(i.id).includes(q)
      );
    }

    return list;
  }, [invoices, activeTab, searchQuery]);

  // Pay invoice via Midtrans QRIS (F-32)
  const handlePay = async (invoice) => {
    setPayingId(invoice.id);
    try {
      const res = await api.post(`/invoices/${invoice.id}/pay`);
      const { redirect_url, token, order_id, amount } = res.data;

      // Automatically open Midtrans QRIS payment gateway
      if (redirect_url) {
        window.open(redirect_url, '_blank', 'noopener,noreferrer');
      }

      // Open payment modal for status checking & QRIS details
      setActivePaymentData({
        invoice,
        redirect_url,
        token,
        order_id,
        amount,
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyiapkan pembayaran');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 text-left">
      {/* Real-time Reminder Toast Notification Banner (F-35) */}
      {reminderToast && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-start gap-2.5 text-xs">
            <FiBell className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-sm text-amber-900">{reminderToast.title}</p>
              <p className="text-amber-800 leading-relaxed">{reminderToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReminderToast(null)}
            aria-label="Tutup"
            className="text-amber-600 hover:text-amber-800 font-bold text-sm cursor-pointer p-0.5"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tagihan Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Riwayat tagihan sewa kos dan pembayaran digital via QRIS Midtrans.
          </p>
        </div>

        <Link
          to="/bookings"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <FaBed className="w-4 h-4 text-emerald-600" />
          <span>Pemesanan Saya</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Perlu Dibayar
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {formatCurrency(totalOutstanding)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {tabCounts.unpaid + tabCounts.overdue} tagihan aktif
          </span>
        </div>

        <div className="p-5 bg-rose-50/60 rounded-3xl border border-rose-200/80 shadow-xs">
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
            Lewat Jatuh Tempo
          </span>
          <span className="text-2xl font-extrabold text-rose-800 block mt-1">
            {tabCounts.overdue} Tagihan
          </span>
          <span className="text-[11px] text-rose-600 block mt-0.5">
            Harap segera diselesaikan
          </span>
        </div>

        <div className="p-5 bg-emerald-50/60 rounded-3xl border border-emerald-200/80 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Riwayat Lunas
          </span>
          <span className="text-2xl font-extrabold text-emerald-900 block mt-1">
            {tabCounts.paid} Pembayaran
          </span>
          <span className="text-[11px] text-emerald-700 block mt-0.5">
            Tercatat di sistem
          </span>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => {
              const count = tabCounts[tab.id] || 0;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kos, kamar, ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              <FiSearch className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs animate-pulse flex flex-col sm:flex-row gap-4"
            >
              <div className="w-full sm:w-36 h-24 bg-slate-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                <div className="h-3 bg-slate-200 rounded-md w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-3">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchInvoices}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-3 p-8">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <FiFileText className="w-7 h-7 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800">
              {searchQuery ? 'Tidak Ada Tagihan yang Cocok' : 'Tidak Ada Tagihan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `Tidak ditemukan tagihan dengan kata kunci "${searchQuery}".`
                : 'Belum ada tagihan dalam kategori ini.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => {
            const badge = STATUS_CONFIG[inv.status] || {
              label: inv.status,
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
              icon: FiClock,
            };
            const BadgeIcon = badge.icon;

            const isUnpaid = inv.status === 'unpaid' || inv.status === 'overdue';
            const isPaying = payingId === inv.id;

            return (
              <div
                key={inv.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-extrabold text-slate-800">Tagihan #{inv.id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">
                      Jatuh tempo:{' '}
                      <strong
                        className={inv.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}
                      >
                        {inv.due_date}
                      </strong>
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${badge.badgeClass}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Main card body */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="w-full md:w-36 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    {inv.kos?.primary_photo ? (
                      <img
                        src={getPhotoUrl(inv.kos?.primary_photo)}
                        alt={inv.kos?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">
                        KOS
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0 text-xs">
                    <Link
                      to={`/kos/${inv.kos?.id}`}
                      className="font-bold text-base text-slate-900 hover:text-emerald-700 transition line-clamp-1"
                    >
                      {inv.kos?.name}
                    </Link>
                    <p className="text-slate-500 line-clamp-1 flex items-center gap-1">
                      <FiMapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{inv.kos?.address}, {inv.kos?.district}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="font-semibold text-slate-700">
                        Unit: {inv.room?.room_number || `Kamar #${inv.room?.id}`}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(inv.amount)}
                      </span>
                    </div>

                    {inv.paid_at && (
                      <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <FiCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Dibayar pada{' '}
                          {new Date(inv.paid_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          via {inv.payment_method?.toUpperCase()}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="w-full md:w-44 flex flex-col gap-2 shrink-0 pt-2 md:pt-0">
                    {isUnpaid ? (
                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={() => handlePay(inv)}
                        className="w-full py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <FiCreditCard className="w-3.5 h-3.5" />
                        <span>{isPaying ? 'Menyiapkan...' : 'Bayar Sekarang'}</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="w-full py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-center"
                    >
                      Lihat Rincian
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onPaymentInitiated={(payPayload) => {
          setSelectedInvoice(null);
          setActivePaymentData(payPayload);
          fetchInvoices();
        }}
      />

      {/* Payment Gateway Redirect & Status Modal (F-32) */}
      <PaymentModal
        isOpen={Boolean(activePaymentData)}
        onClose={() => setActivePaymentData(null)}
        paymentData={activePaymentData}
        onPaymentSuccess={() => {
          fetchInvoices();
        }}
      />
    </div>
  );
}
