# Ananta (अनन्त) — Quantum Circuit Studio, Simulator & Classroom Platform

**Ananta** is a full-stack quantum computing education platform built for SIH 26140 (*AI-Based Interactive Quantum Algorithm Learning Platform*): a hand-written, physics-correct complex statevector simulator, real execution on Qiskit Aer / Cirq / PennyLane and real cloud quantum hardware (IBM Quantum, qBraid's multi-provider bridge to AWS Braket/QuEra/IonQ/Rigetti/OQC), an AI circuit tutor grounded in the actual simulated state (not guesses), a graded quiz + coding-challenge assessment engine, and an authenticated instructor dashboard.

---

## What's actually in here

| Area | What it does | Key files |
|---|---|---|
| Circuit Composer | Drag-and-drop multi-qubit circuit builder (H, X, Y, Z, S, T, CNOT, SWAP, Toffoli, Measure), up to 8 qubits | `js/circuit-ui.js`, `js/quantum-engine.js` |
| Statevector Engine | Complex linear algebra in ℂ^2ⁿ: statevector evolution, density matrix, entanglement entropy/concurrence, full unitary construction (`U_total`), Bloch sphere coordinates | `js/quantum-engine.js` |
| 3D Visualization | Three.js Bloch sphere, probability/amplitude histograms, unitary matrix + LaTeX derivations | `js/bloch-sphere.js` |
| Real Cloud Hardware | IBM Quantum Runtime and qBraid (AWS Braket, QuEra, IonQ, Rigetti, OQC) - real REST API calls when a token/key is supplied, honestly-labeled calibrated-noise simulation otherwise | `js/cloud-qpu-bridge.js`, `js/qbraid-bridge.js`, `ananta-backend/utils/ibmQuantum.js`, `ananta-backend/utils/qbraidClient.js` |
| Real Multi-Framework Execution | Genuine Qiskit Aer / Cirq / PennyLane execution (not code export) via a Python worker process | `ananta-backend/python/`, `ananta-backend/utils/multiFrameworkClient.js`, `js/multiframework-bridge.js` — see [below](#running-real-qiskitcirqpennylane-execution) |
| AI Circuit Tutor | Grounds every claim in the actual gate grid + computed statevector/entanglement metrics; answers student questions using Gemini when configured, or a real (non-generic) offline pattern-matcher otherwise | `js/circuit-tutor.js`, `api/gemini.js` |
| Voice Copilot | Speech-to-circuit gate placement | `js/quantum-voice-copilot.js`, `ananta-backend/utils/voiceAgent.js` |
| Assessment Engine | 5-domain graded quiz bank with worked-solution explanations, real per-submission misconception tagging (not a static list) | `ananta-backend/utils/quizEngine.js` |
| Instructor Portal | Cohort/roster/gradebook management, protected by real auth (`role: 'instructor'`) | `js/instructor-portal.js`, `ananta-backend/utils/instructorStorage.js` |
| Authentication | scrypt-hashed passwords, HMAC-signed sessions, real logout revocation and login throttling | `ananta-backend/utils/authService.js` |
| Knowledge Corpus | Large curated content: algorithm zoo (Grover, Shor, VQE, QAOA, Deutsch-Jozsa, surface codes...), research paper library | `js/quantum-knowledge-data.js`, `js/quantum-algorithm-zoo-data.js`, `js/quantum-expanded-corpus.js` |

---

## Running it locally

```bash
git clone https://github.com/anushkagupta200615-jpg/Ananta.git
cd Ananta
npm install
cp .env.example .env   # paste your real values in - see below
node server.js
```

Open `http://localhost:5500`. `.env` is gitignored - nothing pasted there ever gets committed. With it empty (or absent entirely), everything runs in **local/offline mode**: auth and instructor data fall back to JSON files under `ananta-backend/data/` (gitignored), the AI tutor falls back to a grounded-but-non-LLM analysis, and multi-framework execution auto-discovers a local Python interpreter.

## Environment variables

None of these are required to run locally — each one just upgrades a specific feature from its honest offline fallback to the real thing.

| Variable | Enables | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Real LLM-backed AI Circuit Tutor, voice intent parsing, research summarization | [Google AI Studio](https://aistudio.google.com/apikey) |
| `IBM_QUANTUM_TOKEN` | Real job submission to IBM Quantum hardware/cloud simulators | [quantum.ibm.com/account](https://quantum.ibm.com/account) |
| `QBRAID_API_KEY` | Real job submission via qBraid to AWS Braket / QuEra / IonQ / Rigetti / OQC | [account.qbraid.com](https://account.qbraid.com) |
| `DATABASE_URL` | **Required for production.** Real Postgres-backed accounts and instructor data instead of the local-JSON-file fallback (which does not work on serverless hosts — see below) | A Postgres connection string, e.g. Supabase's "Transaction pooler" URI from Project Settings → Database |
| `ANANTA_SESSION_SECRET` | **Required whenever `DATABASE_URL` is set.** Signs session tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | You generate this yourself |
| `ANANTA_PYTHON_BIN` | Pin a specific Python interpreter for local multi-framework execution instead of auto-discovering `python3`/`python`/`py -3` | Your own Python path |
| `MULTIFRAMEWORK_SERVICE_URL` | Point multi-framework execution at a separately-deployed instance of `ananta-backend/python/app.py` instead of spawning a local subprocess — **required on Vercel**, see below | Wherever you deploy `ananta-backend/python/` |
| `MULTIFRAMEWORK_SERVICE_TOKEN` | Shared-secret auth between this app and the deployed Python service above | You generate this yourself |

## Deploying for real (not just to localhost)

This app has two runtimes that need to go to two different places:

**1. The Node app (`api/index.js` on Vercel, or `server.js` anywhere else).** Set `GEMINI_API_KEY`, `DATABASE_URL`, `ANANTA_SESSION_SECRET` (and optionally the IBM/qBraid keys) in your host's environment variables.

**2. The Python multi-framework execution service (`ananta-backend/python/`).** Vercel's Node serverless functions cannot run this — Qiskit Aer alone exceeds Vercel's function bundle size limits, and there's no persistent process to keep a warm interpreter across invocations. Deploy it as its own small always-on web service instead:

```bash
cd ananta-backend/python
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port $PORT   # or: the included Procfile
```

Render, Railway, and Fly.io all support this directly from this repo (point them at `ananta-backend/python` as the root, they'll pick up `requirements.txt` and `Procfile`). Once deployed, set `MULTIFRAMEWORK_SERVICE_URL` (and `MULTIFRAMEWORK_SERVICE_TOKEN`, recommended) on your Node host to point at it.

**Why a database is required in production:** Vercel's serverless filesystem is read-only outside `/tmp`, and `/tmp` isn't shared or durable across invocations. A JSON file (this project's local-dev fallback) cannot hold real user accounts there. `ananta-backend/utils/db.js` is a thin `pg` wrapper that auto-creates its schema on first connection — any standard Postgres connection string works (Supabase, Neon, Vercel Postgres, Railway Postgres).

## Project structure

```
Ananta/
├── index.html                          # Single-page app shell (all views)
├── style.css
├── server.js                           # Local-dev / self-hosted Node server (long-lived process)
├── api/
│   ├── index.js                        # Vercel serverless entry point (routes mirror server.js)
│   └── gemini.js                       # AI provider gateway (Gemini/Grok) + grounded offline fallbacks
├── ananta-backend/
│   ├── utils/                          # Auth, DB, quiz engine, instructor storage, hardware bridges, RAG
│   ├── data/                           # Local-dev JSON fallback store (gitignored, not the prod path)
│   └── python/                         # Real Qiskit Aer / Cirq / PennyLane execution engine + HTTP service
├── js/                                 # Frontend: circuit engine, UI, visualizations, knowledge corpus
└── scripts/                            # One-off verification/maintenance scripts
```

---

## Philosophical heritage

> *"सर्वं द्रव्यं परमाणु रूपम्"*
> *(All matter is composed of eternal, indivisible, vibrating quanta)*
> — **Maharshi Kanada**, *Vaisheshika Sutra* (~6th century BCE)

*Ananta* ("the infinite") draws its name from this tradition of cosmic atomism, alongside modern quantum linear algebra.

## License

MIT.
