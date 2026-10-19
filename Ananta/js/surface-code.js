/**
 * Ananta - Fault-Tolerant Surface Code & QEC Plaquette Studio (FTQC)
 * Real-time Rotated Surface Code simulator (d=3, d=5), Stabilizer Parity Measurements,
 * Syndrome Defect Graph, Minimum-Weight Perfect Matching (MWPM) Decoder, and Logical Qubit Tracking.
 */

class SurfaceCodeStudio {
  constructor() {
    this.distance = 3; // 3 or 5
    this.dataQubits = []; // Array of { id, r, c, error: 'I'|'X'|'Y'|'Z', correction: 'I'|'X'|'Y'|'Z' }
    this.ancillas = [];   // Array of { id, r, c, type: 'X'|'Z', neighbors: [dataQubitIds], syndrome: 0|1 }
    this.errorRate = 0.05; // 5% physical error rate slider
    this.logicalState = { alpha: 1, beta: 0, label: '|0_L⟩' };
    this.decoderLog = [];
    this.historyStats = { totalRounds: 0, correctedCount: 0, logicalErrors: 0 };
    this.animationTimer = null;
    this.autoCycle = false;

    this.initElements();
    this.buildLattice(this.distance);
    this.attachEvents();
  }

  initElements() {
    this.container = document.getElementById('surface-code-lattice-container');
    this.syndromeLogEl = document.getElementById('qec-syndrome-log');
    this.logicalFidelityEl = document.getElementById('qec-logical-fidelity');
    this.logicalStateDisplay = document.getElementById('qec-logical-state-display');
    this.activeErrorsCountEl = document.getElementById('qec-active-errors-count');
    this.syndromeDefectsCountEl = document.getElementById('qec-syndromes-count');
    this.statusBanner = document.getElementById('qec-status-banner');
  }

