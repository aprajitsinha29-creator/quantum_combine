/**
 * Generative learning roadmaps.
 *
 * The previous roadmap could only reorder a fixed set of eighteen authored
 * modules: the model was handed `availableModuleIds` and had to answer with ids
 * drawn from that list, so every request — whatever it asked for — came back as
 * a permutation of the same eighteen cards. Anything the curriculum did not
 * already cover was simply unreachable.
 *
 * Here the model writes the roadmap itself: any subject, any depth, any time
 * budget. The authored catalogue is still passed in, but only as material the
 * model may reuse — when a generated step genuinely matches an existing module
 * it cites that module's id so the UI can open the real lesson, and otherwise
 * the step stands on its own.
 */

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const cache = new Map();

const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Master'];

function cacheKey(goal) {
  return String(goal || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}

/** Compact view of the authored curriculum, for reuse rather than constraint. */
function describeCatalog(catalog) {
  if (!Array.isArray(catalog) || !catalog.length) return '(no authored modules available)';
  return catalog
    .map(m => `${m.id} | ${m.title} | ${m.level} | ${m.timeEst || 'n/a'} | ${(m.summary || '').slice(0, 110)}`)
    .join('\n');
}

function buildPrompt(goal, catalog) {
  return `You design personalised quantum-computing learning roadmaps for "Ananta Quantum Studio".

THE LEARNER ASKED FOR:
"${goal}"

Write a roadmap that answers exactly that request. Take seriously whatever they
specified — subject, starting level, time budget, end goal, career intent — and
shape the path around it. If they asked for something outside quantum computing,
still answer for the quantum-adjacent reading of it, or say so in the summary.

AUTHORED MODULES ALREADY IN THE APP (id | title | level | time | summary):
${describeCatalog(catalog)}

HOW TO USE THAT LIST
- It is a library you may draw on, NOT a menu you must pick from.
- When a step you want to teach is genuinely covered by one of those modules,
  set "moduleId" to its id so the learner can open the real lesson.
- When it is not covered, invent the step and leave "moduleId" null. Most
  roadmaps for specific or advanced subjects will be mostly invented steps, and
  that is correct — do not pad a path with loosely related modules just to reuse
  them.

RULES
- Order steps so each one's prerequisites are already covered by earlier steps.
- Between 4 and 9 steps. Prefer fewer, deeper steps over many shallow ones.
- "timeEst" must be a realistic span like "20 mins", "1 hour", "3 hours".
- If the learner gave a total time budget, make the step times roughly add up to it.
- "mathFormula" is a single short expression in plain Unicode (for example
  "|ψ⟩ = α|0⟩ + β|1⟩" or "S = -Tr(ρ log ρ)"). Use "" when a step is not mathematical.
- "intuition" is one or two sentences of physical insight, not a restatement of the summary.
- "researchTopic" is 2-5 words naming what to search the literature for on this
  step, or "" if reading papers would not help.
- Never invent citations, paper titles, authors or DOIs. Leave that to search.

Return ONLY this JSON:
{
  "displayName": "<short title for this roadmap>",
  "description": "<2 sentences: what this path covers and who it suits>",
  "detectedLevel": "Beginner" | "Intermediate" | "Advanced" | "Master",
  "levelRationale": "<1 sentence on why you pitched it at that level>",
  "steps": [
    {
      "title": "<step title>",
      "summary": "<2-3 sentences on what they learn and why it comes here>",
      "level": "Beginner" | "Intermediate" | "Advanced" | "Master",
      "timeEst": "<e.g. 30 mins>",
      "mathFormula": "<short expression or empty string>",
      "intuition": "<1-2 sentences>",
      "researchTopic": "<search phrase or empty string>",
      "moduleId": "<id from the list above, or null>"
    }
  ]
}`;
}

function coerceLevel(level) {
  const found = VALID_LEVELS.find(l => l.toLowerCase() === String(level || '').trim().toLowerCase());
  return found || 'Intermediate';
}

function inferCircuitPreset(title, summary) {
  const text = `${title || ''} ${summary || ''}`.toLowerCase();
  if (text.includes('decoherence') || text.includes('lindblad') || text.includes('relaxation') || text.includes('dephasing') || text.includes('t1') || text.includes('t2') || text.includes('noise')) {
    return 'decoherence';
  }
  if (text.includes('surface code') || text.includes('stabilizer') || text.includes('syndrome') || text.includes('repetition') || text.includes('error correction') || text.includes('fault-tolerant')) {
    return 'surface_code';
  }
  if (text.includes('teleport')) {
    return 'teleport';
  }
  if (text.includes('grover') || text.includes('search') || text.includes('amplification')) {
    return 'grover';
  }
  if (text.includes('vqe') || text.includes('variational') || text.includes('chemistry') || text.includes('molecular') || text.includes('eigensolver')) {
    return 'vqe';
  }
  if (text.includes('fourier') || text.includes('qft') || text.includes('phase estimation') || text.includes('qpe')) {
    return 'qft';
  }
  if (text.includes('qaoa') || text.includes('max-cut') || text.includes('combinatorial') || text.includes('optimization')) {
    return 'qaoa';
  }
  if (text.includes('machine learning') || text.includes('qml') || text.includes('kernel') || text.includes('feature map')) {
    return 'qml';
  }
  if (text.includes('pulse') || text.includes('drag') || text.includes('microwave') || text.includes('envelope')) {
    return 'pulse_drag';
  }
  if (text.includes('shor') || text.includes('cryptography') || text.includes('pqc') || text.includes('lattice') || text.includes('rsa')) {
    return 'pqc_shor';
  }
  if (text.includes('cryo') || text.includes('dilution') || text.includes('transmon') || text.includes('hardware') || text.includes('fridge')) {
    return 'cryo_transmon';
  }
  if (text.includes('repeater') || text.includes('swapping') || text.includes('internet') || text.includes('network')) {
    return 'entanglement_swapping';
  }
  if (text.includes('density') || text.includes('mixed state') || text.includes('entropy')) {
    return 'density_matrix';
  }
  if (text.includes('pauli') || text.includes('observable') || text.includes('expectation')) {
    return 'pauli_observables';
  }
  if (text.includes('unitary') || text.includes('unitaries') || text.includes('gate evolution')) {
    return 'unitaries';
  }
  if (text.includes('qasm') || text.includes('cirq') || text.includes('ast') || text.includes('compiler')) {
    return 'qasm_circuit';
  }
  if (text.includes('bell') || text.includes('entangle') || text.includes('epr')) {
    return 'bell';
  }
  if (text.includes('hilbert') || text.includes('amplitude')) {
    return 'hilbert_state';
  }
  return 'superposition';
}

function generateExerciseGoal(title, preset) {
  switch (preset) {
    case 'decoherence':
      return 'Prepare excited state |1⟩ using Pauli-X on q[0] to observe energy relaxation (T1) and transverse dephasing (T2) dynamics.';
    case 'surface_code':
      return 'Entangle data qubit q[0] with syndrome check qubits q[1] and q[2] using CNOT gates to construct repetition stabilizer.';
    case 'teleport':
      return 'Construct Bell pair on q[1]-q[2] and Bell measurement on q[0]-q[1] to transfer unknown state amplitudes.';
    case 'grover':
      return 'Observe the Grover diffusion operator amplify the marked basis state in the probability distribution.';
    case 'vqe':
      return 'Inspect the VQE ansatz circuit for Hydrogen H2 and run the variational energy evaluation.';
    case 'qft':
      return 'Trace phase kickback interference on the register to resolve operator eigenvalues with binary precision.';
    case 'qaoa':
      return 'Synthesize parameterized cost unitaries for Max-Cut graph and optimize variational angle parameters.';
    case 'qml':
      return 'Encode data using ZZ-feature maps and inspect separation boundaries in quantum kernel space.';
    case 'pulse_drag':
      return 'Apply π/2 microwave drive rotation on q[0] to calibrate transmon drive envelope parameters.';
    case 'pqc_shor':
      return 'Construct quantum phase estimation stages to compute modular order r for factoring integers.';
    case 'cryo_transmon':
      return 'Simulate thermal ground state initialization and microwave excitation at 15 mK dilution refrigerator temperatures.';
    case 'entanglement_swapping':
      return 'Trace Bell state projection on intermediate nodes to verify non-local entanglement established between end nodes.';
    case 'density_matrix':
      return 'Form an entangled Bell pair with H on q[0] and CNOT(0→1). Tracing out q[1] yields a maximally mixed state on q[0].';
    case 'pauli_observables':
      return 'Apply H and Pauli gates to watch ⟨Z⟩ drop to 0 and ⟨X⟩ rise to +1 on the statevector.';
    case 'unitaries':
      return 'Arm single-qubit unitary gates (H, X, S, T) to observe norm-preserving evolution in Hilbert space.';
    case 'qasm_circuit':
      return 'Synthesize a 2-qubit circuit and inspect the generated Cirq / OpenQASM code export.';
    case 'bell':
      return 'Place an H gate on Qubit 0 followed by a CNOT(0→1) to generate the |Φ⁺⟩ Bell state.';
    case 'hilbert_state':
    default:
      return 'Place a Hadamard (H) gate on Qubit 0. Observe the statevector split into equal superposition |+⟩ with 50% probability on |0⟩ and 50% on |1⟩.';
  }
}

/**
 * Normalises a model step into the exact shape the roadmap UI renders, folding
 * in the authored module when one was cited so the learner keeps the real
 * lesson, its circuit lab and its docs link.
 */
function normalizeStep(step, index, catalogById) {
  const authored = step.moduleId ? catalogById[step.moduleId] : null;
  const circuitPreset = authored?.circuitPreset || step.circuitPreset || inferCircuitPreset(step.title, step.summary);
  const exerciseGoal = authored?.exerciseGoal || step.exerciseGoal || generateExerciseGoal(step.title, circuitPreset);

  return {
    id: authored ? authored.id : `generated-${index + 1}`,
    docId: authored ? authored.docId : null,
    number: `Step ${String(index + 1).padStart(2, '0')}`,
    title: String(step.title || authored?.title || `Step ${index + 1}`).trim(),
    category: authored?.category || 'Generated Pathway',
    level: coerceLevel(step.level || authored?.level),
    timeEst: String(step.timeEst || authored?.timeEst || '30 mins').trim(),
    summary: String(step.summary || authored?.summary || '').trim(),
    mathFormula: String(step.mathFormula ?? authored?.mathFormula ?? '').trim(),
    intuition: String(step.intuition ?? authored?.intuition ?? '').trim(),
    // Papers are attached later by literature search; the model is explicitly
    // told not to invent them, so an authored module's real citation is the
    // only one that can appear here.
    researchPaper: authored?.researchPaper || null,
    researchTopic: String(step.researchTopic || '').trim(),
    circuitPreset,
    exerciseGoal,
    isGenerated: !authored,
    authoredModuleId: authored ? authored.id : null
  };
}

/**
 * Offline fallback: no provider configured, so rank the authored modules by
 * word overlap with the request. Honest but plainly limited — it can only
 * return modules that already exist, which is exactly the constraint the
 * generative path removes.
 */
function fallbackRoadmap(goal, catalog) {
  const words = String(goal || '').toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 3);

  const scored = (catalog || []).map(m => {
    const haystack = `${m.title} ${m.summary} ${m.category}`.toLowerCase();
    const score = words.reduce((sum, w) => sum + (haystack.includes(w) ? 1 : 0), 0);
    return { module: m, score };
  });

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const chosen = (matched.length ? matched.map(s => s.module) : (catalog || []).slice(0, 4));

  // Nothing to fall back to: say so, rather than returning an empty roadmap
  // that the UI would render as a blank result.
  if (!chosen.length) {
    return {
      displayName: `Roadmap: ${goal}`,
      description: 'No roadmap could be built. Writing a path for this request needs an AI provider configured on the server (set GEMINI_API_KEY), and there are no authored modules to fall back to.',
      detectedLevel: 'Beginner',
      levelRationale: '',
      steps: [],
      unavailable: true,
      source: 'unavailable'
    };
  }

  return {
    displayName: `Learning path: ${goal}`,
    description: 'Matched against the built-in curriculum. Configure an AI provider on the server for a roadmap written specifically for this request.',
    detectedLevel: coerceLevel(chosen[0]?.level),
    levelRationale: 'Taken from the first matched module, as no model was available to assess the request.',
    steps: chosen.map((m, i) => ({
      ...m,
      id: m.id,
      number: `Step ${String(i + 1).padStart(2, '0')}`,
      researchTopic: '',
      isGenerated: false,
      authoredModuleId: m.id
    })),
    source: 'curriculum-match'
  };
}

