const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/kos`;

  console.log(`Room test server running on port ${port}`);

  // Kos 1 is owned by owner id: 2 (Pak Budi Santoso)
  const ownerToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  const otherOwnerToken = jwt.sign(
    { id: 3, email: 'siti.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  const pencariToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testRoomId = null;

  try {
    // 1. List rooms of kos 1
    console.log('1. Testing GET /api/kos/1/rooms...');
    const listRes = await fetch(`${baseUrl}/1/rooms`);
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listData.rooms));
    assert.ok(listData.rooms.length > 0);
    assert.ok(listData.rooms[0].room_number);
    assert.ok(typeof listData.rooms[0].price === 'number');
    assert.ok(Array.isArray(listData.rooms[0].photos));

    // 1b. Filter available
    console.log('1b. Testing GET /api/kos/1/rooms?available=true...');
    const availRes = await fetch(`${baseUrl}/1/rooms?available=true`);
    const availData = await availRes.json();
    assert.strictEqual(availRes.status, 200);
    assert.ok(availData.rooms.every((r) => r.is_available === true));

    // 2. Room detail
    console.log('2. Testing GET /api/kos/1/rooms/1 (existing room)...');
    const detailRes = await fetch(`${baseUrl}/1/rooms/1`);
    const detailData = await detailRes.json();
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailData.room.id, 1);
    assert.strictEqual(detailData.room.kos_id, 1);
    assert.ok(Array.isArray(detailData.room.photos));

    // 2b. Non-existent kos or room
    console.log('2b. Testing GET /api/kos/999999/rooms (404)...');
    const noKosRes = await fetch(`${baseUrl}/999999/rooms`);
    assert.strictEqual(noKosRes.status, 404);

    console.log('2c. Testing GET /api/kos/1/rooms/999999 (404)...');
    const noRoomRes = await fetch(`${baseUrl}/1/rooms/999999`);
    assert.strictEqual(noRoomRes.status, 404);

    // 3. Create room authorization
    console.log('3. Testing POST /api/kos/1/rooms without token (401)...');
    const noAuthRes = await fetch(`${baseUrl}/1/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 500000 }),
    });
    assert.strictEqual(noAuthRes.status, 401);

    console.log('3b. Testing POST /api/kos/1/rooms with pencari token (403)...');
    const pencariRes = await fetch(`${baseUrl}/1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariToken}`,
      },
      body: JSON.stringify({ price: 500000 }),
    });
    assert.strictEqual(pencariRes.status, 403);

    console.log('3c. Testing POST /api/kos/1/rooms other owner (403)...');
    const otherOwnerRes = await fetch(`${baseUrl}/1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherOwnerToken}`,
      },
      body: JSON.stringify({ price: 500000 }),
    });
    assert.strictEqual(otherOwnerRes.status, 403);

    // 3d. Validation error
    console.log('3d. Testing POST /api/kos/1/rooms invalid price (400)...');
    const badValRes = await fetch(`${baseUrl}/1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        price: -100, // invalid price
      }),
    });
    assert.strictEqual(badValRes.status, 400);

    // 3e. Successful room creation
    console.log('3e. Testing POST /api/kos/1/rooms valid creation with photo...');
    const createRes = await fetch(`${baseUrl}/1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        room_number: 'Kamar C99 Test',
        price: 600000,
        pay_period: 'bulanan',
        description: 'Kamar nyaman uji coba T-21',
        is_available: true,
        photo_urls: ['https://images.unsplash.com/photo-room-test'],
      }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.ok(createData.room.id);
    assert.strictEqual(createData.room.room_number, 'Kamar C99 Test');
    assert.strictEqual(createData.room.price, 600000);
    assert.strictEqual(createData.room.photos.length, 1);
    testRoomId = createData.room.id;

    // 4. Update room
    console.log('4. Testing PUT /api/kos/1/rooms/:id unauthorized other owner (403)...');
    const updateForbiddenRes = await fetch(`${baseUrl}/1/rooms/${testRoomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherOwnerToken}`,
      },
      body: JSON.stringify({ price: 700000 }),
    });
    assert.strictEqual(updateForbiddenRes.status, 403);

    console.log('4b. Testing PUT /api/kos/1/rooms/:id owner success...');
    const updateRes = await fetch(`${baseUrl}/1/rooms/${testRoomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        price: 750000,
        is_available: false,
        description: 'Deskripsi kamar diperbarui',
      }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.room.price, 750000);
    assert.strictEqual(updateData.room.is_available, false);
    assert.strictEqual(updateData.room.description, 'Deskripsi kamar diperbarui');

    // 5. Delete room
    console.log('5. Testing DELETE /api/kos/1/rooms/:id other owner (403)...');
    const deleteForbiddenRes = await fetch(`${baseUrl}/1/rooms/${testRoomId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${otherOwnerToken}`,
      },
    });
    assert.strictEqual(deleteForbiddenRes.status, 403);

    console.log('5b. Testing DELETE /api/kos/1/rooms/:id owner success...');
    const deleteRes = await fetch(`${baseUrl}/1/rooms/${testRoomId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.strictEqual(deleteRes.status, 200);

    console.log('5c. Verifying deleted room is 404...');
    const verifyRes = await fetch(`${baseUrl}/1/rooms/${testRoomId}`);
    assert.strictEqual(verifyRes.status, 404);

    console.log('ALL ROOM CRUD TESTS PASSED!');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

module.exports = { runTests };
