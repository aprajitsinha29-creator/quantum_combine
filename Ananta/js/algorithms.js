const ALGORITHM_CATALOG = [
  {
    "id": "superposition",
    "category": "Foundational",
    "title": "Equal Superposition (Hadamard)",
    "subtitle": "H Gate",
    "desc": "A single Hadamard gate rotates |0> by 45 degrees on the Bloch sphere, placing the qubit in a perfect 50/50 superposition of |0> and |1>.",
    "realWorld": "Quantum random number generation. The output is a fundamentally unpredictable random bit.",
    "math": "|psi> = 1/sqrt(2) (|0> + |1>) = |+>",
    "difficulty": "Beginner",
    "tags": [
      "Single Qubit",
      "Superposition"
    ],
    "grid": [
      [
        "H",
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Hadamard Rotation",
        "text": "Hadamard gate applied to Qubit 0 rotates the statevector from the north pole |0> to the equator |+> = (|0> + |1>)/sqrt(2). Probability is evenly split at 50% for |000> and 50% for |100>."
      }
    ]
  },
  {
    "id": "pauli_x",
    "category": "Foundational",
    "title": "Pauli-X (Quantum NOT Gate)",
    "subtitle": "X Gate",
    "desc": "The quantum NOT gate flips |0> to |1>. Equivalent to a 180 degree rotation around the X-axis of the Bloch sphere.",
    "realWorld": "Qubit initialization and reset in quantum error correction codes.",
    "math": "|0> to |1>,  X = [[0,1],[1,0]]",
    "difficulty": "Beginner",
    "tags": [
      "Single Qubit",
      "Gates"
    ],
    "grid": [
      [
        "X",
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Bit Flip",
        "text": "Pauli-X applies a 180-degree rotation around the X-axis, inverting the ground state |0> to excited state |1>."
      }
    ]
  },
  {
    "id": "pauli_y",
    "category": "Foundational",
    "title": "Pauli-Y Rotation",
    "subtitle": "Y Gate",
    "desc": "Applies a 180 degree rotation around the Y-axis, combining a bit flip with a phase flip.",
    "realWorld": "Used in dynamical decoupling sequences (XY-4, XY-8) to suppress dephasing noise in superconducting processors.",
    "math": "|psi> to Y|psi>,  Y = [[0,-i],[i,0]]",
    "difficulty": "Beginner",
    "tags": [
      "Single Qubit",
      "Phase"
    ],
    "grid": [
      [
        "Y",
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Y-Axis Rotation",
        "text": "Pauli-Y introduces an imaginary phase component: |0> maps to i|1>."
      }
    ]
  },
  {
    "id": "pauli_z",
    "category": "Foundational",
    "title": "Pauli-Z (Phase Flip)",
    "subtitle": "Z Gate",
    "desc": "Applies a 180 degree phase flip. |0> stays unchanged but |1> acquires a minus sign. Invisible in computational basis but crucial for interference.",
    "realWorld": "Phase kickback mechanism used in Grover search and Quantum Fourier Transform.",
    "math": "|0> to |0>,  |1> to -|1>",
    "difficulty": "Beginner",
    "tags": [
      "Single Qubit",
      "Phase"
    ],
    "grid": [
      [
        "H",
        "Z",
        "H",
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Create Superposition",
        "text": "Hadamard creates the equal superposition state |+>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Apply Phase Flip (Z)",
        "text": "Pauli-Z flips the phase of |1> to negative, transforming |+> into |-> = (|0> - |1>)/sqrt(2). Observe the phase clock rotate 180 degrees!"
      },
      {
        "step": 3,
        "col": 2,
        "title": "Interference to |1>",
        "text": "The second Hadamard creates destructive interference for |0> and constructive interference for |1>, demonstrating HZH = X!"
      }
    ]
  },
  {
    "id": "s_gate",
    "category": "Foundational",
    "title": "S Gate (Phase pi/2)",
    "subtitle": "S = T^2",
    "desc": "Applies a 90 degree rotation around the Z-axis. S = sqrt(Z) = T^2. Used in QFT as controlled phase rotation.",
    "realWorld": "Core building block of QFT-based algorithms including Shor's factoring algorithm.",
    "math": "|0> to |0>,  |1> to i|1>",
    "difficulty": "Beginner",
    "tags": [
      "Single Qubit",
      "Phase"
    ],
    "grid": [
      [
        "H",
        "S",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Hadamard Base",
        "text": "Puts Qubit 0 into superposition."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Quarter Phase Shift (90 deg)",
        "text": "S gate rotates the phase needle by 90 degrees along the equator. State is |0> + i|1>."
      }
    ]
  },
  {
    "id": "t_gate",
    "category": "Foundational",
    "title": "T Gate (Phase pi/4)",
    "subtitle": "Magic Gate",
    "desc": "Applies a 45 degree phase rotation. The T gate is non-Clifford, enabling universal quantum computation.",
    "realWorld": "T-gate count is the standard metric of quantum circuit complexity in fault-tolerant quantum computing.",
    "math": "|0> to |0>,  |1> to exp(i*pi/4)|1>",
    "difficulty": "Intermediate",
    "tags": [
      "Single Qubit",
      "Universal"
    ],
    "grid": [
      [
        "H",
        "T",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition",
        "text": "Create equal superposition on q0."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Magic Non-Clifford Rotation",
        "text": "T gate applies a precise 45-degree (pi/4) phase angle. Look at the Phase Clock dial point at 45 degrees!"
      }
    ]
  },
  {
    "id": "superposition_3",
    "category": "Foundational",
    "title": "Full 3-Qubit Superposition",
    "subtitle": "Uniform Distribution",
    "desc": "Applies Hadamard to all 3 qubits, creating uniform superposition across all 8 basis states with 12.5% each.",
    "realWorld": "Initial state preparation for Grover Algorithm and Quantum Amplitude Amplification.",
    "math": "|psi> = 1/sqrt(8) * sum_i |i> for i in {0...7}",
    "difficulty": "Beginner",
    "tags": [
      "Multi Qubit",
      "Superposition"
    ],
    "grid": [
      [
        "H",
        null,
        null,
        null,
        null,
        null
      ],
      [
        "H",
        null,
        null,
        null,
        null,
        null
      ],
      [
        "H",
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Parallel Superposition",
        "text": "Simultaneous Hadamard gates generate 2^3 = 8 quantum pathways simultaneously with equal 12.5% probabilities."
      }
    ]
  },
  {
    "id": "bell_phi_plus",
    "category": "Entanglement",
    "title": "Bell State |Phi+> (EPR Pair)",
    "subtitle": "H + CNOT",
    "desc": "Creates the maximally entangled Bell state. Measuring either qubit instantly determines the other regardless of distance.",
    "realWorld": "Quantum Key Distribution, quantum teleportation, loophole-free Bell inequality tests.",
    "math": "|Phi+> = 1/sqrt(2) (|00> + |11>)",
    "difficulty": "Intermediate",
    "tags": [
      "Entanglement",
      "Bell State"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        null,
        null,
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Step 1: Superposition on Control",
        "text": "Hadamard on q0 creates (|0> + |1>)/sqrt(2). The combined state is (|00> + |10>)/sqrt(2)."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Step 2: CNOT Entangling Operation",
        "text": "CNOT uses q0 as control and q1 as target. When q0 is |1>, q1 flips to |1>. The state collapses into the Bell pair (|00> + |11>)/sqrt(2). Look at the pulsing Entanglement Badge and the Density Matrix off-diagonal peaks!"
      }
    ]
  },
  {
    "id": "bell_phi_minus",
    "category": "Entanglement",
    "title": "Bell State |Phi->",
    "subtitle": "Anti-Correlated Phase",
    "desc": "Second Bell state with relative minus sign. Correlated |00> and |11> outcomes but with phase difference of -1.",
    "realWorld": "One of four Bell basis states used in quantum teleportation classical correction.",
    "math": "|Phi-> = 1/sqrt(2) (|00> - |11>)",
    "difficulty": "Intermediate",
    "tags": [
      "Entanglement",
      "Bell State"
    ],
    "grid": [
      [
        "X",
        "H",
        "CX_CTRL",
        null,
        null,
        null
      ],
      [
        null,
        null,
        "CX_TGT",
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Bit Flip",
        "text": "X gate sets q0 to |1>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Superposition with Negative Phase",
        "text": "Hadamard on |1> creates (|0> - |1>)/sqrt(2)."
      },
      {
        "step": 3,
        "col": 2,
        "title": "CNOT Entanglement",
        "text": "CNOT entangles both wires into (|00> - |11>)/sqrt(2)."
      }
    ]
  },
  {
    "id": "bell_psi_plus",
    "category": "Entanglement",
    "title": "Bell State |Psi+>",
    "subtitle": "Anti-Correlated Outcomes",
    "desc": "Third Bell state: measuring qubit 0 as 0 guarantees qubit 1 measures as 1. Qubits are always anti-correlated.",
    "realWorld": "Superdense coding: sending 2 classical bits using 1 qubit and 1 entangled pair.",
    "math": "|Psi+> = 1/sqrt(2) (|01> + |10>)",
    "difficulty": "Intermediate",
    "tags": [
      "Entanglement",
      "Bell State"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        null,
        null,
        null,
        null
      ],
      [
        "X",
        "CX_TGT",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition + Bit Flip",
        "text": "q0 is put into superposition while q1 is flipped to |1>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Anti-Correlated Entanglement",
        "text": "CNOT entangles the pair into (|01> + |10>)/sqrt(2). Measuring one qubit always reveals the opposite value for the other!"
      }
    ]
  },
  {
    "id": "bell_psi_minus",
    "category": "Entanglement",
    "title": "Bell State |Psi-> (Singlet)",
    "subtitle": "Maximum Anti-Correlation",
    "desc": "The singlet state, antisymmetric under qubit exchange with special symmetry properties.",
    "realWorld": "Ekert E91 quantum cryptography protocol. Violation of Bell inequality.",
    "math": "|Psi-> = 1/sqrt(2) (|01> - |10>)",
    "difficulty": "Intermediate",
    "tags": [
      "Entanglement",
      "Bell State"
    ],
    "grid": [
      [
        "H",
        "Z",
        "CX_CTRL",
        null,
        null,
        null
      ],
      [
        "X",
        null,
        "CX_TGT",
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Initialize States",
        "text": "q0 enters superposition, q1 is set to |1>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Phase Inversion",
        "text": "Pauli-Z inverts relative phase."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Singlet State Synthesis",
        "text": "CNOT binds qubits into the famous Singlet state (|01> - |10>)/sqrt(2)."
      }
    ]
  },
  {
    "id": "ghz",
    "category": "Entanglement",
    "title": "GHZ State (3-Qubit)",
    "subtitle": "Greenberger-Horne-Zeilinger",
    "desc": "The 3-qubit GHZ state maximally entangles all three qubits. Measuring any one instantly collapses all three.",
    "realWorld": "Quantum secret sharing, distributed quantum computing, multi-party entanglement demonstration.",
    "math": "|GHZ> = 1/sqrt(2) (|000> + |111>)",
    "difficulty": "Intermediate",
    "tags": [
      "Entanglement",
      "GHZ",
      "Multi-Qubit"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        null,
        null,
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        "CX_CTRL",
        null,
        null,
        null
      ],
      [
        null,
        null,
        "CX_TGT",
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition on Qubit 0",
        "text": "q0 enters equal superposition |+>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "First CNOT (q0 to q1)",
        "text": "Creates Bell pair on wires q0 and q1: (|000> + |110>)/sqrt(2)."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Second CNOT (q1 to q2)",
        "text": "Cascades entanglement to q2, creating the 3-qubit GHZ state (|000> + |111>)/sqrt(2). Measuring any single qubit now collapses all three!"
      }
    ]
  },
  {
    "id": "grover_2qubit",
    "category": "Search & Optimization",
    "title": "Grover Search (2-Qubit)",
    "subtitle": "Oracle + Diffusion, O(sqrt(N))",
    "desc": "Searches N=4 items in O(sqrt(N))=2 oracle calls vs classical O(N)=4. Uses amplitude amplification to boost target state |11>.",
    "realWorld": "Database search, constraint satisfaction, quantum-enhanced optimization heuristics.",
    "math": "Search 4 items in 2 oracle queries (classical: 4)",
    "difficulty": "Advanced",
    "tags": [
      "Search",
      "Grover",
      "Amplitude Amplification"
    ],
    "grid": [
      [
        "H",
        "Z",
        "H",
        "X",
        "H",
        null
      ],
      [
        "H",
        "CX_TGT",
        "H",
        "X",
        "H",
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Equal Superposition",
        "text": "Hadamard layer puts database into uniform superposition (25% probability for each of the 4 states)."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Oracle Phase Marking",
        "text": "The oracle marks the target state |11> by flipping its quantum phase to -180 degrees (notice the phase clock for |11> rotates to red!)."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Basis Change",
        "text": "Hadamard gates transform the phase difference into computational amplitude differences."
      },
      {
        "step": 4,
        "col": 3,
        "title": "Inversion About Mean (X)",
        "text": "Pauli-X reflection gates prepare the amplitude inversion."
      },
      {
        "step": 5,
        "col": 4,
        "title": "Constructive Wave Amplification",
        "text": "Final Hadamard layer causes destructive interference on all wrong states, amplifying the target |11> to 100%!"
      }
    ]
  },
  {
    "id": "grover_3qubit",
    "category": "Search & Optimization",
    "title": "Grover Search (3-Qubit)",
    "subtitle": "Oracle marks |111>",
    "desc": "Extends Grover to 3 qubits (N=8). After 2-3 iterations, the target state |111> has dramatically boosted probability.",
    "realWorld": "Quantum speedup for NP-hard problems. Searching molecular configuration spaces in drug discovery.",
    "math": "Search 8 items in ~2.2 oracle calls (classical: 8)",
    "difficulty": "Expert",
    "tags": [
      "Search",
      "Grover"
    ],
    "grid": [
      [
        "H",
        "Z",
        "H",
        "CX_CTRL",
        null,
        null
      ],
      [
        "H",
        "Z",
        "H",
        null,
        "CX_CTRL",
        null
      ],
      [
        "H",
        "Z",
        "H",
        "CX_TGT",
        "CX_TGT",
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition on 8 items",
        "text": "Hadamards prepare all 8 states with 12.5% each."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Phase Oracle",
        "text": "Phase gates mark the target item."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Diffusion Transform",
        "text": "Hadamard layers invert amplitudes about the mean."
      },
      {
        "step": 4,
        "col": 3,
        "title": "Multi-Qubit Amplification",
        "text": "Controlled gates amplify target state |111> probability."
      }
    ]
  },
  {
    "id": "amplitude_amplification",
    "category": "Search & Optimization",
    "title": "Amplitude Amplification",
    "subtitle": "General Grover Framework",
    "desc": "General form of Grover algorithm. Any state preparation routine A replaces Hadamard, amplifying any target subspace.",
    "realWorld": "Quantum Monte Carlo methods for financial risk analysis and derivative pricing.",
    "math": "Ao = -A S0 A-dagger Sx,  O(1/sqrt(eps)) queries",
    "difficulty": "Advanced",
    "tags": [
      "Search",
      "Amplitude Amplification"
    ],
    "grid": [
      [
        "H",
        "X",
        "H",
        "X",
        null,
        null
      ],
      [
        "H",
        "X",
        "CX_TGT",
        "X",
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Ansatz Superposition",
        "text": "Prepares trial subspace amplitudes."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Subspace Oracle",
        "text": "Marks good subspace solutions."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Diffusion Reflection",
        "text": "Amplifies target amplitudes."
      }
    ]
  },
  {
    "id": "teleportation",
    "category": "Communication",
    "title": "Quantum Teleportation",
    "subtitle": "State Transfer via Entanglement",
    "desc": "Transfers exact quantum state of Qubit 0 to Qubit 2 using shared entanglement and 2 classical bits. No physical qubit crosses.",
    "realWorld": "Quantum internet repeater networks. Long-distance quantum key distribution. Connecting quantum computers.",
    "math": "EPR + Bell measurement + classical correction = state transfer",
    "difficulty": "Advanced",
    "tags": [
      "Communication",
      "Teleportation"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        "M",
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        "M",
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        "X",
        "Z"
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Shared EPR Pair Creation",
        "text": "Entangled Bell pair shared between Alice (q1) and Bob (q2)."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Alice's Bell Measurement",
        "text": "Alice entangles the unknown state q0 with her half of the Bell pair q1."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Measurement Collapse",
        "text": "Alice measures both qubits into classical bits, destroying the quantum state in her laboratory."
      },
      {
        "step": 4,
        "col": 4,
        "title": "Bob's Classical Correction",
        "text": "Bob applies X and Z conditional rotations based on Alice's classical bits to perfectly reconstruct the original state on q2!"
      }
    ]
  },
  {
    "id": "superdense_coding",
    "category": "Communication",
    "title": "Superdense Coding",
    "subtitle": "2 Classical Bits via 1 Qubit",
    "desc": "Encodes 2 classical bits into a single qubit using a pre-shared entangled pair. Maximally efficient.",
    "realWorld": "Achieves Shannon capacity of 2 bits per qubit in an entangled quantum channel.",
    "math": "1 ebit + 1 qubit = 2 classical bits",
    "difficulty": "Advanced",
    "tags": [
      "Communication",
      "Entanglement"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "Z",
        "X",
        "CX_CTRL",
        "H"
      ],
      [
        null,
        "CX_TGT",
        null,
        null,
        "CX_TGT",
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Bell Pair Sharing",
        "text": "Alice and Bob share an entangled Bell pair."
      },
      {
        "step": 2,
        "col": 2,
        "title": "Alice Encodes 2 Bits",
        "text": "Alice applies Z and X gates to encode 2 classical bits into her single qubit."
      },
      {
        "step": 3,
        "col": 4,
        "title": "Bob Decodes with Bell Measurement",
        "text": "Bob receives Alice's single qubit and performs a Bell measurement to recover both classical bits."
      }
    ]
  },
  {
    "id": "bb84_qkd",
    "category": "Communication",
    "title": "BB84 Quantum Key Distribution",
    "subtitle": "Unconditionally Secure Keys",
    "desc": "Alice and Bob share a secret key guaranteed secure by quantum mechanics. Any eavesdropper inevitably disturbs the state.",
    "realWorld": "Commercial QKD networks in China (2000 km backbone), Europe (SECOQC), US DoD networks.",
    "math": "Eve detection rate: 25% bit errors per qubit intercepted",
    "difficulty": "Intermediate",
    "tags": [
      "Cryptography",
      "QKD"
    ],
    "grid": [
      [
        "H",
        "M",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Random Basis Selection",
        "text": "Alice encodes key bits randomly in Z or X basis using Hadamard gates."
      }
    ]
  },
  {
    "id": "deutsch_balanced",
    "category": "Oracle Algorithms",
    "title": "Deutsch-Jozsa (Balanced Oracle)",
    "subtitle": "1-Query Exponential Speedup",
    "desc": "Determines if oracle f is constant or balanced in ONE quantum query vs 2^(n-1)+1 classical queries.",
    "realWorld": "The first proven quantum speedup (1992). Foundation of all quantum algorithm theory.",
    "math": "O(1) queries vs classical O(2^(n-1)+1)",
    "difficulty": "Intermediate",
    "tags": [
      "Oracle",
      "Deutsch-Jozsa"
    ],
    "grid": [
      [
        "H",
        "X",
        "H",
        null,
        null,
        null
      ],
      [
        "X",
        "H",
        "CX_TGT",
        "H",
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Initialization & Superposition",
        "text": "Query qubit set to |+>, answer qubit set to |-> for phase kickback."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Oracle Query",
        "text": "Evaluates balanced function f(x) in a single parallel query."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Interference Reading",
        "text": "Second Hadamard converts phase information: outcome is NOT |00>, certifying the function is balanced!"
      }
    ]
  },
  {
    "id": "deutsch_constant",
    "category": "Oracle Algorithms",
    "title": "Deutsch-Jozsa (Constant Oracle)",
    "subtitle": "Constant Function Query",
    "desc": "Tests the constant oracle (f(x)=0 for all x). Output register measures |0...0> with certainty.",
    "realWorld": "Demonstrates quantum deterministic advantage vs probabilistic classical algorithms.",
    "math": "f(x) = 0 for all x: output |0...0>",
    "difficulty": "Intermediate",
    "tags": [
      "Oracle",
      "Deutsch-Jozsa"
    ],
    "grid": [
      [
        "H",
        null,
        "H",
        null,
        null,
        null
      ],
      [
        "X",
        "H",
        null,
        "H",
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition",
        "text": "Qubits enter superposition."
      },
      {
        "step": 2,
        "col": 2,
        "title": "Deterministic Zero Outcome",
        "text": "Because oracle is constant (no phase flips), Hadamards reconstruct |00> with 100% certainty."
      }
    ]
  },
  {
    "id": "bernstein_vazirani",
    "category": "Oracle Algorithms",
    "title": "Bernstein-Vazirani Algorithm",
    "subtitle": "Find Hidden Bitstring in 1 Query",
    "desc": "Recovers secret bitstring s in f(x) = s.x mod 2 in ONE quantum query vs classical n queries.",
    "realWorld": "Demonstrates quantum linear advantage for learning problems. Related to quantum ML speedups.",
    "math": "f(x) = s.x mod 2: recover s in 1 query vs n classical",
    "difficulty": "Advanced",
    "tags": [
      "Oracle",
      "Bernstein-Vazirani"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        null,
        null,
        null
      ],
      [
        "H",
        "CX_CTRL",
        "H",
        null,
        null,
        null
      ],
      [
        "X",
        "H",
        "CX_TGT",
        "H",
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition of All Queries",
        "text": "Evaluates all 2^n inputs simultaneously."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Oracle Inner Product",
        "text": "Encodes hidden bitstring s into quantum phases via CNOT gates."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Instant Reading of s",
        "text": "Hadamard layer reads out the entire hidden bitstring s in a single measurement!"
      }
    ]
  },
  {
    "id": "simon",
    "category": "Oracle Algorithms",
    "title": "Simon Algorithm",
    "subtitle": "Exponential Oracle Speedup",
    "desc": "Finds hidden period s such that f(x)=f(x XOR s) in O(n) quantum queries vs O(2^(n/2)) classical.",
    "realWorld": "Precursor to Shor algorithm. Shows quantum efficiently learns hidden linear structure.",
    "math": "f(x)=f(x XOR s): O(n) queries vs O(2^(n/2)) classical",
    "difficulty": "Expert",
    "tags": [
      "Oracle",
      "Simon",
      "Period Finding"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        null,
        null,
        null
      ],
      [
        "H",
        null,
        "CX_CTRL",
        "H",
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        "CX_TGT",
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Query Superposition",
        "text": "Parallel query across all inputs."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Periodic Function Evaluation",
        "text": "Entangles input register with function output."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Orthogonal Period Measurement",
        "text": "Measures vectors orthogonal to hidden period s."
      }
    ]
  },
  {
    "id": "qft_3",
    "category": "Phase Estimation & QFT",
    "title": "Quantum Fourier Transform (3-Qubit)",
    "subtitle": "Quantum DFT",
    "desc": "Maps computational basis states to their discrete Fourier transform using Hadamard and controlled phase rotations.",
    "realWorld": "Core subroutine of Shor factoring, quantum phase estimation, and quantum simulation.",
    "math": "QFT|j> = 1/sqrt(N) * sum_k exp(2*pi*i*j*k/N)|k>",
    "difficulty": "Expert",
    "tags": [
      "QFT",
      "Shor",
      "Phase Estimation"
    ],
    "grid": [
      [
        "H",
        "S",
        "T",
        null,
        "H",
        null
      ],
      [
        null,
        "CX_CTRL",
        null,
        "H",
        "S",
        null
      ],
      [
        null,
        null,
        "CX_CTRL",
        "CX_TGT",
        "CX_TGT",
        "H"
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Most Significant Qubit Hadamard",
        "text": "Splits q0 into phase superposition."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Controlled Phase Rotation (S)",
        "text": "Applies pi/2 controlled phase shift."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Fine Phase Rotation (T)",
        "text": "Applies pi/4 controlled phase shift."
      },
      {
        "step": 4,
        "col": 4,
        "title": "Butterfly Permutation",
        "text": "Completes Fourier frequency decomposition across the register."
      }
    ]
  },
  {
    "id": "phase_estimation",
    "category": "Phase Estimation & QFT",
    "title": "Quantum Phase Estimation",
    "subtitle": "Eigenvalue Estimation",
    "desc": "Estimates eigenphase phi of U|psi>=exp(2*pi*i*phi)|psi> with exponential precision using H, controlled-U, and inverse QFT.",
    "realWorld": "Quantum chemistry: computing molecular ground state energies for drug design.",
    "math": "U|psi>=exp(2*pi*i*phi)|psi>: measure phi in binary",
    "difficulty": "Expert",
    "tags": [
      "Phase Estimation",
      "QFT",
      "Chemistry"
    ],
    "grid": [
      [
        "H",
        null,
        "CX_CTRL",
        "H",
        null,
        null
      ],
      [
        "H",
        "CX_CTRL",
        null,
        null,
        "H",
        null
      ],
      [
        null,
        "CX_TGT",
        "CX_TGT",
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Counting Register Superposition",
        "text": "Prepares measurement precision registers."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Controlled Unitary Power",
        "text": "Applies powers of unitary U to inject eigenphase into phases."
      },
      {
        "step": 3,
        "col": 3,
        "title": "Inverse QFT",
        "text": "Extracts the exact binary digits of the unknown phase phi!"
      }
    ]
  },
  {
    "id": "vqe_ansatz",
    "category": "Phase Estimation & QFT",
    "title": "VQE Ansatz (Quantum Chemistry)",
    "subtitle": "Variational Quantum Eigensolver",
    "desc": "Parameterized circuit that minimizes energy expectation value via classical-quantum hybrid optimization.",
    "realWorld": "Computing binding energies for drug molecules. Nitrogenase enzyme simulation for room-temperature fertilizer synthesis.",
    "math": "min(theta) <psi(theta)|H|psi(theta)> = ground state energy",
    "difficulty": "Expert",
    "tags": [
      "VQE",
      "Variational",
      "Chemistry"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "T",
        "CX_CTRL",
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        "S",
        null,
        "CX_CTRL",
        null
      ],
      [
        "X",
        null,
        "H",
        "CX_TGT",
        "CX_TGT",
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Hartree-Fock Initial State",
        "text": "Prepares mean-field reference molecular state."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Entangling Layer",
        "text": "Generates electronic correlation between orbitals."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Parameterized Rotations",
        "text": "Applies parameterized angles theta optimized by classical computer to find ground state energy."
      }
    ]
  },
  {
    "id": "bit_flip_code",
    "category": "Quantum Error Correction",
    "title": "3-Qubit Bit Flip Code",
    "subtitle": "Repetition Code",
    "desc": "Encodes a logical qubit across 3 physical qubits. Syndrome measurement corrects any single bit flip error.",
    "realWorld": "Fault-tolerant quantum computing. Basis for the 9-qubit Shor code and surface codes.",
    "math": "alpha|0>+beta|1> to alpha|000>+beta|111> (distance-3 code)",
    "difficulty": "Advanced",
    "tags": [
      "Error Correction",
      "Fault Tolerance"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "CX_CTRL",
        null,
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        "CX_TGT",
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Superposition Input",
        "text": "Logical qubit initialized in state alpha|0> + beta|1>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "First Ancilla Entanglement",
        "text": "CNOT copies parity to physical qubit 1."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Complete 3-Qubit Encoding",
        "text": "Second CNOT encodes logical state across all 3 physical qubits: alpha|000> + beta|111>. Any single bit-flip error can now be identified by majority voting!"
      }
    ]
  },
  {
    "id": "phase_flip_code",
    "category": "Quantum Error Correction",
    "title": "3-Qubit Phase Flip Code",
    "subtitle": "Hadamard Basis Repetition",
    "desc": "Corrects phase flip (Z) errors by encoding in the Hadamard basis. Detects and corrects a single Z error on any qubit.",
    "realWorld": "Combined with bit flip code in Shor 9-qubit code protecting against arbitrary single-qubit errors.",
    "math": "H(x3) applied to bit flip code: corrects Z errors",
    "difficulty": "Advanced",
    "tags": [
      "Error Correction",
      "Phase Error"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "CX_CTRL",
        "H",
        null,
        null
      ],
      [
        "H",
        "CX_TGT",
        null,
        "H",
        null,
        null
      ],
      [
        "H",
        null,
        "CX_TGT",
        "H",
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Basis Change to X-Basis",
        "text": "Hadamards rotate phase errors into bit flips."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Entanglement Protection",
        "text": "Repetition code applied in the Hadamard basis."
      },
      {
        "step": 3,
        "col": 3,
        "title": "Return to Z-Basis",
        "text": "Final Hadamards decode back to computational basis with phase errors corrected."
      }
    ]
  },
  {
    "id": "swap_test",
    "category": "Advanced & NISQ",
    "title": "SWAP Test (Quantum Fingerprinting)",
    "subtitle": "State Similarity Comparison",
    "desc": "Uses ancilla qubit and controlled-SWAP to estimate overlap |<psi|phi>|^2 between two quantum states.",
    "realWorld": "Quantum machine learning for similarity comparison (k-NN, SVM). Quantum protocol verification.",
    "math": "P(0) = (1 + |<psi|phi>|^2) / 2",
    "difficulty": "Advanced",
    "tags": [
      "NISQ",
      "Machine Learning",
      "SWAP"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        null,
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        null,
        null,
        null
      ],
      [
        "X",
        "CX_TGT",
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Ancilla Superposition",
        "text": "Ancilla placed in superposition to control swap operation."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Controlled Overlap Test",
        "text": "Controlled operations compare quantum state vectors."
      },
      {
        "step": 3,
        "col": 2,
        "title": "Interference Measurement",
        "text": "Ancilla measurement probability directly yields state similarity |<psi|phi>|^2!"
      }
    ]
  },
  {
    "id": "quantum_walk",
    "category": "Advanced & NISQ",
    "title": "Discrete Quantum Walk",
    "subtitle": "Quadratic Diffusion Speedup",
    "desc": "Quantum analog of random walk. Propagates with quantum interference, spreading quadratically faster than classical diffusion.",
    "realWorld": "Quantum walk search algorithms (Ambainis 2004). Graph connectivity testing. Quantum transport simulation.",
    "math": "Coin: H|c>, Shift: S|c,p> = |c, p+-1>",
    "difficulty": "Expert",
    "tags": [
      "Quantum Walk",
      "Search",
      "Transport"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        "CX_CTRL",
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        "CX_TGT",
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Quantum Coin Flip",
        "text": "Hadamard applies quantum coin toss into superposition."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Conditional Position Shift",
        "text": "CNOT moves position walker based on coin state with coherent wave interference."
      }
    ]
  },
  {
    "id": "qaoa_maxcut",
    "category": "Advanced & NISQ",
    "title": "QAOA (Max-Cut Approximation)",
    "subtitle": "Quantum Approximate Optimization",
    "desc": "Alternating problem and mixer Hamiltonians approximate solutions to combinatorial optimization problems like Max-Cut.",
    "realWorld": "Vehicle routing, logistics, portfolio optimization, network design. Tested on IBM Quantum and Google Sycamore.",
    "math": "|gamma,beta> = U_B(beta) U_C(gamma) |+>^n",
    "difficulty": "Expert",
    "tags": [
      "NISQ",
      "QAOA",
      "Optimization"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "S",
        "CX_CTRL",
        "T",
        null
      ],
      [
        "H",
        "CX_TGT",
        "T",
        null,
        "CX_CTRL",
        null
      ],
      [
        "H",
        null,
        "S",
        "CX_TGT",
        "CX_TGT",
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Equal Superposition Initialization",
        "text": "All candidate graph partitions are explored in parallel."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Problem Hamiltonian Layer (Cost)",
        "text": "Phase shifts apply penalties for uncut graph edges."
      },
      {
        "step": 3,
        "col": 3,
        "title": "Mixer Hamiltonian Layer (Driver)",
        "text": "Transverse field drives quantum tunneling across cut partitions."
      }
    ]
  },
  {
    "id": "no_cloning",
    "category": "Advanced & NISQ",
    "title": "No-Cloning Theorem Demo",
    "subtitle": "Quantum States Cannot Be Copied",
    "desc": "Shows why unknown quantum state cannot be perfectly copied. CNOT copies only basis states, fails for superpositions.",
    "realWorld": "Foundation of quantum cryptography security. No quantum virus can spread. Quantum money cannot be counterfeited.",
    "math": "No unitary U: U|psi>|0> = |psi>|psi> for all |psi>",
    "difficulty": "Intermediate",
    "tags": [
      "No-Cloning",
      "Cryptography",
      "Foundations"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        null,
        null,
        null,
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Unknown Superposition State",
        "text": "Source qubit enters superposition alpha|0> + beta|1>."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Attempted Copy via CNOT",
        "text": "CNOT results in entangled state alpha|00> + beta|11>, NOT the cloned state (alpha|0>+beta|1>)(alpha|0>+beta|1>). Proves universal quantum cloning is impossible!"
      }
    ]
  },
  {
    "id": "quantum_eraser",
    "category": "Advanced & NISQ",
    "title": "Quantum Eraser",
    "subtitle": "Restoring Lost Interference",
    "desc": "Measurement destroys interference; erasing which-path information restores it. Demonstrates reversibility of quantum measurement.",
    "realWorld": "Foundational test of complementarity. Delayed-choice quantum eraser experiments with photons.",
    "math": "Tr(rho_A): mixed if measured, pure if erased",
    "difficulty": "Advanced",
    "tags": [
      "Foundations",
      "Measurement",
      "Interference"
    ],
    "grid": [
      [
        "H",
        "CX_CTRL",
        "H",
        null,
        "H",
        null
      ],
      [
        null,
        "CX_TGT",
        null,
        "H",
        "CX_TGT",
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ]
    ],
    "tourSteps": [
      {
        "step": 1,
        "col": 0,
        "title": "Initial Superposition",
        "text": "Photon path enters superposition."
      },
      {
        "step": 2,
        "col": 1,
        "title": "Which-Way Marker Tagging",
        "text": "Entanglement tags which-path information, destroying interference."
      },
      {
        "step": 3,
        "col": 4,
        "title": "Erasing Which-Way Info",
        "text": "Hadamard erases which-path knowledge, restoring quantum interference!"
      }
    ]
  }
];


