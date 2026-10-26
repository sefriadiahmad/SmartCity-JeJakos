import { useState } from 'react';
import api from '../../../services/api';
import { formatCurrency } from '../../../utils/formatCurrency';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function ManualPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}) {
  const [paymentMethod, setPaymentMethod] = useState('manual');
  const [paymentRef, setPaymentRef] = useState('Tunai diterima langsung oleh pemilik kos');
  const [paidAtDate, setPaidAtDate] = useState(getTodayDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        payment_method: paymentMethod,
        payment_ref: paymentRef ? paymentRef.trim() : null,
        paid_at: paidAtDate ? `${paidAtDate} 12:00:00` : null,
      };

      const res = await api.post(`/invoices/${invoice.id}/manual`, payload);
      const updatedInvoice = res.data?.invoice;

      if (onPaymentRecorded) {
        onPaymentRecorded(updatedInvoice || { ...invoice, status: 'paid', payment_method: paymentMethod });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mencatat pembayaran manual');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-100 text-left my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Catat Pembayaran Manual
              </h3>
              <p className="text-xs text-slate-500">Tagihan #{invoice.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Invoice Summary Box */}
        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-1.5 text-xs">
          <div className="flex justify-between items-baseline">
            <span className="text-emerald-800 font-medium">Jumlah Tagihan</span>
            <span className="text-lg font-extrabold text-emerald-800">
              {formatCurrency(invoice.amount)}
            </span>
          </div>
          <div className="flex justify-between text-emerald-900">
            <span>Penyewa:</span>
            <span className="font-bold">{invoice.tenant?.name || 'Penyewa'}</span>
          </div>
          <div className="flex justify-between gap-3 text-emerald-900">
            <span className="shrink-0">Kamar:</span>
            <span className="min-w-0 text-right break-words font-bold">
              {invoice.room?.room_number || `Kamar #${invoice.room?.id}`} ({invoice.kos?.name})
            </span>
          </div>
          <div className="flex justify-between text-emerald-900">
            <span>Jatuh Tempo:</span>
            <span>{invoice.due_date}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Metode Pembayaran yang Diterima <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('manual');
                  setPaymentRef('Tunai diterima langsung oleh pemilik kos');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'manual'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>💵</span>
                <span>Uang Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('transfer');
                  setPaymentRef('Transfer langsung ke rekening pemilik');
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🏦</span>
                <span>Transfer Langsung</span>
              </button>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1">
            <label htmlFor="paid_at_date" className="font-bold text-slate-700 block">
              Tanggal Diterima
            </label>
            <input
              id="paid_at_date"
              type="date"
              value={paidAtDate}
              onChange={(e) => setPaidAtDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
              required
            />
          </div>

          {/* Reference / Notes */}
          <div className="space-y-1">
            <label htmlFor="payment_ref" className="font-bold text-slate-700 block">
              Keterangan / Catatan Bukti Bayar
            </label>
            <textarea
              id="payment_ref"
              rows={2}
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              maxLength={255}
              placeholder="Contoh: Diterima tunai di kos / Bukti transfer BCA a.n Ari..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 resize-none"
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Menandai tagihan sebagai lunas akan memperbarui status sewa penghuni secara otomatis di sistem.
          </p>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-2.5 px-4 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>✓</span>
              <span>{submitting ? 'Menyimpan...' : 'Tandai Lunas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
