/**
 * Ananta Real-World Quantum Intuition Lab
 * Interactive visual simulations translating abstract quantum mechanics
 * into tangible real-world analogies:
 * 1. The Spinning Coin (Superposition vs Measurement)
 * 2. Noise-Canceling Headphones (Phase & Destructive Wave Interference)
 * 3. Synchronized Magic Dice (Quantum Entanglement & Non-Locality)
 */

class IntuitionLab {
  constructor() {
    this.coinState = 'idle'; // 'idle', 'spinning', 'measured'
    this.coinResult = 0; // 0 or 1
    this.totalCoinFlips = 0;
    this.headsCount = 0;
    this.tailsCount = 0;

    this.wavePhase = Math.PI; // default out-of-phase (destructive interference)
    this.waveAnimFrame = null;
    this.waveTime = 0;

    this.entanglementMode = true;
    this.diceResultA = 1;
    this.diceResultB = 1;
    this.diceRolls = 0;
    this.diceMatches = 0;

    this.init();
  }

  init() {
    this.bindCoinControls();
    this.bindDiceControls();
  }

  // =========================================================================
  // 1. THE SPINNING COIN (Superposition & Measurement)
  // =========================================================================
  bindCoinControls() {
    const btnSpin = document.getElementById('btn-spin-coin');
    const btnMeasure = document.getElementById('btn-measure-coin');
    const btnReset = document.getElementById('btn-reset-coin');

    if (btnSpin) btnSpin.addEventListener('click', () => this.spinCoin());
    if (btnMeasure) btnMeasure.addEventListener('click', () => this.measureCoin());
    if (btnReset) btnReset.addEventListener('click', () => this.resetCoinStats());
  }

  spinCoin() {
    const coinEl = document.getElementById('quantum-coin-3d');
    const statusText = document.getElementById('coin-status-text');
    const stateFormula = document.getElementById('coin-state-formula');
    const measureBtn = document.getElementById('btn-measure-coin');

    if (!coinEl) return;

    this.coinState = 'spinning';
    coinEl.classList.remove('coin-heads', 'coin-tails', 'coin-resting');
    coinEl.classList.add('coin-spinning-active');

    if (statusText) {
      statusText.innerHTML = `<span style="color:#00f0ff; font-weight:700;">Spinning on edge!</span> In continuous superposition (neither Heads nor Tails).`;
    }
    if (stateFormula) {
      stateFormula.innerHTML = `|ψ⟩ = (1/√2) |Heads⟩ + (1/√2) |Tails⟩`;
    }
    if (measureBtn) measureBtn.disabled = false;
  }

  measureCoin() {
    if (this.coinState !== 'spinning') return;

    const coinEl = document.getElementById('quantum-coin-3d');
    const statusText = document.getElementById('coin-status-text');
    const stateFormula = document.getElementById('coin-state-formula');
    const measureBtn = document.getElementById('btn-measure-coin');

    this.coinState = 'measured';
    coinEl.classList.remove('coin-spinning-active');

    // 50/50 quantum measurement collapse
    this.coinResult = Math.random() < 0.5 ? 0 : 1;
    this.totalCoinFlips++;

    if (this.coinResult === 0) {
      this.headsCount++;
      coinEl.classList.add('coin-heads');
      if (statusText) {
        statusText.innerHTML = `<span style="color:#10b981; font-weight:700;">Wavefunction Collapsed!</span> Result: <strong>Heads (|0⟩)</strong>`;
      }
      if (stateFormula) {
        stateFormula.innerHTML = `|ψ⟩ = 1.0 |0⟩ (Definite Classical State)`;
      }
    } else {
      this.tailsCount++;
      coinEl.classList.add('coin-tails');
      if (statusText) {
        statusText.innerHTML = `<span style="color:#ee5396; font-weight:700;">Wavefunction Collapsed!</span> Result: <strong>Tails (|1⟩)</strong>`;
      }
      if (stateFormula) {
        stateFormula.innerHTML = `|ψ⟩ = 1.0 |1⟩ (Definite Classical State)`;
      }
    }

    if (measureBtn) measureBtn.disabled = true;
    this.updateCoinStats();
  }

  updateCoinStats() {
    const totalEl = document.getElementById('coin-stat-total');
    const headsEl = document.getElementById('coin-stat-heads');
    const tailsEl = document.getElementById('coin-stat-tails');
    const headsBar = document.getElementById('coin-bar-heads');
    const tailsBar = document.getElementById('coin-bar-tails');

    if (totalEl) totalEl.textContent = this.totalCoinFlips;
    if (headsEl) headsEl.textContent = this.headsCount;
    if (tailsEl) tailsEl.textContent = this.tailsCount;

    if (this.totalCoinFlips > 0) {
      const headsPct = ((this.headsCount / this.totalCoinFlips) * 100).toFixed(1);
      const tailsPct = ((this.tailsCount / this.totalCoinFlips) * 100).toFixed(1);
      if (headsBar) headsBar.style.width = `${headsPct}%`;
      if (tailsBar) tailsBar.style.width = `${tailsPct}%`;
    }
  }

