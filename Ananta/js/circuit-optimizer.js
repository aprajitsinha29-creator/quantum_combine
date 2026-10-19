/**
 * Ananta Circuit Optimizer, Hardware Topology Mapper & Noise Estimator
 *
 * Every rewrite in here is verified, not asserted: after a pass runs, the
 * optimized grid is simulated on a fresh engine and compared against the
 * original with real state fidelity F = |<psi_1|psi_2>|^2. If a pass would
 * change the physics, it is rejected and the original circuit is kept. That
 * check is what separates a real transpiler from a cosmetic one - an
 * "optimization" that silently alters the answer is worse than no
 * optimization at all.
 *
 * Nothing here pattern-matches named circuits. The passes are algebraic
 * identities that hold for any circuit:
 *   - involutory cancellation:  U . U = I   for U in {X, Y, Z, H, CNOT, CZ, SWAP}
 *   - phase-gate merging:       P(a) . P(b) = P(a+b)   (T.T = S, S.S = Z, ...)
 *   - rotation merging:         R_k(a) . R_k(b) = R_k(a+b)
 *   - identity-rotation drop:   R_k(0) = I,  P(0) = I
 *   - column compaction:        gates slide left into empty time slots
 */

class CircuitOptimizer {
  /** Marker tokens that occupy a wire but are not single-qubit unitaries. */
  static MULTI_WIRE_TOKENS = ['CX_CTRL', 'CX_TGT', 'SWAP', 'CZ'];

  static isMultiWire(cell) {
    if (!cell) return false;
    if (CircuitOptimizer.MULTI_WIRE_TOKENS.includes(cell)) return true;
    const parsed = window.QuantumCircuitEngine.parseGateToken(cell);
    return Boolean(parsed && parsed.name === 'CP');
  }

  static isEmpty(cell) {
    return !cell || cell === '';
  }

  static cloneGrid(grid) {
    return grid.map((row) => row.slice());
  }

  /**
   * Describes what multi-qubit operation (if any) occupies a column, so
   * passes can reason about a two-qubit gate as a single object rather than
   * as disconnected wire markers.
   */
  static readColumn(grid, col) {
    const controls = [];
    let target = -1;
    const swap = [];
    const cz = [];
    const cp = [];
    let cpAngle = null;

    for (let q = 0; q < grid.length; q++) {
      const cell = grid[q][col];
      if (cell === 'CX_CTRL') controls.push(q);
      else if (cell === 'CX_TGT') target = q;
      else if (cell === 'SWAP') swap.push(q);
      else if (cell === 'CZ') cz.push(q);
      else {
        const parsed = window.QuantumCircuitEngine.parseGateToken(cell);
        if (parsed && parsed.name === 'CP') { cp.push(q); cpAngle = parsed.angle; }
      }
    }

    if (controls.length === 2 && target !== -1) return { kind: 'TOFFOLI', wires: [...controls, target].sort((a, b) => a - b), controls, target };
    if (controls.length === 1 && target !== -1) return { kind: 'CNOT', wires: [controls[0], target].sort((a, b) => a - b), controls, target };
    if (swap.length === 2) return { kind: 'SWAP', wires: swap.slice().sort((a, b) => a - b) };
    if (cz.length === 2) return { kind: 'CZ', wires: cz.slice().sort((a, b) => a - b) };
    if (cp.length === 2) return { kind: 'CP', wires: cp.slice().sort((a, b) => a - b), angle: cpAngle };
    return null;
  }

  /** Every column index that has at least one non-empty cell. */
  static activeColumns(grid) {
    const cols = [];
    const numCols = grid[0] ? grid[0].length : 0;
    for (let c = 0; c < numCols; c++) {
      if (grid.some((row) => !CircuitOptimizer.isEmpty(row[c]))) cols.push(c);
    }
    return cols;
  }

