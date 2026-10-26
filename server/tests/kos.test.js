const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const UserModel = require('../src/models/user.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/kos`;

  console.log(`Kos test server running on port ${port}`);

  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
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

  let unapprovedOwnerId = null;
  let unapprovedOwnerToken = null;
  let testKosId = null;
  let testPhotoId = null;

  try {
    // 0. Setup unapproved owner
    console.log('0. Setting up unapproved owner...');
    unapprovedOwnerId = await UserModel.create({
      email: `unapproved_owner_${Date.now()}@test.com`,
      password_hash: 'hash',
      role: 'pemilik',
      name: 'Unapproved Owner',
      is_verified: true,
      is_approved: false,
    });
    unapprovedOwnerToken = jwt.sign(
      { id: unapprovedOwnerId, email: 'unapproved@test.com', role: 'pemilik' },
      process.env.JWT_SECRET
    );

    // 1. Facilities
    console.log('1. Testing GET /api/kos/facilities...');
    const facRes = await fetch(`${baseUrl}/facilities`);
    const facData = await facRes.json();
    assert.strictEqual(facRes.status, 200);
    assert.ok(Array.isArray(facData.facilities));
    assert.ok(facData.facilities.length >= 10);
    assert.ok(facData.facilities.some((f) => f.name === 'WiFi'));

    // 2. List Kos (public)
    console.log('2. Testing GET /api/kos (list public)...');
    const listRes = await fetch(baseUrl);
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listData.data));
    assert.ok(listData.total > 0);
    assert.strictEqual(listData.page, 1);
    assert.ok(listData.data[0].name);
    assert.ok(typeof listData.data[0].latitude === 'number');
    assert.ok(typeof listData.data[0].longitude === 'number');
    assert.ok(Array.isArray(listData.data[0].facilities));
    assert.ok(Array.isArray(listData.data[0].photos));

    // 2b. Filters
    console.log('2b. Testing GET /api/kos with filters (type=putri)...');
    const filterRes = await fetch(`${baseUrl}?type=putri`);
    const filterData = await filterRes.json();
    assert.strictEqual(filterRes.status, 200);
    assert.ok(filterData.data.every((k) => k.type === 'putri'));

    console.log('2c. Testing GET /api/kos with search query...');
    const searchRes = await fetch(`${baseUrl}?q=Mendalo`);
    const searchData = await searchRes.json();
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchData.data.length > 0);

    // 3. Detail Kos
    console.log('3. Testing GET /api/kos/:id (existing)...');
    const detailRes = await fetch(`${baseUrl}/1`);
    const detailData = await detailRes.json();
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailData.kos.id, 1);
    assert.ok(detailData.kos.owner_name);
    assert.ok(Array.isArray(detailData.kos.rooms));
    assert.ok(Array.isArray(detailData.kos.facilities));
    assert.ok(typeof detailData.kos.avg_rating === 'number');

    console.log('3b. Testing GET /api/kos/:id (not found)...');
    const notFoundRes = await fetch(`${baseUrl}/999999`);
    assert.strictEqual(notFoundRes.status, 404);

    console.log('3c. Testing GET /api/kos/:id rejects malformed ID...');
    const malformedIdRes = await fetch(`${baseUrl}/${encodeURIComponent('1 OR 1=1')}`);
    assert.strictEqual(malformedIdRes.status, 400);

    // 4. Create Kos Authorization
    console.log('4. Testing POST /api/kos without token...');
    const noAuthRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Kos' }),
    });
    assert.strictEqual(noAuthRes.status, 401);

    console.log('4b. Testing POST /api/kos with pencari token (403)...');
    const pencariRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariToken}`,
      },
      body: JSON.stringify({
        name: 'Kos Pencari',
        address: 'Jl. Testing No. 1',
        latitude: -1.61,
        longitude: 103.52,
        type: 'putra',
      }),
    });
    assert.strictEqual(pencariRes.status, 403);

    console.log('4c. Testing POST /api/kos with unapproved owner (403)...');
    const unapprovedRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unapprovedOwnerToken}`,
      },
      body: JSON.stringify({
        name: 'Kos Unapproved',
        address: 'Jl. Testing No. 1',
        latitude: -1.61,
        longitude: 103.52,
        type: 'putra',
      }),
    });
    assert.strictEqual(unapprovedRes.status, 403);

    // 4d. Validation Error
    console.log('4d. Testing POST /api/kos validation errors...');
    const badValRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'AB', // too short
        address: 'Jl',
        latitude: 1000, // invalid lat
        longitude: 103.52,
        type: 'invalid-type',
      }),
    });
    assert.strictEqual(badValRes.status, 400);

    // 4e. Successful Creation by Approved Owner
    console.log('4e. Testing POST /api/kos valid creation...');
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Kos Baru Test T-20',
        address: 'Jl. Jambi Sejahtera No. 42',
        latitude: -1.6123,
        longitude: 103.5211,
        district: 'Jambi Luar Kota',
        type: 'campur',
        description: 'Kos baru nyaman dengan fasilitas lengkap.',
        facility_ids: [1, 2, 4],
      }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.ok(createData.kos.id);
    assert.strictEqual(createData.kos.name, 'Kos Baru Test T-20');
    assert.strictEqual(createData.kos.owner_id, 2);
    assert.strictEqual(createData.kos.is_approved, false);
    assert.strictEqual(createData.kos.facilities.length, 3);
    testKosId = createData.kos.id;

    // 5. Update Kos
    console.log('5. Testing PUT /api/kos/:id unauthorized other owner (403)...');
    const updateForbiddenRes = await fetch(`${baseUrl}/${testKosId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherOwnerToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Kos' }),
    });
    assert.strictEqual(updateForbiddenRes.status, 403);

    console.log('5b. Testing PUT /api/kos/:id by owner...');
    const updateRes = await fetch(`${baseUrl}/${testKosId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Kos Baru Test T-20 Updated',
        description: 'Deskripsi yang sudah diubah.',
        facility_ids: [1, 2],
      }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.kos.name, 'Kos Baru Test T-20 Updated');
    assert.strictEqual(updateData.kos.facilities.length, 2);

    // 6. Upload Photo
    console.log('6. Testing POST /api/kos/:id/photos with JSON photo_url...');
    const photoJsonRes = await fetch(`${baseUrl}/${testKosId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        photo_url: 'https://images.unsplash.com/photo-test-url',
        sort_order: 1,
      }),
    });
    const photoJsonData = await photoJsonRes.json();
    assert.strictEqual(photoJsonRes.status, 201);
    assert.ok(Array.isArray(photoJsonData.photos));
    assert.strictEqual(photoJsonData.photos[0].photo_url, 'https://images.unsplash.com/photo-test-url');
    testPhotoId = photoJsonData.photos[0].id;

    console.log('6b. Testing POST /api/kos/:id/photos with multipart file upload...');
    const formData = new FormData();
    const fakeImageBuffer = Buffer.from('fake-jpeg-binary-content');
    formData.append('photo', new Blob([fakeImageBuffer], { type: 'image/jpeg' }), 'kos-front.jpg');

    const photoFileRes = await fetch(`${baseUrl}/${testKosId}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: formData,
    });
    const photoFileData = await photoFileRes.json();
    assert.strictEqual(photoFileRes.status, 201);
    assert.ok(photoFileData.photos[0].photo_url.startsWith('/uploads/'));

    console.log('6c. Testing POST /api/kos/:id/photos without file/url (400)...');
    const photoEmptyRes = await fetch(`${baseUrl}/${testKosId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(photoEmptyRes.status, 400);

    // 7. Delete Photo
    console.log('7. Testing DELETE /api/kos/:id/photos/:photoId other owner (403)...');
    const deletePhotoForbiddenRes = await fetch(`${baseUrl}/${testKosId}/photos/${testPhotoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${otherOwnerToken}`,
      },
    });
    assert.strictEqual(deletePhotoForbiddenRes.status, 403);

    console.log('7b. Testing DELETE /api/kos/:id/photos/:photoId owner success...');
    const deletePhotoRes = await fetch(`${baseUrl}/${testKosId}/photos/${testPhotoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.strictEqual(deletePhotoRes.status, 200);

    // 8. Delete Kos
    console.log('8. Testing DELETE /api/kos/:id other owner (403)...');
    const deleteKosForbiddenRes = await fetch(`${baseUrl}/${testKosId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${otherOwnerToken}`,
      },
    });
    assert.strictEqual(deleteKosForbiddenRes.status, 403);

    console.log('8b. Testing DELETE /api/kos/:id owner success...');
    const deleteKosRes = await fetch(`${baseUrl}/${testKosId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    assert.strictEqual(deleteKosRes.status, 200);

    console.log('8c. Verifying deleted kos is gone (404)...');
    const verifyDeletedRes = await fetch(`${baseUrl}/${testKosId}`);
    assert.strictEqual(verifyDeletedRes.status, 404);

    console.log('ALL KOS CRUD & PHOTO TESTS PASSED!');
  } finally {
    // Cleanup unapproved test user if created
    if (unapprovedOwnerId) {
      await db.execute('DELETE FROM users WHERE id = ?', [unapprovedOwnerId]);
    }
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
