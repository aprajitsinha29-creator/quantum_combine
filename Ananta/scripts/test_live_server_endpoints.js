/**
 * Comprehensive End-to-End Live HTTP Integration Test
 */

const http = require('http');
const assert = require('assert');

// Port for integration test
const TEST_PORT = 5577;
process.env.PORT = TEST_PORT.toString();

// Require server directly
require('../server');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          raw
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveTests() {
  // Wait 1.5 seconds for server listen
  await new Promise(r => setTimeout(r, 1500));

  console.log('================================================================');
  console.log(`🌐 TESTING LIVE HTTP SERVER REST ENDPOINTS ON PORT ${TEST_PORT}`);
  console.log('================================================================\n');

  // 1. GET /api/health
  console.log('--- [1] GET /api/health ---');
  const health = await makeRequest('/api/health');
  assert.strictEqual(health.statusCode, 200);
  assert(health.data.qbraidDevices.length >= 6, 'qBraid devices must be in health response');
  assert(health.data.activeFeatures.some(f => f.includes('qBraid')), 'qBraid must be listed in activeFeatures');
  assert(health.data.activeFeatures.some(f => f.includes('Quizzes')), 'Quizzes must be listed in activeFeatures');
  assert(health.data.activeFeatures.some(f => f.includes('Instructor')), 'Instructor must be listed in activeFeatures');
  console.log('✅ Health status OK with full qBraid & Instructor active features reported.');

  // 2. GET /api/qbraid/devices
  console.log('\n--- [2] GET /api/qbraid/devices ---');
  const qbDevs = await makeRequest('/api/qbraid/devices');
  assert.strictEqual(qbDevs.statusCode, 200);
  assert(qbDevs.data.success);
  assert(qbDevs.data.devices['quera_aquila']);
  assert(qbDevs.data.devices['ionq_aria_1']);
  console.log(`✅ Discovered ${qbDevs.data.count} qBraid backends successfully via REST.`);

  // 3. POST /api/qbraid/run
  console.log('\n--- [3] POST /api/qbraid/run ---');
  const runRes = await makeRequest('/api/qbraid/run', 'POST', {
    backend: 'ionq_aria_1',
    shots: 1024,
    numQubits: 2,
    qasm: 'OPENQASM 2.0;\nqreg q[2];\nh q[0];\ncx q[0],q[1];\n'
  });
  assert.strictEqual(runRes.statusCode, 200);
  assert(runRes.data.success);
  assert(runRes.data.counts);
  console.log(`✅ Circuit run on qBraid (${runRes.data.backend}) completed. Job: ${runRes.data.jobId}`);

  // 4. GET /api/quizzes
  console.log('\n--- [4] GET /api/quizzes ---');
  const quizRes = await makeRequest('/api/quizzes?topic=foundations&limit=3');
  assert.strictEqual(quizRes.statusCode, 200);
  assert(quizRes.data.session.questions.length > 0);
  console.log(`✅ Quiz questions retrieved (${quizRes.data.session.questions.length} questions).`);

  // 5. POST /api/quizzes/submit
  console.log('\n--- [5] POST /api/quizzes/submit ---');
  const qId = quizRes.data.session.questions[0].id;
  const answers = {};
  answers[qId] = 2; // option 2
  const gradeRes = await makeRequest('/api/quizzes/submit', 'POST', {
    answers,
    studentId: 'std_live_test',
    studentName: 'Live Test Scholar'
  });
  assert.strictEqual(gradeRes.statusCode, 200);
  assert(gradeRes.data.percentage !== undefined);
  assert(gradeRes.data.results[0].explanation);
  console.log(`✅ Automated grading verified. Score: ${gradeRes.data.score}/${gradeRes.data.totalQuestions} (${gradeRes.data.percentage}%). Proof delivered.`);

  // 6. GET /api/instructor/cohorts
  console.log('\n--- [6] GET /api/instructor/cohorts ---');
  const cohortsRes = await makeRequest('/api/instructor/cohorts');
  assert.strictEqual(cohortsRes.statusCode, 200);
  assert(cohortsRes.data.cohorts.length >= 2);
  console.log(`✅ Retrieved ${cohortsRes.data.cohorts.length} cohorts.`);

  // 7. GET /api/instructor/analytics
  console.log('\n--- [7] GET /api/instructor/analytics?cohortId=cohort_qc101 ---');
  const analyticsRes = await makeRequest('/api/instructor/analytics?cohortId=cohort_qc101');
  assert.strictEqual(analyticsRes.statusCode, 200);
  assert(analyticsRes.data.totalStudents > 0);
  assert(analyticsRes.data.commonMisconceptions.length > 0);
  console.log(`✅ Analytics OK: ${analyticsRes.data.totalStudents} students, ${analyticsRes.data.avgClassScore}% class avg.`);

  // 8. GET /api/instructor/export-gradebook
  console.log('\n--- [8] GET /api/instructor/export-gradebook ---');
  const csvRes = await makeRequest('/api/instructor/export-gradebook?cohortId=cohort_qc101');
  assert.strictEqual(csvRes.statusCode, 200);
  assert(csvRes.headers['content-type'].includes('text/csv'));
  assert(csvRes.raw.includes('Student ID,Student Name'));
  console.log(`✅ CSV Gradebook export generated and streamed successfully (${csvRes.raw.length} bytes).`);

  console.log('\n================================================================');
  console.log('🎉 ALL LIVE HTTP ENDPOINTS TESTED AND 100% OPERATIONAL!');
  console.log('================================================================\n');

  process.exit(0);
}

runLiveTests().catch(err => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
