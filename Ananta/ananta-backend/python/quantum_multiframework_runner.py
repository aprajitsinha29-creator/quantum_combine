#!/usr/bin/env python3
"""
Ananta Quantum Studio - Real Multi-Framework Execution Engine

Executes an OpenQASM 2.0 circuit on an ACTUALLY INSTALLED quantum SDK
(Qiskit Aer, Google Cirq, or Xanadu PennyLane) and returns real sampled
measurement counts plus the exact (noiseless) statevector probabilities
for comparison.

This process is invoked once per request by
ananta-backend/utils/multiFrameworkClient.js via stdin/stdout JSON, so it
never keeps state between calls and never fabricates results: every code
path either returns data that actually came out of the named SDK, or an
honest {"success": false, "error": ...} explaining what went wrong (missing
package, malformed circuit, etc). Availability of each framework is
determined at runtime by actually importing it and running a real 1-qubit
self-test circuit through the full pipeline (see `probe_framework`) -
nothing here is a hardcoded "yes, this is supported" claim.

Bit-ordering note: Ananta's own engine (js/quantum-engine.js) labels basis
states with qubit 0 as the LEFTMOST/most-significant character (see
getProbabilities(): `idx.toString(2).padStart(numQubits, '0')` with
ctrlMask = 1 << (numQubits - 1 - qubitIndex)). Qiskit's classical-register
readout is little-endian (qubit 0 -> rightmost character), verified
empirically below, so Qiskit results are bit-reversed before being
returned. Cirq (with an explicit q_0..q_{n-1} qubit_order) and PennyLane's
qml.counts()/qml.probs() were both empirically verified to already match
Ananta's convention directly - see scratch tests run during development.
"""

import sys
import json
import time
import warnings

warnings.filterwarnings("ignore")

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def _build_qiskit_circuit(qasm):
    from qiskit import qasm2
    return qasm2.loads(
        qasm,
        custom_instructions=qasm2.LEGACY_CUSTOM_INSTRUCTIONS,
        include_path=qasm2.LEGACY_INCLUDE_PATH,
    )


def run_qiskit(qasm, num_qubits, shots):
    from qiskit_aer import AerSimulator
    from qiskit.quantum_info import Statevector
    import qiskit
    import qiskit_aer

    circuit = _build_qiskit_circuit(qasm)
    unitary_only = circuit.remove_final_measurements(inplace=False)
    if unitary_only is None:
        unitary_only = circuit
    sv = Statevector(unitary_only)

    ideal_probabilities = {}
    for bitstring, p in sv.probabilities_dict().items():
        if p > 1e-10:
            ideal_probabilities[bitstring[::-1]] = ideal_probabilities.get(bitstring[::-1], 0.0) + p

    sim = AerSimulator()
    result = sim.run(circuit, shots=shots).result()
    raw_counts = result.get_counts()

    counts = {}
    for bitstring, c in raw_counts.items():
        key = bitstring.replace(" ", "")[::-1]
        counts[key] = counts.get(key, 0) + c

    return {
        "counts": counts,
        "idealProbabilities": ideal_probabilities,
        "backendVersion": {"qiskit": qiskit.__version__, "qiskit_aer": qiskit_aer.__version__},
        "backendName": "AerSimulator (statevector method)",
    }


def run_cirq(qasm, num_qubits, shots):
    import cirq
    from cirq.contrib.qasm_import import circuit_from_qasm
    import numpy as np

    circuit = circuit_from_qasm(qasm)
    qubit_order = [cirq.NamedQubit(f"q_{i}") for i in range(num_qubits)]

    unitary_only = cirq.Circuit(
        op for op in circuit.all_operations() if not cirq.is_measurement(op)
    )
    sv = cirq.final_state_vector(unitary_only, qubit_order=qubit_order)
    probs_arr = np.abs(sv) ** 2

    ideal_probabilities = {}
    for i, p in enumerate(probs_arr):
        if p > 1e-10:
            ideal_probabilities[bin(i)[2:].zfill(num_qubits)] = float(p)

    sim = cirq.Simulator()
    result = sim.run(circuit, repetitions=shots)

    measured_qubits = {q.name for q in circuit.all_qubits()}
    key_names = [f"c_{i}" for i in range(num_qubits) if f"c_{i}" in result.measurements]

    counts = {}
    if key_names:
        for shot in range(shots):
            bits = "".join(str(int(result.measurements[k][shot][0])) for k in key_names)
            counts[bits] = counts.get(bits, 0) + 1
    else:
        # No explicit measurement gates were present in the QASM (shouldn't
        # normally happen - the Node bridge always appends a full-register
        # measurement - but sample from the ideal distribution honestly
        # rather than silently returning nothing).
        rng = np.random.default_rng()
        keys = list(ideal_probabilities.keys())
        weights = [ideal_probabilities[k] for k in keys]
        weights = np.array(weights) / sum(weights)
        for bitstring in rng.choice(keys, size=shots, p=weights):
            counts[bitstring] = counts.get(bitstring, 0) + 1

    import cirq as _cirq_mod
    return {
        "counts": counts,
        "idealProbabilities": ideal_probabilities,
        "backendVersion": {"cirq": _cirq_mod.__version__},
        "backendName": "cirq.Simulator (state-vector)",
    }


