const express = require("express");
const router = express.Router();

const { googleSearch } = require("../utils/googleSearch");
const { extractTextFromUrl } = require("../utils/extractText");
const { findTermOccurrences } = require("../utils/findTerm");
const { summarizeText } = require("../utils/summarize");

/**
 * POST /api/search
 * body: { query: string, num?: number }
 * Fetches research results from Google for a given topic.
 */
router.post("/search", async (req, res) => {
  try {
    const { query, num } = req.body;
    if (!query) return res.status(400).json({ error: "query is required" });

    const results = await googleSearch(query, num || 10);
    res.json({ query, results });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/fetch-content
 * body: { url: string }
 * Downloads and extracts readable text from a given research page/article.
 */
router.post("/fetch-content", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });

    const { title, text } = await extractTextFromUrl(url);
    res.json({ url, title, length: text.length, text });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Could not fetch/parse that URL: " + err.message });
  }
});

/**
 * POST /api/find-term
 * body: { url?: string, text?: string, term: string }
 * Finds exact occurrences of `term` inside either a raw `text` blob you
 * already have, OR a page fetched live from `url`. Returns a short AI
 * summary of the context around each occurrence so the user doesn't have
 * to read the whole document.
 */
router.post("/find-term", async (req, res) => {
  try {
    const { url, text, term } = req.body;
    if (!term) return res.status(400).json({ error: "term is required" });
    if (!url && !text) {
      return res.status(400).json({ error: "provide either url or text" });
    }

    let sourceText = text;
    let title = null;

    if (!sourceText && url) {
      const extracted = await extractTextFromUrl(url);
      sourceText = extracted.text;
      title = extracted.title;
    }

    const occurrences = findTermOccurrences(sourceText, term);

    if (occurrences.length === 0) {
      return res.json({
        term,
        title,
        found: false,
        message: `"${term}" was not found in this document.`,
      });
    }

    // Summarize each occurrence's context (limit to first 5 to control cost/latency)
    const topOccurrences = occurrences.slice(0, 5);
    const summarized = await Promise.all(
      topOccurrences.map(async (occ) => ({
        context: occ.context,
        summary: await summarizeText(occ.context, term),
      }))
    );

    res.json({
      term,
      title,
      found: true,
      totalOccurrences: occurrences.length,
      results: summarized,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/summarize
 * body: { url?: string, text?: string }
 * Summarizes an entire document (from a URL or raw text).
 */
router.post("/summarize", async (req, res) => {
  try {
    const { url, text } = req.body;
    if (!url && !text) {
      return res.status(400).json({ error: "provide either url or text" });
    }

    let sourceText = text;
    let title = null;

    if (!sourceText && url) {
      const extracted = await extractTextFromUrl(url);
      sourceText = extracted.text;
      title = extracted.title;
    }

    // Guard against sending huge documents straight to the model
    const truncated = sourceText.slice(0, 15000);
    const summary = await summarizeText(truncated);

    res.json({ title, summary });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/synthesize-topic
 * body: { topic: string, papers: Array<{ id, title, authors, year, abstract }> }
 * Synthesizes multiple research papers on a single topic into a unified narrative
 * with structured citations.
 */
router.post("/synthesize-topic", async (req, res) => {
  try {
    const { topic, papers } = req.body;
    if (!topic || !Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: "provide topic and non-empty papers array" });
    }

    const { synthesizeTopic } = require("../utils/summarize");
    const result = await synthesizeTopic(topic, papers);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