// ============================================================
// ALGORITHM LIBRARY CLASS
// ============================================================
class AlgorithmLibrary {
  constructor() {
    this.currentCategory = 'All';
    this.categories = ['All', 'Foundational', 'Entanglement', 'Search & Optimization', 'Communication', 'Oracle Algorithms', 'Phase Estimation & QFT', 'Quantum Error Correction', 'Advanced & NISQ'];
    this.difficultyColors = {
      'Beginner':     { text: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.3)' },
      'Intermediate': { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.3)' },
      'Advanced':     { text: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.3)' },
      'Expert':       { text: '#fa4d56', bg: 'rgba(250,77,86,0.10)', border: 'rgba(250,77,86,0.3)' }
    };
    this.isRaceRunning = false;
    this.raceTarget = 11;
    this.render();
  }

  render() {
    const container = document.getElementById('algorithm-cards-container');
    if (!container) return;
    container.innerHTML = '';

    // 1. Classical vs Quantum Benchmark Race Card
    const raceCard = this.buildRaceBenchmarkCard();
    container.appendChild(raceCard);

    // 2. Category Filter Bar
    const filterBar = document.createElement('div');
    filterBar.className = 'algo-filter-bar';
    filterBar.innerHTML = '<span class="algo-filter-label">Filter by Category:</span>';

    const grid = document.createElement('div');
    grid.className = 'algo-cards-grid';
    grid.id = 'algo-cards-grid';

    this.categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'algo-cat-chip' + (cat === this.currentCategory ? ' active' : '');
      chip.textContent = cat;
      chip.addEventListener('click', () => {
        this.currentCategory = cat;
        filterBar.querySelectorAll('.algo-cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderCards(grid);
      });
      filterBar.appendChild(chip);
    });
    container.appendChild(filterBar);

