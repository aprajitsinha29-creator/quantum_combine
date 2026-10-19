/**
 * Self-contained multi-provider text generation.
 *
 * This lives under ananta-backend/utils on purpose: every serverless entry
 * point (api/index.js, api/gemini.js, api/transpiler.js, server.js) can
 * require it directly. summarize.js used to reach across into another
 * function's bundle with require('../../api/gemini.js'), which resolves
 * fine locally but not inside Vercel's per-function bundle - the require
 * threw, the throw was swallowed by a catch, and every AI summary silently
 * downgraded to the offline extractive summarizer. That is why production
 * kept echoing the paper's own abstract back at the user while
 * /api/gemini?task=status happily reported "gemini available".
 *
 * Everything here reports WHY it failed instead of returning quietly.
 */

const GEMINI_LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROK_BASE = 'https://api.x.ai/v1';

// Cached per warm lambda instance. Model ids rot (providers rename and retire
// them), so they are discovered at runtime rather than hardcoded.
const _cache = { geminiModels: null, geminiBest: null, grokModels: null, grokBest: null };

// Successful answers, keyed by prompt hash, so repeated identical requests
// (Live Audit re-running on every gate placement, a user reopening the same
// paper summary) cost zero provider quota.
const responseCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;

function hashPrompt(str) {
  // FNV-1a; only needs to be stable and collision-resistant enough for a
  // per-instance memo, not cryptographic.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + ':' + str.length;
}

function rememberResponse(key, value) {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
  responseCache.set(key, { at: Date.now(), value });
}

function getGeminiKey(req) {
  const env = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (env && env.trim().length > 10) return env.trim();
  const header = req && req.headers && req.headers['x-gemini-key'];
  if (header && header.length > 10) return String(header).trim();
  return '';
}

function getGrokKey(req, body) {
  const env = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
  if (env && env.trim().length > 5) return env.trim();
  const header = req && req.headers && req.headers['x-grok-key'];
  if (header && header.length > 5) return String(header).trim();
  if (body && body.grokKey && String(body.grokKey).length > 5) return String(body.grokKey).trim();
  return '';
}

/** Prefers fast "flash"/"mini" tiers, then the newest version number. */
function rankModel(name, preferred) {
  const n = name.toLowerCase();
  let score = 0;
  for (const token of preferred) if (n.includes(token)) score += 100;
  const version = n.match(/(\d+(?:\.\d+)?)/);
  if (version) score += parseFloat(version[1]) * 10;
  if (n.includes('preview') || n.includes('exp')) score -= 15;
  if (n.includes('vision') || n.includes('embedding') || n.includes('image') || n.includes('tts') || n.includes('audio')) score -= 500;
  return score;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function listGeminiModels(apiKey, timeoutMs = 10000) {
  if (_cache.geminiModels) return _cache.geminiModels;
  const res = await fetchWithTimeout(`${GEMINI_LIST_URL}?key=${apiKey}`, {}, timeoutMs);
  if (!res.ok) throw new Error(`Gemini ListModels HTTP ${res.status}`);
  const data = await res.json();
  const usable = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
  if (!usable.length) throw new Error('Gemini key exposes no generateContent models');
  usable.sort((a, b) => rankModel(b, ['flash']) - rankModel(a, ['flash']));
  _cache.geminiModels = usable;
  return usable;
}

async function listGrokModels(apiKey, timeoutMs = 10000) {
  if (_cache.grokModels) return _cache.grokModels;
  const res = await fetchWithTimeout(`${GROK_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  }, timeoutMs);
  if (!res.ok) throw new Error(`xAI ListModels HTTP ${res.status}`);
  const data = await res.json();
  const usable = (data.data || []).map((m) => m.id).filter(Boolean);
  if (!usable.length) throw new Error('xAI key exposes no usable models');
  usable.sort((a, b) => rankModel(b, ['grok']) - rankModel(a, ['grok']));
  _cache.grokModels = usable;
  return usable;
}

/**
 * One plain-text (non-JSON) Gemini generation.
 * Returns { text, finishReason }. Throws with the real HTTP status on failure.
 */
async function geminiGenerateOnce(apiKey, model, prompt, maxTokens, temperature, timeoutMs, useThinkingHint = true, json = false) {
  const generationConfig = { temperature, maxOutputTokens: maxTokens };
  if (json) generationConfig.responseMimeType = 'application/json';
  // Newer models burn a large hidden "thinking" allowance out of the same
  // maxOutputTokens budget before writing a single visible character, which
  // truncates answers mid-sentence. Asking for zero thinking is a hint, not
  // a guarantee - some tiers reject the field outright, hence the retry.
  if (useThinkingHint) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetchWithTimeout(
    `${GEMINI_LIST_URL}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig })
    },
    timeoutMs
  );

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ? ` (${String(err.error.message).slice(0, 160)})` : '';
      if (useThinkingHint && res.status === 400 && /thinking/i.test(detail)) {
        return geminiGenerateOnce(apiKey, model, prompt, maxTokens, temperature, timeoutMs, false, json);
      }
    } catch (e) { /* body was not JSON */ }
    throw new Error(`HTTP ${res.status}${detail}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  return {
    text: (candidate?.content?.parts?.[0]?.text || '').trim(),
    finishReason: candidate?.finishReason || null
  };
}

async function grokGenerateOnce(apiKey, model, prompt, maxTokens, temperature, timeoutMs) {
  const res = await fetchWithTimeout(`${GROK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an elite quantum research scientist. Answer precisely and concisely.' },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
  }, timeoutMs);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { text: (data?.choices?.[0]?.message?.content || '').trim(), finishReason: data?.choices?.[0]?.finish_reason || null };
}

