"""
Quantum Research Backend
=========================
Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import arxiv_client, code_scanner, config, database, pdf_text, summarizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Quantum Research Backend",
    description=(
        "Fetches quantum-computing papers from arXiv, summarizes them "
        "locally, and can self-check which papers contain code for a "
        "given algorithm/library/topic."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    database.init_db()


class FetchResponse(BaseModel):
    query: str
    fetched: int
    papers: list[dict]


class CodeSearchResponse(BaseModel):
    query: str
    checked_locally: int
    fetched_new_papers: int
    matches: list[dict]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/papers/fetch", response_model=FetchResponse)
def fetch_papers(
    query: str = Query(config.ARXIV_DEFAULT_QUERY, description="Topic to search on arXiv"),
    max_results: int = Query(config.ARXIV_MAX_RESULTS_DEFAULT, ge=1, le=config.ARXIV_MAX_RESULTS_CAP),
    category: Optional[str] = Query("quant-ph", description="arXiv category filter, e.g. quant-ph"),
):
    try:
        papers = arxiv_client.search_arxiv(query=query, max_results=max_results, category=category)
    except arxiv_client.ArxivClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    stored = []
    for paper in papers:
        summary = summarizer.summarize_text(paper.abstract)
        database.upsert_paper(paper.to_dict(), summary=summary)
        stored.append({**paper.to_dict(), "summary": summary})

    database.log_search(query, kind="fetch", result_count=len(stored))
    return FetchResponse(query=query, fetched=len(stored), papers=stored)


@app.get("/papers")
def list_papers(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    return {"papers": database.list_papers(limit=limit, offset=offset)}


@app.get("/papers/{arxiv_id}")
def get_paper(arxiv_id: str):
    paper = database.get_paper(arxiv_id)
    if paper is None:
        live = arxiv_client.get_paper_by_id(arxiv_id)
        if live is None:
            raise HTTPException(status_code=404, detail="Paper not found on arXiv")
        summary = summarizer.summarize_text(live.abstract)
        database.upsert_paper(live.to_dict(), summary=summary)
        paper = database.get_paper(arxiv_id)
    return paper


@app.get("/papers/{arxiv_id}/code")
def get_paper_code(arxiv_id: str, force_full_text: bool = Query(False)):
    paper = database.get_paper(arxiv_id)
    if paper is None:
        live = arxiv_client.get_paper_by_id(arxiv_id)
        if live is None:
            raise HTTPException(status_code=404, detail="Paper not found on arXiv")
        summary = summarizer.summarize_text(live.abstract)
        database.upsert_paper(live.to_dict(), summary=summary)
        paper = database.get_paper(arxiv_id)

    text = paper["abstract"]
    full_text_scanned = False

    if force_full_text and paper.get("pdf_url"):
        pdf_body = pdf_text.fetch_pdf_text(paper["pdf_url"])
        if pdf_body:
            text = f"{paper['abstract']}\n{pdf_body}"
            full_text_scanned = True

    scan = code_scanner.scan_text(text)
    database.save_code_scan(arxiv_id, scan.to_dict(), full_text_scanned)

    return {
        "arxiv_id": arxiv_id,
        "title": paper["title"],
        "full_text_scanned": full_text_scanned,
        **scan.to_dict(),
    }


@app.get("/code/search", response_model=CodeSearchResponse)
def search_code(
    query: str = Query(..., min_length=2, description="Algorithm, library, or topic, e.g. 'Grover'"),
    deep: bool = Query(
        True,
        description="If true and nothing matches locally, fetch fresh papers from arXiv and scan their PDFs before answering.",
    ),
    fetch_limit: int = Query(10, ge=1, le=30, description="How many new papers to pull if a deep check is needed"),
):
    already_scanned = database.list_papers_with_code_scan()
    matches = [
        p for p in already_scanned
        if p["code_scan"] and code_scanner.matches_query(
            code_scanner.CodeScanResult(**{k: v for k, v in p["code_scan"].items() if k != "has_code_evidence"}),
            query,
        )
    ]
    fetched_new = 0

    if not matches and deep:
        logger.info("No local match for %r, checking arXiv directly", query)
        try:
            candidates = arxiv_client.search_arxiv(query=query, max_results=fetch_limit)
        except arxiv_client.ArxivClientError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        for candidate in candidates:
            summary = summarizer.summarize_text(candidate.abstract)
            database.upsert_paper(candidate.to_dict(), summary=summary)
            fetched_new += 1

            pdf_body = pdf_text.fetch_pdf_text(candidate.pdf_url) if candidate.pdf_url else ""
            text = f"{candidate.abstract}\n{pdf_body}" if pdf_body else candidate.abstract
            scan = code_scanner.scan_text(text)
            database.save_code_scan(candidate.arxiv_id, scan.to_dict(), full_text_scanned=bool(pdf_body))

            if scan.has_code_evidence or code_scanner.matches_query(scan, query):
                stored = database.get_paper(candidate.arxiv_id)
                matches.append(stored)

    database.log_search(query, kind="code_search", result_count=len(matches))

    return CodeSearchResponse(
        query=query,
        checked_locally=len(already_scanned),
        fetched_new_papers=fetched_new,
        matches=matches,
    )
