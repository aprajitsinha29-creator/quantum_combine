/**
 * careers-bridge.js is a browser IIFE with no exports (it must load via a
 * plain <script> tag), so it is loaded here into a vm context exactly as the
 * browser would run it. The bridge's internals are unreachable from outside
 * its function scope, so the tests drive it through events ('ananta:mission-
 * solved', 'ananta:achievement', 'qpath:ready') and assert against the
 * postMessage calls it captures from the fake Careers iframe.
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
function loadBridge({ missions = [], achievements = null } = {}) {
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
    storage.setItem('ananta_achievements_v1', JSON.stringify(achievements));
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

test('two surface_decode achievements earn surface_codes; one earns nothing', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'surface_decode');
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  postViaAchievements(harness, 'surface_decode');
  assert.deepEqual(hostCopy(harness.posts[1].payload.skills), ['surface_codes']);
});

test('one vqe_chem_acc achievement earns variational_algorithms', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'vqe_chem_acc');
  assert.deepEqual(hostCopy(harness.posts[0].payload.skills), ['variational_algorithms']);
});

test('unknown achievement id is ignored and sends nothing', () => {
  const harness = loadBridge();
  postViaAchievements(harness, 'totally_not_real');
  assert.equal(harness.posts.length, 0);
});

test('mission and achievement skills stack once both thresholds are met', () => {
  const harness = loadBridge();
  postViaMissions(harness, [2, 5]);
  postViaAchievements(harness, 'surface_decode');
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
    const harness = loadBridge();
    harness.storage.setItem('ananta_achievements_v1', bad);
    assert.doesNotThrow(() => {
      postViaAchievements(harness, 'surface_decode');
    }, `bad storage value: ${bad}`);
    // One fresh event must not be enough (required: 2), so state was empty.
    assert.deepEqual(hostCopy(harness.posts[0].payload.skills), []);
  }
});

test('achievement counts are capped in storage', () => {
  const harness = loadBridge({ achievements: { surface_decode: 100 } });
  postViaAchievements(harness, 'surface_decode');
  assert.equal(JSON.parse(harness.storage.getItem('ananta_achievements_v1')).surface_decode, 100);
});

test('messages are posted only to the exact QPath origin, never "*"', () => {
  const harness = loadBridge({ missions: [1, 4] });
  postViaMissions(harness, [1, 4]);
  postViaAchievements(harness, 'surface_decode');
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
