/**
 * Ananta Cloud QPU Bridge - IBM Quantum Hardware Integration
 * Connects browser circuit composer directly to physical superconducting quantum computers.
 * Supports token management, live device calibration telemetry, OpenQASM 3.0 compilation,
 * physical shot execution with realistic hardware error models, and 1-click Google Colab execution.
 */

class CloudQPUBridge {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;

    // Load saved token or start empty (no fake/mock credentials)
    this.apiToken = localStorage.getItem('ananta_ibm_token') || '';
    this.selectedBackend = 'ibm_brisbane';
    this.isJobRunning = false;
    this.lastJobResults = null;
    this.isFleetLive = false;
    this.activePollInterval = null;

    // Calibrated baseline specifications (used when no live connection/token is available)
    this.devices = {
      'ibm_brisbane': {
        name: 'ibm_brisbane',
        type: 'Superconducting Transmon (Eagle r3)',
        qubits: 127,
        status: 'Online',
        queue: 12,
        t1Median: 284, // microseconds
        t2Median: 168, // microseconds
        cnotErrorMedian: 0.0078, // 0.78%
        readoutError: 0.019, // 1.9%
        quantumVolume: 128,
        clops: 2600,
        isLive: false
      },
      'ibm_kyoto': {
        name: 'ibm_kyoto',
        type: 'Superconducting Transmon (Eagle r3)',
        qubits: 127,
        status: 'Online',
        queue: 8,
        t1Median: 242,
        t2Median: 134,
        cnotErrorMedian: 0.0085,
        readoutError: 0.021,
        quantumVolume: 128,
        clops: 2400,
        isLive: false
      },
      'ibm_sherbrooke': {
        name: 'ibm_sherbrooke',
        type: 'Superconducting Transmon (Eagle r3)',
        qubits: 127,
        status: 'Online',
        queue: 15,
        t1Median: 295,
        t2Median: 175,
        cnotErrorMedian: 0.0072,
        readoutError: 0.016,
        quantumVolume: 256,
        clops: 2900,
        isLive: false
      },
      'ibm_osaka': {
        name: 'ibm_osaka',
        type: 'Superconducting Transmon (Eagle r3)',
        qubits: 127,
        status: 'Online',
        queue: 5,
        t1Median: 260,
        t2Median: 145,
        cnotErrorMedian: 0.0080,
        readoutError: 0.018,
        quantumVolume: 128,
        clops: 2500,
        isLive: false
      },
      'simulator_mps': {
        name: 'simulator_mps',
        type: 'Matrix Product State Cloud Simulator',
        qubits: 100,
        status: 'Online (Instant)',
        queue: 0,
        t1Median: 999999,
        t2Median: 999999,
        cnotErrorMedian: 0.00001,
        readoutError: 0.0001,
        quantumVolume: 512,
        clops: 10000,
        isLive: false
      }
    };

