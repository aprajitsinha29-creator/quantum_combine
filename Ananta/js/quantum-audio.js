/**
 * Quantum Harmony Audio Synthesizer (Web Audio API)
 * Converts quantum statevector amplitudes and phases into harmonious soundscapes.
 * Constructive interference produces consonant chords; entangled Bell states produce pure harmonics.
 */

class QuantumAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = false;
    this.activeNodes = [];

    // Frequencies for the 8 basis states mapped to peaceful Pentatonic C Major scale (C4 to E5)
    this.stateFreqs = [
      261.63, // |000⟩: C4
      293.66, // |001⟩: D4
      329.63, // |010⟩: E4
      392.00, // |011⟩: G4
      440.00, // |100⟩: A4
      523.25, // |101⟩: C5
      587.33, // |110⟩: D5
      659.25  // |111⟩: E5
    ];
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleAudio() {
    this.ensureContext();
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  // Play harmonic chord of current quantum statevector
  playStatevectorChord(probs, duration = 0.6) {
    if (!this.isEnabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    // Filter states with non-zero probability
    const activeStates = probs.filter(p => p.probability > 0.01);
    if (activeStates.length === 0) return;

    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(this.audioCtx.destination);

    activeStates.forEach(p => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Sine wave with slight warm harmonics
      osc.type = 'sine';
      const baseFreq = this.stateFreqs[p.index] || 440;
      // Detune slightly by quantum phase angle (-180° to +180°)
      const phaseDetune = (p.phase / Math.PI) * 15; // +/- 15 cents
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.detune.setValueAtTime(phaseDetune, now);

      // Volume proportional to probability amplitude sqrt(P)
      const amp = Math.sqrt(p.probability);
      gain.gain.setValueAtTime(amp, now);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // Play measurement collapse sound (sharp trigger followed by isolated frequency)
  playMeasurementClick(measuredState) {
    if (!this.isEnabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    // Find state index
    const bitStr = measuredState.replace(/[|⟩]/g, '');
    const idx = parseInt(bitStr, 2) || 0;
    const freq = this.stateFreqs[idx] || 440;

    // Crisp high-frequency detector burst
    const noiseBuffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.04, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1500, now);

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    whiteNoise.start(now);

    // Collapsed single tone (pure sine bell)
    const bellOsc = this.audioCtx.createOscillator();
    const bellGain = this.audioCtx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(freq, now + 0.03);

    bellGain.gain.setValueAtTime(0.001, now);
    bellGain.gain.linearRampToValueAtTime(0.3, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    bellOsc.connect(bellGain);
    bellGain.connect(this.audioCtx.destination);
    bellOsc.start(now + 0.03);
    bellOsc.stop(now + 0.85);
  }

  // Play subtle step tick when navigating Time Machine
  playStepTick() {
    if (!this.isEnabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

window.QuantumAudioSynthesizer = QuantumAudioSynthesizer;
