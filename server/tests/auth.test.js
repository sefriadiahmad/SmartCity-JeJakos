const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const db = require('../src/config/db');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/auth`;

  console.log(`Test server running on port ${port}`);

  const testEmail = `test_${Date.now()}@example.com`;
  const initialPassword = 'password123';
  const newPassword = 'newpassword123';
  let accessToken = '';
  let refreshToken = '';
  let verificationToken = '';
  let resetToken = '';
  let createdUserId = null;

  try {
    // 1. Register
    console.log('1. Testing register...');
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
        role: 'pencari',
        name: 'Tester JeJakos',
        phone: '081299998888',
      }),
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, `Register failed: ${JSON.stringify(regData)}`);
    assert.strictEqual(regData.user.email, testEmail);
    assert.strictEqual(regData.user.role, 'pencari');
    assert.strictEqual(regData.user.is_verified, false);
    createdUserId = regData.user.id;
    assert.ok(!regData.verificationToken);
    verificationToken = jwt.sign(
      { id: createdUserId, email: testEmail, type: 'verify_email' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 1b. Register duplicate email
    console.log('1b. Testing duplicate email register...');
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
        role: 'pencari',
      }),
    });
    assert.strictEqual(dupRes.status, 400);

    // 2. Verify Email
    console.log('2. Testing verify email...');
    const verifyRes = await fetch(`${baseUrl}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200, `Verify failed: ${JSON.stringify(verifyData)}`);

    // 3. Login
    console.log('3. Testing login...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, `Login failed: ${JSON.stringify(loginData)}`);
    assert.ok(!loginData.accessToken);
    assert.ok(!loginData.refreshToken);
    assert.ok(loginRes.headers.get('set-cookie')?.includes('accessToken='));
    accessToken = jwt.sign({ id: createdUserId, email: testEmail, role: 'pencari' }, process.env.JWT_SECRET);
    refreshToken = jwt.sign({ id: createdUserId }, process.env.JWT_REFRESH_SECRET);
    assert.strictEqual(loginData.user.is_verified, true);

    // 3b. Login wrong password
    console.log('3b. Testing login wrong password...');
    const wrongLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongpassword',
      }),
    });
    assert.strictEqual(wrongLoginRes.status, 401);

    // 4. Get Me
    console.log('4. Testing get me...');
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200, `Get me failed: ${JSON.stringify(meData)}`);
    assert.strictEqual(meData.user.email, testEmail);
    assert.strictEqual(meData.user.name, 'Tester JeJakos');

    // 4b. Get Me without token
    console.log('4b. Testing get me unauthenticated...');
    const unauthRes = await fetch(`${baseUrl}/me`);
    assert.strictEqual(unauthRes.status, 401);

    // 5. Update Profile
    console.log('5. Testing update profile...');
    const updateRes = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Tester Updated',
        phone: '081200001111',
      }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200, `Profile update failed: ${JSON.stringify(updateData)}`);
    assert.strictEqual(updateData.user.name, 'Tester Updated');
    assert.strictEqual(updateData.user.phone, '081200001111');

    // 6. Refresh Token
    console.log('6. Testing refresh token...');
    const refreshRes = await fetch(`${baseUrl}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();
    assert.strictEqual(refreshRes.status, 200, `Refresh failed: ${JSON.stringify(refreshData)}`);
    assert.ok(!refreshData.accessToken);
    assert.ok(refreshRes.headers.get('set-cookie')?.includes('accessToken='));

    // 7. Forgot Password
    console.log('7. Testing forgot password...');
    const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotRes.status, 200, `Forgot password failed: ${JSON.stringify(forgotData)}`);
    assert.ok(!forgotData.resetToken);
    resetToken = jwt.sign(
      { id: createdUserId, email: testEmail, type: 'reset_password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 8. Reset Password
    console.log('8. Testing reset password...');
    const resetRes = await fetch(`${baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: newPassword,
      }),
    });
    const resetData = await resetRes.json();
    assert.strictEqual(resetRes.status, 200, `Reset failed: ${JSON.stringify(resetData)}`);

    // 8b. Login with new password
    console.log('8b. Testing login with reset password...');
    const newLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    });
    assert.strictEqual(newLoginRes.status, 200);

    // 9. Logout
    console.log('9. Testing logout...');
    const logoutRes = await fetch(`${baseUrl}/logout`, { method: 'POST' });
    assert.strictEqual(logoutRes.status, 200);

    console.log('ALL AUTH TESTS PASSED!');
  } finally {
    if (createdUserId) {
      await db.execute('DELETE FROM users WHERE id = ?', [createdUserId]);
    }
    await new Promise((resolve) => server.close(resolve));
    await db.end();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
