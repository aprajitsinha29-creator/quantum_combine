/**
 * Backend statevector simulator.
 *
 * Exists so the voice agent can answer numerical questions ("what's the
 * probability of 11?", "how entangled is qubit 0?") from an actual computation
 * instead of letting a language model invent plausible-looking numbers.
 *
 * Conventions deliberately mirror js/quantum-engine.js so the backend and the
 * on-screen circuit never disagree:
 *   - Big-endian qubit order: qubit 0 is the MOST significant bit, so basis
 *     index i has qubit q at bit (numQubits - 1 - q).
 *   - Grid is grid[qubit][column]; each column applies its CNOT (CX_CTRL +
 *     CX_TGT pair) first, then all single-qubit gates.
 *   - 'M' is a readout marker, not a unitary, so it is skipped.
 */

const SQRT1_2 = 1 / Math.SQRT2;

// Each gate is [[a,b],[c,d]] with entries as [re, im].
const GATES_1Q = {
  I: [[[1, 0], [0, 0]], [[0, 0], [1, 0]]],
  X: [[[0, 0], [1, 0]], [[1, 0], [0, 0]]],
  Y: [[[0, 0], [0, -1]], [[0, 1], [0, 0]]],
  Z: [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]],
  H: [[[SQRT1_2, 0], [SQRT1_2, 0]], [[SQRT1_2, 0], [-SQRT1_2, 0]]],
  S: [[[1, 0], [0, 0]], [[0, 0], [0, 1]]],
  T: [[[1, 0], [0, 0]], [[0, 0], [SQRT1_2, SQRT1_2]]]
};

function mulAdd(accRe, accIm, aRe, aIm, bRe, bIm) {
  return [accRe + aRe * bRe - aIm * bIm, accIm + aRe * bIm + aIm * bRe];
}

class StateVector {
  constructor(numQubits) {
    this.numQubits = numQubits;
    this.numStates = 1 << numQubits;
    this.re = new Float64Array(this.numStates);
    this.im = new Float64Array(this.numStates);
    this.re[0] = 1;
  }

  maskFor(qubit) {
    return 1 << (this.numQubits - 1 - qubit);
  }

  apply1Q(gateName, qubit) {
    const g = GATES_1Q[gateName];
    if (!g || qubit < 0 || qubit >= this.numQubits) return false;

    const mask = this.maskFor(qubit);
    const re = new Float64Array(this.numStates);
    const im = new Float64Array(this.numStates);

    for (let i = 0; i < this.numStates; i++) {
      const bit = (i & mask) ? 1 : 0;
      const partner = i ^ mask;
      const i0 = bit ? partner : i;
      const i1 = bit ? i : partner;

      // amplitude_out[i] = g[bit][0] * amp[i0] + g[bit][1] * amp[i1]
      let [accRe, accIm] = mulAdd(0, 0, g[bit][0][0], g[bit][0][1], this.re[i0], this.im[i0]);
      [accRe, accIm] = mulAdd(accRe, accIm, g[bit][1][0], g[bit][1][1], this.re[i1], this.im[i1]);
      re[i] = accRe;
      im[i] = accIm;
    }

    this.re = re;
    this.im = im;
    return true;
  }

  applyCNOT(control, target) {
    if (control === target || control < 0 || target < 0) return false;
    if (control >= this.numQubits || target >= this.numQubits) return false;

    const cMask = this.maskFor(control);
    const tMask = this.maskFor(target);

    for (let i = 0; i < this.numStates; i++) {
      const j = i ^ tMask;
      if ((i & cMask) && i < j) {
        let tr = this.re[i]; let ti = this.im[i];
        this.re[i] = this.re[j]; this.im[i] = this.im[j];
        this.re[j] = tr; this.im[j] = ti;
      }
    }
    return true;
  }

  applySWAP(qA, qB) {
    if (qA === qB) return false;
    const aMask = this.maskFor(qA);
    const bMask = this.maskFor(qB);

    for (let i = 0; i < this.numStates; i++) {
      const aBit = (i & aMask) ? 1 : 0;
      const bBit = (i & bMask) ? 1 : 0;
      if (aBit === bBit) continue;
      const j = i ^ aMask ^ bMask;
      if (i < j) {
        let tr = this.re[i]; let ti = this.im[i];
        this.re[i] = this.re[j]; this.im[i] = this.im[j];
        this.re[j] = tr; this.im[j] = ti;
      }
    }
    return true;
  }

