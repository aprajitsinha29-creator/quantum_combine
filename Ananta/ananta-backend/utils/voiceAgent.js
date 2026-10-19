/**
 * Voice agent orchestration.
 *
 * The copilot is no longer a command parser with an LLM bolted on the end. Every
 * utterance arrives here with the live circuit, the recent conversation, and any
 * error the UI caught, and leaves as one structured plan in a single schema:
 *
 *   mode "build"   -> place/move/remove gates
 *   mode "answer"  -> reply to a question (numbers come from real simulation)
 *   mode "explain" -> explain an error or why a circuit behaves as it does
 *   mode "clarify" -> genuinely could not tell; ask, never guess
 *
 * Numerical claims are never left to the model. The circuit is simulated here
 * (utils/quantumState.js) and the measured values are injected into the prompt
 * as ground truth, so "what's the probability of 11?" is answered from an actual
 * statevector. Without an API key the deterministic path answers those same
 * questions exactly, just with plainer prose.
 */

const { analyzeCircuit } = require('./quantumState');
const { resolveTranscript, sampleSuggestions, CAPABILITIES } = require('./voiceIntent');

const HISTORY_TURNS = 6;

/** Spoken digits arrive as words often enough to normalize them numerically. */
const DIGIT_WORDS = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7' };

function fmtPct(p) {
  return `${(p * 100).toFixed(1)}%`;
}

function fmtNum(x, digits = 4) {
  return Number(x.toFixed(digits)).toString();
}

/**
 * Renders the live circuit as compact ground truth for the model. Everything
 * here is measured, not asserted, so the model has no reason to invent figures.
 */
function describeCircuit(analysis) {
  const lines = [
    `qubits: ${analysis.numQubits}`,
    `gates: ${analysis.gateCount}, depth: ${analysis.depth}`,
    `entangled: ${analysis.entangled ? 'yes' : 'no'} (max single-qubit entropy ${fmtNum(analysis.maxSingleQubitEntropy)})`
  ];

  if (analysis.rawGrid && Array.isArray(analysis.rawGrid)) {
    const placed = [];
    for (let q = 0; q < analysis.rawGrid.length; q++) {
      const row = analysis.rawGrid[q] || [];
      for (let c = 0; c < row.length; c++) {
        if (row[c]) {
          placed.push(`q${q} at step ${c} (t=${c + 1}): ${row[c]}`);
        }
      }
    }
    lines.push(`current gates on grid: ${placed.length > 0 ? placed.join(', ') : 'none'}`);
  }

  const probs = analysis.probabilities.slice(0, 8)
    .map(p => `|${p.state}> ${fmtPct(p.probability)}`)
    .join(', ');
  lines.push(`measurement probabilities: ${probs || 'none'}`);

  lines.push('per-qubit reduced state:');
  for (const q of analysis.qubits) {
    lines.push(
      `  q${q.qubit}: P(0)=${fmtPct(q.prob0)} P(1)=${fmtPct(q.prob1)} ` +
      `bloch=(${fmtNum(q.bloch.x, 3)}, ${fmtNum(q.bloch.y, 3)}, ${fmtNum(q.bloch.z, 3)}) ` +
      `entropy=${fmtNum(q.entropy)} purity=${fmtNum(q.purity)}`
    );
  }

  if (analysis.issues.length) {
    lines.push('structural issues detected:');
    for (const issue of analysis.issues) lines.push(`  [${issue.code}] ${issue.message}`);
  }

  return lines.join('\n');
}

function describeHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return '(this is the first turn)';
  return history
    .slice(-HISTORY_TURNS)
    .map(t => `${t.role === 'assistant' ? 'COPILOT' : 'USER'}: ${String(t.text || '').slice(0, 300)}`)
    .join('\n');
}

function describeCapabilities() {
  const byKind = {};
  for (const cap of CAPABILITIES) {
    (byKind[cap.kind] = byKind[cap.kind] || []).push(cap.terms[0]);
  }
  return Object.entries(byKind)
    .map(([kind, names]) => `${kind}: ${names.join(', ')}`)
    .join('\n');
}