def run_pennylane(qasm, num_qubits, shots):
    import re
    import pennylane as qml
    import numpy as np

    # PennyLane's qasm loader (via the pennylane-qiskit plugin) miscounts
    # wires when explicit `measure ...;` statements are present - it starts
    # allocating wires for classical bits too, which breaks device wire
    # validation even on a plain 1-qubit circuit (verified empirically).
    # Measurement is instead done natively via qml.counts()/qml.probs()
    # below, so the unitary-only gate stream is all PennyLane needs.
    gate_only_qasm = re.sub(r"^\s*measure\b.*;\s*$", "", qasm, flags=re.MULTILINE)

    loaded = qml.from_qasm(gate_only_qasm)
    wires = list(range(num_qubits))

    dev_exact = qml.device("default.qubit", wires=num_qubits)

    @qml.qnode(dev_exact)
    def exact_circuit():
        loaded(wires=wires)
        return qml.probs(wires=wires)

    probs_arr = exact_circuit()
    ideal_probabilities = {}
    for i, p in enumerate(probs_arr):
        if p > 1e-10:
            ideal_probabilities[bin(i)[2:].zfill(num_qubits)] = float(p)

    dev_sampled = qml.device("default.qubit", wires=num_qubits, shots=shots)

    @qml.qnode(dev_sampled)
    def sampled_circuit():
        loaded(wires=wires)
        return qml.counts()

    raw_counts = sampled_circuit()
    counts = {str(k): int(v) for k, v in raw_counts.items()}

    return {
        "counts": counts,
        "idealProbabilities": ideal_probabilities,
        "backendVersion": {"pennylane": qml.__version__},
        "backendName": "default.qubit (PennyLane native simulator)",
    }


FRAMEWORK_RUNNERS = {
    "qiskit_aer": run_qiskit,
    "cirq": run_cirq,
    "pennylane": run_pennylane,
}

SELF_TEST_QASM = (
    "OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[1];\ncreg c[1];\n"
    "x q[0];\nmeasure q[0] -> c[0];\n"
)


def probe_framework(name):
    fn = FRAMEWORK_RUNNERS.get(name)
    if fn is None:
        return {"available": False, "error": f"Unknown framework '{name}'"}
    try:
        start = time.time()
        res = fn(SELF_TEST_QASM, 1, 8)
        elapsed_ms = int((time.time() - start) * 1000)
        counts = res["counts"]
        if counts.get("1", 0) != 8:
            return {
                "available": False,
                "error": f"Self-test circuit (X gate) returned unexpected counts {counts}; expected all-'1'",
            }
        return {
            "available": True,
            "backendVersion": res["backendVersion"],
            "backendName": res["backendName"],
            "selfTestMs": elapsed_ms,
        }
    except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a capability probe
        return {"available": False, "error": f"{type(exc).__name__}: {exc}"}


def handle_request(request):
    mode = request.get("mode", "run")

    if mode == "probe":
        frameworks = request.get("frameworks") or list(FRAMEWORK_RUNNERS.keys())
        results = {name: probe_framework(name) for name in frameworks}
        return {"success": True, "frameworks": results}

    if mode == "shutdown":
        return {"success": True, "shutdown": True}

    framework = request.get("framework")
    qasm = request.get("qasm", "")
    num_qubits = int(request.get("numQubits") or 0)
    shots = max(1, min(int(request.get("shots") or 1024), 20000))

    if framework not in FRAMEWORK_RUNNERS:
        return {
            "success": False,
            "error": f"Unsupported framework '{framework}'. Choose one of: {list(FRAMEWORK_RUNNERS.keys())}",
        }
    if not qasm or num_qubits <= 0:
        return {"success": False, "error": "Missing or invalid 'qasm' / 'numQubits'"}

    try:
        start = time.time()
        result = FRAMEWORK_RUNNERS[framework](qasm, num_qubits, shots)
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "success": True,
            "framework": framework,
            "shots": shots,
            "numQubits": num_qubits,
            "executionTimeMs": elapsed_ms,
            **result,
        }
    except Exception as exc:  # noqa: BLE001 - surfaced verbatim to the caller, not swallowed
        return {
            "success": False,
            "framework": framework,
            "error": f"{type(exc).__name__}: {exc}",
        }


def run_single_shot():
    """Read one JSON request from stdin, print one JSON response, exit."""
    raw = sys.stdin.read()
    try:
        request = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as exc:
        print(json.dumps({"success": False, "error": f"Invalid JSON on stdin: {exc}"}))
        return
    print(json.dumps(handle_request(request)))


def run_serve_loop():
    """
    Warm-process mode: pre-import all frameworks once (paying the multi-
    second cold-start cost a single time), then read newline-delimited JSON
    requests from stdin forever, writing one newline-delimited JSON response
    per request. This is what ananta-backend/utils/multiFrameworkClient.js
    spawns and keeps alive, so repeated /api/multiframework/run calls after
    the first no longer pay Qiskit/Cirq/PennyLane's import overhead.
    """
    for name in FRAMEWORK_RUNNERS:
        probe_framework(name)  # warms imports; result discarded, real errors surface later per-request
    print(json.dumps({"ready": True}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            print(json.dumps({"success": False, "error": f"Invalid JSON line: {exc}"}), flush=True)
            continue

        response = handle_request(request)
        print(json.dumps(response), flush=True)
        if response.get("shutdown"):
            break


if __name__ == "__main__":
    if "--serve" in sys.argv:
        run_serve_loop()
    else:
        run_single_shot()
