const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const UserModel = require('../src/models/user.model');
const KosModel = require('../src/models/kos.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/admin`;

  console.log(`Admin test server running on port ${port}`);

  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
  const ownerToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  const pencariToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testPemilikId = null;
  let testPencariId = null;
  let testKosId = null;
  let testRoomId = null;
  let testBookingId = null;
  let testReviewId = null;

  try {
    // 0. Dashboard Stats (design.md §3)
    console.log('0. Testing GET /api/admin/dashboard...');
    const dashNoAuth = await fetch(`${baseUrl}/dashboard`);
    assert.strictEqual(dashNoAuth.status, 401);

    const dashRes = await fetch(`${baseUrl}/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.strictEqual(typeof dashData.totalUsers, 'number');
    assert.strictEqual(typeof dashData.pendingOwners, 'number');
    assert.strictEqual(typeof dashData.totalKos, 'number');
    assert.strictEqual(typeof dashData.pendingKos, 'number');
    assert.strictEqual(typeof dashData.totalReviews, 'number');
    assert.strictEqual(typeof dashData.totalRooms, 'number');
    assert.ok(dashData.totalUsers >= 6);
    assert.ok(dashData.totalKos >= 8);

    // 1. RBAC & Auth checks
    console.log('1. Testing RBAC & Auth on /api/admin/users...');
    const noAuthRes = await fetch(`${baseUrl}/users`);
    assert.strictEqual(noAuthRes.status, 401);

    const pencariRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(pencariRes.status, 403);

    const ownerRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(ownerRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const adminData = await adminRes.json();
    assert.ok(Array.isArray(adminData.data));
    assert.ok(adminData.total > 0);
    assert.strictEqual(adminData.page, 1);
    assert.strictEqual(typeof adminData.totalPages, 'number');
    // Ensure password_hash is not returned
    assert.strictEqual(adminData.data[0].password_hash, undefined);

    // 2. User list filtering & search
    console.log('2. Testing user list filters and search...');
    const pemilikListRes = await fetch(`${baseUrl}/users?role=pemilik`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pemilikListData = await pemilikListRes.json();
    assert.strictEqual(pemilikListRes.status, 200);
    assert.ok(pemilikListData.data.every((u) => u.role === 'pemilik'));

    const searchUserRes = await fetch(`${baseUrl}/users?search=budi`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchUserData = await searchUserRes.json();
    assert.strictEqual(searchUserRes.status, 200);
    assert.ok(searchUserData.data.some((u) => u.email.includes('budi') || u.name.includes('Budi')));

    // 3. User Detail & 404
    console.log('3. Testing GET /api/admin/users/:id...');
    const userDetailRes = await fetch(`${baseUrl}/users/1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(userDetailRes.status, 200);
    const userDetail = await userDetailRes.json();
    assert.strictEqual(userDetail.id, 1);
    assert.strictEqual(userDetail.password_hash, undefined);
    assert.strictEqual(typeof userDetail.is_approved, 'boolean');

    const notFoundUserRes = await fetch(`${baseUrl}/users/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(notFoundUserRes.status, 404);

    // 4. Approve / Reject Pemilik (F-15)
    console.log('4. Testing PUT /api/admin/users/:id/approve (F-15)...');
    testPemilikId = await UserModel.create({
      email: `test_admin_pemilik_${Date.now()}@jejakos.test`,
      password_hash: 'hash',
      role: 'pemilik',
      name: 'Pemilik Belum Disetujui',
      phone: '081199887766',
      is_verified: true,
      is_approved: false,
    });

    testPencariId = await UserModel.create({
      email: `test_admin_pencari_${Date.now()}@jejakos.test`,
      password_hash: 'hash',
      role: 'pencari',
      name: 'Pencari Biasa',
      phone: '081122334455',
      is_verified: true,
      is_approved: false,
    });

    // Attempt to approve pencari -> should fail 400
    const approvePencariRes = await fetch(`${baseUrl}/users/${testPencariId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_approved: true }),
    });
    assert.strictEqual(approvePencariRes.status, 400);

    // Approve unapproved pemilik -> default or is_approved: true
    const approvePemilikRes = await fetch(`${baseUrl}/users/${testPemilikId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_approved: true }),
    });
    assert.strictEqual(approvePemilikRes.status, 200);
    const approvePemilikData = await approvePemilikRes.json();
    assert.strictEqual(approvePemilikData.user.is_approved, true);

    // Check DB state
    const verifiedUser = await UserModel.findById(testPemilikId);
    assert.strictEqual(Boolean(verifiedUser.is_approved), true);

    // Reject / unapprove pemilik
    const rejectPemilikRes = await fetch(`${baseUrl}/users/${testPemilikId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_approved: false }),
    });
    assert.strictEqual(rejectPemilikRes.status, 200);
    const rejectPemilikData = await rejectPemilikRes.json();
    assert.strictEqual(rejectPemilikData.user.is_approved, false);

    // 5. Kos Management (F-16, F-17)
    console.log('5. Testing GET /api/admin/kos & PUT /api/admin/kos/:id/approve (F-16, F-17)...');
    testKosId = await KosModel.create({
      owner_id: 2,
      name: 'Kos Admin Test Listing',
      address: 'Jl. Test No. 99, Telanaipura',
      latitude: -1.6050,
      longitude: 103.5900,
      district: 'Telanaipura',
      type: 'campur',
      description: 'Deskripsi kos test admin',
      is_approved: false,
      status: 'active',
    });

    const kosListRes = await fetch(`${baseUrl}/kos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(kosListRes.status, 200);
    const kosListData = await kosListRes.json();
    assert.ok(Array.isArray(kosListData.data));
    assert.ok(kosListData.data.some((k) => k.id === testKosId));

    // Detail kos
    const kosDetailRes = await fetch(`${baseUrl}/kos/${testKosId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(kosDetailRes.status, 200);
    const kosDetail = await kosDetailRes.json();
    assert.strictEqual(kosDetail.id, testKosId);
    assert.strictEqual(kosDetail.is_approved, false);

    // Detail 404
    const kosNotFoundRes = await fetch(`${baseUrl}/kos/999999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(kosNotFoundRes.status, 404);

    // Approve kos
    const approveKosRes = await fetch(`${baseUrl}/kos/${testKosId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_approved: true }),
    });
    assert.strictEqual(approveKosRes.status, 200);
    const approveKosData = await approveKosRes.json();
    assert.strictEqual(approveKosData.kos.is_approved, true);

    // Unapprove kos
    const unapproveKosRes = await fetch(`${baseUrl}/kos/${testKosId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_approved: false }),
    });
    assert.strictEqual(unapproveKosRes.status, 200);
    const unapproveKosData = await unapproveKosRes.json();
    assert.strictEqual(unapproveKosData.kos.is_approved, false);

    // 6. Room Listing (F-17)
    console.log('6. Testing GET /api/admin/rooms (F-17)...');
    const roomsRes = await fetch(`${baseUrl}/rooms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(roomsRes.status, 200);
    const roomsData = await roomsRes.json();
    assert.ok(Array.isArray(roomsData.data));
    assert.ok(roomsData.total > 0);
    assert.strictEqual(typeof roomsData.data[0].price, 'number');

    const roomsByKosRes = await fetch(`${baseUrl}/rooms?kos_id=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(roomsByKosRes.status, 200);
    const roomsByKosData = await roomsByKosRes.json();
    assert.ok(roomsByKosData.data.every((r) => r.kos_id === 1));

    // 7. Review Moderation (F-18)
    console.log('7. Testing Review Moderation (F-18)...');
    // Setup test room and booking for review
    const [roomRes] = await db.execute(
      `INSERT INTO rooms (kos_id, room_number, price, pay_period, is_available)
       VALUES (?, 'Test-Admin-R1', 500000, 'bulanan', 1)`,
      [testKosId]
    );
    testRoomId = roomRes.insertId;

    const [bookingRes] = await db.execute(
      `INSERT INTO bookings (room_id, tenant_id, status, check_in_date, check_out_date)
       VALUES (?, 5, 'active', '2026-01-01', '2026-02-01')`,
      [testRoomId]
    );
    testBookingId = bookingRes.insertId;

    const [reviewRes] = await db.execute(
      `INSERT INTO reviews (kos_id, booking_id, user_id, rating, content, is_moderated)
       VALUES (?, ?, 5, 1, 'Ulasan melanggar kata-kata kasar untuk ditest', 0)`,
      [testKosId, testBookingId]
    );
    testReviewId = reviewRes.insertId;

    // GET /api/admin/reviews
    const reviewsRes = await fetch(`${baseUrl}/reviews`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(reviewsRes.status, 200);
    const reviewsData = await reviewsRes.json();
    assert.ok(Array.isArray(reviewsData.data));
    const foundTestReview = reviewsData.data.find((rv) => rv.id === testReviewId);
    assert.ok(foundTestReview);
    assert.strictEqual(foundTestReview.is_moderated, false);
    assert.strictEqual(foundTestReview.user_name, 'Ari Pratama');

    // PUT /api/admin/reviews/:id/moderate
    const modRes = await fetch(`${baseUrl}/reviews/${testReviewId}/moderate`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_moderated: true }),
    });
    assert.strictEqual(modRes.status, 200);
    const modData = await modRes.json();
    assert.strictEqual(modData.review.is_moderated, true);

    // Invalid flag is rejected before controller execution
    const invalidModRes = await fetch(`${baseUrl}/reviews/${testReviewId}/moderate`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_moderated: 'invalid' }),
    });
    assert.strictEqual(invalidModRes.status, 400);

    // DELETE /api/admin/reviews/:id
    const delRes = await fetch(`${baseUrl}/reviews/${testReviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(delRes.status, 200);

    // Verify deletion
    const delCheckRes = await fetch(`${baseUrl}/reviews/${testReviewId}/moderate`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_moderated: false }),
    });
    assert.strictEqual(delCheckRes.status, 404);
    testReviewId = null;

    console.log('ALL ADMIN TESTS PASSED!');
  } finally {
    // Cleanup test records
    if (testReviewId) {
      await db.execute('DELETE FROM reviews WHERE id = ?', [testReviewId]);
    }
    if (testBookingId) {
      await db.execute('DELETE FROM bookings WHERE id = ?', [testBookingId]);
    }
    if (testRoomId) {
      await db.execute('DELETE FROM rooms WHERE id = ?', [testRoomId]);
    }
    if (testKosId) {
      await KosModel.delete(testKosId);
    }
    if (testPemilikId) {
      await db.execute('DELETE FROM users WHERE id = ?', [testPemilikId]);
    }
    if (testPencariId) {
      await db.execute('DELETE FROM users WHERE id = ?', [testPencariId]);
    }

    server.close();
    await db.end();
  }
}

runTests().catch((err) => {
  console.error('Admin test failed:', err);
  process.exit(1);
});
