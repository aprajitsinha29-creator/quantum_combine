/**
 * Circuit UI Controller - Enhanced for Ananta Quantum Studio
 * Handles drag-and-drop / click-to-place gate grid, wire state changes,
 * step-by-step playback ("Quantum Time Machine"), phase clock dials,
 * live Dirac Bra-Ket math HUD, and Monte Carlo 1024-shot measurement laboratory.
 */

class CircuitUI {
  constructor(engine, blochSphere) {
    this.engine = engine;
    this.bloch = blochSphere;
    this.numQubits = 3;
    this.numCols = 6;
    this.selectedQubitForBloch = 0;

    // Grid: grid[qubit][col]. Starts empty (real |000...0> ground state) -
    // it used to start pre-loaded with a Bell circuit, which meant the very
    // first thing every user saw, before touching anything, was "Entangled
    // Bell State Active". That is not something the user built; it should
    // not be presented as if it were the result of any computation.
    this.grid = Array.from({ length: 3 }, () => Array(6).fill(null));
    this.activeDragGate = null;

    // Step-by-Step Playback Controller (-1 = full circuit, 0 = init |000⟩, 1..6 = after col 0..5)
    this.playbackStep = -1;
    this.isPlaying = false;
    this.playInterval = null;

    // Guided Algorithm Tour Controller
    this.currentTour = null;
    this.tourStep = 0;
    this.isTourAutoPlaying = false;
    this.tourAutoTimer = null;

    // Quantum Audio Synthesizer
    this.audio = window.QuantumAudioSynthesizer ? new window.QuantumAudioSynthesizer() : null;

    // View & Pedagogy Modes (2D Planar vs 3D Isometric Hologram, Beginner Intuition vs Advanced Research)
    this.dimensionMode = '2d';
    this.pedagogyMode = 'beginner';
    window.circuitUI = this;

    this.initDOM();
    this.bindEvents();
    this.bindStepperEvents();
    this.bindModeEvents();
    this.bindMeasurementEvents();
    this.bindTourEvents();
    this.bindAudioEvents();
    this.bindBlochPillEvents();
    this.initAnalyticsDeck();
    this.initGateEducationalTooltips();
    this.updateSimulation();
  }

  initDOM() {
    this.gridContainer = document.getElementById('circuit-grid');
    this.paletteContainer = document.getElementById('gate-palette');
    this.probsContainer = document.getElementById('probability-bars');
    this.qubitSelect = document.getElementById('bloch-qubit-select');
    this.coordsBadge = document.getElementById('bloch-coords');
    this.qiskitCodeBlock = document.getElementById('qiskit-code');
    this.qasmCodeBlock = document.getElementById('qasm-code');
    this.diracHud = document.getElementById('dirac-math-hud');
    this.densityContainer = document.getElementById('density-matrix-container');
    this.densityEntropyBadge = document.getElementById('density-entropy-badge');
    this.tourBar = document.getElementById('guided-algo-tour-bar');

    this.updateQubitScaleBadge();
    this.renderGrid();
  }

  setGate(qubit, col, gateName) {
    this.placeGate(gateName, qubit, col);
  }

  renderGrid() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    for (let q = 0; q < this.numQubits; q++) {
      const row = document.createElement('div');
      row.className = 'circuit-wire-row';
      row.setAttribute('data-qubit', q);

      // Qubit Label
      const label = document.createElement('div');
      label.className = 'wire-label';
      label.innerHTML = `<span class="wire-name">q<sub>${q}</sub></span> <span class="wire-state">|0⟩</span>`;
      row.appendChild(label);

      // Wire track with continuous luminous quantum line
      const wireTrack = document.createElement('div');
      wireTrack.className = 'wire-track';

      // Live animated quantum photon stream layer
      const photonLayer = document.createElement('div');
      photonLayer.className = 'photon-stream-layer';
      photonLayer.innerHTML = '<div class="photon-particle"></div><div class="photon-particle"></div>';
      wireTrack.appendChild(photonLayer);

      for (let c = 0; c < this.numCols; c++) {
        const slot = document.createElement('div');
        slot.className = 'gate-slot';
        slot.setAttribute('data-qubit', q);
        slot.setAttribute('data-col', c);
        slot.id = `slot-${q}-${c}`;

        // If step playback is active, highlight active column
        if (this.playbackStep >= 1 && c === (this.playbackStep - 1)) {
          slot.classList.add('active-step-col');
        }

        // Render placed gate if any
        const gate = this.grid[q][c];
        if (gate) {
          slot.classList.add('has-gate');
          slot.appendChild(this.createGateElement(gate, q, c));
        } else if (window.selectedPaletteGate) {
          slot.classList.add('ready-to-place');
        }

        // Dragover / Drop handlers
        slot.addEventListener('dragover', (e) => {
          e.preventDefault();
          slot.classList.add('drag-hover');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-hover'));
        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          slot.classList.remove('drag-hover');
          const droppedGate = e.dataTransfer.getData('text/plain') || this.activeDragGate;
          if (droppedGate) {
            this.placeGate(droppedGate, q, c);
          }
        });

        // Click to place, remove, or guide
        slot.addEventListener('click', () => {
          if (window.selectedPaletteGate) {
            this.placeGate(window.selectedPaletteGate, q, c);
          } else if (this.grid[q][c]) {
            this.removeGate(q, c);
          } else {
            const hint = document.getElementById('palette-hint-text');
            if (hint) {
              hint.innerHTML = '👉 <strong>Select a gate first:</strong> Click H, ⊕, X, or Z on the left to arm it!';
              const bar = document.getElementById('palette-hint-bar');
              if (bar) {
                bar.classList.add('hint-alert');
                setTimeout(() => bar.classList.remove('hint-alert'), 1200);
              }
            }
          }
        });

        wireTrack.appendChild(slot);
      }

      row.appendChild(wireTrack);
      this.gridContainer.appendChild(row);
    }

