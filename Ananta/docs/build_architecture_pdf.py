"""
Builds the Ananta quantum-engine architecture deck.

One page per capability: a large title, a vector architecture diagram, and a
few short lines on how it works. Deliberately sparse - large type, little
text, the diagram carries the explanation.

Every capability documented here is implemented and verified in the repo;
nothing aspirational is included.
"""
import math
import os
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

W, H = landscape(A4)          # 842 x 595 pt

BG      = HexColor("#0B1220")
PANEL   = HexColor("#121C2E")
INK     = HexColor("#E9F0FA")
DIM     = HexColor("#8FA3BF")
CYAN    = HexColor("#38BDF8")
VIOLET  = HexColor("#A855F7")
GREEN   = HexColor("#34D399")
AMBER   = HexColor("#FBBF24")
ROSE    = HexColor("#FB7185")
LINE    = HexColor("#28374F")

MARGIN = 54


# ----------------------------------------------------------------- helpers
def bg(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)


def page_header(c, number, title, subtitle, accent):
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN, H - MARGIN - 2, f"{number:02d}")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 29)
    c.drawString(MARGIN + 34, H - MARGIN - 6, title)

    c.setFillColor(DIM)
    c.setFont("Helvetica", 14)
    c.drawString(MARGIN + 34, H - MARGIN - 30, subtitle)

    c.setStrokeColor(accent)
    c.setLineWidth(2.2)
    c.line(MARGIN, H - MARGIN - 46, MARGIN + 74, H - MARGIN - 46)


def footer_notes(c, lines, accent):
    """Two or three short 'how it works' lines pinned to the bottom."""
    y = 96
    for text in lines:
        c.setFillColor(accent)
        c.circle(MARGIN + 4, y + 4.5, 3.2, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 13)
        c.drawString(MARGIN + 18, y, text)
        y -= 26


def verified_stamp(c, text):
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawRightString(W - MARGIN, 34, f"VERIFIED  -  {text}")


def box(c, x, y, w, h, label, sub=None, color=CYAN, fill=PANEL, label_size=13, sub_size=10):
    c.setFillColor(fill)
    c.setStrokeColor(color)
    c.setLineWidth(1.5)
    c.roundRect(x, y, w, h, 7, stroke=1, fill=1)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", label_size)
    if sub:
        c.drawCentredString(x + w / 2, y + h / 2 + 4, label)
        c.setFillColor(DIM)
        c.setFont("Helvetica", sub_size)
        c.drawCentredString(x + w / 2, y + h / 2 - 11, sub)
    else:
        c.drawCentredString(x + w / 2, y + h / 2 - 4.5, label)


def arrow(c, x1, y1, x2, y2, color=DIM, width=1.5, dashed=False, label=None, label_color=None):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.setDash(4, 3) if dashed else c.setDash()
    c.line(x1, y1, x2, y2)
    c.setDash()

    ang = math.atan2(y2 - y1, x2 - x1)
    size = 7
    c.setFillColor(color)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - size * math.cos(ang - 0.42), y2 - size * math.sin(ang - 0.42))
    p.lineTo(x2 - size * math.cos(ang + 0.42), y2 - size * math.sin(ang + 0.42))
    p.close()
    c.drawPath(p, stroke=0, fill=1)

    if label:
        c.setFillColor(label_color or color)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 6, label)


def mono(c, x, y, text, size=11.5, color=CYAN):
    c.setFillColor(color)
    c.setFont("Courier-Bold", size)
    c.drawString(x, y, text)


def mono_center(c, x, y, text, size=11.5, color=CYAN):
    c.setFillColor(color)
    c.setFont("Courier-Bold", size)
    c.drawCentredString(x, y, text)