/**
 * Generates plain text from whichever provider is actually reachable.
 *
 * Resolves model ids at runtime and walks the ranked list, because the free
 * tier enforces a small per-model daily request quota: the top-ranked model
 * returning 429 must not take the whole feature offline while six other
 * models on the same key are idle.
 *
 * @returns {Promise<{text: string, provider: string, model: string, attempts: string[]}>}
 * @throws  {Error} with every attempt's real reason joined, never a silent fallback
 */
async function generateText({
  prompt,
  maxTokens = 4096,
  temperature = 0.2,
  req = null,
  body = null,
  timeoutMs = 20000,
  maxModels = 6,
  json = false,
  cacheKey = null
}) {
  if (!prompt || !prompt.trim()) throw new Error('generateText called with an empty prompt');
  const attempts = [];

  // The free tier allows only a couple of dozen requests per model per day.
  // Live Audit re-runs the tutor on every single gate placement, so without
  // this an afternoon of editing one circuit exhausts the quota and every
  // AI feature in the app goes dark. Identical prompts must not cost quota.
  const key = cacheKey || hashPrompt(`${json ? 'J' : 'T'}:${prompt}`);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.value, cached: true, attempts };
  }

  const geminiKey = getGeminiKey(req);
  if (geminiKey) {
    let models = [];
    try {
      models = await listGeminiModels(geminiKey, Math.min(timeoutMs, 10000));
    } catch (listErr) {
      attempts.push(`gemini list: ${listErr.message}`);
    }
    // Whatever answered last time goes first.
    const ordered = _cache.geminiBest
      ? [_cache.geminiBest, ...models.filter((m) => m !== _cache.geminiBest)]
      : models;

    for (const model of ordered.slice(0, maxModels)) {
      // A truncated answer is not an answer; retry the same model once with
      // double the budget before writing it off.
      for (const budget of [maxTokens, maxTokens * 2]) {
        try {
          const out = await geminiGenerateOnce(geminiKey, model, prompt, budget, temperature, timeoutMs, true, json);
          if (out.text && out.finishReason !== 'MAX_TOKENS') {
            _cache.geminiBest = model;
            const value = { text: out.text, provider: 'gemini', model };
            rememberResponse(key, value);
            return { ...value, attempts };
          }
          attempts.push(`gemini/${model}@${budget}: ${out.finishReason === 'MAX_TOKENS' ? 'truncated by thinking budget' : 'empty response'}`);
          if (out.finishReason !== 'MAX_TOKENS') break; // empty twice won't help
        } catch (err) {
          attempts.push(`gemini/${model}: ${err.message}`);
          break; // quota/auth/network - move to the next model
        }
      }
    }
  } else {
    attempts.push('gemini: no API key configured (set GEMINI_API_KEY)');
  }

  const grokKey = getGrokKey(req, body);
  if (grokKey) {
    let models = [];
    try {
      models = await listGrokModels(grokKey, Math.min(timeoutMs, 10000));
    } catch (listErr) {
      attempts.push(`grok list: ${listErr.message}`);
    }
    const ordered = _cache.grokBest
      ? [_cache.grokBest, ...models.filter((m) => m !== _cache.grokBest)]
      : models;
    for (const model of ordered.slice(0, 3)) {
      try {
        const out = await grokGenerateOnce(grokKey, model, prompt, maxTokens, temperature, timeoutMs);
        if (out.text) {
          _cache.grokBest = model;
          const value = { text: out.text, provider: 'grok', model };
          rememberResponse(key, value);
          return { ...value, attempts };
        }
        attempts.push(`grok/${model}: empty response`);
      } catch (err) {
        attempts.push(`grok/${model}: ${err.message}`);
      }
    }
  }

  const error = new Error(attempts.length ? attempts.join(' | ') : 'no AI provider configured');
  error.attempts = attempts;
  throw error;
}

/**
 * Same as generateText but asks for (and parses) a JSON object.
 * Tolerates models that wrap JSON in ```json fences despite the mime hint.
 */
async function generateJson(options) {
  const out = await generateText({ ...options, json: true });
  const cleaned = out.text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return { ...out, result: JSON.parse(cleaned) };
  } catch (parseErr) {
    // Salvage the outermost object if the model added prose around it.
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return { ...out, result: JSON.parse(cleaned.slice(first, last + 1)) };
    }
    throw new Error(`${out.model} returned unparseable JSON: ${parseErr.message}`);
  }
}

/** True when at least one provider key is present (not that it works). */
function hasAnyKey(req, body) {
  return Boolean(getGeminiKey(req) || getGrokKey(req, body));
}

module.exports = {
  generateText,
  generateJson,
  hasAnyKey,
  getGeminiKey,
  getGrokKey,
  listGeminiModels,
  listGrokModels,
  rankModel
};
