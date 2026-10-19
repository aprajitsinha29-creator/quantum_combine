"""
Ananta Quantum Studio - Real Multi-Framework Execution HTTP Service

This is the deployable form of quantum_multiframework_runner.py. Vercel's
Node serverless functions can't run this in-process: Qiskit Aer alone is
well over Vercel's function bundle size limit, and there's no persistent
process to keep a warm Python interpreter across invocations anyway. So
instead of trying to cram real quantum SDKs into a serverless function,
this runs as its own small, always-on web service (Render, Railway, Fly.io,
a plain VM - anywhere that lets you `pip install` and keep a process alive),
and ananta-backend/utils/multiFrameworkClient.js calls it over HTTPS when
MULTIFRAMEWORK_SERVICE_URL is set, instead of spawning a local subprocess.

Local dev (`node server.js`) still uses the subprocess/stdin-JSON path in
quantum_multiframework_runner.py directly - nothing here changes that.

Deploy:
  pip install -r requirements.txt
  uvicorn app:app --host 0.0.0.0 --port $PORT

Then set MULTIFRAMEWORK_SERVICE_URL=https://<your-deployed-host> in
whatever Node environment (Vercel, etc) should call it, and optionally
MULTIFRAMEWORK_SERVICE_TOKEN to require a shared-secret Authorization
header (recommended - this service otherwise executes arbitrary circuits
for anyone who finds the URL, which is wasted compute but not a data
exposure, since it holds no persistent state or credentials of its own).
"""

import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from quantum_multiframework_runner import handle_request, FRAMEWORK_RUNNERS

app = FastAPI(title="Ananta Multi-Framework Quantum Execution Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # circuits are the only payload; no cookies/credentials cross this boundary
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SERVICE_TOKEN = os.environ.get("MULTIFRAMEWORK_SERVICE_TOKEN", "")


def _check_auth(authorization: Optional[str]):
    if not SERVICE_TOKEN:
        return  # no token configured -> service is open (fine for a private/demo deployment)
    provided = (authorization or "").removeprefix("Bearer ").strip()
    if provided != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing service token")


class RunRequest(BaseModel):
    framework: str
    qasm: str
    numQubits: int
    shots: int = 1024


class ProbeRequest(BaseModel):
    frameworks: Optional[List[str]] = None


@app.on_event("startup")
def warm_up():
    # Pay each framework's multi-second import cost once at process start
    # instead of on whichever request happens to hit it first.
    for name in FRAMEWORK_RUNNERS:
        handle_request({"mode": "probe", "frameworks": [name]})


@app.get("/health")
def health():
    return {"status": "ONLINE", "frameworks": list(FRAMEWORK_RUNNERS.keys())}


@app.get("/frameworks")
def frameworks_probe(authorization: Optional[str] = Header(None)):
    _check_auth(authorization)
    result = handle_request({"mode": "probe"})
    return result


@app.post("/run")
def run_circuit(body: RunRequest, authorization: Optional[str] = Header(None)):
    _check_auth(authorization)
    result = handle_request({
        "mode": "run",
        "framework": body.framework,
        "qasm": body.qasm,
        "numQubits": body.numQubits,
        "shots": body.shots
    })
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Execution failed"))
    return result