# ------------------------------------------------------------------ pages
def page_cover(c):
    bg(c)
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN, H - 86, "ANANTA  QUANTUM  STUDIO")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 46)
    c.drawString(MARGIN, H - 152, "Quantum Engine Architecture")

    c.setFillColor(DIM)
    c.setFont("Helvetica", 17)
    c.drawString(MARGIN, H - 188, "Ten capabilities added to the circuit composer - how each one works")

    # accent rule
    c.setStrokeColor(VIOLET)
    c.setLineWidth(3)
    c.line(MARGIN, H - 208, MARGIN + 150, H - 208)

    items = [
        ("01", "Parametric rotation gates", CYAN),
        ("02", "Native controlled-phase gates", VIOLET),
        ("03", "State fidelity engine", GREEN),
        ("04", "Self-verifying optimizer", AMBER),
        ("05", "Hardware topology mapper", ROSE),
        ("06", "Noise survival estimator", CYAN),
        ("07", "Simulator-derived unitary", VIOLET),
        ("08", "One IR, five frameworks", GREEN),
        ("09", "Entanglement classifier", AMBER),
        ("10", "Measurement as decoherence", ROSE),
    ]
    x0, y0 = MARGIN, H - 258
    for i, (num, name, col) in enumerate(items):
        col_i, row_i = divmod(i, 5)
        x = x0 + col_i * 380
        y = y0 - row_i * 30
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x, y, num)
        c.setFillColor(INK)
        c.setFont("Helvetica", 14)
        c.drawString(x + 26, y, name)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, 52, "Every capability in this deck is implemented and test-verified against textbook physics.")
    c.showPage()


def page_01(c):
    bg(c)
    page_header(c, 1, "Parametric Rotation Gates",
                "Continuous angles unlock VQE, QAOA and quantum machine learning", CYAN)

    cy = 330
    box(c, MARGIN, cy, 168, 74, "RX(1.8)", "gate token on the grid", CYAN)
    arrow(c, MARGIN + 174, cy + 37, MARGIN + 222, cy + 37)
    box(c, MARGIN + 228, cy, 168, 74, "parseGateToken", "name + angle, 12 s.f.", CYAN)
    arrow(c, MARGIN + 402, cy + 37, MARGIN + 450, cy + 37)
    box(c, MARGIN + 456, cy, 232, 74, "matrixForToken", "builds the 2x2 from theta", VIOLET)

    # the maths, large and central
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.setLineWidth(1.2)
    c.roundRect(MARGIN, cy - 118, 688, 96, 8, stroke=1, fill=1)

    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN + 18, cy - 44, "Computed from the angle, never a lookup table of fixed angles:")
    mono(c, MARGIN + 18, cy - 72, "R_k(theta)  =  exp( -i * theta/2 * sigma_k )", 15, CYAN)
    mono(c, MARGIN + 18, cy - 98, "RX  RY  RZ  P(theta)        P(pi/2) = S        P(pi/4) = T", 12, DIM)

    footer_notes(c, [
        "The angle rides inside the grid token, so circuits stay plain JSON and every existing gate check keeps working.",
        "P(theta) subsumes S and T - they are the same gate at two fixed angles, not separate special cases.",
    ], CYAN)
    verified_stamp(c, "P(|0>) matches cos^2(theta/2) to 1e-9 across the sweep")
    c.showPage()


def page_02(c):
    bg(c)
    page_header(c, 2, "Native Controlled-Phase Gates",
                "CZ and CP(theta) - what superconducting hardware actually implements", VIOLET)

    # matrix
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 300, 330, 128, 8, stroke=1, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN + 18, 404, "Phases only the |11> component:")
    mono(c, MARGIN + 18, 372, "CP(theta) = diag(1, 1, 1, e^(i*theta))", 13, VIOLET)
    mono(c, MARGIN + 18, 344, "CZ        = CP(pi) = diag(1, 1, 1, -1)", 13, VIOLET)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawString(MARGIN + 18, 318, "Symmetric in both wires - no control/target distinction.")

    # identity diagram
    bx = MARGIN + 372
    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(bx, 404, "On real chips CZ is native and CNOT is synthesised from it:")

    box(c, bx, 330, 64, 56, "H", None, CYAN, label_size=15)
    box(c, bx + 74, 330, 78, 56, "CZ", None, VIOLET, label_size=15)
    box(c, bx + 162, 330, 64, 56, "H", None, CYAN, label_size=15)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(bx + 238, 350, "=")
    box(c, bx + 264, 330, 92, 56, "CNOT", None, GREEN, label_size=15)

    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawString(bx, 310, "Hadamards on the target wire, either side of the CZ.")

    footer_notes(c, [
        "Lets circuits be designed in the gate set the device runs, instead of relying on the compiler to decompose.",
        "CP(theta) is the continuous family behind controlled-phase rotations used throughout the QFT.",
    ], VIOLET)
    verified_stamp(c, "CNOT = (I x H) . CZ . (I x H) holds at fidelity 1.000000")
    c.showPage()