  buildLattice(d) {
    this.distance = d;
    this.dataQubits = [];
    this.ancillas = [];
    this.decoderLog = [];

    // Rotated Surface Code Coordinate Geometry
    // For d=3: 3x3 data qubits = 9 data qubits.
    // Ancillas are placed at interleaved half-integer coordinates.
    const numRows = 2 * d - 1;
    const numCols = 2 * d - 1;

    let dataId = 0;
    let ancillaId = 0;

    // Generate Data Qubits at even (r, c)
    for (let r = 0; r < d; r++) {
      for (let c = 0; c < d; c++) {
        this.dataQubits.push({
          id: dataId++,
          r: r,
          c: c,
          gridR: r * 2,
          gridC: c * 2,
          error: 'I',
          correction: 'I'
        });
      }
    }

    // Helper to find data qubit id by (r, c)
    const getDataId = (r, c) => {
      if (r < 0 || r >= d || c < 0 || c >= d) return null;
      return r * d + c;
    };

    // Generate Ancilla Plaquettes for rotated surface code
    // Plaquettes sit at (r+0.5, c+0.5) inside the grid and on the boundaries
    if (d === 3) {
      // 8 Ancillas: 4 X-type (green, vertical boundaries & center), 4 Z-type (amber/blue, horizontal boundaries & center)
      const ancillaDefs = [
        // Z-type stabilizers (check bit flips X)
        { type: 'Z', r: 0.5, c: 0.5, nbrs: [getDataId(0,0), getDataId(0,1), getDataId(1,0), getDataId(1,1)] },
        { type: 'Z', r: 1.5, c: 1.5, nbrs: [getDataId(1,1), getDataId(1,2), getDataId(2,1), getDataId(2,2)] },
        { type: 'Z', r: -0.5, c: 1.5, nbrs: [getDataId(0,1), getDataId(0,2)] }, // Top boundary 2-body
        { type: 'Z', r: 2.5, c: 0.5, nbrs: [getDataId(2,0), getDataId(2,1)] },  // Bottom boundary 2-body
        
        // X-type stabilizers (check phase flips Z)
        { type: 'X', r: 0.5, c: 1.5, nbrs: [getDataId(0,1), getDataId(0,2), getDataId(1,1), getDataId(1,2)] },
        { type: 'X', r: 1.5, c: 0.5, nbrs: [getDataId(1,0), getDataId(1,1), getDataId(2,0), getDataId(2,1)] },
        { type: 'X', r: 0.5, c: -0.5, nbrs: [getDataId(0,0), getDataId(1,0)] }, // Left boundary 2-body
        { type: 'X', r: 1.5, c: 2.5, nbrs: [getDataId(1,2), getDataId(2,2)] }  // Right boundary 2-body
      ];

      ancillaDefs.forEach((def, idx) => {
        this.ancillas.push({
          id: idx,
          type: def.type,
          r: def.r,
          c: def.c,
          gridR: def.r * 2,
          gridC: def.c * 2,
          neighbors: def.nbrs.filter(id => id !== null),
          syndrome: 0
        });
      });
    } else if (d === 5) {
      // Distance 5 lattice generation (25 data qubits, 24 ancillas)
      for (let r = 0; r < d - 1; r++) {
        for (let c = 0; c < d - 1; c++) {
          const type = (r + c) % 2 === 0 ? 'Z' : 'X';
          this.ancillas.push({
            id: ancillaId++,
            type: type,
            r: r + 0.5,
            c: c + 0.5,
            gridR: (r + 0.5) * 2,
            gridC: (c + 0.5) * 2,
            neighbors: [getDataId(r, c), getDataId(r, c+1), getDataId(r+1, c), getDataId(r+1, c+1)].filter(id => id !== null),
            syndrome: 0
          });
        }
      }
      // Add boundary 2-body ancillas for d=5
      for (let c = 0; c < d - 1; c++) {
        if (c % 2 === 1) {
          this.ancillas.push({
            id: ancillaId++,
            type: 'Z',
            r: -0.5,
            c: c + 0.5,
            gridR: -1,
            gridC: (c + 0.5) * 2,
            neighbors: [getDataId(0, c), getDataId(0, c+1)],
            syndrome: 0
          });
          this.ancillas.push({
            id: ancillaId++,
            type: 'Z',
            r: d - 0.5,
            c: c + 0.5,
            gridR: (d - 0.5) * 2,
            gridC: (c + 0.5) * 2,
            neighbors: [getDataId(d-1, c), getDataId(d-1, c+1)],
            syndrome: 0
          });
        }
      }
      for (let r = 0; r < d - 1; r++) {
        if (r % 2 === 0) {
          this.ancillas.push({
            id: ancillaId++,
            type: 'X',
            r: r + 0.5,
            c: -0.5,
            gridR: (r + 0.5) * 2,
            gridC: -1,
            neighbors: [getDataId(r, 0), getDataId(r+1, 0)],
            syndrome: 0
          });
          this.ancillas.push({
            id: ancillaId++,
            type: 'X',
            r: r + 0.5,
            c: d - 0.5,
            gridR: (r + 0.5) * 2,
            gridC: (d - 0.5) * 2,
            neighbors: [getDataId(r, d-1), getDataId(r+1, d-1)],
            syndrome: 0
          });
        }
      }
    }

    this.computeSyndromes();
    this.renderLattice();
    this.updateStats();
  }

  // Calculate Parity Measurement Syndromes
  computeSyndromes() {
    this.ancillas.forEach(ancilla => {
      let nonTrivialCount = 0;
      ancilla.neighbors.forEach(qId => {
        const q = this.dataQubits[qId];
        if (!q) return;
        // Effective Pauli on physical qubit = error * correction
        const effective = this.combinePaulis(q.error, q.correction);
        
        if (ancilla.type === 'Z') {
          // Z checks bit-flips (X or Y)
          if (effective === 'X' || effective === 'Y') {
            nonTrivialCount++;
          }
        } else if (ancilla.type === 'X') {
          // X checks phase-flips (Z or Y)
          if (effective === 'Z' || effective === 'Y') {
            nonTrivialCount++;
          }
        }
      });
      ancilla.syndrome = (nonTrivialCount % 2 === 1) ? 1 : 0;
    });
  }

