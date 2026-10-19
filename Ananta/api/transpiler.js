/**
 * Ananta Quantum Studio - Vercel Serverless Endpoint for Universal Transpiler & AI Circuit Doctor
 * 
 * Endpoints:
 *  - POST /api/transpiler/from-composer (Fetch & convert ANY circuit from Composer into source + target code)
 *  - POST /api/transpiler/transpile     (Cross-framework 1:1 syntax conversion)
 *  - POST /api/transpiler/doctor        (AI Circuit Doctor peephole optimization & QPU hardware diagnostics)
 *  - GET  /api/transpiler/status        (Engine health check)
 */

const transpilerEngine = require('../ananta-backend/utils/transpilerEngine');

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Gemini-Key'
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Gemini-Key'
    });
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;

  // 1. POST /api/transpiler/from-composer (Load ANY circuit from Composer)
  if ((pathname.endsWith('/from-composer') || pathname.endsWith('/composer')) && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        grid = null,
        numQubits = 3,
        qasm = '',
        sourceFramework = 'qiskit',
        targetFramework = 'cirq',
        optimize = true
      } = body || {};

      const result = transpilerEngine.convertFromComposer({
        grid,
        numQubits,
        qasm,
        sourceFramework,
        targetFramework,
        optimize
      });

      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. POST /api/transpiler/doctor (Circuit Doctor Optimization & Diagnostics)
  if (pathname.endsWith('/doctor') && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        code = '',
        sourceFramework = 'qiskit',
        targetFramework = 'cirq',
        grid = null,
        numQubits = null
      } = body || {};

      const result = transpilerEngine.transpile({
        code,
        sourceFramework,
        targetFramework,
        optimize: true,
        grid,
        numQubits
      });

      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /api/transpiler/transpile (Direct 1:1 Transpilation)
  if ((pathname.endsWith('/transpile') || pathname === '/api/transpiler') && req.method === 'POST') {
    try {
      const body = await getParsedBody(req);
      const {
        code = '',
        sourceFramework = 'qiskit',
        targetFramework = 'cirq',
        optimize = false,
        grid = null,
        numQubits = null
      } = body || {};

      const result = transpilerEngine.transpile({
        code,
        sourceFramework,
        targetFramework,
        optimize: Boolean(optimize),
        grid,
        numQubits
      });

      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. GET /api/transpiler/status
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      service: 'Universal Cross-Framework Quantum Transpiler & AI Circuit Doctor',
      frameworks: ['qiskit', 'cirq', 'braket', 'pennylane', 'qasm', 'pyquil'],
      features: ['Peephole Involutions', 'U(1) Lie Fusion', 'Composer Grid Synchronizer', 'Decoherence Clock Savings']
    });
  }

  return sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
};
