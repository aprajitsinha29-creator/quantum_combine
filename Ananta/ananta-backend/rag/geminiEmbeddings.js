/**
 * Ananta Quantum Studio - Real Gemini Embeddings Client
 *
 * Thin wrapper around Google's embedding endpoint. Used both to build the
 * offline knowledge index (buildIndex.js, run once) and at query time to
 * embed the student's actual question (ragRetrieval.js). No embedding is
 * ever fabricated - if there's no GEMINI_API_KEY, callers get a clear
 * error instead of a fake/random vector, since a fake vector would
 * silently corrupt retrieval quality while looking like it works.
 *
 * The embedding model is discovered dynamically (mirroring api/gemini.js's
 * resolveGeminiModels for text generation), not hardcoded: Google
 * deprecated "text-embedding-004" for newer keys in favor of
 * "gemini-embedding-001" mid-way through this project, which a hardcoded
 * model name would have silently broken on again next time it happens.
 * Output dimensionality is whatever the resolved model actually returns
 * (3072 for gemini-embedding-001 at the time this was written) rather than
 * an assumed constant - the index records the true dimension it was built
 * with, and retrieval checks the query embedding matches it.
 */

let cachedEmbedModel = null;

async function resolveEmbeddingModel(apiKey) {
  if (cachedEmbedModel) return cachedEmbedModel;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required to resolve an embedding model');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) throw new Error(`Gemini ListModels HTTP ${res.status}`);
  const data = await res.json();

  const embedCapable = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('embedContent'))
    .map((m) => m.name.replace(/^models\//, ''));

  if (!embedCapable.length) throw new Error('This Gemini key has no models supporting embedContent');

  // Prefer a stable (non-"preview") model when one exists.
  const stable = embedCapable.filter((n) => !n.includes('preview'));
  cachedEmbedModel = (stable[0] || embedCapable[0]);
  return cachedEmbedModel;
}

async function embedText(text, apiKey, modelOverride = null) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is required to generate real embeddings');
  const model = modelOverride || await resolveEmbeddingModel(apiKey);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedding API (${model}) HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Unexpected embedding response shape from ${model}`);
  }
  return { values, model };
}

/** Embeds many texts sequentially with a small delay, to stay well under free-tier rate limits. */
async function embedBatch(texts, apiKey, { onProgress, delayMs = 250 } = {}) {
  const model = await resolveEmbeddingModel(apiKey);
  const out = [];
  for (let i = 0; i < texts.length; i++) {
    const { values } = await embedText(texts[i], apiKey, model);
    out.push(values);
    if (onProgress) onProgress(i + 1, texts.length);
    if (delayMs && i < texts.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return { vectors: out, model };
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length} (index was built with a different embedding model than is now configured - rebuild it)`);
  }
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { embedText, embedBatch, cosineSimilarity, resolveEmbeddingModel };
