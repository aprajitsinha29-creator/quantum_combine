"""
Ananta Quantum Studio - Presentation Master Guide & Non-Quantum Teacher Defense PDF Generator
Produces a high-impact, publication-grade document for presenting to evaluators who may have zero background in quantum physics.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0284c7"))
            self.drawString(36, 11 * inch - 26, "ANANTA QUANTUM STUDIO")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(165, 11 * inch - 26, "|   Complete Presentation & Teacher Defense Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

            # Footer
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 36, 8.5 * inch - 36, 36)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(36, 24, "Academic Presentation Guide - For Evaluators & Teachers (No Quantum Background Required)")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(8.5 * inch - 36, 24, page_text)
        self.restoreState()

def build_presentation_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    c_dark = colors.HexColor("#0f172a")
    c_blue = colors.HexColor("#0284c7")
    c_cyan = colors.HexColor("#06b6d4")
    c_slate = colors.HexColor("#475569")
    c_light = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#e2e8f0")
    c_teal = colors.HexColor("#0d9488")
    c_purple = colors.HexColor("#7c3aed")

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_dark,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_blue,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Header1',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_dark,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_blue,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_slate,
        spaceAfter=5
    )

    bold_body_style = ParagraphStyle(
        'BoldBody',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_slate,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'Callout',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    speech_style = ParagraphStyle(
        'Speech',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0369a1")
    )

    code_style = ParagraphStyle(
        'Code',
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # ================= PAGE 1: COVER & QUANTUM 101 FOR TEACHERS =================
    story.append(Paragraph("ANANTA QUANTUM STUDIO", title_style))
    story.append(Paragraph("Comprehensive Presentation Master Guide & Page-by-Page Defense Manual", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceAfter=8))

    intro_box = [
        [Paragraph("<b>Target Evaluator Profile:</b> Reviewers, professors, and examiners without prior quantum physics knowledge.<br/><b>Objective:</b> Clear, jargon-free explanations, real-world analogies, page-by-page feature walkthrough, and live Q&A defense.", body_style)]
    ]
    t_intro = Table(intro_box, colWidths=[540])
    t_intro.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_intro)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Part 1: Quantum Computing 101 — Simple Analogies for Non-Physics Teachers", h1_style))
    story.append(Paragraph("If your teacher asks <i>'What actually is quantum computing and why should we care?'</i>, use these three simple analogies:", body_style))

    analogies_data = [
        [
            Paragraph("<b>Concept</b>", bold_body_style),
            Paragraph("<b>Classical Computer (Laptop / Phone)</b>", bold_body_style),
            Paragraph("<b>Quantum Computer (Ananta Studio)</b>", bold_body_style),
            Paragraph("<b>Intuitive Real-World Analogy</b>", bold_body_style)
        ],
        [
            Paragraph("<b>1. Qubit</b>", bold_body_style),
            Paragraph("Classical Bit: strictly 0 or 1 at any moment.", body_style),
            Paragraph("Qubit: linear combination of |0&gt; and |1&gt; simultaneously.", body_style),
            Paragraph("<b>The Spinning Coin:</b> Flat coin is 0 or 1. A rapidly spinning coin is a blur of both Heads and Tails at once until slapped flat (measured).", body_style)
        ],
        [
            Paragraph("<b>2. Superposition</b>", bold_body_style),
            Paragraph("Evaluates 1 path at a time sequentially.", body_style),
            Paragraph("Simultaneously samples 2<sup>n</sup> orthogonal state paths.", body_style),
            Paragraph("<b>Parallel Maze Solver:</b> Instead of walking down one corridor at a time, water flows down all corridors at the same time.", body_style)
        ],
        [
            Paragraph("<b>3. Entanglement</b>", bold_body_style),
            Paragraph("Bits are independent electrical charges.", body_style),
            Paragraph("State of qubit A strictly correlates with qubit B.", body_style),
            Paragraph("<b>Synchronized Magic Dice:</b> Roll one die in Delhi and get a 6; a second die in New York instantly shows a 6, every single time.", body_style)
        ],
        [
            Paragraph("<b>4. Interference</b>", bold_body_style),
            Paragraph("Calculates by checking bit truth tables.", body_style),
            Paragraph("Constructive/destructive phase wave manipulation.", body_style),
            Paragraph("<b>Noise-Canceling Headphones:</b> Cancels wrong answers (destructive) and amplifies correct answers (constructive).", body_style)
        ]
    ]

    t_analogies = Table(analogies_data, colWidths=[80, 140, 140, 180])
    t_analogies.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0f2fe")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_analogies)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Why Ananta Was Built: Solving the Education Bottleneck", h2_style))
    story.append(Paragraph("<b>The Problem:</b> Quantum education has been stuck in dry, static mathematical textbooks filled with abstract linear algebra. Students cannot touch real million-dollar dilution refrigerators at IBM or Google.", body_style))
    story.append(Paragraph("<b>Our Solution:</b> Ananta provides an interactive, visual web laboratory with an in-browser 60 FPS physics engine, a 3D Bloch sphere, pulse control, real hardware access, and an intelligent AI tutor.", body_style))

    # ================= PAGE 2: ARCHITECTURE & COMPOSER =================
    story.append(PageBreak())
    story.append(Paragraph("Part 2: Platform Architecture & Quantum Circuit Studio", h1_style))

    arch_box = [
        [
            Paragraph("<b>Dual-Engine Architecture Overview</b><br/>"
                      "1. <b>Client-Side In-Browser Engine (60 FPS):</b> Solves complex linear algebra (C<sup>2<sup>n</sup></sup> statevectors) in pure JavaScript. Zero network lag.<br/>"
                      "2. <b>Server-Side Cloud Services (Node.js & Vercel):</b> REST APIs for Google Gemini 2.5 Flash AI, IBM Qiskit Runtime QPU, qBraid multi-provider fleet, and persistent instructor LMS database.", body_style)
        ]
    ]
    t_arch = Table(arch_box, colWidths=[540])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, c_blue),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Feature Walkthrough 1: Quantum Circuit Composer Studio (#composer)", h2_style))
    story.append(Paragraph("<b>What it is:</b> An interactive multi-qubit visual drag-and-drop circuit composer adhering to IBM Quantum color palettes.", body_style))
    story.append(Paragraph("<b>Underlying Concept:</b> Every gate is a unitary transformation matrix U. When a user drags a Hadamard (H) onto Qubit 0, it transforms |0&gt; into (|0&gt; + |1&gt;)/sqrt(2). Adding a CNOT entangles Qubit 0 and 1 into the Bell state (|00&gt; + |11&gt;)/sqrt(2).", body_style))
    story.append(Paragraph("<b>How We Built It:</b>", bold_body_style))
    story.append(Paragraph("- <b>quantum-engine.js:</b> Implements full complex statevector linear algebra. Every gate multiplies the statevector using Kronecker tensor products (I &otimes; U &otimes; I).", bullet_style))
    story.append(Paragraph("- <b>Multi-SDK Exporter:</b> Translates visual circuits on-the-fly into Python code for IBM Qiskit, Google Cirq, PennyLane, and OpenQASM 3.0.", bullet_style))
    story.append(Paragraph("- <b>Time-Travel Debugger:</b> A step-by-step scrubber slider letting students inspect statevector amplitudes and probabilities at every single gate step.", bullet_style))

    speech_composer = [
        [Paragraph("<b>Oral Presentation Script for Composer:</b><br/><i>'Evaluators, this is our Circuit Composer. When I drop a Hadamard gate, our in-browser physics engine immediately calculates the statevector without network delay. When I add a CNOT, it computes the 4-dimensional Kronecker matrix in real time, creating an entangled Bell state. Notice the multi-SDK tabs below: the circuit translates automatically into Python for Qiskit, Google Cirq, and PennyLane.'</i>", speech_style)]
    ]
    t_sp1 = Table(speech_composer, colWidths=[540])
    t_sp1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ('BOX', (0, 0), (-1, -1), 0.5, c_blue),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sp1)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Feature Walkthrough 2: 3D Bloch Sphere Visualizer", h2_style))
    story.append(Paragraph("<b>What it is:</b> A 3D translucent glowing sphere with an orbital camera rendering the exact spherical coordinates (&theta;, &phi;) of a single qubit.", body_style))
    story.append(Paragraph("<b>Underlying Concept:</b> A classical bit can only be at the North Pole (|0&gt;) or South Pole (|1&gt;). A qubit can point anywhere on the 3D sphere: |&psi;&gt; = cos(&theta;/2)|0&gt; + e<sup>i&phi;</sup>sin(&theta;/2)|1&gt;.", body_style))
    story.append(Paragraph("<b>How We Built It:</b> Built with <b>Three.js WebGL</b> (bloch-sphere.js). It computes the Pauli matrix expectation values x=&lt;X&gt;, y=&lt;Y&gt;, z=&lt;Z&gt; from complex amplitudes and updates the 3D arrow at 60 FPS.", body_style))

    # ================= PAGE 3: PULSE STUDIO & ALGORITHMS ARENA =================
    story.append(PageBreak())
    story.append(Paragraph("Part 3: Microwave Pulse Studio & Algorithm Library", h1_style))

    story.append(Paragraph("Feature Walkthrough 3: Microwave Pulse Studio (#pulse)", h2_style))
    story.append(Paragraph("<b>What it is:</b> An electrical engineering studio demonstrating how microwave pulses control real physical transmon superconducting qubits.", body_style))
    story.append(Paragraph("<b>Concept:</b> Quantum gates are not software code; they are shaped radio-frequency microwave bursts sent down cryogenic cables at 15 millikelvin. Driving at resonant frequency produces <b>Rabi Oscillations</b>. Environmental noise causes <b>Ramsey Dephasing</b>. Leakage into the |2&gt; state is canceled using <b>DRAG Pulse Shaping</b>.", body_style))
    story.append(Paragraph("<b>How We Built It (pulse-studio.js):</b>", bold_body_style))
    story.append(Paragraph("- Computes Rabi population flop: P<sub>|1&gt;</sub>(t) = (&Omega;<sup>2</sup>/&Omega;<sub>R</sub><sup>2</sup>) sin<sup>2</sup>(&Omega;<sub>R</sub> t / 2).", bullet_style))
    story.append(Paragraph("- Ramsey decay envelope: S(&tau;) &prop; e<sup>-&tau;/T<sub>2</sub><sup>*</sup></sup> cos(&Delta;&omega; &tau;).", bullet_style))
    story.append(Paragraph("- DRAG derivative quadrature correction: Q(t) = -(&lambda;/&Delta;<sub>12</sub>) dI(t)/dt on HTML5 Canvas.", bullet_style))

    speech_pulse = [
        [Paragraph("<b>Oral Presentation Script for Pulse Studio:</b><br/><i>'Most platforms only show abstract gates. In Ananta, we show the electrical engineering truth: how microwave pulses drive transmon qubits. By adjusting amplitude and duration, students observe Rabi oscillations. We also implemented DRAG pulse shaping, which takes the mathematical derivative of the Gaussian wave to suppress leakage into higher energy states.'</i>", speech_style)]
    ]
    t_sp2 = Table(speech_pulse, colWidths=[540])
    t_sp2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ('BOX', (0, 0), (-1, -1), 0.5, c_teal),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_sp2)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Feature Walkthrough 4: Quantum Algorithm Arena (74 Algorithms)", h2_style))
    story.append(Paragraph("<b>What it is:</b> A library of 74 verified quantum algorithms across 5 academic categories (Foundations, Arithmetic, Cryptography, Optimization, Chemistry/VQE).", body_style))
    story.append(Paragraph("<b>Key Highlighted Algorithms:</b>", bold_body_style))
    story.append(Paragraph("1. <b>Deutsch-Jozsa:</b> Proves quantum speedup by determining whether a function is constant or balanced in a single query (classical requires 2<sup>n-1</sup>+1 queries).", bullet_style))
    story.append(Paragraph("2. <b>Grover's Search:</b> Searches unsorted databases in O(&radic;N) steps instead of O(N) using constructive phase amplification.", bullet_style))
    story.append(Paragraph("3. <b>Shor's Factoring Subroutine:</b> Uses Quantum Fourier Transform (QFT) to find periods of modular functions, breaking RSA encryption exponentially faster.", bullet_style))
    story.append(Paragraph("4. <b>VQE (Variational Quantum Eigensolver):</b> Hybrid quantum-classical optimization to calculate molecular ground-state energies (e.g. Hydrogen molecule H<sub>2</sub>).", bullet_style))
    story.append(Paragraph("<b>How We Built It:</b> Each card has an instant 'Load Circuit' trigger that programmatically sets up the qubits and gates in the composer.", body_style))

    # ================= PAGE 4: QUIZZES, INSTRUCTOR & HARDWARE =================
    story.append(PageBreak())
    story.append(Paragraph("Part 4: Quizzes, Instructor LMS & Live Quantum Hardware", h1_style))

    story.append(Paragraph("Feature Walkthrough 5: Automated Quizzes & Assessment (#quizzes)", h2_style))
    story.append(Paragraph("<b>What it is:</b> 5-domain conceptual assessment engine with KaTeX mathematical formulas and instant automated grading.", body_style))
    story.append(Paragraph("<b>How We Built It (quizEngine.js):</b> Client sessions have correct answers stripped out to prevent cheating. Upon submission, the server computes score percentage, letter grades, step-by-step mathematical proofs, and identifies misconceptions linked to the Concept Doctor.", body_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Feature Walkthrough 6: Instructor Portal & Cohort Analytics (#instructor)", h2_style))
    story.append(Paragraph("<b>What it is:</b> University classroom management portal for professors to track student progress, inspect error heatmaps, and export gradebooks.", body_style))
    story.append(Paragraph("<b>Realistic Academic Dataset:</b>", bold_body_style))
    story.append(Paragraph("- <b>Cohort:</b> QC-101 (Introduction to Quantum Information & Circuits) — <b>24 Enrolled Students</b>.", bullet_style))
    story.append(Paragraph("- <b>Class Average Score:</b> <b>91%</b> (Honors bell curve: 16 Grade A, 8 Grade B, 0 Failures).", bullet_style))
    story.append(Paragraph("- <b>Activity:</b> <b>168 Challenges Solved</b>, <b>98 Quizzes Completed</b>.", bullet_style))
    story.append(Paragraph("- <b>Misconception Heatmap:</b> Identifies class-wide bottlenecks (e.g. Phase Kickback error rate: 16.7%).", bullet_style))
    story.append(Paragraph("- <b>Export Gradebook:</b> Streams dynamic RFC-4180 CSV files directly to the professor's computer.", bullet_style))
    story.append(Paragraph("<b>How We Built It:</b> File-backed database in ananta-backend/data/ (cohorts.json, students.json, submissions.json) with REST endpoints.", body_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Feature Walkthrough 7: Live Hardware Cloud Hub (IBM Quantum & qBraid)", h2_style))
    story.append(Paragraph("<b>What it is:</b> Direct cloud execution gateway connecting to real quantum computers at IBM, AWS Braket, QuEra, and IonQ.", body_style))
    story.append(Paragraph("<b>How We Built It:</b>", bold_body_style))
    story.append(Paragraph("- <b>ibmQuantum.js:</b> Proxies circuit OpenQASM 3.0 payloads to IBM Qiskit Runtime REST API.", bullet_style))
    story.append(Paragraph("- <b>qbraidClient.js:</b> Dispatches jobs to qBraid multi-tenant cloud (QuEra neutral-atom & IonQ ion-traps).", bullet_style))
    story.append(Paragraph("- <b>Physical Noise Engine:</b> If users run without API keys, it simulates thermal relaxation (T1=50&mu;s), dephasing (T2=70&mu;s), and readout errors.", bullet_style))

    # ================= PAGE 5: VIVA CHEAT-SHEET FOR TEACHERS =================
    story.append(PageBreak())
    story.append(Paragraph("Part 5: Teacher Presentation Q&A Defense Script", h1_style))
    story.append(Paragraph("Review these exact questions and answers before stepping into your viva or presentation:", body_style))

    qa_data = [
        [
            Paragraph("<b>Question from Teacher / Evaluator</b>", bold_body_style),
            Paragraph("<b>Exact Oral Answer to Give</b>", bold_body_style)
        ],
        [
            Paragraph("<b>Q1: Is this simulation just an animation or real math?</b>", bold_body_style),
            Paragraph("<b>Answer:</b> 'It is 100% real mathematical simulation. Every time a user places a gate, our engine performs complex matrix multiplication on a 2<sup>n</sup>-dimensional statevector using Kronecker tensor products. Nothing is hardcoded or faked.'", body_style)
        ],
        [
            Paragraph("<b>Q2: Can a normal laptop simulate a quantum computer?</b>", bold_body_style),
            Paragraph("<b>Answer:</b> 'Yes! For up to 10-16 qubits, a normal laptop has ample RAM. Simulating 2 qubits requires tracking 2<sup>2</sup>=4 complex numbers; 5 qubits requires 32 numbers. For massive 127-qubit systems that exceed a laptop's memory, Ananta connects directly to live cloud QPUs at IBM Quantum and qBraid.'", body_style)
        ],
        [
            Paragraph("<b>Q3: What if there is no internet in the classroom?</b>", bold_body_style),
            Paragraph("<b>Answer:</b> 'Ananta uses a Dual-Engine Architecture. The primary quantum physics engine, the 3D Bloch sphere, the Pulse Studio, and circuit simulations run entirely client-side in the browser at 60 FPS with zero network lag. Cloud APIs are only needed for live QPU dispatch and AI chat.'", body_style)
        ],
        [
            Paragraph("<b>Q4: How does AI help in this project?</b>", bold_body_style),
            Paragraph("<b>Answer:</b> 'We integrated Google Gemini 2.5 Flash as an AI Circuit Auditor. It inspects circuit gate sequences, detects unentangled qubits, flags redundant gates, and suggests circuit depth optimizations, outputting strictly validated JSON.'", body_style)
        ],
        [
            Paragraph("<b>Q5: How does the Instructor Portal help colleges?</b>", bold_body_style),
            Paragraph("<b>Answer:</b> 'Instead of professors manually grading hundreds of circuit diagrams, Ananta automatically verifies circuit statevector fidelity. It tracks individual and class progress across 24 students, identifies specific conceptual misconceptions, and exports CSV gradebooks with one click.'", body_style)
        ]
    ]

    t_qa = Table(qa_data, colWidths=[180, 360])
    t_qa.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_qa)
    story.append(Spacer(1, 14))

    sign_block = [
        [
            Paragraph("<b>Project:</b> Ananta Quantum Studio<br/><b>Repository:</b> github.com/anushkagupta200615-jpg/Ananta", body_style),
            Paragraph("<b>Architecture:</b> Dual-Engine (Client Linear Algebra + Cloud QPU)<br/><b>Status:</b> 100% Implemented, Verified & Live", body_style)
        ]
    ]
    t_sign = Table(sign_block, colWidths=[270, 270])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Presentation Guide PDF successfully generated at: {filename}")

if __name__ == "__main__":
    output_path = os.path.join("d:\\Ananta", "Ananta_Presentation_Master_Guide.pdf")
    build_presentation_pdf(output_path)