    // 3. Stats Bar
    const statsBar = document.createElement('div');
    statsBar.className = 'algo-stats-bar';
    statsBar.innerHTML =
      '<div class="algo-stat"><span class="algo-stat-num">' + ALGORITHM_CATALOG.length + '</span><span class="algo-stat-lbl">Total Algorithms</span></div>' +
      '<div class="algo-stat"><span class="algo-stat-num">' + (this.categories.length - 1) + '</span><span class="algo-stat-lbl">Categories</span></div>' +
      '<div class="algo-stat"><span class="algo-stat-num">100%</span><span class="algo-stat-lbl">Interactive Tours Included</span></div>';
    container.appendChild(statsBar);

    container.appendChild(grid);
    this.renderCards(grid);
    this.bindRaceEvents();
  }

  buildRaceBenchmarkCard() {
    const card = document.createElement('div');
    card.className = 'quantum-race-card';
    card.innerHTML = `
      <div class="race-header">
        <div class="race-title-group">
          <span class="race-badge">⚡ Quantum Speedup Benchmark</span>
          <h3>Classical vs Quantum Search Race</h3>
          <p>Unsorted database of N = 16 items. Watch classical linear search O(N) struggle against Grover's quantum wave search O(√N).</p>
        </div>
        <button id="btn-start-race" class="btn-start-race">Start Benchmark Race 🏁</button>
      </div>

      <div class="race-tracks-grid">
        <!-- Classical Track -->
        <div class="race-track-box">
          <div class="track-header">
            <span class="track-tag classical">Classical CPU: O(N)</span>
            <span id="classical-counter" class="track-counter">Step: 0 / 16 (0 queries)</span>
          </div>
          <div class="track-bar-bg">
            <div id="classical-bar-fill" class="track-bar-fill classical" style="width: 0%;"></div>
          </div>
          <div class="track-items-row" id="classical-items-row">
            ${Array.from({length: 16}, (_, i) => `<span class="db-item-chip" id="c-item-${i}">#${i}</span>`).join('')}
          </div>
        </div>

        <!-- Quantum Track -->
        <div class="race-track-box">
          <div class="track-header">
            <span class="track-tag quantum">Quantum QPU (Grover): O(√N)</span>
            <span id="quantum-counter" class="track-counter">Iteration: 0 / 3 (Target locked)</span>
          </div>
          <div class="track-bar-bg">
            <div id="quantum-bar-fill" class="track-bar-fill quantum" style="width: 0%;"></div>
          </div>
          <div class="track-items-row" id="quantum-items-row">
            ${Array.from({length: 16}, (_, i) => `<span class="db-item-chip quantum" id="q-item-${i}">#${i}</span>`).join('')}
          </div>
        </div>
      </div>

      <div id="race-verdict" class="race-verdict-box" style="display: none;">
        <strong>🚀 Quantum Victory:</strong> Grover's search amplified target #11 in <strong>3 quantum queries</strong>, while classical search needed <strong>12 queries</strong> (4x faster)!
      </div>
    `;
    return card;
  }

  bindRaceEvents() {
    const btn = document.getElementById('btn-start-race');
    if (!btn) return;
    btn.addEventListener('click', () => this.runRace());
  }

  runRace() {
    if (this.isRaceRunning) return;
    this.isRaceRunning = true;
    const btn = document.getElementById('btn-start-race');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Racing...';
    }

    const verdict = document.getElementById('race-verdict');
    if (verdict) verdict.style.display = 'none';

    // Reset items
    for (let i = 0; i < 16; i++) {
      const c = document.getElementById(`c-item-${i}`);
      const q = document.getElementById(`q-item-${i}`);
      if (c) c.className = 'db-item-chip';
      if (q) q.className = 'db-item-chip quantum';
    }

    const cFill = document.getElementById('classical-bar-fill');
    const qFill = document.getElementById('quantum-bar-fill');
    const cCount = document.getElementById('classical-counter');
    const qCount = document.getElementById('quantum-counter');

    let cStep = 0;
    const target = 11;

    // Quantum Grover runs in 3 steps
    setTimeout(() => {
      if (qCount) qCount.textContent = 'Iteration 1/3: Hadamard Superposition across all 16 items';
      if (qFill) qFill.style.width = '33%';
      for (let i = 0; i < 16; i++) {
        const el = document.getElementById(`q-item-${i}`);
        if (el) el.classList.add('q-superposed');
      }
    }, 400);

    setTimeout(() => {
      if (qCount) qCount.textContent = 'Iteration 2/3: Oracle phase mark on target #11';
      if (qFill) qFill.style.width = '66%';
      const el = document.getElementById(`q-item-${target}`);
      if (el) el.classList.add('q-marked');
    }, 1100);

    setTimeout(() => {
      if (qCount) qCount.textContent = 'Iteration 3/3: Wave Interference Amplification complete (96% probability!)';
      if (qFill) qFill.style.width = '100%';
      const el = document.getElementById(`q-item-${target}`);
      if (el) el.classList.add('q-found');
    }, 1800);

    // Classical sequential search steps
    const cInterval = setInterval(() => {
      if (cStep <= target) {
        const prev = document.getElementById(`c-item-${cStep - 1}`);
        if (prev) prev.classList.remove('checking');
        const cur = document.getElementById(`c-item-${cStep}`);
        if (cur) cur.classList.add('checking');

        cStep++;
        const pct = (cStep / 16) * 100;
        if (cFill) cFill.style.width = `${pct}%`;
        if (cCount) cCount.textContent = `Checking box #${cStep - 1}... (query ${cStep})`;

        if (cStep > target) {
          clearInterval(cInterval);
          if (cur) cur.classList.add('found');
          if (cCount) cCount.textContent = `Found target #${target} after ${target + 1} queries!`;
          this.isRaceRunning = false;
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Re-Run Benchmark Race 🏁';
          }
          if (verdict) {
            verdict.style.display = 'block';
            verdict.innerHTML = `<strong>🚀 Quantum Advantage Demonstrated:</strong> Grover's quantum wave search amplified target #${target} in <strong>3 queries</strong>, while classical CPU required <strong>${target + 1} queries</strong> (~${((target + 1)/3).toFixed(1)}x speedup)!`;
          }
        }
      }
    }, 280);
  }

  renderCards(grid) {
    grid.innerHTML = '';
    const filtered = this.currentCategory === 'All'
      ? ALGORITHM_CATALOG
      : ALGORITHM_CATALOG.filter(a => a.category === this.currentCategory);

    filtered.forEach(algo => {
      const diff = this.difficultyColors[algo.difficulty] || this.difficultyColors['Beginner'];
      const card = document.createElement('div');
      card.className = 'algo-card';

      card.innerHTML =
        '<div class="algo-card-top">' +
          '<div class="algo-header-row">' +
            '<div class="algo-category-tag">' + algo.category + '</div>' +
            '<span class="algo-difficulty-badge" style="color:' + diff.text + ';background:' + diff.bg + ';border:1px solid ' + diff.border + ';">' + algo.difficulty + '</span>' +
          '</div>' +
          '<h3 class="algo-title">' + algo.title + '</h3>' +
          '<span class="algo-subtitle">' + algo.subtitle + '</span>' +
        '</div>' +
        '<div class="algo-card-body">' +
          '<p class="algo-desc">' + algo.desc + '</p>' +
          '<div class="algo-math-box"><span class="algo-math-label">Math</span><code class="algo-math-text">' + algo.math + '</code></div>' +
          '<div class="algo-real-world"><span class="algo-rw-label">Real World</span><p class="algo-rw-text">' + algo.realWorld + '</p></div>' +
        '</div>' +
        '<div class="algo-circuit-preview"><div class="circuit-preview-label">Circuit Preview</div>' + this.buildMiniCircuit(algo.grid) + '</div>' +
        '<div class="algo-card-actions">' +
          '<div class="algo-tags-row">' + algo.tags.map(t => '<span class="algo-tag">' + t + '</span>').join('') + '</div>' +
          '<div class="algo-btn-group">' +
            '<button class="btn-tour-algo" data-algo-id="' + algo.id + '">🎓 Guided Tour</button>' +
            '<button class="btn-run-in-sim" data-algo-id="' + algo.id + '">▶ Run in Simulator</button>' +
          '</div>' +
        '</div>';

      card.querySelector('.btn-run-in-sim').addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadIntoSimulator(algo, false);
      });

      card.querySelector('.btn-tour-algo').addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadIntoSimulator(algo, true);
      });

      grid.appendChild(card);
    });
  }

  buildMiniCircuit(grid) {
    const gc = { H:'#f97316', X:'#ef4444', Y:'#ec4899', Z:'#8b5cf6', S:'#06b6d4', T:'#0ea5e9', M:'#64748b', CX_CTRL:'#6366f1', CX_TGT:'#6366f1' };
    const gl = { H:'H', X:'X', Y:'Y', Z:'Z', S:'S', T:'T', M:'M', CX_CTRL:'●', CX_TGT:'⊕' };
    let html = '<div class="mini-circuit-grid">';
    grid.forEach((row, r) => {
      html += '<div class="mini-circuit-row"><span class="mini-wire-label">q' + r + '</span><div class="mini-wire-line">';
      row.forEach(g => {
        if (g) {
          const c = gc[g] || '#6b7280';
          html += '<span class="mini-gate" style="background:' + c + '20;border:1px solid ' + c + ';color:' + c + ';" title="' + g + '">' + (gl[g] || g) + '</span>';
        } else {
          html += '<span class="mini-wire-gap"></span>';
        }
      });
      html += '</div></div>';
    });
    return html + '</div>';
  }

  loadIntoSimulator(algo, startTour = false) {
    if (!window.circuitUI) return;
    if (window.circuitUI.loadCircuit) {
      window.circuitUI.loadCircuit(algo.grid);
    } else {
      window.circuitUI.grid = algo.grid.map(row => [...row]);
      if (window.circuitUI.renderGrid) window.circuitUI.renderGrid();
      if (window.circuitUI.updateSimulation) window.circuitUI.updateSimulation();
    }

    if (startTour && window.circuitUI.startAlgorithmTour) {
      window.circuitUI.startAlgorithmTour(algo);
    }

    const simTab = document.querySelector('[data-tab="simulator"]');
    if (simTab) simTab.click();
    this.showLoadBanner(algo.title, algo.math);
  }

  showLoadBanner(title, math) {
    const ex = document.getElementById('algo-load-banner');
    if (ex) ex.remove();
    const b = document.createElement('div');
    b.id = 'algo-load-banner';
    b.className = 'algo-load-banner';
    b.innerHTML = '<div class="banner-icon">🔬</div><div class="banner-text"><strong>' + title + '</strong><code>' + math + '</code></div>';
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('banner-show'), 20);
    setTimeout(() => { b.classList.remove('banner-show'); setTimeout(() => b.remove(), 400); }, 4000);
  }
}