  resetCoinStats() {
    this.totalCoinFlips = 0;
    this.headsCount = 0;
    this.tailsCount = 0;
    this.coinState = 'idle';
    const coinEl = document.getElementById('quantum-coin-3d');
    if (coinEl) {
      coinEl.className = 'quantum-coin-disc coin-resting';
    }
    const statusText = document.getElementById('coin-status-text');
    const stateFormula = document.getElementById('coin-state-formula');
    if (statusText) statusText.innerHTML = `Coin is resting flat on Heads (|0⟩). Click Spin to create Superposition.`;
    if (stateFormula) stateFormula.innerHTML = `|ψ⟩ = 1.0 |0⟩`;
    this.updateCoinStats();
  }

  // =========================================================================
  // 2. NOISE-CANCELING HEADPHONES (Phase & Interference Canvas)
  // =========================================================================
  initWaveCanvas() {
    const canvas = document.getElementById('wave-interference-canvas');
    if (!canvas) return;

    const slider = document.getElementById('wave-phase-slider');
    const phaseLabel = document.getElementById('wave-phase-val');
    const interpType = document.getElementById('wave-interp-type');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.wavePhase = parseFloat(e.target.value);
        if (phaseLabel) {
          const deg = Math.round((this.wavePhase / Math.PI) * 180);
          phaseLabel.textContent = `${deg}° (${(this.wavePhase / Math.PI).toFixed(2)}π rad)`;
        }
        this.updateInterferenceLabel(interpType);
      });
    }

    // Quick Preset Buttons
    const btnDestructive = document.getElementById('btn-preset-destructive');
    const btnConstructive = document.getElementById('btn-preset-constructive');
    const btnQuarter = document.getElementById('btn-preset-quarter');

    if (btnDestructive) {
      btnDestructive.addEventListener('click', () => {
        if (slider) slider.value = Math.PI;
        this.wavePhase = Math.PI;
        if (phaseLabel) phaseLabel.textContent = `180° (1.00π rad)`;
        this.updateInterferenceLabel(interpType);
      });
    }

    if (btnConstructive) {
      btnConstructive.addEventListener('click', () => {
        if (slider) slider.value = 0;
        this.wavePhase = 0;
        if (phaseLabel) phaseLabel.textContent = `0° (0.00π rad)`;
        this.updateInterferenceLabel(interpType);
      });
    }

    if (btnQuarter) {
      btnQuarter.addEventListener('click', () => {
        if (slider) slider.value = Math.PI / 2;
        this.wavePhase = Math.PI / 2;
        if (phaseLabel) phaseLabel.textContent = `90° (0.50π rad)`;
        this.updateInterferenceLabel(interpType);
      });
    }

    this.startWaveAnimation(canvas);
  }

  updateInterferenceLabel(el) {
    if (!el) return;
    const diff = Math.abs(this.wavePhase - Math.PI);
    if (diff < 0.15) {
      el.innerHTML = `<span style="color:#fa4d56; font-weight:700;">100% Destructive Cancellation (Absolute Silence / 0% Amplitude)</span>`;
    } else if (this.wavePhase < 0.15 || Math.abs(this.wavePhase - 2 * Math.PI) < 0.15) {
      el.innerHTML = `<span style="color:#10b981; font-weight:700;">100% Constructive Amplification (2x Sound Power / 100% Amplitude)</span>`;
    } else {
      el.innerHTML = `<span style="color:#00f0ff; font-weight:700;">Partial Interference (Phase Shift)</span>`;
    }
  }

  startWaveAnimation(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const render = () => {
      // Responsive canvas sizing
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // Dark background
      ctx.fillStyle = document.body.classList.contains('light-theme') ? '#ffffff' : '#050505';
      ctx.fillRect(0, 0, w, h);

      // Grid centerlines
      ctx.strokeStyle = document.body.classList.contains('light-theme') ? '#e4e4e7' : '#1f1f1f';
      ctx.lineWidth = 1;
      const midY1 = h * 0.25;
      const midY2 = h * 0.52;
      const midY3 = h * 0.82;

      ctx.beginPath();
      ctx.moveTo(0, midY1); ctx.lineTo(w, midY1);
      ctx.moveTo(0, midY2); ctx.lineTo(w, midY2);
      ctx.moveTo(0, midY3); ctx.lineTo(w, midY3);
      ctx.stroke();

      const amp = h * 0.12;
      const freq = 0.025;
      const speed = 0.05;
      this.waveTime += speed;

      // 1. Noise Wave (Cyan)
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x++) {
        const y = midY1 + Math.sin(x * freq + this.waveTime) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 2. Anti-Noise Wave (Magenta) with Phase Shift
      ctx.beginPath();
      ctx.strokeStyle = '#ee5396';
      ctx.lineWidth = 2.5;
      for (let x = 0; x < w; x++) {
        const y = midY2 + Math.sin(x * freq + this.waveTime + this.wavePhase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Combined Superposition Wave (Net Result)
      ctx.beginPath();
      ctx.strokeStyle = Math.abs(this.wavePhase - Math.PI) < 0.2 ? '#fa4d56' : '#10b981';
      ctx.lineWidth = 3.5;
      for (let x = 0; x < w; x++) {
        const y1 = Math.sin(x * freq + this.waveTime) * amp;
        const y2 = Math.sin(x * freq + this.waveTime + this.wavePhase) * amp;
        const combinedY = midY3 + (y1 + y2);
        if (x === 0) ctx.moveTo(x, combinedY);
        else ctx.lineTo(x, combinedY);
      }
      ctx.stroke();

      // Text Labels
      ctx.font = '11px Roboto Mono, monospace';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('1. Background Airplane Jet Noise (Initial State)', 12, midY1 - 18);
      ctx.fillText('2. Headphone Anti-Wave with Quantum Phase φ', 12, midY2 - 18);
      ctx.fillText('3. Net Combined Wave (What Reaches Your Ear / Algorithm Output)', 12, midY3 - 22);

      ctx.restore();
      this.waveAnimFrame = requestAnimationFrame(render);
    };

    if (this.waveAnimFrame) cancelAnimationFrame(this.waveAnimFrame);
    this.waveAnimFrame = requestAnimationFrame(render);
  }

  stopWaveAnimation() {
    if (this.waveAnimFrame) {
      cancelAnimationFrame(this.waveAnimFrame);
      this.waveAnimFrame = null;
    }
  }

  // =========================================================================
  // 3. SYNCHRONIZED MAGIC DICE (Entanglement)
  // =========================================================================
  bindDiceControls() {
    const btnRoll = document.getElementById('btn-roll-dice');
    const toggleEntangled = document.getElementById('toggle-entangled-dice');

    if (toggleEntangled) {
      toggleEntangled.addEventListener('change', (e) => {
        this.entanglementMode = e.target.checked;
        this.updateDiceModeUI();
      });
    }

    if (btnRoll) {
      btnRoll.addEventListener('click', () => this.rollDice());
    }
  }

  updateDiceModeUI() {
    const beam = document.getElementById('entanglement-beam');
    const modeLabel = document.getElementById('dice-mode-label');
    const stateBadge = document.getElementById('dice-state-badge');

    if (this.entanglementMode) {
      if (beam) beam.classList.add('beam-active');
      if (modeLabel) modeLabel.textContent = 'Quantum Entangled (Bell Pair State |Φ⁺⟩)';
      if (stateBadge) stateBadge.innerHTML = `|ψ⟩ = (1/√2) |00⟩ + (1/√2) |11⟩`;
    } else {
      if (beam) beam.classList.remove('beam-active');
      if (modeLabel) modeLabel.textContent = 'Classical Independent (Uncorrelated)';
      if (stateBadge) stateBadge.innerHTML = `P(A, B) = P(A) × P(B) (Zero Correlation)`;
    }
  }

  rollDice() {
    const dieA = document.getElementById('die-cube-a');
    const dieB = document.getElementById('die-cube-b');
    const resultText = document.getElementById('dice-result-log');

    if (!dieA || !dieB) return;

    dieA.classList.add('dice-rolling-anim');
    dieB.classList.add('dice-rolling-anim');

    setTimeout(() => {
      dieA.classList.remove('dice-rolling-anim');
      dieB.classList.remove('dice-rolling-anim');

      this.diceRolls++;

      if (this.entanglementMode) {
        // 100% correlated Bell state outcome
        const sharedValue = Math.floor(Math.random() * 6) + 1;
        this.diceResultA = sharedValue;
        this.diceResultB = sharedValue;
        this.diceMatches++;
      } else {
        // Independent random dice
        this.diceResultA = Math.floor(Math.random() * 6) + 1;
        this.diceResultB = Math.floor(Math.random() * 6) + 1;
        if (this.diceResultA === this.diceResultB) this.diceMatches++;
      }

      this.renderDieFace('die-cube-a', this.diceResultA);
      this.renderDieFace('die-cube-b', this.diceResultB);

      const matchPct = ((this.diceMatches / this.diceRolls) * 100).toFixed(0);
      const statsEl = document.getElementById('dice-stats-counter');
      if (statsEl) {
        statsEl.textContent = `Rolls: ${this.diceRolls} | Matches: ${this.diceMatches} (${matchPct}% correlation)`;
      }

      if (resultText) {
        if (this.entanglementMode) {
          resultText.innerHTML = `Die A (New Delhi) = <strong>${this.diceResultA}</strong> | Die B (New York) = <strong>${this.diceResultB}</strong> <span style="color:#10b981; font-weight:700;">★ 100% Instant Correlation</span>`;
        } else {
          const match = this.diceResultA === this.diceResultB;
          resultText.innerHTML = `Die A = <strong>${this.diceResultA}</strong> | Die B = <strong>${this.diceResultB}</strong> ${match ? '(Random match)' : '(Independent)'}`;
        }
      }
    }, 450);
  }

  renderDieFace(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const dotPatterns = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    const dots = dotPatterns[value] || [4];
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const dot = document.createElement('div');
      dot.className = dots.includes(i) ? 'dice-dot active' : 'dice-dot';
      el.appendChild(dot);
    }
  }
}

window.IntuitionLab = IntuitionLab;
