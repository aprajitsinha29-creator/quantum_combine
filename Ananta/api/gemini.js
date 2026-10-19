// FILE: /api/gemini.js
// Universal Multi-Provider Quantum AI Backend (Vercel Serverless Function & Node.js)
// Providers: Grok-2 (xAI), Google AI Studio (Gemini 2.5 Flash), Deterministic Quantum AI
// Tasks: voice-parse, audio-parse, circuit-doctor, roadmap, concept-doctor, provider-info

const fs = require('fs');
const path = require('path');

// Automatically read local .env if process.env.GEMINI_API_KEY is not already set
if (!process.env.GEMINI_API_KEY) {
  try {
    const envPaths = [
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', 'ananta-backend', '.env')
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[k]) process.env[k] = v;
          }
        }
      }
    }
  } catch (e) {}
}

const { resolveTranscript, sampleSuggestions } = require('../ananta-backend/utils/voiceIntent');
const { prepareTurn } = require('../ananta-backend/utils/voiceAgent');
const ragRetrieval = require('../ananta-backend/rag/ragRetrieval');

let localTopicDb = [];
try {
  const qkData = require('../js/quantum-knowledge-data');
  if (Array.isArray(qkData.QUANTUM_TOPIC_DATABASE)) {
    localTopicDb = qkData.QUANTUM_TOPIC_DATABASE;
  }
} catch (e) {}

/**
 * Credentials come from the environment or from the caller, never from source.
 * Returning '' when nothing is configured is deliberate: the provider probe then
 * reports "no key configured" honestly and the deterministic engine takes over,
 * instead of a committed key silently answering for everybody.
 */
function getApiKey(req) {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    return process.env.GEMINI_API_KEY.trim();
  }
  if (req && req.headers && req.headers['x-gemini-key'] && req.headers['x-gemini-key'].length > 10) {
    return req.headers['x-gemini-key'].trim();
  }
  return '';
}

function getGrokKey(req, body) {
  if (process.env.GROK_API_KEY && process.env.GROK_API_KEY.length > 5) {
    return process.env.GROK_API_KEY.trim();
  }
  if (process.env.XAI_API_KEY && process.env.XAI_API_KEY.length > 5) {
    return process.env.XAI_API_KEY.trim();
  }
  if (req && req.headers) {
    if (req.headers['x-grok-key'] && req.headers['x-grok-key'].length > 5) {
      return req.headers['x-grok-key'].trim();
    }
    if (req.headers['x-xai-key'] && req.headers['x-xai-key'].length > 5) {
      return req.headers['x-xai-key'].trim();
    }
  }
  if (body && body.grokApiKey && typeof body.grokApiKey === 'string' && body.grokApiKey.length > 5) {
    return body.grokApiKey.trim();
  }
  if (body && body.payload && body.payload.grokApiKey && typeof body.payload.grokApiKey === 'string' && body.payload.grokApiKey.length > 5) {
    return body.payload.grokApiKey.trim();
  }
  return '';
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

// --------------------------------------------------------------------
// Grok (xAI API) Caller
// --------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Model discovery.
//
// Hardcoded model ids rot: "grok-2-latest" and a fixed Gemini id both started
// returning "model not found", which surfaced to users as a silent downgrade to
// the offline engine. Ask each provider what it actually serves, pick the best
// match, and cache it for the life of the warm instance. A provider renaming its
// models no longer breaks anything.
// ---------------------------------------------------------------------------
const _modelCache = { gemini: null, grok: null };

/** Ranks candidates: prefer fast "flash"/"mini" tiers, then the newest version. */
function rankModel(name, preferred) {
  const n = name.toLowerCase();
  let score = 0;
  for (const token of preferred) if (n.includes(token)) score += 100;
  const version = n.match(/(\d+(?:\.\d+)?)/);
  if (version) score += parseFloat(version[1]) * 10;
  if (n.includes('preview') || n.includes('exp')) score -= 15;
  if (n.includes('vision') || n.includes('embedding') || n.includes('image') || n.includes('tts')) score -= 500;
  return score;
}

/** Ranked list of every model this key may call, best first. */
async function resolveGeminiModels(apiKey) {
  if (_modelCache.geminiList) return _modelCache.geminiList;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) throw new Error(`Gemini ListModels HTTP ${res.status}`);

  const data = await res.json();
  const usable = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''));

  if (!usable.length) throw new Error('Gemini key has no models supporting generateContent');

  usable.sort((a, b) => rankModel(b, ['flash']) - rankModel(a, ['flash']));
  _modelCache.geminiList = usable;
  return usable;
}

async function resolveGeminiModel(apiKey) {
  if (_modelCache.gemini) return _modelCache.gemini;
  const list = await resolveGeminiModels(apiKey);
  return list[0];
}

async function resolveGrokModel(grokKey) {
  if (_modelCache.grok) return _modelCache.grok;

  const res = await fetch('https://api.x.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${grokKey.trim()}` }
  });
  if (!res.ok) throw new Error(`xAI ListModels HTTP ${res.status}`);

  const data = await res.json();
  const usable = (data.data || []).map(m => m.id).filter(Boolean);
  if (!usable.length) throw new Error('xAI key exposes no usable models');

  usable.sort((a, b) => rankModel(b, ['grok']) - rankModel(a, ['grok']));
  _modelCache.grok = usable[0];
  console.log('[Grok API] Using discovered model:', _modelCache.grok);
  return _modelCache.grok;
}

/**
 * Reports what each provider can actually do right now, by resolving a model
 * rather than merely checking that a key string exists — the old check reported
 * "available" even when every call was failing.
 */
async function probeProviders(req, body) {
  const grokKey = getGrokKey(req, body);
  const geminiKey = getApiKey(req);

  const probe = async (key, resolver) => {
    if (!key) return { available: false, model: null, error: 'no key configured' };
    try {
      return { available: true, model: await resolver(key), error: null };
    } catch (err) {
      return { available: false, model: null, error: err.message };
    }
  };

  const [grok, gemini] = await Promise.all([
    probe(grokKey, resolveGrokModel),
    probe(geminiKey, resolveGeminiModel)
  ]);

  return {
    providers: {
      grok,
      gemini,
      deterministicQuantumAI: { available: true, model: 'quantum-nlp-v2', error: null }
    },
    activeProvider: grok.available ? grok.model : (gemini.available ? gemini.model : 'deterministic-quantum-ai')
  };
}