// ============================================================
// MISSION MANAGER
// ============================================================
// ============================================================
// MISSION MANAGER (Persistent, Gamified, Real-Time Evaluated)
// ============================================================
class MissionManager {
  constructor() {
    // Load solved mission IDs from localStorage (v2 clean storage)
    if (!localStorage.getItem('ananta_completed_missions_v2')) {
      localStorage.removeItem('ananta_completed_missions');
      localStorage.setItem('ananta_completed_missions_v2', '[]');
      localStorage.setItem('ananta_xp', '0');
    }
    const savedCompleted = JSON.parse(localStorage.getItem('ananta_completed_missions_v2') || '[]');

    this.missions = [
      {
        id: 1,
        tier: 'beginner',
        level: 'Easy',
        xp: 50,
        title: 'The Quantum Coin Flip',
        targetState: '|ψ⟩ = (|000⟩ + |100⟩) / √2',
        desc: 'Put Qubit 0 into a 50/50 equal superposition using a single Hadamard (H) gate.',
        hint: "Drag the 'H' gate from the palette onto Qubit 0, column 1.",
        preset: null,
        check: (grid, probs) => {
          const hasH = grid[0] && grid[0].some(g => g === 'H');
          const p000 = probs.find(p => p.index === 0)?.probability || 0;
          const p100 = probs.find(p => p.index === 4)?.probability || 0;
          return hasH && Math.abs(p000 - 0.5) < 0.08 && Math.abs(p100 - 0.5) < 0.08;
        },
        completed: savedCompleted.includes(1)
      },
      {
        id: 2,
        tier: 'beginner',
        level: 'Easy',
        xp: 75,
        title: 'Spooky Bell Entanglement',
        targetState: '|Φ⁺⟩ = (|000⟩ + |110⟩) / √2',
        desc: 'Synthesize a maximally entangled Einstein-Podolsky-Rosen (EPR) Bell state across Qubits 0 and 1.',
        hint: "Place 'H' on Qubit 0, then a CNOT gate with Qubit 0 as control (CX_CTRL) and Qubit 1 as target (CX_TGT).",
        preset: null,
        check: (grid, probs) => {
          const hasH = grid[0] && grid[0].some(g => g === 'H');
          const hasCX = grid[0] && grid[0].some((g, c) => g === 'CX_CTRL' && grid[1] && grid[1][c] === 'CX_TGT');
          const p000 = probs.find(p => p.index === 0)?.probability || 0;
          const p110 = probs.find(p => p.index === 6)?.probability || 0;
          return hasH && hasCX && p000 > 0.38 && p110 > 0.38 && (p000 + p110) > 0.9;
        },
        completed: savedCompleted.includes(2)
      },
      {
        id: 3,
        tier: 'beginner',
        level: 'Easy',
        xp: 50,
        title: 'The Quantum NOT Gate',
        targetState: '|ψ⟩ = |100⟩',
        desc: 'Flip Qubit 0 from ground state |0⟩ to excited state |1⟩ using a Pauli-X bit-flip gate.',
        hint: "Drag the 'X' gate onto Qubit 0.",
        preset: null,
        check: (grid, probs) => {
          const hasX = grid[0] && grid[0].some(g => g === 'X');
          const p100 = probs.find(p => p.index === 4)?.probability || 0;
          return hasX && p100 > 0.95;
        },
        completed: savedCompleted.includes(3)
      },
      {
        id: 4,
        tier: 'intermediate',
        level: 'Medium',
        xp: 100,
        title: 'Interference Cancellation (Self-Inverse)',
        targetState: '|ψ⟩ = |000⟩ with 100% certainty',
        desc: 'Prove that the Hadamard gate is unitary and Hermitian (H² = I) by applying H twice on Qubit 0.',
        hint: "Place 'H' in column 1 and another 'H' in column 2 on Qubit 0. Notice amplitudes cancel out on |100⟩!",
        preset: null,
        check: (grid, probs) => {
          const hCount = (grid[0] || []).filter(g => g === 'H').length;
          const p000 = probs.find(p => p.index === 0)?.probability || 0;
          return hCount >= 2 && p000 > 0.95;
        },
        completed: savedCompleted.includes(4)
      },
      {
        id: 5,
        tier: 'intermediate',
        level: 'Medium',
        xp: 125,
        title: 'GHZ Tripartite Entanglement',
        targetState: '|GHZ⟩ = (|000⟩ + |111⟩) / √2',
        desc: 'Entangle all 3 qubits into a Greenberger-Horne-Zeilinger (GHZ) macroscopic superposition.',
        hint: "H on q0, CNOT from q0 to q1, then CNOT from q1 to q2.",
        preset: null,
        check: (grid, probs) => {
          const p000 = probs.find(p => p.index === 0)?.probability || 0;
          const p111 = probs.find(p => p.index === 7)?.probability || 0;
          return p000 > 0.38 && p111 > 0.38 && (p000 + p111) > 0.9;
        },
        completed: savedCompleted.includes(5)
      },
      {
        id: 6,
        tier: 'intermediate',
        level: 'Medium',
        xp: 100,
        title: 'Phase Alchemist',
        targetState: '|ψ⟩ = (|000⟩ + e^(iπ/4) |100⟩) / √2',
        desc: 'Apply a T gate (π/8 phase rotation) to Qubit 0 in superposition without disturbing measurement probabilities.',
        hint: "Place 'H' on Qubit 0, followed by 'T' on Qubit 0. The probability remains 50/50 while the complex phase rotates 45°!",
        preset: null,
        check: (grid, probs) => {
          const hasH = grid[0] && grid[0].some(g => g === 'H');
          const hasT = grid[0] && grid[0].some(g => g === 'T');
          const p000 = probs.find(p => p.index === 0)?.probability || 0;
          return hasH && hasT && Math.abs(p000 - 0.5) < 0.08;
        },
        completed: savedCompleted.includes(6)
      },
      {
        id: 7,
        tier: 'advanced',
        level: 'Hard',
        xp: 150,
        title: 'W-State Tri-Superposition',
        targetState: '|W⟩ = (|100⟩ + |010⟩ + |001⟩) / √3',
        desc: 'Construct a state where exactly one photon/excitation is shared equally among 3 qubits.',
        hint: "Rotate q0, conditionally transfer excitation to q1, then to q2 using controlled gates.",
        preset: null,
        check: (grid, probs) => {
          const p100 = probs.find(p => p.index === 4)?.probability || 0;
          const p010 = probs.find(p => p.index === 2)?.probability || 0;
          const p001 = probs.find(p => p.index === 1)?.probability || 0;
          return p100 > 0.25 && p010 > 0.25 && p001 > 0.25 && (p100 + p010 + p001) > 0.85;
        },
        completed: savedCompleted.includes(7)
      },
      {
        id: 8,
        tier: 'advanced',
        level: 'Hard',
        xp: 200,
        title: 'Grover Diffusion Inversion',
        targetState: 'Full constructive interference on target state',
        desc: 'Apply the Grover Diffusion Operator (H ⊗ X ⊗ CZ ⊗ X ⊗ H) to reflect state amplitudes around their mean.',
        hint: "Invert amplitudes by sandwiching multi-qubit phase gates between Hadamard layers.",
        preset: null,
        check: (grid, probs) => {
          const active = probs.filter(p => p.probability > 0.7);
          return grid.some(r => r.filter(g => g === 'H').length >= 2) && active.length === 1;
        },
        completed: savedCompleted.includes(8)
      }
    ];

    this.activeMission = parseInt(localStorage.getItem('ananta_active_mission') || '0', 10);
    if (this.activeMission >= this.missions.length) this.activeMission = 0;
    this.currentFilter = 'all';
    this.hudDismissed = localStorage.getItem('ananta_hud_dismissed') === 'true';

    this.renderMissions();
    this.updateInSimChallengeBanner();
  }

