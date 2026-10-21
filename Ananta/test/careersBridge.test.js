/**
 * careers-bridge.js is a browser IIFE with no exports (it must load via a
 * plain <script> tag), so it is loaded here into a vm context exactly as the
 * browser would run it. The bridge's internals are unreachable from outside
 * its function scope, so the tests drive it through events ('ananta:mission-
 * solved', 'ananta:achievement', 'ananta:module-passed', 'qpath:ready') and
 * assert against the postMessage calls it captures from the fake Careers
 * iframe.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const QPATH_ORIGIN = 'http://localhost:5173';

function makeFakeWindow() {
  const listeners = new Map();
  return {
    window: null,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      const fns = listeners.get(event.type) || [];
      for (const fn of [...fns]) fn(event);
      return fns.length > 0;
    },
  };
}

function makeFakeLocalStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

/**
 * Build a harness: loads the bridge into a vm context with a fake window,
 * localStorage and document, and returns handles for driving it.
 * posts: array of { payload, targetOrigin } captured from the fake iframe.
 */
function loadBridge({
  missions = [],
  achievements = null,
  passedModules = null,
  v1Achievements = null,
} = {}) {
  const fakeWindow = makeFakeWindow();
  const storage = makeFakeLocalStorage();
  const posts = [];
  // The captured child window must be a stable identity: the bridge checks
  // that inbound message sources are exactly this frame's contentWindow.
  const childWindow = {
    postMessage: (payload, targetOrigin) => {
      posts.push({ payload, targetOrigin });
    },
  };
  const document = {
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector(selector) {
      if (selector !== '#view-careers iframe') return null;
      return { contentWindow: childWindow };
    },
  };
  fakeWindow.window = fakeWindow;

  if (missions.length > 0) {
    storage.setItem('ananta_completed_missions_v2', JSON.stringify(missions));
  }
  if (achievements !== null) {
    storage.setItem('ananta_achievements_v2', JSON.stringify(achievements));
  }
  if (passedModules !== null) {
    storage.setItem('ananta_roadmap_passed_v1', JSON.stringify(passedModules));
  }
  if (v1Achievements !== null) {
    // Simulates the old weak-trigger data still sitting in storage.
    storage.setItem('ananta_achievements_v1', JSON.stringify(v1Achievements));
  }

  const sandbox = {
    window: fakeWindow,
    localStorage: storage,
    document,
    JSON, Math, Number, Object, Array,
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'careers-bridge.js'),
    'utf8',
  );
  vm.runInContext(source, sandbox, { filename: 'careers-bridge.js' });

  const rawStorage = storage;
  return {
    posts,
    storage: rawStorage,
    window: fakeWindow,
    // Simulate the inbound handshake exactly as the browser delivers it:
    // a 'message' event with origin and source properties on the event itself.
    deliverReady({ origin = QPATH_ORIGIN, source = null } = {}) {
      fakeWindow.dispatchEvent({
        type: 'message',
        origin,
        data: { type: 'qpath:ready' },
        source: source === null ? childWindow : source,
      });
    },
  };
}

/**
 * An array produced inside the vm realm has a different Array.prototype than
 * the test realm, which deepStrictEqual treats as unequal; copying it into
 * the host realm first keeps the strict comparison.
 */
function hostCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Drive the bridge the way Ananta's mission code does: set storage, then fire. */
function postViaMissions(harness, missions) {
  harness.storage.setItem('ananta_completed_missions_v2', JSON.stringify(missions));
  harness.window.dispatchEvent({ type: 'ananta:mission-solved' });
}

function postViaAchievements(harness, id) {
  harness.window.dispatchEvent({ type: 'ananta:achievement', detail: { id } });
}

function postViaModulePassed(harness, id) {
  harness.window.dispatchEvent({ type: 'ananta:module-passed', detail: { id } });
}

test('missions [1, 4] earn quantum_mechanics', () => {
  const harness = loadBridge();
  postViaMissions(harness, [1, 4]);
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), ['quantum_mechanics']);
  assert.deepEqual(hostCopy(harness.posts[0].payload.missions), [1, 4]);
});

test('mission 1 alone earns nothing', () => {
  const harness = loadBridge();
  postViaMissions(harness, [1]);
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
});

test('mission 3 alone earns nothing', () => {
  const harness = loadBridge();
  postViaMissions(harness, [3]);
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
});

test('missions [1, 4, 2, 5] earn BOTH mission skills (old behaviour regression)', () => {
  const harness = loadBridge();
  postViaMissions(harness, [1, 4, 2, 5]);
  assert.deepEqual(hostCopy(hostCopy(harness.posts[0].payload.skills).sort()), [
    'quantum_information',
    'quantum_mechanics',
  ]);
});

test('module-12 passed alone earns nothing', () => {
  const harness = loadBridge();
  postViaModulePassed(harness, 'module-12');
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  assert.deepEqual(JSON.parse(harness.storage.getItem('ananta_roadmap_passed_v1')),
    { 'module-12': true });
});

test('one surface_decode achievement alone earns nothing', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'surface_decode');
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
});