  static gateCount(grid) {
    let single = 0, multi = 0;
    const numCols = grid[0] ? grid[0].length : 0;
    for (let c = 0; c < numCols; c++) {
      const multiOp = CircuitOptimizer.readColumn(grid, c);
      if (multiOp) multi++;
      for (let q = 0; q < grid.length; q++) {
        const cell = grid[q][c];
        if (CircuitOptimizer.isEmpty(cell) || cell === 'M') continue;
        if (!CircuitOptimizer.isMultiWire(cell)) single++;
      }
    }
    return { single, multi, total: single + multi, depth: CircuitOptimizer.activeColumns(grid).length };
  }

  // =====================================================================
  // PASS 1 - Involutory (self-inverse) cancellation:  U . U = I
  // =====================================================================
  /**
   * Cancels a self-inverse gate against the next gate on the same wire, but
   * ONLY when nothing else touches that wire in between. For two-qubit
   * gates both wires must be free in between, otherwise the intervening
   * operation does not commute and the pair is not actually adjacent.
   */
  static passCancelInvolutory(grid) {
    const SELF_INVERSE_1Q = ['X', 'Y', 'Z', 'H'];
    const out = CircuitOptimizer.cloneGrid(grid);
    const numCols = out[0] ? out[0].length : 0;
    let removed = 0;

    // --- single-qubit involutory pairs ---
    for (let q = 0; q < out.length; q++) {
      let prevCol = -1;
      for (let c = 0; c < numCols; c++) {
        const cell = out[q][c];
        if (CircuitOptimizer.isEmpty(cell)) continue;
        // A measurement or a multi-wire marker breaks the chain: gates on
        // either side of it are not adjacent in any meaningful sense.
        if (cell === 'M' || CircuitOptimizer.isMultiWire(cell)) { prevCol = -1; continue; }

        if (prevCol !== -1 && out[q][prevCol] === cell && SELF_INVERSE_1Q.includes(cell)) {
          out[q][prevCol] = null;
          out[q][c] = null;
          removed += 2;
          prevCol = -1;
        } else {
          prevCol = c;
        }
      }
    }

    // --- two-qubit involutory pairs (CNOT.CNOT = I, CZ.CZ = I, SWAP.SWAP = I) ---
    const SELF_INVERSE_2Q = ['CNOT', 'CZ', 'SWAP'];
    for (let c = 0; c < numCols; c++) {
      const opA = CircuitOptimizer.readColumn(out, c);
      if (!opA || !SELF_INVERSE_2Q.includes(opA.kind)) continue;

      for (let d = c + 1; d < numCols; d++) {
        const opB = CircuitOptimizer.readColumn(out, d);
        // Any activity on either wire between the two breaks adjacency.
        const blocked = opA.wires.some((w) => {
          for (let k = c + 1; k < d; k++) if (!CircuitOptimizer.isEmpty(out[w][k])) return true;
          return false;
        });
        if (blocked) break;
        if (!opB) continue;

        const sameWires = opB.kind === opA.kind &&
          opB.wires.length === opA.wires.length &&
          opB.wires.every((w, i) => w === opA.wires[i]);
        // CNOT only cancels when control and target match orientation too.
        const sameOrientation = opA.kind !== 'CNOT' ||
          (opA.target === opB.target && opA.controls[0] === opB.controls[0]);

        if (sameWires && sameOrientation) {
          for (const w of opA.wires) { out[w][c] = null; out[w][d] = null; }
          removed += 2;
        }
        break;
      }
    }

    return { grid: out, removed };
  }

