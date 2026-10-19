/**
 * Ananta Quantum Studio - Knowledge Corpus Chunking
 *
 * Turns js/quantum-knowledge-data.js's 80+ curated topic entries into
 * retrievable text chunks for RAG. One chunk per topic - each entry already
 * has exactly the shape a good RAG chunk needs (title, definition, math,
 * intuition, applications), so no arbitrary text-splitting heuristics are
 * needed here, unlike chunking raw prose would require.
 */

const { QUANTUM_TOPIC_DATABASE } = require('../../js/quantum-knowledge-data.js');

function buildChunks() {
  return QUANTUM_TOPIC_DATABASE.map((topic, idx) => {
    const applications = Array.isArray(topic.applications) ? topic.applications.join('; ') : '';
    const text = [
      `Topic: ${topic.title}`,
      topic.category ? `Category: ${topic.category}` : '',
      topic.definition ? `Definition: ${topic.definition}` : '',
      topic.math ? `Math:\n${topic.math}` : '',
      topic.intuition ? `Intuition: ${topic.intuition}` : '',
      applications ? `Applications: ${applications}` : '',
      topic.furtherReading ? `Further reading: ${topic.furtherReading}` : ''
    ].filter(Boolean).join('\n\n');

    return {
      id: `topic_${idx}_${(topic.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
      title: topic.title,
      category: topic.category,
      keys: topic.keys || [],
      arxiv: topic.arxiv || null,
      furtherReading: topic.furtherReading || null,
      text
    };
  });
}

module.exports = { buildChunks };