/**
 * Builds a roadmap for any request. `catalog` is the app's authored modules,
 * passed in by the caller so this module holds no curriculum of its own.
 */
async function generateRoadmap({ goal, catalog = [], refresh = false } = {}) {
  const trimmed = String(goal || '').trim();
  if (!trimmed) throw new Error('goal is required');

  const key = cacheKey(trimmed);
  if (!refresh) {
    const cached = readCache(key);
    if (cached) return { ...cached, cached: true };
  }

  const catalogById = {};
  for (const m of catalog) if (m && m.id) catalogById[m.id] = m;

  let result;
  try {
    const { askJson } = require('../../api/gemini');
    const answer = await askJson(buildPrompt(trimmed, catalog));

    if (!answer || !Array.isArray(answer.steps) || !answer.steps.length) {
      throw new Error('model returned no steps');
    }

    result = {
      displayName: String(answer.displayName || `Roadmap: ${trimmed}`).trim(),
      description: String(answer.description || '').trim(),
      detectedLevel: coerceLevel(answer.detectedLevel),
      levelRationale: String(answer.levelRationale || '').trim(),
      steps: answer.steps.slice(0, 9).map((s, i) => normalizeStep(s, i, catalogById)),
      source: 'generated'
    };
  } catch (err) {
    console.warn('[roadmapGenerator] Falling back to curriculum matching:', err.message);
    result = fallbackRoadmap(trimmed, catalog);
  }

  const value = {
    goal: trimmed,
    ...result,
    generatedAt: new Date().toISOString(),
    cached: false
  };

  writeCache(key, value);
  return value;
}

module.exports = { generateRoadmap, fallbackRoadmap, buildPrompt, normalizeStep, inferCircuitPreset, generateExerciseGoal };
