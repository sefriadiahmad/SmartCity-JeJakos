const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const BookingModel = require('../src/models/booking.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://localhost:${server.address().port}/api/reviews`;
  const tenantToken = jwt.sign({ id: 5, role: 'pencari' }, process.env.JWT_SECRET);
  const otherTenantToken = jwt.sign({ id: 6, role: 'pencari' }, process.env.JWT_SECRET);
  let bookingId;
  let activeBookingId;
  let reviewId;

  try {
    bookingId = await BookingModel.create({
      room_id: 1,
      tenant_id: 5,
      status: 'completed',
      check_in_date: '2026-01-01',
      check_out_date: '2026-06-01',
    });

    const noAuth = await fetch(baseUrl, { method: 'POST' });
    assert.strictEqual(noAuth.status, 401);

    const badRating = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, rating: 6 }),
    });
    assert.strictEqual(badRating.status, 400);

    const foreignBooking = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherTenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, rating: 5 }),
    });
    assert.strictEqual(foreignBooking.status, 403);

    const created = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, rating: 5, content: 'Kos nyaman, pemilik sangat responsif.' }),
    });
    assert.strictEqual(created.status, 201);
    const createData = await created.json();
    reviewId = createData.review.id;
    assert.strictEqual(createData.review.rating, 5);
    assert.ok(createData.rating_summary.total_reviews >= 1);

    activeBookingId = await BookingModel.create({
      room_id: 2,
      tenant_id: 5,
      status: 'active',
      check_in_date: '2026-06-01',
    });
    const activeReview = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: activeBookingId, rating: 4 }),
    });
    assert.strictEqual(activeReview.status, 201);
    await activeReview.json();

    const duplicate = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenantToken}` },
      body: JSON.stringify({ booking_id: bookingId, rating: 5 }),
    });
    assert.strictEqual(duplicate.status, 400);

    const listed = await fetch(`${baseUrl}/kos/1`);
    assert.strictEqual(listed.status, 200);
    const listData = await listed.json();
    assert.ok(listData.reviews.some((review) => review.id === reviewId));
    assert.ok(listData.rating_summary.avg_rating >= 1);
  } finally {
    if (activeBookingId) {
      await db.execute('DELETE FROM reviews WHERE booking_id = ?', [activeBookingId]);
      await BookingModel.delete(activeBookingId);
    }
    if (reviewId) await db.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    if (bookingId) await BookingModel.delete(bookingId);
    server.close();
  }

  console.log('ALL REVIEW TESTS PASSED');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Review test failed:', err);
  process.exit(1);
});
