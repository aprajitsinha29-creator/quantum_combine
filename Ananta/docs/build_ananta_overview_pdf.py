"""
Ananta Quantum Studio - complete platform document.

Opens with why the platform exists and the classical/quantum difference,
then walks the whole product end to end, one capability per page.

Style: landscape, dark, large type, very little text per page - the diagram
carries the explanation.
"""
import math
import os
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

W, H = landscape(A4)  # 842 x 595

BG     = HexColor("#0B1220")
PANEL  = HexColor("#131E31")
INK    = HexColor("#E9F0FA")
DIM    = HexColor("#8FA3BF")
FAINT  = HexColor("#5C718F")
CYAN   = HexColor("#38BDF8")
VIOLET = HexColor("#A855F7")
GREEN  = HexColor("#34D399")
AMBER  = HexColor("#FBBF24")
ROSE   = HexColor("#FB7185")
LINE   = HexColor("#26374F")

M = 52          # page margin
_page = {"n": 0}


# --------------------------------------------------------------- primitives
def bg(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)


def header(c, title, subtitle, accent, number=None):
    if number is not None:
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(M, H - M - 4, f"{number:02d}")
        tx = M + 32
    else:
        tx = M

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 27)
    c.drawString(tx, H - M - 8, title)

    c.setFillColor(DIM)
    c.setFont("Helvetica", 13.5)
    c.drawString(tx, H - M - 30, subtitle)

    c.setStrokeColor(accent)
    c.setLineWidth(2.2)
    c.line(M, H - M - 45, M + 70, H - M - 45)


def notes(c, lines, accent, y=92):
    for text in lines:
        c.setFillColor(accent)
        c.circle(M + 4, y + 4.5, 3.1, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 12.5)
        c.drawString(M + 18, y, text)
        y -= 25


def stamp(c, text, color=GREEN):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(W - M, 34, text)


def box(c, x, y, w, h, label, sub=None, color=CYAN, lsize=12.5, ssize=9.5, fill=PANEL):
    c.setFillColor(fill)
    c.setStrokeColor(color)
    c.setLineWidth(1.4)
    c.roundRect(x, y, w, h, 6, stroke=1, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", lsize)
    if sub:
        c.drawCentredString(x + w / 2, y + h / 2 + 3.5, label)
        c.setFillColor(DIM)
        c.setFont("Helvetica", ssize)
        c.drawCentredString(x + w / 2, y + h / 2 - 10, sub)
    else:
        c.drawCentredString(x + w / 2, y + h / 2 - 4, label)


def arrow(c, x1, y1, x2, y2, color=FAINT, width=1.4, dashed=False):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    if dashed:
        c.setDash(4, 3)
    c.line(x1, y1, x2, y2)
    c.setDash()
    ang = math.atan2(y2 - y1, x2 - x1)
    s = 6.5
    c.setFillColor(color)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - s * math.cos(ang - 0.42), y2 - s * math.sin(ang - 0.42))
    p.lineTo(x2 - s * math.cos(ang + 0.42), y2 - s * math.sin(ang + 0.42))
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def flow(c, y, items, accent, h=62, gap=34, x0=M, total=None):
    """Left-to-right pipeline of (label, sub) boxes joined by arrows."""
    total = total or (W - 2 * M)
    n = len(items)
    bw = (total - gap * (n - 1)) / n
    for i, (label, sub) in enumerate(items):
        x = x0 + i * (bw + gap)
        box(c, x, y, bw, h, label, sub, accent)
        if i < n - 1:
            arrow(c, x + bw + 5, y + h / 2, x + bw + gap - 5, y + h / 2)
    return bw


def panel(c, x, y, w, h, title, lines, accent, title_size=10.5, line_size=11.5, lead=19):
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, 7, stroke=1, fill=1)
    ty = y + h - 22
    if title:
        c.setFillColor(accent)
        c.setFont("Helvetica-Bold", title_size)
        c.drawString(x + 16, ty, title)
        ty -= 22
    c.setFillColor(INK)
    c.setFont("Helvetica", line_size)
    for ln in lines:
        c.drawString(x + 16, ty, ln)
        ty -= lead


def chips(c, y, items, accent, h=44, gap=14, x0=M, total=None, lsize=11.5, ssize=8.8):
    total = total or (W - 2 * M)
    n = len(items)
    bw = (total - gap * (n - 1)) / n
    for i, it in enumerate(items):
        label, sub = it if isinstance(it, tuple) else (it, None)
        box(c, x0 + i * (bw + gap), y, bw, h, label, sub, accent, lsize=lsize, ssize=ssize)


