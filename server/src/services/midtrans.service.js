const crypto = require('crypto');
const InvoiceModel = require('../models/invoice.model');
const BookingModel = require('../models/booking.model');

const MIDTRANS_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';

function getServerKey() {
  return process.env.MIDTRANS_SERVER_KEY || '';
}

function getClientKey() {
  return process.env.MIDTRANS_CLIENT_KEY || '';
}

function verifySignature(orderId, statusCode, grossAmount, signatureKey) {
  const serverKey = getServerKey();
  if (!serverKey) return true;

  // Format amount: strip trailing zeros if whole or match Midtrans format
  const formattedGross = String(grossAmount).includes('.')
    ? String(grossAmount)
    : `${grossAmount}.00`;

  // Standard signature: SHA512(order_id + status_code + gross_amount + ServerKey)
  const hash1 = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  const hash2 = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${formattedGross}${serverKey}`)
    .digest('hex');

  return signatureKey === hash1 || signatureKey === hash2;
}

const MidtransService = {
  getServerKey,
  getClientKey,
  verifySignature,

  /**
   * Create a Snap payment transaction (QRIS, VA, E-Wallet) for an invoice (F-32)
   */
  async createSnapTransaction(invoice) {
    const serverKey = getServerKey();
    const orderId = `INV-${invoice.id}-${Date.now()}`;
    const grossAmount = Math.round(invoice.amount);

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: String(invoice.id),
          price: grossAmount,
          quantity: 1,
          name: `Sewa ${invoice.kos?.name || 'Kos'} - ${
            invoice.room?.room_number || 'Kamar'
          }`.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: invoice.tenant?.name || 'Pencari Kos',
        email: invoice.tenant?.email || 'tenant@jejakos.id',
        phone: invoice.tenant?.phone || '081234567890',
      },
      enabled_payments: [
        'gopay',
        'shopeepay',
        'other_qris',
        'bca_va',
        'bni_va',
        'bri_va',
        'permata_va',
        'bank_transfer',
      ],
    };

    // If server key is configured with a valid key, call Midtrans Sandbox API
    if (serverKey && serverKey.length > 5 && !serverKey.startsWith('mock_')) {
      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
      const response = await fetch(MIDTRANS_SNAP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error_messages
            ? data.error_messages.join(', ')
            : 'Gagal membuat transaksi di Midtrans'
        );
      }

      return {
        token: data.token,
        redirect_url: data.redirect_url,
        order_id: orderId,
        gross_amount: grossAmount,
      };
    }

    // Demo/Sandbox fallback mode if MIDTRANS_SERVER_KEY is not configured
    const mockToken = `snap_mock_${invoice.id}_${Date.now()}`;
    return {
      token: mockToken,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`,
      order_id: orderId,
      gross_amount: grossAmount,
      is_mock: true,
    };
  },

  /**
   * Handle Midtrans Webhook Notification Callback (F-32, F-30)
   */
  async handleNotification(payload) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      settlement_time,
    } = payload;

    if (!order_id) {
      throw new Error('order_id tidak ditemukan dalam payload notifikasi');
    }

    // Verify signature if provided
    if (signature_key && !verifySignature(order_id, status_code, gross_amount, signature_key)) {
      throw new Error('Signature Midtrans tidak valid');
    }

    // Extract invoice ID from order_id (e.g. INV-12-1718900000 -> 12)
    const parts = order_id.split('-');
    const invoiceId = parseInt(parts[1], 10);
    if (isNaN(invoiceId)) {
      throw new Error(`Format order_id tidak valid: ${order_id}`);
    }

    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Tagihan dengan ID ${invoiceId} tidak ditemukan`);
    }

    let isPaid = false;

    // Check payment status from Midtrans
    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        isPaid = true;
      }
    } else if (transaction_status === 'settlement') {
      isPaid = true;
    }

    if (isPaid) {
      const paidAt = settlement_time ? new Date(settlement_time) : new Date();
      const paymentMethod = payment_type?.includes('qris')
        ? 'qris'
        : payment_type === 'bank_transfer'
        ? 'transfer'
        : payment_type || 'qris';

      await InvoiceModel.updateStatus(invoice.id, {
        status: 'paid',
        payment_method: paymentMethod,
        payment_ref: transaction_id || order_id,
        paid_at: paidAt,
      });

      // F-30: Catat penghuni aktif setelah pemesanan diterima & dibayar
      if (invoice.booking_id) {
        const booking = await BookingModel.findById(invoice.booking_id);
        if (booking && (booking.status === 'accepted' || booking.status === 'pending')) {
          await BookingModel.recordActiveTenant(
            booking.id,
            `Pembayaran sewa lunas via Midtrans (${paymentMethod.toUpperCase()})`
          );
        }
      }

      return {
        success: true,
        status: 'paid',
        invoice_id: invoice.id,
        payment_method: paymentMethod,
      };
    }

    if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      return {
        success: true,
        status: transaction_status,
        invoice_id: invoice.id,
      };
    }

    return {
      success: true,
      status: transaction_status || 'pending',
      invoice_id: invoice.id,
    };
  },
};

module.exports = MidtransService;
