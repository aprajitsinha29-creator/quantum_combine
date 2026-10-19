/**
 * Ananta Quantum Studio — Universal AI Voice Quantum Copilot
 *
 * Features:
 *  - Immediate zero-latency startup on user click gesture.
 *  - Automatic switch to Composer tab (window.switchTab('simulator')) so the circuit
 *    diagram is always directly visible when asked to build.
 *  - Web Audio API instant audio feedback chimes (ascending dual-sine synth).
 *  - Intelligent interim speech debounce (650ms silence timeout) so Chrome doesn't
 *    hang waiting for isFinal flags.
 *  - Universal Generative Quantum Circuit AI: Synthesizes arbitrary circuits,
 *    multi-step compound instructions ("H on 0, then X on 1, then CNOT 0 to 1"),
 *    and over 25+ quantum algorithms and error-correction protocols.
 *  - Single-letter gate matching: handles "h on 0", "x on 1", "z on 2", "cnot 0 to 1".
 *  - Automatic fresh start when user asks to "make a circuit with...".
 *  - CNOT connector redraw to ensure the vertical lines (• <--> ⊕) render with proper layout.
 *  - Chrome-safe TTS speech synthesis with window.speechSynthesis.resume().
 *  - Animated audio waveform visualizer while listening.
 *  - Text command fallback input and 1-click test chips.
 */

class QuantumVoiceCopilot {
  constructor() {
    this.isActive = false;
    this.isListening = false;
    this.speechSynthesisEnabled = true;
    this.recognition = null;
    this.waveAnimId = null;
    this.wavePhase = 0;
    this.speechDebounceTimer = null;
    this.audioCtx = null;
    // Rolling dialogue memory so follow-ups ("do that again", "why?", "undo it")
    // resolve against what was actually said and built earlier in the session.
    this.conversationHistory = [];

    // Multi-Provider AI Configuration (Grok-2, Gemini 2.5 Flash, Local Quantum AI)
    this.selectedProvider = localStorage.getItem('ananta_ai_provider') || 'auto';
    this.grokKey = localStorage.getItem('ananta_grok_key') || '';
    this.geminiKey = localStorage.getItem('ananta_gemini_key') || '';

    this._bindEvents();
  }

  _bindEvents() {
    window.quantumVoiceCopilot = this;

    // Voices load asynchronously; pin one as soon as they arrive so every reply
    // in the session speaks with the same voice.
    if (window.speechSynthesis) {
      this._resolveVoice();
      window.speechSynthesis.addEventListener('voiceschanged', () => this._resolveVoice());
    }

    // Keep the most recent runtime failure so the user can just ask "why did
    // that fail?" and get it explained against the live circuit.
    window.addEventListener('error', (e) => {
      this._lastRuntimeError = `${e.message}${e.filename ? ` (${e.filename}:${e.lineno})` : ''}`;
    });
    window.addEventListener('unhandledrejection', (e) => {
      this._lastRuntimeError = `Unhandled promise rejection: ${e.reason && e.reason.message ? e.reason.message : e.reason}`;
    });

    setTimeout(() => {
      this._updateBadge(this.selectedProvider === 'grok' ? 'grok-2' : (this.selectedProvider === 'gemini' ? 'gemini-2.5-flash' : 'deterministic-quantum-ai'));
    }, 500);
  }

  toggleSettingsPanel() {
    const panel = document.getElementById('copilot-settings-panel');
    if (!panel) return;
    const isShowing = panel.style.display === 'flex';
    panel.style.display = isShowing ? 'none' : 'flex';
    if (!isShowing) {
      const sel = document.getElementById('copilot-provider-select');
      if (sel) sel.value = this.selectedProvider;
      const grokIn = document.getElementById('copilot-grok-key-input');
      if (grokIn) grokIn.value = this.grokKey;
      const geminiIn = document.getElementById('copilot-gemini-key-input');
      if (geminiIn) geminiIn.value = this.geminiKey;
    }
  }

  setProvider(provider) {
    this.selectedProvider = provider || 'auto';
    localStorage.setItem('ananta_ai_provider', this.selectedProvider);
    this._updateBadge(this.selectedProvider === 'grok' ? 'grok-2' : (this.selectedProvider === 'gemini' ? 'gemini-2.5-flash' : 'deterministic-quantum-ai'));
    this._setActionFeedback(`Active AI provider set to: ${this.selectedProvider.toUpperCase()}`, true);
  }

  saveKeys() {
    const grokIn = document.getElementById('copilot-grok-key-input');
    const geminiIn = document.getElementById('copilot-gemini-key-input');
    const sel = document.getElementById('copilot-provider-select');

    if (grokIn) {
      this.grokKey = (grokIn.value || '').trim();
      localStorage.setItem('ananta_grok_key', this.grokKey);
    }
    if (geminiIn) {
      this.geminiKey = (geminiIn.value || '').trim();
      localStorage.setItem('ananta_gemini_key', this.geminiKey);
    }
    if (sel) {
      this.selectedProvider = sel.value || 'auto';
      localStorage.setItem('ananta_ai_provider', this.selectedProvider);
    }

    this._setActionFeedback('Saved AI settings & API keys to browser storage!', true);
    this.toggleSettingsPanel();
    this.testConnection();
  }