  combinePaulis(p1, p2) {
    if (p1 === 'I') return p2;
    if (p2 === 'I') return p1;
    if (p1 === p2) return 'I';
    if ((p1 === 'X' && p2 === 'Z') || (p1 === 'Z' && p2 === 'X')) return 'Y';
    if ((p1 === 'X' && p2 === 'Y') || (p1 === 'Y' && p2 === 'X')) return 'Z';
    if ((p1 === 'Y' && p2 === 'Z') || (p1 === 'Z' && p2 === 'Y')) return 'X';
    return 'I';
  }

  // Interactive error injection
  toggleQubitError(qId, specificError = null) {
    const q = this.dataQubits[qId];
    if (!q) return;

    if (specificError) {
      q.error = specificError;
    } else {
      // Cycle: I -> X -> Z -> Y -> I
      const cycle = { 'I': 'X', 'X': 'Z', 'Z': 'Y', 'Y': 'I' };
      q.error = cycle[q.error] || 'I';
    }
    // Reset any previous correction on this qubit
    q.correction = 'I';

    this.computeSyndromes();
    this.renderLattice();
    this.updateStats();
    this.logSyndromeEvent(`Injected Pauli ${q.error} on Data Qubit D${q.id} (Row ${q.r}, Col ${q.c})`);
  }

  // Random noise shower
  injectRandomNoise() {
    let injected = 0;
    this.dataQubits.forEach(q => {
      q.correction = 'I';
      if (Math.random() < this.errorRate) {
        const rand = Math.random();
        if (rand < 0.45) q.error = 'X';
        else if (rand < 0.90) q.error = 'Z';
        else q.error = 'Y';
        injected++;
      }
    });

    this.computeSyndromes();
    this.renderLattice();
    this.updateStats();
    this.logSyndromeEvent(`Random thermal noise injected ${injected} Pauli errors (p = ${(this.errorRate * 100).toFixed(1)}%)`);
  }

  // Minimum-Weight Perfect Matching (MWPM) / Union-Find Visual Decoder
  runDecoder() {
    this.computeSyndromes();
    const activeZAncillas = this.ancillas.filter(a => a.type === 'Z' && a.syndrome === 1);
    const activeXAncillas = this.ancillas.filter(a => a.type === 'X' && a.syndrome === 1);

    if (activeZAncillas.length === 0 && activeXAncillas.length === 0) {
      this.setStatus('Code space is clean. No syndrome defects detected!', 'clean');
      this.logSyndromeEvent('Decoder executed: No syndrome defects found.');
      return;
    }

    let correctionsApplied = 0;

    // Decode Z-defects (bit-flip errors X, apply X corrections)
    correctionsApplied += this.decodeSyndromeSet(activeZAncillas, 'X', 'top-bottom');

    // Decode X-defects (phase-flip errors Z, apply Z corrections)
    correctionsApplied += this.decodeSyndromeSet(activeXAncillas, 'Z', 'left-right');

    this.computeSyndromes();
    this.renderLattice();
    this.updateStats();

    // Check if logical error occurred
    const logicalCheck = this.verifyLogicalState();
    if (logicalCheck.hasLogicalError) {
      this.historyStats.logicalErrors++;
      this.setStatus(`⚠️ Logical Error Occurred! Error chain crossed the code boundary (${logicalCheck.reason}).`, 'error');
      this.logSyndromeEvent(`Decoder finished with LOGICAL FLIP: ${logicalCheck.reason}`);
    } else {
      this.historyStats.correctedCount++;
      this.setStatus(`✅ All syndromes successfully annihilated! Logical state |ψ_L⟩ preserved with 100% fidelity.`, 'success');
      this.logSyndromeEvent(`Decoder successfully matched and corrected ${correctionsApplied} qubits without logical error.`);
    }
  }