  /**
   * Toffoli (CCX): flips the target only when BOTH controls are |1>. Distinct
   * from a single-control CNOT — a caller that only tracks "the last control
   * seen" silently simulates the wrong gate for a real Toffoli.
   */
  applyToffoli(controlA, controlB, target) {
    if (controlA === controlB || controlA === target || controlB === target) return false;
    if (controlA >= this.numQubits || controlB >= this.numQubits || target >= this.numQubits) return false;

    const aMask = this.maskFor(controlA);
    const bMask = this.maskFor(controlB);
    const tMask = this.maskFor(target);

    for (let i = 0; i < this.numStates; i++) {
      const j = i ^ tMask;
      if ((i & aMask) && (i & bMask) && i < j) {
        let tr = this.re[i]; let ti = this.im[i];
        this.re[i] = this.re[j]; this.im[i] = this.im[j];
        this.re[j] = tr; this.im[j] = ti;
      }
    }
    return true;
  }

  /** Basis-state probabilities, keyed by bitstring with qubit 0 leftmost. */
  probabilities() {
    const out = [];
    for (let i = 0; i < this.numStates; i++) {
      const p = this.re[i] * this.re[i] + this.im[i] * this.im[i];
      out.push({
        state: i.toString(2).padStart(this.numQubits, '0'),
        probability: p,
        amplitude: { re: this.re[i], im: this.im[i] }
      });
    }
    return out;
  }

  /**
   * Reduced single-qubit description via partial trace, expressed as a Bloch
   * vector. Eigenvalues of a one-qubit density matrix are (1 +/- r)/2 with
   * r the Bloch radius, so entropy and purity follow without eigendecomposition.
   */
  qubitReduced(qubit) {
    const mask = this.maskFor(qubit);
    let p0 = 0, p1 = 0, offRe = 0, offIm = 0;

    for (let i = 0; i < this.numStates; i++) {
      const amp2 = this.re[i] * this.re[i] + this.im[i] * this.im[i];
      if (i & mask) {
        p1 += amp2;
      } else {
        p0 += amp2;
        const j = i | mask;
        // rho01 = sum psi_{0,env} * conj(psi_{1,env})
        offRe += this.re[i] * this.re[j] + this.im[i] * this.im[j];
        offIm += this.im[i] * this.re[j] - this.re[i] * this.im[j];
      }
    }

    const x = 2 * offRe;
    const y = -2 * offIm;
    const z = p0 - p1;
    const r = Math.min(1, Math.sqrt(x * x + y * y + z * z));

    const lPlus = (1 + r) / 2;
    const lMinus = (1 - r) / 2;
    const term = (l) => (l > 1e-12 ? -l * Math.log2(l) : 0);

    return {
      qubit,
      prob0: p0,
      prob1: p1,
      bloch: { x, y, z },
      purity: (1 + r * r) / 2,
      entropy: term(lPlus) + term(lMinus)
    };
  }
}

/**
 * Executes a circuit grid, matching js/quantum-engine.js column semantics.
 * Returns the final state plus anything structurally wrong with the circuit,
 * so the agent can explain real problems rather than speculate.
 */
function simulateGrid(grid, numQubits) {
  const n = Math.max(1, Math.min(12, numQubits || (grid ? grid.length : 1)));
  const sv = new StateVector(n);
  const issues = [];
  let gateCount = 0;
  let depth = 0;

  if (!Array.isArray(grid) || grid.length === 0) {
    return { state: sv, gateCount: 0, depth: 0, issues: [{ code: 'EMPTY_CIRCUIT', message: 'The circuit has no gates yet — every qubit is still in |0>.' }] };
  }

  const numCols = grid[0] ? grid[0].length : 0;

  for (let col = 0; col < numCols; col++) {
    const controls = [];
    let target = -1, columnUsed = false;
    const swapWires = [];

    for (let q = 0; q < n; q++) {
      const cell = grid[q] ? grid[q][col] : null;
      if (cell === 'CX_CTRL') controls.push(q);
      else if (cell === 'CX_TGT') target = q;
      else if (cell === 'SWAP') swapWires.push(q);
    }

    // Two controls sharing a target is a Toffoli. Collapsing it to a single
    // control (keeping only the last one seen) would silently simulate the
    // wrong gate — a Toffoli only fires when BOTH controls are |1>.
    if (controls.length === 2 && target !== -1) {
      sv.applyToffoli(controls[0], controls[1], target);
      gateCount++;
      columnUsed = true;
    } else if (controls.length === 1 && target !== -1) {
      sv.applyCNOT(controls[0], target);
      gateCount++;
      columnUsed = true;
    } else if (controls.length > 0 || target !== -1) {
      issues.push({
        code: 'DANGLING_CNOT',
        column: col,
        message: `The controlled gate at time step ${col + 1} is missing its ${controls.length === 0 ? 'control' : 'target'} wire, so it does nothing.`
      });
    }

    if (swapWires.length === 2) {
      sv.applySWAP(swapWires[0], swapWires[1]);
      gateCount++;
      columnUsed = true;
    } else if (swapWires.length === 1) {
      issues.push({
        code: 'DANGLING_SWAP',
        column: col,
        message: `The SWAP at time step ${col + 1} only covers one wire; a SWAP needs exactly two.`
      });
    }

    for (let q = 0; q < n; q++) {
      const cell = grid[q] ? grid[q][col] : null;
      if (!cell || cell === 'CX_CTRL' || cell === 'CX_TGT' || cell === 'SWAP') continue;
      if (cell === 'M') { columnUsed = true; continue; }

      if (sv.apply1Q(cell, q)) {
        gateCount++;
        columnUsed = true;
      } else {
        issues.push({ code: 'UNKNOWN_GATE', column: col, qubit: q, message: `"${cell}" on qubit ${q} is not a gate this simulator knows.` });
      }
    }

    if (columnUsed) depth++;
  }

  if (gateCount === 0 && issues.length === 0) {
    issues.push({ code: 'EMPTY_CIRCUIT', message: 'The circuit has no gates yet — every qubit is still in |0>.' });
  }

  return { state: sv, gateCount, depth, issues };
}

