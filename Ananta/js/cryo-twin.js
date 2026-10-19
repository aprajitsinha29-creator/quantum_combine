/**
 * NQM Cryostat Hardware Digital Twin — Ananta
 * =============================================================
 * Animated dilution refrigerator cross-section with 5 thermal stages.
 * Interactive temperature slider injects real Boltzmann thermal photon
 * noise into the statevector. Supports NQM-8 Star, IBM Heavy-Hex 7,
 * and Google Sycamore 5x5 topologies.
 * National Quantum Mission hardware co-design suite.
 */

class CryostatTwin {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;

    // Physics constants
    this.h  = 6.626e-34;  // Planck constant
    this.kB = 1.381e-23;  // Boltzmann constant
    this.f  = 5e9;        // Qubit frequency ~5 GHz

    // State
    this.temperatureMK = 15;   // millikelvin (base 15 mK)
    this.selectedTopology = 'nqm8';
    this.noiseInjected = false;
    this.animFrame = null;
    this.thermalPulsePhase = 0;

    // QPU data from published literature
    this.topologies = {
      nqm8: {
        name: 'NQM-8 Star (IISc / RRI)',
        flag: 'IN',
        qubits: 8,
        t1Us: 48,
        t2Us: 29,
        gateError: 0.12,
        readoutError: 0.8,
        coupling: 'Star (all-to-center)',
        freq: '4.8 - 5.4 GHz',
        source: 'RRI Bengaluru 2024',
        color: '#ff9933'
      },
      ibmheavyhex: {
        name: 'IBM Heavy-Hex 7 (Eagle)',
        flag: 'US',
        qubits: 7,
        t1Us: 284,
        t2Us: 168,
        gateError: 0.32,
        readoutError: 1.2,
        coupling: 'Heavy-Hexagonal',
        freq: '4.5 - 5.5 GHz',
        source: 'IBM Quantum 2024',
        color: '#0f62fe'
      },
      sycamore: {
        name: 'Google Sycamore 5x5',
        flag: 'US',
        qubits: 25,
        t1Us: 15,
        t2Us: 23,
        gateError: 0.6,
        readoutError: 3.1,
        coupling: '2D Grid (nearest-neighbour)',
        freq: '5.0 - 5.8 GHz',
        source: 'Google Quantum AI 2023',
        color: '#4285f4'
      }
    };

