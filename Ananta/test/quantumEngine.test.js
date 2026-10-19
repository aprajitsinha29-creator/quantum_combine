/**
 * quantum-engine.js is a browser global (no module.exports, since it also
 * needs to load via a plain <script> tag) - it's loaded here into a real
 * vm context to test it exactly as the browser would run it. This verifies
 * the computeTotalUnitary() fix from this project's history: it used to be
 * hardcoded to exactly 3 qubits and had no SWAP/Toffoli support, so
 * U_total * |0...0> would silently diverge from the real simulated state
 * for any circuit using those gates or a different register size.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'quantum-engine.js'), 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'quantum-engine.js' });
  return sandbox.QuantumCircuitEngine;
}

function buildGrid(numQubits, cols) {
  const grid = Array.from({ length: numQubits }, () => []);
  for (const col of cols) {
    for (let q = 0; q < numQubits; q++) grid[q].push(col[q] || null);
  }
  return grid;
}

function maxAmplitudeDiff(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    max = Math.max(max, Math.abs(a[i].re - b[i].re), Math.abs(a[i].im - b[i].im));
  }
  return max;
}

function assertUnitaryMatchesSimulation(QuantumCircuitEngine, numQubits, cols, label) {
  const engine = new QuantumCircuitEngine(numQubits);
  engine.setNumQubits(numQubits);
  const grid = buildGrid(numQubits, cols);

  engine.runCircuitUpToCol(grid, -1);
  const simState = engine.state.map((c) => ({ re: c.re, im: c.im }));

  const unitaryResult = engine.computeTotalUnitary(grid, -1);
  const N = 1 << numQubits;
  const uState = Array.from({ length: N }, (_, i) => unitaryResult.matrix[i][0]);

  const diff = maxAmplitudeDiff(simState, uState);
  assert.ok(diff < 1e-6, `${label}: U_total|0...0> should match the real simulated state (max diff ${diff})`);
  assert.ok(unitaryResult.isUnitary, `${label}: computed matrix should itself be unitary`);
}

test('computeTotalUnitary matches simulation for a 2-qubit register with SWAP (no Toffoli possible at 2 qubits)', () => {
  const QuantumCircuitEngine = loadEngine();
  assertUnitaryMatchesSimulation(QuantumCircuitEngine, 2, [
    ['H', null],
    ['SWAP', 'SWAP']
  ], '2-qubit H+SWAP');
});

test('computeTotalUnitary matches simulation for a 4-qubit register with Toffoli + other single-qubit gates in the same column', () => {
  const QuantumCircuitEngine = loadEngine();
  assertUnitaryMatchesSimulation(QuantumCircuitEngine, 4, [
    ['X', 'X', null, 'H'],
    ['CX_CTRL', 'CX_CTRL', 'CX_TGT', 'X']
  ], '4-qubit Toffoli + others');
});

test('computeTotalUnitary matches simulation for a combined 4-qubit circuit: H, Toffoli, SWAP, and single-qubit gates in sequence', () => {
  const QuantumCircuitEngine = loadEngine();
  assertUnitaryMatchesSimulation(QuantumCircuitEngine, 4, [
    ['H', 'H', 'H', 'H'],
    ['CX_CTRL', null, 'CX_CTRL', 'CX_TGT'],
    ['SWAP', 'SWAP', null, null],
    ['S', 'T', 'Z', 'Y']
  ], '4-qubit combo Toffoli+SWAP+singles');
});

test('computeTotalUnitary still matches simulation for the original 3-qubit case (regression check)', () => {
  const QuantumCircuitEngine = loadEngine();
  assertUnitaryMatchesSimulation(QuantumCircuitEngine, 3, [
    ['H', null, 'X'],
    ['CX_CTRL', 'CX_TGT', null]
  ], '3-qubit CNOT + other qubit (originally-supported case)');
});

/**
 * getAdvancedEntanglementMetrics() / getConcurrence() used to be hardcoded
 * to a fixed q0-vs-rest, q0-q1-pair view with a threshold heuristic that
 * only recognized two named states (Bell, GHZ) - it reported concurrence:1
 * and "Maximally Entangled Bell Pair" for a genuine GHZ state, which is
 * physically wrong (GHZ pairwise concurrence is exactly 0 by entanglement
 * monogamy - all the correlation is tripartite, not pairwise). These tests
 * pin down the real Wootters-concurrence values for well-known benchmark
 * states so any future regression to a named-state heuristic is caught.
 */
function buildEngine(QuantumCircuitEngine, numQubits) {
  return new QuantumCircuitEngine(numQubits);
}

test('product state (independent Hadamards) has zero entropy and zero concurrence everywhere', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 3);
  engine.apply1QGate('H', 0);
  engine.apply1QGate('H', 1);
  engine.apply1QGate('H', 2);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(m.concurrence < 1e-3, `product state concurrence should be ~0, got ${m.concurrence}`);
  assert.ok(m.vonNeumannEntropy < 1e-3, `product state entropy should be ~0, got ${m.vonNeumannEntropy}`);
  assert.equal(m.entanglementClass, 'Product State (Separable, Zero Entanglement)');
});

test('Bell pair has concurrence exactly 1 and is classified as a bipartite pair', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 3);
  engine.apply1QGate('H', 0);
  engine.applyCNOT(0, 1);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(Math.abs(m.concurrence - 1) < 1e-3, `Bell pair concurrence should be ~1, got ${m.concurrence}`);
  assert.equal(m.entanglementClass, 'Maximally Entangled Bipartite Pair (Bell-Type)');
});

