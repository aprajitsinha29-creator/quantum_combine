/**
 * Ananta Quantum Studio - Real Local Multi-Framework Execution Bridge
 *
 * UI controller for the "Local Simulators (Qiskit Aer / Cirq / PennyLane)"
 * tab of the Quantum Hardware & Cloud Bridge modal. Talks to
 * /api/multiframework/status and /api/multiframework/run, which are backed
 * by ananta-backend/utils/multiFrameworkClient.js spawning a real Python
 * process running the genuinely-installed SDKs (see
 * ananta-backend/python/quantum_multiframework_runner.py).
 *
 * Nothing here is hardcoded: which frameworks are selectable is decided by
 * the real capability probe response, not a static list, and a failed
 * probe/run is shown to the user as an honest error rather than papered
 * over with fake data.
 */

class LocalFrameworkBridge {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;
    this.isJobRunning = false;
    this.frameworkStatus = null;
    this.hasProbed = false;

    this.bindDOM();
    this.refreshStatus();
  }

  bindDOM() {
    const select = document.getElementById('local-fw-select');
    if (select) {
      select.addEventListener('change', () => this.updateRunButtonState());
    }

    const runBtn = document.getElementById('btn-dispatch-local-job');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runJob());
    }
  }

  async refreshStatus() {
    if (this.isJobRunning) return;
    const summaryEl = document.getElementById('local-fw-status-summary');
    const gridEl = document.getElementById('local-fw-capability-grid');
    if (summaryEl) {
      summaryEl.className = 'status-pill status-warn';
      summaryEl.innerHTML = '⏳ Probing real Python environment...';
    }

    try {
      const res = await fetch('/api/multiframework/status');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      this.frameworkStatus = data.frameworks;
      this.hasProbed = true;
      this.renderCapabilityGrid();
    } catch (err) {
      this.hasProbed = true;
      this.frameworkStatus = null;
      if (summaryEl) {
        summaryEl.className = 'status-pill status-warn';
        summaryEl.innerHTML = `⚠️ Backend Python worker unreachable: ${err.message}`;
      }
      if (gridEl) gridEl.innerHTML = '';
      this.updateRunButtonState();
    }
  }

  renderCapabilityGrid() {
    const summaryEl = document.getElementById('local-fw-status-summary');
    const gridEl = document.getElementById('local-fw-capability-grid');
    const select = document.getElementById('local-fw-select');
    if (!this.frameworkStatus) return;

    const entries = Object.entries(this.frameworkStatus);
    const availableCount = entries.filter(([, v]) => v.available).length;

    if (summaryEl) {
      if (availableCount === entries.length) {
        summaryEl.className = 'status-pill status-ready';
        summaryEl.innerHTML = `✓ ${availableCount}/${entries.length} frameworks live on this server`;
      } else if (availableCount > 0) {
        summaryEl.className = 'status-pill status-warn';
        summaryEl.innerHTML = `⚠️ ${availableCount}/${entries.length} frameworks available`;
      } else {
        summaryEl.className = 'status-pill status-warn';
        summaryEl.innerHTML = '⚠️ No frameworks available on this server';
      }
    }

    if (gridEl) {
      gridEl.innerHTML = entries.map(([name, info]) => {
        const label = { qiskit_aer: 'Qiskit Aer', cirq: 'Google Cirq', pennylane: 'PennyLane' }[name] || name;
        if (info.available) {
          const versions = Object.entries(info.backendVersion || {}).map(([k, v]) => `${k} ${v}`).join(', ');
          return `
            <div class="local-fw-capability-card available">
              <div class="fw-name">✓ ${label}</div>
              <div class="fw-detail">${versions}</div>
              <div class="fw-detail">${info.backendName || ''}</div>
            </div>`;
        }
        return `
          <div class="local-fw-capability-card unavailable">
            <div class="fw-name">✕ ${label}</div>
            <div class="fw-detail">${(info.error || 'Not available').slice(0, 140)}</div>
          </div>`;
      }).join('');
    }

    if (select) {
      Array.from(select.options).forEach((opt) => {
        const info = this.frameworkStatus[opt.value];
        opt.disabled = !info || !info.available;
      });
      const currentInfo = this.frameworkStatus[select.value];
      if (!currentInfo || !currentInfo.available) {
        const firstAvailable = entries.find(([, v]) => v.available);
        if (firstAvailable) select.value = firstAvailable[0];
      }
    }

    this.updateRunButtonState();
  }

  updateRunButtonState() {
    const runBtn = document.getElementById('btn-dispatch-local-job');
    const select = document.getElementById('local-fw-select');
    if (!runBtn) return;
    if (this.isJobRunning) {
      runBtn.disabled = true;
      return;
    }
    const info = this.frameworkStatus && select ? this.frameworkStatus[select.value] : null;
    runBtn.disabled = !info || !info.available;
  }

  async runJob() {
    if (this.isJobRunning) return;
    const select = document.getElementById('local-fw-select');
    const framework = select ? select.value : 'qiskit_aer';
    const statusBanner = document.getElementById('local-fw-job-status-banner');
    const runBtn = document.getElementById('btn-dispatch-local-job');
    const resultsContainer = document.getElementById('local-fw-results-container');

    if (!this.engine || typeof this.engine.toExecutableQASM !== 'function' || !this.circuitUI) {
      if (statusBanner) {
        statusBanner.style.display = 'block';
        statusBanner.className = 'job-status-banner status-error';
        statusBanner.innerHTML = '❌ Circuit engine not ready - cannot generate a circuit to execute.';
      }
      return;
    }

    this.isJobRunning = true;
    this.updateRunButtonState();
    if (runBtn) runBtn.innerHTML = `⏳ Executing on real ${framework}...`;

    if (statusBanner) {
      statusBanner.style.display = 'block';
      statusBanner.className = 'job-status-banner status-running';
      statusBanner.innerHTML = `🐍 Compiling circuit to OpenQASM 2.0 and dispatching to the real, installed <strong>${framework}</strong> runtime on the Ananta server...`;
    }

    try {
      const qasm = this.engine.toExecutableQASM(this.circuitUI.grid);
      const numQubits = this.circuitUI.numQubits;

      const res = await fetch('/api/multiframework/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework, qasm, numQubits, shots: 1024 })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `HTTP ${res.status}`);
      }

      if (statusBanner) {
        statusBanner.className = 'job-status-banner status-success';
        statusBanner.innerHTML = `
          <span>✓ Real execution completed on <strong>${result.backendName || framework}</strong></span>
          <span style="font-size:11px; margin-left:8px; opacity:0.8;">${result.shots} shots in ${result.executionTimeMs}ms</span>
        `;
      }

      this.renderResults(result);
    } catch (err) {
      if (statusBanner) {
        statusBanner.className = 'job-status-banner status-error';
        statusBanner.innerHTML = `❌ Real execution failed: ${err.message}`;
      }
      if (resultsContainer) resultsContainer.style.display = 'none';
    } finally {
      this.isJobRunning = false;
      this.updateRunButtonState();
      if (runBtn) runBtn.innerHTML = `⚡ Run on Real Simulator (1,024 Shots)`;
    }
  }

  renderResults(result) {
    const container = document.getElementById('local-fw-results-container');
    if (!container) return;

    container.style.display = 'block';
    const counts = result.counts || {};
    const idealProbabilities = result.idealProbabilities || {};
    const totalShots = result.shots || 1024;
    const allStates = Array.from(new Set([...Object.keys(counts), ...Object.keys(idealProbabilities)])).sort();

    let barsHtml = '';
    allStates.forEach((bitstring) => {
      const count = counts[bitstring] || 0;
      const measuredPct = ((count / totalShots) * 100).toFixed(1);
      const idealPct = ((idealProbabilities[bitstring] || 0) * 100).toFixed(1);
      barsHtml += `
        <div class="result-hist-row">
          <span class="hist-label">|${bitstring}⟩</span>
          <div class="hist-bar-track">
            <div class="hist-bar-fill" style="width: ${idealPct}%; background: rgba(148,163,184,0.4);" title="Ideal (exact statevector): ${idealPct}%"></div>
          </div>
          <div class="hist-bar-track">
            <div class="hist-bar-fill" style="width: ${measuredPct}%; background: linear-gradient(90deg, #f59e0b, #ef4444);" title="Measured shots: ${measuredPct}%"></div>
          </div>
          <span class="hist-val">${count} (${measuredPct}%) vs ideal ${idealPct}%</span>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="qpu-results-card">
        <div class="qpu-results-header">
          <strong>Real ${result.framework} Measurement Distribution</strong>
          <span style="font-size:12px; color:#94a3b8;">${totalShots} Total Shots · Grey = exact ideal probability, Amber/Red = actually sampled shots</span>
        </div>
        <div class="qpu-hist-list">
          ${barsHtml}
        </div>
      </div>
    `;
  }
}

window.LocalFrameworkBridge = LocalFrameworkBridge;
