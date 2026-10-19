"""
Thin client around the public arXiv API (export.arxiv.org).
No API key is required. Docs: https://info.arxiv.org/help/api/user-manual.html
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List

import feedparser
import requests

from . import config

logger = logging.getLogger(__name__)


@dataclass
class ArxivPaper:
    arxiv_id: str
    title: str
    abstract: str
    authors: List[str]
    published: str
    updated: str
    categories: List[str]
    pdf_url: str
    abs_url: str
    comment: str = ""
    doi: str = ""
    journal_ref: str = ""

    def to_dict(self) -> dict:
        return {
            "arxiv_id": self.arxiv_id,
            "title": self.title,
            "abstract": self.abstract,
            "authors": self.authors,
            "published": self.published,
            "updated": self.updated,
            "categories": self.categories,
            "pdf_url": self.pdf_url,
            "abs_url": self.abs_url,
            "comment": self.comment,
            "doi": self.doi,
            "journal_ref": self.journal_ref,
        }


class ArxivClientError(RuntimeError):
    pass


def _extract_arxiv_id(entry_id: str) -> str:
    tail = entry_id.rstrip("/").split("/")[-1]
    return tail


def search_arxiv(
    query: str = config.ARXIV_DEFAULT_QUERY,
    max_results: int = config.ARXIV_MAX_RESULTS_DEFAULT,
    start: int = 0,
    category: str | None = "quant-ph",
) -> List[ArxivPaper]:
    """
    Search arXiv for papers matching `query`, optionally restricted to a
    category (default: quant-ph). Hits the live arXiv API every call.
    """
    max_results = min(max(1, max_results), config.ARXIV_MAX_RESULTS_CAP)

    search_terms = f'all:"{query}"'
    if category:
        search_terms = f"cat:{category} AND {search_terms}"

    params = {
        "search_query": search_terms,
        "start": start,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    try:
        resp = requests.get(
            config.ARXIV_API_URL,
            params=params,
            headers=config.REQUEST_HEADERS,
            timeout=config.PDF_FETCH_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ArxivClientError(f"Failed to reach arXiv API: {exc}") from exc

    feed = feedparser.parse(resp.content)
    if feed.bozo and not feed.entries:
        raise ArxivClientError(f"Could not parse arXiv response: {feed.bozo_exception}")

    papers: List[ArxivPaper] = []
    for entry in feed.entries:
        pdf_url = ""
        for link in entry.get("links", []):
            if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                pdf_url = link.get("href", "")
                break

        papers.append(
            ArxivPaper(
                arxiv_id=_extract_arxiv_id(entry.get("id", "")),
                title=" ".join(entry.get("title", "").split()),
                abstract=" ".join(entry.get("summary", "").split()),
                authors=[a.get("name", "") for a in entry.get("authors", [])],
                published=entry.get("published", ""),
                updated=entry.get("updated", ""),
                categories=[t.get("term", "") for t in entry.get("tags", [])],
                pdf_url=pdf_url,
                abs_url=entry.get("id", ""),
                comment=entry.get("arxiv_comment", ""),
                doi=entry.get("arxiv_doi", ""),
                journal_ref=entry.get("arxiv_journal_ref", ""),
            )
        )

    logger.info("arXiv search %r returned %d papers", query, len(papers))
    return papers


def get_paper_by_id(arxiv_id: str) -> ArxivPaper | None:
    """Fetch a single paper's metadata directly by its arXiv id."""
    params = {"id_list": arxiv_id}
    try:
        resp = requests.get(
            config.ARXIV_API_URL,
            params=params,
            headers=config.REQUEST_HEADERS,
            timeout=config.PDF_FETCH_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ArxivClientError(f"Failed to reach arXiv API: {exc}") from exc

    feed = feedparser.parse(resp.content)
    if not feed.entries:
        return None

    entry = feed.entries[0]
    pdf_url = ""
    for link in entry.get("links", []):
        if link.get("title") == "pdf" or link.get("type") == "application/pdf":
            pdf_url = link.get("href", "")
            break

    return ArxivPaper(
        arxiv_id=_extract_arxiv_id(entry.get("id", "")),
        title=" ".join(entry.get("title", "").split()),
        abstract=" ".join(entry.get("summary", "").split()),
        authors=[a.get("name", "") for a in entry.get("authors", [])],
        published=entry.get("published", ""),
        updated=entry.get("updated", ""),
        categories=[t.get("term", "") for t in entry.get("tags", [])],
        pdf_url=pdf_url,
        abs_url=entry.get("id", ""),
        comment=entry.get("arxiv_comment", ""),
        doi=entry.get("arxiv_doi", ""),
        journal_ref=entry.get("arxiv_journal_ref", ""),
    )