def page_03(c):
    bg(c)
    page_header(c, 3, "State Fidelity Engine",
                "Measures whether two circuits really produce the same quantum state", GREEN)

    y = 350
    box(c, MARGIN, y, 176, 66, "Circuit A", "your circuit", CYAN)
    box(c, MARGIN, y - 96, 176, 66, "Circuit B", "target / rewritten", VIOLET)

    arrow(c, MARGIN + 182, y + 33, MARGIN + 232, y + 33)
    arrow(c, MARGIN + 182, y - 63, MARGIN + 232, y - 63)

    box(c, MARGIN + 238, y, 176, 66, "|psi_A>", "statevector", CYAN)
    box(c, MARGIN + 238, y - 96, 176, 66, "|psi_B>", "statevector", VIOLET)

    arrow(c, MARGIN + 420, y + 33, MARGIN + 476, y - 15)
    arrow(c, MARGIN + 420, y - 63, MARGIN + 476, y - 15)

    box(c, MARGIN + 482, y - 48, 206, 66, "F = |<psi_A|psi_B>|^2", "one number, 0.0 - 1.0", GREEN)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 176, 688, 62, 8, stroke=1, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN + 18, 212, "F = 1.000  means physically identical states (global phase is unobservable).")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 12)
    c.drawString(MARGIN + 18, 190, "Anything less is a genuine difference in what the circuit prepares.")

    footer_notes(c, [
        "This is the primitive every other guarantee in the system is built on - it turns 'should be equivalent' into proof.",
    ], GREEN)
    verified_stamp(c, "orthogonal states give exactly 0.0, identical give 1.0")
    c.showPage()


def page_04(c):
    bg(c)
    page_header(c, 4, "Self-Verifying Optimizer",
                "Reduces depth and gate count - and proves it changed nothing", AMBER)

    y = 356
    box(c, MARGIN, y, 150, 62, "Your circuit", None, DIM, label_size=13)
    arrow(c, MARGIN + 156, y + 31, MARGIN + 196, y + 31)
    box(c, MARGIN + 202, y, 214, 62, "Algebraic passes", "run to a fixed point", AMBER)
    arrow(c, MARGIN + 422, y + 31, MARGIN + 462, y + 31)
    box(c, MARGIN + 468, y, 150, 62, "Candidate", None, DIM, label_size=13)

    # verification gate
    arrow(c, MARGIN + 543, y - 6, MARGIN + 543, y - 54)
    box(c, MARGIN + 396, y - 122, 292, 62, "Simulate BOTH, compare F", None, GREEN, label_size=13)

    arrow(c, MARGIN + 470, y - 128, MARGIN + 392, y - 168, GREEN)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN + 404, y - 150, "F = 1")

    arrow(c, MARGIN + 612, y - 128, MARGIN + 612, y - 168, ROSE)
    c.setFillColor(ROSE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN + 622, y - 150, "F < 1")

    box(c, MARGIN + 246, y - 226, 190, 56, "Accept", "optimized circuit", GREEN, label_size=13)
    box(c, MARGIN + 518, y - 226, 190, 56, "Reject", "original kept intact", ROSE, label_size=13)

    # passes list
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, y - 226, 170, 164, 8, stroke=1, fill=1)
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(MARGIN + 14, y - 84, "PASSES")
    c.setFillColor(INK)
    c.setFont("Courier", 9.4)
    for i, line in enumerate(["U . U = I", "P(a).P(b) = P(a+b)", "R(a).R(b) = R(a+b)", "R(0) = I", "column compaction"]):
        c.drawString(MARGIN + 14, y - 106 - i * 19, line)

    footer_notes(c, [
        "An optimization that silently alters the answer is worse than none - so a failed check discards the whole rewrite.",
        "The passes are algebraic identities true of any circuit; nothing matches against named algorithms.",
    ], AMBER)
    verified_stamp(c, "300 random circuits: worst-case fidelity 1.0, 216 genuinely reduced")
    c.showPage()


