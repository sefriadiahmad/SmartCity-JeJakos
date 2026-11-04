import { useState } from 'react';
import {
  FiCreditCard,
  FiX,
  FiCheck,
  FiSmartphone,
  FiExternalLink,
  FiRefreshCw,
  FiZap,
} from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

function PaymentModalContent({ onClose, paymentData, onPaymentSuccess }) {
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [statusMessage, setStatusMessage] = useState('');

  const invoice = paymentData?.invoice;
  const redirectUrl = paymentData?.redirect_url;
  const orderId = paymentData?.order_id;
  const amount = paymentData?.amount || invoice?.amount;

  // Direct open Midtrans gateway
  const handleOpenGateway = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Check payment status from backend
  const handleCheckStatus = async () => {
    if (!invoice?.id) return;
    setChecking(true);
    setStatusMessage('');
    try {
      const res = await api.get(`/invoices/${invoice.id}`);
      const latestInvoice = res.data?.invoice;

      if (latestInvoice?.status === 'paid') {
        setPaymentStatus('paid');
        setStatusMessage('Pembayaran berhasil dikonfirmasi! Tagihan Anda telah lunas.');
        if (onPaymentSuccess) {
          onPaymentSuccess(latestInvoice);
        }
      } else {
        setStatusMessage('Pembayaran belum diterima. Silakan selesaikan pembayaran via QRIS.');
      }
    } catch {
      setStatusMessage('Gagal memeriksa status pembayaran. Silakan coba lagi.');
    } finally {
      setChecking(false);
    }
  };

  // Sandbox simulation helper for demonstration & testing
  const handleSimulatePayment = async () => {
    if (!orderId && !invoice?.id) return;
    setSimulating(true);
    setStatusMessage('');
    try {
      const currentOrderId = orderId || `INV-${invoice.id}-${Date.now()}`;
      await api.post('/payments/callback', {
        order_id: currentOrderId,
        status_code: '200',
        gross_amount: String(amount || invoice.amount),
        transaction_status: 'settlement',
        payment_type: 'qris',
        transaction_id: `mock-trx-${Date.now()}`,
        settlement_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      setPaymentStatus('paid');
      setStatusMessage('Simulasi pembayaran sandbox berhasil! Tagihan otomatis tercatat lunas.');

      // Refresh invoice
      const res = await api.get(`/invoices/${invoice.id}`);
      if (onPaymentSuccess && res.data?.invoice) {
        onPaymentSuccess(res.data.invoice);
      }
    } catch (err) {
      setStatusMessage(err.response?.data?.error || 'Gagal menjalankan simulasi pembayaran');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-100 text-left my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl text-emerald-600">
              <FiCreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pembayaran Tagihan Sewa
              </h3>
              <p className="text-xs text-slate-500">Gateway Midtrans Sandbox (QRIS)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Success Screen */}
        {paymentStatus === 'paid' ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              <FiCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-900">Pembayaran Berhasil!</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {statusMessage || 'Tagihan sewa kamar Anda telah lunas terbayar via QRIS.'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dibayar</span>
                <span className="font-extrabold text-emerald-700">
                  {formatCurrency(amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode</span>
                <span className="font-bold text-slate-800 uppercase">QRIS / E-Wallet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-700">Lunas (Paid)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        ) : (
          /* Payment Prompt & Gateway Links */
          <div className="space-y-4">
            {/* Amount Box */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-1 text-center">
              <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider block">
                Total yang Harus Dibayar
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 block">
                {formatCurrency(amount)}
              </span>
              <span className="text-[11px] text-emerald-800 font-semibold block pt-0.5">
                {invoice?.kos?.name} — {invoice?.room?.room_number || 'Kamar Pilihan'}
              </span>
            </div>

            {/* QRIS & Payment Methods Badges */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Metode Pembayaran yang Didukung:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'QRIS (Semua E-Wallet & M-Banking)',
                  'GoPay',
                  'ShopeePay',
                  'BCA VA',
                  'BNI VA',
                  'BRI VA',
                  'Mandiri',
                ].map((method) => (
                  <span
                    key={method}
                    className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Status message notice */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {statusMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleOpenGateway}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiSmartphone className="w-4 h-4" />
                <span>Buka Halaman Pembayaran QRIS</span>
                <FiExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={checking}
                onClick={handleCheckStatus}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Memeriksa...' : 'Cek Status Pembayaran'}</span>
              </button>

              {/* Demo Sandbox Simulator Helper */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={simulating}
                  onClick={handleSimulatePayment}
                  className="w-full py-2 px-3 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FiZap className="w-3.5 h-3.5" />
                  <span>
                    {simulating ? 'Menyimulasikan...' : 'Simulasikan Bayar Lunas (Mode Sandbox)'}
                  </span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Fitur simulasi sandbox untuk menguji webhook konfirmasi bayar otomatis tanpa saldo
                  nyata.
                </p>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="py-1 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentModal({
  isOpen,
  onClose,
  paymentData, // { invoice, redirect_url, token, order_id, amount }
  onPaymentSuccess,
}) {
  if (!isOpen || !paymentData) return null;

  return (
    <PaymentModalContent
      key={`${paymentData.invoice?.id}_${paymentData.order_id || 'pay'}`}
      onClose={onClose}
      paymentData={paymentData}
      onPaymentSuccess={onPaymentSuccess}
    />
  );
}