    this.initDOM();
  }

  async saveToken(token) {
    if (!token || !token.trim()) {
      this.clearToken();
      return;
    }
    const cleanToken = token.trim();

    // Show validating indicator
    if (this.tokenStatusBadge) {
      this.tokenStatusBadge.className = 'status-pill status-warn';
      this.tokenStatusBadge.innerHTML = `⏳ Verifying with IBM Quantum...`;
    }

    if (window.anantaBackend && typeof window.anantaBackend.validateIbmToken === 'function') {
      try {
        const check = await window.anantaBackend.validateIbmToken(cleanToken);
        if (check && check.valid) {
          this.apiToken = cleanToken;
          localStorage.setItem('ananta_ibm_token', this.apiToken);
          const userName = (check.user && check.user.username) ? check.user.username : this.getMaskedToken();
          if (this.tokenStatusBadge) {
            this.tokenStatusBadge.className = 'status-pill status-ready';
            this.tokenStatusBadge.innerHTML = `✓ Verified IBM Account (${userName})`;
          }
          await this.fetchDeviceFleet();
          return;
        } else {
          if (this.tokenStatusBadge) {
            this.tokenStatusBadge.className = 'status-pill status-warn';
            this.tokenStatusBadge.innerHTML = `⚠️ Invalid IBM Token`;
          }
          alert(`IBM Quantum Token verification failed: ${check ? check.error : 'Invalid token credentials'}`);
          return;
        }
      } catch (err) {
        console.warn('[CloudQPUBridge] Validation check failed:', err);
      }
    }

    // Fallback if backend validation service unreachable
    this.apiToken = cleanToken;
    localStorage.setItem('ananta_ibm_token', this.apiToken);
    this.updateTokenStatus();
    this.fetchDeviceFleet();
  }

  clearToken() {
    this.apiToken = '';
    localStorage.removeItem('ananta_ibm_token');
    this.isFleetLive = false;
    this.updateTokenStatus();
    this.fetchDeviceFleet();
  }

  getMaskedToken() {
    if (!this.apiToken) return 'Not Configured';
    if (this.apiToken.length <= 8) return '••••••••';
    return `${this.apiToken.substring(0, 4)}••••••••${this.apiToken.substring(this.apiToken.length - 4)}`;
  }

  initDOM() {
    this.modal = document.getElementById('cloud-qpu-modal');
    this.tokenInput = document.getElementById('ibm-api-token-input');
    this.tokenStatusBadge = document.getElementById('ibm-token-status');
    this.backendSelect = document.getElementById('ibm-backend-select');
    this.deviceTelemetryCard = document.getElementById('device-telemetry-card');
    this.runJobBtn = document.getElementById('btn-dispatch-qpu-job');
    this.jobStatusEl = document.getElementById('qpu-job-status-banner');
    this.resultsContainer = document.getElementById('qpu-hardware-results-container');
    this.colabLinkBtn = document.getElementById('btn-open-in-colab');

    // Populate initial inputs
    if (this.tokenInput && this.apiToken) {
      this.tokenInput.value = this.apiToken;
    }

    this.updateTokenStatus();
    this.updateDeviceTelemetry();
    this.bindEvents();

    // Fetch device fleet from server (live IBM Quantum or calibrated baseline)
    this.fetchDeviceFleet();
  }

  bindEvents() {
    const btnOpenModal = document.getElementById('btn-open-qpu-modal');
    if (btnOpenModal) {
      btnOpenModal.addEventListener('click', () => this.openModal());
    }

    const btnCloseModal = document.getElementById('btn-close-qpu-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => this.closeModal());
    }

    if (this.tokenInput) {
      this.tokenInput.addEventListener('change', (e) => this.saveToken(e.target.value));
    }

    const btnSaveToken = document.getElementById('btn-save-ibm-token');
    if (btnSaveToken) {
      btnSaveToken.addEventListener('click', () => {
        if (this.tokenInput) this.saveToken(this.tokenInput.value);
      });
    }

    const btnClearToken = document.getElementById('btn-clear-ibm-token');
    if (btnClearToken) {
      btnClearToken.addEventListener('click', () => {
        this.clearToken();
        if (this.tokenInput) this.tokenInput.value = '';
      });
    }

    if (this.backendSelect) {
      this.backendSelect.addEventListener('change', (e) => {
        this.selectedBackend = e.target.value;
        this.updateDeviceTelemetry();
      });
    }

    if (this.runJobBtn) {
      this.runJobBtn.addEventListener('click', () => this.executeCircuitOnQPU());
    }

    if (this.colabLinkBtn) {
      this.colabLinkBtn.addEventListener('click', () => this.openGoogleColabRunner());
    }

    const btnCopyPython = document.getElementById('btn-copy-qiskit-runtime-code');
    if (btnCopyPython) {
      btnCopyPython.addEventListener('click', () => {
        const code = this.generateQiskitRuntimeCode();
        navigator.clipboard.writeText(code);
        btnCopyPython.textContent = 'Copied Python Code! ✓';
        setTimeout(() => btnCopyPython.textContent = 'Copy Qiskit Runtime Code 📋', 2000);
      });
    }
  }

  openModal() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this.updateDeviceTelemetry();
      this.updateTokenStatus();
      this.fetchDeviceFleet();
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  updateTokenStatus() {
    if (!this.tokenStatusBadge) return;
    if (this.apiToken && this.apiToken.length > 8) {
      this.tokenStatusBadge.className = 'status-pill status-ready';
      this.tokenStatusBadge.innerHTML = `✓ Key Armed (${this.getMaskedToken()})`;
    } else {
      this.tokenStatusBadge.className = 'status-pill status-warn';
      this.tokenStatusBadge.innerHTML = `⚠️ No Token (Simulated Mode)`;
    }
  }

  async fetchDeviceFleet() {
    if (window.anantaBackend && typeof window.anantaBackend.fetchQpuDevices === 'function') {
      try {
        const res = await window.anantaBackend.fetchQpuDevices(this.apiToken);
        if (res && res.success && res.devices && Object.keys(res.devices).length > 0) {
          this.devices = res.devices;
          this.isFleetLive = !!res.isLive;
          this.updateBackendSelectDropdown();
          this.updateDeviceTelemetry();
        }
      } catch (err) {
        console.warn('[CloudQPUBridge] Unable to fetch device fleet from backend:', err);
      }
    }
  }

  updateBackendSelectDropdown() {
    if (!this.backendSelect) return;
    const currentSelected = this.selectedBackend;
    this.backendSelect.innerHTML = '';

    for (const [key, dev] of Object.entries(this.devices)) {
      const opt = document.createElement('option');
      opt.value = key;
      const queueText = (dev.queue !== undefined && dev.queue !== null) ? ` | Queue: ${dev.queue}` : '';
      opt.textContent = `${dev.name} (${dev.qubits} Qubits | ${dev.status}${queueText})`;
      if (key === currentSelected) {
        opt.selected = true;
      }
      this.backendSelect.appendChild(opt);
    }

    if (!this.devices[this.selectedBackend]) {
      this.selectedBackend = Object.keys(this.devices)[0] || 'ibm_brisbane';
      if (this.backendSelect.options.length > 0) {
        this.backendSelect.selectedIndex = 0;
      }
    }
  }

  updateDeviceTelemetry() {
    const dev = this.devices[this.selectedBackend] || Object.values(this.devices)[0];
    if (!this.deviceTelemetryCard || !dev) return;

    const isLive = !!(dev.isLive || this.isFleetLive);
    const badgeHtml = isLive
      ? `<span class="device-chip-badge" style="color:#10b981; border: 1px solid rgba(16,185,129,0.4); padding: 2px 6px; border-radius: 4px; background: rgba(16,185,129,0.1);">🟢 LIVE IBM QUANTUM TELEMETRY</span>`
      : `<span class="device-chip-badge" style="color:#f59e0b; border: 1px solid rgba(245,158,11,0.4); padding: 2px 6px; border-radius: 4px; background: rgba(245,158,11,0.1);">📊 CALIBRATED REFERENCE SPECIFICATIONS</span>`;

    const statusBadgeClass = (dev.status && dev.status.includes('Online')) ? 'online' : 'busy';

    this.deviceTelemetryCard.innerHTML = `
      <div class="telemetry-header">
        <div class="telemetry-identity">
          ${badgeHtml}
          <h3 class="device-name">${dev.name}</h3>
          <span class="device-arch">${dev.type || 'Superconducting Transmon'}</span>
        </div>
        <div class="device-status-badge ${statusBadgeClass}">
          ● ${dev.status || 'Online'}
        </div>
      </div>

      <div class="telemetry-specs-grid">
        <div class="spec-tile">
          <span class="spec-label">Physical Qubits</span>
          <strong class="spec-val">${dev.qubits || 127} Qubits</strong>
          <span class="spec-note">Coupling Topology</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Median T₁ (Relaxation)</span>
          <strong class="spec-val">${dev.t1Median > 9999 ? '∞ (Ideal)' : dev.t1Median + ' μs'}</strong>
          <span class="spec-note">Excited Lifetime</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Median T₂ (Dephasing)</span>
          <strong class="spec-val">${dev.t2Median > 9999 ? '∞ (Ideal)' : dev.t2Median + ' μs'}</strong>
          <span class="spec-note">Ramsey Coherence</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Median 2Q Error (CX)</span>
          <strong class="spec-val">${((dev.cnotErrorMedian || 0.008) * 100).toFixed(2)}%</strong>
          <span class="spec-note">Cross-Resonance Gate</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Readout Error</span>
          <strong class="spec-val">${((dev.readoutError || 0.019) * 100).toFixed(2)}%</strong>
          <span class="spec-note">Dispersive Cavity</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Current Queue</span>
          <strong class="spec-val">${dev.queue !== undefined ? dev.queue : 0} Jobs Pending</strong>
          <span class="spec-note">Est. Wait: ~${Math.max(1, Math.round((dev.queue || 1) * 0.8))} min</span>
        </div>
      </div>
    `;
  }

  generateOpenQASM3() {
    const grid = this.circuitUI.grid;
    const numQ = this.circuitUI.numQubits || 3;
    const numC = this.circuitUI.numCols || 6;

    let qasm = `OPENQASM 3.0;\ninclude "stdgates.inc";\n\nqubit[${numQ}] q;\nbit[${numQ}] c;\n\n`;

    for (let c = 0; c < numC; c++) {
      // Detect controls/target/swap wires the same way runCircuitUpToCol and
      // quantum-engine.js's toQASM do, so a Toffoli (2 controls + 1 target)
      // and SWAP are emitted correctly instead of being silently dropped.
      const controls = [];
      const swapWires = [];
      let cnotTarget = -1;
      for (let q = 0; q < numQ; q++) {
        const cell = grid[q][c];
        if (cell === 'CX_CTRL') controls.push(q);
        else if (cell === 'CX_TGT') cnotTarget = q;
        else if (cell === 'SWAP') swapWires.push(q);
      }

      if (controls.length === 2 && cnotTarget !== -1) {
        qasm += `ccx q[${controls[0]}], q[${controls[1]}], q[${cnotTarget}];\n`;
      } else if (controls.length === 1 && cnotTarget !== -1) {
        qasm += `cx q[${controls[0]}], q[${cnotTarget}];\n`;
      }
      if (swapWires.length === 2) {
        qasm += `swap q[${swapWires[0]}], q[${swapWires[1]}];\n`;
      }

      // Single-qubit gates
      for (let q = 0; q < numQ; q++) {
        const g = grid[q][c];
        if (!g || g === 'CX_CTRL' || g === 'CX_TGT' || g === 'SWAP' || g === 'M') continue;
        if (g === 'H') qasm += `h q[${q}];\n`;
        else if (g === 'X') qasm += `x q[${q}];\n`;
        else if (g === 'Y') qasm += `y q[${q}];\n`;
        else if (g === 'Z') qasm += `z q[${q}];\n`;
        else if (g === 'S') qasm += `s q[${q}];\n`;
        else if (g === 'T') qasm += `t q[${q}];\n`;
      }
    }

    qasm += `\nbarrier q;\nc = measure q;\n`;
    return qasm;
  }

  generateQiskitRuntimeCode() {
    const qasm = this.generateOpenQASM3();
    const token = this.apiToken || 'YOUR_IBM_QUANTUM_API_TOKEN';
    const backend = this.selectedBackend;

    return `"""
Ananta Quantum Studio -> IBM Quantum Physical Cloud QPU Execution
Generated: ${new Date().toISOString()}
Target Hardware: ${backend}
"""

from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.qasm3 import loads

# 1. Initialize IBM Quantum Session using your API Token
API_TOKEN = "${token}"
service = QiskitRuntimeService(channel="ibm_quantum_platform", token=API_TOKEN)

# 2. Select Physical QPU Backend
backend = service.backend("${backend}")
print(f"Connected to Physical Hardware: {backend.name} ({backend.num_qubits} Qubits)")

# 3. Load Circuit compiled by Ananta Studio
qasm_str = """${qasm}"""
circuit = loads(qasm_str)
print(circuit)

# 4. Transpile and Execute 1024 Physical Shots via Sampler Primitive
sampler = SamplerV2(mode=backend)
job = sampler.run([circuit], shots=1024)
print(f"Job Dispatched! Job ID: {job.job_id()}")
print("Waiting for dilution refrigerator readout...")

# 5. Extract Hardware Measurement Histogram
result = job.result()
counts = result[0].data.c.get_counts()
print("\\nPhysical Measurement Results:")
for bitstring, count in sorted(counts.items()):
    pct = (count / 1024) * 100
    print(f"|{bitstring}>: {count} shots ({pct:.1f}%)")
`;
  }

  openGoogleColabRunner() {
    const pythonCode = this.generateQiskitRuntimeCode();
    const notebook = {
      nbformat: 4,
      nbformat_minor: 0,
      metadata: { colab: { name: "Ananta_IBM_Hardware_Runner.ipynb" } },
      cells: [
        {
          cell_type: "markdown",
          metadata: {},
          source: [
            "# ⚛️ Ananta Quantum Studio — Physical Hardware Execution\n",
            "This notebook was generated directly from your Ananta circuit. It executes your circuit on physical **IBM Quantum** superconducting processors in a dilution refrigerator."
          ]
        },
        {
          cell_type: "code",
          metadata: {},
          execution_count: null,
          outputs: [],
          source: ["!pip install -q qiskit qiskit-ibm-runtime"]
        },
        {
          cell_type: "code",
          metadata: {},
          execution_count: null,
          outputs: [],
          source: pythonCode.split('\n').map(line => line + '\n')
        }
      ]
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ananta_${this.selectedBackend}_Hardware_Job.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    navigator.clipboard.writeText(pythonCode);
    alert(`✅ Notebook downloaded! Qiskit code copied to clipboard.\n\nOpen Google Colab (colab.research.google.com), upload "Ananta_${this.selectedBackend}_Hardware_Job.ipynb", and hit Run to execute on physical IBM hardware!`);
  }

  async executeCircuitOnQPU() {
    if (this.isJobRunning) return;
    this.isJobRunning = true;

    if (this.runJobBtn) {
      this.runJobBtn.disabled = true;
      this.runJobBtn.innerHTML = '⏳ Submitting Circuit to QPU...';
    }

    if (this.jobStatusEl) {
      this.jobStatusEl.style.display = 'block';
      this.jobStatusEl.className = 'job-status-banner status-queued';
      this.jobStatusEl.innerHTML = `
        <div class="status-spinner"></div>
        <div>
          <strong>${this.apiToken ? 'Submitting to IBM Quantum Platform API...' : 'Preparing Calibrated Hardware Noise Simulation...'}</strong>
          <p>Compiling OpenQASM 3.0 → Validating target transpilation for ${this.selectedBackend}...</p>
        </div>
      `;
    }

    // Calculate ideal probabilities and gate statistics
    const numQ = (this.circuitUI && this.circuitUI.numQubits) ? this.circuitUI.numQubits : (this.engine.numQubits || 3);
    if (this.engine.numQubits !== numQ) {
      this.engine.setNumQubits(numQ);
      if (this.circuitUI && typeof this.circuitUI.updateSimulation === 'function') {
        this.circuitUI.updateSimulation();
      }
    }
    const idealProbs = this.engine.getProbabilities();
    const dev = this.devices[this.selectedBackend] || Object.values(this.devices)[0];
    const totalShots = 1024;
    const qasm = this.generateOpenQASM3();

    let backendRes = null;

    // 1. Dispatch via Ananta Backend Server
    if (window.anantaBackend && typeof window.anantaBackend.runQpuCircuit === 'function') {
      try {
        console.log('[CloudQPUBridge] Dispatching circuit execution to Live Backend /api/qpu/run...');
        backendRes = await window.anantaBackend.runQpuCircuit({
          backend: this.selectedBackend,
          shots: totalShots,
          qasm,
          numQubits: numQ,
          idealProbabilities: idealProbs.map(p => p.probability),
          token: this.apiToken
        });
      } catch (backendErr) {
        console.warn('[CloudQPUBridge] Backend request error:', backendErr.message);
      }
    }

    // 2. Handle Asynchronous Hardware Polling if Job is Pending in Real IBM Queue
    if (backendRes && backendRes.pending && backendRes.jobId) {
      if (this.jobStatusEl) {
        this.jobStatusEl.className = 'job-status-banner status-queued';
        this.jobStatusEl.innerHTML = `
          <div class="status-spinner"></div>
          <div>
            <strong>Physical QPU Job Queued on IBM Quantum! (Job ID: ${backendRes.jobId})</strong>
            <p>Target: ${this.selectedBackend}. Waiting in dilution refrigerator queue. Polling status...</p>
          </div>
        `;
      }

      // Poll every 2.5 seconds up to 60 times (2.5 minutes)
      const maxPolls = 60;
      let pollCount = 0;
      let jobFinished = false;

      while (pollCount < maxPolls && this.isJobRunning) {
        await new Promise(r => setTimeout(r, 2500));
        pollCount++;

        try {
          const pollRes = await window.anantaBackend.pollQpuJob(backendRes.jobId, this.apiToken);
          if (pollRes && pollRes.status === 'COMPLETED' && pollRes.counts) {
            backendRes = {
              ...backendRes,
              ...pollRes,
              success: true,
              pending: false,
              executionMode: 'PHYSICAL_HARDWARE',
              counts: pollRes.counts,
              idealCounts: backendRes.idealCounts || pollRes.counts
            };
            jobFinished = true;
            break;
          } else if (pollRes && (pollRes.status === 'CANCELLED' || pollRes.status === 'FAILED')) {
            throw new Error(`IBM Quantum Job ${backendRes.jobId} ended with status: ${pollRes.status}`);
          } else if (pollRes) {
            if (this.jobStatusEl) {
              const statusClass = pollRes.status === 'RUNNING' ? 'status-running' : 'status-queued';
              this.jobStatusEl.className = `job-status-banner ${statusClass}`;
              this.jobStatusEl.innerHTML = `
                <div class="status-spinner"></div>
                <div>
                  <strong>IBM Hardware Status: ${pollRes.status} (Job ID: ${backendRes.jobId})</strong>
                  <p>Target: ${this.selectedBackend} | Elapsed: ${pollCount * 2.5}s... Polling dilution refrigerator execution...</p>
                </div>
              `;
            }
          }
        } catch (pollErr) {
          console.warn('[CloudQPUBridge] Job polling error:', pollErr);
        }
      }
    }

    // 3. Process Completed Results (Hardware or Calibrated Server Simulation)
    if (backendRes && backendRes.success && backendRes.counts) {
      const isPhysical = (backendRes.executionMode === 'PHYSICAL_HARDWARE');

      this.lastJobResults = {
        backend: backendRes.backend || this.selectedBackend,
        shots: backendRes.shots || totalShots,
        idealCounts: backendRes.idealCounts,
        noisyCounts: backendRes.counts,
        physicalFidelity: parseFloat(backendRes.deviceSpecs?.fidelityScore) / 100 || 0.94,
        jobId: backendRes.jobId,
        executionMode: backendRes.executionMode || (isPhysical ? 'PHYSICAL_HARDWARE' : 'SIMULATED_PHYSICAL_NOISE'),
        isLiveBackend: true,
        executionTimeMs: backendRes.executionTimeMs
      };

      if (this.jobStatusEl) {
        this.jobStatusEl.className = 'job-status-banner status-completed';
        if (isPhysical) {
          this.jobStatusEl.innerHTML = `
            <span class="status-check">✓</span>
            <div>
              <strong>Physical Superconducting Execution Completed via IBM Quantum! (Job ID: ${backendRes.jobId})</strong>
              <p>1,024 physical shots retrieved from ${backendRes.backend} (15 mK dilution refrigerator). Roundtrip: ${backendRes.executionTimeMs || 0}ms.</p>
            </div>
          `;
        } else {
          this.jobStatusEl.innerHTML = `
            <span class="status-check">ℹ️</span>
            <div>
              <strong>Simulated Physical Noise Sandbox Completed (Job ID: ${backendRes.jobId})</strong>
              <p>1,024 shots generated with calibrated hardware noise models ($T_1$, $T_2$, CNOT & Readout errors). Configure an IBM Quantum API token above to dispatch directly to physical QPUs.</p>
            </div>
          `;
        }
      }

      if (this.runJobBtn) {
        this.runJobBtn.disabled = false;
        this.runJobBtn.innerHTML = isPhysical ? '⚡ Re-Run on Physical QPU' : '⚡ Re-Run Simulation';
      }

      this.isJobRunning = false;
      this.renderHardwareResults();
      return;
    }

    // 4. Offline Fallback Simulation (if Backend Server is entirely unavailable)
    const noisyCounts = {};
    const idealCounts = {};
    const numStates = 1 << numQ;

    for (let i = 0; i < numStates; i++) {
      const bitstring = i.toString(2).padStart(numQ, '0');
      noisyCounts[bitstring] = 0;
      idealCounts[bitstring] = 0;
    }

    let gateCount = 0;
    this.circuitUI.grid.forEach(row => row.forEach(cell => { if (cell) gateCount++; }));

    const circuitDurationUs = gateCount * 0.035;
    const t1Decay = Math.exp(-circuitDurationUs / (dev.t1Median || 280));
    const t2Decay = Math.exp(-circuitDurationUs / (dev.t2Median || 160));
    const gateSurvival = Math.pow(1 - (dev.cnotErrorMedian || 0.008), Math.max(1, gateCount * 0.4));
    const physicalFidelity = Math.max(0.65, Math.min(0.99, t1Decay * t2Decay * gateSurvival));

    for (let shot = 0; shot < totalShots; shot++) {
      const rand = Math.random();
      let cumProb = 0;
      let selectedState = idealProbs[0].state.replace('|', '').replace('⟩', '');

      for (const item of idealProbs) {
        cumProb += item.probability;
        if (rand <= cumProb) {
          selectedState = item.state.replace('|', '').replace('⟩', '');
          break;
        }
      }

      idealCounts[selectedState] = (idealCounts[selectedState] || 0) + 1;

      let noisyState = selectedState;
      if (Math.random() > physicalFidelity) {
        const flipBit = Math.floor(Math.random() * numQ);
        const chars = noisyState.split('');
        chars[flipBit] = chars[flipBit] === '0' ? '1' : '0';
        noisyState = chars.join('');
      }

      const chars = noisyState.split('');
      for (let q = 0; q < numQ; q++) {
        if (Math.random() < (dev.readoutError || 0.019)) {
          chars[q] = chars[q] === '0' ? '1' : '0';
        }
      }
      noisyState = chars.join('');

      noisyCounts[noisyState] = (noisyCounts[noisyState] || 0) + 1;
    }

    this.lastJobResults = {
      backend: dev.name,
      shots: totalShots,
      idealCounts,
      noisyCounts,
      physicalFidelity,
      jobId: `sim_${dev.name}_${Date.now()}`,
      executionMode: 'CLIENT_SIMULATED_PHYSICAL_NOISE'
    };

    if (this.jobStatusEl) {
      this.jobStatusEl.className = 'job-status-banner status-completed';
      this.jobStatusEl.innerHTML = `
        <span class="status-check">ℹ️</span>
        <div>
          <strong>Offline Hardware Simulation Completed (Job ID: ${this.lastJobResults.jobId})</strong>
          <p>1,024 shots sampled locally using calibrated physical noise parameters ($T_1$, $T_2$, CNOT & readout error). Backend server is offline or unreachable.</p>
        </div>
      `;
    }

    if (this.runJobBtn) {
      this.runJobBtn.disabled = false;
      this.runJobBtn.innerHTML = '⚡ Re-Run Simulation';
    }

    this.isJobRunning = false;
    this.renderHardwareResults();
  }

  renderHardwareResults() {
    if (!this.resultsContainer || !this.lastJobResults) return;
    this.resultsContainer.style.display = 'block';
    const r = this.lastJobResults;
    const allStates = Object.keys(r.idealCounts).sort();

    const isPhysical = (r.executionMode === 'PHYSICAL_HARDWARE');
    const modeBadge = isPhysical
      ? `<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">⚛️ PHYSICAL HARDWARE READOUT</span>`
      : `<span style="background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">🔬 SIMULATED PHYSICAL NOISE</span>`;

    let html = `
      <div class="results-header-row">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <h4 style="margin:0;">Hardware Readout Comparison (${r.shots} Shots)</h4>
            ${modeBadge}
          </div>
          <span class="results-subtitle">Blue = Theoretical Statevector | Amber = Physical Transmon Readout (${isPhysical ? 'Real IBM Dilution Refrigerator' : 'Calibrated Noise Model'})</span>
        </div>
        <div class="fidelity-chip">
          Fidelity: <strong>${(r.physicalFidelity * 100).toFixed(1)}%</strong>
        </div>
      </div>

      <div class="histogram-bars-list">
    `;

    allStates.forEach(state => {
      const idealC = r.idealCounts[state] || 0;
      const noisyC = r.noisyCounts[state] || 0;
      const idealPct = ((idealC / r.shots) * 100).toFixed(1);
      const noisyPct = ((noisyC / r.shots) * 100).toFixed(1);

      html += `
        <div class="hist-row">
          <span class="hist-state-label">|${state}⟩</span>
          <div class="hist-double-bar">
            <!-- Ideal Bar -->
            <div class="hist-bar-wrap">
              <div class="hist-bar-fill fill-ideal" style="width: ${idealPct}%"></div>
              <span class="bar-val">${idealC} (${idealPct}%)</span>
            </div>
            <!-- Physical Noisy Bar -->
            <div class="hist-bar-wrap">
              <div class="hist-bar-fill fill-physical" style="width: ${noisyPct}%"></div>
              <span class="bar-val-phys">${noisyC} (${noisyPct}%)</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.resultsContainer.innerHTML = html;
  }
}

window.CloudQPUBridge = CloudQPUBridge;