  // =====================================================================
  // PASS 2 - Merge consecutive same-axis rotations / phases
  // =====================================================================
  /**
   * P(a).P(b) = P(a+b) and R_k(a).R_k(b) = R_k(a+b). S and T are just
   * P(pi/2) and P(pi/4), so "T.T -> S" and "S.S -> Z" fall out of the same
   * rule instead of needing their own special cases.
   */
  static passMergeRotations(grid) {
    const QE = window.QuantumCircuitEngine;
    const PHASE_EQUIV = { S: Math.PI / 2, T: Math.PI / 4, Z: Math.PI };
    const out = CircuitOptimizer.cloneGrid(grid);
    const numCols = out[0] ? out[0].length : 0;
    let merged = 0;

    const asRotation = (cell) => {
      if (CircuitOptimizer.isEmpty(cell) || cell === 'M') return null;
      if (PHASE_EQUIV[cell] !== undefined) return { axis: 'P', angle: PHASE_EQUIV[cell] };
      const parsed = QE.parseGateToken(cell);
      if (!parsed || parsed.angle === null) return null;
      if (['RX', 'RY', 'RZ', 'P'].includes(parsed.name)) return { axis: parsed.name, angle: parsed.angle };
      return null;
    };

    // Canonical token for a merged angle: snap back to the named gate when
    // the sum lands exactly on one, so output stays readable.
    const tokenForPhase = (angle) => {
      const twoPi = 2 * Math.PI;
      let a = ((angle % twoPi) + twoPi) % twoPi;
      if (Math.abs(a) < 1e-9 || Math.abs(a - twoPi) < 1e-9) return null; // full turn = identity
      if (Math.abs(a - Math.PI) < 1e-9) return 'Z';
      if (Math.abs(a - Math.PI / 2) < 1e-9) return 'S';
      if (Math.abs(a - Math.PI / 4) < 1e-9) return 'T';
      return QE.makeGateToken('P', a);
    };

    for (let q = 0; q < out.length; q++) {
      let prevCol = -1;
      for (let c = 0; c < numCols; c++) {
        const cell = out[q][c];
        if (CircuitOptimizer.isEmpty(cell)) continue;
        if (cell === 'M' || CircuitOptimizer.isMultiWire(cell)) { prevCol = -1; continue; }

        const here = asRotation(cell);
        const prev = prevCol === -1 ? null : asRotation(out[q][prevCol]);

        if (here && prev && here.axis === prev.axis) {
          const total = prev.angle + here.angle;
          let token;
          if (here.axis === 'P') {
            token = tokenForPhase(total);
          } else {
            const twoPi = 2 * Math.PI;
            const wrapped = ((total % twoPi) + twoPi) % twoPi;
            // R_k(0) and R_k(2pi) are both the identity up to global phase.
            token = (Math.abs(wrapped) < 1e-9 || Math.abs(wrapped - twoPi) < 1e-9)
              ? null
              : QE.makeGateToken(here.axis, total);
          }
          out[q][prevCol] = token;
          out[q][c] = null;
          merged++;
          prevCol = token === null ? -1 : prevCol;
        } else {
          prevCol = c;
        }
      }
    }

    return { grid: out, merged };
  }

  // =====================================================================
  // PASS 3 - Drop identity rotations R_k(0) / P(0)
  // =====================================================================
  static passDropIdentities(grid) {
    const QE = window.QuantumCircuitEngine;
    const out = CircuitOptimizer.cloneGrid(grid);
    const numCols = out[0] ? out[0].length : 0;
    let dropped = 0;

    for (let q = 0; q < out.length; q++) {
      for (let c = 0; c < numCols; c++) {
        const cell = out[q][c];
        if (CircuitOptimizer.isEmpty(cell) || cell === 'M') continue;
        if (cell === 'I') { out[q][c] = null; dropped++; continue; }
        const parsed = QE.parseGateToken(cell);
        if (!parsed || parsed.angle === null) continue;
        if (!['RX', 'RY', 'RZ', 'P', 'CP'].includes(parsed.name)) continue;

        const twoPi = 2 * Math.PI;
        const wrapped = ((parsed.angle % twoPi) + twoPi) % twoPi;
        if (Math.abs(wrapped) < 1e-9 || Math.abs(wrapped - twoPi) < 1e-9) {
          if (parsed.name === 'CP') {
            // Clear both wires of the two-qubit gate, not just this one.
            const op = CircuitOptimizer.readColumn(out, c);
            if (op && op.kind === 'CP') for (const w of op.wires) out[w][c] = null;
          } else {
            out[q][c] = null;
          }
          dropped++;
        }
      }
    }
    return { grid: out, dropped };
  }

