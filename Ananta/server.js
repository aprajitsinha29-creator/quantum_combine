/**
 * Ananta Quantum Studio - Production Full-Stack Backend Server
 * 
 * Provides:
 *  1. Live REST API for Google AI Studio (Gemini 2.5 Flash) proxying
 *  2. Real-time QPU simulation and hardware bridge execution endpoints
 *  3. Backend health diagnostics and live telemetry transaction log
 *  4. High-performance static asset streaming
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env for local dev (DATABASE_URL, GEMINI_API_KEY, etc - see
// .env.example). Vercel injects its own env vars directly and has no .env
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

const PORT = process.env.PORT || 5500;
const HOST = '127.0.0.1';

// Load local .env files if present (never pushed to git)
function loadLocalEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, 'ananta-backend', '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      } catch (err) {
        console.warn('[Server] Could not read env file:', err.message);
      }
    }
  }
}
loadLocalEnv();

// Load or fallback Gemini API Key
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  try {
    const configPath = path.join(__dirname, 'js', 'config.js');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const match = configContent.match(/GEMINI_API_KEY:\s*["']([^"']+)["']/);
      if (match && match[1]) {
        GEMINI_API_KEY = match[1].trim();
      }
    }
  } catch (e) {
    console.warn('[Server] Could not read js/config.js for GEMINI_API_KEY:', e.message);
  }
}

// Global server telemetry log for live console inspection
const telemetryLogs = [];
const MAX_LOGS = 100;
function logTransaction(method, endpoint, statusCode, durationMs, details = {}) {
  const entry = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    method,
    endpoint,
    statusCode,
    durationMs: Math.round(durationMs),
    details
  };
  telemetryLogs.unshift(entry);
  if (telemetryLogs.length > MAX_LOGS) telemetryLogs.pop();
  console.log(`[API ${method}] ${endpoint} -> ${statusCode} (${entry.durationMs}ms)`);
  return entry;
}

// IBM Quantum Hardware Bridge Utility
const ibmQuantum = require('./ananta-backend/utils/ibmQuantum');
let IBM_QUANTUM_TOKEN = process.env.IBM_QUANTUM_TOKEN || process.env.IBM_API_KEY || '';

// qBraid Multi-Provider Quantum Execution Utility
const qbraidClient = require('./ananta-backend/utils/qbraidClient');
let QBRAID_API_KEY = process.env.QBRAID_API_KEY || process.env.QBRAID_TOKEN || '';

// Real Multi-Framework Local Execution Bridge (Qiskit Aer / Cirq / PennyLane)
const multiFrameworkClient = require('./ananta-backend/utils/multiFrameworkClient');

// Real Authentication Service (scrypt password hashing + signed sessions)
const authService = require('./ananta-backend/utils/authService');
const authRoutes = require('./ananta-backend/utils/authRoutes');

// Assessment & Instructor Subsystem
const quizEngine = require('./ananta-backend/utils/quizEngine');
const instructorStorage = require('./ananta-backend/utils/instructorStorage');
const transpilerEngine = require('./ananta-backend/utils/transpilerEngine');

// Physical Device Fleet Catalog (Baseline Reference)
const QPU_DEVICES = ibmQuantum.REFERENCE_QPU_DEVICES;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.crt': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper: send JSON response with standard CORS
function sendJson(res, statusCode, data, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Gemini-Key',
    ...headers
  });
  res.end(payload);
}

// Helper: parse incoming JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

// Call Google AI Studio (Gemini 2.5 Flash)
async function callGeminiApi(prompt, systemInstruction = '', isJson = true, overrideKey = '') {
  const activeKey = overrideKey || GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('GEMINI_API_KEY not configured on backend');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
  
  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  };

  if (isJson) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google AI Studio HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty response from Google AI Studio');
    }

    return {
      text: rawText,
      usage: data.usageMetadata || null,
      modelVersion: data.modelVersion || 'gemini-2.5-flash',
      latencyMs,
      finishReason: candidate.finishReason || 'STOP'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Server Request Handler
const server = http.createServer(async (req, res) => {
  const reqStart = Date.now();
  const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = reqUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    res.end();
    return;
  }

  // ================= API ROUTES =================

  // ================= 0. AUTHENTICATION (real accounts, not a display name) =================
  // Passwords are scrypt-hashed, sessions are HMAC-signed tokens verified
  // server-side on every protected instructor request (see section 11).

  // 0a. POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { statusCode, body: json } = await authRoutes.handleRegister(body);
    sendJson(res, statusCode, json);
    logTransaction('POST', pathname, statusCode, Date.now() - reqStart, { email: json?.user?.email });
    return;
  }

  // 0b. POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { statusCode, body: json } = await authRoutes.handleLogin(body);
    sendJson(res, statusCode, json);
    logTransaction('POST', pathname, statusCode, Date.now() - reqStart, { email: json?.user?.email });
    return;
  }

  // 0c. POST /api/auth/logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const { statusCode, body: json } = await authRoutes.handleLogout(req.headers['authorization']);
    sendJson(res, statusCode, json);
    logTransaction('POST', pathname, statusCode, Date.now() - reqStart, { revoked: json.revoked });
    return;
  }

  // 0d. GET /api/auth/me (session-restore / verify)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const { statusCode, body: json } = await authRoutes.handleMe(req.headers['authorization']);
    sendJson(res, statusCode, json);
    logTransaction('GET', pathname, statusCode, Date.now() - reqStart, { uid: json?.user?.id });
    return;
  }

  // Dedicated Multi-task Multi-Provider AI Endpoint (/api/gemini, /api/ai, /api/grok, /api/ai/tutor, /api/knowledge)
  if (pathname === '/api/gemini' || pathname === '/api/ai' || pathname === '/api/grok' || pathname === '/api/ai/tutor' || pathname.startsWith('/api/knowledge')) {
    try {
      delete require.cache[require.resolve('./api/gemini.js')];
    } catch (e) {}
    const aiHandler = require('./api/gemini.js');
    return aiHandler(req, res);
  }

  // ================= RESEARCH PAPER EXTRACTION ENDPOINTS =================
  const { googleSearch } = require('./ananta-backend/utils/googleSearch');
  const { extractTextFromUrl } = require('./ananta-backend/utils/extractText');
  const { findTermOccurrences } = require('./ananta-backend/utils/findTerm');
  const { summarizeText, summarizeTextDetailed } = require('./ananta-backend/utils/summarize');

  if (pathname === '/api/search' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { query, num } = body || {};
    if (!query) return sendJson(res, 400, { error: 'query is required' });
    try {
      const results = await googleSearch(query, num || 10);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { query, count: results.length });
      return sendJson(res, 200, { query, results });
    } catch (err) {
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/fetch-content' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { url } = body || {};
    if (!url) return sendJson(res, 400, { error: 'url is required' });
    try {
      const { title, text, fullTextAvailable } = await extractTextFromUrl(url);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { url, title, length: text.length, fullTextAvailable });
      return sendJson(res, 200, { url, title, length: text.length, text, fullTextAvailable: Boolean(fullTextAvailable) });
    } catch (e) {
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: e.message });
      return sendJson(res, 500, { error: 'Could not fetch/parse that URL: ' + e.message });
    }
  }

  if (pathname === '/api/find-term' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { url, text, term } = body || {};
    if (!term) return sendJson(res, 400, { error: 'term is required' });
    if (!url && !text) return sendJson(res, 400, { error: 'provide either url or text' });

    try {
      let sourceText = text;
      let title = null;
      if (!sourceText && url) {
        const extracted = await extractTextFromUrl(url);
        sourceText = extracted.text;
        title = extracted.title;
      }

      const occurrences = findTermOccurrences(sourceText, term);
      if (!occurrences.length) {
        return sendJson(res, 200, { term, title, found: false, message: `"${term}" was not found in this document.` });
      }

      const topOccurrences = occurrences.slice(0, 5);
      const summarized = await Promise.all(
        topOccurrences.map(async (occ) => ({
          context: occ.context,
          summary: await summarizeText(occ.context, term),
        }))
      );
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { term, count: occurrences.length });
      return sendJson(res, 200, { term, title, found: true, totalOccurrences: occurrences.length, results: summarized });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (pathname === '/api/summarize' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { url, text, doi, title: titleHint, arxiv } = body || {};
    if (!url && !text) return sendJson(res, 400, { error: 'provide either url or text' });

    try {
      let sourceText = text;
      let title = null;
      let fullTextAvailable = Boolean(text);
      let sourceUrl = url || null;
      if (!sourceText && url) {
        const extracted = await extractTextFromUrl(url, { doi, title: titleHint, arxiv });
        sourceText = extracted.text;
        title = extracted.title;
        fullTextAvailable = Boolean(extracted.fullTextAvailable);
        if (extracted.resolvedUrl) sourceUrl = extracted.resolvedUrl;
      }
      const truncated = (sourceText || '').slice(0, 40000);
      const detailed = await summarizeTextDetailed(truncated);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { title, fullTextAvailable, aiUsed: detailed.aiUsed, model: detailed.model });
      return sendJson(res, 200, {
        title,
        summary: detailed.summary,
        fullTextAvailable,
        sourceUrl,
        sourceChars: (sourceText || '').length,
        aiUsed: detailed.aiUsed,
        aiProvider: detailed.provider,
        aiModel: detailed.model,
        aiError: detailed.reason
      });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (pathname === '/api/synthesize-topic' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { topic, papers } = body || {};
    if (!topic || !Array.isArray(papers) || papers.length === 0) {
      return sendJson(res, 400, { error: 'provide topic and a non-empty papers array' });
    }

    try {
      const { synthesizeTopic } = require('./ananta-backend/utils/summarize');
      const result = await synthesizeTopic(topic, papers);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { topic, paperCount: papers.length });
      return sendJson(res, 200, result);
    } catch (e) {
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: e.message });
      return sendJson(res, 500, { error: e.message });
    }
  }

  // 1. GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    const uptimeSec = Math.round(process.uptime());
    const data = {
      status: 'ONLINE',
      server: 'Ananta Quantum Full-Stack Engine',
      version: '2.5.0',
      uptimeSec,
      port: PORT,
      timestamp: new Date().toISOString(),
      aiStudio: {
        provider: 'Google AI Studio',
        model: 'gemini-2.5-flash',
        keyConfigured: Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10),
        status: GEMINI_API_KEY ? 'CONNECTED' : 'KEY_MISSING'
      },
      qpuDevices: Object.keys(QPU_DEVICES),
      qbraidDevices: Object.keys(qbraidClient.REFERENCE_QBRAID_DEVICES),
      activeFeatures: [
        'Quantum Circuit Composer',
        'Universal Transpiler & AI Circuit Doctor',
        'Topic Roadmap & Custom AI Synthesis',
        'Physical Cloud QPU Hardware Bridge (IBM Quantum)',
        'qBraid Multi-Provider Bridge (AWS, QuEra, IonQ, Rigetti, OQC)',
        'Conceptual Quizzes & Automated Grading Engine',
        'Classroom Instructor Dashboard & Cohort Analytics',
        'Quantum Voice & Video Copilot',
        'Real-time Statevector Simulator',
        'Cryostat Digital Twin',
        'PQC Security Auditor'
      ]
    };
    sendJson(res, 200, data);
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { status: 'ONLINE' });
    return;
  }

  // 2. GET /api/logs (Backend Telemetry & Transaction Logs)
  if (pathname === '/api/logs' && req.method === 'GET') {
    sendJson(res, 200, {
      total: telemetryLogs.length,
      logs: telemetryLogs
    });
    return;
  }

  // POST /api/roadmap/generate — writes a learning roadmap for any request
  if (pathname === '/api/roadmap/generate' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { goal, catalog, refresh } = body || {};
    if (!goal) return sendJson(res, 400, { error: 'goal is required' });

    try {
      const { generateRoadmap } = require('./ananta-backend/utils/roadmapGenerator');
      const data = await generateRoadmap({
        goal,
        catalog: Array.isArray(catalog) ? catalog : [],
        refresh: refresh === true
      });
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { goal, steps: data.steps.length, source: data.source });
      return sendJson(res, 200, data);
    } catch (err) {
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/research/discover — live literature search for a plain-language topic
  // POST /api/research/brief    — the same, plus a cited AI synthesis
  if ((pathname === '/api/research/discover' || pathname === '/api/research/brief') && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { topic, limit, refresh } = body || {};
    if (!topic) return sendJson(res, 400, { error: 'topic is required' });

    try {
      const { discoverPapers, briefTopic } = require('./ananta-backend/utils/researchArchive');
      const run = pathname.endsWith('/brief') ? briefTopic : discoverPapers;
      const data = await run({ topic, limit: Math.min(Number(limit) || 12, 40), refresh: refresh === true });
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { topic, found: data.totalFound });
      return sendJson(res, 200, data);
    } catch (err) {
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return sendJson(res, 500, { error: err.message });
    }
  }

  // GET /api/voice/vocabulary — capability registry used for phonetic matching
  if (pathname === '/api/voice/vocabulary' && req.method === 'GET') {
    try {
      const { getVocabulary } = require('./ananta-backend/utils/voiceIntent');
      const data = getVocabulary();
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { terms: data.capabilities.length });
      return sendJson(res, 200, data);
    } catch (err) {
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
      return sendJson(res, 500, { error: err.message });
    }
  }

  // GET /api/resources — Live Community Resource Library (fetched from GitHub, cached)
  if (pathname === '/api/resources' && req.method === 'GET') {
    try {
      const { getResourceLibrary } = require('./ananta-backend/utils/githubResources');
      const forceRefresh = reqUrl.searchParams.get('refresh') === 'true';
      const data = await getResourceLibrary({ forceRefresh });
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { totalItems: data.totalItems });
      return sendJson(res, 200, data);
    } catch (err) {
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 3. GET /api/qpu/devices (Live IBM Quantum Fleet Discovery & Real Telemetry)
  if (pathname === '/api/qpu/devices' && req.method === 'GET') {
    const token = req.headers['x-ibm-token'] || reqUrl.searchParams.get('token') || IBM_QUANTUM_TOKEN;
    try {
      const fleet = await ibmQuantum.getLiveBackends(token);
      sendJson(res, 200, {
        success: true,
        ...fleet
      });
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { isLive: fleet.isLive, count: fleet.count });
    } catch (err) {
      sendJson(res, 200, {
        success: true,
        isLive: false,
        count: Object.keys(QPU_DEVICES).length,
        devices: QPU_DEVICES,
        notice: 'Showing baseline reference catalog: ' + err.message
      });
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { fallback: true, error: err.message });
    }
    return;
  }

  // 3b. POST /api/qpu/auth (Verify IBM Quantum API Token & User Account)
  if (pathname === '/api/qpu/auth' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const token = body.token || body.apiToken || req.headers['x-ibm-token'] || IBM_QUANTUM_TOKEN;
      const authRes = await ibmQuantum.validateToken(token);
      sendJson(res, authRes.valid ? 200 : 401, authRes);
      logTransaction('POST', pathname, authRes.valid ? 200 : 401, Date.now() - reqStart, { valid: authRes.valid });
    } catch (err) {
      sendJson(res, 500, { valid: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 3c. POST /api/gemini (Unified AI endpoint: circuit-doctor, roadmap, tutor, voice agent)
  if (pathname === '/api/gemini' && req.method === 'POST') {
    try {
      const geminiHandler = require('./api/gemini');
      const body = await parseRequestBody(req);
      req.body = body;
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (data) => { sendJson(res, res.statusCode || 200, data); return res; };
      await geminiHandler(req, res);
      logTransaction('POST', pathname, res.statusCode || 200, Date.now() - reqStart, { task: body ? body.task : 'unknown' });
      return;
    } catch (err) {
      console.error('[API /api/gemini Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 4. POST /api/ai/audit (Live Google AI Studio Deep Audit for Transpiler Doctor)
  if (pathname === '/api/ai/audit' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { code, framework = 'cirq', rawGates = 0, optGates = 0, savings = 0, qubits = 3 } = body;

      if (!code) {
        sendJson(res, 400, { error: 'Missing quantum circuit code in request body' });
        logTransaction('POST', pathname, 400, Date.now() - reqStart, { error: 'Missing code' });
        return;
      }

      const prompt = `You are the Principal Quantum Hardware Architect & Circuit Compiler Lead at Google Quantum AI and IBM Quantum.
Perform an in-depth clinical audit and hardware noise prognosis for this quantum circuit written in ${framework.toUpperCase()}:

\`\`\`
${code}
\`\`\`

Diagnostic context:
- Total Raw Gates: ${rawGates}
- Optimized Gates: ${optGates}
- Pruned Redundancies: ${savings} gates
- Active Qubits: ${qubits}

Return ONLY a valid JSON object matching this schema:
{
  "circuitName": "Descriptive algorithm title (e.g. 4-Qubit GHZ State Preparation or Entangled Bell State)",
  "healthAssessment": "2-3 sentences evaluating circuit health, gate bloat, and compilation status.",
  "gatePathology": "Specific explanation of which gates are redundant, unmerged, or causing unnecessary depth.",
  "decoherenceRisks": "Which physical qubits or operations carry highest risk of T1 decay or T2 dephasing on superconducting transmons.",
  "qpuRecommendation": "Comparative analysis: performance on IBM Eagle (Heavy-Hex), Google Sycamore (2D Grid), and IonQ Forte (All-to-All).",
  "clinicalPrescription": "Concrete next steps (e.g., Dynamical Decoupling sequence, Zero-Noise Extrapolation, KAK Cartan synthesis)."
}`;

      const aiRes = await callGeminiApi(prompt, '', true);
      let parsedAudit;
      try {
        parsedAudit = JSON.parse(aiRes.text);
      } catch (jsonErr) {
        const cleaned = aiRes.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedAudit = JSON.parse(cleaned);
      }

      const responseData = {
        success: true,
        audit: parsedAudit,
        metadata: {
          provider: 'Google AI Studio (Gemini 2.5 Flash)',
          model: aiRes.modelVersion,
          latencyMs: aiRes.latencyMs,
          usage: aiRes.usage,
          timestamp: new Date().toISOString()
        }
      };

      sendJson(res, 200, responseData);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        circuitName: parsedAudit.circuitName,
        latencyMs: aiRes.latencyMs
      });
      return;
    } catch (err) {
      console.error('[API /api/ai/audit Error]', err);
      sendJson(res, 502, {
        success: false,
        error: err.message || 'Error processing AI audit with Google AI Studio'
      });
      logTransaction('POST', pathname, 502, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 5. POST /api/ai/roadmap (Live Google AI Studio Personalized Curriculum Synthesis)
  if (pathname === '/api/ai/roadmap' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { userPrompt, moduleCatalog = '' } = body;

      if (!userPrompt) {
        sendJson(res, 400, { error: 'Missing userPrompt in request body' });
        logTransaction('POST', pathname, 400, Date.now() - reqStart, { error: 'Missing prompt' });
        return;
      }

      const systemPrompt = `You are the Lead Quantum Curriculum Architect & Quantum Information Physicist for Ananta Quantum Studio.
You must construct a personalized, mathematically rigorous learning pathway for a user based on their background, question, or request.

Available 18 Quantum Modules in the Curriculum:
${moduleCatalog}

User Request: "${userPrompt}"

Instructions:
1. Analyze the user's expertise level and request:
   - If they state they are a "beginner", "no prior knowledge", "already a beginner", or ask basic concepts, START at foundational modules (e.g. module-01, module-02, module-04, module-06).
   - If they state they "already know basics" or are "intermediate", skip introductory 101 definitions and begin with circuit engineering, Pauli observables, density matrices, and algorithms (e.g. module-02, module-04, module-06, module-07, module-08).
   - If they state "advanced", "learn from advanced", "expert", or ask about specialized topics (e.g., surface codes, FTQC, VQE, QML, microwave pulses, post-quantum crypto, cryogenics), skip basics completely and build a deep, high-level sequence (e.g. module-03, module-05, module-10, module-11, module-12, module-14, module-16).
   - If they ask for a specific topic (e.g., "teleportation", "Grover search", "cryogenics", "error correction"), include its essential prerequisites followed by the target topic and advanced next steps.
2. Select between 3 and 10 module IDs from the 18 available modules in STRICT prerequisite order.
3. Provide a clear rationale explaining why this specific sequence fits the user's background.

You MUST return ONLY a valid JSON object with the following schema:
{
  "displayName": "Concise descriptive title of this customized roadmap (e.g., 'Adaptive Pathway: Fault-Tolerant QC & QML')",
  "description": "2-sentence summary of the curriculum and what the learner will master.",
  "detectedLevel": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MASTER",
  "levelRationale": "Clear explanation of how the user's prompt informed this selection and ordering.",
  "moduleIds": ["module-01", "module-02", ...]
}`;

      const aiRes = await callGeminiApi(systemPrompt, '', true);
      let parsedRoadmap;
      try {
        parsedRoadmap = JSON.parse(aiRes.text);
      } catch (jsonErr) {
        const cleaned = aiRes.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedRoadmap = JSON.parse(cleaned);
      }

      const responseData = {
        success: true,
        roadmap: parsedRoadmap,
        metadata: {
          provider: 'Google AI Studio (Gemini 2.5 Flash)',
          model: aiRes.modelVersion,
          latencyMs: aiRes.latencyMs,
          usage: aiRes.usage,
          timestamp: new Date().toISOString()
        }
      };

      sendJson(res, 200, responseData);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        displayName: parsedRoadmap.displayName,
        level: parsedRoadmap.detectedLevel
      });
      return;
    } catch (err) {
      console.error('[API /api/ai/roadmap Error]', err);
      sendJson(res, 502, {
        success: false,
        error: err.message || 'Error generating roadmap with Google AI Studio'
      });
      logTransaction('POST', pathname, 502, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 6. POST /api/ai/chat (Conversational Quantum Reasoning & Copilot Assistant)
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { message, context = '' } = body;

      if (!message) {
        sendJson(res, 400, { error: 'Missing message in request body' });
        return;
      }

      const prompt = `You are Ananta's Quantum Copilot, a brilliant quantum physicist and circuit designer.
Explain clearly, concisely (max 3-4 sentences), and with mathematical precision.
If relevant, give gate sequence recommendations.

Current Studio Context: ${context || 'General Quantum Studio'}
User Question: "${message}"`;

      const aiRes = await callGeminiApi(prompt, '', false);
      sendJson(res, 200, {
        success: true,
        reply: aiRes.text.trim(),
        metadata: {
          provider: 'Google AI Studio (Gemini 2.5 Flash)',
          model: aiRes.modelVersion,
          latencyMs: aiRes.latencyMs
        }
      });
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { messageLength: message.length });
      return;
    } catch (err) {
      console.error('[API /api/ai/chat Error]', err);
      sendJson(res, 502, {
        success: false,
        error: err.message
      });
      logTransaction('POST', pathname, 502, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 6a2. POST /api/transpiler/from-composer (Load ANY circuit from Composer into Transpiler)
  if (pathname === '/api/transpiler/from-composer' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { grid = null, numQubits = 3, qasm = '', sourceFramework = 'qiskit', targetFramework = 'cirq', optimize = true } = body || {};
      const result = transpilerEngine.convertFromComposer({ grid, numQubits, qasm, sourceFramework, targetFramework, optimize });
      sendJson(res, 200, result);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        source: sourceFramework,
        target: targetFramework,
        rawGates: result.rawGateCount
      });
      return;
    } catch (err) {
      console.error('[API /api/transpiler/from-composer Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 6b. POST /api/transpiler/transpile (Universal Cross-Framework 1:1 Transpilation)
  if (pathname === '/api/transpiler/transpile' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { code = '', sourceFramework = 'qiskit', targetFramework = 'cirq' } = body || {};
      const result = transpilerEngine.transpile({ code, sourceFramework, targetFramework, optimize: false });
      sendJson(res, 200, result);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        source: sourceFramework,
        target: targetFramework,
        rawGates: result.rawGateCount
      });
      return;
    } catch (err) {
      console.error('[API /api/transpiler/transpile Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 6c. POST /api/transpiler/doctor (AI Circuit Doctor: Involutive Peephole & Deep QPU Noise Audit)
  if (pathname === '/api/transpiler/doctor' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { code = '', sourceFramework = 'qiskit', targetFramework = 'cirq' } = body || {};
      const result = transpilerEngine.transpile({ code, sourceFramework, targetFramework, optimize: true });

      // Live Google AI Studio Deep Audit if API key is active
      let aiAudit = null;
      const clientKey = (req.headers['x-gemini-key'] || '').trim();
      const apiKey = clientKey || GEMINI_API_KEY;
      if (apiKey) {
        try {
          const prompt = `You are the Principal Quantum Hardware Architect & Compiler Lead at Google Quantum AI and IBM Quantum.
Perform an in-depth clinical audit and hardware noise prognosis for this quantum circuit:
Source Framework: ${sourceFramework}
Target Framework: ${targetFramework}
Raw Gates: ${result.rawGateCount}
Optimized Gates: ${result.optimizedGateCount}
Eliminated Redundant Gates: ${result.metrics.diff}

Source Code:
\`\`\`
${code}
\`\`\`

Return ONLY a valid JSON object matching this schema:
{
  "circuitName": "Descriptive algorithm title",
  "healthAssessment": "2-3 sentences evaluating circuit health, gate bloat, and compilation status.",
  "gatePathology": "Specific explanation of which gates are redundant or unmerged.",
  "decoherenceRisks": "Which physical qubits or operations carry highest risk of T1 decay or T2 dephasing on superconducting transmons.",
  "qpuRecommendation": "Comparative analysis: performance on IBM Eagle (Heavy-Hex), Google Sycamore (2D Grid), and IonQ Forte (All-to-All).",
  "clinicalPrescription": "Concrete next steps (e.g., Dynamical Decoupling sequence, Zero-Noise Extrapolation, KAK Cartan synthesis)."
}`;
          const aiRes = await callGeminiApi(prompt, '', true, apiKey);
          aiAudit = JSON.parse(aiRes.text.replace(/```json/gi, '').replace(/```/g, '').trim());
        } catch (aiErr) {
          console.warn('[Server Transpiler Doctor AI] Gemini audit note:', aiErr.message);
        }
      }

      sendJson(res, 200, {
        ...result,
        aiAudit,
        provider: aiAudit ? 'Google AI Studio (Gemini 2.5 Flash)' : 'Ananta Deterministic Compiler Core'
      });
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        raw: result.rawGateCount,
        optimized: result.optimizedGateCount,
        hasAiAudit: !!aiAudit
      });
      return;
    } catch (err) {
      console.error('[API /api/transpiler/doctor Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 7. POST /api/qpu/run (Physical QPU Hardware Execution & Honest Simulation Dispatch)
  if (pathname === '/api/qpu/run' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const {
        backend = 'ibm_brisbane',
        shots = 1024,
        qasm = '',
        numQubits = 3,
        idealProbabilities = null,
        mode = 'auto',
        requireLive = false
      } = body || {};

      const token = req.headers['x-ibm-token'] || body.token || body.apiToken || IBM_QUANTUM_TOKEN;
      const isSimBackend = backend === 'simulator_mps';
      const shouldAttemptLive = !isSimBackend && mode !== 'simulation' && Boolean(token);

      if (shouldAttemptLive) {
        try {
          console.log(`[Server] Submitting circuit to real IBM Quantum QPU (${backend})...`);
          const job = await ibmQuantum.submitQpuJob({
            apiToken: token,
            backend,
            qasm,
            shots
          });

          // If job was dispatched, poll up to 3.5s for fast execution or simulators
          let finalResult = job;
          if (job.status !== 'COMPLETED') {
            const pollStart = Date.now();
            while (Date.now() - pollStart < 3500) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const check = await ibmQuantum.getJobStatusAndResult(token, job.jobId);
                if (check.status === 'COMPLETED' || check.status === 'ERROR' || check.status === 'CANCELLED') {
                  finalResult = check;
                  break;
                }
              } catch (pollErr) {
                break;
              }
            }
          }

          sendJson(res, 200, {
            ...finalResult,
            executionTimeMs: Math.round(Date.now() - reqStart)
          });
          logTransaction('POST', pathname, 200, Date.now() - reqStart, {
            jobId: job.jobId,
            backend,
            isRealHardware: true,
            status: finalResult.status
          });
          return;
        } catch (qpuErr) {
          console.warn(`[Server] Real IBM Quantum QPU execution error: ${qpuErr.message}`);
          if (requireLive || mode === 'hardware') {
            sendJson(res, 502, {
              success: false,
              isRealHardware: true,
              error: `IBM Quantum Hardware Execution Failed: ${qpuErr.message}`
            });
            logTransaction('POST', pathname, 502, Date.now() - reqStart, { error: qpuErr.message });
            return;
          }
          // Transparently fall back to simulation with explicit reason
          const simRes = ibmQuantum.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
          simRes.fallbackReason = qpuErr.message;
          simRes.executionTimeMs = Math.round(Date.now() - reqStart);
          sendJson(res, 200, simRes);
          logTransaction('POST', pathname, 200, Date.now() - reqStart, { mode: 'fallback_simulation' });
          return;
        }
      }

      // If user required live hardware but has no token
      if (requireLive || mode === 'hardware') {
        sendJson(res, 401, {
          success: false,
          error: 'IBM Quantum API Token required for physical QPU hardware execution. Please enter your API token in the settings modal or set IBM_QUANTUM_TOKEN.'
        });
        logTransaction('POST', pathname, 401, Date.now() - reqStart, { error: 'No token' });
        return;
      }

      // Sandbox Mode: Local physics noise simulation with honest disclosure
      const simRes = ibmQuantum.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
      simRes.executionTimeMs = Math.round(Date.now() - reqStart);
      sendJson(res, 200, simRes);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        jobId: simRes.jobId,
        backend,
        isRealHardware: false,
        status: 'COMPLETED'
      });
      return;
    } catch (err) {
      console.error('[API /api/qpu/run Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 8. GET /api/qpu/job/:id (Poll Real IBM Quantum Job Status and Results)
  if (pathname.startsWith('/api/qpu/job/') && req.method === 'GET') {
    const jobId = pathname.replace('/api/qpu/job/', '').trim();
    const token = req.headers['x-ibm-token'] || reqUrl.searchParams.get('token') || IBM_QUANTUM_TOKEN;
    if (!jobId) {
      return sendJson(res, 400, { error: 'Job ID is required in URL path' });
    }
    if (jobId.startsWith('sim_')) {
      return sendJson(res, 200, { status: 'COMPLETED', jobId, executionMode: 'SIMULATED_PHYSICAL_NOISE' });
    }
    if (!token) {
      return sendJson(res, 401, { error: 'IBM Quantum API Token required to query physical hardware job status' });
    }

    try {
      const jobResult = await ibmQuantum.getJobStatusAndResult(token, jobId);
      sendJson(res, 200, jobResult);
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { jobId, status: jobResult.status });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // ================= 9. QBRAID MULTI-PROVIDER QUANTUM EXECUTION ENDPOINTS =================

  // 9a. GET /api/qbraid/devices (Live qBraid Fleet Discovery & Multi-Provider Telemetry)
  if (pathname === '/api/qbraid/devices' && req.method === 'GET') {
    const apiKey = req.headers['x-qbraid-key'] || reqUrl.searchParams.get('key') || QBRAID_API_KEY;
    const filters = {
      provider: reqUrl.searchParams.get('provider') || 'all',
      architecture: reqUrl.searchParams.get('architecture') || 'all',
      minQubits: reqUrl.searchParams.get('minQubits') || '0',
      status: reqUrl.searchParams.get('status') || 'all',
      search: reqUrl.searchParams.get('search') || ''
    };
    try {
      const fleet = await qbraidClient.getLiveBackends(apiKey, filters);
      sendJson(res, 200, fleet);
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { isLive: fleet.isLive, count: fleet.count });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 9a2. POST /api/qbraid/recommend (Intelligent Circuit-to-Hardware Recommendation Engine)
  if (pathname === '/api/qbraid/recommend' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const {
        qasm = '',
        numQubits = 3,
        depth = 5,
        circuitType = 'general',
        shots = 1024,
        preference = 'balanced'
      } = body || {};

      const rec = qbraidClient.recommendHardware({ qasm, numQubits, depth, circuitType, shots, preference });
      sendJson(res, 200, rec);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { recommended: rec.primaryRecommendation?.device?.id });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 9a3. POST /api/qbraid/transpile (Multi-Architecture Native Code Generation)
  if (pathname === '/api/qbraid/transpile' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { qasm = '', backend = 'qbraid_sdk_simulator', format = 'auto' } = body || {};
      const transpiled = qbraidClient.transpileCircuit({ qasm, backend, format });
      sendJson(res, 200, transpiled);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { backend, format });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 9b. POST /api/qbraid/auth (Validate qBraid API Key & Account Credentials)
  if (pathname === '/api/qbraid/auth' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const apiKey = body.apiKey || body.token || req.headers['x-qbraid-key'] || QBRAID_API_KEY;
      const authRes = await qbraidClient.validateToken(apiKey);
      sendJson(res, authRes.valid ? 200 : 401, authRes);
      logTransaction('POST', pathname, authRes.valid ? 200 : 401, Date.now() - reqStart, { valid: authRes.valid });
    } catch (err) {
      sendJson(res, 500, { valid: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 9c. POST /api/qbraid/run (Execute Circuit on qBraid Backend or Realistic Architecture Noise)
  if (pathname === '/api/qbraid/run' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const {
        backend = 'qbraid_sdk_simulator',
        shots = 1024,
        qasm = '',
        numQubits = 3,
        idealProbabilities = null,
        mode = 'auto',
        requireLive = false
      } = body || {};

      const apiKey = req.headers['x-qbraid-key'] || body.apiKey || body.token || QBRAID_API_KEY;
      const isSimulator = backend.includes('simulator');
      const shouldAttemptLive = !isSimulator && mode !== 'simulation' && Boolean(apiKey);

      if (shouldAttemptLive) {
        try {
          console.log(`[Server] Submitting circuit to real qBraid backend (${backend})...`);
          const job = await qbraidClient.submitQbraidJob({
            apiKey,
            backend,
            qasm,
            shots
          });

          sendJson(res, 200, {
            ...job,
            executionTimeMs: Math.round(Date.now() - reqStart)
          });
          logTransaction('POST', pathname, 200, Date.now() - reqStart, {
            jobId: job.jobId,
            backend,
            isRealHardware: true,
            status: job.status
          });
          return;
        } catch (qbrErr) {
          console.warn(`[Server] Live qBraid dispatch notice: ${qbrErr.message}`);
          if (requireLive || mode === 'hardware') {
            sendJson(res, 502, {
              success: false,
              isRealHardware: true,
              error: `qBraid Execution Failed: ${qbrErr.message}`
            });
            logTransaction('POST', pathname, 502, Date.now() - reqStart, { error: qbrErr.message });
            return;
          }
          // Fallback to high-fidelity architecture simulation
          const simRes = qbraidClient.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
          simRes.fallbackReason = qbrErr.message;
          simRes.executionTimeMs = Math.round(Date.now() - reqStart);
          sendJson(res, 200, simRes);
          logTransaction('POST', pathname, 200, Date.now() - reqStart, { mode: 'fallback_simulation' });
          return;
        }
      }

      // Sandbox / Simulated Mode with architecture-specific physical noise model
      const simRes = qbraidClient.runSimulatedNoise({ backend, shots, numQubits, idealProbabilities, qasm });
      simRes.executionTimeMs = Math.round(Date.now() - reqStart);
      sendJson(res, 200, simRes);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        jobId: simRes.jobId,
        backend,
        isRealHardware: false,
        status: 'COMPLETED'
      });
      return;
    } catch (err) {
      console.error('[API /api/qbraid/run Error]', err);
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 9d. GET /api/qbraid/job/:id (Poll qBraid Job Status and Results)
  if (pathname.startsWith('/api/qbraid/job/') && req.method === 'GET') {
    const jobId = pathname.replace('/api/qbraid/job/', '').trim();
    const apiKey = req.headers['x-qbraid-key'] || reqUrl.searchParams.get('key') || QBRAID_API_KEY;

    if (!jobId) {
      return sendJson(res, 400, { error: 'Job ID is required in URL path' });
    }
    if (jobId.startsWith('qbr_sim_')) {
      return sendJson(res, 200, { status: 'COMPLETED', jobId, executionMode: 'SIMULATED_PHYSICAL_NOISE' });
    }

    try {
      const jobResult = await qbraidClient.getJobStatusAndResult(apiKey, jobId);
      sendJson(res, 200, jobResult);
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { jobId, status: jobResult.status });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // ================= 9e. REAL MULTI-FRAMEWORK LOCAL EXECUTION =================
  // Genuinely runs the circuit on an installed Qiskit Aer / Cirq / PennyLane
  // via a persistent Python worker process (ananta-backend/utils/multiFrameworkClient.js).
  // Never fabricates results: if a framework/interpreter isn't available,
  // that is reported honestly instead of silently substituting fake data.

  // 9e-i. GET /api/multiframework/status (real capability probe, not a hardcoded list)
  if (pathname === '/api/multiframework/status' && req.method === 'GET') {
    try {
      const probe = await multiFrameworkClient.probeFrameworks(['qiskit_aer', 'cirq', 'pennylane']);
      sendJson(res, 200, probe);
      logTransaction('GET', pathname, 200, Date.now() - reqStart, {
        available: Object.entries(probe.frameworks || {}).filter(([, v]) => v.available).map(([k]) => k)
      });
    } catch (err) {
      sendJson(res, 503, { success: false, error: err.message });
      logTransaction('GET', pathname, 503, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // 9e-ii. POST /api/multiframework/run (real circuit execution)
  if (pathname === '/api/multiframework/run' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { framework, qasm, numQubits, shots = 1024 } = body || {};
      if (!framework || !qasm || !numQubits) {
        sendJson(res, 400, { success: false, error: 'framework, qasm, and numQubits are required' });
        logTransaction('POST', pathname, 400, Date.now() - reqStart, { error: 'missing fields' });
        return;
      }
      const result = await multiFrameworkClient.runOnFramework({ framework, qasm, numQubits, shots });
      sendJson(res, result.success ? 200 : 502, result);
      logTransaction('POST', pathname, result.success ? 200 : 502, Date.now() - reqStart, {
        framework, numQubits, shots, success: result.success
      });
    } catch (err) {
      sendJson(res, 503, { success: false, error: err.message });
      logTransaction('POST', pathname, 503, Date.now() - reqStart, { error: err.message });
    }
    return;
  }

  // ================= 10. ASSESSMENT & QUIZZES ENDPOINTS =================

  // 10a. GET /api/quizzes (Catalog & Question Session Generation)
  if (pathname === '/api/quizzes' && req.method === 'GET') {
    try {
      const topic = reqUrl.searchParams.get('topic') || 'all';
      const difficulty = reqUrl.searchParams.get('difficulty') || 'all';
      const limit = parseInt(reqUrl.searchParams.get('limit') || '10', 10);
      const isCatalogOnly = reqUrl.searchParams.get('catalog') === 'true';

      const catalog = quizEngine.getQuizCatalog();
      if (isCatalogOnly) {
        return sendJson(res, 200, { success: true, catalog });
      }

      const session = quizEngine.getQuizQuestions({ topic, difficulty, limit });
      sendJson(res, 200, {
        success: true,
        catalog,
        session
      });
      logTransaction('GET', pathname, 200, Date.now() - reqStart, { topic, count: session.count });
      return;
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('GET', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 10b. POST /api/quizzes/submit (Automated Grading & Mathematical Explanations)
  if (pathname === '/api/quizzes/submit' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { answers = {}, studentId = 'std_curr_user', studentName = 'Quantum Scholar', cohortId = 'cohort_qc101' } = body;

      const evalResult = quizEngine.evaluateSubmission({ answers, studentId, studentName });
      if (!evalResult.success) {
        return sendJson(res, 400, evalResult);
      }

      // Persist progress to instructor database
      await instructorStorage.recordStudentProgress({
        studentId,
        studentName,
        cohortId,
        quizSubmission: evalResult,
        xpGained: evalResult.totalXpEarned
      });

      sendJson(res, 200, evalResult);
      logTransaction('POST', pathname, 200, Date.now() - reqStart, {
        studentId,
        score: `${evalResult.score}/${evalResult.totalQuestions}`,
        percentage: `${evalResult.percentage}%`
      });
      return;
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // ================= 11. INSTRUCTOR PORTAL & PROGRESS TRACKING ENDPOINTS =================

  // 11a. GET /api/progress/summary (Learner Personal Progress)
  if (pathname === '/api/progress/summary' && req.method === 'GET') {
    const studentId = reqUrl.searchParams.get('studentId') || 'std_curr_user';
    const progress = await instructorStorage.getStudentProgress(studentId);
    sendJson(res, 200, { success: true, ...progress });
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { studentId });
    return;
  }

  // 11b. POST /api/progress/sync (Sync Client Coding Challenge Solves & XP)
  if (pathname === '/api/progress/sync' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { studentId, studentName, cohortId, challengeSolved, xpGained } = body || {};
      const updated = await instructorStorage.recordStudentProgress({
        studentId,
        studentName,
        cohortId,
        challengeSolved,
        xpGained: Number(xpGained) || 0
      });
      sendJson(res, 200, { success: true, student: updated });
      logTransaction('POST', pathname, 200, Date.now() - reqStart, { studentId, xpGained });
      return;
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
      logTransaction('POST', pathname, 500, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // Instructor-only routes below all require a valid signed session with
  // role='instructor' - verified server-side, not trusted from the client.
  // Shared with api/index.js via authRoutes.checkInstructorAuth so the two
  // entry points cannot drift out of sync on which routes are guarded.
  const instructorAuthCheck = await authRoutes.checkInstructorAuth(pathname, req.method, req.headers['authorization']);
  if (instructorAuthCheck && !instructorAuthCheck.ok) {
    sendJson(res, instructorAuthCheck.statusCode, { success: false, error: instructorAuthCheck.error });
    logTransaction(req.method, pathname, instructorAuthCheck.statusCode, Date.now() - reqStart, { error: instructorAuthCheck.error });
    return;
  }

  // 11c. GET /api/instructor/cohorts (List Active Classroom Cohorts)
  if (pathname === '/api/instructor/cohorts' && req.method === 'GET') {
    const cohorts = await instructorStorage.getCohorts();
    sendJson(res, 200, { success: true, count: cohorts.length, cohorts });
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { count: cohorts.length });
    return;
  }

  // 11d. POST /api/instructor/cohorts (Create New Classroom Cohort)
  if (pathname === '/api/instructor/cohorts' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const newCohort = await instructorStorage.createCohort({ ...body, ownerUserId: instructorAuthCheck.session.uid });
      sendJson(res, 201, { success: true, cohort: newCohort });
      logTransaction('POST', pathname, 201, Date.now() - reqStart, { code: newCohort.code });
      return;
    } catch (err) {
      sendJson(res, 400, { success: false, error: err.message });
      logTransaction('POST', pathname, 400, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 11e. GET /api/instructor/cohort/:id/students (Student Roster)
  if (pathname.startsWith('/api/instructor/cohort/') && pathname.endsWith('/students') && req.method === 'GET') {
    const cohortId = pathname.replace('/api/instructor/cohort/', '').replace('/students', '').trim();
    const students = await instructorStorage.getCohortStudents(cohortId);
    sendJson(res, 200, { success: true, cohortId, count: students.length, students });
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { cohortId, count: students.length });
    return;
  }

  // 11f. GET /api/instructor/analytics (Classroom Metrics & Misconception Breakdown)
  if (pathname === '/api/instructor/analytics' && req.method === 'GET') {
    const cohortId = reqUrl.searchParams.get('cohortId') || 'cohort_qc101';
    const analytics = await instructorStorage.getCohortAnalytics(cohortId);
    sendJson(res, 200, { success: true, ...analytics });
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { cohortId, students: analytics.totalStudents });
    return;
  }

  // 11g. POST /api/instructor/assignments (Dispatch Circuit / Quiz Assignment)
  if (pathname === '/api/instructor/assignments' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const newAsg = await instructorStorage.createAssignment(body);
      sendJson(res, 201, { success: true, assignment: newAsg });
      logTransaction('POST', pathname, 201, Date.now() - reqStart, { title: newAsg.title });
      return;
    } catch (err) {
      sendJson(res, 400, { success: false, error: err.message });
      logTransaction('POST', pathname, 400, Date.now() - reqStart, { error: err.message });
      return;
    }
  }

  // 11h. GET /api/instructor/export-gradebook (Direct Downloadable CSV Gradebook)
  if (pathname === '/api/instructor/export-gradebook' && req.method === 'GET') {
    const cohortId = reqUrl.searchParams.get('cohortId') || 'cohort_qc101';
    const csvContent = await instructorStorage.generateGradebookCSV(cohortId);
    const filename = `ananta_gradebook_${cohortId}_${Date.now()}.csv`;

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(csvContent);
    logTransaction('GET', pathname, 200, Date.now() - reqStart, { cohortId, sizeBytes: csvContent.length });
    return;
  }

  // ================= STATIC FILE SERVING =================
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      // Source files must never be cached in dev: a stale .js/.css after an edit
      // looks exactly like "the fix didn't work". Only true static assets cache.
      'Cache-Control': ['.html', '.js', '.css', '.json'].includes(ext)
        ? 'no-cache'
        : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`⚛️  Ananta Full-Stack Quantum Server ACTIVE`);
  console.log(`🌐 URL: http://${HOST}:${PORT}/`);
  console.log(`🔍 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🤖 Google AI Studio Key: ${GEMINI_API_KEY ? 'Configured (' + GEMINI_API_KEY.substring(0, 8) + '...)' : 'MISSING'}`);
  console.log('====================================================');
});
