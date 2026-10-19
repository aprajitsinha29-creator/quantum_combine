/**
 * Ananta Quantum Circuit Tutor & Error Doctor (SIH Problem Statement 26140)
 *
 * Grounded AI Quantum Tutor that:
 *  1. Detects circuit pathologies (self-cancelling gates, premature collapse, idle wires, ineffective CNOTs)
 *  2. Accurately explains WHAT the user is making (algorithm / state identification)
 *  3. Computes mathematical entanglement and statevector diagnostics without hallucinations
 *  4. Provides conversational tutoring and pedagogical guidance
 *  5. Operates independently from Voice Copilot so they never interrupt each other
 */

class CircuitTutor {
  constructor(circuitUI) {
    this.circuitUI = circuitUI || window.circuitUI;
    this.isLoading = false;
    this.lastAuditResult = null;
    this.autoAuditEnabled = true;
    this.auditDebounceTimer = null;

    if (typeof document !== 'undefined') {
      this.initDOM();
      this.bindEvents();
      setTimeout(() => this.runAudit(), 700);
    }
  }

  initDOM() {
    this.tutorPanel = document.getElementById('intel-tutor-panel');
    this.makingTitleEl = document.getElementById('tutor-making-title');
    this.makingDescEl = document.getElementById('tutor-making-desc');
    this.healthBadgeEl = document.getElementById('tutor-health-badge');
    this.errorsContainerEl = document.getElementById('tutor-errors-container');
    this.entanglementDescEl = document.getElementById('tutor-entanglement-desc');
    this.guidanceDescEl = document.getElementById('tutor-guidance-desc');
    this.questionInputEl = document.getElementById('tutor-question-input');
    this.btnAnalyzeEl = document.getElementById('btn-tutor-analyze');
    this.btnAskEl = document.getElementById('btn-tutor-ask');
    this.autoAuditCheckbox = document.getElementById('tutor-auto-audit-toggle');

    // Legacy / Floating references (Guarded if elements are removed)
    this.floatingDoctorBtn = document.getElementById('floating-ai-doctor-btn');
    this.floatingDoctorPopup = document.getElementById('floating-ai-doctor-popup');
    this.floatingDoctorContent = document.getElementById('floating-doctor-content');
    this.floatingDoctorPill = document.getElementById('floating-doctor-health-pill');
    this.floatingDoctorInput = document.getElementById('floating-doctor-input');
    this.doctorCountBadge = document.getElementById('doctor-count-badge');
    this.doctorPulseDot = document.getElementById('doctor-pulse-dot');
  }

