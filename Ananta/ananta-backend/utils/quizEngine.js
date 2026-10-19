/**
 * Ananta Quantum Studio - Quantum Assessment & Interactive Quiz Engine
 * 
 * Provides:
 *  1. Rigorous 5-domain Quantum Computing question bank with KaTeX mathematical formulas
 *  2. Cheating-proof test session generation (sanitizes answers before sending to client)
 *  3. Automated grading engine with step-by-step mathematical proofs
 *  4. Misconception diagnostic tagging integrated with Concept Doctor
 */

const QUIZ_DOMAINS = [
  {
    id: 'foundations',
    name: 'Quantum States & Superposition',
    desc: 'Hilbert space $\\mathbb{C}^2$, Dirac bra-ket algebra, statevector normalization, and Bloch sphere coordinates.',
    icon: '🪐',
    color: '#3b82f6'
  },
  {
    id: 'gates',
    name: 'Unitary Operators & Reversibility',
    desc: 'Pauli matrices ($X, Y, Z$), Hadamard transformation, Phase gates ($S, T$), and CNOT entanglement gates.',
    icon: '⚡',
    color: '#8b5cf6'
  },
  {
    id: 'entanglement',
    name: 'Entanglement & Bell Inequality',
    desc: 'Maximal bipartite entanglement, Bell basis states, GHZ registers, partial trace, and No-Cloning theorem.',
    icon: '🔗',
    color: '#ec4899'
  },
  {
    id: 'algorithms',
    name: 'Quantum Algorithms & Speedup',
    desc: 'Deutsch-Jozsa quantum parallelism, Grover amplitude amplification ($O(\\sqrt{N})$), Shor QFT, and VQE/QAOA.',
    icon: '📐',
    color: '#10b981'
  },
  {
    id: 'hardware_ftqc',
    name: 'Hardware, Decoherence & Surface Codes',
    desc: 'Superconducting transmon physics, $T_1$ decay, $T_2^*$ dephasing, heavy-hex routing, and planar surface codes.',
    icon: '🛡️',
    color: '#f59e0b'
  }
];

