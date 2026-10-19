/**
 * Ananta - Microwave Pulse Physics & Cryogenic Noise Studio
 * Superconducting qubit Hamiltonian pulse synthesizer, DRAG pulse shaping,
 * Live 60-FPS Rabi oscillations, Ramsey dephasing fringes, and Hahn spin echo refocusing.
 */

class MicrowavePulseStudio {
  constructor() {
    this.pulseShape = 'drag'; // 'gaussian', 'drag', 'square', 'cosine'
    this.amplitude = 25.0; // MHz (Rabi drive frequency)
    this.duration = 40.0; // ns (Gate length)
    this.detuning = 0.0; // MHz (Delta = w_d - w_0)
    this.phase = 0.0; // Radians
    this.dragBeta = 0.5; // DRAG derivative scaling
    this.T1 = 65.0; // microseconds (Relaxation)
    this.T2Star = 35.0; // microseconds (Dephasing)
    this.fridgeTemp = 15.0; // mK (Dilution fridge temperature)
    this.activeExperiment = 'rabi'; // 'rabi', 'ramsey', 'hahn_echo'

    this.animFrameId = null;
    this.simTime = 0;

    this.initElements();
    this.attachEvents();
    this.startRenderLoop();
  }

  initElements() {
    this.pulseCanvas = document.getElementById('pulse-waveform-canvas');
    this.dynamicsCanvas = document.getElementById('pulse-dynamics-canvas');
    this.pulseShapeSelect = document.getElementById('pulse-shape-select');
    this.ampSlider = document.getElementById('pulse-amp-slider');
    this.ampValEl = document.getElementById('pulse-amp-val');
    this.durSlider = document.getElementById('pulse-dur-slider');
    this.durValEl = document.getElementById('pulse-dur-val');
    this.detuningSlider = document.getElementById('pulse-detuning-slider');
    this.detuningValEl = document.getElementById('pulse-detuning-val');
    this.t1Slider = document.getElementById('pulse-t1-slider');
    this.t1ValEl = document.getElementById('pulse-t1-val');
    this.t2Slider = document.getElementById('pulse-t2-slider');
    this.t2ValEl = document.getElementById('pulse-t2-val');
    this.rabiFreqEl = document.getElementById('pulse-rabi-freq-badge');
    this.stateP1El = document.getElementById('pulse-state-p1-badge');
  }

  // Compute envelope value Omega(t) for a given normalized time t in [0, duration].
  // duration/amplitude default to the instance's Rabi-tab settings, but callers
  // building a multi-pulse sequence (Ramsey/Hahn) pass a specific segment's own values.
  getEnvelope(t, duration = this.duration, amplitude = this.amplitude) {
    const tg = duration;
    if (t < 0 || t > tg) return { I: 0, Q: 0 };

    let iEnv = 0;
    let qEnv = 0;
    const A = amplitude;

    if (this.pulseShape === 'gaussian') {
      const sigma = tg / 4.0;
      const center = tg / 2.0;
      iEnv = A * Math.exp(-Math.pow(t - center, 2) / (2 * sigma * sigma));
    } else if (this.pulseShape === 'drag') {
      const sigma = tg / 4.0;
      const center = tg / 2.0;
      const gaussian = A * Math.exp(-Math.pow(t - center, 2) / (2 * sigma * sigma));
      const derivative = -((t - center) / (sigma * sigma)) * gaussian;
      iEnv = gaussian;
      qEnv = -this.dragBeta * derivative * 0.15; // DRAG Q-quadrature correction
    } else if (this.pulseShape === 'square') {
      iEnv = A;
    } else if (this.pulseShape === 'cosine') {
      iEnv = A * 0.5 * (1 - Math.cos((2 * Math.PI * t) / tg));
    }

    return { I: iEnv, Q: qEnv };
  }

  // Idealized pulse duration (ns) to sweep the given rotation angle at the
  // current drive amplitude: t = angle / Omega_rad_per_ns.
  getIdealPulseDuration(angleFraction) {
    const omegaRadPerNs = (this.amplitude * 2 * Math.PI) / 1000; // MHz -> rad/ns
    const targetAngle = angleFraction * Math.PI;
    return Math.max(2, targetAngle / Math.max(0.001, omegaRadPerNs));
  }

