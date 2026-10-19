/**
 * Ananta Quantum Control & Hardware Studio (Inspired by Q-CTRL)
 * 1. Realistic Hardware Noise & Decoherence Simulator (Fire Opal style)
 * 2. RF Microwave Control Pulse Visualizer (Boulder Opal style)
 * 3. Gamified Quantum Skill Tree & Achievement Badges (Black Opal style)
 */

class HardwareControlStudio {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;

    // Noise parameters
    this.isNoisyMode = false;
    this.t1Relaxation = 50; // microseconds
    this.t2Dephasing = 30; // microseconds
    this.gateErrorRate = 0.8; // percent
    this.isDynamicDecouplingActive = false;

    // Pulse visualizer
    this.selectedGateForPulse = 'H';
    this.pulseAnimFrame = null;
    this.pulseTime = 0;

    // Skill Tree & Gamification State
    this.xp = parseInt(localStorage.getItem('ananta_xp') || '150', 10);
    this.unlockedSkills = JSON.parse(localStorage.getItem('ananta_skills') || '["superposition"]');

    this.skillsCatalog = [
      {
        id: 'superposition',
        title: 'Superposition Pioneer',
        desc: 'Place a Hadamard (H) gate to create a 50/50 equal superposition state |+⟩.',
        xp: 100,
        badge: '✨',
        unlocked: true,
        check: (grid, probs) => {
          return probs.some(p => Math.abs(p.probability - 0.5) < 0.05);
        }
      },
      {
        id: 'entanglement',
        title: 'Entanglement Architect',
        desc: 'Synthesize a two-qubit Bell Pair (|Φ⁺⟩ = (|00⟩ + |11⟩)/√2) using H and CNOT.',
        xp: 200,
        badge: '🔗',
        unlocked: false,
        check: (grid, probs) => {
          const active = probs.filter(p => p.probability > 0.05);
          return active.length === 2 && Math.abs(active[0].probability - 0.5) < 0.08;
        }
      },
      {
        id: 'phase_shift',
        title: 'Phase Alchemist',
        desc: 'Apply a Phase gate (Z, S, or T) to rotate the statevector complex angle.',
        xp: 150,
        badge: '🌀',
        unlocked: false,
        check: (grid, probs) => {
          return grid.some(row => row.some(cell => cell === 'Z' || cell === 'S' || cell === 'T'));
        }
      },
      {
        id: 'error_suppression',
        title: 'Quantum Noise Buster',
        desc: 'Activate Dynamic Decoupling pulse sequences to restore circuit fidelity above 90%.',
        xp: 250,
        badge: '🛡️',
        unlocked: false,
        check: (grid, probs) => {
          return this.isDynamicDecouplingActive;
        }
      },
      {
        id: 'grover_master',
        title: 'Search Velocity Master',
        desc: 'Execute Grover\'s search algorithm with constructive wave interference.',
        xp: 300,
        badge: '⚡',
        unlocked: false,
        check: (grid, probs) => {
          return probs.some(p => p.probability > 0.65);
        }
      }
    ];

