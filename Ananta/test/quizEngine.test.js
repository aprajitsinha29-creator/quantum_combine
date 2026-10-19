const test = require('node:test');
const assert = require('node:assert/strict');
const quizEngine = require('../ananta-backend/utils/quizEngine');

test('getQuizQuestions strips correctIndex and explanation (cheating-proof sessions)', () => {
  const session = quizEngine.getQuizQuestions({ topic: 'foundations', limit: 5 });
  assert.ok(session.count > 0);
  for (const q of session.questions) {
    assert.equal(q.correctIndex, undefined, 'correctIndex must never be sent to the client before grading');
    assert.equal(q.explanation, undefined, 'explanation must never be sent to the client before grading');
  }
});

test('evaluateSubmission grades correctly and records real missed misconceptions', () => {
  const bank = quizEngine.QUESTION_BANK;
  const q1 = bank.find((q) => q.id === 'q_fnd_01');
  assert.ok(q1, 'expected q_fnd_01 to exist in the question bank');

  const wrongIndex = (q1.correctIndex + 1) % q1.options.length;
  const result = quizEngine.evaluateSubmission({
    answers: { [q1.id]: wrongIndex },
    studentId: 'std_test',
    studentName: 'Test Student'
  });

  assert.equal(result.success, true);
  assert.equal(result.score, 0);
  assert.equal(result.totalQuestions, 1);
  assert.equal(result.percentage, 0);
  assert.deepEqual(result.missedMisconceptions, [q1.misconceptionKey]);
});

test('evaluateSubmission awards full credit and XP for a correct answer', () => {
  const bank = quizEngine.QUESTION_BANK;
  const q1 = bank.find((q) => q.id === 'q_fnd_01');

  const result = quizEngine.evaluateSubmission({
    answers: { [q1.id]: q1.correctIndex },
    studentId: 'std_test',
    studentName: 'Test Student'
  });

  assert.equal(result.score, 1);
  assert.equal(result.percentage, 100);
  assert.equal(result.totalXpEarned, q1.xp);
  assert.deepEqual(result.missedMisconceptions, []);
});

test('getMisconceptionInfo derives a real label from the question bank, not a hardcoded list', () => {
  const info = quizEngine.getMisconceptionInfo('phase_kickback');
  assert.equal(info.label, 'Phase Kickback');
  assert.equal(info.topic, 'gates');
});