/**
 * Full numerical snapshot the agent can quote from: probabilities, dominant
 * outcomes, per-qubit reduced state, and whether the register is entangled.
 */
function analyzeCircuit(grid, numQubits) {
  const { state, gateCount, depth, issues } = simulateGrid(grid, numQubits);
  const probabilities = state.probabilities();

  const significant = probabilities
    .filter(p => p.probability > 1e-9)
    .sort((a, b) => b.probability - a.probability);

  const qubits = [];
  for (let q = 0; q < state.numQubits; q++) qubits.push(state.qubitReduced(q));

  // A pure global state with mixed subsystems is entangled; entropy is the
  // standard witness, so use the largest single-qubit entropy.
  const maxEntropy = qubits.reduce((m, q) => Math.max(m, q.entropy), 0);

  return {
    numQubits: state.numQubits,
    gateCount,
    depth,
    issues,
    probabilities: significant,
    allProbabilities: probabilities,
    qubits,
    entangled: maxEntropy > 1e-6,
    maxSingleQubitEntropy: maxEntropy
  };
}

const GATE_NAMES = {
  H: 'Hadamard', X: 'Pauli-X', Y: 'Pauli-Y', Z: 'Pauli-Z',
  S: 'Phase (S)', T: 'π/8 Phase (T)', M: 'Measurement'
};

/**
 * Reads the actual gate composition out of a grid: which single-qubit gates
 * appear on which wires, and which columns pair up into a CNOT or SWAP. This
 * exists so a circuit's description can be built from what is really on the
 * board instead of guessed from a Dirac-notation string (which is how a
 * circuit with Hadamard, T and Y gates was once described as "Uniform
 * Superposition State" — only the H was ever looked at).
 */
function readGateComposition(grid, numQubits) {
  const n = Math.max(1, Math.min(12, numQubits || (grid ? grid.length : 1)));
  const numCols = grid && grid[0] ? grid[0].length : 0;
  const perWire = Array.from({ length: n }, () => []);
  const singleGateCounts = {};
  let cnotCount = 0;
  let toffoliCount = 0;
  let swapCount = 0;
  let totalGates = 0;

  for (let col = 0; col < numCols; col++) {
    const controls = [];
    let target = -1;
    const swapWires = [];

    for (let q = 0; q < n; q++) {
      const cell = grid[q] ? grid[q][col] : null;
      if (!cell) continue;
      if (cell === 'CX_CTRL') { controls.push(q); continue; }
      if (cell === 'CX_TGT') { target = q; continue; }
      if (cell === 'SWAP') { swapWires.push(q); continue; }
      if (cell === 'M') { perWire[q].push('M'); continue; }
      perWire[q].push(cell);
      singleGateCounts[cell] = (singleGateCounts[cell] || 0) + 1;
      totalGates++;
    }

    // Two controls sharing one target is a Toffoli, not a second CNOT —
    // reporting it as "CNOT ×2" would describe the wrong gate.
    if (controls.length === 2 && target !== -1) {
      perWire[controls[0]].push(`Toffoli-ctrl→q${target}`);
      perWire[controls[1]].push(`Toffoli-ctrl→q${target}`);
      perWire[target].push(`Toffoli-tgt←q${controls[0]},q${controls[1]}`);
      toffoliCount++;
      totalGates++;
    } else if (controls.length === 1 && target !== -1) {
      perWire[controls[0]].push(`CNOT→q${target}`);
      perWire[target].push(`CNOT←q${controls[0]}`);
      cnotCount++;
      totalGates++;
    }
    if (swapWires.length === 2) {
      perWire[swapWires[0]].push(`SWAP↔q${swapWires[1]}`);
      perWire[swapWires[1]].push(`SWAP↔q${swapWires[0]}`);
      swapCount++;
      totalGates++;
    }
  }

  const distinctSingleGates = Object.keys(singleGateCounts);
  return { perWire, singleGateCounts, distinctSingleGates, cnotCount, toffoliCount, swapCount, totalGates };
}