    this.init();
  }

  init() {
    this.bindNoiseControls();
    this.renderSkillTree();
  }

  // =========================================================================
  // 1. HARDWARE NOISE & DECOHERENCE SIMULATOR (Fire Opal Inspired)
  // =========================================================================
  bindNoiseControls() {
    const toggleNoisy = document.getElementById('toggle-noise-mode');
    const selectPreset = document.getElementById('select-hardware-preset');
    const sliderT1 = document.getElementById('slider-t1');
    const sliderT2 = document.getElementById('slider-t2');
    const sliderError = document.getElementById('slider-gate-error');
    const btnDecoupling = document.getElementById('btn-apply-decoupling');

    if (selectPreset) {
      selectPreset.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'ibm_heron') {
          this.t1Relaxation = 180;
          this.t2Dephasing = 140;
          this.gateErrorRate = 0.4;
        } else if (val === 'ibm_eagle') {
          this.t1Relaxation = 50;
          this.t2Dephasing = 30;
          this.gateErrorRate = 0.8;
        } else if (val === 'google_sycamore') {
          this.t1Relaxation = 20;
          this.t2Dephasing = 25;
          this.gateErrorRate = 0.6;
        } else if (val === 'ionq_trapped_ion') {
          this.t1Relaxation = 10000;
          this.t2Dephasing = 1000;
          this.gateErrorRate = 0.15;
        }
        if (sliderT1) { sliderT1.value = Math.min(150, this.t1Relaxation); }
        if (sliderT2) { sliderT2.value = Math.min(100, this.t2Dephasing); }
        if (sliderError) { sliderError.value = this.gateErrorRate; }
        const elT1 = document.getElementById('val-t1');
        const elT2 = document.getElementById('val-t2');
        const elErr = document.getElementById('val-gate-error');
        if (elT1) elT1.textContent = `${this.t1Relaxation} µs`;
        if (elT2) elT2.textContent = `${this.t2Dephasing} µs`;
        if (elErr) elErr.textContent = `${this.gateErrorRate}%`;
        this.updateNoiseDisplay();
      });
    }

    if (toggleNoisy) {
      toggleNoisy.addEventListener('change', (e) => {
        this.isNoisyMode = e.target.checked;
        this.updateNoiseDisplay();
      });
    }

    if (sliderT1) {
      sliderT1.addEventListener('input', (e) => {
        this.t1Relaxation = parseFloat(e.target.value);
        document.getElementById('val-t1').textContent = `${this.t1Relaxation} µs`;
        this.updateNoiseDisplay();
      });
    }

    if (sliderT2) {
      sliderT2.addEventListener('input', (e) => {
        this.t2Dephasing = parseFloat(e.target.value);
        document.getElementById('val-t2').textContent = `${this.t2Dephasing} µs`;
        this.updateNoiseDisplay();
      });
    }

    if (sliderError) {
      sliderError.addEventListener('input', (e) => {
        this.gateErrorRate = parseFloat(e.target.value);
        document.getElementById('val-gate-error').textContent = `${this.gateErrorRate}%`;
        this.updateNoiseDisplay();
      });
    }

    if (btnDecoupling) {
      btnDecoupling.addEventListener('click', () => {
        this.isDynamicDecouplingActive = !this.isDynamicDecouplingActive;
        btnDecoupling.classList.toggle('active-decoupling', this.isDynamicDecouplingActive);
        btnDecoupling.textContent = this.isDynamicDecouplingActive 
          ? '✓ Dynamic Decoupling Active (Refocused)' 
          : 'Apply Dynamic Decoupling (Suppress Noise) 🛡️';
        this.updateNoiseDisplay();
        this.checkSkillUnlocks();
      });
    }
  }

  calculateHardwareFidelity() {
    if (!this.isNoisyMode) return { fidelity: 1.0, purity: 1.0 };

    // Decoherence model: F ~ exp(-t/T1) * exp(-t/T2) * (1 - error)^numGates
    let gateCount = 0;
    if (this.circuitUI && this.circuitUI.grid) {
      this.circuitUI.grid.forEach(row => {
        row.forEach(cell => { if (cell) gateCount++; });
      });
    }
    gateCount = Math.max(1, gateCount);

    const circuitTime = gateCount * 0.04; // ~40ns per gate in microseconds
    const t1Factor = Math.exp(-circuitTime / this.t1Relaxation);
    const t2Factor = Math.exp(-circuitTime / this.t2Dephasing);
    const gateFactor = Math.pow(1 - (this.gateErrorRate / 100), gateCount);

    let rawFidelity = t1Factor * t2Factor * gateFactor;

    // If dynamic decoupling is active (Q-CTRL style), suppress dephasing errors by ~8x
    if (this.isDynamicDecouplingActive) {
      const decoupledT2 = this.t2Dephasing * 8;
      const decoupledT2Factor = Math.exp(-circuitTime / decoupledT2);
      rawFidelity = t1Factor * decoupledT2Factor * Math.pow(1 - (this.gateErrorRate / 300), gateCount);
      rawFidelity = Math.min(0.97, rawFidelity + 0.28);
    }

    rawFidelity = Math.max(0.20, Math.min(1.0, rawFidelity));
    const purity = Math.max(0.35, Math.pow(rawFidelity, 1.2));

    return { fidelity: rawFidelity, purity: purity };
  }

  updateNoiseDisplay() {
    const { fidelity, purity } = this.calculateHardwareFidelity();

    const fidLabel = document.getElementById('hardware-fidelity-val');
    const fidBar = document.getElementById('hardware-fidelity-bar');
    const purityLabel = document.getElementById('hardware-purity-val');
    const statusNote = document.getElementById('hardware-noise-note');

    if (fidLabel) fidLabel.textContent = `${(fidelity * 100).toFixed(1)}%`;
    if (fidBar) {
      fidBar.style.width = `${(fidelity * 100).toFixed(1)}%`;
      if (fidelity > 0.85) {
        fidBar.style.background = '#10b981';
      } else if (fidelity > 0.6) {
        fidBar.style.background = '#fbbf24';
      } else {
        fidBar.style.background = '#fa4d56';
      }
    }
    if (purityLabel) purityLabel.textContent = `Tr(ρ²) = ${purity.toFixed(3)}`;

    if (statusNote) {
      if (!this.isNoisyMode) {
        statusNote.innerHTML = `<span style="color:#00f0ff;">Ideal Noiseless Mode:</span> 100% mathematical fidelity.`;
      } else if (this.isDynamicDecouplingActive) {
        statusNote.innerHTML = `<span style="color:#10b981; font-weight:700;">Error Suppressed:</span> Refocusing pulses restored coherence.`;
      } else {
        statusNote.innerHTML = `<span style="color:#fa4d56; font-weight:700;">Noise Active:</span> Energy relaxation & dephasing degrading purity.`;
      }
    }
  }

  // =========================================================================
  // 2. RF MICROWAVE CONTROL PULSE VISUALIZER (Boulder Opal Inspired)
  // =========================================================================
  initPulseCanvas() {
    const canvas = document.getElementById('microwave-pulse-canvas');
    if (!canvas) return;

    const chips = document.querySelectorAll('.pulse-gate-select-btn');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.selectedGateForPulse = chip.getAttribute('data-gate');
        this.updatePulseMetadata();
      });
    });

    this.startPulseAnimation(canvas);
  }

  updatePulseMetadata() {
    const title = document.getElementById('pulse-gate-title');
    const desc = document.getElementById('pulse-gate-desc');
    const freq = document.getElementById('pulse-freq-val');
    const duration = document.getElementById('pulse-duration-val');

    const meta = {
      H: { name: 'Hadamard (H)', desc: 'Y/2 rotation via shaped Gaussian DRAG envelope', freq: '5.184 GHz', duration: '20 ns' },
      X: { name: 'Pauli-X (NOT)', desc: 'π-pulse with derivative removal by adiabatic gate (DRAG)', freq: '5.184 GHz', duration: '24 ns' },
      Z: { name: 'Pauli-Z', desc: 'Virtual Z rotation via frame-change (Zero pulse duration)', freq: '0.000 GHz (Virtual)', duration: '0 ns' },
      CX: { name: 'Cross-Resonance (CNOT)', desc: 'Drive control qubit at target resonance frequency to induce entangling ZZ interaction', freq: '5.240 GHz (Cross)', duration: '140 ns' }
    };

    const current = meta[this.selectedGateForPulse] || meta['H'];
    if (title) title.textContent = current.name;
    if (desc) desc.textContent = current.desc;
    if (freq) freq.textContent = current.freq;
    if (duration) duration.textContent = current.duration;
  }

  startPulseAnimation(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      const isLight = document.body.classList.contains('light-theme');
      ctx.fillStyle = isLight ? '#ffffff' : '#050505';
      ctx.fillRect(0, 0, w, h);

      // Grid line
      const midY = h * 0.52;
      ctx.strokeStyle = isLight ? '#e4e4e7' : '#1f1f1f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      this.pulseTime += 0.05;

      const gate = this.selectedGateForPulse;

      if (gate === 'Z') {
        // Virtual Z has zero envelope (Frame change)
        ctx.font = '12px Roboto Mono, monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('Virtual Z Gate: Instantaneous phase frame change in software (Duration = 0 ns, Amplitude = 0 mV)', 20, midY - 15);
        ctx.restore();
        this.pulseAnimFrame = requestAnimationFrame(render);
        return;
      }

      const amp = h * 0.35;
      const center = w * 0.5;
      const sigma = w * 0.16;

      // In-Phase Channel I(t): Gaussian Envelope * Cosine RF Carrier
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;

      for (let x = 0; x < w; x++) {
        const envelope = Math.exp(-Math.pow((x - center) / sigma, 2));
        const carrier = Math.cos((x - center) * 0.35 - this.pulseTime * 2);
        const y = midY - envelope * carrier * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Quadrature Channel Q(t): DRAG Derivative Correction Pulse (Orange)
      ctx.beginPath();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;

      for (let x = 0; x < w; x++) {
        const dEnvelope = -2 * ((x - center) / (sigma * sigma)) * Math.exp(-Math.pow((x - center) / sigma, 2)) * sigma * 0.8;
        const carrier = Math.sin((x - center) * 0.35 - this.pulseTime * 2);
        const y = midY - dEnvelope * carrier * amp * 0.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Envelope Boundary Curve
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const env = Math.exp(-Math.pow((x - center) / sigma, 2)) * amp;
        if (x === 0) ctx.moveTo(x, midY - env);
        else ctx.lineTo(x, midY - env);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Channel Labels
      ctx.font = '10px Roboto Mono, monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('■ I(t) In-Phase RF Microwave Drive', 14, 20);
      ctx.fillStyle = '#ea580c';
      ctx.fillText('■ Q(t) Quadrature DRAG Correction', 240, 20);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('--- Gaussian Pulse Envelope Ω(t)', 470, 20);

      ctx.restore();
      this.pulseAnimFrame = requestAnimationFrame(render);
    };

    if (this.pulseAnimFrame) cancelAnimationFrame(this.pulseAnimFrame);
    this.pulseAnimFrame = requestAnimationFrame(render);
  }

  stopPulseAnimation() {
    if (this.pulseAnimFrame) {
      cancelAnimationFrame(this.pulseAnimFrame);
      this.pulseAnimFrame = null;
    }
  }

  // =========================================================================
  // 3. GAMIFIED SKILL TREE & BADGES (Black Opal Inspired)
  // =========================================================================
  renderSkillTree() {
    const container = document.getElementById('skill-tree-nodes');
    const xpCounter = document.getElementById('player-xp-counter');
    if (xpCounter) xpCounter.textContent = `${this.xp} XP`;

    if (!container) return;
    container.innerHTML = '';

    this.skillsCatalog.forEach(skill => {
      const isUnlocked = this.unlockedSkills.includes(skill.id);
      const card = document.createElement('div');
      card.className = `skill-node-card ${isUnlocked ? 'skill-unlocked' : 'skill-locked'}`;

      card.innerHTML = `
        <div class="skill-badge-icon">${skill.badge}</div>
        <div class="skill-node-content">
          <div class="skill-node-title-row">
            <h4>${skill.title}</h4>
            <span class="skill-status-tag">${isUnlocked ? '✓ Mastered' : '+ ' + skill.xp + ' XP'}</span>
          </div>
          <p class="skill-node-desc">${skill.desc}</p>
        </div>
      `;
      container.appendChild(card);
    });
  }

  checkSkillUnlocks() {
    if (!this.circuitUI || !this.circuitUI.grid) return;
    const probs = this.engine.getProbabilities();

    let updated = false;
    this.skillsCatalog.forEach(skill => {
      if (!this.unlockedSkills.includes(skill.id)) {
        if (skill.check(this.circuitUI.grid, probs)) {
          this.unlockedSkills.push(skill.id);
          this.xp += skill.xp;
          updated = true;
          this.showSkillUnlockNotification(skill);
        }
      }
    });

    if (updated) {
      localStorage.setItem('ananta_xp', this.xp.toString());
      localStorage.setItem('ananta_skills', JSON.stringify(this.unlockedSkills));
      this.renderSkillTree();
    }
  }

  showSkillUnlockNotification(skill) {
    const note = document.createElement('div');
    note.className = 'skill-unlock-toast';
    note.innerHTML = `
      <div class="toast-badge">${skill.badge}</div>
      <div class="toast-text">
        <strong>Skill Unlocked: ${skill.title}</strong>
        <span>+${skill.xp} XP earned in Ananta Mastery</span>
      </div>
    `;
    document.body.appendChild(note);
    setTimeout(() => note.classList.add('toast-show'), 20);
    setTimeout(() => {
      note.classList.remove('toast-show');
      setTimeout(() => note.remove(), 400);
    }, 4500);
  }
}

window.HardwareControlStudio = HardwareControlStudio;
