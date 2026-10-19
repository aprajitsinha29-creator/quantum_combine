"""
Central configuration for the Quantum Research backend.
Nothing here is a secret - arXiv's API is free and keyless.
"""

import os

# --- arXiv ---
ARXIV_API_URL = "http://export.arxiv.org/api/query"
ARXIV_DEFAULT_QUERY = "quantum computing"
ARXIV_MAX_RESULTS_DEFAULT = 25
ARXIV_MAX_RESULTS_CAP = 100

# --- Storage ---
DB_PATH = os.environ.get("QUANTUM_DB_PATH", "quantum_papers.db")

# --- Summarizer ---
SUMMARY_SENTENCE_COUNT = int(os.environ.get("SUMMARY_SENTENCE_COUNT", "5"))

# --- PDF fetching ---
PDF_FETCH_TIMEOUT_SECONDS = 20
MAX_PDF_BYTES = 25 * 1024 * 1024  # 25 MB safety cap

# --- HTTP ---
REQUEST_HEADERS = {
    "User-Agent": "quantum-research-backend/1.0 (contact: set-your-email@example.com)"
}
