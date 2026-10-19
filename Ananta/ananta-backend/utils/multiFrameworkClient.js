/**
 * Ananta Quantum Studio - Real Multi-Framework Execution Bridge
 *
 * Spawns ananta-backend/python/quantum_multiframework_runner.py as a
 * persistent warm process ("--serve" mode) and talks to it over
 * newline-delimited JSON on stdin/stdout. The Python side does the actual
 * work with genuinely-installed Qiskit Aer / Cirq / PennyLane - this file
 * is purely a transport + process-lifecycle layer. No result is ever
 * synthesized here: every response either came out of the named SDK or is
 * an honest failure explaining why (interpreter missing, package missing,
 * process crashed, etc).
 *
 * The Python interpreter is discovered at runtime, not hardcoded to a path:
 * ANANTA_PYTHON_BIN (if set) is tried first, then 'python3', 'python', and
 * the Windows 'py -3' launcher, in that order. Each candidate is spawned
 * for real and only kept if it actually reaches the ready state.
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const SCRIPT_PATH = path.join(__dirname, '..', 'python', 'quantum_multiframework_runner.py');
const WARMUP_TIMEOUT_MS = 90000;
const REQUEST_TIMEOUT_MS = 60000;

function candidateInterpreters() {
  const list = [];
  if (process.env.ANANTA_PYTHON_BIN) {
    list.push({ cmd: process.env.ANANTA_PYTHON_BIN, args: [] });
  }
  list.push({ cmd: 'python3', args: [] });
  list.push({ cmd: 'python', args: [] });
  list.push({ cmd: 'py', args: ['-3'] });
  return list;
}

class MultiFrameworkWorker {
  constructor() {
    this.proc = null;
    this.rl = null;
    this.pending = [];
    this.startPromise = null;
    this.interpreterUsed = null;
  }

  async ensureStarted() {
    if (this.proc) return { interpreter: this.interpreterUsed };
    if (!this.startPromise) {
      this.startPromise = this._start().catch((err) => {
        this.startPromise = null;
        throw err;
      });
    }
    return this.startPromise;
  }

  async _start() {
    const attempts = [];
    for (const candidate of candidateInterpreters()) {
      try {
        const outcome = await this._trySpawn(candidate);
        return outcome;
      } catch (err) {
        attempts.push(`${candidate.cmd}: ${err.message}`);
      }
    }
    throw new Error(
      `No working Python interpreter found for real multi-framework execution. Tried:\n${attempts.join('\n')}\n` +
      `Install Python 3.10+ with 'pip install qiskit qiskit-aer cirq pennylane pennylane-qiskit ply', ` +
      `or set ANANTA_PYTHON_BIN to the interpreter that has them.`
    );
  }

  _trySpawn(candidate) {
    return new Promise((resolve, reject) => {
      const args = [...candidate.args, SCRIPT_PATH, '--serve'];
      let proc;
      try {
        proc = spawn(candidate.cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        reject(err);
        return;
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill();
          reject(new Error(`timed out waiting ${WARMUP_TIMEOUT_MS}ms for warm-up`));
        }
      }, WARMUP_TIMEOUT_MS);

      proc.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      let stderrTail = '';
      proc.stderr.on('data', (chunk) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-2000);
      });

      const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });

      const onReadyLine = (line) => {
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch (e) {
          return;
        }
        if (parsed && parsed.ready && !settled) {
          settled = true;
          clearTimeout(timeout);
          this.proc = proc;
          this.rl = rl;
          this.interpreterUsed = candidate.cmd;
          this._attachRuntimeHandlers();
          resolve({ interpreter: candidate.cmd });
        }
      };
      rl.on('line', onReadyLine);

      proc.on('exit', (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(`process exited during warm-up (code ${code}). stderr: ${stderrTail || '(empty)'}`));
        }
      });
    });
  }

  _attachRuntimeHandlers() {
    this.rl.on('line', (line) => {
      const pending = this.pending.shift();
      if (!pending) return;
      try {
        pending.resolve(JSON.parse(line));
      } catch (e) {
        pending.reject(new Error(`Malformed JSON from Python worker: ${line.slice(0, 200)}`));
      }
    });

    this.proc.on('exit', (code) => {
      const err = new Error(`Python multi-framework worker exited unexpectedly (code ${code})`);
      while (this.pending.length) {
        this.pending.shift().reject(err);
      }
      this.proc = null;
      this.rl = null;
      this.startPromise = null;
    });

    // Real stderr from the libraries (deprecation notices etc.) - logged for
    // operator visibility, never used to fabricate or alter a response.
    this.proc.stderr.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) console.warn('[MultiFrameworkWorker stderr]', text.slice(0, 500));
    });
  }

  async send(request) {
    await this.ensureStarted();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.pending.findIndex((p) => p.resolve === resolve);
        if (idx !== -1) this.pending.splice(idx, 1);
        reject(new Error(`Request to Python worker timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      });

      this.proc.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  shutdown() {
    if (this.proc) {
      try { this.proc.stdin.write(JSON.stringify({ mode: 'shutdown' }) + '\n'); } catch (e) {}
    }
  }
}

const worker = new MultiFrameworkWorker();

// --------------------------------------------------------------------
// Remote HTTP mode: when MULTIFRAMEWORK_SERVICE_URL is set (pointing at a
// separately-deployed instance of ananta-backend/python/app.py - see that
// file's docstring for why this can't run in-process on Vercel), calls go
// over HTTPS to that always-on service instead of spawning a local
// subprocess. Local dev (server.js) has no reason to set this env var and
// keeps using the fast local subprocess path above.
// --------------------------------------------------------------------
function remoteServiceUrl() {
  const url = process.env.MULTIFRAMEWORK_SERVICE_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

async function remoteFetch(path, options = {}) {
  const base = remoteServiceUrl();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (process.env.MULTIFRAMEWORK_SERVICE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MULTIFRAMEWORK_SERVICE_TOKEN}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok && !json.success) {
      return { success: false, error: json.detail || json.error || `Remote service HTTP ${res.status}` };
    }
    return json;
  } catch (err) {
    return { success: false, error: `Could not reach MULTIFRAMEWORK_SERVICE_URL (${base}): ${err.message}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeFrameworks(frameworks) {
  if (remoteServiceUrl()) {
    return remoteFetch('/frameworks', { method: 'GET' });
  }
  return worker.send({ mode: 'probe', frameworks });
}

async function runOnFramework({ framework, qasm, numQubits, shots }) {
  if (remoteServiceUrl()) {
    return remoteFetch('/run', { method: 'POST', body: JSON.stringify({ framework, qasm, numQubits, shots }) });
  }
  return worker.send({ mode: 'run', framework, qasm, numQubits, shots });
}

process.on('exit', () => worker.shutdown());

module.exports = { probeFrameworks, runOnFramework };
