"""
Fully local, free summarization - no API keys, no paid services.
Uses sumy's LexRank algorithm over sentence similarity graphs.
"""

from __future__ import annotations

import logging

import nltk
from sumy.nlp.stemmers import Stemmer
from sumy.nlp.tokenizers import Tokenizer
from sumy.parsers.plaintext import PlaintextParser
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.utils import get_stop_words

from . import config

logger = logging.getLogger(__name__)

_LANGUAGE = "english"
_nltk_ready = False


def _ensure_nltk_data() -> None:
    global _nltk_ready
    if _nltk_ready:
        return
    for pkg in ("punkt", "punkt_tab"):
        try:
            nltk.data.find(f"tokenizers/{pkg}")
        except LookupError:
            try:
                nltk.download(pkg, quiet=True)
            except Exception as exc:
                logger.warning("Could not download nltk package %s: %s", pkg, exc)
    _nltk_ready = True


def summarize_text(text: str, sentence_count: int = config.SUMMARY_SENTENCE_COUNT) -> str:
    """
    Extractive summary of `text` via LexRank. Falls back to the first
    N naive sentences if NLTK data can't be fetched, so this never
    hard-fails the request.
    """
    text = (text or "").strip()
    if not text:
        return ""

    _ensure_nltk_data()

    try:
        parser = PlaintextParser.from_string(text, Tokenizer(_LANGUAGE))
        stemmer = Stemmer(_LANGUAGE)
        summarizer = LexRankSummarizer(stemmer)
        summarizer.stop_words = get_stop_words(_LANGUAGE)

        sentences = summarizer(parser.document, sentence_count)
        summary = " ".join(str(s) for s in sentences)
        if summary:
            return summary
    except Exception as exc:
        logger.warning("LexRank summarization failed, falling back: %s", exc)

    rough_sentences = [s.strip() for s in text.split(".") if s.strip()]
    return ". ".join(rough_sentences[:sentence_count]) + ("." if rough_sentences else "")
