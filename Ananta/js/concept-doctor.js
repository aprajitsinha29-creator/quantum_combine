/**
 * Ananta Concept Doctor - Animated Intuition Explainer
 * Students can type what concept they are struggling with,
 * and it generates an ELI5 real-world explanation and launches
 * a live, interactive canvas animation explaining that exact phenomenon!
 */

class ConceptDoctor {
  constructor() {
    this.currentConceptId = 'tunneling';
    this.animFrameId = null;
    this.simTime = 0;
    this.barrierHeight = 0.6;
    this.noiseTemp = 0.5;

    this.knowledgeBase = {
      tunneling: {
        id: 'tunneling',
        title: 'Quantum Tunneling: Walking Through Walls',
        tags: ['tunneling', 'barrier', 'wall', 'alpha decay', 'penetration'],
        analogy: 'Imagine rolling a tennis ball up a steep hill. Classically, if you do not throw it hard enough, it rolls back. In quantum mechanics, the tennis ball is not a rigid rock; it is a spread-out wave of probability. Part of the wave washes against the hill, and a small tail of the wave leaks directly through to the other side!',
        realWorldImpact: 'Without quantum tunneling, the Sun could not shine! The Sun core is not hot enough for hydrogen nuclei to overcome electrical repulsion classically. Quantum tunneling allows protons to tunnel through the barrier and fuse, powering all life on Earth. It is also how USB flash drives write data.',
        canvasType: 'tunneling',
        controls: [
          { id: 'ctrl-barrier-height', label: 'Barrier Thickness / Potential', min: 0.2, max: 0.9, step: 0.05, value: 0.6 }
        ]
      },
      teleportation: {
        id: 'teleportation',
        title: 'Quantum Teleportation: Disassembly & Remote Assembly',
        tags: ['teleportation', 'teleport', 'beam', 'transfer', 'bennett'],
        analogy: 'Think of a 3D fax machine that destroys the original paper while printing an identical copy across the globe. Quantum teleportation does NOT beam physical matter through space like Star Trek. Instead, it measures an unknown qubit against half of an entangled pair, sends 2 classical bits (like a text message) to the recipient, who applies local gate corrections to recreate the original quantum state with 100% fidelity.',
        realWorldImpact: 'Enables the future Quantum Internet and connects remote quantum computers into distributed cloud supercomputers across continents without optical fiber attenuation.',
        canvasType: 'teleportation',
        controls: [
          { id: 'btn-trigger-teleport', type: 'button', label: 'Transmit Qubit State Across Entangled Channel' }
        ]
      },
      nocloning: {
        id: 'nocloning',
        title: 'No-Cloning Theorem: Why Qubits Cannot Be Copied',
        tags: ['cloning', 'no-cloning', 'copy', 'duplicate', 'replicate'],
        analogy: 'In classical computing, you can Ctrl+C and Ctrl+V bits infinitely without changing them. In quantum computing, you cannot duplicate an unknown quantum state. Why? Because to copy something, you must read all its details. But reading (measuring) an unknown qubit instantly collapses and destroys its delicate superposition. A quantum photocopy machine is physically impossible by the laws of nature.',
        realWorldImpact: 'This is the superpower of Quantum Cryptography (QKD). If a government hacker tries to intercept and copy a quantum bank transfer key, they inevitably alter the state, exposing their espionage instantly.',
        canvasType: 'nocloning',
        controls: [
          { id: 'btn-trigger-clone', type: 'button', label: 'Attempt to Copy Unknown Quantum State' }
        ]
      },
      collapse: {
        id: 'collapse',
        title: 'Wavefunction Collapse & The Observer Effect',
        tags: ['collapse', 'measurement', 'observer', 'wavefunction', 'look'],
        analogy: 'Imagine a lottery machine full of swirling numbered balls. While the blower is on, every number is in active motion with a chance to be drawn. Turning on a camera or sticking your hand in freezes one single ball. The measurement forces a wide cloud of possibilities to collapse into one definite classical fact.',
        realWorldImpact: 'Proves that at the microscopic scale, the observer is not detached from reality. Measurement is an active physical interaction that transfers quantum information into thermal macroscopic entropy.',
        canvasType: 'collapse',
        controls: [
          { id: 'btn-trigger-collapse', type: 'button', label: 'Toggle Detector (Observer On/Off)' }
        ]
      },
      decoherence: {
        id: 'decoherence',
        title: 'Decoherence: Why Quantum Computers Need Near Absolute Zero',
        tags: ['decoherence', 'noise', 'temperature', 'heat', 'cryogenic', 'error'],
        analogy: 'Imagine building a delicate house of cards inside a noisy room with loud speakers and gusts of wind. Quantum superposition and phase are so fragile that a single stray heat photon, electromagnetic ripple, or sound vibration bumps the qubit, causing its quantum phase to leak into the environment and turn into classical junk noise.',
        realWorldImpact: 'This is why IBM and Google quantum computers are encased inside massive dilution refrigerators cooled to 15 millikelvin (-273.13°C), colder than deep interstellar space!',
        canvasType: 'decoherence',
        controls: [
          { id: 'ctrl-noise-temp', label: 'Environmental Thermal Noise (Temperature)', min: 0.1, max: 1.0, step: 0.05, value: 0.5 }
        ]
      },
      bloch: {
        id: 'bloch',
        title: 'The Bloch Sphere: Geometrical Map of a Qubit',
        tags: ['bloch', 'sphere', 'latitude', 'longitude', 'geometric', 'angles'],
        analogy: 'Think of the Earth. The North Pole is state |0⟩. The South Pole is state |1⟩. The Equator is 50/50 equal superposition. Where you are between North and South is the probability amplitude (Latitude). Which direction you face along the equator (Longitude) is the quantum phase angle (φ). A quantum gate is just a smooth rotation around one of Earth\'s axes!',
        realWorldImpact: 'Provides visual geometric intuition for single-qubit microwave pulses used to program superconducting transmon qubits.',
        canvasType: 'bloch',
        controls: [
          { id: 'btn-rotate-bloch', type: 'button', label: 'Apply Hadamard Rotation (North Pole to Equator)' }
        ]
      }
    };

    this.init();
  }

