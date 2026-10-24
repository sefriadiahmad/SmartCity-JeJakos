const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');
const ChatbotModel = require('../src/models/chatbot.model');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/chatbot`;
  const adminBaseUrl = `http://localhost:${port}/api/admin`;

  console.log(`--- Chatbot Route & Logging Test Suite (T-41: F-19, F-23, NF-05) on port ${port} ---`);

  // Tokens for actors (id: 1 admin, id: 2 pemilik, id: 5 pencari Ari, id: 6 pencari Dina)
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
  const pencariDinaToken = jwt.sign(
    { id: 6, email: 'dina.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  const sessionId = `test_ses_${Date.now()}`;

  try {
    // ------------------------------------------------------------
    // 1. Authentication & Validation checks
    // ------------------------------------------------------------
    console.log('1. Testing POST /api/chatbot/message unauthenticated (401)...');
    const noAuthRes = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Halo' }),
    });
    assert.strictEqual(noAuthRes.status, 401);

    console.log('1b. Testing POST /api/chatbot/message empty message (400)...');
    const emptyMsgRes = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariToken}`,
      },
      body: JSON.stringify({ message: '   ' }),
    });
    assert.strictEqual(emptyMsgRes.status, 400);

    // ------------------------------------------------------------
    // 2. Successful message send & response structure
    // ------------------------------------------------------------
    console.log('2. Testing POST /api/chatbot/message with valid token...');
    const chatRes = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariToken}`,
      },
      body: JSON.stringify({
        message: 'Cari kos putra dekat UNJA budget 600rb ada WiFi',
        session_id: sessionId,
      }),
    });

    assert.strictEqual(chatRes.status, 200);
    const chatData = await chatRes.json();
    assert.ok(typeof chatData.message === 'string');
    assert.ok(Array.isArray(chatData.kos));
    assert.ok(Array.isArray(chatData.kos_ids));
    assert.strictEqual(chatData.session_id, sessionId);
    assert.ok(typeof chatData.log_id === 'number');
    assert.ok(chatData.daily_usage);
    assert.ok(typeof chatData.daily_usage.used === 'number');
    assert.strictEqual(chatData.daily_usage.limit, 20);
    console.log('✓ Chatbot message response structure verified');

    // ------------------------------------------------------------
    // 3. PII Masking before DB Storage (NF-05, Design §8)
    // ------------------------------------------------------------
    console.log('3. Testing PII Data Masking in chatbot_logs (NF-05)...');
    const rawEmail = 'aripratama.private@gmail.com';
    const rawPhone = '0812-3456-7890';
    const sensitiveMsg = `Halo saya mau tanya kos, kontak saya email ${rawEmail} atau wa ${rawPhone} ya`;

    const sensitiveRes = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariToken}`,
      },
      body: JSON.stringify({
        message: sensitiveMsg,
        session_id: sessionId,
      }),
    });
    assert.strictEqual(sensitiveRes.status, 200);
    const sensitiveData = await sensitiveRes.json();
    const storedLogId = sensitiveData.log_id;

    // Check DB directly to verify raw PII is NEVER saved unmasked
    const [dbRows] = await db.execute(
      'SELECT user_message, bot_response FROM chatbot_logs WHERE id = ?',
      [storedLogId]
    );
    assert.strictEqual(dbRows.length, 1);
    const storedMessage = dbRows[0].user_message;

    assert.ok(!storedMessage.includes(rawEmail), 'Raw email must NOT be present in DB');
    assert.ok(!storedMessage.includes(rawPhone), 'Raw phone must NOT be present in DB');
    assert.ok(storedMessage.includes('a***@gmail.com'), 'Email must be masked as a***@gmail.com');
    assert.ok(storedMessage.includes('0812****7890'), 'Phone must be masked as 0812****7890');
    console.log('✓ PII masking verified: sensitive data masked before storage in DB');

    // ------------------------------------------------------------
    // 4. GET /api/chatbot/history (F-19, Design §3)
    // ------------------------------------------------------------
    console.log('4. Testing GET /api/chatbot/history...');
    const histNoAuth = await fetch(`${baseUrl}/history`);
    assert.strictEqual(histNoAuth.status, 401);

    const histRes = await fetch(`${baseUrl}/history?session_id=${sessionId}`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(histRes.status, 200);
    const histData = await histRes.json();
    assert.ok(Array.isArray(histData.data));
    assert.ok(histData.data.length >= 2);
    assert.strictEqual(histData.data[0].session_id, sessionId);
    assert.ok(histData.data[0].user_message);
    assert.ok(histData.data[0].bot_response);
    console.log('✓ Chatbot session history retrieved successfully');

    // ------------------------------------------------------------
    // 5. Daily Rate Limiting: Max 20/day (Design §5.2)
    // ------------------------------------------------------------
    console.log('5. Testing Daily Rate Limit (Max 20 messages/day, 429)...');
    // Using user id: 6 (Dina) for rate limit test
    const countDina = await ChatbotModel.getDailyMessageCount(6);
    const needToInsert = 20 - countDina;

    // Seed up to 20 logs for user 6 today
    for (let i = 0; i < needToInsert; i++) {
      await db.execute(
        `INSERT INTO chatbot_logs (user_id, session_id, user_message, bot_response, created_at)
         VALUES (6, 'rate_limit_ses', 'test', 'resp', NOW())`
      );
    }

    // 21st message should be rejected with 429
    const blockedRes = await fetch(`${baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pencariDinaToken}`,
      },
      body: JSON.stringify({ message: 'Pesan ke-21 yang harus ditolak' }),
    });

    assert.strictEqual(blockedRes.status, 429);
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.limit, 20);
    assert.strictEqual(blockedData.remaining, 0);
    assert.ok(blockedData.error.includes('Batas pesan harian'));
    console.log('✓ Daily rate limit of 20 messages/user/day enforced with HTTP 429');

    // ------------------------------------------------------------
    // 6. Admin Chatbot Logs Monitoring (F-23: GET /api/admin/chatbot-logs)
    // ------------------------------------------------------------
    console.log('6. Testing Admin Chatbot Logs (F-23)...');
    // 6a. Unauthenticated access (401)
    const adminNoAuth = await fetch(`${adminBaseUrl}/chatbot-logs`);
    assert.strictEqual(adminNoAuth.status, 401);

    // 6b. Non-admin access: Pencari (403) & Pemilik (403)
    const pencariAdminRes = await fetch(`${adminBaseUrl}/chatbot-logs`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(pencariAdminRes.status, 403);

    const ownerAdminRes = await fetch(`${adminBaseUrl}/chatbot-logs`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(ownerAdminRes.status, 403);

    // 6c. Admin access (200)
    const adminRes = await fetch(`${adminBaseUrl}/chatbot-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const adminData = await adminRes.json();

    assert.ok(Array.isArray(adminData.data));
    assert.ok(typeof adminData.total === 'number');
    assert.ok(adminData.total > 0);
    assert.strictEqual(adminData.page, 1);
    assert.strictEqual(adminData.limit, 20);

    // Verify first item contains masked user details
    const sampleLog = adminData.data[0];
    assert.ok(typeof sampleLog.id === 'number');
    assert.ok(sampleLog.user);
    assert.ok(sampleLog.user.name);
    // User email and phone must be masked
    if (sampleLog.user.email) {
      assert.ok(sampleLog.user.email.includes('***'));
    }
    if (sampleLog.user.phone) {
      assert.ok(sampleLog.user.phone.includes('****'));
    }

    // 6d. Test search filter
    const searchAdminRes = await fetch(`${adminBaseUrl}/chatbot-logs?search=UNJA`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(searchAdminRes.status, 200);
    const searchAdminData = await searchAdminRes.json();
    assert.ok(Array.isArray(searchAdminData.data));

    console.log('✓ Admin Chatbot Logs RBAC, pagination, search, and data masking verified');

    // ------------------------------------------------------------
    // 7. Cleanup test logs
    // ------------------------------------------------------------
    console.log('7. Cleaning up test logs...');
    await db.execute('DELETE FROM chatbot_logs WHERE session_id IN (?, ?)', [
      sessionId,
      'rate_limit_ses',
    ]);
    console.log('✓ Cleanup completed');

    console.log('\nALL CHATBOT ROUTE & LOGGING TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED CHATBOT ROUTE TEST:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