def endpage(c):
    _page["n"] += 1
    c.setFillColor(FAINT)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W / 2, 20, f"Ananta Quantum Studio   |   {_page['n']}")
    c.showPage()


# ------------------------------------------------------------------- pages
def p_cover(c):
    bg(c)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, H - 96, "SMART INDIA HACKATHON  -  PROBLEM STATEMENT 26140")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 54)
    c.drawString(M, H - 164, "Ananta Quantum Studio")

    c.setFillColor(DIM)
    c.setFont("Helvetica", 18)
    c.drawString(M, H - 198, "A complete quantum computing workspace that runs in the browser")

    c.setStrokeColor(VIOLET)
    c.setLineWidth(3)
    c.line(M, H - 222, M + 160, H - 222)

    cols = [
        ("BUILD", ["Circuit composer", "Real statevector engine", "3D Bloch sphere"], CYAN),
        ("UNDERSTAND", ["AI circuit tutor", "Time-travel debugger", "18-module curriculum"], VIOLET),
        ("DEPLOY", ["5-framework export", "Hardware topology check", "Real QPU bridge"], GREEN),
    ]
    for i, (head, items, col) in enumerate(cols):
        x = M + i * 262
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x, H - 268, head)
        c.setFillColor(INK)
        c.setFont("Helvetica", 13)
        for j, it in enumerate(items):
            c.drawString(x, H - 294 - j * 22, it)

    c.setFillColor(FAINT)
    c.setFont("Helvetica", 11)
    c.drawString(M, 58, "From first principles to real hardware - this document walks the entire platform.")
    endpage(c)


def p_need(c):
    bg(c)
    header(c, "Why Ananta Exists", "Quantum computing is arriving faster than people can be trained for it", ROSE, 1)

    problems = [
        ("Invisible physics", "Superposition and entanglement are matrix algebra on paper. Nothing shows a learner what the state is actually doing."),
        ("Fragmented tooling", "Qiskit, Cirq, Braket and PennyLane each need their own install, syntax and mental model before a single circuit runs."),
        ("No feedback", "Build a wrong circuit and nothing tells you why. Errors are silent; the output is simply not what you expected."),
        ("Hardware out of reach", "Real QPUs are scarce, queued and billed per shot - so experimentation stops before it starts."),
    ]
    y = 400
    for i, (t, d) in enumerate(problems):
        c.setFillColor(ROSE)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(M, y, t)
        c.setFillColor(DIM)
        c.setFont("Helvetica", 11.5)
        c.drawString(M + 150, y, d)
        y -= 34

    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(M, 238, W - M, 238)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(M, 208, "ANANTA'S ANSWER")
    c.setFillColor(INK)
    c.setFont("Helvetica", 15)
    c.drawString(M, 180, "One browser workspace where you build a circuit, watch the real physics respond, get told")
    c.drawString(M, 156, "what is wrong with it, and export or run it on actual quantum hardware.")

    chips(c, 92, [("Build", "no install"), ("See", "live physics"), ("Learn", "AI + curriculum"),
                  ("Export", "5 frameworks"), ("Run", "real QPU")], GREEN, h=42)
    endpage(c)


