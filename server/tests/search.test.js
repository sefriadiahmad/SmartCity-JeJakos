const assert = require('assert');
const http = require('http');
const { app } = require('../src/app');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/kos`;

  console.log(`Search & Geospatial test server running on port ${port}`);

  // Reference points in Jambi:
  // UNJA Mendalo: -1.6140, 103.5200
  // UIN STS Sungai Duren: -1.6065, 103.5095
  // UNBARI Telanaipura: -1.6045, 103.5930

  try {
    // 1. Nearby endpoint parameter validation
    console.log('1. Testing GET /api/kos/nearby missing lat/lng (400)...');
    const noCoordRes = await fetch(`${baseUrl}/nearby`);
    assert.strictEqual(noCoordRes.status, 400);

    console.log('1b. Testing GET /api/kos/nearby invalid coordinates (400)...');
    const badCoordRes = await fetch(`${baseUrl}/nearby?lat=999&lng=103.52`);
    assert.strictEqual(badCoordRes.status, 400);

    // 2. Geospatial nearby search around UNJA Mendalo
    console.log('2. Testing GET /api/kos/nearby around UNJA Mendalo (radius 2000m)...');
    const nearbyRes = await fetch(`${baseUrl}/nearby?lat=-1.6140&lng=103.5200&radius=2000`);
    const nearbyData = await nearbyRes.json();
    assert.strictEqual(nearbyRes.status, 200);
    assert.ok(Array.isArray(nearbyData.data));
    assert.ok(nearbyData.data.length > 0);
    assert.strictEqual(nearbyData.center.lat, -1.6140);
    assert.strictEqual(nearbyData.center.lng, 103.5200);
    assert.strictEqual(nearbyData.radius_meters, 2000);

    // Nearest item should be Kos 1 (Mendalo Asri) with ~0m distance
    const firstKos = nearbyData.data[0];
    assert.strictEqual(firstKos.id, 1);
    assert.ok(typeof firstKos.distance_meters === 'number');
    assert.ok(firstKos.distance_meters <= 50);
    assert.ok(typeof firstKos.distance_km === 'number');

    // All returned items must be within radius 2000m and sorted ascending
    for (let i = 0; i < nearbyData.data.length; i++) {
      const item = nearbyData.data[i];
      assert.ok(item.distance_meters <= 2000, `Item ${item.name} distance ${item.distance_meters} exceeds radius`);
      if (i > 0) {
        assert.ok(
          item.distance_meters >= nearbyData.data[i - 1].distance_meters,
          'Items must be sorted by distance ascending'
        );
      }
    }

    // 2b. Test radius in km (radius=2 -> 2000m)
    console.log('2b. Testing radius in km (radius=2)...');
    const kmRes = await fetch(`${baseUrl}/nearby?lat=-1.6140&lng=103.5200&radius=2`);
    const kmData = await kmRes.json();
    assert.strictEqual(kmRes.status, 200);
    assert.strictEqual(kmData.radius_meters, 2000);
    assert.strictEqual(kmData.total, nearbyData.total);

    // 3. Reference point distance calculation in main GET /api/kos (F-13)
    console.log('3. Testing GET /api/kos with reference point coordinates (F-13)...');
    const refPointRes = await fetch(`${baseUrl}?lat=-1.6045&lng=103.5930`); // UNBARI
    const refPointData = await refPointRes.json();
    assert.strictEqual(refPointRes.status, 200);
    assert.ok(refPointData.data.length > 0);
    const unbariKos = refPointData.data.find((k) => k.name.includes('UNBARI'));
    assert.ok(unbariKos, 'Should find kos near UNBARI');
    assert.ok(typeof unbariKos.distance_meters === 'number');
    assert.ok(unbariKos.distance_meters < 500, 'Kos UNBARI should be close to reference point');

    // 4. Filter by price min & max (F-10)
    console.log('4. Testing GET /api/kos filter price (min_price=500000, max_price=700000)...');
    const priceRes = await fetch(`${baseUrl}?min_price=500000&max_price=700000`);
    const priceData = await priceRes.json();
    assert.strictEqual(priceRes.status, 200);
    assert.ok(priceData.data.length > 0);
    for (const k of priceData.data) {
      assert.ok(
        k.min_price >= 500000 && k.min_price <= 700000,
        `Kos ${k.name} price ${k.min_price} should be within 500k-700k`
      );
    }

    // 5. Filter by pay_period (F-10)
    console.log('5. Testing GET /api/kos filter pay_period=tahunan...');
    const periodRes = await fetch(`${baseUrl}?pay_period=tahunan`);
    const periodData = await periodRes.json();
    assert.strictEqual(periodRes.status, 200);
    assert.ok(periodData.data.length > 0);
    assert.ok(periodData.data.some((k) => k.id === 4), 'Kos 4 should be found for sewa tahunan');

    // 6. Filter by facilities (F-10)
    console.log('6. Testing GET /api/kos filter facility_ids=1,2 (WiFi & AC)...');
    const facRes = await fetch(`${baseUrl}?facility_ids=1,2`);
    const facData = await facRes.json();
    assert.strictEqual(facRes.status, 200);
    assert.ok(facData.data.length > 0);
    for (const k of facData.data) {
      const facNames = k.facilities.map((f) => f.name);
      assert.ok(facNames.includes('WiFi'), `${k.name} must have WiFi`);
      assert.ok(facNames.includes('AC'), `${k.name} must have AC`);
    }

    // 7. Filter by type & district (F-10)
    console.log('7. Testing GET /api/kos filter type=putri & district=Danau Teluk...');
    const typeDistRes = await fetch(`${baseUrl}?type=putri&district=Danau%20Teluk`);
    const typeDistData = await typeDistRes.json();
    assert.strictEqual(typeDistRes.status, 200);
    assert.ok(typeDistData.data.length > 0);
    for (const k of typeDistData.data) {
      assert.strictEqual(k.type, 'putri');
      assert.strictEqual(k.district, 'Danau Teluk');
    }

    // 8. Sorting options
    console.log('8. Testing sort=price_asc...');
    const sortAscRes = await fetch(`${baseUrl}?sort=price_asc`);
    const sortAscData = await sortAscRes.json();
    assert.strictEqual(sortAscRes.status, 200);
    for (let i = 1; i < sortAscData.data.length; i++) {
      assert.ok(
        sortAscData.data[i].min_price >= sortAscData.data[i - 1].min_price,
        'Prices must be sorted ascending'
      );
    }

    console.log('8b. Testing sort=price_desc...');
    const sortDescRes = await fetch(`${baseUrl}?sort=price_desc`);
    const sortDescData = await sortDescRes.json();
    assert.strictEqual(sortDescRes.status, 200);
    for (let i = 1; i < sortDescData.data.length; i++) {
      assert.ok(
        sortDescData.data[i].min_price <= sortDescData.data[i - 1].min_price,
        'Prices must be sorted descending'
      );
    }

    // 9. Combined nearby + filters
    console.log('9. Testing combined nearby search with filters...');
    const combinedRes = await fetch(
      `${baseUrl}/nearby?lat=-1.6140&lng=103.5200&radius=5000&type=putri&max_price=700000`
    );
    const combinedData = await combinedRes.json();
    assert.strictEqual(combinedRes.status, 200);
    assert.ok(combinedData.data.length > 0);
    for (const k of combinedData.data) {
      assert.strictEqual(k.type, 'putri');
      assert.ok(k.min_price <= 700000);
      assert.ok(k.distance_meters <= 5000);
    }

    console.log('ALL SEARCH & GEOSPATIAL TESTS PASSED!');
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
