/**
 * Pure exercise-rule checks for topic-roadmap.js, loaded exactly the way
 * careersBridge.test.js loads browser code (vm context, no DOM). Both
 * quantum-engine.js and topic-roadmap.js go into ONE sandbox so the rules
 * run against real engine output (probs list and qubit-0 entropy) rather
 * than mocked numbers. The 'surface_code' and 'vqe' verification rules must
 * pass or fail on physics, not on gate placement alone — every weak trigger
 * that could fire without real evidence is asserted to fail here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['quantum-engine.js', 'topic-roadmap.js']) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'),
    sandbox,
    { filename: file },
  );
}
const Engine = sandbox.window.QuantumCircuitEngine;
const { checkSurfaceCodeCircuit, checkVqeAnsatzCircuit, modulePassEdge } =
  sandbox.window.AnantaExerciseRules;

/**
 * Run a grid through the real 3-qubit engine and return the exact inputs the
 * roadmap's rules consume: the probabilities array (states formatted '|xxx⟩')
 * and the engine's default entanglement entropy (qubit 0 vs q1+q2 split).
 */
function run(circuit) {
  const engine = new Engine(3);
  engine.runCircuit(circuit);
  return {
    probs: engine.getProbabilities(),
    entropy: engine.getEntanglementEntropy(),
  };
}

function grid(row0, row1, row2) {
  const pad = (row) => [...row, null, null, null, null, null, null].slice(0, 6);
  return [pad(row0), pad(row1), pad(row2)];
}

// --- surface_code: 3-qubit bit-flip repetition code -----------------------

test('surface_code: H + CNOT(0->1) only FAILS (half the code space)', () => {
  const { probs } = run(grid(['H', 'CX_CTRL'], [null, 'CX_TGT'], []));
  assert.equal(probs.some(p => p.probability > 0.25), true);
  assert.equal(checkSurfaceCodeCircuit(
    grid(['H', 'CX_CTRL'], [null, 'CX_TGT'], []), probs, 1), false);
});

test('surface_code: both CNOTs with no H/X on q0 FAILS (no encoder)', () => {
  const circuit = grid(['CX_CTRL', 'CX_CTRL'], [null, 'CX_TGT'], [null, null, 'CX_TGT']);
  const { probs } = run(circuit);
  // The CNOTs from |000> are no-ops, so the state check alone would pass:
  // this case isolates the wiring+encoder requirement.
  assert.equal(checkSurfaceCodeCircuit(circuit, probs, 0), false);
});

test('surface_code: CNOT from q1 as control FAILS (wrong wiring)', () => {
  const circuit = grid(['H', 'CX_TGT', 'CX_CTRL'], [null, 'CX_CTRL'], [null, null, 'CX_TGT']);
  const { probs } = run(circuit);
  // Correct q0->q2 pair exists, but the required q0->q1 pair does not: q1
  // controls q0 instead.
  assert.equal(checkSurfaceCodeCircuit(circuit, probs, 0), false);
});

test('surface_code: H on q0 + both same-column CNOTs PASSES', () => {
  const circuit = grid(['H', 'CX_CTRL', 'CX_CTRL'], [null, 'CX_TGT'], [null, null, 'CX_TGT']);
  const { probs } = run(circuit);
  const mass = probs
    .filter(p => ['000', '111'].includes(p.state.replace(/[|⟩\s]/g, '')))
    .reduce((sum, p) => sum + p.probability, 0);
  assert.ok(mass > 0.99);
  assert.equal(checkSurfaceCodeCircuit(circuit, probs, 1), true);
});

test('surface_code: H after the CNOTs FAILS (wrong gate order)', () => {
  const circuit = grid(['CX_CTRL', 'CX_CTRL', 'H'], [null, 'CX_TGT'], [null, null, 'CX_TGT']);
  const { probs } = run(circuit);
  assert.equal(checkSurfaceCodeCircuit(circuit, probs, 0), false);
});

// --- vqe: H2-style particle-conserving ansatz -----------------------------

test('vqe: H + CNOT FAILS (|00>+|11> is zero-or-two electrons)', () => {
  const circuit = grid(['H', 'CX_CTRL'], [null, 'CX_TGT'], []);
  const { probs, entropy } = run(circuit);
  // Real entanglement, so entropy alone must not be enough.
  assert.equal(entropy > 0.5, true);
  assert.equal(checkVqeAnsatzCircuit(circuit, probs, entropy), false);
});

test('vqe: single X FAILS (one state, no CNOT)', () => {
  const circuit = grid(['X'], [], []);
  const { probs, entropy } = run(circuit);
  assert.equal(checkVqeAnsatzCircuit(circuit, probs, entropy), false);
});

test('vqe: X(q1) + H(q0) + CNOT(0->1) PASSES (|01>+|10> superposition)', () => {
  const circuit = grid(['H', 'CX_CTRL'], ['X', 'CX_TGT'], []);
  const { probs, entropy } = run(circuit);
  // Copy into the host realm: arrays built inside the vm sandbox have a
  // different Array.prototype, which deepStrictEqual rejects.
  const states = JSON.parse(JSON.stringify(probs.filter(p => p.probability > 0.05).map(p => p.state)));
  assert.deepEqual(states, ['|010⟩', '|100⟩']);
  assert.equal(checkVqeAnsatzCircuit(circuit, probs, entropy), true);
});

test('vqe: the old starting preset grid FAILS (product state)', () => {
  const circuit = [
    ['X', 'H', 'CX_CTRL', 'H', null, null],
    [null, 'H', 'CX_TGT', 'S', null, null],
    [null, null, null, null, null, null],
  ];
  const { probs, entropy } = run(circuit);
  assert.equal(entropy <= 0.5, true);
  assert.equal(checkVqeAnsatzCircuit(circuit, probs, entropy), false);
});

// --- module-pass edge trigger ---------------------------------------------

test('edge: a preset that is passing at the first render never dispatches', () => {
  let armed = false;
  let dispatched = 0;
  for (const passed of [true, true, true]) {
    const edge = modulePassEdge(armed, passed);
    if (edge.dispatch) dispatched++;
    armed = edge.armed;
  }
  assert.equal(dispatched, 0);
  assert.equal(armed, false);
});

test('edge: a fail-then-pass sequence dispatches exactly once', () => {
  let armed = false;
  let dispatched = [];
  for (const passed of [false, true]) {
    const edge = modulePassEdge(armed, passed);
    if (edge.dispatch) dispatched.push(passed);
    armed = edge.armed;
  }
  assert.equal(dispatched.length, 1);
  assert.equal(armed, false);
});

test('edge: after a dispatch, a NEW fail re-arms (reset is only preset/module change)', () => {
  let armed = false;
  let dispatched = 0;
  for (const passed of [false, true, false, true]) {
    const edge = modulePassEdge(armed, passed);
    if (edge.dispatch) dispatched++;
    armed = edge.armed;
  }
  // The second fail genuinely showed the learner a failing exercise again, so
  // per the armed-flag spec it re-arms; the idempotent bridge makes the
  // repeated event harmless (localStorage { 'module-10': true } stays true).
  assert.equal(dispatched, 2);
  assert.equal(armed, false);
});