    // Render vertical CNOT quantum entanglement connectors
    setTimeout(() => {
      this.renderCnotConnectors();
      this.bindGateTooltips();
    }, 10);
  }

  renderCnotConnectors() {
    document.querySelectorAll('.cnot-vertical-connector').forEach(el => el.remove());

    for (let c = 0; c < this.numCols; c++) {
      let ctrlQubit = -1;
      let tgtQubit = -1;
      for (let q = 0; q < this.numQubits; q++) {
        if (this.grid[q][c] === 'CX_CTRL') ctrlQubit = q;
        if (this.grid[q][c] === 'CX_TGT') tgtQubit = q;
      }

      if (ctrlQubit !== -1 && tgtQubit !== -1) {
        const topQ = Math.min(ctrlQubit, tgtQubit);
        const botQ = Math.max(ctrlQubit, tgtQubit);
        const topSlot = document.getElementById(`slot-${topQ}-${c}`);
        const botSlot = document.getElementById(`slot-${botQ}-${c}`);

        if (topSlot && botSlot) {
          const rectTop = topSlot.getBoundingClientRect();
          const rectBot = botSlot.getBoundingClientRect();
          const gridRect = this.gridContainer.getBoundingClientRect();

          const connector = document.createElement('div');
          connector.className = 'cnot-vertical-connector';
          const topPos = (rectTop.top + rectTop.height / 2) - gridRect.top;
          const height = (rectBot.top + rectBot.height / 2) - (rectTop.top + rectTop.height / 2);
          const leftPos = (rectTop.left + rectTop.width / 2) - gridRect.left;

          connector.style.top = `${topPos}px`;
          connector.style.left = `${leftPos}px`;
          connector.style.height = `${height}px`;

          this.gridContainer.appendChild(connector);
        }
      }
    }
  }

  createGateElement(gateName, qubit, col) {
    const el = document.createElement('div');
    const cssName = gateName.toLowerCase().replace('_ctrl', '-ctrl').replace('_tgt', '-tgt');
    el.className = `placed-gate gate-chip gate-${cssName}`;
    el.setAttribute('data-gate', gateName);

    // A Toffoli shares its wire tokens with an ordinary CNOT (two CX_CTRL
    // cells + one CX_TGT in the same column instead of one), so the control
    // dot is labelled generically — the actual gate identity (CNOT vs
    // Toffoli) is what the simulator and the AI tutor report, not this glyph.
    if (gateName === 'CX_CTRL') {
      el.className += ' gate-cnot-ctrl';
      el.innerHTML = '<span class="cnot-dot">●</span><span class="gate-sublabel">CTRL</span>';
    } else if (gateName === 'CX_TGT') {
      el.className += ' gate-cnot-tgt';
      el.innerHTML = '<span class="cnot-cross">⊕</span><span class="gate-sublabel">TGT</span>';
    } else if (gateName === 'SWAP') {
      el.className += ' gate-swap';
      el.innerHTML = '<span class="cnot-dot">⤫</span><span class="gate-sublabel">SWAP</span>';
    } else {
      const sublabels = {
        'H': 'Superpos',
        'X': 'NOT Flip',
        'Y': 'Pauli-Y',
        'Z': 'Phase',
        'S': '90° Phase',
        'T': '45° Phase',
        'M': 'Measure'
      };
      const displayKey = gateName === 'M' ? '∿' : gateName;
      el.innerHTML = `
        <span class="gate-main-letter">${displayKey}</span>
        <span class="gate-sublabel">${sublabels[gateName] || ''}</span>
      `;
    }

    const del = document.createElement('span');
    del.className = 'gate-delete-x';
    del.textContent = '✕';
    del.title = 'Remove gate';
    el.appendChild(del);

    el.title = `${gateName} on Wire q[${qubit}], Column ${col + 1} (Click to remove)`;
    return el;
  }

  runInteractiveSimulation() {
    const btn = document.getElementById('btn-run-calc');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⚡ Simulating Wavefunction...';
      btn.classList.add('sim-active');
    }

    if (this.audio && this.audio.isEnabled) {
      this.audio.playStatevectorChord(this.engine.getProbabilities());
    }

    // Visual wave packet sweep across columns
    for (let c = 0; c < this.numCols; c++) {
      setTimeout(() => {
        for (let q = 0; q < this.numQubits; q++) {
          const s = document.getElementById(`slot-${q}-${c}`);
          if (s) {
            s.classList.add('pulse-sweep');
            setTimeout(() => s.classList.remove('pulse-sweep'), 280);
          }
        }
      }, c * 75);
    }

    setTimeout(() => {
      this.updateSimulation();
      if (btn) {
        btn.innerHTML = '✓ Simulation Complete (100% Fidelity)';
        btn.classList.remove('sim-active');
        btn.classList.add('sim-done');
        setTimeout(() => {
          btn.innerHTML = 'Run Circuit Simulation ⚡';
          btn.disabled = false;
          btn.classList.remove('sim-done');
        }, 1200);
      }
    }, this.numCols * 75 + 100);
  }

  placeGate(gateName, qubit, col, explicitTarget = null) {
    const touchedWires = [qubit];

    if (gateName === 'CX' || gateName === 'CNOT') {
      const targetQubit = explicitTarget !== null ? explicitTarget : (qubit + 1) % this.numQubits;
      this.grid[qubit][col] = 'CX_CTRL';
      this.grid[targetQubit][col] = 'CX_TGT';
      touchedWires.push(targetQubit);
    } else if (gateName === 'SWAP') {
      const otherQubit = explicitTarget !== null ? explicitTarget : (qubit + 1) % this.numQubits;
      this.grid[qubit][col] = 'SWAP';
      this.grid[otherQubit][col] = 'SWAP';
      touchedWires.push(otherQubit);
    } else if (gateName === 'Toffoli' || gateName === 'CCX') {
      // A Toffoli needs three distinct wires; grow the register if the click
      // landed on a circuit that doesn't have two free neighbors yet.
      while (this.numQubits < 3) this.addQubit();
      const controlB = (qubit + 1) % this.numQubits;
      let target = (qubit + 2) % this.numQubits;
      if (target === controlB) target = (controlB + 1) % this.numQubits;
      this.grid[qubit][col] = 'CX_CTRL';
      this.grid[controlB][col] = 'CX_CTRL';
      this.grid[target][col] = 'CX_TGT';
      touchedWires.push(controlB, target);
    } else {
      this.grid[qubit][col] = gateName;
    }

    this.renderGrid();
    this.updateSimulation();

    // Trigger dynamic shockwave burst animation on every wire the gate touched
    touchedWires.forEach(w => {
      const slot = document.getElementById(`slot-${w}-${col}`);
      if (slot) {
        slot.classList.add('gate-shockwave');
        setTimeout(() => slot.classList.remove('gate-shockwave'), 500);
      }
    });
  }

  removeGate(qubit, col) {
    const current = this.grid[qubit][col];
    if (current === 'CX_CTRL' || current === 'CX_TGT') {
      for (let q = 0; q < this.numQubits; q++) {
        const c = this.grid[q][col];
        if (c === 'CX_CTRL' || c === 'CX_TGT') {
          this.grid[q][col] = null;
        }
      }
    } else {
      this.grid[qubit][col] = null;
    }

    this.renderGrid();
    this.updateSimulation();
  }

  moveGate(fromQ, fromCol, toQ, toCol) {
    if (fromQ === undefined || fromCol === undefined) return false;
    fromQ = Math.max(0, Math.min(this.numQubits - 1, parseInt(fromQ, 10) || 0));
    fromCol = Math.max(0, Math.min(this.numCols - 1, parseInt(fromCol, 10) || 0));

    toQ = toQ !== undefined ? parseInt(toQ, 10) : fromQ;
    toCol = toCol !== undefined ? parseInt(toCol, 10) : fromCol;

    while (this.numQubits <= toQ && this.numQubits < 8) {
      this.addQubit();
    }
    toQ = Math.max(0, Math.min(this.numQubits - 1, toQ));
    toCol = Math.max(0, Math.min(this.numCols - 1, toCol));

    let gate = this.grid[fromQ] ? this.grid[fromQ][fromCol] : null;
    if (!gate) {
      // Find closest gate on wire fromQ if specified slot was empty
      for (let c = 0; c < this.numCols; c++) {
        if (this.grid[fromQ] && this.grid[fromQ][c]) {
          gate = this.grid[fromQ][c];
          fromCol = c;
          break;
        }
      }
    }
    if (!gate) return false;

    if (gate === 'CX_CTRL' || gate === 'CX_TGT') {
      let ctrlQ = -1, tgtQ = -1;
      for (let q = 0; q < this.numQubits; q++) {
        if (this.grid[q][fromCol] === 'CX_CTRL') ctrlQ = q;
        if (this.grid[q][fromCol] === 'CX_TGT') tgtQ = q;
        this.grid[q][fromCol] = null;
      }
      if (ctrlQ !== -1 && tgtQ !== -1) {
        this.grid[ctrlQ][toCol] = 'CX_CTRL';
        this.grid[tgtQ][toCol] = 'CX_TGT';
      }
    } else if (gate === 'SWAP') {
      const swapWires = [];
      for (let q = 0; q < this.numQubits; q++) {
        if (this.grid[q][fromCol] === 'SWAP') {
          swapWires.push(q);
          this.grid[q][fromCol] = null;
        }
      }
      for (const q of swapWires) {
        this.grid[q][toCol] = 'SWAP';
      }
    } else {
      this.grid[fromQ][fromCol] = null;
      this.grid[toQ][toCol] = gate;
    }

    this.renderGrid();
    this.updateSimulation();
    if (this.renderCnotConnectors) this.renderCnotConnectors();
    if (this.bindGateTooltips) this.bindGateTooltips();
    return true;
  }

  clearCircuit() {
    this.playbackStep = -1;
    this.stopPlayback();
    this.grid = Array.from({ length: this.numQubits }, () => Array(this.numCols).fill(null));
    this.renderGrid();
    this.updateSimulation();
    const lbl = document.getElementById('circuit-filename-label');
    if (lbl) lbl.textContent = 'untitled_circuit.qc';
    this.updatePresetHighlight(null);
  }

  loadPreset(gridData, presetKey = null) {
    this.playbackStep = -1;
    this.stopPlayback();
    if (gridData && gridData.length && gridData.length !== this.numQubits) {
      this.numQubits = Math.max(2, Math.min(8, gridData.length));
      this.engine.setNumQubits(this.numQubits);
      this.updateQubitScaleBadge();
    }
    this.grid = gridData.map(row => [...row]);
    this.renderGrid();
    this.updateSimulation();
    this.updatePresetHighlight(presetKey);
  }

  loadCircuit(gridData, presetKey = null) {
    this.loadPreset(gridData, presetKey);
  }

  // =========================================================================
  // DYNAMIC PRESET HIGHLIGHT & FILENAME TRACKER
  // =========================================================================
  detectMatchingPreset() {
    if (!this.grid) return null;

    const CANONICAL_PRESETS = {
      bell: [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', null, null, null, null]
      ],
      ghz: [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', 'CX_CTRL', null, null, null],
        [null, null, 'CX_TGT', null, null, null]
      ],
      teleport: [
        ['H', null, 'CX_CTRL', 'H', null, null],
        [null, 'H', 'CX_TGT', null, 'CX_CTRL', null],
        [null, null, 'CX_TGT', null, 'CX_TGT', null]
      ],
      grover: [
        ['H', 'Z', 'H', 'X', 'H', null],
        ['H', 'CX_TGT', 'H', 'X', 'H', null]
      ],
      vqe: [
        ['X', 'H', 'CX_CTRL', 'H', null, null],
        [null, 'H', 'CX_TGT', 'S', null, null]
      ],
      chsh: [
        ['H', 'CX_CTRL', 'H', null, null, null],
        [null, 'CX_TGT', 'S', 'H', null, null]
      ],
      qft: [
        ['H', 'S', 'T', null, null, null],
        [null, null, 'H', 'S', null, null],
        [null, null, null, null, 'H', null]
      ]
    };

    for (const [key, pGrid] of Object.entries(CANONICAL_PRESETS)) {
      let isMatch = true;
      const numRows = Math.max(this.grid.length, pGrid.length);
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < this.numCols; c++) {
          const actual = (this.grid[r] && this.grid[r][c]) ? this.grid[r][c] : null;
          const expected = (pGrid[r] && pGrid[r][c]) ? pGrid[r][c] : null;
          if (actual !== expected) {
            isMatch = false;
            break;
          }
        }
        if (!isMatch) break;
      }
      if (isMatch) return key;
    }
    return null;
  }

  updatePresetHighlight(explicitPreset = null) {
    const activeKey = explicitPreset !== undefined && explicitPreset !== null 
      ? explicitPreset 
      : this.detectMatchingPreset();

    const container = document.getElementById('composer-preset-bar') || document.querySelector('.quick-tools');
    if (container) {
      const buttons = container.querySelectorAll('.tool-btn');
      buttons.forEach(btn => {
        const pKey = btn.getAttribute('data-preset');
        const oc = btn.getAttribute('onclick') || '';
        const isMatch = activeKey && (
          pKey === activeKey || 
          oc.includes(`'${activeKey}'`) || 
          oc.includes(`"${activeKey}"`)
        );
        if (isMatch) {
          btn.classList.add('active-preset');
        } else {
          btn.classList.remove('active-preset');
        }
      });
    }

    const lbl = document.getElementById('circuit-filename-label');
    if (lbl) {
      const PRESET_FILENAMES = {
        bell: 'bell_state.qc',
        ghz: 'ghz_state_tripartite.qc',
        teleport: 'quantum_teleportation.qc',
        grover: 'grover_search.qc',
        vqe: 'vqe_molecular_h2.qc',
        chsh: 'chsh_bell_inequality.qc',
        qft: 'quantum_fourier_transform.qc'
      };
      if (activeKey && PRESET_FILENAMES[activeKey]) {
        lbl.textContent = PRESET_FILENAMES[activeKey];
      } else if (!activeKey) {
        const cur = lbl.textContent || '';
        if (cur.endsWith('.qc') && cur !== 'untitled_circuit.qc') {
          lbl.textContent = 'custom_circuit.qc';
        }
      }
    }
  }

  // =========================================================================
  // DYNAMIC QUBIT REGISTER SCALING (3 to 8 Qubits Expandable Architecture)
  // =========================================================================
  addQubit() {
    if (this.numQubits >= 8) {
      alert('Maximum browser capacity reached (8 Qubits = 256 state amplitudes). For 100+ qubits, connect physical hardware using 🚀 Cloud QPU!');
      return;
    }
    this.numQubits++;
    this.grid.push(new Array(this.numCols).fill(null));
    this.engine.setNumQubits(this.numQubits);
    this.renderGrid();
    this.updateQubitScaleBadge();
    this.updateSimulation();
  }

  removeQubit() {
    if (this.numQubits <= 2) {
      alert('Minimum circuit size is 2 Qubits (for multi-qubit entanglement gates).');
      return;
    }
    const lastRow = this.grid[this.numQubits - 1];
    const hasGates = lastRow.some(cell => cell !== null);
    if (hasGates) {
      if (!confirm(`Qubit q${this.numQubits - 1} contains active gates. Are you sure you want to remove it?`)) {
        return;
      }
    }
    this.numQubits--;
    this.grid.pop();
    if (this.selectedQubitForBloch >= this.numQubits) {
      this.selectedQubitForBloch = this.numQubits - 1;
    }
    this.engine.setNumQubits(this.numQubits);
    this.renderGrid();
    this.updateQubitScaleBadge();
    this.updateSimulation();
  }

  updateQubitScaleBadge() {
    const badge = document.getElementById('qubit-count-badge');
    if (badge) {
      const sups = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸' };
      const sup = sups[this.numQubits] || `^${this.numQubits}`;
      badge.textContent = `${this.numQubits} Qubits (2${sup} = ${Math.pow(2, this.numQubits)} States)`;
    }
    const select = document.getElementById('bloch-qubit-select');
    if (select) {
      select.innerHTML = '';
      for (let q = 0; q < this.numQubits; q++) {
        const opt = document.createElement('option');
        opt.value = q;
        opt.textContent = `Qubit ${q} (q[${q}])`;
        if (q === this.selectedQubitForBloch) opt.selected = true;
        select.appendChild(opt);
      }
    }
    this.bindBlochPillEvents();
  }

  // =========================================================================
  // STEP-BY-STEP PLAYBACK CONTROLLER ("Quantum Time Machine")
  // =========================================================================
  bindStepperEvents() {
    const btnStart = document.getElementById('btn-step-start');
    const btnPrev = document.getElementById('btn-step-prev');
    const btnPlay = document.getElementById('btn-step-play');
    const btnNext = document.getElementById('btn-step-next');
    const btnEnd = document.getElementById('btn-step-end');

    if (btnStart) btnStart.addEventListener('click', () => this.seekStep(0));
    if (btnPrev) btnPrev.addEventListener('click', () => this.stepBackward());
    if (btnPlay) btnPlay.addEventListener('click', () => this.togglePlayPause());
    if (btnNext) btnNext.addEventListener('click', () => this.stepForward());
    if (btnEnd) btnEnd.addEventListener('click', () => this.seekStep(this.numCols));
  }

  seekStep(stepIndex) {
    this.playbackStep = stepIndex;
    this.updateSimulation();
    this.renderGrid();
    this.updateStepperDisplay();
  }

  stepForward() {
    if (this.playbackStep === -1) this.playbackStep = 0;
    if (this.playbackStep < this.numCols) {
      this.seekStep(this.playbackStep + 1);
    }
  }

  stepBackward() {
    if (this.playbackStep > 0) {
      this.seekStep(this.playbackStep - 1);
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback() {
    this.isPlaying = true;
    const playBtn = document.getElementById('btn-step-play');
    if (playBtn) playBtn.innerHTML = '⏸ Pause';

    if (this.playbackStep === -1 || this.playbackStep >= this.numCols) {
      this.seekStep(0);
    }

    this.playInterval = setInterval(() => {
      if (this.playbackStep < this.numCols) {
        this.stepForward();
      } else {
        this.stopPlayback();
      }
    }, 850);
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    const playBtn = document.getElementById('btn-step-play');
    if (playBtn) playBtn.innerHTML = '▶ Play';
  }

  updateStepperDisplay() {
    const counter = document.getElementById('step-counter-display');
    if (!counter) return;

    if (this.playbackStep === -1 || this.playbackStep === this.numCols) {
      counter.innerHTML = `<strong>Full Circuit State</strong> (Step ${this.numCols} of ${this.numCols})`;
    } else if (this.playbackStep === 0) {
      counter.innerHTML = `<strong>Initial Ground State</strong> (|000⟩ Before Gates)`;
    } else {
      counter.innerHTML = `<strong>Step ${this.playbackStep} of ${this.numCols}</strong> (Column ${this.playbackStep} Evaluated)`;
    }
  }

  // =========================================================================
  // SIMULATION PIPELINE & DIAGNOSTICS
  // =========================================================================
  updateSimulation() {
    // Run up to current playback step or full circuit
    if (this.playbackStep === -1 || this.playbackStep >= this.numCols) {
      this.engine.runCircuit(this.grid);
    } else if (this.playbackStep === 0) {
      this.engine.reset();
    } else {
      this.engine.runCircuitUpToCol(this.grid, this.playbackStep - 1);
    }

    const probs = this.engine.getProbabilities();
    this.renderProbabilities(probs);

    // Update Dirac Math HUD
    if (this.diracHud) {
      this.diracHud.textContent = this.engine.getDiracNotation();
    }

    // Update Bloch Sphere for chosen qubit. The engine itself is passed
    // through so the sphere's narrative can compute real pairwise
    // concurrence to name which qubit(s) this one is actually entangled
    // with, instead of assuming a fixed q[0]/q[1] Bell pair regardless of
    // what circuit is on the grid.
    const blochCoords = this.engine.getBlochCoordinates(this.selectedQubitForBloch);
    if (this.bloch) {
      this.bloch.updateCoordinates(blochCoords, this.selectedQubitForBloch, this.engine);
    }

    // Update Coordinate Badges
    if (this.coordsBadge) {
      const qIdx = this.selectedQubitForBloch ?? 0;
      const r = blochCoords.r !== undefined ? blochCoords.r : Math.sqrt(blochCoords.x * blochCoords.x + blochCoords.y * blochCoords.y + blochCoords.z * blochCoords.z);
      const isMixed = r < 0.95;
      const stateBadge = r < 0.15 
        ? '<span style="color:#f472b6; font-weight:700;">⚡ Entangled Mixed Subsystem (|r| = 0.00)</span>' 
        : (isMixed ? `<span style="color:#fbbf24; font-weight:600;">Mixed Subsystem (|r| = ${r.toFixed(2)})</span>` : '<span style="color:#34d399; font-weight:600;">Pure State (|r| = 1.00)</span>');

      this.coordsBadge.innerHTML = `
        <span class="badge-item" style="background: rgba(56, 189, 248, 0.22); border: 1px solid #38bdf8; color: #38bdf8; font-weight: 700; padding: 2px 8px; border-radius: 4px;">🎯 Target: q[${qIdx}]</span>
        <span class="badge-item"><strong>State:</strong> ${stateBadge}</span>
        <span class="badge-item"><strong>X:</strong> ${blochCoords.x.toFixed(2)}</span>
        <span class="badge-item"><strong>Y:</strong> ${blochCoords.y.toFixed(2)}</span>
        <span class="badge-item"><strong>Z:</strong> ${blochCoords.z.toFixed(2)}</span>
        <span class="badge-item"><strong>Purity Tr(ρ²):</strong> ${(blochCoords.purity !== undefined ? blochCoords.purity : (0.5 * (1 + r * r))).toFixed(2)}</span>
        <span class="badge-item state-amp"><strong>P(|0⟩):</strong> ${(blochCoords.p0 !== undefined ? blochCoords.p0 : 1).toFixed(2)}</span>
        <span class="badge-item state-amp"><strong>P(|1⟩):</strong> ${(blochCoords.p1 !== undefined ? blochCoords.p1 : 0).toFixed(2)}</span>
      `;
    }

    // Keep quick pill buttons visually active in sync with selectedQubitForBloch
    const pillContainer = document.getElementById('bloch-quick-pills');
    if (pillContainer) {
      pillContainer.querySelectorAll('.bloch-pill-btn').forEach(p => {
        const qVal = parseInt(p.getAttribute('data-qubit'), 10);
        p.classList.toggle('active', qVal === this.selectedQubitForBloch);
      });
    }

    // Check for Multi-Qubit Entanglement in Circuit
    this.updateEntanglementBadge(probs);

    // Update Export Code. app.js owns this panel because it knows which
    // framework tab is selected; writing toQiskit() directly here overwrote
    // that choice on every gate change.
    if (typeof window.anantaRenderExportCode === 'function') {
      window.anantaRenderExportCode();
    } else if (this.qiskitCodeBlock) {
      // First paint, before app.js has wired up: fall back to the framework
      // the markup marks active rather than assuming Qiskit.
      const activeBtn = document.querySelector('.export-tab-btn.active');
      const fw = (activeBtn && activeBtn.getAttribute('data-export')) || 'qiskit';
      this.qiskitCodeBlock.textContent = this.engine.exportCode(this.grid, fw);
    }
    if (this.qasmCodeBlock) {
      this.qasmCodeBlock.textContent = this.engine.toQASM(this.grid);
    }


    // Check gamified missions
    if (window.missionManager) {
      window.missionManager.evaluate(this.grid, probs);
    }

    // Update Hardware Studio (Noise & Skills)
    if (window.hwStudio) {
      window.hwStudio.updateNoiseDisplay();
      window.hwStudio.checkSkillUnlocks();
    }

    // Render Quantum Density Matrix Heatmap
    this.renderDensityMatrix();

    // Render Academic Suite (Unitary Matrix, LaTeX Derivations, Entanglement Metrics)
    this.renderUnitaryInspector();
    this.renderAnalyticalDerivation();
    this.renderEntanglementMetrics();

    // Play Quantum State Harmony Audio if enabled
    if (this.audio && this.audio.isEnabled) {
      this.audio.playStatevectorChord(probs);
    }

    // Update Guided Algorithm Tour banner
    if (this.currentTour) {
      this.updateTourBanner();
    }

    this.updateStepperDisplay();
    this.updateQuantumIntelligenceDeck();
    this.updatePresetHighlight();

    // Notify AI Circuit Tutor (SIH 26140) of circuit state change
    if (window.circuitTutor) {
      window.circuitTutor.onCircuitChanged();
    }

    // Dynamically update Pauli Observables on left sidebar
    if (window._renderPauliGauges) {
      window._renderPauliGauges();
    }
  }

  // Reports which gates are actually present, purely as a fact about the
  // grid - used to describe what operations ran, never to decide WHETHER or
  // WHAT KIND of entanglement exists. That decision belongs entirely to
  // QuantumCircuitEngine.getAdvancedEntanglementMetrics() (real Wootters
  // concurrence + per-qubit entropy + monogamy, computed from the actual
  // statevector), which is the only source of truth this file reads from
  // for classification. This method used to also compute "does the gate
  // list exactly equal H+CNOT" and use THAT to decide whether to show a
  // Bell-state label - which is backwards: whether a state is a genuine
  // Bell pair is a property of the resulting quantum state (concurrence,
  // entropy), not of which specific gates were used to reach it. H+CNOT+S
  // is still exactly as much a Bell pair as bare H+CNOT is; gating the
  // label on an exact gate-list match just meant the label silently
  // vanished for any circuit built slightly differently from the preset.
  analyzeGateComposition() {
    const grid = this.grid;
    const hasX = grid && grid.some(row => row.some(c => c === 'X'));
    const hasY = grid && grid.some(row => row.some(c => c === 'Y'));
    const hasZ = grid && grid.some(row => row.some(c => c === 'Z'));
    const hasS = grid && grid.some(row => row.some(c => c === 'S'));
    const hasT = grid && grid.some(row => row.some(c => c === 'T'));
    const hasM = grid && grid.some(row => row.some(c => c === 'M'));

    let hasToffoli = false, hasCnot = false, hasSwap = false, cnotCount = 0;
    if (grid && grid.length && grid[0]) {
      const numCols = grid[0].length;
      for (let col = 0; col < numCols; col++) {
        let controls = 0, hasTarget = false, swapWires = 0;
        for (let q = 0; q < grid.length; q++) {
          const cell = grid[q][col];
          if (cell === 'CX_CTRL') controls++;
          else if (cell === 'CX_TGT') hasTarget = true;
          else if (cell === 'SWAP') swapWires++;
        }
        if (hasTarget && controls === 2) hasToffoli = true;
        else if (hasTarget && controls === 1) { hasCnot = true; cnotCount++; }
        if (swapWires >= 2) hasSwap = true;
      }
    }

    const entanglingGateNames = [hasToffoli && 'Toffoli', hasCnot && 'CNOT', hasSwap && 'SWAP'].filter(Boolean);
    const entanglingGatesLabel = entanglingGateNames.length > 0 ? entanglingGateNames.join(' / ') : 'multi-qubit';

    return { hasX, hasY, hasZ, hasS, hasT, hasM, hasToffoli, hasCnot, hasSwap, cnotCount, entanglingGatesLabel };
  }

  updateEntanglementBadge(probs) {
    const badge = document.getElementById('entanglement-status-indicator');
    if (!badge) return;

    const activeStates = (probs || []).filter(p => p.probability > 0.05);
    const m = this.engine && this.engine.getAdvancedEntanglementMetrics ? this.engine.getAdvancedEntanglementMetrics() : null;
    const isEntangled = m ? (m.concurrence > 0.05 || m.vonNeumannEntropy > 0.05) : false;

    if (isEntangled) {
      // Whatever entanglementClass the engine actually computed for THIS
      // statevector (real concurrence/entropy/monogamy, not a pattern
      // lookup) - the parenthetical qualifier is dropped for the small
      // badge, C and S are shown so the number backing the label is always
      // visible right next to it.
      const shortClass = m.entanglementClass.split(' (')[0];
      badge.style.display = 'inline-flex';
      badge.innerHTML = `🔗 ${shortClass} (C=${m.concurrence.toFixed(2)}, S=${m.vonNeumannEntropy.toFixed(2)})`;
    } else if (activeStates.length > 1) {
      badge.style.display = 'inline-flex';
      badge.innerHTML = `🪙 Superposition (${activeStates.length} States)`;
    } else {
      badge.style.display = 'none';
    }
  }

  // =========================================================================
  // STATEVECTOR PROBABILITIES & PHASE CLOCKS (Q-Sphere Representation)
  // =========================================================================
  renderProbabilities(probs) {
    if (!this.probsContainer) return;
    this.probsContainer.innerHTML = '';

    probs.forEach(item => {
      const pct = (item.probability * 100).toFixed(1);
      const isDominant = item.probability > 0.05;

      const barRow = document.createElement('div');
      barRow.className = `prob-bar-row ${isDominant ? 'active-state' : 'inactive-state'}`;
      
      // Build Phase Clock SVG
      const phaseClockHtml = this.createPhaseClockSVG(item);

      barRow.innerHTML = `
        <div class="prob-state-label">${item.state}</div>
        ${phaseClockHtml}
        <div class="prob-bar-track">
          <div class="prob-bar-fill" style="width: ${pct}%"></div>
        </div>
        <div class="prob-val-label">${pct}%</div>
      `;
      this.probsContainer.appendChild(barRow);
    });
  }

  createPhaseClockSVG(item) {
    const rad = item.phase;
    const deg = Math.round((rad / Math.PI) * 180);
    const amp = Math.sqrt(item.probability);
    const cx = 11, cy = 11;
    const radius = 8;
    const nx = cx + Math.cos(rad) * (radius * Math.max(0.35, amp));
    const ny = cy + Math.sin(rad) * (radius * Math.max(0.35, amp));

    let color = '#00f0ff'; // 0 rad
    if (Math.abs(deg) > 150) color = '#fa4d56'; // pi rad (inverted)
    else if (deg > 45 && deg <= 135) color = '#ee5396'; // +pi/2 (i)
    else if (deg < -45 && deg >= -135) color = '#a56eff'; // -pi/2 (-i)

    return `
      <div class="phase-clock-wrap" title="Basis State: ${item.state} | Phase: ${deg}° (${(rad / Math.PI).toFixed(2)}π rad) | Amplitude: ${amp.toFixed(2)}">
        <svg viewBox="0 0 22 22" width="20" height="20" class="phase-clock-svg">
          <circle cx="11" cy="11" r="8.5" fill="none" stroke="var(--border-color)" stroke-width="1.2" />
          <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
          <circle cx="${cx}" cy="${cy}" r="2" fill="${color}" />
        </svg>
        <span class="phase-clock-val" style="color: ${color}">${deg}°</span>
      </div>
    `;
  }

  // =========================================================================
  // PHYSICAL MEASUREMENT LABORATORY (1024 SHOTS MONTE CARLO)
  // =========================================================================
  bindMeasurementEvents() {
    const btnShots = document.getElementById('btn-run-shots');
    if (btnShots) {
      btnShots.addEventListener('click', () => this.runMeasurementShots());
    }
  }

  runMeasurementShots() {
    const resultsBox = document.getElementById('shots-results-container');
    const showerWrap = document.getElementById('monte-carlo-shower-wrap');
    const canvas = document.getElementById('monte-carlo-canvas');
    const btn = document.getElementById('btn-run-shots');
    if (!resultsBox) return;

    if (btn) {
      btn.textContent = '⚡ Showering 1024 Particles...';
      btn.disabled = true;
    }

    if (showerWrap) showerWrap.style.display = 'block';

    const shotsData = this.engine.sampleShots(1024);
    const activeResults = shotsData.results.filter(r => r.measuredCount > 0);

    // Run interactive canvas particle shower
    if (canvas && activeResults.length > 0) {
      this.animateMonteCarloShower(canvas, shotsData, () => {
        if (btn) {
          btn.textContent = 'Sample 1024 Shots 🎲';
          btn.disabled = false;
        }
        this.renderShotsResults(shotsData);
      });
    } else {
      setTimeout(() => {
        if (btn) {
          btn.textContent = 'Sample 1024 Shots 🎲';
          btn.disabled = false;
        }
        this.renderShotsResults(shotsData);
      }, 400);
    }
  }

  animateMonteCarloShower(canvas, shotsData, onComplete) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const numParticles = 54;
    const particles = [];

    // Map 8 basis states to discrete detector bucket coordinates
    const allStates = ['|000⟩', '|001⟩', '|010⟩', '|011⟩', '|100⟩', '|101⟩', '|110⟩', '|111⟩'];
    const binX = {};
    allStates.forEach((st, idx) => {
      binX[st] = 36 + (idx / 7) * (width - 72);
    });

    // Cumulative distribution for Born rule collapse
    const cumulative = [];
    let sum = 0;
    shotsData.results.forEach(r => {
      sum += r.measuredPct / 100;
      cumulative.push({ state: r.state, sum });
    });

    for (let i = 0; i < numParticles; i++) {
      const rand = Math.random();
      let targetState = cumulative.length > 0 ? cumulative[cumulative.length - 1].state : '|000⟩';
      for (const entry of cumulative) {
        if (rand <= entry.sum) {
          targetState = entry.state;
          break;
        }
      }
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 24,
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2.2 + Math.random() * 3.2,
        targetX: binX[targetState] || width / 2,
        targetState: targetState,
        color: targetState.includes('1') ? '#00f0ff' : '#a855f7',
        radius: 2.2 + Math.random() * 1.4,
        landed: false
      });
    }

    let frame = 0;
    const maxFrames = 48;

    const renderFrame = () => {
      ctx.fillStyle = 'rgba(6, 9, 17, 0.38)';
      ctx.fillRect(0, 0, width, height);

      // Beam Splitter Lattice (Galton Array)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let r = 0; r < 4; r++) {
        const rowY = 22 + r * 18;
        const count = r + 2;
        for (let j = 0; j < count; j++) {
          const pinX = width / 2 - (count - 1) * 16 + j * 32;
          ctx.beginPath();
          ctx.arc(pinX, rowY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Basis state buckets
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      allStates.forEach(st => {
        const bx = binX[st];
        const match = shotsData.results.find(r => r.state === st);
        const hasCount = match && match.measuredCount > 0;
        ctx.fillStyle = hasCount ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(bx - 12, height - 12, 24, 2);
        ctx.fillStyle = hasCount ? '#00f0ff' : '#64748b';
        ctx.fillText(st, bx, height - 3);
      });

      // Update particles
      particles.forEach(p => {
        if (!p.landed) {
          p.x += (p.targetX - p.x) * 0.08 + p.vx;
          p.y += p.vy;
          if (p.y >= height - 14) {
            p.landed = true;
            p.y = height - 14;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(renderFrame);
      } else {
        if (onComplete) onComplete();
      }
    };

    renderFrame();
  }

  renderShotsResults(shotsData) {
    const container = document.getElementById('shots-results-container');
    if (!container) return;
    container.innerHTML = '';

    const activeResults = shotsData.results.filter(r => r.measuredCount > 0);

    if (activeResults.length === 0) {
      container.innerHTML = `<div style="font-size:12px; color:var(--text-dim);">No physical shots registered yet. Click "Sample 1024 Shots 🎲".</div>`;
      return;
    }

    // Play measurement sound
    if (this.audio && this.audio.isEnabled && activeResults[0]) {
      this.audio.playMeasurementClick(activeResults[0].state);
    }

    activeResults.forEach(item => {
      const row = document.createElement('div');
      row.className = 'shot-result-row';
      row.innerHTML = `
        <div class="shot-state-name">${item.state}</div>
        <div class="shot-bar-wrapper">
          <div class="shot-bar-fill" style="width: ${item.measuredPct}%;"></div>
        </div>
        <div class="shot-metrics">
          <strong>${item.measuredCount}</strong> shots (${item.measuredPct}%)
          <span class="shot-expected-tag">Theory: ${item.theoreticalPct}%</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  /**
   * Pointer-based drag-and-drop for the gate palette.
   *
   * Replaces reliance on the browser's native HTML5 Drag and Drop API as the
   * primary path: native DnD does not fire at all on touch devices, and is
   * known to be unreliable across browsers for `<button>` elements (drag
   * gestures silently failing to start is a long-documented cross-browser
   * quirk, not something fixable by tweaking the native handlers). Pointer
   * Events fire uniformly for mouse, pen and touch, so this works everywhere
   * the click-to-arm flow already does, and reuses the exact same
   * this.placeGate() call so placement behaves identically either way.
   */
  bindPointerGateDrag(paletteChips) {
    const DRAG_THRESHOLD_PX = 6;
    let dragState = null; // { gate, ghost, pointerId }

    const clearSlotHighlights = () => {
      document.querySelectorAll('.gate-slot.drag-hover').forEach(s => s.classList.remove('drag-hover'));
    };

    // Belt-and-braces: if a drag ever ends without pointerup/pointercancel
    // reaching this handler (an OS-level gesture stealing the pointer stream
    // mid-drag, the tab losing focus, etc.), the ghost label must not survive
    // as a permanent floating artifact. Anything that can plausibly signal
    // "the gesture is over" forces a hard cleanup.
    const forceEndDrag = () => {
      document.querySelectorAll('.gate-drag-ghost').forEach(g => g.remove());
      clearSlotHighlights();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dragState = null;
    };
    window.addEventListener('blur', forceEndDrag);
    document.addEventListener('visibilitychange', () => { if (document.hidden) forceEndDrag(); });

    const slotAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('.gate-slot') : null;
    };

    const startGhost = (gate, x, y) => {
      const ghost = document.createElement('div');
      ghost.className = 'gate-drag-ghost';
      ghost.textContent = gate;
      ghost.style.left = `${x}px`;
      ghost.style.top = `${y}px`;
      document.body.appendChild(ghost);
      return ghost;
    };

    const onPointerMove = (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;

      if (!dragState.isDragging) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragState.isDragging = true;
        dragState.ghost = startGhost(dragState.gate, e.clientX, e.clientY);
      }

      e.preventDefault();
      dragState.ghost.style.left = `${e.clientX}px`;
      dragState.ghost.style.top = `${e.clientY}px`;

      clearSlotHighlights();
      const slot = slotAt(e.clientX, e.clientY);
      if (slot) slot.classList.add('drag-hover');
    };

    const onPointerUp = (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (dragState.isDragging) {
        if (dragState.ghost) dragState.ghost.remove();
        clearSlotHighlights();
        const slot = slotAt(e.clientX, e.clientY);
        if (slot) {
          const q = parseInt(slot.getAttribute('data-qubit'), 10);
          const col = parseInt(slot.getAttribute('data-col'), 10);
          this.placeGate(dragState.gate, q, col);
        }
        this._suppressNextChipClick = true;
        // A real drag gesture is always followed by a click event that
        // consumes this flag — but guard against it getting stuck true if
        // that click is ever lost (e.g. a touch sequence ending in
        // pointercancel instead), which would otherwise silently eat the
        // next legitimate tap on a gate.
        clearTimeout(this._suppressClickResetTimer);
        this._suppressClickResetTimer = setTimeout(() => { this._suppressNextChipClick = false; }, 400);
      }
      dragState = null;
    };

    paletteChips.forEach(chip => {
      const gate = chip.getAttribute('data-gate');
      chip.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return; // left button / touch only
        // Self-heal unconditionally: a ghost has no legitimate reason to
        // exist at the start of a fresh gesture. Checked against dragState
        // rather than the DOM directly, that guard would only catch the
        // exact failure modes already anticipated — sweeping the DOM itself
        // catches any leftover ghost regardless of why it survived.
        forceEndDrag();
        dragState = { gate, startX: e.clientX, startY: e.clientY, isDragging: false, pointerId: e.pointerId, ghost: null };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      });
    });
  }

  bindEvents() {
    // Gate Palette drag & click
    const paletteChips = document.querySelectorAll('.gate-btn');
    paletteChips.forEach(chip => {
      const gate = chip.getAttribute('data-gate');

      chip.addEventListener('click', () => {
        // A drag-to-place just happened via the pointer-based path below;
        // the browser still fires a click right after pointerup, which would
        // otherwise immediately re-arm the same gate we just placed.
        if (this._suppressNextChipClick) {
          this._suppressNextChipClick = false;
          return;
        }

        const hintEl = document.getElementById('palette-hint-text');
        const slots = document.querySelectorAll('.gate-slot:not(.has-gate)');

        if (window.selectedPaletteGate === gate) {
          window.selectedPaletteGate = null;
          chip.classList.remove('selected-palette');
          slots.forEach(s => s.classList.remove('ready-to-place'));
          if (hintEl) hintEl.innerHTML = '💡 <strong>How to build:</strong> Click a gate above, then click a slot on wires q0, q1, or q2.';
        } else {
          paletteChips.forEach(c => c.classList.remove('selected-palette'));
          window.selectedPaletteGate = gate;
          chip.classList.add('selected-palette');
          slots.forEach(s => s.classList.add('ready-to-place'));
          if (hintEl) hintEl.innerHTML = `🎯 <strong>Armed: [ ${gate} ]</strong> - Click any slot on wires q0, q1, or q2 to place. (Click ${gate} again to cancel)`;
        }
      });
    });

    this.bindPointerGateDrag(paletteChips);

    // Bloch Qubit Selector
    if (this.qubitSelect) {
      this.qubitSelect.addEventListener('change', (e) => {
        this.selectedQubitForBloch = parseInt(e.target.value, 10);
        this.updateSimulation();
      });
    }

    // Clear Circuit Button
    const clearBtn = document.getElementById('btn-clear-circuit') || document.getElementById('btn-clear-circ');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCircuit());
    }

    // Copy Code Buttons
    const copyQiskitBtn = document.getElementById('btn-copy-qiskit');
    if (copyQiskitBtn) {
      copyQiskitBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.qiskitCodeBlock.textContent);
        copyQiskitBtn.textContent = 'Copied!';
        setTimeout(() => copyQiskitBtn.textContent = 'Copy Python', 2000);
      });
    }

    const copyQasmBtn = document.getElementById('btn-copy-qasm');
    if (copyQasmBtn) {
      copyQasmBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.qasmCodeBlock.textContent);
        copyQasmBtn.textContent = 'Copied!';
        setTimeout(() => copyQasmBtn.textContent = 'Copy QASM', 2000);
      });
    }
  }

  // =========================================================================
  // QUANTUM DENSITY MATRIX (ρ = |ψ⟩⟨ψ|) HEATMAP & INSPECTOR
  // =========================================================================
  renderDensityMatrix() {
    if (!this.densityContainer) return;
    const matrix = this.engine.getDensityMatrix();
    const numStates = matrix.length;
    const numQubits = Math.max(1, Math.round(Math.log2(numStates)));
    const entropy = this.engine.getEntanglementEntropy();

    if (this.densityEntropyBadge) {
      this.densityEntropyBadge.textContent = `Von Neumann Entropy S = ${entropy.toFixed(2)}`;
      this.densityEntropyBadge.style.color = (entropy > 0.05) ? '#00f0ff' : 'var(--text-dim)';
    }

    const dimBadge = document.getElementById('density-dim-badge');
    if (dimBadge) {
      dimBadge.textContent = `${numStates} × ${numStates} Hilbert Space (${numQubits} Qubit${numQubits > 1 ? 's' : ''})`;
    }

    const formulaEl = document.getElementById('density-state-formula');
    if (formulaEl) {
      formulaEl.textContent = this.engine.getDiracNotation();
    }

    // Build basis labels [000, 001, ..., 111]
    const basisLabels = [];
    for (let i = 0; i < numStates; i++) {
      basisLabels.push(i.toString(2).padStart(numQubits, '0'));
    }

    this.densityContainer.innerHTML = '';
    const table = document.createElement('div');
    table.className = `density-matrix-table states-${numStates}`;

    // 1. Column Headers Row
    const headerRow = document.createElement('div');
    headerRow.className = 'density-matrix-row density-header-row';

    const cornerCell = document.createElement('div');
    cornerCell.className = 'density-header-cell density-corner-cell';
    cornerCell.innerHTML = '<span>ρ<sub>ij</sub></span>';
    cornerCell.title = 'Density Matrix Element ρ_ij = ⟨i|ρ|j⟩';
    headerRow.appendChild(cornerCell);

    for (let c = 0; c < numStates; c++) {
      const colHeader = document.createElement('div');
      colHeader.className = 'density-header-cell density-col-header';
      colHeader.innerHTML = `<span>|${basisLabels[c]}⟩</span>`;
      colHeader.title = `Column computational basis state |${basisLabels[c]}⟩`;
      headerRow.appendChild(colHeader);
    }
    table.appendChild(headerRow);

    // Inspector Updater Function
    const updateInspector = (r, c, cell) => {
      const insp = document.getElementById('density-cell-inspector');
      if (!insp) return;

      const stateR = `|${basisLabels[r]}⟩`;
      const stateC = `|${basisLabels[c]}⟩`;
      const dualC = `⟨${basisLabels[c]}|`;
      const isDiag = cell.isDiagonal;
      const mag = cell.mag;

      let typeDesc = 'Zero Amplitude';
      let tagClass = 'tag-zero';
      let interpretation = '';

      if (isDiag) {
        tagClass = 'tag-pop';
        if (mag > 0.005) {
          typeDesc = `Population (Prob = ${(mag * 100).toFixed(1)}%)`;
          interpretation = `<strong>Diagonal Population:</strong> There is a <strong>${(mag * 100).toFixed(1)}% probability</strong> of measuring the system in basis state <code>${stateR}</code> upon measurement.`;
        } else {
          typeDesc = 'Zero Population (0.0%)';
          interpretation = `<strong>Zero Population:</strong> The system has <strong>0% probability</strong> of being found in state <code>${stateR}</code>.`;
        }
      } else {
        if (mag > 0.005) {
          tagClass = 'tag-coh';
          typeDesc = 'Quantum Coherence (Superposition/Entanglement)';
          interpretation = `<strong>Off-Diagonal Quantum Coherence:</strong> Non-zero correlation between <code>${stateR}</code> and <code>${stateC}</code> proves quantum superposition. If this were a classical probability mixture, this term would be 0!`;
        } else {
          typeDesc = 'Zero Coherence (No Correlation)';
          interpretation = `<strong>Zero Coherence:</strong> No direct quantum phase or superposition interference between <code>${stateR}</code> and <code>${stateC}</code>.`;
        }
      }

      insp.innerHTML = `
        <div class="insp-active-card">
          <div class="insp-header">
            <span class="insp-bracket">ρ(<code>${stateR}</code>, <code>${dualC}</code>)</span>
            <span class="insp-tag ${tagClass}">${typeDesc}</span>
            <span class="insp-val">Re: <strong>${cell.re.toFixed(4)}</strong> | Im: <strong>${cell.im.toFixed(4)}</strong> | |ρ|: <strong>${mag.toFixed(4)}</strong></span>
          </div>
          <p class="insp-desc">${interpretation}</p>
        </div>
      `;
    };

    let firstActiveCell = null;

    // 2. Data Rows with Row Header
    for (let r = 0; r < numStates; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'density-matrix-row';

      const rowHeader = document.createElement('div');
      rowHeader.className = 'density-header-cell density-row-header';
      rowHeader.innerHTML = `<span>⟨${basisLabels[r]}|</span>`;
      rowHeader.title = `Row dual computational basis state ⟨${basisLabels[r]}|`;
      rowDiv.appendChild(rowHeader);

      for (let c = 0; c < numStates; c++) {
        const cell = matrix[r][c];
        const cellDiv = document.createElement('div');
        const isDiag = cell.isDiagonal;
        const mag = cell.mag;

        let cellClass = 'density-cell';
        let displayVal = '·';

        if (isDiag) {
          cellClass += ' diag-cell';
          if (mag > 0.005) {
            displayVal = mag.toFixed(2);
            cellClass += ' has-value pop-active';
            cellDiv.style.background = `rgba(16, 185, 129, ${Math.min(0.95, 0.28 + mag * 0.72)})`;
            cellDiv.style.borderColor = '#10b981';
            if (!firstActiveCell) firstActiveCell = { r, c, cell };
          } else {
            displayVal = '0';
            cellClass += ' cell-zero';
          }
        } else {
          if (mag > 0.005) {
            cellClass += ' coh-cell has-value coh-active';
            if (Math.abs(cell.im) > 0.005 && Math.abs(cell.re) > 0.005) {
              displayVal = `${cell.re >= 0 ? '+' : ''}${cell.re.toFixed(1)}${cell.im >= 0 ? '+' : ''}${cell.im.toFixed(1)}i`;
              cellDiv.style.background = `rgba(168, 85, 247, ${Math.min(0.9, 0.28 + mag * 0.7)})`;
              cellDiv.style.borderColor = '#a855f7';
            } else if (Math.abs(cell.im) > 0.005) {
              displayVal = `${cell.im >= 0 ? '+' : ''}${cell.im.toFixed(2)}i`;
              cellDiv.style.background = `rgba(236, 72, 153, ${Math.min(0.9, 0.28 + mag * 0.7)})`;
              cellDiv.style.borderColor = '#ec4899';
            } else {
              displayVal = (cell.re < 0 ? '-' : '') + Math.abs(cell.re).toFixed(2);
              cellDiv.style.background = `rgba(6, 182, 212, ${Math.min(0.9, 0.28 + mag * 0.7)})`;
              cellDiv.style.borderColor = '#06b6d4';
            }
            if (!firstActiveCell || firstActiveCell.cell.isDiagonal) firstActiveCell = { r, c, cell };
          } else {
            displayVal = '·';
            cellClass += ' cell-zero';
          }
        }

        cellDiv.className = cellClass;
        cellDiv.innerHTML = `<span class="density-val">${displayVal}</span>`;

        const stateR = `|${basisLabels[r]}⟩`;
        const stateC = `⟨${basisLabels[c]}|`;
        cellDiv.title = `ρ(${stateR}, ${stateC})\nRe: ${cell.re.toFixed(4)}\nIm: ${cell.im.toFixed(4)}\n|ρ|: ${cell.mag.toFixed(4)}`;

        cellDiv.addEventListener('mouseenter', () => updateInspector(r, c, cell));
        cellDiv.addEventListener('click', () => updateInspector(r, c, cell));

        rowDiv.appendChild(cellDiv);
      }
      table.appendChild(rowDiv);
    }
    this.densityContainer.appendChild(table);

    // Initialize the inspector with the most informative cell
    if (firstActiveCell) {
      updateInspector(firstActiveCell.r, firstActiveCell.c, firstActiveCell.cell);
    }
  }

  // =========================================================================
  // 1. UNITARY MATRIX (U_total) INSPECTOR
  // =========================================================================
  renderUnitaryInspector() {
    const gridEl = document.getElementById('unitary-matrix-grid');
    const invariantsBar = document.getElementById('unitary-invariants-bar');
    if (!gridEl) return;

    const uData = this.engine.computeTotalUnitary(this.grid, this.playbackStep);
    this.lastUnitaryData = uData;

    if (invariantsBar) {
      invariantsBar.innerHTML = `
        <div class="matrix-invariant-chip ${uData.isUnitary ? 'chip-verified' : 'chip-warn'}">
          <span class="chip-label">Unitarity:</span>
          <strong>${uData.isUnitary ? 'U†U = I (Conserved ✓)' : 'Norm Degraded'}</strong>
        </div>
        <div class="matrix-invariant-chip">
          <span class="chip-label">det(U):</span>
          <code>${uData.detStr}</code>
        </div>
        <div class="matrix-invariant-chip">
          <span class="chip-label">Tr(U):</span>
          <code>${uData.traceStr}</code>
        </div>
        <div class="matrix-actions-group">
          <button class="btn-copy-matrix-chip" id="btn-copy-latex-matrix" title="Copy LaTeX pmatrix code for papers and homework">LaTeX Matrix 📋</button>
          <button class="btn-copy-matrix-chip" id="btn-copy-numpy-matrix" title="Copy NumPy complex array code">NumPy Array 📋</button>
        </div>
      `;

      const btnLatex = document.getElementById('btn-copy-latex-matrix');
      if (btnLatex) {
        btnLatex.addEventListener('click', () => {
          navigator.clipboard.writeText(uData.latexCode);
          btnLatex.textContent = 'Copied LaTeX! ✓';
          setTimeout(() => btnLatex.textContent = 'LaTeX Matrix 📋', 1800);
        });
      }
      const btnNumPy = document.getElementById('btn-copy-numpy-matrix');
      if (btnNumPy) {
        btnNumPy.addEventListener('click', () => {
          navigator.clipboard.writeText(uData.numpyCode);
          btnNumPy.textContent = 'Copied NumPy! ✓';
          setTimeout(() => btnNumPy.textContent = 'NumPy Array 📋', 1800);
        });
      }
    }

    // Build an N x N table where N = 2^numQubits - was hardcoded to a fixed
    // 8x8 (3-qubit) table, so uData.matrix[i][j] for i/j >= 4 was undefined
    // and .abs() on it crashed the instant the register size changed (e.g.
    // Auto-Fix removing an idle qubit). computeTotalUnitary already returns
    // the real N x N matrix for any register size; this just has to render
    // whatever size it actually gets instead of assuming 3 qubits.
    const N = uData.matrix.length;
    const bits = Math.round(Math.log2(N));
    const basisLabels = Array.from({ length: N }, (_, i) => i.toString(2).padStart(bits, '0'));
    // A full N x N table stops being readable well before 8 qubits (256x256
    // cells) - cap the rendered grid and say so rather than freezing the tab.
    const MAX_RENDERED_DIM = 32;
    if (N > MAX_RENDERED_DIM) {
      gridEl.innerHTML = `<div class="unitary-too-large-note">U is ${N}×${N} (${bits} qubits) - too large to render as a table. Use the LaTeX/NumPy export above to inspect it directly.</div>`;
      return;
    }

    let html = '<table class="unitary-table"><thead><tr><th>⟨out|in⟩</th>';
    for (let j = 0; j < N; j++) {
      html += `<th>|${basisLabels[j]}⟩</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < N; i++) {
      html += `<tr><th>⟨${basisLabels[i]}|</th>`;
      for (let j = 0; j < N; j++) {
        const c = uData.matrix[i][j];
        const mag = c.abs();
        let cls = 'u-cell-zero';
        if (mag > 0.99) cls = 'u-cell-one';
        else if (mag > 0.01) cls = 'u-cell-active';

        const re = Math.abs(c.re) < 1e-3 ? 0 : c.re;
        const im = Math.abs(c.im) < 1e-3 ? 0 : c.im;
        let str = '0';
        if (Math.abs(re - 1) < 1e-3 && im === 0) str = '1';
        else if (Math.abs(re + 1) < 1e-3 && im === 0) str = '-1';
        else if (re === 0 && Math.abs(im - 1) < 1e-3) str = 'i';
        else if (re === 0 && Math.abs(im + 1) < 1e-3) str = '-i';
        else if (Math.abs(mag - 0.707) < 0.02) {
          str = (re < 0 || im < 0 ? '-' : '') + '1/√2';
        } else if (mag > 0.001) {
          str = c.re.toFixed(2) + (im !== 0 ? (im > 0 ? '+' : '') + c.im.toFixed(2) + 'i' : '');
        }

        html += `<td class="u-cell ${cls}" title="Row |${basisLabels[i]}⟩, Col |${basisLabels[j]}⟩: ${c.re.toFixed(4)}${c.im >= 0 ? '+' : ''}${c.im.toFixed(4)}i">${str}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    gridEl.innerHTML = html;
  }

  // =========================================================================
  // 2. STEP-BY-STEP ANALYTICAL DERIVATION GENERATOR
  // =========================================================================
  renderAnalyticalDerivation() {
    const container = document.getElementById('derivation-steps-container');
    const btnCopyLatex = document.getElementById('btn-copy-latex-derivation');
    if (!container) return;

    const derivation = this.engine.generateAnalyticalDerivation(this.grid, this.playbackStep);
    this.lastDerivationData = derivation;

    let html = '';
    derivation.steps.forEach((st) => {
      html += `
        <div class="derivation-step-item">
          <div class="step-badge-row">
            <span class="step-num-pill">Step ${st.stepNum}</span>
            <span class="step-op-title">${st.operation}</span>
          </div>
          <div class="step-equation-box">
            <code>${st.dirac}</code>
          </div>
          <p class="step-desc-text">${st.explanation}</p>
        </div>
      `;
    });
    container.innerHTML = html;

    if (btnCopyLatex) {
      btnCopyLatex.onclick = () => {
        navigator.clipboard.writeText(derivation.fullLatex);
        btnCopyLatex.textContent = 'Copied LaTeX Proof! ✓';
        setTimeout(() => btnCopyLatex.textContent = 'Copy LaTeX Proof 📋', 2000);
      };
    }
  }

  // =========================================================================
  // 3. RIGOROUS QUANTUM ENTANGLEMENT & PURITY METRICS
  // =========================================================================
  renderEntanglementMetrics() {
    const panel = document.getElementById('entanglement-metrics-panel');
    if (!panel) return;

    const m = this.engine.getAdvancedEntanglementMetrics();

    panel.innerHTML = `
      <div class="entangle-summary-banner">
        <div class="entangle-class-tag">
          <span class="entangle-icon">⚛️</span>
          <div>
            <span class="entangle-eyebrow">Quantum State Classification</span>
            <h4 class="entangle-class-name">${m.entanglementClass}</h4>
          </div>
        </div>
        <div class="schmidt-pill">
          <span>Schmidt Rank: <strong>${m.schmidtRank}</strong></span>
        </div>
      </div>

      <div class="entangle-gauges-grid">
        <div class="entangle-gauge-card">
          <div class="gauge-header">
            <span class="gauge-title">Wootters Concurrence C(ρ₀₁)</span>
            <span class="gauge-val">${m.concurrence.toFixed(3)}</span>
          </div>
          <div class="gauge-bar-track">
            <div class="gauge-bar-fill fill-cyan" style="width: ${(m.concurrence * 100).toFixed(0)}%"></div>
          </div>
          <span class="gauge-note">C=1.0: Bell State | C=0.0: Separable</span>
        </div>

        <div class="entangle-gauge-card">
          <div class="gauge-header">
            <span class="gauge-title">Von Neumann Entropy S(ρ₀)</span>
            <span class="gauge-val">${m.vonNeumannEntropy.toFixed(3)}</span>
          </div>
          <div class="gauge-bar-track">
            <div class="gauge-bar-fill fill-magenta" style="width: ${(m.vonNeumannEntropy * 100).toFixed(0)}%"></div>
          </div>
          <span class="gauge-note">Bipartite entanglement across q0 vs (q1, q2)</span>
        </div>

        <div class="entangle-gauge-card">
          <div class="gauge-header">
            <span class="gauge-title">State Purity γ = Tr(ρ²)</span>
            <span class="gauge-val">${m.purity.toFixed(3)}</span>
          </div>
          <div class="gauge-bar-track">
            <div class="gauge-bar-fill fill-green" style="width: ${(m.purity * 100).toFixed(0)}%"></div>
          </div>
          <span class="gauge-note">γ=1.0: Pure State | γ < 1.0: Mixed under decoherence</span>
        </div>

        <div class="entangle-gauge-card">
          <div class="gauge-header">
            <span class="gauge-title">Mutual Information I(q₀ : q₁)</span>
            <span class="gauge-val">${m.mutualInformation.toFixed(3)}</span>
          </div>
          <div class="gauge-bar-track">
            <div class="gauge-bar-fill fill-blue" style="width: ${(Math.min(2, m.mutualInformation) / 2 * 100).toFixed(0)}%"></div>
          </div>
          <span class="gauge-note">Total classical and quantum correlations</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4. ANALYTICS DECK TAB SWITCHER
  // =========================================================================
  initAnalyticsDeck() {
    const tabs = document.querySelectorAll('.analytics-deck-tab');
    const panels = document.querySelectorAll('.analytics-deck-panel');
    if (!tabs || tabs.length === 0) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-deck-tab');
        if (!target) return;

        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const activePanel = document.getElementById(`deck-panel-${target}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        // If bloch sphere selected, trigger immediate canvas resize and coordinate sync
        if (target === 'bloch' && this.bloch) {
          if (this.bloch.resize) this.bloch.resize();
          setTimeout(() => {
            if (this.bloch.resize) this.bloch.resize();
            window.dispatchEvent(new Event('resize'));
            const coords = this.engine.getBlochCoordinates(this.selectedQubitForBloch);
            this.bloch.updateCoordinates(coords, this.selectedQubitForBloch, this.engine);
          }, 35);
        }
      });
    });
  }

  // =========================================================================
  // BLOCH QUICK PILL BUTTONS (Dynamic 2 to 8 Qubits)
  // =========================================================================
  bindBlochPillEvents() {
    const container = document.getElementById('bloch-quick-pills');
    if (!container) return;
    container.innerHTML = '';
    for (let q = 0; q < this.numQubits; q++) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `bloch-pill-btn ${q === this.selectedQubitForBloch ? 'active' : ''}`;
      pill.setAttribute('data-qubit', q);
      pill.textContent = `q[${q}]`;
      pill.addEventListener('click', () => {
        container.querySelectorAll('.bloch-pill-btn').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedQubitForBloch = q;
        if (this.qubitSelect) {
          this.qubitSelect.value = q.toString();
        }
        this.updateSimulation();
      });
      container.appendChild(pill);
    }
  }

  // =========================================================================
  // QUANTUM AUDIO EVENTS
  // =========================================================================
  bindAudioEvents() {
    const audioBtn = document.getElementById('btn-toggle-quantum-audio');
    if (!audioBtn || !this.audio) return;

    audioBtn.addEventListener('click', () => {
      const isEnabled = this.audio.toggleAudio();
      audioBtn.classList.toggle('audio-active', isEnabled);
      const icon = document.getElementById('audio-btn-icon');
      if (icon) icon.textContent = isEnabled ? '🔊' : '🔇';
      audioBtn.title = isEnabled ? 'Quantum sound synthesis active (Click to mute)' : 'Click to hear quantum state harmony';

      if (isEnabled) {
        this.audio.playStatevectorChord(this.engine.getProbabilities());
      }
    });
  }

  // =========================================================================
  // GUIDED ALGORITHM TOUR CONTROLLER
  // =========================================================================
  bindTourEvents() {
    const btnNext = document.getElementById('btn-tour-next');
    const btnPrev = document.getElementById('btn-tour-prev');
    const btnExit = document.getElementById('btn-tour-exit');
    const btnAuto = document.getElementById('btn-tour-auto');

    if (btnNext) btnNext.addEventListener('click', () => this.nextTourStep());
    if (btnPrev) btnPrev.addEventListener('click', () => this.prevTourStep());
    if (btnExit) btnExit.addEventListener('click', () => this.exitTour());
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        if (this.isTourAutoPlaying) {
          this.stopTourAutoPlay();
        } else {
          this.startTourAutoPlay();
        }
      });
    }
  }

  startAlgorithmTour(algo) {
    this.currentTour = algo;
    this.tourStep = 0;
    this.stopTourAutoPlay();

    if (this.tourBar) {
      this.tourBar.style.display = 'block';
    }

    // Seek playback to first step
    this.playbackStep = 1;
    this.renderGrid();
    this.updateSimulation();
    this.updateTourBanner();
  }

  updateTourBanner() {
    if (!this.currentTour) return;
    const titleEl = document.getElementById('tour-algo-title');
    const badgeEl = document.getElementById('tour-step-badge');
    const textEl = document.getElementById('tour-explanation-text');

    const steps = this.currentTour.tourSteps || this.generateDefaultTourSteps(this.currentTour);
    const total = steps.length;
    const idx = Math.min(this.tourStep, total - 1);
    const cur = steps[idx];

    if (titleEl) titleEl.textContent = this.currentTour.title;
    if (badgeEl) badgeEl.textContent = `Step ${idx + 1} of ${total}`;
    if (textEl && cur) {
      textEl.innerHTML = `<strong>${cur.title}:</strong> ${cur.text}`;
    }
  }

  generateDefaultTourSteps(algo) {
    // Generate intelligent tour steps based on gates in each column
    const steps = [];
    for (let c = 0; c < this.numCols; c++) {
      const colGates = [];
      for (let q = 0; q < this.numQubits; q++) {
        const g = algo.grid[q][c];
        if (g) colGates.push(`q${q}: ${g}`);
      }
      if (colGates.length > 0) {
        steps.push({
          step: c + 1,
          col: c,
          title: `Column ${c + 1} Evaluation`,
          text: `Executing operations: ${colGates.join(', ')}. Observe the live Dirac math equation and phase clock dials adjusting to the new state.`
        });
      }
    }
    if (steps.length === 0) {
      steps.push({ step: 1, col: 0, title: 'Ground State', text: 'All qubits initialized in |000⟩.' });
    }
    return steps;
  }

  nextTourStep() {
    if (!this.currentTour) return;
    const steps = this.currentTour.tourSteps || this.generateDefaultTourSteps(this.currentTour);
    if (this.tourStep < steps.length - 1) {
      this.tourStep++;
      const cur = steps[this.tourStep];
      this.playbackStep = cur.col !== undefined ? cur.col + 1 : this.tourStep + 1;
      this.renderGrid();
      this.updateSimulation();
      this.updateTourBanner();
    } else {
      // Finished tour
      this.stopTourAutoPlay();
      this.playbackStep = -1; // Full circuit
      this.renderGrid();
      this.updateSimulation();
      const badgeEl = document.getElementById('tour-step-badge');
      if (badgeEl) badgeEl.textContent = 'Tour Complete ✓';
    }
  }

  prevTourStep() {
    if (!this.currentTour) return;
    const steps = this.currentTour.tourSteps || this.generateDefaultTourSteps(this.currentTour);
    if (this.tourStep > 0) {
      this.tourStep--;
      const cur = steps[this.tourStep];
      this.playbackStep = cur.col !== undefined ? cur.col + 1 : this.tourStep + 1;
      this.renderGrid();
      this.updateSimulation();
      this.updateTourBanner();
    }
  }

  startTourAutoPlay() {
    this.isTourAutoPlaying = true;
    const btnAuto = document.getElementById('btn-tour-auto');
    if (btnAuto) {
      btnAuto.textContent = 'Pause ⏸';
      btnAuto.classList.add('tour-playing');
    }
    this.tourAutoTimer = setInterval(() => {
      const steps = this.currentTour.tourSteps || this.generateDefaultTourSteps(this.currentTour);
      if (this.tourStep >= steps.length - 1) {
        this.stopTourAutoPlay();
      } else {
        this.nextTourStep();
      }
    }, 2200);
  }

  stopTourAutoPlay() {
    this.isTourAutoPlaying = false;
    if (this.tourAutoTimer) {
      clearInterval(this.tourAutoTimer);
      this.tourAutoTimer = null;
    }
    const btnAuto = document.getElementById('btn-tour-auto');
    if (btnAuto) {
      btnAuto.textContent = 'Auto-Play ⏩';
      btnAuto.classList.remove('tour-playing');
    }
  }

  exitTour() {
    this.stopTourAutoPlay();
    this.currentTour = null;
    if (this.tourBar) {
      this.tourBar.style.display = 'none';
    }
    this.playbackStep = -1;
    this.renderGrid();
    this.updateSimulation();
  }

  // =========================================================================
  // INTERACTIVE GATE EDUCATIONAL PHYSICAL MECHANISM HOVER CARDS
  // =========================================================================
  initGateEducationalTooltips() {
    this.eduCard = document.getElementById('gate-edu-card');
    if (!this.eduCard) return;

    // Bind palette buttons
    document.querySelectorAll('.gate-btn').forEach(btn => {
      const g = btn.getAttribute('data-gate');
      if (g) this.attachEduTooltip(btn, g);
    });
  }

  bindGateTooltips() {
    if (!this.eduCard) return;
    // Bind placed gates on circuit
    document.querySelectorAll('.placed-gate').forEach(el => {
      const rawGate = el.getAttribute('data-gate');
      const g = rawGate ? rawGate.replace('_CTRL', '').replace('_TGT', '') : null;
      if (g) this.attachEduTooltip(el, g);
    });
  }

  attachEduTooltip(element, gateKey) {
    const data = GATE_EDUCATIONAL_DATA[gateKey] || GATE_EDUCATIONAL_DATA['H'];

    element.addEventListener('mouseenter', (e) => {
      const badge = document.getElementById('edu-gate-badge');
      const title = document.getElementById('edu-gate-title');
      const role = document.getElementById('edu-gate-role');
      const math = document.getElementById('edu-gate-math');
      const desc = document.getElementById('edu-gate-desc');
      const wave = document.getElementById('edu-gate-wave');

      if (badge) {
        badge.textContent = gateKey === 'CX' ? '⊕' : gateKey;
        badge.style.background = data.color;
      }
      if (title) title.textContent = data.name;
      if (role) role.textContent = data.role;
      if (math) math.textContent = data.matrix;
      if (desc) desc.textContent = data.concept;
      if (wave) wave.innerHTML = data.waveSvg;

      this.eduCard.style.display = 'block';
      this.positionEduCard(e);
      requestAnimationFrame(() => this.eduCard.classList.add('visible'));
    });

    element.addEventListener('mousemove', (e) => {
      this.positionEduCard(e);
    });

    element.addEventListener('mouseleave', () => {
      if (this.eduCard) {
        this.eduCard.classList.remove('visible');
        setTimeout(() => {
          if (!this.eduCard.classList.contains('visible')) {
            this.eduCard.style.display = 'none';
          }
        }, 180);
      }
    });
  }

  positionEduCard(e) {
    if (!this.eduCard) return;
    const cardWidth = 300;
    const cardHeight = 180;
    let x = e.clientX + 16;
    let y = e.clientY + 16;

    if (x + cardWidth > window.innerWidth - 12) {
      x = e.clientX - cardWidth - 12;
    }
    if (y + cardHeight > window.innerHeight - 12) {
      y = e.clientY - cardHeight - 12;
    }

    this.eduCard.style.left = `${Math.max(10, x)}px`;
    this.eduCard.style.top = `${Math.max(10, y)}px`;
  }

  // =========================================================================
  // VIEW MODES (2D vs 3D Hologram) & DUAL-PEDAGOGY (Beginner vs Advanced Research)
  // =========================================================================
  bindModeEvents() {
    const btn2d = document.getElementById('btn-view-2d');
    const btn3d = document.getElementById('btn-view-3d');
    const btnBeg = document.getElementById('btn-pedagogy-beginner');
    const btnAdv = document.getElementById('btn-pedagogy-advanced');
    const btnTut = document.getElementById('btn-pedagogy-tutor');

    if (btn2d) btn2d.addEventListener('click', () => this.setDimensionMode('2d'));
    if (btn3d) btn3d.addEventListener('click', () => this.setDimensionMode('3d'));
    if (btnBeg) btnBeg.addEventListener('click', () => this.setPedagogyMode('beginner'));
    if (btnAdv) btnAdv.addEventListener('click', () => this.setPedagogyMode('advanced'));
    if (btnTut) btnTut.addEventListener('click', () => this.setPedagogyMode('tutor'));

    // Interactive ambient cryogenic lighting on circuit canvas
    const canvas = document.querySelector('.circuit-canvas-white');
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        if (this.dimensionMode !== '3d') return;
        const rect = canvas.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 100;
        const normY = ((e.clientY - rect.top) / rect.height) * 100;
        canvas.style.backgroundImage = `
          radial-gradient(circle 320px at ${normX.toFixed(1)}% ${normY.toFixed(1)}%, rgba(56, 189, 248, 0.16) 0%, transparent 70%),
          linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `;
      });

      canvas.addEventListener('mouseleave', () => {
        if (this.dimensionMode !== '3d') return;
        canvas.style.backgroundImage = '';
      });
    }
  }

  setDimensionMode(mode) {
    this.dimensionMode = mode;
    const canvas = document.querySelector('.circuit-canvas-white');
    const btn2d = document.getElementById('btn-view-2d');
    const btn3d = document.getElementById('btn-view-3d');

    if (mode === '3d') {
      if (canvas) {
        canvas.classList.add('mode-3d-hologram');
        const grid = canvas.querySelector('.circuit-grid');
        const ruler = canvas.querySelector('.step-ruler');
        if (grid) grid.style.transform = 'none';
        if (ruler) ruler.style.transform = 'none';
      }
      if (btn2d) btn2d.classList.remove('active');
      if (btn3d) btn3d.classList.add('active');
    } else {
      if (canvas) {
        canvas.classList.remove('mode-3d-hologram');
        canvas.style.backgroundImage = '';
        const grid = canvas.querySelector('.circuit-grid');
        const ruler = canvas.querySelector('.step-ruler');
        if (grid) grid.style.transform = '';
        if (ruler) ruler.style.transform = '';
      }
      if (btn3d) btn3d.classList.remove('active');
      if (btn2d) btn2d.classList.add('active');
    }
    this.renderCnotConnectors();
    setTimeout(() => this.renderCnotConnectors(), 40);
  }

  setPedagogyMode(mode) {
    this.pedagogyMode = mode;
    const begPanel = document.getElementById('intel-beginner-panel');
    const advPanel = document.getElementById('intel-advanced-panel');
    const tutPanel = document.getElementById('intel-tutor-panel');
    const btnBeg = document.getElementById('btn-pedagogy-beginner');
    const btnAdv = document.getElementById('btn-pedagogy-advanced');
    const btnTut = document.getElementById('btn-pedagogy-tutor');

    if (begPanel) begPanel.style.display = 'none';
    if (advPanel) advPanel.style.display = 'none';
    if (tutPanel) tutPanel.style.display = 'none';
    if (btnBeg) btnBeg.classList.remove('active');
    if (btnAdv) btnAdv.classList.remove('active');
    if (btnTut) btnTut.classList.remove('active');

    if (mode === 'advanced') {
      if (advPanel) advPanel.style.display = 'block';
      if (btnAdv) btnAdv.classList.add('active');
      this.updateQuantumIntelligenceDeck();
    } else if (mode === 'tutor') {
      if (tutPanel) tutPanel.style.display = 'block';
      if (btnTut) btnTut.classList.add('active');
      if (window.circuitTutor) {
        window.circuitTutor.runAudit();
      }
    } else {
      if (begPanel) begPanel.style.display = 'block';
      if (btnBeg) btnBeg.classList.add('active');
      this.updateQuantumIntelligenceDeck();
    }
  }

  openAiTutor() {
    this.setPedagogyMode('tutor');
    const deck = document.getElementById('quantum-intelligence-deck');
    if (deck) deck.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  renderMathBox(elementId, latexStr) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (window.katex && typeof window.katex.render === 'function') {
      try {
        window.katex.render(latexStr, el, { displayMode: true, throwOnError: false });
        return;
      } catch (err) {
        // Fallback to innerHTML below
      }
    }
    el.innerHTML = `$$${latexStr}$$`;
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  updateQuantumIntelligenceDeck() {
    const deck = document.getElementById('quantum-intelligence-deck');
    if (!deck) return;

    const probs = this.engine.getProbabilities();
    const activeStates = probs.filter(p => p.probability > 0.035).sort((a, b) => b.probability - a.probability);
    const m = this.engine.getAdvancedEntanglementMetrics ? this.engine.getAdvancedEntanglementMetrics() : {
      purity: 1.0,
      vonNeumannEntropy: 0,
      concurrence: 0,
      schmidtRank: 1,
      entanglementClass: 'Product State'
    };

    // State signatures & Gate analysis - analyzeGateComposition() is the
    // single shared source of truth (also used by updateEntanglementBadge)
    // so the badge at the top of the composer and this panel can never
    // disagree about what circuit is actually on the board again.
    const stateNames = activeStates.map(s => s.state);
    const isEntangled = m.concurrence > 0.15 || m.vonNeumannEntropy > 0.15;
    const gates = this.analyzeGateComposition();
    const { hasX, hasY, hasZ, hasS, hasT, entanglingGatesLabel } = gates;

    const isSuperpos = activeStates.length > 1;
    const groundLabel = '|' + '0'.repeat(this.numQubits) + '⟩';
    const isGround = activeStates.length === 1 && activeStates[0].state === groundLabel;

    // Step operator & column inspection
    let stepOperatorLabel = 'Operator: I₈ (Ground State)';
    let stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\hat{I}_8';
    let stepPillText = 'Step: Full Output';

    if (this.playbackStep === 0) {
      stepPillText = 'Step 0: Initial Ground State';
      stepOperatorLabel = 'Operator: I₈';
      stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\hat{I}_2 \\otimes \\hat{I}_2 \\otimes \\hat{I}_2';
    } else if (this.playbackStep === -1 || this.playbackStep >= this.numCols) {
      stepPillText = `Step: Full Circuit Output (t=${this.numCols})`;
      stepOperatorLabel = 'Operator: U_total ∈ SU(8)';
      stepUnitaryLatex = '\\hat{U}_{\\text{total}} = \\prod_{t=' + this.numCols + '}^{1} \\hat{U}_t \\in \\mathbb{SU}(8)';
    } else {
      const col = this.playbackStep - 1;
      stepPillText = `Step ${this.playbackStep} of ${this.numCols} (Column t=${this.playbackStep})`;
      const g0 = this.grid[0][col];
      const g1 = this.grid[1][col];
      const g2 = this.grid[2] ? this.grid[2][col] : null;

      if (g0 === 'CX_CTRL' && g1 === 'CX_TGT') {
        stepOperatorLabel = 'Operator: CNOT₀₁ ⊗ I₂';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\text{CNOT}_{01} \\otimes \\hat{I}_2';
      } else if (g1 === 'CX_CTRL' && g2 === 'CX_TGT') {
        stepOperatorLabel = 'Operator: I₂ ⊗ CNOT₁₂';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\hat{I}_2 \\otimes \\text{CNOT}_{12}';
      } else if (g0 === 'CX_CTRL' && g2 === 'CX_TGT') {
        stepOperatorLabel = 'Operator: CNOT₀₂ (Long-Range)';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\text{CNOT}_{02}';
      } else if (g1 === 'CX_CTRL' && g0 === 'CX_TGT') {
        stepOperatorLabel = 'Operator: CNOT₁₀ ⊗ I₂';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\text{CNOT}_{10} \\otimes \\hat{I}_2';
      } else if (g2 === 'CX_CTRL' && g1 === 'CX_TGT') {
        stepOperatorLabel = 'Operator: I₂ ⊗ CNOT₂₁';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\hat{I}_2 \\otimes \\text{CNOT}_{21}';
      } else if (g0 === 'SWAP' && g1 === 'SWAP') {
        stepOperatorLabel = 'Operator: SWAP₀₁ ⊗ I₂';
        stepUnitaryLatex = '\\hat{U}_{\\text{step}} = \\text{SWAP}_{01} \\otimes \\hat{I}_2';
      } else {
        const u0 = g0 || 'I';
        const u1 = g1 || 'I';
        const u2 = g2 || 'I';
        stepOperatorLabel = `Operator: ${u0} ⊗ ${u1} ⊗ ${u2}`;
        stepUnitaryLatex = `\\hat{U}_{\\text{step}} = \\hat{U}_{q_0}(${u0}) \\otimes \\hat{U}_{q_1}(${u1}) \\otimes \\hat{U}_{q_2}(${u2})`;
      }
    }

    // Reduced density matrix for Qubit 0 (partial trace over q1, q2)
    let rho00 = 0, rho01_re = 0, rho01_im = 0, rho11 = 0;
    const numStates = this.engine.numStates || 8;
    const st = this.engine.state;
    for (let i = 0; i < numStates; i++) {
      const bit0 = (i >> (this.numQubits - 1)) & 1;
      const magSq = st[i].absSq();
      if (bit0 === 0) {
        rho00 += magSq;
        const j = i ^ (1 << (this.numQubits - 1));
        const ai = st[i];
        const aj = st[j];
        rho01_re += (ai.re * aj.re + ai.im * aj.im);
        rho01_im += (ai.im * aj.re - ai.re * aj.im);
      } else {
        rho11 += magSq;
      }
    }
    const subPurity = Math.min(1.0, Math.max(0.5, (rho00 * rho00) + (rho11 * rho11) + 2 * (rho01_re * rho01_re + rho01_im * rho01_im)));

    // -------------------------------------------------------------
    // 1. UPDATE BEGINNER INTUITION PANEL
    // -------------------------------------------------------------
    const begPill = document.getElementById('beginner-step-pill');
    const begConcept = document.getElementById('beginner-concept-tag');
    const begAction = document.getElementById('beginner-action-badge');
    const begIcon = document.getElementById('beginner-story-icon');
    const begTitle = document.getElementById('beginner-story-title');
    const begDesc = document.getElementById('beginner-story-desc');
    const begChance = document.getElementById('beginner-chance-val');
    const begApp = document.getElementById('beginner-app-val');

    if (begPill) begPill.textContent = stepPillText;

    if (isEntangled) {
      // One description path for every entangled circuit, driven entirely
      // by what QuantumCircuitEngine actually computed for THIS statevector
      // - not a separate branch per "named" pattern (Bell/GHZ/rotated/
      // generic) that only fired when the gate list or output happened to
      // match a specific lookup. m.entanglementClass is itself computed
      // from real Wootters concurrence, per-qubit entropy and entanglement
      // monogamy (see quantum-engine.js) - it already correctly reads
      // "Bell-Type" for ANY genuine maximally-entangled 2-qubit pair
      // (however it was built) and "GHZ-Type" for ANY genuine
      // monogamy-saturated multipartite state, so trusting it directly here
      // means the label can never drift out of sync with the physics, and
      // never depends on gates matching one specific preset exactly.
      const singleQubitGates = [];
      if (hasX) singleQubitGates.push('Pauli-X');
      if (hasY) singleQubitGates.push('Pauli-Y');
      if (hasZ) singleQubitGates.push('Pauli-Z');
      if (hasS) singleQubitGates.push('S (90° phase)');
      if (hasT) singleQubitGates.push('T (45° phase)');
      const gateList = [entanglingGatesLabel, ...singleQubitGates].filter(Boolean).join(', ');

      if (begConcept) begConcept.textContent = m.entanglementClass;
      if (begAction) begAction.textContent = `🔗 C = ${m.concurrence.toFixed(2)}, S = ${m.vonNeumannEntropy.toFixed(2)} ebits`;
      if (begIcon) begIcon.textContent = '🔗';
      if (begTitle) begTitle.textContent = `Entangled State: ${stateNames.join(' + ')}`;
      if (begDesc) begDesc.textContent = `Computed from the actual statevector: Wootters concurrence C = ${m.concurrence.toFixed(2)}, von Neumann entropy S = ${m.vonNeumannEntropy.toFixed(2)} ebits, subsystem purity ${(m.purity * 100).toFixed(0)}%, Schmidt rank ${m.schmidtRank}. Gates applied: ${gateList || 'a multi-qubit operation'}. Outcomes are correlated across ${stateNames.join(', ')} - measuring one qubit changes what you'll find on the others.`;
      if (begApp) begApp.textContent = 'Correlated measurement outcomes like this underlie quantum key distribution, teleportation, secret sharing, and error-correcting codes.';
    } else if (isSuperpos) {
      if (begConcept) begConcept.textContent = 'Quantum Superposition (Spinning Coin)';
      if (begAction) begAction.textContent = `🪙 ${activeStates.length}-State Superposition`;
      if (begIcon) begIcon.textContent = '🪙';
      if (begTitle) begTitle.textContent = `Superposition Across ${stateNames.length} States: ${stateNames.join(' + ')}`;
      if (begDesc) begDesc.textContent = `The qubits are in mid-air superposition across ${stateNames.join(', ')}. Until measured, each outcome has a probability weight, allowing quantum parallel exploration!`;
      if (begApp) begApp.textContent = 'Grover Database Search & Quantum Random Numbers';
    } else if (isGround) {
      if (begConcept) begConcept.textContent = 'Ground State Baseline';
      if (begAction) begAction.textContent = '🎯 Ground State |000⟩';
      if (begIcon) begIcon.textContent = '🎯';
      if (begTitle) begTitle.textContent = 'Resting in the Dilution Refrigerator';
      if (begDesc) begDesc.textContent = 'All qubits are resting in their lowest possible energy state |000⟩ at 15 millikelvin. Microwave calibration tone ensures a pure zero-noise baseline.';
      if (begApp) begApp.textContent = 'Quantum Register Pre-Flight Calibration';
    } else {
      const defState = activeStates[0] ? activeStates[0].state : '|000⟩';
      if (begConcept) begConcept.textContent = `Deterministic Pure State (${defState})`;
      if (begAction) begAction.textContent = `🔒 Deterministic State`;
      if (begIcon) begIcon.textContent = '💎';
      if (begTitle) begTitle.textContent = `Definite Quantum Direction: ${defState}`;
      if (begDesc) begDesc.textContent = `The quantum register is currently aligned with a definite computational outcome (${defState}). Measurement will produce a reliable, deterministic readout with zero uncertainty.`;
      if (begApp) begApp.textContent = 'Fault-Tolerant Logic Execution';
    }

    if (begChance) {
      const topStates = activeStates.slice(0, 4).map(s => `${(s.probability * 100).toFixed(1)}% ${s.state}`);
      begChance.textContent = topStates.length > 0 ? topStates.join(', ') : '100% |000⟩';
    }

    // -------------------------------------------------------------
    // 2. UPDATE ADVANCED RESEARCH PANEL (Rigorous Graduate Physics)
    // -------------------------------------------------------------
    const advPill = document.getElementById('advanced-step-pill');
    const advConcept = document.getElementById('advanced-concept-tag');
    const advPurity = document.getElementById('advanced-purity-badge');
    const advConcurrenceVal = document.getElementById('advanced-concurrence-val');
    const gaugeBarConcurrence = document.getElementById('gauge-bar-concurrence');
    const advEntropyVal = document.getElementById('advanced-entropy-val');
    const gaugeBarEntropy = document.getElementById('gauge-bar-entropy');
    const advDensityNote = document.getElementById('advanced-density-note');

    if (advPill) advPill.textContent = stepOperatorLabel;
    if (advConcept) advConcept.textContent = m.entanglementClass;
    if (advPurity) {
      advPurity.textContent = `Purity γ = ${m.purity.toFixed(3)} (${m.purity >= 0.999 ? 'Pure State' : 'Subsystem Mixed'})`;
    }

    // Render Unitary Step Math
    this.renderMathBox('advanced-tensor-math', stepUnitaryLatex);

    // Render Dirac State Expansion
    let stateLatex = '|\\psi\\rangle = ';
    if (activeStates.length === 0) {
      stateLatex += '|000\\rangle';
    } else {
      const terms = activeStates.map((s, idx) => {
        const p = s.probability;
        const ket = s.state.replace('|', '').replace('⟩', '');
        let coeff = Math.sqrt(p).toFixed(2);
        if (Math.abs(p - 0.5) < 0.02) coeff = '\\frac{1}{\\sqrt{2}}';
        else if (Math.abs(p - 0.25) < 0.02) coeff = '\\frac{1}{2}';
        else if (Math.abs(p - 0.333) < 0.03) coeff = '\\frac{1}{\\sqrt{3}}';
        else if (Math.abs(p - 1.0) < 0.01) coeff = '';
        return `${idx > 0 ? '+ ' : ''}${coeff}|${ket}\\rangle`;
      });
      stateLatex += terms.join(' ');
    }
    this.renderMathBox('advanced-state-decomp', stateLatex);

    // Render Reduced Density Matrix for q0
    const r00 = rho00.toFixed(2);
    const r11 = rho11.toFixed(2);
    let r01 = rho01_re.toFixed(2);
    if (Math.abs(rho01_im) > 0.01) {
      r01 = `${rho01_re.toFixed(2)}${rho01_im >= 0 ? '+' : '-'}${Math.abs(rho01_im).toFixed(2)}i`;
    }
    let r10 = rho01_re.toFixed(2);
    if (Math.abs(rho01_im) > 0.01) {
      r10 = `${rho01_re.toFixed(2)}${-rho01_im >= 0 ? '+' : '-'}${Math.abs(rho01_im).toFixed(2)}i`;
    }

    const densityLatex = `\\rho_{q_0} = \\begin{bmatrix} ${r00} & ${r01} \\\\ ${r10} & ${r11} \\end{bmatrix} \\implies \\text{Tr}(\\rho_{q_0}^2) = ${subPurity.toFixed(3)}`;
    this.renderMathBox('advanced-reduced-density', densityLatex);

    if (advDensityNote) {
      if (subPurity < 0.96) {
        advDensityNote.innerHTML = `Subsystem purity <strong>γ = ${subPurity.toFixed(3)} &lt; 1.000</strong> (maximally mixed reduced state) confirms bipartite entanglement between <em>q₀</em> and register <em>(q₁, q₂)</em>.`;
      } else {
        advDensityNote.innerHTML = `Subsystem purity <strong>γ = ${subPurity.toFixed(3)} ≈ 1.000</strong> confirms <em>q₀</em> is separable and unentangled with register <em>(q₁, q₂)</em>.`;
      }
    }

    // Gauges
    if (advConcurrenceVal) advConcurrenceVal.textContent = m.concurrence.toFixed(3);
    if (gaugeBarConcurrence) gaugeBarConcurrence.style.width = `${Math.min(100, Math.round(m.concurrence * 100))}%`;

    if (advEntropyVal) advEntropyVal.textContent = `${m.vonNeumannEntropy.toFixed(3)} bit`;
    if (gaugeBarEntropy) gaugeBarEntropy.style.width = `${Math.min(100, Math.round(m.vonNeumannEntropy * 100))}%`;
  }
}

// Educational Physical Mechanism Reference Data
const GATE_EDUCATIONAL_DATA = {
  'H': {
    name: 'Hadamard Gate',
    role: 'Superposition Creator',
    color: '#ea580c',
    matrix: 'H = 1/√2 [[1, 1], [1, -1]]',
    concept: 'Acts like a 50:50 quantum beam splitter. Maps deterministic ground state |0⟩ into equal wave interference superposition with 50% probability of |0⟩ and 50% probability of |1⟩.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><path d="M 10 18 Q 40 4 80 18 T 150 18" fill="none" stroke="#f97316" stroke-width="2.5"><animate attributeName="d" values="M 10 18 Q 40 4 80 18 T 150 18; M 10 18 Q 40 32 80 18 T 150 18; M 10 18 Q 40 4 80 18 T 150 18" dur="2s" repeatCount="indefinite"/></path></svg>'
  },
  'CX': {
    name: 'Controlled-NOT (CNOT)',
    role: 'Entanglement Generator',
    color: '#6366f1',
    matrix: 'CX = [[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]]',
    concept: 'Flips target qubit if and only if control qubit is |1⟩. Combined with Hadamard, it produces maximally entangled Bell states where neither qubit possesses an independent state.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><circle cx="40" cy="18" r="5" fill="#6366f1"><animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite"/></circle><line x1="40" y1="18" x2="120" y2="18" stroke="#00f0ff" stroke-width="2" stroke-dasharray="4 2"><animate attributeName="stroke-dashoffset" values="0;12" dur="1s" repeatCount="indefinite"/></line><circle cx="120" cy="18" r="8" fill="none" stroke="#6366f1" stroke-width="2"/><line x1="120" y1="10" x2="120" y2="26" stroke="#6366f1" stroke-width="2"/><line x1="112" y1="18" x2="128" y2="18" stroke="#6366f1" stroke-width="2"/></svg>'
  },
  'X': {
    name: 'Pauli-X Gate',
    role: 'Quantum Bit-Flip (NOT)',
    color: '#ef4444',
    matrix: 'X = [[0, 1], [1, 0]]',
    concept: 'Rotates the statevector by π radians (180°) around the X-axis of the Bloch sphere, inverting computational ground |0⟩ and excited |1⟩ states.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><path d="M 20 28 L 60 28 L 100 8 L 140 8" fill="none" stroke="#ef4444" stroke-width="2.5"><animate attributeName="stroke" values="#ef4444;#f87171;#ef4444" dur="2s" repeatCount="indefinite"/></path></svg>'
  },
  'Z': {
    name: 'Pauli-Z Gate',
    role: 'Phase-Flip Gate',
    color: '#8b5cf6',
    matrix: 'Z = [[1, 0], [0, -1]]',
    concept: 'Rotates the statevector by π radians around the Z-axis. Leaves probabilities unchanged (|−1|² = 1) but introduces destructive quantum interference.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><path d="M 10 18 Q 45 4 80 18 Q 115 32 150 18" fill="none" stroke="#8b5cf6" stroke-width="2.5"><animate attributeName="d" values="M 10 18 Q 45 4 80 18 Q 115 32 150 18; M 10 18 Q 45 32 80 18 Q 115 4 150 18; M 10 18 Q 45 4 80 18 Q 115 32 150 18" dur="1.8s" repeatCount="indefinite"/></path></svg>'
  },
  'Y': {
    name: 'Pauli-Y Gate',
    role: 'Bit & Phase Flip',
    color: '#ec4899',
    matrix: 'Y = [[0, −i], [i, 0]]',
    concept: 'Rotates the statevector by π radians around the Y-axis. Combines both a bit-flip and a complex imaginary phase shift.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><circle cx="80" cy="18" r="11" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="6 3"><animateTransform attributeName="transform" type="rotate" from="0 80 18" to="360 80 18" dur="3s" repeatCount="indefinite"/></circle></svg>'
  },
  'S': {
    name: 'Phase Gate (S / √Z)',
    role: '90° Equatorial Rotation',
    color: '#06b6d4',
    matrix: 'S = [[1, 0], [0, i]]',
    concept: 'Quarter-turn phase shift (+π/2) on the equatorial plane. Fundamental building block for the Quantum Fourier Transform (QFT).',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><path d="M 20 18 A 60 18 0 0 1 140 18" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-dasharray="8 4"><animate attributeName="stroke-dashoffset" values="24;0" dur="2s" repeatCount="indefinite"/></path></svg>'
  },
  'T': {
    name: 'T-Gate (π/8 / ∜Z)',
    role: 'Universal Non-Clifford Gate',
    color: '#0ea5e9',
    matrix: 'T = [[1, 0], [0, e^(iπ/4)]]',
    concept: 'Injects non-Clifford magic states (+π/4). Enables universal fault-tolerant quantum computation beyond classical simulability (Gottesman-Knill theorem).',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><polygon points="80,6 92,28 68,28" fill="rgba(14,165,233,0.3)" stroke="#0ea5e9" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 80 18" to="360 80 18" dur="4s" repeatCount="indefinite"/></polygon></svg>'
  },
  'M': {
    name: 'Measurement Detector',
    role: 'Born Rule State Collapse',
    color: '#64748b',
    matrix: 'M = |0⟩⟨0| or |1⟩⟨1|',
    concept: 'Forces a delicate superposition to collapse into a classical 0 or 1 eigenstate via interaction with a macroscopic dispersive readout resonator.',
    waveSvg: '<svg viewBox="0 0 160 36" width="100%" height="36"><path d="M 10 26 Q 40 24 60 26 Q 80 2 80 2 Q 80 26 100 26 Q 130 24 150 26" fill="none" stroke="#94a3b8" stroke-width="2.5"><animate attributeName="stroke" values="#94a3b8;#00f0ff;#94a3b8" dur="1.2s" repeatCount="indefinite"/></path></svg>'
  }
};

window.CircuitUI = CircuitUI;
