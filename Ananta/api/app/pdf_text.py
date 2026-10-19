"""
Downloads a paper's PDF (URL comes from arXiv itself - never hardcoded)
and extracts plain text so we can scan the full paper body for code.
"""

from __future__ import annotations

import io
import logging

import requests
from pypdf import PdfReader

from . import config

logger = logging.getLogger(__name__)


class PdfFetchError(RuntimeError):
    pass


def fetch_pdf_text(pdf_url: str, max_pages: int | None = None) -> str:
    """
    Download `pdf_url` and return its extracted text. Returns "" on any
    failure that isn't the caller's fault (scanned-image PDFs etc.).
    """
    if not pdf_url:
        return ""

    try:
        resp = requests.get(
            pdf_url,
            headers=config.REQUEST_HEADERS,
            timeout=config.PDF_FETCH_TIMEOUT_SECONDS,
            stream=True,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Could not download PDF %s: %s", pdf_url, exc)
        return ""

    buf = io.BytesIO()
    size = 0
    for chunk in resp.iter_content(chunk_size=65536):
        size += len(chunk)
        if size > config.MAX_PDF_BYTES:
            logger.warning("PDF %s exceeded size cap, truncating", pdf_url)
            break
        buf.write(chunk)
    buf.seek(0)

    try:
        reader = PdfReader(buf)
    except Exception as exc:
        logger.warning("Could not parse PDF %s: %s", pdf_url, exc)
        return ""

    pages = reader.pages[:max_pages] if max_pages else reader.pages
    text_parts = []
    for page in pages:
        try:
            text_parts.append(page.extract_text() or "")
        except Exception as exc:
            logger.debug("Skipping unreadable page in %s: %s", pdf_url, exc)

    return "\n".join(text_parts)