def p_classical_vs_quantum(c):
    bg(c)
    header(c, "Classical vs Quantum", "Why a quantum computer is a different machine, not a faster one", CYAN, 2)

    # left: classical
    c.setFillColor(PANEL)
    c.setStrokeColor(FAINT)
    c.setLineWidth(1.3)
    c.roundRect(M, 262, 366, 176, 8, stroke=1, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M + 20, 412, "CLASSICAL BIT")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(M + 20, 372, "0   or   1")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 12)
    c.drawString(M + 20, 342, "One definite value at a time.")
    c.drawString(M + 20, 320, "n bits hold exactly one of 2^n")
    c.drawString(M + 20, 300, "possible patterns.")
    c.setFillColor(FAINT)
    c.setFont("Courier-Bold", 12)
    c.drawString(M + 20, 276, "8 bits  ->  1 of 256")

    # right: quantum
    qx = M + 402
    c.setFillColor(PANEL)
    c.setStrokeColor(CYAN)
    c.setLineWidth(1.5)
    c.roundRect(qx, 262, 366, 176, 8, stroke=1, fill=1)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(qx + 20, 412, "QUBIT")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(qx + 20, 372, "a|0> + b|1>")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 12)
    c.drawString(qx + 20, 342, "Both values at once, with amplitude")
    c.drawString(qx + 20, 322, "and phase. n qubits carry all 2^n")
    c.drawString(qx + 20, 302, "amplitudes simultaneously.")
    c.setFillColor(CYAN)
    c.setFont("Courier-Bold", 12)
    c.drawString(qx + 20, 276, "8 qubits ->  all 256 at once")

    # three quantum properties
    chips(c, 176, [("Superposition", "many states at once"),
                   ("Entanglement", "correlation with no classical analogue"),
                   ("Interference", "cancels wrong answers - the actual source of speedup")],
          VIOLET, h=52, lsize=12.5, ssize=9)

    notes(c, [
        "The speedup is not raw speed - it is interference arranging amplitudes so wrong answers cancel out.",
        "Simulating n qubits classically costs 2^n amplitudes, which is exactly why real QPUs matter beyond ~40.",
    ], CYAN, y=118)
    endpage(c)


def p_platform_map(c):
    bg(c)
    header(c, "The Platform at a Glance", "Everything in Ananta, and how the layers fit together", VIOLET, 3)

    layers = [
        ("LEARN", ["18-module curriculum", "Roadmap Studio", "Intuition Lab", "Concept Doctor", "Research Archive"], AMBER),
        ("BUILD", ["Circuit Composer", "Quantum Engine", "Bloch Sphere", "Time-Travel Debugger", "Voice Copilot"], CYAN),
        ("ANALYSE", ["AI Circuit Tutor", "Optimizer", "Topology Mapper", "Noise Estimator", "Transpiler"], GREEN),
        ("APPLY", ["Surface Code / FTQC", "VQE Chemistry", "Pulse Studio", "Cryostat Twin", "PQC Auditor"], VIOLET),
        ("RUN", ["IBM Quantum bridge", "qBraid multi-provider", "Qiskit / Cirq / Braket", "PennyLane / OpenQASM", "Instructor Portal"], ROSE),
    ]
    x = M
    colw = (W - 2 * M - 4 * 14) / 5
    for head, items, col in layers:
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 11.5)
        c.drawString(x, 408, head)
        c.setStrokeColor(col)
        c.setLineWidth(1.8)
        c.line(x, 398, x + 34, 398)
        c.setFillColor(INK)
        c.setFont("Helvetica", 10.8)
        for j, it in enumerate(items):
            c.drawString(x, 372 - j * 23, it)
        x += colw + 14

    c.setStrokeColor(LINE)
    c.line(M, 232, W - M, 232)

    panel(c, M, 118, W - 2 * M, 96, "SHARED FOUNDATION",
          ["One statevector engine computes the physics; every panel above reads from it.",
           "Node + Vercel serverless backend, Postgres storage, RAG knowledge retrieval, multi-provider AI."],
          VIOLET, line_size=12.5, lead=22)
    endpage(c)


def p_composer(c):
    bg(c)
    header(c, "Circuit Composer", "Drag gates onto wires and the physics updates as you build", CYAN, 4)
    flow(c, 352, [("Gate palette", "H X Y Z S T"), ("Wire grid", "up to 8 qubits"),
                  ("Statevector", "recomputed live"), ("Every panel", "updates at once")], CYAN)
    chips(c, 246, [("CNOT", "2-qubit"), ("Toffoli", "3-qubit"), ("SWAP", "exchange"),
                   ("CZ / CP", "hardware native"), ("Rx Ry Rz", "continuous angle"), ("Measure", "collapse")], VIOLET, h=48)
    notes(c, [
        "Step through the circuit column by column, or jump to the full output - the state is re-simulated every time.",
        "Measurement is modelled as real decoherence: probabilities stay, entanglement through that wire is destroyed.",
    ], CYAN, y=140)
    stamp(c, "Engine verified against textbook identities")
    endpage(c)