/**
 * The single prompt driving every mode. Built fresh per turn so it always
 * carries the current circuit, the recent conversation and the live capability
 * registry — nothing about the domain is frozen into this string.
 */
function buildSystemPrompt({ transcript, resolution, analysis, history, errorContext }) {
  return `You are the voice copilot for "Ananta Quantum Studio", a browser quantum circuit composer. You are a patient teacher as much as a circuit builder: the user is speaking out loud, often while learning.

SPEECH IS IMPERFECT
- This text came from a microphone. Words get garbled, split, or merged ("bellystate" = "bell state", "had a mard" = "hadamard", "grovers" = "grover").
- Interpret phonetically and charitably; infer the closest quantum term the user plausibly meant.
- Only choose mode "clarify" when intent is genuinely unrecoverable, never merely because a word was misspelled.
${resolution.corrected ? `- A phonetic pre-pass already read this as: "${resolution.text}". Treat that as a strong hint.\n` : ''}
WHAT THIS APP CAN BUILD
${describeCapabilities()}

LIVE CIRCUIT (measured just now — treat every number here as ground truth)
${describeCircuit(analysis)}

RECENT CONVERSATION (resolve follow-ups like "do that again", "undo it", "why?", "the same on qubit 1" against this)
${describeHistory(history)}
${errorContext ? `\nERROR THE USER IS ASKING ABOUT\n${String(errorContext).slice(0, 1200)}\n` : ''}
CHOOSING A MODE
- "build": they want gates placed, moved or removed, or a named algorithm constructed.
- "answer": they asked a question — conceptual ("what is entanglement?") or numerical ("what's the probability of 11?", "is qubit 0 entangled?").
- "explain": they are asking why something failed, what an error means, or why the circuit behaves as it does.
- "clarify": you genuinely cannot tell what they want.

NUMBERS ARE NOT YOURS TO INVENT
- For anything numerical, quote the LIVE CIRCUIT block above. Never estimate, round loosely, or make up a value.
- If a number they ask for is not in that block and cannot be derived from it, say so plainly instead of guessing.

BUILDING & MOVING RULES
- One operation per qubit for single-qubit gates: "S on q0 and q3" is TWO operations, targets [0] and [3].
- Multi-qubit gates (CNOT, CZ, SWAP, Toffoli) use controls + targets together in ONE operation.
- A controlled gate cannot share control and target; if asked, set error_feedback and explain why.
- step is a 0-indexed column; null means "next free slot". reset_existing is true only when they ask for a NEW circuit.
- MOVING/RELOCATING: The user can speak naturally in any phrasing to move, shift, reposition, slide, or rearrange any gate or circuit item from anywhere to anywhere (e.g. "move t to t 5", "shift H forward two steps", "take the gate on wire 0 to wire 1", "slide CNOT to step 4", "move it over there").
  * Use mode: "build", action: "move".
  * Identify what gate or item to move (e.g. gate "T", "H", "CNOT", etc.).
  * Use "from_step" (0-indexed source column) and "from_qubit" (source qubit). If not explicitly spoken, infer from the "current gates on grid" section above.
  * Use "step" (0-indexed destination column, e.g. "t 5" or "step 5" is step 4) and "targets": [<destination qubit>].
  * If the user asks to move an item that is not yet placed on the circuit, set action "place" to create it at the desired step and wire so the user gets what they asked for.
- For whole-circuit actions use "control" instead of operations: "clear" (wipe the circuit), "run" (execute the simulation), "add-qubit", "remove-qubit". Leave it null otherwise.
- To build a named algorithm, set "algorithm" to its id and leave operations empty — the app has a correct, tested builder for each. Only emit raw operations for gate-level requests the ids do not cover. Valid ids: ${CAPABILITIES.filter(c => c.kind === 'algorithm').map(c => c.id).join(', ')}.
- Carry any width or direction they asked for in "params": "a 5 qubit QFT" is params.qubits = 5, "the inverse QFT" is params.inverse = true. Do not drop these; the builder honours them.
- "bit flip" on its own is the Pauli-X gate, but "bit flip code" / "bit flip error correction" is the bit-flip-code algorithm. Read which one they meant from context.

VOICE STYLE
- spoken_response is read aloud: one or two plain sentences, no markdown, no symbols like |0>, say "ket zero" instead.
- display_text may be richer and may include notation and exact figures.

Return ONLY this JSON object, no markdown fences:
{
  "mode": "build" | "answer" | "explain" | "clarify",
  "control": <null | "clear" | "run" | "add-qubit" | "remove-qubit">,
  "algorithm": <null | one of the algorithm ids listed above>,
  "params": { "qubits": <int|null, only if they asked for a specific width>, "inverse": <bool, true for inverse/IQFT/adjoint requests> },
  "num_qubits": <int, minimum wires needed>,
  "reset_existing": <bool>,
  "operations": [
    { "action": "place" | "move" | "remove", "gate": "<H|X|Y|Z|S|T|CNOT|CZ|SWAP|Toffoli|Rx|Ry|Rz|MEASURE>",
      "targets": [<int>], "controls": [<int>], "step": <int|null>, "from_step": <int|null>, "from_qubit": <int|null>,
      "params": { "theta": <float> } }
  ],
  "spoken_response": "<what to say aloud>",
  "display_text": "<richer text for the panel>",
  "teaching_tip": "<one physics insight relevant to this turn, or null>",
  "error_feedback": <null | "what is wrong and why">,
  "clarification_needed": <null | "the question to ask back">,
  "confidence": <float 0-1>
}

USER SAID: "${transcript}"`;
}

