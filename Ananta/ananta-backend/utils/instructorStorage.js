/**
 * Ananta Quantum Studio - Persistent Instructor & Classroom Analytics Storage
 *
 * DUAL-MODE, same pattern as authService.js: a real Postgres database
 * (db.js / Supabase) when DATABASE_URL is set - the only mode that's
 * actually durable on a serverless host - and a JSON-file fallback for
 * local/offline dev with zero setup.
 *
 * "commonMisconceptions" used to be a hardcoded array with no connection to
 * what students had actually answered wrong. It's now computed for real:
 * every quiz submission records its `missedMisconceptions` keys (from
 * quizEngine.evaluateSubmission), and analytics aggregates the real
 * frequency of each key across a cohort's submissions.
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');
const quizEngine = require('./quizEngine');

// ANANTA_DATA_DIR lets tests (and any other caller needing isolation) point
// this at a scratch directory instead of the real committed seed files -
// without it, running the test suite repeatedly deleted and regenerated
// ananta-backend/data/*.json, which are real tracked git content.
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

function resolveDataDir() {
  if (process.env.ANANTA_DATA_DIR) return process.env.ANANTA_DATA_DIR;
  if (isServerless && !db.isConfigured()) {
    return path.join('/tmp', 'ananta-data');
  }
  return path.join(__dirname, '..', 'data');
}

const DATA_DIR = resolveDataDir();
const COHORTS_FILE = path.join(DATA_DIR, 'cohorts.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// In-memory store fallback for read-only environments (e.g. Vercel serverless /var/task)
const _memStore = new Map();

// --------------------------------------------------------------------
// Seed data (used to initialize either backend on first run, so the demo
// isn't empty - clearly fictional example names, not real student PII)
// --------------------------------------------------------------------
function buildSeed() {
  const cohorts = [
    { id: 'cohort_qc101', code: 'QC-101', name: 'Introduction to Quantum Information & Circuits', instructor: 'Prof. Vikram Sarabhai', term: 'Fall 2026', description: 'Undergraduate core course covering Hilbert spaces, unitary operators, entanglement witness, Bell inequality violations, and Deutsch-Jozsa algorithm.', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'cohort_algo502', code: 'CS-502', name: 'Advanced Quantum Algorithms & Fault-Tolerance', instructor: 'Prof. C. V. Raman', term: 'Fall 2026', description: 'Graduate research seminar covering Grover search amplitude amplification, Shor QFT, VQE chemistry, and rotated surface code decoders.', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'cohort_hw301', code: 'PH-301', name: 'Quantum Hardware & Microwave Control Engineering', instructor: 'Dr. Homi Bhabha', term: 'Fall 2026', description: 'Physical realization of superconducting transmon qubits, cavity QED, Rabi/Ramsey pulse dynamics, and DRAG pulse shaping.', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() }
  ];
  const students = [
    { id: 'std_ananya_01', cohortId: 'cohort_qc101', name: 'Ananya Sharma', email: 'ananya.sharma@ananta.edu', challengesSolved: 8, quizzesCompleted: 5, avgScore: 96, totalXp: 1150, letterGrade: 'A+', lastActive: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'std_rohan_02', cohortId: 'cohort_qc101', name: 'Rohan Verma', email: 'rohan.verma@ananta.edu', challengesSolved: 7, quizzesCompleted: 4, avgScore: 91, totalXp: 890, letterGrade: 'A', lastActive: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 'std_priya_03', cohortId: 'cohort_qc101', name: 'Priya Patel', email: 'priya.patel@ananta.edu', challengesSolved: 8, quizzesCompleted: 5, avgScore: 98, totalXp: 1220, letterGrade: 'A+', lastActive: new Date(Date.now() - 1 * 3600000).toISOString() },
    { id: 'std_arjun_04', cohortId: 'cohort_qc101', name: 'Arjun Mehta', email: 'arjun.mehta@ananta.edu', challengesSolved: 7, quizzesCompleted: 4, avgScore: 92, totalXp: 930, letterGrade: 'A', lastActive: new Date(Date.now() - 4 * 3600000).toISOString() },
    { id: 'std_sneha_05', cohortId: 'cohort_qc101', name: 'Sneha Reddy', email: 'sneha.reddy@ananta.edu', challengesSolved: 7, quizzesCompleted: 4, avgScore: 94, totalXp: 960, letterGrade: 'A', lastActive: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'std_aarav_31', cohortId: 'cohort_algo502', name: 'Aarav Nair', email: 'aarav.nair@ananta.edu', challengesSolved: 8, quizzesCompleted: 5, avgScore: 94, totalXp: 1120, letterGrade: 'A', lastActive: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 'std_ishita_32', cohortId: 'cohort_algo502', name: 'Ishita Sen', email: 'ishita.sen@ananta.edu', challengesSolved: 8, quizzesCompleted: 5, avgScore: 97, totalXp: 1240, letterGrade: 'A+', lastActive: new Date(Date.now() - 1 * 3600000).toISOString() }
  ];
  const assignments = [
    { id: 'asg_01_bell', cohortId: 'cohort_qc101', title: 'Laboratory 1: Bell State |Φ+⟩ Synthesis', type: 'circuit', targetState: '|Φ+⟩ = (|00⟩ + |11⟩) / √2', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), points: 100 },
    { id: 'asg_02_gates_quiz', cohortId: 'cohort_qc101', title: 'Assessment 1: Unitaries & Phase Kickback Quiz', type: 'quiz', topic: 'gates', dueDate: new Date(Date.now() + 10 * 86400000).toISOString(), points: 100 },
    { id: 'asg_03_grover', cohortId: 'cohort_algo502', title: 'Laboratory 3: Grover Diffusion Operator Implementation', type: 'circuit', targetState: 'Single target constructive amplification (>70%)', dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), points: 150 }
  ];
  const submissions = [
    { id: 'sub_init_01', studentId: 'std_ananya_01', studentName: 'Ananya Sharma', cohortId: 'cohort_qc101', assignmentId: 'asg_01_bell', type: 'circuit', percentage: 100, passed: true, xpEarned: 100, misconceptionKeys: [], submittedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'sub_init_02', studentId: 'std_rohan_02', studentName: 'Rohan Verma', cohortId: 'cohort_qc101', assignmentId: 'asg_02_gates_quiz', type: 'quiz', percentage: 85, passed: true, xpEarned: 60, misconceptionKeys: ['phase_kickback'], submittedAt: new Date(Date.now() - 2 * 86400000).toISOString() }
  ];
  return { cohorts, students, assignments, submissions };
}

// --------------------------------------------------------------------
// File backend (local/offline dev with serverless /tmp & in-memory fallback)
// --------------------------------------------------------------------
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    // Ignored if directory cannot be created on read-only hosts
  }
}

function readJsonFile(filePath, fallback) {
  if (_memStore.has(filePath)) {
    return _memStore.get(filePath);
  }
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    // If running in /tmp, try reading bundled seed if available
    const baseName = path.basename(filePath);
    const bundledPath = path.join(__dirname, '..', 'data', baseName);
    let initialData = fallback;
    if (fs.existsSync(bundledPath)) {
      try {
        initialData = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
      } catch (e) {}
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
    } catch (e) {
      // EROFS or permission error on read-only filesystem
    }
    _memStore.set(filePath, initialData);
    return initialData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    _memStore.set(filePath, data);
    return data;
  } catch (e) {
    console.error(`[InstructorStorage] Read error ${filePath}:`, e.message);
    _memStore.set(filePath, fallback);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  _memStore.set(filePath, data);
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Silently fall back to in-memory store on read-only serverless filesystems
    console.warn(`[InstructorStorage] Filesystem write failed (${e.message}), preserved in-memory`);
  }
}

// --------------------------------------------------------------------
// DB backend (Supabase Postgres)
// --------------------------------------------------------------------
async function ensureDbSeeded() {
  await db.ensureMigrated();
  const res = await db.query('SELECT COUNT(*)::int AS n FROM cohorts');
  if (res.rows[0].n > 0) return;

  const seed = buildSeed();
  await db.withTransaction(async (client) => {
    for (const c of seed.cohorts) {
      await client.query(
        `INSERT INTO cohorts (id, code, name, instructor, term, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.code, c.name, c.instructor, c.term, c.description, c.createdAt]
      );
    }
    for (const s of seed.students) {
      await client.query(
        `INSERT INTO students (id, cohort_id, name, email, challenges_solved, quizzes_completed, avg_score, total_xp, letter_grade, last_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.cohortId, s.name, s.email, s.challengesSolved, s.quizzesCompleted, s.avgScore, s.totalXp, s.letterGrade, s.lastActive]
      );
    }
    for (const a of seed.assignments) {
      await client.query(
        `INSERT INTO assignments (id, cohort_id, title, type, target_state, topic, due_date, points) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.cohortId, a.title, a.type, a.targetState || null, a.topic || null, a.dueDate, a.points]
      );
    }
    for (const sub of seed.submissions) {
      await client.query(
        `INSERT INTO submissions (id, student_id, student_name, cohort_id, assignment_id, type, percentage, passed, xp_earned, misconception_keys, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [sub.id, sub.studentId, sub.studentName, sub.cohortId, sub.assignmentId, sub.type, sub.percentage, sub.passed, sub.xpEarned, sub.misconceptionKeys, sub.submittedAt]
      );
    }
  });
}

function dbCohortRow(r) {
  return { id: r.id, code: r.code, name: r.name, instructor: r.instructor, term: r.term, description: r.description, createdAt: r.created_at };
}
function dbStudentRow(r) {
  return {
    id: r.id, cohortId: r.cohort_id, name: r.name, email: r.email,
    challengesSolved: r.challenges_solved, quizzesCompleted: r.quizzes_completed,
    avgScore: Number(r.avg_score), totalXp: r.total_xp, letterGrade: r.letter_grade, lastActive: r.last_active
  };
}
function dbAssignmentRow(r) {
  return { id: r.id, cohortId: r.cohort_id, title: r.title, type: r.type, targetState: r.target_state, topic: r.topic, dueDate: r.due_date, points: r.points, createdAt: r.created_at };
}
function dbSubmissionRow(r) {
  return {
    id: r.id, studentId: r.student_id, studentName: r.student_name, cohortId: r.cohort_id,
    assignmentId: r.assignment_id, type: r.type, score: r.score, percentage: r.percentage ? Number(r.percentage) : null,
    passed: r.passed, xpEarned: r.xp_earned, misconceptionKeys: r.misconception_keys || [], submittedAt: r.submitted_at
  };
}

// ==================== Public API (all async) ====================

async function getCohorts() {
  if (db.isConfigured()) {
    await ensureDbSeeded();
    const cohorts = (await db.query('SELECT * FROM cohorts ORDER BY created_at')).rows.map(dbCohortRow);
    const students = (await db.query('SELECT cohort_id, avg_score FROM students')).rows;
    return cohorts.map((c) => {
      const enrolled = students.filter((s) => s.cohort_id === c.id);
      const avgScore = enrolled.length ? Math.round(enrolled.reduce((sum, s) => sum + Number(s.avg_score || 0), 0) / enrolled.length) : 0;
      return { ...c, enrolledStudents: enrolled.length, classAverageScore: avgScore };
    });
  }
  const cohorts = readJsonFile(COHORTS_FILE, buildSeed().cohorts);
  const students = readJsonFile(STUDENTS_FILE, buildSeed().students);
  return cohorts.map((c) => {
    const enrolled = students.filter((s) => s.cohortId === c.id);
    const avgScore = enrolled.length ? Math.round(enrolled.reduce((sum, s) => sum + (s.avgScore || 0), 0) / enrolled.length) : 0;
    return { ...c, enrolledStudents: enrolled.length, classAverageScore: avgScore };
  });
}

async function createCohort({ code, name, instructor, description, term = 'Fall 2026', ownerUserId = null }) {
  if (!name || !code) throw new Error('Cohort code and name are required');
  const newCohort = {
    id: 'cohort_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
    code: code.trim().toUpperCase(),
    name: name.trim(),
    instructor: (instructor || 'Quantum Faculty Lead').trim(),
    term: term.trim(),
    description: (description || 'Interactive Quantum Computing Classroom Cohort').trim(),
    createdAt: new Date().toISOString()
  };

  if (db.isConfigured()) {
    await ensureDbSeeded();
    await db.query(
      `INSERT INTO cohorts (id, code, name, instructor, term, description, owner_user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [newCohort.id, newCohort.code, newCohort.name, newCohort.instructor, newCohort.term, newCohort.description, ownerUserId, newCohort.createdAt]
    );
    return newCohort;
  }
  const cohorts = readJsonFile(COHORTS_FILE, buildSeed().cohorts);
  cohorts.push(newCohort);
  writeJsonFile(COHORTS_FILE, cohorts);
  return newCohort;
}

async function getCohortStudents(cohortId) {
  if (db.isConfigured()) {
    await ensureDbSeeded();
    if (!cohortId || cohortId === 'all') return (await db.query('SELECT * FROM students ORDER BY name')).rows.map(dbStudentRow);
    return (await db.query('SELECT * FROM students WHERE cohort_id = $1 ORDER BY name', [cohortId])).rows.map(dbStudentRow);
  }
  const students = readJsonFile(STUDENTS_FILE, buildSeed().students);
  if (!cohortId || cohortId === 'all') return students;
  return students.filter((s) => s.cohortId === cohortId);
}

/**
 * Real misconception frequency analysis: aggregates the actual
 * missedMisconceptions keys recorded on each quiz submission (see
 * recordStudentProgress below and quizEngine.evaluateSubmission), not a
 * static guess. Empty when nobody has missed anything yet - and says so,
 * rather than inventing plausible-looking numbers.
 */
