const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/conversations`;

  console.log(`--- Chat & Conversation Test Suite (T-50: F-24~F-25) on port ${port} ---`);

  // Tokens:
  // User 1: Admin
  // User 2: Budi Santoso (Pemilik Kos 1)
  // User 5: Ari Pratama (Pencari)
  // User 6: Dina Lestari (Pencari lain)
  const adminToken = jwt.sign(
    { id: 1, email: 'admin@jejakos.id', role: 'admin' },
    process.env.JWT_SECRET
  );
  const budiOwnerToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  const ariPencariToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );
  const dinaPencariToken = jwt.sign(
    { id: 6, email: 'dina.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );

  let testConversationId = null;

  try {
    // ------------------------------------------------------------
    // 1. Authentication Checks
    // ------------------------------------------------------------
    console.log('1. Testing GET /api/conversations unauthenticated (401)...');
    const noAuthGet = await fetch(baseUrl);
    assert.strictEqual(noAuthGet.status, 401);

    console.log('1b. Testing POST /api/conversations unauthenticated (401)...');
    const noAuthPost = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: 2 }),
    });
    assert.strictEqual(noAuthPost.status, 401);

    // ------------------------------------------------------------
    // 2. Validation & Error Handling
    // ------------------------------------------------------------
    console.log('2. Testing start conversation with oneself (400)...');
    const selfRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ariPencariToken}`,
      },
      body: JSON.stringify({ recipient_id: 5 }),
    });
    assert.strictEqual(selfRes.status, 400);

    console.log('2b. Testing start conversation with missing recipient & kos (400)...');
    const missingRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ariPencariToken}`,
      },
      body: JSON.stringify({ message: 'Halo' }),
    });
    assert.strictEqual(missingRes.status, 400);

    console.log('2c. Testing start conversation with non-existent recipient (404)...');
    const notFoundUserRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ariPencariToken}`,
      },
      body: JSON.stringify({ recipient_id: 999999 }),
    });
    assert.strictEqual(notFoundUserRes.status, 404);

    // ------------------------------------------------------------
    // 3. F-24: Send message from Kos Detail (Auto-resolve Kos Owner)
    // ------------------------------------------------------------
    console.log('3. Testing F-24: Start conversation from kos detail (pencari -> pemilik)...');
    const startRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ariPencariToken}`,
      },
      body: JSON.stringify({
        kos_id: 1, // Kos 1 owned by Budi (id: 2)
        message: 'Halo Pak Budi, apakah Kamar A1 di Kos Mendalo Asri masih tersedia?',
      }),
    });

    assert.strictEqual(startRes.status, 201);
    const startData = await startRes.json();
    assert.ok(startData.conversation);
    testConversationId = startData.conversation.id;

    assert.strictEqual(startData.conversation.user1_id, 5);
    assert.strictEqual(startData.conversation.user2_id, 2);
    assert.strictEqual(startData.conversation.kos_id, 1);
    assert.ok(startData.conversation.kos);
    assert.strictEqual(startData.conversation.kos.id, 1);
    assert.ok(startData.initial_message);
    assert.strictEqual(startData.initial_message.sender_id, 5);
    assert.ok(startData.initial_message.content.includes('Kamar A1'));
    console.log(`✓ Conversation created with ID: ${testConversationId}`);

    // ------------------------------------------------------------
    // 4. Conversation Deduplication
    // ------------------------------------------------------------
    console.log('4. Testing conversation deduplication (reuse existing)...');
    const duplicateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ariPencariToken}`,
      },
      body: JSON.stringify({
        recipient_id: 2,
        kos_id: 1,
      }),
    });

    assert.strictEqual(duplicateRes.status, 200);
    const duplicateData = await duplicateRes.json();
    assert.strictEqual(duplicateData.conversation.id, testConversationId);
    assert.strictEqual(duplicateData.is_new, false);
    console.log('✓ Existing conversation correctly returned');

    // ------------------------------------------------------------
    // 5. F-25: List Conversations for Pencari & Pemilik
    // ------------------------------------------------------------
    console.log('5. Testing GET /api/conversations for Pencari Ari...');
    const ariListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${ariPencariToken}` },
    });
    assert.strictEqual(ariListRes.status, 200);
    const ariListData = await ariListRes.json();
    assert.ok(Array.isArray(ariListData.data));
    const ariConv = ariListData.data.find((c) => c.id === testConversationId);
    assert.ok(ariConv);
    assert.strictEqual(ariConv.other_user.id, 2);
    assert.strictEqual(ariConv.other_user.name, 'Pak Budi Santoso');
    assert.strictEqual(ariConv.kos.id, 1);
    assert.strictEqual(ariConv.unread_count, 0, 'Sender Ari should have 0 unread');
    assert.ok(ariConv.last_message);

    console.log('5b. Testing GET /api/conversations for Pemilik Budi...');
    const budiListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${budiOwnerToken}` },
    });
    assert.strictEqual(budiListRes.status, 200);
    const budiListData = await budiListRes.json();
    const budiConv = budiListData.data.find((c) => c.id === testConversationId);
    assert.ok(budiConv);
    assert.strictEqual(budiConv.other_user.id, 5);
    assert.strictEqual(budiConv.other_user.name, 'Ari Pratama');
    assert.strictEqual(budiConv.unread_count, 1, 'Recipient Budi should have 1 unread message');

    // ------------------------------------------------------------
    // 6. Unread Badge Count
    // ------------------------------------------------------------
    console.log('6. Testing GET /api/conversations/unread-count...');
    const budiUnreadRes = await fetch(`${baseUrl}/unread-count`, {
      headers: { Authorization: `Bearer ${budiOwnerToken}` },
    });
    assert.strictEqual(budiUnreadRes.status, 200);
    const budiUnreadData = await budiUnreadRes.json();
    assert.ok(budiUnreadData.unread_count >= 1);

    const ariUnreadRes = await fetch(`${baseUrl}/unread-count`, {
      headers: { Authorization: `Bearer ${ariPencariToken}` },
    });
    assert.strictEqual(ariUnreadRes.status, 200);
    const ariUnreadData = await ariUnreadRes.json();
    assert.strictEqual(ariUnreadData.unread_count, 0);

    // ------------------------------------------------------------
    // 7. F-25: Send Reply Message
    // ------------------------------------------------------------
    console.log('7. Testing POST /api/conversations/:id/messages (Budi replies)...');
    const replyRes = await fetch(`${baseUrl}/${testConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${budiOwnerToken}`,
      },
      body: JSON.stringify({
        content: 'Halo Mas Ari, Kamar A1 masih ada. Bisa langsung survey besok ya.',
      }),
    });

    assert.strictEqual(replyRes.status, 201);
    const replyData = await replyRes.json();
    assert.ok(replyData.message);
    assert.strictEqual(replyData.message.sender_id, 2);
    assert.strictEqual(replyData.message.is_read, false);
    console.log('✓ Reply message sent successfully');

    // ------------------------------------------------------------
    // 8. List Messages in Conversation
    // ------------------------------------------------------------
    console.log('8. Testing GET /api/conversations/:id/messages...');
    const listMsgRes = await fetch(`${baseUrl}/${testConversationId}/messages`, {
      headers: { Authorization: `Bearer ${ariPencariToken}` },
    });

    assert.strictEqual(listMsgRes.status, 200);
    const listMsgData = await listMsgRes.json();
    assert.strictEqual(listMsgData.conversation_id, testConversationId);
    assert.ok(Array.isArray(listMsgData.data));
    assert.strictEqual(listMsgData.total, 2);
    // Chronological order: first Ari, then Budi
    assert.strictEqual(listMsgData.data[0].sender_id, 5);
    assert.strictEqual(listMsgData.data[1].sender_id, 2);
    console.log('✓ Messages listed in correct chronological order');

    // ------------------------------------------------------------
    // 9. Mark as Read
    // ------------------------------------------------------------
    console.log('9. Testing PUT /api/conversations/:id/read (Ari reads Budi reply)...');
    const readRes = await fetch(`${baseUrl}/${testConversationId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ariPencariToken}` },
    });

    assert.strictEqual(readRes.status, 200);
    const readData = await readRes.json();
    assert.strictEqual(readData.success, true);
    assert.strictEqual(readData.updated_count, 1);

    // Verify unread count is now 0 for Ari
    const ariUnreadAfter = await fetch(`${baseUrl}/unread-count`, {
      headers: { Authorization: `Bearer ${ariPencariToken}` },
    });
    const ariUnreadAfterData = await ariUnreadAfter.json();
    assert.strictEqual(ariUnreadAfterData.unread_count, 0);
    console.log('✓ Messages marked as read successfully');

    // ------------------------------------------------------------
    // 10. Privacy & Authorization Protection
    // ------------------------------------------------------------
    console.log('10. Testing Privacy: Third-party user Dina cannot access conversation (403)...');
    const dinaGetConv = await fetch(`${baseUrl}/${testConversationId}`, {
      headers: { Authorization: `Bearer ${dinaPencariToken}` },
    });
    assert.strictEqual(dinaGetConv.status, 403);

    const dinaGetMessages = await fetch(`${baseUrl}/${testConversationId}/messages`, {
      headers: { Authorization: `Bearer ${dinaPencariToken}` },
    });
    assert.strictEqual(dinaGetMessages.status, 403);

    const dinaPostMsg = await fetch(`${baseUrl}/${testConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dinaPencariToken}`,
      },
      body: JSON.stringify({ content: 'Pesan penyusup' }),
    });
    assert.strictEqual(dinaPostMsg.status, 403);

    console.log('10b. Testing Admin can inspect conversation (200)...');
    const adminGetConv = await fetch(`${baseUrl}/${testConversationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminGetConv.status, 200);
    console.log('✓ Privacy and RBAC authorization verified');

    // ------------------------------------------------------------
    // 11. Cleanup Test Data
    // ------------------------------------------------------------
    console.log('11. Cleaning up test conversation and messages...');
    await db.execute('DELETE FROM conversations WHERE id = ?', [testConversationId]);
    console.log('✓ Cleanup completed');

    console.log('\nALL CHAT & CONVERSATION TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED CHAT TEST:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
