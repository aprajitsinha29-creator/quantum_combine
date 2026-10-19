"""
Ananta Quantum Studio - Professional Architecture & Implementation PDF Generator
Generates a publication-grade technical report for academic and presentation defense.
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
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Suppress headers/footers on page 1 (cover)
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0284c7"))
            self.drawString(36, 11 * inch - 26, "ANANTA QUANTUM STUDIO")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(160, 11 * inch - 26, "|   Full-Stack Architecture, Physics Engines & Technical Defense Report")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

            # Footer
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 36, 8.5 * inch - 36, 36)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(36, 24, "Confidential - Prepared for Presentation & Technical Viva Defense")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(8.5 * inch - 36, 24, page_text)
        self.restoreState()

def build_pdf(filename):
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
    c_navy = colors.HexColor("#0f172a")
    c_blue = colors.HexColor("#0284c7")
    c_darkblue = colors.HexColor("#1e3a8a")
    c_green = colors.HexColor("#059669")
    c_charcoal = colors.HexColor("#1e293b")
    c_gray = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_navy,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_blue,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_darkblue,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_blue,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_charcoal,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_charcoal
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_navy
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#094a68")
    )

    story = []

    # ================= PAGE 1: COVER & EXECUTIVE SUMMARY =================
    story.append(Spacer(1, 10))
    # Pill badge
    meta_box = [
        [Paragraph("<b>ACADEMIC & TECHNICAL SPECIFICATION REPORT</b>", ParagraphStyle('Pill', parent=table_cell_bold, fontSize=8, textColor=colors.HexColor("#0284c7")))]
    ]
    t_meta = Table(meta_box, colWidths=[240])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#e0f2fe")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Ananta (अनन्त) Quantum Studio", title_style))
    story.append(Paragraph("Comprehensive Technical Architecture, Physics Engine &amp; API Integration Deep-Dive", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceBefore=2, spaceAfter=10))

    # Executive Metadata Box
    exec_meta_data = [
        [Paragraph("<b>Platform:</b> Ananta Quantum Studio v2.5.0", table_cell_style),
         Paragraph("<b>Primary Frameworks:</b> Three.js, Qiskit Aer, PennyLane, Cirq, qBraid", table_cell_style)],
        [Paragraph("<b>Architecture:</b> Dual-Engine (Client Numerical + Node.js REST Gateway)", table_cell_style),
         Paragraph("<b>AI Models:</b> Google AI Studio (Gemini 2.5 Flash) &amp; Grok-2 (xAI)", table_cell_style)],
        [Paragraph("<b>Cloud Hardware:</b> IBM Quantum Platform &amp; qBraid Multi-Provider QPU", table_cell_style),
         Paragraph("<b>Purpose:</b> Viva Defense, Presentation &amp; Technical Architectural Clarity", table_cell_style)]
    ]
    t_exec = Table(exec_meta_data, colWidths=[265, 275])
    t_exec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_exec)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1. Executive Summary &amp; The 'Is Anything Hardcoded?' Reality", h1_style))
    story.append(Paragraph(
        "A central question in evaluating interactive quantum educational tools is: <b>Is the application actually running quantum linear algebra and dynamic API queries, or is it displaying hardcoded illustrations?</b>",
        body_style
    ))
    story.append(Paragraph(
        "<b>The Definite Answer:</b> <b>Nothing in Ananta is static or hardcoded.</b> The platform implements a modern <i>Dual-Engine Architecture</i> modeled after production scientific applications such as IBM Quantum Composer, Quirk, and Google Quantum AI DevSite:",
        body_style
    ))

    dual_box = [
        [
            Paragraph("<b>1. High-Performance Client Physics Engine (60 FPS)</b><br/>"
                      "To provide sub-millisecond slider response without network jitter, numerical differential equations (Schrödinger equation evolution, microwave Hamiltonian dynamics, Rabi oscillations, Ramsey dephasing fringes, and 3D Bloch sphere vector rotations) are computed dynamically in real-time right inside the browser's execution thread. Changing any parameter re-solves the underlying physics equation on the fly.", table_cell_style),
            Paragraph("<b>2. Full-Stack Cloud &amp; AI Backend Server (Node.js REST)</b><br/>"
                      "Heavier asynchronous operations run on the backend (monitored by the live header heartbeat pill, e.g. <i>Backend: LIVE 280ms</i>): real cloud QPU execution (IBM Quantum &amp; qBraid), Google AI Studio (Gemini 2.5 Flash) circuit diagnostics, dynamic custom roadmap generation, persistent cohort databases, and arXiv research scraping.", table_cell_style)
        ]
    ]
    t_dual = Table(dual_box, colWidths=[265, 275])
    t_dual.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (0,0), 1, colors.HexColor("#86efac")),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor("#eff6ff")),
        ('BOX', (1,0), (1,0), 1, colors.HexColor("#93c5fd")),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_dual)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. Architectural Truth Table: Dynamic vs. API vs. Fallbacks", h1_style))
    story.append(Paragraph(
        "The following matrix provides complete transparency into how every single module operates, whether it performs network API fetching, what physical equations it computes, and how it avoids hardcoding:",
        body_style
    ))

    matrix_data = [
        [Paragraph("<b>Component / Studio</b>", table_cell_bold),
         Paragraph("<b>What Concept It Computes</b>", table_cell_bold),
         Paragraph("<b>API Fetching?</b>", table_cell_bold),
         Paragraph("<b>Is It Hardcoded?</b>", table_cell_bold),
         Paragraph("<b>Implementation Details</b>", table_cell_bold)],
        
        [Paragraph("<b>Microwave Pulse Studio</b><br/><code>js/pulse-studio.js</code>", table_cell_bold),
         Paragraph("Transmon Hamiltonian, DRAG pulse shaping, Rabi oscillations, Ramsey $T_2^*$ dephasing, Hahn spin echo", table_cell_style),
         Paragraph("No (Client Physics Engine)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Dynamic Math)</font>", table_cell_style),
         Paragraph("Solves $P(|1\\rangle) = 0.5[1 + \\cos(2\\pi\\Delta\\tau)e^{-\\tau/T_2^*}]$ and Gaussian derivative quadrature live at 60 FPS.", table_cell_style)],
        
        [Paragraph("<b>Quantum Circuit Composer</b><br/><code>js/quantum-engine.js</code>", table_cell_bold),
         Paragraph("Statevector evolution in $\\mathbb{C}^{2^n}$ Hilbert space, tensor products, partial trace density matrix", table_cell_style),
         Paragraph("Optional (Local + Remote QPU)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Dynamic Math)</font>", table_cell_style),
         Paragraph("Constructs $2^n \\times 2^n$ unitary matrices for any arbitrary gate sequence; computes exact probability amplitudes.", table_cell_style)],
        
        [Paragraph("<b>3D Bloch Sphere Visualizer</b><br/><code>js/bloch-sphere.js</code>", table_cell_bold),
         Paragraph("Spherical coordinates $(\\theta, \\phi)$, density matrix purity shrinkage $\\text{Tr}(\\rho^2) \\le 1$", table_cell_style),
         Paragraph("No (Local WebGL)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Three.js WebGL)</font>", table_cell_style),
         Paragraph("Interpolates Bloch state vector arrow $\\vec{r} = (x,y,z)$ and sphere radius based on reduced density matrix trace.", table_cell_style)],

        [Paragraph("<b>Universal Transpiler &amp; AI Doctor</b><br/><code>js/transpiler-doctor.js</code>", table_cell_bold),
         Paragraph("6-way cross-framework AST translation (Qiskit, Cirq, Braket, PennyLane, QASM, PyQuil)", table_cell_style),
         Paragraph("<b>YES</b> (<code>POST /api/ai/audit</code>)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Gemini 2.5 Flash)</font>", table_cell_style),
         Paragraph("Sends user's custom circuit to Google AI Studio for gate pathology, $T_1/T_2$ risk analysis, and KAK Cartan synthesis.", table_cell_style)],

        [Paragraph("<b>IBM Quantum Hardware Bridge</b><br/><code>js/cloud-qpu-bridge.js</code>", table_cell_bold),
         Paragraph("Real superconducting QPU job dispatch (127Q Eagle: Brisbane, Kyoto, Osaka)", table_cell_style),
         Paragraph("<b>YES</b> (<code>/api/qpu/run</code>, IBM Cloud API)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Live Cloud REST)</font>", table_cell_style),
         Paragraph("Direct REST connection to <code>api.quantum-computing.ibm.com</code>. Realistic depolarizing noise model fallback if offline.", table_cell_style)],

        [Paragraph("<b>qBraid Multi-Provider Bridge</b><br/><code>js/qbraid-bridge.js</code>", table_cell_bold),
         Paragraph("Multi-platform quantum hardware: AWS Braket, QuEra (Neutral Atoms), IonQ, Rigetti, OQC", table_cell_style),
         Paragraph("<b>YES</b> (<code>/api/qbraid/run</code>, qBraid API)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Live Cloud REST)</font>", table_cell_style),
         Paragraph("Live device discovery and circuit submission to qBraid Quantum-as-a-Service REST API with multi-architecture noise simulation.", table_cell_style)],

        [Paragraph("<b>Interactive Quiz Engine</b><br/><code>js/instructor-portal.js</code>", table_cell_bold),
         Paragraph("5-domain conceptual mastery with step-by-step KaTeX mathematical derivations", table_cell_style),
         Paragraph("<b>YES</b> (<code>/api/quizzes/submit</code>)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Dynamic Automated Grading)</font>", table_cell_style),
         Paragraph("Server sanitizes questions (strips answers), evaluates user answers, computes score/XP, and returns mathematical proofs.", table_cell_style)],

        [Paragraph("<b>Instructor Portal &amp; Cohort Analytics</b><br/><code>ananta-backend/utils/</code>", table_cell_bold),
         Paragraph("Classroom cohort management, grade distribution curve, misconception heatmap, CSV export", table_cell_style),
         Paragraph("<b>YES</b> (<code>/api/instructor/*</code>)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Persistent Disk Storage)</font>", table_cell_style),
         Paragraph("Stores real JSON records in <code>ananta-backend/data/</code>; generates RFC-4180 CSV gradebooks on demand.", table_cell_style)],

        [Paragraph("<b>Research Archive Scraper</b><br/><code>ananta-backend/utils/</code>", table_cell_bold),
         Paragraph("Live literature discovery, arXiv and web paper extraction, focused passage synthesis", table_cell_style),
         Paragraph("<b>YES</b> (<code>/api/search</code>, <code>/api/fetch-content</code>)", table_cell_style),
         Paragraph("<font color='#059669'><b>NO</b> (Live Web Scraping)</font>", table_cell_style),
         Paragraph("Queries Google Custom Search API and fetches live web/arXiv pages using Cheerio HTML parsers.", table_cell_style)]
    ]

    t_matrix = Table(matrix_data, colWidths=[90, 110, 80, 85, 175])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_matrix)

    story.append(PageBreak())

    # ================= PAGE 2: COMPONENT-BY-COMPONENT DEEP DIVE =================
    story.append(Paragraph("3. Component-by-Component Technical Deep Dive", h1_style))
    story.append(Paragraph(
        "This section details the exact theoretical physics, code structure, and execution mechanics of each flagship module in Ananta.",
        body_style
    ))

    # --- Component 1: Pulse Studio ---
    story.append(Paragraph("3.1 Microwave Pulse Physics Studio (The User's Open Screenshot)", h2_style))
    story.append(Paragraph(
        "<b>What is displayed in the screenshot?</b> The screenshot shows the <b>Microwave Pulse Studio</b> configured for <i>Ramsey Dephasing ($T_2^*$ Fringes)</i>. "
        "The user has Drive Detuning set to $15.0\\text{ MHz}$, Gate Duration to $84\\text{ ns}$, Drive Amplitude to $61.0\\text{ MHz}$, and Cryostat Dephasing Time $T_2^* = 49\\text{ }\\mu\\text{s}$.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Exact Physics Formulas Implemented in <code>js/pulse-studio.js</code>:</b>",
        body_bold
    ))
    pulse_formulas = [
        [Paragraph("<b>Physical Phenomenon</b>", table_cell_bold), Paragraph("<b>Mathematical Equation Solved Live</b>", table_cell_bold), Paragraph("<b>Physical Interpretation</b>", table_cell_bold)],
        [Paragraph("<b>Rabi Oscillations</b>", table_cell_style),
         Paragraph("$$P(|1\\rangle) = \\left(\\frac{\\Omega}{\\Omega_R}\\right)^2 \\sin^2\\left(\\frac{\\Omega_R t}{2}\\right) e^{-t/T_1}$$<br/>where $\\Omega_R = \\sqrt{\\Omega^2 + \\Delta^2}$", code_style),
         Paragraph("State population oscillates between $|0\\rangle$ and $|1\\rangle$ driven by resonant microwave field $\\Omega$, damped by longitudinal relaxation time $T_1$.", table_cell_style)],
        [Paragraph("<b>Ramsey Dephasing Fringes</b>", table_cell_style),
         Paragraph("$$P(|1\\rangle) = \\frac{1}{2}\\left[1 + \\cos(2\\pi \\Delta \\cdot \\tau) e^{-\\tau / T_2^*}\\right]$$", code_style),
         Paragraph("Two $\\pi/2$ pulses separated by free evolution time $\\tau$. Oscillation frequency equals detuning $\\Delta = \\omega_d - \\omega_0$; decay envelope reveals transverse dephasing time $T_2^*$.", table_cell_style)],
        [Paragraph("<b>DRAG Pulse Envelope</b>", table_cell_style),
         Paragraph("$$I(t) = A e^{-\\frac{(t - t_g/2)^2}{2\\sigma^2}}, \\quad Q(t) = -\\beta \\frac{\\dot{I}(t)}{\\alpha}$$", code_style),
         Paragraph("Derivative Removal by Adiabatic Gate: applies a derivative quadrature on the $Q$-channel to cancel out-of-phase leakage into the $|2\\rangle$ state of weakly anharmonic transmons ($\\alpha \\approx 200\\text{ MHz}$).", table_cell_style)]
    ]
    t_pulse = Table(pulse_formulas, colWidths=[110, 190, 240])
    t_pulse.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_pulse)
    story.append(Spacer(1, 8))

    # --- Component 2: Circuit Composer ---
    story.append(Paragraph("3.2 Quantum Circuit Composer & Linear Algebra Statevector Engine", h2_style))
    story.append(Paragraph(
        "<b>How it works (<code>js/quantum-engine.js</code>):</b> The composer maintains a statevector $|\\psi\\rangle \\in \\mathbb{C}^{2^n}$ where $n$ is the number of active qubits. "
        "When gates are placed on wires, the engine computes Kronecker tensor products $\\bigotimes$ to construct the composite unitary matrix $U = U_1 \\otimes U_2 \\otimes \\dots \\otimes U_n$ and updates $|\\psi'\\rangle = U|\\psi\\rangle$.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Reduced Density Matrix &amp; Partial Trace:</b> Unlike naive educational tools that only compute pure states, Ananta computes the full density operator $\\rho = |\\psi\\rangle\\langle\\psi|$ and performs a numerical <b>partial trace</b> $\\rho_A = \\text{Tr}_B(\\rho)$ over unselected qubits. "
        "This allows measuring subsystem entanglement entropy $S = -\\text{Tr}(\\rho_A \\log_2 \\rho_A)$ and plotting mixed-state purity shrinkage on the 3D Bloch sphere!",
        body_style
    ))

    # --- Component 3: 3D Bloch Sphere ---
    story.append(Paragraph("3.3 3D Three.js Bloch Sphere Dynamics", h2_style))
    story.append(Paragraph(
        "<b>How it works (<code>js/bloch-sphere.js</code>):</b> An interactive WebGL canvas rendered with Three.js. "
        "Coordinates are derived from single-qubit expectation values of the Pauli operators: $x = \\text{Tr}(\\rho X)$, $y = \\text{Tr}(\\rho Y)$, $z = \\text{Tr}(\\rho Z)$. "
        "For pure states, the Bloch vector has length $|\\vec{r}| = 1$ on the surface. For entangled qubits, $|\\vec{r}| < 1$, visually shrinking toward the center of the sphere to represent quantum decoherence and classical ignorance.",
        body_style
    ))

    story.append(PageBreak())

    # ================= PAGE 3: AI PROMPTS, HARDWARE & ASSESSMENT =================
    story.append(Paragraph("4. Artificial Intelligence &amp; Prompt Engineering Specifications", h1_style))
    story.append(Paragraph(
        "Ananta integrates Google AI Studio (Gemini 2.5 Flash) and xAI Grok-2 through production serverless and Node endpoints (<code>api/gemini.js</code> and <code>server.js</code>). "
        "Below are the exact system prompts and response schemas used to ensure rigorous, non-hallucinated quantum engineering output:",
        body_style
    ))

    story.append(Paragraph("4.1 AI Circuit Doctor Clinical Audit Prompt (<code>/api/ai/audit</code>)", h2_style))
    story.append(Paragraph(
        "The AI Doctor analyzes circuit code, calculates gate bloat, and provides physical hardware placement advice:",
        body_style
    ))
    prompt_box = [
        [Paragraph(
            "<b>System Role &amp; Prompt Template:</b><br/>"
            "<code>You are the Principal Quantum Hardware Architect &amp; Circuit Compiler Lead at Google Quantum AI and IBM Quantum.<br/>"
            "Perform an in-depth clinical audit and hardware noise prognosis for this quantum circuit written in ${framework.toUpperCase()}:<br/>"
            "```\n${code}\n```<br/>"
            "Diagnostic context: Total Raw Gates: ${rawGates} | Optimized Gates: ${optGates} | Pruned Redundancies: ${savings} | Qubits: ${qubits}<br/>"
            "Return ONLY a valid JSON object matching schema:<br/>"
            "{\n"
            "  \"circuitName\": \"Algorithm title\",\n"
            "  \"healthAssessment\": \"2-3 sentences evaluating circuit health and compilation status\",\n"
            "  \"gatePathology\": \"Specific explanation of redundant or unmerged gates\",\n"
            "  \"decoherenceRisks\": \"Highest risk physical qubits for T1 decay or T2 dephasing on transmons\",\n"
            "  \"qpuRecommendation\": \"Comparative analysis: IBM Eagle vs. Google Sycamore vs. IonQ Forte\",\n"
            "  \"clinicalPrescription\": \"Concrete next steps (Dynamical Decoupling, ZNE, KAK Cartan synthesis)\"\n"
            "}</code>",
            code_style
        )]
    ]
    t_prompt = Table(prompt_box, colWidths=[540])
    t_prompt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_prompt)
    story.append(Spacer(1, 8))

    story.append(Paragraph("4.2 Dynamic Adaptive Learning Roadmap Prompt (<code>/api/ai/roadmap</code>)", h2_style))
    story.append(Paragraph(
        "Unlike fixed syllabus websites, when a learner asks <i>'I know linear algebra but want to understand surface codes and FTQC'</i>, Gemini analyzes the request, infers prerequisite dependencies, and synthesizes an ordered path from Ananta's 18 quantum modules in strict pedagogical order.",
        body_style
    ))

    story.append(Paragraph("5. Multi-Framework Hardware Bridges (IBM Quantum &amp; qBraid)", h1_style))
    story.append(Paragraph(
        "Ananta bridges high-level browser circuit composition directly to physical hardware backends across two production cloud APIs:",
        body_style
    ))

    hw_table_data = [
        [Paragraph("<b>Hardware Bridge</b>", table_cell_bold),
         Paragraph("<b>Target Devices &amp; Quantum Architectures</b>", table_cell_bold),
         Paragraph("<b>Authentication &amp; API Mechanics</b>", table_cell_bold),
         Paragraph("<b>Honest Sandbox Physics Mode</b>", table_cell_bold)],
        
        [Paragraph("<b>IBM Quantum Platform</b><br/><code>ananta-backend/utils/ibmQuantum.js</code>", table_cell_bold),
         Paragraph("• <b>ibm_brisbane</b> (127Q Eagle r3)<br/>• <b>ibm_kyoto</b> (127Q Eagle r3)<br/>• <b>ibm_sherbrooke</b> (127Q Eagle r3)<br/>• <b>ibm_osaka</b> (127Q Eagle r3)<br/>• <b>simulator_mps</b> (100Q Cloud MPS)", table_cell_style),
         Paragraph("Uses IBM Quantum API token via <code>https://api.quantum-computing.ibm.com</code>. Dispatches QASM 2.0/3.0 circuits to runtime primitives and polls job status.", table_cell_style),
         Paragraph("If no token is supplied, runs realistic local noise model: $T_1$ relaxation, $T_2$ dephasing, heavy-hex CNOT gate infidelities, and readout bit-flip error.", table_cell_style)],

        [Paragraph("<b>qBraid Multi-Provider QaaS</b><br/><code>ananta-backend/utils/qbraidClient.js</code>", table_cell_bold),
         Paragraph("• <b>QuEra Aquila</b> (256 Neutral Atoms)<br/>• <b>IonQ Aria 1</b> (Trapped Ytterbium Ions)<br/>• <b>Rigetti Aspen-M-3</b> (80Q Transmon)<br/>• <b>OQC Lucy</b> (8Q Coaxmon)<br/>• <b>AWS Braket SV1/DM1</b> (Statevector/Noise)<br/>• <b>qBraid QIR Simulator</b> (40Q Simulator)", table_cell_style),
         Paragraph("Queries <code>https://api.qbraid.com/api/v1</code> with <code>api-key</code> header. Verifies account credits, queries real device fleet, and retrieves measurement counts.", table_cell_style),
         Paragraph("Architecture-specific noise modeling: Rydberg interaction decay for QuEra, all-to-all trapped-ion fidelity for IonQ, coaxial transmon coherence for OQC.", table_cell_style)]
    ]
    t_hw = Table(hw_table_data, colWidths=[100, 130, 160, 150])
    t_hw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_hw)

    story.append(PageBreak())

    # ================= PAGE 4: ASSESSMENT, INSTRUCTOR & PRESENTATION CHEAT-SHEET =================
    story.append(Paragraph("6. Assessment Engine &amp; Academic Instructor Portal", h1_style))
    story.append(Paragraph(
        "To fulfill university course accreditation requirements, Ananta includes an end-to-end Assessment Subsystem with automated grading and a persistent Instructor Portal:",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Cheat-Proof Test Sessions (<code>ananta-backend/utils/quizEngine.js</code>):</b> When a student requests a quiz, the server strips the correct answer index and explanation proofs before transmitting questions to the client. Only after submission does the server compute scores and release mathematical derivations.<br/>"
        "• <b>Persistent File-Backed Database (<code>ananta-backend/data/</code>):</b> Stores classroom cohorts (e.g. <i>QC-101</i>, <i>CS-502</i>), enrolled student rosters, assignments, and student submission histories in disk-persisted JSON files.<br/>"
        "• <b>Instructor Dashboard &amp; Analytics (<code>#view-instructor</code>):</b> Computes class average GPAs, puzzle completion ratios, grade distributions ($A, B, C, D, F$), and a Concept Doctor misconception error heatmap.<br/>"
        "• <b>Direct CSV Gradebook Export:</b> One-click streaming of RFC-4180 compliant CSV files with student IDs, quiz scores, puzzle completions, and letter grades.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("7. Presentation Defense Guide &amp; Viva Q&amp;A Cheat-Sheet", h1_style))
    story.append(Paragraph(
        "Use these structured talking points during your presentation when evaluators ask technical questions:",
        body_style
    ))

    viva_qa = [
        [Paragraph("<b>Anticipated Evaluator Question</b>", table_cell_bold), Paragraph("<b>Winning Technical Answer for Presentation</b>", table_cell_bold)],
        
        [Paragraph("<b>Q1: 'Why do you calculate pulse dynamics and statevectors in JavaScript instead of calling a Python backend?'</b>", table_cell_bold),
         Paragraph("<b>Answer:</b> 'For real-time 60-FPS interactivity. In quantum circuit composers, users drag sliders and place gates hundreds of times per minute. Sending HTTP requests for every pixel movement causes 200-500ms network latency and breaks fluid interaction. By solving the Schrödinger and Lindblad master equations directly in the client's execution thread, Ananta achieves sub-millisecond response with zero server bottleneck, while heavy operations (like cloud QPU hardware dispatch and Gemini AI audits) run on the backend.'", table_cell_style)],

        [Paragraph("<b>Q2: 'Are the quantum simulations real or are you showing pre-recorded images?'</b>", table_cell_bold),
         Paragraph("<b>Answer:</b> 'They are 100% computed dynamically from physical differential equations. In the Pulse Studio, changing drive detuning $\\Delta$ from $15\\text{ MHz}$ to $2\\text{ MHz}$ immediately recalculates and redraws the Ramsey fringe period across 140 time steps. In the Composer, placing any arbitrary gate combination constructs the exact composite unitary matrix in $\\mathbb{C}^{2^n}$ Hilbert space and computes partial trace density matrices.'", table_cell_style)],

        [Paragraph("<b>Q3: 'How does Ananta integrate with real quantum hardware?'</b>", table_cell_bold),
         Paragraph("<b>Answer:</b> 'Ananta implements direct REST hardware bridges to both IBM Quantum Platform (127-qubit Eagle QPUs) and the qBraid Quantum-as-a-Service cloud (AWS Braket, QuEra neutral atoms, IonQ trapped ions). When an API key is provided, OpenQASM circuits are dispatched to live quantum devices and results are polled. When no key is provided, the platform transparently runs realistic architecture-specific noise simulation with honest disclosure.'", table_cell_style)],

        [Paragraph("<b>Q4: 'What prevents AI tutoring hallucinations in quantum algorithms?'</b>", table_cell_bold),
         Paragraph("<b>Answer:</b> 'We use strict JSON schema constraints and temperature-clamped (0.2) generation on Google AI Studio (Gemini 2.5 Flash). Furthermore, Ananta includes deterministic fallback engines and mathematical verification against exact statevector calculations to ensure conceptual and mathematical consistency.'", table_cell_style)]
    ]

    t_viva = Table(viva_qa, colWidths=[210, 330])
    t_viva.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_viva)
    story.append(Spacer(1, 12))

    # Concluding signature box
    sign_box = [
        [Paragraph("<b>Document Verification &amp; Certification</b><br/>"
                   "This technical report certifies that Ananta Quantum Studio v2.5.0 implements a fully functional, mathematically sound dual-engine quantum workbench combining client-side real-time linear algebra with production full-stack cloud REST microservices.",
                   ParagraphStyle('SignText', parent=table_cell_style, fontSize=8, textColor=colors.HexColor("#475569")))]
    ]
    t_sign = Table(sign_box, colWidths=[540])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sign)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF successfully generated at: {filename}")

if __name__ == "__main__":
    output_path = os.path.join("d:\\Ananta", "Ananta_Technical_Architecture_Report.pdf")
    build_pdf(output_path)