  // =====================================================================
  // PASS 4 - Column compaction (slide gates left into free time slots)
  // =====================================================================
  /**
   * Pure scheduling: moves each operation to the earliest column where every
   * wire it touches is free, preserving relative order on each wire. Reduces
   * circuit depth (and therefore decoherence exposure) without touching the
   * gate sequence on any individual wire.
   */
  static passCompactColumns(grid) {
    const numQubits = grid.length;
    const numCols = grid[0] ? grid[0].length : 0;
    const out = Array.from({ length: numQubits }, () => Array(numCols).fill(null));
    const nextFree = Array(numQubits).fill(0);

    for (let c = 0; c < numCols; c++) {
      const multiOp = CircuitOptimizer.readColumn(grid, c);
      const handled = new Set();

      if (multiOp) {
        const dest = Math.max(...multiOp.wires.map((w) => nextFree[w]));
        if (dest < numCols) {
          for (const w of multiOp.wires) {
            out[w][dest] = grid[w][c];
            nextFree[w] = dest + 1;
            handled.add(w);
          }
        }
      }

      for (let q = 0; q < numQubits; q++) {
        if (handled.has(q)) continue;
        const cell = grid[q][c];
        if (CircuitOptimizer.isEmpty(cell)) continue;
        const dest = nextFree[q];
        if (dest < numCols) {
          out[q][dest] = cell;
          nextFree[q] = dest + 1;
        }
      }
    }

    return { grid: out };
  }

  // =====================================================================
  // FULL OPTIMIZATION - runs passes to a fixed point, then VERIFIES
  // =====================================================================
  /**
   * Runs the algebraic passes repeatedly until nothing more changes, then
   * proves the result is physically identical to the input by simulating
   * both and comparing state fidelity. A pass set that fails verification is
   * discarded entirely and the original circuit is returned untouched, with
   * the failure reported rather than hidden.
   *
   * @returns {{grid, verified, fidelity, before, after, rounds, rejected}}
   */
  static optimize(grid, numQubits, { maxRounds = 8 } = {}) {
    const QE = window.QuantumCircuitEngine;
    const original = CircuitOptimizer.cloneGrid(grid);
    const before = CircuitOptimizer.gateCount(original);

    let current = CircuitOptimizer.cloneGrid(grid);
    let rounds = 0;
    let totalRemoved = 0, totalMerged = 0, totalDropped = 0;

    for (let round = 0; round < maxRounds; round++) {
      const snapshot = JSON.stringify(current);

      const cancelled = CircuitOptimizer.passCancelInvolutory(current);
      current = cancelled.grid; totalRemoved += cancelled.removed;

      const mergedPass = CircuitOptimizer.passMergeRotations(current);
      current = mergedPass.grid; totalMerged += mergedPass.merged;

      const droppedPass = CircuitOptimizer.passDropIdentities(current);
      current = droppedPass.grid; totalDropped += droppedPass.dropped;

      current = CircuitOptimizer.passCompactColumns(current).grid;

      rounds = round + 1;
      if (JSON.stringify(current) === snapshot) break;
    }

    // The whole point: prove the rewrite preserved the physics.
    const check = QE.compareCircuits(original, current, numQubits);
    if (!check.equivalent) {
      return {
        grid: original,
        verified: false,
        rejected: true,
        fidelity: check.fidelity,
        before,
        after: before,
        rounds,
        summary: `Optimization rejected: the rewritten circuit differs from the original (fidelity ${check.fidelity.toFixed(6)}). Original circuit kept unchanged.`
      };
    }

    const after = CircuitOptimizer.gateCount(current);
    const depthCut = before.depth === 0 ? 0 : Math.round(((before.depth - after.depth) / before.depth) * 100);
    const gateCut = before.total === 0 ? 0 : Math.round(((before.total - after.total) / before.total) * 100);

    return {
      grid: current,
      verified: true,
      rejected: false,
      fidelity: check.fidelity,
      before,
      after,
      rounds,
      cancelled: totalRemoved,
      merged: totalMerged,
      dropped: totalDropped,
      depthReductionPct: depthCut,
      gateReductionPct: gateCut,
      summary: before.total === after.total
        ? `Already optimal: no algebraic simplification found (verified, fidelity ${check.fidelity.toFixed(6)}).`
        : `${before.total} gates / depth ${before.depth} -> ${after.total} gates / depth ${after.depth} (-${gateCut}% gates, -${depthCut}% depth). Verified identical: fidelity ${check.fidelity.toFixed(6)}.`
    };
  }