def page_05(c):
    bg(c)
    page_header(c, 5, "Hardware Topology Mapper",
                "Real chips are not all-to-all connected - this finds what will not compile", ROSE)

    # coupling graph
    cxs = [MARGIN + 60, MARGIN + 170, MARGIN + 280, MARGIN + 390]
    gy = 352
    c.setStrokeColor(LINE)
    c.setLineWidth(2)
    for i in range(3):
        c.line(cxs[i], gy, cxs[i + 1], gy)
    for i, x in enumerate(cxs):
        c.setFillColor(PANEL)
        c.setStrokeColor(CYAN)
        c.setLineWidth(1.6)
        c.circle(x, gy, 22, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(x, gy - 4, f"q{i}")

    # illegal gate arc q0 - q3
    c.setStrokeColor(ROSE)
    c.setLineWidth(2)
    c.setDash(5, 3)
    p = c.beginPath()
    p.moveTo(cxs[0], gy + 22)
    p.curveTo(cxs[0] + 60, gy + 110, cxs[3] - 60, gy + 110, cxs[3], gy + 22)
    c.drawPath(p, stroke=1, fill=0)
    c.setDash()
    c.setFillColor(ROSE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString((cxs[0] + cxs[3]) / 2, gy + 94, "CNOT q0 - q3   not coupled")

    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawCentredString((cxs[0] + cxs[3]) / 2, gy - 46, "Linear chain: only neighbours are physically connected")

    # right panel: BFS route
    px = MARGIN + 470
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(px, gy - 62, 218, 150, 8, stroke=1, fill=1)
    c.setFillColor(ROSE)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(px + 16, gy + 68, "SHORTEST PATH  (BFS)")
    c.setFillColor(INK)
    c.setFont("Courier-Bold", 12)
    c.drawString(px + 16, gy + 42, "q0 -> q1 -> q2 -> q3")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(px + 16, gy + 18, "3 hops apart")
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(px + 16, gy - 8, "2 SWAPs required")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10)
    c.drawString(px + 16, gy - 34, "Reported before you ever submit a job.")

    # supported coupling maps - fills the lower band with real content
    c.setFillColor(DIM)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(MARGIN, 232, "COUPLING MAPS MODELLED")
    maps = [("Linear", "chain"), ("Ring", "cycle"), ("Star", "bus"),
            ("Heavy-hex", "IBM"), ("All-to-all", "trapped ion")]
    for i, (name, sub) in enumerate(maps):
        x = MARGIN + i * 140
        box(c, x, 168, 126, 50, name, sub, ROSE, label_size=12, sub_size=9)

    footer_notes(c, [
        "Toffoli is flagged separately - it is native nowhere and always decomposes.",
    ], ROSE)
    verified_stamp(c, "non-adjacent CNOT flagged on a chain, legal all-to-all, SWAP count computed")
    c.showPage()


def page_06(c):
    bg(c)
    page_header(c, 6, "Noise Survival Estimator",
                "Will this circuit survive on real hardware, or drown in noise?", CYAN)

    y = 384
    box(c, MARGIN, y, 150, 62, "n1q = 2", "1-qubit gates", CYAN)
    box(c, MARGIN, y - 82, 150, 62, "n2q = 4", "2-qubit gates", VIOLET)
    box(c, MARGIN, y - 164, 150, 62, "depth = 6", "time slices", AMBER)

    arrow(c, MARGIN + 156, y + 31, MARGIN + 214, y - 50)
    arrow(c, MARGIN + 156, y - 51, MARGIN + 214, y - 51)
    arrow(c, MARGIN + 156, y - 133, MARGIN + 214, y - 52)

    c.setFillColor(PANEL)
    c.setStrokeColor(GREEN)
    c.setLineWidth(1.6)
    c.roundRect(MARGIN + 220, y - 116, 468, 130, 8, stroke=1, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN + 240, y - 6, "Estimated probability the whole circuit runs fault-free:")
    mono(c, MARGIN + 240, y - 40, "F = (F_1q)^n1q  x  (F_2q)^n2q  x  exp(-t / T1)", 14, GREEN)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 10.5)
    c.drawString(MARGIN + 240, y - 68, "t = depth x gate duration")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(MARGIN + 240, y - 96, "Device presets: superconducting  /  trapped ion  /  neutral atom")

    # verdict strip
    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 150, 688, 56, 8, stroke=1, fill=1)
    labels = [("> 90%", "comfortable", GREEN), ("70-90%", "mitigate", CYAN),
              ("40-70%", "degraded", AMBER), ("< 40%", "signal lost", ROSE)]
    for i, (rng, word, col) in enumerate(labels):
        x = MARGIN + 26 + i * 172
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(x, 182, rng)
        c.setFillColor(DIM)
        c.setFont("Helvetica", 11)
        c.drawString(x, 164, word)

    footer_notes(c, [
        "Every device constant is an input, so a new machine is modelled by changing numbers, not code.",
    ], CYAN)
    verified_stamp(c, "deeper circuits always score strictly lower; ion beats transmon on 2q")
    c.showPage()


