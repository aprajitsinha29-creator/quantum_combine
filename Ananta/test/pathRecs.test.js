/**
 * path-recs.js is a browser IIFE with no exports (it must load via a plain
 * <script> tag), so it is loaded here into a vm context exactly as the browser
 * would run it. The strip's internals are unreachable from outside its scope,
 * so the tests drive it through pre-seeded storage and the
 * 'ananta:gaps-updated' event, and assert against the fake DOM the script
 * renders into (createElement/textContent only — no innerHTML is implemented).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAPS_KEY = 'ananta_qpath_gaps_v1';
const UPDATE_EVENT = 'ananta:gaps-updated';

/** Minimal node: enough for the strip's createElement/textContent rendering. */
function makeFakeElement(tagName) {
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attrs: {},
    textContent: '',
    hidden: false,
    style: {},
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
 * Build a harness: loads path-recs.js into a vm context with a fake window,
 * localStorage and document, and exposes the strip container the script
 * renders into plus helpers to re-dispatch the update event.
 */
function loadPathRecs({ gaps = null, readyState = 'complete' } = {}) {
  const fakeWindow = makeFakeWindow();
  fakeWindow.window = fakeWindow;
  const storage = makeFakeLocalStorage();
  const container = makeFakeElement('div');

  if (gaps !== null) {
    storage.setItem(GAPS_KEY, JSON.stringify(gaps));
  }

  const document = {
    readyState,
    querySelector(selector) {
      if (selector === '#path-recs') return container;
      return null;
    },
    createElement: (tag) => makeFakeElement(tag),
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded' && document.readyState !== 'loading') return;
      documentListeners.push({ type, fn });
    },
  };
  const documentListeners = [];

  const sandbox = { window: fakeWindow, localStorage: storage, document, JSON, Math, Number, Object, Array };
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'path-recs.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'path-recs.js' });

  return {
    container,
    storage,
    window: fakeWindow,
    documentListeners,
    dispatchUpdate() {
      fakeWindow.dispatchEvent({ type: UPDATE_EVENT });
    },
  };
}

/** Spawn links rendered by the strip (elements with an href attribute-like field). */
function renderedLinks(container) {
  return container.children.filter((el) => typeof el.href === 'string' && el.href.startsWith('#'));
}

test('unknown ids are dropped; known ones render as their studio link', () => {
  const harness = loadPathRecs({ gaps: { skills: ['totally_unknown', 'surface_codes'], at: 1 } });
  const links = renderedLinks(harness.container);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, '#surface-code');
  assert.equal(links[0].textContent, 'Surface Code Studio — Surface codes');
  assert.equal(harness.container.hidden, false);
});

test('skills are grouped one entry per tab, ordered by first appearance', () => {
  const harness = loadPathRecs({
    gaps: { skills: ['pulse_control', 'surface_codes', 'microwave_rf'], at: 2 },
  });
  const links = renderedLinks(harness.container);
  assert.deepEqual(
    links.map((l) => l.href),
    ['#pulse-studio', '#surface-code'],
  );
  assert.equal(links[0].textContent, 'Microwave Pulse Studio — Pulse-level control & calibration, Microwave / RF engineering');
});

test('duplicates are removed and grouped into a single entry', () => {
  const harness = loadPathRecs({ gaps: { skills: ['qiskit', 'qiskit', 'cirq', 'qiskit'], at: 3 } });
  const links = renderedLinks(harness.container);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, '#transpiler');
  assert.equal(links[0].textContent, 'Universal Transpiler & AI Doctor — Qiskit, Cirq');
});

test('the strip is capped at four entries even when five tabs are covered', () => {
  const harness = loadPathRecs({
    gaps: {
      skills: [
        'surface_codes',
        'pulse_control',
        'variational_algorithms',
        'qiskit',
        'quantum_mechanics',
      ],
      at: 4,
    },
  });
  const links = renderedLinks(harness.container);
  assert.equal(links.length, 4);
  assert.deepEqual(links.map((l) => l.href), [
    '#surface-code',
    '#pulse-studio',
    '#vqe-chemistry',
    '#transpiler',
  ]);
});

test('an empty skills array hides the strip', () => {
  const harness = loadPathRecs({ gaps: { skills: [], at: 5 } });
  assert.equal(harness.container.hidden, true);
  assert.equal(harness.container.style.display, 'none');
  assert.equal(renderedLinks(harness.container).length, 0);
});

test('malformed or hostile storage values are treated as empty', () => {
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
  ];
  for (const bad of badValues) {
    const harness = loadPathRecs();
    harness.storage.setItem(GAPS_KEY, bad);
    harness.dispatchUpdate();
    assert.equal(harness.container.hidden, true, `bad storage value: ${bad}`);
    assert.equal(harness.container.style.display, 'none');
  }
});

test("missing storage means no strip until an event arrives", () => {
  const harness = loadPathRecs();
  assert.equal(harness.container.hidden, true);
  harness.dispatchUpdate();
  assert.equal(harness.container.hidden, true);
  harness.storage.setItem(GAPS_KEY, JSON.stringify({ skills: ['cirq'], at: 6 }));
  harness.dispatchUpdate();
  assert.equal(harness.container.hidden, false);
  assert.equal(renderedLinks(harness.container)[0].href, '#transpiler');
});

test('a markup-injection id is never rendered as markup and unknown ids render nothing', () => {
  const hostile = '<img src=x onerror=alert(1)>';
  const harness = loadPathRecs({ gaps: { skills: [hostile, 'surface_codes'], at: 7 } });
  const links = renderedLinks(harness.container);
  assert.equal(links.length, 1);

  // The fake elements expose no innerHTML at all: the script can only have
  // produced text nodes and attributes, and every rendered attribute value
  // comes from the hardcoded mapping, never from the payload.
  const seen = [];
  const walk = (el) => {
    assert.equal(el.innerHTML, undefined, 'no element may be built via innerHTML');
    seen.push(el.textContent, el.href || '', JSON.stringify(el.attrs));
    el.children.forEach(walk);
  };
  walk(harness.container);
  assert.ok(seen.every((text) => !text.includes('<img')));
});

test('render waits for DOMContentLoaded when the document is still loading', () => {
  const harness = loadPathRecs({
    gaps: { skills: ['surface_codes'], at: 8 },
    readyState: 'loading',
  });
  // Nothing rendered synchronously; the DOMContentLoaded listener must exist.
  assert.equal(harness.container.children.length, 0);
  assert.ok(harness.documentListeners.some((l) => l.type === 'DOMContentLoaded'));
});
