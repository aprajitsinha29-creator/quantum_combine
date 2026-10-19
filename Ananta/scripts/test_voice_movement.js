const assert = require('assert');
const { classifyIntent, prepareTurn, describeCircuit } = require('../ananta-backend/utils/voiceAgent');
const geminiHandler = require('../api/gemini');

console.log('=== RUNNING VOICE MOVEMENT UNIVERSAL TEST SUITE ===');

// 1. Test intent classification for natural voice movement phrases
const movePhrases = [
  'move t to t 5',
  'can you move t to t 5',
  'could you please shift H forward two steps',
  'take the gate on wire 0 to wire 1',
  'slide CNOT to step 4',
  'reposition Z to t 3',
  'transfer H from 1 to 4',
  'move from step 1 to step 5'
];

for (const phrase of movePhrases) {
  const intent = classifyIntent(phrase);
  console.log(`[Intent Check] "${phrase}" -> ${intent}`);
  assert.strictEqual(intent, 'build', `Expected "${phrase}" to be classified as 'build', got '${intent}'`);
}
console.log(' Intent classification passed for all natural move phrases.\n');

// 2. Test prepareTurn live state grounding
const sampleGrid = [
  ['H', 'CX_CTRL', null, null, null, null],
  [null, 'CX_TGT', null, 'T', null, null],
  [null, null, null, null, null, null]
];

const turn = prepareTurn({
  transcript: 'move t to t 5',
  circuit: { num_qubits: 3, grid: sampleGrid }
});

assert(turn.systemPrompt.includes('q1 at step 3 (t=4): T'), 'System prompt must ground the model with live grid gate placements');
console.log(' Live circuit grounding verified in system prompt.\n');

// 3. Test parseVoiceLocally deterministic/fallback parser
// We need to test the local parser via geminiHandler or testing directly
// Let's create an HTTP request mock or invoke internal function
const http = require('http');

async function testVoiceParse(transcript, grid = sampleGrid) {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      task: 'voice-agent',
      provider: 'offline', // forces deterministic local parser
      payload: {
        transcript,
        circuit: { num_qubits: 3, grid }
      }
    }
  };

  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const res = {
      statusCode: 200,
      setHeader: () => {},
      status: (code) => { statusCode = code; return res; },
      json: (data) => resolve({ statusCode, data }),
      end: (data) => {
        try { resolve({ statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ statusCode, data }); }
      }
    };

    geminiHandler(req, res).catch(reject);
  });
}

async function runTests() {
  // Test A: "move t to t 5" when T is on wire 1 at step 3
  console.log('Testing "move t to t 5"...');
  let res = await testVoiceParse('move t to t 5', sampleGrid);
  let plan = res.data.result;
  console.log('Result plan:', JSON.stringify(plan.operations));
  assert(plan.operations.length > 0, 'Must produce an operation');
  let op = plan.operations[0];
  assert.strictEqual(op.action, 'move', 'Action must be move');
  assert.strictEqual(op.gate, 'T', 'Gate must be T');
  assert.strictEqual(op.step, 4, 'Target step must be index 4 (t=5)');
  assert.strictEqual(op.from_step, 3, 'Source step should be detected from grid (index 3)');
  assert.strictEqual(op.from_qubit, 1, 'Source qubit should be detected from grid (wire 1)');
  console.log(' "move t to t 5" passed.\n');

  // Test B: "move t to t five" (spelled number word)
  console.log('Testing "move t to t five"...');
  res = await testVoiceParse('move t to t five', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.gate, 'T');
  assert.strictEqual(op.step, 4, 'Target step must resolve spelled number "five" to index 4');
  console.log(' "move t to t five" passed.\n');

  // Test C: "move hadamard from step 1 to step 4"
  console.log('Testing "move hadamard from step 1 to step 4"...');
  res = await testVoiceParse('move hadamard from step 1 to step 4', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.gate, 'H');
  assert.strictEqual(op.from_step, 0);
  assert.strictEqual(op.step, 3);
  console.log(' "move hadamard from step 1 to step 4" passed.\n');

  // Test D: "shift gate on wire 1 to t 3"
  console.log('Testing "shift gate on wire 1 to t 3"...');
  res = await testVoiceParse('shift gate on wire 1 to t 3', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.targets[0], 1);
  assert.strictEqual(op.step, 2);
  console.log(' "shift gate on wire 1 to t 3" passed.\n');

  // Test E: "move cnot to t 5"
  console.log('Testing "move cnot to t 5"...');
  res = await testVoiceParse('move cnot to t 5', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.gate, 'CNOT');
  assert.strictEqual(op.step, 4);
  console.log(' "move cnot to t 5" passed.\n');

  // Test F: "move t to 5" (without the second 't')
  console.log('Testing "move t to 5"...');
  res = await testVoiceParse('move t to 5', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.gate, 'T');
  assert.strictEqual(op.step, 4);
  console.log(' "move t to 5" passed.\n');

  // Test G: "take hadamard from wire 0 to wire 2" (cross-wire move)
  console.log('Testing "take hadamard from wire 0 to wire 2"...');
  res = await testVoiceParse('take hadamard from wire 0 to wire 2', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.gate, 'H');
  assert.strictEqual(op.from_qubit, 0);
  assert.strictEqual(op.targets[0], 2);
  console.log(' "take hadamard from wire 0 to wire 2" passed.\n');

  // Test H: "move from 1 to 5" (unspecified gate, column move)
  console.log('Testing "move from 1 to 5"...');
  res = await testVoiceParse('move from 1 to 5', sampleGrid);
  plan = res.data.result;
  op = plan.operations[0];
  assert.strictEqual(op.action, 'move');
  assert.strictEqual(op.from_step, 0);
  assert.strictEqual(op.step, 4);
  console.log(' "move from 1 to 5" passed.\n');

  console.log('🎉 ALL VOICE MOVEMENT TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