def page_07(c):
    bg(c)
    page_header(c, 7, "Simulator-Derived Unitary",
                "The matrix is read from the simulator, so the two can never disagree", VIOLET)

    y = 342
    box(c, MARGIN, y, 180, 72, "basis state |j>", "for every j", DIM)
    arrow(c, MARGIN + 186, y + 36, MARGIN + 236, y + 36)
    box(c, MARGIN + 242, y, 212, 72, "run the circuit", "same code path as the sim", CYAN)
    arrow(c, MARGIN + 460, y + 36, MARGIN + 510, y + 36)
    box(c, MARGIN + 516, y, 172, 72, "column j of U", None, VIOLET, label_size=14)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, y - 128, 688, 104, 8, stroke=1, fill=1)
    mono(c, MARGIN + 20, y - 60, "U[:, j]  =  U |j>", 16, VIOLET)
    c.setFillColor(INK)
    c.setFont("Helvetica", 12.5)
    c.drawString(MARGIN + 20, y - 88, "Replaced a second, independent gate table that knew only the original eight gates.")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 12)
    c.drawString(MARGIN + 20, y - 110, "Every new gate is supported here automatically - there is nothing left to keep in sync.")

    footer_notes(c, [
        "Removed 110 lines of duplicated gate dispatch; the matrix and the statevector now share one implementation.",
    ], VIOLET)
    verified_stamp(c, "U|0..0> matches the simulated state for SWAP, Toffoli and mixed circuits")
    c.showPage()


def page_08(c):
    bg(c)
    page_header(c, 8, "One IR, Five Frameworks",
                "A single reading of the circuit renders to every target", GREEN)

    box(c, MARGIN + 60, 372, 200, 66, "circuit grid", None, DIM, label_size=14)
    arrow(c, MARGIN + 160, 366, MARGIN + 160, 322)
    box(c, MARGIN + 40, 250, 240, 68, "toOperationList()", "one normalized pass", GREEN)

    targets = [("Qiskit", "IBM", CYAN), ("Cirq", "Google", VIOLET),
               ("Braket", "AWS", AMBER), ("PennyLane", "Xanadu", ROSE),
               ("OpenQASM", "portable", GREEN)]
    tx = MARGIN + 360
    for i, (name, sub, col) in enumerate(targets):
        yy = 398 - i * 62
        arrow(c, MARGIN + 286, 284, tx - 8, yy + 22, col, width=1.2)
        box(c, tx, yy, 200, 46, name, sub, col, label_size=13, sub_size=9.5)

    footer_notes(c, [
        "Each exporter used to re-implement its own gate loop - one missed update silently dropped gates from that output.",
    ], GREEN)
    verified_stamp(c, "all five render the same operation list")
    c.showPage()


