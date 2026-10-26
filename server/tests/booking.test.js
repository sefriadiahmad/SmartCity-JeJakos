const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const BookingModel = require('../src/models/booking.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/bookings`;

  console.log(`Booking test server running on port ${port}`);

  // Test tokens
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
  // Kos 1 owner (Pak Budi)
  const ownerBudiToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  // Kos 4 owner (Ibu Siti)
  const ownerSitiToken = jwt.sign(
    { id: 3, email: 'siti.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  // Pencari Ari (id: 5)
  const tenantAriToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );
  // Pencari Dina (id: 6)
  const tenantDinaToken = jwt.sign(
    { id: 6, email: 'dina.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testBookingId1 = null;
  let testBookingId2 = null;

  try {
    // 1. Authentication & RBAC
    console.log('1. Testing GET /api/bookings without token (401)...');
    const noAuthRes = await fetch(baseUrl);
    assert.strictEqual(noAuthRes.status, 401);

    console.log('1b. Testing POST /api/bookings without token (401)...');
    const noAuthPostRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: 1, check_in_date: '2026-11-01' }),
    });
    assert.strictEqual(noAuthPostRes.status, 401);

    console.log('1c. Testing POST /api/bookings with pemilik token (403)...');
    const ownerBookRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBudiToken}`,
      },
      body: JSON.stringify({ room_id: 1, check_in_date: '2026-11-01' }),
    });
    assert.strictEqual(ownerBookRes.status, 403);

    // 2. Validation
    console.log('2. Testing POST /api/bookings missing room_id (400)...');
    const badRoomRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ check_in_date: '2026-11-01' }),
    });
    assert.strictEqual(badRoomRes.status, 400);

    console.log('2b. Testing POST /api/bookings invalid check_in_date (400)...');
    const badDateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ room_id: 1, check_in_date: 'not-a-date' }),
    });
    assert.strictEqual(badDateRes.status, 400);

    console.log('2c. Testing POST /api/bookings check_out before check_in (400)...');
    const earlyCheckoutRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({
        room_id: 1,
        check_in_date: '2026-11-10',
        check_out_date: '2026-11-01',
      }),
    });
    assert.strictEqual(earlyCheckoutRes.status, 400);

    console.log('2d. Testing POST /api/bookings non-existent room (404)...');
    const nonExistentRoomRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ room_id: 999999, check_in_date: '2026-11-01' }),
    });
    assert.strictEqual(nonExistentRoomRes.status, 404);

    console.log('2e. Testing POST /api/bookings unavailable room (400)...');
    // Room 8 is is_available = FALSE in seed
    const unavailRoomRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ room_id: 8, check_in_date: '2026-11-01' }),
    });
    assert.strictEqual(unavailRoomRes.status, 400);

    // 3. Create booking success (F-27)
    console.log('3. Testing POST /api/bookings valid creation by Ari...');
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({
        room_id: 1,
        check_in_date: '2026-11-01',
        check_out_date: '2026-12-01',
        notes: 'Saya mahasiswa semester 5 UNJA',
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.ok(createData.booking);
    assert.strictEqual(createData.booking.tenant_id, 5);
    assert.strictEqual(createData.booking.room_id, 1);
    assert.strictEqual(createData.booking.status, 'pending');
    assert.strictEqual(createData.booking.check_in_date, '2026-11-01');
    assert.strictEqual(createData.booking.check_out_date, '2026-12-01');
    assert.strictEqual(createData.booking.notes, 'Saya mahasiswa semester 5 UNJA');
    assert.ok(createData.booking.room);
    assert.ok(createData.booking.kos);
    assert.ok(createData.booking.tenant);
    assert.ok(createData.booking.owner);
    testBookingId1 = createData.booking.id;

    console.log('3b. Testing POST duplicate pending booking for same room (400)...');
    const dupRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ room_id: 1, check_in_date: '2026-11-05' }),
    });
    assert.strictEqual(dupRes.status, 400);

    // 4. List bookings (F-29)
    console.log('4. Testing GET /api/bookings for Ari (tenant)...');
    const ariListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(ariListRes.status, 200);
    const ariListData = await ariListRes.json();
    assert.ok(Array.isArray(ariListData.bookings));
    assert.ok(ariListData.bookings.some((b) => b.id === testBookingId1));
    assert.ok(ariListData.bookings.every((b) => b.tenant_id === 5));

    console.log('4b. Testing GET /api/bookings for Budi (owner of kos 1)...');
    const budiListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${ownerBudiToken}` },
    });
    assert.strictEqual(budiListRes.status, 200);
    const budiListData = await budiListRes.json();
    assert.ok(budiListData.bookings.some((b) => b.id === testBookingId1));
    assert.ok(budiListData.bookings.every((b) => b.kos.owner_id === 2));

    console.log('4c. Testing GET /api/bookings for Siti (owner of other kos)...');
    const sitiListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${ownerSitiToken}` },
    });
    assert.strictEqual(sitiListRes.status, 200);
    const sitiListData = await sitiListRes.json();
    assert.ok(!sitiListData.bookings.some((b) => b.id === testBookingId1));

    console.log('4d. Testing GET /api/bookings?status=pending...');
    const pendingListRes = await fetch(`${baseUrl}?status=pending`, {
      headers: { Authorization: `Bearer ${ownerBudiToken}` },
    });
    assert.strictEqual(pendingListRes.status, 200);
    const pendingData = await pendingListRes.json();
    assert.ok(pendingData.bookings.some((b) => b.id === testBookingId1));

    // 5. Detail booking (F-29)
    console.log('5. Testing GET /api/bookings/:id for tenant Ari...');
    const detailAriRes = await fetch(`${baseUrl}/${testBookingId1}`, {
      headers: { Authorization: `Bearer ${tenantAriToken}` },
    });
    assert.strictEqual(detailAriRes.status, 200);
    const detailAriData = await detailAriRes.json();
    assert.strictEqual(detailAriData.booking.id, testBookingId1);
    assert.ok(Array.isArray(detailAriData.booking.invoices));

    console.log('5b. Testing GET /api/bookings/:id for owner Budi...');
    const detailBudiRes = await fetch(`${baseUrl}/${testBookingId1}`, {
      headers: { Authorization: `Bearer ${ownerBudiToken}` },
    });
    assert.strictEqual(detailBudiRes.status, 200);

    console.log('5c. Testing GET /api/bookings/:id for unauthorized user Dina (403)...');
    const detailDinaRes = await fetch(`${baseUrl}/${testBookingId1}`, {
      headers: { Authorization: `Bearer ${tenantDinaToken}` },
    });
    assert.strictEqual(detailDinaRes.status, 403);

    console.log('5d. Testing GET /api/bookings/:id for Admin...');
    const detailAdminRes = await fetch(`${baseUrl}/${testBookingId1}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(detailAdminRes.status, 200);

    console.log('5e. Testing GET /api/bookings/999999 (404)...');
    const notFoundRes = await fetch(`${baseUrl}/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(notFoundRes.status, 404);

    // 6. Update status (F-28)
    console.log('6. Testing PUT /api/bookings/:id/status by unauthorized user Dina (403)...');
    const updateDinaRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantDinaToken}`,
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    assert.strictEqual(updateDinaRes.status, 403);

    console.log('6b. Testing PUT /api/bookings/:id/status by other owner Siti (403)...');
    const updateSitiRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerSitiToken}`,
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    assert.strictEqual(updateSitiRes.status, 403);

    console.log('6c. Testing PUT /api/bookings/:id/status tenant Ari tries to accept (403)...');
    const updateAriRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    assert.strictEqual(updateAriRes.status, 403);

    console.log('6d. Testing PUT /api/bookings/:id/status owner Budi accepts booking (200)...');
    const acceptRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBudiToken}`,
      },
      body: JSON.stringify({ status: 'accepted', notes: 'Diterima, silakan lakukan pembayaran' }),
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptData.booking.status, 'accepted');
    assert.strictEqual(acceptData.booking.notes, 'Diterima, silakan lakukan pembayaran');

    console.log('6e. Testing PUT /api/bookings/:id/status tenant Ari cancels booking (200)...');
    const cancelRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantAriToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert.strictEqual(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.booking.status, 'cancelled');

    console.log('6f. Testing PUT /api/bookings/:id/status after cancelled (400 terminal)...');
    const termRes = await fetch(`${baseUrl}/${testBookingId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBudiToken}`,
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    assert.strictEqual(termRes.status, 400);

    // 7. Owner rejects booking flow (F-28)
    console.log('7. Testing owner rejects booking flow...');
    const createRes2 = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantDinaToken}`,
      },
      body: JSON.stringify({
        room_id: 2,
        check_in_date: '2026-11-15',
        notes: 'Pemesanan kamar A2',
      }),
    });
    assert.strictEqual(createRes2.status, 201);
    const createData2 = await createRes2.json();
    testBookingId2 = createData2.booking.id;

    const rejectRes = await fetch(`${baseUrl}/${testBookingId2}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBudiToken}`,
      },
      body: JSON.stringify({ status: 'rejected', notes: 'Kamar sedang dalam perbaikan' }),
    });
    assert.strictEqual(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.strictEqual(rejectData.booking.status, 'rejected');
    assert.strictEqual(rejectData.booking.notes, 'Kamar sedang dalam perbaikan');

  } finally {
    // Cleanup
    if (testBookingId1) {
      await BookingModel.delete(testBookingId1);
    }
    if (testBookingId2) {
      await BookingModel.delete(testBookingId2);
    }
    server.close();
  }

  console.log('\nALL BOOKING ROUTES TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Booking test failed:', err);
  process.exit(1);
});