  bindEvents() {
    if (this.btnAnalyzeEl) {
      this.btnAnalyzeEl.addEventListener('click', () => this.runAudit());
    }

    if (this.btnAskEl && this.questionInputEl) {
      this.btnAskEl.addEventListener('click', () => this.askQuestion());
      this.questionInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.askQuestion();
      });
    }

    if (this.autoAuditCheckbox) {
      this.autoAuditCheckbox.addEventListener('change', (e) => {
        this.autoAuditEnabled = e.target.checked;
      });
    }
  }

  /**
   * Called by CircuitUI whenever gates change.
   * Debounces audit so fast edits don't spam the backend.
   */
  onCircuitChanged() {
    if (!this.autoAuditEnabled) return;
    clearTimeout(this.auditDebounceTimer);
    this.auditDebounceTimer = setTimeout(() => {
      this.runAudit();
    }, 600);
  }

  togglePanel() {
    this.toggleFloatingDoctor();
  }

  toggleFloatingDoctor() {
    if (window.circuitUI && typeof window.circuitUI.openAiTutor === 'function') {
      window.circuitUI.openAiTutor();
    } else {
      this.runAudit();
    }
  }

  openFloatingDoctor() {
    if (window.circuitUI && typeof window.circuitUI.openAiTutor === 'function') {
      window.circuitUI.openAiTutor();
    }
    this.runAudit();
  }

  closeFloatingDoctor() {
    if (this.floatingDoctorPopup) {
      this.floatingDoctorPopup.style.display = 'none';
    }
  }

  minimizeFloatingDoctor() {
    if (this.floatingDoctorPopup) {
      this.floatingDoctorPopup.classList.toggle('minimized');
    }
  }

  askFloatingQuestion() {
    if (!this.floatingDoctorInput) this.initDOM();
    if (!this.floatingDoctorInput) return;
    const q = this.floatingDoctorInput.value.trim();
    if (!q) return;
    this.floatingDoctorInput.value = '';
    this.runAudit(q);
  }

  /**
   * Deterministic Static Analysis of the Circuit Grid
   * 100% mathematical certainty, 0% hallucination.
   */
  detectDeterministicErrors(grid) {
    if (!grid || !grid.length) return [];
    const numQubits = grid.length;
    const numCols = grid[0].length;
    const errors = [];

    // Collect all gates placed
    const allGates = [];
    for (let q = 0; q < numQubits; q++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[q][c];
        if (cell && cell !== '') {
          allGates.push({ qubit: q, col: c, gate: cell });
        }
      }
    }

    // 1. Premature Measurement (gates placed after Measurement 'M')
    for (let q = 0; q < numQubits; q++) {
      let measureCol = -1;
      for (let c = 0; c < numCols; c++) {
        const cell = grid[q][c];
        if (cell === 'M' || cell === 'MEASURE') {
          measureCol = c;
        } else if (measureCol !== -1 && cell && cell !== '') {
          errors.push({
            type: 'error',
            errorType: 'premature_measurement',
            qubit: q,
            measureCol: measureCol,
            gateCol: c,
            gate: cell,
            title: `Premature Measurement on Wire q[${q}]`,
            location: `Wire q[${q}], column t=${c + 1}`,
            desc: `Qubit q[${q}] was measured at t=${measureCol + 1}, but gate '${cell}' was placed afterward at t=${c + 1}. Projective Born measurement irreversibly collapses the superposition into a classical bit, destroying quantum advantage.`,
            fix: `Move the Measure gate to the end of wire q[${q}] or remove intermediate measurements.`
          });
        }
      }
    }

    // 2. Self-Inverse Gate Redundancy (U² = I)
    const selfInv = ['H', 'X', 'Y', 'Z'];
    for (let q = 0; q < numQubits; q++) {
      let lastG = null;
      let lastC = -1;
      for (let c = 0; c < numCols; c++) {
        const cell = grid[q][c];
        if (!cell || cell === '') continue;
        if (cell === 'CX_CTRL' || cell === 'CX_TGT' || cell === 'SWAP') {
          lastG = null;
          continue;
        }
        if (selfInv.includes(cell)) {
          if (lastG === cell) {
            errors.push({
              type: 'warning',
              errorType: 'self_inverse',
              qubit: q,
              cols: [lastC, c],
              gate: cell,
              title: `Self-Cancelling Redundancy (${cell}² = I) on Wire q[${q}]`,
              location: `Wire q[${q}], columns t=${lastC + 1} and t=${c + 1}`,
              desc: `Consecutive '${cell}' gates on wire q[${q}] undo each other identically (${cell} · ${cell} = I). This adds unneeded circuit depth and burns qubit coherence time without changing the output state.`,
              fix: `Delete both duplicate '${cell}' gates to shorten circuit depth and preserve T₁ coherence.`
            });
            lastG = null;
            continue;
          }
          lastG = cell;
          lastC = c;
        } else {
          lastG = null;
        }
      }
    }

    // 3. Ineffective CNOT/Toffoli (a control wire never leaves ground state
    // |0> before this gate, so it can never fire).
    for (let c = 0; c < numCols; c++) {
      const controls = [];
      let tgtQ = -1;
      for (let q = 0; q < numQubits; q++) {
        if (grid[q][c] === 'CX_CTRL') controls.push(q);
        if (grid[q][c] === 'CX_TGT') tgtQ = q;
      }
      if (controls.length > 0 && tgtQ !== -1) {
        const grounded = controls.filter((ctrlQ) => grid[ctrlQ].slice(0, c).filter((g) => g && g !== '').length === 0);
        if (grounded.length > 0) {
          const gateName = controls.length === 2 ? 'Toffoli' : 'CNOT';
          const groundedList = grounded.map((q) => `q[${q}]`).join(', ');
          const plural = grounded.length > 1;
          errors.push({
            type: 'warning',
            errorType: 'ineffective_cnot',
            col: c,
            controls: controls,
            target: tgtQ,
            grounded: grounded,
            gateName: gateName,
            title: `Ineffective ${gateName} (Control Wire${plural ? 's' : ''} ${groundedList} in Ground State |0⟩)`,
            location: controls.length === 2
              ? `Column t=${c + 1} (Toffoli: controls q[${controls[0]}], q[${controls[1]}] → target q[${tgtQ}])`
              : `Column t=${c + 1} between q[${controls[0]}] and q[${tgtQ}]`,
            desc: `${gateName} was triggered while control qubit${plural ? 's' : ''} ${groundedList} ${plural ? 'are' : 'is'} resting in classical state |0⟩ with no prior gate on that wire.${controls.length === 2 ? ' A Toffoli only flips its target when BOTH controls are |1⟩ simultaneously, so a single grounded control is enough to disable it entirely.' : ' Since the control is never active, the target qubit never flips.'} No new entanglement is generated by this gate.`,
            fix: `Add a Hadamard (H) gate on wire${plural ? 's' : ''} ${groundedList} before column t=${c + 1} to create superposition there.`
          });
        }
      }
    }

    // 4. Idle Qubit Detection
    if (allGates.length > 0) {
      for (let q = 0; q < numQubits; q++) {
        const qGates = allGates.filter(g => g.qubit === q);
        if (qGates.length === 0) {
          errors.push({
            type: 'info',
            errorType: 'idle_qubit',
            qubit: q,
            title: `Idle Qubit Wire q[${q}]`,
            location: `Wire q[${q}]`,
            desc: `Qubit q[${q}] has no operations placed on it. It will remain in state |0⟩ throughout the simulation.`,
            fix: `Add gates to wire q[${q}] or scale down register size using the '−' button.`
          });
        }
      }
    }

    // 5. Deep Circuit Depth Warning (Decoherence risk)
    const activeCols = new Set(allGates.map(g => g.col));
    if (activeCols.size > 10) {
      errors.push({
        type: 'warning',
        errorType: 'high_depth',
        depth: activeCols.size,
        title: `High Circuit Depth (${activeCols.size} steps)`,
        location: `Entire register`,
        desc: `Circuit depth exceeds 10 unitary time slices. On superconducting transmon hardware (T₁ ≈ 50 µs), long depth introduces significant phase accumulation errors and depolarizing noise.`,
        fix: `Use the Universal Transpiler & AI Circuit Doctor to optimize gate count or apply Dynamical Decoupling.`
      });
    }

    return errors;
  }

  formatGridStructure(grid) {
    if (!grid || !grid.length) return '(empty circuit)';
    const lines = [];
    for (let q = 0; q < grid.length; q++) {
      const ops = [];
      for (let c = 0; c < grid[q].length; c++) {
        const cell = grid[q][c];
        if (cell && cell !== '') {
          ops.push(`${cell} (t=${c + 1})`);
        }
      }
      lines.push(`q[${q}]: ${ops.length > 0 ? ops.join(' -> ') : '(idle)'}`);
    }
    return lines.join('\n');
  }

  async runAudit(userQuestion = '') {
    if (this.isLoading) return;
    this.isLoading = true;

    if (this.btnAnalyzeEl) {
      this.btnAnalyzeEl.disabled = true;
      this.btnAnalyzeEl.innerHTML = '<span class="tutor-spinner"></span> Analyzing Circuit…';
    }

    try {
      const ui = this.circuitUI || window.circuitUI;
      const grid = ui ? ui.grid : [];
      const engine = ui ? ui.engine : null;

      const numQubits = grid.length || 3;
      const allCells = grid.flat().filter(c => c && c !== '');
      const activeDepth = grid[0] ? grid[0].filter((_, col) => grid.some(row => row[col])).length : 0;

      // Extract ground truth math from Quantum Engine
      let diracNotation = '|000⟩';
      let probabilities = {};
      let mathMetrics = {
        concurrence: 0,
        entropy: 0,
        purity: 1.0,
        entanglementClass: 'Separable Pure State'
      };

      if (engine) {
        diracNotation = engine.getDiracNotation() || '|000⟩';
        const probs = engine.getProbabilities();
        if (probs) {
          const numStates = 1 << numQubits;
          probs.forEach((p, idx) => {
            if (p > 0.001) {
              const bin = idx.toString(2).padStart(numQubits, '0');
              probabilities[`|${bin}⟩`] = Math.round(p * 1000) / 1000;
            }
          });
        }
        // Pull the real, fully general metrics straight from the engine
        // (works for any circuit, any register size) instead of a partial
        // reconstruction that used to hardcode purity to 1.0 always and
        // collapse the real entanglement classification down to a crude
        // binary "Entangled/Separable" label.
        if (engine.getAdvancedEntanglementMetrics) {
          const m = engine.getAdvancedEntanglementMetrics();
          mathMetrics.concurrence = m.concurrence;
          mathMetrics.entropy = m.vonNeumannEntropy;
          mathMetrics.purity = m.purity;
          mathMetrics.entanglementClass = m.entanglementClass;
        } else {
          mathMetrics.concurrence = engine.getEntanglementEntropy() > 0.1 ? 1.0 : 0.0;
          mathMetrics.entropy = engine.getEntanglementEntropy ? engine.getEntanglementEntropy() : 0;
        }
      }

      const deterministicErrors = this.detectDeterministicErrors(grid);
      const gridStructure = this.formatGridStructure(grid);

      // An unambiguous, already-resolved list of the operations in this
      // circuit. formatGridStructure() alone shows raw per-wire markers
      // ("CX_CTRL (t=2)" on two different wires), leaving the model to infer
      // that two controls sharing a target is a Toffoli - and it guessed
      // wrong, describing a Toffoli as "a CNOT from q[0] to q[2]". The
      // engine already resolves this correctly, so send its answer rather
      // than asking the model to re-derive it.
      const operationList = (engine && engine.toOperationList)
        ? engine.toOperationList(grid).map((op) => {
            switch (op.kind) {
              case 'toffoli': return `Toffoli: controls q[${op.controls[0]}] and q[${op.controls[1]}], target q[${op.target}]`;
              case 'cnot': return `CNOT: control q[${op.control}], target q[${op.target}]`;
              case 'swap': return `SWAP: q[${op.wires[0]}] and q[${op.wires[1]}]`;
              case 'cz': return `CZ: q[${op.wires[0]}] and q[${op.wires[1]}]`;
              case 'cp': return `Controlled-phase(${op.angle}): q[${op.wires[0]}] and q[${op.wires[1]}]`;
              case 'measure': return `Measure: q[${op.qubit}]`;
              case 'gate1q': return op.angle === null
                ? `${op.name} on q[${op.qubit}]`
                : `${op.name}(${op.angle}) on q[${op.qubit}]`;
              default: return null;
            }
          }).filter(Boolean)
        : [];

      const payload = {
        gridStructure,
        operationList,
        grid, // raw gate grid: lets the backend ground its analysis in a real
              // simulation instead of guessing from the text summary
        numQubits,
        activeDepth,
        diracNotation,
        probabilities,
        mathMetrics,
        deterministicErrors,
        userQuestion: userQuestion || ''
      };

      // Call Backend API
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      let auditResult = null;

      try {
        const res = await fetch(`${base}/api/ai/tutor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'circuit-tutor', payload })
        });

        if (res.ok) {
          const data = await res.json();
          auditResult = data.result || data.audit || data;
        } else {
          // If server returned non-200, use deterministic local fallback
          auditResult = this.generateLocalFallback(payload);
        }
      } catch (netErr) {
        console.warn('[CircuitTutor] Network call to /api/ai/tutor failed, using grounded local analysis:', netErr.message);
        auditResult = this.generateLocalFallback(payload);
      }

      // The AI backend's JSON schema (circuitSummary/errors/tutorGuidance -
      // see api/gemini.js's circuit-tutor prompt) never echoes mathMetrics
      // back, so anything downstream that needs the REAL computed
      // concurrence/entropy/entanglementClass (not the AI's own prose)
      // must read it from here, not from auditResult - overwritten
      // unconditionally so it's always the actual number just computed for
      // this exact circuit, regardless of which path answered.
      if (auditResult) auditResult.mathMetrics = mathMetrics;

      this.lastAuditResult = auditResult;
      this.renderAuditResults(auditResult);

    } catch (err) {
      console.error('[CircuitTutor] Error running circuit audit:', err);
    } finally {
      this.isLoading = false;
      if (this.btnAnalyzeEl) {
        this.btnAnalyzeEl.disabled = false;
        this.btnAnalyzeEl.innerHTML = '⚡ Analyze My Circuit';
      }
    }
  }

  askQuestion() {
    if (!this.questionInputEl) return;
    const question = this.questionInputEl.value.trim();
    if (!question) return;
    this.runAudit(question);
  }

  /**
   * Reads the actual gate composition out of a grid, mirroring
   * ananta-backend/utils/quantumState.js's readGateComposition/describeCircuit
   * for the case this file cannot reach that Node module: a pure network
   * failure reaching /api/ai/tutor. Grounds the description in which gates are
   * really on the board instead of guessing from Dirac-notation text — that
   * guess is how "H, T, Y" once became "Uniform Superposition State".
   */
  describeGridLocally(grid, numQubits, mathMetrics) {
    const GATE_NAMES = { H: 'Hadamard', X: 'Pauli-X', Y: 'Pauli-Y', Z: 'Pauli-Z', S: 'Phase (S)', T: 'π/8 Phase (T)' };
    const n = numQubits || (grid ? grid.length : 1);
    const numCols = grid && grid[0] ? grid[0].length : 0;
    const singleGateCounts = {};
    let cnotCount = 0, toffoliCount = 0, swapCount = 0, danglingIssue = null;

    const wireHasGate = new Array(n).fill(false);
    for (let col = 0; col < numCols; col++) {
      const controls = [];
      let target = -1;
      const swapWires = [];
      for (let q = 0; q < n; q++) {
        const cell = grid[q] ? grid[q][col] : null;
        if (!cell || cell === 'M') continue;
        if (cell === 'CX_CTRL') { controls.push(q); wireHasGate[q] = true; continue; }
        if (cell === 'CX_TGT') { target = q; wireHasGate[q] = true; continue; }
        if (cell === 'SWAP') { swapWires.push(q); wireHasGate[q] = true; continue; }
        singleGateCounts[cell] = (singleGateCounts[cell] || 0) + 1;
        wireHasGate[q] = true;
      }
      // Two controls sharing a target is a Toffoli, not a second CNOT — must
      // not be collapsed down to "the last control seen".
      if (controls.length === 2 && target !== -1) toffoliCount++;
      else if (controls.length === 1 && target !== -1) cnotCount++;
      else if (controls.length > 0 || target !== -1) {
        danglingIssue = `The controlled gate at time step ${col + 1} is missing its ${controls.length === 0 ? 'control' : 'target'} wire, so it does nothing.`;
      }
      if (swapWires.length === 2) swapCount++;
    }
    // Wires that actually carry a gate, not the register's total width — a
    // Bell pair built inside a wider register (idle spare wires) is still one.
    const activeWires = wireHasGate.filter(Boolean).length;

    const concurrence = parseFloat(mathMetrics?.concurrence || 0);
    const entropy = parseFloat(mathMetrics?.entropy || 0);
    const entangled = concurrence > 0.1;
    const distinctGates = Object.keys(singleGateCounts);
    const totalGates = distinctGates.reduce((s, g) => s + singleGateCounts[g], 0) + cnotCount + toffoliCount + swapCount;

    if (danglingIssue) {
      return { summary: 'Incomplete Circuit', purpose: danglingIssue, entanglementAnalysis: 'Not applicable until the circuit above is fixed.', hasError: true };
    }
    if (totalGates === 0) {
      return {
        summary: 'Empty Circuit (Ground State)',
        purpose: `All ${n} qubits are in the ground state |${'0'.repeat(n)}⟩. Add gates from the palette to begin.`,
        entanglementAnalysis: 'Not applicable — no gates have been placed yet.'
      };
    }

    // One description path for every circuit, driven entirely by the gates
    // actually present and the real computed entanglementClass (Wootters
    // concurrence + per-qubit entropy + monogamy, from
    // quantum-engine.js's getAdvancedEntanglementMetrics - not a gate- or
    // output-pattern lookup here). This used to special-case "exactly one H
    // and exactly one CNOT on exactly 2 wires" as "Bell State Preparation"
    // with a fixed sentence, which meant a circuit built any other way
    // (extra phase gate, different gate order, wider register) fell through
    // to generic "Custom Circuit" text even when it was still, physically,
    // just as much a Bell pair.
    const parts = distinctGates.map(g => `${GATE_NAMES[g] || g} (×${singleGateCounts[g]})`);
    if (cnotCount) parts.push(`CNOT (×${cnotCount})`);
    if (toffoliCount) parts.push(`Toffoli (×${toffoliCount})`);
    if (swapCount) parts.push(`SWAP (×${swapCount})`);
    const nameList = distinctGates.concat(
      cnotCount ? ['CNOT'] : [], toffoliCount ? ['Toffoli'] : [], swapCount ? ['SWAP'] : []
    ).join(', ');
    const summary = `${n}-Qubit Circuit: ${nameList}`;
    const entanglementClass = mathMetrics?.entanglementClass || (entangled ? 'Entangled Subsystem' : 'Separable Pure State');
    const purpose = `Applies ${parts.join(', ')} across a ${n}-qubit register on ${activeWires} active wire${activeWires === 1 ? '' : 's'}. ` +
      (entangled
        ? `The resulting state is entangled (${entanglementClass}) — measuring one qubit changes what you'll find on the others.`
        : 'The resulting state is separable — each qubit can be described independently.');

    const entanglementAnalysis = entangled
      ? `Entangled: Concurrence C = ${concurrence.toFixed(2)}, von Neumann Entropy S = ${entropy.toFixed(2)} ebits. Subsystems cannot be described independently.`
      : 'Separable: every qubit is in a definite pure state independent of the others (entropy ≈ 0).';

    return { summary, purpose, entanglementAnalysis };
  }

  // Real quantum-mechanical facts about each gate (textbook definitions,
  // not claims about the user's specific circuit) - used to ground
  // gate-lookup questions ("what does T do?") in the offline fallback.
  static GATE_EXPLANATIONS = {
    H: 'Hadamard (H) creates an equal superposition: |0⟩ → (|0⟩+|1⟩)/√2. It\'s the standard way to start superposition, and combined with a CNOT it produces entanglement.',
    X: 'Pauli-X is the quantum NOT gate: it flips |0⟩↔|1⟩ (a π rotation about the Bloch sphere\'s X-axis).',
    Y: 'Pauli-Y rotates by π about the Bloch sphere\'s Y-axis: it flips the bit and applies a phase (i on |0⟩→|1⟩, -i on |1⟩→|0⟩).',
    Z: 'Pauli-Z is a phase flip: it leaves |0⟩ unchanged and multiplies |1⟩ by -1. It has no effect on a qubit that isn\'t already in superposition.',
    S: 'The Phase gate (S) applies a 90° (π/2) phase to |1⟩. It\'s the square root of Z (S² = Z).',
    T: 'The T gate applies a 45° (π/4) phase to |1⟩. It\'s the square root of S (T² = S) and, alongside H and CNOT, is what makes a gate set universal for fault-tolerant computation.',
    CX: 'CNOT (controlled-X) flips the target qubit only when the control qubit is |1⟩. It\'s the standard two-qubit entangling gate — a Hadamard followed by a CNOT produces a Bell pair.',
    CNOT: 'CNOT (controlled-X) flips the target qubit only when the control qubit is |1⟩. It\'s the standard two-qubit entangling gate — a Hadamard followed by a CNOT produces a Bell pair.',
    SWAP: 'SWAP exchanges the full quantum states (not just labels) of two qubits, including any superposition or entanglement they carry.',
    TOFFOLI: 'The Toffoli gate (CCX) flips the target qubit only when BOTH control qubits are |1⟩ — a reversible AND gate, used in arithmetic circuits and some error-correcting codes.',
    CCX: 'The Toffoli gate (CCX) flips the target qubit only when BOTH control qubits are |1⟩ — a reversible AND gate, used in arithmetic circuits and some error-correcting codes.',
    M: 'Measurement collapses the qubit\'s superposition into a definite classical bit (0 or 1), with probabilities given by the Born rule |amplitude|². This is irreversible — any superposition or entanglement on that wire is destroyed.',
    MEASURE: 'Measurement collapses the qubit\'s superposition into a definite classical bit (0 or 1), with probabilities given by the Born rule |amplitude|². This is irreversible — any superposition or entanglement on that wire is destroyed.'
  };

  // Answers the student's actual typed question using only data already
  // computed from the real circuit grid/statevector (described, errors,
  // mathMetrics, diracNotation) - this runs when the AI backend is
  // unreachable, so every claim here must be grounded in that real data
  // rather than a generic canned string, or the question was effectively
  // being ignored (which is exactly what used to happen here).
  answerQuestionLocally(question, { described, errors, mathMetrics, diracNotation, numQubits }) {
    const q = (question || '').toLowerCase();
    if (!q) return null;

    // 1. Direct gate lookup ("what does the T gate do?", "explain CNOT")
    const gateMatch = Object.keys(CircuitTutor.GATE_EXPLANATIONS).find((key) => {
      const pattern = new RegExp(`\\b${key.toLowerCase()}\\b`);
      return pattern.test(q);
    });
    if (gateMatch && /what|explain|mean|do(es)?\b/.test(q)) {
      return `${CircuitTutor.GATE_EXPLANATIONS[gateMatch]} (Offline analysis — the AI tutor backend is unreachable right now, so this is a reference definition rather than a comment on your specific circuit.)`;
    }

    // 2. Correctness / validity ("is this right?", "does this work?")
    if (/\b(right|correct|valid|proper|wrong|good|work(s|ing)?|mistake)\b/.test(q)) {
      const errCount = errors.filter(e => e.severity === 'error').length;
      const warnCount = errors.filter(e => e.severity === 'warning').length;
      if (errCount > 0) {
        const first = errors.find(e => e.severity === 'error');
        return `Based on a real check of your circuit grid: no, there's ${errCount} genuine error to fix first — "${first.title}" at ${first.location}. ${first.explanation} Suggested fix: ${first.suggestedFix}`;
      }
      if (warnCount > 0) {
        return `Your circuit is logically valid (every gate is well-formed and unitary), but there ${warnCount === 1 ? 'is' : 'are'} ${warnCount} efficiency warning${warnCount === 1 ? '' : 's'} — see the Error Doctor panel above. It builds: ${described.summary}.`;
      }
      return `Yes — it's a valid, well-formed circuit: ${described.summary}. ${described.purpose}`;
    }

    // 3. What is this circuit / what am I building
    if (/what\s+(is|does|am\s+i|have\s+i)|purpose|building/.test(q)) {
      return `${described.summary}. ${described.purpose}`;
    }

    // 4. Entanglement / correlation questions
    if (/entangl|correlat|separable|bell|ghz/.test(q)) {
      return described.entanglementAnalysis;
    }

    // 5. Error / issue / bug questions
    if (/error|issue|bug|problem|fix/.test(q)) {
      if (errors.length === 0) return 'No issues detected — the deterministic static analysis found no premature measurements, dangling controls, or idle wires.';
      return errors.map(e => `[${e.severity.toUpperCase()}] ${e.title} (${e.location}): ${e.explanation} → ${e.suggestedFix}`).join(' | ');
    }

    // 6. State / probability / measurement outcome questions
    if (/state|probabilit|outcome|measure|amplitude/.test(q)) {
      return `The current statevector is ${diracNotation} across ${numQubits} qubits. ${described.entanglementAnalysis}`;
    }

    // No pattern matched - be honest that this is a limited offline mode
    // rather than pretending to have answered the specific question.
    return `Offline mode (AI tutor backend unreachable) can't parse that question freely, but here's what's grounded in your real circuit: ${described.summary}. ${described.purpose} ${errors.length ? `${errors.length} diagnostic(s) found — see above.` : 'No issues detected.'}`;
  }

  generateLocalFallback(payload) {
    const deterministicErrors = payload.deterministicErrors || [];
    const errors = deterministicErrors.map(err => ({
      ...err,
      severity: err.type === 'error' ? 'error' : (err.type === 'warning' ? 'warning' : 'optimization'),
      title: err.title || 'Circuit Inefficiency',
      location: err.location || 'Circuit grid',
      explanation: err.desc || 'Operation affects compilation depth or coherence.',
      suggestedFix: err.fix || 'Review gate placement.'
    }));

    const described = Array.isArray(payload.grid)
      ? this.describeGridLocally(payload.grid, payload.numQubits, payload.mathMetrics)
      : {
          summary: 'Custom Quantum Circuit',
          purpose: 'The gate grid was not available to this offline analysis, so no specific claim about it can be grounded.',
          entanglementAnalysis: 'Unknown — not computed offline.'
        };

    if (described.hasError) {
      errors.unshift({
        severity: 'error',
        errorType: 'incomplete_gate',
        title: 'Incomplete Gate',
        location: 'Circuit grid',
        explanation: described.purpose,
        suggestedFix: 'Complete or remove the incomplete gate.'
      });
    }

    let tutorGuidance;
    if (payload.userQuestion) {
      tutorGuidance = this.answerQuestionLocally(payload.userQuestion, {
        described, errors, mathMetrics: payload.mathMetrics, diracNotation: payload.diracNotation, numQubits: payload.numQubits
      });
    }
    if (!tutorGuidance) {
      tutorGuidance = errors.length > 0
        ? `You have ${errors.length} diagnostic recommendation(s). Review the 4-section breakdown below to optimize circuit fidelity and prevent unwanted state collapse.`
        : 'Your quantum circuit logic is sound and unitary! Superposition amplitudes and entanglement correlations evolve with full fidelity.';
    }

    return {
      circuitSummary: described.summary,
      circuitPurpose: described.purpose,
      isHealthy: !errors.some(e => e.severity === 'error'),
      healthBadge: errors.length === 0 ? 'Healthy Circuit (100% Sound)' : `${errors.length} Issue(s) Detected`,
      errors,
      diracNotation: payload.diracNotation || '|000⟩',
      mathMetrics: payload.mathMetrics || {},
      entanglementAnalysis: described.entanglementAnalysis,
      tutorGuidance
    };
  }

  /**
   * Maps circuit pathologies to the foundational concept and
   * links directly to one of the 18 master curriculum roadmap modules.
   */
  getWeakConceptInfo(err, circuitSummary) {
    const type = err.errorType || '';
    const title = (err.title || '').toLowerCase();
    const desc = (err.desc || err.explanation || '').toLowerCase();

    // 1. Premature Measurement -> Module 01 (Hilbert Space, Superposition & Born Rule)
    if (type === 'premature_measurement' || title.includes('measurement') || desc.includes('born') || desc.includes('collapse')) {
      return {
        title: 'Projective Born Rule Measurement & Wavefunction Collapse',
        explanation: 'In quantum mechanics, measurement is an irreversible projection, not a passive read. Measuring observable M forces continuous state |ψ⟩ = α|0⟩ + β|1⟩ to randomly collapse into basis eigenstate |0⟩ or |1⟩ with probability |α|² or |β|², destroying all phase information. In standard quantum circuit architecture, measurements are strictly deferred to the terminal column (Deferred Measurement Principle).',
        moduleId: 'module-01',
        moduleNum: 'Module 01',
        moduleTitle: 'Hilbert Space & Statevector Superposition',
        moduleSummary: 'Master the projective Born rule, wavefunction collapse, and why measurements belong at terminal circuit columns.',
        moduleLevel: 'Beginner'
      };
    }

    // 2. Self-Cancelling Redundancy -> Module 02 (Gate Unitaries & Matrix Evolution)
    if (type === 'self_inverse' || title.includes('self-cancelling') || title.includes('redundancy') || desc.includes('undo each other')) {
      return {
        title: 'Unitary Invertibility & Involutory Gate Operators (U² = I)',
        explanation: 'Every quantum logic gate is represented by a unitary operator U obeying U† U = I. Involutory gates (such as Pauli X, Y, Z and Hadamard H) are their own Hermitian adjoints (U = U†), meaning U² = I. Placing consecutive identical self-inverse gates cancels out the transformation identically into an identity matrix I, needlessly burning transmon coherence time (T₁, T₂) without executing any computation.',
        moduleId: 'module-02',
        moduleNum: 'Module 02',
        moduleTitle: 'Gate Unitaries & Matrix Evolution',
        moduleSummary: 'Explore unitary matrix evolution, involutory gates, and algebraic matrix identities.',
        moduleLevel: 'Beginner'
      };
    }

    // 3. Ineffective CNOT / Toffoli -> Module 07 (Entanglement Entropy & Bell States)
    if (type === 'ineffective_cnot' || title.includes('ineffective') || title.includes('cnot') || title.includes('toffoli')) {
      return {
        title: 'Controlled Unitaries & Entanglement Generation',
        explanation: 'Controlled operations (CNOT, Toffoli) transform |c⟩|t⟩ ↦ |c⟩|t ⊕ c⟩. When the control qubit rests in classical ground state |0⟩, the target qubit remains completely unaffected and the tensor state remains separable (|0⟩ ⊗ |0⟩ = |00⟩). To generate genuine quantum entanglement and non-local correlations, the control qubit must first be initialized in superposition (e.g. via H|0⟩ = |+⟩).',
        moduleId: 'module-07',
        moduleNum: 'Module 07',
        moduleTitle: 'Entanglement Entropy & Bell States',
        moduleSummary: 'Master Bell states, EPR pairs, and how controlled operations generate non-local entanglement.',
        moduleLevel: 'Intermediate'
      };
    }

    // 4. High Depth -> Module 05 (Decoherence & Lindblad Master Equation)
    if (type === 'high_depth' || title.includes('depth') || desc.includes('decoherence') || desc.includes('transmon')) {
      return {
        title: 'Decoherence, T₁ Energy Relaxation & T₂ Dephasing',
        explanation: 'Physical superconducting qubits are open quantum systems coupled to thermal environments. As circuit depth increases, transmon qubits undergo energy relaxation (T₁ ≈ 50 µs) and transverse phase dephasing (T₂ ≈ 70 µs). Circuit depth must be minimized and gates parallelized to ensure gate sequences execute well within hardware coherence bounds.',
        moduleId: 'module-05',
        moduleNum: 'Module 05',
        moduleTitle: 'Decoherence & Lindblad Master Equation',
        moduleSummary: 'Model transmon T1/T2 noise, Lindblad jump operators, and circuit depth compilation limits.',
        moduleLevel: 'Advanced'
      };
    }

    // 5. Idle Qubit -> Module 06 (OpenQASM 3.0 & Compilation)
    if (type === 'idle_qubit' || title.includes('idle')) {
      return {
        title: 'Register Allocation & Hardware Compilation',
        explanation: 'In quantum processors, unentangled idle qubits occupy physical cryogenic channels without contributing to computational parallelism. Hardware transpilers optimize wire allocation to either eliminate idle registers or schedule dynamical decoupling pulses (XY4 / CPMG) to protect them from environmental drift.',
        moduleId: 'module-06',
        moduleNum: 'Module 06',
        moduleTitle: 'OpenQASM 3.0 & Google Cirq AST Compilation',
        moduleSummary: 'Learn how compilers allocate registers, route couplings, and compile hardware-native gate topologies.',
        moduleLevel: 'Intermediate'
      };
    }

    // 6. Incomplete Gate -> Module 06
    if (type === 'incomplete_gate' || title.includes('incomplete') || desc.includes('missing')) {
      return {
        title: 'Multi-Qubit Unitary Operators & Syntax',
        explanation: 'Multi-qubit operations require both control and target indices to form a well-defined 4×4 or 8×8 unitary matrix in SU(2^N). An incomplete gate cannot compile to hardware assembly (OpenQASM 3.0 / Cirq).',
        moduleId: 'module-06',
        moduleNum: 'Module 06',
        moduleTitle: 'OpenQASM 3.0 & Google Cirq AST Compilation',
        moduleSummary: 'Master multi-qubit AST representation and unitary decomposition.',
        moduleLevel: 'Intermediate'
      };
    }

    // Fallback Concept -> Module 02
    return {
      title: 'Unitary State Evolution & Quantum Circuit Design',
      explanation: 'Quantum circuits apply sequences of unitary gates to evolve an initial ground state |0...0⟩ into a target statevector with desired measurement amplitudes.',
      moduleId: 'module-02',
      moduleNum: 'Module 02',
      moduleTitle: 'Gate Unitaries & Matrix Evolution',
      moduleSummary: 'Review foundational single-qubit and multi-qubit unitary operations.',
      moduleLevel: 'Beginner'
    };
  }

  /**
   * Generates grounded physical and mathematical explanation of
   * how the specific mistake impairs the quantum state output.
   */
  getOutputImpact(err, data) {
    const type = err.errorType || '';
    const title = (err.title || '').toLowerCase();
    const desc = (err.desc || err.explanation || '').toLowerCase();

    if (type === 'premature_measurement' || title.includes('measurement') || desc.includes('born')) {
      return {
        title: 'Irreversible Wavefunction Collapse & Phase Destruction',
        explanation: 'Projective Born measurement forces the continuous statevector |ψ⟩ = α|0⟩ + β|1⟩ to collapse onto a classical basis state. All quantum superposition is eradicated, and off-diagonal density matrix elements (coherences ⟨X⟩, ⟨Y⟩) drop to zero. Gates placed afterward operate purely on classical bits, rendering any intended quantum interference or algorithmic speedup impossible.',
        stateStatus: 'status-danger',
        stateLabel: 'Collapsed (Classical)',
        entropyStatus: 'status-danger',
        entropyLabel: '0.000 ebits (Destroyed)',
        compStatus: 'status-danger',
        compLabel: '0% Quantum Advantage',
        mathSnippet: '|ψ⟩ = α|0⟩ + β|1⟩  --[Measure]-->  |0⟩ (prob |α|²) or |1⟩ (prob |β|²);  Tr(ρ²) = 1,  ⟨X⟩ = 0,  ⟨Y⟩ = 0'
      };
    }

    if (type === 'self_inverse' || title.includes('self-cancelling') || title.includes('redundancy')) {
      const g = err.gate || 'U';
      return {
        title: `Null Computation (Identity Transformation ${g}² = I)`,
        explanation: `Applying two consecutive identical '${g}' operations evaluates identically to the identity gate (${g} · ${g} = I). The statevector remains completely unaffected by these two steps. On physical NISQ quantum hardware, these superfluous pulses burn valuable transmon coherence time (T₁, T₂) and accumulate gate infidelity (depolarizing noise) without executing any algorithmic logic.`,
        stateStatus: 'status-warning',
        stateLabel: 'Unchanged (No-Op)',
        entropyStatus: 'status-neutral',
        entropyLabel: 'No New Entanglement',
        compStatus: 'status-warning',
        compLabel: 'Redundant Depth (+2 Steps)',
        mathSnippet: `${g} · ${g} = I  ⇒  |ψ_final⟩ = I |ψ_initial⟩ = |ψ_initial⟩  (Zero net phase or amplitude shift)`
      };
    }

    if (type === 'ineffective_cnot' || title.includes('ineffective')) {
      return {
        title: 'Separable Output State & Zero Entanglement Generated',
        explanation: 'Because the control qubit wire rests strictly in ground state |0⟩, the conditional target flip condition is never met. The CNOT gate acts as a non-operative identity: CNOT|0⟩|ψ⟩ = |0⟩|ψ⟩. No bipartite quantum correlations or Bell entanglement are synthesized, meaning entanglement entropy S(ρ_A) remains exactly 0.000 ebits.',
        stateStatus: 'status-warning',
        stateLabel: 'Separable Product State',
        entropyStatus: 'status-danger',
        entropyLabel: '0.000 ebits (Unentangled)',
        compStatus: 'status-warning',
        compLabel: 'Target Gate Inactive',
        mathSnippet: 'CNOT |0⟩|t⟩ = |0⟩ |t ⊕ 0⟩ = |0⟩|t⟩  ⇒  Concurrence C = 0.000,  Von Neumann Entropy S = 0'
      };
    }

    if (type === 'high_depth' || title.includes('depth')) {
      return {
        title: 'Accelerated Decoherence & Gate Infidelity Accumulation',
        explanation: `With a circuit depth of ${err.depth || 10}+ unitary time slices, cumulative gate duration approaches or exceeds the qubit's dephasing time T₂. Environmental noise leads to exponential state purity decay (Tr(ρ²) < 1.0) and phase drift, causing the measured output probability distribution to deviate significantly from theoretical expectation values.`,
        stateStatus: 'status-warning',
        stateLabel: 'High Decoherence Risk',
        entropyStatus: 'status-warning',
        entropyLabel: 'Spurious Mixed Entropy',
        compStatus: 'status-danger',
        compLabel: 'Degraded State Fidelity',
        mathSnippet: 'ρ(t) = (1 - e^{-t/T₁}) |0⟩⟨0| + e^{-t/T₂} ρ_offdiag  (Decoherence dampens quantum amplitudes)'
      };
    }

    if (type === 'idle_qubit' || title.includes('idle')) {
      return {
        title: 'Tensor Factorization Without Computational Contribution',
        explanation: `Wire q[${err.qubit ?? 0}] remains in state |0⟩ and factors out cleanly as |ψ_total⟩ = |0⟩ ⊗ |ψ_subsystem⟩. While this does not corrupt other wires, it wastes register capacity and increases quantum memory overhead.`,
        stateStatus: 'status-neutral',
        stateLabel: 'Static Ground State |0⟩',
        entropyStatus: 'status-neutral',
        entropyLabel: 'Separable |0⟩ Tensor Factor',
        compStatus: 'status-neutral',
        compLabel: 'Underutilized Register',
        mathSnippet: '|ψ_system⟩ = |0⟩_{idle} ⊗ |ψ⟩_{active}  (No quantum interference generated on this wire)'
      };
    }

    // Default impact
    return {
      title: 'Deviated Statevector Trajectory',
      explanation: 'The current gate arrangement alters the unitary trajectory in Hilbert space, producing a statevector that deviates from intended algorithmic probability distributions.',
      stateStatus: 'status-warning',
      stateLabel: 'Altered Amplitudes',
      entropyStatus: 'status-neutral',
      entropyLabel: 'Modified Correlations',
      compStatus: 'status-warning',
      compLabel: 'Suboptimal Evolution',
      mathSnippet: 'U_actual ≠ U_intended  (Statevector probabilities deviate from target algorithm)'
    };
  }

  /**
   * Actionable step-by-step instructions to fix the circuit.
   */
  getFixSteps(err) {
    const type = err.errorType || '';
    const title = (err.title || '').toLowerCase();
    const desc = (err.desc || err.explanation || '').toLowerCase();

    if (type === 'premature_measurement' || title.includes('measurement') || desc.includes('born')) {
      const q = err.qubit ?? 0;
      const mCol = (err.measureCol ?? 0) + 1;
      const gCol = (err.gateCol ?? 0) + 1;
      return [
        {
          title: `Relocate Measurement Gate on Wire q[${q}]`,
          desc: `Remove the premature Measure gate at step t=${mCol} and reposition it at the very end of wire q[${q}] after gate '${err.gate || 'U'}' at step t=${gCol}.`
        },
        {
          title: 'Preserve Coherent Unitary Evolution',
          desc: 'Ensure all superposition, phase rotations, and entangling CNOT gates execute while qubits remain in coherent quantum states before any projective readout occurs.'
        },
        {
          title: 'Re-Verify Amplitudes & Observables',
          desc: 'Check the real-time Statevector and Pauli Observable panels to observe true quantum probabilities without premature wavefunction collapse.'
        }
      ];
    }

    if (type === 'self_inverse' || title.includes('self-cancelling') || title.includes('redundancy')) {
      const q = err.qubit ?? 0;
      const g = err.gate || 'U';
      const c1 = err.cols ? err.cols[0] + 1 : 1;
      const c2 = err.cols ? err.cols[1] + 1 : 2;
      return [
        {
          title: `Remove Both Redundant '${g}' Gates`,
          desc: `Delete the consecutive identical '${g}' gates on wire q[${q}] at columns t=${c1} and t=${c2}. Because ${g}² = I, removing them preserves the exact mathematical state.`
        },
        {
          title: 'Shorten Transmon Circuit Depth',
          desc: 'Eliminating the two time steps shortens hardware pulse execution time and prevents unnecessary T₁ decoherence and calibration noise.'
        },
        {
          title: 'Substitute With Target Rotation If Desired',
          desc: `If an actual rotation was intended, replace '${g}' with a phase rotation (S, T, or Rz) to create a non-identity relative phase shift.`
        }
      ];
    }

    if (type === 'ineffective_cnot' || title.includes('ineffective')) {
      const groundedStr = (err.grounded || []).map(q => `q[${q}]`).join(', ') || 'the control wire';
      const c = (err.col ?? 0) + 1;
      return [
        {
          title: `Initialize Superposition on Control Wire (${groundedStr})`,
          desc: `Place a Hadamard (H) gate on wire ${groundedStr} prior to step t=${c}. This prepares state |+⟩ = (|0⟩ + |1⟩)/√2.`
        },
        {
          title: 'Activate Conditional Target Flip',
          desc: 'When the control enters |+⟩, the CNOT/Toffoli operates across both basis states simultaneously, synthesizing true EPR entanglement (|00⟩ + |11⟩)/√2.'
        },
        {
          title: 'Verify Entanglement Entropy',
          desc: 'Watch the Subsystem Entanglement Entropy jump from 0.000 to 1.000 ebits in the diagnostics panel.'
        }
      ];
    }

    if (type === 'high_depth' || title.includes('depth')) {
      return [
        {
          title: 'Run Universal Circuit Transpiler',
          desc: 'Click the Transpiler & AI Doctor button to merge adjacent rotations and cancel commutative commuting gates.'
        },
        {
          title: 'Parallelize Independent Single-Qubit Gates',
          desc: 'Slide gates on independent qubit wires into identical time step columns to reduce horizontal circuit depth.'
        },
        {
          title: 'Inspect Coherence Budget (T₁ / T₂)',
          desc: 'Keep total gate duration below 10-15 steps to ensure physical superconducting transmons retain >95% state purity.'
        }
      ];
    }

    if (type === 'idle_qubit' || title.includes('idle')) {
      const q = err.qubit ?? 0;
      return [
        {
          title: `Assign Logic to Wire q[${q}]`,
          desc: `Place single-qubit gates (H, X) or entangling CNOT targets onto wire q[${q}] to include it in the computation.`
        },
        {
          title: 'Or Reduce Active Register Size',
          desc: "If extra qubits are not required, click the '−' button in the qubit header to scale down the register to active wires only."
        }
      ];
    }

    return [
      {
        title: 'Review Gate Placement & Matrix Logic',
        desc: err.suggestedFix || err.fix || 'Inspect the gate coordinates on the circuit grid.'
      },
      {
        title: 'Check Statevector Probabilities',
        desc: 'Observe the live probability distribution bars to ensure amplitudes match theoretical goals.'
      }
    ];
  }

  /**
   * Identifies concept and curriculum module for healthy sound circuits.
   */
  getHealthyConceptInfo(data) {
    const summary = (data.circuitSummary || '').toLowerCase();
    // Whether THIS circuit is genuinely entangled - and what kind - is
    // decided from the real computed metrics (mathMetrics.entanglementClass,
    // Wootters concurrence, per-qubit entropy), not by string-searching the
    // AI's free-text summary for the word "bell". That string match was
    // fragile in both directions: it would miss a genuine Bell pair the AI
    // happened to describe as e.g. "EPR pair" instead of "bell", and it
    // would fire on any unrelated mention of the word. mathMetrics is
    // threaded onto every audit result unconditionally in runAudit(), so
    // it's always the real number just computed for this exact circuit.
    const concurrence = parseFloat(data.mathMetrics?.concurrence || 0);
    const entanglementClass = data.mathMetrics?.entanglementClass || '';
    if (concurrence > 0.05 || /entangl/i.test(entanglementClass)) {
      return {
        title: entanglementClass || 'Entangled Quantum Subsystem',
        explanation: `Your circuit produces real quantum entanglement: Wootters concurrence C = ${concurrence.toFixed(2)}, computed directly from the statevector (${entanglementClass || 'entangled'}).`,
        moduleId: 'module-07',
        moduleNum: 'Module 07',
        moduleTitle: 'Entanglement Entropy & Bell States',
        moduleSummary: 'Deepen your mastery of EPR pairs, CHSH inequalities, and Schmidt rank decompositions.',
        moduleLevel: 'Intermediate'
      };
    }
    if (summary.includes('teleport')) {
      return {
        title: 'Quantum Teleportation & Bell State Measurement',
        explanation: 'Your circuit implements pre-shared EPR entanglement and Bell-basis measurement to transfer arbitrary qubit state information across channels.',
        moduleId: 'module-08',
        moduleNum: 'Module 08',
        moduleTitle: 'Quantum Teleportation Protocol',
        moduleSummary: 'Explore classical feed-forward Pauli corrections and state reconstruction fidelity.',
        moduleLevel: 'Advanced'
      };
    }
    if (summary.includes('grover')) {
      return {
        title: 'Grover Search & Amplitude Amplification',
        explanation: 'Your circuit leverages phase inversion and diffusion operators to quadratically amplify target state amplitudes.',
        moduleId: 'module-09',
        moduleNum: 'Module 09',
        moduleTitle: 'Grover Search & Amplitude Amplification',
        moduleSummary: 'Study phase oracles, geometric diffusion reflections, and search scaling O(√N).',
        moduleLevel: 'Advanced'
      };
    }
    if (summary.includes('qft') || summary.includes('fourier')) {
      return {
        title: 'Quantum Fourier Transform & Phase Estimation',
        explanation: 'Your circuit maps computational basis states into phase frequency domains using controlled phase rotations and Hadamards.',
        moduleId: 'module-11',
        moduleNum: 'Module 11',
        moduleTitle: 'Quantum Fourier Transform & Phase Estimation (QPE)',
        moduleSummary: 'Understand eigenvalue estimation, modular phase kickback, and Shor’s period finding.',
        moduleLevel: 'Advanced'
      };
    }
    return {
      title: 'Unitary Evolution & Superposition in Hilbert Space',
      explanation: 'Your circuit preserves norm and maintains coherent superposition across all active wires in the Hilbert space.',
      moduleId: 'module-02',
      moduleNum: 'Module 02',
      moduleTitle: 'Gate Unitaries & Matrix Evolution',
      moduleSummary: 'Learn single-qubit rotations (H, X, Y, Z, S, T) and multi-qubit Kronecker expansions.',
      moduleLevel: 'Beginner'
    };
  }

  /**
   * Automatically repairs circuit pathology directly on canvas.
   */
  /**
   * The AI backend's JSON schema for errors (title/location/explanation/
   * suggestedFix - see api/gemini.js's circuit-tutor prompt) has never
   * included the structured fields (errorType, qubit, cols, controls,
   * grounded) that autoFixError needs to mechanically edit the grid - those
   * only ever existed on detectDeterministicErrors()'s own output. While the
   * AI backend was silently broken (see the aiProvider.js fix), every audit
   * fell back to that local detector, so Auto-Fix always happened to have
   * the rich data by accident. Now that the AI genuinely answers, its errors
   * lack qubit/cols entirely - autoFixError defaulted every fix to q[0], or
   * for idle_qubit (no title-fallback at all) silently did nothing.
   *
   * Ground truth for the mechanical repair should never depend on which
   * provider happened to answer, so this re-runs the same deterministic,
   * zero-hallucination analyzer fresh and matches the AI's prose error back
   * to the structured finding it was grounded in (the AI is instructed to
   * ground itself in exactly this data, so their wire/column references
   * agree even when the phrasing doesn't match verbatim).
   */
  resolveStructuredError(err, grid) {
    if (!err) return null;
    if (err.errorType) return err; // already structured (local detector)

    const detErrors = this.detectDeterministicErrors(grid);
    if (!detErrors.length) return null;

    const numsIn = (s) => (String(s || '').match(/\d+/g) || []).map(Number);
    const errQubits = new Set(numsIn((err.location || '') + ' ' + (err.title || '')).filter((n) => n < (grid ? grid.length : 8)));

    const CATEGORY_HINTS = {
      premature_measurement: /measur/i,
      self_inverse: /self.?cancel|redundan/i,
      ineffective_cnot: /ineffective|toffoli|cnot/i,
      idle_qubit: /idle/i,
      high_depth: /depth/i
    };
    const category = Object.keys(CATEGORY_HINTS).find((k) => CATEGORY_HINTS[k].test(err.title || '') || CATEGORY_HINTS[k].test(err.explanation || ''));

    let best = null, bestScore = -1;
    for (const det of detErrors) {
      let score = det.errorType === category ? 5 : 0;
      const detQubits = new Set(numsIn(det.location));
      for (const q of errQubits) if (detQubits.has(q)) score += 1;
      if (score > bestScore) { bestScore = score; best = det; }
    }
    // Require at least a category match, or a qubit match if category
    // couldn't be inferred - a bare fallback to "whatever sorted first"
    // would silently fix the wrong thing.
    return bestScore > 0 ? best : null;
  }

  autoFixError(errIndex) {
    const rawErr = this.currentErrors && this.currentErrors[errIndex];
    if (!rawErr) return;

    const ui = this.circuitUI || window.circuitUI;
    if (!ui || !ui.grid) return;

    const err = this.resolveStructuredError(rawErr, ui.grid) || rawErr;
    if (!err.errorType) {
      this.showAutoFixFeedback('Could not automatically locate this finding on the current grid - the circuit may have changed since this audit ran. Try re-analyzing.');
      return;
    }

    let fixed = false;
    let feedbackMsg = '';

    if (err.errorType === 'premature_measurement' || (err.title && err.title.includes('Measurement'))) {
      const q = err.qubit !== undefined ? err.qubit : 0;
      let mCol = -1;
      for (let c = 0; c < ui.numCols; c++) {
        if (ui.grid[q][c] === 'M' || ui.grid[q][c] === 'MEASURE') {
          mCol = c;
          break;
        }
      }
      if (mCol !== -1) {
        ui.grid[q][mCol] = '';
      }
      let lastGateCol = -1;
      for (let c = 0; c < ui.numCols; c++) {
        if (ui.grid[q][c] && ui.grid[q][c] !== '') {
          lastGateCol = c;
        }
      }
      const targetCol = Math.min(ui.numCols - 1, lastGateCol >= 0 ? lastGateCol + 1 : ui.numCols - 1);
      ui.grid[q][targetCol] = 'M';
      fixed = true;
      feedbackMsg = `Repositioned Measurement gate on wire q[${q}] to terminal step t=${targetCol + 1}.`;
    } else if (err.errorType === 'self_inverse' || (err.title && err.title.includes('Self-Cancelling'))) {
      const q = err.qubit !== undefined ? err.qubit : 0;
      const cols = err.cols || [];
      if (cols.length === 2) {
        ui.grid[q][cols[0]] = '';
        ui.grid[q][cols[1]] = '';
        fixed = true;
        feedbackMsg = `Removed self-cancelling ${err.gate || ''} gates on wire q[${q}] at columns t=${cols[0] + 1} and t=${cols[1] + 1}.`;
      }
    } else if (err.errorType === 'ineffective_cnot' || (err.title && err.title.includes('Ineffective'))) {
      const grounded = err.grounded || (err.controls ? [err.controls[0]] : [0]);
      const col = err.col || 1;
      grounded.forEach(ctrlQ => {
        let placed = false;
        for (let c = 0; c < col; c++) {
          if (!ui.grid[ctrlQ][c] || ui.grid[ctrlQ][c] === '') {
            ui.grid[ctrlQ][c] = 'H';
            placed = true;
            break;
          }
        }
        if (!placed && col > 0) {
          ui.grid[ctrlQ][0] = 'H';
        }
      });
      fixed = true;
      feedbackMsg = `Placed Hadamard (H) gate on control wire to prepare superposition and activate entanglement.`;
    } else if (err.errorType === 'idle_qubit') {
      const q = err.qubit !== undefined ? err.qubit : 0;
      if (ui.numQubits > 2 && typeof ui.removeQubit === 'function') {
        ui.removeQubit(q);
        fixed = true;
        feedbackMsg = `Removed idle wire q[${q}] to streamline register.`;
      } else {
        ui.grid[q][0] = 'H';
        fixed = true;
        feedbackMsg = `Initialized wire q[${q}] with Hadamard (H) gate.`;
      }
    }

    if (fixed) {
      if (typeof ui.renderGrid === 'function') ui.renderGrid();
      if (typeof ui.updateSimulation === 'function') ui.updateSimulation();
      if (typeof ui.renderCnotConnectors === 'function') ui.renderCnotConnectors();

      this.showAutoFixFeedback(feedbackMsg);
      setTimeout(() => this.runAudit(), 350);
    }
  }

  /**
   * Flashes and locates the error on the circuit canvas wires.
   */
  highlightErrorLocation(locStr, qubit, col) {
    document.querySelectorAll('.error-pulse-highlight, .slot-error-highlight').forEach(el => {
      el.classList.remove('error-pulse-highlight', 'slot-error-highlight');
    });

    if (qubit >= 0 && col >= 0) {
      const slot = document.getElementById(`slot-${qubit}-${col}`);
      if (slot) {
        slot.classList.add('slot-error-highlight');
        slot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setTimeout(() => slot.classList.remove('slot-error-highlight'), 3500);
        return;
      }
    }

    if (qubit >= 0) {
      const row = document.querySelector(`.circuit-wire-row[data-qubit="${qubit}"]`);
      if (row) {
        row.classList.add('error-pulse-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => row.classList.remove('error-pulse-highlight'), 3500);
        return;
      }
    }

    const qMatch = String(locStr).match(/q\[(\d+)\]/i);
    if (qMatch) {
      const q = parseInt(qMatch[1], 10);
      const row = document.querySelector(`.circuit-wire-row[data-qubit="${q}"]`);
      if (row) {
        row.classList.add('error-pulse-highlight');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => row.classList.remove('error-pulse-highlight'), 3500);
      }
    }
  }

  showAutoFixFeedback(msg) {
    const pill = this.floatingDoctorPill || document.getElementById('tutor-health-badge');
    if (pill) {
      const oldHtml = pill.innerHTML;
      pill.innerHTML = `⚡ ${escapeHtml(msg || 'Fixed!')}`;
      pill.className = 'doctor-health-pill-small healthy auto-fixed';
      setTimeout(() => {
        if (pill) pill.innerHTML = oldHtml;
      }, 3200);
    }
  }

  renderAuditResults(data) {
    if (!data) return;

    const errs = data.errors || [];
    this.currentErrors = errs;
    const isHealthy = data.isHealthy !== false && errs.length === 0;

    // 2. Legacy / Trigger Button Badge & Pulse Dot (If still present in DOM)
    if (this.doctorCountBadge) {
      if (errs.length > 0) {
        this.doctorCountBadge.textContent = String(errs.length);
        this.doctorCountBadge.style.display = 'inline-flex';
      } else {
        this.doctorCountBadge.style.display = 'none';
      }
    }
    if (this.doctorPulseDot) {
      if (errs.length > 0) {
        this.doctorPulseDot.classList.add('has-issues');
      } else {
        this.doctorPulseDot.classList.remove('has-issues');
      }
    }

    if (this.floatingDoctorPill) {
      this.floatingDoctorPill.className = `doctor-health-pill-small ${isHealthy ? 'healthy' : 'warning'}`;
      this.floatingDoctorPill.innerHTML = isHealthy
        ? '🟢 Sound'
        : `⚠️ ${errs.length} Issue${errs.length > 1 ? 's' : ''}`;
    }

    // 3. Render Floating Doctor Window (Strict 4 Sections)
    if (this.floatingDoctorContent) {
      let contentHtml = '';

      if (data.tutorGuidance) {
        contentHtml += `
          <div class="doctor-guidance-banner">
            <div class="guidance-banner-header">
              <span class="guidance-banner-icon">💡</span>
              <strong class="guidance-banner-title">AI Doctor Guidance</strong>
            </div>
            <p class="guidance-banner-text">${escapeHtml(data.tutorGuidance)}</p>
          </div>
        `;
      }

      if (isHealthy) {
        const algoConcept = this.getHealthyConceptInfo(data);
        contentHtml += `
          <div class="doctor-diagnosis-card healthy-card">
            <!-- 1) Mistake Made / Health Status -->
            <div class="doctor-sec-block sec-mistake healthy">
              <div class="sec-header-row">
                <span class="sec-num-bubble">1</span>
                <div class="sec-title-wrap">
                  <span class="sec-subtitle">Mistake Made</span>
                  <h4 class="sec-main-title">Zero Pathologies Detected (100% Sound)</h4>
                </div>
                <span class="sec-sev-badge sev-healthy">🟢 OPTIMAL</span>
              </div>
              <div class="sec-body-box">
                <div class="sec-meta-line">
                  <span class="sec-meta-pin">📍 Active Register:</span>
                  <span class="sec-meta-val">${escapeHtml(data.circuitSummary || 'Unitary Register')}</span>
                </div>
                <p class="sec-explanation-text">
                  Your quantum circuit logic is completely sound! All operations preserve quantum state norm (⟨ψ|ψ⟩ = 1.0). No premature projective collapses, dangling controls, or redundant self-inverse gates were found.
                </p>
              </div>
            </div>

            <!-- 2) How It Affects The Output -->
            <div class="doctor-sec-block sec-impact healthy">
              <div class="sec-header-row">
                <span class="sec-num-bubble">2</span>
                <div class="sec-title-wrap">
                  <span class="sec-subtitle">How It Affects The Output</span>
                  <h4 class="sec-main-title">Deterministic Unitary State Evolution</h4>
                </div>
              </div>
              <div class="sec-body-box">
                <p class="sec-explanation-text">
                  Amplitudes are coherently superposed. The circuit synthesizes statevector <strong>${escapeHtml(data.diracNotation || '|000⟩')}</strong> with full quantum phase fidelity.
                </p>
                <div class="sec-impact-telemetry">
                  <div class="telemetry-pill status-healthy">
                    <span class="telemetry-label">State Purity</span>
                    <span class="telemetry-value">Tr(ρ²) = 1.000</span>
                  </div>
                  <div class="telemetry-pill status-healthy">
                    <span class="telemetry-label">Entanglement Status</span>
                    <span class="telemetry-value">${escapeHtml(data.mathMetrics?.entanglementClass || (data.mathMetrics?.concurrence > 0.1 ? 'Entangled Subsystem' : 'Separable State'))}</span>
                  </div>
                  <div class="telemetry-pill status-healthy">
                    <span class="telemetry-label">Quantum Speedup</span>
                    <span class="telemetry-value">Active Coherence</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3) Potential Weak Concepts / Curriculum Study -->
            <div class="doctor-sec-block sec-concept">
              <div class="sec-header-row">
                <span class="sec-num-bubble">3</span>
                <div class="sec-title-wrap">
                  <span class="sec-subtitle">Potential Weak Concepts</span>
                  <h4 class="sec-main-title">${escapeHtml(algoConcept.title)}</h4>
                </div>
                <span class="concept-module-badge">${escapeHtml(algoConcept.moduleNum)}</span>
              </div>
              <div class="sec-body-box">
                <p class="sec-explanation-text">${escapeHtml(algoConcept.explanation)}</p>
                <div class="sec-module-launcher-card">
                  <div class="launcher-card-header">
                    <span class="launcher-tag">RECOMMENDED MASTER MODULE</span>
                    <span class="launcher-mod-level">${escapeHtml(algoConcept.moduleLevel || 'Curriculum')}</span>
                  </div>
                  <div class="launcher-title">${escapeHtml(algoConcept.moduleNum)}: ${escapeHtml(algoConcept.moduleTitle)}</div>
                  <p class="launcher-desc">${escapeHtml(algoConcept.moduleSummary)}</p>
                  <button type="button" class="btn-open-curriculum-module" onclick="window.openRoadmapModule('${algoConcept.moduleId}')" title="Study this concept in the interactive module lab">
                    <span class="btn-module-icon">📖</span>
                    <span class="btn-module-label">Open ${escapeHtml(algoConcept.moduleNum)} & Interactive Studio</span>
                    <span class="btn-module-arrow">➔</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 4) Steps To Fix The Circuit / Next Experiments -->
            <div class="doctor-sec-block sec-fix healthy">
              <div class="sec-header-row">
                <span class="sec-num-bubble">4</span>
                <div class="sec-title-wrap">
                  <span class="sec-subtitle">Steps To Fix The Circuit</span>
                  <h4 class="sec-main-title">Next Recommended Experiments</h4>
                </div>
              </div>
              <div class="sec-body-box">
                <div class="fix-steps-numbered-list">
                  <div class="fix-step-item">
                    <span class="fix-step-circle">1</span>
                    <div class="fix-step-details">
                      <strong class="fix-step-name">Inject Relative Phase (S or T Gate)</strong>
                      <p class="fix-step-instruction">Place a Phase S or T gate on a wire in superposition to rotate the statevector azimuthally along the Bloch sphere equator.</p>
                    </div>
                  </div>
                  <div class="fix-step-item">
                    <span class="fix-step-circle">2</span>
                    <div class="fix-step-details">
                      <strong class="fix-step-name">Observe Entanglement Scaling</strong>
                      <p class="fix-step-instruction">Add a CNOT connecting to a third wire to transition from bipartite Bell states to tripartite GHZ entanglement (|000⟩ + |111⟩)/√2.</p>
                    </div>
                  </div>
                  <div class="fix-step-item">
                    <span class="fix-step-circle">3</span>
                    <div class="fix-step-details">
                      <strong class="fix-step-name">Inspect Pauli Observables ⟨X⟩, ⟨Y⟩, ⟨Z⟩</strong>
                      <p class="fix-step-instruction">Switch on the Pauli Legend on the left control dock to analyze real-time expectation value projections.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        contentHtml += errs.map((err, idx) => {
          const sevClass = err.severity === 'error' ? 'sev-error' : (err.severity === 'warning' ? 'sev-warning' : 'sev-info');
          const sevIcon = err.severity === 'error' ? '🔴' : (err.severity === 'warning' ? '🟡' : 'ℹ️');
          const sevLabel = err.severity === 'error' ? 'ERROR' : (err.severity === 'warning' ? 'WARNING' : 'OPTIMIZATION');
          const impact = this.getOutputImpact(err, data);
          const concept = this.getWeakConceptInfo(err, data.circuitSummary);
          const fixSteps = this.getFixSteps(err);

          return `
            <div class="doctor-diagnosis-card">
              ${errs.length > 1 ? `
                <div class="doctor-issue-counter">
                  <span class="counter-badge">Issue ${idx + 1} of ${errs.length}</span>
                </div>
              ` : ''}

              <!-- 1) Mistake Made -->
              <div class="doctor-sec-block sec-mistake">
                <div class="sec-header-row">
                  <span class="sec-num-bubble">1</span>
                  <div class="sec-title-wrap">
                    <span class="sec-subtitle">Mistake Made</span>
                    <h4 class="sec-main-title">${escapeHtml(err.title || 'Circuit Pathology')}</h4>
                  </div>
                  <span class="sec-sev-badge ${sevClass}">${sevIcon} ${sevLabel}</span>
                </div>
                <div class="sec-body-box">
                  <div class="sec-meta-line">
                    <span class="sec-meta-pin">📍 Location:</span>
                    <span class="sec-meta-val">${escapeHtml(err.location || 'Circuit Canvas')}</span>
                  </div>
                  <p class="sec-explanation-text">${escapeHtml(err.explanation || err.desc || '')}</p>
                </div>
              </div>

              <!-- 2) How It Affects The Output -->
              <div class="doctor-sec-block sec-impact">
                <div class="sec-header-row">
                  <span class="sec-num-bubble">2</span>
                  <div class="sec-title-wrap">
                    <span class="sec-subtitle">How It Affects The Output</span>
                    <h4 class="sec-main-title">${escapeHtml(impact.title)}</h4>
                  </div>
                </div>
                <div class="sec-body-box">
                  <p class="sec-explanation-text">${impact.explanation}</p>
                  <div class="sec-impact-telemetry">
                    <div class="telemetry-pill ${impact.stateStatus}">
                      <span class="telemetry-label">Wavefunction State</span>
                      <span class="telemetry-value">${escapeHtml(impact.stateLabel)}</span>
                    </div>
                    <div class="telemetry-pill ${impact.entropyStatus}">
                      <span class="telemetry-label">Entanglement Entropy</span>
                      <span class="telemetry-value">${escapeHtml(impact.entropyLabel)}</span>
                    </div>
                    <div class="telemetry-pill ${impact.compStatus}">
                      <span class="telemetry-label">Algorithmic Advantage</span>
                      <span class="telemetry-value">${escapeHtml(impact.compLabel)}</span>
                    </div>
                  </div>
                  ${impact.mathSnippet ? `
                    <div class="sec-math-callout">
                      <span class="math-callout-tag">Mathematical Mechanism:</span>
                      <code>${escapeHtml(impact.mathSnippet)}</code>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- 3) Potential Weak Concepts -->
              <div class="doctor-sec-block sec-concept">
                <div class="sec-header-row">
                  <span class="sec-num-bubble">3</span>
                  <div class="sec-title-wrap">
                    <span class="sec-subtitle">Potential Weak Concepts</span>
                    <h4 class="sec-main-title">${escapeHtml(concept.title)}</h4>
                  </div>
                  <span class="concept-module-badge">${escapeHtml(concept.moduleNum)}</span>
                </div>
                <div class="sec-body-box">
                  <p class="sec-explanation-text">${escapeHtml(concept.explanation)}</p>

                  <!-- Direct button opening specific module of our 18 roadmap modules -->
                  <div class="sec-module-launcher-card">
                    <div class="launcher-card-header">
                      <span class="launcher-tag">RECOMMENDED CURRICULUM MODULE</span>
                      <span class="launcher-mod-level">${escapeHtml(concept.moduleLevel || 'Core Curriculum')}</span>
                    </div>
                    <div class="launcher-title">${escapeHtml(concept.moduleNum)}: ${escapeHtml(concept.moduleTitle)}</div>
                    <p class="launcher-desc">${escapeHtml(concept.moduleSummary)}</p>
                    <button type="button" class="btn-open-curriculum-module" onclick="window.openRoadmapModule('${concept.moduleId}')" title="Study this concept in Module Reader with interactive circuit studio">
                      <span class="btn-module-icon">📖</span>
                      <span class="btn-module-label">Study in ${escapeHtml(concept.moduleNum)}: ${escapeHtml(concept.moduleTitle)}</span>
                      <span class="btn-module-arrow">➔</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 4) Steps To Fix The Circuit -->
              <div class="doctor-sec-block sec-fix">
                <div class="sec-header-row">
                  <span class="sec-num-bubble">4</span>
                  <div class="sec-title-wrap">
                    <span class="sec-subtitle">Steps To Fix The Circuit</span>
                    <h4 class="sec-main-title">Prescribed Action Plan</h4>
                  </div>
                </div>
                <div class="sec-body-box">
                  <div class="fix-steps-numbered-list">
                    ${fixSteps.map((step, sIdx) => `
                      <div class="fix-step-item">
                        <span class="fix-step-circle">${sIdx + 1}</span>
                        <div class="fix-step-details">
                          <strong class="fix-step-name">${escapeHtml(step.title)}</strong>
                          <p class="fix-step-instruction">${escapeHtml(step.desc)}</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Extra Features: Auto-Fix Circuit + Highlight on Canvas -->
                  <div class="doctor-action-buttons-row">
                    <button type="button" class="btn-doctor-action btn-doctor-autofix" onclick="window.circuitTutor && window.circuitTutor.autoFixError(${idx})" title="Directly repair this gate placement on the canvas">
                      <span class="btn-act-icon">⚡</span>
                      <span class="btn-act-text">Auto-Fix Circuit</span>
                    </button>
                    <button type="button" class="btn-doctor-action btn-doctor-highlight" onclick="window.circuitTutor && window.circuitTutor.highlightErrorLocation('${escapeHtml(err.location)}', ${err.qubit ?? -1}, ${err.gateCol ?? err.col ?? -1})" title="Locate and pulse on the circuit canvas">
                      <span class="btn-act-icon">🎯</span>
                      <span class="btn-act-text">Highlight on Canvas</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      this.floatingDoctorContent.innerHTML = contentHtml;
    }

    // 4. Update Legacy Elements (for backward compatibility)
    if (this.healthBadgeEl) {
      this.healthBadgeEl.className = `tutor-health-pill ${isHealthy ? 'healthy' : 'warning'}`;
      this.healthBadgeEl.innerHTML = isHealthy
        ? '🟢 Circuit Healthy (100% Sound)'
        : `⚠️ ${data.healthBadge || `${errs.length} Issue(s) Detected`}`;
    }

    if (this.makingTitleEl) {
      this.makingTitleEl.textContent = data.circuitSummary || 'Custom Quantum Circuit';
    }
    if (this.makingDescEl) {
      this.makingDescEl.textContent = data.circuitPurpose || 'Unitary evolution of quantum state.';
    }

    if (this.errorsContainerEl) {
      if (errs.length === 0) {
        this.errorsContainerEl.innerHTML = `
          <div class="tutor-clean-state">
            <span class="tutor-clean-icon">✨</span>
            <div class="tutor-clean-text">
              <strong>Zero Pathologies Detected</strong>
              <p>No redundant gates, premature measurements, or idle qubit anomalies found. Unitary logic is completely sound!</p>
            </div>
          </div>
        `;
      } else {
        this.errorsContainerEl.innerHTML = errs.map(err => {
          const sevClass = err.severity === 'error' ? 'sev-error' : (err.severity === 'warning' ? 'sev-warning' : 'sev-info');
          const sevIcon = err.severity === 'error' ? '🔴 Error' : (err.severity === 'warning' ? '🟡 Warning' : 'ℹ️ Optimization');
          return `
            <div class="tutor-error-card ${sevClass}">
              <div class="tutor-error-header">
                <span class="tutor-sev-badge ${sevClass}">${sevIcon}</span>
                <strong class="tutor-error-title">${escapeHtml(err.title || 'Diagnostic Finding')}</strong>
                ${err.location ? `<span class="tutor-error-loc">${escapeHtml(err.location)}</span>` : ''}
              </div>
              <p class="tutor-error-desc">${escapeHtml(err.explanation || '')}</p>
              ${err.suggestedFix ? `
                <div class="tutor-error-fix">
                  <span class="fix-label">Suggested Fix:</span>
                  <span class="fix-text">${escapeHtml(err.suggestedFix)}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    }

    if (this.entanglementDescEl) {
      this.entanglementDescEl.textContent = data.entanglementAnalysis || 'Evaluating subsystem entropy.';
    }

    if (this.guidanceDescEl) {
      this.guidanceDescEl.textContent = data.tutorGuidance || 'Continue exploring quantum algorithms.';
    }
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Global curriculum module launcher
if (typeof window !== 'undefined') {
  window.openRoadmapModule = function(moduleId) {
    if (window.switchView) {
      window.switchView('topic-roadmap');
    } else if (window.switchTab) {
      window.switchTab('topic-roadmap');
    }
    setTimeout(() => {
      if (window.topicRoadmapManager && typeof window.topicRoadmapManager.openModuleReader === 'function') {
        window.topicRoadmapManager.openModuleReader(moduleId);
        const detailStage = document.getElementById('topic-module-detail-stage');
        if (detailStage) {
          detailStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 120);
  };

  window.addEventListener('DOMContentLoaded', () => {
    window.circuitTutor = new CircuitTutor(window.circuitUI);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircuitTutor;
}