  // Build the actual pulse-sequence layout (segments + free-evolution gaps)
  // for the active experiment, so the waveform panel reflects what's
  // selected instead of always showing a single bare Rabi drive pulse.
  // Gaps are schematic (real free-evolution time is microsecond-scale,
  // 1000x the nanosecond-scale pulses, so a literal shared axis would
  // render the pulses as invisible slivers) but pulse widths are real,
  // amplitude-derived pi/2 and pi rotation times.
  getPulseSequence() {
    if (this.activeExperiment === 'ramsey') {
      const tPiHalf = this.getIdealPulseDuration(0.5);
      const gap = Math.max(18, tPiHalf * 4);
      return {
        segments: [
          { start: 0, duration: tPiHalf, amplitude: this.amplitude, label: 'π/2' },
          { start: tPiHalf + gap, duration: tPiHalf, amplitude: this.amplitude, label: 'π/2' }
        ],
        gaps: [{ start: tPiHalf, duration: gap, label: 'free evolution (τ)' }],
        total: tPiHalf * 2 + gap
      };
    }

    if (this.activeExperiment === 'hahn_echo') {
      const tPiHalf = this.getIdealPulseDuration(0.5);
      const tPi = this.getIdealPulseDuration(1.0);
      const gap = Math.max(18, tPiHalf * 4);
      return {
        segments: [
          { start: 0, duration: tPiHalf, amplitude: this.amplitude, label: 'π/2' },
          { start: tPiHalf + gap, duration: tPi, amplitude: this.amplitude, label: 'π' },
          { start: tPiHalf + gap + tPi + gap, duration: tPiHalf, amplitude: this.amplitude, label: 'π/2' }
        ],
        gaps: [
          { start: tPiHalf, duration: gap, label: 'τ' },
          { start: tPiHalf + gap + tPi, duration: gap, label: 'τ' }
        ],
        total: tPiHalf * 2 + tPi + gap * 2
      };
    }

    // Rabi: a single continuous drive pulse
    return {
      segments: [{ start: 0, duration: this.duration, amplitude: this.amplitude, label: null }],
      gaps: [],
      total: this.duration
    };
  }

