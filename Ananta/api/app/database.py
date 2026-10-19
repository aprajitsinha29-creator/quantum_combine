"""
Lightweight SQLite persistence (stdlib sqlite3, zero external DB setup).
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Iterator, Optional

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS papers (
    arxiv_id            TEXT PRIMARY KEY,
    title                TEXT NOT NULL,
    abstract             TEXT NOT NULL,
    authors_json         TEXT NOT NULL,
    published            TEXT,
    updated              TEXT,
    categories_json      TEXT,
    pdf_url              TEXT,
    abs_url              TEXT,
    summary              TEXT,
    full_text_scanned    INTEGER NOT NULL DEFAULT 0,
    code_scan_json       TEXT,
    fetched_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    query         TEXT NOT NULL,
    kind          TEXT NOT NULL,
    result_count  INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);
"""


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_paper(paper: dict, summary: str = "") -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO papers (
                arxiv_id, title, abstract, authors_json, published, updated,
                categories_json, pdf_url, abs_url, summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(arxiv_id) DO UPDATE SET
                title=excluded.title,
                abstract=excluded.abstract,
                authors_json=excluded.authors_json,
                published=excluded.published,
                updated=excluded.updated,
                categories_json=excluded.categories_json,
                pdf_url=excluded.pdf_url,
                abs_url=excluded.abs_url,
                summary=CASE WHEN excluded.summary != '' THEN excluded.summary ELSE papers.summary END
            """,
            (
                paper["arxiv_id"],
                paper["title"],
                paper["abstract"],
                json.dumps(paper.get("authors", [])),
                paper.get("published", ""),
                paper.get("updated", ""),
                json.dumps(paper.get("categories", [])),
                paper.get("pdf_url", ""),
                paper.get("abs_url", ""),
                summary,
            ),
        )


def save_code_scan(arxiv_id: str, scan_dict: dict, full_text_scanned: bool) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE papers
            SET code_scan_json = ?, full_text_scanned = ?
            WHERE arxiv_id = ?
            """,
            (json.dumps(scan_dict), int(full_text_scanned), arxiv_id),
        )


def get_paper(arxiv_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM papers WHERE arxiv_id = ?", (arxiv_id,)).fetchone()
        return _row_to_dict(row) if row else None


def list_papers(limit: int = 50, offset: int = 0) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM papers ORDER BY fetched_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def list_papers_with_code_scan() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM papers WHERE code_scan_json IS NOT NULL"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def log_search(query: str, kind: str, result_count: int) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO search_log (query, kind, result_count) VALUES (?, ?, ?)",
            (query, kind, result_count),
        )


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["authors"] = json.loads(d.pop("authors_json") or "[]")
    d["categories"] = json.loads(d.pop("categories_json") or "[]")
    scan_json = d.pop("code_scan_json", None)
    d["code_scan"] = json.loads(scan_json) if scan_json else None
    d["full_text_scanned"] = bool(d.get("full_text_scanned", 0))
    return d
