/**
 * Ananta Quantum Studio - qBraid Multi-Provider Hardware Bridge
 * 
 * Manages:
 *  1. Unconstrained Quantum Device Fleet discovery across 28+ processors
 *     (AWS Braket, QuEra, IonQ, Rigetti, OQC, IQM, IBM, Quantinuum, Xanadu, Simulators)
 *  2. Intelligent Circuit-to-Hardware Recommendation Engine with 1-click select
 *  3. Dynamic search, provider filtering, and sorting (qubits, fidelity, queue)
 *  4. Native multi-architecture code generation preview (OpenQASM 3.0, Braket SDK, Qiskit)
 *  5. qBraid API Key management (localStorage: ananta_qbraid_token)
 *  6. Quantum circuit dispatch and realistic open-system physics noise simulation
 */

class QBraidBridge {
  constructor(engine, circuitUI) {
    this.engine = engine;
    this.circuitUI = circuitUI;
    this.apiKey = localStorage.getItem('ananta_qbraid_token') || '';
    // A stored key is only "verified" if a previous live check said so. Absent
    // that record we must not imply the key works.
    this.keyState = this.apiKey
      ? (localStorage.getItem('ananta_qbraid_token_state') || 'unverified')
      : 'none';
    this.selectedBackend = 'ionq_aria_1';
    this.isJobRunning = false;
    this.devices = {};
    this.filterProvider = 'all';
    this.searchQuery = '';
    this.sortBy = 'recommended';
    this.activeViewTab = 'telemetry';
    this.currentRecommendation = null;

    this.init();
  }

  async init() {
    await this.fetchDeviceFleet();
    this.bindDOM();
    this.fetchRecommendations();
  }

