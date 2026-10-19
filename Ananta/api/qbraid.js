/**
 * Ananta Quantum Studio - Vercel Serverless Endpoint for qBraid Multi-Provider Bridge
 * 
 * Routes:
 *  - GET  /api/qbraid/devices     (Live & Calibrated Fleet Discovery with Filters)
 *  - POST /api/qbraid/recommend   (Intelligent Circuit-to-Hardware Recommendation Engine)
 *  - POST /api/qbraid/transpile   (Multi-Architecture Native Code Generation)
 *  - POST /api/qbraid/auth        (Token Verification & Account Profile)
 *  - POST /api/qbraid/run         (Real QPU Dispatch or Realistic Physics Noise Simulation)
 *  - GET  /api/qbraid/job/:id     (Job Polling & Results Retrieval)
 */

const qbraidClient = require('../ananta-backend/utils/qbraidClient');

let QBRAID_API_KEY = process.env.QBRAID_API_KEY || process.env.QBRAID_TOKEN || '';

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-qbraid-key, X-Requested-With'
  });
  res.end(body);
}

async function getParsedBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-qbraid-key, X-Requested-With'
    });
    res.end();
    return;
  }

  const reqStart = Date.now();
  const host = req.headers.host || 'localhost';
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;

  // Extract apiKey from headers, query, or server environment
  const apiKey = req.headers['x-qbraid-key'] || reqUrl.searchParams.get('key') || QBRAID_API_KEY;

  // 1. GET /api/qbraid/devices (or /api/qbraid when invoked directly)
  if ((pathname === '/api/qbraid/devices' || pathname === '/api/qbraid' || pathname.endsWith('/devices')) && req.method === 'GET') {
    const filters = {
      provider: reqUrl.searchParams.get('provider') || 'all',
      architecture: reqUrl.searchParams.get('architecture') || 'all',
      minQubits: reqUrl.searchParams.get('minQubits') || '0',
      status: reqUrl.searchParams.get('status') || 'all',
      search: reqUrl.searchParams.get('search') || ''
    };
    try {
      const fleet = await qbraidClient.getLiveBackends(apiKey, filters);
      return sendJson(res, 200, fleet);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. POST /api/qbraid/recommend (Circuit-to-Hardware Recommendation Engine)
  if ((pathname === '/api/qbraid/recommend' || pathname.endsWith('/recommend')) && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        qasm = '',
        numQubits = 3,
        depth = 5,
        circuitType = 'general',
        shots = 1024,
        preference = 'balanced'
      } = body || {};

      const recommendation = qbraidClient.recommendHardware({
        qasm,
        numQubits,
        depth,
        circuitType,
        shots,
        preference
      });
      return sendJson(res, 200, recommendation);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /api/qbraid/transpile (Multi-Architecture Native Code Generation)
  if ((pathname === '/api/qbraid/transpile' || pathname.endsWith('/transpile')) && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        qasm = '',
        backend = 'qbraid_sdk_simulator',
        format = 'auto'
      } = body || {};

      const result = qbraidClient.transpileCircuit({ qasm, backend, format });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. POST /api/qbraid/auth (Validate Token & Fetch Account Tier)
  if ((pathname === '/api/qbraid/auth' || pathname.endsWith('/auth')) && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const token = body.apiKey || body.token || apiKey;
      const authRes = await qbraidClient.validateToken(token);
      return sendJson(res, authRes.valid ? 200 : 401, authRes);
    } catch (err) {
      return sendJson(res, 500, { valid: false, error: err.message });
    }
  }

  // 5. POST /api/qbraid/run (Submit Circuit to Live QPU or Physics Noise Model)
  if ((pathname === '/api/qbraid/run' || pathname.endsWith('/run')) && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        backend = 'qbraid_sdk_simulator',
        shots = 1024,
        qasm = '',
        numQubits = 3,
        idealProbabilities = null,
        mode = 'auto',
        requireLive = false
      } = body || {};

      const runKey = req.headers['x-qbraid-key'] || body.apiKey || body.token || apiKey;
      const isSimulator = backend.includes('simulator');
      const shouldAttemptLive = !isSimulator && mode !== 'simulation' && Boolean(runKey);

      if (shouldAttemptLive) {
        try {
          const job = await qbraidClient.submitQbraidJob({ apiKey: runKey, backend, qasm, shots });
          return sendJson(res, 200, { ...job, executionTimeMs: Math.round(Date.now() - reqStart) });
        } catch (qbrErr) {
          if (requireLive || mode === 'hardware') {
            return sendJson(res, 502, {
              success: false,
              isRealHardware: true,
              error: `qBraid Execution Failed: ${qbrErr.message}`
            });
          }
          const simRes = qbraidClient.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
          simRes.fallbackReason = qbrErr.message;
          simRes.executionTimeMs = Math.round(Date.now() - reqStart);
          return sendJson(res, 200, simRes);
        }
      }

      const simRes = qbraidClient.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
      simRes.executionTimeMs = Math.round(Date.now() - reqStart);
      return sendJson(res, 200, simRes);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 6. GET /api/qbraid/job/:id (Poll Job Status)
  if (pathname.includes('/job/') && req.method === 'GET') {
    const parts = pathname.split('/job/');
    const jobId = (parts[1] || '').trim();

    if (!jobId) return sendJson(res, 400, { error: 'Job ID is required in URL path' });
    if (jobId.startsWith('qbr_sim_')) {
      return sendJson(res, 200, { status: 'COMPLETED', jobId, executionMode: 'SIMULATED_PHYSICAL_NOISE' });
    }

    try {
      const jobResult = await qbraidClient.getJobStatusAndResult(apiKey, jobId);
      return sendJson(res, 200, jobResult);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // Fallback: Default to devices discovery
  try {
    const fleet = await qbraidClient.getLiveBackends(apiKey);
    return sendJson(res, 200, fleet);
  } catch (err) {
    return sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
  }
};