    this.init();
  }

  init() {
    this._bindEvents();
    this._renderTopologyCards();
    this._renderCryostatSVG();
    this._updateDisplay();
    this._startThermalAnimation();
  }

  _bindEvents() {
    const tempSlider = document.getElementById('cryo-temp-slider');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        this.temperatureMK = parseFloat(e.target.value);
        this._updateDisplay();
        this._renderThermalNoise();
      });
    }

    const topoSelect = document.getElementById('cryo-topology-select');
    if (topoSelect) {
      topoSelect.addEventListener('change', (e) => {
        this.selectedTopology = e.target.value;
        this._renderTopologyCards();
        this._updateDisplay();
      });
    }

    const btnInject = document.getElementById('btn-cryo-inject');
    if (btnInject) {
      btnInject.addEventListener('click', () => this._injectNoiseIntoCircuit());
    }

    const btnReset = document.getElementById('btn-cryo-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.temperatureMK = 15;
        const sl = document.getElementById('cryo-temp-slider');
        if (sl) sl.value = 15;
        this._updateDisplay();
        this._renderThermalNoise();
      });
    }
  }

  // Boltzmann thermal photon occupation number
  _thermalPhotons() {
    const T = this.temperatureMK * 1e-3;   // K
    const exponent = (this.h * this.f) / (this.kB * T);
    if (exponent > 100) return 0;          // effectively 0 at base temp
    return 1 / (Math.exp(exponent) - 1);
  }

  // Effective T1 degradation from thermal photons
  _thermalT1(t1Base) {
    const nth = this._thermalPhotons();
    const degradation = 1 / (1 + 2 * nth);
    return t1Base * degradation;
  }

  _bitFlipRate() {
    const nth = this._thermalPhotons();
    return Math.min(50, nth * 100 * 2.5);
  }

  _phaseFlipRate() {
    return Math.min(50, this._bitFlipRate() * 1.8);
  }

  _updateDisplay() {
    const T = this.temperatureMK;
    const topo = this.topologies[this.selectedTopology];
    const nth = this._thermalPhotons();
    const bf  = this._bitFlipRate();
    const pf  = this._phaseFlipRate();
    const t1eff = this._thermalT1(topo.t1Us);
    const fid = Math.max(0, 100 - bf * 0.8 - pf * 0.5);

    // Temperature display
    const tempEl = document.getElementById('cryo-temp-display');
    if (tempEl) {
      tempEl.textContent = T + ' mK';
      tempEl.style.color = T < 30 ? '#34d399' : T < 100 ? '#fbbf24' : '#f87171';
    }

    // Thermal photon number
    const nthEl = document.getElementById('cryo-nth-display');
    if (nthEl) nthEl.textContent = nth < 1e-6 ? '< 10^-6' : nth.toExponential(3);

    // Bit/Phase flip rates
    const bfEl = document.getElementById('cryo-bitflip-display');
    if (bfEl) bfEl.textContent = bf.toFixed(3) + '%';
    const pfEl = document.getElementById('cryo-phaseflip-display');
    if (pfEl) pfEl.textContent = pf.toFixed(3) + '%';

    // T1 effective
    const t1El = document.getElementById('cryo-t1eff-display');
    if (t1El) t1El.textContent = t1eff.toFixed(1) + ' us';

    // Fidelity estimate
    const fidEl = document.getElementById('cryo-fidelity-display');
    if (fidEl) {
      fidEl.textContent = fid.toFixed(1) + '%';
      fidEl.style.color = fid > 85 ? '#34d399' : fid > 60 ? '#fbbf24' : '#f87171';
    }

    // Status pill
    const statusEl = document.getElementById('cryo-status-pill');
    if (statusEl) {
      if (T <= 20) { statusEl.textContent = 'OPERATIONAL'; statusEl.className = 'cryo-status-pill status-operational'; }
      else if (T <= 80) { statusEl.textContent = 'DEGRADED'; statusEl.className = 'cryo-status-pill status-degraded'; }
      else if (T <= 200) { statusEl.textContent = 'NOISY'; statusEl.className = 'cryo-status-pill status-noisy'; }
      else { statusEl.textContent = 'CRITICAL'; statusEl.className = 'cryo-status-pill status-critical'; }
    }

    // Update cryostat thermal gradient visualization
    this._updateCryostatStages(T);

    // Update dynamic live histogram (ideal vs thermal)
    this._renderHistogram();

    // Update QPU architecture chip visualizer
    this._renderChipVisualizer();

    // Sync preset chip active states
    this._syncPresetChips();
  }

  _updateCryostatStages(T) {
    const stages = [
      { id: 'cryo-stage-300k',  temp: '300 K',   label: 'Room Temperature',    threshold: 300000 },
      { id: 'cryo-stage-4k',    temp: '4 K',     label: '4K Pulse Tube Stage', threshold: 4000 },
      { id: 'cryo-stage-800mk', temp: '800 mK',  label: 'Still Stage',         threshold: 800 },
      { id: 'cryo-stage-100mk', temp: '100 mK',  label: 'Cold Plate',          threshold: 100 },
      { id: 'cryo-stage-base',  temp: T + ' mK', label: 'Mixing Chamber (QPU)',threshold: T }
    ];

    stages.forEach(s => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const tempLabel = el.querySelector('.cryo-stage-temp');
      if (tempLabel && s.id === 'cryo-stage-base') tempLabel.textContent = s.temp;
    });

    // Animate the base stage glow based on temperature
    const baseStage = document.getElementById('cryo-stage-base');
    if (baseStage) {
      const glow = T < 20 ? '#34d399' : T < 80 ? '#fbbf24' : '#f87171';
      baseStage.style.setProperty('--stage-glow', glow);
      baseStage.style.boxShadow = 'inset 0 0 20px ' + glow + '22, 0 0 10px ' + glow + '33';
      baseStage.style.borderColor = glow + '66';
    }
  }

  _updateHistogramOverlay(bitFlipRate) {
    const overlay = document.getElementById('cryo-histogram-noise-overlay');
    if (!overlay) return;
    const noiseLevel = Math.min(1, bitFlipRate / 30);
    overlay.style.opacity = noiseLevel.toFixed(2);
    overlay.style.background =
      'repeating-linear-gradient(90deg, transparent 0%, rgba(248,113,113,' + (noiseLevel * 0.3).toFixed(2) + ') 1px, transparent 2px)';
  }

  _renderThermalNoise() {
    // Show visual noise injection hint
    const hint = document.getElementById('cryo-noise-hint');
    if (hint) {
      const T = this.temperatureMK;
      if (T > 30) {
        hint.style.display = 'flex';
        hint.textContent = 'WARNING: Thermal noise active at ' + T + ' mK. Click "Inject Noise" to apply to circuit.';
      } else {
        hint.style.display = 'none';
      }
    }
  }

  _injectNoiseIntoCircuit() {
    if (!this.engine || !this.circuitUI) return;
    const bf = this._bitFlipRate() / 100;
    const pf = this._phaseFlipRate() / 100;

    // Apply thermal noise to the engine state
    for (let i = 0; i < this.engine.numStates; i++) {
      if (Math.random() < bf) {
        // Bit-flip: swap amplitudes
        const partner = i ^ 1;
        if (partner < this.engine.numStates) {
          const tmp = this.engine.state[i];
          this.engine.state[i] = this.engine.state[partner];
          this.engine.state[partner] = tmp;
        }
      }
      if (Math.random() < pf) {
        // Phase-flip: negate imaginary part
        this.engine.state[i].im *= -1;
      }
    }

    // Trigger circuit UI refresh
    if (window.circuitUI && window.circuitUI.updateSimulation) {
      window.circuitUI.updateSimulation();
    }

    // Show confirmation
    const btn = document.getElementById('btn-cryo-inject');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Noise Injected!';
      btn.style.background = '#f87171';
      setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
    }
  }

  _renderCryostatSVG() {
    const container = document.getElementById('cryo-svg-container');
    if (!container) return;

    container.innerHTML = `
      <svg viewBox="0 0 280 420" width="100%" height="100%" style="max-height:420px">
        <!-- Outer vessel -->
        <rect x="20" y="10" width="240" height="400" rx="20" fill="rgba(15,23,42,0.8)" stroke="#334155" stroke-width="2"/>

        <!-- Stage 300K (Room temperature) -->
        <rect x="30" y="20" width="220" height="55" rx="12" id="cryo-stage-300k" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.3)" stroke-width="1.5"/>
        <text x="140" y="42" text-anchor="middle" fill="#f87171" font-size="11" font-weight="600">300 K — Room Temperature</text>
        <text x="140" y="58" text-anchor="middle" fill="#94a3b8" font-size="9.5">Electronics · Control Systems · Microwave Sources</text>

        <!-- Connecting tubes -->
        <rect x="126" y="74" width="28" height="14" rx="4" fill="rgba(100,116,139,0.4)" stroke="#475569" stroke-width="1"/>

        <!-- Stage 4K -->
        <rect x="40" y="88" width="200" height="52" rx="10" id="cryo-stage-4k" fill="rgba(251,191,36,0.07)" stroke="rgba(251,191,36,0.25)" stroke-width="1.5"/>
        <text x="140" y="110" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="600">4 K — Pulse Tube Cooler Stage</text>
        <text x="140" y="126" text-anchor="middle" fill="#94a3b8" font-size="9.5">HEMT Amplifiers · Low-noise Attenuators</text>

        <!-- Connecting tubes -->
        <rect x="126" y="139" width="28" height="14" rx="4" fill="rgba(100,116,139,0.4)" stroke="#475569" stroke-width="1"/>

        <!-- Stage 800mK -->
        <rect x="50" y="153" width="180" height="50" rx="10" id="cryo-stage-800mk" fill="rgba(167,139,250,0.07)" stroke="rgba(167,139,250,0.25)" stroke-width="1.5"/>
        <text x="140" y="174" text-anchor="middle" fill="#a78bfa" font-size="10.5" font-weight="600">800 mK — Still Stage</text>
        <text x="140" y="190" text-anchor="middle" fill="#94a3b8" font-size="9.5">He-3/He-4 Mixing · Impedance Transformers</text>

        <!-- Connecting tubes -->
        <rect x="126" y="202" width="28" height="14" rx="4" fill="rgba(100,116,139,0.4)" stroke="#475569" stroke-width="1"/>

        <!-- Stage 100mK -->
        <rect x="58" y="216" width="164" height="48" rx="10" id="cryo-stage-100mk" fill="rgba(96,165,250,0.07)" stroke="rgba(96,165,250,0.25)" stroke-width="1.5"/>
        <text x="140" y="237" text-anchor="middle" fill="#60a5fa" font-size="10.5" font-weight="600">100 mK — Cold Plate</text>
        <text x="140" y="252" text-anchor="middle" fill="#94a3b8" font-size="9.5">Josephson Parametric Amplifiers</text>

        <!-- Connecting tubes -->
        <rect x="126" y="263" width="28" height="14" rx="4" fill="rgba(100,116,139,0.4)" stroke="#475569" stroke-width="1"/>

        <!-- Base Stage: QPU -->
        <rect x="65" y="277" width="150" height="120" rx="14" id="cryo-stage-base" fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.35)" stroke-width="2" style="transition:all 0.4s ease"/>
        <text x="140" y="300" text-anchor="middle" fill="#34d399" font-size="10.5" font-weight="700">MIXING CHAMBER</text>
        <text x="140" y="316" text-anchor="middle" fill="#94a3b8" font-size="9" class="cryo-stage-temp">15 mK — QPU Stage</text>

        <!-- Qubit chip schematic -->
        <rect x="100" y="325" width="80" height="60" rx="8" fill="rgba(15,23,42,0.9)" stroke="#334155" stroke-width="1.5"/>
        <!-- Qubit dots on chip -->
        <circle cx="125" cy="345" r="5" fill="#34d399" opacity="0.9"/>
        <circle cx="155" cy="345" r="5" fill="#60a5fa" opacity="0.9"/>
        <circle cx="140" cy="360" r="5" fill="#a78bfa" opacity="0.9"/>
        <circle cx="125" cy="375" r="5" fill="#34d399" opacity="0.9"/>
        <circle cx="155" cy="375" r="5" fill="#60a5fa" opacity="0.9"/>
        <!-- Coupling lines -->
        <line x1="125" y1="345" x2="155" y2="345" stroke="#475569" stroke-width="1.5"/>
        <line x1="125" y1="345" x2="140" y2="360" stroke="#475569" stroke-width="1.5"/>
        <line x1="155" y1="345" x2="140" y2="360" stroke="#475569" stroke-width="1.5"/>
        <line x1="140" y1="360" x2="125" y2="375" stroke="#475569" stroke-width="1.5"/>
        <line x1="140" y1="360" x2="155" y2="375" stroke="#475569" stroke-width="1.5"/>

        <!-- NQM Badge -->
        <rect x="75" y="388" width="130" height="16" rx="6" fill="rgba(255,153,51,0.15)" stroke="rgba(255,153,51,0.3)" stroke-width="1"/>
        <text x="140" y="399" text-anchor="middle" fill="#ff9933" font-size="8.5" font-weight="600">INDIA - NQM SOVEREIGN QPU</text>
      </svg>`;
  }

  _renderTopologyCards() {
    const container = document.getElementById('cryo-topo-cards');
    if (!container) return;
    container.innerHTML = Object.entries(this.topologies).map(([key, topo]) => {
      const isSelected = key === this.selectedTopology;
      return `<div class="cryo-topo-card ${isSelected ? 'cryo-topo-selected' : ''}" data-topo="${key}" onclick="window.cryoTwin && window.cryoTwin._selectTopology('${key}')">
        <div class="cryo-topo-header">
          <div class="cryo-topo-dot" style="background:${topo.color}"></div>
          <span class="cryo-topo-name">${topo.name}</span>
          ${isSelected ? '<span class="cryo-topo-badge">ACTIVE</span>' : ''}
        </div>
        <div class="cryo-topo-specs">
          <div class="cryo-spec-row"><span>Qubits</span><span>${topo.qubits}</span></div>
          <div class="cryo-spec-row"><span>T1 (base)</span><span>${topo.t1Us} us</span></div>
          <div class="cryo-spec-row"><span>T2 (base)</span><span>${topo.t2Us} us</span></div>
          <div class="cryo-spec-row"><span>2Q Gate Error</span><span>${topo.gateError}%</span></div>
          <div class="cryo-spec-row"><span>Coupling</span><span>${topo.coupling}</span></div>
        </div>
        <div class="cryo-topo-source">Source: ${topo.source}</div>
      </div>`;
    }).join('');
  }

  _selectTopology(key) {
    this.selectedTopology = key;
    const sel = document.getElementById('cryo-topology-select');
    if (sel) sel.value = key;
    this._renderTopologyCards();
    this._updateDisplay();
  }

  setTemp(mK) {
    this.temperatureMK = mK;
    const sl = document.getElementById('cryo-temp-slider');
    if (sl) sl.value = mK;
    this._updateDisplay();
    this._renderThermalNoise();
  }

  _syncPresetChips() {
    const T = this.temperatureMK;
    const presets = [15, 45, 120, 300];
    presets.forEach(p => {
      const btn = document.getElementById('cpreset-' + p);
      if (btn) {
        btn.classList.toggle('active', Math.abs(T - p) < 5);
      }
    });
  }

  _renderHistogram() {
    const container = document.getElementById('cryo-hist-container');
    if (!container || !this.engine) return;

    const probs = this.engine.getProbabilities();
    const nth = this._thermalPhotons();
    // Thermal leakage factor (0 at 15mK, up to 0.75 at 300mK)
    const thermalEpsilon = Math.min(0.85, nth * 3.5);

    const N = probs.length || 8;
    const uniformThermal = 1 / N;

    // Build thermal noisy distribution
    const noisyProbs = probs.map(p => {
      const noisyP = (1 - thermalEpsilon) * p.probability + thermalEpsilon * uniformThermal;
      return {
        state: p.state,
        idealProb: p.probability,
        noisyProb: noisyP
      };
    });

    container.innerHTML = `
      <div class="cryo-hist-legend">
        <span class="hist-legend-item"><span class="hleg-dot hleg-ideal"></span>Ideal Pure |ψ⟩ (0 mK)</span>
        <span class="hist-legend-item"><span class="hleg-dot hleg-thermal"></span>Thermal Noisy (${this.temperatureMK} mK)</span>
      </div>
      <div class="cryo-hist-bars-wrapper">
        ${noisyProbs.map(item => {
          const idealH = Math.round(item.idealProb * 100);
          const noisyH = Math.round(item.noisyProb * 100);
          const stateLabel = item.state.replace(/[|⟩]/g, '');
          return `
            <div class="cryo-hist-col" title="|${stateLabel}⟩: Ideal ${(item.idealProb*100).toFixed(1)}% | Thermal ${(item.noisyProb*100).toFixed(1)}%">
              <div class="cryo-dual-bars">
                <div class="cbar cbar-ideal" style="height:${Math.max(4, idealH)}%"></div>
                <div class="cbar cbar-thermal" style="height:${Math.max(4, noisyH)}%"></div>
              </div>
              <span class="cryo-cbar-label">|${stateLabel}⟩</span>
              <span class="cryo-cbar-pct">${(item.noisyProb * 100).toFixed(0)}%</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _renderChipVisualizer() {
    const container = document.getElementById('cryo-chip-diagram');
    if (!container) return;

    const T = this.temperatureMK;
    const heatColor = T < 30 ? '#34d399' : T < 100 ? '#fbbf24' : '#f87171';

    if (this.selectedTopology === 'nqm8') {
      container.innerHTML = `
        <div class="cryo-chip-title">Topology Architecture: NQM 8-Qubit Star</div>
        <svg viewBox="0 0 240 180" width="100%" height="150">
          <circle cx="120" cy="90" r="18" fill="rgba(255,153,51,0.18)" stroke="#ff9933" stroke-width="2"/>
          <text x="120" y="94" text-anchor="middle" fill="#ff9933" font-size="9" font-weight="700">RESONATOR</text>
          ${[0,1,2,3,4,5,6].map(i => {
            const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
            const x = 120 + 72 * Math.cos(angle);
            const y = 90 + 62 * Math.sin(angle);
            return `
              <line x1="120" y1="90" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#475569" stroke-width="1.8" stroke-dasharray="3 2"/>
              <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="rgba(15,23,42,0.95)" stroke="${heatColor}" stroke-width="2"/>
              <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" fill="${heatColor}" font-size="8.5" font-weight="700">q${i+1}</text>
            `;
          }).join('')}
        </svg>
        <div class="cryo-chip-desc">7 satellite transmons coupled via central niobium bus (RRI / IISc 2024).</div>
      `;
    } else if (this.selectedTopology === 'ibmheavyhex') {
      container.innerHTML = `
        <div class="cryo-chip-title">Topology Architecture: IBM Heavy-Hex Lattice</div>
        <svg viewBox="0 0 240 150" width="100%" height="150">
          <polygon points="120,20 185,55 185,115 120,140 55,115 55,55" fill="none" stroke="#0f62fe" stroke-width="2"/>
          <circle cx="120" cy="80" r="10" fill="rgba(15,98,254,0.2)" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="120" cy="20" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="185" cy="55" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="185" cy="115" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="120" cy="140" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="55" cy="115" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
          <circle cx="55" cy="55" r="8" fill="#0f172a" stroke="${heatColor}" stroke-width="2"/>
        </svg>
        <div class="cryo-chip-desc">Heavy-hexagonal sparsity suppresses frequency collision and crosstalk.</div>
      `;
    } else {
      container.innerHTML = `
        <div class="cryo-chip-title">Topology Architecture: Google Sycamore 5x5 Grid</div>
        <svg viewBox="0 0 240 150" width="100%" height="150">
          ${[0,1,2,3,4].map(r => [0,1,2,3,4].map(c => `
            <circle cx="${32 + c*44}" cy="${18 + r*28}" r="6" fill="#0f172a" stroke="${heatColor}" stroke-width="1.5"/>
          `).join('')).join('')}
        </svg>
        <div class="cryo-chip-desc">Planar 2D square lattice with tunable capacitive transmon couplers.</div>
      `;
    }
  }

  _startThermalAnimation() {
    const animate = () => {
      this.thermalPulsePhase += 0.04;
      const baseStage = document.getElementById('cryo-stage-base');
      if (baseStage && this.temperatureMK > 30) {
        const intensity = Math.sin(this.thermalPulsePhase) * 0.5 + 0.5;
        const T = this.temperatureMK;
        const glow = T < 80 ? '#fbbf24' : '#f87171';
        baseStage.style.boxShadow = 'inset 0 0 ' + (15 + intensity * 20).toFixed(0) + 'px ' + glow + '22';
      }
      this.animFrame = requestAnimationFrame(animate);
    };
    animate();
  }
}

window.CryostatTwin = CryostatTwin;
