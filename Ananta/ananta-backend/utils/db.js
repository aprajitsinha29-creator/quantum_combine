/**
 * Ananta Quantum Studio - Real Database Connection Layer (Supabase Postgres)
 *
 * A thin, honest wrapper around `pg`: connects to whatever standard Postgres
 * connection string is in DATABASE_URL (Supabase's "Connection string" ->
 * "Transaction pooler" URI is the recommended value for a serverless
 * environment like Vercel, since it multiplexes connections through
 * PgBouncer instead of each function invocation opening its own direct
 * connection).
 *
 * When DATABASE_URL is not set, isConfigured() returns false and every
 * consumer (authService.js, instructorStorage.js) falls back to its local
 * JSON-file implementation - real for local/offline dev, clearly not the
 * production path. This file never fabricates a connection or silently
 * no-ops a write; a query issued while unconfigured throws.
 */

let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (e) {
  // pg not installed, database falls back to unconfigured
}

let pool = null;
let migrated = false;

function isConfigured() {
  return Boolean(process.env.DATABASE_URL && Pool);
}

function getPool() {
  if (!isConfigured()) {
    throw new Error('DATABASE_URL is not set - no database is configured.');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase's pooled connection endpoint terminates TLS with a cert
      // chain that Node's default trust store doesn't always carry; this is
      // the standard, documented setting for connecting to a managed
      // Postgres provider over SSL without pinning their CA bundle.
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    pool.on('error', (err) => {
      // A background idle-client error (e.g. connection dropped by the
      // pooler) must not crash the process - just log it.
      console.error('[db] Idle client error:', err.message);
    });
  }
  return pool;
}

async function query(text, params = []) {
  const client = getPool();
  const start = Date.now();
  const res = await client.query(text, params);
  const durationMs = Date.now() - start;
  if (durationMs > 2000) {
    console.warn(`[db] Slow query (${durationMs}ms): ${text.slice(0, 120)}`);
  }
  return res;
}

async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'explorer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  attempt_count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  instructor TEXT,
  term TEXT,
  description TEXT,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  challenges_solved INT NOT NULL DEFAULT 0,
  quizzes_completed INT NOT NULL DEFAULT 0,
  avg_score NUMERIC NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  letter_grade TEXT NOT NULL DEFAULT 'N/A',
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'circuit',
  target_state TEXT,
  topic TEXT,
  due_date TIMESTAMPTZ,
  points INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  assignment_id TEXT,
  type TEXT NOT NULL,
  score NUMERIC,
  percentage NUMERIC,
  passed BOOLEAN,
  xp_earned INT NOT NULL DEFAULT 0,
  misconception_keys TEXT[] NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_cohort ON students(cohort_id);
CREATE INDEX IF NOT EXISTS idx_assignments_cohort ON assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_submissions_cohort ON submissions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
`;

/**
 * Idempotent "migration on boot": creates tables if they don't exist yet.
 * Runs once per process (serverless containers are typically warm-reused
 * for many requests, so this only pays the round-trip on a cold start).
 * A real project at larger scale would use a dedicated migration tool
 * (node-pg-migrate, Prisma Migrate); for this schema size, idempotent
 * CREATE TABLE IF NOT EXISTS is a correct and honest equivalent.
 */
async function ensureMigrated() {
  if (migrated || !isConfigured()) return;
  await query(SCHEMA);
  migrated = true;
}

module.exports = { isConfigured, query, withTransaction, ensureMigrated, getPool };
