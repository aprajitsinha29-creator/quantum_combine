// Test /api/gemini multi-task endpoints locally
const http = require('http');

function testPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5500,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let respData = '';
      res.on('data', chunk => { respData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(respData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: respData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting /api/gemini tests...\n');

  // Test 1: Bad task returns 400
  console.log('--- Test 1: Bad task validation ---');
  const res1 = await testPost('/api/gemini', { task: 'invalid_task', payload: {} });
  console.log('Result:', res1.status, res1.body);
  if (res1.status === 400) console.log('✅ Test 1 Passed: Clean HTTP 400');
  else console.error('❌ Test 1 Failed');

  // Test 2: Voice parse
  console.log('\n--- Test 2: Voice Copilot task (voice-parse) ---');
  const res2 = await testPost('/api/gemini', {
    task: 'voice-parse',
    payload: {
      transcript: 'Rotate qubit 1 by pi over 4 around Z and wire CNOT from 0 to 1',
      currentCircuit: { num_qubits: 2, grid: [[], []] }
    }
  });
  console.log('Result Status:', res2.status);
  console.log('Plan:', JSON.stringify(res2.body?.result, null, 2));
  if (res2.status === 200 && res2.body?.result?.operations) console.log('✅ Test 2 Passed: Generalized voice parse succeeded');
  else console.error('❌ Test 2 Failed');

  // Test 3: Concept Doctor
  console.log('\n--- Test 3: Concept Doctor task (concept-doctor) ---');
  const res3 = await testPost('/api/gemini', {
    task: 'concept-doctor',
    payload: {
      question: 'What is quantum supremacy?',
      groundingEntries: [
        { id: 'tunneling', title: 'Quantum Tunneling', analogy: 'Tennis ball through wall' },
        { id: 'teleportation', title: 'Quantum Teleportation', analogy: '3D fax machine' }
      ]
    }
  });
  console.log('Result Status:', res3.status);
  console.log('Concept Analysis:', JSON.stringify(res3.body?.result, null, 2));
  if (res3.status === 200 && res3.body?.result?.title) console.log('✅ Test 3 Passed: Concept Doctor Q&A succeeded');
  else console.error('❌ Test 3 Failed');

  // Test 4: Roadmap
  console.log('\n--- Test 4: Roadmap Studio task (roadmap) ---');
  const res4 = await testPost('/api/gemini', {
    task: 'roadmap',
    payload: {
      instruction: 'I know linear algebra and Python but nothing about qubits',
      availableModuleIds: ['module-01', 'module-02', 'module-03', 'module-04', 'module-05']
    }
  });
  console.log('Result Status:', res4.status);
  console.log('Roadmap Modules:', res4.body?.result?.moduleIds, 'Reasoning:', res4.body?.result?.reasoning);
  if (res4.status === 200 && Array.isArray(res4.body?.result?.moduleIds)) console.log('✅ Test 4 Passed: Roadmap synthesis succeeded');
  else console.error('❌ Test 4 Failed');

  // Test 5: Circuit Doctor
  console.log('\n--- Test 5: AI Circuit Doctor task (circuit-doctor) ---');
  const res5 = await testPost('/api/gemini', {
    task: 'circuit-doctor',
    payload: {
      sourceCode: 'OPENQASM 3.0;\nqubit[2] q;\nh q[0];\ncx q[0], q[1];',
      sourceFramework: 'openqasm',
      rawGatesCount: 2,
      optGatesCount: 2,
      numQubits: 2
    }
  });
  console.log('Result Status:', res5.status);
  console.log('Audit Circuit Name:', res5.body?.result?.circuitName);
  console.log('Health Assessment:', res5.body?.result?.healthAssessment);
  if (res5.status === 200 && res5.body?.result?.circuitName) console.log('✅ Test 5 Passed: Circuit Doctor clinical audit succeeded');
  else console.error('❌ Test 5 Failed');

  console.log('\n🎉 ALL /api/gemini TESTS COMPLETED!');
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