const QUESTION_BANK = [
  // ================= 1. FOUNDATIONS =================
  {
    id: 'q_fnd_01',
    topic: 'foundations',
    difficulty: 'Beginner',
    xp: 25,
    question: 'If a single qubit is in state $|\\psi\\rangle = \\frac{1}{2}|0\\rangle + \\frac{\\sqrt{3}}{2}|1\\rangle$, what is the Born rule probability of measuring outcome $|1\\rangle$ in the computational basis?',
    options: [
      '25% (1/4)',
      '50% (1/2)',
      '75% (3/4)',
      '86.6% (√3/2)'
    ],
    correctIndex: 2,
    explanation: 'By Born\'s postulate, the measurement probability in the computational basis is given by the squared modulus of the probability amplitude: $P(1) = |\\langle 1|\\psi\\rangle|^2 = |\\frac{\\sqrt{3}}{2}|^2 = \\frac{3}{4} = 75\\%$.',
    misconceptionKey: 'born_rule'
  },
  {
    id: 'q_fnd_02',
    topic: 'foundations',
    difficulty: 'Intermediate',
    xp: 35,
    question: 'Which Bloch sphere vector $(\\theta, \\phi)$ corresponds to the equal phase-shifted state $|-i\\rangle = \\frac{1}{\\sqrt{2}}(|0\\rangle - i|1\\rangle)$?',
    options: [
      'θ = π/2, φ = π/2 (along +Y axis)',
      'θ = π/2, φ = 3π/2 (along -Y axis)',
      'θ = π, φ = 0 (along -Z axis)',
      'θ = π/4, φ = π (along -X axis)'
    ],
    correctIndex: 1,
    explanation: 'A general pure state is parametrized as $|\\psi\\rangle = \\cos(\\frac{\\theta}{2})|0\\rangle + e^{i\\phi}\\sin(\\frac{\\theta}{2})|1\\rangle$. For equal weights, $\\cos(\\frac{\\theta}{2}) = \\sin(\\frac{\\theta}{2}) = \\frac{1}{\\sqrt{2}} \\implies \\theta = \\frac{\\pi}{2}$. The relative phase is $e^{i\\phi} = -i = e^{i 3\\pi/2}$, pointing directly down the negative $Y$-axis on the Bloch equator.',
    misconceptionKey: 'bloch_sphere'
  },
  {
    id: 'q_fnd_03',
    topic: 'foundations',
    difficulty: 'Beginner',
    xp: 25,
    question: 'What fundamental quantum postulate prevents the exact replication of an unknown arbitrary quantum state $|\psi\\rangle$?',
    options: [
      'Heisenberg Uncertainty Principle',
      'No-Cloning Theorem',
      'Pauli Exclusion Principle',
      'Born Rule of Measurement'
    ],
    correctIndex: 1,
    explanation: 'The No-Cloning Theorem (proved by Wootters, Zurek, and Dieks in 1982) demonstrates that linear unitary evolution cannot map $|\psi\\rangle|0\\rangle \\to |\\psi\\rangle|\\psi\\rangle$ for an arbitrary unknown $|\psi\\rangle$ due to the linearity of quantum mechanics.',
    misconceptionKey: 'no_cloning'
  },

  // ================= 2. GATES & UNITARIES =================
  {
    id: 'q_gat_01',
    topic: 'gates',
    difficulty: 'Beginner',
    xp: 25,
    question: 'Applying a Hadamard gate $H$ twice in succession ($H \\cdot H$) to any arbitrary qubit state $|\psi\\rangle$ results in:',
    options: [
      'A bit-flip inversion (Pauli-X applied to |ψ⟩)',
      'The identity operation I (restoring the exact initial state |ψ⟩)',
      'A 90-degree phase shift (Phase S applied to |ψ⟩)',
      'Decoherence into a maximally mixed state'
    ],
    correctIndex: 1,
    explanation: 'The Hadamard gate is both unitary ($H^\\dagger = H^{-1}$) and Hermitian ($H = H^\\dagger$), which means $H^2 = H \\cdot H = I$. Applying it twice cancels itself out identically.',
    misconceptionKey: 'hadamard_inversion'
  },
  {
    id: 'q_gat_02',
    topic: 'gates',
    difficulty: 'Intermediate',
    xp: 35,
    question: 'What is the action of the controlled-NOT ($CX$) gate when the control qubit is in state $|+\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}$ and target qubit is in state $|-\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}$?',
    options: [
      'The target qubit flips to |+⟩, control remains |+⟩',
      'Phase kickback occurs: the control qubit flips to |-⟩, while target remains |-⟩',
      'Both qubits collapse to ground state |00⟩',
      'The state becomes the entangled Bell state (|00⟩ + |11⟩)/√2'
    ],
    correctIndex: 1,
    explanation: 'This is the classical demonstration of Phase Kickback: since $|-\\rangle$ is an eigenstate of the $X$ gate with eigenvalue $-1$ ($X|-\\rangle = -|-\\rangle$), the negative phase kicks back into the control qubit\'s superposition, transforming $|+\\rangle \\to |-\\rangle$. Thus, $CX(|+\\rangle|-\\rangle) = |-\\rangle|-\\rangle$.',
    misconceptionKey: 'phase_kickback'
  },
  {
    id: 'q_gat_03',
    topic: 'gates',
    difficulty: 'Advanced',
    xp: 45,
    question: 'Which universal gate set is sufficient to approximate any arbitrary single-qubit $U(2)$ rotation to within error $\\epsilon$ via the Solovay-Kitaev theorem with polylogarithmic depth?',
    options: [
      '{X, Y, Z}',
      '{H, T} (Clifford + T)',
      '{CNOT, SWAP}',
      '{Rx(π/2), Ry(π/2)}'
    ],
    correctIndex: 1,
    explanation: 'The Clifford group alone (generated by $H, S, CNOT$) is efficiently classically simulable by the Gottesman-Knill theorem. Adding the non-Clifford $T = \\text{diag}(1, e^{i\\pi/4})$ gate yields universal quantum computation, with optimal gate synthesis via the Solovay-Kitaev theorem.',
    misconceptionKey: 'clifford_plus_t'
  },

  // ================= 3. ENTANGLEMENT =================
  {
    id: 'q_ent_01',
    topic: 'entanglement',
    difficulty: 'Beginner',
    xp: 30,
    question: 'What is the standard quantum circuit sequence to generate the Bell state $|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$ from the initialized zero state $|00\\rangle$?',
    options: [
      'Apply Pauli-X to Qubit 0, then CNOT(0 -> 1)',
      'Apply Hadamard to Qubit 0, then CNOT with control Qubit 0 and target Qubit 1',
      'Apply Hadamard to both Qubit 0 and Qubit 1',
      'Apply CNOT(0 -> 1) followed by Hadamard on Qubit 1'
    ],
    correctIndex: 1,
    explanation: 'Starting from $|00\\rangle$, $H$ on qubit 0 creates $\\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}} \\otimes |0\\rangle = \\frac{|00\\rangle + |10\\rangle}{\\sqrt{2}}$. Applying $CX_{0 \\to 1}$ flips the second qubit only when the first qubit is $|1\\rangle$, producing $|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$.',
    misconceptionKey: 'bell_state_prep'
  },
  {
    id: 'q_ent_02',
    topic: 'entanglement',
    difficulty: 'Intermediate',
    xp: 40,
    question: 'For the entangled bipartite state $|\\psi\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}$, what is the reduced density matrix $\\rho_A = \\text{Tr}_B(|\\psi\\rangle\\langle\\psi|)$ of qubit A?',
    options: [
      'A pure state |0⟩⟨0|',
      'A pure state |+⟩⟨+|',
      'The maximally mixed state 1/2 I = [[0.5, 0], [0, 0.5]] with von Neumann entropy S = 1',
      'A zero matrix [[0, 0], [0, 0]]'
    ],
    correctIndex: 2,
    explanation: 'Performing the partial trace over subsystem B eliminates all off-diagonal coherence terms, yielding $\\rho_A = \\frac{1}{2}|0\\rangle\\langle 0| + \\frac{1}{2}|1\\rangle\\langle 1| = \\begin{pmatrix} 0.5 & 0 \\\\ 0 & 0.5 \\end{pmatrix} = \\frac{1}{2}I$. This is maximally mixed with purity $\\text{Tr}(\\rho^2) = 0.5$ and von Neumann entropy $S = -\\text{Tr}(\\rho \\log_2 \\rho) = 1$ bit.',
    misconceptionKey: 'partial_trace'
  },

  // ================= 4. ALGORITHMS =================
  {
    id: 'q_alg_01',
    topic: 'algorithms',
    difficulty: 'Intermediate',
    xp: 35,
    question: 'How many oracle evaluations does Grover\'s quantum search algorithm require to find a unique target item in an unstructured database of size $N$ with high probability?',
    options: [
      'O(N) queries',
      'O(log N) queries',
      'O(√N) queries (~ (π/4) √N rotations)',
      'O(1) constant queries'
    ],
    correctIndex: 2,
    explanation: 'Grover\'s search performs amplitude amplification by repeated application of the oracle phase inversion and the diffusion operator. The angle of rotation in the 2D subspace is $\\theta \\approx 2/\\sqrt{N}$, achieving maximum amplitude in $\\frac{\\pi}{4}\\sqrt{N} = O(\\sqrt{N})$ queries, representing a quadratic quantum speedup over classical $O(N)$ brute-force search.',
    misconceptionKey: 'grover_complexity'
  },
  {
    id: 'q_alg_02',
    topic: 'algorithms',
    difficulty: 'Advanced',
    xp: 45,
    question: 'In the Variational Quantum Eigensolver (VQE), how is the ground state energy $E_0$ of a molecular Hamiltonian $H = \\sum_i c_i P_i$ guaranteed to be a lower bound on the measured expectation value $\\langle\\psi(\\vec{\\theta})|H|\\psi(\\vec{\\theta})\\rangle$?',
    options: [
      'By the Rayleigh-Ritz Variational Principle (⟨ψ|H|ψ⟩ ≥ E0)',
      'By the Adiabatic Theorem of Quantum Mechanics',
      'By the Quantum Fourier Transform Phase Kickback',
      'By the Born-Oppenheimer Approximation'
    ],
    correctIndex: 0,
    explanation: 'The Rayleigh-Ritz variational theorem proves that for any parameterized trial state $|\\psi(\\vec{\\theta})\\rangle$, the expectation value $\\langle\\psi(\\vec{\\theta})|H|\\psi(\\vec{\\theta})\\rangle$ is always $\\ge E_0$ (the true lowest eigenvalue / ground-state energy). A classical optimizer iteratively updates parameters $\\vec{\\theta}$ to minimize this expectation value.',
    misconceptionKey: 'vqe_variational_principle'
  },

  // ================= 5. HARDWARE & FTQC =================
  {
    id: 'q_hdw_01',
    topic: 'hardware_ftqc',
    difficulty: 'Intermediate',
    xp: 35,
    question: 'In superconducting transmon qubits, what physical process governs the longitudinal relaxation time $T_1$, and what does it cause?',
    options: [
      'Elastic dephasing with no energy loss',
      'Spontaneous energy relaxation from excited state |1⟩ down to ground state |0⟩ via photon dissipation into the substrate/cavity',
      'Measurement readout cross-talk between neighboring qubits',
      'Magnetic flux drift in the SQUID loop'
    ],
    correctIndex: 1,
    explanation: '$T_1$ is the longitudinal energy relaxation time (the lifetime of the $|1\\rangle$ state), representing spontaneous emission of microwave photons into environmental dielectric loss channels or the readout resonator. In contrast, $T_2$ is the transverse dephasing time, where $\\frac{1}{T_2} = \\frac{1}{2T_1} + \\frac{1}{T_\\phi}$.',
    misconceptionKey: 't1_t2_relaxation'
  },
  {
    id: 'q_hdw_02',
    topic: 'hardware_ftqc',
    difficulty: 'Advanced',
    xp: 50,
    question: 'In a planar rotated surface code with code distance $d$, what is the minimum physical error threshold under standard depolarizing circuit-level noise, and how many physical errors can it correct?',
    options: [
      'Threshold ~0.7% to 1.0%, corrects up to ⌊(d - 1)/2⌋ physical errors',
      'Threshold ~10%, corrects up to d physical errors',
      'Threshold ~0.001%, corrects only single bit-flips',
      'Threshold ~50%, corrects all non-correlated errors'
    ],
    correctIndex: 0,
    explanation: 'The rotated surface code has a circuit-level threshold of approximately $1\\%$. Any Pauli string error of weight $w \\le \\lfloor\\frac{d-1}{2}\\rfloor$ will produce syndrome measurement eigenvalues that can be uniquely decoded by Minimum-Weight Perfect Matching (MWPM) or Union-Find without corrupting the logical qubit state.',
    misconceptionKey: 'surface_code_threshold'
  }
];