  renderMissions() {
    const listEl = document.getElementById('missions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = this.missions.filter(m => {
      if (this.currentFilter === 'all') return true;
      return m.tier === this.currentFilter;
    });

    filtered.forEach((m) => {
      const globalIdx = this.missions.findIndex(item => item.id === m.id);
      const isCurrentActive = globalIdx === this.activeMission;
      const card = document.createElement('div');
      card.className = `puzzle-card ${m.completed ? 'puzzle-solved' : ''} ${isCurrentActive ? 'puzzle-active-focus' : ''}`;

      card.innerHTML = `
        <div class="puzzle-card-top">
          <div class="puzzle-tier-group">
            <span class="puzzle-tier-badge tier-${m.tier}">${m.level}</span>
            <span class="puzzle-xp-chip">+${m.xp} XP</span>
          </div>
          <span class="puzzle-status-pill ${m.completed ? 'status-done' : 'status-pending'}">
            ${m.completed ? '✓ Solved' : 'Unsolved'}
          </span>
        </div>

        <h3 class="puzzle-title">${m.title}</h3>
        <p class="puzzle-desc">${m.desc}</p>

        <div class="puzzle-target-box">
          <span class="target-box-label">Target Statevector:</span>
          <code class="target-math-code">${m.targetState}</code>
        </div>

        <details class="puzzle-hint-details">
          <summary>💡 Need a Hint?</summary>
          <p>${m.hint}</p>
        </details>

        <div class="puzzle-card-actions">
          <button class="btn-attempt-puzzle ${isCurrentActive ? 'btn-attempt-active' : ''}">
            ${m.completed ? 'Re-test in Composer ↺' : (isCurrentActive ? 'Currently Active in Composer ⚡' : 'Attempt in Composer →')}
          </button>
          <button class="btn-check-puzzle" title="Test if current circuit in Composer solves this puzzle">
            Verify Circuit 🔍
          </button>
        </div>
      `;

      // Handle Attempt Button
      card.querySelector('.btn-attempt-puzzle').addEventListener('click', () => {
        this.activeMission = globalIdx;
        localStorage.setItem('ananta_active_mission', this.activeMission.toString());
        this.hudDismissed = false;
        localStorage.removeItem('ananta_hud_dismissed');
        this.renderMissions();
        this.updateInSimChallengeBanner(true);

        // Switch to simulator view
        const t = document.querySelector('[data-tab="simulator"]');
        if (t) t.click();
        else if (window.switchView) window.switchView('simulator');
      });

      // Handle Immediate Verification Button
      card.querySelector('.btn-check-puzzle').addEventListener('click', () => {
        if (!window.circuitUI || !window.circuitUI.engine) {
          alert('Composer not initialized yet. Open the Composer tab first.');
          return;
        }
        const probs = window.circuitUI.engine.getProbabilities();
        const grid = window.circuitUI.grid;
        if (m.check(grid, probs)) {
          this.markMissionSolved(m);
        } else {
          this.showFailNotification(m.title);
        }
      });

      listEl.appendChild(card);
    });

