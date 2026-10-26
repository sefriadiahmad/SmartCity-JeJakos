import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { formatCurrency } from '../../../utils/formatCurrency';
import { getPhotoUrl } from '../../../utils/imageUrl';
import ManualPaymentModal from './ManualPaymentModal';

const TABS = [
  { id: 'unpaid', label: 'Belum Dibayar' },
  { id: 'overdue', label: 'Lewat Jatuh Tempo' },
  { id: 'paid', label: 'Lunas' },
  { id: 'all', label: 'Semua Tagihan' },
];

const STATUS_CONFIG = {
  unpaid: {
    label: 'Belum Dibayar',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⏳',
  },
  overdue: {
    label: 'Lewat Jatuh Tempo',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '⚠️',
  },
  paid: {
    label: 'Lunas',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '✓',
  },
};

export default function TagihanPenghuniTab({ kosList = [], onStatsUpdated }) {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKosFilter, setSelectedKosFilter] = useState('');

  // Modals & Feedback
  const [manualPaymentInvoice, setManualPaymentInvoice] = useState(null);
  const [remindingId, setRemindingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/invoices', { params: { limit: 100 } });
      const data = res.data?.invoices || [];
      setInvoices(data);
      if (onStatsUpdated) {
        onStatsUpdated(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat tagihan penghuni');
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get('/invoices', { params: { limit: 100 } });
        const data = res.data?.invoices || [];
        if (active) {
          setInvoices(data);
          if (onStatsUpdated) onStatsUpdated(data);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Gagal memuat tagihan penghuni');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [onStatsUpdated]);

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

  // Total sums
  const totals = useMemo(() => {
    let unpaidSum = 0;
    let overdueSum = 0;
    let paidSum = 0;

    invoices.forEach((inv) => {
      const amt = parseFloat(inv.amount) || 0;
      if (inv.status === 'unpaid') unpaidSum += amt;
      else if (inv.status === 'overdue') overdueSum += amt;
      else if (inv.status === 'paid') paidSum += amt;
    });

    return {
      unpaidSum,
      overdueSum,
      paidSum,
      outstandingSum: unpaidSum + overdueSum,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (activeTab === 'unpaid') {
      list = list.filter((i) => i.status === 'unpaid');
    } else if (activeTab === 'overdue') {
      list = list.filter((i) => i.status === 'overdue');
    } else if (activeTab === 'paid') {
      list = list.filter((i) => i.status === 'paid');
    }

    if (selectedKosFilter) {
      list = list.filter((i) => String(i.kos?.id) === String(selectedKosFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.tenant?.name?.toLowerCase().includes(q) ||
          i.tenant?.phone?.includes(q) ||
          i.room?.room_number?.toLowerCase().includes(q) ||
          i.kos?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [invoices, activeTab, selectedKosFilter, searchQuery]);

  // Send single reminder (F-35)
  const handleSendReminder = async (invoice) => {
    setRemindingId(invoice.id);
    setActionFeedback(null);
    try {
      await api.post(`/invoices/${invoice.id}/remind`, {
        note: `Pengingat pembayaran sewa kos kamar ${
          invoice.room?.room_number || ''
        } sebesar ${formatCurrency(invoice.amount)}`,
      });

      setActionFeedback({
        type: 'success',
        text: `Pengingat tagihan #${invoice.id} berhasil dikirimkan ke ${
          invoice.tenant?.name || 'penyewa'
        } via notifikasi in-app dan email.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Gagal mengirimkan pengingat tagihan',
      });
    } finally {
      setRemindingId(null);
    }
  };

  // Payment recorded handler (F-33)
  const handlePaymentRecorded = (updatedInvoice) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === updatedInvoice.id ? updatedInvoice : i))
    );
    setActionFeedback({
      type: 'success',
      text: `Pembayaran tagihan #${updatedInvoice.id} dari ${
        updatedInvoice.tenant?.name || 'Penyewa'
      } berhasil dicatat LUNAS. Status sewa penghuni otomatis diperbarui.`,
    });
  };

  const handleStartChat = async (invoice) => {
    try {
      const res = await api.post('/conversations', {
        kos_id: invoice.kos?.id,
        recipient_id: invoice.tenant?.id,
      });
      const convId = res.data?.conversation?.id;
      if (convId) {
        navigate(`/conversations?id=${convId}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memulai percakapan');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200/80 shadow-xs">
          <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">
            Total Belum Terbayar
          </p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">
            {formatCurrency(totals.outstandingSum)}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {tabCounts.unpaid + tabCounts.overdue} tagihan aktif
          </p>
        </div>

        <div className="p-5 bg-rose-50/70 rounded-2xl border border-rose-200/80 shadow-xs">
          <p className="text-xs font-medium text-rose-800 uppercase tracking-wider">
            Tertunggak / Lewat Tempo
          </p>
          <p className="text-2xl font-extrabold text-rose-900 mt-1">
            {formatCurrency(totals.overdueSum)}
          </p>
          <p className="text-[11px] text-rose-700 mt-0.5">
            {tabCounts.overdue} tagihan perlu diingatkan
          </p>
        </div>

        <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 shadow-xs">
          <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
            Penerimaan Sewa Lunas
          </p>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">
            {formatCurrency(totals.paidSum)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            {tabCounts.paid} pembayaran tercatat
          </p>
        </div>
      </div>

      {/* Action feedback banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span>{actionFeedback.type === 'success' ? '✓' : '⚠️'}</span>
            <span className="font-semibold break-words">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => {
            const count = tabCounts[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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

        {/* Filter by Kos & Search Bar */}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {kosList.length > 1 && (
            <select
              value={selectedKosFilter}
              onChange={(e) => setSelectedKosFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 sm:w-auto"
            >
              <option value="">Semua Kos Anda</option>
              {kosList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari penyewa, kamar..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent" />
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
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 text-slate-400 text-2xl flex items-center justify-center font-bold border border-slate-200">
            🧾
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {searchQuery || selectedKosFilter
                ? 'Tidak Ada Tagihan yang Cocok'
                : 'Tidak Ada Tagihan di Kategori Ini'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              {searchQuery || selectedKosFilter
                ? 'Coba ganti filter kos atau kata kunci pencarian.'
                : 'Tagihan sewa penghuni akan otomatis tercatat di sini saat pemesanan kamar disetujui.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => {
            const badge = STATUS_CONFIG[inv.status] || {
              label: inv.status,
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
              icon: '•',
            };

            const isUnpaid = inv.status === 'unpaid' || inv.status === 'overdue';
            const isReminding = remindingId === inv.id;

            const waUrl = inv.tenant?.phone
              ? `https://wa.me/${inv.tenant.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Halo ${inv.tenant.name || 'Penyewa'}, mengenai tagihan sewa kamar ${
                    inv.room?.room_number || ''
                  } di ${inv.kos?.name || ''} sebesar ${formatCurrency(
                    inv.amount
                  )} yang jatuh tempo pada ${inv.due_date}.`
                )}`
              : null;

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
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Body Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Column 1: Penghuni */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Penyewa Kamar
                    </span>
                    <div className="flex items-center gap-3">
                      {inv.tenant?.photo_url ? (
                        <img
                          src={getPhotoUrl(inv.tenant?.photo_url)}
                          alt={inv.tenant?.name}
                          className="w-10 h-10 rounded-full object-cover border border-emerald-500 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {(inv.tenant?.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <p className="font-bold text-slate-900 truncate">
                          {inv.tenant?.name || 'Penyewa'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {inv.tenant?.phone || 'No. HP belum diisi'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Rincian Kamar & Biaya */}
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Properti & Unit
                    </span>
                    <p className="font-bold text-slate-900 truncate">{inv.kos?.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-semibold">
                        Unit: {inv.room?.room_number || `Kamar #${inv.room?.id}`}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(inv.amount)}
                      </span>
                    </div>

                    {inv.paid_at && (
                      <p className="text-[11px] text-emerald-700 font-medium pt-0.5">
                        ✓ Lunas pada{' '}
                        {new Date(inv.paid_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        ({inv.payment_method === 'manual' ? 'Tunai' : inv.payment_method?.toUpperCase()})
                      </p>
                    )}

                    {inv.payment_ref && (
                      <p className="text-[10px] text-slate-400 italic line-clamp-1">
                        Ket: &ldquo;{inv.payment_ref}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Column 3: Actions for Owner (F-33, F-35) */}
                  <div className="space-y-2 md:pl-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tindakan
                    </span>

                    {/* Tombol Catat Bayar Manual (F-33) */}
                    {isUnpaid ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setManualPaymentInvoice(inv)}
                          className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>💵</span>
                          <span>Catat Bayar Manual</span>
                        </button>

                        {/* Tombol Kirim Pengingat (F-35) */}
                        <button
                          type="button"
                          disabled={isReminding}
                          onClick={() => handleSendReminder(inv)}
                          className="w-full py-1.5 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span>🔔</span>
                          <span>{isReminding ? 'Mengirim...' : 'Kirim Pengingat'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                        <span className="text-xs font-bold text-emerald-800 block">
                          ✓ Pembayaran Selesai
                        </span>
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          Metode: {inv.payment_method?.toUpperCase() || 'MANUAL'}
                        </span>
                      </div>
                    )}

                    {/* Contacts */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStartChat(inv)}
                        className="flex-1 py-1.5 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>💬</span>
                        <span>Chat</span>
                      </button>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 px-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition text-center shadow-xs"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Payment Modal (F-33) */}
      <ManualPaymentModal
        isOpen={Boolean(manualPaymentInvoice)}
        onClose={() => setManualPaymentInvoice(null)}
        invoice={manualPaymentInvoice}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
}
