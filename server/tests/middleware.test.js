const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { loadEnv } = require('../src/config/env');

loadEnv();

const auth = require('../src/middleware/auth');
const rbac = require('../src/middleware/rbac');
const { requireApproved, requireVerified } = rbac;
const errorHandler = require('../src/middleware/errorHandler');
const db = require('../src/config/db');
const UserModel = require('../src/models/user.model');

async function runTests() {
  const app = express();
  app.use(express.json());

  // Test routes
  app.get('/test/auth-only', auth, (req, res) => {
    res.json({ message: 'auth success', user: req.user });
  });

  app.get('/test/auth-optional', auth.optional, (req, res) => {
    res.json({ message: 'optional success', user: req.user || null });
  });

  app.get('/test/admin-only', auth, rbac('admin'), (req, res) => {
    res.json({ message: 'admin success' });
  });

  app.get('/test/pemilik-or-admin', auth, rbac('pemilik', 'admin'), (req, res) => {
    res.json({ message: 'pemilik or admin success' });
  });

  app.get('/test/owner-approved', auth, rbac('pemilik'), requireApproved, (req, res) => {
    res.json({ message: 'approved owner success' });
  });

  app.get('/test/verified-only', auth, requireVerified, (req, res) => {
    res.json({ message: 'verified success' });
  });

  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/test`;

  console.log(`Middleware test server running on port ${port}`);

  const adminToken = jwt.sign({ id: 1, email: 'admin@jejakos.id', role: 'admin' }, process.env.JWT_SECRET);
  const pencariToken = jwt.sign({ id: 5, email: 'ari.pencari@gmail.com', role: 'pencari' }, process.env.JWT_SECRET);

  let unapprovedOwnerId = null;
  let unverifiedUserId = null;

  try {
    // 1. Auth middleware tests
    console.log('1. Testing auth without token...');
    const noTokenRes = await fetch(`${baseUrl}/auth-only`);
    assert.strictEqual(noTokenRes.status, 401);

    console.log('1b. Testing auth with malformed token header...');
    const badHeaderRes = await fetch(`${baseUrl}/auth-only`, {
      headers: { Authorization: 'Basic some-credentials' },
    });
    assert.strictEqual(badHeaderRes.status, 401);

    console.log('1c. Testing auth with invalid JWT...');
    const invalidTokenRes = await fetch(`${baseUrl}/auth-only`, {
      headers: { Authorization: 'Bearer invalid.token.signature' },
    });
    assert.strictEqual(invalidTokenRes.status, 401);

    console.log('1d. Testing auth with valid JWT...');
    const validTokenRes = await fetch(`${baseUrl}/auth-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const validTokenData = await validTokenRes.json();
    assert.strictEqual(validTokenRes.status, 200);
    assert.strictEqual(validTokenData.user.role, 'admin');

    // 2. Auth optional tests
    console.log('2. Testing auth.optional without token...');
    const optNoTokenRes = await fetch(`${baseUrl}/auth-optional`);
    const optNoTokenData = await optNoTokenRes.json();
    assert.strictEqual(optNoTokenRes.status, 200);
    assert.strictEqual(optNoTokenData.user, null);

    console.log('2b. Testing auth.optional with invalid token...');
    const optBadTokenRes = await fetch(`${baseUrl}/auth-optional`, {
      headers: { Authorization: 'Bearer totally-invalid' },
    });
    const optBadTokenData = await optBadTokenRes.json();
    assert.strictEqual(optBadTokenRes.status, 200);
    assert.strictEqual(optBadTokenData.user, null);

    console.log('2c. Testing auth.optional with valid token...');
    const optValidTokenRes = await fetch(`${baseUrl}/auth-optional`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const optValidTokenData = await optValidTokenRes.json();
    assert.strictEqual(optValidTokenRes.status, 200);
    assert.strictEqual(optValidTokenData.user.role, 'admin');

    // 3. RBAC tests
    console.log('3. Testing RBAC single role forbidden...');
    const rbacForbiddenRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(rbacForbiddenRes.status, 403);

    console.log('3b. Testing RBAC single role allowed...');
    const rbacAllowedRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(rbacAllowedRes.status, 200);

    console.log('3c. Testing RBAC multiple roles allowed...');
    const multiRes = await fetch(`${baseUrl}/pemilik-or-admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(multiRes.status, 200);

    const multiPencariRes = await fetch(`${baseUrl}/pemilik-or-admin`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(multiPencariRes.status, 403);

    // 4. requireApproved tests
    console.log('4. Testing requireApproved with approved owner (id: 2)...');
    const approvedOwnerToken = jwt.sign({ id: 2, email: 'budi.pemilik@gmail.com', role: 'pemilik' }, process.env.JWT_SECRET);
    const approvedRes = await fetch(`${baseUrl}/owner-approved`, {
      headers: { Authorization: `Bearer ${approvedOwnerToken}` },
    });
    assert.strictEqual(approvedRes.status, 200);

    console.log('4b. Testing requireApproved with unapproved owner...');
    unapprovedOwnerId = await UserModel.create({
      email: `unapproved_${Date.now()}@test.com`,
      password_hash: 'hash',
      role: 'pemilik',
      is_approved: false,
      is_verified: true,
    });
    const unapprovedOwnerToken = jwt.sign({ id: unapprovedOwnerId, role: 'pemilik' }, process.env.JWT_SECRET);
    const unapprovedRes = await fetch(`${baseUrl}/owner-approved`, {
      headers: { Authorization: `Bearer ${unapprovedOwnerToken}` },
    });
    assert.strictEqual(unapprovedRes.status, 403);

    // 5. requireVerified tests
    console.log('5. Testing requireVerified with unverified user...');
    unverifiedUserId = await UserModel.create({
      email: `unverified_${Date.now()}@test.com`,
      password_hash: 'hash',
      role: 'pencari',
      is_approved: false,
      is_verified: false,
    });
    const unverifiedToken = jwt.sign({ id: unverifiedUserId, role: 'pencari' }, process.env.JWT_SECRET);
    const unverifiedRes = await fetch(`${baseUrl}/verified-only`, {
      headers: { Authorization: `Bearer ${unverifiedToken}` },
    });
    assert.strictEqual(unverifiedRes.status, 403);

    console.log('5b. Testing requireVerified with verified user...');
    const verifiedRes = await fetch(`${baseUrl}/verified-only`, {
      headers: { Authorization: `Bearer ${pencariToken}` },
    });
    assert.strictEqual(verifiedRes.status, 200);

    console.log('ALL MIDDLEWARE TESTS PASSED!');
  } finally {
    if (unapprovedOwnerId) {
      await db.execute('DELETE FROM users WHERE id = ?', [unapprovedOwnerId]);
    }
    if (unverifiedUserId) {
      await db.execute('DELETE FROM users WHERE id = ?', [unverifiedUserId]);
    }
    await new Promise((resolve) => server.close(resolve));
    await db.end();
  }
}

runTests().catch((err) => {
  console.error('Middleware test failed:', err);
  process.exit(1);
});
