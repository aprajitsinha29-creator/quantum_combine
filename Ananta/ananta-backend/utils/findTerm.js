/**
 * Finds occurrences of a term in a body of text (case-insensitive,
 * handles common typos, inflections, and plurals) and returns context windows.
 *
 * @param {string} text - full document text
 * @param {string} term - word/phrase to search for
 * @param {number} windowChars - context window size
 */
function findTermOccurrences(text, term, windowChars = 320) {
  if (!text || !term || !term.trim()) return [];

  const rawTerm = term.trim();
  const typoMap = {
    'superpostion': 'superposition',
    'super-position': 'superposition',
    'entaglement': 'entanglement',
    'entagelment': 'entanglement',
    'teleporation': 'teleportation',
    'decoherance': 'decoherence',
    'hadmard': 'hadamard',
    'algorithim': 'algorithm',
    'transmons': 'transmon',
    'cryostats': 'cryostat'
  };

  const normalized = typoMap[rawTerm.toLowerCase()] || rawTerm;
  // If term ends in s, ies, ed, ing, or ions, find stem
  const stem = normalized.replace(/(?:ions?|ings?|eds?|es|s)$/i, '');
  const activePattern = (stem.length >= 3 ? stem : normalized);
  const escaped = activePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. Try flexible whole-word matching with common suffixes
  const regex = new RegExp(`\\b${escaped}(?:s|es|ed|ing|al|ity|ions?|ic)?\\b`, 'gi');
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = Math.max(0, match.index - windowChars);
    const end = Math.min(text.length, match.index + match[0].length + windowChars);
    matches.push({
      matchIndex: match.index,
      matchedWord: match[0],
      context: (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '...' : '')
    });
    if (match.index === regex.lastIndex) regex.lastIndex++;
  }

  // 2. If no matches, fall back to simple substring search
  if (matches.length === 0) {
    const fallbackRegex = new RegExp(escaped, 'gi');
    while ((match = fallbackRegex.exec(text)) !== null) {
      const start = Math.max(0, match.index - windowChars);
      const end = Math.min(text.length, match.index + match[0].length + windowChars);
      matches.push({
        matchIndex: match.index,
        matchedWord: match[0],
        context: (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '...' : '')
      });
      if (match.index === fallbackRegex.lastIndex) fallbackRegex.lastIndex++;
    }
  }

  return matches;
}

module.exports = { findTermOccurrences };