def page_09(c):
    bg(c)
    page_header(c, 9, "Entanglement Classifier",
                "Classified from the state's own invariants, not from which gates built it", AMBER)

    y = 372
    box(c, MARGIN, y, 150, 62, "statevector", None, DIM, label_size=13)
    arrow(c, MARGIN + 156, y + 31, MARGIN + 198, y + 31)
    box(c, MARGIN + 204, y, 176, 62, "partial trace", "every qubit pair", CYAN)
    arrow(c, MARGIN + 386, y + 31, MARGIN + 428, y + 31)
    box(c, MARGIN + 434, y, 254, 62, "Wootters concurrence", "Jacobi eigensolver", VIOLET)

    arrow(c, MARGIN + 560, y - 6, MARGIN + 560, y - 46)
    box(c, MARGIN + 380, y - 110, 308, 60, "per-qubit entropy + monogamy", None, AMBER, label_size=12.5)
    arrow(c, MARGIN + 534, y - 116, MARGIN + 480, y - 156)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, y - 226, 688, 66, 8, stroke=1, fill=1)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 11)
    c.drawString(MARGIN + 18, y - 180, "Emergent classification - no circuit is pattern-matched by name:")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(MARGIN + 18, y - 206, "product   /   bipartite pair   /   GHZ-type (monogamy-saturated)   /   W-type (distributed)")

    footer_notes(c, [
        "GHZ is identified by having zero pairwise concurrence yet maximal entropy - the physics, not the gate list.",
        "Any circuit reaching the same state is classified the same way, however it was built.",
    ], AMBER)
    verified_stamp(c, "Bell = 1.000, GHZ = 0.000, W = 0.667 pairwise - textbook values")
    c.showPage()


def page_10(c):
    bg(c)
    page_header(c, 10, "Measurement as Decoherence",
                "A measured wire loses its coherence - the simulation now says so too", ROSE)

    # before / after
    bx = MARGIN
    c.setFillColor(DIM)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(bx, 418, "BEFORE MEASUREMENT")
    box(c, bx, 340, 300, 64, "C = 1.00     S = 1.00", "entangled pair", GREEN, label_size=14)

    arrow(c, bx + 316, 372, bx + 372, 372, ROSE, width=2, label="measure q1", label_color=ROSE)

    c.setFillColor(DIM)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(bx + 388, 418, "AFTER MEASUREMENT")
    box(c, bx + 388, 340, 300, 64, "C = 0.00     S = 1.00", "classically correlated", ROSE, label_size=14)

    c.setFillColor(PANEL)
    c.setStrokeColor(LINE)
    c.roundRect(MARGIN, 196, 688, 104, 8, stroke=1, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN + 18, 272, "Outcome probabilities are untouched.  Entanglement through that wire is destroyed.")
    c.setFillColor(DIM)
    c.setFont("Helvetica", 12)
    c.drawString(MARGIN + 18, 246, "Coherences across a measured wire are dropped from the reduced density matrix -")
    c.drawString(MARGIN + 18, 226, "which is exactly what a projective measurement in the computational basis does.")

    footer_notes(c, [
        "The Measure gate used to be skipped entirely - the simulator claimed full entanglement on a collapsed wire.",
        "Simulation and diagnostics now agree about the same circuit.",
    ], ROSE)
    verified_stamp(c, "50/50 outcomes preserved, concurrence drops to zero")
    c.showPage()


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Ananta_Quantum_Engine_Architecture.pdf")
    c = canvas.Canvas(out, pagesize=landscape(A4))
    c.setTitle("Ananta Quantum Engine - Architecture")
    c.setAuthor("Ananta Quantum Studio")

    page_cover(c)
    for fn in (page_01, page_02, page_03, page_04, page_05,
               page_06, page_07, page_08, page_09, page_10):
        fn(c)

    c.save()
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