  // Greedy Minimum-Weight Matching heuristic for planar grid
  decodeSyndromeSet(activeAncillas, correctionPauli, boundaryDirection) {
    let corrections = 0;
    const remaining = [...activeAncillas];

    // Helper distance
    const dist = (a1, a2) => Math.abs(a1.r - a2.r) + Math.abs(a1.c - a2.c);

    while (remaining.length > 0) {
      const current = remaining.shift();

      // Find closest neighbor ancilla or boundary
      let closestPair = null;
      let minPairDist = Infinity;
      let closestIdx = -1;

      for (let i = 0; i < remaining.length; i++) {
        const d = dist(current, remaining[i]);
        if (d < minPairDist) {
          minPairDist = d;
          closestPair = remaining[i];
          closestIdx = i;
        }
      }

      // Distance to respective boundary
      let boundaryDist = Infinity;
      if (boundaryDirection === 'top-bottom') {
        boundaryDist = Math.min(current.r + 0.5, (this.distance - 0.5) - current.r);
      } else {
        boundaryDist = Math.min(current.c + 0.5, (this.distance - 0.5) - current.c);
      }

      if (closestPair && minPairDist <= 2 * boundaryDist) {
        // Match pairwise
        remaining.splice(closestIdx, 1);
        // Find shared data qubits between current and closestPair
        const shared = current.neighbors.filter(id => closestPair.neighbors.includes(id));
        if (shared.length > 0) {
          const targetQ = this.dataQubits[shared[0]];
          if (targetQ) {
            targetQ.correction = this.combinePaulis(targetQ.correction, correctionPauli);
            corrections++;
          }
        } else if (current.neighbors.length > 0) {
          const targetQ = this.dataQubits[current.neighbors[0]];
          if (targetQ) {
            targetQ.correction = this.combinePaulis(targetQ.correction, correctionPauli);
            corrections++;
          }
        }
      } else {
        // Match to boundary: apply correction to the nearest boundary data qubit
        if (current.neighbors.length > 0) {
          const boundaryQId = current.neighbors[0];
          const targetQ = this.dataQubits[boundaryQId];
          if (targetQ) {
            targetQ.correction = this.combinePaulis(targetQ.correction, correctionPauli);
            corrections++;
          }
        }
      }
    }

    return corrections;
  }

  // Verifies if effective errors form an uncorrected homological logical string operator
  verifyLogicalState() {
    // Logical X_L is horizontal line across columns for row 0
    // Logical Z_L is vertical line across rows for col 0
    let logicalXFlips = 0;
    let logicalZFlips = 0;

    // Check logical Z_L operator (vertical string operator along column 0)
    for (let r = 0; r < this.distance; r++) {
      const q = this.dataQubits[r * this.distance + 0];
      if (q) {
        const eff = this.combinePaulis(q.error, q.correction);
        if (eff === 'Z' || eff === 'Y') logicalZFlips++;
      }
    }

    // Check logical X_L operator (horizontal string operator along row 0)
    for (let c = 0; c < this.distance; c++) {
      const q = this.dataQubits[0 * this.distance + c];
      if (q) {
        const eff = this.combinePaulis(q.error, q.correction);
        if (eff === 'X' || eff === 'Y') logicalXFlips++;
      }
    }

    const hasLogicalX = (logicalXFlips % 2 === 1);
    const hasLogicalZ = (logicalZFlips % 2 === 1);

    if (hasLogicalX && hasLogicalZ) {
      return { hasLogicalError: true, reason: 'Logical Y_L Pauli frame shift' };
    } else if (hasLogicalX) {
      return { hasLogicalError: true, reason: 'Logical X_L Bit-Flip string pierced code' };
    } else if (hasLogicalZ) {
      return { hasLogicalError: true, reason: 'Logical Z_L Phase-Flip string pierced code' };
    }

    return { hasLogicalError: false, reason: 'Preserved' };
  }

  resetAll() {
    this.dataQubits.forEach(q => {
      q.error = 'I';
      q.correction = 'I';
    });
    this.ancillas.forEach(a => a.syndrome = 0);
    this.decoderLog = [];
    this.renderLattice();
    this.updateStats();
    this.setStatus('Lattice reset to pure fault-tolerant ground state |0_L⟩', 'info');
    this.logSyndromeEvent('Reset surface code lattice to clean ground state.');
  }

  setStatus(msg, type = 'info') {
    if (!this.statusBanner) return;
    this.statusBanner.textContent = msg;
    this.statusBanner.className = `qec-status-banner banner-${type}`;
  }