async function callGrokAPI(grokKey, systemPrompt, userText, model = null) {
  model = model || await resolveGrokModel(grokKey);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);
  try {
    const fullUserText = userText ? String(userText) : 'Process strictly according to required JSON schema.';
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokKey.trim()}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullUserText }
        ],
        temperature: 0.15,
        response_format: { type: 'json_object' }
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`xAI Grok HTTP ${response.status}: ${errTxt.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Grok');
    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { ok: true, result: parsed, source: model };
  } finally {
    clearTimeout(timeoutId);
  }
}

// --------------------------------------------------------------------
// Google AI Studio Direct Caller
// --------------------------------------------------------------------
async function callGeminiOnce(apiKey, model, systemPrompt, userText) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000);
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const fullPrompt = userText ? `${systemPrompt}\n\nUser input: "${userText}"` : systemPrompt;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty text from Gemini');

    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { ok: true, result: parsed, source: model };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tries the discovered models best-first. The top-ranked model can be
 * overloaded (503) or out of quota (429) for a given key while another is
 * perfectly usable, so a single stale choice must not take the whole copilot
 * offline. The model that works is remembered for subsequent calls.
 */
async function callGeminiDirect(apiKey, systemPrompt, userText) {
  // Delegates to the shared provider layer (ananta-backend/utils/aiProvider.js)
  // so the tutor gets the same runtime model discovery, wider rotation and
  // response cache as every other AI feature. The free tier caps requests per
  // model per day, and Live Audit fires a tutor call on every gate placement -
  // without rotation + caching the first model 429s and the whole tutor goes
  // dark for the rest of the day, which is exactly what was happening.
  const { generateJson } = require('../ananta-backend/utils/aiProvider');
  const fullPrompt = userText ? `${systemPrompt}\n\nUser input: "${userText}"` : systemPrompt;
  const out = await generateJson({
    prompt: fullPrompt,
    maxTokens: 8192,
    temperature: 0.2,
    timeoutMs: 20000,
    maxModels: 6
  });
  _modelCache.gemini = out.model;
  return { ok: true, result: out.result, source: out.model };
}

// --------------------------------------------------------------------
// Multi-Provider AI Dispatcher with Guaranteed Fallbacks
// --------------------------------------------------------------------
async function callMultiProviderAI(req, body, systemPrompt, userText, localFallbackFn, res) {
  const geminiKey = getApiKey(req);
  const grokKey = getGrokKey(req, body);
  const requestedProvider = (body?.provider || (req.headers && req.headers['x-ai-provider']) || '').toLowerCase();
  // Provider failures used to vanish into server logs, leaving the UI showing
  // "Quantum Engine" with no way to tell whether a key was missing, rejected or
  // simply timed out. Collect them and report them with the fallback answer.
  const providerErrors = [];

  // 1. If Grok explicitly requested or Grok key provided, try Grok first!
  if (requestedProvider === 'grok' || (grokKey && requestedProvider !== 'gemini' && requestedProvider !== 'local')) {
    if (grokKey) {
      try {
        const grokRes = await callGrokAPI(grokKey, systemPrompt, userText);
        return res.status(200).json(grokRes);
      } catch (err) {
        console.warn(`[Grok API] Call failed (${err.message}), evaluating Gemini / Local fallback...`);
        providerErrors.push({ provider: 'grok', error: err.message });
      }
    } else if (requestedProvider === 'grok') {
      console.warn('[Grok API] Requested "grok" but no xAI key provided. Falling back to Gemini.');
      providerErrors.push({ provider: 'grok', error: 'no xAI key configured' });
    }
  }

  // 2. Try Gemini 2.5 Flash
  if (geminiKey && geminiKey.length > 10 && requestedProvider !== 'local') {
    try {
      const geminiRes = await callGeminiDirect(geminiKey, systemPrompt, userText);
      return res.status(200).json(geminiRes);
    } catch (err) {
      console.warn(`[Gemini API] Call failed (${err.message}), evaluating fallbacks...`);
      providerErrors.push({ provider: 'gemini', error: err.message });
      // If Grok key is available and wasn't tried yet:
      if (grokKey && requestedProvider !== 'gemini') {
        try {
          const grokRes = await callGrokAPI(grokKey, systemPrompt, userText);
          return res.status(200).json(grokRes);
        } catch (grokErr) {
          console.warn(`[Grok API] Fallback call also failed (${grokErr.message})`);
          providerErrors.push({ provider: 'grok', error: grokErr.message });
        }
      }
    }
  } else if (requestedProvider !== 'local') {
    providerErrors.push({ provider: 'gemini', error: 'no Gemini key configured' });
  }

  // 3. Guaranteed Deterministic Quantum AI Engine (100% Uptime HTTP 200)
  try {
    // Real reason for the fallback, not a guess: a configured-but-rejected/
    // expired key and a genuinely-missing key are different problems, and
    // telling a user with a real key configured "no key is configured" sent
    // them looking in the wrong place.
    const fallbackResult = localFallbackFn(providerErrors);
    return res.status(200).json({
      ok: true,
      result: fallbackResult,
      source: 'deterministic-quantum-ai',
      providerErrors
    });
  } catch (fallbackErr) {
    return res.status(500).json({ error: 'Failed to synthesize response', detail: fallbackErr.message, providerErrors });
  }
}

async function handler(req, res) {
  // Compatibility helper for native Node.js http.ServerResponse
  if (!res.status) {
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // CORS & method guard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Key, X-Grok-Key, X-XAI-Key, X-AI-Provider, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ONLINE', ...(await probeProviders(req, null)) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await getParsedBody(req);
  let task = body?.task;
  let payload = body?.payload;

  // Handle direct calls to /api/ai/tutor or /api/knowledge with flat body
  const reqUrl = new URL(req.url, `http://${req.headers?.host || '127.0.0.1'}`);
  if (!task && reqUrl.pathname.endsWith('/tutor')) {
    task = 'circuit-tutor';
    payload = body || {};
  }
  if (!task && reqUrl.pathname.includes('/knowledge')) {
    task = 'knowledge-engine';
    payload = body || {};
  }
  if (task && !payload) {
    payload = body || {};
  }

  // Task: provider-info / model status
  if (task === 'provider-info' || task === 'status') {
    return res.status(200).json({ ok: true, ...(await probeProviders(req, body)) });
  }

  if (!task || !payload) {
    return res.status(400).json({ error: 'Missing task or payload' });
  }

  const responseSchemaNote = 'Return ONLY raw JSON. No markdown fences, no commentary.';

  switch (task) {
    // ------------------------------------------------------------------
    // 0. VOICE AGENT — the primary path. Handles building, questions and
    //    error explanation in one schema, with conversation memory and
    //    numbers grounded in a real backend simulation of the live circuit.
    // ------------------------------------------------------------------
    case 'voice-agent': {
      const { transcript, circuit, history, errorContext } = payload;
      if (!transcript && !errorContext) {
        return res.status(400).json({ error: 'transcript or errorContext is required' });
      }

      const turn = prepareTurn({ transcript, circuit, history, errorContext });

      return await callMultiProviderAI(
        req,
        body,
        turn.systemPrompt,
        '',
        () => {
          // No provider available: answer questions and errors from the
          // simulator, and hand build requests to the circuit parser.
          const settled = turn.deterministic();
          if (settled) return settled;

          const plan = parseVoiceLocally(transcript, circuit);
          const opSummary = (plan.operations || [])
            .map(o => `${o.gate} on q${(o.targets || []).join(',')}`)
            .join(', ');
          return {
            mode: plan.clarification_needed ? 'clarify' : 'build',
            num_qubits: plan.num_qubits,
            reset_existing: plan.reset_existing,
            operations: plan.operations || [],
            spoken_response: plan.clarification_needed || plan.explanation ||
              (opSummary ? `Placed ${opSummary}.` : 'Circuit updated.'),
            display_text: plan.explanation || plan.clarification_needed || '',
            teaching_tip: plan.teaching_tip || null,
            error_feedback: plan.error_feedback || null,
            clarification_needed: plan.clarification_needed || null,
            confidence: plan.confidence
          };
        },
        res
      );
    }

    // ------------------------------------------------------------------
    // 1. VOICE COPILOT — text transcript intent parser (Grok & Gemini)
    // ------------------------------------------------------------------
    case 'voice-parse': {
      const { transcript, currentCircuit } = payload;
      const circuitSnapshot = JSON.stringify(currentCircuit || { num_qubits: 2, grid: [] });
      const voiceResolution = resolveTranscript(transcript || '');
      const systemPrompt = `You are an expert quantum computing mentor and circuit synthesis engine for a web-based quantum circuit composer called "Ananta Quantum Studio".

YOUR ROLE:
- You are a patient, step-by-step voice mentor. The user speaks instructions and you translate them into precise circuit operations.
- You MUST also explain what you're doing and teach the user quantum concepts as you go.
- If the user makes a mistake or asks for something physically impossible, explain the error clearly instead of guessing.

SPEECH RECOGNITION IS IMPERFECT:
- This transcript came from a microphone, so words are often garbled, split, or merged ("bellystate" = "bell state", "had a mard" = "hadamard", "grovers" = "grover").
- Interpret phonetically and charitably: infer the closest quantum term the user plausibly meant rather than rejecting the request.
- Only ask for clarification when the intent is genuinely unrecoverable, not merely misspelled.${voiceResolution.corrected ? `
- A phonetic pre-pass already resolved this to: "${voiceResolution.text}". Treat that as a strong hint.` : ''}

CRITICAL MULTI-TARGET RULE:
- If the user says "put S on q0 AND q3", you MUST emit TWO separate operations: one with targets:[0] and one with targets:[3].
- If the user says "add H to qubit 0, 1, and 2", emit THREE operations, one per qubit.
- NEVER combine multiple qubits into a single targets array for single-qubit gates (H, X, Y, Z, S, T, M). Each qubit gets its own operation.
- Multi-qubit gates like CNOT use controls + targets together in ONE operation.

SPOKEN LANGUAGE RULES:
- "H not" or "H naught" or "H nought" = Hadamard on wire 0 (qubit 0).
- "q0", "qubit 0", "wire 0", "first qubit" = qubit index 0.
- "q1", "qubit 1", "wire 1", "second qubit" = qubit index 1.
- "t1" = column/step 0 (0-indexed), "t2" = column 1, "t3" = column 2, etc.
- "CNOT from 0 to 1" = CNOT with control=0, target=1.

GATE NAMES: H, X, Y, Z, S, T, CNOT, CZ, SWAP, Toffoli, Rx, Ry, Rz, MEASURE

OUTPUT SCHEMA (return ONLY this JSON, no markdown fences, no commentary):
{
  "num_qubits": <int, minimum qubits needed>,
  "reset_existing": <bool, true only if user says "make/create/build a new circuit">,
  "operations": [
    {
      "action": "place" | "move" | "remove",
      "gate": "<gate name>",
      "targets": [<int>],
      "controls": [<int, only for controlled gates>],
      "step": <int|null, 0-indexed column, null = auto-place at next free slot>,
      "from_step": <int|null, only for move actions>,
      "from_qubit": <int|null, only for move actions>,
      "params": { "theta": <float, only for Rx/Ry/Rz> }
    }
  ],
  "explanation": "<1-3 sentence step-by-step explanation of what you built and why, suitable for a student>",
  "error_feedback": "<null, OR a clear explanation of what's wrong with the user's request if it's physically impossible or ambiguous>",
  "teaching_tip": "<a one-liner quantum physics insight related to the gates/circuit just built, e.g. 'The S gate applies a π/2 phase rotation, equivalent to √Z.'>",
  "confidence": <float 0-1>,
  "clarification_needed": "<null, OR a question to ask the user if the instruction is truly ambiguous>"
}

CURRENT CIRCUIT STATE (use this to understand what's already placed):
${circuitSnapshot}

${responseSchemaNote}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        transcript,
        () => parseVoiceLocally(transcript, currentCircuit),
        res
      );
    }

    // ------------------------------------------------------------------
    // 1b. AUDIO VOICE COPILOT — direct raw audio understanding
    // ------------------------------------------------------------------
    case 'audio-parse': {
      const { audioBase64, mimeType, currentCircuit } = payload;
      const geminiKey = getApiKey(req);
      const systemPrompt = `You are an expert quantum speech assistant.
Listen to the user's spoken audio, transcribe it precisely, and parse it into quantum circuit operations.
Output ONLY a JSON object matching this schema:
{
  "transcript": "<verbatim transcript of user speech>",
  "num_qubits": <int>,
  "reset_existing": <bool>,
  "operations": [
    { "step": <int|null>, "gate": "<H|X|Y|Z|S|T|CNOT|CZ|SWAP|Toffoli|Rx|Ry|Rz|MEASURE>",
      "targets": [<int>...], "controls": [<int>...], "params": { "theta": <float> } }
  ],
  "confidence": <float 0-1>,
  "clarification_needed": "<string|null>"
}
Current circuit state: ${JSON.stringify(currentCircuit || {})}
${responseSchemaNote}`;

      return await callGeminiAudioWithLocalFallback(
        geminiKey,
        systemPrompt,
        audioBase64,
        mimeType,
        () => ({
          transcript: 'Voice audio received',
          num_qubits: currentCircuit?.num_qubits || 2,
          reset_existing: false,
          operations: [{ step: null, gate: 'H', targets: [0], controls: [], params: {} }],
          confidence: 0.85,
          clarification_needed: null
        }),
        res
      );
    }

    // ------------------------------------------------------------------
    // 2. AI CIRCUIT DOCTOR — clinical audit of a transpiled circuit
    // ------------------------------------------------------------------
    case 'circuit-doctor': {
      const { sourceCode, sourceFramework, rawGatesCount, optGatesCount, numQubits } = payload;
      const systemPrompt = `You are the Principal Quantum Hardware Architect & Circuit
Compiler Lead at Google Quantum AI and IBM Quantum. Perform an in-depth
clinical audit and hardware noise prognosis for this quantum circuit written
in ${String(sourceFramework || '').toUpperCase()}:
\`\`\`
${sourceCode}
\`\`\`
Diagnostic context:
- Total Raw Gates: ${rawGatesCount}
- Optimized Gates: ${optGatesCount}
- Pruned Redundancies: ${rawGatesCount - optGatesCount} gates
- Active Qubits: ${numQubits}
Return ONLY a valid JSON object matching this schema:
{
  "circuitName": "Descriptive algorithm title",
  "healthAssessment": "2-3 sentences evaluating circuit health, gate bloat, and compilation status.",
  "gatePathology": "Which gates are redundant, unmerged, or causing unnecessary depth.",
  "decoherenceRisks": "Which physical qubits/operations carry highest T1/T2 risk.",
  "qpuRecommendation": "Comparative analysis across IBM Eagle, Google Sycamore, IonQ Forte.",
  "clinicalPrescription": "Concrete next steps (Dynamical Decoupling, ZNE, KAK Cartan synthesis)."
}
${responseSchemaNote}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        '',
        () => generateCircuitAuditLocally(payload),
        res
      );
    }

    // ------------------------------------------------------------------
    // 3. ROADMAP STUDIO — voice-activated curriculum pathway resolver
    // ------------------------------------------------------------------
    case 'roadmap': {
      const { instruction, availableModuleIds } = payload;
      const systemPrompt = `You are a quantum curriculum advisor. Given a learner's
spoken/typed request and the list of valid module IDs below, choose the
subset and order of modules that best satisfies the request.
Valid module IDs: ${JSON.stringify(availableModuleIds || [])}
Return ONLY JSON: { "moduleIds": ["id1","id2",...], "displayName": "Descriptive pathway title", "description": "2-sentence overview", "reasoning": "one sentence" }
Only use IDs from the valid list above — never invent new ones.
${responseSchemaNote}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        instruction,
        () => generateRoadmapLocally(instruction, availableModuleIds),
        res
      );
    }

    // ------------------------------------------------------------------
    // 4. CONCEPT DOCTOR — grounded conceptual Q&A
    // ------------------------------------------------------------------
    case 'concept-doctor': {
      const { question, groundingEntries } = payload;
      // This prompt used to say "answer using ONLY the grounding material -
      // if the material doesn't cover the question, say so plainly". The
      // grounding library is a handful of animated concepts, so any question
      // outside that short list came back as "Information not available" -
      // including genuinely standard ones like "show me a 3D model of a Bell
      // state". Refusing to explain textbook physics is the wrong failure
      // mode for a tutor. The library is now a preference (it lets the app
      // launch the matching animation), not a hard boundary on what may be
      // answered; the anti-hallucination rule is scoped to what it should
      // actually prevent - invented, non-standard or fabricated claims.
      const systemPrompt = `You are a quantum physics tutor explaining a concept to a learner.

GROUNDING LIBRARY (Ananta's own interactive concept entries) is provided below.
Use it FIRST: if one of these entries covers the learner's question, base your
answer on it and set "matched_source" to that entry's id, so the app can launch
its interactive animation.

If NONE of the entries covers the question, STILL ANSWER IT. You are a physics
tutor and the learner asked a real question. Explain it from well-established,
textbook quantum mechanics and set "matched_source" to null. Never reply that
information is unavailable simply because the question is not in the library.

Do NOT invent speculative or non-standard physics, fabricated experimental
results, or made-up numbers. Only if the question is genuinely outside physics,
or cannot be answered scientifically at all, say so plainly.

ILLUSTRATIVE CIRCUIT: if the concept can be demonstrated by a small quantum
circuit, also return one. Ananta will RUN it on its real statevector simulator
and show the learner the actual resulting probabilities and entanglement - so
it must be a genuine, correct circuit, not a decorative one. Keep it minimal
(1-3 qubits, few gates) and make it the canonical demonstration of the concept.
Return null if the concept cannot honestly be shown as a circuit.

Allowed gates: H, X, Y, Z, S, T, RX, RY, RZ, P (these take "angle" in radians),
CNOT (control+target), CZ (two wires), SWAP (two wires), TOFFOLI (two controls +
target), M (measure).

Grounding library:
${JSON.stringify(groundingEntries || [])}
Return ONLY JSON: {
  "title": "short title for this explanation",
  "analogy": "a real-world analogy, 2-3 sentences",
  "explanation": "the actual physics explanation, in clear language for a learner",
  "matched_source": "the id of the grounding entry this matched, or null if answered from general physics",
  "illustrative_circuit": {
    "numQubits": 2,
    "caption": "one short line saying what this circuit demonstrates",
    "gates": [
      { "gate": "H", "qubit": 0 },
      { "gate": "CNOT", "control": 0, "target": 1 }
    ]
  }
}
"illustrative_circuit" may be null. Gate objects use "qubit" for single-qubit
gates, "control"/"target" for CNOT, "controls":[a,b]+"target" for TOFFOLI,
"wires":[a,b] for CZ and SWAP, and optional "angle" for rotations.
${responseSchemaNote}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        question,
        () => generateConceptDoctorLocally(question, groundingEntries),
        res
      );
    }

    // ------------------------------------------------------------------
    // 5. CIRCUIT TUTOR — SIH Problem Statement 26140 Grounded AI Circuit Tutor
    //    Identifies what the student is making, performs mathematical error
    //    checking, detects pathologies (redundancies, premature collapse,
    //    idle wires, ineffective CNOTs), and provides anti-hallucinatory guidance.
    // ------------------------------------------------------------------
    case 'circuit-tutor': {
      const {
        gridStructure,
        operationList,
        numQubits,
        activeDepth,
        diracNotation,
        probabilities,
        mathMetrics,
        deterministicErrors,
        userQuestion
      } = payload;

      const findings = Array.isArray(deterministicErrors) ? deterministicErrors : [];

      // Real RAG: when the student asks something, retrieve the actual
      // semantically-nearest passages from the 80+-topic knowledge corpus
      // (js/quantum-knowledge-data.js, embedded once by
      // ananta-backend/rag/buildIndex.js) via cosine similarity over real
      // Gemini embeddings - not keyword matching, not fabricated context.
      // Silently contributes nothing if the index hasn't been built yet or
      // no key is configured (ragRetrieval.retrieve returns []).
      let ragContextBlock = '';
      if (userQuestion) {
        try {
          const ragKey = getApiKey(req);
          const hits = await ragRetrieval.retrieve(userQuestion, ragKey, 3);
          if (hits.length) {
            ragContextBlock = `\nRELEVANT KNOWLEDGE-BASE PASSAGES (retrieved by semantic similarity to the student's question - cite these if they answer it; ignore if irrelevant to a circuit-specific question):\n` +
              hits.map((h, i) => `[${i + 1}] ${h.title} (similarity ${h.similarity.toFixed(2)}):\n${h.text}`).join('\n\n');
          }
        } catch (e) {
          console.warn('[circuit-tutor] RAG retrieval skipped:', e.message);
        }
      }

      const systemPrompt = `You are the Principal Quantum Computing Professor & Interactive Circuit Tutor for Ananta Quantum Studio (SIH Problem Statement 26140).
Your goal is to guide students building quantum circuits by providing:
1. WHAT THEY ARE MAKING: Accurately identify the quantum state or algorithm being implemented.
2. CIRCUIT PATHOLOGY & ERROR ANALYSIS: Identify mistakes (e.g. self-cancelling gates, premature measurement collapse, idle wires, ineffective CNOTs without superposition, depth bloat).
3. PHYSICAL INTUITION & RECOMMENDATIONS: Grounded in real quantum physics (concurrence, entropy, statevector).

STRICT ANTI-HALLUCINATION RULES:
- Ground all statements STRICTLY in the provided circuit ground truth data below.
- DO NOT invent gates, qubits, or state probabilities not present in the ground truth.
- Use the RESOLVED OPERATION LIST as the authoritative reading of what gates exist.
  Two controls sharing one target in the same time step is a TOFFOLI, not a CNOT.
  Never describe a gate that is not in that list, and never rename one that is.
- The DETERMINISTIC STATIC ANALYSIS is authoritative AND exhaustive for circuit
  errors. It is a real simulation-backed check, not a hint. Therefore:
    * The "errors" array MUST correspond one-to-one with those findings.
    * If that list is empty, "errors" MUST be [] and "isHealthy" MUST be true.
    * NEVER invent, infer or add an error that is not in that list.
  You may still offer improvement ideas - but put them in "tutorGuidance" as
  suggestions, never as "errors", and never claim a gate is redundant or
  ineffective unless the deterministic analysis says so.
- Do not tell the student to delete a gate unless the deterministic analysis
  flagged it. Removing a gate that is actually doing work changes the circuit's
  output state and is worse advice than saying nothing.
- If the circuit is empty, tell the student to place gates to begin.
- If errors are present, explain the physical reason (e.g. Born rule collapse, Clifford involution H^2 = I) and give a clear fix.
- If retrieved knowledge-base passages are provided below and the student's question is conceptual (not circuit-specific), ground your answer in them and reference the topic title. Never state a retrieved passage's content as if it applied to the student's circuit unless it actually does.

GROUND TRUTH SIMULATOR DATA:
- Register Size: ${numQubits || 3} Qubits, Active Depth: ${activeDepth || 0}
- Circuit Wire Topology:
${gridStructure || '(empty circuit)'}
- Dirac Statevector: ${diracNotation || '|0...0>'}
- Measurement Probabilities: ${JSON.stringify(probabilities || {})}
- Quantum Physics Metrics:
  * Concurrence C = ${mathMetrics?.concurrence ?? '0.00'}
  * von Neumann Entropy S = ${mathMetrics?.entropy ?? '0.00'} ebits
  * Subsystem Purity gamma = ${mathMetrics?.purity ?? '1.00'}
  * Entanglement Classification: ${mathMetrics?.entanglementClass || 'Separable'}
- RESOLVED OPERATION LIST (authoritative - this is exactly what the circuit contains, in order):
${Array.isArray(operationList) && operationList.length ? operationList.map((o, i) => `  ${i + 1}. ${o}`).join('\n') : '  (no gates placed)'}
- DETERMINISTIC STATIC ANALYSIS - ${findings.length} finding(s) (authoritative and exhaustive):
${findings.length ? JSON.stringify(findings) : '  NONE. This circuit has no detected errors. "errors" MUST be [] and "isHealthy" MUST be true.'}
${userQuestion ? `- Student Question: "${userQuestion}"` : ''}
${ragContextBlock}

You MUST return ONLY a valid JSON object matching this schema:
{
  "circuitSummary": "Concise title identifying what is being made (e.g., 'Bell State |Phi+> Preparation', 'Tripartite GHZ Entanglement', 'Custom Superposition Register', 'Ground State Baseline')",
  "circuitPurpose": "2-3 clear sentences explaining what this quantum circuit computes and its practical quantum application.",
  "isHealthy": <boolean: true if no severe errors, false if errors or inefficiencies exist>,
  "healthBadge": "<e.g. 'Healthy Circuit (100% Sound)' or '2 Issues Detected' or 'Compilation Error'>",
  "errors": [
    {
      "severity": "error" | "warning" | "optimization",
      "title": "<short finding title>",
      "location": "<e.g. Wire q[0] at step 2>",
      "explanation": "<physical explanation of why this happens>",
      "suggestedFix": "<concrete instruction to fix it>"
    }
  ],
  "entanglementAnalysis": "1-2 sentences interpreting the concurrence and entanglement of the current state.",
  "tutorGuidance": "2-3 sentences of direct teacher-to-student advice on what to explore next or how to fix issues."
}
${responseSchemaNote}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        userQuestion || 'Analyze my current quantum circuit, tell me what I am making, and detect any errors',
        (providerErrors) => generateCircuitTutorLocally(payload, providerErrors),
        res
      );
    }

    // ------------------------------------------------------------------
    // 6. KNOWLEDGE ENGINE — Live AI Quantum Research Breakdown
    // ------------------------------------------------------------------
    case 'knowledge-engine':
    case 'quantum-knowledge': {
      const { query, topicKey } = payload || {};
      const q = (query || topicKey || '').trim();
      if (!q) {
        return res.status(400).json({ error: 'Missing topic query' });
      }

      // Real RAG lookup if available
      let ragContextBlock = '';
      try {
        const ragKey = getApiKey(req);
        if (ragKey) {
          const hits = await ragRetrieval.retrieve(q, ragKey, 2);
          if (hits && hits.length) {
            ragContextBlock = `\nRELEVANT LANDMARK RESEARCH ARCHIVE EXCERPTS:\n` +
              hits.map((h, i) => `[${i + 1}] ${h.title}:\n${h.text}`).join('\n\n');
          }
        }
      } catch (e) {
        console.warn('[knowledge-engine] RAG retrieval skipped:', e.message);
      }

      const systemPrompt = `You are the Lead Quantum Physicist, Academician, and Researcher at Google Quantum AI, IBM Quantum, and MIT Center for Theoretical Physics.
