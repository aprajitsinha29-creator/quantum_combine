"""
Scans paper text for signs of code: repo links, code-availability
statements, and known quantum algorithms/libraries, so a user can ask
"which paper has code for Grover's algorithm" and get a real match.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

REPO_URL_PATTERN = re.compile(
    r"https?://(?:www\.)?(?:github|gitlab|bitbucket)\.(?:com|org)/[^\s,)\]}]+"
    r"|https?://(?:www\.)?zenodo\.org/record/[^\s,)\]}]+"
    r"|https?://(?:www\.)?osf\.io/[^\s,)\]}]+",
    re.IGNORECASE,
)

AVAILABILITY_PATTERN = re.compile(
    r"(code\s+(?:is\s+)?(?:available|released|open[- ]sourced?)\b[^.\n]{0,160}\.)"
    r"|((?:our\s+)?(?:implementation|source\s+code|codebase)\s+(?:is\s+)?"
    r"(?:available|can\s+be\s+found)\b[^.\n]{0,160}\.)",
    re.IGNORECASE,
)

KNOWN_LIBRARIES = [
    "qiskit", "cirq", "pennylane", "pyquil", "qutip", "strawberry fields",
    "tket", "braket", "quantum development kit", "q#", "openfermion",
    "tequila", "projectq", "quimb", "tensorflow quantum",
]

KNOWN_ALGORITHMS = [
    "shor's algorithm", "grover's algorithm", "vqe", "variational quantum eigensolver",
    "qaoa", "quantum approximate optimization algorithm", "hhl algorithm",
    "quantum phase estimation", "quantum fourier transform", "surface code",
    "quantum error correction", "quantum walk", "amplitude estimation",
    "quantum annealing", "trotterization",
]


@dataclass
class CodeScanResult:
    repo_links: List[str] = field(default_factory=list)
    availability_statements: List[str] = field(default_factory=list)
    libraries_mentioned: List[str] = field(default_factory=list)
    algorithms_mentioned: List[str] = field(default_factory=list)

    @property
    def has_code_evidence(self) -> bool:
        return bool(self.repo_links or self.availability_statements)

    def to_dict(self) -> dict:
        return {
            "repo_links": self.repo_links,
            "availability_statements": self.availability_statements,
            "libraries_mentioned": self.libraries_mentioned,
            "algorithms_mentioned": self.algorithms_mentioned,
            "has_code_evidence": self.has_code_evidence,
        }


def scan_text(text: str) -> CodeScanResult:
    text = text or ""
    lower = text.lower()

    repo_links = sorted(set(m.group(0).rstrip(".,);") for m in REPO_URL_PATTERN.finditer(text)))
    availability = [m.group(0).strip() for m in AVAILABILITY_PATTERN.finditer(text)]
    libraries = sorted({lib for lib in KNOWN_LIBRARIES if lib in lower})
    algorithms = sorted({algo for algo in KNOWN_ALGORITHMS if algo in lower})

    return CodeScanResult(
        repo_links=repo_links,
        availability_statements=availability[:5],
        libraries_mentioned=libraries,
        algorithms_mentioned=algorithms,
    )


def matches_query(scan: CodeScanResult, query: str) -> bool:
    q = query.lower().strip()
    if not q:
        return False
    haystack = " ".join(
        scan.libraries_mentioned + scan.algorithms_mentioned + scan.repo_links
    ).lower()
    return q in haystack or any(q in item for item in haystack.split())
