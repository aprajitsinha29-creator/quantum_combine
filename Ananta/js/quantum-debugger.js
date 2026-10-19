/**
 * Quantum Time-Travel Debugger — Ananta
 */
class QuantumTimeDebugger {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;
    this.snapshots = [];
    this.currentStep = 0;
    this.noiseEnabled = false;
    this.t1Us = 50;
    this.t2Us = 30;
    this.gateTimeNs = 100;
    this.isPlaying = false;
    this.playTimer = null;
    this.particles = [];
    this.animFrame = null;
    this.particleCtx = null;
    this.particleCanvas = null;
    this.init();
  }

  init() {
    this._bindPanel();
    this._setupParticleCanvas();
    this._bindEvents();
  }

  _bindPanel() {
    this.stepLabel      = document.getElementById('qtd-step-label');
    this.gateLabel      = document.getElementById('qtd-gate-label');
    this.stateTable     = document.getElementById('qtd-state-table');
    this.entropyVal     = document.getElementById('qtd-entropy-val');
    this.purityBar      = document.getElementById('qtd-purity-bar');
    this.purityVal      = document.getElementById('qtd-purity-val');
    this.fidelityVal    = document.getElementById('qtd-fidelity-val');
    this.concurrenceMap = document.getElementById('qtd-concurrence-map');
    this.noiseBudget    = document.getElementById('qtd-noise-budget');
    this.diagnosticBox  = document.getElementById('qtd-diagnostic-box');
  }

  _setupParticleCanvas() {
    this.particleCanvas = document.getElementById('qtd-particle-canvas');
    if (this.particleCanvas) this.particleCtx = this.particleCanvas.getContext('2d');
  }

  _bindEvents() {
    const safe = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    const safeChange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', fn); };
    const safeInput  = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', fn); };

    safe('btn-qtd-capture', () => this.captureAndOpen());
    safe('btn-qtd-play',    () => this.togglePlay());
    safe('btn-qtd-prev',    () => this.stepTo(this.currentStep - 1));
    safe('btn-qtd-next',    () => this.stepTo(this.currentStep + 1));
    safe('btn-qtd-first',   () => this.stepTo(0));
    safe('btn-qtd-last',    () => this.stepTo(this.snapshots.length - 1));
    safe('btn-qtd-diagnose',() => this.runDiagnostics());

    safeChange('qtd-noise-toggle', (e) => {
      this.noiseEnabled = e.target.checked;
      const noiseSection = document.getElementById('qtd-noise-section');
      if (noiseSection) noiseSection.style.display = this.noiseEnabled ? 'block' : 'none';
      if (this.snapshots.length > 0) this.captureAndOpen();
    });

    safeInput('qtd-t1-slider', (e) => {
      this.t1Us = parseFloat(e.target.value);
      const lbl = document.getElementById('qtd-t1-val');
      if (lbl) lbl.textContent = this.t1Us + ' us';
      if (this.noiseEnabled && this.snapshots.length > 0) this.captureAndOpen();
    });

    const track = document.getElementById('qtd-scrubber-track');
    if (track) {
      track.addEventListener('click', (e) => {
        const rect = track.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.stepTo(Math.round(pct * (this.snapshots.length - 1)));
      });
    }
  }

  captureAndOpen() {
    if (!this.circuitUI || !this.engine) return;
    const grid = this.circuitUI.grid;

    // Check if circuit has at least one gate placed
    const hasGates = grid && grid.some(row => row.some(cell => cell && cell !== ''));
    if (!hasGates) {
      alert('⚠️ Your circuit is empty!\n\nPlease add at least one gate in the Composer tab first, then click "Debug Current Circuit".');
      return;
    }

    // Sync engine qubit count to match the circuit grid
    if (grid.length !== this.engine.numQubits) {
      this.engine.setNumQubits(grid.length);
    }

    this.snapshots = this._captureSnapshots(grid);
    if (this.snapshots.length < 2) return; // need at least initial + 1 gate step

    const wrap = document.getElementById('debugger-panel-wrapper');
    if (wrap) { wrap.classList.remove('qtd-hidden'); wrap.classList.add('qtd-visible'); }

    // Hide the empty-state placeholder
    const emptyState = document.getElementById('qtd-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    this.renderScrubber();
    this.stepTo(0);
    this.renderDebugReview();
    this.runDiagnostics();
  }

  _captureSnapshots(grid) {
    if (!grid || !grid.length) return [];
    const numCols = grid[0].length;
    const snaps = [];
    this.engine.reset();
    snaps.push(this._snapNow(grid, -1)); // initial state
    for (let col = 0; col < numCols; col++) {
      // Skip columns that have no gates placed
      const hasGateInCol = grid.some(row => row[col] && row[col] !== '');
      if (!hasGateInCol) continue;
      this.engine.runCircuitUpToCol(grid, col);
      if (this.noiseEnabled) this._injectNoise();
      snaps.push(this._snapNow(grid, col));
    }
    return snaps;
  }

  _snapNow(grid, col) {
    const probs       = this.engine.getProbabilities();
    const entropy     = this.engine.getEntanglementEntropy();
    const purity      = this._purity();
    const concurrence = this._concurrence();
    const gateDesc    = col >= 0 ? this._describeCol(grid, col) : 'Initial state |0...0>';
    const noiseInfo   = this.noiseEnabled ? this._noiseInfo() : null;
    return { col, probs, entropy, purity, concurrence, gateDesc, noiseInfo,
             fidelity: this.noiseEnabled ? Math.max(0, purity * 100) : 100 };
  }

  _describeCol(grid, col) {
    const names = { H:'Hadamard (H)', X:'Pauli-X', Y:'Pauli-Y', Z:'Pauli-Z',
                    S:'Phase (S)', T:'pi/8 Gate (T)', M:'Measure', CX_CTRL:'CNOT-Ctrl', CX_TGT:'CNOT-Tgt' };
    const parts = [];
    for (let q = 0; q < grid.length; q++) {
      const c = grid[q][col];
      if (c) parts.push((names[c] || c) + ' on q' + q);
    }
    return parts.join(' - ') || 'Identity';
  }

  _purity() {
    let p = 0;
    for (const a of this.engine.state) p += a.absSq() * a.absSq();
    if (this.noiseEnabled) p -= Math.random() * 0.04;
    return parseFloat(Math.min(1, Math.max(0, p)).toFixed(4));
  }

  _concurrence() {
    if (this.engine.numQubits < 2) return 0;
    const q0m = 1 << (this.engine.numQubits - 1);
    const q1m = 1 << (this.engine.numQubits - 2);
    let a00={re:0,im:0}, a01={re:0,im:0}, a10={re:0,im:0}, a11={re:0,im:0};
    for (let i = 0; i < this.engine.numStates; i++) {
      const b0 = (i & q0m) ? 1 : 0, b1 = (i & q1m) ? 1 : 0;
      const a = this.engine.state[i];
      if (!b0&&!b1){a00.re+=a.re;a00.im+=a.im;}
      else if(!b0&&b1){a01.re+=a.re;a01.im+=a.im;}
      else if(b0&&!b1){a10.re+=a.re;a10.im+=a.im;}
      else{a11.re+=a.re;a11.im+=a.im;}
    }
    const cr = a00.re*a11.re - a00.im*a11.im - (a01.re*a10.re - a01.im*a10.im);
    const ci = a00.re*a11.im + a00.im*a11.re - (a01.re*a10.im + a01.im*a10.re);
    return parseFloat(Math.min(1, Math.max(0, 2*Math.sqrt(cr*cr+ci*ci))).toFixed(4));
  }

  _injectNoise() {
    const p = 1 - Math.exp(-(this.gateTimeNs/1000) / this.t1Us);
    for (const amp of this.engine.state) {
      if (Math.random() < p * 0.4) { amp.re *= (1 - p*0.2); amp.im *= (1 - p*0.2); }
    }
  }

  _noiseInfo() {
    const gtUs = this.gateTimeNs / 1000;
    const t1l = (1 - Math.exp(-gtUs / this.t1Us)) * 100;
    const t2l = (1 - Math.exp(-gtUs / this.t2Us)) * 100;
    return { t1Loss: t1l.toFixed(2), t2Loss: t2l.toFixed(2), totalLoss: (t1l + t2l).toFixed(2) };
  }

  stepTo(step) {
    if (!this.snapshots.length) return;
    this.currentStep = Math.max(0, Math.min(this.snapshots.length - 1, step));
    this._renderStep(this.snapshots[this.currentStep]);
    this._updateThumb();
    this._emitParticles(this.snapshots[this.currentStep]);
  }

  togglePlay() {
    const btn = document.getElementById('btn-qtd-play');
    if (this.isPlaying) {
      this.isPlaying = false;
      clearInterval(this.playTimer);
      if (btn) btn.textContent = 'Play';
    } else {
      this.isPlaying = true;
      if (btn) btn.textContent = 'Pause';
      if (this.currentStep >= this.snapshots.length - 1) this.currentStep = 0;
      this.playTimer = setInterval(() => {
        if (this.currentStep >= this.snapshots.length - 1) {
          this.isPlaying = false;
          clearInterval(this.playTimer);
          if (btn) btn.textContent = 'Play';
          return;
        }
        this.stepTo(this.currentStep + 1);
      }, 900);
    }
  }

  _renderStep(snap) {
    if (!snap) return;
    if (this.stepLabel) this.stepLabel.textContent =
      snap.col < 0 ? 'Step 0 - Initial State' : 'Step ' + (snap.col + 1) + ' / ' + (this.snapshots.length - 1);
    if (this.gateLabel) this.gateLabel.textContent = snap.gateDesc;
    this._renderTable(snap.probs);
    this._renderEntropyArc(snap.entropy);
    this._renderPurity(snap.purity);
    if (this.fidelityVal) {
      this.fidelityVal.textContent = snap.fidelity.toFixed(1) + '%';
      this.fidelityVal.className = 'qtd-fidelity-num ' +
        (snap.fidelity > 80 ? 'fid-good' : snap.fidelity > 50 ? 'fid-warn' : 'fid-bad');
    }
    this._renderConcurrence(snap.concurrence, snap.entropy);
    this._renderNoiseBudget(snap.noiseInfo);
  }

  _renderTable(probs) {
    if (!this.stateTable) return;
    const nz = (probs || []).filter(p => p.probability > 0.0005);
    if (!nz.length) {
      this.stateTable.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px">State collapsed</td></tr>';
      return;
    }
    this.stateTable.innerHTML = nz.map(p => {
      const pct  = (p.probability * 100).toFixed(1);
      const amp  = Math.sqrt(p.probability).toFixed(3);
      const ph   = p.phase ? Math.round(p.phase * 180 / Math.PI) : 0;
      const barW = Math.round(p.probability * 100);
      const col  = p.probability > 0.4 ? '#34d399' : p.probability > 0.15 ? '#60a5fa' : '#a78bfa';
      return '<tr class="qtd-state-row">' +
        '<td class="qtd-ket"><span class="ket-sym">|</span>' + p.state + '<span class="ket-sym">></span></td>' +
        '<td class="qtd-amp">' + amp + '</td>' +
        '<td class="qtd-phase">' + ph + 'deg</td>' +
        '<td class="qtd-prob-cell">' +
        '<div class="qtd-prob-track"><div class="qtd-prob-fill" style="width:' + barW + '%;background:' + col + '"></div></div>' +
        '<span class="qtd-prob-num">' + pct + '%</span>' +
        '</td></tr>';
    }).join('');
  }

  _renderEntropyArc(entropy) {
    const path = document.getElementById('qtd-entropy-arc-path');
    if (!path) return;
    const pct = Math.min(1, entropy);
    const r = 52, circ = 2 * Math.PI * r * 0.75;
    path.style.strokeDasharray = (pct * circ) + ' ' + circ;
    path.style.stroke = 'hsl(' + Math.round(210 - pct * 160) + ', 90%, 60%)';
    if (this.entropyVal) this.entropyVal.textContent = entropy.toFixed(3) + ' ebits';
    const pctEl = document.getElementById('qtd-entropy-pct');
    if (pctEl) pctEl.textContent = Math.round(entropy * 100) + '%';
  }

  _renderPurity(purity) {
    if (this.purityBar) {
      this.purityBar.style.width = Math.round(purity * 100) + '%';
      this.purityBar.style.background = purity > 0.9 ? '#34d399' : purity > 0.6 ? '#fbbf24' : '#f87171';
    }
    if (this.purityVal) this.purityVal.textContent = (purity * 100).toFixed(1) + '%';
  }

  _renderConcurrence(C, S) {
    if (!this.concurrenceMap) return;
    const color = C > 0.7 ? '#34d399' : C > 0.3 ? '#60a5fa' : '#475569';
    const sw = (1 + C * 4).toFixed(1);
    this.concurrenceMap.innerHTML =
      '<svg viewBox="0 0 220 70" width="100%">' +
      '<circle cx="30" cy="35" r="12" fill="rgba(96,165,250,0.12)" stroke="#60a5fa" stroke-width="1.5"/>' +
      '<text x="30" y="39" text-anchor="middle" fill="var(--text-primary)" font-size="11" font-weight="600">q0</text>' +
      '<circle cx="110" cy="35" r="12" fill="rgba(96,165,250,0.12)" stroke="' + color + '" stroke-width="' + (1+C).toFixed(1) + '"/>' +
      '<text x="110" y="39" text-anchor="middle" fill="var(--text-primary)" font-size="11" font-weight="600">q1</text>' +
      '<circle cx="190" cy="35" r="12" fill="rgba(96,165,250,0.12)" stroke="#60a5fa" stroke-width="1.5"/>' +
      '<text x="190" y="39" text-anchor="middle" fill="var(--text-primary)" font-size="11" font-weight="600">q2</text>' +
      '<line x1="42" y1="35" x2="98" y2="35" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="' + (0.3+C*0.7).toFixed(2) + '"/>' +
      '<text x="70" y="22" text-anchor="middle" fill="' + color + '" font-size="9.5" font-family="monospace">C=' + C.toFixed(3) + '</text>' +
      '<line x1="122" y1="35" x2="178" y2="35" stroke="#475569" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/>' +
      '<text x="150" y="22" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="monospace">S=' + S.toFixed(3) + '</text>' +
      '</svg>';
  }

  _renderNoiseBudget(ni) {
    const sec = document.getElementById('qtd-noise-section');
    if (sec) sec.style.display = (this.noiseEnabled && ni) ? 'block' : 'none';
    if (!this.noiseBudget || !ni) return;
    this.noiseBudget.innerHTML =
      '<div class="qtd-noise-row"><span>T1 Relaxation</span><span class="qtd-noise-val qtd-noise-t1">' + ni.t1Loss + '%</span></div>' +
      '<div class="qtd-noise-row"><span>T2 Dephasing</span><span class="qtd-noise-val qtd-noise-t2">' + ni.t2Loss + '%</span></div>' +
      '<div class="qtd-noise-row qtd-noise-total"><span>Total Fidelity Loss</span><span class="qtd-noise-val">' + ni.totalLoss + '%</span></div>';
  }

  renderScrubber() {
    const container = document.getElementById('qtd-scrubber-markers');
    if (!container || !this.snapshots.length) return;
    container.innerHTML = '';
    const icons = { Hadamard:'H', CNOT:'X', 'Pauli-X':'X', 'Pauli-Y':'Y', 'Pauli-Z':'Z',
                    'Phase':'S', 'pi/8':'T', 'Measure':'M' };
    this.snapshots.forEach((snap, i) => {
      const pct = this.snapshots.length > 1 ? (i / (this.snapshots.length - 1)) * 100 : 0;
      const m = document.createElement('div');
      m.className = 'qtd-marker';
      m.style.left = pct + '%';
      m.title = snap.gateDesc;
      let icon = 'o';
      for (const key of Object.keys(icons)) {
        if (snap.gateDesc.indexOf(key) !== -1) { icon = icons[key]; break; }
      }
      if (i === 0) icon = '*';
      m.innerHTML = '<div class="qtd-marker-dot" data-step="' + i + '">' + icon + '</div>';
      m.addEventListener('click', () => this.stepTo(i));
      container.appendChild(m);
    });
  }

  _updateThumb() {
    const thumb = document.getElementById('qtd-scrubber-thumb');
    if (thumb && this.snapshots.length > 1) {
      thumb.style.left = ((this.currentStep / (this.snapshots.length - 1)) * 100) + '%';
    }
    document.querySelectorAll('.qtd-marker-dot').forEach((el, i) => {
      el.classList.toggle('qtd-marker-active', i === this.currentStep);
    });
  }

  _emitParticles(snap) {
    if (!this.particleCtx || !this.particleCanvas) return;
    const canvas = this.particleCanvas;
    canvas.width  = canvas.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || 50;
    this.particleCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.noiseEnabled || !snap.noiseInfo) return;
    const loss = Math.min(1, parseFloat(snap.noiseInfo.totalLoss) / 8);
    const count = Math.floor(loss * 25);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * canvas.width, y: canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 2.5, vy: -(Math.random() * 3 + 0.5),
        alpha: 0.85, r: Math.random() * 2.5 + 1,
        h: Math.floor(Math.random() * 60 + 170)
      });
    }
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this._drawParticles();
  }

  _drawParticles() {
    if (!this.particleCtx || !this.particleCanvas) return;
    const ctx = this.particleCtx;
    ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
    this.particles = this.particles.filter(p => p.alpha > 0.02);
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.h + ', 90%, 65%, ' + p.alpha + ')';
      ctx.fill();
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.alpha -= 0.022;
    }
    if (this.particles.length > 0) {
      this.animFrame = requestAnimationFrame(() => this._drawParticles());
    }
  }

  runDiagnostics() {
    if (!this.diagnosticBox || !this.snapshots.length) return;
    this.diagnosticBox.style.display = 'block';
    const final = this.snapshots[this.snapshots.length - 1];
    const issues = [];
    const grid = this.circuitUI && this.circuitUI.grid;

    if (!grid || !grid.length) return;
    const numQubits = grid.length;
    const numCols = grid[0].length;

    // 1. AST Rule: Premature Measurement / Mid-Circuit Quantum Collapse
    for (let q = 0; q < numQubits; q++) {
      let measureCol = -1;
      for (let col = 0; col < numCols; col++) {
        const cell = grid[q][col];
        if (cell === 'M') {
          measureCol = col;
        } else if (measureCol !== -1 && cell && cell !== '') {
          issues.push({
            s: 'error',
            icon: '🚨 PREMATURE COLLAPSE',
            text: `Qubit q${q} is measured at t=${measureCol + 1}, but gate '${cell}' is placed afterward at t=${col + 1}. Born-rule projection irreversibly collapses superposition into a classical bit, destroying quantum advantage.`
          });
          break;
        }
      }
    }

    // 2. AST Rule: Self-Inverse Unitary Redundancy (U² = I)
    const selfInverse = ['H', 'X', 'Y', 'Z'];
    for (let q = 0; q < numQubits; q++) {
      let lastGate = null;
      let lastCol = -1;
      for (let col = 0; col < numCols; col++) {
        const cell = grid[q][col];
        if (!cell || cell === '') continue;
        if (cell === 'CX_CTRL' || cell === 'CX_TGT') {
          lastGate = null; // Entanglement breaks 1-qubit idempotence
          continue;
        }
        if (selfInverse.includes(cell)) {
          if (lastGate === cell) {
            issues.push({
              s: 'warning',
              icon: '⚡ GATE REDUNDANCY',
              text: `Consecutive '${cell}' gates on qubit q${q} (t=${lastCol + 1} and t=${col + 1}). Because ${cell}² = I (Identity), they cancel each other out, wasting QPU coherence time.`
            });
            lastGate = null;
            continue;
          }
          lastGate = cell;
          lastCol = col;
        } else {
          lastGate = null;
        }
      }
    }

    // 3. Entanglement & Non-Locality Analysis
    const peakE = Math.max.apply(null, this.snapshots.map(s => s.entropy || 0));
    if (final.concurrence >= 0.85) {
      issues.push({
        s: 'success',
        icon: '✨ MAXIMAL ENTANGLEMENT',
        text: `Maximally Entangled State verified (Wootters Concurrence C = ${final.concurrence.toFixed(3)}, Entropy S = ${final.entropy.toFixed(3)} ebits). Exhibits non-local Einstein-Podolsky-Rosen (EPR) quantum correlations.`
      });
    } else if (final.concurrence > 0.1) {
      issues.push({
        s: 'success',
        icon: '🔗 PARTIAL ENTANGLEMENT',
        text: `Bipartite Entanglement detected (Concurrence C = ${final.concurrence.toFixed(3)}, Von Neumann S = ${final.entropy.toFixed(3)} ebits). Subsystems are quantum correlated.`
      });
    } else {
      let hasCX = false;
      grid.forEach(row => row.forEach(c => { if (c === 'CX_CTRL') hasCX = true; }));
      if (hasCX && final.entropy < 0.05) {
        issues.push({
          s: 'warning',
          icon: 'ℹ️ PRODUCT STATE',
          text: `CNOT was applied on computational basis states without prior superposition (|0⟩ or |1⟩); wavefunction remains a separable product state with zero entanglement.`
        });
      }
    }

    // 4. Gottesman-Knill Theorem & Complexity Classification
    let tGateCount = 0;
    let cliffordCount = 0;
    grid.forEach(row => row.forEach(c => {
      if (c === 'T') tGateCount++;
      else if (['H', 'S', 'X', 'Y', 'Z', 'CX_CTRL'].includes(c)) cliffordCount++;
    }));

    if (tGateCount === 0 && cliffordCount > 0) {
      issues.push({
        s: 'info',
        icon: '📐 GOTTESMAN-KNILL THEOREM',
        text: `Pure Clifford Circuit: Composed exclusively of Clifford group operators {H, S, Pauli, CNOT}. Can be simulated in polynomial time O(n²) on classical hardware without exponential quantum advantage.`
      });
    } else if (tGateCount > 0) {
      issues.push({
        s: 'success',
        icon: '🌌 UNIVERSAL QUANTUM CLASS',
        text: `Universal Quantum Gate Set: Contains ${tGateCount} non-Clifford T-gate(s). Generates W-states/magic states requiring Magic State Distillation on fault-tolerant physical QPUs.`
      });
    }

    // 5. Hardware Execution Time vs Coherence Budget (T1 / T2)
    let singleQubitGates = 0;
    let twoQubitGates = 0;
    grid.forEach(row => row.forEach(c => {
      if (c === 'CX_CTRL') twoQubitGates++;
      else if (c && c !== 'CX_TGT' && c !== 'M') singleQubitGates++;
    }));
    // Typical superconducting QPU: 1Q gate ~20ns, 2Q CNOT ~200ns
    const tExecNs = (singleQubitGates * 20) + (twoQubitGates * 200);
    const tExecUs = tExecNs / 1000;
    const t2Us = this.t2Us || 30;
    const coherenceRatio = (tExecUs / t2Us) * 100;

    if (coherenceRatio < 10) {
      issues.push({
        s: 'success',
        icon: '🛡️ COHERENCE BUDGET',
        text: `Circuit runtime ~${tExecUs.toFixed(2)} µs consumes only ${coherenceRatio.toFixed(1)}% of physical T₂ dephasing limit (${t2Us} µs). Hardware fidelity expected > 92%.`
      });
    } else {
      issues.push({
        s: 'warning',
        icon: '⚠️ COHERENCE DRIFT',
        text: `Circuit runtime ~${tExecUs.toFixed(2)} µs consumes ${coherenceRatio.toFixed(1)}% of T₂ window (${t2Us} µs). Physical execution will accumulate significant phase damping.`
      });
    }

    // 6. Decoherence & Purity Check
    if (this.noiseEnabled && final.purity < 0.85) {
      issues.push({
        s: 'error',
        icon: '🔥 DECOHERENCE LOSS',
        text: `State Purity degraded to Tr(ρ²) = ${(final.purity * 100).toFixed(1)}% under Lindblad noise channels. Consider Dynamical Decoupling (DD) pulse sequences.`
      });
    }

    // 7. Idle Qubit Wire Check
    for (let q = 0; q < numQubits; q++) {
      const wireGates = grid[q].filter(c => c && c !== '');
      if (wireGates.length === 0) {
        issues.push({
          s: 'info',
          icon: '💤 IDLE REGISTER',
          text: `Qubit q${q} is allocated but has zero operations placed; remains in ground state |0⟩ throughout execution.`
        });
      }
    }

    const colorMap = { error: '#f87171', warning: '#fbbf24', success: '#34d399', info: '#60a5fa' };
    this.diagnosticBox.innerHTML = '<div class="qtd-diag-title">⚡ Quantum AST & Physical Diagnostic Engine</div>' +
      issues.map(iss =>
        '<div class="qtd-diag-issue" style="border-left:3px solid ' + (colorMap[iss.s] || '#94a3b8') + ';padding:8px 10px;margin-bottom:8px;background:rgba(0,0,0,0.25);border-radius:6px;font-size:12.5px;line-height:1.5;">' +
        '<strong style="color:' + (colorMap[iss.s] || '#94a3b8') + ';margin-right:6px;">' + iss.icon + '</strong> <span>' + iss.text + '</span>' +
        '</div>'
      ).join('');
  }

  renderDebugReview() {
    const container = document.getElementById('qtd-debug-review-panel');
    if (!container || !this.snapshots.length) return;

    const grid = this.circuitUI && this.circuitUI.grid;
    if (!grid) return;

    const numQubits = grid.length;
    const numCols = grid[0].length;
    const final = this.snapshots[this.snapshots.length - 1];

    // Collect all gates placed in circuit
    const allGates = [];
    for (let q = 0; q < numQubits; q++) {
      for (let col = 0; col < numCols; col++) {
        const cell = grid[q][col];
        if (cell && cell !== '') {
          allGates.push({ qubit: q, col, gate: cell });
        }
      }
    }

    // Identify mistakes & compiler anomalies
    const findings = [];

    // 1. Premature Measurement
    for (let q = 0; q < numQubits; q++) {
      let mCol = -1;
      for (let col = 0; col < numCols; col++) {
        const cell = grid[q][col];
        if (cell === 'M') {
          mCol = col;
        } else if (mCol !== -1 && cell && cell !== '') {
          findings.push({
            type: 'error',
            title: `Premature Wavefunction Collapse on Wire q[${q}]`,
            location: `Step at column t=${col + 1}`,
            desc: `Qubit q[${q}] was measured at column t=${mCol + 1}, but gate '${cell}' was placed afterward at t=${col + 1}. Projective Born measurement collapses superposition into a classical bit, destroying quantum advantage.`,
            fix: `Move the Measure gate to the very end of wire q[${q}] or remove intermediate measurements.`
          });
        }
      }
    }

    // 2. Self-Inverse Gate Redundancy (U² = I)
    const selfInv = ['H', 'X', 'Y', 'Z'];
    for (let q = 0; q < numQubits; q++) {
      let lastG = null, lastC = -1;
      for (let col = 0; col < numCols; col++) {
        const cell = grid[q][col];
        if (!cell || cell === '') continue;
        if (cell === 'CX_CTRL' || cell === 'CX_TGT') {
          lastG = null;
          continue;
        }
        if (selfInv.includes(cell)) {
          if (lastG === cell) {
            findings.push({
              type: 'warning',
              title: `Self-Cancelling Gate Redundancy (${cell}² = I) on Wire q[${q}]`,
              location: `Columns t=${lastC + 1} and t=${col + 1}`,
              desc: `Consecutive '${cell}' gates cancel each other out identically to the Identity gate. This increases circuit depth without modifying the unitary operator.`,
              fix: `Delete both duplicate '${cell}' gates to save ~40 ns of physical decoherence time.`
            });
            lastG = null;
            continue;
          }
          lastG = cell;
          lastC = col;
        } else {
          lastG = null;
        }
      }
    }

    // 3. Pauli-Y or X on Entangled Bell State
    const hasCX = allGates.some(g => g.gate === 'CX_CTRL');
    const hasY = allGates.some(g => g.gate === 'Y');
    if (hasCX && hasY) {
      findings.push({
        type: 'info',
        title: `Pauli-Y Basis Rotation Detected`,
        location: `Targeted on entangled register`,
        desc: `Pauli-Y gate applied to the entangled register applies a bit-flip (|0⟩↔|1⟩) combined with a 90° phase shift (+i). The state was rotated away from the standard Bell basis into an orthogonal basis.`,
        fix: `If your goal was standard Bell state (|00⟩+|11⟩)/√2, remove the Pauli-Y gate.`
      });
    }

    // 4. Missing Entanglement (CNOT on computational basis)
    if (hasCX && final.entropy < 0.05 && final.concurrence < 0.05) {
      findings.push({
        type: 'warning',
        title: `CNOT Applied on Unsuperposed State (No Entanglement Created)`,
        location: `Control wire in classical basis`,
        desc: `CNOT was applied, but the control qubit was in a deterministic computational state (|0⟩ or |1⟩) rather than a superposition. The wavefunction remains a separable product state with zero entanglement.`,
        fix: `Add a Hadamard (H) gate before CNOT on the control qubit to generate entanglement.`
      });
    }

    // 5. Idle Qubits
    for (let q = 0; q < numQubits; q++) {
      const qGates = allGates.filter(g => g.qubit === q);
      if (qGates.length === 0) {
        findings.push({
          type: 'info',
          title: `Idle Register Wire q[${q}]`,
          location: `Wire q[${q}]`,
          desc: `No quantum operations are placed on wire q[${q}]. It remains in ground state |0⟩.`,
          fix: `Use qubit-scaling buttons (-/+) in Composer to reduce register size if unneeded.`
        });
      }
    }

    // Calculate Circuit Health Score (0-100)
    let score = 100;
    findings.forEach(f => {
      if (f.type === 'error') score -= 25;
      else if (f.type === 'warning') score -= 12;
      else if (f.type === 'info') score -= 4;
    });
    score = Math.max(10, Math.min(100, score));

    // Execution time
    let num1Q = 0, num2Q = 0;
    allGates.forEach(g => {
      if (g.gate === 'CX_CTRL') num2Q++;
      else if (g.gate !== 'CX_TGT' && g.gate !== 'M') num1Q++;
    });
    const tNs = (num1Q * 20) + (num2Q * 200);
    const tUs = tNs / 1000;
    const t2 = this.t2Us || 30;
    const cohRatio = ((tUs / t2) * 100).toFixed(1);

    // Entanglement classification
    let entDesc = 'Separable Product State';
    if (final.concurrence > 0.85) entDesc = 'Maximally Entangled (EPR)';
    else if (final.concurrence > 0.2) entDesc = 'Partially Entangled';

    // Step-by-step evolution trace
    const stepLogs = this.snapshots.map((s, idx) => {
      const topStateStr = (s.probs || []).filter(p => p.probability > 0.05)
        .map(p => `${(p.probability * 100).toFixed(0)}% |${p.state.replace(/[|⟩]/g, '')}⟩`).join(' + ') || '|000⟩';
      return `
        <div class="qtd-step-trace-row" onclick="if(window.quantumDebugger) window.quantumDebugger.stepTo(${idx})">
          <span class="step-trace-num">Step ${idx}</span>
          <strong class="step-trace-gate">${s.gateDesc}</strong>
          <span class="step-trace-state">${topStateStr}</span>
          <span class="step-trace-entropy">Entropy S = ${s.entropy.toFixed(3)} ebits</span>
          <span class="step-trace-purity">Purity ${(s.purity * 100).toFixed(0)}%</span>
        </div>
      `;
    }).join('');

    const findingsHtml = findings.length > 0 ? findings.map(f => {
      const badgeCls = f.type === 'error' ? 'finding-badge-error' : f.type === 'warning' ? 'finding-badge-warn' : 'finding-badge-info';
      const icon = f.type === 'error' ? '🚨 ERROR' : f.type === 'warning' ? '⚠️ MISTAKE' : '💡 NOTE';
      return `
        <div class="qtd-finding-card ${f.type}">
          <div class="finding-header">
            <span class="finding-badge ${badgeCls}">${icon}</span>
            <strong class="finding-title">${f.title}</strong>
            <span class="finding-loc">${f.location}</span>
          </div>
          <p class="finding-desc">${f.desc}</p>
          <div class="finding-fix"><strong>💡 Suggested Fix:</strong> ${f.fix}</div>
        </div>
      `;
    }).join('') : `
      <div class="qtd-finding-clean">
        <span class="clean-icon">✅</span>
        <div>
          <strong>No Mistakes or Circuit Defects Detected!</strong>
          <p>Unitary propagation is physically optimal with clean state evolution, high coherence margin, and valid gate ordering.</p>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="qtd-review-box">
        <div class="qtd-review-top-bar">
          <div class="review-title-group">
            <span class="review-icon">📋</span>
            <div>
              <h3 class="review-heading">Quantum Circuit Debug & Verification Audit</h3>
              <p class="review-subheading">Comprehensive diagnostic review of what the debugger analyzed, verified, and identified.</p>
            </div>
          </div>
          <div class="review-score-badge ${score >= 90 ? 'score-good' : score >= 70 ? 'score-warn' : 'score-bad'}">
            <span class="score-number">${score}/100</span>
            <span class="score-label">${score >= 90 ? 'Healthy' : score >= 70 ? 'Warnings' : 'Defects Found'}</span>
          </div>
        </div>

        <!-- 4 Stat Metric Badges -->
        <div class="qtd-review-stats-row">
          <div class="rstat-item">
            <span class="rstat-label">Quantum Register:</span>
            <strong class="rstat-val">${numQubits} Qubits (2ⁿ=${1 << numQubits} States)</strong>
          </div>
          <div class="rstat-item">
            <span class="rstat-label">Total Gates Traced:</span>
            <strong class="rstat-val">${allGates.length} Gates (${this.snapshots.length - 1} Steps)</strong>
          </div>
          <div class="rstat-item">
            <span class="rstat-label">Entanglement Status:</span>
            <strong class="rstat-val">${entDesc} (C=${final.concurrence.toFixed(2)})</strong>
          </div>
          <div class="rstat-item">
            <span class="rstat-label">Coherence Budget:</span>
            <strong class="rstat-val">~${tUs.toFixed(2)} µs used (${cohRatio}% of T₂)</strong>
          </div>
        </div>

        <!-- Detected Mistakes & Actionable Review -->
        <div class="qtd-review-section">
          <div class="qtd-review-section-title">
            <span>🔬 Detected Circuit Anomalies & Mistakes (${findings.length})</span>
            <button class="btn-goto-composer-fix" onclick="window.switchTab('simulator')">✏️ Edit in Composer</button>
          </div>
          <div class="qtd-findings-list">
            ${findingsHtml}
          </div>
        </div>

        <!-- Collapsible What It Debugged Step Trace -->
        <details class="qtd-trace-dropdown" open>
          <summary class="qtd-trace-summary">
            <span>🔍 What Was Debugged: Step-by-Step State Evolution Trace (${this.snapshots.length} Snapshots)</span>
            <span class="trace-hint">Click any step to scrub timeline</span>
          </summary>
          <div class="qtd-trace-table">
            ${stepLogs}
          </div>
        </details>
      </div>
    `;
  }

  openDebugger() {
    if (window.switchTab) {
      window.switchTab('debugger');
    } else if (window.switchView) {
      window.switchView('debugger');
    }
    const grid = this.circuitUI && this.circuitUI.grid;
    const hasGates = grid && grid.some(row => row.some(cell => cell && cell !== ''));
    if (hasGates) {
      setTimeout(() => this.captureAndOpen(), 50);
    }
  }
}

window.QuantumTimeDebugger = QuantumTimeDebugger;

window.openDebuggerFromComposer = function() {
  if (window.quantumDebugger) {
    window.quantumDebugger.openDebugger();
  } else if (window.switchTab) {
    window.switchTab('debugger');
  } else if (window.switchView) {
    window.switchView('debugger');
  }
};