/**
 * Returns available quiz domain catalog with metadata
 */
function getQuizCatalog() {
  return QUIZ_DOMAINS.map(domain => {
    const questions = QUESTION_BANK.filter(q => q.topic === domain.id);
    return {
      ...domain,
      totalQuestions: questions.length,
      totalXpAvailable: questions.reduce((acc, q) => acc + q.xp, 0)
    };
  });
}

/**
 * Generates a clean, cheat-proof test session
 * (correctIndex and explanation are deliberately stripped)
 */
function getQuizQuestions({ topic = 'all', difficulty = 'all', limit = 10 } = {}) {
  let list = [...QUESTION_BANK];

  if (topic && topic !== 'all') {
    list = list.filter(q => q.topic === topic);
  }

  if (difficulty && difficulty !== 'all') {
    list = list.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
  }

  // Shuffle questions randomly
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  const selected = list.slice(0, Math.min(Number(limit) || 10, list.length));

  // Sanitize for client: remove correctIndex & explanation
  const sanitized = selected.map(q => ({
    id: q.id,
    topic: q.topic,
    difficulty: q.difficulty,
    xp: q.xp,
    question: q.question,
    options: q.options
  }));

  return {
    quizSessionId: 'qs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    topic,
    difficulty,
    count: sanitized.length,
    questions: sanitized
  };
}

