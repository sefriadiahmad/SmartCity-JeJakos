const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const BookingModel = require('../src/models/booking.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}/api/complaints`;
  const token = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET);
  const ownerToken = token(2, 'pemilik');
  const tenantToken = token(5, 'pencari');
  const otherTenantToken = token(6, 'pencari');
  let bookingId;
  let complaintId;

  try {
    bookingId = await BookingModel.create({ room_id: 1, tenant_id: 5, status: 'active', check_in_date: '2026-11-01' });

    const unauthenticated = await fetch(baseUrl);
    assert.strictEqual(unauthenticated.status, 401);

    const invalid = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, subject: 'AC', description: 'Pendek' }),
    });
    assert.strictEqual(invalid.status, 400);

    const created = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, subject: 'AC rusak', description: 'AC kamar tidak mengeluarkan udara dingin.' }),
    });
    assert.strictEqual(created.status, 201);
    const createData = await created.json();
    complaintId = createData.complaint.id;
    assert.strictEqual(createData.complaint.status, 'open');

    const list = await fetch(baseUrl, { headers: { Authorization: `Bearer ${tenantToken}` } });
    assert.strictEqual(list.status, 200);
    assert.ok((await list.json()).complaints.some((complaint) => complaint.id === complaintId));

    const forbiddenDetail = await fetch(`${baseUrl}/${complaintId}`, { headers: { Authorization: `Bearer ${otherTenantToken}` } });
    assert.strictEqual(forbiddenDetail.status, 403);

    const response = await fetch(`${baseUrl}/${complaintId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ content: 'Teknisi akan datang besok pagi.' }),
    });
    assert.strictEqual(response.status, 201);
    assert.strictEqual((await response.json()).complaint.responses.length, 1);

    const status = await fetch(`${baseUrl}/${complaintId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.strictEqual(status.status, 200);
    assert.strictEqual((await status.json()).complaint.status, 'resolved');

    const tenantStatus = await fetch(`${baseUrl}/${complaintId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ status: 'open' }),
    });
    assert.strictEqual(tenantStatus.status, 403);
  } finally {
    if (complaintId) await db.execute('DELETE FROM complaints WHERE id = ?', [complaintId]);
    if (bookingId) await BookingModel.delete(bookingId);
    server.close();
  }

  console.log('ALL COMPLAINT TESTS PASSED');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Complaint test failed:', err);
  process.exit(1);
});
