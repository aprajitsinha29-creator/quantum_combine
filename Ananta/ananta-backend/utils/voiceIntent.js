/**
 * Voice intent resolution: capability registry + algorithmic fuzzy matching.
 *
 * Design rule: mispronunciations and speech-recognition errors are corrected
 * ALGORITHMICALLY (space-collapsed Levenshtein similarity), never by an
 * enumerated list of misspellings. The registry below holds only canonical
 * domain vocabulary — the real names each capability goes by. Adding a new
 * capability here automatically makes it fuzzy-matchable, suggestable, and
 * speakable everywhere, with no other code change.
 *
 * Worked example: "bellystate" -> collapsed "bellystate" vs "bell state"
 * collapsed "bellstate" is edit distance 1 => similarity 0.90 => resolves to
 * "bell state" without anyone having ever written down the typo "bellystate".
 */

const CAPABILITIES = [
  // Each entry lists the real names people say for one capability, longest /
  // most canonical first. Bare surnames and acronyms are included on purpose:
  // people say "make grover", not "make grover search".
  // --- Entanglement & state preparation ---
  { id: 'bell', kind: 'algorithm', terms: ['bell state', 'bell pair', 'epr pair', 'epr state', 'bell'] },
  { id: 'ghz', kind: 'algorithm', terms: ['ghz state', 'ghz', 'greenberger horne zeilinger', 'tripartite entanglement'] },
  { id: 'w-state', kind: 'algorithm', terms: ['w state', 'w superposition'] },

  // --- Protocols ---
  { id: 'teleportation', kind: 'algorithm', terms: ['quantum teleportation', 'teleportation protocol', 'teleportation', 'teleport', 'epr channel'] },
  { id: 'superdense', kind: 'algorithm', terms: ['superdense coding', 'dense coding', 'superdense'] },
  { id: 'entanglement-swap', kind: 'algorithm', terms: ['entanglement swapping', 'swapping protocol'] },

  // --- Canonical algorithms ---
  { id: 'deutsch-jozsa', kind: 'algorithm', terms: ['deutsch jozsa', 'deutsch algorithm', 'deutsch'] },
  { id: 'bernstein-vazirani', kind: 'algorithm', terms: ['bernstein vazirani', 'hidden string', 'bernstein', 'vazirani'] },
  { id: 'simon', kind: 'algorithm', terms: ['simon algorithm', 'period finding', 'simon'] },
  { id: 'grover', kind: 'algorithm', terms: ['grover search', 'grover algorithm', 'quantum search', 'database search', 'grover'] },
  { id: 'qft', kind: 'algorithm', terms: ['quantum fourier transform', 'fourier transform', 'qft', 'iqft', 'inverse qft', 'inverse quantum fourier transform'] },
  { id: 'qpe', kind: 'algorithm', terms: ['phase estimation', 'quantum phase estimation', 'qpe'] },
  { id: 'adder', kind: 'algorithm', terms: ['quantum adder', 'half adder', 'quantum arithmetic', 'adder'] },

  // --- Error correction & diagnostics ---
  // "bit flip" alone is the Pauli-X gate, so the error-correcting code lists the
  // longer forms people actually say for it. Longest-span matching then keeps
  // "bit flip error" resolving to the code rather than to a single X gate.
  { id: 'bit-flip-code', kind: 'algorithm', terms: ['bit flip code', 'repetition code', 'error correction', 'bit flip error correction', 'bit flip error', 'bit flip correction', 'three qubit bit flip code'] },
  { id: 'phase-flip-code', kind: 'algorithm', terms: ['phase flip code', 'phase flip error correction', 'phase flip error', 'phase flip correction'] },
  { id: 'swap-test', kind: 'algorithm', terms: ['swap test', 'state overlap', 'fidelity test'] },
  { id: 'qrng', kind: 'algorithm', terms: ['random number generator', 'quantum random number', 'coin flip', 'qrng'] },
  { id: 'vqe', kind: 'algorithm', terms: ['variational quantum eigensolver', 'vqe ansatz', 'ansatz', 'vqe'] },
  { id: 'chsh', kind: 'algorithm', terms: ['chsh test', 'bell inequality', 'bell test', 'chsh'] },

  // --- Gates (short symbols are matched exactly, never fuzzily) ---
  { id: 'H', kind: 'gate', terms: ['hadamard', 'hadamard gate', 'h'] },
  { id: 'X', kind: 'gate', terms: ['pauli x', 'bit flip', 'not gate', 'x'] },
  { id: 'Y', kind: 'gate', terms: ['pauli y', 'y'] },
  { id: 'Z', kind: 'gate', terms: ['pauli z', 'phase flip', 'z'] },
  { id: 'S', kind: 'gate', terms: ['phase gate', 's gate', 'sea gate', 'see gate', 's'] },
  { id: 'T', kind: 'gate', terms: ['t gate', 'teagate', 'tea gate', 'tee gate', 'tgate', 'pi over eight gate', 't'] },
  { id: 'MEASURE', kind: 'gate', terms: ['measure', 'measurement'] },
  { id: 'CNOT', kind: 'gate', terms: ['cnot', 'controlled not', 'cx'] },
  { id: 'CZ', kind: 'gate', terms: ['controlled z', 'cz'] },
  { id: 'SWAP', kind: 'gate', terms: ['swap gate', 'swap'] },
  { id: 'Toffoli', kind: 'gate', terms: ['toffoli', 'controlled controlled not', 'ccx'] },
  { id: 'Rx', kind: 'gate', terms: ['rx rotation', 'rx'] },
  { id: 'Ry', kind: 'gate', terms: ['ry rotation', 'ry'] },
  { id: 'Rz', kind: 'gate', terms: ['rz rotation', 'rz'] },

  // --- Circuit controls ---
  { id: 'clear', kind: 'control', terms: ['clear circuit', 'reset circuit', 'start over', 'wipe circuit'] },
  { id: 'run', kind: 'control', terms: ['run simulation', 'simulate', 'execute circuit'] },
  { id: 'add-qubit', kind: 'control', terms: ['add qubit', 'new qubit'] },
  { id: 'remove-qubit', kind: 'control', terms: ['remove qubit', 'delete qubit'] }
];

