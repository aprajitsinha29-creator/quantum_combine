/**
 * path-recs.js is a browser IIFE with no exports (it must load via a plain
 * <script> tag), so it is loaded here into a vm context exactly as the browser
 * would run it. The bubble's internals are unreachable from outside its scope,
 * so the tests drive it through pre-seeded storage and the
 * 'ananta:gaps-updated' event, and assert against the fake DOM the script
 * renders into (createElement/textContent only — no innerHTML is implemented).
 *
 * The bubble itself is created by the script on document.body (fixed position,
 * upper right), so the harness must expose a body plus a working
 * querySelector('[data-gap-bubble]'), and capture setTimeout/clearTimeout to
 * verify the 1-minute auto-hide.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAPS_KEY = 'ananta_qpath_gaps_v1';
const UPDATE_EVENT = 'ananta:gaps-updated';

/** Minimal fake node: enough for the bubble's createElement/textContent build. */
function makeFakeElement(tagName) {
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attrs: {},
    textContent: '',
    style: {},
    className: '',
    onclick: null,
    href: '',
    setAttribute(key, value) {
      this.attrs[key] = value;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i !== -1) this.children.splice(i, 1);
    },
    get firstChild() {
      return this.children.length > 0 ? this.children[0] : null;
    },
  };
}

/**
 * Build a harness: loads path-recs.js into a vm context with a fake window,
 * localStorage, document (with a body) and captured timers, and exposes
 * helpers to re-dispatch the update event and read the bubble.
 */
function loadPathRecs({ gaps = null } = {}) {
  const listeners = new Map();
  const timers = [];
  let nextTimerId = 1;

  const storage = makeFakeLocalStorage();
  const body = makeFakeElement('body');
  const window = {};
  window.window = window;
  window.addEventListener = function (type, fn) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
  };
  window.dispatchEvent = function (event) {
    const fns = listeners.get(event.type) || [];
    for (const fn of [...fns]) fn(event);
    return fns.length > 0;
  };

  if (gaps !== null) {
    storage.setItem(GAPS_KEY, JSON.stringify(gaps));
  }

  const document = {
    body,
    documentElement: makeFakeElement('html'),
    createElement: (tag) => makeFakeElement(tag),
    querySelector(selector) {
      if (selector !== '[data-gap-bubble]') return null;
      return body.children.find((el) => el.attrs['data-gap-bubble'] !== undefined) || null;
    },
  };

  const setTimeout = (fn, ms) => {
    const id = nextTimerId++;
    timers.push({ id, fn, ms, cleared: false });
    return id;
  };
  const clearTimeout = (id) => {
    const timer = timers.find((t) => t.id === id);
    if (timer) timer.cleared = true;
  };

  const sandbox = {
    window,
    document,
    localStorage: storage,
    JSON,
    Math,
    Number,
    Object,
    Array,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'path-recs.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'path-recs.js' });

  return {
    body,
    storage,
    window,
    timers,
    dispatchUpdate() {
      window.dispatchEvent({ type: UPDATE_EVENT });
    },
    bubble() {
      return document.querySelector('[data-gap-bubble]');
    },
    /** Bubble children by class (class set via className in the script). */
    byClass(name) {
      const bubble = this.bubble();
      return bubble ? bubble.children.filter((el) => el.className === name) : [];
    },
    /** Invoke and clear one pending timer by its milliseconds value. */
    fireTimers(ms) {
      for (const timer of [...timers]) {
        if (timer.ms === ms && !timer.cleared) {
          timer.cleared = true;
          timer.fn();
        }
      }
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

const TITLE_CLASS = 'gap-bubble-title';
const TOPIC_CLASS = 'gap-bubble-topic';
const MODULE_CLASS = 'gap-bubble-module';
const LINK_CLASS = 'gap-bubble-link';
const CLOSE_CLASS = 'gap-bubble-close';

test('a newly transferred mapped skill pops with topic, module and a button', () => {
  // Start with no gaps so the IIFE initialises knownSkillIds to [].
  // Then inject a new gap and dispatch — the bubble should pop for the first skill.
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['microwave_rf', 'surface_codes'], at: 1 }));
  harness.dispatchUpdate();

  const bubble = harness.bubble();
  assert.ok(bubble, 'bubble is created on body');
  assert.equal(bubble.style.display, 'block');

  assert.equal(harness.byClass(TITLE_CLASS)[0].textContent, 'Recommended for your path');
  assert.equal(harness.byClass(TOPIC_CLASS)[0].textContent, 'Next topic: Microwave / RF engineering');
  const moduleLine = harness.byClass(MODULE_CLASS);
  assert.equal(moduleLine.length, 1);
  assert.equal(moduleLine[0].textContent, 'Module: Microwave Pulse Studio');

  const link = harness.byClass(LINK_CLASS)[0];
  assert.equal(link.tagName, 'A');
  assert.equal(link.href, '#pulse-studio');
  assert.equal(link.textContent, 'Open Microwave Pulse Studio');
});