def p_engine(c):
    bg(c)
    header(c, "The Quantum Engine", "One statevector simulator every other panel reads from", GREEN, 5)
    flow(c, 356, [("Gate grid", "what you built"), ("Complex statevector", "2^n amplitudes"),
                  ("Observables", "probability, phase, Bloch")], GREEN)
    panel(c, M, 196, 366, 122, "COMPUTED, NOT STORED",
          ["Probabilities   P(x) = |<x|psi>|^2", "Reduced states via real partial trace",
           "Pauli expectations  <X> <Y> <Z>", "Full unitary  U[:, j] = U|j>"], GREEN)
    panel(c, M + 402, 196, 366, 122, "ENTANGLEMENT, MEASURED PROPERLY",
          ["Wootters concurrence (Jacobi eigensolver)", "Von Neumann entropy per qubit",
           "Monogamy check separates GHZ from W", "Classified from invariants, not gate names"], VIOLET)
    notes(c, [
        "Supports 2 to 8 qubits in the browser - 256 amplitudes, the honest ceiling for classical simulation.",
    ], GREEN, y=128)
    stamp(c, "Bell = 1.000  |  GHZ = 0.000  |  W = 0.667 pairwise concurrence")
    endpage(c)


def p_bloch(c):
    bg(c)
    header(c, "3D Bloch Sphere", "The state you built, as a vector you can rotate", VIOLET, 6)

    cx, cy, r = M + 180, 300, 96
    c.setStrokeColor(LINE)
    c.setLineWidth(1.2)
    c.circle(cx, cy, r, stroke=1, fill=0)
    c.setStrokeColor(FAINT)
    c.ellipse(cx - r, cy - 28, cx + r, cy + 28, stroke=1, fill=0)
    c.setStrokeColor(CYAN)
    c.setLineWidth(2.2)
    c.line(cx, cy, cx + 62, cy + 68)
    c.setFillColor(CYAN)
    c.circle(cx + 62, cy + 68, 5, stroke=0, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawCentredString(cx, cy + r + 14, "|0>")
    c.drawCentredString(cx, cy - r - 20, "|1>")

    panel(c, M + 340, 246, 428, 168, "WHAT THE VECTOR TELLS YOU",
          ["|r| = 1     pure state, on the surface",
           "|r| < 1     mixed - entangled with another qubit",
           "|r| = 0     maximally mixed, at the centre",
           "",
           "Partner qubits are named from real pairwise concurrence,",
           "not assumed."], VIOLET, line_size=12, lead=21)

    notes(c, [
        "Each qubit's vector comes from a genuine partial trace over the rest of the register.",
    ], VIOLET, y=130)
    endpage(c)


def p_tutor(c):
    bg(c)
    header(c, "AI Circuit Tutor & Error Doctor", "Tells you what you built, what is wrong, and how to fix it", AMBER, 7)
    flow(c, 348, [("Your circuit", "grid + statevector"), ("Deterministic checks", "zero hallucination"),
                  ("AI explanation", "grounded in the state"), ("Fix", "one click")], AMBER)
    panel(c, M, 186, 366, 132, "DETECTED WITH CERTAINTY",
          ["Premature measurement", "Self-cancelling gates  (U . U = I)",
           "Ineffective CNOT - control still |0>", "Idle wires, excessive depth"], AMBER)
    panel(c, M + 402, 186, 366, 132, "AUTO-FIX",
          ["Repairs are computed from the real grid,", "never from the AI's prose.",
           "", "Move the measure gate, delete the redundant", "pair, add the missing H, drop the idle wire."], GREEN)
    notes(c, [
        "The AI is given the actual statevector and gate list as ground truth and told not to invent anything beyond it.",
    ], AMBER, y=126)
    endpage(c)


def p_debugger(c):
    bg(c)
    header(c, "Quantum Time-Travel Debugger", "Step backwards and forwards through the state, gate by gate", ROSE, 8)

    xs = [M + 20 + i * 132 for i in range(5)]
    for i, x in enumerate(xs):
        col = ROSE if i == 2 else FAINT
        box(c, x, 300, 112, 76, f"t = {i+1}", "state snapshot", col, lsize=13)
        if i < 4:
            arrow(c, x + 116, 338, x + 128, 338)
    c.setFillColor(ROSE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(xs[2] + 56, 286, "you are here")

    panel(c, M, 168, W - 2 * M, 96, "AT EVERY STEP",
          ["Statevector, probabilities, concurrence and entropy for that exact moment in the circuit -",
           "so you can see precisely which gate changed what."], ROSE, line_size=12.5, lead=22)
    notes(c, ["Each step is re-simulated from the ground state, so the snapshot is always exact."], ROSE, y=108)
    endpage(c)


def p_optimizer(c):
    bg(c)
    header(c, "Optimizer, Topology & Noise", "Is this circuit efficient, legal on the chip, and able to survive?", GREEN, 9)

    box(c, M, 330, 220, 66, "Self-verifying optimizer", "cuts gates and depth", GREEN)
    box(c, M + 274, 330, 220, 66, "Topology mapper", "checks chip connectivity", ROSE)
    box(c, M + 548, 330, 220, 66, "Noise estimator", "will it survive?", CYAN)

    panel(c, M, 168, 220, 140, "ALGEBRA",
          ["U . U = I", "P(a).P(b) = P(a+b)", "R(a).R(b) = R(a+b)", "column compaction"],
          GREEN, line_size=10.5, lead=19)
    panel(c, M + 274, 168, 220, 140, "COUPLING MAPS",
          ["Linear, ring, star", "IBM heavy-hex", "All-to-all (ion)", "SWAP route via BFS"],
          ROSE, line_size=10.5, lead=19)
    panel(c, M + 548, 168, 220, 140, "SURVIVAL",
          ["F = (F1q)^n1 x (F2q)^n2", "      x exp(-t / T1)", "transmon / ion / atom", "presets"],
          CYAN, line_size=10.5, lead=19)

    notes(c, [
        "The optimizer simulates both circuits and compares fidelity - a rewrite that would change the physics is rejected.",
    ], GREEN, y=108)
    stamp(c, "300 random circuits: worst-case fidelity 1.0, 216 genuinely reduced")
    endpage(c)


def p_transpiler(c):
    bg(c)
    header(c, "Universal Transpiler", "One circuit, every framework - no reinstalling an ecosystem", GREEN, 10)
    box(c, M + 80, 330, 240, 70, "Your circuit", "read once into a shared form", GREEN)
    targets = [("Qiskit", "IBM", CYAN), ("Cirq", "Google", VIOLET), ("Braket", "AWS", AMBER),
               ("PennyLane", "Xanadu", ROSE), ("OpenQASM", "portable", GREEN)]
    for i, (n, s, col) in enumerate(targets):
        x = M + 400 + (i % 3) * 128
        y = 356 if i < 3 else 276
        if i >= 3:
            x = M + 400 + (i - 3) * 128
        box(c, x, y, 118, 56, n, s, col, lsize=11.5, ssize=8.5)
    arrow(c, M + 324, 365, M + 392, 365, FAINT, 1.6)

    notes(c, [
        "Every exporter renders from the same operation list, so a gate can never be silently dropped from one output.",
        "The AI Circuit Doctor also runs here - optimisation passes and a KAK/Cartan decomposition view.",
    ], GREEN, y=170)
    endpage(c)


def p_hardware(c):
    bg(c)
    header(c, "Real Quantum Hardware", "From the browser to a physical QPU", ROSE, 11)
    flow(c, 348, [("Your circuit", "in the composer"), ("OpenQASM", "compiled"),
                  ("Cloud bridge", "IBM / qBraid"), ("Physical QPU", "real shots back")], ROSE)
    chips(c, 232, [("IBM Quantum", "superconducting"), ("qBraid", "multi-provider"),
                   ("Qiskit Aer", "local sim"), ("Cirq", "local sim"), ("PennyLane", "local sim")], CYAN, h=48)
    notes(c, [
        "Live device calibration telemetry - queue depth, error rates and qubit count before you spend a shot.",
        "A Python service runs Qiskit Aer, Cirq and PennyLane for real multi-framework cross-checks.",
    ], ROSE, y=136)
    endpage(c)


def p_surface_code(c):
    bg(c)
    header(c, "Surface Code Studio", "Fault tolerance: how a logical qubit survives a noisy chip", VIOLET, 12)

    # plaquette lattice
    gx, gy, step = M + 40, 250, 42
    for i in range(5):
        for j in range(5):
            x, y = gx + i * step, gy + j * step
            if (i + j) % 2 == 0:
                c.setFillColor(PANEL)
                c.setStrokeColor(CYAN)
            else:
                c.setFillColor(BG)
                c.setStrokeColor(VIOLET)
            c.setLineWidth(1.1)
            c.rect(x, y, step - 8, step - 8, stroke=1, fill=1)
    c.setFillColor(ROSE)
    c.circle(gx + 2 * step + 17, gy + 2 * step + 17, 7, stroke=0, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawString(gx, gy - 22, "Stabilizer lattice - the dot is a detected error")

    panel(c, M + 300, 262, 468, 178, "WHAT IT SIMULATES",
          ["Rotated surface code at distance d = 3 and d = 5",
           "Stabilizer parity measurements each round",
           "Syndrome defect graph built from the outcomes",
           "Minimum-weight perfect matching decoder",
           "Logical qubit tracked across the whole run"], VIOLET, line_size=12, lead=22)

    notes(c, ["Physical qubits are noisy; the code spreads one logical qubit across many so errors can be caught and corrected."], VIOLET, y=136)
    endpage(c)


def p_vqe(c):
    bg(c)
    header(c, "VQE Molecular Chemistry", "The nearest-term real use of a quantum computer", GREEN, 13)
    flow(c, 348, [("Molecule", "H2, LiH"), ("Hamiltonian", "Jordan-Wigner"),
                  ("Ansatz", "UCCSD, tunable angles"), ("Ground energy", "gradient descent")], GREEN)
    panel(c, M, 178, W - 2 * M, 136, "WHY IT MATTERS",
          ["Molecular energy is exponentially hard classically - the electrons are themselves a quantum system.",
           "VQE splits the work: the quantum device prepares the state, a classical optimiser tunes the angles.",
           "Ananta plots the potential energy surface as the bond length changes, and the descent as it converges."],
          GREEN, line_size=12.5, lead=24)
    notes(c, ["Needs continuously tunable rotation angles - which is why parametric gates are in the engine."], GREEN, y=110)
    endpage(c)


def p_pulse(c):
    bg(c)
    header(c, "Microwave Pulse Studio", "One level below the gate: the physics that makes a gate happen", CYAN, 14)

    # pulse envelope
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    p = c.beginPath()
    x0, y0 = M + 30, 300
    p.moveTo(x0, y0)
    for i in range(0, 241):
        t = i / 240
        env = math.exp(-((t - 0.5) ** 2) / 0.02)
        yy = y0 + 56 * env * math.sin(t * 34)
        p.lineTo(x0 + i * 1.4, yy)
    c.drawPath(p, stroke=1, fill=0)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawString(x0, y0 - 76, "Gaussian-envelope drive pulse")

    panel(c, M + 400, 238, 368, 152, "EXPERIMENTS",
          ["Rabi oscillation - calibrate a pi pulse",
           "Ramsey fringes - measure T2*",
           "Hahn echo - refocus dephasing",
           "DRAG correction, T1 / T2 decay"], CYAN, line_size=12, lead=22)

    notes(c, ["A gate is a precisely shaped microwave pulse; the studio shows the real sequence for each experiment."], CYAN, y=132)
    endpage(c)


def p_cryo(c):
    bg(c)
    header(c, "Cryostat Digital Twin", "The refrigerator that makes a superconducting qubit possible", CYAN, 15)

    stages = [("50 K", "outer shield"), ("4 K", "pulse tube"), ("800 mK", "still"),
              ("100 mK", "cold plate"), ("15 mK", "mixing chamber - the chip")]
    w = 520
    for i, (temp, label) in enumerate(stages):
        y = 372 - i * 52
        ww = w - i * 70
        x = M + (w - ww) / 2
        col = [FAINT, DIM, CYAN, VIOLET, ROSE][i]
        c.setFillColor(PANEL)
        c.setStrokeColor(col)
        c.setLineWidth(1.4)
        c.roundRect(x, y, ww, 40, 5, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x + 16, y + 14, temp)
        c.setFillColor(DIM)
        c.setFont("Helvetica", 10.5)
        c.drawRightString(x + ww - 16, y + 14, label)

    panel(c, M + 560, 240, 208, 172, "WHY SO COLD",
          ["Thermal noise would", "excite the qubit out of", "its ground state.",
           "", "15 mK is colder than", "deep space."], CYAN, line_size=11.5, lead=21)

    notes(c, ["Animated cross-section of the five thermal stages, with the live heat load at each one."], CYAN, y=132)
    endpage(c)


def p_pqc(c):
    bg(c)
    header(c, "PQC Security Auditor", "Which of today's encryption a quantum computer will break", ROSE, 16)
    flow(c, 344, [("Pick a cipher", "RSA-2048, ECC-256"), ("Shor resource estimate", "logical + physical qubits"),
                  ("Time to break", "on a future QPU")], ROSE)
    panel(c, M, 172, 366, 142, "AT RISK",
          ["RSA        broken by Shor", "ECC / ECDSA   broken by Shor",
           "Diffie-Hellman  broken by Shor", "AES-128     weakened by Grover"], ROSE, line_size=11.5, lead=21)
    panel(c, M + 402, 172, 366, 142, "POST-QUANTUM REPLACEMENTS",
          ["Lattice-based  (Kyber, Dilithium)", "Hash-based signatures",
           "Code-based schemes", "Migration guidance per cipher"], GREEN, line_size=11.5, lead=21)
    notes(c, ["\"Harvest now, decrypt later\" means data stolen today is at risk the moment a large QPU exists."], ROSE, y=112)
    endpage(c)


def p_algorithms(c):
    bg(c)
    header(c, "Algorithms & Quantum Advantage", "Where the speedup comes from, shown side by side", AMBER, 17)

    # classical vs quantum search
    box(c, M, 322, 330, 74, "Classical search", "checks one box at a time  -  O(N)", FAINT)
    box(c, M + 438, 322, 330, 74, "Grover search", "amplitude amplification  -  O(sqrt N)", AMBER)
    arrow(c, M + 340, 359, M + 430, 359, AMBER, 1.8)

    chips(c, 226, [("Shor", "factoring"), ("Grover", "search"), ("QFT", "phase"),
                   ("Teleportation", "state transfer"), ("QAOA", "optimisation"), ("Deutsch-Jozsa", "oracle")], VIOLET, h=48)

    notes(c, [
        "A live maze simulation runs the classical sequential walk against the quantum wave and interference pattern.",
        "Every algorithm loads straight into the composer, so you can step through it gate by gate.",
    ], AMBER, y=136)
    endpage(c)


def p_research(c):
    bg(c)
    header(c, "Research Archive", "The founding papers, read and summarised for you", CYAN, 18)
    flow(c, 344, [("50 landmark papers", "Feynman to Shor"), ("Fetch the real paper", "PDF / arXiv / open access"),
                  ("AI summary", "of the full text")], CYAN)
    panel(c, M, 172, W - 2 * M, 140, "HONEST BY DESIGN",
          ["When a publisher link is dead or paywalled, the DOI is resolved through OpenAlex and Semantic Scholar",
           "to find a readable open-access copy - rather than quietly summarising the one-line blurb instead.",
           "The badge states exactly what was read: full paper, abstract only, or AI unavailable."],
          CYAN, line_size=12.5, lead=24)
    notes(c, ["Simulate in Ananta loads the circuit from the paper directly into the composer."], CYAN, y=108)
    endpage(c)


def p_curriculum(c):
    bg(c)
    header(c, "Curriculum & Roadmap", "18 modules from first principles to fault tolerance", AMBER, 19)

    rows = [
        ("FOUNDATIONS", ["Hilbert space & Born rule", "Gate unitaries", "Measurement", "Bloch sphere"], CYAN),
        ("CORE", ["Entanglement & Bell states", "Teleportation", "Grover", "QFT & phase estimation"], VIOLET),
        ("ADVANCED", ["Error correction", "Surface codes", "VQE & QAOA", "Quantum machine learning"], GREEN),
    ]
    y = 386
    for head, items, col in rows:
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 11.5)
        c.drawString(M, y, head)
        c.setFillColor(INK)
        c.setFont("Helvetica", 12)
        c.drawString(M + 130, y, "     ".join(items))
        y -= 46

    panel(c, M, 160, W - 2 * M, 92, "EVERY MODULE IS INTERACTIVE",
          ["Theory, the landmark paper it came from, and a live circuit exercise embedded in the page -",
           "with the real simulator, not a picture of one."], AMBER, line_size=12.5, lead=22)
    notes(c, ["A roadmap generator builds a personalised path from what you say you want to learn."], AMBER, y=104)
    endpage(c)


def p_intuition(c):
    bg(c)
    header(c, "Intuition Lab, Concept Doctor & Voice", "For when the mathematics is not the thing that is missing", VIOLET, 20)
    box(c, M, 320, 232, 84, "Intuition Lab", "real-world analogies", VIOLET)
    box(c, M + 268, 320, 232, 84, "Concept Doctor", "say what confuses you", AMBER)
    box(c, M + 536, 320, 232, 84, "Voice Copilot", "build circuits by speaking", GREEN)

    panel(c, M, 168, W - 2 * M, 128, None,
          ["Type \"I don't get entanglement\" and the Concept Doctor generates a plain-language explanation",
           "with an animation built for that specific confusion.",
           "Say \"make a Bell state\" and the Voice Copilot places the gates for you."],
          VIOLET, line_size=12.5, lead=24)
    notes(c, ["A quantum audio synthesiser turns amplitudes and phases into sound - interference you can hear."], VIOLET, y=108)
    endpage(c)


def p_instructor(c):
    bg(c)
    header(c, "Instructor Portal", "For the classroom, not just the individual learner", ROSE, 21)
    flow(c, 344, [("Cohorts", "real student records"), ("Quizzes", "auto-graded"),
                  ("Misconceptions", "aggregated from answers"), ("Gradebook", "CSV export")], ROSE)
    panel(c, M, 172, W - 2 * M, 140, "REAL DATA, NOT A MOCK-UP",
          ["Common misconceptions are computed from what students actually got wrong - if nobody has missed",
           "anything, the list is empty rather than showing invented examples.",
           "Quiz answers are withheld from the browser so sessions cannot be cheated."],
          ROSE, line_size=12.5, lead=24)
    notes(c, ["Backed by Postgres when configured, with a JSON file store as fallback."], ROSE, y=108)
    endpage(c)


def p_backend(c):
    bg(c)
    header(c, "Backend Architecture", "What runs behind the browser", CYAN, 22)

    box(c, M, 336, 220, 70, "Browser", "engine + all studios", CYAN)
    arrow(c, M + 226, 371, M + 268, 371)
    box(c, M + 274, 336, 220, 70, "Node / Vercel", "shared route handlers", VIOLET)
    arrow(c, M + 500, 371, M + 542, 371)
    box(c, M + 548, 336, 220, 70, "Services", "AI, QPU, storage", GREEN)

    panel(c, M, 168, 240, 146, "DATA",
          ["Postgres (Supabase)", "scrypt password hashing", "signed sessions", "JSON fallback store"], VIOLET, line_size=11, lead=20)
    panel(c, M + 264, 168, 240, 146, "INTELLIGENCE",
          ["Multi-model AI provider", "runtime model discovery", "response cache", "RAG over the corpus"], GREEN, line_size=11, lead=20)
    panel(c, M + 528, 168, 240, 146, "QUANTUM",
          ["IBM Quantum API", "qBraid multi-provider", "Python: Aer / Cirq /", "PennyLane runner"], CYAN, line_size=11, lead=20)

    notes(c, ["Local dev and serverless share the same handlers, so the two deployments cannot drift apart."], CYAN, y=108)
    endpage(c)


def p_close(c):
    bg(c)
    header(c, "What Makes Ananta Different", "The standard it holds itself to", GREEN, 23)

    items = [
        ("Nothing is hardcoded", "Every number on screen is computed from the circuit you built - no lookup tables of named states."),
        ("The physics is verified", "Concurrence, entropy and fidelity are checked against textbook values in an automated test suite."),
        ("It tells the truth", "If the AI is unavailable or a paper cannot be read, it says so rather than quietly substituting something."),
        ("Rewrites must prove themselves", "The optimizer simulates both circuits and rejects its own work if the physics would change."),
        ("One engine, one answer", "Matrix, statevector, diagrams and exports all read from the same simulator - they cannot disagree."),
    ]
    y = 392
    for t, d in items:
        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(M, y, t)
        c.setFillColor(DIM)
        c.setFont("Helvetica", 11.5)
        c.drawString(M + 232, y, d)
        y -= 42

    c.setStrokeColor(LINE)
    c.line(M, 150, W - M, 150)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(M, 116, "Build it, see it, understand it, ship it to real hardware - in one browser tab.")
    endpage(c)


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Ananta_Platform_Overview.pdf")
    c = canvas.Canvas(out, pagesize=landscape(A4))
    c.setTitle("Ananta Quantum Studio - Platform Overview")
    c.setAuthor("Ananta Quantum Studio")

    for fn in (p_cover, p_need, p_classical_vs_quantum, p_platform_map, p_composer,
               p_engine, p_bloch, p_tutor, p_debugger, p_optimizer, p_transpiler,
               p_hardware, p_surface_code, p_vqe, p_pulse, p_cryo, p_pqc,
               p_algorithms, p_research, p_curriculum, p_intuition, p_instructor,
               p_backend, p_close):
        fn(c)

    c.save()
    print(f"Wrote {out}  ({_page['n']} pages)")


if __name__ == "__main__":
    main()