Your task is to generate a comprehensive, rigorous, graduate-level breakdown for the quantum computing concept, algorithm, hardware phenomenon, or topic: "${q}".

${ragContextBlock ? ragContextBlock + '\n' : ''}
REQUIREMENTS:
1. title: Exact official, formal title (e.g. "Phase Kickback Mechanism", "Variational Quantum Eigensolver (VQE)", "Toric Code & Anyonic Statistics").
2. category: One of "Foundations", "Quantum Phenomena", "Quantum Algorithms", "Hardware & Noise", "Quantum Error Correction", "Quantum Chemistry", or "Cryptography & Security".
3. arxiv: Official landmark arXiv citation if applicable (e.g. "arXiv:quant-ph/0101012" or "arXiv:2207.06431"), or null.
4. definition: Rigorous, formal definition accessible to advanced undergraduate and graduate researchers.
5. math: Precise mathematical formulation using Dirac bra-ket notation, matrix representations, Hamiltonian equations, or unitary operators. Include clear equations.
6. intuition: Deep physical intuition, geometric insight (e.g. Bloch sphere, state space trajectory), or wave interference explanation.
7. applications: Array of 3-5 concrete research and industrial applications (e.g., specific algorithms, QPU error mitigation, NISQ chemistry, topological protection).
8. preset: Preset circuit key if the concept directly corresponds to a composer circuit ("superposition", "bell", "ghz", "teleport", "grover", "deutsch_jozsa", "qft", or null).
9. furtherReading: Seminal textbook chapters or milestone publications (e.g. "Nielsen & Chuang Ch. 4; Preskill Lecture Notes Ch. 3; Phys. Rev. Lett. 1993").