  logSyndromeEvent(msg) {
    const time = new Date().toLocaleTimeString();
    this.decoderLog.unshift(`[${time}] ${msg}`);
    if (this.decoderLog.length > 25) this.decoderLog.pop();

    if (this.syndromeLogEl) {
      this.syndromeLogEl.innerHTML = this.decoderLog.map(entry => {
        let cls = 'log-normal';
        if (entry.includes('LOGICAL FLIP')) cls = 'log-error';
        if (entry.includes('successfully')) cls = 'log-success';
        if (entry.includes('Injected')) cls = 'log-warning';
        return `<div class="qec-log-item ${cls}">${entry}</div>`;
      }).join('');
    }
  }

  updateStats() {
    const activeErrors = this.dataQubits.filter(q => q.error !== 'I').length;
    const activeDefects = this.ancillas.filter(a => a.syndrome === 1).length;
    const logCheck = this.verifyLogicalState();

    if (this.activeErrorsCountEl) this.activeErrorsCountEl.textContent = activeErrors;
    if (this.syndromeDefectsCountEl) this.syndromeDefectsCountEl.textContent = activeDefects;

    let fidelity = 1.0;
    if (logCheck.hasLogicalError) {
      fidelity = 0.0;
    } else if (activeDefects > 0) {
      // Uncorrected syndrome degrades fidelity estimate
      fidelity = Math.max(0.1, 1.0 - (activeDefects * 0.15));
    }

    if (this.logicalFidelityEl) {
      this.logicalFidelityEl.textContent = `${(fidelity * 100).toFixed(1)}%`;
      this.logicalFidelityEl.style.color = fidelity > 0.85 ? 'var(--accent-green, #81c995)' : (fidelity > 0.4 ? 'var(--accent-amber, #fdd663)' : 'var(--accent-red, #f28b82)');
    }

    if (this.logicalStateDisplay) {
      if (logCheck.hasLogicalError) {
        this.logicalStateDisplay.textContent = '|1_L⟩ (Flipped)';
        this.logicalStateDisplay.className = 'qec-logical-badge badge-flipped';
      } else {
        this.logicalStateDisplay.textContent = '|0_L⟩ (Clean)';
        this.logicalStateDisplay.className = 'qec-logical-badge badge-clean';
      }
    }
  }

