const assert = require('assert');

// Simulate browser environment for CircuitUI and QuantumVoiceCopilot
global.window = {
  selectedPaletteGate: null,
  speechSynthesis: { addEventListener: () => {}, resume: () => {}, speak: () => {}, getVoices: () => [] },
  addEventListener: () => {}
};
global.document = {
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: (id) => ({
    classList: { add: () => {}, remove: () => {} },
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    addEventListener: () => {},
    innerHTML: '',
    textContent: '',
    querySelectorAll: () => []
  }),
  querySelectorAll: () => [],
  createElement: (tag) => ({
    className: '',
    classList: { add: () => {}, remove: () => {} },
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    addEventListener: () => {},
    innerHTML: '',
    textContent: ''
  })
};
global.navigator = { language: 'en-US' };
global.localStorage = { getItem: () => null, setItem: () => {} };

const fs = require('fs');
const path = require('path');

const quantumEngineCode = fs.readFileSync(path.join(__dirname, '../js/quantum-engine.js'), 'utf8');
eval(quantumEngineCode);
const QuantumCircuitEngine = window.QuantumCircuitEngine;

const circuitUiCode = fs.readFileSync(path.join(__dirname, '../js/circuit-ui.js'), 'utf8');
const voiceCopilotCode = fs.readFileSync(path.join(__dirname, '../js/quantum-voice-copilot.js'), 'utf8');

// Evaluate CircuitUI class
const CircuitUI = eval('(function(){ ' + circuitUiCode + '; return CircuitUI; })()');

// Evaluate QuantumVoiceCopilot class
const QuantumVoiceCopilot = eval('(function(){ ' + voiceCopilotCode + '; return QuantumVoiceCopilot; })()');

console.log('=== RUNNING FRONTEND LOGIC SIMULATION TEST ===');

const engine = new QuantumCircuitEngine(3);
const ui = new CircuitUI(engine, null);
ui.renderGrid = () => {}; // headless mock
ui.updateSimulation = () => {};
ui.renderCnotConnectors = () => {};
ui.bindGateTooltips = () => {};

// Verify initial grid: Bell state [H, CX_CTRL], [null, CX_TGT]
console.log('Initial grid row 0:', ui.grid[0]);
console.log('Initial grid row 1:', ui.grid[1]);
assert.strictEqual(ui.grid[0][0], 'H');
assert.strictEqual(ui.grid[0][1], 'CX_CTRL');
assert.strictEqual(ui.grid[1][1], 'CX_TGT');

const copilot = new QuantumVoiceCopilot();
copilot._speak = () => {}; // mute in test
copilot._playChime = () => {};

// Test 1: "move t to t 5"
console.log('Executing: "move t to t 5"...');
let res1 = copilot._parseAndMoveGate('move t to t 5', false);
console.log('Response 1:', res1);
console.log('Grid after "move t to t 5": row 0:', ui.grid[0]);
assert.strictEqual(ui.grid[0][4], 'T', 'Wire 0 at t=5 (col 4) must now hold T gate');
console.log(' "move t to t 5" placed/moved T gate to slot 4 correctly!\n');

// Test 2: "move hadamard from wire 0 to wire 2"
console.log('Executing: "move hadamard from wire 0 to wire 2"...');
let res2 = copilot._parseAndMoveGate('move hadamard from wire 0 to wire 2', false);
console.log('Response 2:', res2);
console.log('Grid after cross-wire move: row 0 col 0:', ui.grid[0][0], 'row 2 col 0:', ui.grid[2][0]);
assert.strictEqual(ui.grid[0][0], null, 'Wire 0 col 0 should now be empty');
assert.strictEqual(ui.grid[2][0], 'H', 'Wire 2 col 0 should now have H');
console.log(' Cross-wire move passed!\n');

// Test 3: "shift T to step 2"
console.log('Executing: "shift t to step 2"...');
let res3 = copilot._parseAndMoveGate('shift t to step 2', false);
console.log('Response 3:', res3);
console.log('Grid after shift: row 0 col 4:', ui.grid[0][4], 'row 0 col 1:', ui.grid[0][1]);
assert.strictEqual(ui.grid[0][4], null, 'Old slot t=5 should now be empty');
assert.strictEqual(ui.grid[0][1], 'T', 'New slot t=2 should now hold T');
console.log(' Shifting existing gate passed!\n');

// Test 4: Full plan execution via _applyOperations
console.log('Testing plan execution via _applyOperations...');
const plan = {
  operations: [
    { action: 'move', gate: 'T', from_step: 1, step: 5, targets: [0] }
  ]
};
copilot._applyOperations(plan);
assert.strictEqual(ui.grid[0][1], null);
assert.strictEqual(ui.grid[0][5], 'T');
console.log(' _applyOperations move execution passed!\n');

console.log('🎉 ALL FRONTEND VOICE MOVEMENT EXECUTION TESTS PASSED!');
