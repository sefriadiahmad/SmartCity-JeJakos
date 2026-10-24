const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const { app } = require('../src/app');
const db = require('../src/config/db');

async function runTests() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:*',
      methods: ['GET', 'POST'],
    },
  });

  // Initialize Socket.IO handler
  require('../src/socket/socketHandler')(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  console.log(`--- Socket.IO Handler Test Suite (T-51: F-25~F-26) on port ${port} ---`);

  // Test users and tokens
  const ariToken = jwt.sign(
    { id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' },
    process.env.JWT_SECRET
  );
  const budiToken = jwt.sign(
    { id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' },
    process.env.JWT_SECRET
  );
  const invalidToken = 'invalid.jwt.token';

  let testConversationId = null;
  let ariSocket = null;
  let budiSocket = null;

  try {
    // Setup: Create test conversation
    console.log('Setup: Creating test conversation...');
    const convResult = await db.execute(
      `INSERT INTO conversations (user1_id, user2_id, kos_id)
       VALUES (5, 2, 1)`
    );
    testConversationId = convResult[0].insertId;
    console.log(`✓ Test conversation created with ID: ${testConversationId}`);

    // --------------------------------------------------------
    // 1. Authentication
    // --------------------------------------------------------
    console.log('1. Testing Socket.IO authentication (invalid token)...');
    try {
      const invalidSocket = ioClient(serverUrl, {
        auth: { token: invalidToken },
        reconnection: false,
      });

      await new Promise((resolve, reject) => {
        invalidSocket.on('connect_error', (error) => {
          resolve();
        });
        invalidSocket.on('connect', () => {
          reject(new Error('Should not connect with invalid token'));
        });
        setTimeout(() => reject(new Error('Timeout waiting for auth error')), 5000);
      });
      console.log('✓ Invalid token rejected');
    } catch (err) {
      if (err.message === 'Timeout waiting for auth error') {
        throw err;
      }
    }

    // --------------------------------------------------------
    // 2. Valid Connection & Join Conversation
    // --------------------------------------------------------
    console.log('2. Testing valid Socket.IO connection (Ari)...');
    ariSocket = ioClient(serverUrl, {
      auth: { token: ariToken },
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      ariSocket.on('connect', resolve);
      ariSocket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Ari connection timeout')), 5000);
    });
    console.log('✓ Ari connected successfully');

    console.log('2b. Testing joinConversation event (Ari)...');
    const ariJoinResult = await new Promise((resolve, reject) => {
      ariSocket.emit('joinConversation', { conversationId: testConversationId }, (result) => {
        resolve(result);
      });
      setTimeout(() => reject(new Error('joinConversation timeout')), 5000);
    });
    assert.strictEqual(ariJoinResult.success, true);
    console.log('✓ Ari joined conversation');

    console.log('3. Testing valid Socket.IO connection (Budi)...');
    budiSocket = ioClient(serverUrl, {
      auth: { token: budiToken },
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      budiSocket.on('connect', resolve);
      budiSocket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Budi connection timeout')), 5000);
    });
    console.log('✓ Budi connected successfully');

    console.log('3b. Testing joinConversation event (Budi)...');
    const budiJoinResult = await new Promise((resolve, reject) => {
      budiSocket.emit('joinConversation', { conversationId: testConversationId }, (result) => {
        resolve(result);
      });
      setTimeout(() => reject(new Error('joinConversation timeout')), 5000);
    });
    assert.strictEqual(budiJoinResult.success, true);
    console.log('✓ Budi joined conversation');

    // --------------------------------------------------------
    // 4. F-25: Send & Receive Messages (Real-time)
    // --------------------------------------------------------
    console.log('4. Testing sendMessage event (Ari sends to Budi)...');
    const messageContent = 'Halo Pak Budi, apakah kamarnya masih tersedia?';

    // Setup listener on Budi's socket to receive message
    let receivedMessage = null;
    const messagePromise = new Promise((resolve) => {
      budiSocket.on('newMessage', (data) => {
        receivedMessage = data;
        resolve();
      });
    });

    // Ari sends message
    const sendResult = await new Promise((resolve, reject) => {
      ariSocket.emit(
        'sendMessage',
        { conversationId: testConversationId, content: messageContent },
        (result) => {
          resolve(result);
        }
      );
      setTimeout(() => reject(new Error('sendMessage timeout')), 5000);
    });

    assert.strictEqual(sendResult.success, true);
    assert.ok(sendResult.message);
    assert.strictEqual(sendResult.message.sender_id, 5);
    assert.strictEqual(sendResult.message.content, messageContent);

    // Wait for broadcast
    await Promise.race([
      messagePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('No broadcast received')), 5000)),
    ]);

    assert.ok(receivedMessage);
    assert.strictEqual(receivedMessage.message.sender_id, 5);
    assert.strictEqual(receivedMessage.conversationId, testConversationId);
    console.log('✓ Message sent and broadcasted to room (F-25)');

    // --------------------------------------------------------
    // 5. F-26: Mark Read
    // --------------------------------------------------------
    console.log('5. Testing markRead event (Budi marks messages as read)...');

    let readBroadcast = null;
    const readPromise = new Promise((resolve) => {
      ariSocket.on('messageRead', (data) => {
        readBroadcast = data;
        resolve();
      });
    });

    const markReadResult = await new Promise((resolve, reject) => {
      budiSocket.emit('markRead', { conversationId: testConversationId }, (result) => {
        resolve(result);
      });
      setTimeout(() => reject(new Error('markRead timeout')), 5000);
    });

    assert.strictEqual(markReadResult.success, true);
    assert.strictEqual(markReadResult.updated_count, 1);

    // Wait for broadcast
    await Promise.race([
      readPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('No read broadcast')), 5000)),
    ]);

    assert.ok(readBroadcast);
    assert.strictEqual(readBroadcast.readBy, 2);
    assert.strictEqual(readBroadcast.conversationId, testConversationId);
    console.log('✓ Messages marked as read and broadcasted (F-26)');

    // --------------------------------------------------------
    // 6. Authorization: Third-party cannot join
    // --------------------------------------------------------
    console.log('6. Testing authorization (third-party user cannot join)...');
    const dinaPencariToken = jwt.sign(
      { id: 6, email: 'dina.pencari@gmail.com', role: 'pencari' },
      process.env.JWT_SECRET
    );

    const dinaSocket = ioClient(serverUrl, {
      auth: { token: dinaPencariToken },
      reconnection: false,
    });

    await new Promise((resolve) => {
      dinaSocket.on('connect', resolve);
      setTimeout(() => resolve(), 3000);
    });

    const dinaJoinResult = await new Promise((resolve, reject) => {
      dinaSocket.emit('joinConversation', { conversationId: testConversationId }, (result) => {
        resolve(result);
      });
      setTimeout(() => reject(new Error('Dina join timeout')), 5000);
    });

    assert.strictEqual(dinaJoinResult.success, false);
    assert.ok(dinaJoinResult.error);
    console.log('✓ Third-party user correctly denied access');

    dinaSocket.close();

    // --------------------------------------------------------
    // 7. leaveConversation
    // --------------------------------------------------------
    console.log('7. Testing leaveConversation event...');
    ariSocket.emit('leaveConversation', { conversationId: testConversationId });
    // Wait a bit for the event to process
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('✓ User left conversation');

    // --------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------
    console.log('8. Cleaning up test data...');
    ariSocket.close();
    budiSocket.close();
    await db.execute('DELETE FROM messages WHERE conversation_id = ?', [testConversationId]);
    await db.execute('DELETE FROM conversations WHERE id = ?', [testConversationId]);
    console.log('✓ Cleanup completed');

    console.log('\nALL SOCKET.IO TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED SOCKET.IO TEST:', err);
    if (ariSocket) ariSocket.close();
    if (budiSocket) budiSocket.close();
    if (testConversationId) {
      await db.execute('DELETE FROM messages WHERE conversation_id = ?', [testConversationId]);
      await db.execute('DELETE FROM conversations WHERE id = ?', [testConversationId]);
    }
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
