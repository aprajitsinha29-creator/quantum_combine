/**
 * Real tests against authService.js's file-mode backend (no DATABASE_URL
 * set), using Node's built-in test runner - no new dependency needed.
 * Run with: npm test
 *
 * These exercise actual scrypt hashing, actual HMAC session signing/
 * verification, and actual login throttling logic - not mocks.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolated scratch directory (not ananta-backend/data/) so running these
// tests never touches the real committed seed files or local dev data.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ananta-authtest-'));
process.env.ANANTA_DATA_DIR = DATA_DIR;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REVOKED_FILE = path.join(DATA_DIR, '.revoked_sessions.json');

function resetStore() {
  delete require.cache[require.resolve('../ananta-backend/utils/authService')];
  if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE);
  if (fs.existsSync(REVOKED_FILE)) fs.unlinkSync(REVOKED_FILE);
  return require('../ananta-backend/utils/authService');
}

function uniqueEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@ananta-test.local`;
}

test('registerUser creates a real account with a hashed password and issues a valid session token', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  const { user, token } = await authService.registerUser({ name: 'Test User', email, password: 'correct-horse-battery', role: 'explorer' });

  assert.equal(user.email, email.toLowerCase());
  assert.equal(user.role, 'explorer');
  assert.ok(user.id.startsWith('user_'));
  assert.ok(token.includes('.'), 'token should be a signed payload.signature pair');

  const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const stored = raw.find((u) => u.email === email.toLowerCase());
  assert.ok(stored, 'user should be persisted to the store');
  assert.notEqual(stored.passwordHash, 'correct-horse-battery', 'password must never be stored in plain text');
  assert.match(stored.passwordHash, /^[0-9a-f]{32}:[0-9a-f]{128}$/, 'expected scrypt salt:hash hex format');
});

test('registerUser rejects a duplicate email', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  await authService.registerUser({ name: 'First', email, password: 'password123', role: 'explorer' });
  await assert.rejects(
    () => authService.registerUser({ name: 'Second', email, password: 'password123', role: 'explorer' }),
    /already exists/
  );
});

test('registerUser rejects a short password and an invalid email', async () => {
  const authService = resetStore();
  await assert.rejects(() => authService.registerUser({ name: 'X', email: uniqueEmail(), password: 'short' }), /at least 8 characters/);
  await assert.rejects(() => authService.registerUser({ name: 'X', email: 'not-an-email', password: 'password123' }), /valid email/);
});

test('loginUser succeeds with the correct password and fails with the wrong one', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  await authService.registerUser({ name: 'Login Test', email, password: 'right-password-1', role: 'instructor' });

  const good = await authService.loginUser({ email, password: 'right-password-1' });
  assert.equal(good.user.role, 'instructor');

  await assert.rejects(() => authService.loginUser({ email, password: 'wrong-password' }), /Invalid email or password/);
});

test('requireSession accepts a freshly issued token and rejects a tampered one', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  const { token } = await authService.registerUser({ name: 'Session Test', email, password: 'password1234' });

  const ok = await authService.requireSession(`Bearer ${token}`);
  assert.equal(ok.ok, true);
  assert.equal(ok.session.email, email.toLowerCase());

  const tampered = token.slice(0, -2) + 'xx';
  const bad = await authService.requireSession(`Bearer ${tampered}`);
  assert.equal(bad.ok, false);
});

test('requireRole rejects a session whose role does not match', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  const { token } = await authService.registerUser({ name: 'Explorer', email, password: 'password1234', role: 'explorer' });

  const asInstructor = await authService.requireRole(`Bearer ${token}`, 'instructor');
  assert.equal(asInstructor.ok, false);
  assert.equal(asInstructor.statusCode, 403);
});

test('revokeSessionToken actually invalidates the token for future requests (real logout)', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  const { token } = await authService.registerUser({ name: 'Logout Test', email, password: 'password1234' });

  assert.equal((await authService.requireSession(`Bearer ${token}`)).ok, true);
  const revoked = await authService.revokeSessionToken(token);
  assert.equal(revoked, true);
  assert.equal((await authService.requireSession(`Bearer ${token}`)).ok, false, 'token must be rejected after logout');
});

test('loginUser throttles after repeated failed attempts', async () => {
  const authService = resetStore();
  const email = uniqueEmail();
  await authService.registerUser({ name: 'Throttle Test', email, password: 'correct-password-1' });

  for (let i = 0; i < 8; i++) {
    await assert.rejects(() => authService.loginUser({ email, password: 'wrong' }));
  }
  // 9th attempt (even with the CORRECT password) should now be throttled
  await assert.rejects(() => authService.loginUser({ email, password: 'correct-password-1' }), /Too many failed login attempts/);
});
