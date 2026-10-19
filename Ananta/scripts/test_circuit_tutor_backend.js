const handler = require('../api/gemini.js');

async function testCircuitTutor() {
  console.log('=== TESTING AI CIRCUIT TUTOR BACKEND ===');

  const mockPayload = {
    numQubits: 3,
    activeDepth: 2,
    gridStructure: 'q0: H (t=1) -> CX_CTRL (t=2)\nq1: CX_TGT (t=2)\nq2: (idle - no gates)',
    diracNotation: '|ψ⟩ = 0.707|000⟩ + 0.707|110⟩',
    probabilities: { '|000⟩': 0.5, '|110⟩': 0.5 },
    mathMetrics: {
      concurrence: 1.0,
      entropy: 1.0,
      purity: 0.5,
      entanglementClass: 'Maximally Entangled Bell State'
    },
    deterministicErrors: [
      {
        type: 'warning',
        title: 'Idle Qubit Detected (q[2])',
        location: 'Wire q[2]',
        desc: 'Qubit q[2] has zero gates applied to it across all time steps.',
        fix: 'Add operations to wire q[2] or reduce circuit register size.'
      }
    ],
    userQuestion: ''
  };

  const req = {
    method: 'POST',
    url: 'http://127.0.0.1:5500/api/ai/tutor',
    headers: {},
    body: {
      task: 'circuit-tutor',
      payload: mockPayload
    }
  };

  let responseData = null;
  let statusCode = 200;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    setHeader: () => {},
    end: (d) => {
      if (d) {
        try { responseData = JSON.parse(d); } catch(e) { responseData = d; }
      }
    }
  };

  await handler(req, res);

  console.log('Status code:', statusCode);
  console.log('Tutor Response:', JSON.stringify(responseData, null, 2));

  if (responseData && (responseData.circuitSummary || (responseData.result && responseData.result.circuitSummary))) {
    console.log('\n SUCCESS: Circuit Tutor responded with valid grounded analysis!');
  } else {
    console.error('\n FAILURE: Unexpected tutor response shape');
    process.exit(1);
  }
}

testCircuitTutor().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
