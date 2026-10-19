/**
 * Code-writer (multi-framework export) tests.
 *
 * The exporters had no coverage at all, which is how the PennyLane export
 * shipped a second QNode whose body was the literal comment
 * "(same gate sequence as above)" instead of the gates. That QNode therefore
 * ran on the untouched |0...0> ground state and printed <Z> = 1 for every
 * qubit of every circuit - generated code that looked correct and silently
 * reported wrong expectation values.
 *
 * quantum-engine.js is a browser global (no module.exports), so it is loaded
 * into a real vm context exactly the way the browser runs it.
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

// H on both q0/q1, Toffoli -> q2, SWAP q0/q1, controlled phase, then rotations.
// Deliberately exercises every multi-qubit and parametric path at once.
const MIXED_GRID = [
  ['H', 'CX_CTRL', 'SWAP', 'CP(1.0471975511965976)', 'RY(0.6435011087932844)'],
  ['H', 'CX_CTRL', 'SWAP', 'CP(1.0471975511965976)', null],
  [null, 'CX_TGT', null, null, 'RZ(0.7853981633974483)']
];

const FRAMEWORKS = ['qiskit', 'cirq', 'braket', 'pennylane', 'qasm'];

test('every framework exports every gate in the circuit (nothing silently dropped)', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(3);

  // Gate-name spellings differ per SDK, so assert on each target's own idiom
  // rather than a shared token - a dropped gate shows up as a missing match.
  const expected = {
    qiskit: [/qc\.h\(/, /qc\.ccx\(0, 1, 2\)/, /qc\.swap\(0, 1\)/, /qc\.cp\(/, /qc\.ry\(/, /qc\.rz\(/],
    cirq: [/cirq\.H\(/, /cirq\.TOFFOLI\(/, /cirq\.SWAP\(/, /CZPowGate\(/, /cirq\.ry\(/, /cirq\.rz\(/],
    braket: [/circuit\.h\(/, /circuit\.ccnot\(0, 1, 2\)/, /circuit\.swap\(0, 1\)/, /cphaseshift\(/, /circuit\.ry\(/, /circuit\.rz\(/],
    pennylane: [/qml\.Hadamard\(/, /qml\.Toffoli\(/, /qml\.SWAP\(/, /ControlledPhaseShift\(/, /qml\.RY\(/, /qml\.RZ\(/],
    qasm: [/^h q\[/m, /^ccx q\[0\], q\[1\], q\[2\];/m, /^swap q\[0\], q\[1\];/m, /^cp\(/m, /^ry\(/m, /^rz\(/m]
  };

  for (const framework of FRAMEWORKS) {
    const code = engine.exportCode(MIXED_GRID, framework);
    assert.ok(code && code.length > 0, `${framework} produced no output`);
    for (const pattern of expected[framework]) {
      assert.match(code, pattern, `${framework} export is missing ${pattern}`);
    }
  }
});

test('PennyLane expectation QNode carries the real gate body, not a placeholder comment', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(3);
  const code = engine.exportCode(MIXED_GRID, 'pennylane');

  assert.doesNotMatch(
    code,
    /same gate sequence as above/,
    'the expectation QNode still contains the placeholder comment instead of gates'
  );

  // Both QNodes must contain the identical gate body. Splitting on the second
  // decorator lets us compare the two function bodies directly.
  const parts = code.split('@qml.qnode(dev)').filter(s => s.includes('def '));
  assert.equal(parts.length, 2, 'expected exactly two QNodes in the PennyLane export');

  const gateLine = /qml\.(Hadamard|Toffoli|SWAP|ControlledPhaseShift|RY|RZ)\(/g;
  const gatesIn = (s) => (s.match(gateLine) || []).sort().join('|');

  assert.equal(
    gatesIn(parts[1]),
    gatesIn(parts[0]),
    'the expectation QNode does not apply the same gates as the statevector QNode'
  );
  assert.ok(gatesIn(parts[0]).length > 0, 'the statevector QNode has no gates at all');
});

test('an empty circuit exports valid, honest scaffolding rather than bogus gates', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(2);
  const emptyGrid = [[null, null], [null, null]];

  for (const framework of FRAMEWORKS) {
    const code = engine.exportCode(emptyGrid, framework);
    assert.ok(code && code.length > 0, `${framework} produced no output for an empty circuit`);
    // No circuit was built, so no gate application may appear.
    assert.doesNotMatch(code, /qc\.h\(|cirq\.H\(|circuit\.h\(|qml\.Hadamard\(/, `${framework} invented a gate for an empty circuit`);
  }
});

test('exported qubit indices stay within the declared register', () => {
  const QuantumCircuitEngine = loadEngine();
  const engine = new QuantumCircuitEngine(3);

  for (const framework of FRAMEWORKS) {
    const code = engine.exportCode(MIXED_GRID, framework)
      // Drop register DECLARATIONS: qml.device(..., wires=3), qreg q[3] and
      // LineQubit.range(3) carry a size, not an index, and 3 is legal there.
      .split('\n')
      .filter(l => !/qml\.device\(|LineQubit\.range\(|^\s*(qreg|creg)\s|QuantumCircuit\(/.test(l))
      .join('\n');

    for (const m of code.matchAll(/q\[(\d+)\]|qubits\[(\d+)\]|wires=\[?(\d+)/g)) {
      const idx = Number(m[1] ?? m[2] ?? m[3]);
      assert.ok(idx >= 0 && idx < 3, `${framework} referenced qubit ${idx} outside the 3-qubit register`);
    }
  }
});
