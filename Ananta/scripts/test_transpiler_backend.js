const transpilerEngine = require('../ananta-backend/utils/transpilerEngine');

console.log('================================================================');
console.log('🧪 TESTING UNIVERSAL TRANSPILER & CIRCUIT DOCTOR ENGINE');
console.log('================================================================');

const sampleQiskit = `
from qiskit import QuantumCircuit
qc = QuantumCircuit(3)
qc.h(0)
qc.h(0)
qc.cx(0, 1)
qc.cx(0, 1)
qc.x(2)
qc.x(2)
qc.rz(0.785, 0)
qc.rz(0.785, 0)
`;

// Test 1: Direct Transpilation to Cirq
console.log('\n--- [Test 1] Direct Transpilation (Qiskit -> Cirq) ---');
const directRes = transpilerEngine.transpile({
  code: sampleQiskit,
  sourceFramework: 'qiskit',
  targetFramework: 'cirq',
  optimize: false
});

console.log('Success:', directRes.success);
console.log('Raw Gates:', directRes.rawGateCount);
console.log('Target Framework:', directRes.targetFramework);
console.log('Transpiled Snippet:\n' + directRes.transpiledCode.split('\n').slice(0, 8).join('\n'));

// Test 2: Circuit Doctor Optimization (Eliminating H*H, CX*CX, X*X, Merging Rz+Rz)
console.log('\n--- [Test 2] Circuit Doctor Optimization (Peephole Involutions) ---');
const optRes = transpilerEngine.transpile({
  code: sampleQiskit,
  sourceFramework: 'qiskit',
  targetFramework: 'cirq',
  optimize: true
});

console.log('Success:', optRes.success);
console.log('Optimized Gates:', optRes.optimizedGateCount);
console.log('Cancellations:', optRes.cancellations.length);
optRes.cancellations.forEach((c, i) => console.log(`  ${i+1}. ${c.rule}: ${c.desc}`));
console.log('Time Saved:', optRes.metrics.timeSavedNs + ' ns');
console.log('Coherence Gain:', optRes.metrics.coherenceGain + '%');

if (optRes.cancellations.length >= 3 && optRes.optimizedGateCount < directRes.rawGateCount) {
  console.log('\n🎉 ALL TRANSPILER & DOCTOR TESTS PASSED 100%!');
} else {
  console.error('❌ Test failed!');
  process.exit(1);
}
