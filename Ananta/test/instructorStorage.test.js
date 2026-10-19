/**
 * Real tests against instructorStorage.js's file-mode backend, focused on
 * the misconception-analytics fix: commonMisconceptions used to be a
 * hardcoded array disconnected from real submissions. This verifies it's
 * now genuinely derived from recorded quiz submissions.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolated scratch directory (not ananta-backend/data/) so running these
// tests never touches the real committed seed files or local dev data.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ananta-instructortest-'));
process.env.ANANTA_DATA_DIR = DATA_DIR;
const FILES = ['cohorts.json', 'students.json', 'assignments.json', 'submissions.json'].map((f) => path.join(DATA_DIR, f));

function resetStore() {
  delete require.cache[require.resolve('../ananta-backend/utils/instructorStorage')];
  delete require.cache[require.resolve('../ananta-backend/utils/quizEngine')];
  for (const f of FILES) if (fs.existsSync(f)) fs.unlinkSync(f);
  return require('../ananta-backend/utils/instructorStorage');
}

test('getCohorts returns seeded cohorts with real computed enrolledStudents/classAverageScore', async () => {
  const storage = resetStore();
  const cohorts = await storage.getCohorts();
  assert.ok(cohorts.length > 0);
  const qc101 = cohorts.find((c) => c.id === 'cohort_qc101');
  assert.ok(qc101);
  assert.ok(qc101.enrolledStudents > 0);
  assert.ok(qc101.classAverageScore >= 0 && qc101.classAverageScore <= 100);
});

test('createCohort persists a real new cohort distinguishable from seed data', async () => {
  const storage = resetStore();
  const created = await storage.createCohort({ code: 'test-101', name: 'Test Cohort', instructor: 'Test Prof' });
  assert.equal(created.code, 'TEST-101', 'code should be normalized to uppercase');

  const cohorts = await storage.getCohorts();
  assert.ok(cohorts.some((c) => c.id === created.id));
});

test('commonMisconceptions is empty when nobody has missed anything (not a fabricated baseline)', async () => {
  const storage = resetStore();
  // Wipe seeded submissions so this cohort genuinely has zero submissions.
  fs.writeFileSync(path.join(DATA_DIR, 'submissions.json'), '[]');
  const analytics = await storage.getCohortAnalytics('cohort_qc101');
  assert.deepEqual(analytics.commonMisconceptions, [], 'with no real submissions, there must be no misconceptions reported');
});

test('commonMisconceptions is derived for real from recorded submission misconceptionKeys', async () => {
  const storage = resetStore();
  fs.writeFileSync(path.join(DATA_DIR, 'submissions.json'), '[]');

  await storage.recordStudentProgress({
    studentId: 'std_agg_test_1',
    studentName: 'Aggregation Test Student',
    cohortId: 'cohort_qc101',
    quizSubmission: {
      submissionId: 'sub_agg_1',
      percentage: 33,
      passed: false,
      totalXpEarned: 0,
      missedMisconceptions: ['phase_kickback', 'hadamard_inversion']
    }
  });
  await storage.recordStudentProgress({
    studentId: 'std_agg_test_2',
    studentName: 'Aggregation Test Student 2',
    cohortId: 'cohort_qc101',
    quizSubmission: {
      submissionId: 'sub_agg_2',
      percentage: 66,
      passed: false,
      totalXpEarned: 20,
      missedMisconceptions: ['phase_kickback']
    }
  });

  const analytics = await storage.getCohortAnalytics('cohort_qc101');
  const phaseKickback = analytics.commonMisconceptions.find((m) => m.concept === 'Phase Kickback');
  assert.ok(phaseKickback, 'phase_kickback should appear because two real submissions missed it');
  assert.equal(phaseKickback.count, 2, 'count must reflect the actual number of submissions that missed it');

  const hadamard = analytics.commonMisconceptions.find((m) => m.concept === 'Hadamard Inversion');
  assert.ok(hadamard);
  assert.equal(hadamard.count, 1);

  // Sorted most-frequent first - a real analytics property, not incidental.
  assert.equal(analytics.commonMisconceptions[0].concept, 'Phase Kickback');
});

test('recordStudentProgress creates a new student on first contact and accumulates XP correctly', async () => {
  const storage = resetStore();
  const first = await storage.recordStudentProgress({ studentId: 'std_new_test', studentName: 'New Student', cohortId: 'cohort_qc101', xpGained: 50 });
  assert.equal(first.totalXp, 50);

  const second = await storage.recordStudentProgress({ studentId: 'std_new_test', studentName: 'New Student', cohortId: 'cohort_qc101', xpGained: 25 });
  assert.equal(second.totalXp, 75, 'XP must accumulate across calls for the same student');
});