/**
 * Evaluates and auto-grades submitted student answers
 */
function evaluateSubmission({ answers = {}, studentId = 'student_anon', studentName = 'Quantum Scholar' } = {}) {
  let score = 0;
  let totalXpEarned = 0;
  const questionResults = [];
  const missedMisconceptions = [];

  const answeredIds = Object.keys(answers);
  const totalQuestions = answeredIds.length;

  if (totalQuestions === 0) {
    return {
      success: false,
      error: 'No answers provided for grading'
    };
  }

  answeredIds.forEach(qId => {
    const question = QUESTION_BANK.find(q => q.id === qId);
    if (!question) return;

    const selectedIndex = Number(answers[qId]);
    const isCorrect = selectedIndex === question.correctIndex;

    if (isCorrect) {
      score += 1;
      totalXpEarned += question.xp;
    } else {
      if (question.misconceptionKey) {
        missedMisconceptions.push(question.misconceptionKey);
      }
    }

    questionResults.push({
      id: question.id,
      topic: question.topic,
      difficulty: question.difficulty,
      question: question.question,
      userChoice: question.options[selectedIndex] || 'Unanswered',
      correctChoice: question.options[question.correctIndex],
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      explanation: question.explanation,
      xpEarned: isCorrect ? question.xp : 0
    });
  });

  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;

  return {
    success: true,
    submissionId: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    studentId,
    studentName,
    submittedAt: new Date().toISOString(),
    score,
    totalQuestions,
    percentage,
    passed,
    totalXpEarned,
    letterGrade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F',
    results: questionResults,
    missedMisconceptions: Array.from(new Set(missedMisconceptions))
  };
}

/**
 * Human-readable label + domain for a misconceptionKey, derived directly
 * from the question that carries it in QUESTION_BANK - the single source of
 * truth. This replaces what used to be a separate hardcoded
 * "commonMisconceptions" list in instructorStorage.js that had no relation
 * to what students had actually gotten wrong; that list is gone now, and
 * instructor analytics instead aggregate real missedMisconceptions arrays
 * recorded per submission (see evaluateSubmission above) and look up their
 * label here.
 */
const MISCONCEPTION_INDEX = (() => {
  const index = {};
  for (const q of QUESTION_BANK) {
    if (!q.misconceptionKey || index[q.misconceptionKey]) continue;
    const domain = QUIZ_DOMAINS.find(d => d.id === q.topic);
    const label = q.misconceptionKey
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    index[q.misconceptionKey] = { label, topic: q.topic, domainName: domain ? domain.name : q.topic };
  }
  return index;
})();

function getMisconceptionInfo(key) {
  return MISCONCEPTION_INDEX[key] || { label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), topic: 'general', domainName: 'General' };
}

module.exports = {
  QUIZ_DOMAINS,
  QUESTION_BANK,
  getQuizCatalog,
  getQuizQuestions,
  evaluateSubmission,
  getMisconceptionInfo
};
