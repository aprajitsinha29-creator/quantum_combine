/**
 * Ananta Quantum Studio - Real Authentication Service
 *
 * Replaces the old "local display name" placeholder (which never verified
 * anything - it just wrote whatever name the user typed to localStorage)
 * with genuine server-verified accounts:
 *   - Passwords hashed with scrypt (Node's built-in crypto, no native
 *     dependency), per-user random salt, timing-safe comparison.
 *   - Session tokens are self-contained and signed with HMAC-SHA256.
 *   - A revocation list lets /api/auth/logout actually invalidate a token
 *     before its natural expiry, since stateless tokens can't otherwise be
 *     revoked.
 *   - Login-attempt throttling per email to blunt trivial brute forcing.
 *
 * Storage is DUAL-MODE, decided by db.isConfigured() (i.e. whether
 * DATABASE_URL is set):
 *   - DB mode (ananta-backend/utils/db.js, a real Postgres connection -
 *     Supabase in this project): the production path. Required on any
 *     serverless host (Vercel) because the local filesystem there is
 *     read-only outside /tmp and not shared across invocations, so a JSON
 *     file can't durably hold real accounts.
 *   - File mode (ananta-backend/data/users.json): local/offline dev only,
 *     so `node server.js` still works with zero setup. Never the
 *     production path - it's clearly a fallback, not a second "real" store.
 *
 * Every exported function is async now (even the file-mode path, wrapped in
 * a resolved Promise) so callers never need to know which backend is live.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

// ANANTA_DATA_DIR lets tests point this at a scratch directory instead of
// the real local data store (see instructorStorage.js for the same pattern).
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

function resolveDataDir() {
  if (process.env.ANANTA_DATA_DIR) return process.env.ANANTA_DATA_DIR;
  if (isServerless && !db.isConfigured()) {
    return path.join('/tmp', 'ananta-data');
  }
  return path.join(__dirname, '..', 'data');
}

const DATA_DIR = resolveDataDir();
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');
const REVOKED_FILE = path.join(DATA_DIR, '.revoked_sessions.json');

// In-memory store fallback for read-only environments (e.g. Vercel serverless /var/task)
const _authMemStore = new Map();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCRYPT_KEYLEN = 64;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const VALID_ROLES = new Set(['explorer', 'instructor']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --------------------------------------------------------------------
// Session secret
// --------------------------------------------------------------------
let cachedSecret = null;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    // Ignored if directory cannot be created on read-only hosts
  }
}

function getSessionSecret() {
  if (cachedSecret) return cachedSecret;
  if (process.env.ANANTA_SESSION_SECRET) {
    cachedSecret = process.env.ANANTA_SESSION_SECRET;
    return cachedSecret;
  }
  if (db.isConfigured()) {
    // A database is configured, implying a real (likely serverless)
    // deployment. A filesystem-persisted secret would not survive across
    // invocations there (or would be regenerated per cold start, silently
    // invalidating every existing session) - fail loudly instead so the
    // operator sets a real secret once, rather than sessions randomly
    // breaking in production.
    throw new Error(
      'ANANTA_SESSION_SECRET must be set when DATABASE_URL is configured. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
      'and set it in your deployment environment variables.'
    );
  }
  ensureDataDir();
  if (fs.existsSync(SECRET_FILE)) {
    try {
      const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (existing) { cachedSecret = existing; return cachedSecret; }
    } catch (e) {}
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  } catch (e) {
    // Read-only filesystem, keep in memory
  }
  cachedSecret = generated;
  return cachedSecret;
}

// --------------------------------------------------------------------
// Password hashing
// --------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hashHex] = String(stored || '').split(':');
  if (!salt || !hashHex) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hashHex, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// --------------------------------------------------------------------
// Session tokens (HMAC-signed, stateless payload + a revocation lookup)
// --------------------------------------------------------------------
function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}
function sign(payload) {
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(json).digest();
  return `${base64url(json)}.${base64url(sig)}`;
}
function issueSessionToken(user) {
  const now = Date.now();
  const payload = {
    uid: user.id, email: user.email, name: user.name, role: user.role,
    jti: crypto.randomBytes(9).toString('hex'), iat: now, exp: now + SESSION_TTL_MS
  };
  return { token: sign(payload), payload };
}
function decodeAndVerifySignature(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, error: 'Malformed session token' };
  }
  const [payloadPart, sigPart] = token.split('.');
  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadPart).toString('utf8'));
  } catch (e) {
    return { valid: false, error: 'Malformed session payload' };
  }
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(JSON.stringify(payload)).digest();
  const actualSig = base64urlDecode(sigPart);
  if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
    return { valid: false, error: 'Invalid session signature' };
  }
  if (!payload.exp || Date.now() > payload.exp) {
    return { valid: false, error: 'Session expired' };
  }
  return { valid: true, payload };
}

// --------------------------------------------------------------------
// Storage backend: DB (Supabase Postgres) when configured, else file
// --------------------------------------------------------------------
async function findUserByEmail(email) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0] ? rowToUser(res.rows[0]) : null;
  }
  const users = loadUsersFile();
  return users.find((u) => u.email === email) || null;
}

async function findUserById(id) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] ? rowToUser(res.rows[0]) : null;
  }
  const users = loadUsersFile();
  return users.find((u) => u.id === id) || null;
}

async function insertUser(user) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [user.id, user.name, user.email, user.passwordHash, user.role, user.createdAt]
    );
    return;
  }
  const users = loadUsersFile();
  users.push(user);
  saveUsersFile(users);
}

function rowToUser(row) {
  return {
    id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash,
    role: row.role, createdAt: (row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at)
  };
}

function loadUsersFile() {
  if (_authMemStore.has(USERS_FILE)) return _authMemStore.get(USERS_FILE);
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    // If in /tmp, check if bundled users.json exists
    const bundledPath = path.join(__dirname, '..', 'data', 'users.json');
    let initialUsers = [];
    if (fs.existsSync(bundledPath)) {
      try { initialUsers = JSON.parse(fs.readFileSync(bundledPath, 'utf8')) || []; } catch (e) {}
    }
    _authMemStore.set(USERS_FILE, initialUsers);
    return initialUsers;
  }
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) || [];
    _authMemStore.set(USERS_FILE, users);
    return users;
  } catch (e) {
    console.error('[AuthService] Corrupt users.json, refusing to overwrite. Error:', e.message);
    throw new Error('User store is unreadable. Contact the server operator.');
  }
}
function saveUsersFile(users) {
  _authMemStore.set(USERS_FILE, users);
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.warn(`[AuthService] Users file write failed (${e.message}), preserved in-memory`);
  }
}

async function isSessionRevoked(jti) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    const res = await db.query('SELECT 1 FROM revoked_sessions WHERE jti = $1 AND expires_at > now()', [jti]);
    return res.rows.length > 0;
  }
  const revoked = loadRevokedFile();
  return Boolean(revoked[jti]);
}
async function markSessionRevoked(jti, expiresAtMs) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    await db.query(
      `INSERT INTO revoked_sessions (jti, expires_at) VALUES ($1, to_timestamp($2 / 1000.0)) ON CONFLICT (jti) DO NOTHING`,
      [jti, expiresAtMs]
    );
    return;
  }
  const revoked = loadRevokedFile();
  revoked[jti] = expiresAtMs;
  saveRevokedFile(revoked);
}
function loadRevokedFile() {
  if (_authMemStore.has(REVOKED_FILE)) return _authMemStore.get(REVOKED_FILE);
  ensureDataDir();
  if (!fs.existsSync(REVOKED_FILE)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(REVOKED_FILE, 'utf8')) || {};
    _authMemStore.set(REVOKED_FILE, data);
    return data;
  } catch (e) { return {}; }
}
function saveRevokedFile(map) {
  const now = Date.now();
  const pruned = {};
  for (const [jti, exp] of Object.entries(map)) if (exp > now) pruned[jti] = exp;
  _authMemStore.set(REVOKED_FILE, pruned);
  try {
    ensureDataDir();
    fs.writeFileSync(REVOKED_FILE, JSON.stringify(pruned));
  } catch (e) {
    console.warn(`[AuthService] Revoked file write failed (${e.message}), preserved in-memory`);
  }
}

// --------------------------------------------------------------------
// Login-attempt throttling
// --------------------------------------------------------------------
// DB mode: a real, durable, cross-instance-consistent counter row per
// email - this is what actually works correctly on serverless, where an
// in-memory Map is silently per-instance and gives no real protection.
// File mode: in-memory Map, fine for a single long-lived local process.
const memoryLoginAttempts = new Map();

async function checkLoginThrottle(email) {
  const now = Date.now();
  if (db.isConfigured()) {
    await db.ensureMigrated();
    const res = await db.query('SELECT attempt_count, window_start FROM login_attempts WHERE email = $1', [email]);
    const row = res.rows[0];
    if (!row) return { blocked: false };
    const windowStart = new Date(row.window_start).getTime();
    if (now - windowStart > LOGIN_WINDOW_MS) return { blocked: false };
    if (row.attempt_count >= MAX_LOGIN_ATTEMPTS) {
      return { blocked: true, retryAfterMs: LOGIN_WINDOW_MS - (now - windowStart) };
    }
    return { blocked: false };
  }
  const entry = memoryLoginAttempts.get(email);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) return { blocked: false };
  if (entry.count >= MAX_LOGIN_ATTEMPTS) return { blocked: true, retryAfterMs: LOGIN_WINDOW_MS - (now - entry.windowStart) };
  return { blocked: false };
}

async function recordFailedLogin(email) {
  const now = Date.now();
  if (db.isConfigured()) {
    await db.ensureMigrated();
    await db.query(
      `INSERT INTO login_attempts (email, attempt_count, window_start) VALUES ($1, 1, now())
       ON CONFLICT (email) DO UPDATE SET
         attempt_count = CASE WHEN login_attempts.window_start < now() - interval '${LOGIN_WINDOW_MS} milliseconds'
                               THEN 1 ELSE login_attempts.attempt_count + 1 END,
         window_start = CASE WHEN login_attempts.window_start < now() - interval '${LOGIN_WINDOW_MS} milliseconds'
                              THEN now() ELSE login_attempts.window_start END`,
      [email]
    );
    return;
  }
  const entry = memoryLoginAttempts.get(email);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) memoryLoginAttempts.set(email, { count: 1, windowStart: now });
  else entry.count += 1;
}

async function clearLoginAttempts(email) {
  if (db.isConfigured()) {
    await db.ensureMigrated();
    await db.query('DELETE FROM login_attempts WHERE email = $1', [email]);
    return;
  }
  memoryLoginAttempts.delete(email);
}

// --------------------------------------------------------------------
// Public account operations
// --------------------------------------------------------------------
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

async function registerUser({ name, email, password, role }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const cleanRole = VALID_ROLES.has(role) ? role : 'explorer';

  if (!cleanName) throw new Error('Name is required');
  if (!EMAIL_RE.test(cleanEmail)) throw new Error('A valid email address is required');
  if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await findUserByEmail(cleanEmail);
  if (existing) throw new Error('An account with this email already exists');

  const user = {
    id: 'user_' + crypto.randomBytes(8).toString('hex'),
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    passwordHash: hashPassword(String(password)),
    createdAt: new Date().toISOString()
  };
  await insertUser(user);

  const { token } = issueSessionToken(user);
  return { user: publicUser(user), token };
}

async function loginUser({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const throttle = await checkLoginThrottle(cleanEmail);
  if (throttle.blocked) {
    const err = new Error(`Too many failed login attempts. Try again in ${Math.ceil(throttle.retryAfterMs / 1000)}s.`);
    err.statusCode = 429;
    throw err;
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    await recordFailedLogin(cleanEmail);
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  await clearLoginAttempts(cleanEmail);
  const { token } = issueSessionToken(user);
  return { user: publicUser(user), token };
}

async function getUserById(uid) {
  const user = await findUserById(uid);
  return user ? publicUser(user) : null;
}

async function verifySessionToken(token) {
  const sigCheck = decodeAndVerifySignature(token);
  if (!sigCheck.valid) return sigCheck;
  const revoked = await isSessionRevoked(sigCheck.payload.jti);
  if (revoked) return { valid: false, error: 'Session was logged out' };
  return sigCheck;
}

async function revokeSessionToken(token) {
  const sigCheck = decodeAndVerifySignature(token);
  if (!sigCheck.valid) return false;
  await markSessionRevoked(sigCheck.payload.jti, sigCheck.payload.exp);
  return true;
}

/**
 * Framework-agnostic guard: pass the Authorization header value, get back
 * either { ok: true, session } or { ok: false, statusCode, error }.
 */
async function requireSession(authorizationHeader) {
  const token = (authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, statusCode: 401, error: 'Missing Authorization: Bearer <token> header' };
  const { valid, payload, error } = await verifySessionToken(token);
  if (!valid) return { ok: false, statusCode: 401, error: error || 'Invalid session' };
  return { ok: true, session: payload };
}

async function requireRole(authorizationHeader, role) {
  const result = await requireSession(authorizationHeader);
  if (!result.ok) return result;
  if (result.session.role !== role) {
    return { ok: false, statusCode: 403, error: `This action requires the '${role}' role` };
  }
  return result;
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  verifySessionToken,
  revokeSessionToken,
  requireSession,
  requireRole
};
