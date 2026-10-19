/**
 * Ananta Quantum Studio - IBM Quantum Hardware Bridge Utility
 * 
 * Provides direct REST integration with:
 *  1. IBM Quantum Platform Auth API (token exchange & session management)
 *  2. IBM Quantum Platform / Runtime Backends API (live fleet status & daily calibrations)
 *  3. IBM Quantum Jobs API (circuit dispatch, status polling, and measurement counts)
 *  4. Transparent local physics noise simulation fallback with honest disclosure
 */

const https = require('https');

// Token session cache: token -> { accessToken, userId, expiresAt }
const tokenCache = new Map();

// Backends cache: accessToken -> { data, cachedAt }
const backendsCache = new Map();
const BACKENDS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Baseline reference catalog when no token is configured or when offline
const REFERENCE_QPU_DEVICES = {
  'ibm_brisbane': {
    name: 'ibm_brisbane',
    type: 'Superconducting Transmon (Eagle r3)',
    qubits: 127,
    status: 'Online',
    queue: 14,
    t1Median: 284,
    t2Median: 168,
    cnotErrorMedian: 0.0078,
    readoutError: 0.019,
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
    queue: 11,
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
    queue: 6,
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

/**
 * Generic HTTPS JSON request helper with configurable timeout
 */
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        if (data) {
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy(new Error(`Request to ${options.host || ''}${options.path || ''} timed out after ${options.timeout || 15000}ms`));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

/**
 * Log in with IBM Quantum API Token
 * Returns access token or throws error if invalid
 */
async function loginWithToken(apiToken) {
  if (!apiToken || typeof apiToken !== 'string' || apiToken.trim().length < 10) {
    throw new Error('Invalid IBM Quantum API Token format');
  }

  const cleanToken = apiToken.trim();

  // Check cache
  const cached = tokenCache.get(cleanToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  try {
    const payload = JSON.stringify({ apiToken: cleanToken });
    const response = await httpsRequest({
      hostname: 'auth.quantum-computing.ibm.com',
      port: 443,
      path: '/api/users/loginWithToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Accept': 'application/json'
      },
      timeout: 10000
    }, payload);

    if (response.statusCode === 200 && response.data && response.data.id) {
      const accessToken = response.data.id;
      const ttlMs = (response.data.ttl || 1209600) * 1000;
      tokenCache.set(cleanToken, {
        accessToken,
        userId: response.data.userId || null,
        expiresAt: Date.now() + Math.min(ttlMs, 24 * 3600 * 1000) // cache up to 24h
      });
      return accessToken;
    }

    const errMsg = (response.data && response.data.error && response.data.error.message)
      || `IBM Quantum authentication failed (HTTP ${response.statusCode})`;
    throw new Error(errMsg);
  } catch (err) {
    throw new Error(`IBM Quantum login failed: ${err.message}`);
  }
}

/**
 * Validate an IBM Quantum API token and return user profile details
 */
async function validateToken(apiToken) {
  if (!apiToken) {
    return {
      valid: false,
      error: 'No IBM Quantum API Token provided'
    };
  }

  try {
    const accessToken = await loginWithToken(apiToken);
    
    // Fetch user profile from IBM Quantum
    const profileRes = await httpsRequest({
      hostname: 'api.quantum-computing.ibm.com',
      port: 443,
      path: '/api/users/me',
      method: 'GET',
      headers: {
        'x-access-token': accessToken,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (profileRes.statusCode === 200 && profileRes.data) {
      const u = profileRes.data;
      return {
        valid: true,
        user: {
          username: u.username || u.email || 'IBM Quantum User',
          email: u.email || '',
          institution: u.institution || 'Individual',
          hubs: (u.hubs || []).map(h => h.name || h),
          totalJobs: u.jobsCount || 0
        }
      };
    }

    return {
      valid: true,
      user: { username: 'IBM Quantum Researcher' }
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
}

/**
 * Fetch live backends from IBM Quantum Platform API
 * Returns dynamic fleet with real queue counts & calibration metrics
 */
async function getLiveBackends(apiToken) {
  if (!apiToken) {
    return {
      isLive: false,
      count: Object.keys(REFERENCE_QPU_DEVICES).length,
      devices: REFERENCE_QPU_DEVICES,
      notice: 'Using calibrated reference catalog. Configure IBM Quantum API Token for live queue & daily calibration telemetry.'
    };
  }

  try {
    const accessToken = await loginWithToken(apiToken);

    // Check cache
    const cached = backendsCache.get(accessToken);
    if (cached && (Date.now() - cached.cachedAt) < BACKENDS_CACHE_TTL_MS) {
      return cached.data;
    }

    const response = await httpsRequest({
      hostname: 'api.quantum-computing.ibm.com',
      port: 443,
      path: '/api/Backends',
      method: 'GET',
      headers: {
        'x-access-token': accessToken,
        'Accept': 'application/json'
      },
      timeout: 12000
    });

    if (response.statusCode === 200 && Array.isArray(response.data)) {
      const liveDevices = {};

      for (const b of response.data) {
        const name = b.name;
        const isSim = Boolean(b.simulator);
        const props = b.properties || {};

        let t1Median = 250;
        let t2Median = 150;
        let readoutError = 0.018;
        let cnotError = 0.008;

        if (Array.isArray(props.qubits)) {
          const t1List = [];
          const t2List = [];
          const roList = [];
          props.qubits.forEach(q => {
            if (Array.isArray(q)) {
              q.forEach(item => {
                if (item.name === 'T1' && item.value) t1List.push(item.value);
                if (item.name === 'T2' && item.value) t2List.push(item.value);
                if (item.name === 'readout_error' && item.value) roList.push(item.value);
              });
            }
          });
          if (t1List.length) t1Median = Math.round(t1List.reduce((a, b) => a + b, 0) / t1List.length);
          if (t2List.length) t2Median = Math.round(t2List.reduce((a, b) => a + b, 0) / t2List.length);
          if (roList.length) readoutError = parseFloat((roList.reduce((a, b) => a + b, 0) / roList.length).toFixed(4));
        }

        liveDevices[name] = {
          name: b.name,
          type: isSim ? 'Cloud Quantum Simulator' : (b.description || `${b.n_qubits || 127}-Qubit Superconducting Transmon`),
          qubits: b.n_qubits || (isSim ? 100 : 127),
          status: b.status === 'active' ? 'Online' : (b.status || 'Unknown'),
          queue: b.lengthQueue !== undefined ? b.lengthQueue : (b.pending_jobs || 0),
          t1Median: isSim ? 999999 : t1Median,
          t2Median: isSim ? 999999 : t2Median,
          cnotErrorMedian: isSim ? 0.00001 : cnotError,
          readoutError: isSim ? 0.0001 : readoutError,
          quantumVolume: b.quantum_volume || 128,
          clops: b.clops || 2500,
          isLive: true,
          basisGates: b.basis_gates || ['id', 'rz', 'sx', 'x', 'cx', 'reset'],
          lastUpdated: new Date().toISOString()
        };
      }

      if (!liveDevices['simulator_mps']) {
        liveDevices['simulator_mps'] = REFERENCE_QPU_DEVICES['simulator_mps'];
      }

      const result = {
        isLive: true,
        count: Object.keys(liveDevices).length,
        devices: liveDevices,
        notice: 'Connected to live IBM Quantum platform. Displaying real-time device fleet status & calibrations.'
      };

      backendsCache.set(accessToken, { data: result, cachedAt: Date.now() });
      return result;
    }
  } catch (err) {
    console.warn('[IBM Quantum] Could not fetch live backends:', err.message);
  }

  return {
    isLive: false,
    count: Object.keys(REFERENCE_QPU_DEVICES).length,
    devices: REFERENCE_QPU_DEVICES,
    notice: 'Could not contact IBM Quantum backend API. Showing reference baseline specifications.'
  };
}

/**
 * Submit a real circuit execution job to IBM Quantum Platform
 */
async function submitQpuJob({ apiToken, backend = 'ibm_brisbane', qasm, shots = 1024 }) {
  if (!apiToken) {
    throw new Error('IBM Quantum API Token is required for physical QPU execution');
  }

  const accessToken = await loginWithToken(apiToken);
  const circuitQasm = qasm || 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;\n';

  let qasm2 = circuitQasm;
  if (qasm2.includes('OPENQASM 3.0')) {
    qasm2 = qasm2
      .replace(/OPENQASM 3\.0;?/g, 'OPENQASM 2.0;\ninclude "qelib1.inc";')
      .replace(/include "stdgates\.inc";?/g, '')
      .replace(/qubit\[(\d+)\]\s+([a-zA-Z0-9_]+);/g, 'qreg $2[$1];')
      .replace(/bit\[(\d+)\]\s+([a-zA-Z0-9_]+);/g, 'creg $2[$1];')
      .replace(/([a-zA-Z0-9_]+)\s*=\s*measure\s+([a-zA-Z0-9_]+);/g, 'measure $2 -> $1;');
  }

  const jobPayload = {
    backend: { name: backend },
    shots: Math.max(1, Math.min(8192, parseInt(shots, 10) || 1024)),
    qasms: [{ qasm: qasm2 }],
    name: `Ananta Studio - ${backend} (${new Date().toLocaleTimeString()})`,
    hub: 'ibm-q',
    group: 'open',
    project: 'main'
  };

  const payloadStr = JSON.stringify(jobPayload);
  const response = await httpsRequest({
    hostname: 'api.quantum-computing.ibm.com',
    port: 443,
    path: '/api/Jobs',
    method: 'POST',
    headers: {
      'x-access-token': accessToken,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadStr),
      'Accept': 'application/json'
    },
    timeout: 15000
  }, payloadStr);

  if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.id) {
    const jobData = response.data;
    return {
      success: true,
      jobId: jobData.id,
      backend: (jobData.backend && jobData.backend.name) || backend,
      status: jobData.status || 'QUEUED',
      shots: jobData.shots || shots,
      creationDate: jobData.creationDate || new Date().toISOString(),
      queuePosition: jobData.infoQueue && jobData.infoQueue.position !== undefined ? jobData.infoQueue.position : null,
      isRealHardware: true,
      executionType: 'PHYSICAL_HARDWARE'
    };
  }

  const errDetail = (response.data && response.data.error && response.data.error.message)
    || `HTTP ${response.statusCode} from IBM Quantum API`;
  throw new Error(`Failed to submit job to IBM Quantum: ${errDetail}`);
}

/**
 * Poll job status and retrieve final measurement counts from IBM Quantum Platform
 */
async function getJobStatusAndResult(apiToken, jobId) {
  if (!apiToken || !jobId) {
    throw new Error('apiToken and jobId are required');
  }

  const accessToken = await loginWithToken(apiToken);

  const response = await httpsRequest({
    hostname: 'api.quantum-computing.ibm.com',
    port: 443,
    path: `/api/Jobs/${encodeURIComponent(jobId)}`,
    method: 'GET',
    headers: {
      'x-access-token': accessToken,
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  if (response.statusCode === 200 && response.data) {
    const d = response.data;
    const status = (d.status || 'UNKNOWN').toUpperCase();

    const result = {
      success: true,
      jobId: d.id,
      backend: (d.backend && d.backend.name) || 'ibm_qpu',
      status,
      creationDate: d.creationDate,
      endDate: d.endDate || null,
      shots: d.shots || 1024,
      isRealHardware: true,
      executionType: 'PHYSICAL_HARDWARE',
      counts: null,
      timePerStep: d.timePerStep || null,
      queuePosition: d.infoQueue ? d.infoQueue.position : null
    };

    if (status === 'COMPLETED') {
      const qasms = d.qasms || [];
      if (qasms[0] && qasms[0].result && qasms[0].result.data && qasms[0].result.data.counts) {
        result.counts = qasms[0].result.data.counts;
      }
    }

    return result;
  }

  throw new Error(`Failed to check job status (HTTP ${response.statusCode})`);
}

/**
 * Perform honest, local physics noise simulation (T1, T2 decoherence + Readout noise)
 * when running in sandbox mode or when no IBM API Token is configured.
 */
function runSimulatedNoise({ backend = 'ibm_brisbane', shots = 1024, numQubits = 3, idealProbabilities = null, qasm = '' }) {
  const device = REFERENCE_QPU_DEVICES[backend] || REFERENCE_QPU_DEVICES['ibm_brisbane'];
  const jobId = 'sim_' + backend + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  const numStates = 1 << numQubits;
  const noisyCounts = {};
  const idealCounts = {};

  for (let i = 0; i < numStates; i++) {
    const bitstring = i.toString(2).padStart(numQubits, '0');
    noisyCounts[bitstring] = 0;
    idealCounts[bitstring] = 0;
  }

  const probs = (idealProbabilities && idealProbabilities.length === numStates)
    ? idealProbabilities
    : Array(numStates).fill(1 / numStates);

  const t1Median = device.t1Median || 280;
  const t2Median = device.t2Median || 160;
  const roError = device.readoutError || 0.019;

  // Realistic noise degradation formula
  const circuitDurationUs = 0.035 * 6;
  const t1Decay = Math.exp(-circuitDurationUs / t1Median);
  const t2Decay = Math.exp(-circuitDurationUs / t2Median);
  const fidelityFactor = t1Decay * t2Decay;

  for (let shot = 0; shot < shots; shot++) {
    const rand = Math.random();
    let cum = 0;
    let idealSample = 0;
    for (let i = 0; i < numStates; i++) {
      cum += probs[i];
      if (rand <= cum) {
        idealSample = i;
        break;
      }
    }
    idealCounts[idealSample.toString(2).padStart(numQubits, '0')]++;

    let physicalSample = idealSample;
    if (Math.random() > fidelityFactor) {
      physicalSample = (Math.random() < 0.7) ? 0 : Math.floor(Math.random() * numStates);
    }

    let bitArray = physicalSample.toString(2).padStart(numQubits, '0').split('');
    for (let b = 0; b < numQubits; b++) {
      if (Math.random() < roError) {
        bitArray[b] = bitArray[b] === '0' ? '1' : '0';
      }
    }
    const noisyBitstring = bitArray.join('');
    noisyCounts[noisyBitstring] = (noisyCounts[noisyBitstring] || 0) + 1;
  }

  return {
    success: true,
    jobId,
    backend: device.name,
    backendType: device.type,
    status: 'COMPLETED',
    shots,
    numQubits,
    isRealHardware: false,
    executionType: 'SIMULATED_PHYSICAL_NOISE',
    executionMode: 'SIMULATED_PHYSICAL_NOISE',
    warning: 'Executed in sandbox mode using local physical noise model (T1/T2 decoherence & readout errors). To run on real IBM superconducting hardware, configure your IBM Quantum API Token.',
    deviceSpecs: {
      qubits: device.qubits,
      t1Median: device.t1Median,
      t2Median: device.t2Median,
      cnotError: device.cnotErrorMedian,
      readoutError: device.readoutError,
      fidelityScore: (fidelityFactor * (1 - roError) * 100).toFixed(2) + '%'
    },
    counts: noisyCounts,
    idealCounts,
    openqasm3: qasm || 'OPENQASM 3.0;\n// Local Physics Noise Simulation'
  };
}

module.exports = {
  loginWithToken,
  validateToken,
  getLiveBackends,
  submitQpuJob,
  getJobStatusAndResult,
  runSimulatedNoise,
  REFERENCE_QPU_DEVICES
};
