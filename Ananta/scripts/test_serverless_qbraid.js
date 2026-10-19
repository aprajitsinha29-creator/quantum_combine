/**
 * Test script for Vercel Serverless api/qbraid.js handler
 */

const assert = require('assert');
const handler = require('../api/qbraid');

function createMockReqRes({ url, method, body, headers = {} }) {
  const req = {
    url,
    method,
    headers: { host: 'localhost', ...headers },
    body
  };

  let statusCode = 200;
  let responseHeaders = {};
  let responseBody = '';

  const res = {
    writeHead: (code, hdrs) => {
      statusCode = code;
      responseHeaders = hdrs || {};
    },
    end: (chunk) => {
      if (chunk) responseBody = chunk;
    }
  };

  return {
    req,
    res,
    getResponse: () => ({
      statusCode,
      headers: responseHeaders,
      data: responseBody ? JSON.parse(responseBody) : {}
    })
  };
}

async function run() {
  console.log('Testing api/qbraid.js serverless handler...\n');

  // 1. GET /api/qbraid/devices
  {
    const { req, res, getResponse } = createMockReqRes({ url: '/api/qbraid/devices', method: 'GET' });
    await handler(req, res);
    const resp = getResponse();
    assert.strictEqual(resp.statusCode, 200);
    assert(resp.data.count >= 25, 'Should return all 28+ devices');
    console.log(`✅ GET /api/qbraid/devices returned ${resp.data.count} devices.`);
  }

  // 2. GET /api/qbraid/devices?provider=ionq
  {
    const { req, res, getResponse } = createMockReqRes({ url: '/api/qbraid/devices?provider=ionq', method: 'GET' });
    await handler(req, res);
    const resp = getResponse();
    assert.strictEqual(resp.statusCode, 200);
    assert(resp.data.count >= 4, 'Should filter by IonQ');
    console.log(`✅ GET /api/qbraid/devices?provider=ionq returned ${resp.data.count} IonQ devices.`);
  }

  // 3. POST /api/qbraid/recommend
  {
    const { req, res, getResponse } = createMockReqRes({
      url: '/api/qbraid/recommend',
      method: 'POST',
      body: {
        qasm: 'OPENQASM 2.0; include "qelib1.inc"; qreg q[2]; creg c[2]; h q[0]; cx q[0], q[1]; measure q -> c;',
        numQubits: 2,
        depth: 3
      }
    });
    await handler(req, res);
    const resp = getResponse();
    assert.strictEqual(resp.statusCode, 200);
    assert(resp.data.primaryRecommendation, 'Should return primary recommendation');
    console.log(`✅ POST /api/qbraid/recommend suggested: ${resp.data.primaryRecommendation.device.name} (${resp.data.primaryRecommendation.predictedFidelity}% fidelity).`);
  }

  // 4. POST /api/qbraid/transpile
  {
    const { req, res, getResponse } = createMockReqRes({
      url: '/api/qbraid/transpile',
      method: 'POST',
      body: {
        qasm: 'h q[0]; cx q[0], q[1];',
        backend: 'aws_braket_sv1',
        format: 'braket_python'
      }
    });
    await handler(req, res);
    const resp = getResponse();
    assert.strictEqual(resp.statusCode, 200);
    assert(resp.data.code.includes('braket.circuits'), 'Should transpile Braket code');
    console.log(`✅ POST /api/qbraid/transpile generated Braket SDK code successfully.`);
  }

  // 5. POST /api/qbraid/run (Simulated Mode)
  {
    const { req, res, getResponse } = createMockReqRes({
      url: '/api/qbraid/run',
      method: 'POST',
      body: {
        backend: 'ionq_aria_1',
        shots: 1024,
        qasm: 'h q[0]; cx q[0], q[1];',
        numQubits: 2
      }
    });
    await handler(req, res);
    const resp = getResponse();
    assert.strictEqual(resp.statusCode, 200);
    assert(resp.data.counts, 'Should return shot counts');
    assert(resp.data.circuitFidelityEstimate > 90, 'Fidelity estimate should be returned');
    console.log(`✅ POST /api/qbraid/run executed simulated noise with ${resp.data.shots} shots. Fidelity: ${resp.data.circuitFidelityEstimate}%.`);
  }

  console.log('\n🎉 ALL VERCEL SERVERLESS TESTS PASSED!');
}

run().catch(err => {
  console.error('❌ Serverless test failed:', err);
  process.exit(1);
});