/**
 * A canonical Bell pair, gate-exact: an H on exactly one wire and a CNOT
 * controlled by that same wire, on a 2-qubit register, nothing else. GHZ is
 * the 3-qubit chain of that same pattern. Anything else gets an honest
 * generic description rather than a guessed label.
 */
function detectCanonicalPattern(composition) {
  const { singleGateCounts, cnotCount, swapCount, perWire } = composition;
  const onlyH = Object.keys(singleGateCounts).every(g => g === 'H') && (singleGateCounts.H || 0) >= 1;
  if (!onlyH || swapCount > 0) return null;

  // Count wires that actually carry a gate, not the register's total width —
  // a 2-qubit Bell pair built inside a wider register (idle spare wires) is
  // still a Bell pair.
  const activeWires = perWire.filter(ops => ops.length > 0).length;

  if (activeWires === 2 && singleGateCounts.H === 1 && cnotCount === 1) return 'bell';
  if (activeWires === 3 && singleGateCounts.H === 1 && cnotCount === 2) return 'ghz';
  return null;
}

/**
 * Builds an honest circuit description from real simulation plus the actual
 * gate composition — the pairing this module exists for. Only used as the
 * deterministic fallback when no AI provider answers; the AI path already
 * reasons over the real grid and does not need this.
 */
function describeCircuit(grid, numQubits) {
  const analysis = analyzeCircuit(grid, numQubits);
  const composition = readGateComposition(grid, analysis.numQubits);

  const structural = analysis.issues.filter(i => i.code !== 'EMPTY_CIRCUIT');
  if (structural.length) {
    return {
      summary: 'Incomplete Circuit',
      purpose: structural.map(i => i.message).join(' '),
      entanglementAnalysis: 'Not applicable until the circuit above is fixed.',
      analysis
    };
  }

  if (composition.totalGates === 0) {
    return {
      summary: 'Empty Circuit (Ground State)',
      purpose: `All ${analysis.numQubits} qubits are in the ground state |${'0'.repeat(analysis.numQubits)}⟩. Add gates from the palette to begin.`,
      entanglementAnalysis: 'Not applicable — no gates have been placed yet.',
      analysis
    };
  }

  const pattern = detectCanonicalPattern(composition);
  let summary, purpose;

  if (pattern === 'bell') {
    summary = 'Bell State Preparation (Bipartite Entanglement)';
    purpose = 'A Hadamard puts one qubit into superposition, then a CNOT entangles it with the second qubit, producing a maximally entangled EPR pair. Used in quantum key distribution and teleportation.';
  } else if (pattern === 'ghz') {
    summary = 'GHZ State (Tripartite Entanglement)';
    purpose = 'A Hadamard followed by a chain of two CNOTs spreads superposition across all three qubits into a single maximally entangled state. Used in quantum secret sharing and metrology.';
  } else {
    const gateParts = composition.distinctSingleGates
      .map(g => `${GATE_NAMES[g] || g} (×${composition.singleGateCounts[g]})`);
    if (composition.cnotCount) gateParts.push(`CNOT (×${composition.cnotCount})`);
    if (composition.toffoliCount) gateParts.push(`Toffoli (×${composition.toffoliCount})`);
    if (composition.swapCount) gateParts.push(`SWAP (×${composition.swapCount})`);

    summary = `Custom ${analysis.numQubits}-Qubit Circuit: ${composition.distinctSingleGates.concat(
      composition.cnotCount ? ['CNOT'] : [],
      composition.toffoliCount ? ['Toffoli'] : [],
      composition.swapCount ? ['SWAP'] : []
    ).join(', ')}`;
    purpose = `Applies ${gateParts.join(', ')} across a ${analysis.numQubits}-qubit register (depth ${analysis.depth}). ` +
      (analysis.entangled
        ? `The resulting state is entangled — measuring one qubit affects the others.`
        : `The resulting state is separable — each qubit can be described independently.`);
  }

  const entanglementAnalysis = analysis.entangled
    ? `Entangled: the largest single-qubit entropy is ${analysis.maxSingleQubitEntropy.toFixed(2)} ebits, so at least one pair of qubits cannot be described independently.`
    : 'Separable: every qubit is in a definite pure state independent of the others (entropy ≈ 0).';

  return { summary, purpose, entanglementAnalysis, analysis };
}

module.exports = { StateVector, simulateGrid, analyzeCircuit, describeCircuit, readGateComposition, GATES_1Q };
