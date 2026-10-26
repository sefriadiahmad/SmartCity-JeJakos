const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const InvoiceModel = require('../src/models/invoice.model');
const BookingModel = require('../src/models/booking.model');
const RoomModel = require('../src/models/room.model');
const MidtransService = require('../src/services/midtrans.service');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  console.log(`Payment test server running on port ${port}`);

  // Tokens
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
  // Owner Budi (id: 2)
  const ownerBudiToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  // Tenant Ari (id: 5)
  const tenantAriToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );
  // Tenant Dina (id: 6)
  const tenantDinaToken = jwt.sign(
    { id: 6, email: 'dina.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testBookingId = null;
  let testInvoiceId = null;

  try {
    // 0. Setup: Booking for Room 2 in Kos 1 (owner: Budi, tenant: Ari)
    console.log('0. Setting up test accepted booking & invoice...');
    testBookingId = await BookingModel.create({
      room_id: 2,
      tenant_id: 5,
      status: 'accepted',
      check_in_date: '2026-11-01',
      check_out_date: '2026-12-01',
      notes: 'Test Midtrans QRIS payment',
    });

    testInvoiceId = await InvoiceModel.create({
      booking_id: testBookingId,
      amount: 550000,
      due_date: '2026-11-01',
      status: 'unpaid',
    });

    // 1. Service unit test: createSnapTransaction
    console.log('1. Testing MidtransService.createSnapTransaction...');
    const invoice = await InvoiceModel.findById(testInvoiceId);
    const snapResult = await MidtransService.createSnapTransaction(invoice);
    assert.ok(snapResult.token);
    assert.ok(snapResult.redirect_url);
    assert.ok(snapResult.order_id);
    assert.ok(snapResult.order_id.includes(`INV-${testInvoiceId}`));
    assert.strictEqual(snapResult.gross_amount, 550000);

    // 2. API Endpoint: POST /api/invoices/:id/pay (F-32)
    console.log('2. Testing POST /api/invoices/:id/pay unauthenticated (401)...');
    const noAuthPayRes = await fetch(`${baseUrl}/invoices/${testInvoiceId}/pay`, {
      method: 'POST',
    });
    assert.strictEqual(noAuthPayRes.status, 401);

    console.log('2b. Testing POST /api/invoices/:id/pay unauthorized user Dina (403)...');
    const dinaPayRes = await fetch(`${baseUrl}/invoices/${testInvoiceId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantDinaToken}` },
    });
    assert.strictEqual(dinaPayRes.status, 403);

    console.log('2c. Testing POST /api/invoices/:id/pay authorized tenant Ari (200)...');
    const ariPayRes = await fetch(`${baseUrl}/invoices/${testInvoiceId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(ariPayRes.status, 200);
    const ariPayData = await ariPayRes.json();
    assert.ok(ariPayData.token);
    assert.ok(ariPayData.redirect_url);
    assert.strictEqual(ariPayData.invoice_id, testInvoiceId);
    assert.strictEqual(ariPayData.amount, 550000);

    // 3. Signature verification test
    console.log('3. Testing signature verification...');
    const orderId = `INV-${testInvoiceId}-1730000000`;
    const statusCode = '200';
    const grossAmount = '550000.00';
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'test_server_key';

    const validSignature = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');

    // Temporarily ensure key for verification test
    const origKey = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = serverKey;

    const isValid = MidtransService.verifySignature(orderId, statusCode, grossAmount, validSignature);
    assert.strictEqual(isValid, true);

    const isInvalid = MidtransService.verifySignature(orderId, statusCode, grossAmount, 'tampered_signature');
    assert.strictEqual(isInvalid, false);

    // Restore key
    process.env.MIDTRANS_SERVER_KEY = origKey;

    // 4. API Endpoint: POST /api/payments/callback (Webhook Notification)
    console.log('4. Testing POST /api/payments/callback invalid order_id (400)...');
    const badCallbackRes = await fetch(`${baseUrl}/payments/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_status: 'settlement',
      }),
    });
    assert.strictEqual(badCallbackRes.status, 400);

    console.log('4b. Testing POST /api/payments/callback successful settlement (200, F-32, F-30)...');
    const callbackPayload = {
      order_id: `INV-${testInvoiceId}-1730000001`,
      status_code: '200',
      gross_amount: '550000.00',
      transaction_status: 'settlement',
      payment_type: 'qris',
      transaction_id: 'midtrans-trx-123456',
      settlement_time: '2026-10-26 10:30:00',
    };

    const callbackRes = await fetch(`${baseUrl}/payments/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackPayload),
    });
    assert.strictEqual(callbackRes.status, 200);
    const callbackData = await callbackRes.json();
    assert.strictEqual(callbackData.status, 'ok');
    assert.strictEqual(callbackData.invoice_id, testInvoiceId);
    assert.strictEqual(callbackData.payment_method, 'qris');

    // Verify invoice is now paid
    console.log('4c. Verifying invoice state is now paid in database...');
    const paidInvoice = await InvoiceModel.findById(testInvoiceId);
    assert.strictEqual(paidInvoice.status, 'paid');
    assert.strictEqual(paidInvoice.payment_method, 'qris');
    assert.strictEqual(paidInvoice.payment_ref, 'midtrans-trx-123456');

    // Verify F-30: booking was automatically activated and room availability set to false!
    console.log('4d. Verifying associated booking became active and room unavailable (F-30)...');
    const activatedBooking = await BookingModel.findById(testBookingId);
    assert.strictEqual(activatedBooking.status, 'active');

    const room2 = await RoomModel.findById(2);
    assert.strictEqual(room2.is_available, false);

    // 5. Test pay again on already paid invoice (400)
    console.log('5. Testing POST /api/invoices/:id/pay for already paid invoice (400)...');
    const paidPayRes = await fetch(`${baseUrl}/invoices/${testInvoiceId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(paidPayRes.status, 400);

  } finally {
    // Cleanup
    if (testInvoiceId) {
      await InvoiceModel.delete(testInvoiceId);
    }
    if (testBookingId) {
      await BookingModel.delete(testBookingId);
      // Restore room 2 availability
      await db.execute('UPDATE rooms SET is_available = 1 WHERE id = 2');
    }
    server.close();
  }

  console.log('\nALL MIDTRANS PAYMENT TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Payment test failed:', err);
  process.exit(1);
});