    this.updateProgressBar();
  }

  setFilter(tier) {
    this.currentFilter = tier;
    document.querySelectorAll('.puzzle-filter-btn').forEach(btn => {
      if (btn.dataset.tier === tier) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    this.renderMissions();
  }

  evaluate(grid, probs) {
    if (!grid || !probs) return;
    // Passive update only refreshes HUD banner state without auto-completing missions
    this.updateInSimChallengeBanner();
  }

  markMissionSolved(m) {
    m.completed = true;

    // Persist solved IDs in clean v2 storage
    const saved = JSON.parse(localStorage.getItem('ananta_completed_missions_v2') || '[]');
    if (!saved.includes(m.id)) {
      saved.push(m.id);
      localStorage.setItem('ananta_completed_missions_v2', JSON.stringify(saved));
    }

    // Award XP
    let currentXp = parseInt(localStorage.getItem('ananta_xp') || '0', 10);
    currentXp += m.xp;
    localStorage.setItem('ananta_xp', currentXp.toString());

    // Update global counters if available
    const xpCounter = document.getElementById('player-xp-counter');
    if (xpCounter) xpCounter.textContent = `${currentXp} XP`;

    this.showSuccessNotification(m.title, m.xp);
    this.renderMissions();
    this.updateInSimChallengeBanner();
  }

  // Explicit verification triggered by "Verify Circuit 🔍" button
  verifyActiveMission() {
    if (!window.circuitUI || !window.circuitUI.engine) {
      this.showToastNotification('⚠️ Circuit engine not ready. Please place a gate on the canvas first.', 'warn');
      return;
    }

    const grid = window.circuitUI.grid;
    const probs = window.circuitUI.engine.getProbabilities();
    const m = this.missions[this.activeMission];

    if (!m) {
      this.showToastNotification('ℹ️ No active challenge selected. Open Puzzle Arena to choose a challenge!', 'info');
      return;
    }

    const isMatch = m.check(grid, probs);
    if (isMatch) {
      if (!m.completed) {
        this.markMissionSolved(m);
      } else {
        this.showSuccessNotification(m.title, 0);
      }
    } else {
      this.showFailNotification(m.title);
    }
  }

  dismissChallengeBanner() {
    const banner = document.getElementById('composer-challenge-hud');
    if (banner) banner.style.display = 'none';
    this.hudDismissed = true;
    localStorage.setItem('ananta_hud_dismissed', 'true');
  }

  showSuccessNotification(title, xpAwarded = 50) {
    const t = document.createElement('div');
    t.className = 'mission-toast mission-toast-success';
    t.innerHTML = `
      <div class="toast-icon">🏆</div>
      <div class="toast-text-box">
        <strong>✓ Verified! Puzzle Solved: ${title}!</strong>
        <span>${xpAwarded > 0 ? `+${xpAwarded} XP awarded to your Quantum Mastery score!` : 'Circuit successfully reproduces the target quantum state!'}</span>
      </div>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 20);
    setTimeout(() => {
      t.classList.remove('toast-show');
      setTimeout(() => t.remove(), 400);
    }, 4500);
  }

  showFailNotification(title) {
    const m = this.missions[this.activeMission];
    const targetState = m ? m.targetState : '';
    const currentDirac = (window.circuitUI && window.circuitUI.engine) ? window.circuitUI.engine.getDiracNotation() : '';

    const t = document.createElement('div');
    t.className = 'mission-toast mission-toast-fail';
    t.innerHTML = `
      <div class="toast-icon">⚠️</div>
      <div class="toast-text-box">
        <strong>Verification Failed: ${title}</strong>
        <span>Target: <code>${targetState}</code> | Current Output: <code>${currentDirac}</code></span>
        <span style="font-size:11px; color:#94a3b8; margin-top:2px;">Hint: ${m ? m.hint : 'Read the puzzle hint in Puzzle Arena.'}</span>
      </div>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 20);
    setTimeout(() => {
      t.classList.remove('toast-show');
      setTimeout(() => t.remove(), 400);
    }, 5500);
  }

  showToastNotification(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `mission-toast mission-toast-${type}`;
    t.innerHTML = `
      <div class="toast-icon">${type === 'warn' ? '⚠️' : 'ℹ️'}</div>
      <div class="toast-text-box">
        <span>${msg}</span>
      </div>
    `;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 20);
    setTimeout(() => {
      t.classList.remove('toast-show');
      setTimeout(() => t.remove(), 400);
    }, 4000);
  }

  updateProgressBar() {
    const solvedCount = this.missions.filter(m => m.completed).length;
    const totalCount = this.missions.length;
    const pct = (solvedCount / totalCount) * 100;

    const fillBar = document.getElementById('missions-progress-fill');
    const label = document.getElementById('missions-progress-label');
    const badgeLabel = document.getElementById('challenges-rank-label');

    if (fillBar) fillBar.style.width = `${pct}%`;
    if (label) label.textContent = `${solvedCount} / ${totalCount} Solved (${pct.toFixed(0)}%)`;

    // Dynamic Rank Determination
    if (badgeLabel) {
      if (solvedCount === totalCount) badgeLabel.textContent = 'Grand Quantum Grandmaster 👑';
      else if (solvedCount >= 6) badgeLabel.textContent = 'Quantum Algorithm Engineer ⚡';
      else if (solvedCount >= 4) badgeLabel.textContent = 'Entanglement Apprentice 🔗';
      else if (solvedCount >= 2) badgeLabel.textContent = 'Superposition Pioneer ✨';
      else badgeLabel.textContent = 'Novice Quantum Observer 🔬';
    }
  }

  resetProgress() {
    if (!confirm('Are you sure you want to reset all puzzle progress to 0 / 8?')) return;
    localStorage.removeItem('ananta_completed_missions');
    localStorage.setItem('ananta_completed_missions_v2', '[]');
    localStorage.setItem('ananta_xp', '0');
    this.missions.forEach(m => m.completed = false);
    const xpCounter = document.getElementById('player-xp-counter');
    if (xpCounter) xpCounter.textContent = '0 XP';
    this.renderMissions();
    this.updateInSimChallengeBanner();
  }

  // Active Challenge HUD in Composer
  updateInSimChallengeBanner(force = false) {
    const banner = document.getElementById('composer-challenge-hud');
    if (!banner) return;

    if (!force && this.hudDismissed) {
      banner.style.display = 'none';
      return;
    }

    const m = this.missions[this.activeMission];
    if (!m) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    const titleEl = document.getElementById('hud-challenge-title');
    const targetEl = document.getElementById('hud-challenge-target');
    const statusBadge = document.getElementById('hud-challenge-status');

    if (titleEl) titleEl.textContent = `Active Challenge: ${m.title}`;
    if (targetEl) targetEl.textContent = m.targetState;
    if (statusBadge) {
      if (m.completed) {
        statusBadge.textContent = '✓ Solved';
        statusBadge.className = 'hud-badge hud-badge-solved';
      } else {
        statusBadge.textContent = 'In Progress';
        statusBadge.className = 'hud-badge hud-badge-pending';
      }
    }
  }
}


// loadCircuit patch
document.addEventListener('DOMContentLoaded', () => {
  if (window.circuitUI && !window.circuitUI.loadCircuit) {
    window.circuitUI.loadCircuit = function(grid) {
      this.grid = grid.map(row => [...row]);
      if (this.renderGrid) this.renderGrid();
      if (this.updateSimulation) this.updateSimulation();
    };
  }
});

window.ALGORITHM_CATALOG = ALGORITHM_CATALOG;
window.AlgorithmLibrary = AlgorithmLibrary;
window.MissionManager = MissionManager;