test('module-12 passed AND surface_decode achieve surface_codes', () => {
  const harness = loadBridge();
  postViaModulePassed(harness, 'module-12');
  postViaAchievements(harness, 'surface_decode');
  assert.equal(harness.posts.length, 2);
  assert.deepEqual(hostCopy(harness.posts[1].payload.skills), ['surface_codes']);
});

test('module-10 passed AND vqe_chem_acc achieve variational_algorithms', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'vqe_chem_acc');
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  postViaModulePassed(harness, 'module-10');
  assert.deepEqual(hostCopy(harness.posts[1].payload.skills), ['variational_algorithms']);
});

test('unknown module id is ignored and sends nothing', () => {
  const harness = loadBridge();
  postViaModulePassed(harness, 'module-999');
  postViaModulePassed(harness, 'totally_not_real');
  assert.equal(harness.posts.length, 0);
  assert.equal(harness.storage.getItem('ananta_roadmap_passed_v1'), null);
});

test('unknown achievement id is ignored and sends nothing', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'totally_not_real');
  assert.equal(harness.posts.length, 0);
});

test('mission and all-of rules stack once every requirement is met', () => {
  const harness = loadBridge();
  postViaMissions(harness, [2, 5]);
  postViaModulePassed(harness, 'module-12');
  postViaAchievements(harness, 'surface_decode');
  const skills = hostCopy(harness.posts[2].payload.skills);
  assert.ok(skills.includes('quantum_information'));
  assert.ok(skills.includes('surface_codes'));
});

test('malformed achievement storage never throws and counts as empty', () => {
  const badValues = [
    'not json at all {',
    '[1, 2, 3]',
    '{"surface_decode": "two"}',
    '{"surface_decode": -1}',
    '{"surface_decode": 1.5}',
    '{"surface_decode": null}',
    '42',
    'null',
  ];
  for (const bad of badValues) {
    // The module half is already passed, so a parsed count of 1 WOULD earn the
    // skill: only broken storage must keep it unearned. The 'qpath:ready'
    // handshake only READS storage, so nothing first repairs the bad value.
    const harness = loadBridge({ passedModules: { 'module-12': true } });
    harness.storage.setItem('ananta_achievements_v2', bad);
    assert.doesNotThrow(() => {
      harness.deliverReady();
    }, `bad storage value: ${bad}`);
    assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  }
});

test('malformed module storage never throws and counts as empty', () => {
  const badValues = [
    'not json at all {',
    '[1, 2, 3]',
    '{"module-12": "yes"}',
    '{"module-12": 1}',
    '{"module-12": null}',
    '42',
    'null',
  ];
  for (const bad of badValues) {
    // One surface_decode achievement is already stored, so a parsed { module-12:
    // true } WOULD earn the skill: only broken storage must keep it unearned.
    // The handshake only READS storage, so nothing first repairs the bad value.
    const harness = loadBridge({ achievements: { surface_decode: 1 } });
    harness.storage.setItem('ananta_roadmap_passed_v1', bad);
    assert.doesNotThrow(() => {
      harness.deliverReady();
    }, `bad storage value: ${bad}`);
    assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  }
});

test('stored v1 achievement counts are ignored', () => {
  const harness = loadBridge({
    passedModules: { 'module-12': true },
    v1Achievements: { surface_decode: 5, vqe_chem_acc: 3 },
  });
  postViaModulePassed(harness, 'module-12');
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  // The v2 store starts empty because the bridge never reads v1; the v1 data
  // itself is left untouched (the bridge never clears anything).
  assert.equal(harness.storage.getItem('ananta_achievements_v2'), null);
  assert.deepEqual(JSON.parse(harness.storage.getItem('ananta_achievements_v1')),
    { surface_decode: 5, vqe_chem_acc: 3 });
  // A pure progress post again confirms no skill is fed by the stale counts.
  harness.deliverReady();
  assert.deepEqual(hostCopy(harness.posts[1].payload.skills), []);
});

test('achievement counts are capped in storage', () => {
  const harness = loadBridge({ achievements: { surface_decode: 100 } });
  postViaAchievements(harness, 'surface_decode');
  assert.equal(JSON.parse(harness.storage.getItem('ananta_achievements_v2')).surface_decode, 100);
});

test('messages are posted only to the exact QPath origin, never "*"', () => {
  const harness = loadBridge({ missions: [1, 4] });
  postViaMissions(harness, [1, 4]);
  postViaModulePassed(harness, 'module-12');
  postViaAchievements(harness, 'surface_decode');
  assert.ok(harness.posts.length > 0);
  for (const post of harness.posts) {
    assert.equal(post.targetOrigin, 'http://localhost:5173');
    assert.notEqual(post.targetOrigin, '*');
  }
});

test("qpath:ready from a wrong origin is ignored", () => {
  const harness = loadBridge({ missions: [1, 4] });
  harness.deliverReady({ origin: 'http://evil.example.com' });
  assert.equal(harness.posts.length, 0);
});

test("qpath:ready from a wrong source window is ignored", () => {
  const harness = loadBridge({ missions: [1, 4] });
  harness.deliverReady({ source: 'stranger' });
  assert.equal(harness.posts.length, 0);
});

test('qpath:ready from the real iframe triggers a progress post', () => {
  const harness = loadBridge({ missions: [1, 4] });
  harness.deliverReady();
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), ['quantum_mechanics']);
});