// ---------------------------------------------------------------------------
// Deterministic tier — used when no AI provider is configured.
// It still answers numerical questions exactly, because those come from the
// simulator rather than from any language model.
// ---------------------------------------------------------------------------

/**
 * Pulls the knobs an algorithm request carries. Without this a request's
 * numbers were parsed for matching and then discarded, so "make a 5 qubit QFT"
 * and "make an inverse QFT" both built the same default forward 3-qubit
 * circuit — the spoken detail was silently ignored.
 */
const SPELLED_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8
};

function extractAlgorithmParams(text) {
  const lower = String(text || '').toLowerCase();

  let qubits = null;
  const digitMatch = lower.match(/\b(\d+)\s*-?\s*qubits?\b/);
  if (digitMatch) {
    qubits = parseInt(digitMatch[1], 10);
  } else {
    const wordMatch = lower.match(/\b(one|two|three|four|five|six|seven|eight)\s*-?\s*qubits?\b/);
    if (wordMatch) qubits = SPELLED_NUMBERS[wordMatch[1]];
  }
  if (qubits != null) qubits = Math.min(8, Math.max(1, qubits));

  const inverse = /\b(inverse|inverted|iqft|adjoint|dagger|reversed?)\b/.test(lower);

  return { qubits, inverse };
}

const QUESTION_RE = /\b(what|why|how|which|is|are|does|do|can|explain|tell me)\b/i;
const ERROR_RE = /\b(error|failed|failing|broken|wrong|bug|crash|exception|not working)\b/i;
const BUILD_VERB_RE = /\b(make|create|build|construct|draw|generate|add|place|put|insert|apply|wire|load|show me|give me|move|shift|relocate|drag|transfer|slide|swap|adjust|rearrange|take)\b/i;

/**
 * A build verb wins over question words, so "can you make QFT", "can you move t to t 5",
 * and "show me a bell state" are requests to build/manipulate, not questions to answer.
 */
function classifyIntent(text, hasCapability = false) {
  if (BUILD_VERB_RE.test(text)) return 'build';
  if (ERROR_RE.test(text)) return 'explain';
  if (QUESTION_RE.test(text) || text.trim().endsWith('?')) return 'answer';
  return 'build';
}

function normalizeDigitWords(text) {
  return text.split(/\s+/).map(w => DIGIT_WORDS[w.toLowerCase()] ?? w).join(' ');
}

/**
 * Pulls a basis state like "11", "|01>", or "one one" out of a question.
 * Returns { bits } on success, or { mismatch } when the user clearly named a
 * bitstring but of the wrong width — worth saying out loud rather than
 * silently answering a different question.
 */