function aggregateMisconceptions(submissions, totalStudents) {
  const counts = {};
  for (const sub of submissions) {
    for (const key of sub.misconceptionKeys || []) {
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([key, count]) => {
      const info = quizEngine.getMisconceptionInfo(key);
      const errorRate = totalStudents > 0 ? `${((count / totalStudents) * 100).toFixed(1)}%` : '0%';
      const severity = count >= 4 ? 'High' : count >= 2 ? 'Medium' : 'Low';
      return { concept: info.label, domain: info.domainName, errorRate, count, severity };
    })
    .sort((a, b) => b.count - a.count);
}

async function getCohortAnalytics(cohortId = 'cohort_qc101') {
  const cohorts = await getCohorts();
  const currentCohort = cohorts.find((c) => c.id === cohortId) || cohorts[0] || {};
  const students = await getCohortStudents(currentCohort.id);

  let assignments, submissions;
  if (db.isConfigured()) {
    await ensureDbSeeded();
    assignments = (await db.query('SELECT * FROM assignments WHERE cohort_id = $1', [currentCohort.id])).rows.map(dbAssignmentRow);
    submissions = (await db.query('SELECT * FROM submissions WHERE cohort_id = $1 ORDER BY submitted_at', [currentCohort.id])).rows.map(dbSubmissionRow);
  } else {
    assignments = readJsonFile(ASSIGNMENTS_FILE, buildSeed().assignments).filter((a) => a.cohortId === currentCohort.id);
    submissions = readJsonFile(SUBMISSIONS_FILE, buildSeed().submissions).filter((s) => s.cohortId === currentCohort.id);
  }

  const totalStudents = students.length;
  const avgClassScore = totalStudents ? Math.round(students.reduce((sum, s) => sum + (s.avgScore || 0), 0) / totalStudents) : 0;
  const totalChallengesSolved = students.reduce((sum, s) => sum + (s.challengesSolved || 0), 0);
  const totalQuizzesCompleted = students.reduce((sum, s) => sum + (s.quizzesCompleted || 0), 0);

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  students.forEach((s) => {
    const g = s.letterGrade || (s.avgScore >= 90 ? 'A' : s.avgScore >= 80 ? 'B' : s.avgScore >= 70 ? 'C' : s.avgScore >= 60 ? 'D' : 'F');
    gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
  });

  return {
    cohort: currentCohort,
    totalStudents,
    avgClassScore,
    totalChallengesSolved,
    totalQuizzesCompleted,
    gradeDistribution,
    activeAssignmentsCount: assignments.length,
    totalSubmissionsCount: submissions.length,
    commonMisconceptions: aggregateMisconceptions(submissions, totalStudents),
    students,
    assignments,
    recentSubmissions: submissions.slice(-10).reverse(),
    generatedAt: new Date().toISOString()
  };
}

async function createAssignment({ cohortId, title, type = 'circuit', targetState = '', topic = '', dueDate = '', points = 100 }) {
  if (!cohortId || !title) throw new Error('Cohort ID and assignment title are required');
  const newAsg = {
    id: 'asg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
    cohortId, title: title.trim(), type,
    targetState: targetState.trim() || 'Specified target unitary state',
    topic: topic || null,
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    points: Number(points) || 100,
    createdAt: new Date().toISOString()
  };

  if (db.isConfigured()) {
    await ensureDbSeeded();
    await db.query(
      `INSERT INTO assignments (id, cohort_id, title, type, target_state, topic, due_date, points, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newAsg.id, newAsg.cohortId, newAsg.title, newAsg.type, newAsg.targetState, newAsg.topic, newAsg.dueDate, newAsg.points, newAsg.createdAt]
    );
    return newAsg;
  }
  const assignments = readJsonFile(ASSIGNMENTS_FILE, buildSeed().assignments);
  assignments.push(newAsg);
  writeJsonFile(ASSIGNMENTS_FILE, assignments);
  return newAsg;
}

async function recordStudentProgress({ studentId, studentName, cohortId = 'cohort_qc101', quizSubmission = null, challengeSolved = null, xpGained = 0 }) {
  const cleanId = studentId || 'std_curr_user';

  if (db.isConfigured()) {
    await ensureDbSeeded();
    let student = (await db.query('SELECT * FROM students WHERE id = $1', [cleanId])).rows[0];
    if (!student) {
      await db.query(
        `INSERT INTO students (id, cohort_id, name, email, challenges_solved, quizzes_completed, avg_score, total_xp, letter_grade, last_active)
         VALUES ($1,$2,$3,$4,0,0,100,0,'A',now())`,
        [cleanId, cohortId, studentName || 'Quantum Scholar', `${cleanId}@ananta.edu`]
      );
      student = (await db.query('SELECT * FROM students WHERE id = $1', [cleanId])).rows[0];
    }

    const updates = { total_xp: student.total_xp, challenges_solved: student.challenges_solved, quizzes_completed: student.quizzes_completed, avg_score: Number(student.avg_score), letter_grade: student.letter_grade };
    if (xpGained > 0) updates.total_xp += xpGained;
    if (challengeSolved) updates.challenges_solved += 1;
    if (quizSubmission && quizSubmission.percentage !== undefined) {
      const prevCount = updates.quizzes_completed;
      updates.quizzes_completed += 1;
      const totalPrevious = prevCount * updates.avg_score;
      updates.avg_score = Math.round((totalPrevious + quizSubmission.percentage) / updates.quizzes_completed);
      updates.letter_grade = updates.avg_score >= 90 ? 'A' : updates.avg_score >= 80 ? 'B' : updates.avg_score >= 70 ? 'C' : updates.avg_score >= 60 ? 'D' : 'F';

      await db.query(
        `INSERT INTO submissions (id, student_id, student_name, cohort_id, assignment_id, type, score, percentage, passed, xp_earned, misconception_keys, submitted_at)
         VALUES ($1,$2,$3,$4,$5,'quiz',$6,$7,$8,$9,$10,now())`,
        [
          quizSubmission.submissionId || ('sub_' + Date.now()), cleanId, studentName || student.name, cohortId,
          quizSubmission.assignmentId || 'quiz_' + (quizSubmission.topic || 'general'),
          quizSubmission.score || null, quizSubmission.percentage, Boolean(quizSubmission.passed),
          quizSubmission.totalXpEarned || 0, quizSubmission.missedMisconceptions || []
        ]
      );
    }

    await db.query(
      `UPDATE students SET total_xp=$2, challenges_solved=$3, quizzes_completed=$4, avg_score=$5, letter_grade=$6, last_active=now() WHERE id=$1`,
      [cleanId, updates.total_xp, updates.challenges_solved, updates.quizzes_completed, updates.avg_score, updates.letter_grade]
    );
    return dbStudentRow((await db.query('SELECT * FROM students WHERE id = $1', [cleanId])).rows[0]);
  }

  const students = readJsonFile(STUDENTS_FILE, buildSeed().students);
  let student = students.find((s) => s.id === cleanId);
  if (!student) {
    student = { id: cleanId, cohortId, name: studentName || 'Quantum Scholar', email: `${cleanId}@ananta.edu`, challengesSolved: 0, quizzesCompleted: 0, avgScore: 100, totalXp: 0, letterGrade: 'A', lastActive: new Date().toISOString() };
    students.push(student);
  }
  if (xpGained > 0) student.totalXp = (student.totalXp || 0) + xpGained;
  if (challengeSolved) student.challengesSolved = (student.challengesSolved || 0) + 1;
  if (quizSubmission && quizSubmission.percentage !== undefined) {
    student.quizzesCompleted = (student.quizzesCompleted || 0) + 1;
    const totalPrevious = (student.quizzesCompleted - 1) * (student.avgScore || 100);
    student.avgScore = Math.round((totalPrevious + quizSubmission.percentage) / student.quizzesCompleted);
    student.letterGrade = student.avgScore >= 90 ? 'A' : student.avgScore >= 80 ? 'B' : student.avgScore >= 70 ? 'C' : student.avgScore >= 60 ? 'D' : 'F';

    const submissions = readJsonFile(SUBMISSIONS_FILE, buildSeed().submissions);
    submissions.push({
      id: quizSubmission.submissionId || ('sub_' + Date.now()), studentId: student.id, studentName: student.name,
      cohortId: student.cohortId, assignmentId: quizSubmission.assignmentId || 'quiz_' + (quizSubmission.topic || 'general'),
      type: 'quiz', score: quizSubmission.score, percentage: quizSubmission.percentage, passed: quizSubmission.passed,
      xpEarned: quizSubmission.totalXpEarned || 0, misconceptionKeys: quizSubmission.missedMisconceptions || [],
      submittedAt: new Date().toISOString()
    });
    writeJsonFile(SUBMISSIONS_FILE, submissions);
  }
  student.lastActive = new Date().toISOString();
  writeJsonFile(STUDENTS_FILE, students);
  return student;
}

async function getStudentProgress(studentId = 'std_curr_user') {
  if (db.isConfigured()) {
    await ensureDbSeeded();
    const row = (await db.query('SELECT * FROM students WHERE id = $1', [studentId])).rows[0];
    const student = row ? dbStudentRow(row) : { id: studentId, name: 'Quantum Scholar', challengesSolved: 0, quizzesCompleted: 0, avgScore: 0, totalXp: 0, letterGrade: 'N/A' };
    const submissions = (await db.query('SELECT * FROM submissions WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 5', [studentId])).rows.map(dbSubmissionRow);
    return { student, submissionsCount: submissions.length, recentSubmissions: submissions };
  }
  const students = readJsonFile(STUDENTS_FILE, buildSeed().students);
  let student = students.find((s) => s.id === studentId);
  if (!student) student = { id: studentId, name: 'Quantum Scholar', challengesSolved: 0, quizzesCompleted: 0, avgScore: 0, totalXp: 0, letterGrade: 'N/A' };
  const submissions = readJsonFile(SUBMISSIONS_FILE, buildSeed().submissions).filter((s) => s.studentId === studentId);
  return { student, submissionsCount: submissions.length, recentSubmissions: submissions.slice(-5).reverse() };
}

async function generateGradebookCSV(cohortId = 'cohort_qc101') {
  const cohorts = await getCohorts();
  const targetCohort = cohorts.find((c) => c.id === cohortId) || cohorts[0] || { code: 'QC', name: 'Quantum Course' };
  const students = await getCohortStudents(targetCohort.id);

  const headers = ['Student ID', 'Student Name', 'Email Address', 'Cohort Code', 'Course Name', 'Coding Puzzles Solved (out of 8)', 'Quizzes Completed', 'Average Quiz Score (%)', 'Total Mastery XP', 'Final Grade'];
  const rows = students.map((s) => [
    `"${s.id}"`, `"${s.name.replace(/"/g, '""')}"`, `"${s.email}"`, `"${targetCohort.code}"`, `"${targetCohort.name.replace(/"/g, '""')}"`,
    s.challengesSolved || 0, s.quizzesCompleted || 0, s.avgScore || 0, s.totalXp || 0, `"${s.letterGrade || 'A'}"`
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

module.exports = {
  getCohorts,
  createCohort,
  getCohortStudents,
  getCohortAnalytics,
  createAssignment,
  recordStudentProgress,
  getStudentProgress,
  generateGradebookCSV
};
