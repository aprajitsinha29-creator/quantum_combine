/**
 * Post-Quantum Cryptography Security Auditor — Ananta
 * =====================================================================
 * Calculates the quantum resource requirements to break common classical
 * cryptographic schemes using Shor's algorithm, and recommends NIST-approved
 * Post-Quantum Cryptography (PQC) replacements.
 *
 * Algorithms referenced:
 *   - Beauregard (2003): Shor circuit for RSA using 2n+3 logical qubits
 *   - Roetteler et al (2017): Elliptic curve Shor variant
 *   - NIST PQC (2024): CRYSTALS-Kyber, Dilithium, SPHINCS+
 *   - Surface code overhead: d=7 gives ~0.1% logical error rate
 */

class PQCSecurityAuditor {
  constructor() {
    // NIST PQC Standard recommendations (2024)
    this.pqcRecommendations = {
      kem: [
        {
          name: 'CRYSTALS-Kyber (ML-KEM)',
          standard: 'NIST FIPS 203',
          year: 2024,
          basis: 'Module Learning With Errors (MLWE)',
          securityLevel: 'AES-128 / AES-192 / AES-256 equivalent',
          keySize: '800 / 1184 / 1568 bytes',
          status: 'STANDARDIZED',
          color: '#34d399',
          icon: 'K',
          use: 'Key Encapsulation / TLS 1.4 / HTTPS'
        }
      ],
      sig: [
        {
          name: 'CRYSTALS-Dilithium (ML-DSA)',
          standard: 'NIST FIPS 204',
          year: 2024,
          basis: 'Module Learning With Errors (MLWE)',
          securityLevel: 'AES-128 / AES-192 / AES-256 equivalent',
          keySize: '1312 / 1952 / 2592 bytes (public)',
          status: 'STANDARDIZED',
          color: '#60a5fa',
          icon: 'D',
          use: 'Digital Signatures / Code Signing / JWT'
        },
        {
          name: 'SPHINCS+ (SLH-DSA)',
          standard: 'NIST FIPS 205',
          year: 2024,
          basis: 'Hash-based (stateless)',
          securityLevel: 'Conservative security proof',
          keySize: '64 / 96 / 128 bytes (public)',
          status: 'STANDARDIZED',
          color: '#a78bfa',
          icon: 'S',
          use: 'Root CAs / Long-lived signatures / PKI'
        },
        {
          name: 'FALCON (FN-DSA)',
          standard: 'NIST FIPS 206',
          year: 2024,
          basis: 'NTRU Lattice',
          securityLevel: 'AES-128 / AES-256 equivalent',
          keySize: '897 / 1793 bytes (public)',
          status: 'STANDARDIZED',
          color: '#fb923c',
          icon: 'F',
          use: 'Compact signatures / IoT / Embedded systems'
        }
      ]
    };

    // Classical schemes to analyze
    this.schemes = {
      'RSA-1024':  { type: 'RSA', bits: 1024, logicalQubits: 2*1024+3,  desc: 'RSA-1024 (legacy, already broken classically)' },
      'RSA-2048':  { type: 'RSA', bits: 2048, logicalQubits: 2*2048+3,  desc: 'RSA-2048 (current banking/TLS standard)' },
      'RSA-4096':  { type: 'RSA', bits: 4096, logicalQubits: 2*4096+3,  desc: 'RSA-4096 (high-security applications)' },
      'ECC-256':   { type: 'ECC', bits: 256,  logicalQubits: 2521,       desc: 'ECC P-256 (ECDSA, Bitcoin, TLS)' },
      'ECC-384':   { type: 'ECC', bits: 384,  logicalQubits: 3765,       desc: 'ECC P-384 (NSA Suite B, Gov. systems)' },
      'ECC-521':   { type: 'ECC', bits: 521,  logicalQubits: 5219,       desc: 'ECC P-521 (Top Secret classified)' },
      'DH-2048':   { type: 'DH',  bits: 2048, logicalQubits: 4096+6,     desc: 'Diffie-Hellman 2048-bit (VPN, SSH)' },
      'AES-128':   { type: 'SYM', bits: 128,  logicalQubits: 2953,       desc: 'AES-128 (Grover: requires 2^64 ops, safe)' },
      'AES-256':   { type: 'SYM', bits: 256,  logicalQubits: 6681,       desc: 'AES-256 (Grover: requires 2^128 ops, safe)' }
    };

    this.selectedScheme = 'RSA-2048';
    this.init();
  }