test('GHZ state has ZERO pairwise concurrence (monogamy-saturated), not the Bell-pair value', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 3);
  engine.apply1QGate('H', 0);
  engine.applyCNOT(0, 1);
  engine.applyCNOT(1, 2);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(m.concurrence < 1e-3, `GHZ pairwise concurrence should be ~0 by monogamy, got ${m.concurrence}`);
  assert.ok(Math.abs(m.vonNeumannEntropy - 1) < 1e-3, 'each GHZ qubit should still be maximally entangled with the rest');
  assert.match(m.entanglementClass, /GHZ-Type/, 'GHZ must not be mislabeled as a Bell pair');
  assert.equal(engine.getPairwiseConcurrence(0, 1), 0);
  assert.equal(engine.getPairwiseConcurrence(0, 2), 0);
  assert.equal(engine.getPairwiseConcurrence(1, 2), 0);
});

test('W state has the textbook pairwise concurrence of 2/3 (neither 0 nor 1)', () => {
  const QuantumCircuitEngine = loadEngine();
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'quantum-engine.js'), 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'quantum-engine.js' });
  const m = vm.runInContext(`
    (function () {
      const e = new QuantumCircuitEngine(3);
      const amp = 1 / Math.sqrt(3);
      e.state = e.state.map(() => new Complex(0, 0));
      e.state[1] = new Complex(amp, 0);
      e.state[2] = new Complex(amp, 0);
      e.state[4] = new Complex(amp, 0);
      return e.getAdvancedEntanglementMetrics();
    })()
  `, sandbox);
  assert.ok(Math.abs(m.concurrence - 2 / 3) < 1e-3, `W-state pairwise concurrence should be ~0.667, got ${m.concurrence}`);
  assert.match(m.entanglementClass, /W-Type/);
});

test('concurrence is invariant under local single-qubit rotation of an entangled pair', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 3);
  engine.apply1QGate('H', 0);
  engine.applyCNOT(0, 1);
  engine.apply1QGate('Y', 1);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(Math.abs(m.concurrence - 1) < 1e-3, `local Y rotation must not change concurrence, got ${m.concurrence}`);
});

/**
 * A Measure ('M') gate used to be skipped outright by runCircuitUpToCol, so
 * the simulator reported a fully entangled Bell pair (C = 1.00) on a wire the
 * Error Doctor had just flagged as collapsed by a premature measurement - the
 * simulation contradicted its own diagnostic. Measurement is now modelled as
 * dephasing in the computational basis: outcome probabilities are untouched,
 * but coherence (and any entanglement through that wire) is destroyed.
 */
test('measuring half of a Bell pair destroys entanglement but preserves outcome probabilities', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(3);
  engine.runCircuit(buildGrid(3, [
    ['H', null, null],
    ['CX_CTRL', 'CX_TGT', null],
    [null, 'M', null]
  ]));

  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(m.concurrence < 1e-3, `measured Bell pair must have zero concurrence, got ${m.concurrence}`);
  assert.match(m.entanglementClass, /Classically Correlated/, 'must not still claim entanglement after measurement');

  // The 50/50 measurement statistics are physically unchanged by the measurement.
  const active = engine.getProbabilities().filter((p) => p.probability > 0.01);
  assert.equal(active.length, 2);
  for (const p of active) {
    assert.ok(Math.abs(p.probability - 0.5) < 1e-6, `expected 50/50 outcomes, got ${p.probability}`);
  }
});

test('an unmeasured Bell pair is unaffected by the measurement handling (regression guard)', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(3);
  engine.runCircuit(buildGrid(3, [
    ['H', null],
    ['CX_CTRL', 'CX_TGT'],
    [null, null]
  ]));
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(Math.abs(m.concurrence - 1) < 1e-3, `unmeasured Bell pair must stay maximally entangled, got ${m.concurrence}`);
});

test('4-qubit GHZ generalizes correctly (not hardcoded to 3 qubits): zero pairwise concurrence, all qubits entangled', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 4);
  engine.apply1QGate('H', 0);
  engine.applyCNOT(0, 1);
  engine.applyCNOT(1, 2);
  engine.applyCNOT(2, 3);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(m.concurrence < 1e-3);
  assert.match(m.entanglementClass, /4-Partite GHZ-Type/);
});

/**
 * getAdvancedEntanglementMetrics() used to compute purity/entropy/Schmidt
 * rank from qubit 0's reduced state unconditionally, regardless of which
 * qubits were actually entangled. A Bell pair built on q1/q2 with q0 left
 * idle showed concurrence=1.00 (correctly the max over every pair) right
 * next to entropy=0.00 and purity=1.00 (q0's own, genuinely separable
 * state) - self-contradictory, since q0's numbers were being reported as
 * if they described the whole register's entanglement.
 */
test('headline purity/entropy describe the actually-entangled qubit, not qubit 0 unconditionally', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = buildEngine(QuantumCircuitEngine, 3);
  // Bell pair on q1-q2; q0 is left completely idle.
  engine.apply1QGate('H', 1);
  engine.applyCNOT(1, 2);
  const m = engine.getAdvancedEntanglementMetrics();
  assert.ok(Math.abs(m.concurrence - 1) < 1e-3, `expected concurrence ~1, got ${m.concurrence}`);
  assert.ok(Math.abs(m.vonNeumannEntropy - 1) < 1e-3, `entropy must agree with concurrence, got ${m.vonNeumannEntropy}`);
  assert.ok(Math.abs(m.purity - 0.5) < 1e-3, `purity must reflect the entangled qubit, got ${m.purity}`);
  assert.equal(m.representativeQubit === 1 || m.representativeQubit === 2, true, 'representativeQubit must be one of the actually-entangled qubits, not the idle q0');
});
