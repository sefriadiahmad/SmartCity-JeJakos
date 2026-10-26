const MidtransService = require('../services/midtrans.service');

const PaymentController = {
  /**
   * POST /api/payments/callback — Webhook notifikasi pembayaran Midtrans (F-32, F-30)
   */
  async handleCallback(req, res, next) {
    try {
      const payload = req.body;
      const result = await MidtransService.handleNotification(payload);
      // Midtrans expects HTTP 200 with status ok
      res.status(200).json({
        status: 'ok',
        invoice_id: result.invoice_id,
        payment_status: result.status,
        payment_method: result.payment_method,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

module.exports = PaymentController;
