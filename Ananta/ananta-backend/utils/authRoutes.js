/**
 * Ananta Quantum Studio - Shared Auth Route Handlers
 *
 * server.js (local dev, long-lived Node process) and api/index.js (Vercel
 * serverless) previously had to duplicate every route's logic, and drifted:
 * server.js got real auth + instructor guards, api/index.js silently didn't
 * (the exact bug that left the instructor endpoints open in production).
 * This file is the single source of truth for the /api/auth/* handlers and
 * the instructor-route guard, so both entry points call the same code and
 * cannot drift again. Each function returns { statusCode, body } - the
 * caller is responsible only for actually writing that to its own response
 * object (Node's raw http.ServerResponse in server.js, Vercel's res in
 * api/index.js).
 */

const authService = require('./authService');

async function handleRegister(body) {
  try {
    const result = await authService.registerUser(body || {});
    return { statusCode: 201, body: { success: true, ...result } };
  } catch (err) {
    return { statusCode: err.statusCode || 400, body: { success: false, error: err.message } };
  }
}

async function handleLogin(body) {
  try {
    const result = await authService.loginUser(body || {});
    return { statusCode: 200, body: { success: true, ...result } };
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: { success: false, error: err.message } };
  }
}

async function handleLogout(authorizationHeader) {
  const token = (authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();
  const revoked = await authService.revokeSessionToken(token);
  return { statusCode: 200, body: { success: true, revoked } };
}

async function handleMe(authorizationHeader) {
  const check = await authService.requireSession(authorizationHeader);
  if (!check.ok) {
    return { statusCode: check.statusCode, body: { success: false, error: check.error } };
  }
  const user = await authService.getUserById(check.session.uid);
  if (!user) {
    return { statusCode: 404, body: { success: false, error: 'Account no longer exists' } };
  }
  return { statusCode: 200, body: { success: true, user } };
}

const INSTRUCTOR_ROUTE_MATCHERS = [
  (p, m) => p === '/api/instructor/cohorts' && (m === 'GET' || m === 'POST'),
  (p, m) => p.startsWith('/api/instructor/cohort/') && p.endsWith('/students') && m === 'GET',
  (p, m) => p === '/api/instructor/analytics' && m === 'GET',
  (p, m) => p === '/api/instructor/assignments' && m === 'POST',
  (p, m) => p === '/api/instructor/export-gradebook' && m === 'GET'
];

function isInstructorRoute(pathname, method) {
  return INSTRUCTOR_ROUTE_MATCHERS.some((fn) => fn(pathname, method));
}

/**
 * Call at the top of instructor-route handling in any entry point. Returns
 * null if the route isn't instructor-gated at all; otherwise returns the
 * auth check result - { ok: true, session } or { ok: false, statusCode, error }.
 */
async function checkInstructorAuth(pathname, method, authorizationHeader) {
  if (!isInstructorRoute(pathname, method)) return null;
  return authService.requireRole(authorizationHeader, 'instructor');
}

module.exports = { handleRegister, handleLogin, handleLogout, handleMe, isInstructorRoute, checkInstructorAuth };
