/**
 * vqe-chemistry.js regression tests, run in a vm context like the other
 * browser-script tests. Two things are pinned here:
 *
 * 1. The UCCSD ansatz expectation <X0X1 + Y0Y1> was halved (-2 vs the correct
 *    -4*sin*cos*cos(t2)), which put a ~7.7 mHa floor on |E - E_exact| and made
 *    the 1.6 mHa chemical-accuracy threshold mathematically unreachable on
 *    every molecule. The reachable minimum must now be well BELOW the
 *    threshold, and the accuracy window in theta1 must be WIDER than the
 *    0.01 rad slider step (Step 12's stop-condition check).
 *
 * 2. The vqe_chem_acc achievement fires ONLY inside the theta1 slider's own
 *    oninput handler: an outside(>1.6mHa)->inside(<=1.6mHa) transition with
 *    noise OFF, once per page load. Auto-Optimize writes
 *    theta1Slider.value programmatically and refreshes the stored "previous
 *    error" when it finishes, so an optimizer run followed by a tiny manual
 *    nudge must fire nothing (Step 12).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NOISE_OFF = false;

function makeSandbox() {
  const sandbox = { console };
  sandbox.window = sandbox;
  const canvasStub = {
    width: 0, height: 0, parentElement: { clientWidth: 560 },
    getContext: () => new Proxy({}, { get: () => () => {} }),
  };
  const elements = new Map();
  sandbox.document = {
    getElementById: (id) => {
      if (id === 'vqe-pes-canvas') return canvasStub;
      if (!elements.has(id)) elements.set(id, { style: {} });
      return elements.get(id);
    },
  };
  sandbox.CustomEvent = function CustomEvent(type, opts) {
    this.type = type;
    this.detail = opts && opts.detail;
  };
  sandbox.addEventListener = () => {};
  const fired = [];
  sandbox.dispatchEvent = (event) => { fired.push(event.detail.id); return true; };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js', 'vqe-chemistry.js'), 'utf8'),
    sandbox,
    { filename: 'vqe-chemistry.js' },
  );
  const Studio = sandbox.window.VQEChemistryStudio;
  function freshStudio() {
    const studio = new Studio();
    studio.attachEvents();
    return studio;
  }
  return { Studio, freshStudio, fired };
}

// theta2 = 0 puts the chemical-accuracy window near theta1 = +1.457 rad
// (theta2 = -pi mirrors it). The window is about ±0.045 rad wide.
const IN_WINDOW_T1 = '1.457';
const OUTSIDE_T1 = '0';

test('chemical accuracy is reachable: min over (theta1, theta2) is far below 1.6 mHa', () => {
  const { Studio } = makeSandbox();
  const studio = new Studio();
  for (const id of ['H2', 'HeH+']) {
    studio.selectedMolecule = id;
    const mol = studio.molecules[id];
    let best = Infinity;
    for (let t1 = -3.1415; t1 <= 3.1415; t1 += 0.002) {
      for (let t2 = -3.1415; t2 <= 3.1415; t2 += 0.05) {
        best = Math.min(best, Math.abs(
          studio.calculateEnergy(t1, t2, mol.eqBond) - studio.getExactEnergy(mol.eqBond),
        ));
      }
    }
    assert.ok(best < 0.0015, `${id}: min |dE| ${(best * 1000).toFixed(3)} mHa must be under 1.5 mHa`);
  }
});

test('chemical-accuracy window in theta1 is wider than the 0.01 rad slider step', () => {
  const { Studio } = makeSandbox();
  const studio = new Studio();
  const tol = 0.0016;
  const ok = (t) => Math.abs(
    studio.calculateEnergy(t, 0, studio.bondDistance) - studio.getExactEnergy(studio.bondDistance),
  ) <= tol;
  // march from a point known to be inside the window (theta2 = 0 branch)
  const inside = 1.457;
  let lo = inside, hi = inside;
  for (let t = inside; ok(t) && t > -3.2; t -= 0.0005) lo = t;
  for (let t = inside; ok(t) && t < 3.2; t += 0.0005) hi = t;
  assert.ok(hi - lo > 0.01, `window ${(hi - lo).toFixed(4)} rad must exceed the 0.01 rad slider step`);
});

test('manual theta1 input crossing into the window fires vqe_chem_acc exactly once', () => {
  const { freshStudio, fired } = makeSandbox();
  const studio = freshStudio();
  studio.chemAccuracyReported = false;
  studio.noiseEnabled = NOISE_OFF;
  studio.theta1 = 0;
  studio.updateAll(); // initial render: far out of the window
  studio.theta1Slider.oninput({ target: { value: IN_WINDOW_T1 } });
  assert.deepEqual(fired, ['vqe_chem_acc']);
});

test('a programmatic theta1 write (Auto-Optimize path) fires nothing', () => {
  const { freshStudio, fired } = makeSandbox();
  const studio = freshStudio();
  studio.chemAccuracyReported = false;
  studio.noiseEnabled = NOISE_OFF;
  studio.theta1 = 0;
  studio.updateAll();
  // what startAutoOptimization does: set this.theta1 directly, write
  // theta1Slider.value (element stub has no handlers; the point is no
  // oninput fires), then updateAll()
  studio.theta1 = parseFloat(IN_WINDOW_T1);
  studio.updateAll();
  assert.equal(fired.length, 0);
});

test('auto-optimize followed by a tiny slider nudge fires nothing', () => {
  const { freshStudio, fired } = makeSandbox();
  const studio = freshStudio();
  studio.chemAccuracyReported = false;
  studio.noiseEnabled = NOISE_OFF;
  studio.theta1 = 0;
  studio.updateAll();
  // optimizer lands in the window; its finish path refreshes the stored
  // previous error (what startAutoOptimization does on its last step)
  studio.theta1 = parseFloat(IN_WINDOW_T1);
  studio.updateAll();
  studio._lastErrorHa = Math.abs(
    studio.calculateEnergy(studio.theta1, studio.theta2, studio.bondDistance)
    - studio.getExactEnergy(studio.bondDistance),
  );
  // one-step nudge of the slider step size, still inside the window
  studio.theta1Slider.oninput({ target: { value: '1.46' } });
  assert.equal(fired.length, 0, 'the previous error was already in the window');
});

test('noise ON never fires the achievement', () => {
  const { freshStudio, fired } = makeSandbox();
  const studio = freshStudio();
  studio.chemAccuracyReported = false;
  studio.noiseEnabled = true;
  studio.theta1 = 0;
  studio.updateAll();
  studio.theta1Slider.oninput({ target: { value: IN_WINDOW_T1 } });
  assert.equal(fired.length, 0);
});

test('the achievement resumption is latched once per page load', () => {
  const { freshStudio, fired } = makeSandbox();
  const studio = freshStudio();
  studio.chemAccuracyReported = false;
  studio.noiseEnabled = NOISE_OFF;
  studio.theta1 = 0;
  studio.updateAll();
  studio.theta1Slider.oninput({ target: { value: IN_WINDOW_T1 } });
  // slide away and back into the window again
  studio.theta1Slider.oninput({ target: { value: OUTSIDE_T1 } });
  studio.theta1Slider.oninput({ target: { value: IN_WINDOW_T1 } });
  assert.equal(fired.length, 1);
});