// Terms shorter than this (after collapsing) are only ever matched exactly or by
// transposition, so that short/common words ("on", "to", "h", "state") can never
// be fuzzed into a longer capability name.
const MIN_FUZZY_LEN = 6;
const SIMILARITY_THRESHOLD = 0.78;
const MAX_NGRAM = 4;
// Acronyms below MIN_FUZZY_LEN still get one safe correction: a pure letter
// transposition ("gzh" -> "ghz"), which cannot turn one real word into another.
const MIN_TRANSPOSE_LEN = 3;

function collapse(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function similarity(a, b) {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 0;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Flattened lookup table: every canonical term, with the collapsed form used
 * for comparison. Built once from the registry.
 */
const LOOKUP = CAPABILITIES.flatMap(cap =>
  cap.terms.map(term => ({
    id: cap.id,
    kind: cap.kind,
    term,
    collapsed: collapse(term),
    canonical: cap.terms[0]
  }))
);

/**
 * Finds the best registry term for a spoken phrase, or null.
 * Exact matches always win; otherwise falls back to fuzzy similarity, but only
 * for phrases long enough that fuzzing is safe.
 */
function isTransposition(a, b) {
  if (a.length !== b.length || a.length < MIN_TRANSPOSE_LEN) return false;
  return a.split('').sort().join('') === b.split('').sort().join('');
}

function matchPhrase(phrase) {
  const target = collapse(phrase);
  if (!target) return null;

  let best = null;
  for (const entry of LOOKUP) {
    if (entry.collapsed === target) {
      return { ...entry, score: 1, exact: true };
    }
    if (isTransposition(target, entry.collapsed)) {
      return { ...entry, score: 0.99, exact: false };
    }
    if (target.length < MIN_FUZZY_LEN || entry.collapsed.length < MIN_FUZZY_LEN) continue;

    const score = similarity(target, entry.collapsed);
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { ...entry, score, exact: false };
    }
  }
  return best;
}

/**
 * Rewrites a raw transcript so every recognizable capability appears under its
 * canonical name, correcting mispronunciations and split/merged words.
 * Returns the corrected text plus what was matched, so callers can report
 * honestly instead of guessing.
 */
function resolveTranscript(rawText) {
  const original = (rawText || '').trim();
  const tokens = original.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { text: original, original, matches: [], corrected: false };
  }

  // Find the best non-overlapping set of matches, preferring longer spans and
  // higher similarity.
  const candidates = [];
  for (let start = 0; start < tokens.length; start++) {
    for (let len = Math.min(MAX_NGRAM, tokens.length - start); len >= 1; len--) {
      const phrase = tokens.slice(start, start + len).join(' ');
      const match = matchPhrase(phrase);
      if (match) {
        candidates.push({ start, end: start + len, phrase, match, span: len });
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    return b.span - a.span;
  });

  const claimed = new Array(tokens.length).fill(false);
  const accepted = [];
  for (const cand of candidates) {
    let free = true;
    for (let i = cand.start; i < cand.end; i++) {
      if (claimed[i]) { free = false; break; }
    }
    if (!free) continue;
    for (let i = cand.start; i < cand.end; i++) claimed[i] = true;
    accepted.push(cand);
  }

  accepted.sort((a, b) => a.start - b.start);

  const out = [];
  let cursor = 0;
  const matches = [];
  for (const cand of accepted) {
    for (let i = cursor; i < cand.start; i++) out.push(tokens[i]);
    // Only rewrite what was actually misheard. Text that already names the
    // capability correctly is left exactly as spoken, so downstream matchers
    // and qubit/column heuristics see the user's own words.
    if (cand.match.exact) {
      for (let i = cand.start; i < cand.end; i++) out.push(tokens[i]);
    } else {
      out.push(cand.match.canonical);
    }
    cursor = cand.end;
    matches.push({
      id: cand.match.id,
      kind: cand.match.kind,
      heard: cand.phrase,
      resolvedTo: cand.match.canonical,
      score: Number(cand.match.score.toFixed(3)),
      exact: cand.match.exact
    });
  }
  for (let i = cursor; i < tokens.length; i++) out.push(tokens[i]);

  const text = out.join(' ');
  return {
    text,
    original,
    matches,
    corrected: matches.some(m => !m.exact)
  };
}

/**
 * Example phrases drawn from the registry itself, so user-facing prompts never
 * hardcode a fixed list that can drift from what the app actually supports.
 */
function sampleSuggestions(count = 3) {
  const pool = CAPABILITIES.filter(c => c.kind === 'algorithm');
  const picks = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const cap = pool[Math.floor(Math.random() * pool.length)];
    if (!picks.includes(cap.terms[0])) picks.push(cap.terms[0]);
  }
  return picks.map(term => `make a ${term}`);
}

/** Vocabulary payload for clients so the registry stays defined in one place. */
function getVocabulary() {
  return {
    capabilities: CAPABILITIES.map(c => ({ id: c.id, kind: c.kind, terms: c.terms })),
    minFuzzyLength: MIN_FUZZY_LEN,
    similarityThreshold: SIMILARITY_THRESHOLD,
    maxNgram: MAX_NGRAM
  };
}

module.exports = {
  CAPABILITIES,
  resolveTranscript,
  matchPhrase,
  sampleSuggestions,
  getVocabulary,
  similarity,
  levenshtein
};
