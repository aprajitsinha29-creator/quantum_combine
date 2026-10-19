/**
 * Ananta Quantum Studio - Frontend Backend Client & Live Diagnostics Console
 * 
 * Manages:
 *  1. Live connection monitoring and heartbeat ping to Node.js / Vercel backend
 *  2. Unified API proxy calls to Google AI Studio (Gemini 2.5 Flash) with auto-client fallback
 *  3. Live QPU simulation & hardware bridge execution
 *  4. Real-time Diagnostics & Telemetry Console UI
 */

// Ensure global configuration exists even if config.js was not bundled.
// No key is embedded: this file is served to every visitor, so credentials stay
// in server environment variables and AI calls go through /api/gemini.
if (typeof window.ANANTA_CONFIG === 'undefined') {
  window.ANANTA_CONFIG = {
    GEMINI_API_KEY: (typeof localStorage !== 'undefined' && localStorage.getItem('ananta_gemini_key')) || '',
    OPENAI_API_KEY: "",
    DEFAULT_PROVIDER: "gemini"
  };
}

(function () {
  'use strict';

  async function safeJsonParse(res) {
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${raw.substring(0, 60).trim() || 'Error'}`);
      }
      throw new Error(`Unexpected non-JSON response from server: ${raw.substring(0, 60)}`);
    }
  }

  class AnantaBackendClient {
    constructor() {
      // Use relative / current origin when running in browser
      this.baseUrl = (typeof window !== 'undefined' && window.location.origin.includes('http'))
        ? window.location.origin
        : 'http://127.0.0.1:5500';

      this.isOnline = false;
      this.lastHealthData = null;
      this.pingInterval = null;
      this.clientLogs = [];

      this.init();
    }

    async init() {
      this.injectStyles();
      this.createConsoleDrawer();
      await this.checkHealth();

      // Periodic heartbeat check every 8 seconds
      this.pingInterval = setInterval(() => this.checkHealth(), 8000);
      console.log('[AnantaBackendClient] Initialized. Target server:', this.baseUrl);
    }

    _logClient(action, status, details = {}) {
      const entry = {
        time: new Date().toLocaleTimeString(),
        action,
        status,
        details
      };
      this.clientLogs.unshift(entry);
      if (this.clientLogs.length > 50) this.clientLogs.pop();
      this.renderDrawerLogs();
    }

    async checkHealth() {
      const startTime = performance.now();
      try {
        const res = await fetch(`${this.baseUrl}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await safeJsonParse(res);
          this.isOnline = true;
          this.lastHealthData = data;
          const latency = Math.round(performance.now() - startTime);
          this.updateNavPill(true, latency);
          this.updateDrawerHealth(data, latency);
          return data;
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        this.isOnline = false;
        this.updateNavPill(false, 0);
        this.updateDrawerHealth(null, 0, err.message);
        return null;
      }
    }

    updateNavPill(online, latency) {
      const pill = document.getElementById('btn-backend-status');
      const dot = document.getElementById('backend-status-dot');
      const text = document.getElementById('backend-status-text');

      if (!pill || !dot || !text) return;

      if (online) {
        pill.classList.remove('status-offline');
        pill.classList.add('status-online');
        dot.className = 'backend-pulse-dot dot-online';
        text.innerHTML = `Backend: <strong>LIVE</strong> <span class="backend-latency">${latency}ms</span>`;
        pill.title = `Ananta Backend Server ONLINE on ${this.baseUrl} (Ping: ${latency}ms) - Click for Diagnostics Console`;
      } else {
        pill.classList.remove('status-online');
        pill.classList.add('status-offline');
        dot.className = 'backend-pulse-dot dot-offline';
        text.innerHTML = `Backend: <strong>OFFLINE</strong>`;
        pill.title = `Backend unreachable on ${this.baseUrl} - Click for Diagnostics`;
      }
    }

    // Call /api/ai/audit (Transpiler Doctor)
    async callAiAudit(payload) {
      this._logClient('POST /api/ai/audit', 'PENDING', { framework: payload.framework });
      const startTime = performance.now();

      try {
        const res = await fetch(`${this.baseUrl}/api/ai/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await safeJsonParse(res);
        const latency = Math.round(performance.now() - startTime);

        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        this._logClient('POST /api/ai/audit', 'SUCCESS', {
          latency: latency + 'ms',
          circuit: data.audit?.circuitName,
          provider: data.metadata?.provider
        });

        return data;
      } catch (err) {
        this._logClient('POST /api/ai/audit', 'FAILED', { error: err.message });
        throw err;
      }
    }

    // Call /api/ai/roadmap (Topic Roadmap)
    async callAiRoadmap(payload) {
      this._logClient('POST /api/ai/roadmap', 'PENDING', { prompt: payload.userPrompt?.substring(0, 30) });
      const startTime = performance.now();

      try {
        const res = await fetch(`${this.baseUrl}/api/ai/roadmap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await safeJsonParse(res);
        const latency = Math.round(performance.now() - startTime);

        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        this._logClient('POST /api/ai/roadmap', 'SUCCESS', {
          latency: latency + 'ms',
          title: data.roadmap?.displayName,
          modules: data.roadmap?.moduleIds?.length
        });

        return data;
      } catch (err) {
        this._logClient('POST /api/ai/roadmap', 'FAILED', { error: err.message });
        throw err;
      }
    }

    // Call /api/ai/chat (Quantum Copilot Assistant)
    async callAiChat(message, context = '') {
      this._logClient('POST /api/ai/chat', 'PENDING', { message: message.substring(0, 30) });
      const startTime = performance.now();

      // 1. Try Backend Proxy
      try {
        const res = await fetch(`${this.baseUrl}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, context })
        });

        const data = await safeJsonParse(res);
        const latency = Math.round(performance.now() - startTime);

        if (res.ok && data.success) {
          this._logClient('POST /api/ai/chat', 'SUCCESS', { latency: latency + 'ms' });
          return data;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      } catch (backendErr) {
        console.warn('[AnantaBackendClient] Backend chat proxy failed, attempting direct Gemini client fetch:', backendErr.message);

        // 2. Direct client-side Gemini fallback
        const apiKey = window.ANANTA_CONFIG?.GEMINI_API_KEY;
        if (!apiKey) {
          this._logClient('POST /api/ai/chat', 'FAILED', { error: backendErr.message });
          throw backendErr;
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const directRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are Ananta's Quantum Copilot. Answer concisely: ${message}` }] }],
            generationConfig: { temperature: 0.2 }
          })
        });

        if (!directRes.ok) {
          throw new Error(`Google AI Studio HTTP ${directRes.status}`);
        }

        const directData = await directRes.json();
        const replyText = directData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        const latency = Math.round(performance.now() - startTime);

        const result = {
          success: true,
          reply: replyText.trim(),
          metadata: {
            provider: 'Google AI Studio (Client Direct)',
            model: 'gemini-2.5-flash',
            latencyMs: latency
          }
        };

        this._logClient('DIRECT Gemini 2.5 Flash', 'SUCCESS', { latency: latency + 'ms' });
        return result;
      }
    }

    // Call /api/qpu/run (Physical QPU Hardware Execution & Honest Simulation Dispatch)
    async runQpuCircuit(payload, token = '') {
      const activeToken = token || (typeof localStorage !== 'undefined' && localStorage.getItem('ananta_ibm_token')) || '';
      this._logClient('POST /api/qpu/run', 'PENDING', { backend: payload.backend, shots: payload.shots, hasToken: Boolean(activeToken) });
      const startTime = performance.now();

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (activeToken) headers['x-ibm-token'] = activeToken;

        const res = await fetch(`${this.baseUrl}/api/qpu/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...payload, token: activeToken })
        });

        const data = await safeJsonParse(res);
        const latency = Math.round(performance.now() - startTime);

        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        this._logClient('POST /api/qpu/run', 'SUCCESS', {
          latency: latency + 'ms',
          jobId: data.jobId,
          isRealHardware: data.isRealHardware,
          status: data.status
        });

        return data;
      } catch (err) {
        this._logClient('POST /api/qpu/run', 'FAILED', { error: err.message });
        throw err;
      }
    }

    // Call /api/qpu/auth (Validate IBM Quantum Token)
    async validateIbmToken(token) {
      try {
        const res = await fetch(`${this.baseUrl}/api/qpu/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-ibm-token': token },
          body: JSON.stringify({ token })
        });
        return await safeJsonParse(res);
      } catch (err) {
        return { valid: false, error: err.message };
      }
    }

    // Call /api/qpu/devices (Fetch Live Backends or Reference Catalog)
    async fetchQpuDevices(token = '') {
      try {
        const activeToken = token || (typeof localStorage !== 'undefined' && localStorage.getItem('ananta_ibm_token')) || '';
        const headers = {};
        if (activeToken) headers['x-ibm-token'] = activeToken;
        const res = await fetch(`${this.baseUrl}/api/qpu/devices`, { headers });
        return await safeJsonParse(res);
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Call /api/qpu/job/:id (Poll Job Status & Results)
    async pollQpuJob(jobId, token = '') {
      try {
        const activeToken = token || (typeof localStorage !== 'undefined' && localStorage.getItem('ananta_ibm_token')) || '';
        const headers = {};
        if (activeToken) headers['x-ibm-token'] = activeToken;
        const res = await fetch(`${this.baseUrl}/api/qpu/job/${encodeURIComponent(jobId)}`, { headers });
        return await safeJsonParse(res);
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Fetch server-side transaction logs
    async fetchServerLogs() {
      try {
        const res = await fetch(`${this.baseUrl}/api/logs`);
        if (res.ok) {
          const data = await safeJsonParse(res);
          return data.logs || [];
        }
      } catch (e) {
        console.warn('[AnantaBackendClient] Could not fetch server logs:', e.message);
      }
      return [];
    }

    // Ping test
    async testPing() {
      const pingBtn = document.getElementById('btn-test-ping');
      if (pingBtn) pingBtn.textContent = 'Pinging...';
      const health = await this.checkHealth();
      if (pingBtn) pingBtn.textContent = health ? '✓ Ping OK' : '✕ Ping Failed';
      setTimeout(() => {
        if (pingBtn) pingBtn.textContent = '⚡ Test Ping';
      }, 2000);
    }

    // Test Gemini Call
    async testGemini() {
      const btn = document.getElementById('btn-test-gemini');
      const out = document.getElementById('gemini-test-output');
      if (btn) btn.disabled = true;
      if (out) {
        out.style.display = 'block';
        out.textContent = 'Connecting to Google AI Studio (Gemini 2.5 Flash)...';
      }

      try {
        const res = await this.callAiChat('Confirm quantum connection with a 1-sentence greeting.');
        if (out) {
          out.innerHTML = `<strong style="color: #38bdf8;">[Gemini 2.5 Flash]:</strong> ${res.reply} <br><span style="font-size:11px; color:#94a3b8;">Latency: ${res.metadata.latencyMs}ms | Provider: ${res.metadata.provider}</span>`;
        }
      } catch (err) {
        if (out) {
          out.innerHTML = `<strong style="color: #f87171;">[Error]:</strong> ${err.message}`;
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    // UI Drawer Elements
    createConsoleDrawer() {
      if (document.getElementById('backend-console-drawer')) return;

      const drawer = document.createElement('div');
      drawer.id = 'backend-console-drawer';
      drawer.className = 'backend-console-drawer';
      drawer.innerHTML = `
        <div class="drawer-header">
          <div class="drawer-title-group">
            <span class="drawer-icon">⚛️</span>
            <div>
              <h3>Ananta Live Backend & AI Console</h3>
              <span class="drawer-subtitle">Real-time Node.js / Vercel server, Google AI Studio & QPU Hardware Telemetry</span>
            </div>
          </div>
          <button class="drawer-close-btn" onclick="window.toggleBackendConsole()">✕</button>
        </div>

        <div class="drawer-body">
          <!-- Server Status Card -->
          <div class="console-status-card" id="drawer-server-card">
            <div class="status-card-row">
              <span class="card-label">Server State</span>
              <span class="card-pill status-pill-online" id="drawer-status-pill">Checking...</span>
            </div>
            <div class="status-card-row">
              <span class="card-label">Server URL</span>
              <code class="code-url" id="drawer-server-url">${this.baseUrl}</code>
            </div>
            <div class="status-card-row">
              <span class="card-label">Google AI Studio</span>
              <span class="card-pill" id="drawer-ai-pill">Detecting...</span>
            </div>
            <div class="status-card-row">
              <span class="card-label">Roundtrip Latency</span>
              <strong id="drawer-latency-val">-- ms</strong>
            </div>
            <div class="status-actions-bar">
              <button class="btn-console-action" id="btn-test-ping" onclick="window.anantaBackend.testPing()">⚡ Test Ping</button>
              <button class="btn-console-action btn-gemini-test" id="btn-test-gemini" onclick="window.anantaBackend.testGemini()">🤖 Test Gemini 2.5 Flash</button>
            </div>
            <div class="gemini-test-box" id="gemini-test-output" style="display: none;"></div>
          </div>

          <!-- Live Activity Log -->
          <div class="console-logs-section">
            <div class="logs-section-header">
              <h4>Live API Transactions</h4>
              <button class="btn-clear-logs" onclick="window.anantaBackend.clearLogs()">Clear</button>
            </div>
            <div class="logs-stream-container" id="drawer-logs-stream">
              <div class="log-empty-msg">No API calls made yet in this session. Trigger an AI audit or QPU execution!</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(drawer);
    }

    updateDrawerHealth(data, latency, errorMsg = '') {
      const statusPill = document.getElementById('drawer-status-pill');
      const aiPill = document.getElementById('drawer-ai-pill');
      const latVal = document.getElementById('drawer-latency-val');

      if (!statusPill || !aiPill || !latVal) return;

      if (data && data.status === 'ONLINE') {
        statusPill.className = 'card-pill status-pill-online';
        statusPill.textContent = data.cloud ? `ONLINE (${data.cloud})` : 'ONLINE (Port 5500)';

        if (data.aiStudio?.status === 'CONNECTED') {
          aiPill.className = 'card-pill status-pill-online';
          aiPill.textContent = `Connected (${data.aiStudio.model})`;
        } else {
          aiPill.className = 'card-pill status-pill-warn';
          aiPill.textContent = 'Key Missing';
        }

        latVal.textContent = `${latency} ms`;
      } else {
        statusPill.className = 'card-pill status-pill-offline';
        statusPill.textContent = errorMsg ? `OFFLINE (${errorMsg})` : 'OFFLINE';

        aiPill.className = 'card-pill status-pill-offline';
        aiPill.textContent = 'Unavailable';

        latVal.textContent = '--';
      }
    }

    renderDrawerLogs() {
      const container = document.getElementById('drawer-logs-stream');
      if (!container) return;

      if (this.clientLogs.length === 0) {
        container.innerHTML = '<div class="log-empty-msg">No API calls recorded yet.</div>';
        return;
      }

      let html = '';
      this.clientLogs.forEach(entry => {
        const isSuccess = entry.status === 'SUCCESS';
        const isFailed = entry.status === 'FAILED';
        const badgeClass = isSuccess ? 'log-badge-success' : (isFailed ? 'log-badge-failed' : 'log-badge-pending');

        html += `
          <div class="log-item">
            <div class="log-meta">
              <span class="log-time">${entry.time}</span>
              <span class="log-action">${entry.action}</span>
              <span class="log-badge ${badgeClass}">${entry.status}</span>
            </div>
            <div class="log-details">${JSON.stringify(entry.details)}</div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    clearLogs() {
      this.clientLogs = [];
      this.renderDrawerLogs();
    }

    injectStyles() {
      if (document.getElementById('backend-client-styles')) return;

      const style = document.createElement('style');
      style.id = 'backend-client-styles';
      style.textContent = `
        /* Top Navigation Backend Status Pill */
        .backend-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 20px;
          font-family: 'Roboto Mono', monospace;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(8px);
          color: #f1f5f9;
          margin-right: 8px;
        }
        .backend-status-pill:hover {
          background: rgba(51, 65, 85, 0.9);
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-1px);
        }
        .backend-status-pill.status-online {
          border-color: rgba(52, 211, 153, 0.4);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
        }
        .backend-status-pill.status-offline {
          border-color: rgba(248, 113, 113, 0.4);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
        }
        .backend-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulseGreen 2s infinite;
        }
        .dot-offline {
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }
        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .backend-latency {
          color: #38bdf8;
          font-weight: 500;
          margin-left: 3px;
        }

        /* Backend Console Drawer */
        .backend-console-drawer {
          position: fixed;
          top: 0;
          right: -480px;
          width: 460px;
          height: 100vh;
          background: #0f172a;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.6);
          z-index: 99999;
          transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          font-family: 'Google Sans Text', sans-serif;
          color: #e2e8f0;
        }
        .backend-console-drawer.drawer-open {
          right: 0;
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          background: #1e293b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .drawer-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .drawer-icon {
          font-size: 24px;
        }
        .drawer-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
        }
        .drawer-subtitle {
          font-size: 11px;
          color: #94a3b8;
        }
        .drawer-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .drawer-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .drawer-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .console-status-card {
          background: #1e293b;
          border-radius: 10px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          margin-bottom: 20px;
        }
        .status-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 12.5px;
        }
        .card-label {
          color: #94a3b8;
        }
        .card-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-pill-online {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }
        .status-pill-offline {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
        }
        .status-pill-warn {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .code-url {
          font-family: 'Roboto Mono', monospace;
          background: rgba(0, 0, 0, 0.25);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11.5px;
          color: #38bdf8;
        }
        .status-actions-bar {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .btn-console-action {
          flex: 1;
          background: #334155;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-console-action:hover {
          background: #475569;
        }
        .btn-gemini-test {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border: none;
        }
        .btn-gemini-test:hover {
          background: linear-gradient(135deg, #1d4ed8, #6d28d9);
        }
        .gemini-test-box {
          margin-top: 12px;
          background: #090e1a;
          border-radius: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(56, 189, 248, 0.2);
          font-size: 12px;
          line-height: 1.5;
        }
        .console-logs-section {
          background: #1e293b;
          border-radius: 10px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .logs-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .logs-section-header h4 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
        }
        .btn-clear-logs {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 11px;
          cursor: pointer;
        }
        .btn-clear-logs:hover {
          color: #f1f5f9;
        }
        .logs-stream-container {
          max-height: 380px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .log-item {
          background: #090e1a;
          border-radius: 6px;
          padding: 8px 10px;
          border-left: 3px solid #38bdf8;
          font-size: 11.5px;
        }
        .log-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .log-time {
          color: #64748b;
          font-size: 10.5px;
        }
        .log-action {
          font-weight: 600;
          color: #cbd5e1;
        }
        .log-badge {
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 8px;
          font-weight: 700;
        }
        .log-badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .log-badge-failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .log-badge-pending { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
        .log-details {
          color: #94a3b8;
          font-family: 'Roboto Mono', monospace;
          font-size: 10px;
          word-break: break-all;
        }
        .log-empty-msg {
          color: #64748b;
          text-align: center;
          font-size: 12px;
          padding: 20px 0;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Global helper
  window.toggleBackendConsole = function () {
    const drawer = document.getElementById('backend-console-drawer');
    if (drawer) {
      drawer.classList.toggle('drawer-open');
    }
  };

  // Instantiate client on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.anantaBackend = new AnantaBackendClient();
    });
  } else {
    window.anantaBackend = new AnantaBackendClient();
  }
})();