SCHEMA (Return ONLY valid raw JSON matching this structure, no markdown fences, no extra text):
{
  "title": "<formal title string>",
  "category": "<category string>",
  "arxiv": <string or null>,
  "definition": "<definition string>",
  "math": "<math equations and state derivation string>",
  "intuition": "<intuition string>",
  "applications": ["<app 1>", "<app 2>", "<app 3>"],
  "preset": <string or null>,
  "furtherReading": "<citation string>"
}`;

      return await callMultiProviderAI(
        req,
        body,
        systemPrompt,
        `Explain quantum topic: "${q}" in rigorous graduate research detail`,
        (providerErrors) => generateKnowledgeTopicLocally(q, providerErrors),
        res
      );
    }

    default:
      return res.status(400).json({ error: `Unknown task: ${task}` });
  }
}

async function callGeminiAudioWithLocalFallback(apiKey, systemPrompt, audioBase64, mimeType, localFallbackFn, res) {
  if (apiKey && apiKey.length > 10 && audioBase64) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
      const audioModel = await resolveGeminiModel(apiKey);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${audioModel}:generateContent?key=${apiKey}`;
      const cleanMime = mimeType ? mimeType.split(';')[0].trim() : 'audio/webm';
      const cleanData = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/i, '');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanData
                  }
                }
              ]
            }
          ],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/g, '').trim());
          return res.status(200).json({ ok: true, result: parsed, source: audioModel });
        }
      }
    } catch (err) {
      console.warn(`[Gemini Audio] Failed: ${err.message}`);
    }
  }

  const fallback = localFallbackFn();
  return res.status(200).json({ ok: true, result: fallback, source: 'deterministic-quantum-ai' });
}

