/**
 * Ananta Quantum Studio - Assessment & Instructor Portal Controller
 * 
 * Manages:
 *  1. Interactive Conceptual Quizzes with live question streaming and KaTeX math
 *  2. Automated instant grading with mathematical derivations & XP progression
 *  3. Classroom Instructor Dashboard with cohort metrics, student rosters, and gradebook CSV export
 */

class InstructorPortal {
  constructor() {
    this.selectedCohort = 'cohort_qc101';
    this.cohorts = [];
    this.currentAnalytics = null;
    this.activeQuizSession = null;
    this.userAnswers = {};
    this.currentQuestionIndex = 0;
    this.activeTab = 'challenges'; // 'challenges' or 'quizzes'

    this.init();
  }

  async init() {
    this.bindTabSwitching();
    await this.loadQuizCatalog();
    await this.loadCohorts();
  }

  bindTabSwitching() {
    // Switch between Challenges and Quizzes in Assessment view
    const btnChallenges = document.getElementById('btn-view-challenges-mode');
    const btnQuizzes = document.getElementById('btn-view-quizzes-mode');
    const containerChallenges = document.getElementById('challenges-puzzles-container');
    const containerQuizzes = document.getElementById('quizzes-assessment-container');

    if (btnChallenges && btnQuizzes) {
      btnChallenges.addEventListener('click', () => {
        btnChallenges.classList.add('active');
        btnQuizzes.classList.remove('active');
        if (containerChallenges) containerChallenges.style.display = 'block';
        if (containerQuizzes) containerQuizzes.style.display = 'none';
        this.activeTab = 'challenges';
      });

      btnQuizzes.addEventListener('click', () => {
        btnQuizzes.classList.add('active');
        btnChallenges.classList.remove('active');
        if (containerChallenges) containerChallenges.style.display = 'none';
        if (containerQuizzes) containerQuizzes.style.display = 'block';
        this.activeTab = 'quizzes';
        this.loadQuizCatalog();
      });
    }

    // Cohort change event in instructor dashboard
    const cohortSelect = document.getElementById('instructor-cohort-select');
    if (cohortSelect) {
      cohortSelect.addEventListener('change', (e) => {
        this.selectedCohort = e.target.value;
        this.loadCohortAnalytics(this.selectedCohort);
      });
    }

    // Export Gradebook CSV Button
    const btnExport = document.getElementById('btn-export-gradebook-csv');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportGradebookCSV());
    }

    // New Cohort Button
    const btnNewCohort = document.getElementById('btn-create-cohort-modal');
    if (btnNewCohort) {
      btnNewCohort.addEventListener('click', () => this.promptNewCohort());
    }

    // Dispatch Assignment Button
    const btnDispatch = document.getElementById('btn-dispatch-assignment-modal');
    if (btnDispatch) {
      btnDispatch.addEventListener('click', () => this.promptDispatchAssignment());
    }
  }

  // ================= 1. QUIZ RUNNER MODULE =================

  async loadQuizCatalog() {
    const listEl = document.getElementById('quiz-domains-list');
    if (!listEl) return;

    try {
      const res = await fetch('/api/quizzes?catalog=true');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.catalog)) return;

      listEl.innerHTML = '';
      data.catalog.forEach(domain => {
        const card = document.createElement('div');
        card.className = 'quiz-domain-card';
        card.innerHTML = `
          <div class="quiz-domain-header">
            <span class="quiz-domain-icon">${domain.icon}</span>
            <span class="quiz-domain-xp">+${domain.totalXpAvailable} XP Total</span>
          </div>
          <h3 class="quiz-domain-title">${domain.name}</h3>
          <p class="quiz-domain-desc">${domain.desc}</p>
          <div class="quiz-domain-footer">
            <span class="quiz-question-count">${domain.totalQuestions} Questions</span>
            <button class="btn-start-quiz-domain" data-domain="${domain.id}">
              Take Quiz →
            </button>
          </div>
        `;

        card.querySelector('.btn-start-quiz-domain').addEventListener('click', () => {
          this.startQuizSession(domain.id);
        });

        listEl.appendChild(card);
      });

      if (window.renderAllMath) window.renderAllMath();
    } catch (e) {
      console.warn('[InstructorPortal] Quiz catalog notice:', e.message);
    }
  }

  async startQuizSession(topic = 'all') {
    const runnerContainer = document.getElementById('quiz-active-runner-view');
    const catalogContainer = document.getElementById('quiz-catalog-view');
    const resultsContainer = document.getElementById('quiz-results-view');

    if (!runnerContainer) return;

    try {
      const res = await fetch(`/api/quizzes?topic=${encodeURIComponent(topic)}&limit=5`);
      const data = await res.json();
      if (!data.success || !data.session || !data.session.questions.length) {
        alert('No questions found for this topic.');
        return;
      }

      this.activeQuizSession = data.session;
      this.userAnswers = {};
      this.currentQuestionIndex = 0;

      if (catalogContainer) catalogContainer.style.display = 'none';
      if (resultsContainer) resultsContainer.style.display = 'none';
      runnerContainer.style.display = 'block';

      this.renderCurrentQuestion();
    } catch (err) {
      alert(`Could not start quiz: ${err.message}`);
    }
  }

  renderCurrentQuestion() {
    const runner = document.getElementById('quiz-active-runner-view');
    if (!runner || !this.activeQuizSession) return;

    const questions = this.activeQuizSession.questions;
    const q = questions[this.currentQuestionIndex];
    const total = questions.length;
    const isLast = this.currentQuestionIndex === total - 1;

    runner.innerHTML = `
      <div class="quiz-runner-card">
        <div class="quiz-runner-top">
          <div class="quiz-runner-badge-row">
            <span class="puzzle-tier-badge tier-${(q.difficulty || 'beginner').toLowerCase()}">${q.difficulty}</span>
            <span class="puzzle-xp-chip">+${q.xp} XP</span>
          </div>
          <div class="quiz-runner-step-label">Question ${this.currentQuestionIndex + 1} of ${total}</div>
        </div>

        <div class="quiz-progress-bar-track">
          <div class="quiz-progress-bar-fill" style="width: ${((this.currentQuestionIndex + 1) / total) * 100}%"></div>
        </div>

        <div class="quiz-question-box">
          <h3 class="quiz-question-text">${q.question}</h3>
        </div>

        <div class="quiz-options-grid" id="quiz-options-list">
          ${q.options.map((opt, idx) => `
            <div class="quiz-option-card ${this.userAnswers[q.id] === idx ? 'option-selected' : ''}" data-idx="${idx}">
              <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
              <span class="option-text">${opt}</span>
            </div>
          `).join('')}
        </div>

        <div class="quiz-runner-actions">
          <button class="btn-quiz-nav btn-quiz-prev" id="btn-quiz-prev-q" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>
          <div style="display:flex; gap:10px;">
            <button class="btn-quiz-nav btn-quiz-cancel" id="btn-quiz-cancel">Exit Quiz</button>
            ${isLast
              ? `<button class="btn-quiz-nav btn-quiz-submit" id="btn-quiz-submit-exam">Submit Quiz for Automated Grading ✓</button>`
              : `<button class="btn-quiz-nav btn-quiz-next" id="btn-quiz-next-q">Next Question →</button>`
            }
          </div>
        </div>
      </div>
    `;

    // Bind option click
    runner.querySelectorAll('.quiz-option-card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        this.userAnswers[q.id] = idx;
        this.renderCurrentQuestion();
      });
    });

    // Prev Button
    const prevBtn = document.getElementById('btn-quiz-prev-q');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentQuestionIndex > 0) {
          this.currentQuestionIndex--;
          this.renderCurrentQuestion();
        }
      });
    }

    // Next Button
    const nextBtn = document.getElementById('btn-quiz-next-q');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.userAnswers[q.id] === undefined) {
          alert('Please select an answer before continuing.');
          return;
        }
        if (this.currentQuestionIndex < total - 1) {
          this.currentQuestionIndex++;
          this.renderCurrentQuestion();
        }
      });
    }

    // Cancel Button
    const cancelBtn = document.getElementById('btn-quiz-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit? Your answers will not be graded.')) {
          runner.style.display = 'none';
          const catalog = document.getElementById('quiz-catalog-view');
          if (catalog) catalog.style.display = 'block';
        }
      });
    }

    // Submit Button
    const submitBtn = document.getElementById('btn-quiz-submit-exam');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (this.userAnswers[q.id] === undefined) {
          alert('Please select an answer for the final question.');
          return;
        }
        this.submitQuizAnswers();
      });
    }

    if (window.renderAllMath) window.renderAllMath();
  }

  async submitQuizAnswers() {
    const runner = document.getElementById('quiz-active-runner-view');
    const resultsContainer = document.getElementById('quiz-results-view');
    if (!runner || !resultsContainer) return;

    try {
      const studentName = (window.currentUser && window.currentUser.name) || 'Quantum Scholar';
      const studentId = (window.currentUser && window.currentUser.email) ? window.currentUser.email.replace(/[@.]/g, '_') : 'std_curr_user';

      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: this.userAnswers,
          studentId,
          studentName,
          cohortId: this.selectedCohort
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Submission grading failed');

      runner.style.display = 'none';
      resultsContainer.style.display = 'block';

      this.renderGradingResults(data);
    } catch (err) {
      alert(`Grading failed: ${err.message}`);
    }
  }

  renderGradingResults(data) {
    const container = document.getElementById('quiz-results-view');
    if (!container) return;

    const isPassed = data.percentage >= 70;

    container.innerHTML = `
      <div class="quiz-results-card">
        <div class="results-celebration-header ${isPassed ? 'header-pass' : 'header-review'}">
          <div class="results-score-circle">
            <span class="score-number">${data.percentage}%</span>
            <span class="score-label">Grade ${data.letterGrade}</span>
          </div>
          <div class="results-title-box">
            <h2>${isPassed ? '🎉 Assessment Passed!' : '📚 Review Required'}</h2>
            <p>${isPassed ? 'Excellent mastery of quantum principles.' : 'Keep exploring! Review the step-by-step mathematical proofs below to solidify your understanding.'}</p>
            <div class="results-kpi-chips">
              <span class="kpi-chip">Score: <strong>${data.score} / ${data.totalQuestions} Correct</strong></span>
              <span class="kpi-chip xp-chip">+${data.totalXpEarned} XP Earned</span>
              <span class="kpi-chip status-chip ${isPassed ? 'status-pass' : 'status-fail'}">${isPassed ? '✓ PASSED' : '⚠️ ATTEMPT AGAIN'}</span>
            </div>
          </div>
        </div>

        <!-- Misconception alert if any -->
        ${data.missedMisconceptions && data.missedMisconceptions.length ? `
          <div class="misconception-callout-banner">
            <span class="misconception-icon">💡</span>
            <div>
              <strong>Targeted Concept Doctor Recommendation:</strong>
              <p>You missed questions covering <code>${data.missedMisconceptions.join(', ')}</code>. Open the <strong>Quantum Intuition Lab</strong> to view real-time wavepacket collapse &amp; phase kickback simulations.</p>
            </div>
          </div>
        ` : ''}

        <!-- Detailed Question-by-Question Proofs -->
        <div class="results-breakdown-section">
          <h3>Detailed Question Proofs &amp; Mathematical Derivations</h3>
          <div class="question-proofs-list">
            ${data.results.map((r, i) => `
              <div class="proof-card ${r.isCorrect ? 'proof-correct' : 'proof-incorrect'}">
                <div class="proof-card-header">
                  <span class="proof-q-num">Q${i + 1}</span>
                  <span class="proof-status-pill ${r.isCorrect ? 'status-pill-ok' : 'status-pill-miss'}">
                    ${r.isCorrect ? '✓ Correct (+ ' + r.xpEarned + ' XP)' : '✗ Incorrect (0 XP)'}
                  </span>
                </div>
                <div class="proof-question-text">${r.question}</div>
                <div class="proof-choices-comparison">
                  <div class="choice-box user-choice ${r.isCorrect ? 'choice-ok' : 'choice-err'}">
                    <span class="choice-tag">Your Choice:</span>
                    <span>${r.userChoice}</span>
                  </div>
                  ${!r.isCorrect ? `
                    <div class="choice-box correct-choice">
                      <span class="choice-tag">Correct Answer:</span>
                      <span>${r.correctChoice}</span>
                    </div>
                  ` : ''}
                </div>
                <div class="proof-explanation-box">
                  <strong>Mathematical Derivation &amp; Physical Explanation:</strong>
                  <p>${r.explanation}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="quiz-results-footer">
          <button class="btn-quiz-nav btn-quiz-submit" id="btn-return-quiz-catalog">
            ← Return to Quiz Catalog
          </button>
          <button class="btn-quiz-nav btn-quiz-next" onclick="if(window.switchTab) window.switchTab('simulator')">
            Open Circuit Composer ⚡
          </button>
        </div>
      </div>
    `;

    const returnBtn = document.getElementById('btn-return-quiz-catalog');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        container.style.display = 'none';
        const catalog = document.getElementById('quiz-catalog-view');
        if (catalog) catalog.style.display = 'block';
        this.loadQuizCatalog();
      });
    }

    if (window.renderAllMath) window.renderAllMath();
  }

  // ================= 2. INSTRUCTOR DASHBOARD MODULE =================

  // Real Authorization header from the signed session (window.AnantaAuth,
  // set up in js/app.js) - every /api/instructor/* route verifies this
  // server-side, so a client that merely *claims* to be an instructor
  // without a valid signed token is correctly rejected with 401/403.
  authHeaders() {
    return (window.AnantaAuth && window.AnantaAuth.authHeaders) ? window.AnantaAuth.authHeaders() : {};
  }

  isSignedInAsInstructor() {
    return Boolean(window.AnantaAuth && window.AnantaAuth.isInstructor && window.AnantaAuth.isInstructor());
  }

  renderInstructorAuthGate() {
    const container = document.getElementById('instructor-analytics-content');
    if (!container) return;

    // Clear any stale KPI tiles/roster left over from a previous signed-in
    // session so a signed-out viewer never sees another instructor's numbers.
    ['kpi-total-students', 'kpi-avg-score', 'kpi-total-challenges', 'kpi-total-quizzes'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    const rosterTbody = document.getElementById('instructor-roster-tbody');
    if (rosterTbody) rosterTbody.innerHTML = '';
    const misContainer = document.getElementById('instructor-misconceptions-list');
    if (misContainer) misContainer.innerHTML = '';
    const distContainer = document.getElementById('instructor-grade-distribution');
    if (distContainer) distContainer.innerHTML = '';

    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #94a3b8;">
        <div style="font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">🔒 Instructor sign-in required</div>
        <div style="font-size: 13px; max-width: 420px; margin: 0 auto;">
          Cohort management, gradebooks, and assignment dispatch are protected server-side.
          Sign in with an <strong>Instructor</strong> account to view this dashboard.
        </div>
      </div>`;
  }

  async loadCohorts() {
    const select = document.getElementById('instructor-cohort-select');
    if (!select) return;

    if (!this.isSignedInAsInstructor()) {
      this.cohorts = [];
      select.innerHTML = '<option>Sign in as instructor to load cohorts</option>';
      this.renderInstructorAuthGate();
      return;
    }
    try {
      const res = await fetch('/api/instructor/cohorts', { headers: this.authHeaders() });
      if (res.status === 401 || res.status === 403) {
        this.cohorts = [];
        select.innerHTML = '<option>Sign in as instructor to load cohorts</option>';
        this.renderInstructorAuthGate();
        return;
      }
      const data = await res.json();
      if (!data.success || !Array.isArray(data.cohorts)) return;

      this.cohorts = data.cohorts;
      select.innerHTML = '';
      this.cohorts.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.code}: ${c.name} (${c.enrolledStudents} Students)`;
        if (c.id === this.selectedCohort) opt.selected = true;
        select.appendChild(opt);
      });

      if (this.cohorts.length && !this.selectedCohort) {
        this.selectedCohort = this.cohorts[0].id;
      }

      await this.loadCohortAnalytics(this.selectedCohort);
    } catch (e) {
      console.warn('[InstructorPortal] Cohorts notice:', e.message);
    }
  }

  async loadCohortAnalytics(cohortId) {
    const container = document.getElementById('instructor-analytics-content');
    if (!container) return;

    if (!this.isSignedInAsInstructor()) {
      this.renderInstructorAuthGate();
      return;
    }

    try {
      const res = await fetch(`/api/instructor/analytics?cohortId=${encodeURIComponent(cohortId)}`, { headers: this.authHeaders() });
      if (res.status === 401 || res.status === 403) {
        this.renderInstructorAuthGate();
        return;
      }
      const data = await res.json();
      if (!data.success) return;

      this.currentAnalytics = data;
      this.renderAnalyticsUI(data);
    } catch (e) {
      console.warn('[InstructorPortal] Analytics notice:', e.message);
    }
  }

  renderAnalyticsUI(data) {
    // 1. Update KPI Summary cards
    const elStudents = document.getElementById('kpi-total-students');
    const elAvgScore = document.getElementById('kpi-avg-score');
    const elChallenges = document.getElementById('kpi-total-challenges');
    const elQuizzes = document.getElementById('kpi-total-quizzes');

    if (elStudents) elStudents.textContent = data.totalStudents || 0;
    if (elAvgScore) elAvgScore.textContent = `${data.avgClassScore || 0}%`;
    if (elChallenges) elChallenges.textContent = data.totalChallengesSolved || 0;
    if (elQuizzes) elQuizzes.textContent = data.totalQuizzesCompleted || 0;

    // 2. Render Enrolled Students Roster Table
    const rosterTbody = document.getElementById('instructor-roster-tbody');
    if (rosterTbody) {
      rosterTbody.innerHTML = '';
      (data.students || []).forEach(std => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${std.name}</strong><br><span style="font-size:11px; color:#64748b;">${std.email}</span></td>
          <td><span class="badge-sub-pill">${std.challengesSolved} / 8 Solved</span></td>
          <td><span class="badge-sub-pill">${std.quizzesCompleted} Completed</span></td>
          <td><strong>${std.avgScore}%</strong></td>
          <td><span class="xp-chip-small">+${std.totalXp} XP</span></td>
          <td><span class="grade-badge grade-${(std.letterGrade || 'A').toLowerCase()}">${std.letterGrade || 'A'}</span></td>
          <td style="font-size:12px; color:#64748b;">${std.lastActive ? new Date(std.lastActive).toLocaleDateString() : 'Today'}</td>
        `;
        rosterTbody.appendChild(tr);
      });
    }

    // 3. Render Misconceptions Panel
    const misContainer = document.getElementById('instructor-misconceptions-list');
    if (misContainer) {
      misContainer.innerHTML = '';
      (data.commonMisconceptions || []).forEach(m => {
        const item = document.createElement('div');
        item.className = 'misconception-item-card';
        item.innerHTML = `
          <div class="misconception-item-header">
            <strong>${m.concept}</strong>
            <span class="severity-pill severity-${m.severity.toLowerCase()}">${m.severity} Risk</span>
          </div>
          <div class="misconception-stats-row">
            <span>Error Frequency: <strong>${m.errorRate}</strong></span>
            <span>Flagged across ${m.count} student submissions</span>
          </div>
        `;
        misContainer.appendChild(item);
      });
    }

    // 4. Render Grade Distribution Bars
    const distContainer = document.getElementById('instructor-grade-distribution');
    if (distContainer && data.gradeDistribution) {
      const total = data.totalStudents || 1;
      distContainer.innerHTML = Object.keys(data.gradeDistribution).map(g => {
        const count = data.gradeDistribution[g];
        const pct = Math.round((count / total) * 100);
        return `
          <div class="grade-bar-row">
            <span class="grade-bar-label">Grade ${g}</span>
            <div class="grade-bar-track">
              <div class="grade-bar-fill fill-${g.toLowerCase()}" style="width:${pct}%"></div>
            </div>
            <span class="grade-bar-count">${count} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
  }

  async exportGradebookCSV() {
    if (!this.isSignedInAsInstructor()) {
      alert('Sign in with an Instructor account to export the gradebook.');
      return;
    }
    try {
      // A plain <a href> can't carry an Authorization header, so the
      // authenticated download goes through fetch() + a blob URL instead.
      const url = `/api/instructor/export-gradebook?cohortId=${encodeURIComponent(this.selectedCohort)}`;
      const res = await fetch(url, { headers: this.authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ananta_gradebook_${this.selectedCohort}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert(`Could not export gradebook: ${e.message}`);
    }
  }

  async promptNewCohort() {
    if (!this.isSignedInAsInstructor()) {
      alert('Sign in with an Instructor account to create a cohort.');
      return;
    }
    const code = prompt('Enter Course Code (e.g. QC-201):', 'QC-201');
    if (!code) return;
    const name = prompt('Enter Course Title:', 'Quantum Computation & Algorithms II');
    if (!name) return;
    const instructor = prompt('Instructor Name:', 'Quantum Faculty Lead');

    try {
      const res = await fetch('/api/instructor/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ code, name, instructor, term: 'Spring 2027' })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Cohort ${data.cohort.code} created successfully!`);
        await this.loadCohorts();
      } else {
        alert(`Failed to create cohort: ${data.error}`);
      }
    } catch (e) {
      alert(`Error creating cohort: ${e.message}`);
    }
  }

  async promptDispatchAssignment() {
    if (!this.isSignedInAsInstructor()) {
      alert('Sign in with an Instructor account to dispatch an assignment.');
      return;
    }
    const title = prompt('Enter Assignment Title:', 'Lab 4: Superdense Coding Implementation');
    if (!title) return;
    const targetState = prompt('Target Unitary / State Requirement:', 'Transmit 2 classical bits using 1 Bell pair');

    try {
      const res = await fetch('/api/instructor/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({
          cohortId: this.selectedCohort,
          title,
          type: 'circuit',
          targetState,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          points: 100
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Assignment "${data.assignment.title}" dispatched to all students in ${this.selectedCohort}!`);
        await this.loadCohortAnalytics(this.selectedCohort);
      } else {
        alert(`Failed to dispatch assignment: ${data.error}`);
      }
    } catch (e) {
      alert(`Error dispatching assignment: ${e.message}`);
    }
  }
}

window.InstructorPortal = InstructorPortal;