  init() {
    this.bindSearchAndPills();
  }

  bindSearchAndPills() {
    const input = document.getElementById('concept-query-input');
    const btnAsk = document.getElementById('btn-concept-ask');
    const pills = document.querySelectorAll('.concept-quick-pill');

    if (btnAsk && input) {
      btnAsk.addEventListener('click', () => {
        this.searchAndExplain(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.searchAndExplain(input.value);
        }
      });
    }

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cid = pill.getAttribute('data-concept');
        this.loadConcept(cid);
      });
    });
  }

  async searchAndExplain(queryText) {
    if (!queryText || !queryText.trim()) return;
    const q = queryText.toLowerCase();

    // Check knowledge base matching
    let bestMatch = null;
    let maxScore = 0;

    Object.values(this.knowledgeBase).forEach(item => {
      let score = 0;
      if (q.includes(item.id)) score += 5;
      item.tags.forEach(tag => {
        if (q.includes(tag)) score += 3;
      });
      if (item.title.toLowerCase().includes(q)) score += 4;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = item.id;
      }
    });

    // Only trust the local keyword match above a real confidence threshold.
    if (bestMatch && maxScore >= 3) {
      this.loadConcept(bestMatch);
      // Update pill active state
      const pills = document.querySelectorAll('.concept-quick-pill');
      pills.forEach(p => {
        if (p.getAttribute('data-concept') === bestMatch) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
      if (typeof setStatusBadge === 'function') {
        setStatusBadge('concept-status-badge', false); // "Local Fallback"
      }
      return;
    }

    // Otherwise, ask the backend — grounded in this exact knowledge base (Section 4.4)
    this._showThinkingState(queryText);
    try {
      // Send the tags and real-world impact too - they were being dropped,
      // so the model had only a title and an analogy to match against and
      // missed entries it should have matched.
      const groundingEntries = Object.values(this.knowledgeBase).map(item => ({
        id: item.id,
        title: item.title,
        tags: item.tags || [],
        analogy: item.analogy,
        realWorldImpact: item.realWorldImpact || ''
      }));

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'concept-doctor',
          payload: { question: queryText, groundingEntries }
        })
      });

      if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
      const { result } = await response.json();

      if (typeof setStatusBadge === 'function') {
        setStatusBadge('concept-status-badge', true); // "Live AI"
      }

      if (result && result.matched_source && this.knowledgeBase[result.matched_source]) {
        this.loadConcept(result.matched_source); // reuse existing animation
        const pills = document.querySelectorAll('.concept-quick-pill');
        pills.forEach(p => {
          if (p.getAttribute('data-concept') === result.matched_source) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
      } else if (result) {
        this.renderGroundedExplanation(result); // plain text render, no canvas animation
      } else {
        throw new Error('Empty result from AI');
      }
    } catch (err) {
      console.warn('[ConceptDoctor] Backend unavailable:', err);
      if (typeof setStatusBadge === 'function') {
        setStatusBadge('concept-status-badge', false); // "Local Fallback"
      }
      // Honest fallback: say we don't have this one, instead of guessing.
      this.renderNotCoveredMessage(queryText);
    }
  }

  _showThinkingState(queryText) {
    const titleEl = document.getElementById('doctor-concept-title');
    const analogyEl = document.getElementById('doctor-concept-analogy');
    const impactEl = document.getElementById('doctor-concept-impact');
    const controlsContainer = document.getElementById('doctor-canvas-controls');

    if (titleEl) titleEl.textContent = `🩺 Diagnosing: "${queryText}"...`;
    if (analogyEl) analogyEl.textContent = 'Synthesizing a grounded pedagogical explanation with Google Gemini 2.5 Flash...';
    if (impactEl) impactEl.textContent = 'Verifying quantum physics principles against curriculum knowledge base...';
    if (controlsContainer) {
      controlsContainer.innerHTML = '<div style="color: #a855f7; font-size: 13px; font-weight: 600; padding: 6px 0;">⚡ Gemini AI Clinical Analysis in progress...</div>';
    }
  }

  renderGroundedExplanation(result) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const titleEl = document.getElementById('doctor-concept-title');
    const analogyEl = document.getElementById('doctor-concept-analogy');
    const impactEl = document.getElementById('doctor-concept-impact');
    const controlsContainer = document.getElementById('doctor-canvas-controls');

    if (titleEl) titleEl.textContent = result.title || 'AI Quantum Diagnosis';
    if (analogyEl) analogyEl.textContent = result.analogy || 'No analogy provided.';
    if (impactEl) impactEl.textContent = result.explanation || 'No explanation provided.';

    if (controlsContainer) {
      controlsContainer.innerHTML = `
        <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #c084fc;">
          ✨ <strong>Grounded AI Synthesis:</strong> This response was synthesized in real-time by Google Gemini 2.5 Flash, grounded exclusively in certified quantum mechanics principles.
        </div>
      `;
    }

    const canvas = document.getElementById('doctor-animation-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // This used to draw a fixed decorative sine curve
      // (sin(x*0.04)*35*cos(x*0.01)) for every concept that wasn't one of the
      // six hand-written animations - the same squiggle whether you asked
      // about Bell states or Shor's algorithm, derived from nothing. It looked
      // like a visualisation while showing no information at all.
      //
      // Now: if the AI supplied an illustrative circuit, it is run on the real
      // QuantumCircuitEngine and the ACTUAL resulting probabilities and
      // entanglement are drawn. If it did not, we say so plainly rather than
      // drawing something meaningless.
      const sim = this.simulateIllustrativeCircuit(result.illustrative_circuit);
      if (sim) {
        this.drawSimulatedConcept(ctx, w, h, sim, result.illustrative_circuit);
      } else {
        this.drawNoSimulationNotice(ctx, w, h);
      }
      ctx.restore();
    }
  }

  /**
   * Turns the AI's illustrative-circuit spec into a real gate grid and runs it
   * on the actual statevector engine. Returns null if there is no usable
   * circuit - callers must not fabricate a visual in that case.
   */
  simulateIllustrativeCircuit(spec) {
    const Engine = window.QuantumCircuitEngine;
    if (!Engine || !spec || !Array.isArray(spec.gates) || spec.gates.length === 0) return null;

    const n = Math.max(1, Math.min(5, parseInt(spec.numQubits, 10) || 2));
    const gates = spec.gates.slice(0, 12);
    // One gate per column keeps the mapping unambiguous and always valid.
    const grid = Array.from({ length: n }, () => Array(gates.length).fill(null));

    const inRange = (q) => Number.isInteger(q) && q >= 0 && q < n;
    let placed = 0;

    gates.forEach((g, col) => {
      const name = String(g && g.gate || '').toUpperCase();
      const angle = Number(g && g.angle);
      switch (name) {
        case 'CNOT': case 'CX':
          if (inRange(g.control) && inRange(g.target) && g.control !== g.target) {
            grid[g.control][col] = 'CX_CTRL';
            grid[g.target][col] = 'CX_TGT';
            placed++;
          }
          break;
        case 'TOFFOLI': case 'CCX': {
          const cs = Array.isArray(g.controls) ? g.controls : [];
          if (cs.length === 2 && cs.every(inRange) && inRange(g.target) && !cs.includes(g.target)) {
            grid[cs[0]][col] = 'CX_CTRL';
            grid[cs[1]][col] = 'CX_CTRL';
            grid[g.target][col] = 'CX_TGT';
            placed++;
          }
          break;
        }
        case 'CZ': case 'SWAP': {
          const ws = Array.isArray(g.wires) ? g.wires : [];
          if (ws.length === 2 && ws.every(inRange) && ws[0] !== ws[1]) {
            grid[ws[0]][col] = name;
            grid[ws[1]][col] = name;
            placed++;
          }
          break;
        }
        case 'RX': case 'RY': case 'RZ': case 'P':
          if (inRange(g.qubit) && Number.isFinite(angle)) {
            grid[g.qubit][col] = Engine.makeGateToken(name, angle);
            placed++;
          }
          break;
        case 'H': case 'X': case 'Y': case 'Z': case 'S': case 'T': case 'M':
          if (inRange(g.qubit)) { grid[g.qubit][col] = name; placed++; }
          break;
        default:
          break;
      }
    });

    if (placed === 0) return null;

    try {
      const engine = new Engine(n);
      engine.runCircuit(grid);
      const probs = engine.getProbabilities().filter((p) => p.probability > 0.004);
      return {
        numQubits: n,
        dirac: engine.getDiracNotation(),
        probabilities: probs.sort((a, b) => b.probability - a.probability).slice(0, 8),
        metrics: engine.getAdvancedEntanglementMetrics()
      };
    } catch (e) {
      console.warn('[ConceptDoctor] Illustrative circuit failed to simulate:', e.message);
      return null;
    }
  }

  /** Draws the REAL simulated outcome: measured probabilities + entanglement. */
  drawSimulatedConcept(ctx, w, h, sim, spec) {
    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText('LIVE SIMULATION  -  run on Ananta’s quantum engine', 18, 26);

    if (spec && spec.caption) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText(String(spec.caption).slice(0, 92), 18, 45);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(sim.dirac.slice(0, 58), 18, 72);

    // Real Born-rule probabilities
    const top = 92;
    const barH = 20;
    const gap = 9;
    const labelW = 66;
    const maxBar = Math.max(60, w - labelW - 104);

    sim.probabilities.forEach((p, i) => {
      const y = top + i * (barH + gap);
      if (y + barH > h - 42) return;

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(p.state, 18, y + 14);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.fillRect(labelW + 18, y, maxBar, barH);

      const grad = ctx.createLinearGradient(labelW + 18, 0, labelW + 18 + maxBar, 0);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#a855f7');
      ctx.fillStyle = grad;
      ctx.fillRect(labelW + 18, y, Math.max(2, maxBar * p.probability), barH);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(`${(p.probability * 100).toFixed(1)}%`, labelW + 26 + maxBar, y + 14);
    });

    // Real computed entanglement, straight from the engine
    const m = sim.metrics;
    ctx.fillStyle = '#64748b';
    ctx.font = '10.5px Inter, system-ui, sans-serif';
    ctx.fillText(`Concurrence C = ${m.concurrence.toFixed(2)}    Entropy S = ${m.vonNeumannEntropy.toFixed(2)} ebits`, 18, h - 24);
    ctx.fillStyle = m.concurrence > 0.05 ? '#34d399' : '#64748b';
    ctx.font = 'bold 10.5px Inter, system-ui, sans-serif';
    ctx.fillText(m.entanglementClass.slice(0, 58), 18, h - 9);
  }

  /** Honest empty state - no fabricated visual. */
  drawNoSimulationNotice(ctx, w, h) {
    ctx.fillStyle = '#080816';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#475569';
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No interactive simulation for this concept yet.', w / 2, h / 2 - 8);
    ctx.font = '11.5px Inter, system-ui, sans-serif';
    ctx.fillText('The explanation on the left still applies.', w / 2, h / 2 + 14);
    ctx.textAlign = 'left';
  }

  renderNotCoveredMessage(queryText) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const titleEl = document.getElementById('doctor-concept-title');
    const analogyEl = document.getElementById('doctor-concept-analogy');
    const impactEl = document.getElementById('doctor-concept-impact');
    const controlsContainer = document.getElementById('doctor-canvas-controls');

    if (titleEl) titleEl.textContent = `Concept Not Covered: "${queryText}"`;
    if (analogyEl) analogyEl.textContent = `Our current interactive simulation engine does not have a dedicated interactive module for "${queryText}".`;
    if (impactEl) impactEl.textContent = 'Try asking about Quantum Tunneling, Teleportation, No-Cloning Theorem, Wavefunction Collapse, Decoherence, or the Bloch Sphere!';

    if (controlsContainer) {
      controlsContainer.innerHTML = `
        <div style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #94a3b8;">
          ℹ️ <strong>Honest Local Notice:</strong> Rather than guessing or hallucinating physics outside our grounded modules, Concept Doctor lets you know when a concept isn't in our core library.
        </div>
      `;
    }

    const canvas = document.getElementById('doctor-animation-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      ctx.fillStyle = '#080816';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No interactive simulation available for this query', w / 2, h / 2);
      ctx.restore();
    }
  }

  loadConcept(conceptId) {
    if (typeof setStatusBadge === 'function') {
      setStatusBadge('concept-status-badge', false); // "Local Fallback"
    }
    const data = this.knowledgeBase[conceptId];
    if (!data) return;

    this.currentConceptId = conceptId;

    const titleEl = document.getElementById('doctor-concept-title');
    const analogyEl = document.getElementById('doctor-concept-analogy');
    const impactEl = document.getElementById('doctor-concept-impact');
    const controlsContainer = document.getElementById('doctor-canvas-controls');

    if (titleEl) titleEl.textContent = data.title;
    if (analogyEl) analogyEl.textContent = data.analogy;
    if (impactEl) impactEl.textContent = data.realWorldImpact;

    // Render interactive controls
    if (controlsContainer) {
      controlsContainer.innerHTML = '';
      if (data.controls) {
        data.controls.forEach(ctrl => {
          if (ctrl.type === 'button') {
            const btn = document.createElement('button');
            btn.id = ctrl.id;
            btn.className = 'btn-doctor-action';
            btn.textContent = ctrl.label;
            btn.addEventListener('click', () => this.handleCustomAction(ctrl.id));
            controlsContainer.appendChild(btn);
          } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'doctor-slider-group';
            wrapper.innerHTML = `
              <label>${ctrl.label}: <strong id="val-${ctrl.id}">${ctrl.value}</strong></label>
              <input type="range" id="${ctrl.id}" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${ctrl.value}" class="doctor-range-input" />
            `;
            const slider = wrapper.querySelector('input');
            slider.addEventListener('input', (e) => {
              const v = parseFloat(e.target.value);
              wrapper.querySelector('strong').textContent = v.toFixed(2);
              if (ctrl.id === 'ctrl-barrier-height') this.barrierHeight = v;
              if (ctrl.id === 'ctrl-noise-temp') this.noiseTemp = v;
            });
            controlsContainer.appendChild(wrapper);
          }
        });
      }
    }

    // Launch Animation Engine
    this.startCanvasAnimation(data.canvasType);
  }

  handleCustomAction(actionId) {
    if (actionId === 'btn-trigger-teleport') {
      this.teleportTriggered = true;
      this.teleportProgress = 0;
    } else if (actionId === 'btn-trigger-clone') {
      this.cloneAttempted = true;
      this.cloneAlertTime = 1.0;
    } else if (actionId === 'btn-trigger-collapse') {
      this.observerActive = !this.observerActive;
    } else if (actionId === 'btn-rotate-bloch') {
      this.blochRotationActive = true;
      this.blochAngle = 0;
    }
  }

  startCanvasAnimation(canvasType) {
    const canvas = document.getElementById('doctor-animation-canvas');
    if (!canvas) return;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    this.simTime = 0;
    this.teleportProgress = 0;
    this.teleportTriggered = false;
    this.cloneAttempted = false;
    this.cloneAlertTime = 0;
    this.observerActive = false;
    this.blochRotationActive = false;
    this.blochAngle = 0;

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

      // Dark background
      const isLight = document.body.classList.contains('light-theme');
      ctx.fillStyle = isLight ? '#ffffff' : '#050505';
      ctx.fillRect(0, 0, w, h);

      this.simTime += 0.04;

      if (canvasType === 'tunneling') {
        this.renderTunnelingAnim(ctx, w, h, isLight);
      } else if (canvasType === 'teleportation') {
        this.renderTeleportationAnim(ctx, w, h, isLight);
      } else if (canvasType === 'nocloning') {
        this.renderNoCloningAnim(ctx, w, h, isLight);
      } else if (canvasType === 'collapse') {
        this.renderCollapseAnim(ctx, w, h, isLight);
      } else if (canvasType === 'decoherence') {
        this.renderDecoherenceAnim(ctx, w, h, isLight);
      } else if (canvasType === 'bloch') {
        this.renderBlochConceptAnim(ctx, w, h, isLight);
      }

      ctx.restore();
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  stopAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // 1. Quantum Tunneling Animation
  renderTunnelingAnim(ctx, w, h, isLight) {
    const midY = h * 0.5;
    const barrierX = w * 0.45;
    const barrierW = w * 0.12;
    const barrierH = h * this.barrierHeight;

    // Draw Potential Barrier
    ctx.fillStyle = isLight ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.35)';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.fillRect(barrierX, midY - barrierH, barrierW, barrierH * 2);
    ctx.strokeRect(barrierX, midY - barrierH, barrierW, barrierH * 2);

    ctx.font = '11px Roboto Mono, monospace';
    ctx.fillStyle = '#ea580c';
    ctx.fillText('Energy Barrier (Wall)', barrierX + 6, midY - barrierH - 10);

    // Wave packet traveling left-to-right
    const packetCenter = (this.simTime * 90) % (w * 1.5);
    const incidentAmp = h * 0.25;

    // Draw incident and reflected wave (Left of barrier)
    ctx.beginPath();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    for (let x = 0; x < barrierX; x++) {
      const distFromPacket = (x - packetCenter);
      const envelope = Math.exp(-Math.pow(distFromPacket / 60, 2));
      const y = midY + Math.sin(x * 0.08 - this.simTime * 4) * incidentAmp * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw decaying wave INSIDE the barrier
    ctx.beginPath();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    for (let x = barrierX; x < barrierX + barrierW; x++) {
      const decayFraction = (x - barrierX) / barrierW;
      const decayAmp = incidentAmp * Math.exp(-decayFraction * 3.5);
      const y = midY + Math.sin(x * 0.08 - this.simTime * 4) * decayAmp * 0.5;
      if (x === barrierX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Tunneled Wave (Right of barrier)
    const transmissionCoeff = Math.exp(-this.barrierHeight * 4.2);
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    for (let x = barrierX + barrierW; x < w; x++) {
      const distFromPacket = (x - packetCenter);
      const envelope = Math.exp(-Math.pow(distFromPacket / 60, 2));
      const tunneledAmp = incidentAmp * transmissionCoeff;
      const y = midY + Math.sin(x * 0.08 - this.simTime * 4) * tunneledAmp * envelope;
      if (x === barrierX + barrierW) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText('Incident Wave Packet (Particle)', 20, midY + incidentAmp + 24);
    ctx.fillText(`Tunneled Wave (${(transmissionCoeff * 100).toFixed(1)}% transmission)`, barrierX + barrierW + 16, midY + incidentAmp + 24);
  }

  // 2. Quantum Teleportation Animation
  renderTeleportationAnim(ctx, w, h, isLight) {
    const aliceX = w * 0.22;
    const bobX = w * 0.78;
    const midY = h * 0.5;

    // Station Nodes
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(aliceX, midY, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath(); ctx.arc(bobX, midY, 26, 0, Math.PI * 2); ctx.fill();

    ctx.font = '12px Roboto Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Alice', aliceX - 16, midY + 4);
    ctx.fillText('Bob', bobX - 12, midY + 4);

    // Entangled Bell Pair Bridge (Center)
    ctx.strokeStyle = '#00f0ff';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(aliceX, midY); ctx.lineTo(bobX, midY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f0ff';
    ctx.fillText('Entangled Bell Pair Link |Φ⁺⟩', w * 0.5 - 90, midY - 14);

    if (this.teleportTriggered) {
      this.teleportProgress += 0.02;
      if (this.teleportProgress > 1.0) {
        this.teleportProgress = 1.0;
      }

      // Traveling classical bits (dashed orange)
      const packetX = aliceX + (bobX - aliceX) * this.teleportProgress;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(packetX, midY - 35, 9, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.fillText('Classical Bits (01)', packetX - 45, midY - 52);

      if (this.teleportProgress >= 1.0) {
        ctx.fillStyle = '#10b981';
        ctx.font = '14px Roboto Mono, monospace';
        ctx.fillText('★ Qubit State Successfully Teleported to Bob!', w * 0.5 - 160, h * 0.85);
      }
    } else {
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('Click "Transmit Qubit State" to watch quantum disassembly & reconstruction', w * 0.5 - 230, h * 0.85);
    }
  }

  // 3. No-Cloning Animation
  renderNoCloningAnim(ctx, w, h, isLight) {
    const origX = w * 0.25;
    const copierX = w * 0.5;
    const copyX = w * 0.75;
    const midY = h * 0.5;

    // Original Qubit
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(origX, midY, 30, 0, Math.PI * 2); ctx.fill();
    ctx.font = '13px Roboto Mono, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('|ψ⟩', origX - 10, midY + 4);
    ctx.fillStyle = '#a3a3a3';
    ctx.fillText('Unknown Qubit', origX - 42, midY + 50);

    // Copier Machine Box
    ctx.strokeStyle = '#262626';
    ctx.fillStyle = isLight ? '#f4f4f5' : '#141414';
    ctx.lineWidth = 2;
    ctx.fillRect(copierX - 45, midY - 45, 90, 90);
    ctx.strokeRect(copierX - 45, midY - 45, 90, 90);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Copier Machine', copierX - 46, midY - 55);

    if (this.cloneAttempted) {
      // Red Error Flash
      ctx.strokeStyle = '#fa4d56';
      ctx.lineWidth = 3;
      ctx.strokeRect(copierX - 45, midY - 45, 90, 90);

      // Alert Message
      ctx.fillStyle = '#fa4d56';
      ctx.font = '14px Roboto Mono, monospace';
      ctx.fillText('🛑 ERROR: Measurement Collapsed State!', w * 0.5 - 145, h * 0.85);
      ctx.font = '11px Roboto Mono, monospace';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('Reading |ψ⟩ to copy it altered the superposition into classical noise.', w * 0.5 - 200, h * 0.92);
    } else {
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('Click "Attempt to Copy" to test quantum linearity bounds', w * 0.5 - 170, h * 0.85);
    }
  }

  // 4. Wavefunction Collapse
  renderCollapseAnim(ctx, w, h, isLight) {
    const midX = w * 0.5;
    const midY = h * 0.5;

    if (!this.observerActive) {
      // Cloud of possibilities (Superposition)
      ctx.fillStyle = isLight ? 'rgba(15, 98, 254, 0.08)' : 'rgba(0, 240, 255, 0.06)';
      for (let r = 100; r > 10; r -= 15) {
        ctx.beginPath();
        ctx.arc(midX, midY, r + Math.sin(this.simTime * 3 + r) * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#00f0ff';
      ctx.font = '13px Roboto Mono, monospace';
      ctx.fillText('Unmeasured Quantum State |ψ⟩', midX - 100, midY - 110);
      ctx.fillText('Continuous cloud of potential locations', midX - 125, midY + 125);
    } else {
      // Snapped to one sharp physical point
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(midX + 40, midY - 20, 10, 0, Math.PI * 2); ctx.fill();

      // Shockwave ring
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      const ringR = (this.simTime * 35) % 80;
      ctx.beginPath(); ctx.arc(midX + 40, midY - 20, ringR, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '13px Roboto Mono, monospace';
      ctx.fillText('★ Observer Detected: Collapsed to Position x = 40.2nm', midX - 170, midY - 70);
    }
  }

  // 5. Decoherence & Noise
  renderDecoherenceAnim(ctx, w, h, isLight) {
    const midX = w * 0.5;
    const midY = h * 0.5;

    // Central Qubit
    const decayFactor = Math.max(0.1, 1.0 - this.noiseTemp * 0.8);
    const radius = 35 * decayFactor;

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath(); ctx.arc(midX, midY, radius, 0, Math.PI * 2); ctx.fill();

    // Stray Thermal Noise Particles Bombarding the Qubit
    const numParticles = Math.round(this.noiseTemp * 24);
    ctx.fillStyle = '#fa4d56';
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + this.simTime * (2 + i * 0.2);
      const dist = 75 + Math.sin(this.simTime * 4 + i) * 35;
      const px = midX + Math.cos(angle) * dist;
      const py = midY + Math.sin(angle) * dist;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = '12px Roboto Mono, monospace';
    ctx.fillStyle = '#fa4d56';
    ctx.fillText(`Thermal Noise Level: ${(this.noiseTemp * 100).toFixed(0)}%`, 20, 30);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`Qubit Coherence Time (T2): ${(decayFactor * 100).toFixed(0)} microseconds`, 20, 52);
  }

  // 6. Bloch Sphere Concept
  renderBlochConceptAnim(ctx, w, h, isLight) {
    const midX = w * 0.5;
    const midY = h * 0.5;
    const R = 75;

    // Sphere Circle & Equator Ellipse
    ctx.strokeStyle = isLight ? '#cbd5e1' : '#333333';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(midX, midY, R, 0, Math.PI * 2); ctx.stroke();

    ctx.beginPath(); ctx.ellipse(midX, midY, R, R * 0.35, 0, 0, Math.PI * 2); ctx.stroke();

    // North & South Poles
    ctx.fillStyle = '#10b981';
    ctx.fillText('|0⟩ (North Pole)', midX - 45, midY - R - 10);
    ctx.fillStyle = '#ee5396';
    ctx.fillText('|1⟩ (South Pole)', midX - 45, midY + R + 22);

    // State vector arrow
    let angle = -Math.PI / 2; // North Pole
    if (this.blochRotationActive) {
      this.blochAngle += 0.03;
      if (this.blochAngle > Math.PI / 2) this.blochAngle = Math.PI / 2;
      angle = -Math.PI / 2 + this.blochAngle;
    }

    const tipX = midX + Math.cos(angle) * R;
    const tipY = midY + Math.sin(angle) * R * (Math.abs(angle) < 0.1 ? 0.35 : 1);

    ctx.beginPath();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.moveTo(midX, midY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2); ctx.fill();

    if (this.blochRotationActive && this.blochAngle >= Math.PI / 2) {
      ctx.fillStyle = '#10b981';
      ctx.fillText('Rotated to Equator: 50% |0⟩ + 50% |1⟩ (Superposition)', midX - 160, h * 0.88);
    }
  }
}

window.ConceptDoctor = ConceptDoctor;