function extractBasisState(text, numQubits) {
  const norm = normalizeDigitWords(text);
  const candidates = [];

  const ket = norm.match(/\|\s*([01\s]+?)\s*(?:>|⟩)/);
  if (ket) candidates.push(ket[1].replace(/\s+/g, ''));

  for (const token of norm.split(/\s+/)) {
    const bits = token.replace(/[^01]/g, '');
    if (bits.length > 0 && /^[01]+$/.test(bits) && bits.length === token.length) candidates.push(bits);
  }

  // "one one" style: consecutive single digits read out as separate words
  const singles = norm.split(/\s+/).filter(t => /^[01]$/.test(t));
  if (singles.length > 1) candidates.push(singles.join(''));

  const exact = candidates.find(c => c.length === numQubits);
  if (exact) return { bits: exact };

  // Report the fullest thing they said, not the first stray digit.
  const near = candidates.filter(c => c.length > 0).sort((a, b) => b.length - a.length)[0];
  return near ? { mismatch: near } : null;
}

function extractQubitIndex(text) {
  const m = normalizeDigitWords(text).match(/\b(?:qubit|wire|q)\s*([0-7])\b/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Answers from the simulated state. Returns null when the question isn't one
 * the numbers can settle, so the caller can fall through to clarification
 * rather than bluffing.
 */
function answerNumerically(text, analysis) {
  const lower = text.toLowerCase();

  if (/\b(gate|gates)\b/.test(lower) && /\b(how many|count|number)\b/.test(lower)) {
    return {
      spoken: `This circuit has ${analysis.gateCount} gates across a depth of ${analysis.depth}.`,
      display: `Gate count: ${analysis.gateCount} · Circuit depth: ${analysis.depth} · Qubits: ${analysis.numQubits}`
    };
  }

  if (/\b(how many|number of)\b/.test(lower) && /\bqubits?\b/.test(lower)) {
    return {
      spoken: `The register has ${analysis.numQubits} qubits.`,
      display: `Register width: ${analysis.numQubits} qubits (${1 << analysis.numQubits} basis states).`
    };
  }

  if (/\b(entangle|entangled|entanglement)\b/.test(lower)) {
    const q = extractQubitIndex(lower);
    if (q !== null && analysis.qubits[q]) {
      const qi = analysis.qubits[q];
      return {
        spoken: qi.entropy > 1e-6
          ? `Qubit ${q} is entangled, with an entropy of ${fmtNum(qi.entropy, 3)}.`
          : `Qubit ${q} is not entangled — it is in a pure state on its own.`,
        display: `q${q}: von Neumann entropy = ${fmtNum(qi.entropy)}, purity = ${fmtNum(qi.purity)}.`
      };
    }
    return {
      spoken: analysis.entangled
        ? `Yes, the register is entangled. The largest single-qubit entropy is ${fmtNum(analysis.maxSingleQubitEntropy, 3)}.`
        : 'No, this register is currently separable — no entanglement.',
      display: `Entangled: ${analysis.entangled ? 'yes' : 'no'} · max single-qubit entropy = ${fmtNum(analysis.maxSingleQubitEntropy)}`
    };
  }

  if (/\b(probability|chance|odds|likely|likelihood)\b/.test(lower)) {
    const basis = extractBasisState(lower, analysis.numQubits);
    if (basis && basis.bits) {
      const hit = analysis.allProbabilities.find(p => p.state === basis.bits);
      const p = hit ? hit.probability : 0;
      return {
        spoken: `The probability of measuring ${basis.bits.split('').join(' ')} is ${fmtPct(p)}.`,
        display: `P(|${basis.bits}>) = ${fmtNum(p, 6)}  (${fmtPct(p)})`
      };
    }
    if (basis && basis.mismatch) {
      return {
        spoken: `You asked about ${basis.mismatch.split('').join(' ')}, but this register has ${analysis.numQubits} qubits, so outcomes need ${analysis.numQubits} bits.`,
        display: `"${basis.mismatch}" is ${basis.mismatch.length} bit${basis.mismatch.length === 1 ? '' : 's'}, but the register is ${analysis.numQubits} qubits wide. Valid outcomes look like |${'0'.repeat(analysis.numQubits)}>.`
      };
    }
    const top = analysis.probabilities.slice(0, 4)
      .map(p => `|${p.state}> ${fmtPct(p.probability)}`).join(', ');
    return {
      spoken: analysis.probabilities.length
        ? `The most likely outcome is ${analysis.probabilities[0].state.split('').join(' ')} at ${fmtPct(analysis.probabilities[0].probability)}.`
        : 'There are no outcomes to report yet.',
      display: `Measurement distribution: ${top}`
    };
  }

  if (/\b(amplitude|phase)\b/.test(lower)) {
    const basis = extractBasisState(lower, analysis.numQubits);
    const hit = (basis && basis.bits)
      ? analysis.allProbabilities.find(p => p.state === basis.bits)
      : analysis.probabilities[0];
    if (hit) {
      const { re, im } = hit.amplitude;
      const mag = Math.sqrt(re * re + im * im);
      const phase = Math.atan2(im, re);
      return {
        spoken: `The amplitude of ${hit.state.split('').join(' ')} has magnitude ${fmtNum(mag, 3)} and phase ${fmtNum(phase, 3)} radians.`,
        display: `⟨${hit.state}|ψ⟩ = ${fmtNum(re)} ${im >= 0 ? '+' : '-'} ${fmtNum(Math.abs(im))}i  ·  |amp| = ${fmtNum(mag)}, arg = ${fmtNum(phase)} rad`
      };
    }
  }

  if (/\b(bloch|vector|coordinates)\b/.test(lower)) {
    const q = extractQubitIndex(lower) ?? 0;
    const qi = analysis.qubits[q];
    if (qi) {
      return {
        spoken: `Qubit ${q} sits at x ${fmtNum(qi.bloch.x, 2)}, y ${fmtNum(qi.bloch.y, 2)}, z ${fmtNum(qi.bloch.z, 2)} on the Bloch sphere.`,
        display: `q${q} Bloch vector = (${fmtNum(qi.bloch.x)}, ${fmtNum(qi.bloch.y)}, ${fmtNum(qi.bloch.z)}), purity ${fmtNum(qi.purity)}`
      };
    }
  }

  if (/\b(state|statevector|superposition|outcome|result)\b/.test(lower)) {
    const top = analysis.probabilities.slice(0, 6)
      .map(p => `|${p.state}> ${fmtPct(p.probability)}`).join(', ');
    return {
      spoken: analysis.probabilities.length === 1
        ? `The register is in a single definite state, ${analysis.probabilities[0].state.split('').join(' ')}.`
        : `The register is in a superposition of ${analysis.probabilities.length} states.`,
      display: `Statevector support: ${top}`
    };
  }

  return null;
}

/** Explains whatever is actually wrong, from simulation, not from guesswork. */
function explainDeterministically(analysis, errorContext) {
  if (errorContext) {
    return {
      mode: 'explain',
      spoken_response: 'I can see the error text, but I need the AI engine configured to interpret it properly.',
      display_text: `Reported error:\n${String(errorContext).slice(0, 600)}\n\nSet GEMINI_API_KEY on the server for a full explanation.`,
      teaching_tip: null
    };
  }

  if (analysis.issues.length) {
    const issue = analysis.issues[0];
    return {
      mode: 'explain',
      spoken_response: issue.message,
      display_text: analysis.issues.map(i => `[${i.code}] ${i.message}`).join('\n'),
      teaching_tip: issue.code === 'DANGLING_CNOT'
        ? 'A controlled gate needs both wires: the control decides, the target flips.'
        : null
    };
  }

  return {
    mode: 'explain',
    spoken_response: `I could not find anything wrong. The circuit has ${analysis.gateCount} gates and is ${analysis.entangled ? 'entangled' : 'separable'}.`,
    display_text: describeCircuit(analysis),
    teaching_tip: null
  };
}

/**
 * Full deterministic turn. Build requests are handed back to the caller's
 * existing parser; questions and errors are served from the simulator here.
 */
function respondDeterministically({ transcript, resolution, analysis, errorContext }) {
  const text = resolution.text || transcript || '';

  // Circuit controls come straight from the capability registry, so "clear the
  // circuit", "wipe circuit", "start over" all resolve without extra patterns.
  const control = !errorContext && resolution.matches.find(m => m.kind === 'control');
  if (control) {
    const spoken = {
      clear: 'Circuit cleared. What shall we build?',
      run: 'Running the simulation now.',
      'add-qubit': 'Added a qubit to the register.',
      'remove-qubit': 'Removed a qubit from the register.'
    }[control.id];

    return {
      mode: 'build',
      control: control.id,
      num_qubits: analysis.numQubits,
      reset_existing: false,
      operations: [],
      spoken_response: spoken || 'Done.',
      display_text: spoken || 'Done.',
      teaching_tip: null,
      error_feedback: null,
      clarification_needed: null,
      confidence: 0.95
    };
  }

  // Every algorithm in the registry is buildable, because the client owns a
  // builder for each capability id. Returning the id (rather than trying to
  // emit raw gates here) means adding a capability to the registry makes it
  // speakable without touching this file.
  const algorithm = !errorContext && resolution.matches.find(m => m.kind === 'algorithm');
  const intent = errorContext ? 'explain' : classifyIntent(text, !!algorithm);

  if (intent === 'build' && algorithm) {
    // The raw utterance carries the knobs; resolution.text may have rewritten
    // "iqft" to its canonical name, so read parameters from what was actually said.
    const params = extractAlgorithmParams(`${resolution.original} ${resolution.text}`);
    return {
      mode: 'build',
      algorithm: algorithm.id,
      params,
      num_qubits: params.qubits || analysis.numQubits,
      reset_existing: true,
      operations: [],
      spoken_response: `Building the ${algorithm.resolvedTo}.`,
      display_text: `Constructed ${algorithm.resolvedTo}.`,
      teaching_tip: null,
      error_feedback: null,
      clarification_needed: null,
      confidence: algorithm.exact ? 0.95 : algorithm.score
    };
  }

  if (intent === 'explain') {
    const r = explainDeterministically(analysis, errorContext);
    return { ...r, num_qubits: analysis.numQubits, reset_existing: false, operations: [], error_feedback: null, clarification_needed: null, confidence: 0.8 };
  }

  if (intent === 'answer') {
    const numeric = answerNumerically(text, analysis);
    if (numeric) {
      return {
        mode: 'answer',
        num_qubits: analysis.numQubits,
        reset_existing: false,
        operations: [],
        spoken_response: numeric.spoken,
        display_text: numeric.display,
        teaching_tip: null,
        error_feedback: null,
        clarification_needed: null,
        confidence: 0.95
      };
    }
    return {
      mode: 'clarify',
      num_qubits: analysis.numQubits,
      reset_existing: false,
      operations: [],
      spoken_response: 'I can answer questions about this circuit’s numbers, but that one needs the AI engine turned on.',
      display_text: `I can answer measurement probabilities, amplitudes, entropy, Bloch vectors, gate counts and entanglement directly from the simulated state. For open-ended questions, set GEMINI_API_KEY on the server.\n\nYou could also try: ${sampleSuggestions(3).join(', ')}.`,
      teaching_tip: null,
      error_feedback: null,
      clarification_needed: 'Could you rephrase that as a question about the circuit, or ask me to build something?',
      confidence: 0.3
    };
  }

  return null; // build intents fall through to the caller's circuit parser
}

/** One call site for the whole turn: resolve speech, simulate, prepare context. */
function prepareTurn({ transcript, circuit, history, errorContext }) {
  const resolution = resolveTranscript(transcript || '');
  const analysis = analyzeCircuit(circuit && circuit.grid, circuit && circuit.num_qubits);
  if (circuit && circuit.grid) {
    analysis.rawGrid = circuit.grid;
  }
  return {
    resolution,
    analysis,
    systemPrompt: buildSystemPrompt({ transcript, resolution, analysis, history, errorContext }),
    deterministic: () => respondDeterministically({ transcript, resolution, analysis, errorContext })
  };
}

module.exports = {
  prepareTurn,
  buildSystemPrompt,
  respondDeterministically,
  answerNumerically,
  classifyIntent,
  describeCircuit,
  extractBasisState,
  HISTORY_TURNS
};