  async fetchDeviceFleet() {
    try {
      const headers = {};
      if (this.apiKey) headers['x-qbraid-key'] = this.apiKey;

      const params = new URLSearchParams();
      if (this.filterProvider && this.filterProvider !== 'all') params.set('provider', this.filterProvider);
      if (this.searchQuery) params.set('search', this.searchQuery);

      const url = '/api/qbraid/devices' + (params.toString() ? `?${params.toString()}` : '');
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.devices) {
          this.devices = data.devices;
          this.renderDeviceDropdown();
          this.updateDeviceTelemetry();
        }
      }
    } catch (e) {
      console.warn('[qBraidBridge] Fleet discovery notice:', e.message);
    }
  }

  async fetchRecommendations() {
    try {
      if (!this.engine || typeof this.engine.toExecutableQASM !== 'function' || !this.circuitUI) return;
      const qasm = this.engine.toExecutableQASM(this.circuitUI.grid);
      const numQubits = this.circuitUI.numQubits || 3;
      const depth = (this.circuitUI.grid && this.circuitUI.grid[0]) ? this.circuitUI.grid[0].length : 5;

      const res = await fetch('/api/qbraid/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qasm,
          numQubits,
          depth,
          circuitType: 'general',
          shots: 1024
        })
      });

      if (res.ok) {
        const rec = await res.json();
        if (rec.success && rec.primaryRecommendation) {
          this.currentRecommendation = rec;
          this.renderRecommendationCard(rec);
          if (this.sortBy === 'recommended') {
            this.renderDeviceDropdown();
          }
        }
      }
    } catch (err) {
      console.warn('[qBraidBridge] Recommendation notice:', err.message);
    }
  }

  renderRecommendationCard(rec) {
    const container = document.getElementById('qbraid-smart-recommendation-container');
    if (!container) return;

    const primary = rec.primaryRecommendation;
    const catPicks = rec.categoryPicks || {};
    container.style.display = 'block';

    container.innerHTML = `
      <div class="qpu-recommendation-header">
        <span class="qpu-recommendation-badge">⭐ AI Hardware Recommendation for Your Circuit</span>
        <span class="qpu-fidelity-badge">${primary.predictedFidelity}% Predicted Fidelity</span>
      </div>
      <div class="qpu-recommendation-title-row">
        <span class="qpu-recommendation-name">${primary.device.name}</span>
        <span class="qpu-recommendation-provider">${primary.device.provider} • ${primary.device.type}</span>
      </div>
      <div class="qpu-recommendation-reason">${primary.reason}</div>
      <div class="qpu-recommendation-actions">
        <button type="button" class="btn-apply-recommendation" id="btn-apply-recommended-qpu" data-device-id="${primary.device.id}">
          ⚡ Select ${primary.device.name} (${primary.device.qubits}Q)
        </button>
        <div class="qpu-quick-picks-row">
          ${catPicks.fastestExecution ? `
            <span class="qpu-quick-pick-item" data-device-id="${catPicks.fastestExecution.device.id}" title="Instant execution / zero queue">
              ⚡ Fastest: ${catPicks.fastestExecution.device.name}
            </span>` : ''}
          ${catPicks.nativeTopology ? `
            <span class="qpu-quick-pick-item" data-device-id="${catPicks.nativeTopology.device.id}" title="Zero SWAP gates required">
              🌐 Zero-SWAP: ${catPicks.nativeTopology.device.name}
            </span>` : ''}
          ${catPicks.costEffective ? `
            <span class="qpu-quick-pick-item" data-device-id="${catPicks.costEffective.device.id}" title="Zero quantum credits required">
              💡 Free Tier: ${catPicks.costEffective.device.name}
            </span>` : ''}
        </div>
      </div>
    `;

    // Bind recommendation action button
    const applyBtn = document.getElementById('btn-apply-recommended-qpu');
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-device-id');
        this.selectBackend(targetId);
      });
    }

    // Bind quick pick items
    container.querySelectorAll('.qpu-quick-pick-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-device-id');
        this.selectBackend(targetId);
      });
    });
  }

  selectBackend(deviceId) {
    if (!deviceId) return;
    this.selectedBackend = deviceId;
    const select = document.getElementById('qbraid-backend-select');
    if (select) select.value = deviceId;
    this.updateDeviceTelemetry();
    const btn = document.getElementById('btn-dispatch-qbraid-job');
    if (btn) btn.innerHTML = `⚡ Run on qBraid (${this.selectedBackend})`;
    if (this.activeViewTab === 'transpile') {
      this.fetchTranspiledCode();
    }
  }

  renderDeviceDropdown() {
    const select = document.getElementById('qbraid-backend-select');
    const countBadge = document.getElementById('qbraid-fleet-count-badge');
    if (!select || !Object.keys(this.devices).length) return;

    let deviceList = Object.values(this.devices);

    // Apply client-side search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      deviceList = deviceList.filter(dev =>
        dev.name.toLowerCase().includes(q) ||
        dev.provider.toLowerCase().includes(q) ||
        dev.type.toLowerCase().includes(q) ||
        dev.id.toLowerCase().includes(q) ||
        (dev.architecture && dev.architecture.toLowerCase().includes(q))
      );
    }

    // Apply client-side provider filter
    if (this.filterProvider && this.filterProvider !== 'all') {
      const p = this.filterProvider.toLowerCase();
      deviceList = deviceList.filter(dev =>
        (dev.providerKey && dev.providerKey.includes(p)) ||
        dev.provider.toLowerCase().includes(p) ||
        (dev.architecture && dev.architecture.includes(p))
      );
    }

    // Apply sort
    if (this.sortBy === 'qubits') {
      deviceList.sort((a, b) => (b.qubits || 0) - (a.qubits || 0));
    } else if (this.sortBy === 'fidelity') {
      deviceList.sort((a, b) => (b.fidelity2Q || 0) - (a.fidelity2Q || 0));
    } else if (this.sortBy === 'queue') {
      deviceList.sort((a, b) => (a.queue || 0) - (b.queue || 0));
    } else if (this.sortBy === 'recommended' && this.currentRecommendation) {
      const primaryId = this.currentRecommendation.primaryRecommendation?.device?.id;
      deviceList.sort((a, b) => {
        if (a.id === primaryId) return -1;
        if (b.id === primaryId) return 1;
        return (b.fidelity2Q || 0) - (a.fidelity2Q || 0);
      });
    }

    if (countBadge) {
      countBadge.textContent = `${deviceList.length} of ${Object.keys(this.devices).length} Processors Available`;
    }

    select.innerHTML = '';
    if (deviceList.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No matching quantum hardware found';
      select.appendChild(opt);
      return;
    }

    deviceList.forEach(dev => {
      const opt = document.createElement('option');
      opt.value = dev.id;
      const fidelityPct = ((dev.fidelity2Q || 0.98) * 100).toFixed(1);
      opt.textContent = `${dev.name} (${dev.qubits} Qubits | 2Q ${fidelityPct}% | ${dev.provider} | ${dev.status})`;
      if (dev.id === this.selectedBackend) opt.selected = true;
      select.appendChild(opt);
    });

    // If current selected backend is not in filtered list, select the first visible
    if (!deviceList.some(d => d.id === this.selectedBackend) && deviceList[0]) {
      this.selectedBackend = deviceList[0].id;
      select.value = this.selectedBackend;
    }
  }

  updateDeviceTelemetry() {
    const card = document.getElementById('qbraid-telemetry-card');
    if (!card) return;

    const dev = this.devices[this.selectedBackend];
    if (!dev) {
      card.innerHTML = `<div style="padding:16px; color:#94a3b8;">Select a device to view live telemetry.</div>`;
      return;
    }

    const t1Formatted = dev.t1Median > 1000 ? `${(dev.t1Median / 1000000).toFixed(1)}s` : `${dev.t1Median}µs`;
    const t2Formatted = dev.t2Median > 1000 ? `${(dev.t2Median / 1000000).toFixed(1)}s` : `${dev.t2Median}µs`;
    const readoutPct = ((dev.readoutError || 0.01) * 100).toFixed(2);

    const basisGatesHtml = (dev.basisGates || ['rx', 'rz', 'cz']).map(g =>
      `<span class="qpu-basis-gate-pill">${g}</span>`
    ).join('');

    const featuresHtml = (dev.features || []).map(f =>
      `<span class="qpu-feature-tag">✓ ${f}</span>`
    ).join('');

    card.innerHTML = `
      <div class="qpu-telemetry-header">
        <div>
          <div class="qpu-telemetry-title">${dev.name}</div>
          <div class="qpu-telemetry-provider">${dev.provider} • ${dev.type}</div>
        </div>
        <span class="qpu-chip-status-badge ${dev.status.includes('Online') ? 'chip-online' : 'chip-queued'}">
          ● ${dev.status} (${dev.queue} in queue)
        </span>
      </div>

      <div class="qpu-metrics-grid">
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">Active Qubits</span>
          <span class="qpu-metric-val">${dev.qubits} Qubits</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">1Q Gate Fidelity</span>
          <span class="qpu-metric-val">${((dev.fidelity1Q || 0.999) * 100).toFixed(2)}%</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">2Q Gate Fidelity</span>
          <span class="qpu-metric-val">${((dev.fidelity2Q || 0.985) * 100).toFixed(2)}%</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">Topology</span>
          <span class="qpu-metric-val" style="font-size:12px;">${dev.topology || 'All-to-All'}</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">T₁ Relaxation</span>
          <span class="qpu-metric-val">${t1Formatted}</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">T₂ Dephasing</span>
          <span class="qpu-metric-val">${t2Formatted}</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">Readout Error</span>
          <span class="qpu-metric-val">${readoutPct}%</span>
        </div>
        <div class="qpu-metric-item">
          <span class="qpu-metric-label">Access Tier</span>
          <span class="qpu-metric-val" style="font-size:11.5px; color:#38bdf8;">${dev.pricing || 'qBraid Credits'}</span>
        </div>
      </div>

      <div class="qpu-basis-gates-row">
        <strong style="font-size:11.5px; color:#94a3b8; margin-right:4px;">Native Gates:</strong>
        ${basisGatesHtml}
      </div>

      ${featuresHtml ? `
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
        ${featuresHtml}
      </div>` : ''}
    `;
  }

  async fetchTranspiledCode() {
    const codeEl = document.getElementById('transpile-code-preview');
    const targetNameEl = document.getElementById('transpile-target-name');
    const formatLabelEl = document.getElementById('transpile-format-label');
    if (!codeEl) return;

    try {
      if (!this.engine || typeof this.engine.toExecutableQASM !== 'function' || !this.circuitUI) {
        codeEl.textContent = '// Circuit canvas empty - place quantum gates to inspect transpiled code';
        return;
      }
      const qasm = this.engine.toExecutableQASM(this.circuitUI.grid);
      codeEl.textContent = '// Generating native transpiled code for ' + this.selectedBackend + '...';

      const res = await fetch('/api/qbraid/transpile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qasm,
          backend: this.selectedBackend,
          format: 'auto'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          codeEl.textContent = data.code;
          if (targetNameEl) targetNameEl.textContent = `${data.deviceName} (${data.provider})`;
          if (formatLabelEl) formatLabelEl.textContent = `Format: ${data.format.toUpperCase()} • ${data.explanation}`;
          return;
        }
      }
      codeEl.textContent = qasm;
    } catch (err) {
      codeEl.textContent = '// Transpilation notice: ' + err.message;
    }
  }

  async saveApiKey(key) {
    if (!key || !key.trim()) {
      this.clearApiKey();
      return;
    }
    const cleanKey = key.trim();
    const statusEl = document.getElementById('qbraid-token-status');
    if (statusEl) {
      statusEl.className = 'status-pill status-warn';
      statusEl.innerHTML = '⏳ Verifying with qBraid...';
    }

    try {
      const res = await fetch('/api/qbraid/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        this.apiKey = cleanKey;
        this.setKeyState('verified', {
          user: data.user || 'qBraid Account',
          credits: data.credits != null ? data.credits : 100
        });
        await this.fetchDeviceFleet();
        return;
      }

      // qBraid itself rejected the key. Keep it in the box so the user can see
      // and correct it, but never claim it is connected - the old code fell
      // through to updateTokenStatus() below, which repainted the red
      // "Invalid Key" pill as a green "Saved" pill one tick after the alert.
      this.apiKey = cleanKey;
      this.setKeyState('rejected', { error: data.error || 'Invalid API Key' });
      alert(`qBraid Authentication notice: ${data.error || 'Invalid API Key'}`);
      this.fetchDeviceFleet();
      return;
    } catch (err) {
      // Network/transport failure is NOT the same as a rejected key: we simply
      // could not reach the verifier, so report it as unverified, not invalid.
      console.warn('[qBraidBridge] Key verification notice:', err);
      this.apiKey = cleanKey;
      this.setKeyState('unverified', { error: err.message });
      this.fetchDeviceFleet();
    }
  }

  /**
   * Single source of truth for "what do we actually know about this key".
   * Persisted alongside the key so a page reload cannot resurrect a green
   * "connected" pill for a key qBraid already rejected.
   */
  setKeyState(state, detail = {}) {
    this.keyState = state;
    if (this.apiKey) {
      localStorage.setItem('ananta_qbraid_token', this.apiKey);
      localStorage.setItem('ananta_qbraid_token_state', state);
    } else {
      localStorage.removeItem('ananta_qbraid_token');
      localStorage.removeItem('ananta_qbraid_token_state');
    }
    this.updateTokenStatus(detail);
  }

  clearApiKey() {
    this.apiKey = '';
    this.keyState = 'none';
    localStorage.removeItem('ananta_qbraid_token');
    localStorage.removeItem('ananta_qbraid_token_state');
    const input = document.getElementById('qbraid-api-token-input');
    if (input) input.value = '';
    this.updateTokenStatus();
    this.fetchDeviceFleet();
  }

  updateTokenStatus(detail = {}) {
    const statusEl = document.getElementById('qbraid-token-status');
    if (!statusEl) return;

    if (!this.apiKey) {
      statusEl.className = 'status-pill status-warn';
      statusEl.innerHTML = '⚠️ No Key (Simulated Physics Mode)';
      return;
    }

    const masked = `${this.apiKey.substring(0, 4)}••••••••${this.apiKey.substring(this.apiKey.length - 4)}`;

    if (this.keyState === 'verified') {
      statusEl.className = 'status-pill status-ready';
      statusEl.innerHTML = detail.user
        ? `✓ Connected: ${detail.user} (${detail.credits} Credits)`
        : `✓ Verified (${masked})`;
    } else if (this.keyState === 'rejected') {
      statusEl.className = 'status-pill status-warn';
      statusEl.innerHTML = `⚠️ Rejected by qBraid (${masked}) — Simulated Mode`;
    } else {
      statusEl.className = 'status-pill status-warn';
      statusEl.innerHTML = `⚠️ Unverified (${masked}) — Simulated Mode`;
    }
  }

  async runJob() {
    if (this.isJobRunning) return;
    this.isJobRunning = true;

    const btn = document.getElementById('btn-dispatch-qbraid-job');
    const statusBanner = document.getElementById('qbraid-job-status-banner');
    const resultsContainer = document.getElementById('qbraid-hardware-results-container');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ Executing on ${this.selectedBackend}...`;
    }

    if (statusBanner) {
      statusBanner.style.display = 'block';
      statusBanner.className = 'job-status-banner status-running';
      statusBanner.innerHTML = `🚀 Dispatched quantum circuit to <strong>${this.selectedBackend}</strong>. Simulating architecture noise channels...`;
    }

    try {
      if (!this.engine || typeof this.engine.toExecutableQASM !== 'function' || !this.circuitUI) {
        throw new Error('Circuit engine not ready - cannot generate OpenQASM for the current circuit.');
      }
      const qasm = this.engine.toExecutableQASM(this.circuitUI.grid);
      const numQubits = this.circuitUI ? this.circuitUI.numQubits : 3;
      const idealProbabilities = this.engine && typeof this.engine.getProbabilities === 'function'
        ? this.engine.getProbabilities().map(p => p.probability)
        : null;

      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) headers['x-qbraid-key'] = this.apiKey;

      const res = await fetch('/api/qbraid/run', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          backend: this.selectedBackend,
          shots: 1024,
          qasm,
          numQubits,
          idealProbabilities,
          apiKey: this.apiKey
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `HTTP ${res.status}`);
      }

      if (statusBanner) {
        statusBanner.className = 'job-status-banner status-success';
        statusBanner.innerHTML = `
          <span>✓ Execution Completed on <strong>${result.deviceName || result.backend}</strong> (Job: <code>${result.jobId}</code>)</span>
          <span style="font-size:11px; margin-left:8px; opacity:0.85;">Mode: ${result.executionMode || (result.isRealHardware ? 'REAL QPU HARDWARE' : 'SIMULATED')} • ${result.circuitFidelityEstimate ? `Est. Fidelity: ${result.circuitFidelityEstimate}% • ` : ''} (${result.shots} shots in ${result.executionTimeMs || 18}ms)</span>
        `;
      }

      this.renderResults(result);
    } catch (err) {
      if (statusBanner) {
        statusBanner.className = 'job-status-banner status-error';
        statusBanner.innerHTML = `❌ qBraid Execution Error: ${err.message}`;
      }
    } finally {
      this.isJobRunning = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `⚡ Run on qBraid (${this.selectedBackend})`;
      }
    }
  }

  renderResults(result) {
    const container = document.getElementById('qbraid-hardware-results-container');
    if (!container) return;

    container.style.display = 'block';
    const counts = result.counts || {};
    const totalShots = result.shots || 1024;
    const sortedStates = Object.keys(counts).sort();

    let barsHtml = '';
    sortedStates.forEach(bitstring => {
      const count = counts[bitstring];
      const probPct = ((count / totalShots) * 100).toFixed(1);
      barsHtml += `
        <div class="result-hist-row">
          <span class="hist-label">|${bitstring}⟩</span>
          <div class="hist-bar-track">
            <div class="hist-bar-fill" style="width: ${probPct}%; background: linear-gradient(90deg, #3b82f6, #06b6d4);"></div>
          </div>
          <span class="hist-val">${count} (${probPct}%)</span>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="qpu-results-card">
        <div class="qpu-results-header">
          <div>
            <strong>Measurement Shot Distribution (${result.deviceName || result.backend})</strong>
            ${result.circuitFidelityEstimate ? `<span style="font-size:11px; color:#34d399; margin-left:8px;">Circuit Fidelity: ${result.circuitFidelityEstimate}%</span>` : ''}
          </div>
          <span style="font-size:12px; color:#94a3b8;">${totalShots} Total Shots</span>
        </div>
        <div class="qpu-hist-list">
          ${barsHtml}
        </div>
      </div>
    `;
  }

  bindDOM() {
    // Backend select change
    const select = document.getElementById('qbraid-backend-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.selectBackend(e.target.value);
      });
    }

    // Provider filter pills
    const pills = document.querySelectorAll('#qbraid-provider-pills .qbraid-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.filterProvider = pill.getAttribute('data-provider') || 'all';
        this.renderDeviceDropdown();
        this.updateDeviceTelemetry();
      });
    });

    // Search input
    const searchInput = document.getElementById('qbraid-search-input');
    const searchClear = document.getElementById('qbraid-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        if (searchClear) searchClear.style.display = this.searchQuery ? 'block' : 'none';
        this.renderDeviceDropdown();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.searchQuery = '';
        searchClear.style.display = 'none';
        this.renderDeviceDropdown();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('qbraid-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderDeviceDropdown();
      });
    }

    // View tabs: Telemetry vs Transpiled Code
    const tabTelemetry = document.getElementById('tab-qbraid-telemetry');
    const tabTranspile = document.getElementById('tab-qbraid-transpile');
    const cardTelemetry = document.getElementById('qbraid-telemetry-card');
    const cardTranspile = document.getElementById('qbraid-transpile-card');

    if (tabTelemetry && tabTranspile) {
      tabTelemetry.addEventListener('click', () => {
        tabTelemetry.classList.add('active');
        tabTranspile.classList.remove('active');
        if (cardTelemetry) cardTelemetry.style.display = 'block';
        if (cardTranspile) cardTranspile.style.display = 'none';
        this.activeViewTab = 'telemetry';
      });

      tabTranspile.addEventListener('click', () => {
        tabTranspile.classList.add('active');
        tabTelemetry.classList.remove('active');
        if (cardTelemetry) cardTelemetry.style.display = 'none';
        if (cardTranspile) cardTranspile.style.display = 'block';
        this.activeViewTab = 'transpile';
        this.fetchTranspiledCode();
      });
    }

    // Copy transpiled code
    const copyBtn = document.getElementById('btn-copy-transpiled');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const codeEl = document.getElementById('transpile-code-preview');
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent || '');
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Code'; }, 2000);
        }
      });
    }

    // API Key actions
    const saveBtn = document.getElementById('btn-save-qbraid-token');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const input = document.getElementById('qbraid-api-token-input');
        if (input) this.saveApiKey(input.value);
      });
    }

    const clearBtn = document.getElementById('btn-clear-qbraid-token');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearApiKey());
    }

    // Dispatch button
    const runBtn = document.getElementById('btn-dispatch-qbraid-job');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runJob());
    }

    const input = document.getElementById('qbraid-api-token-input');
    if (input && this.apiKey) {
      input.value = this.apiKey;
    }
    this.updateTokenStatus();
  }
}

window.QBraidBridge = QBraidBridge;
