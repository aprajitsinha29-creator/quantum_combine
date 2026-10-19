/**
 * Verification Test for Physical Cloud QPU Bridge & IBM Quantum Integration
 */

const assert = require('assert');
const path = require('path');
const http = require('http');

const ibmQuantum = require('../ananta-backend/utils/ibmQuantum');

async function testIbmQuantumModule() {
  console.log('=== [1] Testing ibmQuantum.js unit capabilities ===');

  // Test 1: Empty token validation
  const emptyVal = await ibmQuantum.validateToken('');
  assert.strictEqual(emptyVal.valid, false, 'Empty token should be invalid');
  console.log('✓ Empty token correctly rejected');

  // Test 2: Bogus token validation
  const bogusVal = await ibmQuantum.validateToken('invalid_token_xyz_12345');
  assert.strictEqual(bogusVal.valid, false, 'Bogus token should fail authentication');
  console.log('✓ Bogus token correctly rejected by auth validator');

  // Test 3: getLiveBackends without token should return baseline fleet with isLive: false
  const backendsRes = await ibmQuantum.getLiveBackends('');
  assert.ok(backendsRes.devices.ibm_brisbane, 'Baseline ibm_brisbane exists');
  assert.ok(backendsRes.devices.ibm_kyoto, 'Baseline ibm_kyoto exists');
  assert.strictEqual(backendsRes.devices.ibm_brisbane.qubits, 127, '127 qubits on ibm_brisbane');
  assert.strictEqual(backendsRes.isLive, false, 'isLive is false for baseline');
  console.log('✓ Baseline fleet successfully loaded with isLive=false');

  // Test 4: runSimulatedNoise returns accurate counts and honest disclosure flag
  const simResult = ibmQuantum.runSimulatedNoise({
    backendName: 'ibm_brisbane',
    shots: 1024,
    numQubits: 2,
    idealProbabilities: [0.5, 0, 0, 0.5] // Bell state |00> + |11>
  });

  assert.strictEqual(simResult.shots, 1024, 'Total shots must equal 1024');
  assert.strictEqual(simResult.executionMode, 'SIMULATED_PHYSICAL_NOISE', 'Must have SIMULATED_PHYSICAL_NOISE flag');
  assert.ok(simResult.counts, 'Counts object exists');
  const totalCounted = Object.values(simResult.counts).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalCounted, 1024, 'Sum of all noisy shots must equal 1024');
  console.log('✓ Simulated noise correctly executed with honest disclosure and 1024 shots:', simResult.counts);
  console.log('✓ Physical fidelity calculated:', simResult.deviceSpecs.fidelityScore);
}

async function startServerAndTestEndpoints() {
  console.log('\n=== [2] Testing Server REST Endpoints (/api/qpu/...) ===');

  // Start server on a test port
  process.env.PORT = '5599';
  const server = require('../server');

  // Wait a moment for server to bind
  await new Promise(r => setTimeout(r, 800));

  function makeRequest(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : '';
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5599,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, text: raw });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // 1. Test GET /api/qpu/devices
  const devRes = await makeRequest('GET', '/api/qpu/devices');
  assert.strictEqual(devRes.status, 200, 'GET /api/qpu/devices should return 200');
  assert.ok(devRes.data.devices, 'Devices catalog returned');
  assert.strictEqual(devRes.data.isLive, false, 'Default isLive should be false');
  console.log('✓ GET /api/qpu/devices responded 200 with catalog');

  // 2. Test POST /api/qpu/auth with invalid token
  const authRes = await makeRequest('POST', '/api/qpu/auth', { token: 'invalid_dummy_token' });
  assert.strictEqual(authRes.status, 401, 'Invalid token should return 401');
  assert.strictEqual(authRes.data.valid, false, 'Invalid token valid flag is false');
  console.log('✓ POST /api/qpu/auth correctly rejected invalid token with 401');

  // 3. Test POST /api/qpu/run without IBM token (honest simulated fallback)
  const runRes = await makeRequest('POST', '/api/qpu/run', {
    backend: 'ibm_brisbane',
    shots: 1024,
    numQubits: 2,
    idealProbabilities: [0.5, 0, 0, 0.5],
    qasm: 'OPENQASM 3.0;\ninclude "stdgates.inc";\nqubit[2] q;\nbit[2] c;\nh q[0];\ncx q[0], q[1];\nc = measure q;\n'
  });

  assert.strictEqual(runRes.status, 200, 'POST /api/qpu/run should return 200');
  assert.strictEqual(runRes.data.success, true, 'Run success is true');
  assert.strictEqual(runRes.data.executionMode, 'SIMULATED_PHYSICAL_NOISE', 'Mode is SIMULATED_PHYSICAL_NOISE');
  assert.ok(runRes.data.jobId.startsWith('sim_'), 'Job ID clearly prefixed as simulation: ' + runRes.data.jobId);
  console.log('✓ POST /api/qpu/run simulated physical noise with honest metadata (Job ID: ' + runRes.data.jobId + ')');

  // 4. Test GET /api/qpu/job/:id for a simulated or unknown job
  const jobRes = await makeRequest('GET', `/api/qpu/job/${runRes.data.jobId}`);
  assert.strictEqual(jobRes.status, 200, 'GET /api/qpu/job/:id should return 200');
  assert.strictEqual(jobRes.data.status, 'COMPLETED', 'Simulated job status should be COMPLETED');
  console.log('✓ GET /api/qpu/job/:id responded 200 with job status');

  console.log('\n=== 🎉 ALL PHYSICAL QPU & IBM QUANTUM TESTS PASSED! ===\n');
  process.exit(0);
}

async function run() {
  try {
    await testIbmQuantumModule();
    await startServerAndTestEndpoints();
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

run();
