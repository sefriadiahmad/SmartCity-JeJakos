const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const { app } = require('../src/app');
const db = require('../src/config/db');
const InvoiceModel = require('../src/models/invoice.model');
const BookingModel = require('../src/models/booking.model');
const ReminderService = require('../src/services/reminder.service');
const { runReminderJob } = require('../src/services/cron.service');

async function runTests() {
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  require('../src/socket/socketHandler')(io);
  app.set('io', io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/invoices`;

  console.log(`Reminder test server running on port ${port}`);

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
  // Other Owner Siti (id: 3)
  const ownerSitiToken = jwt.sign(
    { id: 3, email: 'siti.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  // Tenant Ari (id: 5)
  const tenantAriToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testBookingId = null;
  let testInvoiceIdDueSoon = null;
  let testInvoiceIdOverdue = null;
  let tenantSocketClient = null;

  try {
    // 0. Setup: Active booking and 2 invoices (1 due tomorrow, 1 overdue)
    console.log('0. Setting up test booking and invoices for reminders...');
    testBookingId = await BookingModel.create({
      room_id: 1,
      tenant_id: 5,
      status: 'active',
      check_in_date: '2026-10-01',
      check_out_date: '2027-04-01',
      notes: 'Test invoice reminder scheduler',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    testInvoiceIdDueSoon = await InvoiceModel.create({
      booking_id: testBookingId,
      amount: 550000,
      due_date: tomorrowStr,
      status: 'unpaid',
    });

    testInvoiceIdOverdue = await InvoiceModel.create({
      booking_id: testBookingId,
      amount: 550000,
      due_date: '2026-01-01',
      status: 'overdue',
    });

    // 1. ReminderService query test
    console.log('1. Testing ReminderService.getInvoicesNeedingReminders (F-35)...');
    const needing = await ReminderService.getInvoicesNeedingReminders({ daysBeforeDue: 3 });
    assert.ok(Array.isArray(needing.dueSoon));
    assert.ok(Array.isArray(needing.overdue));

    const foundDueSoon = needing.dueSoon.find((i) => i.id === testInvoiceIdDueSoon);
    assert.ok(foundDueSoon, 'Due soon invoice should be detected');
    assert.strictEqual(foundDueSoon.tenant_id, 5);

    const foundOverdue = needing.overdue.find((i) => i.id === testInvoiceIdOverdue);
    assert.ok(foundOverdue, 'Overdue invoice should be detected');
    assert.strictEqual(foundOverdue.tenant_id, 5);

    // 2. Real-time In-App Notification (Socket.IO)
    console.log('2. Testing real-time Socket.IO reminder notification for tenant Ari...');
    tenantSocketClient = ClientIO(`http://localhost:${port}`, {
      auth: { token: tenantAriToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      tenantSocketClient.on('connect', resolve);
      tenantSocketClient.on('connect_error', reject);
    });

    const reminderPromise = new Promise((resolve) => {
      tenantSocketClient.on('invoiceReminder', (payload) => {
        resolve(payload);
      });
    });

    // Send single reminder with Socket.IO
    const invDueSoon = await InvoiceModel.findById(testInvoiceIdDueSoon);
    const sendResult = await ReminderService.sendReminderForInvoice(invDueSoon, io, {
      isManual: true,
      customNote: 'Pengingat khusus via unit test',
    });
    assert.strictEqual(sendResult.success, true);
    assert.strictEqual(sendResult.invoice_id, testInvoiceIdDueSoon);

    const receivedPayload = await reminderPromise;
    assert.strictEqual(receivedPayload.invoice_id, testInvoiceIdDueSoon);
    assert.ok(receivedPayload.message.includes('Pengingat khusus via unit test'));

    // 3. Automated cron reminder runner
    console.log('3. Testing cron reminder job runner (runReminderJob)...');
    const cronResult = await runReminderJob(io);
    assert.ok(typeof cronResult.dueSoonCount === 'number');
    assert.ok(typeof cronResult.overdueCount === 'number');
    assert.ok(typeof cronResult.remindersSent === 'number');

    // 4. API Endpoints
    console.log('4. Testing POST /api/invoices/:id/remind unauthenticated (401)...');
    const noAuthRes = await fetch(`${baseUrl}/${testInvoiceIdDueSoon}/remind`, {
      method: 'POST',
    });
    assert.strictEqual(noAuthRes.status, 401);

    console.log('4b. Testing POST /api/invoices/:id/remind as tenant Ari (403)...');
    const tenantRes = await fetch(`${baseUrl}/${testInvoiceIdDueSoon}/remind`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(tenantRes.status, 403);

    console.log('4c. Testing POST /api/invoices/:id/remind as other owner Siti (403)...');
    const otherOwnerRes = await fetch(`${baseUrl}/${testInvoiceIdDueSoon}/remind`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerSitiToken}` },
    });
    assert.strictEqual(otherOwnerRes.status, 403);

    console.log('4d. Testing POST /api/invoices/:id/remind as owner Budi (200, F-35)...');
    const ownerRemindRes = await fetch(`${baseUrl}/${testInvoiceIdDueSoon}/remind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBudiToken}`,
      },
      body: JSON.stringify({
        note: 'Mohon dibayar sebelum akhir pekan ya mas Ari',
      }),
    });
    assert.strictEqual(ownerRemindRes.status, 200);
    const ownerRemindData = await ownerRemindRes.json();
    assert.ok(ownerRemindData.reminder);
    assert.strictEqual(ownerRemindData.reminder.success, true);
    assert.strictEqual(ownerRemindData.reminder.invoice_id, testInvoiceIdDueSoon);

    console.log('4e. Testing POST /api/invoices/reminders/process as admin (200)...');
    const adminProcessRes = await fetch(`${baseUrl}/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminProcessRes.status, 200);
    const adminProcessData = await adminProcessRes.json();
    assert.ok(typeof adminProcessData.remindersSent === 'number');

  } finally {
    if (tenantSocketClient) {
      tenantSocketClient.disconnect();
    }
    // Cleanup test data
    if (testInvoiceIdDueSoon) {
      await InvoiceModel.delete(testInvoiceIdDueSoon);
    }
    if (testInvoiceIdOverdue) {
      await InvoiceModel.delete(testInvoiceIdOverdue);
    }
    if (testBookingId) {
      await BookingModel.delete(testBookingId);
    }
    server.close();
  }

  console.log('\nALL INVOICE REMINDER TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Reminder test failed:', err);
  process.exit(1);
});