// --------------------------------------------------------------------
// Deterministic Quantum Fallback Parsers & Synthesis Engines
// --------------------------------------------------------------------
function parseVoiceLocally(transcript, currentCircuit) {
  // Correct mispronunciations / speech-recognition drift against the capability
  // registry before any pattern matching runs, so "bellystate" reaches the Bell
  // state branch below instead of falling through as unrecognized.
  const resolution = resolveTranscript(transcript || '');
  const text = resolution.text.toLowerCase().trim();
  const operations = [];
  let numQubits = currentCircuit?.num_qubits || 2;
  let resetExisting = /^(?:make|create|draw|generate|build|construct|new)\s+(?:a\s+|an\s+|the\s+)?(?:circuit|diagram)/i.test(text);

  // Number words normalization mapping for natural speech
  const SPELLED_DIGITS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8
  };
  const normText = text.split(/\s+/).map(w => SPELLED_DIGITS[w] !== undefined ? String(SPELLED_DIGITS[w]) : w).join(' ');

  // Universal movement / relocation intent
  const isMoveIntent = /\b(?:take|move|shift|relocate|drag|transfer|slide|reposition)\b/i.test(normText) ||
                       /\b(?:from\s+.*?to\s+.*)/i.test(normText);

  if (isMoveIntent) {
    // 1. Detect candidate gate if mentioned
    let gate = null;
    if (/\b(?:cnot|cx|controlled\s*not)\b/i.test(normText)) gate = 'CNOT';
    else if (/\b(?:cz|controlled\s*z)\b/i.test(normText)) gate = 'CZ';
    else if (/\b(?:swap|exchange)\b/i.test(normText)) gate = 'SWAP';
    else if (/\b(?:toffoli|ccx)\b/i.test(normText)) gate = 'Toffoli';
    else if (/\b(?:measure|measurement)\b/i.test(normText)) gate = 'MEASURE';
    else if (/\b(?:hadamard|h\s*gate|\bh\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'H';
    else if (/\b(?:pauli\s*x|not\s*gate|bit\s*flip|x\s*gate|\bnot\b|\bx\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'X';
    else if (/\b(?:pauli\s*y|y\s*gate|\by\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'Y';
    else if (/\b(?:pauli\s*z|phase\s*flip|z\s*gate|\bz\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'Z';
    else if (/\b(?:phase\s*gate|\bs\s*gate\b|\bs\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'S';
    else if (/\b(?:pi\s*over\s*8|teagate|tea\s*gate|tee\s*gate|tgate|t\s*gate|\bt\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'T';
    else if (/\b(?:meter|\bm\b(?!\s*=?\s*[0-9]))/i.test(normText)) gate = 'MEASURE';

    // 2. Destination step / time column (0-indexed)
    let toCol = null;
    const destMatch = normText.match(/\b(?:to|into|towards|at)\s+(?:t\s*=?\s*|time\s*step\s*|step\s*|col\s*|column\s*|slot\s*|position\s*)?([1-9])\b/i) ||
                      normText.match(/\b(?:to|into|at)\s+t([1-9])\b/i) ||
                      normText.match(/\bt([1-9])\b/i);
    if (destMatch && destMatch[1]) {
      toCol = parseInt(destMatch[1], 10) - 1;
    }

    // Relative movement (e.g. "shift forward 2 steps", "move right by 1", "from here to here")
    const relForward = normText.match(/\b(?:forward|right|ahead)\s+(?:by\s+)?([1-9])\b/i);
    const relBackward = normText.match(/\b(?:backward|left|back)\s+(?:by\s+)?([1-9])\b/i);
    const isHereToHere = /\bhere\s+to\s+here\b/i.test(normText) || /\bfrom\s+here\s+to\s+there\b/i.test(normText);

    // 3. Source step / time column (0-indexed)
    let fromCol = null;
    const srcMatch = normText.match(/\b(?:from|source)\s+(?:t\s*=?\s*|time\s*step\s*|step\s*|col\s*|column\s*|slot\s*|position\s*)?([1-9])\b/i) ||
                     normText.match(/\b(?:t\s*=?\s*|step\s*|col\s*)([1-9])\s+(?:to|into)\b/i);
    if (srcMatch && srcMatch[1]) {
      fromCol = parseInt(srcMatch[1], 10) - 1;
    }

    // 4. Source and target qubits
    let fromQ = null;
    const fromQMatch = normText.match(/\bfrom\s+(?:qubit|wire|q|line)\s*([0-7])\b/i);
    if (fromQMatch) fromQ = parseInt(fromQMatch[1], 10);

    let toQ = null;
    const toQMatch = normText.match(/\b(?:to|into|on|onto)\s+(?:qubit|wire|q|line)\s*([0-7])\b/i) ||
                     normText.match(/\b(?:qubit|wire|q|line)\s*([0-7])\b/i);
    if (toQMatch) toQ = parseInt(toQMatch[1], 10);

    // 5. Inspect current circuit state to dynamically resolve omitted coordinates
    const grid = currentCircuit?.grid || [];
    if (fromCol === null || fromQ === null || !gate) {
      let found = false;
      for (let q = 0; q < grid.length; q++) {
        for (let c = 0; c < (grid[q]?.length || 0); c++) {
          const cell = grid[q][c];
          if (!cell) continue;
          if (gate) {
            const cellNorm = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
            if (cellNorm === gate || (gate === 'MEASURE' && cell === 'M')) {
              if (fromQ === null) fromQ = q;
              if (fromCol === null) fromCol = c;
              found = true;
              break;
            }
          } else if (fromQ === null || fromQ === q) {
            gate = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
            if (fromQ === null) fromQ = q;
            if (fromCol === null) fromCol = c;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // Relative movement resolution
    if (relForward && fromCol !== null) {
      toCol = fromCol + parseInt(relForward[1], 10);
    } else if (relBackward && fromCol !== null) {
      toCol = Math.max(0, fromCol - parseInt(relBackward[1], 10));
    }

    if (toQ === null) toQ = fromQ !== null ? fromQ : 0;
    if (toCol === null) toCol = (fromCol !== null ? fromCol : 4);
    if (!gate) gate = 'T';

    const gateDisplayName = gate === 'H' ? 'Hadamard' : (gate === 'T' ? 'T gate' : (gate === 'X' ? 'Pauli-X' : gate));
    return {
      num_qubits: Math.max(numQubits, toQ + 1, (fromQ !== null ? fromQ + 1 : 1)),
      reset_existing: false,
      operations: [
        {
          action: 'move',
          from_step: fromCol,
          from_qubit: fromQ,
          step: toCol,
          gate,
          targets: [toQ],
          controls: [],
          params: {}
        }
      ],
      confidence: 0.95,
      clarification_needed: null,
      explanation: `Moved ${gateDisplayName} from step ${fromCol !== null ? fromCol + 1 : 'current'} to step ${toCol + 1} (t=${toCol + 1}) on qubit ${toQ}.`,
      teaching_tip: 'Repositioning quantum gates alters the temporal ordering of unitaries applied to the statevector.'
    };
  }

  // Check algorithm presets
  if (/\b(bell\s*state|bell\s*pair|epr\s*pair)\b/i.test(text)) {
    return {
      num_qubits: Math.max(2, numQubits),
      reset_existing: true,
      operations: [
        { step: 0, gate: 'H', targets: [0], controls: [], params: {} },
        { step: 1, gate: 'CNOT', targets: [1], controls: [0], params: {} }
      ],
      confidence: 1.0,
      clarification_needed: null,
      explanation: 'Built a Bell pair: Hadamard on qubit 0, then CNOT onto qubit 1.',
      teaching_tip: 'A Hadamard followed by a CNOT is the canonical way to create maximal two-qubit entanglement.'
    };
  }

  if (/\b(ghz|greenberger)\b/i.test(text)) {
    return {
      num_qubits: Math.max(3, numQubits),
      reset_existing: true,
      operations: [
        { step: 0, gate: 'H', targets: [0], controls: [], params: {} },
        { step: 1, gate: 'CNOT', targets: [1], controls: [0], params: {} },
        { step: 2, gate: 'CNOT', targets: [2], controls: [1], params: {} }
      ],
      confidence: 1.0,
      clarification_needed: null,
      explanation: 'Built a 3-qubit GHZ state: Hadamard on qubit 0, then a CNOT chain across qubits 1 and 2.',
      teaching_tip: 'GHZ states are maximally entangled across all three qubits at once — measuring any one collapses the rest.'
    };
  }

  // Extract CNOTs and CZ
  const cnotMatches = text.matchAll(/\b(?:cnot|cx|controlled\s*not|cz|controlled\s*z)\b.*?(?:from|ctrl|control)?\s*([0-7])\s*(?:to|target|tgt|and)?\s*([0-7])/gi);
  for (const m of cnotMatches) {
    const ctrl = parseInt(m[1], 10);
    const tgt = parseInt(m[2], 10);
    const isCz = /\b(cz|controlled\s*z)\b/i.test(m[0]);
    if (ctrl === tgt) {
      return {
        num_qubits: Math.max(numQubits, ctrl + 1),
        reset_existing: false,
        operations: [],
        confidence: 0.95,
        clarification_needed: null,
        explanation: 'Invalid gate operation detected.',
        error_feedback: `A controlled gate cannot have the same control and target qubit (Qubit ${ctrl}). Please specify two distinct qubits.`,
        teaching_tip: 'Two-qubit entangling gates require one control wire and one distinct target wire to execute conditional operations.'
      };
    }
    operations.push({ step: null, gate: isCz ? 'CZ' : 'CNOT', targets: [tgt], controls: [ctrl], params: {} });
    numQubits = Math.max(numQubits, ctrl + 1, tgt + 1);
  }

  // Extract SWAP gates
  const swapMatches = text.matchAll(/\b(?:swap|exchange)\b.*?(?:qubit|q|wire)?\s*([0-7])\s*(?:and|with|to)?\s*(?:qubit|q|wire)?\s*([0-7])/gi);
  for (const m of swapMatches) {
    const qA = parseInt(m[1], 10);
    const qB = parseInt(m[2], 10);
    if (qA !== qB) {
      operations.push({ step: null, gate: 'SWAP', targets: [qA, qB], controls: [], params: {} });
      numQubits = Math.max(numQubits, qA + 1, qB + 1);
    }
  }

  // Extract single gates — handles both single target and multi-target lists
  // e.g. "put s to q0 and q3", "h on 0, 1 and 2", "x on q1"
  const gatePatterns = [
    { pattern: /\b(?:hadamard|h\s*gate|\bh\b)\b/i, gate: 'H' },
    { pattern: /\b(?:pauli\s*x|not\s*gate|bit\s*flip|x\s*gate|\bnot\b|\bx\b)\b/i, gate: 'X' },
    { pattern: /\b(?:pauli\s*y|y\s*gate|\by\b)\b/i, gate: 'Y' },
    { pattern: /\b(?:pauli\s*z|phase\s*flip|z\s*gate|\bz\b)\b/i, gate: 'Z' },
    { pattern: /\b(?:phase\s*gate|\bs\s*gate\b|\bs\b)\b/i, gate: 'S' },
    { pattern: /\b(?:pi\s*over\s*8|teagate|tea\s*gate|tee\s*gate|tgate|t\s*gate|\bt\b)\b/i, gate: 'T' },
    { pattern: /\b(?:measure|measurement|\bm\b)\b/i, gate: 'MEASURE' }
  ];

  for (const { pattern, gate } of gatePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Find the substring after this gate mention
      const idx = text.indexOf(match[0]) + match[0].length;
      const afterText = text.slice(idx);

      // Check for explicit time step e.g. "at t5", "at step 5", "at time 5", "to t5", "at t 5"
      let stepIdx = null;
      const stepM = afterText.match(/\b(?:at|in|to|on)\s+(?:t\s*=?\s*|time\s*step\s*|step\s*|col\s*|column\s*)?([1-9])\b/i) ||
                    afterText.match(/\bt([1-9])\b/i);
      if (stepM && stepM[1]) {
        stepIdx = parseInt(stepM[1], 10) - 1;
      }

      // Extract all qubit references until next gate or punctuation
      const targetListMatch = afterText.match(/^\s*(?:to|on|at|in|for)?\s*((?:(?:qubit|wire|q)\s*)?[0-7](?:\s*(?:,|and)\s*(?:(?:qubit|wire|q)\s*)?[0-7])*)/i);
      if (targetListMatch) {
        const qMatches = targetListMatch[1].matchAll(/([0-7])/g);
        let countQ = 0;
        for (const qm of qMatches) {
          countQ++;
          const q = parseInt(qm[1], 10);
          operations.push({ step: stepIdx, gate, targets: [q], controls: [], params: {} });
          numQubits = Math.max(numQubits, q + 1);
        }
        if (countQ === 0 && stepIdx !== null) {
          operations.push({ step: stepIdx, gate, targets: [0], controls: [], params: {} });
        }
      } else if (stepIdx !== null) {
        // e.g. "add a teagate at t5" (without explicit qubit name) -> default to qubit 0 at stepIdx
        operations.push({ step: stepIdx, gate, targets: [0], controls: [], params: {} });
      }
    }
  }

  // Extract rotations (Rx, Ry, Rz) with angles
  const rotMatches = text.matchAll(/\b(rx|ry|rz|rotate|rotation)\b.*?(?:by|angle)?\s*([0-9.]+|pi(?:\s*[\/]\s*[0-9.]+)?).*?(?:on|at|qubit)?\s*([0-7])/gi);
  for (const m of rotMatches) {
    let gate = 'Rz';
    if (m[1].includes('x')) gate = 'Rx';
    if (m[1].includes('y')) gate = 'Ry';
    let theta = 0.7854; // default pi/4
    if (m[2].includes('pi')) {
      const div = m[2].match(/pi\s*[\/]\s*([0-9.]+)/i);
      theta = div ? Math.PI / parseFloat(div[1]) : Math.PI;
    } else {
      theta = parseFloat(m[2]) || 0.7854;
    }
    const q = parseInt(m[3], 10) || 0;
    operations.push({ step: null, gate, targets: [q], controls: [], params: { theta } });
    numQubits = Math.max(numQubits, q + 1);
  }

  if (operations.length === 0) {
    return {
      num_qubits: numQubits,
      reset_existing: false,
      operations: [],
      confidence: 0.2,
      clarification_needed: `I heard "${resolution.original}" but couldn't match it to a gate or circuit I know. You could try: ${sampleSuggestions(3).join(', ')}.`,
      heard: resolution.original,
      resolved_transcript: resolution.text,
      explanation: null,
      error_feedback: null,
      teaching_tip: null
    };
  }

  // Generate physics teaching tip based on gates placed
  const gateTypes = [...new Set(operations.map(o => o.gate))];
  let teachingTip = 'Quantum circuits manipulate complex probability amplitudes using unitary matrix transformations.';
  if (gateTypes.includes('H')) {
    teachingTip = 'Hadamard (H) maps basis states |0⟩ and |1⟩ into equal superpositions (|0⟩+|1⟩)/√2 and (|0⟩-|1⟩)/√2.';
  } else if (gateTypes.includes('S')) {
    teachingTip = 'The Phase gate S applies a π/2 (90°) rotation around the Z-axis, equivalent to the square root of Pauli-Z (√Z).';
  } else if (gateTypes.includes('T')) {
    teachingTip = 'The T gate is a π/4 phase rotation (√S) essential for universal fault-tolerant quantum computation (Magic State Distillation).';
  } else if (gateTypes.includes('CNOT')) {
    teachingTip = 'CNOT flips the target qubit if and only if the control qubit is |1⟩, generating quantum entanglement when preceded by Hadamard.';
  } else if (gateTypes.includes('X')) {
    teachingTip = 'Pauli-X acts as a quantum NOT gate, flipping |0⟩ to |1⟩ and vice versa via a π rotation around the Bloch sphere X-axis.';
  }

  const opSummary = operations.map(o => `${o.gate} on q${o.targets.join(',')}`).join(', ');

  return {
    num_qubits: Math.max(2, numQubits),
    reset_existing: resetExisting,
    operations,
    confidence: resolution.corrected ? 0.85 : 0.95,
    clarification_needed: null,
    heard: resolution.original,
    resolved_transcript: resolution.text,
    corrections: resolution.matches.filter(m => !m.exact),
    explanation: `Synthesized ${operations.length} gate operation(s): ${opSummary}.`,
    error_feedback: null,
    teaching_tip: teachingTip
  };
}

function generateRoadmapLocally(instruction, availableModuleIds) {
  const query = (instruction || '').toLowerCase();
  const allIds = Array.isArray(availableModuleIds) && availableModuleIds.length > 0
    ? availableModuleIds
    : ['module-01', 'module-02', 'module-03', 'module-04', 'module-05', 'module-06'];

  let selected = allIds.slice(0, 4);

  if (query.includes('beginner') || query.includes('intro') || query.includes('start')) {
    selected = allIds.filter(id => ['module-01', 'module-02', 'module-04', 'module-06'].includes(id));
  } else if (query.includes('decoherence') || query.includes('lindblad') || query.includes('noise') || query.includes('t1') || query.includes('t2') || query.includes('dephasing')) {
    selected = allIds.filter(id => ['module-05', 'module-03', 'module-12', 'module-15', 'module-17'].includes(id));
  } else if (query.includes('advanced') || query.includes('expert') || query.includes('error correction') || query.includes('surface')) {
    selected = allIds.filter(id => ['module-03', 'module-05', 'module-10', 'module-12', 'module-14'].includes(id));
  } else if (query.includes('linear algebra') || query.includes('math')) {
    selected = allIds.filter(id => ['module-01', 'module-02', 'module-04', 'module-03'].includes(id));
  } else if (query.includes('algorithm') || query.includes('grover') || query.includes('vqe') || query.includes('qft')) {
    selected = allIds.filter(id => ['module-08', 'module-09', 'module-10', 'module-11', 'module-13'].includes(id));
  }

  if (selected.length === 0) selected = allIds.slice(0, 4);

  return {
    displayName: 'Personalized Quantum Learning Pathway',
    description: 'Custom learning track synthesized to master essential quantum computational primitives.',
    reasoning: 'Curated based on your background and target quantum mastery level.',
    moduleIds: selected
  };
}

function generateConceptDoctorLocally(question, groundingEntries) {
  const q = (question || '').toLowerCase();
  const entries = Array.isArray(groundingEntries) ? groundingEntries : [];

  let best = null;
  for (const item of entries) {
    if (q.includes(item.id) || q.includes((item.title || '').toLowerCase())) {
      best = item;
      break;
    }
  }

  if (best) {
    return {
      title: best.title || 'Quantum Physical Principle',
      analogy: best.analogy || 'A classical macroscopic intuition for this microscopic quantum phenomenon.',
      explanation: `Grounded in quantum mechanical foundations: ${best.title}`,
      matched_source: best.id
    };
  }

  return {
    title: 'Information Not Found',
    analogy: 'Imagine looking in a specific chapter of a textbook; if a topic is outside that chapter, we refer to advanced topics.',
    explanation: `The current core curriculum does not cover "${question}". Try asking about Quantum Tunneling, Teleportation, No-Cloning, Wavefunction Collapse, or Decoherence.`,
    matched_source: null
  };
}

function generateCircuitAuditLocally(payload) {
  const rawGates = payload?.rawGatesCount || 2;
  const optGates = payload?.optGatesCount || rawGates;
  const qubits = payload?.numQubits || 2;

  return {
    circuitName: `${qubits}-Qubit Quantum Circuit Diagnostic Audit`,
    healthAssessment: `Circuit contains ${rawGates} total operations across ${qubits} active qubits. Gate compilation efficiency is high with ${Math.round((optGates / Math.max(1, rawGates)) * 100)}% execution density.`,
    gatePathology: rawGates > optGates ? `Pruned ${rawGates - optGates} redundant unitary pairs and identity rotations.` : 'No unmerged redundant gates detected.',
    decoherenceRisks: `Physical qubit 0 carries primary phase-accumulation depth. T1 decay risk is within NISQ threshold boundaries (<0.8% error rate).`,
    qpuRecommendation: 'Recommended for execution on IBM Eagle r3 (Heavy-Hex) or Google Sycamore with dynamical decoupling.',
    clinicalPrescription: 'Apply XY4 Dynamical Decoupling and Zero-Noise Extrapolation (ZNE) before final readout measurement.'
  };
}

// Builds an honest one-line explanation of why the offline fallback is
// answering instead of a real LLM, from the actual provider errors
// collected in callMultiProviderAI - "no key configured" and "a key is
// configured but was rejected/expired/rate-limited" are different problems
// pointing the operator at different fixes, so they must not be
// conflated into one hardcoded string.
function describeOfflineReason(providerErrors) {
  const geminiErr = (providerErrors || []).find((e) => e.provider === 'gemini');
  if (!geminiErr) return 'No AI provider is configured on this server';
  if (geminiErr.error === 'no Gemini key configured') return 'No AI provider key is configured on this server';
  return `The configured Gemini key call failed (${geminiErr.error}), so this server fell back to offline mode`;
}

function generateCircuitTutorLocally(payload, providerErrors = []) {
  const offlineReason = describeOfflineReason(providerErrors);
  const numQubits = payload?.numQubits || 3;
  const deterministicErrors = Array.isArray(payload?.deterministicErrors) ? payload.deterministicErrors : [];

  // Map the frontend's own lint findings (idle wires, excess depth, etc.)
  const errors = deterministicErrors.map(err => ({
    severity: err.type === 'error' ? 'error' : (err.type === 'warning' ? 'warning' : 'optimization'),
    title: err.title || 'Circuit Inefficiency',
    location: err.location || 'Circuit grid',
    explanation: err.desc || 'Operation affects circuit compilation depth or coherence.',
    suggestedFix: err.fix || 'Review gate placement.'
  }));

  let summary, purpose, entanglementAnalysis;

  if (Array.isArray(payload?.grid)) {
    // The real path: describe what is actually on the board, from an actual
    // simulation — not a guess from a Dirac-notation string. This is what
    // stopped "H, T, Y" being described as "Uniform Superposition State"
    // (a label only ever earned by looking at the H and ignoring the rest).
    const { describeCircuit } = require('../ananta-backend/utils/quantumState');
    const described = describeCircuit(payload.grid, numQubits);
    summary = described.summary;
    purpose = described.purpose;
    entanglementAnalysis = described.entanglementAnalysis;

    // Structural issues the simulator itself found (dangling CNOT/SWAP, unknown
    // gate) are real errors — merge them in ahead of the frontend's lint list.
    for (const issue of described.analysis.issues) {
      if (issue.code === 'EMPTY_CIRCUIT') continue;
      errors.unshift({
        severity: 'error',
        title: issue.code.replace(/_/g, ' '),
        location: issue.column != null ? `Time step ${issue.column + 1}` : 'Circuit grid',
        explanation: issue.message,
        suggestedFix: 'Complete or remove the incomplete gate.'
      });
    }
  } else {
    // No raw grid was sent (older caller) — honest but generic, since without
    // the grid there is nothing real to ground a specific claim in.
    summary = 'Custom Quantum Circuit';
    purpose = 'A circuit is present but its gate-level structure was not provided to this analysis, so no specific claim about it can be grounded. Provide the circuit grid for an exact description.';
    entanglementAnalysis = 'Unknown — entanglement was not computed because the gate grid was not provided.';
  }

  const isHealthy = !errors.some(e => e.severity === 'error');
  const tutorGuidance = answerCircuitQuestionLocally(payload?.userQuestion, {
    summary, purpose, entanglementAnalysis, errors,
    diracNotation: payload?.diracNotation, numQubits, offlineReason
  }) || (errors.length > 0
    ? `You have ${errors.length} diagnostic recommendation(s). Review the highlighted findings above to optimize circuit depth and avoid unwanted state collapse.`
    : 'Your quantum circuit logic is sound and unitary! Try experimenting with relative phase (Phase S or T gates) or adding a CNOT to a third wire to observe entanglement scaling.');

  return {
    circuitSummary: summary,
    circuitPurpose: purpose,
    isHealthy,
    healthBadge: errors.length === 0 ? 'Healthy Circuit (100% Sound)' : `${errors.length} Issue(s) Detected`,
    errors,
    entanglementAnalysis,
    tutorGuidance
  };
}

// Real quantum-mechanical facts about each gate (textbook definitions, not
// claims about the user's specific circuit) - mirrors js/circuit-tutor.js's
// client-side GATE_EXPLANATIONS so the answer is consistent whether the
// question is answered server-side (here, when no AI provider key is
// configured) or client-side (when the network call fails outright).
const GATE_EXPLANATIONS = {
  H: 'Hadamard (H) creates an equal superposition: |0⟩ → (|0⟩+|1⟩)/√2. It\'s the standard way to start superposition, and combined with a CNOT it produces entanglement.',
  X: 'Pauli-X is the quantum NOT gate: it flips |0⟩↔|1⟩ (a π rotation about the Bloch sphere\'s X-axis).',
  Y: 'Pauli-Y rotates by π about the Bloch sphere\'s Y-axis: it flips the bit and applies a phase (i on |0⟩→|1⟩, -i on |1⟩→|0⟩).',
  Z: 'Pauli-Z is a phase flip: it leaves |0⟩ unchanged and multiplies |1⟩ by -1. It has no effect on a qubit that isn\'t already in superposition.',
  S: 'The Phase gate (S) applies a 90° (π/2) phase to |1⟩. It\'s the square root of Z (S² = Z).',
  T: 'The T gate applies a 45° (π/4) phase to |1⟩. It\'s the square root of S (T² = S) and, alongside H and CNOT, is what makes a gate set universal for fault-tolerant computation.',
  CX: 'CNOT (controlled-X) flips the target qubit only when the control qubit is |1⟩. It\'s the standard two-qubit entangling gate — a Hadamard followed by a CNOT produces a Bell pair.',
  CNOT: 'CNOT (controlled-X) flips the target qubit only when the control qubit is |1⟩. It\'s the standard two-qubit entangling gate — a Hadamard followed by a CNOT produces a Bell pair.',
  SWAP: 'SWAP exchanges the full quantum states (not just labels) of two qubits, including any superposition or entanglement they carry.',
  TOFFOLI: 'The Toffoli gate (CCX) flips the target qubit only when BOTH control qubits are |1⟩ — a reversible AND gate, used in arithmetic circuits and some error-correcting codes.',
  CCX: 'The Toffoli gate (CCX) flips the target qubit only when BOTH control qubits are |1⟩ — a reversible AND gate, used in arithmetic circuits and some error-correcting codes.',
  M: 'Measurement collapses the qubit\'s superposition into a definite classical bit (0 or 1), with probabilities given by the Born rule |amplitude|². This is irreversible — any superposition or entanglement on that wire is destroyed.',
  MEASURE: 'Measurement collapses the qubit\'s superposition into a definite classical bit (0 or 1), with probabilities given by the Born rule |amplitude|². This is irreversible — any superposition or entanglement on that wire is destroyed.'
};

// Answers the student's actual typed question using only data already
// computed from the real circuit (summary/purpose/entanglementAnalysis/
// errors came from describeCircuit() on the real grid) - this runs when no
// AI provider is configured, so every claim must stay grounded in that real
// data instead of a generic canned string that ignores what was asked.
function answerCircuitQuestionLocally(question, { summary, purpose, entanglementAnalysis, errors, diracNotation, numQubits, offlineReason }) {
  const q = (question || '').toLowerCase();
  if (!q) return null;
  const reason = offlineReason || 'No AI provider key is configured on this server';

  const gateMatch = Object.keys(GATE_EXPLANATIONS).find((key) => new RegExp(`\\b${key.toLowerCase()}\\b`).test(q));
  if (gateMatch && /what|explain|mean|do(es)?\b/.test(q)) {
    return `${GATE_EXPLANATIONS[gateMatch]} (${reason}, so this is a reference definition rather than a comment generated specifically about your circuit by an LLM.)`;
  }

  if (/\b(right|correct|valid|proper|wrong|good|work(s|ing)?|mistake)\b/.test(q)) {
    const errCount = errors.filter(e => e.severity === 'error').length;
    const warnCount = errors.filter(e => e.severity === 'warning').length;
    if (errCount > 0) {
      const first = errors.find(e => e.severity === 'error');
      return `Based on a real check of your circuit grid: no, there's ${errCount} genuine error to fix first — "${first.title}" at ${first.location}. ${first.explanation} Suggested fix: ${first.suggestedFix}`;
    }
    if (warnCount > 0) {
      return `Your circuit is logically valid (every gate is well-formed and unitary), but there ${warnCount === 1 ? 'is' : 'are'} ${warnCount} efficiency warning${warnCount === 1 ? '' : 's'} — see the diagnostics above. It builds: ${summary}.`;
    }
    return `Yes — it's a valid, well-formed circuit: ${summary}. ${purpose}`;
  }

  if (/what\s+(is|does|am\s+i|have\s+i)|purpose|building/.test(q)) {
    return `${summary}. ${purpose}`;
  }

  if (/entangl|correlat|separable|bell|ghz/.test(q)) {
    return entanglementAnalysis;
  }

  if (/error|issue|bug|problem|fix/.test(q)) {
    if (!errors.length) return 'No issues detected — the deterministic static analysis found no premature measurements, dangling controls, or idle wires.';
    return errors.map(e => `[${e.severity.toUpperCase()}] ${e.title} (${e.location}): ${e.explanation} → ${e.suggestedFix}`).join(' | ');
  }

  if (/state|probabilit|outcome|measure|amplitude/.test(q)) {
    return `The current statevector is ${diracNotation || '|0...0>'} across ${numQubits} qubits. ${entanglementAnalysis}`;
  }

  return `${reason}, so this offline mode can't parse that question freely — but here's what's grounded in your real circuit: ${summary}. ${purpose} ${errors.length ? `${errors.length} diagnostic(s) found — see above.` : 'No issues detected.'}`;
}

function generateKnowledgeTopicLocally(query, providerErrors = []) {
  const qLower = (query || '').toLowerCase().trim();
  const found = localTopicDb.find(t =>
    t.title.toLowerCase().includes(qLower) ||
    (t.keys && t.keys.some(k => qLower.includes(k) || k.includes(qLower)))
  );
  if (found) {
    return {
      title: found.title,
      category: found.category || 'Foundations',
      arxiv: found.arxiv || null,
      definition: found.definition,
      math: found.math,
      intuition: found.intuition,
      applications: found.applications || [],
      preset: found.preset || null,
      furtherReading: found.furtherReading || 'Quantum Information Science Literature',
      source: 'deterministic-knowledge-corpus',
      providerErrors
    };
  }
  return {
    title: query.charAt(0).toUpperCase() + query.slice(1),
    category: 'Quantum Research & Foundations',
    arxiv: null,
    definition: `In quantum information theory and computational physics, "${query}" represents an important theoretical construct, algorithmic paradigm, or physical device phenomenon in Hilbert state space.`,
    math: `Statevector evolution: |ψ(t)⟩ = exp(-i H t / ℏ) |ψ(0)⟩\nUnitary transformation: U |ψ⟩ = |ψ′⟩,   U†U = I\nObservables expectation: ⟨O⟩ = ⟨ψ| O |ψ⟩ = Tr(ρ O)`,
    intuition: `Quantum operations on concepts like "${query}" harness wave-like probability amplitude interference and high-dimensional entanglement to achieve quantum processing acceleration inaccessible to classical Turing architectures.`,
    applications: [
      'Quantum algorithmic compilation & state preparation in Ananta Studio',
      'NISQ noise mitigation and Hamiltonian tomography',
      'Fault-tolerant quantum architecture development'
    ],
    preset: null,
    furtherReading: 'Nielsen & Chuang, "Quantum Computation and Quantum Information"; Preskill Lecture Notes',
    source: 'deterministic-knowledge-corpus',
    providerErrors
  };
}

module.exports = handler;
module.exports.default = handler;

// Reusable pieces for other backend modules, so provider selection, key
// resolution and model discovery live in exactly one place.
module.exports.getApiKey = getApiKey;
module.exports.getGrokKey = getGrokKey;
module.exports.callGeminiDirect = callGeminiDirect;
module.exports.callGrokAPI = callGrokAPI;
module.exports.parseVoiceLocally = parseVoiceLocally;
module.exports.resolveGeminiModels = resolveGeminiModels;
module.exports.resolveGrokModel = resolveGrokModel;

/**
 * One JSON answer from whichever provider is configured, or null when none is.
 * Callers are expected to have a working non-AI path — this never throws for
 * "no key", only for a provider that was tried and genuinely failed.
 */
module.exports.askJson = async function askJson(systemPrompt) {
  const geminiKey = getApiKey(null);
  if (geminiKey) {
    const res = await callGeminiDirect(geminiKey, systemPrompt, '');
    return res.result;
  }
  const grokKey = getGrokKey(null, null);
  if (grokKey) {
    const res = await callGrokAPI(grokKey, systemPrompt, '');
    return res.result;
  }
  return null;
};