  init() {
    this._bindEvents();
    this._renderSchemeCards();
    this._runAnalysis('RSA-2048');
  }

  _bindEvents() {
    const schemeSelect = document.getElementById('pqc-scheme-select');
    if (schemeSelect) {
      schemeSelect.addEventListener('change', (e) => {
        this.selectedScheme = e.target.value;
        this._runAnalysis(e.target.value);
      });
    }

    const btnAnalyze = document.getElementById('btn-pqc-analyze');
    if (btnAnalyze) {
      btnAnalyze.addEventListener('click', () => {
        this._runAnalysis(this.selectedScheme);
      });
    }

    // Quick-select scheme cards
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.pqc-scheme-card');
      if (card && card.dataset.scheme) {
        this.selectedScheme = card.dataset.scheme;
        document.querySelectorAll('.pqc-scheme-card').forEach(c => c.classList.remove('pqc-scheme-selected'));
        card.classList.add('pqc-scheme-selected');
        const sel = document.getElementById('pqc-scheme-select');
        if (sel) sel.value = card.dataset.scheme;
        this._runAnalysis(card.dataset.scheme);
      }
    });
  }

  _physicalQubits(logicalQubits, codeDistance) {
    // Surface code: d^2 * 2 physical qubits per logical qubit (rotated code)
    return logicalQubits * 2 * codeDistance * codeDistance;
  }

  _circuitDepth(scheme) {
    // Beauregard Shor gate count ~ n^3 modular exponentiation
    const n = scheme.bits;
    if (scheme.type === 'SYM') return Math.pow(2, n / 2); // Grover
    return n * n * n * 10; // Shor
  }

  _coherenceRequired(depth, gateTimeNs) {
    return (depth * gateTimeNs) / 1000; // microseconds
  }

  _estimateYear(logicalQubits) {
    // Extrapolate from current growth: ~2x qubits/year
    // IBM 2023: 1121 qubits, target 100K by 2033
    if (logicalQubits < 5000) return 2031;
    if (logicalQubits < 20000) return 2034;
    if (logicalQubits < 100000) return 2038;
    return 2045;
  }

  _riskLevel(scheme) {
    if (scheme.type === 'SYM' && scheme.bits >= 256) return { level: 'LOW', color: '#34d399', label: 'Quantum-Safe (with Grover)', icon: 'SAFE' };
    if (scheme.type === 'SYM' && scheme.bits === 128) return { level: 'MEDIUM', color: '#fbbf24', label: 'Reduced Security (2^64 with Grover)', icon: 'CAUTION' };
    if (scheme.bits >= 4096) return { level: 'MEDIUM', color: '#fbbf24', label: 'High Near-Term Safety', icon: 'WATCH' };
    return { level: 'HIGH', color: '#f87171', label: 'QUANTUM VULNERABLE', icon: 'DANGER' };
  }

  _runAnalysis(schemeKey) {
    const scheme = this.schemes[schemeKey];
    if (!scheme) return;
    this.selectedScheme = schemeKey;

    const d7physical  = this._physicalQubits(scheme.logicalQubits, 7);
    const d15physical = this._physicalQubits(scheme.logicalQubits, 15);
    const depth       = this._circuitDepth(scheme);
    const coherUs     = this._coherenceRequired(depth, 100);
    const threatYear  = this._estimateYear(scheme.logicalQubits);
    const risk        = this._riskLevel(scheme);
    const currentYear = new Date().getFullYear();
    const yearsLeft   = Math.max(0, threatYear - currentYear);

    this._renderThreatSummary(scheme, d7physical, d15physical, risk);
    this._renderResourceTable(scheme, d7physical, d15physical, depth, coherUs);
    this._renderThreatTimeline(currentYear, threatYear, yearsLeft);
    this._renderPQCRecommendations(risk);
  }

  _renderThreatSummary(scheme, d7phys, d15phys, risk) {
    const el = document.getElementById('pqc-threat-summary');
    if (!el) return;
    el.innerHTML =
      '<div class="pqc-risk-banner" style="border-color:' + risk.color + ';background:' + risk.color + '11">' +
      '<div class="pqc-risk-icon" style="color:' + risk.color + '">' + risk.icon + '</div>' +
      '<div class="pqc-risk-content">' +
      '<div class="pqc-risk-level" style="color:' + risk.color + '">' + risk.level + ' RISK</div>' +
      '<div class="pqc-risk-label">' + risk.label + '</div>' +
      '<div class="pqc-risk-desc">' + scheme.desc + '</div>' +
      '</div>' +
      '<div class="pqc-qubit-callout">' +
      '<div class="pqc-qubit-num">' + d7phys.toLocaleString() + '</div>' +
      '<div class="pqc-qubit-label">Physical Qubits<br><span style="color:#94a3b8;font-size:10px">(Surface Code d=7)</span></div>' +
      '</div>' +
      '</div>';
  }

  _renderResourceTable(scheme, d7phys, d15phys, depth, coherUs) {
    const el = document.getElementById('pqc-resource-table');
    if (!el) return;
    const coherStr = coherUs > 1e9 ? (coherUs / 1e9).toFixed(1) + ' ks' :
                     coherUs > 1e6 ? (coherUs / 1e6).toFixed(1) + ' ms' :
                     coherUs > 1000 ? (coherUs / 1000).toFixed(1) + ' ms' : coherUs.toFixed(0) + ' us';
    const rows = [
      ['Logical Qubits (Shor)', scheme.logicalQubits.toLocaleString(), '#60a5fa'],
      ['Physical Qubits (d=7)', d7phys.toLocaleString(), '#a78bfa'],
      ['Physical Qubits (d=15)', d15phys.toLocaleString(), '#f472b6'],
      ['Circuit Depth (gates)', depth > 1e15 ? depth.toExponential(2) : depth.toLocaleString(), '#fbbf24'],
      ['Coherence Time Needed', coherStr, '#fb923c'],
      ['Current Best T1 (IBM Eagle)', '284 us', '#64748b'],
      ['Gap (coherence needed / available)', (coherUs / 284).toExponential(2) + 'x', '#f87171']
    ];

    el.innerHTML = rows.map(([label, value, color]) =>
      '<div class="pqc-res-row">' +
      '<span class="pqc-res-label">' + label + '</span>' +
      '<span class="pqc-res-value" style="color:' + color + '">' + value + '</span>' +
      '</div>'
    ).join('');
  }

  _renderThreatTimeline(currentYear, threatYear, yearsLeft) {
    const el = document.getElementById('pqc-timeline');
    if (!el) return;
    const startYear = 2024;
    const endYear   = Math.max(threatYear + 3, 2050);
    const span      = endYear - startYear;
    const currentPct = ((currentYear - startYear) / span) * 100;
    const threatPct  = ((threatYear  - startYear) / span) * 100;

    el.innerHTML =
      '<div class="pqc-timeline-header">Quantum Threat Timeline</div>' +
      '<div class="pqc-timeline-track">' +
      '<div class="pqc-timeline-fill" style="width:' + currentPct.toFixed(1) + '%"></div>' +
      '<div class="pqc-timeline-marker pqc-marker-current" style="left:' + currentPct.toFixed(1) + '%">' +
      '<div class="pqc-marker-flag pqc-flag-current">Now (' + currentYear + ')</div>' +
      '</div>' +
      '<div class="pqc-timeline-marker pqc-marker-threat" style="left:' + threatPct.toFixed(1) + '%">' +
      '<div class="pqc-marker-flag pqc-flag-threat">FTQC Threat (~' + threatYear + ')</div>' +
      '</div>' +
      '</div>' +
      '<div class="pqc-timeline-labels">' +
      '<span>' + startYear + '</span>' +
      '<span style="color:#fbbf24;font-weight:600">' + yearsLeft + ' years to migrate</span>' +
      '<span>' + endYear + '</span>' +
      '</div>' +
      '<div class="pqc-timeline-milestones">' +
      this._timelineMilestones(startYear, endYear, span) +
      '</div>';
  }

  _timelineMilestones(start, end, span) {
    const milestones = [
      { year: 2024, label: 'NIST PQC Standards', color: '#34d399' },
      { year: 2027, label: 'IBM 100K QPU target', color: '#60a5fa' },
      { year: 2030, label: 'Error-corrected qubits', color: '#a78bfa' },
      { year: 2035, label: 'FTQC near-term', color: '#fbbf24' },
      { year: 2040, label: 'Full FTQC', color: '#f87171' }
    ];
    return milestones.filter(m => m.year >= start && m.year <= end).map(m => {
      const pct = ((m.year - start) / span) * 100;
      return '<div class="pqc-milestone" style="left:' + pct.toFixed(1) + '%">' +
        '<div class="pqc-milestone-dot" style="background:' + m.color + '"></div>' +
        '<div class="pqc-milestone-label">' + m.year + '<br>' + m.label + '</div>' +
        '</div>';
    }).join('');
  }

  _renderPQCRecommendations(risk) {
    const el = document.getElementById('pqc-recommendations');
    if (!el) return;
    const allRecs = [...this.pqcRecommendations.kem, ...this.pqcRecommendations.sig];
    el.innerHTML = '<div class="pqc-rec-header">NIST-Standardized Post-Quantum Replacements (2024)</div>' +
      allRecs.map(r =>
        '<div class="pqc-rec-card">' +
        '<div class="pqc-rec-icon" style="background:' + r.color + '22;color:' + r.color + ';border:1.5px solid ' + r.color + '44">' + r.icon + '</div>' +
        '<div class="pqc-rec-body">' +
        '<div class="pqc-rec-title">' + r.name + '</div>' +
        '<div class="pqc-rec-standard">' + r.standard + ' (' + r.year + ')</div>' +
        '<div class="pqc-rec-basis">Based on: ' + r.basis + '</div>' +
        '<div class="pqc-rec-use">' + r.use + '</div>' +
        '</div>' +
        '<div class="pqc-rec-status" style="color:' + r.color + '">' + r.status + '</div>' +
        '</div>'
      ).join('');
  }

  _renderSchemeCards() {
    const container = document.getElementById('pqc-scheme-cards');
    if (!container) return;
    const groups = [
      { label: 'RSA', schemes: ['RSA-1024','RSA-2048','RSA-4096'] },
      { label: 'ECC / ECDSA', schemes: ['ECC-256','ECC-384','ECC-521'] },
      { label: 'DH / Symmetric', schemes: ['DH-2048','AES-128','AES-256'] }
    ];
    container.innerHTML = groups.map(g =>
      '<div class="pqc-scheme-group">' +
      '<div class="pqc-group-label">' + g.label + '</div>' +
      g.schemes.map(key => {
        const s = this.schemes[key];
        const isSelected = key === this.selectedScheme;
        const risk = this._riskLevel(s);
        return '<div class="pqc-scheme-card ' + (isSelected ? 'pqc-scheme-selected' : '') + '" data-scheme="' + key + '">' +
          '<div class="pqc-card-name">' + key + '</div>' +
          '<div class="pqc-card-dot" style="background:' + risk.color + '"></div>' +
          '</div>';
      }).join('') +
      '</div>'
    ).join('');
  }
}

window.PQCSecurityAuditor = PQCSecurityAuditor;