  // =====================================================================
  // HARDWARE TOPOLOGY MAPPING
  // =====================================================================
  /**
   * Real devices are not all-to-all connected. These are the actual coupling
   * shapes used by the named architectures; "all-to-all" is what trapped-ion
   * machines (IonQ, Quantinuum) genuinely provide.
   */
  static TOPOLOGIES = {
    linear: { label: 'Linear Chain (nearest-neighbour)', edges: (n) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => [i, i + 1]) },
    ring: { label: 'Ring / Cycle', edges: (n) => (n < 3 ? [[0, 1]] : Array.from({ length: n }, (_, i) => [i, (i + 1) % n])) },
    star: { label: 'Star (central bus qubit)', edges: (n) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => [0, i + 1]) },
    heavyhex: {
      label: 'IBM Heavy-Hex (sparse)',
      // Heavy-hex is sparse and degree-limited; for the register sizes this
      // simulator supports, a chain with a single long-range rung reproduces
      // the property that matters here: most pairs are NOT directly coupled.
      edges: (n) => {
        const e = Array.from({ length: Math.max(0, n - 1) }, (_, i) => [i, i + 1]);
        if (n >= 4) e.push([0, n - 1]);
        return e;
      }
    },
    alltoall: { label: 'All-to-All (trapped ion)', edges: (n) => { const e = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) e.push([i, j]); return e; } }
  };

  static buildCouplingMap(topologyKey, numQubits) {
    const topo = CircuitOptimizer.TOPOLOGIES[topologyKey] || CircuitOptimizer.TOPOLOGIES.linear;
    const edges = topo.edges(numQubits).filter(([a, b]) => a < numQubits && b < numQubits && a !== b);
    const adjacency = Array.from({ length: numQubits }, () => new Set());
    for (const [a, b] of edges) { adjacency[a].add(b); adjacency[b].add(a); }
    return { key: topologyKey, label: topo.label, edges, adjacency };
  }

  /** Shortest path between two qubits through the coupling graph (BFS). */
  static shortestPath(adjacency, from, to) {
    const prev = new Map([[from, null]]);
    const queue = [from];
    while (queue.length) {
      const node = queue.shift();
      if (node === to) break;
      for (const next of adjacency[node]) {
        if (!prev.has(next)) { prev.set(next, node); queue.push(next); }
      }
    }
    if (!prev.has(to)) return null;
    const path = [];
    for (let at = to; at !== null; at = prev.get(at)) path.push(at);
    return path.reverse();
  }

  /**
   * Flags every two-qubit gate whose wires are not physically coupled on the
   * chosen device, and reports the SWAP chain needed to bring them adjacent.
   */
  static analyzeTopology(grid, numQubits, topologyKey = 'linear') {
    const coupling = CircuitOptimizer.buildCouplingMap(topologyKey, numQubits);
    const numCols = grid[0] ? grid[0].length : 0;
    const violations = [];
    let legalTwoQubitGates = 0;

    for (let c = 0; c < numCols; c++) {
      const op = CircuitOptimizer.readColumn(grid, c);
      if (!op) continue;

      if (op.kind === 'TOFFOLI') {
        // A Toffoli is not a native two-qubit interaction anywhere; it always
        // decomposes. Report it rather than pretending it maps directly.
        violations.push({
          col: c, kind: op.kind, wires: op.wires, swapsNeeded: null,
          reason: `Toffoli on q[${op.wires.join('], q[')}] is not hardware-native - it decomposes into 6 CNOTs + single-qubit gates on any real device.`
        });
        continue;
      }

      const [a, b] = op.wires;
      if (coupling.adjacency[a] && coupling.adjacency[a].has(b)) { legalTwoQubitGates++; continue; }

      const path = CircuitOptimizer.shortestPath(coupling.adjacency, a, b);
      violations.push({
        col: c,
        kind: op.kind,
        wires: op.wires,
        path,
        swapsNeeded: path ? path.length - 2 : null,
        reason: path
          ? `${op.kind} needs q[${a}] and q[${b}] adjacent, but on ${coupling.label} they are ${path.length - 1} hops apart (route q[${path.join('] -> q[')}]). Requires ${path.length - 2} SWAP${path.length - 2 === 1 ? '' : 's'}.`
          : `${op.kind} on q[${a}] and q[${b}] is unroutable: the qubits are in disconnected parts of the ${coupling.label} coupling graph.`
      });
    }

    const totalSwaps = violations.reduce((s, v) => s + (v.swapsNeeded || 0), 0);
    return {
      topology: coupling.key,
      topologyLabel: coupling.label,
      edges: coupling.edges,
      violations,
      legalTwoQubitGates,
      totalSwapsNeeded: totalSwaps,
      deployable: violations.length === 0,
      summary: violations.length === 0
        ? `Deployable as-is on ${coupling.label}: all ${legalTwoQubitGates} two-qubit gate(s) act on physically coupled qubits.`
        : `${violations.length} gate(s) violate ${coupling.label} connectivity; ${totalSwaps} SWAP(s) would be inserted during compilation.`
    };
  }

  // =====================================================================
  // HARDWARE NOISE SURVIVAL ESTIMATE
  // =====================================================================
  /**
   * Estimated probability the whole circuit runs without a fault:
   *
   *   F ~= (F_1q)^n1 * (F_2q)^n2 * exp(-t_circuit / T1)
   *
   * with t_circuit = depth * gate duration. Defaults are representative
   * superconducting-transmon numbers; all of them are inputs, so a different
   * device can be modelled by changing them rather than editing code.
   */
  static DEVICE_PRESETS = {
    superconducting: { label: 'Superconducting transmon', f1q: 0.9995, f2q: 0.990, t1Us: 100, gateNs: 60 },
    trappedIon: { label: 'Trapped ion', f1q: 0.99995, f2q: 0.9950, t1Us: 10000, gateNs: 20000 },
    neutralAtom: { label: 'Neutral atom', f1q: 0.9980, f2q: 0.9700, t1Us: 4000, gateNs: 1000 }
  };

  static estimateNoiseSurvival(grid, numQubits, deviceKey = 'superconducting', overrides = {}) {
    const preset = CircuitOptimizer.DEVICE_PRESETS[deviceKey] || CircuitOptimizer.DEVICE_PRESETS.superconducting;
    const p = { ...preset, ...overrides };
    const counts = CircuitOptimizer.gateCount(grid);

    const gateFidelity = Math.pow(p.f1q, counts.single) * Math.pow(p.f2q, counts.multi);
    const circuitTimeUs = (counts.depth * p.gateNs) / 1000;
    const decoherence = Math.exp(-circuitTimeUs / p.t1Us);
    const survival = gateFidelity * decoherence;

    let verdict, severity;
    if (counts.total === 0) { verdict = 'Empty circuit - nothing to run yet.'; severity = 'idle'; }
    else if (survival > 0.9) { verdict = 'Comfortably within hardware limits.'; severity = 'good'; }
    else if (survival > 0.7) { verdict = 'Runnable, but error mitigation is worth enabling.'; severity = 'ok'; }
    else if (survival > 0.4) { verdict = 'Marginal - results will be visibly degraded by noise.'; severity = 'warn'; }
    else { verdict = 'Too deep for this device - the signal will be lost in noise.'; severity = 'bad'; }

    return {
      device: p.label,
      deviceKey,
      singleQubitGates: counts.single,
      twoQubitGates: counts.multi,
      depth: counts.depth,
      gateFidelity,
      decoherenceFactor: decoherence,
      circuitTimeUs,
      survivalProbability: survival,
      estimatedShotsToSignal: survival > 0 ? Math.ceil(1 / Math.max(survival, 1e-9)) : Infinity,
      severity,
      verdict,
      formula: `F = (${p.f1q})^${counts.single} x (${p.f2q})^${counts.multi} x exp(-${circuitTimeUs.toFixed(2)}us / ${p.t1Us}us)`
    };
  }
}

if (typeof window !== 'undefined') window.CircuitOptimizer = CircuitOptimizer;
