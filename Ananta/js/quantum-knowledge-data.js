/**
 * Ananta Quantum Knowledge Database
 * Comprehensive research-grade corpus of 80+ quantum computing topics,
 * algorithms, hardware physics, error-correction codes, and foundational mathematics.
 * Sources: Nielsen & Chuang, Preskill Lecture Notes, Dirac, Sakurai, arXiv landmark papers.
 */

const QUANTUM_TOPIC_DATABASE = [
  // ==========================================
  // 1. FOUNDATIONS & MATHEMATICAL FORMALISMS
  // ==========================================
  {
    keys: ['alpha', 'beta', 'probability amplitude', 'state amplitude', 'state coefficients', 'alpha and beta', 'statevector amplitudes'],
    title: 'Alpha & Beta: Quantum State Probability Amplitudes',
    category: 'Foundations',
    arxiv: null,
    definition: 'In a single-qubit quantum state |ψ⟩ = α|0⟩ + β|1⟩, α and β are complex probability amplitudes (α, β ∈ ℂ). By the Born rule, the probability of measuring basis state |0⟩ is |α|² and |1⟩ is |β|², satisfying the normalization constraint |α|² + |β|² = 1.',
    math: '|ψ⟩ = α|0⟩ + β|1⟩,   where α, β ∈ ℂ\nNormalization: |α|² + |β|² = 1\nP(|0⟩) = |α|² = α* · α\nP(|1⟩) = |β|² = β* · β\n\nBloch Sphere parametrization:\nα = cos(θ/2)\nβ = e^(iφ) · sin(θ/2)\nRelative phase φ determines quantum interference.',
    intuition: 'Unlike classical probabilities which are positive real numbers summing to 1, quantum amplitudes α and β are complex vectors with magnitude and direction (phase angle). This enables destructive interference (cancellation) or constructive interference (amplification) between computational paths, the foundation of all quantum speedups.',
    applications: ['Statevector calculation in quantum simulators', 'Unitary transformation |ψ′⟩ = U|ψ⟩', 'Measurement projection via the Born rule in physical QPUs', 'Phase estimation and amplitude amplification in Grover search'],
    preset: 'superposition',
    furtherReading: 'Nielsen & Chuang Ch. 1.2; Dirac "The Principles of Quantum Mechanics" Ch. 1'
  },
  {
    keys: ['superposition', 'superpose', 'quantum superposition', 'linear combination of states'],
    title: 'Quantum Superposition',
    category: 'Foundations',
    arxiv: null,
    definition: 'A principle derived from the linearity of the Hilbert space: if |0⟩ and |1⟩ are valid quantum states, any linear combination |ψ⟩ = α|0⟩ + β|1⟩ is also a valid physical state, with continuous amplitude degrees of freedom until projective measurement.',
    math: '|+⟩ = H|0⟩ = (|0⟩ + |1⟩)/√2     P(0) = P(1) = 0.50\n|-⟩ = H|1⟩ = (|0⟩ - |1⟩)/√2     ⟨Z⟩ = 0, ⟨X⟩ = +1\n|±i⟩ = (|0⟩ ± i|1⟩)/√2          ⟨Y⟩ = ±1\nGeneral n-qubit equal superposition: |ψ⟩ = (1/√2ⁿ) ∑_{x=0}^{2ⁿ-1} |x⟩',
    intuition: 'Superposition is not classical ignorance or a coin that is secretly heads or tails. It is a wave state where both possibilities coexist with definite relative phase, capable of interfering before any observation collapses it.',
    applications: ['Quantum parallelism in Deutsch-Jozsa, Simon, and Grover algorithms', 'Variational ansatz initialization in VQE and QAOA', 'Input state preparation for Quantum Fourier Transform (QFT)', 'Quantum sensing and Ramsey interferometry'],
    preset: 'superposition',
    furtherReading: 'Nielsen & Chuang Ch. 1.2; Sakurai "Modern Quantum Mechanics" Ch. 1'
  },
  {
    keys: ['entanglement', 'entangled', 'bell state', 'bell pair', 'epr', 'quantum entanglement', 'einstein podolsky rosen'],
    title: 'Quantum Entanglement & Bell States',
    category: 'Foundations',
    arxiv: 'arXiv:quant-ph/0101012',
    definition: 'A composite quantum state |ψ⟩_AB ∈ H_A ⊗ H_B is entangled if it cannot be factored as a product state |φ⟩_A ⊗ |χ⟩_B. The four orthonormal Bell states form a complete maximally entangled basis for a two-qubit Hilbert space.',
    math: '|Φ⁺⟩ = (|00⟩ + |11⟩)/√2    [Prepared via H(q0) followed by CNOT(q0→q1)]\n|Φ⁻⟩ = (|00⟩ - |11⟩)/√2\n|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2\n|Ψ⁻⟩ = (|01⟩ - |10⟩)/√2    [Singlet state, invariant under all U⊗U]\n\nVon Neumann Entanglement Entropy: S(ρ_A) = -Tr(ρ_A log₂ ρ_A) = 1 ebit',
    intuition: 'Two entangled qubits behave as a single non-separable physical entity regardless of spatial separation. Measuring one qubit instantaneously collapses the joint wavefunction, correlating outcomes with certainty without transmitting superluminal classical data.',
    applications: ['Quantum teleportation and superdense coding protocols', 'Device-independent Quantum Key Distribution (E91)', 'Entanglement-assisted quantum error correction', 'Quantum metrology beating the Standard Quantum Limit (Heisenberg limit)'],
    preset: 'bell',
    furtherReading: 'Einstein, Podolsky, Rosen (1935) Phys. Rev. 47; Bennett et al. (1993) Phys. Rev. Lett. 70'
  },
  {
    keys: ['density matrix', 'density operator', 'mixed state', 'pure state', 'rho', 'partial trace'],
    title: 'Density Matrix Formalism & Partial Trace',
    category: 'Foundations',
    arxiv: null,
    definition: 'The density operator ρ characterizes pure states (ρ = |ψ⟩⟨ψ|) and statistical mixtures (ρ = ∑ p_i |ψ_i⟩⟨ψ_i|). It satisfies Hermiticity (ρ = ρ†), unit trace (Tr(ρ) = 1), and positive semidefiniteness (ρ ≥ 0). Subsystems are obtained by partial tracing: ρ_A = Tr_B(ρ_AB).',
    math: 'Pure state criterion: Tr(ρ²) = 1\nMixed state criterion: Tr(ρ²) < 1 (Purity γ = Tr(ρ²))\nExpectation value: ⟨O⟩ = Tr(ρ O)\nBloch representation: ρ = ½ (I + r_x X + r_y Y + r_z Z) with |r| ≤ 1\nVon Neumann Entropy: S(ρ) = -Tr(ρ log₂ ρ)',
    intuition: 'Statevectors |ψ⟩ can only describe systems about which we have complete quantum information. If a qubit is entangled with another or decohered by the environment, its local state is a mixed state described solely by a density matrix whose off-diagonal coherence terms have decayed.',
    applications: ['Modeling decoherence and open quantum system dynamics via Lindblad master equations', 'Quantifying entanglement via reduced density matrix purity', 'Quantum state tomography across superconducting quantum processors', 'Quantum channel capacity calculations'],
    preset: null,
    furtherReading: 'Nielsen & Chuang Ch. 2.4; Preskill Lecture Notes Ch. 2'
  },
  {
    keys: ['born rule', 'quantum measurement', 'projective measurement', 'wavefunction collapse', 'povm'],
    title: 'Quantum Measurement, Born Rule & POVMs',
    category: 'Foundations',
    arxiv: null,
    definition: 'Formulated by Max Born in 1926: projective measurement of state |ψ⟩ using observable M = ∑ m P_m yields outcome m with probability P(m) = ⟨ψ|P_m|ψ⟩ = Tr(P_m ρ), leaving post-measurement state |ψ′⟩ = P_m|ψ⟩ / √P(m). Generalized measurements use Positive Operator-Valued Measures (POVMs) satisfying ∑ E_m = I.',
    math: 'Projective probability: P(m) = ⟨ψ|P_m|ψ⟩, where P_m = |m⟩⟨m|, P_m² = P_m\nPost-measurement state: ρ′ = (P_m ρ P_m) / Tr(P_m ρ)\nPOVM probability: P(m) = Tr(E_m ρ),   E_m = M_m† M_m ≥ 0,   ∑ E_m = I',
    intuition: 'Measurement is fundamentally non-unitary and irreversible in the standard Copenhagen interpretation. It forces a superposition of potential outcomes into one realized eigenvalue, destroying relative phase information.',
    applications: ['Readout resonators in superconducting circuit QED', 'Quantum State Discrimination using unambiguous POVMs', 'Quantum Random Number Generation (QRNG)', 'Syndrome extraction in fault-tolerant stabilizer codes'],
    preset: null,
    furtherReading: 'Born (1926) Z. Phys. 37; Nielsen & Chuang Ch. 2.2; Sakurai Ch. 1'
  },
  {
    keys: ['no cloning', 'no cloning theorem', 'quantum cloning', 'cannot copy qubit'],
    title: 'No-Cloning & No-Deleting Theorems',
    category: 'Foundations',
    arxiv: null,
    definition: 'Proved by Wootters, Zurek, and Dieks (1982): there exists no unitary transformation U capable of cloning an arbitrary unknown quantum state: U(|ψ⟩|0⟩) ≠ |ψ⟩|ψ⟩ for all |ψ⟩. Linearity of quantum mechanics strictly forbids perfect copying.',
    math: 'Proof: Assume U|ψ⟩|0⟩ = |ψ⟩|ψ⟩ and U|φ⟩|0⟩ = |φ⟩|φ⟩.\nInner product: ⟨ψ|φ⟩ = ⟨ψ|⟨0| U† U |φ⟩|0⟩ = (⟨ψ|φ⟩)²\n⇒ ⟨ψ|φ⟩ = 0 or ⟨ψ|φ⟩ = 1.\nThus, cloning is possible only for orthogonal states, never for arbitrary unknown states.',
    intuition: 'Classical information (bits) can be duplicated endlessly without inspection. Quantum states carry phase relationships that would be destroyed by measurement; attempting to clone them unitarily violates the fundamental linearity of quantum theory.',
    applications: ['Foundational security of Quantum Key Distribution (BB84, E91)', 'Prevents eavesdroppers from intercepting and duplicating quantum signals', 'Necessitates entanglement-based teleportation to transfer states', 'Rules out classical replication for quantum error correction, requiring stabilizer codes'],
    preset: null,
    furtherReading: 'Wootters & Zurek (1982) Nature 299; Dieks (1982) Phys. Lett. A 92'
  },
  {
    keys: ['bloch sphere', 'bloch vector', 'state on bloch sphere', 'pauli vector'],
    title: 'Bloch Sphere Geometry & State Space',
    category: 'Foundations',
    arxiv: null,
    definition: 'A geometrical representation of the pure state space of a 2-level quantum system (qubit) as the surface of a unit sphere S² in ℝ³. The interior of the sphere represents mixed states with radius r < 1.',
    math: '|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ) sin(θ/2)|1⟩,   θ ∈ [0, π], φ ∈ [0, 2π)\nBloch vector components:\nr_x = ⟨X⟩ = sin(θ) cos(φ)\nr_y = ⟨Y⟩ = sin(θ) sin(φ)\nr_z = ⟨Z⟩ = cos(θ)\n\nSingle-qubit unitary rotation: R_n̂(α) = exp(-i α n̂·σ / 2) = cos(α/2)I - i sin(α/2)(n̂·σ)',
    intuition: 'Every pure qubit state is a point on the spherical shell: North pole is |0⟩, South pole is |1⟩, Equator holds equal superpositions (|+⟩, |+i⟩, |-⟩, |-i⟩). Single-qubit quantum gates are rigorous 3D spatial rotations of this sphere.',
    applications: ['Microwave Rabi pulse calibration in superconducting qubits', 'Visualization of single-qubit trajectories during gate operations', 'Dynamical decoupling sequence design (Carr-Purcell-Meiboom-Gill)', 'Geometric quantum computation using Berry phases'],
    preset: 'superposition',
    furtherReading: 'Nielsen & Chuang Ch. 1.2; Bloch (1946) Phys. Rev. 70'
  },
  {
    keys: ['schmidt decomposition', 'schmidt rank', 'schmidt number', 'singular value decomposition quantum'],
    title: 'Schmidt Decomposition & Bipartite Entanglement',
    category: 'Foundations',
    arxiv: null,
    definition: 'Any pure state |ψ⟩_AB of a bipartite quantum system can be written as |ψ⟩_AB = ∑_{i=1}^k λ_i |u_i⟩_A |v_i⟩_B, where λ_i > 0 are real Schmidt coefficients satisfying ∑ λ_i² = 1, and {|u_i⟩}, {|v_i⟩} are orthonormal sets.',
    math: '|ψ⟩_AB = ∑_{i=1}^k λ_i |u_i⟩_A |v_i⟩_B,   λ_i ≥ 0,   ∑ λ_i² = 1\nSchmidt rank k = number of non-zero coefficients λ_i\nState is entangled ⟺ Schmidt rank k > 1\nReduced density matrices share identical non-zero eigenvalues {λ_i²}:\nρ_A = ∑ λ_i² |u_i⟩⟨u_i|,    ρ_B = ∑ λ_i² |v_i⟩⟨v_i|',
    intuition: 'Schmidt decomposition proves that no matter how complex the bipartite state looks, there exist specific local measurement bases for Alice and Bob in which the state is purely diagonal with paired correlations.',
    applications: ['Characterizing entanglement depth in matrix product states (MPS)', 'DMRG (Density Matrix Renormalization Group) simulations', 'Quantifying bipartite entanglement in quantum cryptography', 'Entanglement distillation protocols'],
    preset: 'bell',
    furtherReading: 'Nielsen & Chuang Ch. 2.5; Preskill Notes Ch. 2'
  },
  {
    keys: ['decoherence', 't1 relaxation', 't2 dephasing', 't2 star', 'environmental noise', 'lindblad'],
    title: 'Decoherence, T₁ Relaxation & T₂ Dephasing',
    category: 'Hardware Physics',
    arxiv: null,
    definition: 'Decoherence describes the irreversible loss of quantum coherence resulting from coupling with an environmental bath. T₁ (longitudinal relaxation) measures energy decay |1⟩ → |0⟩. T₂ (transverse dephasing) measures the loss of quantum phase coherence, bounded by T₂ ≤ 2T₁.',
    math: 'T₁ Amplitude Damping: ρ₁₁(t) = ρ₁₁(0) e^(-t/T₁)\nT₂ Pure Dephasing: ρ₀₁(t) = ρ₀₁(0) e^(-t/T₂) where 1/T₂ = 1/(2T₁) + 1/T_φ\n\nLindblad Master Equation:\ndρ/dt = -i[H, ρ] + ∑_k ( L_k ρ L_k† - ½ {L_k† L_k, ρ} )\nWhere L_k are jump operators representing noise channels.',
    intuition: 'Think of T₁ as a spinning top falling down due to friction (energy loss). Think of T₂ as the direction of the spin becoming completely randomized (phase loss). In modern transmon processors, T₁ and T₂ typically range from 50 μs to 300 μs.',
    applications: ['Benchmark metric for quantum hardware quality (IBM Heron, Google Sycamore)', 'Determines maximum usable circuit depth before state decays into noise', 'Optimizing gate speeds to finish computation well within coherence window', 'Dynamical decoupling and zero-noise extrapolation (ZNE) error mitigation'],
    preset: null,
    furtherReading: 'Zurek (2003) Rev. Mod. Phys. 75; Preskill Lecture Notes Ch. 3'
  },
  {
    keys: ['bell inequality', 'chsh', 'chsh inequality', 'local realism', 'hidden variables', 'aspect experiment'],
    title: "Bell's Theorem & CHSH Inequality",
    category: 'Foundations',
    arxiv: null,
    definition: "Bell's theorem demonstrates that no physical theory of local hidden variables can reproduce all predictions of quantum mechanics. The Clauser-Horne-Shimony-Holt (CHSH) inequality bounds classical correlations by |S| ≤ 2, whereas quantum entanglement achieves Tsirelson's bound |S| = 2√2 ≈ 2.828.",
    math: 'CHSH Operator: C = A⊗B + A⊗B′ + A′⊗B - A′⊗B′\nClassical bound: |⟨C⟩| ≤ 2\nQuantum Tsirelson bound: |⟨C⟩| ≤ 2√2 ≈ 2.8284\nOptimal measurement angles for Bell state |Φ⁺⟩:\nA = Z, A′ = X, B = (Z + X)/√2, B′ = (Z - X)/√2\n⟨C⟩ = cos(π/4) + cos(π/4) + cos(π/4) - (-cos(π/4)) = 4/√2 = 2√2',
    intuition: 'Bell proved that nature is either non-local or counterfactually indefinite. Einstein\'s view that quantum particles contain hidden instructions predetermined before measurement was empirically disproven by Alain Aspect and Anton Zeilinger (Nobel Prize 2022).',
    applications: ['Device-independent quantum key distribution (DI-QKD)', 'Self-testing of quantum random number generators', 'Fundamental experimental verification of quantum processors', 'Testing quantum gravity and spacetime non-locality'],
    preset: 'bell',
    furtherReading: 'Bell (1964) Physics 1; Clauser et al. (1969) Phys. Rev. Lett. 23; Nobel Prize 2022 Citation'
  },

  // ==========================================
  // 2. QUANTUM GATES & CIRCUIT ARCHITECTURE
  // ==========================================
  {
    keys: ['pauli gates', 'pauli x', 'pauli y', 'pauli z', 'pauli matrices', 'sigma x y z'],
    title: 'Pauli Operators {X, Y, Z} & Clifford Algebra',
    category: 'Gate Library',
    arxiv: null,
    definition: 'The Pauli matrices {I, X, Y, Z} form an orthogonal basis for the vector space of 2×2 complex Hermitian matrices. They are unitary, Hermitian (X = X†), involutory (X² = I), and obey angular momentum commutation relations [σ_i, σ_j] = 2i ε_ijk σ_k.',
    math: 'X = [[0, 1], [1, 0]]     (Bit flip: X|0⟩ = |1⟩, X|1⟩ = |0⟩)\nY = [[0, -i], [i, 0]]    (Bit+Phase flip: Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩)\nZ = [[1, 0], [0, -1]]    (Phase flip: Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩)\n\nAnticommutation: {σ_i, σ_j} = 2 δ_ij I\nAlgebra: XY = iZ, YZ = iX, ZX = iY\nPauli group P_n: tensor products of n Pauli matrices with phases {±1, ±i}',
    intuition: 'Pauli gates are the cardinal rotations of quantum information: X rotates 180° around the X-axis (NOT gate), Z rotates 180° around the Z-axis (sign flip), and Y rotates 180° around the Y-axis. Any arbitrary single-qubit error decomposes into a linear combination of X, Y, and Z errors.',
    applications: ['Core error basis in quantum error correction (bit flip X, phase flip Z)', 'Hamiltonian encoding of molecular electrons via Jordan-Wigner transform', 'Expectation value measurement in VQE (measuring Pauli strings)', 'Dynamical decoupling sequences in hardware pulse control'],
    preset: null,
    furtherReading: 'Sakurai Ch. 1; Nielsen & Chuang Ch. 1.3'
  },
  {
    keys: ['hadamard', 'h gate', 'hadamard gate', 'hadamard transform'],
    title: 'Hadamard Gate (H) & Fourier Basis',
    category: 'Gate Library',
    arxiv: null,
    definition: 'The Hadamard gate is a single-qubit unitary that maps computational basis states {|0⟩, |1⟩} into the conjugate transversal basis {|+⟩, |-⟩}. Geometrically, it corresponds to a 180° rotation around the diagonal (X + Z)/√2 axis on the Bloch sphere.',
    math: 'H = (1/√2) [[1, 1], [1, -1]]\nH|0⟩ = |+⟩ = (|0⟩ + |1⟩)/√2\nH|1⟩ = |-⟩ = (|0⟩ - |1⟩)/√2\nH² = I   (Self-inverse unitary)\nH X H = Z,    H Z H = X   (Conjugates X and Z)',
    intuition: 'Hadamard is the gateway into the quantum realm. It converts deterministic classical certainty (|0⟩) into maximum quantum uncertainty (50/50 superposition). When applied twice, constructive and destructive interference precisely restores the original state.',
    applications: ['Creating initial superposition in almost every quantum algorithm', 'Switching between X-basis and Z-basis syndrome measurements in QEC', 'Building block of the Quantum Fourier Transform', 'Used in phase kickback oracles'],
    preset: 'superposition',
    furtherReading: 'Nielsen & Chuang Ch. 1.3'
  },
  {
    keys: ['phase gate', 's gate', 't gate', 'pi over 8 gate', 'non-clifford', 't-gate'],
    title: 'Phase Gates (S, T) & Non-Clifford Resource',
    category: 'Gate Library',
    arxiv: null,
    definition: 'The Phase gate S = diag(1, i) performs a 90° rotation around the Z-axis. The T gate (π/8 gate) T = diag(1, e^(iπ/4)) performs a 45° rotation. The Clifford group (H, S, CNOT) can be simulated efficiently classically; adding the non-Clifford T gate yields universal quantum computation.',
    math: 'S = [[1, 0], [0, i]] = Z^(1/2),    S² = Z\nT = [[1, 0], [0, e^(iπ/4)]] = Z^(1/4),    T² = S,    T⁴ = Z,    T⁸ = I\n\nGottesman-Knill Theorem:\nCircuits containing ONLY Clifford gates {H, S, CNOT} can be simulated in polynomial time on a classical computer. Universal quantum advantage strictly requires non-Clifford resources (T gate or magic states).',
    intuition: 'Clifford gates only rotate states to 6 discrete poles/equators of the Bloch sphere. The T gate breaks this symmetry, allowing fine-grained rotations that fill the sphere densely. However, in fault-tolerant quantum computing, T gates cannot be done transversally and require expensive magic state distillation.',
    applications: ['Universal quantum circuit synthesis via Solovay-Kitaev algorithm', 'Magic state distillation in fault-tolerant surface codes', 'Fine rotation synthesis in Quantum Chemistry Trotter circuits', 'Quantum hardness benchmarks against classical tensor network simulators'],
    preset: null,
    furtherReading: 'Gottesman-Knill Theorem; Bravyi & Kitaev (2005) Phys. Rev. A 71; Nielsen & Chuang Ch. 4.5'
  },
  {
    keys: ['cnot', 'cx', 'controlled not', 'cnot gate', 'two qubit gate', 'controlled x'],
    title: 'Controlled-NOT (CNOT / CX) & Entangling Unitaries',
    category: 'Gate Library',
    arxiv: null,
    definition: 'A 2-qubit entangling gate that flips the target qubit if and only if the control qubit is in state |1⟩. In the computational basis {|00⟩, |01⟩, |10⟩, |11⟩}, it is represented by a 4×4 permutation matrix. Together with single-qubit rotations, CNOT forms a universal gate set.',
    math: 'CNOT = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]]\nAction on basis states: CNOT|c, t⟩ = |c, t ⊕ c⟩\nAction in X basis: CNOT reversed!\n(H ⊗ H) CNOT (H ⊗ H) = CNOT_{target→control}\n\nEntangling power: Creates Bell state from |+0⟩: CNOT(|+⟩|0⟩) = (|00⟩ + |11⟩)/√2',
    intuition: 'CNOT is the quantum equivalent of an XOR gate, but because it operates on superpositions, it can entangle two previously independent qubits. If the target is in the |−⟩ state, the CNOT kicks a minus sign back to the control qubit (phase kickback).',
    applications: ['Core entangler in all quantum algorithms and Bell state generation', 'Syndrome extraction in surface codes and Shor error correction', 'Parity measurement in quantum chemistry operators', 'Implemented in transmon hardware via Cross-Resonance (CR) interaction'],
    preset: 'bell',
    furtherReading: 'Barenco et al. (1995) Phys. Rev. A 52; Nielsen & Chuang Ch. 1.3'
  },
  {
    keys: ['toffoli', 'ccx', 'controlled controlled not', 'fredkin', 'cswap', 'reversible computing'],
    title: 'Toffoli (CCX) & Fredkin (CSWAP) Reversible Gates',
    category: 'Gate Library',
    arxiv: null,
    definition: 'The Toffoli gate (CCNOT / CCX) flips a target qubit if and only if both control qubits are 1: |c₁, c₂, t⟩ → |c₁, c₂, t ⊕ (c₁ · c₂)⟩. It is universal for classical reversible computation. The Fredkin gate (CSWAP) swaps two target qubits conditioned on a control qubit.',
    math: 'Toffoli: |c₁, c₂, t⟩ ↦ |c₁, c₂, t ⊕ (c₁ ∧ c₂)⟩\nDecomposition into 2-qubit gates:\nRequires at least 6 CNOT gates and several T gates (minimum T-count = 7 without ancilla).\n\nFredkin: |c, t₁, t₂⟩ ↦ |c, t₂, t₁⟩ if c=1, else unchanged\nConserves Hamming weight (number of 1s).',
    intuition: 'Classical NAND is irreversible because information is lost (erasing energy via Landauer\'s principle). Toffoli preserves reversibility while computing AND/NAND logic. In quantum circuits, Toffoli serves as the reversible arithmetic engine for modular exponentiation in Shor\'s algorithm.',
    applications: ['Arithmetic circuits in Shor\'s algorithm (modular addition, multiplication)', 'Quantum oracle construction for boolean satisfiability (SAT)', 'Reversible classical logic embedding in quantum registers', 'Error detection in classical-quantum fault tolerance schemes'],
    preset: null,
    furtherReading: 'Toffoli (1980) Tech. Report MIT; Fredkin & Toffoli (1982) Int. J. Theor. Phys. 21'
  },
  {
    keys: ['universal gate set', 'solovay kitaev', 'clifford plus t', 'universal quantum computing'],
    title: 'Universal Quantum Gate Sets & Solovay-Kitaev Theorem',
    category: 'Gate Library',
    arxiv: null,
    definition: 'A set of quantum gates is universal if any unitary operation U ∈ U(2ⁿ) can be approximated to arbitrary accuracy ε using a finite sequence of gates from the set. The Solovay-Kitaev theorem guarantees that any single-qubit gate can be approximated to error ε using O(logᶜ(1/ε)) gates from {H, S, T}.',
    math: 'Distance metric: Operator norm distance ||U - U_approx|| ≤ ε\nSolovay-Kitaev gate count: N = O(log^c(1/ε)),   where c ≈ 3.97 (improved to ~1.44 by modern algorithms)\nCanonical universal sets:\n1. Clifford + T: {H, S, CNOT, T}\n2. Barenco set: {All single-qubit unitaries U(2), CNOT}\n3. Discrete universal: {H, CNOT, T}',
    intuition: 'Just as NAND gates build any classical microprocessor, a tiny set of discrete quantum gates ({H, CNOT, T}) is mathematically sufficient to synthesize any multi-qubit transformation across exponential Hilbert space with polylogarithmic overhead.',
    applications: ['Quantum circuit compilers (Cirq, Qiskit, TKET)', 'Fault-tolerant resource estimation for Shor and VQE', 'Optimal synthesis of arbitrary SU(2) rotations in cryo-hardware', 'Minimizing circuit depth to avoid decoherence'],
    preset: null,
    furtherReading: 'Kitaev (1997) Russ. Math. Surv. 52; Dawson & Nielsen (2006) arXiv:quant-ph/0505030'
  },
  {
    keys: ['phase kickback', 'kickback', 'eigenphase kickback', 'phase kick'],
    title: 'Phase Kickback Mechanism',
    category: 'Quantum Phenomena',
    arxiv: null,
    definition: 'A fundamental quantum phenomenon where applying a controlled-unitary gate CU to an eigenstate |ψ⟩ of U with eigenvalue e^(iθ) transfers the phase shift θ directly onto the state of the control qubit, leaving the target register unchanged.',
    math: 'Let U|u⟩ = e^(iθ)|u⟩ (eigenstate relation).\nPrepare control in |+⟩ = (|0⟩ + |1⟩)/√2 and target in |u⟩:\n|Ψ₀⟩ = |+⟩ ⊗ |u⟩ = (1/√2) (|0⟩|u⟩ + |1⟩|u⟩)\nApply Controlled-U:\nCU |Ψ₀⟩ = (1/√2) (|0⟩|u⟩ + |1⟩ U|u⟩) = (1/√2) (|0⟩ + e^(iθ)|1⟩) ⊗ |u⟩\n\nThe phase e^(iθ) has been kicked back to the control qubit!',
    intuition: 'Even though the control qubit is ostensibly dictating what happens to the target, the target pushes back! By setting the target to an eigenstate, the interaction encodes information about the operator into the control qubit, which can then be read out using interference.',
    applications: ['Core mechanism of Quantum Phase Estimation (QPE)', 'Grover oracle marking target states: |x⟩|−⟩ → (-1)^f(x) |x⟩|−⟩', 'Deutsch-Jozsa and Bernstein-Vazirani single-query solutions', 'Shor\'s algorithm period-finding subroutine'],
    preset: null,
    furtherReading: 'Cleve, Ekert, Macchiavello, Mosca (1998) Proc. R. Soc. Lond. A 454; Nielsen & Chuang Ch. 5.1'
  },

  // ==========================================
  // 3. QUANTUM ALGORITHMS & COMPLEXITY
  // ==========================================
  {
    keys: ['deutsch jozsa', 'deutsch-jozsa', 'deutsch algorithm', 'constant vs balanced'],
    title: 'Deutsch-Jozsa Algorithm',
    category: 'Algorithms',
    arxiv: null,
    definition: 'Given a black-box oracle f: {0,1}ⁿ → {0,1} promised to be either constant (same output for all inputs) or balanced (returns 0 for half and 1 for half), the Deutsch-Jozsa algorithm determines which it is in exactly ONE quantum evaluation, whereas classical algorithms require up to 2ⁿ⁻¹ + 1 queries.',
    math: 'Initial state: |ψ₀⟩ = |0⟩⊗ⁿ |1⟩\nApply H⊗(n+1): |ψ₁⟩ = (1/√2ⁿ) ∑_{x} |x⟩ ⊗ |−⟩\nApply Oracle U_f: |ψ₂⟩ = (1/√2ⁿ) ∑_{x} (-1)^f(x) |x⟩ ⊗ |−⟩\nApply H⊗ⁿ on first register:\n|ψ₃⟩ = (1/2ⁿ) ∑_{x} ∑_{y} (-1)^(x·y + f(x)) |y⟩ ⊗ |−⟩\n\nAmplitude of |0⟩⊗ⁿ state is: C₀ = (1/2ⁿ) ∑_{x} (-1)^f(x)\n- If f is constant: |C₀| = 1  (Measures all zeros with 100% certainty)\n- If f is balanced: C₀ = 0  (Can never measure all zeros)',
    intuition: 'A classical computer must test multiple inputs one by one to see if the outputs change. The quantum computer evaluates all inputs simultaneously in superposition and uses constructive/destructive interference to test a global property (constant vs balanced) in a single query.',
    applications: ['Historical breakthrough: first exact exponential quantum query separation', 'Demonstrates phase kickback and global interference', 'Pedagogical foundation for quantum algorithm design at IIT/IISc', 'Theoretical basis for oracle separation between P and EQP'],
    preset: null,
    furtherReading: 'Deutsch & Jozsa (1992) Proc. R. Soc. Lond. A 439; Nielsen & Chuang Ch. 1.4'
  },
  {
    keys: ['bernstein vazirani', 'bernstein-vazirani', 'hidden bitstring', 'inner product oracle'],
    title: 'Bernstein-Vazirani Algorithm',
    category: 'Algorithms',
    arxiv: null,
    definition: 'Given an oracle f(x) = s · x (mod 2) for an unknown hidden bitstring s ∈ {0,1}ⁿ, the Bernstein-Vazirani algorithm discovers the entire n-bit string s in exactly ONE query, compared to n queries classically.',
    math: 'Oracle: U_f |x⟩|y⟩ = |x⟩|y ⊕ (s · x)⟩\nWith target initialized to |−⟩ = (|0⟩ - |1⟩)/√2:\nU_f (|x⟩|−⟩) = (-1)^(s · x) |x⟩|−⟩\n\nCircuit:\n1. Initialize: |0⟩⊗ⁿ |1⟩\n2. Hadamard layer: H⊗ⁿ |0⟩⊗ⁿ ⊗ H|1⟩ = (1/√2ⁿ) ∑_x |x⟩ |−⟩\n3. Oracle evaluation: (1/√2ⁿ) ∑_x (-1)^(s · x) |x⟩ |−⟩\n4. Hadamard layer on input register: H⊗ⁿ [ (1/√2ⁿ) ∑_x (-1)^(s · x) |x⟩ ] = |s⟩\n5. Measure: Yields s with probability 1.0!',
    intuition: 'Classically, you must query 1000...00, 0100...00, 0010...00 one bit at a time to read each bit of s. The quantum circuit sets up interference such that the phase shifts introduced by the dot product interfere constructively precisely on the state |s⟩.',
    applications: ['Exact O(n) to O(1) query complexity speedup demonstration', 'Subroutine in quantum cryptanalysis and secret-sharing verification', 'Benchmark circuit for testing gate fidelity and cross-talk across n qubits', 'Taught as foundational query complexity in IIT computer science programs'],
    preset: null,
    furtherReading: 'Bernstein & Vazirani (1997) SIAM J. Comput. 26; Nielsen & Chuang Ch. 1.4'
  },
  {
    keys: ['simon', "simon's algorithm", 'hidden subgroup', 'period finding xor'],
    title: "Simon's Algorithm & Exponential Query Separation",
    category: 'Algorithms',
    arxiv: null,
    definition: "Given an oracle f: {0,1}ⁿ → {0,1}ⁿ promised to satisfy f(x) = f(y) ⟺ x ⊕ y ∈ {0ⁿ, s} for a hidden period s, Simon's algorithm finds s using O(n) quantum queries, whereas any classical algorithm requires Ω(2^(n/2)) queries. It directly inspired Shor's algorithm.",
    math: 'Circuit execution produces random y ∈ {0,1}ⁿ such that y · s = 0 (mod 2).\nAfter O(n) independent runs, we obtain n-1 linearly independent equations:\n[ y₁ · s = 0 ]\n[ y₂ · s = 0 ]\n[ ...        ]\n[ yₙ₋₁ · s = 0 ]\n\nClassical Gaussian elimination over GF(2) uniquely solves for s in O(n³) classical steps.\nTotal complexity: O(n) quantum queries vs Ω(2^(n/2)) classical queries.',
    intuition: 'Simon\'s algorithm is the first proof of an exponential quantum speedup for a problem with a promise. By measuring the post-oracle superposition in the Hadamard basis, the quantum computer samples orthogonal vectors to the hidden period s.',
    applications: ['Historical precursor that directly led Peter Shor to discover his factoring algorithm', 'Breaking symmetric cryptosystems (e.g., Even-Mansour block cipher in quantum chosen-plaintext settings)', 'Proving the oracle separation BQP ⊄ BPP', 'Post-quantum security analysis of authenticated encryption schemes'],
    preset: null,
    furtherReading: 'Simon (1997) SIAM J. Comput. 26; Nielsen & Chuang Ch. 5.4'
  },
  {
    keys: ['quantum fourier transform', 'qft', 'fourier transform quantum', 'inverse qft'],
    title: 'Quantum Fourier Transform (QFT)',
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/9508023',
    definition: 'The quantum analogue of the discrete Fourier transform (DFT). It transforms computational basis states |j⟩ into equal superpositions with phase coefficients e^(2πi j k / 2ⁿ). For N = 2ⁿ states, classical FFT requires O(n 2ⁿ) operations, while QFT executes in only O(n²) quantum gates.',
    math: 'QFT |j⟩ = (1/√2ⁿ) ∑_{k=0}^{2ⁿ-1} e^(2πi j k / 2ⁿ) |k⟩\n\nProduct representation (revealing factorized circuit):\n|j₁ j₂ ... jₙ⟩ ↦ (1/√2ⁿ) (|0⟩ + e^(2πi 0.jₙ)|1⟩) ⊗ (|0⟩ + e^(2πi 0.jₙ₋₁jₙ)|1⟩) ⊗ ... ⊗ (|0⟩ + e^(2πi 0.j₁j₂...jₙ)|1⟩)\n\nCircuit depth: n Hadamard gates and n(n-1)/2 controlled phase rotation gates R_k = diag(1, e^(2πi/2^k)). Total gates: O(n²).',
    intuition: 'The classical FFT maps a vector of 2ⁿ amplitudes to another vector in O(N log N) time. The QFT maps the quantum state itself into the frequency domain exponentially faster in O((log N)²) time, exposing hidden periodicity and phase.',
    applications: ['Quantum Phase Estimation (QPE) engine', 'Shor\'s integer factorization and discrete logarithm algorithms', 'Hamiltonian ground-state energy estimation in quantum chemistry', 'HHL quantum linear system solver'],
    preset: null,
    furtherReading: 'Coppersmith (1994) IBM Research Report RC19642; Nielsen & Chuang Ch. 5.1'
  },
  {
    keys: ['quantum phase estimation', 'qpe', 'phase estimation algorithm', 'eigenphase'],
    title: 'Quantum Phase Estimation (QPE)',
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/9511026',
    definition: 'QPE estimates the unknown eigenphase θ of a unitary operator U given its eigenvector |u⟩ such that U|u⟩ = e^(2πi θ)|u⟩. Using an n-qubit ancilla register, QPE determines θ to n bits of precision with probability 1 - ε using O(n) controlled-U^(2^k) operations and one inverse QFT.',
    math: 'Eigenvalue equation: U|u⟩ = e^(2πi θ)|u⟩,   θ ∈ [0, 1)\nCircuit:\n1. Prepare |0⟩⊗ᵗ |u⟩\n2. H⊗ᵗ on counting register: (1/√2ᵗ) ∑_{k=0}^{2ᵗ-1} |k⟩ |u⟩\n3. Apply successive controlled-U^(2^j) gates via phase kickback:\n   State becomes: (1/√2ᵗ) ∑_{k=0}^{2ᵗ-1} e^(2πi θ k) |k⟩ |u⟩\n4. Apply Inverse QFT (QFT†) on counting register: Yields binary representation |θ̃⟩\n5. Measure counting register to obtain θ to t bits of precision.',
    intuition: 'QPE asks: "If I apply U repeatedly, at what frequency does the phase rotate?" By applying powers of U (1, 2, 4, 8...) conditioned on binary ancilla qubits, the phase is written into the register as a binary fraction, which QFT† unpacks into measurement probabilities.',
    applications: ['Calculates molecular ground state energies in quantum chemistry (FCI benchmark)', 'Subroutine for order-finding in Shor\'s factoring algorithm', 'Solves systems of linear equations in the HHL algorithm', 'Spectral analysis of physical quantum Hamiltonians at IISc/TIFR'],
    preset: null,
    furtherReading: 'Kitaev (1995) arXiv:quant-ph/9511026; Nielsen & Chuang Ch. 5.2'
  },
  {
    keys: ['shor', "shor's algorithm", 'factoring quantum', 'rsa quantum', 'order finding', 'discrete logarithm'],
    title: "Shor's Factoring & Discrete Logarithm Algorithm",
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/9508027',
    definition: 'Published by Peter Shor in 1994: factors an n-bit composite integer N in polynomial time O(n³), providing an exponential speedup over the best classical algorithm (General Number Field Sieve, which takes sub-exponential time exp(O(n^(1/3) log^(2/3) n))). Breaks RSA, Diffie-Hellman, and ECC cryptography.',
    math: 'Reduction to order finding:\n1. Choose random a < N such that gcd(a, N) = 1.\n2. Quantum period finding: Find smallest r such that a^r ≡ 1 (mod N) using QPE with unitary U_a |y⟩ = |a·y mod N⟩.\n3. If r is even and a^(r/2) ≢ -1 (mod N):\n   Compute classical GCD: gcd(a^(r/2) - 1, N) and gcd(a^(r/2) + 1, N).\n   These yield non-trivial prime factors of N with probability ≥ 50%.\n\nPhysical resource estimates for RSA-2048:\nRequires ~20 million physical qubits with surface code QEC (Gidney & Ekerå 2021) or ~4000 logical qubits for ~8 hours of runtime.',
    intuition: 'Factoring numbers is classically hard, but finding the period of modular exponentiation is equivalent to finding a wave\'s frequency. Shor transforms factoring into a periodicity problem, which the Quantum Fourier Transform solves exponentially faster than classical brute-force searches.',
    applications: ['Cryptanalysis: breaches RSA, ElGamal, and Elliptic Curve Cryptography (ECC)', 'Spurred global standardization of Post-Quantum Cryptography (NIST PQC)', 'Motivates development of Quantum-Safe communications in Indian defense and banking sectors', 'Benchmark goal for full fault-tolerant quantum computers'],
    preset: null,
    furtherReading: 'Shor (1994) IEEE FOCS; Gidney & Ekerå (2021) Quantum 5, 433'
  },
  {
    keys: ['grover', "grover's algorithm", 'grover search', 'amplitude amplification', 'unstructured search'],
    title: "Grover's Search Algorithm & Amplitude Amplification",
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/9605043',
    definition: 'Discovered by Lov Grover (1996): searches an unsorted database of N = 2ⁿ items for M marked items in O(√(N/M)) queries, achieving a provably optimal quadratic speedup over classical O(N) exhaustive search.',
    math: 'Grover Operator G = -D · O = (2|s⟩⟨s| - I) · (I - 2|w⟩⟨w|)\nWhere |s⟩ = (1/√N) ∑ |x⟩ is equal superposition and |w⟩ is the target.\n\nGeometric rotation in 2D subspace span{|w⟩, |w^⊥⟩}:\nInitial angle: sin(θ/2) = √(M/N)\nEach iteration rotates state by θ.\nOptimal iterations: R ≈ (π/4) √(N/M)\nSuccess probability: P_success = sin²((2R + 1) θ/2) ≈ 1.0',
    intuition: 'Start with all states equally likely. The oracle reflects the target state across the horizontal axis (multiplying its amplitude by -1). The diffusion operator then reflects all states across the average amplitude. This double reflection systematically pumps amplitude into the target while draining amplitude from incorrect answers.',
    applications: ['Pre-image and collision attacks against symmetric ciphers (effectively halves AES key length: AES-128 → 64-bit security)', 'Accelerating NP-complete constraint satisfaction and boolean SAT solvers', 'Quantum minimum/maximum finding and collision algorithms', 'Graph coloring and structural pattern matching in computational biology'],
    preset: 'grover',
    furtherReading: 'Grover (1996) STOC \'96; Boyer, Brassard, Høyer, Tapp (1998) Fortschr. Phys. 46'
  },
  {
    keys: ['vqe', 'variational quantum eigensolver', 'variational algorithm', 'molecular energy quantum'],
    title: 'Variational Quantum Eigensolver (VQE)',
    category: 'Quantum Machine Learning',
    arxiv: 'arXiv:1304.3061',
    definition: 'A hybrid quantum-classical NISQ algorithm proposed by Peruzzo et al. (2014) to find the ground state energy E₀ of a molecular Hamiltonian H. Based on the Rayleigh-Ritz variational principle: ⟨ψ(θ)|H|ψ(θ)⟩ ≥ E₀ for all parameters θ.',
    math: 'Variational Principle: E(θ) = ⟨ψ(θ)| H |ψ(θ)⟩ ≥ E₀\nHamiltonian decomposition into Pauli strings:\nH = ∑_i c_i P_i,   where P_i ∈ {I, X, Y, Z}⊗ⁿ\nExpected energy: E(θ) = ∑_i c_i ⟨ψ(θ)| P_i |ψ(θ)⟩\n\nParameter-Shift Rule for exact analytical gradients on hardware:\n∂E/∂θ_k = ½ [ E(θ + (π/2) e_k) - E(θ - (π/2) e_k) ]',
    intuition: 'Current quantum computers have too much noise for long algorithms like QPE. VQE delegates state preparation and Pauli measurements to a short-depth quantum circuit, while offloading parameter optimization (gradient descent) to a classical supercomputer, making it noise-resilient.',
    applications: ['Quantum chemistry: calculating ground-state dissociation curves of H₂, LiH, H₂O', 'Catalysis design: nitrogen fixation simulation for fertilizer manufacturing', 'Strongly correlated electron physics: Hubbard model ground states at IISc', 'Material science: discovering high-temperature superconductors'],
    preset: null,
    furtherReading: 'Peruzzo et al. (2014) Nat. Commun. 5; McArdle et al. (2020) Rev. Mod. Phys. 92'
  },
  {
    keys: ['qaoa', 'quantum approximate optimization', 'combinatorial optimization quantum', 'maxcut quantum'],
    title: 'Quantum Approximate Optimization Algorithm (QAOA)',
    category: 'Quantum Machine Learning',
    arxiv: 'arXiv:1411.4028',
    definition: 'Formulated by Farhi, Goldstone, and Gutmann (2014): a hybrid variational algorithm designed to solve combinatorial optimization problems (e.g., Max-Cut) by alternating between problem cost Hamiltonian H_C and non-commuting driver mixer Hamiltonian H_M for p layers.',
    math: 'State preparation for depth p:\n|γ, β⟩ = ∏_{k=1}^p [ e^(-i β_k H_M) e^(-i γ_k H_C) ] |+⟩⊗ⁿ\nCost Hamiltonian for Max-Cut: H_C = ½ ∑_{(i,j)∈E} (I - Z_i Z_j)\nMixer Hamiltonian: H_M = ∑_{i=1}^n X_i\nApproximation ratio: r = ⟨γ, β| H_C |γ, β⟩ / C_max  (lim_{p→∞} r = 1)',
    intuition: 'QAOA is a Trotterized, variational discretization of adiabatic quantum computing. By tuning the evolution times γ_k and β_k, the state navigates through quantum tunneling to find high-quality approximate solutions to NP-hard problems.',
    applications: ['Solving Max-Cut and Traveling Salesperson Problem (TSP)', 'Logistics, traffic routing, and supply chain scheduling optimization', 'Portfolio allocation in financial engineering (Tata/SBI research collaborations)', 'Telecommunications frequency assignment and channel allocation'],
    preset: null,
    furtherReading: 'Farhi, Goldstone, Gutmann (2014) arXiv:1411.4028; Bärtschi & Eidenbenz (2020) arXiv:2006.03744'
  },
  {
    keys: ['hhl', 'hhl algorithm', 'quantum linear systems', 'matrix inversion quantum'],
    title: 'HHL Algorithm (Quantum Linear Systems Solver)',
    category: 'Algorithms',
    arxiv: 'arXiv:0811.3171',
    definition: 'Formulated by Harrow, Hassidim, and Lloyd (2009): solves the quantum linear system problem A|x⟩ = |b⟩ for a sparse, well-conditioned N×N Hermitian matrix A in O(log(N) s² κ² / ε) time, achieving an exponential speedup over classical O(N s κ) solvers.',
    math: 'System: A|x⟩ = |b⟩ ⟹ |x⟩ = A⁻¹|b⟩ / ||A⁻¹|b⟩||\nSpectral decomposition of A: A = ∑_j λ_j |u_j⟩⟨u_j|\nState input: |b⟩ = ∑_j β_j |u_j⟩\nTarget output state: |x⟩ ∝ ∑_j (β_j / λ_j) |u_j⟩\n\nCore pipeline: QPE to extract eigenvalues λ_j → Controlled rotation of ancilla: |λ_j⟩|0⟩ ↦ |λ_j⟩ (C/λ_j |1⟩ + ... |0⟩) → Inverse QPE to uncompute eigenregister → Measure ancilla in |1⟩.',
    intuition: 'HHL does not output the full vector x (which would take O(N) time just to write down). Instead, it outputs a quantum state |x⟩ whose amplitudes encode the solution, allowing quantum measurement of global properties (like ⟨x|M|x⟩) exponentially faster.',
    applications: ['Quantum algorithm foundation for solving partial differential equations (PDEs)', 'Quantum regression, support vector machines, and Gaussian processes', 'Electromagnetic scattering and structural engineering simulations', 'Network flow analysis and electrical circuit simulation'],
    preset: null,
    furtherReading: 'Harrow, Hassidim, Lloyd (2009) Phys. Rev. Lett. 103; Aaronson (2015) Nature Physics 11'
  },
  {
    keys: ['quantum walk', 'quantum random walk', 'continuous time quantum walk', 'discrete quantum walk'],
    title: 'Quantum Random Walks (Discrete & Continuous)',
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/0303081',
    definition: 'The quantum generalization of classical random walks. While a classical random walker spreads diffusively with standard deviation σ ∝ √t, a quantum walker spreads ballistically with σ ∝ t due to coherent constructive interference.',
    math: 'Continuous-time quantum walk (CTQW) on graph G=(V,E) with adjacency matrix A:\n|ψ(t)⟩ = exp(-i A t) |ψ(0)⟩\n\nDiscrete-time quantum walk (DTQW) with coin operator C and shift operator S:\nU = S · (C ⊗ I)\nVariance: Classical σ² = 2 D t,   Quantum σ² ∝ t²  (Ballistic quadratic speedup)',
    intuition: 'A classical walker flips a coin and takes a step left or right, wandering back and forth. A quantum walker\'s coin enters a superposition, walking in both directions simultaneously. Destructive interference suppresses staying near the origin, causing the wavepacket to shoot outwards at linear speed.',
    applications: ['Spatial search algorithms on graphs (quadratic speedup over classical random walks)', 'Element distinctness and graph isomorphism testing', 'Quantum simulation of coherent energy transport in photosynthesis (FMO complex)', 'Routing and community detection in complex networks'],
    preset: null,
    furtherReading: 'Aharonov et al. (1993) Phys. Rev. A 47; Kempe (2003) Contemp. Phys. 44'
  },

  // ==========================================
  // 4. QUANTUM HARDWARE & PHYSICS PLATFORMS
  // ==========================================
  {
    keys: ['superconducting qubit', 'transmon', 'josephson junction', 'cqed', 'circuit qed', 'ibm quantum hardware'],
    title: 'Superconducting Transmon Qubits & Circuit QED',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:cond-mat/0703002',
    definition: 'The leading solid-state quantum computing platform (IBM, Google, Rigetti). Transmon qubits are non-linear LC resonant circuits built from superconducting thin films (niobium/aluminum) with Josephson junctions providing the non-linear inductance needed for anharmonic energy level spacing.',
    math: 'Transmon Hamiltonian: H = 4 E_C (n - n_g)² - E_J cos(φ)\nE_C = e² / (2 C_Σ)   (Charging energy)\nE_J = I_c Φ₀ / (2π)    (Josephson energy, E_J/E_C ≫ 50)\n\nTransition frequency: f₀₁ ≈ (√(8 E_J E_C) - E_C) / h ≈ 4 - 6 GHz\nAnharmonicity: α = f₁₂ - f₀₁ ≈ -E_C / h ≈ -200 to -350 MHz\nAllows isolated |0⟩ ↔ |1⟩ microwave addressing without leaking to |2⟩.',
    intuition: 'A harmonic LC circuit has equally spaced rungs: driving it with a photon excites it from 0 to 1, 1 to 2, 2 to 3 endlessly. A Josephson junction acts as a non-linear inductor, making the 0→1 transition different from the 1→2 transition, isolating a clean two-level quantum qubit.',
    applications: ['IBM Quantum Heron (156 qubits) & Google Sycamore (72 qubits)', 'Fast single-qubit microwave gates (~20 ns) and two-qubit cross-resonance gates (~200 ns)', 'Readout via dispersive coupling to coplanar waveguide (CPW) resonators', 'Platform of choice for surface code error correction demonstrations'],
    preset: null,
    furtherReading: 'Koch et al. (2007) Phys. Rev. A 76; Blais et al. (2021) Rev. Mod. Phys. 93'
  },
  {
    keys: ['trapped ion', 'trapped ions', 'ion trap', 'molmer sorensen', 'quantinuum', 'ionq'],
    title: 'Trapped Ion Qubits & Mølmer-Sørensen Gates',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:quant-ph/9810040',
    definition: 'Qubits encoded in the hyperfine or optical clock states of atomic ions (e.g., ¹⁷¹Yb⁺, ⁴⁰Ca⁺, ¹³³Ba⁺) confined in ultra-high vacuum by oscillating RF electric fields (Paul traps). Entanglement is driven via laser pulses coupling ion electronic states to collective vibrational phonon modes (Mølmer-Sørensen gate).',
    math: 'Hyperfine clock transition: |0⟩ = |²S₁/₂, F=0, m_F=0⟩,  |1⟩ = |²S₁/₂, F=1, m_F=0⟩\nCoherence time T₂: > 1 hour (unaffected by magnetic fluctuations to 1st order)\n\nMølmer-Sørensen Hamiltonian:\nH_MS = ∑_{i<j} J_ij (σ_x^i ⊗ σ_x^j)\nGate Fidelity: 1-qubit > 99.99%, 2-qubit > 99.9% (highest physical fidelities worldwide)',
    intuition: 'Unlike artificial superconducting qubits fabricated on silicon chips that vary due to manufacturing defects, every single Yb-171 ion in the universe is fundamentally identical. Laser beams act as tweezers and optical gates, achieving all-to-all qubit connectivity via shared vibrational motion.',
    applications: ['Quantinuum H-Series (H2-1: 56 trapped ions with all-to-all connectivity)', 'IonQ Forte commercial trapped-ion QPUs', 'IISc & TIFR quantum optics laboratory experiments', 'Quantum simulation of long-range Ising spin chains and lattice gauge theories'],
    preset: null,
    furtherReading: 'Cirac & Zoller (1995) Phys. Rev. Lett. 74; Mølmer & Sørensen (1999) Phys. Rev. Lett. 82'
  },
  {
    keys: ['neutral atom', 'rydberg', 'rydberg atoms', 'optical tweezers', 'quera'],
    title: 'Neutral Atom Arrays & Rydberg Blockade',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:1912.03848',
    definition: 'Neutral alkali/alkaline-earth atoms (⁸⁷Rb, ⁸⁸Sr) held in arbitrary 2D/3D arrays by optical tweezers. Entanglement is mediated by exciting atoms to high principal quantum number Rydberg states (n ~ 70), where strong electric dipole-dipole interactions create the "Rydberg blockade" effect.',
    math: 'Rydberg interaction potential: V(r) = C₆ / r⁶\nBlockade radius R_b: distance where V(R_b) = Ω (Rabi laser frequency)\nR_b = (C₆ / ℏΩ)^(1/6) ≈ 5 - 10 μm\n\nBlockade mechanism:\nIf atom 1 is excited to Rydberg state |r⟩, the transition energy of atom 2 is shifted by V(r) ≫ ℏΩ, preventing atom 2 from being excited. Enables fast controlled-phase gates.',
    intuition: 'Neutral atoms do not repel each other electrically, allowing hundreds of them to be packed in tight 2D optical lattices without crosstalk. When laser-pulsed into giant Rydberg atoms, they balloon 1000× in diameter, creating a strong blockade zone that entangles neighboring atoms.',
    applications: ['QuEra Aquila: 256-neutral-atom quantum processor operating via cloud', 'Harvard/MIT 2023 breakthrough: 48 logical qubits using neutral atoms', 'Quantum simulation of quantum spin liquids and non-equilibrium matter', 'Solving combinatorial Maximum Independent Set (MIS) problems natively'],
    preset: null,
    furtherReading: 'Jaksch et al. (2000) Phys. Rev. Lett. 85; Bluvstein et al. (2023) Nature 626'
  },
  {
    keys: ['photonic quantum computing', 'linear optical', 'loqc', 'klm protocol', 'squeezed light', 'xanadu'],
    title: 'Photonic Quantum Computing & Measurement-Based QC',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:quant-ph/0006088',
    definition: 'Quantum information encoded in photons (polarization, path, time-bin, or continuous-variable squeezed states). Photons travel at the speed of light and do not suffer from thermal decoherence, operating at room temperature. Deterministic two-qubit gates are synthesized using measurement and quantum teleportation (KLM protocol).',
    math: 'Single-mode squeezed vacuum state:\n|ξ⟩ = S(ξ)|0⟩ = exp( ½ (ξ* a² - ξ a†²) ) |0⟩\nQuadrature variance: ΔX₁² = ½ e^(-2r) < ½  (sub-shot-noise squeezing)\n\nKLM Theorem (Knill, Laflamme, Milburn 2001):\nScalable universal quantum computing is possible using ONLY linear optical elements (beamsplitters, phase shifters), single-photon sources, and photodetectors, using teleportation gates.',
    intuition: 'Photons are the ultimate carriers of quantum information: they do not interact with air or heat, eliminating the need for bulky dilution refrigerators. However, because photons do not naturally interact with each other, entangling them requires clever measurement-induced non-linearities.',
    applications: ['Xanadu Borealis: 216-mode Gaussian Boson Sampling quantum supremacy', 'PsiQuantum silicon photonic fault-tolerant architecture', 'Quantum Key Distribution over optical fiber networks and satellite links', 'Measurement-based cluster state quantum computing'],
    preset: null,
    furtherReading: 'Knill, Laflamme, Milburn (2001) Nature 409; Kok et al. (2007) Rev. Mod. Phys. 79'
  },
  {
    keys: ['silicon spin qubit', 'quantum dot', 'spin qubit', 'semiconductor quantum computing'],
    title: 'Silicon Spin Qubits & Semiconductor Quantum Dots',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:1905.02902',
    definition: 'Qubits encoded in the spin of single electrons or holes confined in electrostatically defined semiconductor quantum dots in isotopically purified Silicon (²⁸Si). Leveraging existing semiconductor CMOS foundries promises monolithic scaling to billions of qubits.',
    math: 'Zeeman splitting under external magnetic field B_z:\nH_Z = ½ g μ_B B_z σ_z\nLarmor frequency: f_L = g μ_B B_z / h ≈ 28 GHz / Tesla\nExchange coupling between neighboring dots:\nH_ex = J(t) S₁ · S₂ = ¼ J(t) (X₁X₂ + Y₁Y₂ + Z₁Z₂ - I)\nCoherence in purified ²⁸Si: T₂* > 100 μs, T₂ (echo) > 20 ms due to zero nuclear spin background.',
    intuition: 'A silicon spin qubit is essentially a single-electron transistor where the spin (up or down) of a solitary trapped electron represents 0 or 1. Because it builds on the exact same silicon manufacturing processes as Intel and TSMC microchips, it is the ultimate semiconductor candidate.',
    applications: ['Intel Tunnel Falls 12-qubit silicon spin chip', 'Silicon Quantum Computing (SQC Australia) atomic precision qubits', 'Integration with classical cryo-CMOS control electronics on same die', 'IIT Bombay & IISc Nanoelectronics semiconductor qubit research programs'],
    preset: null,
    furtherReading: 'Loss & DiVincenzo (1998) Phys. Rev. A 57; Vandersypen et al. (2017) npj Quantum Inf. 3'
  },
  {
    keys: ['topological quantum computing', 'majorana', 'majorana fermion', 'majorana zero mode', 'anyons', 'braiding'],
    title: 'Topological Quantum Computing & Majorana Zero Modes',
    category: 'Quantum Hardware',
    arxiv: 'arXiv:cond-mat/0010440',
    definition: 'A theoretical approach championed by Microsoft where qubits are encoded in non-Abelian anyonic quasi-particle excitations (Majorana Zero Modes) at the ends of topological superconductor nanowires. Gates are implemented by physically braiding worldlines of anyons, providing hardware-level topological protection against local decoherence.',
    math: 'Majorana operators: γ_i = γ_i†,   {γ_i, γ_j} = 2 δ_ij\nA single non-local Dirac fermion is split into two spatially separated Majoranas:\nc = ½ (γ₁ + i γ₂),    c† = ½ (γ₁ - i γ₂)\nParity state: n = c† c = 0 or 1\n\nBraiding operator for swapping anyons 1 and 2:\nB₁₂ = exp( (π/4) γ₁ γ₂ ) = (1/√2) (1 + γ₁ γ₂)\nPhase evolution depends strictly on winding topology, independent of geometric noise!',
    intuition: 'Ordinary qubits store data locally (like a dot on a page: easily erased by smudge). Topological qubits store information non-locally as a braided knot in the worldlines of anyons: shaking the table cannot undo the knot without wrapping all the way around, providing innate hardware error immunity.',
    applications: ['Microsoft Quantum topological qubit program (Majorana 1 architecture)', 'Immunity to local thermal fluctuations and stray electromagnetic noise', 'Bypasses massive physical qubit redundancy required by surface codes', 'Condensed matter frontier research at IISc theoretical physics department'],
    preset: null,
    furtherReading: 'Kitaev (2001) Phys.-Usp. 44; Nayak et al. (2008) Rev. Mod. Phys. 80'
  },

  // ==========================================
  // 5. QUANTUM ERROR CORRECTION & FAULT TOLERANCE
  // ==========================================
  {
    keys: ['surface code', 'toric code', 'qec', 'quantum error correction', 'stabilizer code', 'planar code'],
    title: 'Surface Codes & Stabilizer Formalism',
    category: 'Quantum Error Correction',
    arxiv: 'arXiv:1208.0928',
    definition: 'The leading quantum error correction architecture for 2D nearest-neighbor QPU lattices. Physical data qubits sit on edges, while syndrome ancilla qubits sit on vertices (Z-stabilizers detecting X bit flips) and plaquettes (X-stabilizers detecting Z phase flips). The code distance d tolerates up to ⌊(d-1)/2⌋ arbitrary physical errors.',
    math: 'Stabilizer generators for surface code:\nA_v = ∏_{i ∈ star(v)} Z_i    (Vertex / Star operator)\nB_p = ∏_{j ∈ boundary(p)} X_j   (Plaquette operator)\nCommutation: [A_v, B_p] = 0 for all v, p\n\nCode distance d: Logical X and Z strings span boundaries of length d.\nPhysical qubits needed: N = 2 d² - 2 d + 1\nFault-tolerant threshold: p_th ≈ 1% under depolarizing noise with MWPM decoding.',
    intuition: 'One logical qubit is spread across a chessboard grid of physical qubits. Measure parity stabilizers continuously without ever looking at the data qubits. If a physical qubit flips, the two adjacent measurement checks flash a warning signal (syndrome), telling a classical decoder where the error occurred.',
    applications: ['Google Quantum AI: suppressing quantum errors by scaling distance 3 to distance 5 (Nature 2023)', 'IBM Quantum roadmap targeting 1 fault-tolerant logical qubit with 10,000 physical qubits', 'Quantinuum fault-tolerant logical qubit demonstrations', 'Foundational focus of national quantum missions globally'],
    preset: null,
    furtherReading: 'Fowler et al. (2012) Phys. Rev. A 86; Google Quantum AI (2023) Nature 614'
  },
  {
    keys: ['shor code', 'shor 9 qubit code', '9 qubit code', 'first qec code'],
    title: 'Shor 9-Qubit Error Correction Code',
    category: 'Quantum Error Correction',
    arxiv: null,
    definition: 'Invented by Peter Shor in 1995: the first quantum error-correcting code. It concatenates a 3-qubit bit-flip code with a 3-qubit phase-flip code to encode 1 logical qubit into 9 physical qubits, capable of detecting and correcting any arbitrary single-qubit error (X, Y, or Z).',
    math: 'Logical basis states:\n|0_L⟩ = (1/2√2) (|000⟩ + |111⟩) ⊗ (|000⟩ + |111⟩) ⊗ (|000⟩ + |111⟩)\n|1_L⟩ = (1/2√2) (|000⟩ - |111⟩) ⊗ (|000⟩ - |111⟩) ⊗ (|000⟩ - |111⟩)\n\nStabilizer Generators (8 total):\nBit-flip checks: Z₁Z₂, Z₂Z₃, Z₄Z₅, Z₅Z₆, Z₇Z₈, Z₈Z₉\nPhase-flip checks: X₁X₂X₃X₄X₅X₆, X₄X₅X₆X₇X₈X₉',
    intuition: 'Shor proved that quantum error correction is physically possible despite the no-cloning theorem and continuous error angles. By discretizing arbitrary errors into Pauli X and Z operators and measuring syndromes non-destructively, quantum states can be protected indefinitely.',
    applications: ['Historical proof of principle enabling the entire field of fault-tolerant quantum computing', 'Canonical classroom example for teaching stabilizer theory at IIT/IISc', 'Demonstration of code concatenation and nested quantum protection', 'Basis for understanding modern CSS codes'],
    preset: null,
    furtherReading: 'Shor (1995) Phys. Rev. A 52; Nielsen & Chuang Ch. 10.2'
  },
  {
    keys: ['steane code', '7 qubit code', 'css code', 'color code'],
    title: 'Steane 7-Qubit CSS Code',
    category: 'Quantum Error Correction',
    arxiv: 'arXiv:quant-ph/9605011',
    definition: 'A Calderbank-Shor-Steane (CSS) code constructed from the classical [7, 4, 3] Hamming code. It encodes 1 logical qubit into 7 physical qubits with code distance d = 3. A crucial feature is that all Clifford group gates {H, S, CNOT} can be implemented transversally (bitwise).',
    math: 'Stabilizers derived from classical parity check matrix H_Hamming:\n[ 0 0 0 1 1 1 1 ]\n[ 0 1 1 0 0 1 1 ]\n[ 1 0 1 0 1 0 1 ]\n\n3 X-type stabilizers: X₄X₅X₆X₇, X₂X₃X₆X₇, X₁X₃X₅X₇\n3 Z-type stabilizers: Z₄Z₅Z₆Z₇, Z₂Z₃Z₆Z₇, Z₁Z₃Z₅Z₇\nLogical operators: X_L = X₁X₂X₃X₄X₅X₆X₇,  Z_L = Z₁Z₂Z₃Z₄Z₅Z₆Z₇',
    intuition: 'In the Steane code, the entire Clifford group is transversal: to do a logical Hadamard, you simply apply physical Hadamards to all 7 qubits individually! This eliminates error propagation between qubits during Clifford gate operations.',
    applications: ['Transversal Clifford gate implementations in trapped-ion QPUs', 'Color codes and topological extensions on triangular lattices', 'Fault-tolerant quantum memory demonstrations by Quantinuum', 'Benchmark for testing Eastin-Knill theorem limits'],
    preset: null,
    furtherReading: 'Steane (1996) Proc. R. Soc. Lond. A 452; Calderbank & Shor (1996) Phys. Rev. A 54'
  },
  {
    keys: ['qldpc', 'quantum ldpc', 'low density parity check', 'good quantum codes'],
    title: 'Quantum LDPC (Low-Density Parity-Check) Codes',
    category: 'Quantum Error Correction',
    arxiv: 'arXiv:2111.03654',
    definition: 'A revolutionary class of sparse quantum error-correcting codes where each check operator involves only O(1) physical qubits, and each qubit participates in O(1) checks. In 2021, Panteleev and Kalachev discovered asymptotically "good" qLDPC codes encoding k = Θ(N) logical qubits with distance d = Θ(N), drastically cutting hardware overhead.',
    math: 'Parity check matrix sparse condition: row weight ≤ w_r = O(1), col weight ≤ w_c = O(1)\nCSS commutation condition: H_X · H_Z^T = 0 (mod 2)\n\nComparison with Surface Code:\nSurface Code: k = 1 logical qubit per 2d² physical qubits (rate k/N → 0 as d → ∞)\nGood qLDPC: Constant non-zero encoding rate k/N > 0 and linear distance d ∝ N\nReduces qubit overhead by 10× to 50× compared to surface codes!',
    intuition: 'Surface codes are geometrically constrained to 2D local grids, forcing you to spend thousands of physical qubits to protect just one logical qubit. qLDPC codes use non-local connectivity (long-range couplers) to store dozens of logical qubits simultaneously within hundreds of physical qubits.',
    applications: ['Next-generation fault-tolerant architectures from IBM Quantum and QuEra', 'Massive reduction of physical qubit overhead for breaking RSA-2048', 'Hardware architectures with long-range optical or superconducting couplers', 'Theoretical computer science breakthrough uniting quantum code theory and graph topology'],
    preset: null,
    furtherReading: 'Panteleev & Kalachev (2021) IEEE Trans. Inf. Theory; Breuckmann & Eberhardt (2021) PRX Quantum 2'
  },
  {
    keys: ['magic state distillation', 'bravyi kitaev', 't state injection', 'eastin knill'],
    title: 'Magic State Distillation & Eastin-Knill Theorem',
    category: 'Quantum Error Correction',
    arxiv: 'arXiv:quant-ph/0403025',
    definition: 'The Eastin-Knill theorem proves that no quantum error-correcting code can implement a universal set of gates transversally (fault-tolerantly without spreading errors). To achieve universality, codes implement Clifford gates transversally and synthesize non-Clifford T gates via Magic State Distillation (Bravyi & Kitaev 2005).',
    math: 'Target Magic State: |T⟩ = cos(π/8)|0⟩ + sin(π/8)|1⟩ = T|+⟩\nDistillation protocol (15-to-1 factory):\nConsumes 15 noisy copies of |T⟩ with error rate ε and uses the [[15, 1, 3]] Reed-Muller code to output 1 purified copy with error rate O(ε³).\n\nGate Teleportation: A clean |T⟩ state + CNOT + S correction implements a fault-tolerant T gate on data.',
    intuition: 'Transversal gates are cheap and clean, but Eastin-Knill says you can never have a complete universal toolbox purely through transversal operations. Magic state distillation acts as an ultra-pure quantum refinery: feeding in many rough, noisy T states to distill out a diamond-pure T state that unlocks universal quantum computing.',
    applications: ['Dominates physical qubit footprint in fault-tolerant quantum computers (~90% of all qubits in a Shor factorization processor are dedicated to distillation factories)', 'T-count and T-depth compiler optimization algorithms', 'Bravyi-Haah and Litinski lattice surgery magic state factories', 'Benchmarking fault-tolerant thresholds in Google and IBM architectures'],
    preset: null,
    furtherReading: 'Eastin & Knill (2009) Phys. Rev. Lett. 102; Bravyi & Kitaev (2005) Phys. Rev. A 71; Litinski (2019) Quantum 3'
  },

  // ==========================================
  // 6. QUANTUM MACHINE LEARNING & INFORMATION
  // ==========================================
  {
    keys: ['quantum machine learning', 'qml', 'quantum neural network', 'qnn', 'pqc'],
    title: 'Quantum Machine Learning (QML) & Parameterized Circuits',
    category: 'Quantum Machine Learning',
    arxiv: 'arXiv:1611.09347',
    definition: 'An interdisciplinary field exploring quantum algorithms for machine learning tasks. Key architectures include Parameterized Quantum Circuits (PQCs) functioning as Quantum Neural Networks (QNNs), Quantum Support Vector Machines with quantum kernel estimation, and quantum feature mapping into high-dimensional Hilbert space.',
    math: 'Quantum Neural Network forward pass:\n|ψ(x, θ)⟩ = U(θ) Φ(x) |0⟩⊗ⁿ\nOutput expectation value: y_pred = ⟨ψ(x, θ)| M |ψ(x, θ)⟩\nLoss function: L(θ) = (1/N) ∑ (y_i - y_pred(x_i, θ))²\n\nQuantum Kernel Trick: k(x_i, x_j) = |⟨0| Φ†(x_i) Φ(x_j) |0⟩|²\nCalculated directly on quantum hardware via SWAP test or inversion circuit.',
    intuition: 'Classical neural networks learn weights by matrix multiplication. Quantum neural networks learn rotation angles θ on quantum gates. The input data is mapped into the exponentially large 2ⁿ-dimensional Hilbert space of a quantum register, potentially allowing classification of patterns that classical networks cannot separate.',
    applications: ['High-energy physics: LHC particle collision track classification at CERN', 'Quantum chemistry: predicting molecular atomization energies', 'Financial fraud detection and risk modeling (JPMorgan, Goldman Sachs)', 'IIT research: quantum generative modeling for synthetic medical data'],
    preset: null,
    furtherReading: 'Biamonte et al. (2017) Nature 549; Havlíček et al. (2019) Nature 567; Schuld & Petruccione (2021) "Machine Learning with Quantum Computers"'
  },
  {
    keys: ['barren plateau', 'barren plateaus', 'vanishing gradients qnn', 'qml trainability'],
    title: 'Barren Plateaus in Quantum Neural Networks',
    category: 'Quantum Machine Learning',
    arxiv: 'arXiv:1803.11173',
    definition: 'A fundamental trainability obstacle discovered by McClean et al. (2018): for randomly initialized deep parameterized quantum circuits, the gradient of the cost function vanishes exponentially with the number of qubits n: Var[∂E/∂θ_k] ∈ O(1/2ⁿ).',
    math: 'Variance of gradient under Haar-random state distribution:\nVar_θ [ ∂_k ⟨H⟩ ] ∝ (1/2ⁿ) · Tr(H²) / 2ⁿ\n\nGradient magnitude decays exponentially: |∂E/∂θ| ~ 2^(-n/2)\nRequires an exponential number of measurement shots O(2ⁿ) to resolve the gradient direction from shot noise, negating quantum speedup.',
    intuition: 'Hilbert space is unimaginably vast. A randomly initialized deep quantum circuit wanders into a completely uniform, flat desert where every direction looks identical. Without gradients, classical optimizers cannot determine which way is uphill or downhill.',
    applications: ['Designing shallow local cost functions to avoid global barren plateaus', 'Identity initialization and layer-by-layer pre-training of QNNs', 'Geometric quantum machine learning respecting problem symmetries', 'Crucial constraint for all QML research at academic institutes globally'],
    preset: null,
    furtherReading: 'McClean et al. (2018) Nat. Commun. 9; Cerezo et al. (2021) Nat. Commun. 12'
  },
  {
    keys: ['quantum teleportation', 'teleportation protocol', 'state transfer quantum'],
    title: 'Quantum Teleportation Protocol',
    category: 'Quantum Protocols',
    arxiv: 'arXiv:quant-ph/9605005',
    definition: 'Formulated by Bennett et al. (1993): transmits an unknown quantum state |ψ⟩ = α|0⟩ + β|1⟩ from Alice to Bob using one pre-shared Bell pair (|Φ⁺⟩) and 2 classical bits sent through a classical channel, destroying the original state in compliance with the no-cloning theorem.',
    math: 'Initial state: |ψ⟩_C ⊗ |Φ⁺⟩_AB = (α|0⟩ + β|1⟩) ⊗ (1/√2)(|00⟩ + |11⟩)\n1. Alice applies CNOT(C→A) followed by H(C).\n2. Total state expands into Bell basis:\n   ½ [ |00⟩_CA (α|0⟩ + β|1⟩)_B + |01⟩_CA (α|1⟩ + β|0⟩)_B + |10⟩_CA (α|0⟩ - β|1⟩)_B + |11⟩_CA (α|1⟩ - β|0⟩)_B ]\n3. Alice measures qubits C and A, obtaining 2 classical bits (m₁, m₂).\n4. Bob applies corrective Pauli operator Z^(m₁) X^(m₂) to qubit B.\n5. Bob\'s qubit becomes identically |ψ⟩!',
    intuition: 'Alice scans her unknown quantum particle against half of an entangled Bell pair. The measurement destroys the original quantum information locally while creating a 2-bit classical key. When Bob applies the key to his half of the entangled pair, the original state instantly emerges.',
    applications: ['Quantum network routing and quantum internet repeaters', 'Modular multi-core quantum processor interconnects', 'Fault-tolerant gate execution via gate teleportation (Gottesman-Chuang)', 'Satellite-to-ground quantum communications (Micius satellite)'],
    preset: null,
    furtherReading: 'Bennett et al. (1993) Phys. Rev. Lett. 70; Bouwmeester et al. (1997) Nature 390'
  },
  {
    keys: ['superdense coding', 'dense coding', 'two classical bits in one qubit'],
    title: 'Superdense Coding Protocol',
    category: 'Quantum Protocols',
    arxiv: null,
    definition: 'Formulated by Bennett and Wiesner (1992): the conjugate protocol to teleportation. Transmits 2 classical bits of information from Alice to Bob by sending only ONE physical qubit, provided Alice and Bob share a pre-established entangled Bell pair.',
    math: 'Shared state: |Φ⁺⟩ = (|00⟩ + |11⟩)/√2\nAlice encodes 2 classical bits b₁b₂ by applying local Pauli gate to her qubit:\n- 00: Apply I   ⟹ (|00⟩ + |11⟩)/√2 = |Φ⁺⟩\n- 01: Apply X   ⟹ (|10⟩ + |01⟩)/√2 = |Ψ⁺⟩\n- 10: Apply Z   ⟹ (|00⟩ - |11⟩)/√2 = |Φ⁻⟩\n- 11: Apply iY  ⟹ (|01⟩ - |10⟩)/√2 = |Ψ⁻⟩\n\nAlice sends her single qubit to Bob.\nBob performs Bell measurement (CNOT + H + measure): Decodes both bits b₁b₂ with 100% fidelity!',
    intuition: 'In classical physics, one particle carrying a 2-state degree of freedom can only carry 1 bit of information (Holevo bound). Entanglement doubles this capacity: Alice\'s single particle acts as a handle that steers the joint 4-dimensional entangled state.',
    applications: ['Doubling bandwidth in quantum communication links', 'Quantum network protocol verification', 'Fundamental demonstration of entanglement as a communication resource', 'Tested experimentally across fiber optics and free space optical links'],
    preset: 'bell',
    furtherReading: 'Bennett & Wiesner (1992) Phys. Rev. Lett. 69; Mattle et al. (1996) Phys. Rev. Lett. 76'
  },
  {
    keys: ['bb84', 'quantum key distribution', 'qkd', 'bennett brassard 1984', 'quantum cryptography'],
    title: 'BB84 Quantum Key Distribution (QKD)',
    category: 'Cryptography',
    arxiv: null,
    definition: 'The world\'s first quantum cryptographic protocol, invented by Charles Bennett and Gilles Brassard in 1984. Enables two parties (Alice and Bob) to generate a provably secure shared random cryptographic key, with security guaranteed by the laws of quantum mechanics (no-cloning theorem and collapse upon measurement).',
    math: 'Four quantum states across two non-orthogonal bases:\nComputational basis (Z): |0⟩, |1⟩\nHadamard basis (X): |+⟩, |−⟩\n\nProtocol Steps:\n1. Alice generates random bit a_k and random basis b_k ∈ {Z, X}, sending prepared photons to Bob.\n2. Bob measures each photon in a randomly chosen basis b′_k ∈ {Z, X}.\n3. Public Sifting: Alice and Bob publicly announce bases {b_k} and {b′_k}. They discard bits where bases disagreed (~50% retention).\n4. Error estimation: Compare sample bits. If Quantum Bit Error Rate (QBER) < 11%, no eavesdropper (Eve) was present.\n5. Error correction & Privacy amplification yield unconditionally secure key.',
    intuition: 'If Eve attempts to eavesdrop on the photon in transit, the Born rule forces her to guess the basis. If she guesses wrong, she inevitably collapses the state, introducing detectable errors (minimum 25% error rate on intercepted bits). Alice and Bob instantly detect her presence.',
    applications: ['Government and banking quantum-safe communication lines', 'Indian Defence Research and Development Organisation (DRDO) QKD links (100+ km)', 'Commercial QKD appliances (ID Quantique, Toshiba)', 'Satellite quantum cryptography networks (India National Quantum Mission)'],
    preset: null,
    furtherReading: 'Bennett & Brassard (1984) IEEE Conf. Computers, Systems and Signal Processing; Shor & Preskill (2000) Phys. Rev. Lett. 85'
  },
  {
    keys: ['e91', 'ekert protocol', 'entanglement qkd', 'ekert 1991'],
    title: 'E91 Entanglement-Based Quantum Key Distribution',
    category: 'Cryptography',
    arxiv: null,
    definition: 'Proposed by Artur Ekert in 1991: an entanglement-based QKD protocol where security is directly guaranteed by Bell\'s theorem. Alice and Bob receive halves of EPR entangled pairs and measure them along randomly chosen angles, proving the absence of eavesdropping via violation of the CHSH inequality.',
    math: 'Shared state source: Singlet state |Ψ⁻⟩ = (|01⟩ - |10⟩)/√2\nAlice measurement angles: a₁ = 0°, a₂ = 45°, a₃ = 90°\nBob measurement angles: b₁ = 45°, b₂ = 90°, b₃ = 135°\n\nCorrelation groups:\n- When orientations match: Results are perfectly anti-correlated ⟹ forms secret key.\n- When orientations differ: Used to compute CHSH test statistic S.\nIf |S| = 2√2, the entanglement is pure and eavesdropping is mathematically impossible.',
    intuition: 'In BB84, Alice prepares states; in E91, an untrusted source distributes entangled pairs. Even if Eve herself manufactured the pairs, the CHSH test proves whether the correlation is purely quantum. If Eve intercepted or holds correlations with the particles, |S| drops below 2√2, exposing her instantly.',
    applications: ['Device-Independent Quantum Key Distribution (DI-QKD)', 'Space-based satellite entanglement links across continents', 'Quantum network nodes with untrusted central quantum repeaters', 'Foundational protocol for experimental quantum information science'],
    preset: 'bell',
    furtherReading: 'Ekert (1991) Phys. Rev. Lett. 67; Aspect (2002) Nature 418'
  },
  {
    keys: ['post quantum cryptography', 'pqc', 'lattice cryptography', 'kyber', 'dilithium', 'nist pqc'],
    title: 'Post-Quantum Cryptography (PQC) & Lattice Standards',
    category: 'Cryptography',
    arxiv: null,
    definition: 'Classical cryptographic algorithms designed to run on existing digital computers that remain secure against attacks by both classical and fault-tolerant quantum computers (including Shor\'s and Grover\'s algorithms). In 2024, NIST finalized the first standards: ML-KEM (Kyber), ML-DSA (Dilithium), and SLH-DSA (SPHINCS+).',
    math: 'Hard Mathematical Problems underlying PQC:\n1. Learning With Errors (LWE) & Module-LWE:\n   Given A ∈ R_q^(k×l), find s ∈ R_q^l given b = A s + e (mod q) where e is small Gaussian noise.\n   Reduces to shortest vector problem (SVP) on high-dimensional lattices (no known quantum speedup).\n2. Classical RSA security: O(exp(n^(1/3))) ⟹ Shor breaks in O(n³)\n3. Lattice LWE security: Classical & Quantum both require O(exp(n)) lattice basis reduction steps (BKZ algorithm).',
    intuition: 'Shor\'s algorithm destroys RSA and ECC because they rely on hidden periodicities in abelian groups. Lattice cryptography is based on finding the nearest point in a 1000-dimensional grid of tilted dots with added noise. Quantum superposition offers no algebraic shortcut to navigate high-dimensional geometric noise.',
    applications: ['NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA) standards', 'HTTPS TLS 1.3 quantum-resistant cipher suites (Google Chrome, Cloudflare)', 'Transitioning critical banking and national security infrastructure globally', 'Protection against "Harvest Now, Decrypt Later" quantum adversary campaigns'],
    preset: null,
    furtherReading: 'NIST Post-Quantum Cryptography Standardization (2024); Regev (2009) J. ACM 56'
  },

  // ==========================================
  // 7. ANCIENT HERITAGE & ATOMIC TREATISES
  // ==========================================
  {
    keys: ['kanada', 'parmanu', 'parmanu vada', 'vaisheshika', 'maharshi kanada', 'indian atomic theory'],
    title: 'Maharshi Kanada: Parmanu Vada (Genesis of Atomic Theory)',
    category: 'Ancient Heritage',
    arxiv: null,
    definition: 'Founded by Maharshi Kanada in the 6th Century BCE in the Vaisheshika Sutra. Formulated the fundamental doctrine of Parmanu Vada: all physical matter (Dravya) is composed of eternal, indivisible, infinitesimal quantum units called Parmanu, which aggregate into binary compounds (Dyanuka) and ternary structures (Tryanuka) through vibrational kinetic force (Spandana).',
    math: 'Metaphysical Hierarchy of Material Formation:\n1 Parmanu (Indivisible Point Quantum)\n2 Parmanu ⟹ 1 Dyanuka (Diatomic Molecule)\n3 Dyanuka ⟹ 1 Tryanuka / Trasarenu (Triatomic Particle, visible in sunbeam)\n\nPrinciples:\n"सर्वं द्रव्यं परमाणु रूपम्" (All matter is fundamentally atomic)\nParmanu are uncaused, indestructible, and eternally in motion (Spandana).',
    intuition: 'Centuries before Democritus and Dalton, Indian natural philosophy postulated that matter cannot be divided infinitely without encountering an ultimate limit. If matter could be divided indefinitely, a mustard seed and Mount Meru would contain equal infinite parts. Hence, indivisible discrete quanta (Parmanu) must exist.',
    applications: ['Historical foundation of atomism and discrete state space', 'Epistemological framework of Indian natural philosophy', 'Celebrated in modern Indian scientific heritage programs at IISc and IITs', 'Comparative epistemology between ancient discrete logic and quantum mechanics'],
    preset: null,
    furtherReading: 'Kanada, Vaisheshika Sutra (c. 600 BCE); Sinha translation (1923) Sacred Books of the Hindus; Subbarayappa "A Concise History of Science in India"'
  },
  {
    keys: ['kapila', 'samkhya', 'prakriti', 'purusha', 'unmanifest potentiality', 'observer effect philosophy'],
    title: 'Sage Kapila: Samkhya & The Conscious Observer',
    category: 'Ancient Heritage',
    arxiv: null,
    definition: 'Expounded by Sage Kapila in the Samkhya Sutra (c. 700 BCE). Models physical nature (Prakriti) as a multi-dimensional matrix of unmanifest potentiality (Avyakta) characterized by three entangled dynamical qualities (Gunas: Sattva, Rajas, Tamas). Upon interaction with the conscious observer (Purusha), the unmanifest potential collapses into manifest macroscopic reality (Vyakta).',
    math: 'Dual Epistemic Framework:\nPrakriti (Quantum Potentiality Space) ⟷ Purusha (The Conscious Observer)\nEquilibrium State: Samyavastha of Gunas (No manifest phenomenon)\nPerturbation / Observation: Collapse of equilibrium into 23 manifest physical Tattvas\n\nDirect parallel to John von Neumann and Eugene Wigner\'s interpretation of the quantum measurement problem (observer-induced state collapse).',
    intuition: 'Erwin Schrödinger and Werner Heisenberg studied Indian philosophical texts extensively while developing quantum mechanics. Schrödinger famously noted that the fundamental idea of quantum superposition—an unmeasured system existing as pure potentiality until an observation occurs—closely mirrors Samkhya philosophy.',
    applications: ['Historical philosophical influences on early quantum pioneers (Schrödinger, Heisenberg, Bohr)', 'Philosophical analysis of the quantum measurement problem', 'Comparative cognitive models in quantum information science', 'Interdisciplinary curricula in Indian institutes of technology'],
    preset: 'bell',
    furtherReading: 'Kapila, Samkhya Pravachana Sutra; Schrödinger "My View of the World" (1964); Heisenberg "Physics and Philosophy" (1958)'
  },

  // ==========================================
  // 8. QUANTUM INFORMATION THEORY & CHANNELS
  // ==========================================
  {
    keys: ['von neumann entropy', 'entanglement entropy', 'quantum mutual information', 'subadditivity', 'purity entropy'],
    title: 'Von Neumann Entropy & Quantum Information Metrics',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'The quantum generalization of classical Shannon entropy. For a density operator ρ with spectral decomposition ρ = ∑ λ_i |i⟩⟨i|, the Von Neumann entropy is S(ρ) = -Tr(ρ log₂ ρ) = -∑ λ_i log₂ λ_i. It measures the fundamental quantum uncertainty, mixedness, and entanglement of a quantum state.',
    math: 'Von Neumann Entropy: S(ρ) = -Tr(ρ log₂ ρ) = -∑_i λ_i log₂ λ_i\nProperties:\n1. Non-negativity: S(ρ) ≥ 0, with S(ρ) = 0 ⟺ ρ is pure (|ψ⟩⟨ψ|)\n2. Invariance under unitaries: S(U ρ U†) = S(ρ)\n3. Maximum entropy: S(ρ) ≤ log₂(d) for Hilbert space dimension d\n4. Subadditivity: S(ρ_AB) ≤ S(ρ_A) + S(ρ_B)\n5. Strong Subadditivity (Lieb-Ruskai): S(ρ_ABC) + S(ρ_B) ≤ S(ρ_AB) + S(ρ_BC)\n\nQuantum Mutual Information: I(A : B) = S(ρ_A) + S(ρ_B) - S(ρ_AB) ≥ 0',
    intuition: 'In classical thermodynamics, entropy quantifies microscopic disorder or lack of knowledge. In quantum mechanics, a joint state |Ψ_AB⟩ can be 100% pure with zero entropy (S(AB) = 0), yet individual subsystems A and B can have maximal entropy (S(A) = 1) because all the information is stored entirely in non-local entanglement between them.',
    applications: ['Quantifying bipartite entanglement via entanglement entropy S(ρ_A)', 'Detecting quantum phase transitions in condensed matter spin chains', 'Black hole information paradox and holographic entanglement (Ryu-Takayanagi formula)', 'Bound on quantum communication and classical capacity of quantum channels'],
    preset: 'bell',
    furtherReading: 'Von Neumann (1932) "Mathematical Foundations of Quantum Mechanics"; Lieb & Ruskai (1973) J. Math. Phys. 14; Nielsen & Chuang Ch. 11'
  },
  {
    keys: ['quantum channel', 'kraus operators', 'cptp map', 'amplitude damping channel', 'depolarizing channel', 'stinespring'],
    title: 'Quantum Channels, CPTP Maps & Kraus Representation',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'The most general physical transformation of an open quantum system interacting with an environment. Mathematically formalized as a Completely Positive Trace-Preserving (CPTP) map E(ρ). By the Choi-Kraus theorem, any CPTP map can be decomposed into an ensemble of Kraus operators {K_k} satisfying the completeness condition ∑ K_k† K_k = I.',
    math: 'Operator-Sum (Kraus) Representation:\nE(ρ) = ∑_k K_k ρ K_k†,    where ∑_k K_k† K_k = I\n\nCanonical Noise Channels:\n1. Amplitude Damping (T₁ decay |1⟩ → |0⟩ with probability γ):\n   K₀ = [[1, 0], [0, √(1-γ)]],    K₁ = [[0, √γ], [0, 0]]\n2. Phase Damping (T₂ dephasing with rate λ):\n   K₀ = [[1, 0], [0, √(1-λ)]],    K₁ = [[0, 0], [0, √λ]]\n3. Depolarizing Channel (random Pauli error with rate p):\n   E(ρ) = (1 - p)ρ + (p/3)(XρX + YρY + ZρZ) = (1 - 4p/3)ρ + (4p/3)(I/2)\n\nStinespring Dilation: E(ρ) = Tr_E [ U (ρ ⊗ |0⟩⟨0|_E) U† ]',
    intuition: 'A closed quantum system evolves reversibly via unitary matrices (U U† = I). When a quantum computer connects to the warm outside world, energy leaks out and phase gets randomized. Kraus operators mathematically describe this leakage by treating the environment as an unseen ancilla that gets traced away.',
    applications: ['Modeling physical qubit noise on IBM Quantum, Google Sycamore, and AWS Braket', 'Open quantum system master equations (Lindbladian generators)', 'Quantum error mitigation: calibrating randomized benchmarking and tomography', 'Designing fault-tolerant thresholds for quantum repeaters and satellites'],
    preset: null,
    furtherReading: 'Kraus (1983) "States, Effects, and Operations"; Nielsen & Chuang Ch. 8; Preskill Notes Ch. 3'
  },
  {
    keys: ['holevo bound', 'quantum capacity', 'channel capacity', 'accessible information', 'holevo chi'],
    title: 'Holevo Bound, Accessible Information & Quantum Capacity',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'Formulated by Alexander Holevo in 1973: sets the fundamental upper limit on the amount of classical information that can be extracted from an ensemble of quantum states {p_x, ρ_x}. Despite a qubit living in an infinite-dimensional continuum of superpositions, Holevo proved that a single qubit can transmit at most ONE bit of classical information without prior entanglement.',
    math: 'Holevo Quantity (χ):\nχ = S( ∑_x p_x ρ_x ) - ∑_x p_x S(ρ_x)\n\nHolevo Theorem: For any POVM measurement {E_y}, the accessible classical information I(X : Y) satisfies:\nI(X : Y) ≤ χ( {p_x, ρ_x} ) ≤ S(ρ) ≤ n (for n qubits)\n\nQuantum Channel Capacity (LSD Theorem - Lloyd-Shor-Devetak):\nQ(N) = lim_{k→∞} (1/k) max_ρ I_c(ρ, N^⊗k)\nWhere I_c(ρ, N) = S(N(ρ)) - S((I ⊗ N)(|ψ⟩⟨ψ|)) is the coherent information.',
    intuition: 'Even though writing down the continuous probability amplitudes α and β of a qubit requires infinite classical decimals, the act of quantum measurement fundamentally collapses the wavefunction down to one binary choice (0 or 1). The Holevo bound guarantees you cannot hide a secret Encyclopedia Britannica inside one single photon.',
    applications: ['Fundamental security proofs in Quantum Key Distribution (QKD)', 'Channel capacity benchmarks for trans-oceanic quantum fiber networks', 'Communication complexity bounds in distributed quantum computing', 'Quantum data compression and Schumacher noiseless coding limits'],
    preset: null,
    furtherReading: 'Holevo (1973) Probl. Inf. Transm. 9; Schumacher & Westmoreland (1997) Phys. Rev. A 56; Devetak (2005) IEEE Trans. Inf. Theory 51'
  },
  {
    keys: ['zero noise extrapolation', 'zne', 'probabilistic error cancellation', 'pec', 'error mitigation', 'cdr'],
    title: 'Quantum Error Mitigation: ZNE, PEC & Clifford Data Regression',
    category: 'Quantum Information',
    arxiv: 'arXiv:2011.01382',
    definition: 'A class of algorithmic techniques that reduce computational errors on Noisy Intermediate-Scale Quantum (NISQ) processors WITHOUT the massive physical qubit overhead of full fault-tolerant quantum error correction. By intentionally scaling hardware noise or sampling inverted noise channels, expectation values are extrapolated back to the zero-noise limit.',
    math: '1. Zero-Noise Extrapolation (ZNE):\nScale noise factor λ ≥ 1 by pulse stretching or digital unitary folding (U ↦ U U† U).\nMeasure expectation value ⟨O(λ)⟩ at multiple noise levels {λ₁, λ₂, λ₃...}.\nExtrapolate to λ → 0 via Richardson polynomial or exponential fit:\n⟨O⟩_mitigated = ∑_i γ_i ⟨O(λ_i)⟩,    where ∑_i γ_i = 1,  ∑_i γ_i λ_i^k = 0\n\n2. Probabilistic Error Cancellation (PEC):\nExpress ideal noiseless gate U as quasi-probability distribution over noisy implementable operations:\nU = ∑_α q_α O_α,   where q_α ∈ ℝ (can be negative!),  γ = ∑ |q_α| ≥ 1\nSample operations with probability |q_α|/γ and weight measurement shots by sign(q_α)·γ.',
    intuition: "Fault-tolerant QEC requires 1,000 physical qubits for every 1 logical qubit. Error mitigation asks: \"What if we don't fix individual qubits during runtime, but instead run the experiment slightly dirtier, observe how the error curve behaves, and mathematically rewind the noise back to zero on our classical laptop?\"",
    applications: ['IBM 127-qubit Eagle utility experiment (Nature 2023) showing quantum advantage over brute-force classical simulation', 'Accurate molecular energy surfaces in VQE without logical qubits', 'Mitiq open-source quantum error mitigation library (Unitary Fund)', 'Extending usable circuit depth across commercial superconducting and ion QPUs'],
    preset: null,
    furtherReading: 'Temme, Bravyi, Gambetta (2017) Phys. Rev. Lett. 119; Endo et al. (2018) Phys. Rev. X 8; Kim et al. (2023) Nature 618'
  },

  // ==========================================
  // 9. ADVANCED ALGORITHMS & SIMULATION
  // ==========================================
  {
    keys: ['adiabatic quantum computing', 'aqc', 'adiabatic theorem', 'quantum annealing', 'ising model', 'd-wave'],
    title: 'Adiabatic Quantum Computation & Quantum Annealing',
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/0001106',
    definition: 'A continuous-time model of quantum computation proved by Aharonov et al. to be polynomially equivalent to standard circuit-model quantum computing. Based on the Adiabatic Theorem of quantum mechanics: a quantum system initialized in the simple ground state of an initial Hamiltonian H_0 remains in the instantaneous ground state of a slowly varying time-dependent Hamiltonian H(t) that terminates in a problem Hamiltonian H_P encoding the solution.',
    math: 'Time-Dependent Hamiltonian Interpolation:\nH(s) = (1 - s) H_0 + s H_P,    where s(t) = t / T ∈ [0, 1]\nInitial driver: H_0 = - ∑_i X_i  (Ground state is equal superposition |+⟩⊗ⁿ)\nProblem Hamiltonian: H_P = ∑_i h_i Z_i + ∑_{i<j} J_ij Z_i Z_j  (Ising spin glass)\n\nAdiabatic Condition (Landau-Zener):\nEvolution runtime T must scale inversely with minimum energy gap Δ_min squared:\nT ≫ ℏ · max |⟨1(s)| dH/ds |0(s)⟩| / Δ_min²\nIf Δ_min shrinks exponentially, computation requires exponential time (first-order quantum phase transition).',
    intuition: 'Instead of applying discrete logic gates, imagine gently tilting a rugged mountain landscape. You start with a simple bowl with one deep bottom (where all quantum states sit happily). Slowly reshape the bowl into a treacherous mountain range encoding an NP-hard problem. If you move slowly enough, quantum tunneling carries the system across energy barriers into the lowest global valley without getting stuck.',
    applications: ['D-Wave Advantage quantum annealers (5,000+ superconducting flux qubits)', 'Solving NP-hard quadratic unconstrained binary optimization (QUBO) problems', 'Portfolio optimization, flight routing, and vehicular traffic control in smart cities', 'Simulating frustrated magnetic materials and quantum spin glasses'],
    preset: null,
    furtherReading: 'Farhi et al. (2000) arXiv:quant-ph/0001106; Aharonov et al. (2007) SIAM J. Comput. 37; Albash & Lidar (2018) Rev. Mod. Phys. 90'
  },
  {
    keys: ['quantum chemistry simulation', 'hamiltonian simulation', 'jordan wigner', 'bravyi kitaev', 'second quantization', 'molecular orbitals'],
    title: 'Quantum Chemistry Simulation & Fermionic Mappings',
    category: 'Algorithms',
    arxiv: 'arXiv:1808.10402',
    definition: 'The simulation of interacting electrons in atoms, molecules, and solid-state materials on a quantum computer. Because electrons are fermions obeying the Pauli exclusion principle, their creation (a_i†) and annihilation (a_i) operators anti-commute: {a_i, a_j†} = δ_ij. Simulating them on qubit hardware requires mapping fermionic operators into qubit Pauli spin operators via the Jordan-Wigner or Bravyi-Kitaev transformations.',
    math: 'Electronic Hamiltonian in Second Quantization:\nH = ∑_{pq} h_pq a_p† a_q + ½ ∑_{pqrs} h_pqrs a_p† a_q† a_s a_r\n\n1. Jordan-Wigner Transformation (string of Z gates enforces anti-symmetry):\na_j† = ( ∏_{k < j} Z_k ) ⊗ ½ (X_j - i Y_j)\na_j  = ( ∏_{k < j} Z_k ) ⊗ ½ (X_j + i Y_j)\nNon-local: Fermionic operator on mode j produces Pauli string of weight O(N).\n\n2. Bravyi-Kitaev Transformation:\nEncodes occupancy and parity using a binary tree structure. Reduces Pauli operator weight from O(N) to O(log N), drastically reducing two-qubit gate counts in Trotter circuits.',
    intuition: 'Classical computers fail catastrophically when calculating large molecules because the electron wavefunction is anti-symmetric: swapping two identical electrons flips the mathematical sign. Storing the entangled states of just 50 electrons requires more classical RAM than all hard drives on planet Earth. Mapping fermionic orbitals directly to qubits lets quantum hardware simulate nature natively.',
    applications: ['Unraveling the reaction mechanism of nitrogenase FeMo-cofactor for carbon-neutral fertilizer', 'Designing high-energy density lithium-sulfur and solid-state battery electrolytes', 'Targeted small-molecule oncology drugs (modeling cytochrome P450 binding)', 'Simulating high-temperature cuprate and iron-based superconductors'],
    preset: null,
    furtherReading: 'Jordan & Wigner (1928) Z. Phys. 47; Bravyi & Kitaev (2002) Ann. Phys. 298; McArdle et al. (2020) Rev. Mod. Phys. 92'
  },
  {
    keys: ['trotter', 'trotterization', 'product formula', 'lie trotter suzuki', 'hamiltonian simulation', 'time evolution'],
    title: 'Hamiltonian Simulation & Trotter-Suzuki Decompositions',
    category: 'Algorithms',
    arxiv: 'arXiv:1912.08854',
    definition: 'Simulating the continuous real-time dynamics of a quantum system governed by Schrödinger\'s equation iℏ d|ψ⟩/dt = H|ψ⟩, with time evolution operator U(t) = exp(-iHt). When H = ∑ H_k is a sum of non-commuting terms ([H_j, H_k] ≠ 0), the matrix exponential cannot be factored directly. Product formulas (Lie-Trotter-Suzuki) decompose the evolution into discrete, interleaved gate layers with rigorously bounded approximation error.',
    math: '1. First-Order Lie-Trotter Formula:\nexp( -i (A + B) t ) = [ exp(-i A t/r) exp(-i B t/r) ]^r + E_trot\nError bound: ||E_trot|| ≤ (t² / 2r) ||[A, B]||\n\n2. Second-Order Symmetric Suzuki-Trotter Formula:\nS₂(t) = exp(-i A t/2) exp(-i B t) exp(-i A t/2)\nError bound: ||exp(-i(A+B)t) - [S₂(t/r)]^r|| ≤ (t³ / 12r²) ( ||[B, [B, A]]|| + ½ ||[A, [A, B]]|| )\n\nGate Complexity for simulation error ε:\nFirst-order: O(t² / ε) gates.   2k-th order Suzuki: O(t · (t/ε)^(1/2k)) gates.\nModern alternatives: Quantum Signal Processing (QSP) and Qubitization achieve optimal O(t + log(1/ε)) scaling.',
    intuition: 'If you want to bake a cake while frosting it simultaneously, you can\'t do both at the exact same second. Instead, you alternate tiny steps: bake for 5 seconds, frost for 5 seconds, and repeat 1,000 times. Trotterization alternates non-commuting quantum forces in ultra-short time slices so fast that the universe perceives them as evolving simultaneously.',
    applications: ['Real-time quantum dynamics of lattice gauge theories in high-energy physics', 'Simulating quench dynamics and thermalization in many-body spin systems', 'Compiling quantum phase estimation circuits for molecular energy estimation', 'Benchmarking digital quantum simulation fidelity on trapped ions and transmons'],
    preset: null,
    furtherReading: 'Lloyd (1996) Science 273; Suzuki (1991) J. Math. Phys. 32; Childs et al. (2021) PRX Quantum 2'
  },
  {
    keys: ['quantum admm', 'portfolio optimization', 'quantum finance', 'vqa', 'constrained optimization', 'penalty method'],
    title: 'Quantum Optimization & Variational Quantum Algorithms (VQA)',
    category: 'Algorithms',
    arxiv: 'arXiv:2012.09265',
    definition: 'The application of hybrid quantum-classical algorithms to solve non-convex, high-dimensional constrained optimization problems in finance, logistics, and machine learning. Frameworks include the Quantum Alternating Operator Ansatz (QAOA extension), Quantum ADMM (Alternating Direction Method of Multipliers) for splitting large industrial problems across quantum QPUs and classical HPC nodes, and QUBO mapping.',
    math: 'Markowitz Portfolio Optimization on QPU:\nObjective: min_w [ w^T Σ w - q · μ^T w ]   subject to ∑ w_i = K,  w_i ∈ {0, 1}\nWhere Σ is the asset covariance matrix, μ is expected returns, and q is risk tolerance.\n\nMapping to Qubit Ising Hamiltonian:\nH_portfolio = q ∑_i μ_i Z_i + ∑_{i<j} Σ_ij Z_i Z_j + λ ( ∑_i Z_i - (2K - N) I )²\nWhere λ is a quadratic penalty parameter enforcing the budget constraint.\n\nQuantum ADMM Pipeline:\nDecomposes large combinatorial graph into sub-problems solved locally via QAOA on QPUs, coordinating dual Lagrangian multipliers classically.',
    intuition: 'Wall Street banks spend millions of CPU hours calculating risk portfolios and arbitrage pricing under extreme regulatory constraints. Quantum optimization algorithms use quantum superposition and tunneling to explore trillions of combinatorial asset allocations simultaneously, bypassing classical combinatorial bottlenecks.',
    applications: ['JPMorgan Chase & Goldman Sachs quantum portfolio optimization and risk sensitivity analysis', 'Air traffic management and gate allocation at major international airports', 'Dynamic routing of autonomous delivery fleets and container ships', 'Smart electric grid power load balancing and frequency stabilization'],
    preset: null,
    furtherReading: 'Cerezo et al. (2021) Nat. Rev. Phys. 3; Egger et al. (2020) IEEE Trans. Quantum Eng. 1; Gambella et al. (2020) arXiv:2009.07314'
  },

  // ==========================================
  // 10. QUANTUM MANY-BODY PHYSICS & TENSORS
  // ==========================================
  {
    keys: ['tensor network', 'mps', 'matrix product state', 'dmrg', 'mera', 'peps', 'classical simulation quantum'],
    title: 'Tensor Networks: Matrix Product States (MPS) & DMRG',
    category: 'Many-Body Physics',
    arxiv: 'arXiv:1008.3477',
    definition: 'A powerful mathematical and computational framework that efficiently represents quantum many-body wavefunctions by decomposing high-rank 2ⁿ tensors into interconnected networks of low-rank tensors. Because physical ground states of local gapped Hamiltonians satisfy the 1D Entanglement Area Law (S_A ≤ const), they can be compressed exactly into Matrix Product States (MPS) and optimized via White\'s Density Matrix Renormalization Group (DMRG).',
    math: 'Matrix Product State (MPS) Representation of |ψ⟩:\n|ψ⟩ = ∑_{s₁, s₂, ... sₙ} Tr( A^{s₁} A^{s₂} ··· A^{sₙ} ) |s₁ s₂ ··· sₙ⟩\nWhere each A^{s_i} is a χ × χ matrix for physical index s_i ∈ {0, 1}.\nBond dimension χ bounds the maximum entanglement entropy: S_max = log₂(χ).\n\nArea Law of Entanglement (Hastings 2007):\nFor ground states of 1D local gapped Hamiltonians: S(ρ_A) ≤ c · ∂A = O(1)\nAllows classical simulation in polynomial time O(n · χ³), avoiding 2ⁿ exponential explosion!',
    intuition: 'The full quantum Hilbert space of 50 qubits is a monster containing 2⁵⁰ dimensions. But nature does not wander into random entangled corners of Hilbert space; physical ground states live in a tiny, quiet "physical corner" where entanglement only occurs between nearby neighbors. Tensor networks act like an intelligent MP3/JPEG compressor for quantum wavefunctions.',
    applications: ['Classical benchmarking and verification of quantum processors (e.g. simulating Sycamore with tensor networks)', 'Solving strongly correlated electronic systems (1D/2D Hubbard models at IISc/TIFR)', 'DMRG algorithm in quantum chemistry for active-space electronic structures', 'Simulating non-equilibrium quantum dynamics and many-body localization'],
    preset: null,
    furtherReading: 'White (1992) Phys. Rev. Lett. 69; Schollwöck (2011) Ann. Phys. 326; Orús (2014) Ann. Phys. 349'
  },
  {
    keys: ['topological phase', 'topological insulator', 'quantum spin liquid', 'tqft', 'chern number', 'berry phase'],
    title: 'Topological Phases of Matter & Quantum Spin Liquids',
    category: 'Many-Body Physics',
    arxiv: 'arXiv:1610.03911',
    definition: 'States of quantum matter that cannot be characterized by Landau\'s conventional symmetry-breaking paradigm, but instead possess non-local topological order, long-range quantum entanglement, and fractionalized excitations. Notable examples include Integer and Fractional Quantum Hall states, topological insulators, and Quantum Spin Liquids (QSL) where magnetic moments remain entangled and fluctuating down to absolute zero.',
    math: 'Berry Phase & Chern Number (Topological Invariant):\nBerry Connection: A(k) = i ⟨u(k)| ∇_k |u(k)⟩\nBerry Curvature: Ω(k) = ∇_k × A(k)\nFirst Chern Number C (quantized integer invariant):\nC = (1 / 2π) ∬_{BZ} Ω(k) d²k ∈ ℤ\n\nQuantized Hall Conductance (TKNN Invariant - Thouless et al. 1982):\nσ_xy = C · (e² / h)\n\nToric Code Ground State Degeneracy on Torus (Genus g):\nDegeneracy = 4^g (topologically protected: no local operator can distinguish the 4 ground states).',
    intuition: 'In conventional phases (like ice melting into water), atoms rearrange and break spatial symmetry. In a topological phase, you cannot tell the phase by looking through a local microscope. The information is woven into the global geometric topology of the entangled wavefunction, like the difference between a coffee mug (one hole) and a baseball (zero holes).',
    applications: ['Hardware platform for topological fault-tolerant qubits (Majorana nanowires, Kitaev honeycomb)', 'Exact metrological standards for electrical resistance (Von Klitzing constant R_K = h/e²)', 'Discovering room-temperature quantum anomalous Hall materials', 'Quantum simulation of frustrated lattices on neutral atom platforms (Harvard/QuEra)'],
    preset: null,
    furtherReading: 'Thouless et al. (1982) Phys. Rev. Lett. 49; Wen (1990) Int. J. Mod. Phys. B 4; Hasan & Kane (2010) Rev. Mod. Phys. 82'
  },
  {
    keys: ['quantum chaos', 'otoc', 'out-of-time-order correlator', 'information scrambling', 'black hole information', 'hayden preskill', 'syk model'],
    title: 'Quantum Chaos, OTOCs & Information Scrambling',
    category: 'Many-Body Physics',
    arxiv: 'arXiv:1503.01409',
    definition: 'The study of how local quantum information becomes rapidly and non-locally scrambled across all degrees of freedom of a strongly interacting many-body system. Quantified by Out-of-Time-Order Correlators (OTOCs), which measure the growth of operator commutators over time, exhibiting an exponential butterfly effect characterized by a quantum Lyapunov exponent λ_L bounded by the MSS bound: λ_L ≤ 2π k_B T / ℏ.',
    math: 'Out-of-Time-Order Correlator (OTOC):\nF(t) = ⟨ W†(t) V†(0) W(t) V(0) ⟩_β\nSquared Commutator:\nC(t) = ⟨ |[W(t), V(0)]|² ⟩_β = 2 ( 1 - Re[F(t)] )\n\nEarly-time exponential growth in chaotic systems:\nC(t) ∝ e^(λ_L t) / N\nMaldacena-Shenker-Stanford (MSS) Bound on Chaos (2016):\nλ_L ≤ (2π k_B T) / ℏ   (Saturated by black holes and the SYK model!)\n\nHayden-Preskill Protocol (2007):\nA black hole acts as an optimal quantum information scrambler; an eavesdropper with an entangled quantum computer can reconstruct a diary thrown into the black hole almost instantly from Hawking radiation.',
    intuition: 'Drop a drop of black ink into a glass of water: it diffuses until every single water molecule shares a microscopic fraction of ink. Scrambling is the quantum equivalent: if you inject one qubit of information into a chaotic quantum processor, entanglement quickly sweeps it across all qubits so completely that inspecting any 5 or 10 qubits reveals zero trace of what was written.',
    applications: ['Google Quantum AI & Harvard experiments measuring OTOCs on superconducting and Rydberg QPUs', 'Simulating holographic wormholes (AdS/CFT duality) and quantum gravity on quantum chips', 'Understanding thermalization and thermal relaxation in quantum microprocessors', 'Benchmarking the scrambling speed and multi-qubit entangling capacity of quantum hardware'],
    preset: null,
    furtherReading: 'Hayden & Preskill (2007) JHEP 09; Maldacena, Shenker, Stanford (2016) JHEP 08; Mi et al. (Google 2021) Science 374'
  },

  // ==========================================
  // 11. FRONTIER RESEARCH & QUANTUM HORIZONS
  // ==========================================
  {
    keys: ['bqp', 'qma', 'quantum complexity', 'quantum advantage', 'quantum supremacy', 'pp-complete', 'polynomial hierarchy'],
    title: 'Quantum Complexity Classes: BQP, QMA & Computational Limits',
    category: 'Frontier Research',
    arxiv: null,
    definition: 'The rigorous computational classification of what quantum computers can and cannot solve efficiently. BQP (Bounded-error Quantum Polynomial-time) is the class of decision problems solvable by a polynomial-time quantum computer with error probability ≤ 1/3. QMA (Quantum Merlin-Arthur) is the quantum analogue of NP, where an untrusted prover (Merlin) provides a quantum state witness |ψ⟩ that a quantum verifier (Arthur) verifies in polynomial time.',
    math: 'Complexity Inclusions:\nP ⊆ BPP ⊆ BQP ⊆ QMA ⊆ PP ⊆ PSPACE ⊆ EXP\n\nKey Theorems:\n1. Shor\'s Factoring ∈ BQP, but Factoring is NOT believed to be NP-complete.\n2. Kitaev\'s Local Hamiltonian Problem (finding ground energy of k-local Hamiltonian) is QMA-complete (Quantum analogue of Cook-Levin theorem for 3-SAT).\n3. BQP vs NP: It is widely conjectured that BQP does NOT contain NP (quantum computers cannot solve NP-complete problems in polynomial time without structure).\n4. Aaronson-Arkhipov Boson Sampling: Exact classical simulation of linear optics is #P-hard, implying BQP is strictly stronger than classical P under plausible complexity conjectures.',
    intuition: 'Popular media claims quantum computers will solve all hard math problems instantly. Complexity theory proves this is false: quantum computers excel specifically at problems with hidden mathematical symmetries (like periodicity in abelian groups for Shor). For generic unstructured NP-complete problems (like Traveling Salesman), Grover proves the speedup is only quadratic, not exponential.',
    applications: ['Guiding realistic quantum algorithm design (avoiding trying to solve NP-complete problems in polynomial time)', 'Proving quantum computational supremacy via Random Circuit Sampling (RCS)', 'Post-quantum cryptographic parameter selection (NIST PQC standards)', 'Foundational theoretical computer science at IIT Kanpur, TIFR, and IISc'],
    preset: null,
    furtherReading: 'Bernstein & Vazirani (1997) SIAM J. Comput. 26; Kitaev, Shen, Vyalyi (2002) "Classical and Quantum Computation"; Aaronson (2013) "Quantum Computing Since Democritus"'
  },
  {
    keys: ['quantum internet', 'quantum repeater', 'quantum memory', 'entanglement swapping', 'quantum network', 'purification'],
    title: 'Quantum Internet, Quantum Repeaters & Entanglement Swapping',
    category: 'Frontier Research',
    arxiv: 'arXiv:1903.04290',
    definition: 'A global network infrastructure designed to transmit quantum qubits, distribute high-fidelity entangled pairs, and link distributed quantum processors worldwide. Because quantum signals cannot be amplified classically due to the no-cloning theorem, long-distance optical fiber links (attenuation ~0.2 dB/km) require Quantum Repeaters using atomic quantum memories, entanglement swapping, and entanglement distillation.',
    math: '1. Entanglement Swapping Protocol:\nAlice & Repeater 1 share Bell pair |Φ⁺⟩_AR₁.\nRepeater 2 & Bob share Bell pair |Φ⁺⟩_R₂B.\nRepeater station performs joint Bell-State Measurement (BSM) on qubits R₁ and R₂.\nInstantaneously, Alice and Bob\'s previously unentangled and distant qubits become entangled:\n|ψ⟩_AB = |Φ⁺⟩_AB (conditioned on classical BSM outcome)!\n\n2. Fiber Attenuation Scaling:\nDirect transmission probability across distance L: P_direct ∝ 10^(-α L / 10)\nFor L = 1000 km in fiber, P_direct ~ 10⁻²⁰ (1 photon every 300 years!).\nWith N repeater segments of length L_0 = L/N: Rate scales polynomially: R ∝ (c / L_0) · η^N.',
    intuition: 'Classical internet uses repeaters that read incoming electrical pulses, amplify them, and spit them out. In quantum mechanics, the no-cloning theorem makes classical amplification impossible. Instead, quantum repeaters create entanglement across short hops, then "stitch" the entanglement together across thousands of kilometers using teleportation and swapping.',
    applications: ['Distributed cloud quantum computing (linking multiple 1,000-qubit QPUs into a planetary supercomputer)', 'Unconditionally secure global banking and military communications (QKD)', 'Telescope baseline interferometry: combining optical telescopes across continents for ultra-high resolution imaging', 'India National Quantum Mission (NQM) 1,000 km quantum backbone roadmap'],
    preset: 'teleport',
    furtherReading: 'Briegel et al. (1998) Phys. Rev. Lett. 81; Kimble (2008) Nature 453; Wehner et al. (2018) Science 362'
  },
  {
    keys: ['quantum metrology', 'heisenberg limit', 'quantum sensing', 'quantum fisher information', 'standard quantum limit', 'shot noise'],
    title: 'Quantum Metrology, Sensing & The Heisenberg Limit',
    category: 'Frontier Research',
    arxiv: 'arXiv:1103.4871',
    definition: 'The science of using quantum phenomena (superposition, squeezed states, and multiparticle entanglement) to perform physical measurements of magnetic fields, gravitational waves, time, and acceleration with precision surpassing the Standard Quantum Limit (SQL). While classical sensors with N probes are bounded by shot noise (Δθ ∝ 1/√N), entangled states achieve the ultimate Heisenberg Limit (Δθ ∝ 1/N).',
    math: '1. Standard Quantum Limit (SQL - Unentangled Probes):\nFor N independent particles, Central Limit Theorem gives shot noise:\nΔθ_SQL = 1 / √N\n\n2. Heisenberg Limit (Entangled States, e.g. NOON states (|N,0⟩ + |0,N⟩)/√2):\nPhase evolution: |ψ(θ)⟩ = ( |N,0⟩ + e^(i N θ) |0,N⟩ ) / √2\nPhase sensitivity achieves fundamental quantum limit:\nΔθ_HL = 1 / N   (Quadratic precision enhancement over classical!)\n\nQuantum Fisher Information (QFI) & Quantum Cramér-Rao Bound:\n(Δθ)² ≥ 1 / ( M · F_Q[ρ, H] )\nWhere F_Q is the Quantum Fisher Information and M is number of experimental trials.',
    intuition: 'Imagine 100 soldiers tossing a coin to measure a subtle wind: the error decreases slowly like 1/√100 = 10%. But if all 100 soldiers hold hands in an entangled GHZ state, their individual phase rotations add up collectively, shrinking measurement error by a factor of 100×.',
    applications: ['LIGO gravitational wave detectors using squeezed light injected into vacuum interferometers', 'Nitrogen-Vacancy (NV) diamond centers for nanoscale magnetic resonance imaging of single living cells', 'Ultra-precise optical atomic clocks (Strontium optical lattice clocks losing 1 second in 30 billion years)', 'GPS-denied quantum inertial navigation and gravimeters for defense and subterranean mineral mapping'],
    preset: null,
    furtherReading: 'Giovannetti, Lloyd, Maccone (2004) Science 306; Caves (1981) Phys. Rev. D 23; Degen et al. (2017) Rev. Mod. Phys. 89'
  },
  {
    keys: ['quantum thermodynamics', 'landauer principle', 'maxwell demon', 'quantum heat engine', 'work extraction', 'flucutation theorem'],
    title: 'Quantum Thermodynamics, Landauer’s Limit & Heat Engines',
    category: 'Frontier Research',
    arxiv: 'arXiv:1507.00999',
    definition: 'The extension of classical thermodynamics to the quantum regime where fluctuations are quantum coherent and system sizes approach single atoms. Investigates the energetic cost of quantum information processing, Landauer\'s principle in quantum registers, quantum heat engines operating via coherent superpositions, and the relationship between entropy production and entanglement.',
    math: '1. Quantum Landauer Principle:\nErasing 1 bit of information in an environment at temperature T requires minimum heat dissipation:\nΔQ ≥ k_B T ln(2)\nAt room temperature (300 K): E_min ≈ 2.87 × 10⁻²¹ Joules / bit.\nIn quantum systems with entanglement, information erasure can extract net heat from the bath (negative dissipation) if quantum mutual information is consumed.\n\n2. Quantum Otto Cycle Efficiency:\nEfficiency of a quantum Otto engine with frequency compression ratio r = ω_cold / ω_hot:\nη = 1 - (ω_cold / ω_hot) ≤ η_Carnot = 1 - (T_cold / T_hot)\nQuantum coherence in the working substance can transiently boost power output beyond classical stochastic limits.',
    intuition: 'Information is not an abstract mathematical ghost—information is physical (Rolf Landauer). Erasing a bit of memory on your computer physically dumps heat into the universe. In a quantum processor, understanding heat dissipation at the single-microwave-photon level is what determines whether cryogenic dilution refrigerators can cool down thousands of superconducting qubits without boiling.',
    applications: ['Thermal budgeting and heat dissipation in ultra-dense cryo-CMOS quantum control chips', 'Single-ion and NV-center experimental quantum heat engines and micro-refrigerators', 'Thermodynamic efficiency bounds on quantum error correction and syndrome measurements', 'Fundamental physics testing the arrow of time and microscopic irreversibility'],
    preset: null,
    furtherReading: 'Landauer (1961) IBM J. Res. Dev. 5; Goold et al. (2016) J. Phys. A 49; Vinjanampathy & Anders (2016) Contemp. Phys. 57'
  },

  // ==========================================
  // ALGORITHMS — EXTENDED
  // ==========================================
  {
    keys: ['hhl', 'quantum linear systems', 'harrow hassidim lloyd', 'linear equations quantum'],
    title: 'HHL Algorithm — Quantum Linear Systems',
    category: 'Algorithms',
    arxiv: 'arXiv:0811.3171',
    definition: 'The Harrow-Hassidim-Lloyd (HHL) algorithm solves the linear system Ax = b for a sparse N×N Hermitian matrix A in O(log N · poly(κ, 1/ε)) time, achieving an exponential speedup over the best classical O(N·κ) methods, where κ is the condition number and ε is precision. The output is a quantum state |x⟩ proportional to the solution vector.',
    math: 'Problem: Given A|x⟩ = |b⟩, find |x⟩ = A⁻¹|b⟩\n\nSteps:\n1. Encode |b⟩ into a quantum state\n2. Quantum Phase Estimation on A to get eigenvalues λⱼ\n3. Controlled rotation: |λⱼ⟩|b⟩ → |λⱼ⟩(√(1 - C²/λⱼ²)|0⟩ + (C/λⱼ)|1⟩)|b⟩\n4. Uncompute Phase Estimation\n5. Post-select on ancilla = |1⟩\n\nComplexity: O(log(N) · κ² / ε) vs classical O(N · κ)\nCondition: A must be s-sparse and efficiently row-computable',
    intuition: 'HHL is like a quantum trick that inverts a huge matrix in log(N) steps instead of N steps. The catch: the output is a quantum state |x⟩, not classical numbers — so you can only efficiently extract certain properties of the solution, not all entries.',
    applications: ['Quantum machine learning (least-squares fitting, SVM, recommendation systems)', 'Portfolio optimization in quantitative finance', 'Solving differential equations on quantum hardware', 'Computational fluid dynamics and FEM simulations'],
    preset: null,
    furtherReading: 'Harrow, Hassidim, Lloyd (2009) arXiv:0811.3171; Childs et al. (2017) SIAM J. Comput.'
  },
  {
    keys: ['qaoa', 'quantum approximate optimization', 'farhi goldstone gutmann', 'variational optimization', 'max-cut'],
    title: 'QAOA — Quantum Approximate Optimization Algorithm',
    category: 'Variational Algorithms',
    arxiv: 'arXiv:1411.4028',
    definition: 'QAOA is a hybrid quantum-classical variational algorithm for combinatorial optimization, introduced by Farhi, Goldstone & Gutmann (2014). It prepares a parameterized quantum state |γ,β⟩ using p layers of alternating problem Hamiltonian U(C,γ) and mixing Hamiltonian U(B,β) operators, then classically optimizes parameters to maximize the expected cost ⟨C⟩.',
    math: '|γ,β⟩ = U(B,βₚ) U(C,γₚ) ··· U(B,β₁) U(C,γ₁) |+⟩ⁿ\n\nWhere:\n  U(C,γ) = e^{-iγC} = ∏ e^{-iγCⱼ}   (Problem phase unitary)\n  U(B,β) = e^{-iβB} = ∏ e^{-iβXⱼ}   (Mixing unitary = Hadamard-like)\n  |+⟩ⁿ = H⊗ⁿ|0⟩ⁿ                     (Uniform superposition start)\n\nObjective: maximize F(γ,β) = ⟨γ,β|C|γ,β⟩\nFor p=1: provably achieves ≥ 0.6924 × OPT for MAX-CUT on 3-regular graphs',
    intuition: 'Think of QAOA as teaching a quantum computer to solve puzzles by trial and error. The quantum state explores many solutions simultaneously, and a classical optimizer adjusts the "angles" (γ, β) to steer the quantum interference toward better answers.',
    applications: ['MAX-CUT and graph partitioning problems', 'Portfolio optimization and scheduling', 'Satisfiability (3-SAT, MAX-3SAT) problems', 'Traffic flow optimization and logistics routing'],
    preset: null,
    furtherReading: 'Farhi, Goldstone, Gutmann (2014) arXiv:1411.4028; Hadfield et al. (2019) Algorithms 12(2)'
  },
  {
    keys: ['bernstein vazirani', 'bernstein-vazirani', 'hidden linear function', 'bv algorithm'],
    title: 'Bernstein-Vazirani Algorithm',
    category: 'Algorithms',
    arxiv: null,
    definition: 'The Bernstein-Vazirani algorithm finds a hidden n-bit string s in a single query to an oracle f(x) = s·x (mod 2), compared to n classical queries. It demonstrates exponential quantum advantage in query complexity for this specific problem and is a conceptual stepping stone to Simon\'s algorithm and Shor\'s factoring.',
    math: 'Problem: Find s ∈ {0,1}ⁿ given oracle O_f: |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩\n          where f(x) = s · x (mod 2) = s₀x₀ ⊕ s₁x₁ ⊕ ··· ⊕ sₙ₋₁xₙ₋₁\n\nCircuit:\n1. Prepare: H⊗ⁿ|0⟩ⁿ ⊗ H|1⟩  → |+⟩ⁿ ⊗ |−⟩\n2. Apply oracle O_f\n3. Apply H⊗ⁿ to first n qubits\n4. Measure → result is s exactly!\n\nClassical: n queries required\nQuantum: 1 query sufficient',
    intuition: 'Imagine a lock with n tumblers where each tumbler responds to one bit of the secret key. Classically you must poke each tumbler one by one (n steps). Quantum parallelism lets you try ALL combinations simultaneously and read the whole secret from a single interference pattern.',
    applications: ['Demonstrating quantum oracle advantage', 'Building block for Simon\'s and Shor\'s algorithms', 'Quantum cryptanalysis of linear Boolean functions', 'Testing quantum processor gate fidelity (simple benchmark circuit)'],
    preset: 'superposition',
    furtherReading: 'Bernstein & Vazirani (1997) SIAM J. Comput. 26(5); Nielsen & Chuang Ch. 1.4'
  },
  {
    keys: ['simon algorithm', "simon's problem", 'hidden period', 'quantum period finding'],
    title: "Simon's Algorithm — Hidden Subgroup & Period Finding",
    category: 'Algorithms',
    arxiv: null,
    definition: "Simon's algorithm solves the hidden subgroup problem for the group Z₂ⁿ with exponential quantum speedup. Given f: {0,1}ⁿ → {0,1}ⁿ with f(x) = f(y) iff y = x⊕s for some hidden string s, Simon's algorithm finds s using O(n) quantum queries vs exponentially many classical queries. It directly inspired Shor's algorithm.",
    math: "Steps:\n1. Start: |0⟩ⁿ|0⟩ⁿ\n2. Apply H⊗ⁿ to first register: (1/√2ⁿ)∑_x |x⟩|0⟩\n3. Apply U_f: (1/√2ⁿ)∑_x |x⟩|f(x)⟩\n4. Measure second register — collapse first to |x₀⟩ + |x₀⊕s⟩\n5. Apply H⊗ⁿ: state is uniform on {y : y·s = 0 mod 2}\n6. Measure → get y with y·s = 0\nRepeat n times, solve linear system → find s\n\nComplexity: O(n) quantum queries\nClassical lower bound: Ω(2^{n/2}) queries",
    intuition: "Simon's problem is like finding a hidden symmetry in a function. The quantum computer creates a superposition that automatically 'resonates' with that symmetry, and repeated measurements reveal constraints on the secret string s from which we solve a classical linear algebra problem.",
    applications: ['Direct conceptual precursor to Shor\'s factoring algorithm', 'Hidden subgroup problem framework for quantum speedups', 'Quantum cryptanalysis of certain symmetric ciphers', 'Theoretical complexity theory (BQP vs BPP separation'],
    preset: null,
    furtherReading: "Simon (1997) SIAM J. Comput. 26(5); Lomonaco & Kauffman (2000) SPIE 4047"
  },
  {
    keys: ['amplitude amplification', 'amplitude estimation', 'quantum amplitude', 'qaa'],
    title: 'Amplitude Amplification & Amplitude Estimation',
    category: 'Algorithms',
    arxiv: 'arXiv:quant-ph/0005055',
    definition: 'Amplitude Amplification (AA) is a generalization of Grover\'s algorithm that amplifies the probability amplitude of a marked subset of quantum states using the Grover diffusion operator. Amplitude Estimation (AE) uses Quantum Phase Estimation on the Grover iterate G = -A S₀ A† S_χ to estimate the amplitude α = sin(θ) to precision O(1/M) using M oracle queries.',
    math: 'Let A|0⟩ = √(1-a)|Ψ_bad⟩ + √a|Ψ_good⟩ for unknown amplitude √a\n\nGrover iterate: G = -A S₀ A† S_χ\n  S₀: reflection about |0⟩  (S₀ = I - 2|0⟩⟨0|)\n  S_χ: reflection about good states (S_χ = I - 2|Ψ_good⟩⟨Ψ_good|)\n\nAfter k iterations: amplitude of good state = sin((2k+1)θ)\n  where θ = arcsin(√a)\n\nAmplitude Estimation:\n  |ã⟩ = a ± O(√(a(1-a))/M + 1/M²)\n  Uses m ancilla qubits → precision 2π/2^m',
    intuition: 'If you are searching for a needle in a haystack with 1-in-N probability, classical search needs ~N tries. Amplitude Amplification rotates the quantum state toward the solution quadratically faster: just √N oracle calls.',
    applications: ['Monte Carlo financial option pricing with quantum speedup', 'Quantum counting (how many solutions exist?)', 'Subroutine in HHL, quantum walks, and many quantum algorithms', 'Risk analysis and derivative pricing on quantum hardware'],
    preset: null,
    furtherReading: 'Brassard, Høyer, Mosca, Tapp (2002) AMS Contemp. Math. 305; arXiv:quant-ph/0005055'
  },

  // ==========================================
  // QUANTUM HARDWARE — EXTENDED
  // ==========================================
  {
    keys: ['ion trap', 'trapped ion', 'ion qubit', 'hyperfine', 'motional mode', 'laser cooling'],
    title: 'Trapped-Ion Quantum Computing',
    category: 'Hardware',
    arxiv: null,
    definition: 'Trapped-ion quantum computers encode qubits in long-lived internal electronic states (hyperfine or optical) of laser-cooled atomic ions confined in electromagnetic Paul or Penning traps. Two-qubit gates (Mølmer-Sørensen, Cirac-Zoller) are mediated via shared motional (phonon) modes, enabling all-to-all qubit connectivity with gate fidelities exceeding 99.9%.',
    math: 'Qubit states: |0⟩ = |↓⟩ (ground), |1⟩ = |↑⟩ (excited hyperfine)\nTransition frequency: ω_hf ~ 12.6 GHz (¹³³Cs) or ~1.25 GHz (⁹Be⁺)\n\nMølmer-Sørensen gate (XX interaction):\n  U_MS = exp(-i π/4 · σx⊗σx) achieves entangled Bell pair\n  Implemented via bichromatic laser fields with detuning δ from motional modes\n\nGate fidelities (2024 state-of-art):\n  Single-qubit: 99.999%+\n  Two-qubit (MS gate): 99.9%+\n  Measurement: 99.9%+\nCoherence times: T₂ > 10 minutes (optical clock qubits)',
    intuition: 'Imagine atoms floating in space held by invisible electromagnetic springs, cooled to near absolute zero by laser beams. Their quantum states are extraordinarily stable because they\'re shielded from environmental noise. Two-qubit gates work by gently shaking one ion and letting the vibration propagate to its neighbor through the shared crystal structure.',
    applications: ['IonQ, Quantinuum (H-series), Oxford Ionics commercial platforms', 'Quantum simulation of molecular energy spectra (chemistry)', 'Quantum error correction demonstrations (Quantinuum 2023)', 'Quantum networking over fiber with photon-mediated entanglement'],
    preset: null,
    furtherReading: 'Cirac & Zoller (1995) Phys. Rev. Lett. 74; Bruzewicz et al. (2019) Appl. Phys. Rev. 6'
  },
  {
    keys: ['photonic quantum', 'photon qubit', 'linear optical', 'boson sampling', 'beam splitter', 'knill laflamme milburn'],
    title: 'Photonic Quantum Computing',
    category: 'Hardware',
    arxiv: null,
    definition: 'Photonic quantum computers use individual photons as qubits, encoded in polarization (H/V), path, time-bin, or continuous-variable quadratures. Linear optical elements (beam splitters, phase shifters) perform single-qubit gates. Two-qubit gates require either measurement-induced nonlinearity (KLM scheme), nonlinear media (e.g., EIT), or Gaussian boson sampling.',
    math: 'Beam splitter unitary (50:50):\n  U_BS = (1/√2) [[1, i], [i, 1]]\n  Transforms: a†_in → (a†_1 + i·a†_2)/√2\n\nKLM (Knill-Laflamme-Milburn) scheme:\n  Probabilistic nonlinear sign gate: success prob = 1/4 per attempt\n  With teleportation boosting → scalable universal QC in principle\n\nGaussian Boson Sampling (Xanadu):\n  Input: squeezed vacuum states |r⟩\n  Circuit: random Haar-random interferometer\n  Output: click pattern from photon-number-resolving detectors\n  Sampling hard for classical computers (permanent of complex matrix)',
    intuition: 'Photons are the ideal qubit — they travel at the speed of light, don\'t interact with their environment (no decoherence from heat), and can be entangled over long distances. The challenge: making two photons interact with each other is very hard, requiring clever tricks or probabilistic gates.',
    applications: ['Xanadu (PsiQuantum) integrated photonic chips', 'Quantum key distribution over optical fiber', 'Boson sampling demonstration of quantum computational advantage (USTC 2020)', 'Quantum networks and long-distance quantum internet'],
    preset: null,
    furtherReading: 'Knill, Laflamme, Milburn (2001) Nature 409; Zhong et al. (2020) Science 370'
  },
  {
    keys: ['neutral atom', 'rydberg atom', 'optical tweezer', 'atom array', 'rydberg blockade'],
    title: 'Neutral Atom Quantum Computing (Rydberg Arrays)',
    category: 'Hardware',
    arxiv: null,
    definition: 'Neutral atom quantum computers trap individual atoms in arrays of optical tweezers (focused laser beams). Qubits are encoded in ground-state hyperfine levels. Two-qubit gates exploit the Rydberg blockade: when one atom is excited to a high-n Rydberg state, a nearby atom is blockaded from excitation due to strong dipole-dipole interactions (range ~10 μm).',
    math: 'Rydberg interaction energy:\n  V_dd = C₆ / R⁶   (van der Waals, dominant at large R)\n  V_dd = C₃ / R³   (dipole-dipole, resonant states)\n  For Rb Rydberg n=70: C₆ ≈ 860 GHz·μm⁶\n\nRydberg blockade condition: V_dd >> Ω_Rabi\n  Ensures only one atom excited at a time within blockade radius r_b\n  r_b = (C₆/Ω)^{1/6} ≈ 5-10 μm\n\nCZ gate via blockade:\n1. Rydberg π-pulse on control qubit (|1⟩ → |r⟩)\n2. 2π-pulse on target: blocked if control in |r⟩\n3. π-pulse returns control: |r⟩ → |1⟩\nResult: CZ gate with fidelity >99.5% (2023)',
    intuition: 'Each atom sits in its own laser spotlight. When you excite one atom to a giant "Rydberg" state, it creates a force field that prevents any nearby atom from also being excited — the Rydberg blockade. This blockade is the two-qubit gate: one atom controls whether another can flip.',
    applications: ['QuEra, Pasqal, Atom Computing commercial platforms', 'Quantum simulation of lattice gauge theories', 'Fault-tolerant logical qubit demonstrations (Harvard/MIT 2023)', '2D programmable quantum processors with >1000 physical qubits'],
    preset: null,
    furtherReading: 'Jaksch et al. (2000) Phys. Rev. Lett. 85; Saffman et al. (2010) Rev. Mod. Phys. 82'
  },
  {
    keys: ['topological qubit', 'majorana fermion', 'topological quantum computation', 'anyons', 'non-abelian'],
    title: 'Topological Quantum Computing & Majorana Fermions',
    category: 'Hardware',
    arxiv: 'arXiv:quant-ph/0306164',
    definition: 'Topological quantum computing encodes quantum information in non-local topological degrees of freedom of anyonic quasiparticles, making the information inherently immune to local perturbations. Non-Abelian anyons (e.g., Majorana zero modes in topological superconductors) implement quantum gates by braiding world-lines, enabling intrinsically fault-tolerant computation.',
    math: 'Majorana operators γᵢ satisfy: {γᵢ, γⱼ} = 2δᵢⱼ, γᵢ = γᵢ†\nFermionic qubit from pair (γ₁, γ₂): n = ½(1 + iγ₁γ₂) ∈ {0,1}\n\nBraiding matrix for non-Abelian anyons σᵢ:\n  σᵢ σᵢ₊₁ σᵢ = σᵢ₊₁ σᵢ σᵢ₊₁  (Yang-Baxter braid relation)\n  σᵢ acts on computational space as a unitary matrix\n\nFor Fibonacci anyons: braiding is computationally universal\nFor Ising anyons (Majorana): Clifford gates by braiding alone\n(T gate requires additional magic state distillation)\n\nTopological protection: gap Δ protects ground state\n  Error rate: e^{-Δ/T} (exponentially suppressed at T << Δ)',
    intuition: 'Imagine writing information not on a single point, but woven into the global fabric of a material — like a knot in a rope. No local disturbance can "unknot" the information without acting on the entire system. This topological protection is the holy grail of quantum error correction.',
    applications: ['Microsoft\'s quantum computing roadmap (topological qubits)', 'Intrinsically fault-tolerant logical qubits', 'Quantum simulation of topological phases of matter', 'Condensed matter physics: quantum spin liquids, fractional quantum Hall'],
    preset: null,
    furtherReading: 'Kitaev (2003) Ann. Phys. 303; Nayak et al. (2008) Rev. Mod. Phys. 80'
  },
  {
    keys: ['josephson junction', 'cooper pair', 'superconducting qubit physics', 'transmon circuit qed'],
    title: 'Josephson Junctions & Superconducting Qubit Physics',
    category: 'Hardware',
    arxiv: null,
    definition: 'Superconducting qubits are macroscopic quantum circuits built from Josephson junctions — thin insulating barriers between two superconductors across which Cooper pairs tunnel coherently. The nonlinear inductance of the junction creates an anharmonic oscillator whose lowest two energy levels form the qubit. The transmon, charge qubit, and flux qubit are all variants of this architecture.',
    math: 'Josephson junction equations:\n  I = Ic sin(φ)              (Josephson current)\n  V = (Φ₀/2π) dφ/dt        (Josephson voltage, Φ₀ = h/2e)\n\nTransmon Hamiltonian:\n  H = 4Ec(n - ng)² - Ej cos(φ)\n  Ec = e²/2C (charging energy), Ej = Ic·Φ₀/2π (Josephson energy)\n  Operating regime: Ej/Ec >> 1 → insensitive to charge noise\n\nQubit frequency: ωq ≈ √(8EcEj) - Ec\nAnharmonicity: α = E12 - E01 ≈ -Ec\n  Typical: ωq/2π ~ 5 GHz, α/2π ~ -300 MHz\nT1 (energy relaxation): 10 - 500 μs (state of art)\nT2 (dephasing): 1 - 300 μs',
    intuition: 'A Josephson junction is a quantum switch the size of a few nanometers. When cooled to 15 millikelvin (colder than outer space), it becomes a tiny quantum harmonic oscillator, but one with unequal energy level spacings — that anharmonicity is what makes it a qubit rather than a boring oscillator.',
    applications: ['IBM Quantum (Eagle, Osprey, Condor processors), Google Sycamore, Rigetti', 'Circuit QED architecture for qubit-microwave photon coupling', 'Quantum error correction with surface code on superconducting grids', 'Quantum sensing: SQUID magnetometers for brain imaging (MEG)'],
    preset: null,
    furtherReading: 'Koch et al. (2007) Phys. Rev. A 76 (transmon); Krantz et al. (2019) Appl. Phys. Rev. 6'
  },

  // ==========================================
  // QUANTUM ERROR CORRECTION — EXTENDED
  // ==========================================
  {
    keys: ['surface code', 'toric code', 'planar code', 'topological error correction', 'syndrome measurement'],
    title: 'Surface Code — Leading Fault-Tolerant Architecture',
    category: 'Error Correction',
    arxiv: 'arXiv:quant-ph/9811052',
    definition: 'The surface code (Kitaev 1997, Fowler et al. 2012) is a 2D topological quantum error correcting code defined on an L×L lattice of physical qubits. Logical qubits are encoded in the ground space of a local stabilizer Hamiltonian with vertex (X-type) and plaquette (Z-type) stabilizers. It has the highest known fault-tolerant threshold (~1%) and requires only nearest-neighbor gates, making it the leading architecture for large-scale quantum computers.',
    math: 'Code parameters: [[L², (L-1)², d=L]]\n  n = L² physical qubits (data)\n  n-1 = (L-1)² ancilla qubits (syndrome)\n  Logical distance d = L (minimum weight logical operator)\n\nStabilizer generators:\n  A_v = ∏_{e∋v} σx_e   (vertex/star operators)\n  B_p = ∏_{e∈∂p} σz_e  (plaquette operators)\n  All commute: [A_v, B_p] = 0 ✓\n\nLogical operators:\n  X̄ = string of X across the lattice (left to right)\n  Z̄ = string of Z across the lattice (top to bottom)\n\nFault-tolerance threshold: p_th ≈ 0.7-1% (depolarizing noise)\nLogical error rate: p_L ≈ (p/p_th)^{(d+1)/2}  (exponential suppression)',
    intuition: 'Imagine a checkerboard where every square and every corner is measured to detect errors. If a physical qubit flips, it shows up as two highlighted squares sharing that qubit. You can identify and fix errors as long as they don\'t form a chain stretching all the way across the board.',
    applications: ['Google, IBM, Microsoft long-term fault-tolerant roadmaps', 'Logical qubit demonstrations on superconducting and trapped-ion hardware', 'Magic state distillation factories on surface code patches', 'Threshold theorem proof backbone for large-scale QC viability'],
    preset: null,
    furtherReading: 'Fowler, Martinis et al. (2012) Phys. Rev. A 86; Kitaev (2003) Ann. Phys.'
  },
  {
    keys: ['shor code', 'shor 9 qubit', '9-qubit code', 'quantum error correction code shor'],
    title: "Shor's 9-Qubit Error Correction Code",
    category: 'Error Correction',
    arxiv: null,
    definition: "Peter Shor's 9-qubit code (1995) was the first quantum error correcting code, demonstrating that quantum information can be protected against arbitrary single-qubit errors. It concatenates a phase-flip code (|0⟩_L = |+++⟩, |1⟩_L = |---⟩) with a bit-flip code using 3 qubits each, resulting in [[9,1,3]] encoding that corrects any single-qubit error.",
    math: '|0⟩_L = (1/2√2)(|000⟩ + |111⟩)⊗³\n|1⟩_L = (1/2√2)(|000⟩ - |111⟩)⊗³\n\nCode parameters: [[9, 1, 3]]\n  n=9 physical qubits, k=1 logical qubit, distance d=3\n  Corrects any 1 of 3 error types on 1 qubit:\n    - Bit flip (X error): detected by Z₁Z₂, Z₂Z₃ in each triplet\n    - Phase flip (Z error): detected by X₁X₂X₃X₄X₅X₆ and similar\n    - Combined Y error: caught by both\n\n8 stabilizer generators: Z₁Z₂, Z₂Z₃, Z₄Z₅, Z₅Z₆, Z₇Z₈, Z₈Z₉,\n  X₁X₂X₃X₄X₅X₆, X₄X₅X₆X₇X₈X₉',
    intuition: "Shor's code is like storing information with triple redundancy in two orthogonal ways simultaneously. Three copies protect against bit-flips, and three copies of those triplets encoded with X gates protect against phase-flips. Any single error in the system leaves a detectable signature that uniquely identifies the error without revealing the logical information.",
    applications: ['First proof-of-principle quantum error correction experiment', 'Pedagogical foundation for all CSS (Calderbank-Shor-Steane) codes', 'Blueprint for concatenated quantum codes', 'Experimental demonstrations on IBM Q (Ofek et al. 2016)'],
    preset: null,
    furtherReading: "Shor (1995) Phys. Rev. A 52; Nielsen & Chuang Ch. 10.1"
  },
  {
    keys: ['steane code', 'steane 7 qubit', '7-qubit code', 'css code calderbank shor steane'],
    title: "Steane 7-Qubit Code & CSS Codes",
    category: 'Error Correction',
    arxiv: null,
    definition: 'The Steane [[7,1,3]] code (1996) encodes 1 logical qubit into 7 physical qubits using the classical Hamming [7,4,3] code for both X and Z stabilizers (CSS construction). It is the smallest CSS code with transversal CNOT, Hadamard (H), and phase (S) gates, enabling fault-tolerant Clifford operations without magic state distillation.',
    math: 'Code parameters: [[7, 1, 3]] — corrects any single-qubit error\n\nX-stabilizers (from Hamming H-matrix):\n  g₁ = X₄X₅X₆X₇\n  g₂ = X₂X₃X₆X₇\n  g₃ = X₁X₃X₅X₇\n\nZ-stabilizers (same pattern):\n  g₄ = Z₄Z₅Z₆Z₇,  g₅ = Z₂Z₃Z₆Z₇,  g₆ = Z₁Z₃Z₅Z₇\n\nLogical operators:\n  X̄ = X₁X₂X₃X₄X₅X₆X₇  (weight 7)\n  Z̄ = Z₁Z₂Z₃Z₄Z₅Z₆Z₇  (weight 7)\n\nTransversal gates: H̄ = H⊗⁷, CNOT̄ = CNOT⊗⁷, S̄ = S⊗⁷ (Clifford complete)',
    intuition: 'The Steane code cleverly uses the same parity-check structure for both X and Z errors, inheriting the beautiful symmetry of classical Hamming codes. Every logical gate in the Clifford group can be performed transversally — qubit by qubit — meaning a single fault cannot propagate into a logical error.',
    applications: ['Fault-tolerant Clifford group computation', 'Concatenated Steane code for universal computation with magic states', 'Trapped-ion implementations (highest gate fidelity hardware)', 'Threshold analysis and concatenation proofs for fault tolerance'],
    preset: null,
    furtherReading: 'Steane (1996) Phys. Rev. Lett. 77; Calderbank & Shor (1996) Phys. Rev. A 54'
  },
  {
    keys: ['magic state distillation', 'magic state', 'non-clifford', 't gate fault tolerant'],
    title: 'Magic State Distillation & Non-Clifford Gates',
    category: 'Error Correction',
    arxiv: 'arXiv:quant-ph/0403025',
    definition: 'Magic state distillation (Bravyi & Kitaev 2005) is the leading method to achieve universal fault-tolerant quantum computation when only Clifford gates are transversal. By injecting many noisy copies of a "magic state" |T⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2 and distilling them using Clifford circuits, one obtains high-fidelity magic states that implement the non-Clifford T gate via gate teleportation.',
    math: 'Magic state: |T⟩ = T|+⟩ = (|0⟩ + e^{iπ/4}|1⟩)/√2\n  where T = [[1,0],[0,e^{iπ/4}]] (π/8 gate)\n\n15-to-1 distillation protocol:\n  Input: 15 noisy |T⟩ states with error rate p < 0.14\n  Output: 1 high-fidelity |T⟩ with error rate 35p³\n  Cost: 15 physical magic states per logical T gate\n\nGate teleportation circuit:\n1. Prepare magic state |T⟩\n2. Apply CNOT(|ψ⟩, |T⟩)\n3. Measure |ψ⟩ register in X basis\n4. Classically correct: T|ψ⟩ obtained (up to Clifford correction)\n\nOverhead estimate (surface code + distillation):\n  ~1000 physical qubits per logical T gate (current estimates)',
    intuition: 'The Clifford group alone cannot be universal — you\'re missing the T gate. Magic states are the "fuel" that injects T gate capability into an otherwise Clifford-only fault-tolerant machine. Distillation purifies the fuel: start with many low-quality magic states and refine them into fewer high-quality ones, like refining crude oil.',
    applications: ['Universal fault-tolerant quantum computing resource overhead estimates', 'IBM/Google T-gate budget calculations for algorithm compilation', 'Quantum resource theory and computational power of mixed states', 'Alternative approaches: code switching, color codes with transversal T'],
    preset: null,
    furtherReading: 'Bravyi & Kitaev (2005) Phys. Rev. A 71; Litinski (2019) Quantum 3:205'
  },

  // ==========================================
  // QUANTUM INFORMATION — FOUNDATIONS
  // ==========================================
  {
    keys: ['no cloning theorem', 'no-cloning', 'quantum cloning', 'wootters zurek'],
    title: 'No-Cloning Theorem',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'The no-cloning theorem (Wootters & Zurek, 1982) proves that it is impossible to create a perfect identical copy of an arbitrary unknown quantum state. This is a fundamental consequence of the linearity of quantum mechanics and underpins the security of quantum cryptography.',
    math: 'Assume a cloning unitary U exists such that:\n  U(|ψ⟩ ⊗ |0⟩) = |ψ⟩ ⊗ |ψ⟩  for all |ψ⟩\n\nProof by contradiction:\n  For |0⟩: U(|0⟩|0⟩) = |0⟩|0⟩\n  For |1⟩: U(|1⟩|0⟩) = |1⟩|1⟩\n  For |+⟩ = (|0⟩+|1⟩)/√2:\n    U(|+⟩|0⟩) = U((|0⟩+|1⟩)|0⟩)/√2\n              = (|00⟩ + |11⟩)/√2  [by linearity]\n    But |+⟩⊗|+⟩ = (|00⟩+|01⟩+|10⟩+|11⟩)/2\n    These are not equal → Contradiction! ✗\n\nConclusion: No such U can exist for all quantum states.',
    intuition: 'You cannot perfectly photocopy a quantum state because measuring it disturbs it, and not measuring it leaves you without enough information to reproduce it. This is why quantum information is fundamentally different from classical: you cannot back up a qubit like a hard drive.',
    applications: ['Security proof for BB84 quantum key distribution', 'Impossibility of quantum eavesdropping without detection', 'Quantum money and unforgeable quantum tokens', 'No-broadcasting theorem generalization to mixed states'],
    preset: null,
    furtherReading: 'Wootters & Zurek (1982) Nature 299; Dieks (1982) Phys. Lett. A 92'
  },
  {
    keys: ['quantum teleportation', 'teleportation circuit', 'bennett brassard', 'teleport qubit'],
    title: 'Quantum Teleportation Protocol',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'Quantum teleportation (Bennett et al. 1993) transfers an unknown quantum state |ψ⟩ from Alice to Bob using one pre-shared Bell pair and 2 classical bits of communication. The original state is destroyed at Alice\'s location and recreated at Bob\'s — no matter is transmitted, and no superluminal communication occurs.',
    math: 'Protocol:\n  Resources: 1 EPR pair |Φ⁺⟩₂₃ = (|00⟩+|11⟩)/√2 shared (Alice has q2, Bob has q3)\n  Input: |ψ⟩₁ = α|0⟩ + β|1⟩ (Alice wants to send this)\n\nStep 1: Total state\n  |ψ⟩₁|Φ⁺⟩₂₃ = (α|0⟩+β|1⟩)(|00⟩+|11⟩)/√2\n\nStep 2: Alice applies CNOT(q1,q2) then H(q1)\n  = ½[|00⟩(α|0⟩+β|1⟩) + |01⟩(α|1⟩+β|0⟩) + |10⟩(α|0⟩-β|1⟩) + |11⟩(α|1⟩-β|0⟩)]\n\nStep 3: Alice measures q1,q2 → sends 2 classical bits (m₁,m₂)\nStep 4: Bob applies X^{m₂} Z^{m₁} to q3 → gets |ψ⟩ = α|0⟩ + β|1⟩ ✓\n\nClassical bits required: exactly 2 (enforces no-FTL signaling)',
    intuition: 'Alice cannot send the qubit directly (no-cloning). Instead she uses a shared quantum "resource" (entanglement) plus a classical phone call to Bob. The entanglement acts like a perfect quantum fax machine: after the call, Bob\'s qubit becomes the exact quantum state Alice had, even though Alice never measured it and doesn\'t know what it is.',
    applications: ['Quantum repeaters for long-distance quantum networks', 'Gate teleportation in fault-tolerant computing (T gate injection)', 'Satellite-based quantum communication (MICIUS satellite, China 2017)', 'Blind quantum computing protocols'],
    preset: 'bell',
    furtherReading: 'Bennett et al. (1993) Phys. Rev. Lett. 70; Pan et al. (1997) Nature 390'
  },
  {
    keys: ['superdense coding', 'super dense coding', 'two classical bits one qubit', 'bennett wiesner'],
    title: 'Superdense Coding',
    category: 'Quantum Information',
    arxiv: null,
    definition: 'Superdense coding (Bennett & Wiesner, 1992) is the dual of quantum teleportation: it uses 1 pre-shared entangled qubit to transmit 2 classical bits of information by sending only 1 qubit. This doubles the classical capacity of a quantum channel, demonstrating that entanglement is a communications resource.',
    math: 'Protocol (Alice sends 2 bits to Bob using 1 qubit):\n  Pre-shared Bell pair: |Φ⁺⟩ = (|00⟩+|11⟩)/√2 (Alice has q1, Bob has q2)\n\nAlice encodes 2 classical bits (a,b) by applying local gate to q1:\n  00 → I   → |Φ⁺⟩ = (|00⟩+|11⟩)/√2\n  01 → X   → |Ψ⁺⟩ = (|10⟩+|01⟩)/√2\n  10 → Z   → |Φ⁻⟩ = (|00⟩-|11⟩)/√2\n  11 → iY  → |Ψ⁻⟩ = (|10⟩-|01⟩)/√2\n\nAlice sends q1 to Bob (1 qubit sent over channel)\nBob performs Bell measurement → reads out (a,b) exactly\n\nCapacity: 2 classical bits per 1 qubit of channel use\n  (Holevo bound for classical: 1 bit/qubit without entanglement)',
    intuition: 'Normally, 1 qubit carries at most 1 bit of classical information (Holevo bound). But if Alice and Bob already share a pair of entangled qubits, Alice\'s single qubit acts like a steering wheel for the Bell pair — she can steer it into four distinguishable states, each encoding 2 bits.',
    applications: ['Quantum communication protocols and quantum channel capacity', 'Quantum cryptographic protocols beyond key distribution', 'Dense coding experiments (photons, NMR, ion traps)', 'Motivates entanglement as a physical resource'],
    preset: 'bell',
    furtherReading: 'Bennett & Wiesner (1992) Phys. Rev. Lett. 69; Nielsen & Chuang Ch. 2.3'
  },
  {
    keys: ['bb84', 'quantum key distribution', 'qkd', 'e91', 'quantum cryptography', 'bennett brassard 1984'],
    title: 'BB84 Quantum Key Distribution',
    category: 'Quantum Cryptography',
    arxiv: null,
    definition: 'BB84 (Bennett & Brassard, 1984) is the first quantum key distribution (QKD) protocol. It allows two parties to establish a provably secure shared secret key, where any eavesdropping is detectable due to the no-cloning theorem and the disturbance caused by quantum measurement. Security is guaranteed by the laws of physics, not computational complexity.',
    math: 'Protocol:\n1. Alice prepares random bits in random bases {Z={|0⟩,|1⟩}, X={|+⟩,|-⟩}}\n   Encoding: 0→|0⟩ or |+⟩, 1→|1⟩ or |-⟩\n2. Bob measures each qubit in randomly chosen basis Z or X\n3. Alice and Bob announce bases publicly (not values)\n4. Sift: keep only bits where bases matched (~50%)\n5. Check subset for errors → estimate QBER (error rate)\n   If QBER > 11%: abort (Eve present)\n   If QBER < 11%: apply privacy amplification → secure key\n\nSecurity:\n  Any measurement by Eve disturbs state (uncertainty principle)\n  QBER introduced by Eve: ~25% per qubit measured\n  Secure key rate: r = 1 - 2H(e) where e is error rate\n  Provably secure in information-theoretic sense (Mayers 1996)',
    intuition: 'Alice sends polarized photons like secret messages in sealed envelopes. Eve, trying to intercept, must open each envelope to read it — but opening quantum envelopes inevitably disturbs the contents. Alice and Bob detect Eve\'s presence by comparing a sample of their results: if too many disagree, someone was listening.',
    applications: ['Commercial QKD systems: ID Quantique, Toshiba, MagiQ Technologies', 'Quantum satellite links: China\'s MICIUS satellite QKD over 1200km', 'Financial institution and government secure communications', 'Quantum internet protocol layer: post-quantum security'],
    preset: null,
    furtherReading: 'Bennett & Brassard (1984) Proc. IEEE Intl. Conf.; Gisin et al. (2002) Rev. Mod. Phys. 74'
  },

  // ==========================================
  // VARIATIONAL & NISQ
  // ==========================================
  {
    keys: ['barren plateau', 'vanishing gradient', 'gradient vanishing vqc', 'trainability variational'],
    title: 'Barren Plateaus in Variational Quantum Circuits',
    category: 'Variational Algorithms',
    arxiv: 'arXiv:1803.11173',
    definition: 'Barren plateaus (McClean et al. 2018) are a fundamental trainability problem in variational quantum algorithms (VQAs): for random parameterized quantum circuits on n qubits, the variance of cost function gradients decreases exponentially in n, making optimization intractably slow on classical gradient-descent methods.',
    math: 'For a parameterized circuit U(θ) and cost C(θ) = ⟨0|U†(θ)OU(θ)|0⟩:\n\nBarren plateau condition:\n  Var[∂C/∂θⱼ] ≤ F(n) · 2^{-n}  where F(n) is polynomial in n\n\nOrigin: For deep random circuits, U†(θ)OU(θ) concentrates on\n  the maximally mixed state: ⟨O⟩ → Tr(O)/2^n (exponentially small)\n\nTypes of barren plateaus:\n1. Random initialization: random circuits → global barren plateaus\n2. Global cost functions: e.g. Tr(ρU†OU) → gradients vanish for global O\n3. Noise-induced: decoherence creates effective barren plateaus\n4. Entanglement-induced: highly entangled states → barren plateaus\n\nMitigation strategies:\n  - Local cost functions (local Pauli measurements)\n  - Structured ansatz (QMPS, HEA with limited depth)\n  - Layer-by-layer training\n  - Quantum natural gradient (geometric optimization)',
    intuition: 'Imagine trying to find the lowest valley in a landscape that becomes completely flat as it gets bigger — every direction looks equally uphill at random starting points. That\'s a barren plateau: the gradient signal disappears in quantum noise, and the optimizer has no direction to follow.',
    applications: ['Fundamental limitation of VQE, QAOA, and quantum neural networks', 'Guides ansatz design for near-term quantum algorithms', 'Quantum machine learning trainability analysis', 'Motivates quantum natural gradient and structured initialization'],
    preset: null,
    furtherReading: 'McClean et al. (2018) Nat. Comms. 9:4812; Cerezo et al. (2021) Nat. Comms. 12:1791'
  },
  {
    keys: ['stabilizer code', 'stabilizer formalism', 'pauli group', 'gottesman knill', 'clifford group'],
    title: 'Stabilizer Formalism & Clifford Group',
    category: 'Error Correction',
    arxiv: null,
    definition: 'The stabilizer formalism (Gottesman 1997) provides an efficient classical description of a class of quantum states called stabilizer states. The stabilizer group S of a state |ψ⟩ is an Abelian subgroup of the Pauli group Gₙ such that M|ψ⟩ = |ψ⟩ for all M ∈ S. The Clifford group is the normalizer of the Pauli group and maps stabilizer states to stabilizer states.',
    math: 'Pauli group on n qubits:\n  Gₙ = {±1, ±i} × {I,X,Y,Z}⊗ⁿ  (4^n Hermitian elements)\n\nStabilizer state: |ψ⟩ stabilized by S = ⟨g₁,...,gₙ⟩\n  gᵢ|ψ⟩ = |ψ⟩ for all gᵢ ∈ S\n  Described by n commuting Pauli generators (n² bits of data)\n\nClifford group Cn: unitaries mapping Gₙ → Gₙ under conjugation\n  U ∈ Cn iff U gᵢ U† ∈ Gₙ for all gᵢ ∈ Gₙ\n  Generated by: H, S, CNOT\n\nGottesman-Knill theorem:\n  Any Clifford circuit (H, S, CNOT, Pauli measurements, Pauli prep)\n  on stabilizer states can be efficiently simulated in O(n²) time classically!\n\n→ T gate (non-Clifford) is what makes quantum computation hard to simulate.',
    intuition: 'Stabilizer states are the quantum states that can be completely described by their symmetries rather than all their amplitudes. The Clifford group maps one symmetric state to another — efficiently trackable on a classical computer. Adding a T gate breaks this symmetry and is the source of genuine quantum computational power.',
    applications: ['Efficient simulation of Clifford circuits (Google, IBM noise calibration)', 'Quantum error correction code design (all CSS/stabilizer codes)', 'Randomized benchmarking protocols for gate fidelity', 'Magic state distillation resource analysis'],
    preset: null,
    furtherReading: 'Gottesman (1997) PhD Thesis; Nielsen & Chuang Ch. 10.5; Aaronson & Gottesman (2004) Phys. Rev. A 70'
  }
];

if (typeof window !== 'undefined') {
  window.QUANTUM_TOPIC_DATABASE = QUANTUM_TOPIC_DATABASE;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUANTUM_TOPIC_DATABASE };
}

