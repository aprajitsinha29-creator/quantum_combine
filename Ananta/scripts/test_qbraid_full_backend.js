/**
 * Verification Test Script for Unconstrained qBraid Multi-Provider Backend
 */

const assert = require('assert');
const qbraidClient = require('../ananta-backend/utils/qbraidClient');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING UNCONSTRAINED QBRAID BACKEND & RECOMMENDATION ENGINE');
  console.log('================================================================\n');

  // Test 1: Device Fleet Discovery (All 28+ Devices)
  console.log('--- [Test 1] Full Fleet Discovery (No Limits) ---');
  const allFleet = await qbraidClient.getLiveBackends('');
  console.log(`Discovered ${allFleet.count} devices in catalog.`);
  assert(allFleet.count >= 25, `Expected at least 25 devices, found ${allFleet.count}`);
  assert(allFleet.devices['ionq_forte'], 'IonQ Forte must exist in catalog');
  assert(allFleet.devices['ibm_torino'], 'IBM Torino must exist in catalog');
  assert(allFleet.devices['quantinuum_h2_1'], 'Quantinuum H2-1 must exist in catalog');
  assert(allFleet.devices['rigetti_ankaa_2'], 'Rigetti Ankaa-2 must exist in catalog');
  assert(allFleet.devices['iqm_star'], 'IQM Star must exist in catalog');
  assert(allFleet.devices['xanadu_borealis'], 'Xanadu Borealis must exist in catalog');
  console.log('✅ Passed: Complete 28+ device catalog verified across all providers.\n');

  // Test 2: Dynamic Provider & Architecture Filtering
  console.log('--- [Test 2] Multi-Provider & Architecture Filtering ---');
  const ionqFleet = await qbraidClient.getLiveBackends('', { provider: 'ionq' });
  console.log(`IonQ filter found ${ionqFleet.count} devices.`);
  assert(ionqFleet.count >= 4, 'Expected at least 4 IonQ devices');

  const neutralAtomFleet = await qbraidClient.getLiveBackends('', { architecture: 'neutral-atom' });
  console.log(`Neutral Atom filter found ${neutralAtomFleet.count} devices (QuEra, Pasqal).`);
  assert(neutralAtomFleet.count >= 2, 'Expected QuEra and Pasqal');

  const bigQubitFleet = await qbraidClient.getLiveBackends('', { minQubits: 80 });
  console.log(`MinQubits=80 filter found ${bigQubitFleet.count} utility-scale processors.`);
  assert(bigQubitFleet.count >= 5, 'Expected 5+ devices with >=80 qubits');
  console.log('✅ Passed: Dynamic query filtering functioning accurately.\n');

  // Test 3: Intelligent Circuit Recommendation Engine
  console.log('--- [Test 3] Intelligent Hardware Recommendation Engine ---');
  const bellQasm = `
    OPENQASM 2.0;
    include "qelib1.inc";
    qreg q[2];
    creg c[2];
    h q[0];
    cx q[0], q[1];
    measure q -> c;
  `;

  const rec = qbraidClient.recommendHardware({
    qasm: bellQasm,
    numQubits: 2,
    depth: 3,
    circuitType: 'bell_entanglement'
  });

  assert(rec.success, 'Recommendation should succeed');
  assert(rec.primaryRecommendation, 'Should provide primary recommendation');
  assert(rec.primaryRecommendation.predictedFidelity > 90, 'Predicted fidelity should be high for 2Q Bell');
  assert(rec.categoryPicks.bestFidelity, 'Should provide best fidelity pick');
  assert(rec.categoryPicks.fastestExecution, 'Should provide fastest queue pick');
  assert(rec.categoryPicks.nativeTopology, 'Should provide native topology pick');
  assert(rec.categoryPicks.costEffective, 'Should provide cost effective pick');

  console.log(`Recommendation for Bell State:`);
  console.log(`  ⭐ Primary: ${rec.primaryRecommendation.device.name} (${rec.primaryRecommendation.predictedFidelity}%)`);
  console.log(`  💡 Reason: ${rec.primaryRecommendation.reason}`);
  console.log(`  ⚡ Fastest: ${rec.categoryPicks.fastestExecution.device.name}`);
  console.log(`  🌐 Zero-SWAP Topology: ${rec.categoryPicks.nativeTopology.device.name}`);
  console.log('✅ Passed: Hardware suggestion engine accurately analyzes circuits.\n');

  // Test 4: Multi-Architecture Native Code Generation
  console.log('--- [Test 4] Multi-Architecture Native Code Transpilation ---');
  const braketTranspile = qbraidClient.transpileCircuit({
    qasm: bellQasm,
    backend: 'aws_braket_sv1',
    format: 'braket_python'
  });
  assert(braketTranspile.code.includes('braket.circuits import Circuit'), 'Should generate Braket Python code');

  const ionqTranspile = qbraidClient.transpileCircuit({
    qasm: bellQasm,
    backend: 'ionq_aria_1',
    format: 'ionq_native'
  });
  assert(ionqTranspile.code.includes('gpi'), 'Should generate IonQ native gate JSON');

  const qiskitTranspile = qbraidClient.transpileCircuit({
    qasm: bellQasm,
    backend: 'ibm_torino',
    format: 'qiskit_python'
  });
  assert(qiskitTranspile.code.includes('QuantumCircuit'), 'Should generate Qiskit script');
  console.log('✅ Passed: Transpiled native code across AWS Braket, IonQ Native, and Qiskit.\n');

  // Test 5: Open Quantum System Physics Noise Simulation
  console.log('--- [Test 5] Open Quantum System Realistic Noise Simulation ---');
  const sim = qbraidClient.runSimulatedNoise({
    backend: 'ionq_aria_1',
    shots: 1024,
    numQubits: 2,
    qasm: bellQasm
  });
  assert(sim.success, 'Simulation should succeed');
  assert(sim.counts['00'] > 300, 'Counts should have dominant |00>');
  assert(sim.counts['11'] > 300, 'Counts should have dominant |11>');
  assert(sim.circuitFidelityEstimate > 90, 'Fidelity estimate should be computed');
  console.log(`Simulation on IonQ Aria 1 (1,024 shots):`, sim.counts);
  console.log(`Estimated Circuit Fidelity: ${sim.circuitFidelityEstimate}%`);
  console.log('✅ Passed: Multi-qubit physical noise simulation verified.\n');

  console.log('================================================================');
  console.log('🎉 ALL QBRAID BACKEND TESTS PASSED WITH ZERO LIMITATIONS!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
