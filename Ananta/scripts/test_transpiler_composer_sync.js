/**
 * Verification test for Transpiler Composer Sync & Multi-Framework Generation
 */

const assert = require('assert');
const transpilerEngine = require('../ananta-backend/utils/transpilerEngine');
const transpilerHandler = require('../api/transpiler');

async function runTests() {
  console.log('--- TEST 1: convertFromComposer with Bell Circuit ---');
  const bellGrid = [
    ['H', 'CX_CTRL', null, null],
    [null, 'CX_TGT', null, null],
    [null, null, null, null]
  ];
  const bellRes = transpilerEngine.convertFromComposer({
    grid: bellGrid,
    numQubits: 3,
    sourceFramework: 'qiskit',
    targetFramework: 'cirq',
    optimize: true
  });
  assert(bellRes.success === true, 'Bell conversion must succeed');
  assert(bellRes.rawGateCount === 2, `Expected 2 gates, got ${bellRes.rawGateCount}`);
  assert(bellRes.sourceCode.includes('qc.h(0)'), 'Qiskit source must contain qc.h(0)');
  assert(bellRes.sourceCode.includes('qc.cx(0, 1)'), 'Qiskit source must contain qc.cx(0, 1)');
  assert(bellRes.targetCode.includes('cirq.H(q[0])'), 'Cirq target must contain cirq.H(q[0])');
  assert(bellRes.targetCode.includes('cirq.CNOT(q[0], q[1])'), 'Cirq target must contain cirq.CNOT(q[0], q[1])');
  console.log('✓ Bell circuit passed\n');

  console.log('--- TEST 2: convertFromComposer with Redundant Gates (Doctor Optimization) ---');
  const doctorGrid = [
    ['H', 'H', 'X', 'X', { gate: 'RZ', angle: 0.7854 }, { gate: 'RZ', angle: 0.7854 }],
    [null, null, null, null, null, null]
  ];
  const doctorRes = transpilerEngine.convertFromComposer({
    grid: doctorGrid,
    numQubits: 2,
    sourceFramework: 'qiskit',
    targetFramework: 'cirq',
    optimize: true
  });
  assert(doctorRes.success === true, 'Doctor conversion must succeed');
  assert(doctorRes.rawGateCount === 6, `Expected 6 raw gates, got ${doctorRes.rawGateCount}`);
  // H*H cancels, X*X cancels, RZ+RZ fuses to 1 gate => 1 gate remaining!
  assert(doctorRes.optimizedGateCount === 1, `Expected 1 optimized gate, got ${doctorRes.optimizedGateCount}`);
  assert(doctorRes.cancellations.length >= 2, 'Expected at least 2 cancellations');
  assert(doctorRes.metrics.totalSavedNs > 0, 'Expected positive nanoseconds saved');
  console.log(`✓ Doctor optimization passed (6 gates -> ${doctorRes.optimizedGateCount} gate, saved ${doctorRes.metrics.totalSavedNs} ns)\n`);

  console.log('--- TEST 3: convertFromComposer with 3-Qubit Toffoli (CCX) and SWAP ---');
  const toffoliGrid = [
    ['CX_CTRL', 'SWAP', null],
    ['CX_CTRL', 'SWAP', null],
    ['CX_TGT', null, null]
  ];
  const toffoliRes = transpilerEngine.convertFromComposer({
    grid: toffoliGrid,
    numQubits: 3,
    sourceFramework: 'qiskit',
    targetFramework: 'braket',
    optimize: false
  });
  assert(toffoliRes.success === true, 'Toffoli conversion must succeed');
  assert(toffoliRes.rawGateCount === 2, `Expected 2 gates (CCX + SWAP), got ${toffoliRes.rawGateCount}`);
  assert(toffoliRes.sourceCode.includes('qc.ccx(0, 1, 2)'), 'Qiskit source must contain qc.ccx');
  assert(toffoliRes.sourceCode.includes('qc.swap(0, 1)'), 'Qiskit source must contain qc.swap');
  assert(toffoliRes.targetCode.includes('circuit.ccnot(0, 1, 2)'), 'Braket target must contain circuit.ccnot');
  assert(toffoliRes.targetCode.includes('circuit.swap(0, 1)'), 'Braket target must contain circuit.swap');
  console.log('✓ Toffoli & SWAP multi-qubit passed\n');

  console.log('--- TEST 4: convertFromComposer Across All 6 Frameworks ---');
  const frameworks = ['qiskit', 'cirq', 'braket', 'pennylane', 'qasm', 'pyquil'];
  for (const src of frameworks) {
    for (const tgt of frameworks) {
      const res = transpilerEngine.convertFromComposer({
        grid: bellGrid,
        numQubits: 3,
        sourceFramework: src,
        targetFramework: tgt,
        optimize: true
      });
      assert(res.success === true, `Conversion from ${src} to ${tgt} must succeed`);
      assert(res.sourceCode.length > 20, `Source code for ${src} must be non-empty`);
      assert(res.targetCode.length > 20, `Target code for ${tgt} must be non-empty`);
    }
  }
  console.log('✓ All 36 cross-framework combinations generated valid code\n');

  console.log('--- TEST 5: convertFromComposer with Empty Grid (Zero Gates) ---');
  const emptyRes = transpilerEngine.convertFromComposer({
    grid: [[null, null], [null, null]],
    numQubits: 2,
    sourceFramework: 'qiskit',
    targetFramework: 'cirq',
    optimize: true
  });
  assert(emptyRes.success === true, 'Empty grid must succeed');
  assert(emptyRes.rawGateCount === 0, 'Raw gate count must be 0');
  assert(emptyRes.sourceCode.includes('# No quantum gates in circuit'), 'Source code handles empty circuit');
  assert(emptyRes.targetCode.includes('# No quantum gates in circuit'), 'Target code handles empty circuit');
  console.log('✓ Empty grid gracefully handled\n');

  console.log('--- TEST 6: api/transpiler.js Serverless Handler ---');
  function createMockRes() {
    return {
      statusCode: 0,
      headers: {},
      body: '',
      writeHead(code, headers) {
        this.statusCode = code;
        this.headers = headers;
      },
      end(chunk) {
        this.body = chunk;
      }
    };
  }

  // 6a. Test /api/transpiler/from-composer
  const mockReq1 = {
    method: 'POST',
    url: '/api/transpiler/from-composer',
    headers: { host: 'ananta.vercel.app' },
    body: {
      grid: bellGrid,
      numQubits: 3,
      sourceFramework: 'qiskit',
      targetFramework: 'cirq',
      optimize: true
    }
  };
  const mockRes1 = createMockRes();
  await transpilerHandler(mockReq1, mockRes1);
  assert(mockRes1.statusCode === 200, `Expected 200, got ${mockRes1.statusCode}`);
  const data1 = JSON.parse(mockRes1.body);
  assert(data1.success === true, 'from-composer API must return success: true');
  assert(data1.rawGateCount === 2, 'from-composer API must report 2 gates');

  // 6b. Test /api/transpiler/doctor
  const mockReq2 = {
    method: 'POST',
    url: '/api/transpiler/doctor',
    headers: { host: 'ananta.vercel.app' },
    body: {
      code: 'qc.h(0)\nqc.h(0)\nqc.cx(0, 1)',
      sourceFramework: 'qiskit',
      targetFramework: 'cirq'
    }
  };
  const mockRes2 = createMockRes();
  await transpilerHandler(mockReq2, mockRes2);
  assert(mockRes2.statusCode === 200, `Expected 200, got ${mockRes2.statusCode}`);
  const data2 = JSON.parse(mockRes2.body);
  assert(data2.success === true, 'doctor API must return success: true');
  assert(data2.optimizedGateCount === 1, 'H*H cancellation must yield 1 gate');

  // 6c. Test /api/transpiler/status
  const mockReq3 = {
    method: 'GET',
    url: '/api/transpiler/status',
    headers: { host: 'ananta.vercel.app' }
  };
  const mockRes3 = createMockRes();
  await transpilerHandler(mockReq3, mockRes3);
  assert(mockRes3.statusCode === 200, `Expected 200, got ${mockRes3.statusCode}`);
  const data3 = JSON.parse(mockRes3.body);
  assert(data3.success === true, 'status API must report success');

  console.log('✓ api/transpiler.js serverless function tests passed\n');

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