  // Draw Pulse Envelope & Waveform Quadratures (I & Q channels)
  drawWaveform() {
    if (!this.pulseCanvas) return;
    const canvas = this.pulseCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth || 520;
    const h = canvas.height = 180;

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const midY = pad.top + plotH / 2;

    // Grid & Zero-line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, midY);
    ctx.lineTo(w - pad.right, midY);
    ctx.stroke();

    const seq = this.getPulseSequence();
    const totalT = Math.max(1, seq.total);
    const maxAmp = Math.max(30, this.amplitude * 1.3);
    const xAt = (t) => pad.left + (t / totalT) * plotW;

    // Free-evolution gap zones (Ramsey/Hahn echo), drawn behind the pulses
    for (const gap of seq.gaps) {
      const gx0 = xAt(gap.start);
      const gx1 = xAt(gap.start + gap.duration);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.setLineDash([3, 3]);
      ctx.fillRect(gx0, pad.top, gx1 - gx0, plotH);
      ctx.strokeRect(gx0, pad.top, gx1 - gx0, plotH);
      ctx.setLineDash([]);
      ctx.fillStyle = '#80868b';
      ctx.font = '9px Roboto Mono';
      ctx.textAlign = 'center';
      ctx.fillText(gap.label, (gx0 + gx1) / 2, pad.top + plotH / 2 + 3);
    }
    ctx.textAlign = 'left';

    // Draw each pulse segment's I (and Q for DRAG) envelope at its own time offset
    for (const seg of seq.segments) {
      const steps = Math.max(20, Math.round((seg.duration / totalT) * 200));

      ctx.beginPath();
      ctx.strokeStyle = '#8ab4f8';
      ctx.lineWidth = 2.2;
      for (let i = 0; i <= steps; i++) {
        const tLocal = (i / steps) * seg.duration;
        const env = this.getEnvelope(tLocal, seg.duration, seg.amplitude);
        const x = xAt(seg.start + tLocal);
        const y = midY - (env.I / maxAmp) * (plotH / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (this.pulseShape === 'drag') {
        ctx.beginPath();
        ctx.strokeStyle = '#d367c4';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        for (let i = 0; i <= steps; i++) {
          const tLocal = (i / steps) * seg.duration;
          const env = this.getEnvelope(tLocal, seg.duration, seg.amplitude);
          const x = xAt(seg.start + tLocal);
          const y = midY - (env.Q / maxAmp) * (plotH / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (seg.label) {
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '10px Roboto Mono';
        ctx.textAlign = 'center';
        ctx.fillText(seg.label, xAt(seg.start + seg.duration / 2), pad.top - 6);
        ctx.textAlign = 'left';
      }
    }

    // Ticks & Labels
    ctx.fillStyle = '#80868b';
    ctx.font = '10px Roboto Mono';
    ctx.fillText('0 ns', pad.left, h - 10);
    ctx.fillText(`${totalT.toFixed(0)} ns`, w - pad.right - 30, h - 10);
    ctx.fillText(`+${this.amplitude.toFixed(0)} MHz`, 8, pad.top + 10);
    ctx.fillText(`-${this.amplitude.toFixed(0)} MHz`, 8, h - pad.bottom);
  }

  // Draw Live 60-FPS Quantum Dynamics (Rabi, Ramsey, or Hahn Echo)
  drawDynamics() {
    if (!this.dynamicsCanvas) return;
    const canvas = this.dynamicsCanvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth || 520;
    const h = canvas.height = 200;

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 25, right: 25, bottom: 35, left: 55 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      const p = (1.0 - (i / 4)).toFixed(2);
      ctx.fillStyle = '#80868b';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'right';
      ctx.fillText(p, pad.left - 6, y + 4);
    }

    const steps = 140;

    if (this.activeExperiment === 'rabi') {
      const generalizedRabi = Math.sqrt(Math.pow(this.amplitude, 2) + Math.pow(this.detuning, 2));
      if (this.rabiFreqEl) this.rabiFreqEl.textContent = `Ω_R = ${generalizedRabi.toFixed(1)} MHz`;

      // Rabi Oscillations: P(|1>) = (Omega / Omega_R)^2 * sin^2(Omega_R * t / 2) * exp(-t / T1)
      ctx.beginPath();
      ctx.strokeStyle = '#81c995';
      ctx.lineWidth = 2.4;

      const maxT = 120.0; // ns
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * maxT;
        const omegaRRad = (generalizedRabi * 2 * Math.PI) / 1000; // to rad/ns
        const rabiFraction = Math.pow(this.amplitude / Math.max(0.01, generalizedRabi), 2);
        const decay = Math.exp(-t / (this.T1 * 1000));
        const p1 = rabiFraction * Math.pow(Math.sin((omegaRRad * t) / 2), 2) * decay;

        const x = pad.left + (i / steps) * plotW;
        const y = pad.top + (1.0 - p1) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current pulse duration marker
      const curT = Math.min(this.duration, maxT);
      const curX = pad.left + (curT / maxT) * plotW;
      const omegaRRad = (generalizedRabi * 2 * Math.PI) / 1000;
      const rabiFraction = Math.pow(this.amplitude / Math.max(0.01, generalizedRabi), 2);
      const curP1 = rabiFraction * Math.pow(Math.sin((omegaRRad * curT) / 2), 2) * Math.exp(-curT / (this.T1 * 1000));

      if (this.stateP1El) this.stateP1El.textContent = `P(|1⟩) = ${(curP1 * 100).toFixed(1)}%`;

      ctx.beginPath();
      ctx.arc(curX, pad.top + (1.0 - curP1) * plotH, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#81c995';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();

    } else if (this.activeExperiment === 'ramsey') {
      // Ramsey Fringes: P(|1>) = 0.5 * (1 + cos(Delta * tau) * exp(-tau / T2*))
      // T2* is physically capped at 2*T1 — relaxation alone destroys coherence,
      // so a T2* slider value above that ceiling is unphysical and gets clamped.
      const effectiveT2Star = Math.min(this.T2Star, 2 * this.T1);
      if (this.rabiFreqEl) this.rabiFreqEl.textContent = `Δ = ${this.detuning.toFixed(1)} MHz`;
      if (this.stateP1El) this.stateP1El.textContent = `T₂* (eff) = ${effectiveT2Star.toFixed(1)} µs`;

      ctx.beginPath();
      ctx.strokeStyle = '#fdd663';
      ctx.lineWidth = 2.4;

      const maxTau = 80.0; // microseconds
      for (let i = 0; i <= steps; i++) {
        const tau = (i / steps) * maxTau;
        const detuningRad = this.detuning * 2 * Math.PI; // MHz to rad/us
        const decay = Math.exp(-tau / Math.max(0.01, effectiveT2Star));
        const p1 = 0.5 * (1.0 + Math.cos(detuningRad * tau) * decay);

        const x = pad.left + (i / steps) * plotW;
        const y = pad.top + (1.0 - p1) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

    } else if (this.activeExperiment === 'hahn_echo') {
      // Hahn Spin Echo: the refocusing pi-pulse cancels static/quasi-static
      // dephasing (hence no dependence on `detuning`), leaving a slower
      // echo-limited T2 that is itself capped at 2*T1.
      const t2Echo = Math.min(this.T2Star * 1.8, 2 * this.T1);
      if (this.rabiFreqEl) this.rabiFreqEl.textContent = `T₂ (echo) = ${t2Echo.toFixed(1)} µs`;
      if (this.stateP1El) this.stateP1El.textContent = `T₁ limit = ${(2 * this.T1).toFixed(1)} µs`;

      ctx.beginPath();
      ctx.strokeStyle = '#d367c4';
      ctx.lineWidth = 2.4;

      const maxTau = 80.0;
      for (let i = 0; i <= steps; i++) {
        const tau = (i / steps) * maxTau;
        const decay = Math.exp(-Math.pow(tau / Math.max(0.01, t2Echo), 2));
        const p1 = 0.5 * (1.0 + decay);

        const x = pad.left + (i / steps) * plotW;
        const y = pad.top + (1.0 - p1) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  startRenderLoop() {
    const loop = () => {
      this.drawWaveform();
      this.drawDynamics();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  attachEvents() {
    if (this.pulseShapeSelect) {
      this.pulseShapeSelect.onchange = (e) => {
        this.pulseShape = e.target.value;
      };
    }

    if (this.ampSlider) {
      this.ampSlider.oninput = (e) => {
        this.amplitude = parseFloat(e.target.value);
        if (this.ampValEl) this.ampValEl.textContent = `${this.amplitude.toFixed(1)} MHz`;
      };
    }

    if (this.durSlider) {
      this.durSlider.oninput = (e) => {
        this.duration = parseFloat(e.target.value);
        if (this.durValEl) this.durValEl.textContent = `${this.duration.toFixed(0)} ns`;
      };
    }

    if (this.detuningSlider) {
      this.detuningSlider.oninput = (e) => {
        this.detuning = parseFloat(e.target.value);
        if (this.detuningValEl) this.detuningValEl.textContent = `${this.detuning.toFixed(1)} MHz`;
      };
    }

    if (this.t1Slider) {
      this.t1Slider.oninput = (e) => {
        this.T1 = parseFloat(e.target.value);
        if (this.t1ValEl) this.t1ValEl.textContent = `${this.T1.toFixed(0)} µs`;
      };
    }

    if (this.t2Slider) {
      this.t2Slider.oninput = (e) => {
        this.T2Star = parseFloat(e.target.value);
        if (this.t2ValEl) this.t2ValEl.textContent = `${this.T2Star.toFixed(0)} µs`;
      };
    }

    const btnRabi = document.getElementById('btn-exp-rabi');
    const btnRamsey = document.getElementById('btn-exp-ramsey');
    const btnHahn = document.getElementById('btn-exp-hahn');

    if (btnRabi) {
      btnRabi.onclick = () => {
        this.activeExperiment = 'rabi';
        btnRabi.classList.add('active');
        btnRamsey && btnRamsey.classList.remove('active');
        btnHahn && btnHahn.classList.remove('active');
      };
    }

    if (btnRamsey) {
      btnRamsey.onclick = () => {
        this.activeExperiment = 'ramsey';
        btnRamsey.classList.add('active');
        btnRabi && btnRabi.classList.remove('active');
        btnHahn && btnHahn.classList.remove('active');
      };
    }

    if (btnHahn) {
      btnHahn.onclick = () => {
        this.activeExperiment = 'hahn_echo';
        btnHahn.classList.add('active');
        btnRabi && btnRabi.classList.remove('active');
        btnRamsey && btnRamsey.classList.remove('active');
      };
    }
  }
}

window.MicrowavePulseStudio = MicrowavePulseStudio;
