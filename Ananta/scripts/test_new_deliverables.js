/**
 * Verification Test Script for Deliverable 3 (qBraid) and Deliverable 5 (Assessment & Instructor Portal)
 */

const assert = require('assert');
const qbraidClient = require('../ananta-backend/utils/qbraidClient');
const quizEngine = require('../ananta-backend/utils/quizEngine');
const instructorStorage = require('../ananta-backend/utils/instructorStorage');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE BACKEND VERIFICATION FOR DELIVERABLES 3 & 5');
  console.log('================================================================\n');

  // ================= 1. QBRAID BACKEND TESTS =================
  console.log('--- [Test 1] qBraid Device Fleet Discovery ---');
  const fleet = await qbraidClient.getLiveBackends('');
  assert(fleet.count >= 6, `Expected at least 6 qBraid backends, found ${fleet.count}`);
  assert(fleet.devices['quera_aquila'], 'QuEra Aquila should be in device fleet');
  assert(fleet.devices['ionq_aria_1'], 'IonQ Aria 1 should be in device fleet');
  assert(fleet.devices['aws_braket_sv1'], 'AWS Braket SV1 should be in device fleet');
  console.log(`✅ Passed: Discovered ${fleet.count} qBraid backends across AWS, QuEra, IonQ, Rigetti, OQC, and qBraid.`);

  console.log('\n--- [Test 2] qBraid Multi-Architecture Noise Simulation ---');
  const qasmBell = 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;\n';
  const qbraidSim = qbraidClient.runSimulatedNoise({
    backend: 'quera_aquila',
    shots: 1024,
    numQubits: 2,
    qasm: qasmBell
  });
  assert(qbraidSim.success, 'qBraid simulation should succeed');
  assert(qbraidSim.counts, 'qBraid simulation should return measurement counts');
  const totalCounts = Object.values(qbraidSim.counts).reduce((a, b) => a + b, 0);
  assert(totalCounts === 1024, `Total counts should equal shots (1024), got ${totalCounts}`);
  console.log(`✅ Passed: QuEra Neutral-Atom simulation executed successfully. Sample counts:`, qbraidSim.counts);

  // ================= 2. QUIZ & AUTOMATED GRADING TESTS =================
  console.log('\n--- [Test 3] Quantum Quiz Catalog & Question Session ---');
  const catalog = quizEngine.getQuizCatalog();
  assert(catalog.length === 5, `Expected 5 quiz domains, got ${catalog.length}`);
  const session = quizEngine.getQuizQuestions({ topic: 'gates', limit: 3 });
  assert(session.count > 0, 'Should return questions for gates topic');
  // Verify cheating prevention: correctIndex and explanation must NOT be present
  assert(session.questions[0].correctIndex === undefined, 'Sanitized question must NOT contain correctIndex');
  assert(session.questions[0].explanation === undefined, 'Sanitized question must NOT contain explanation');
  console.log(`✅ Passed: Generated sanitized test session with ${session.count} questions. Answers stripped for security.`);

  console.log('\n--- [Test 4] Automated Quiz Grading & Mathematical Proofs ---');
  const testAnswers = {};
  testAnswers[session.questions[0].id] = 1; // pick option 1
  const grading = quizEngine.evaluateSubmission({
    answers: testAnswers,
    studentId: 'std_test_01',
    studentName: 'Test Student'
  });
  assert(grading.success, 'Grading should succeed');
  assert(grading.percentage !== undefined, 'Percentage should be calculated');
  assert(grading.results[0].explanation, 'Explanation proof must be provided in graded results');
  console.log(`✅ Passed: Automated grading computed score ${grading.score}/${grading.totalQuestions} (${grading.percentage}%). Letter grade: ${grading.letterGrade}`);

  // ================= 3. INSTRUCTOR & CLASSROOM STORAGE TESTS =================
  console.log('\n--- [Test 5] Classroom Cohort Discovery & Creation ---');
  const cohorts = instructorStorage.getCohorts();
  assert(cohorts.length >= 2, 'Should have initial seeded cohorts');
  const newCohort = instructorStorage.createCohort({
    code: 'TEST-QC',
    name: 'Test Experimental Quantum Lab',
    instructor: 'Dr. Test',
    description: 'Unit test cohort'
  });
  assert(newCohort.id, 'New cohort should have unique ID');
  console.log(`✅ Passed: Created new cohort ${newCohort.code} (${newCohort.id}). Total cohorts: ${cohorts.length + 1}`);

  console.log('\n--- [Test 6] Cohort Analytics & Misconception Breakdown ---');
  const analytics = instructorStorage.getCohortAnalytics('cohort_qc101');
  assert(analytics.totalStudents >= 3, `Expected students in QC-101, got ${analytics.totalStudents}`);
  assert(analytics.avgClassScore > 0, `Class average should be positive, got ${analytics.avgClassScore}`);
  assert(analytics.gradeDistribution, 'Grade distribution must be computed');
  assert(analytics.commonMisconceptions.length > 0, 'Common misconceptions must be reported');
  console.log(`✅ Passed: QC-101 analytics calculated. Total Students: ${analytics.totalStudents}, Class Avg: ${analytics.avgClassScore}%, Misconceptions Tracked: ${analytics.commonMisconceptions.length}`);

  console.log('\n--- [Test 7] Dynamic Gradebook CSV Export ---');
  const csv = instructorStorage.generateGradebookCSV('cohort_qc101');
  assert(csv.includes('Student ID,Student Name'), 'CSV must contain standard headers');
  assert(csv.includes('Ananya Sharma'), 'CSV must contain enrolled student records');
  console.log(`✅ Passed: Gradebook CSV generated successfully (${csv.length} bytes). Sample line:\n` + csv.split('\r\n').slice(0, 2).join('\n'));

  console.log('\n================================================================');
  console.log('🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY! (100% READY)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