test('a topic without a module shows only the topic name, without any button', () => {
  // 'python' has no Ananta studio; even though a mapped skill follows it, the
  // first fresh (most in-demand) topic decides whether the button exists.
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['python', 'qiskit'], at: 2 }));
  harness.dispatchUpdate();

  assert.equal(harness.byClass(TOPIC_CLASS)[0].textContent, 'Next topic: python');
  assert.equal(harness.byClass(MODULE_CLASS).length, 0);
  assert.equal(harness.byClass(LINK_CLASS).length, 0);
  assert.equal(harness.bubble().style.display, 'block');
});

test('no new skill means no bubble: malformed, hostile or empty storage is silent', () => {
  const badValues = [
    'not json at all {',
    '[1, 2, 3]',
    '"just a string"',
    '42',
    'null',
    '{"at": 1}',
    '{"skills": "surface_codes", "at": 1}',
    '{"skills": [1, 2, 3], "at": 1}',
    '{"skills": [{"bad": "object"}], "at": 1}',
    '{"skills": [], "at": 5}',
  ];
  for (const bad of badValues) {
    const harness = loadPathRecs();
    harness.storage.setItem(GAPS_KEY, bad);
    harness.dispatchUpdate();
    assert.equal(harness.bubble(), null, `bad storage value stays silent: ${bad}`);
  }

  // Same via the harness's own pre-seeding route (missing storage entirely).
  const missing = loadPathRecs();
  missing.dispatchUpdate();
  assert.equal(missing.bubble(), null);
});

test('a repeat list does not re-pop; a genuinely new skill does', () => {
  // Start empty so the IIFE's knownSkillIds is []. First update brings surface_codes.
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['surface_codes'], at: 3 }));
  harness.dispatchUpdate();
  assert.equal(harness.bubble().style.display, 'block');

  // Same list again: nothing repops.
  harness.dispatchUpdate();
  assert.equal(harness.bubble().style.display, 'block');

  // The bubble fires only on the first fresh skill — here the second update
  // carries an additional, new skill and the bubble is rebuilt for it.
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['surface_codes', 'cirq'], at: 4 }));
  harness.dispatchUpdate();
  assert.equal(harness.byClass(TOPIC_CLASS)[0].textContent, 'Next topic: Cirq');
  assert.equal(harness.byClass(LINK_CLASS)[0].href, '#transpiler');
});

test('the cross removes the bubble immediately', () => {
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['variational_algorithms'], at: 5 }));
  harness.dispatchUpdate();

  const cross = harness.byClass(CLOSE_CLASS)[0];
  assert.equal(cross.textContent, '×');
  assert.equal(cross.tagName, 'BUTTON');
  assert.equal(cross.attrs['aria-label'], 'Dismiss');
  assert.equal(typeof cross.onclick, 'function');

  cross.onclick();
  assert.equal(harness.bubble().style.display, 'none');
});

test('the bubble disappears automatically after one minute', () => {
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['stabilizer_formalism'], at: 6 }));
  harness.dispatchUpdate();
  assert.equal(harness.bubble().style.display, 'block');

  assert.equal(harness.timers.some((t) => t.ms === 60000), true, 'a 60 s hide timer is set');
  harness.fireTimers(60000);
  assert.equal(harness.bubble().style.display, 'none');
});

test('a fresh update restarts the one-minute window', () => {
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['qiskit'], at: 7 }));
  harness.dispatchUpdate();

  // Later skill arrives before the minute is up: the old timer is cleared so
  // the bubble now lives a full minute from the LAST update.
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['qiskit', 'cirq'], at: 8 }));
  harness.dispatchUpdate();

  const cleared = harness.timers.filter((t) => t.cleared);
  assert.equal(cleared.length, 1, 'the previous hide timer was cleared');
  assert.equal(harness.timers.some((t) => t.cleared === false && t.ms === 60000), true);

  harness.fireTimers(60000);
  assert.equal(harness.bubble().style.display, 'none');
});

test('hostile or unknown ids are never markup, and labels come from the mapping', () => {
  const hostile = '<img src=x onerror=alert(1)>';
  const harness = loadPathRecs();
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: [hostile], at: 9 }));
  harness.dispatchUpdate();

  // The fake elements expose no innerHTML at all: the script can only have
  // produced text nodes and attributes, and every rendered attribute value
  // comes from the hardcoded mapping, never from the payload.
  const seen = [];
  const walk = (el) => {
    assert.equal(el.innerHTML, undefined, 'no element may be built via innerHTML');
    seen.push(el.textContent, el.href || '', JSON.stringify(el.attrs));
    el.children.forEach(walk);
  };
  walk(harness.bubble());
  // The id may only ever reach a TEXT node (the topic line falls back to the
  // raw id for unmapped skills, safe as textContent). It must never become
  // markup: no href, attribute or tag carries it.
  assert.equal(seen.some((text) => text.includes('<img')), true, 'the raw id is only text');
  const hrefAttr = harness.bubble().children.map((el) => el.href || '').join('');
  const attrJson = JSON.stringify(harness.bubble().children.map((el) => el.attrs));
  assert.ok(!hrefAttr.includes('<img'));
  assert.ok(!attrJson.includes('<img'));
  assert.equal(harness.byClass(MODULE_CLASS).length, 0);
  assert.equal(harness.byClass(LINK_CLASS).length, 0);
});