  async testConnection() {
    this._setActionFeedback('Pinging AI engine...', true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-AI-Provider': this.selectedProvider
      };
      if (this.grokKey) headers['X-Grok-Key'] = this.grokKey;
      if (this.geminiKey) headers['X-Gemini-Key'] = this.geminiKey;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: 'provider-info',
          payload: { grokApiKey: this.grokKey, geminiApiKey: this.geminiKey }
        })
      });
      if (res.ok) {
        const info = await res.json();
        const active = info.activeProvider || (info.providers?.grok?.available ? 'grok-2' : 'gemini-2.5-flash');
        this._updateBadge(active);
        const grokMsg = info.providers?.grok?.available ? 'Grok-2 (Connected 🟢)' : 'Grok-2 (No Key)';
        const gemMsg = info.providers?.gemini?.available ? 'Gemini 2.5 (Ready 🟢)' : 'Gemini (Quota)';
        this._setActionFeedback(`AI Ping: ${grokMsg} | ${gemMsg}`, true);
        this._playChime('success');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      this._setActionFeedback(`AI Ping: ${e.message} (Using local quantum fallback)`, false);
    }
  }

  _updateBadge(source) {
    const badge = document.getElementById('copilot-status-badge');
    if (!badge) return;
    badge.className = 'ai-status-badge';
    if (source && source.includes('grok')) {
      badge.classList.add('grok-active');
      badge.textContent = '🤖 Grok-2 LIVE';
      badge.title = 'Powered by xAI Grok-2 Neural Reasoner';
    } else if (source && source.includes('gemini')) {
      badge.classList.add('gemini-active');
      badge.textContent = '✨ Gemini 2.5';
      badge.title = 'Powered by Google AI Studio Gemini 2.5 Flash';
    } else {
      badge.classList.add('fallback');
      badge.textContent = '⚡ Quantum Engine';
      badge.title = 'Powered by Built-in Deterministic Quantum NLP Engine';
    }
  }

  toggle() {
    if (this.isActive) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    // 1. Switch to Composer tab so circuit canvas is visible immediately!
    if (window.switchTab) {
      window.switchTab('simulator');
    }

    const hud = document.getElementById('quantum-copilot-hud');
    if (!hud) return;

    this.isActive = true;
    hud.style.display = 'flex';
    hud.classList.add('copilot-hud-active');

    // Update trigger button active state in Composer
    const btn = document.getElementById('btn-voice-camera');
    if (btn) btn.classList.add('active');

    // Play pleasant startup tone
    this._playChime('start');

    // 2. Immediately start Speech Recognition synchronously within the user click gesture!
    this.startListening();

    // 3. Speak greeting immediately
    this._setSubtitle('Listening! Say e.g. "Add H on 0", "Make GHZ", "CNOT 0 to 1", or "Make Bell state"');
    this._speak('Quantum Voice Copilot ready. What circuit shall I build?');

    // 4. Start the audio waveform visualizer
    this._startWaveAnimation();

    // 5. Warm the phonetic vocabulary so mispronunciations resolve locally
    this.loadVoiceVocabulary();
  }

  close() {
    this.isActive = false;
    const hud = document.getElementById('quantum-copilot-hud');
    if (hud) {
      hud.style.display = 'none';
      hud.classList.remove('copilot-hud-active');
    }

    const btn = document.getElementById('btn-voice-camera');
    if (btn) btn.classList.remove('active');

    this._cancelWaveAnimation();
    this.stopListening();
  }

  _playChime(type = 'success') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'success') {
        // Sci-Fi ascending 2-tone chime: E5 (659Hz) -> A5 (880Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.14);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'start') {
        // Welcome chime: C5 (523Hz) -> G5 (784Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'prompt') {
        // "Your turn" prompt ping: F5 (698Hz) -> C6 (1046Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(698.46, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'heard') {
        // Subtle acknowledgment blip: G5 (784Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(783.99, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'warn') {
        // Polite descending double tone: D5 (587Hz) -> G4 (392Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.18);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    } catch (e) {}
  }

  _startWaveAnimation() {
    this._cancelWaveAnimation();
    const canvas = document.getElementById('copilot-wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      this.wavePhase += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const waves = [
        { color: 'rgba(59, 130, 246, 0.5)', freq: 0.02, speed: 1.2, amp: 22 },
        { color: 'rgba(168, 85, 247, 0.6)', freq: 0.03, speed: 1.8, amp: 18 },
        { color: 'rgba(16, 185, 129, 0.7)', freq: 0.04, speed: 2.2, amp: 14 }
      ];

      waves.forEach(w => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;
        const cy = canvas.height / 2;
        for (let x = 0; x < canvas.width; x++) {
          const y = cy + Math.sin(x * w.freq + this.wavePhase * w.speed) * w.amp * (this.isListening ? 1.4 : 0.4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // AI Avatar orb in center
      ctx.beginPath();
      const orbRadius = 24 + Math.sin(this.wavePhase * 2) * 3;
      ctx.arc(canvas.width / 2, canvas.height / 2, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Voice Copilot Active', canvas.width / 2, canvas.height / 2 + 45);

      this.waveAnimId = requestAnimationFrame(draw);
    };

    draw();
  }

  _cancelWaveAnimation() {
    if (this.waveAnimId) {
      cancelAnimationFrame(this.waveAnimId);
      this.waveAnimId = null;
    }
  }

  startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[QuantumVoiceCopilot] Web Speech API not supported in this browser.');
      this._setSubtitle('Speech recognition not supported in this browser. You can type commands below!');
      this._updateStatus('⌨️ TYPE COMMAND', 'warning');
      return;
    }

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = navigator.language || 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this._updateStatus('🟢 LISTENING', 'listening');
        this._updateMicBtn(true);
      };

      this.recognition.onresult = (event) => {
        // Echo prevention: Ignore incoming microphone audio if Copilot is currently speaking aloud!
        if (this.isSpeaking || this._isProcessingVoice) {
          return;
        }

        let fullTranscript = '';
        let hasFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          fullTranscript += text;
          if (res.isFinal) {
            hasFinal = true;
          }
        }

        const trimmed = fullTranscript.trim();
        if (!trimmed) return;

        // Immediate visual feedback of heard speech in both dialogue bubble & subtitle
        this._setDialogueUser(trimmed);
        this._setSubtitle(`Heard: "${trimmed}"`);
        this._updateStatus('🔊 HEARING YOU...', 'listening');

        // Clear debounce timer and only fire after user finishes phrase
        clearTimeout(this.speechDebounceTimer);
        const waitMs = hasFinal ? 400 : 2000;
        this.speechDebounceTimer = setTimeout(() => {
          if (!this._isProcessingVoice && trimmed.length > 2) {
            console.log('[QuantumVoiceCopilot] Processing finalized voice utterance:', trimmed);
            this._processTranscript(trimmed);
          }
        }, waitMs);
      };

      this.recognition.onerror = (event) => {
        console.warn('[QuantumVoiceCopilot] Speech error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._setSubtitle('Microphone permission needed. Please allow mic in browser address bar, or type below!');
          this._updateStatus('⚠️ MIC BLOCKED', 'error');
          this.isListening = false;
          this._updateMicBtn(false);
        } else if (event.error === 'network' || event.error === 'no-speech') {
          // If network speech failed, fallback to audio stream buffer if available
          this._setSubtitle('Listening via audio stream...');
          this._updateStatus('🎙️ RECORDING AUDIO', 'listening');
        }
      };

      this.recognition.onend = () => {
        if (this.isActive && this.isListening) {
          setTimeout(() => {
            if (this.isActive && this.isListening && this.recognition) {
              try { this.recognition.start(); } catch (e) {}
            }
          }, 300);
        } else {
          this.isListening = false;
          this._updateStatus('⏸️ MUTED', 'muted');
          this._updateMicBtn(false);
        }
      };

      this.recognition.start();
    } catch (e) {
      console.warn('[QuantumVoiceCopilot] Failed to start recognition:', e);
      this._setSubtitle('Listening via audio recorder...');
      this._updateStatus('🎙️ RECORDING AUDIO', 'listening');
    }

    // Also start high-fidelity MediaRecorder stream for direct Gemini audio fallback
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        this.audioStream = stream;
        try {
          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];
          this.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
          };
          this.mediaRecorder.start(250);
        } catch(err) {
          console.warn('[QuantumVoiceCopilot] MediaRecorder notice:', err);
        }
      }).catch(() => {});
    }
  }

  stopListening() {
    this.isListening = false;
    clearTimeout(this.speechDebounceTimer);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    if (this.audioStream) {
      try { this.audioStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      this.audioStream = null;
    }
    this._updateStatus('⏸️ MUTED', 'muted');
    this._updateMicBtn(false);
  }

  toggleMic() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  _updateMicBtn(isOn) {
    const btn = document.getElementById('copilot-btn-mic');
    if (btn) {
      btn.title = isOn ? 'Mute microphone' : 'Unmute microphone';
      btn.style.opacity = isOn ? '1' : '0.6';
    }
  }

  toggleSpeechFeedback() {
    this.speechSynthesisEnabled = !this.speechSynthesisEnabled;
    const btn = document.getElementById('copilot-btn-tts');
    if (btn) {
      btn.title = this.speechSynthesisEnabled ? 'Voice feedback: ON' : 'Voice feedback: OFF';
      btn.style.opacity = this.speechSynthesisEnabled ? '1' : '0.5';
    }
    if (this.speechSynthesisEnabled) {
      this._speak('Voice confirmation enabled. What circuit shall we build?');
    }
  }

  /**
   * Resolves one English voice and reuses it for the whole session. getVoices()
   * returns [] until the engine finishes loading, so picking per-utterance made
   * the first reply speak in the browser default voice and later replies in the
   * preferred one — audibly two different speakers.
   */
  _resolveVoice() {
    if (this._pinnedVoice) return this._pinnedVoice;
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;

    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Jenny') || v.name.includes('Guy'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferred) this._pinnedVoice = preferred;
    return this._pinnedVoice || null;
  }

  _speak(text, onComplete = null) {
    console.log('[QuantumVoiceCopilot] Speaking:', text);
    this._setDialogueAI(text);

    if (!this.speechSynthesisEnabled || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }

    try {
      this.isSpeaking = true;
      this._updateStatus('🗣️ COPILOT SPEAKING...', 'speaking');

      // Supersede any utterance that is queued or mid-flight, so two replies
      // can never overlap into a garbled duet.
      clearTimeout(this._speakTimer);
      const speakToken = (this._speakToken || 0) + 1;
      this._speakToken = speakToken;

      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      this._speakTimer = setTimeout(() => {
        if (this._speakToken !== speakToken) return; // a newer reply won
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          // CRITICAL: Bind to window and instance to prevent V8 premature garbage collection
          window._activeCopilotUtterance = utterance;
          this.activeUtterance = utterance;

          utterance.rate = 1.02;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const voice = this._resolveVoice();
          if (voice) utterance.voice = voice;

          utterance.onstart = () => {
            this.isSpeaking = true;
            this._updateStatus('🗣️ COPILOT SPEAKING...', 'speaking');
          };

          utterance.onend = () => {
            window._activeCopilotUtterance = null;
            this.activeUtterance = null;
            // Short delay so speaker echo dissipates before mic unfreezes
            setTimeout(() => {
              this.isSpeaking = false;
              if (this.isListening) {
                this._updateStatus('🟢 LISTENING — WHAT NEXT?', 'listening');
                this._playChime('prompt');
              }
              if (onComplete) onComplete();
            }, 350);
          };

          utterance.onerror = (e) => {
            console.warn('[QuantumVoiceCopilot] Speech error:', e);
            window._activeCopilotUtterance = null;
            this.activeUtterance = null;
            this.isSpeaking = false;
            if (this.isListening) {
              this._updateStatus('🟢 LISTENING', 'listening');
            }
            if (onComplete) onComplete();
          };

          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('[QuantumVoiceCopilot] Speak invocation error:', err);
          this.isSpeaking = false;
          if (onComplete) onComplete();
        }
      }, 70);
    } catch (e) {
      console.warn('[QuantumVoiceCopilot] TTS top error:', e);
      this.isSpeaking = false;
      if (onComplete) onComplete();
    }
  }

  _updateStatus(text, type) {
    const pill = document.getElementById('copilot-live-pill');
    if (!pill) return;
    pill.textContent = text;
    pill.className = 'copilot-live-pill copilot-pill-' + type;
  }

  _setSubtitle(text) {
    const el = document.getElementById('copilot-sub-text');
    if (el) el.textContent = text;
  }

  _setDialogueUser(text) {
    const el = document.getElementById('copilot-user-text');
    if (el) el.textContent = `"${text}"`;
  }

  _setDialogueAI(text) {
    const el = document.getElementById('copilot-ai-text');
    if (el) el.textContent = text;
  }

  _setActionFeedback(text, isSuccess = true) {
    const box = document.getElementById('copilot-action-box');
    const textEl = document.getElementById('copilot-act-text');
    if (!box || !textEl) return;
    box.style.display = 'flex';
    box.className = 'copilot-action-box ' + (isSuccess ? 'act-success' : 'act-warn');
    textEl.textContent = text;

    const hud = document.getElementById('quantum-copilot-hud');
    if (hud) {
      hud.classList.add('copilot-hud-pulse');
      setTimeout(() => hud.classList.remove('copilot-hud-pulse'), 600);
    }
  }

  async executeTextCommand() {
    const input = document.getElementById('copilot-text-input');
    if (!input || !input.value.trim()) return;
    const cmd = input.value.trim();
    input.value = '';
    await this.executeSpokenCommand(cmd);
  }

  async executeSpokenCommand(transcript) {
    this._setSubtitle(`Command: "${transcript}"`);
    await this._processTranscript(transcript);
  }

  // -------------------------------------------------------------
  // Agent turn: one backend call handles building, questions and errors
  // -------------------------------------------------------------

  _rememberTurn(role, text) {
    if (!text) return;
    this.conversationHistory.push({ role, text: String(text).slice(0, 400) });
    // Only recent turns matter for follow-ups, and the backend trims again.
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }
  }

  clearConversation() {
    this.conversationHistory = [];
    this._setActionFeedback('Conversation memory cleared.');
  }

  _circuitSnapshot() {
    const ui = window.circuitUI;
    if (!ui) return { num_qubits: 2, grid: [] };
    return {
      num_qubits: ui.numQubits,
      grid: Array.isArray(ui.grid) ? ui.grid.map(row => [...row]) : []
    };
  }

  /**
   * Primary path. Sends the utterance, the live circuit and the recent
   * conversation to the backend agent, which decides whether this turn builds
   * something, answers a question, or explains an error.
   */
  async _runAgent(transcript, errorContext = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.grokKey) headers['X-Grok-Key'] = this.grokKey;
    if (this.geminiKey) headers['X-Gemini-Key'] = this.geminiKey;
    if (this.selectedProvider) headers['X-AI-Provider'] = this.selectedProvider;

    const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
    const response = await fetch(`${base}/api/gemini`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        task: 'voice-agent',
        provider: this.selectedProvider,
        grokApiKey: this.grokKey,
        geminiApiKey: this.geminiKey,
        payload: {
          transcript,
          circuit: this._circuitSnapshot(),
          history: this.conversationHistory,
          errorContext
        }
      })
    });

    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
    const data = await response.json();
    if (data.source) this._updateBadge(data.source);
    return data.result || {};
  }

  /**
   * Maps a backend capability id to the builder that constructs it. Keys are
   * the registry ids in ananta-backend/utils/voiceIntent.js — keeping the two
   * in step is the only coupling between them.
   */
  _buildNamedAlgorithm(id, params = {}) {
    const ui = window.circuitUI;
    if (!ui) return null;

    // Width and direction come from what was actually asked for; the builders
    // have always supported both, the dispatch table just threw them away.
    const width = Number.isInteger(params.qubits) ? Math.min(8, Math.max(1, params.qubits)) : null;
    const inverse = params.inverse === true;

    const builders = {
      'bell': () => { this._buildBellVariant('phi_plus'); return 'Built a Bell pair.'; },
      'ghz': () => {
        const n = width || 3;
        this._buildDynamicGHZ(n);
        return `Built a ${n}-qubit GHZ state.`;
      },
      'w-state': () => { this._buildWState(); return 'Built a W state.'; },
      'teleportation': () => { this._buildTeleportation(); return 'Loaded the quantum teleportation protocol.'; },
      'superdense': () => { this._buildSuperdenseCoding(); return 'Loaded superdense coding.'; },
      'entanglement-swap': () => { this._buildEntanglementSwapping(); return 'Built entanglement swapping.'; },
      'deutsch-jozsa': () => { this._buildDeutschJozsa(); return 'Built the Deutsch-Jozsa circuit.'; },
      'bernstein-vazirani': () => { this._buildBernsteinVazirani(); return 'Built the Bernstein-Vazirani circuit.'; },
      'simon': () => { this._buildSimon(); return "Built Simon's algorithm."; },
      'grover': () => { this._buildGrover(); return 'Loaded Grover search.'; },
      'qft': () => {
        const n = width || ui.numQubits || 3;
        this._buildDynamicQFT(n, inverse);
        return `Built a ${n}-qubit ${inverse ? 'inverse ' : ''}Quantum Fourier Transform.`;
      },
      'qpe': () => { this._buildQPE(); return 'Built Quantum Phase Estimation.'; },
      'adder': () => { this._buildQuantumAdder(); return 'Built the quantum adder.'; },
      'bit-flip-code': () => { this._buildBitFlipCode(); return 'Built the 3-qubit bit-flip code.'; },
      'phase-flip-code': () => { this._buildPhaseFlipCode(); return 'Built the 3-qubit phase-flip code.'; },
      'swap-test': () => { this._buildSwapTest(); return 'Built the SWAP test.'; },
      'qrng': () => { this._buildQRNG(); return 'Built a quantum random number generator.'; },
      'vqe': () => { this._buildVQE(); return 'Loaded the VQE ansatz.'; },
      'chsh': () => { this._buildCHSH(); return 'Loaded the CHSH Bell test.'; }
    };

    const build = builders[id];
    if (!build) return null;

    const summary = build();
    setTimeout(() => {
      if (ui.renderGrid) ui.renderGrid();
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
    return summary;
  }

  /** Executes whichever kind of turn the agent decided this was. */
  _applyAgentPlan(plan, shouldSpeak = true) {
    const spoken = plan.spoken_response || plan.clarification_needed || plan.error_feedback || '';
    const tip = plan.teaching_tip ? `\n💡 ${plan.teaching_tip}` : '';

    if (plan.error_feedback) {
      this._setActionFeedback(`⚠️ ${plan.error_feedback}`, false);
      this._setDialogueAI(`⚠️ ${plan.error_feedback}${tip}`);
      this._playChime('warn');
      if (shouldSpeak) this._speak(plan.error_feedback);
      this._rememberTurn('assistant', plan.error_feedback);
      return 'error';
    }

    if (plan.mode === 'answer' || plan.mode === 'explain') {
      const body = plan.display_text || spoken;
      this._setActionFeedback(spoken || body, true);
      this._setDialogueAI(`${body}${tip}`);
      this._playChime('success');
      if (shouldSpeak && spoken) this._speak(spoken);
      this._rememberTurn('assistant', spoken || body);
      return plan.mode;
    }

    // A recognized algorithm is built by the client's own tested builder, so
    // every capability in the backend registry is constructible without the
    // backend having to describe it gate by gate.
    if (plan.algorithm) {
      const built = this._buildNamedAlgorithm(plan.algorithm, plan.params || {});
      if (built) {
        this._setActionFeedback(spoken || built, true);
        this._setDialogueAI(`${spoken || built}${tip}`);
        this._playChime('success');
        if (shouldSpeak) this._speak(spoken || built);
        this._rememberTurn('assistant', spoken || built);
        return 'build';
      }
      console.warn('[QuantumVoiceCopilot] No builder for algorithm id:', plan.algorithm);
    }

    if (plan.control) {
      const ui = window.circuitUI;
      if (ui) {
        if (plan.control === 'clear') ui.clearCircuit();
        else if (plan.control === 'run') ui.runInteractiveSimulation();
        else if (plan.control === 'add-qubit') ui.addQubit();
        else if (plan.control === 'remove-qubit') ui.removeQubit();
      }
      if (plan.operations && plan.operations.length) this._applyOperations(plan);
      this._setActionFeedback(spoken, true);
      this._setDialogueAI(`${spoken}${tip}`);
      this._playChime('success');
      if (shouldSpeak) this._speak(spoken);
      this._rememberTurn('assistant', spoken);
      return 'control';
    }

    if (plan.mode === 'clarify' || (!plan.operations || plan.operations.length === 0)) {
      const ask = plan.clarification_needed || spoken || 'Could you say that another way?';
      this._setActionFeedback(ask, false);
      this._setDialogueAI(`${ask}${tip}`);
      if (shouldSpeak) this._speak(ask);
      this._rememberTurn('assistant', ask);
      return 'clarify';
    }

    const placed = this._applyOperations(plan);
    const summary = spoken || `Applied ${placed} operation${placed === 1 ? '' : 's'}.`;
    this._setActionFeedback(summary, true);
    this._setDialogueAI(`${summary}${tip}`);
    this._playChime('success');
    if (shouldSpeak) this._speak(summary);
    this._rememberTurn('assistant', summary);
    return 'build';
  }

  /**
   * Public entry point for the error explainer: hand it anything that went
   * wrong and the agent explains it against the live circuit.
   */
  async explainError(errorText) {
    if (!errorText) return;
    if (!this.isActive) this.open();
    this._setDialogueUser(`Explain this error: ${String(errorText).slice(0, 200)}`);
    this._setActionFeedback('Analyzing the error...', true);
    this._rememberTurn('user', `Explain this error: ${errorText}`);

    try {
      const plan = await this._runAgent('Explain this error and how to fix it.', String(errorText));
      this._applyAgentPlan(plan, true);
    } catch (err) {
      this._setActionFeedback(`Could not reach the AI engine: ${err.message}`, false);
    }
  }

  // -------------------------------------------------------------
  // Phonetic term resolution (vocabulary owned by the backend registry)
  // -------------------------------------------------------------

  /**
   * Pulls the capability vocabulary from the backend once per session. The
   * terms live in exactly one place (ananta-backend/utils/voiceIntent.js); this
   * side only runs the generic matching algorithm over whatever it is given, so
   * new capabilities become speakable with no frontend change.
   */
  async loadVoiceVocabulary() {
    if (this._vocabulary) return this._vocabulary;
    if (this._vocabularyPromise) return this._vocabularyPromise;

    this._vocabularyPromise = (async () => {
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      const res = await fetch(`${base}/api/voice/vocabulary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this._vocabConfig = {
        minFuzzyLength: data.minFuzzyLength || 5,
        similarityThreshold: data.similarityThreshold || 0.78,
        maxNgram: data.maxNgram || 4
      };
      this._vocabulary = (data.capabilities || []).flatMap(cap =>
        (cap.terms || []).map(term => ({
          id: cap.id,
          kind: cap.kind,
          collapsed: term.toLowerCase().replace(/[^a-z0-9]/g, ''),
          canonical: cap.terms[0]
        }))
      );
      console.log('[QuantumVoiceCopilot] Loaded', this._vocabulary.length, 'voice vocabulary terms.');
      return this._vocabulary;
    })().catch(err => {
      console.warn('[QuantumVoiceCopilot] Vocabulary unavailable, backend will correct instead:', err.message);
      this._vocabularyPromise = null;
      return null;
    });

    return this._vocabularyPromise;
  }

  _levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      const swap = prev; prev = curr; curr = swap;
    }
    return prev[b.length];
  }

  _isTransposition(a, b) {
    if (a.length !== b.length || a.length < 3) return false;
    return a.split('').sort().join('') === b.split('').sort().join('');
  }

  _matchSpokenPhrase(phrase) {
    const target = phrase.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!target || !this._vocabulary) return null;
    const cfg = this._vocabConfig;

    let best = null;
    for (const entry of this._vocabulary) {
      if (entry.collapsed === target) return { ...entry, score: 1, exact: true };
      if (this._isTransposition(target, entry.collapsed)) return { ...entry, score: 0.99, exact: false };
      if (target.length < cfg.minFuzzyLength || entry.collapsed.length < cfg.minFuzzyLength) continue;

      const max = Math.max(target.length, entry.collapsed.length);
      const score = 1 - this._levenshtein(target, entry.collapsed) / max;
      if (score >= cfg.similarityThreshold && (!best || score > best.score)) {
        best = { ...entry, score, exact: false };
      }
    }
    return best;
  }

  /**
   * Rewrites a heard phrase so recognized capabilities appear under their
   * canonical names. Non-overlapping, best-score-first.
   */
  _resolveSpokenTerms(rawText) {
    const original = (rawText || '').trim();
    if (!this._vocabulary) return { text: original, corrected: false };

    const tokens = original.split(/\s+/).filter(Boolean);
    if (!tokens.length) return { text: original, corrected: false };

    const maxNgram = this._vocabConfig.maxNgram;
    const candidates = [];
    for (let start = 0; start < tokens.length; start++) {
      for (let len = Math.min(maxNgram, tokens.length - start); len >= 1; len--) {
        const match = this._matchSpokenPhrase(tokens.slice(start, start + len).join(' '));
        if (match) candidates.push({ start, end: start + len, match, span: len });
      }
    }

    candidates.sort((a, b) => (b.match.score - a.match.score) || (b.span - a.span));

    const claimed = new Array(tokens.length).fill(false);
    const accepted = [];
    for (const cand of candidates) {
      let free = true;
      for (let i = cand.start; i < cand.end; i++) {
        if (claimed[i]) { free = false; break; }
      }
      if (!free) continue;
      for (let i = cand.start; i < cand.end; i++) claimed[i] = true;
      accepted.push(cand);
    }
    accepted.sort((a, b) => a.start - b.start);

    const out = [];
    let cursor = 0;
    let corrected = false;
    for (const cand of accepted) {
      for (let i = cursor; i < cand.start; i++) out.push(tokens[i]);
      // Leave correctly-spoken text alone; only substitute actual mishearings.
      if (cand.match.exact) {
        for (let i = cand.start; i < cand.end; i++) out.push(tokens[i]);
      } else {
        out.push(cand.match.canonical);
        corrected = true;
      }
      cursor = cand.end;
    }
    for (let i = cursor; i < tokens.length; i++) out.push(tokens[i]);

    return { text: out.join(' '), corrected };
  }

  // -------------------------------------------------------------
  // Universal Generative Quantum Circuit AI Engine
  // -------------------------------------------------------------
  async _processTranscript(rawText) {
    if (!rawText) return;
    if (this._isProcessingVoice) {
      console.log('[QuantumVoiceCopilot] Voice synthesis already in progress, skipping duplicate trigger.');
      return;
    }
    this._isProcessingVoice = true;

    try {
      const heard = rawText.toLowerCase().trim();
      // Correct mispronunciations against the backend capability registry before
      // any matcher runs, so "bellystate" behaves exactly like "bell state".
      const resolved = this._resolveSpokenTerms(heard);
      let text = resolved.text;
      if (resolved.corrected) {
        console.log('[QuantumVoiceCopilot] Phonetic correction:', heard, '->', text);
        this._setDialogueUser(`${rawText.trim()}  →  understood as "${text}"`);
      }
      console.log('[QuantumVoiceCopilot] Ingested raw voice:', text);

      // -----------------------------------------------------------------------
      // PRIORITY 0: Roadmap Diagram Intent — intercepts BEFORE circuit logic.
      // These commands navigate to the Roadmap tab and generate a visual
      // learning path diagram. They must never fall through to the circuit builder.
      // -----------------------------------------------------------------------
      const roadmapIntent = this._detectRoadmapIntent(text);
      if (roadmapIntent) {
        this._executeRoadmapIntent(roadmapIntent, rawText);
        return;
      }

      // Make sure we are viewing Composer!
      if (window.switchTab) {
        window.switchTab('simulator');
      }

      const ui = window.circuitUI;
      if (!ui) {
        this._setActionFeedback('Circuit UI not loaded yet.', false);
        return;
      }

      // -----------------------------------------------------------------------
      // PRIMARY PATH: the backend agent. It sees the live circuit and the recent
      // conversation, so it can build, answer questions with real simulated
      // numbers, or explain an error — and it resolves follow-ups like "do the
      // same on qubit 1". The local pattern engine below is the offline fallback.
      // -----------------------------------------------------------------------
      this._rememberTurn('user', rawText);
      if (this.selectedProvider !== 'offline') {
        try {
          this._updateStatus('🧠 THINKING...', 'speaking');
          // If they're asking about a failure, hand over the last real error too.
          const asksAboutError = /\b(error|failed|failing|broken|wrong|bug|crash|exception|not working)\b/i.test(text);
          const plan = await this._runAgent(text, asksAboutError ? this._lastRuntimeError || null : null);
          this._applyAgentPlan(plan, true);
          return;
        } catch (err) {
          console.warn('[QuantumVoiceCopilot] Agent unreachable, using local engine:', err.message);
          this._setActionFeedback('AI engine unreachable — using local engine.', false);
        }
      }

      // If user says "make a circuit with..." or "create a circuit with..." or "draw circuit with...":
      const isNewCircuit = /^(?:make|create|draw|generate|build|construct)\s+(?:a\s+|an\s+|the\s+)?(?:circuit|diagram)\s+(?:with|having|of|for|that\s+has)?\s+/i.test(text);
      if (isNewCircuit) {
        ui.clearCircuit();
        text = text.replace(/^(?:make|create|draw|generate|build|construct)\s+(?:a\s+|an\s+|the\s+)?(?:circuit|diagram)\s+(?:with|having|of|for|that\s+has)?\s+/i, '');
      }

      // Step 1: Intelligent clause splitting
      const gateLookahead = '(?:a\\s+|an\\s+|the\\s+|another\\s+)?(?:add|put|place|insert|apply|set|wire|cnot|cx|hadamard|\\bh\\b|pauli|not|\\bx\\b|\\by\\b|\\bz\\b|\\bs\\b|\\bt\\b|\\bm\\b|swap|toffoli|ccx|measure|measurement|run|clear)\\b';
      const splitRegex = new RegExp('\\s+and\\s+(?=' + gateLookahead + ')', 'gi');
      const commaRegex = new RegExp(',\\s*(?=' + gateLookahead + ')', 'gi');

      let normalized = text
        .replace(/\s*(?:,\s*then\s*|\s+then\s+|,\s*and\s+then\s+|\s+and\s+then\s+|\s+after\s+that\s+|\s+next\s+|;\s*)\s*/gi, ' | ')
        .replace(splitRegex, ' | ')
        .replace(commaRegex, ' | ');

      const clauses = normalized.split(/\s*\|\s*/).map(c => c.trim()).filter(Boolean);

      if (clauses.length > 1) {
        console.log('[QuantumVoiceCopilot] Executing multi-step sequence of', clauses.length, 'clauses:', clauses);
        const actionSummaries = [];
        for (const clause of clauses) {
          if (clause) {
            const res = await this._executeSingleIntent(clause, false);
            if (res) actionSummaries.push(res);
          }
        }
        if (actionSummaries.length > 0) {
          this._setActionFeedback(`⚡ Built Sequence: ${actionSummaries.join(' ➔ ')}`);
          this._playChime('success');
          this._speak(`Synthesized circuit sequence with ${actionSummaries.length} operations.`);
          setTimeout(() => {
            if (ui.renderGrid) ui.renderGrid();
            if (ui.renderCnotConnectors) ui.renderCnotConnectors();
          }, 60);
          return;
        }
      }

      // Single intent execution
      await this._executeSingleIntent(text, true);
    } finally {
      this._isProcessingVoice = false;
    }
  }

  async _executeSingleIntent(rawClause, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return null;

    // Clean conversational fluff and leading articles from start:
    let clean = rawClause
      .replace(/^(?:can\s+you\s+|could\s+you\s+|please\s+|i\s+said\s+to\s+|i\s+want\s+to\s+|i\s+need\s+to\s+|show\s+me\s+|create\s+|make\s+|draw\s+|generate\s+|build\s+|construct\s+|assemble\s+|add\s+|put\s+|place\s+|insert\s+|apply\s+|set\s+|wire\s+|a\s+|an\s+|the\s+|another\s+)+/i, '')
      .replace(/^(?:diagram\s+of\s+|circuit\s+of\s+|circuit\s+for\s+|diagram\s+for\s+|state\s+of\s+)?/i, '')
      .replace(/^(?:a\s+|an\s+|the\s+|another\s+)+/i, '')
      .trim();

    clean = clean.replace(/\s+/g, ' ');
    console.log('[QuantumVoiceCopilot] Clean intent:', clean);

    // -------------------------------------------------------------
    // 1. Broad Quantum Algorithm & Protocol Knowledge Base
    // -------------------------------------------------------------

    // 1.1 Bell State (all variants: Phi+, Phi-, Psi+, Psi-/singlet)
    if (/\b(bell|bell\s*state|bell\s*pair|epr|epr\s*pair)\b/.test(clean)) {
      let variant = 'phi_plus';
      if (/\b(phi\s*minus|minus)\b/.test(clean)) variant = 'phi_minus';
      else if (/\b(psi\s*plus)\b/.test(clean)) variant = 'psi_plus';
      else if (/\b(psi\s*minus|singlet)\b/.test(clean)) variant = 'psi_minus';

      this._buildBellVariant(variant);
      if (shouldSpeak) this._speak('Synthesized Bell state maximally entangled pair. What would you like to build or do next?');
      return 'Bell State';
    }

    // 1.2 GHZ Tripartite & Multipartite Entanglement
    if (/\b(ghz|greenberger|multi\s*qubit\s*entanglement|tripartite)\b/.test(clean)) {
      const qMatch = clean.match(/(\d+)\s*(?:qubit|q)/);
      const nQubits = qMatch ? parseInt(qMatch[1], 10) : 3;
      this._buildDynamicGHZ(nQubits);
      if (shouldSpeak) this._speak(`Created ${nQubits}-qubit GHZ entangled state. What gate should we add next?`);
      return `${nQubits}-Qubit GHZ`;
    }

    // 1.3 W-State
    if (/\b(w\s*state|w\s*superposition)\b/.test(clean)) {
      this._buildWState();
      if (shouldSpeak) this._speak('Created three-qubit W state. What would you like to add next?');
      return 'W State';
    }

    // 1.4 Quantum Teleportation Protocol
    if (/\b(teleport|teleportation|epr\s*channel)\b/.test(clean)) {
      this._buildTeleportation();
      if (shouldSpeak) this._speak('Loaded quantum teleportation protocol. Would you like to run simulation, or inspect gates?');
      return 'Teleportation Protocol';
    }

    // 1.5 Superdense Coding
    if (/\b(superdense|dense\s*coding)\b/.test(clean)) {
      this._buildSuperdenseCoding();
      if (shouldSpeak) this._speak('Loaded superdense coding protocol. What is our next step?');
      return 'Superdense Coding';
    }

    // 1.6 Entanglement Swapping
    if (/\b(entanglement\s*swapping|swapping\s*protocol)\b/.test(clean)) {
      this._buildEntanglementSwapping();
      if (shouldSpeak) this._speak('Constructed entanglement swapping circuit across 4 qubits. What is next?');
      return 'Entanglement Swapping';
    }

    // 1.7 Deutsch-Jozsa Algorithm
    if (/\b(deutsch|deutsch\s*jozsa)\b/.test(clean)) {
      this._buildDeutschJozsa();
      if (shouldSpeak) this._speak('Constructed Deutsch-Jozsa quantum advantage circuit. Shall we run the simulation?');
      return 'Deutsch-Jozsa';
    }

    // 1.8 Bernstein-Vazirani Algorithm
    if (/\b(bernstein|vazirani|hidden\s*string)\b/.test(clean)) {
      this._buildBernsteinVazirani();
      if (shouldSpeak) this._speak('Constructed Bernstein-Vazirani single-query search algorithm. What is our next step?');
      return 'Bernstein-Vazirani';
    }

    // 1.9 Simon's Algorithm
    if (/\b(simon|simon's|period\s*finding)\b/.test(clean)) {
      this._buildSimon();
      if (shouldSpeak) this._speak('Constructed Simon\'s exponential speedup circuit. What is next?');
      return 'Simon\'s Algorithm';
    }

    // 1.10 Grover's Search Algorithm
    if (/\b(grover|grover's|quantum\s*search|database\s*search)\b/.test(clean)) {
      this._buildGrover();
      if (shouldSpeak) this._speak('Loaded Grover quantum search algorithm. Shall we run simulation, or add more gates?');
      return 'Grover Search';
    }

    // 1.11 Quantum Fourier Transform (QFT & IQFT)
    if (/\b(qft|fourier|fourier\s*transform)\b/.test(clean)) {
      const isInverse = /\b(inverse|inv|iqft)\b/.test(clean);
      const qMatch = clean.match(/(\d+)\s*(?:qubit|q)/);
      const nQubits = qMatch ? parseInt(qMatch[1], 10) : (ui.numQubits || 3);
      this._buildDynamicQFT(nQubits, isInverse);
      if (shouldSpeak) this._speak(`Generated ${nQubits}-qubit Quantum Fourier Transform. What should we do next?`);
      return `QFT (${nQubits}q)`;
    }

    // 1.12 Quantum Phase Estimation (QPE)
    if (/\b(qpe|phase\s*estimation)\b/.test(clean)) {
      this._buildQPE();
      if (shouldSpeak) this._speak('Loaded Quantum Phase Estimation circuit. What would you like to do next?');
      return 'Quantum Phase Estimation';
    }

    // 1.13 Quantum Arithmetic & Adders
    if (/\b(adder|half\s*adder|quantum\s*adder|arithmetic)\b/.test(clean)) {
      this._buildQuantumAdder();
      if (shouldSpeak) this._speak('Constructed quantum adder circuit using Toffoli and CNOT gates. What gate shall we add next?');
      return 'Quantum Half-Adder';
    }

    // 1.14 Quantum Error Correction: Bit-Flip Code
    if (/\b(bit\s*flip\s*code|repetition\s*code|error\s*correction|qec)\b/.test(clean)) {
      this._buildBitFlipCode();
      if (shouldSpeak) this._speak('Constructed 3-qubit bit-flip error correction code. What is next?');
      return '3-Qubit Bit-Flip QEC';
    }

    // 1.15 Quantum Error Correction: Phase-Flip Code
    if (/\b(phase\s*flip\s*code)\b/.test(clean)) {
      this._buildPhaseFlipCode();
      if (shouldSpeak) this._speak('Constructed 3-qubit phase-flip error correction code. What is next?');
      return '3-Qubit Phase-Flip QEC';
    }

    // 1.16 SWAP Test (Fidelity & State Overlap)
    if (/\b(swap\s*test|state\s*overlap|fidelity\s*test)\b/.test(clean)) {
      this._buildSwapTest();
      if (shouldSpeak) this._speak('Constructed quantum SWAP test for state overlap measurement. What is next?');
      return 'SWAP Test';
    }

    // 1.17 Quantum Random Number Generator (QRNG)
    if (/\b(qrng|random\s*number|random\s*generator|coin\s*flip)\b/.test(clean)) {
      this._buildQRNG();
      if (shouldSpeak) this._speak('Constructed Quantum Random Number Generator. Shall we run simulation?');
      return 'QRNG';
    }

    // 1.18 VQE Ansatz
    if (/\b(vqe|variational|ansatz)\b/.test(clean)) {
      this._buildVQE();
      if (shouldSpeak) this._speak('Loaded Variational Quantum Eigensolver ansatz. What is next?');
      return 'VQE Ansatz';
    }

    // 1.19 CHSH Bell Test
    if (/\b(chsh|inequality|bell\s*test)\b/.test(clean)) {
      this._buildCHSH();
      if (shouldSpeak) this._speak('Loaded CHSH Bell inequality violation test. Ready to run simulation?');
      return 'CHSH Test';
    }

    // -------------------------------------------------------------
    // 2. Register & Circuit Controls
    // -------------------------------------------------------------
    if (/\b(clear\s*all|clear\s*circuit|clear|reset|wipe|clean|start\s*over)\b/.test(clean)) {
      ui.clearCircuit();
      this._setActionFeedback('Cleared entire quantum circuit.');
      this._playChime('success');
      if (shouldSpeak) this._speak('Circuit reset to ground state. Which gate shall we start with?');
      return 'Clear Circuit';
    }

    if (/\b(run\s*simulation|run|simulate|execute|calculate|fire)\b/.test(clean)) {
      ui.runInteractiveSimulation();
      this._setActionFeedback('Executed quantum statevector simulation.');
      this._playChime('success');
      if (shouldSpeak) this._speak('Simulation executed. Statevector and measurement probabilities updated. What is next?');
      return 'Run Simulation';
    }

    // Configure register qubit count ("4 qubits", "set to 3 qubits", "make 4 qubits")
    const setQubitMatch = clean.match(/\b(?:set|make|use|have|with)?\s*([2-8])\s*qubits?\b/i);
    if (setQubitMatch) {
      const targetQ = parseInt(setQubitMatch[1], 10);
      while (ui.numQubits < targetQ) ui.addQubit();
      while (ui.numQubits > targetQ) ui.removeQubit();
      this._setActionFeedback(`Configured register with ${targetQ} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak(`Configured circuit with ${targetQ} qubits. What gate should we add first?`);
      return `SetQubits(${targetQ})`;
    }

    if (/\b(add\s*qubit|new\s*qubit|more\s*qubit)\b/.test(clean)) {
      ui.addQubit();
      this._setActionFeedback(`Added qubit. Register is now ${ui.numQubits} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak(`Added qubit. Total is now ${ui.numQubits}. What gate shall we place?`);
      return 'Add Qubit';
    }

    if (/\b(remove\s*qubit|delete\s*qubit|less\s*qubit)\b/.test(clean)) {
      ui.removeQubit();
      this._setActionFeedback(`Removed qubit. Register is now ${ui.numQubits} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak(`Removed qubit. Total is now ${ui.numQubits}. What is our next step?`);
      return 'Remove Qubit';
    }

    // -------------------------------------------------------------
    // 3. Whole-Register Mass Operations
    // -------------------------------------------------------------
    if (/\b(hadamard\s*on\s*all|h\s*on\s*all|superposition\s*on\s*all|all\s*hadamard|all\s*h)\b/.test(clean)) {
      for (let q = 0; q < ui.numQubits; q++) {
        ui.placeGate('H', q, 0);
      }
      this._setActionFeedback(`Applied Hadamard transform to all ${ui.numQubits} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak(`Applied Hadamard to all ${ui.numQubits} qubits. What is our next gate?`);
      return 'Hadamard on All';
    }

    if (/\b(x\s*on\s*all|not\s*on\s*all|invert\s*all|all\s*x)\b/.test(clean)) {
      for (let q = 0; q < ui.numQubits; q++) {
        ui.placeGate('X', q, 0);
      }
      this._setActionFeedback(`Applied Pauli-X bit-flip to all ${ui.numQubits} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak('Inverted all qubits. What gate should I add next?');
      return 'X on All';
    }

    if (/\b(measure\s*all|measurement\s*on\s*all|all\s*measure)\b/.test(clean)) {
      for (let q = 0; q < ui.numQubits; q++) {
        let col = this._findNextCol(q);
        ui.placeGate('M', q, col);
      }
      this._setActionFeedback(`Added measurements across all ${ui.numQubits} qubits.`);
      this._playChime('success');
      if (shouldSpeak) this._speak('Added measurement to all qubits. Ready to run simulation, or add more gates?');
      return 'Measure All';
    }

    // -------------------------------------------------------------
    // 4. Freeform Gate & Connector Placement
    // -------------------------------------------------------------

    // 4.1 CNOT / CX
    if (/\b(cnot|cx|controlled\s*not)\b/.test(clean)) {
      const res = this._parseAndPlaceCNOT(clean, shouldSpeak);
      if (res) return res;
    }

    // 4.2 SWAP
    if (/\b(swap|exchange)\b/.test(clean)) {
      const res = this._parseAndPlaceSWAP(clean, shouldSpeak);
      if (res) return res;
    }

    // 4.3 Toffoli / CCX
    if (/\b(toffoli|ccx|controlled\s*controlled\s*not)\b/.test(clean)) {
      const res = this._parseAndPlaceToffoli(clean, shouldSpeak);
      if (res) return res;
    }

    // 4.3b Universal Movement & Spatial Relocation
    if (/\b(?:move|take|shift|transfer|relocate|drag|slide|reposition|change|swap)\b/i.test(clean) || /\b(?:from\s+.*?to\s+.*)/i.test(clean)) {
      const moveRes = this._parseAndMoveGate(clean, shouldSpeak);
      if (moveRes) return moveRes;
    }

    // 4.4 Single Qubit Gates (H, X, Y, Z, S, T, M)
    const singleGate = this._matchSingleGate(clean);
    if (singleGate) {
      const allQubits = this._extractAllQubits(clean);
      if (allQubits.length > 1) {
        const placedQubits = [];
        for (const q of allQubits) {
          while (ui.numQubits <= q) ui.addQubit();
          const col = this._extractColumn(clean, q);
          this._placeSingleGate(singleGate, q, col, false);
          placedQubits.push(`Q${q}`);
        }
        const summary = `Placed ${singleGate} on ${placedQubits.join(' and ')}.`;
        this._setActionFeedback(summary);
        this._setDialogueAI(summary);
        this._playChime('success');
        if (shouldSpeak) this._speak(summary);
        return summary;
      } else {
        const q = this._extractQubit(clean);
        while (ui.numQubits <= q) ui.addQubit();
        const col = this._extractColumn(clean, q);
        this._placeSingleGate(singleGate, q, col, shouldSpeak);
        return `${singleGate}(q${q})`;
      }
    }

    // 4.5 Remove/Delete Gate
    if (/\b(remove|delete|erase|drop)\b/.test(clean)) {
      const q = this._extractQubit(clean);
      const col = this._extractColumn(clean, q, false);
      if (col !== -1) {
        ui.removeGate(q, col);
        this._setActionFeedback(`Removed gate at Qubit ${q}, Column ${col + 1}.`);
        this._playChime('success');
        if (shouldSpeak) this._speak(`Removed gate on qubit ${q}. What would you like to do next?`);
        return `Remove(q${q}, c${col+1})`;
      }
    }

    // Fallback: ask the backend to interpret this generally instead of
    // giving up. This is the actual "not hardcoded to Bell state" fix (Section 4.3).
    return await this._generalizedFallback(rawClause, shouldSpeak);
  }

  async _generalizedFallback(rawClause, shouldSpeak = true) {
    const ui = window.circuitUI;
    const providerLabel = this.selectedProvider === 'grok' ? 'Grok-2' : (this.selectedProvider === 'gemini' ? 'Gemini 2.5' : 'Quantum AI');
    this._setActionFeedback(`  Thinking about "${rawClause}"...`, true);
    this._setDialogueUser(rawClause);
    this._setDialogueAI(`Synthesizing circuit via ${providerLabel}...`);
    const currentCircuit = {
      num_qubits: ui ? ui.numQubits : 2,
      grid: ui ? ui.grid : [] // existing engine state, sent as context
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.grokKey) headers['X-Grok-Key'] = this.grokKey;
      if (this.geminiKey) headers['X-Gemini-Key'] = this.geminiKey;
      if (this.selectedProvider) headers['X-AI-Provider'] = this.selectedProvider;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          task: 'voice-parse',
          provider: this.selectedProvider,
          grokApiKey: this.grokKey,
          geminiApiKey: this.geminiKey,
          payload: { transcript: rawClause, currentCircuit }
        })
      });
      if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
      const data = await response.json();
      const plan = data.result || {};
      const source = data.source || 'deterministic-quantum-ai';

      this._updateBadge(source);

      // Error explanation feedback from Voice Mentor LLM
      if (plan.error_feedback) {
        const errNotice = `⚠️ ${plan.error_feedback}`;
        this._setActionFeedback(errNotice, false);
        this._setDialogueAI(errNotice);
        this._playChime('warn');
        if (shouldSpeak) this._speak(plan.error_feedback);
        return null;
      }

      if (plan.clarification_needed) {
        this._setActionFeedback(plan.clarification_needed, false);
        this._setDialogueAI(plan.clarification_needed);
        if (shouldSpeak) this._speak(plan.clarification_needed);
        return null;
      }

      // Auto-expand qubits if synthesis requires more wires
      const placed = this._applyOperations(plan);
      const skipped = [];

      const explanation = plan.explanation || `Built ${placed} operation(s) from: "${rawClause}"`;
      const tip = plan.teaching_tip ? `\n💡 Tip: ${plan.teaching_tip}` : '';
      const fullDialogue = `${explanation}${tip}`;

      this._setActionFeedback(explanation, skipped.length === 0);
      this._setDialogueAI(fullDialogue);
      this._playChime('success');
      if (shouldSpeak) this._speak(explanation);
      return explanation;
    } catch (err) {
      console.warn('[QuantumVoiceCopilot] Backend parse failed:', err);
      if (typeof setStatusBadge === 'function') {
        setStatusBadge('copilot-status-badge', false); // "Local Fallback"
      }
      this._setActionFeedback(
        `Unrecognized: "${rawClause}". Try: "Add H on 0", "Make GHZ", "CNOT 0 to 1"`,
        false
      );
      this._playChime('warn');
      return null;
    }
  }

  /**
   * Applies a plan's operations to the circuit grid. Shared by the agent path
   * and the legacy fallback so gate placement behaves identically either way.
   */
  _applyOperations(plan) {
    const ui = window.circuitUI;
    let placed = 0;
    const skipped = [];

    {
      if (ui && plan.num_qubits && plan.num_qubits > ui.numQubits) {
        while (ui.numQubits < Math.min(8, plan.num_qubits)) {
          ui.addQubit();
        }
      }

      if (plan.reset_existing && ui) ui.clearCircuit();

      if (plan.operations && Array.isArray(plan.operations)) {
        for (const op of plan.operations) {
          const targets = (op.targets && op.targets.length > 0) ? op.targets : [0];

          if (op.action === 'move' || op.from_step !== undefined) {
            let fromStep = (op.from_step !== undefined && op.from_step !== null) ? op.from_step : null;
            let toStep = (op.step !== undefined && op.step !== null) ? op.step : 4;
            let fromQ = (op.from_qubit !== undefined && op.from_qubit !== null) ? op.from_qubit : null;
            let toQ = (targets[0] !== undefined) ? targets[0] : 0;
            const rawGate = op.gate === 'MEASURE' ? 'M' : op.gate;

            // Handle stepper / playhead movement
            if (rawGate === 'playhead' || rawGate === 'stepper') {
              if (ui && ui.seekStep) {
                ui.seekStep(toStep + 1);
                placed++;
                continue;
              }
            }

            // Handle cryostat temperature movement
            if (rawGate === 'temperature') {
              if (window.cryoTwin && op.params && op.params.value !== undefined) {
                window.cryoTwin.temperatureMK = op.params.value;
                const sl = document.getElementById('cryo-temp-slider');
                if (sl) sl.value = op.params.value;
                if (window.cryoTwin._updateDisplay) window.cryoTwin._updateDisplay();
                placed++;
                continue;
              }
            }

            // Search live circuit if source coordinate is omitted
            if (fromStep === null || fromQ === null) {
              for (let q = 0; q < (ui ? ui.numQubits : 0); q++) {
                for (let c = 0; c < (ui ? ui.numCols : 0); c++) {
                  const cell = ui.grid[q] ? ui.grid[q][c] : null;
                  if (!cell) continue;
                  if (rawGate) {
                    const normCell = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
                    if (normCell === rawGate || (rawGate === 'M' && cell === 'M')) {
                      if (fromQ === null) fromQ = q;
                      if (fromStep === null) fromStep = c;
                      break;
                    }
                  } else if (fromQ === null || fromQ === q) {
                    if (fromQ === null) fromQ = q;
                    if (fromStep === null) fromStep = c;
                    break;
                  }
                }
                if (fromStep !== null && fromQ !== null) break;
              }
            }

            if (fromQ === null) fromQ = 0;
            if (toQ === null) toQ = fromQ;
            if (fromStep === null) fromStep = 0;

            while (ui && ui.numQubits <= Math.max(fromQ, toQ) && ui.numQubits < 8) ui.addQubit();

            let moved = false;
            if (ui && ui.moveGate) {
              moved = ui.moveGate(fromQ, fromStep, toQ, toStep);
            }

            // If gate did not exist to move, place it at the requested destination
            if (!moved && ui && ui.placeGate) {
              const placeGateName = rawGate || 'T';
              ui.placeGate(placeGateName, toQ, toStep);
              placed++;
            } else if (moved) {
              placed++;
            }
          } else if (op.gate === 'CNOT' || op.gate === 'CX') {
            const ctrl = (op.controls && op.controls.length > 0) ? op.controls[0] : 0;
            const tgt = targets[0] !== undefined ? targets[0] : 1;
            while (ui && ui.numQubits <= Math.max(ctrl, tgt)) ui.addQubit();
            const col = (op.step !== undefined && op.step !== null) ? op.step : this._nextFreeColumnForPair(ctrl, tgt);
            if (ui) {
              ui.placeGate('CX', ctrl, col, tgt);
              placed++;
            }
          } else if (op.gate === 'SWAP') {
            const q1 = targets[0] !== undefined ? targets[0] : 0;
            const q2 = targets[1] !== undefined ? targets[1] : 1;
            while (ui && ui.numQubits <= Math.max(q1, q2)) ui.addQubit();
            const col = (op.step !== undefined && op.step !== null) ? op.step : this._nextFreeColumnForPair(q1, q2);
            if (ui) {
              ui.grid[q1][col] = 'SWAP';
              ui.grid[q2][col] = 'SWAP';
              ui.renderGrid();
              ui.updateSimulation();
              placed++;
            }
          } else if (op.gate === 'Toffoli' || op.gate === 'CCX') {
            while (ui && ui.numQubits < 3) ui.addQubit();
            const col = (op.step !== undefined && op.step !== null) ? op.step : this._nextFreeColumnForTrio(0, 1, 2);
            if (ui) {
              ui.grid[0][col] = 'CX_CTRL';
              ui.grid[1][col] = 'CX_CTRL';
              ui.grid[2][col] = 'CX_TGT';
              ui.renderGrid();
              ui.updateSimulation();
              placed++;
            }
          } else if (['H', 'X', 'Y', 'Z', 'S', 'T', 'M', 'MEASURE'].includes(op.gate)) {
            const gate = op.gate === 'MEASURE' ? 'M' : op.gate;
            for (const targetQ of targets) {
              while (ui && ui.numQubits <= targetQ) ui.addQubit();
              const col = (op.step !== undefined && op.step !== null) ? op.step : this._nextFreeColumn(targetQ);
              if (ui) {
                ui.placeGate(gate, targetQ, col);
                placed++;
              }
            }
          } else {
            skipped.push(op.gate);
          }
        }
      }

      setTimeout(() => {
        if (ui && ui.renderGrid) ui.renderGrid();
        if (ui && ui.renderCnotConnectors) ui.renderCnotConnectors();
      }, 60);
    }

    if (skipped.length) {
      console.warn('[QuantumVoiceCopilot] Skipped unsupported gates:', skipped);
    }
    return placed;
  }

  _nextFreeColumnForPair(q1, q2) {
    const ui = window.circuitUI;
    if (!ui || !ui.grid) return 0;
    for (let c = 0; c < (ui.numCols || 16); c++) {
      if ((!ui.grid[q1] || !ui.grid[q1][c]) && (!ui.grid[q2] || !ui.grid[q2][c])) {
        return c;
      }
    }
    return 0;
  }

  _nextFreeColumnForTrio(q1, q2, q3) {
    const ui = window.circuitUI;
    if (!ui || !ui.grid) return 0;
    for (let c = 0; c < (ui.numCols || 16); c++) {
      if ((!ui.grid[q1] || !ui.grid[q1][c]) && (!ui.grid[q2] || !ui.grid[q2][c]) && (!ui.grid[q3] || !ui.grid[q3][c])) {
        return c;
      }
    }
    return 0;
  }

  _nextFreeColumn(qubit) {
    if (typeof this._findNextCol === 'function') {
      return this._findNextCol(qubit);
    }
    const ui = window.circuitUI;
    if (!ui || !ui.grid || !ui.grid[qubit]) return 0;
    for (let c = 0; c < (ui.numCols || 16); c++) {
      if (!ui.grid[qubit][c]) return c;
    }
    return 0;
  }

  // -------------------------------------------------------------
  // Roadmap Intent Detection & Execution
  // -------------------------------------------------------------

  /**
   * Returns a cleaned topic query string if the voice input is a roadmap request,
   * or null if it is not a roadmap command.
   */
  _detectRoadmapIntent(text) {
    // Patterns: "give me a roadmap for X", "create a roadmap for X",
    // "show roadmap for X", "roadmap for X", "learning path for X",
    // "how do I learn X", "what's the path to learn X", "quantum X roadmap"
    const roadmapPatterns = [
      /\b(?:give\s+me\s+a?\s*|create\s+a?\s*|generate\s+a?\s*|make\s+a?\s*|show\s+(?:me\s+)?a?\s*)roadmap\s+for\s+(.+)/i,
      /\broadmap\s+for\s+(.+)/i,
      /\b(?:give\s+me\s+a?\s*|create\s+a?\s*|generate\s+a?\s*|show\s+(?:me\s+)?)learning\s+(?:path|pathway|plan|track)\s+for\s+(.+)/i,
      /\blearning\s+(?:path|pathway|plan|track)\s+for\s+(.+)/i,
      /\bhow\s+(?:do\s+i\s+|can\s+i\s+|to\s+)learn\s+(.+)/i,
      /\bwhat(?:'s|\s+is)\s+the\s+(?:path|roadmap|way|track)\s+to\s+(?:learn\s+)?(.+)/i,
      /\bpath\s+to\s+(?:learn|master|understand)\s+(.+)/i,
      /\b(?:study\s+plan|curriculum)\s+for\s+(.+)/i,
      /\bteach\s+me\s+(.+)/i,
      /\bi\s+want\s+to\s+learn\s+(.+)/i,
    ];

    for (const pattern of roadmapPatterns) {
      const m = text.match(pattern);
      if (m && m[1]) {
        // Clean trailing filler words
        let topic = m[1]
          .replace(/\bplease\b|\bnow\b|\btoday\b|\bquickly\b|\bfast\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        // Remove trailing punctuation
        topic = topic.replace(/[.?!,]+$/, '').trim();
        if (topic.length > 1) return topic;
      }
    }
    return null;
  }

  /**
   * Handles a detected roadmap voice intent:
   * - Switches to Topic Roadmap tab
   * - Fires topic search and renders visual diagram
   * - Provides voice + visual feedback
   */
  _executeRoadmapIntent(topicQuery, rawText) {
    console.log('[QuantumVoiceCopilot] Roadmap intent detected for topic:', topicQuery);

    // 1. Visual feedback immediately
    this._setDialogueUser(rawText);
    this._setSubtitle(`Generating roadmap: "${topicQuery}"...`);
    this._updateStatus('🗺️ BUILDING ROADMAP...', 'speaking');
    this._playChime('success');

    // 2. Switch to topic-roadmap tab (not simulator)
    if (window.switchView) {
      window.switchView('topic-roadmap');
    } else if (window.switchTab) {
      window.switchTab('topic-roadmap');
    }

    // 3. Fire roadmap generation after a short delay to allow tab transition
    setTimeout(() => {
      const roadmapMgr = window.topicRoadmapManager;
      if (roadmapMgr && typeof roadmapMgr.voiceActivatedRoadmap === 'function') {
        const result = roadmapMgr.voiceActivatedRoadmap(topicQuery);
        const modulesCount = result ? result.count : 0;
        const trackName = result ? result.trackName : topicQuery;

        this._setActionFeedback(`🗺️ Roadmap generated: ${trackName} (${modulesCount} modules)`);
        this._speak(
          `Roadmap generated for ${topicQuery}. Your personalized learning path has ${modulesCount} modules. Scroll down to explore each step.`
        );
        this._setSubtitle(`Roadmap ready: "${trackName}"`);
      } else {
        // Graceful fallback: populate search and trigger manually
        const inputEl = document.getElementById('topic-user-query');
        if (inputEl) {
          inputEl.value = topicQuery;
          if (roadmapMgr) roadmapMgr.handleSearch();
        }
        this._speak(`Navigated to the Roadmap tab for "${topicQuery}". Scroll down to see your learning path.`);
        this._setActionFeedback(`🗺️ Roadmap opened for: ${topicQuery}`);
      }

      if (this.isListening) {
        this._updateStatus('🟢 LISTENING — WHAT NEXT?', 'listening');
      }
    }, 420);
  }

  // -------------------------------------------------------------
  // Dynamic Circuit Generators
  // -------------------------------------------------------------

  _buildBellVariant(variant = 'phi_plus') {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;

    if (variant === 'phi_plus' && window.loadPresetSafe) {
      window.loadPresetSafe('bell');
      this._setActionFeedback('Synthesized Bell State |Φ⁺⟩ = (|00⟩ + |11⟩)/√2.');
      this._playChime('success');
      setTimeout(() => {
        if (ui.renderCnotConnectors) ui.renderCnotConnectors();
        if (ui.bindGateTooltips) ui.bindGateTooltips();
      }, 60);
      return;
    }

    ui.clearCircuit();
    if (variant === 'phi_minus') {
      ui.placeGate('X', 0, 0);
      ui.placeGate('H', 0, 1);
      ui.grid[0][2] = 'CX_CTRL';
      ui.grid[1][2] = 'CX_TGT';
      this._setActionFeedback('Synthesized Bell State |Φ⁻⟩ = (|00⟩ - |11⟩)/√2.');
    } else if (variant === 'psi_plus') {
      ui.placeGate('X', 1, 0);
      ui.placeGate('H', 0, 0);
      ui.grid[0][1] = 'CX_CTRL';
      ui.grid[1][1] = 'CX_TGT';
      this._setActionFeedback('Synthesized Bell State |Ψ⁺⟩ = (|01⟩ + |10⟩)/√2.');
    } else {
      ui.placeGate('X', 0, 0);
      ui.placeGate('X', 1, 0);
      ui.placeGate('H', 0, 1);
      ui.grid[0][2] = 'CX_CTRL';
      ui.grid[1][2] = 'CX_TGT';
      this._setActionFeedback('Synthesized Singlet Bell State |Ψ⁻⟩ = (|01⟩ - |10⟩)/√2.');
    }

    ui.renderGrid();
    ui.updateSimulation();
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
      if (ui.bindGateTooltips) ui.bindGateTooltips();
    }, 60);
  }

  _buildDynamicGHZ(nQubits = 3) {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;

    if (nQubits === 3 && window.loadPresetSafe) {
      window.loadPresetSafe('ghz');
      this._setActionFeedback('Synthesized 3-Qubit GHZ State (|000⟩ + |111⟩)/√2.');
      this._playChime('success');
      setTimeout(() => {
        if (ui.renderCnotConnectors) ui.renderCnotConnectors();
        if (ui.bindGateTooltips) ui.bindGateTooltips();
      }, 60);
      return;
    }

    nQubits = Math.max(2, Math.min(8, nQubits));
    while (ui.numQubits < nQubits) ui.addQubit();
    while (ui.numQubits > nQubits) ui.removeQubit();

    ui.clearCircuit();
    ui.placeGate('H', 0, 0);

    for (let i = 0; i < nQubits - 1; i++) {
      const col = i + 1;
      ui.grid[i][col] = 'CX_CTRL';
      ui.grid[i + 1][col] = 'CX_TGT';
    }

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback(`Synthesized ${nQubits}-Qubit GHZ State (|00...0⟩ + |11...1⟩)/√2.`);
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
      if (ui.bindGateTooltips) ui.bindGateTooltips();
    }, 60);
  }

  _buildWState() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_TGT';
    ui.placeGate('X', 0, 2);
    ui.grid[0][3] = 'CX_CTRL';
    ui.grid[2][3] = 'CX_TGT';
    ui.placeGate('H', 2, 4);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized 3-Qubit W-State (|001⟩ + |010⟩ + |100⟩)/√3.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildTeleportation() {
    if (window.switchTab) window.switchTab('simulator');
    if (window.loadPresetSafe) {
      window.loadPresetSafe('teleport');
      this._setActionFeedback('Loaded Quantum Teleportation Protocol with EPR channel and Bell measurement.');
      this._playChime('success');
      setTimeout(() => {
        if (window.circuitUI?.renderCnotConnectors) window.circuitUI.renderCnotConnectors();
      }, 60);
      return;
    }
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    const teleportGrid = [
      ['H', null, 'CX_CTRL', 'H', 'M', null, null, null],
      [null, 'H', 'CX_TGT', null, 'CX_CTRL', 'M', null, null],
      [null, null, 'CX_TGT', null, 'CX_TGT', 'Z', 'X', null]
    ];
    ui.loadPreset(teleportGrid, 'teleport');
    this._setActionFeedback('Loaded Quantum Teleportation Protocol with EPR pair and measurement.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildSuperdenseCoding() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_TGT';
    ui.placeGate('X', 0, 2);
    ui.placeGate('Z', 0, 3);
    ui.grid[0][4] = 'CX_CTRL';
    ui.grid[1][4] = 'CX_TGT';
    ui.placeGate('H', 0, 5);
    ui.placeGate('M', 0, 6);
    ui.placeGate('M', 1, 6);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Superdense Coding Protocol (2 classical bits per 1 qubit).');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildEntanglementSwapping() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 4) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_TGT';

    ui.placeGate('H', 2, 0);
    ui.grid[2][1] = 'CX_CTRL';
    ui.grid[3][1] = 'CX_TGT';

    ui.grid[1][2] = 'CX_CTRL';
    ui.grid[2][2] = 'CX_TGT';
    ui.placeGate('H', 1, 3);
    ui.placeGate('M', 1, 4);
    ui.placeGate('M', 2, 4);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized 4-Qubit Entanglement Swapping (entangles Q0 and Q3 without direct interaction).');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildDeutschJozsa() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('X', 2, 0);
    ui.placeGate('H', 2, 1);
    ui.placeGate('H', 0, 1);
    ui.placeGate('H', 1, 1);

    ui.grid[0][2] = 'CX_CTRL';
    ui.grid[2][2] = 'CX_TGT';
    ui.grid[1][3] = 'CX_CTRL';
    ui.grid[2][3] = 'CX_TGT';

    ui.placeGate('H', 0, 4);
    ui.placeGate('H', 1, 4);
    ui.placeGate('M', 0, 5);
    ui.placeGate('M', 1, 5);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Deutsch-Jozsa Algorithm with balanced oracle.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildBernsteinVazirani() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('X', 2, 0);
    ui.placeGate('H', 2, 1);
    ui.placeGate('H', 0, 1);
    ui.placeGate('H', 1, 1);

    ui.grid[0][2] = 'CX_CTRL';
    ui.grid[2][2] = 'CX_TGT';
    ui.grid[1][3] = 'CX_CTRL';
    ui.grid[2][3] = 'CX_TGT';

    ui.placeGate('H', 0, 4);
    ui.placeGate('H', 1, 4);
    ui.placeGate('M', 0, 5);
    ui.placeGate('M', 1, 5);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Bernstein-Vazirani single-query hidden bit string algorithm.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildSimon() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 4) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.placeGate('H', 1, 0);

    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[2][1] = 'CX_TGT';
    ui.grid[1][2] = 'CX_CTRL';
    ui.grid[3][2] = 'CX_TGT';
    ui.grid[0][3] = 'CX_CTRL';
    ui.grid[3][3] = 'CX_TGT';

    ui.placeGate('H', 0, 4);
    ui.placeGate('H', 1, 4);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Simon\'s exponential speedup period-finding circuit.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildGrover() {
    if (window.switchTab) window.switchTab('simulator');
    if (window.loadPresetSafe) {
      window.loadPresetSafe('grover');
      this._setActionFeedback('Loaded Grover Quantum Search Algorithm.');
      this._playChime('success');
      setTimeout(() => {
        if (window.circuitUI?.renderCnotConnectors) window.circuitUI.renderCnotConnectors();
      }, 60);
      return;
    }
    const ui = window.circuitUI;
    if (!ui) return;
    const groverGrid = [
      ['H', 'Z', 'H', 'X', 'H', null, null, null],
      ['H', 'CX_TGT', 'H', 'X', 'H', null, null, null]
    ];
    ui.loadPreset(groverGrid, 'grover');
    this._setActionFeedback('Loaded Grover Quantum Search Algorithm.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildDynamicQFT(nQubits = 3, isInverse = false) {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;

    if (nQubits === 3 && !isInverse && window.loadPresetSafe) {
      window.loadPresetSafe('qft');
      this._setActionFeedback('Loaded Quantum Fourier Transform (QFT).');
      this._playChime('success');
      return;
    }

    nQubits = Math.max(2, Math.min(6, nQubits));
    while (ui.numQubits < nQubits) ui.addQubit();

    ui.clearCircuit();
    let col = 0;

    for (let i = 0; i < nQubits; i++) {
      ui.placeGate('H', i, col++);
      for (let j = i + 1; j < nQubits; j++) {
        const phaseGate = (j - i === 1) ? 'S' : 'T';
        ui.placeGate(phaseGate, j, col++);
      }
    }

    for (let i = 0; i < Math.floor(nQubits / 2); i++) {
      const top = i;
      const bot = nQubits - 1 - i;
      ui.grid[top][col] = 'SWAP';
      ui.grid[bot][col] = 'SWAP';
      col++;
    }

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback(`Dynamically synthesized ${nQubits}-Qubit Quantum Fourier Transform.`);
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildQPE() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.placeGate('H', 1, 0);
    ui.placeGate('X', 2, 0);
    ui.placeGate('T', 2, 1);
    ui.placeGate('S', 2, 2);
    ui.placeGate('H', 0, 3);
    ui.placeGate('S', 1, 4);
    ui.placeGate('H', 1, 5);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Quantum Phase Estimation (QPE) circuit.');
    this._playChime('success');
  }

  _buildQuantumAdder() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('X', 0, 0);
    ui.placeGate('X', 1, 0);

    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_CTRL';
    ui.grid[2][1] = 'CX_TGT';

    ui.grid[0][2] = 'CX_CTRL';
    ui.grid[1][2] = 'CX_TGT';

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Constructed Quantum Half-Adder (Sum on Q1, Carry on Q2).');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildBitFlipCode() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_TGT';
    ui.grid[0][2] = 'CX_CTRL';
    ui.grid[2][2] = 'CX_TGT';
    ui.placeGate('X', 1, 3);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized 3-Qubit Bit-Flip Repetition Error Correction Code.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildPhaseFlipCode() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'CX_TGT';
    ui.grid[0][2] = 'CX_CTRL';
    ui.grid[2][2] = 'CX_TGT';
    ui.placeGate('H', 0, 3);
    ui.placeGate('H', 1, 3);
    ui.placeGate('H', 2, 3);
    ui.placeGate('Z', 1, 4);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized 3-Qubit Phase-Flip Error Correction Code.');
    this._playChime('success');
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);
  }

  _buildSwapTest() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    while (ui.numQubits < 3) ui.addQubit();
    ui.clearCircuit();

    ui.placeGate('H', 0, 0);
    ui.placeGate('X', 1, 0);
    ui.placeGate('H', 2, 0);

    ui.grid[0][1] = 'CX_CTRL';
    ui.grid[1][1] = 'SWAP';
    ui.grid[2][1] = 'SWAP';

    ui.placeGate('H', 0, 2);
    ui.placeGate('M', 0, 3);

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback('Synthesized Quantum SWAP Test for quantum state overlap measurement.');
    this._playChime('success');
  }

  _buildQRNG() {
    if (window.switchTab) window.switchTab('simulator');
    const ui = window.circuitUI;
    if (!ui) return;
    ui.clearCircuit();

    for (let q = 0; q < ui.numQubits; q++) {
      ui.placeGate('H', q, 0);
      ui.placeGate('M', q, 1);
    }

    ui.renderGrid();
    ui.updateSimulation();
    this._setActionFeedback(`Synthesized ${ui.numQubits}-Qubit True Quantum Random Number Generator (QRNG).`);
    this._playChime('success');
  }

  _buildVQE() {
    if (window.switchTab) window.switchTab('simulator');
    if (window.loadPresetSafe) {
      window.loadPresetSafe('vqe');
      this._setActionFeedback('Loaded VQE Hardware-Efficient Ansatz.');
      this._playChime('success');
      return;
    }
    const ui = window.circuitUI;
    if (!ui) return;
    const vqeGrid = [
      ['X', 'H', 'CX_CTRL', 'H', null, null, null, null],
      [null, 'H', 'CX_TGT', 'S', null, null, null, null]
    ];
    ui.loadPreset(vqeGrid, 'vqe');
    this._setActionFeedback('Loaded VQE Hardware-Efficient Ansatz.');
    this._playChime('success');
  }

  _buildCHSH() {
    if (window.switchTab) window.switchTab('simulator');
    if (window.loadPresetSafe) {
      window.loadPresetSafe('chsh');
      this._setActionFeedback('Loaded CHSH Bell Inequality Violation Test.');
      this._playChime('success');
      return;
    }
    const ui = window.circuitUI;
    if (!ui) return;
    const chshGrid = [
      ['H', 'CX_CTRL', 'H', null, null, null, null, null],
      [null, 'CX_TGT', 'S', 'H', null, null, null, null]
    ];
    ui.loadPreset(chshGrid, 'chsh');
    this._setActionFeedback('Loaded CHSH Bell Inequality Violation Test.');
    this._playChime('success');
  }

  // -------------------------------------------------------------
  // Freeform Gate Placement & Helper Parsers
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Universal Natural Spatial Movement & Relocation Controller
  // -------------------------------------------------------------
  _parseAndMoveGate(text, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return null;

    const SPELLED_DIGITS = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8
    };
    const norm = text.split(/\s+/).map(w => SPELLED_DIGITS[w.toLowerCase()] !== undefined ? String(SPELLED_DIGITS[w.toLowerCase()]) : w).join(' ');

    // 1. Playhead / Stepper Movement ("move playhead to step 4", "move to time 3")
    if (/\b(?:playhead|timeline|stepper|time\s*machine)\b/i.test(norm) || /^(?:move|shift|go|jump)\s+(?:to|into)\s+(?:t\s*=?\s*|step\s*|col\s*)?([1-9])\b/i.test(norm)) {
      const stepMatch = norm.match(/\b(?:to|into|at)\s+(?:t\s*=?\s*|step\s*|time\s*step\s*|col\s*)?([1-9])\b/i);
      if (stepMatch && ui.seekStep) {
        const targetStep = parseInt(stepMatch[1], 10);
        ui.seekStep(targetStep);
        const msg = `Moved quantum timeline playhead to step ${targetStep} (t=${targetStep}).`;
        this._setActionFeedback(msg);
        this._playChime('success');
        if (shouldSpeak) this._speak(msg);
        return `SeekStep(${targetStep})`;
      }
    }

    // 2. Cryostat Temperature Movement ("move temperature to 20 mK", "shift temp to 10")
    if (/\b(?:temp|temperature|milli\s*kelvin|mk|cryostat)\b/i.test(norm)) {
      const tempMatch = norm.match(/\b(?:to|at|set\s*to)?\s*([0-9.]+)\s*(?:mk|milli\s*kelvin|k)?\b/i);
      if (tempMatch && window.cryoTwin) {
        const val = parseFloat(tempMatch[1]);
        window.cryoTwin.temperatureMK = val;
        const sl = document.getElementById('cryo-temp-slider');
        if (sl) sl.value = val;
        if (window.cryoTwin._updateDisplay) window.cryoTwin._updateDisplay();
        if (window.cryoTwin._renderThermalNoise) window.cryoTwin._renderThermalNoise();
        const msg = `Adjusted Cryostat dilution temperature to ${val} mK.`;
        this._setActionFeedback(msg);
        this._playChime('success');
        if (shouldSpeak) this._speak(msg);
        return `SetTemperature(${val}mK)`;
      }
    }

    // 3. Detect candidate gate
    let targetGate = this._matchSingleGate(norm);
    if (!targetGate) {
      if (/\b(?:cnot|cx|controlled\s*not)\b/i.test(norm)) targetGate = 'CNOT';
      else if (/\b(?:cz|controlled\s*z)\b/i.test(norm)) targetGate = 'CZ';
      else if (/\b(?:swap|exchange)\b/i.test(norm)) targetGate = 'SWAP';
      else if (/\b(?:toffoli|ccx)\b/i.test(norm)) targetGate = 'Toffoli';
    }

    // 4. Destination step / time column (0-indexed)
    let toCol = -1;
    const toMatch = norm.match(/\b(?:to|into|towards)\s+(?:t\s*=?\s*|time\s*step\s*|step\s*|col\s*|column\s*|slot\s*|position\s*)?([1-9])\b/i) ||
                    norm.match(/\b(?:to|into)\s+t([1-9])\b/i);
    if (toMatch) {
      toCol = parseInt(toMatch[1], 10) - 1;
    }

    // Relative movement (e.g. "shift forward 2 steps", "move right by 1")
    const relForward = norm.match(/\b(?:forward|right|ahead)\s+(?:by\s+)?([1-9])\b/i);
    const relBackward = norm.match(/\b(?:backward|left|back)\s+(?:by\s+)?([1-9])\b/i);

    // 5. Source step / time column (0-indexed)
    let fromCol = -1;
    const fromMatch = norm.match(/\b(?:from|at|source)\s+(?:t\s*=?\s*|time\s*step\s*|step\s*|col\s*|column\s*|slot\s*|position\s*)?([1-9])\b/i) ||
                      norm.match(/\b(?:t\s*=?\s*|step\s*|col\s*)([1-9])\s+(?:to|into)\b/i);
    if (fromMatch) {
      fromCol = parseInt(fromMatch[1], 10) - 1;
    }

    // 6. Qubit wires (source fromQ and destination toQ)
    let fromQ = null;
    const fromQMatch = norm.match(/\bfrom\s+(?:qubit|wire|q|line)\s*([0-7])\b/i);
    if (fromQMatch) fromQ = parseInt(fromQMatch[1], 10);

    let toQ = null;
    const toQMatch = norm.match(/\b(?:to|into|on|onto)\s+(?:qubit|wire|q|line)\s*([0-7])\b/i) ||
                     norm.match(/\b(?:qubit|wire|q|line)\s*([0-7])\b/i);
    if (toQMatch) toQ = parseInt(toQMatch[1], 10);

    // 7. Dynamic search on live circuit grid to resolve omitted coordinates
    let gateFoundOnGrid = false;
    if (fromCol === -1 || fromQ === null || !targetGate) {
      for (let q = 0; q < (ui.numQubits || 3); q++) {
        for (let c = 0; c < (ui.numCols || 6); c++) {
          const cell = ui.grid[q] ? ui.grid[q][c] : null;
          if (!cell) continue;
          if (targetGate) {
            const normCell = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
            if (normCell === targetGate || (targetGate === 'M' && cell === 'M')) {
              if (fromQ === null) fromQ = q;
              if (fromCol === -1) fromCol = c;
              gateFoundOnGrid = true;
              break;
            }
          } else if (fromQ === null || fromQ === q) {
            targetGate = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
            if (fromQ === null) fromQ = q;
            if (fromCol === -1) fromCol = c;
            gateFoundOnGrid = true;
            break;
          }
        }
        if (gateFoundOnGrid && fromCol !== -1 && fromQ !== null) break;
      }
    } else {
      // Check if source slot actually has the gate
      const cell = ui.grid[fromQ] ? ui.grid[fromQ][fromCol] : null;
      if (cell) {
        const normCell = (cell === 'CX_CTRL' || cell === 'CX_TGT') ? 'CNOT' : cell;
        if (!targetGate || normCell === targetGate) gateFoundOnGrid = true;
      }
    }

    // Relative movement resolution
    if (relForward && fromCol !== -1) {
      toCol = fromCol + parseInt(relForward[1], 10);
    } else if (relBackward && fromCol !== -1) {
      toCol = Math.max(0, fromCol - parseInt(relBackward[1], 10));
    }

    if (fromQ === null) fromQ = 0;
    if (toQ === null) toQ = fromQ;
    if (fromCol === -1) fromCol = 0;
    if (toCol === -1) toCol = (fromCol !== -1 ? fromCol : 4);
    toCol = Math.max(0, Math.min((ui.numCols || 6) - 1, toCol));

    const requestedGate = targetGate || 'T';

    while (ui.numQubits <= Math.max(fromQ, toQ) && ui.numQubits < 8) ui.addQubit();

    // If a specific gate was requested but is not present on the board to move:
    // Place it directly at the requested destination slot!
    if (targetGate && !gateFoundOnGrid) {
      ui.placeGate(requestedGate, toQ, toCol);
      const gateName = requestedGate === 'H' ? 'Hadamard' : (requestedGate === 'X' ? 'Pauli-X' : requestedGate);
      this._setActionFeedback(`Placed ${gateName} on Qubit ${toQ} at t=${toCol + 1}.`);
      this._playChime('success');
      if (shouldSpeak) this._speak(`Placed ${gateName} on qubit ${toQ} at time step ${toCol + 1}.`);
      return `Place(${requestedGate}, q${toQ}, t${toCol+1})`;
    }

    // Otherwise move existing gate
    ui.moveGate(fromQ, fromCol, toQ, toCol);
    const gateName = requestedGate === 'H' ? 'Hadamard' : (requestedGate === 'X' ? 'Pauli-X' : requestedGate);
    const locDesc = fromQ !== toQ ? `from Q${fromQ}, t=${fromCol + 1} to Q${toQ}, t=${toCol + 1}` : `on Qubit ${toQ} from t=${fromCol + 1} to t=${toCol + 1}`;
    this._setActionFeedback(`Moved ${gateName} ${locDesc}.`);
    this._playChime('success');
    if (shouldSpeak) {
      this._speak(`Moved ${gateName} ${locDesc.replace(/t=/g, 'time step ')}.`);
    }
    return `Move(${requestedGate}, ${locDesc})`;
  }

  _matchSingleGate(text) {
    if (/\b(hadamard|h\s*gate|letter\s*h|\bh\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'H';
    if (/\b(pauli\s*x|not\s*gate|bit\s*flip|x\s*gate|\bnot\b|\bx\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'X';
    if (/\b(pauli\s*y|y\s*gate|\by\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'Y';
    if (/\b(pauli\s*z|phase\s*flip|z\s*gate|\bz\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'Z';
    if (/\b(phase\s*gate|phase|\bs\s*gate\b|\bs\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'S';
    if (/\b(pi\s*over\s*8|t\s*gate|\bt\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'T';
    if (/\b(measure|measurement|meter|\bm\b(?!\s*=?\s*[0-9]))/i.test(text)) return 'M';
    return null;
  }

  _extractQubit(text) {
    const patterns = [
      { regex: /\b(?:h|x|y|z|gate)?\s*(?:not|naught)\b/i, parse: () => 0 },
      { regex: /\b(?:h0|x0|y0|z0)\b/i, parse: () => 0 },
      { regex: /\b(?:qubit|q|line|wire|register)\s*([0-7])\b/i, parse: m => parseInt(m[1], 10) },
      { regex: /\b(?:qubit|q|line|wire|register)\s*(zero|one|two|three|four|five|six|seven)\b/i, parse: m => this._extractQubitNum(m[1]) },
      { regex: /\b(first|1st)\s*(?:qubit|line|wire)?\b/i, parse: () => 0 },
      { regex: /\b(second|2nd)\s*(?:qubit|line|wire)?\b/i, parse: () => 1 },
      { regex: /\b(third|3rd)\s*(?:qubit|line|wire)?\b/i, parse: () => 2 },
      { regex: /\b(fourth|4th)\s*(?:qubit|line|wire)?\b/i, parse: () => 3 },
      { regex: /\b(?:on|at|to|in)\s*([0-7])\b/i, parse: m => parseInt(m[1], 10) },
      { regex: /\b(?:on|at|to|in)\s*(zero|one|two|three|four|five|six|seven)\b/i, parse: m => this._extractQubitNum(m[1]) },
      { regex: /\bq([0-7])\b/i, parse: m => parseInt(m[1], 10) },
      { regex: /\b(?:h|hadamard|x|y|z|s|t|m|not|measure|gate)\s*([0-7])\b/i, parse: m => parseInt(m[1], 10) },
      { regex: /\b(?:h|hadamard|x|y|z|s|t|m|not|measure|gate)\s*(zero|one|two|three|four|five|six|seven)\b/i, parse: m => this._extractQubitNum(m[1]) },
      { regex: /\b([0-7])\b/, parse: m => parseInt(m[1], 10) },
      { regex: /\b(zero|one|two|three|four|five|six|seven)\b/i, parse: m => this._extractQubitNum(m[1]) }
    ];

    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        const val = p.parse(match);
        if (val >= 0 && val < (window.circuitUI?.numQubits || 8)) return val;
      }
    }
    return 0;
  }

  _extractAllQubits(text) {
    const results = [];
    const re = /\b(?:qubit|wire|q|line)?\s*([0-7]|zero|one|two|three|four|five|six|seven)\b/gi;
    for (const m of text.matchAll(re)) {
      const preWord = text.substring(Math.max(0, m.index - 8), m.index).toLowerCase();
      if (/(?:col|step|slot|time|t\s*=?)\s*$/i.test(preWord.trim())) continue;

      const q = this._extractQubitNum(m[1]);
      if (q >= 0 && q < 8 && !results.includes(q)) {
        results.push(q);
      }
    }
    return results;
  }

  _extractColumn(text, qubit, findEmptyIfMissing = true) {
    const colMatch = text.match(/\b(?:t\s*=?\s*|time\s*step\s*|column|col|slot|step)\s*([1-9]\d*)\b/i);
    if (colMatch) {
      return Math.max(0, parseInt(colMatch[1], 10) - 1);
    }
    const atMatch = text.match(/\b(?:at|on|in)\s+(?:slot|step|col|t)?\s*([1-9])\b/i);
    if (atMatch) {
      return Math.max(0, parseInt(atMatch[1], 10) - 1);
    }
    if (!findEmptyIfMissing) return -1;
    return this._findNextCol(qubit);
  }

  _findNextCol(qubit) {
    const ui = window.circuitUI;
    if (ui && ui.grid && ui.grid[qubit]) {
      for (let c = 0; c < ui.numCols; c++) {
        if (!ui.grid[qubit][c]) return c;
      }
    }
    return 0;
  }

  _extractQubitNum(word) {
    if (!word) return 0;
    const w = word.toLowerCase();
    if (/\b(zero|0|first|1st|q0)\b/.test(w)) return 0;
    if (/\b(one|1|second|2nd|q1)\b/.test(w)) return 1;
    if (/\b(two|2|third|3rd|q2)\b/.test(w)) return 2;
    if (/\b(three|3|fourth|4th|q3)\b/.test(w)) return 3;
    if (/\b(four|4|fifth|5th|q4)\b/.test(w)) return 4;
    if (/\b(five|5|sixth|6th|q5)\b/.test(w)) return 5;
    if (/\b(six|6|seventh|7th|q6)\b/.test(w)) return 6;
    if (/\b(seven|7|eighth|8th|q7)\b/.test(w)) return 7;
    const m = w.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  _placeSingleGate(gateName, qubit, col, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return;

    ui.placeGate(gateName, qubit, col);
    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);

    const gateFullNames = {
      H: 'Hadamard (H)',
      X: 'Pauli-X (Bit-flip)',
      Y: 'Pauli-Y',
      Z: 'Pauli-Z (Phase-flip)',
      S: 'Phase Gate (S)',
      T: 'T-Gate (π/8)',
      M: 'Measurement'
    };

    const name = gateFullNames[gateName] || gateName;
    this._setActionFeedback(`Placed ${name} on Qubit ${qubit} (Col ${col + 1}).`);
    this._playChime('success');
    if (shouldSpeak) {
      if (gateName === 'M') {
        this._speak(`Placed measurement on qubit ${qubit}. Should we run simulation, or add more gates?`);
      } else {
        this._speak(`Placed ${name} on qubit ${qubit}. What gate should I add next?`);
      }
    }
  }

  _parseAndPlaceCNOT(text, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return null;

    let ctrlQ = 0;
    let tgtQ = 1;

    // Check explicit control and target words if present
    const ctrlMatch = text.match(/(?:control|ctrl|from)\s*(?:qubit|q|line|wire)?\s*([0-7]|zero|one|two|three|four|five|six|seven)\b/i);
    const tgtMatch = text.match(/(?:target|tgt|to)\s*(?:qubit|q|line|wire)?\s*([0-7]|zero|one|two|three|four|five|six|seven)\b/i);

    if (ctrlMatch && tgtMatch) {
      ctrlQ = this._extractQubitNum(ctrlMatch[1]);
      tgtQ = this._extractQubitNum(tgtMatch[1]);
    } else {
      const nums = [];
      const numMatches = text.matchAll(/\b([0-7]|zero|one|two|three|four|five|six|seven|first|second|third|fourth|fifth|sixth|seventh)\b/gi);
      for (const m of numMatches) {
        const val = this._extractQubitNum(m[1]);
        if (val >= 0 && val < ui.numQubits) {
          nums.push(val);
        }
      }
      if (nums.length >= 2) {
        ctrlQ = nums[0];
        tgtQ = nums[1];
      } else if (nums.length === 1) {
        ctrlQ = nums[0];
        tgtQ = (ctrlQ + 1) % ui.numQubits;
      }
    }

    // Guard against self-targeting CNOT
    if (ctrlQ === tgtQ) {
      tgtQ = (ctrlQ + 1) % ui.numQubits;
    }

    let col = -1;
    const explicitCol = this._extractColumn(text, ctrlQ, false);
    if (explicitCol !== -1) {
      col = explicitCol;
    } else {
      for (let c = 0; c < ui.numCols; c++) {
        if (!ui.grid[ctrlQ][c] && !ui.grid[tgtQ][c]) {
          col = c;
          break;
        }
      }
    }
    if (col === -1) col = 0;

    ui.grid[ctrlQ][col] = 'CX_CTRL';
    ui.grid[tgtQ][col] = 'CX_TGT';
    ui.renderGrid();
    ui.updateSimulation();

    setTimeout(() => {
      if (ui.renderCnotConnectors) ui.renderCnotConnectors();
    }, 60);

    const slot1 = document.getElementById(`slot-${ctrlQ}-${col}`);
    const slot2 = document.getElementById(`slot-${tgtQ}-${col}`);
    if (slot1) slot1.classList.add('gate-shockwave');
    if (slot2) slot2.classList.add('gate-shockwave');
    setTimeout(() => {
      if (slot1) slot1.classList.remove('gate-shockwave');
      if (slot2) slot2.classList.remove('gate-shockwave');
    }, 600);

    this._setActionFeedback(`Wired CNOT: Control Q${ctrlQ} ➔ Target Q${tgtQ} (Col ${col + 1}).`);
    this._playChime('success');
    if (shouldSpeak) this._speak(`Wired CNOT from control qubit ${ctrlQ} to target qubit ${tgtQ}. What gate should I add next?`);
    return `CNOT(q${ctrlQ}➔q${tgtQ})`;
  }

  _parseAndPlaceSWAP(text, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return null;
    const nums = [];
    const numMatches = text.matchAll(/\b([0-7]|zero|one|two|three|four|five|six|seven|first|second|third|fourth|fifth|sixth|seventh)\b/gi);
    for (const m of numMatches) {
      const val = this._extractQubitNum(m[1]);
      if (val >= 0 && val < ui.numQubits) nums.push(val);
    }
    const q1 = nums[0] !== undefined ? nums[0] : 0;
    const q2 = nums[1] !== undefined ? nums[1] : 1;

    let col = -1;
    for (let c = 0; c < ui.numCols; c++) {
      if (!ui.grid[q1][c] && !ui.grid[q2][c]) {
        col = c;
        break;
      }
    }
    if (col === -1) col = 0;

    ui.grid[q1][col] = 'SWAP';
    ui.grid[q2][col] = 'SWAP';
    ui.renderGrid();
    ui.updateSimulation();

    this._setActionFeedback(`Placed SWAP between Qubit ${q1} and Qubit ${q2}.`);
    this._playChime('success');
    if (shouldSpeak) this._speak(`Placed SWAP between qubit ${q1} and qubit ${q2}. What is our next step?`);
    return `SWAP(q${q1}, q${q2})`;
  }

  _parseAndPlaceToffoli(text, shouldSpeak = true) {
    const ui = window.circuitUI;
    if (!ui) return null;
    while (ui.numQubits < 3) ui.addQubit();

    let col = -1;
    for (let c = 0; c < ui.numCols; c++) {
      if (!ui.grid[0][c] && !ui.grid[1][c] && !ui.grid[2][c]) {
        col = c;
        break;
      }
    }
    if (col === -1) col = 0;

    ui.grid[0][col] = 'CX_CTRL';
    ui.grid[1][col] = 'CX_CTRL';
    ui.grid[2][col] = 'CX_TGT';
    ui.renderGrid();
    ui.updateSimulation();

    this._setActionFeedback('Constructed 3-Qubit Toffoli (CCX) gate on Q0, Q1, Q2.');
    this._playChime('success');
    if (shouldSpeak) this._speak('Added Toffoli gate on qubits 0, 1, and 2. What would you like to build next?');
    return 'Toffoli(CCX)';
  }
}

// Immediately instantiate and attach globally
window.QuantumVoiceCopilot = QuantumVoiceCopilot;
if (!window.quantumVoiceCopilot) {
  window.quantumVoiceCopilot = new QuantumVoiceCopilot();
}
document.addEventListener('DOMContentLoaded', () => {
  if (!window.quantumVoiceCopilot) {
    window.quantumVoiceCopilot = new QuantumVoiceCopilot();
  }
});
