const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const InvoiceModel = require('../src/models/invoice.model');
const BookingModel = require('../src/models/booking.model');
const { runInvoiceJob } = require('../src/services/cron.service');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/invoices`;

  console.log(`Invoice test server running on port ${port}`);

  // Tokens
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
  // Kos 1 owner (Pak Budi, id: 2)
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
  let testInvoiceId1 = null;
  let testInvoiceId2 = null;

  try {
    // 0. Setup test booking (Ari books Room 1, Kos 1, active status)
    console.log('0. Setting up test active booking...');
    testBookingId = await BookingModel.create({
      room_id: 1,
      tenant_id: 5,
      status: 'active',
      check_in_date: '2026-11-01',
      check_out_date: '2027-05-01',
      notes: 'Test recurring invoice generation',
    });
    assert.ok(testBookingId);

    // 1. Model CRUD & Relational Query
    console.log('1. Testing InvoiceModel.create...');
    testInvoiceId1 = await InvoiceModel.create({
      booking_id: testBookingId,
      amount: 550000,
      due_date: '2026-11-01',
      status: 'unpaid',
    });
    assert.ok(testInvoiceId1 > 0);

    console.log('1b. Testing InvoiceModel.findById...');
    const inv1 = await InvoiceModel.findById(testInvoiceId1);
    assert.strictEqual(inv1.id, testInvoiceId1);
    assert.strictEqual(inv1.amount, 550000);
    assert.strictEqual(inv1.due_date, '2026-11-01');
    assert.strictEqual(inv1.status, 'unpaid');
    assert.strictEqual(inv1.tenant.id, 5);
    assert.strictEqual(inv1.owner.id, 2);
    assert.strictEqual(inv1.room.id, 1);
    assert.ok(inv1.kos.name);

    console.log('1c. Testing InvoiceModel.updateStatus to paid...');
    const nowIso = new Date().toISOString();
    const updated = await InvoiceModel.updateStatus(testInvoiceId1, {
      status: 'paid',
      payment_method: 'manual',
      payment_ref: 'CASH-001',
      paid_at: nowIso,
    });
    assert.ok(updated);
    const inv1Paid = await InvoiceModel.findById(testInvoiceId1);
    assert.strictEqual(inv1Paid.status, 'paid');
    assert.strictEqual(inv1Paid.payment_method, 'manual');
    assert.strictEqual(inv1Paid.payment_ref, 'CASH-001');

    // 2. Auto-generation logic (F-31)
    console.log('2. Testing F-31: auto-generate recurring invoices...');
    // When previous invoice is paid, next due date is 1 month later (2026-12-01)
    // Run generation with issueDaysBefore = 60 to catch the upcoming month
    const genResult = await InvoiceModel.generateRecurringInvoices({ issueDaysBefore: 60 });
    assert.ok(genResult.count >= 1);
    const ourGen = genResult.generated.find((g) => g.booking_id === testBookingId);
    assert.ok(ourGen);
    assert.strictEqual(ourGen.due_date, '2026-12-01');
    assert.strictEqual(ourGen.amount, 550000);
    testInvoiceId2 = ourGen.id;

    console.log('2b. Testing duplicate prevention (running again does not create duplicate)...');
    const genResult2 = await InvoiceModel.generateRecurringInvoices({ issueDaysBefore: 60 });
    const dupGen = genResult2.generated.find((g) => g.booking_id === testBookingId);
    assert.strictEqual(dupGen, undefined);

    // 2c. Overdue detection
    console.log('2c. Testing overdue status detection...');
    // Set invoice 2 due date to yesterday and status unpaid
    await db.execute('UPDATE invoices SET due_date = "2020-01-01", status = "unpaid" WHERE id = ?', [
      testInvoiceId2,
    ]);
    const overdueCount = await InvoiceModel.checkOverdueInvoices();
    assert.ok(overdueCount > 0);
    const inv2Overdue = await InvoiceModel.findById(testInvoiceId2);
    assert.strictEqual(inv2Overdue.status, 'overdue');

    // 3. Cron service execution
    console.log('3. Testing runInvoiceJob (cron service)...');
    const cronRes = await runInvoiceJob();
    assert.ok(typeof cronRes.count === 'number');

    // 4. API Endpoints
    console.log('4. Testing GET /api/invoices without token (401)...');
    const noAuthRes = await fetch(baseUrl);
    assert.strictEqual(noAuthRes.status, 401);

    console.log('4b. Testing GET /api/invoices as Tenant Ari (200)...');
    const tenantRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(tenantRes.status, 200);
    const tenantData = await tenantRes.json();
    assert.ok(Array.isArray(tenantData.invoices));
    assert.ok(tenantData.invoices.some((i) => i.id === testInvoiceId1));
    assert.ok(tenantData.invoices.every((i) => i.tenant.id === 5));

    console.log('4c. Testing GET /api/invoices as Owner Budi (200)...');
    const ownerRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${ownerBudiToken}` },
    });
    assert.strictEqual(ownerRes.status, 200);
    const ownerData = await ownerRes.json();
    assert.ok(ownerData.invoices.some((i) => i.id === testInvoiceId1));
    assert.ok(ownerData.invoices.every((i) => i.owner.id === 2));

    console.log('4d. Testing GET /api/invoices/:id detail for Tenant Ari...');
    const detailAriRes = await fetch(`${baseUrl}/${testInvoiceId1}`, {
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(detailAriRes.status, 200);
    const detailAriData = await detailAriRes.json();
    assert.strictEqual(detailAriData.invoice.id, testInvoiceId1);

    console.log('4e. Testing GET /api/invoices/:id detail for unauthorized user Dina (403)...');
    const detailDinaRes = await fetch(`${baseUrl}/${testInvoiceId1}`, {
      headers: { Authorization: `Bearer ${tenantDinaToken}` },
    });
    assert.strictEqual(detailDinaRes.status, 403);

    console.log('4f. Testing POST /api/invoices/generate as tenant (403)...');
    const genTenantRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(genTenantRes.status, 403);

    console.log('4g. Testing POST /api/invoices/generate as admin (200)...');
    const genAdminRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(genAdminRes.status, 200);
    const genAdminData = await genAdminRes.json();
    assert.ok(typeof genAdminData.count === 'number');

  } finally {
    // Cleanup
    if (testInvoiceId1) {
      await InvoiceModel.delete(testInvoiceId1);
    }
    if (testInvoiceId2) {
      await InvoiceModel.delete(testInvoiceId2);
    }
    if (testBookingId) {
      await BookingModel.delete(testBookingId);
    }
    server.close();
  }

  console.log('\nALL INVOICE & AUTO-GENERATE TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Invoice test failed:', err);
  process.exit(1);
});
