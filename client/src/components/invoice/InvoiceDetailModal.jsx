import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';
import api from '../../services/api';

const STATUS_CONFIG = {
  unpaid: {
    label: 'Belum Dibayar',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⏳',
    desc: 'Tagihan sewa menunggu pembayaran sebelum jatuh tempo.',
  },
  overdue: {
    label: 'Lewat Jatuh Tempo',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: '⚠️',
    desc: 'Tanggal jatuh tempo telah lewat. Mohon segera lunasi pembayaran.',
  },
  paid: {
    label: 'Lunas',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: '✓',
    desc: 'Pembayaran telah dikonfirmasi dan tercatat lunas di sistem.',
  },
};

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onPaymentInitiated,
}) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  if (!isOpen || !invoice) return null;

  const statusInfo = STATUS_CONFIG[invoice.status] || {
    label: invoice.status,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: '•',
    desc: '',
  };

  const isUnpaid = invoice.status === 'unpaid' || invoice.status === 'overdue';

  const handlePayNow = async () => {
    setPaying(true);
    setPayError('');
    try {
      const res = await api.post(`/invoices/${invoice.id}/pay`);
      const { redirect_url, token, order_id } = res.data;

      if (onPaymentInitiated) {
        onPaymentInitiated({ invoice, redirect_url, token, order_id });
      }

      if (redirect_url) {
        window.open(redirect_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setPayError(err.response?.data?.error || 'Gagal menyiapkan pembayaran Midtrans');
    } finally {
      setPaying(false);
    }
  };

  const ownerPhone = invoice.owner?.phone;
  const waUrl = ownerPhone
    ? `https://wa.me/${ownerPhone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Halo ${invoice.owner?.name || 'Bapak/Ibu'}, mengenai tagihan sewa #${invoice.id} sebesar ${formatCurrency(
          invoice.amount
        )} untuk kamar ${invoice.room?.room_number || ''} di ${invoice.kos?.name || ''}.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-100 text-left my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xl">{statusInfo.icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Tagihan #{invoice.id}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dibuat pada{' '}
                {new Date(invoice.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Amount & Status Banner */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex justify-between gap-3 items-baseline">
            <span className="text-xs text-slate-500 font-medium">Jumlah Tagihan</span>
            <span className="shrink-0 text-right text-xl sm:text-2xl font-extrabold text-emerald-700">
              {formatCurrency(invoice.amount)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex justify-between gap-3 items-center text-xs">
            <span className="text-slate-500">Batas Waktu (Jatuh Tempo)</span>
            <span
              className={`shrink-0 text-right font-bold ${
                invoice.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {invoice.due_date}
            </span>
          </div>

          {invoice.paid_at && (
            <div className="flex justify-between gap-3 items-center text-xs">
              <span className="text-slate-500">Waktu Pembayaran</span>
              <span className="shrink-0 text-right font-semibold text-emerald-700">
                {new Date(invoice.paid_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {invoice.payment_method && (
            <div className="flex justify-between gap-3 items-center text-xs">
              <span className="text-slate-500">Metode Bayar</span>
              <span className="min-w-0 text-right font-bold uppercase text-slate-800">
                {invoice.payment_method === 'manual'
                  ? 'Catatan Manual Pemilik'
                  : invoice.payment_method}
              </span>
            </div>
          )}

          {invoice.payment_ref && (
            <div className="flex justify-between gap-3 items-center text-xs">
              <span className="text-slate-500">Referensi / No. Trx</span>
              <span className="min-w-0 font-mono text-[11px] text-slate-700 truncate max-w-[200px]">
                {invoice.payment_ref}
              </span>
            </div>
          )}
        </div>

        {/* Kos & Unit Information */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Rincian Sewa
          </span>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3.5">
            {invoice.kos?.primary_photo ? (
              <img
                src={getPhotoUrl(invoice.kos?.primary_photo)}
                alt={invoice.kos?.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                KOS
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-0.5 text-xs">
              <Link
                to={`/kos/${invoice.kos?.id}`}
                className="font-bold text-slate-900 hover:text-emerald-700 transition block truncate"
              >
                {invoice.kos?.name}
              </Link>
              <p className="text-[11px] text-slate-500 truncate">
                📍 {invoice.kos?.address}, {invoice.kos?.district}
              </p>
              <p className="font-semibold text-emerald-800 text-[11px] pt-0.5">
                Unit: {invoice.room?.room_number || `Kamar #${invoice.room?.id}`} (
                {invoice.room?.pay_period || 'bulanan'})
              </p>
            </div>
          </div>
        </div>

        {/* Owner Contact */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Pemilik Kos
            </span>
            <span className="font-bold text-slate-800">{invoice.owner?.name || 'Bapak/Ibu'}</span>
          </div>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="py-1 px-3 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        {/* Error notification */}
        {payError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
            {payError}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>

          {isUnpaid && (
            <button
              type="button"
              disabled={paying}
              onClick={handlePayNow}
              className="py-2.5 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>💳</span>
              <span>{paying ? 'Menyiapkan...' : 'Bayar via QRIS Midtrans'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