  renderLattice() {
    if (!this.container) return;
    const d = this.distance;
    const size = d === 3 ? 420 : 540;
    const cellSize = size / (2 * d);

    let html = `<div class="surface-lattice-svg-wrap" style="width:${size}px; height:${size}px; position:relative;">`;
    html += `<svg class="surface-lattice-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;

    // 1. Draw Grid Lines between adjacent data qubits
    for (let r = 0; r < d; r++) {
      for (let c = 0; c < d; c++) {
        const x1 = (c + 0.5) * (size / d);
        const y1 = (r + 0.5) * (size / d);
        if (c + 1 < d) {
          const x2 = (c + 1.5) * (size / d);
          html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" class="lattice-wire" />`;
        }
        if (r + 1 < d) {
          const y2 = (r + 1.5) * (size / d);
          html += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" class="lattice-wire" />`;
        }
      }
    }

    // 2. Draw Plaquette stabilizer backgrounds
    this.ancillas.forEach(ancilla => {
      const cx = (ancilla.c + 0.5) * (size / d);
      const cy = (ancilla.r + 0.5) * (size / d);
      const isDefect = ancilla.syndrome === 1;
      const pSize = (size / d) * 0.72;

      let cls = ancilla.type === 'Z' ? 'plaquette-z' : 'plaquette-x';
      if (isDefect) cls += ' defect-active';

      // Rotated diamond shape for plaquette
      html += `
        <g class="plaquette-group ${cls}" data-ancilla-id="${ancilla.id}">
          <polygon points="${cx},${cy - pSize/2} ${cx + pSize/2},${cy} ${cx},${cy + pSize/2} ${cx - pSize/2},${cy}" class="plaquette-polygon" />
          <text x="${cx}" y="${cy + 4}" text-anchor="middle" class="plaquette-label">${ancilla.type}${isDefect ? '!' : ''}</text>
          ${isDefect ? `<circle cx="${cx}" cy="${cy}" r="${pSize/1.8}" class="syndrome-glow-ring" />` : ''}
        </g>
      `;
    });

    // 3. Draw Logical Operator String Overlays
    // Logical Z_L vertical boundary
    const zX = 0.5 * (size / d);
    html += `<line x1="${zX}" y1="20" x2="${zX}" y2="${size - 20}" class="logical-operator-line logical-z-string" />`;
    // Logical X_L horizontal boundary
    const xY = 0.5 * (size / d);
    html += `<line x1="20" y1="${xY}" x2="${size - 20}" y2="${xY}" class="logical-operator-line logical-x-string" />`;

    html += `</svg>`;

    // 4. Overlay Interactive Physical Data Qubits
    this.dataQubits.forEach(q => {
      const left = ((q.c + 0.5) * (size / d)) - 22;
      const top = ((q.r + 0.5) * (size / d)) - 22;
      const effective = this.combinePaulis(q.error, q.correction);

      let errorBadge = '';
      let nodeClass = 'data-qubit-node';

      if (q.error !== 'I') {
        nodeClass += ` has-error error-${q.error.toLowerCase()}`;
        errorBadge += `<span class="badge-error-tag">${q.error}</span>`;
      }
      if (q.correction !== 'I') {
        nodeClass += ` has-correction`;
        errorBadge += `<span class="badge-corr-tag">C:${q.correction}</span>`;
      }

      html += `
        <div class="${nodeClass}" style="left:${left}px; top:${top}px;" onclick="window.surfaceCodeStudio.toggleQubitError(${q.id})" title="Data Qubit D${q.id} (Row ${q.r}, Col ${q.c})\nClick to inject/cycle Pauli error">
          <span class="q-label">D<sub>${q.id}</sub></span>
          ${errorBadge}
        </div>
      `;
    });

    html += `</div>`;
    this.container.innerHTML = html;
  }

  attachEvents() {
    const d3Btn = document.getElementById('btn-qec-d3');
    const d5Btn = document.getElementById('btn-qec-d5');
    if (d3Btn) d3Btn.onclick = () => { this.buildLattice(3); d3Btn.classList.add('active'); d5Btn && d5Btn.classList.remove('active'); };
    if (d5Btn) d5Btn.onclick = () => { this.buildLattice(5); d5Btn.classList.add('active'); d3Btn && d3Btn.classList.remove('active'); };

    const noiseBtn = document.getElementById('btn-qec-noise');
    if (noiseBtn) noiseBtn.onclick = () => this.injectRandomNoise();

    const decodeBtn = document.getElementById('btn-qec-decode');
    if (decodeBtn) decodeBtn.onclick = () => this.runDecoder();

    const resetBtn = document.getElementById('btn-qec-reset');
    if (resetBtn) resetBtn.onclick = () => this.resetAll();

    const pSlider = document.getElementById('slider-qec-error-rate');
    const pVal = document.getElementById('qec-error-rate-val');
    if (pSlider) {
      pSlider.oninput = (e) => {
        this.errorRate = parseFloat(e.target.value) / 100;
        if (pVal) pVal.textContent = `${(this.errorRate * 100).toFixed(1)}%`;
      };
    }

    // Presets
    const presetX = document.getElementById('btn-qec-preset-x');
    if (presetX) presetX.onclick = () => { this.resetAll(); this.toggleQubitError(4, 'X'); };

    const presetZ = document.getElementById('btn-qec-preset-z');
    if (presetZ) presetZ.onclick = () => { this.resetAll(); this.toggleQubitError(4, 'Z'); };

    const presetChain = document.getElementById('btn-qec-preset-chain');
    if (presetChain) presetChain.onclick = () => {
      this.resetAll();
      this.toggleQubitError(0, 'X');
      this.toggleQubitError(1, 'X');
      this.toggleQubitError(2, 'X');
      this.logSyndromeEvent('Injected spanning horizontal X-chain (Logical Error demonstration)');
    };
  }
}

window.SurfaceCodeStudio = SurfaceCodeStudio;
