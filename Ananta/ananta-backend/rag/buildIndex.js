#!/usr/bin/env node
/**
 * Ananta Quantum Studio - One-Time RAG Index Build
 *
 * Embeds every chunk of the knowledge corpus (see chunkKnowledgeCorpus.js)
 * with real Gemini embeddings and writes the result to
 * ananta-backend/rag/knowledge_index.json. Run this once whenever the
 * corpus changes (or on first setup):
 *
 *   GEMINI_API_KEY=your-real-key node ananta-backend/rag/buildIndex.js
 *
 * The output file is committed to the repo (it's derived, deterministic-ish
 * data, not a secret) so a fresh deploy doesn't need to re-run this unless
 * the corpus changed. ragRetrieval.js reads it at request time and does
 * only the cheap part (embed the one incoming question + cosine similarity
 * over the ~80 precomputed vectors) live.
 */

const fs = require('fs');
const path = require('path');
const { buildChunks } = require('./chunkKnowledgeCorpus');
const { embedBatch, resolveEmbeddingModel } = require('./geminiEmbeddings');

const OUTPUT_PATH = path.join(__dirname, 'knowledge_index.json');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is required. Usage: GEMINI_API_KEY=... node ananta-backend/rag/buildIndex.js');
    process.exit(1);
  }

  const chunks = buildChunks();
  const model = await resolveEmbeddingModel(apiKey);
  console.log(`Embedding ${chunks.length} knowledge-corpus chunks with ${model} (auto-discovered from this key's available models)...`);

  const { vectors, model: usedModel } = await embedBatch(chunks.map((c) => c.text), apiKey, {
    onProgress: (done, total) => process.stdout.write(`\r  ${done}/${total}`)
  });
  process.stdout.write('\n');

  const index = {
    model: usedModel,
    dimensions: vectors[0].length,
    builtAt: new Date().toISOString(),
    chunks: chunks.map((c, i) => ({ ...c, embedding: vectors[i] }))
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  console.log(`Wrote ${OUTPUT_PATH} (${chunks.length} chunks x ${index.dimensions} dims, ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)} KB)`);
}

main().catch((err) => {
  console.error('Index build failed:', err.message);
  process.exit(1);
});
