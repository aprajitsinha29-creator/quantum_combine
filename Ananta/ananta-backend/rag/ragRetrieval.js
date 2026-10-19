/**
 * Ananta Quantum Studio - Real RAG Retrieval
 *
 * Loads the precomputed knowledge_index.json (built once by buildIndex.js)
 * into memory, embeds the caller's actual question with the same Gemini
 * embedding model, and returns the top-K most relevant corpus chunks by
 * cosine similarity. This is real semantic retrieval, not keyword matching
 * and not a fabricated "relevant passage" - if the index hasn't been built
 * yet or no API key is available, retrieve() returns an empty array rather
 * than pretending to have found something.
 */

const fs = require('fs');
const path = require('path');
const { embedText, cosineSimilarity } = require('./geminiEmbeddings');

const INDEX_PATH = path.join(__dirname, 'knowledge_index.json');
let cachedIndex = null;
let loadAttempted = false;

function loadIndex() {
  if (loadAttempted) return cachedIndex;
  loadAttempted = true;
  if (!fs.existsSync(INDEX_PATH)) {
    console.warn(`[RAG] ${INDEX_PATH} does not exist yet - run "GEMINI_API_KEY=... node ananta-backend/rag/buildIndex.js" to enable retrieval.`);
    return null;
  }
  try {
    cachedIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    return cachedIndex;
  } catch (e) {
    console.error('[RAG] Failed to parse knowledge_index.json:', e.message);
    return null;
  }
}

function isAvailable() {
  return Boolean(loadIndex());
}

/**
 * Returns the top-K chunks most semantically relevant to `query`, each as
 * { title, text, category, furtherReading, similarity }. Empty array if
 * the index isn't built or embedding the query fails (network error, no
 * key) - callers should treat that as "no extra grounding available", not
 * an error worth surfacing to the student.
 */
async function retrieve(query, apiKey, topK = 3) {
  const index = loadIndex();
  if (!index || !apiKey || !query) return [];

  let queryVec;
  try {
    // Embed with the exact same model the index was built with (recorded
    // in knowledge_index.json), not whatever the resolver would pick fresh
    // right now - those could diverge if Google adds a newer model between
    // index builds, and mismatched dimensions can't be compared.
    const { values } = await embedText(query, apiKey, index.model);
    queryVec = values;
  } catch (e) {
    console.warn('[RAG] Query embedding failed, skipping retrieval:', e.message);
    return [];
  }

  const scored = index.chunks.map((chunk) => ({
    title: chunk.title,
    category: chunk.category,
    text: chunk.text,
    furtherReading: chunk.furtherReading,
    similarity: cosineSimilarity(queryVec, chunk.embedding)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  // A relevance floor: an unrelated question (e.g. "what's the weather")
  // shouldn't drag in the top-3 quantum topics just because they're the
  // least-dissimilar of what's available.
  return scored.filter((s) => s.similarity > 0.55).slice(0, topK);
}

module.exports = { retrieve, isAvailable };
