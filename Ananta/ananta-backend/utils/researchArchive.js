/**
 * Live research archive.
 *
 * Turns a plain-language topic ("I want to know about superposition") into a
 * ranked, de-duplicated list of real publications, fetched at request time from
 * open scholarly APIs. No paper list is stored in this repository — the archive
 * is whatever the literature currently says.
 *
 * Sources are pluggable: each one only has to turn a query string into the
 * normalized paper shape below, so adding a provider is a single entry in
 * SOURCES with no changes to ranking, de-duplication, caching or the routes.
 *
 * Normalized paper:
 *   { id, title, authors, authorList, year, abstract, url, pdfUrl,
 *     venue, doi, arxivId, citationCount, source }
 */

const { cleanQuantumQuery } = require('./googleSearch');

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 60;
const cache = new Map();

/**
 * Ordinary English function words plus the verbs people wrap a request in.
 * Removing these generically is what turns "i want to know about superposition"
 * into "superposition" — no phrase patterns to maintain, and it degrades safely
 * because a query made only of stop words falls back to the raw text.
 */
const STOP_WORDS = new Set([
  // articles, conjunctions, prepositions
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with', 'from',
  'about', 'regarding', 'into', 'at', 'by', 'as', 'that', 'this', 'these', 'those',
  // pronouns and modals
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'it', 'its',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'do', 'does',
  'is', 'are', 'was', 'were', 'be', 'been', 'am',
  // request verbs
  'want', 'wanna', 'need', 'like', 'know', 'learn', 'read', 'understand', 'see',
  'give', 'show', 'find', 'get', 'fetch', 'list', 'tell', 'explain', 'search',
  'please', 'more', 'some', 'any', 'all', 'best', 'latest', 'top', 'good',
  // the thing they are asking for, not the subject of it
  'paper', 'papers', 'article', 'articles', 'publication', 'publications',
  'research', 'study', 'studies', 'work', 'works', 'literature'
]);

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function stripMarkup(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatAuthors(list) {
  if (!list || !list.length) return 'Unknown authors';
  if (list.length <= 3) return list.join(', ');
  return `${list.slice(0, 3).join(', ')} et al.`;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** arXiv: preprints with complete abstracts. Free, keyless. */
async function searchArxiv(query, limit) {
  const terms = query.split(/\s+/).filter(Boolean).map(t => `all:${encodeURIComponent(t)}`).join('+AND+');
  const url = `https://export.arxiv.org/api/query?search_query=(${terms})+AND+cat:quant-ph` +
    `&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Ananta-Quantum-Studio/1.0' } });
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
  const xml = await res.text();

  const papers = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
    const e = m[1];
    const pick = (tag) => {
      const hit = e.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
      return hit ? stripMarkup(hit[1]) : '';
    };

    const idUrl = pick('id');
    const arxivId = (idUrl.match(/abs\/(.+)$/) || [])[1] || '';
    const published = pick('published');
    const pdfMatch = e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
    const authorList = [...e.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/gi)].map(a => stripMarkup(a[1]));
    const doiMatch = e.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i);
    const journalMatch = e.match(/<arxiv:journal_ref[^>]*>([\s\S]*?)<\/arxiv:journal_ref>/i);

    papers.push({
      title: pick('title'),
      authors: formatAuthors(authorList),
      authorList,
      year: published ? parseInt(published.slice(0, 4), 10) : null,
      abstract: pick('summary'),
      url: idUrl,
      pdfUrl: pdfMatch ? pdfMatch[1] : idUrl.replace('/abs/', '/pdf/'),
      venue: journalMatch ? stripMarkup(journalMatch[1]) : 'arXiv preprint (quant-ph)',
      doi: doiMatch ? stripMarkup(doiMatch[1]) : null,
      arxivId,
      citationCount: null,
      source: 'arXiv'
    });
  }
  return papers;
}

/** Crossref: peer-reviewed journal record with DOIs. Free, keyless. */
async function searchCrossref(query, limit) {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent('quantum ' + query)}` +
    `&rows=${limit}&sort=relevance&select=title,author,issued,DOI,abstract,container-title,URL,is-referenced-by-count`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Ananta-Quantum-Studio/1.0 (research archive)' } });
  if (!res.ok) throw new Error(`Crossref HTTP ${res.status}`);
  const data = await res.json();

  return (data.message?.items || []).map(item => {
    const authorList = (item.author || [])
      .map(a => [a.given, a.family].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    const year = item.issued?.['date-parts']?.[0]?.[0] || null;

    return {
      title: stripMarkup(item.title?.[0] || ''),
      authors: formatAuthors(authorList),
      authorList,
      year,
      abstract: stripMarkup(item.abstract || ''),
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
      pdfUrl: null,
      venue: stripMarkup(item['container-title']?.[0] || 'Peer-reviewed journal'),
      doi: item.DOI || null,
      arxivId: null,
      citationCount: typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : null,
      source: 'Crossref'
    };
  });
}

const SOURCES = [
  { id: 'arxiv', label: 'arXiv (quant-ph)', search: searchArxiv },
  { id: 'crossref', label: 'Crossref', search: searchCrossref }
];

// ---------------------------------------------------------------------------
// Ranking & assembly
// ---------------------------------------------------------------------------

function queryTerms(query) {
  return query.toLowerCase().split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Offline subject extraction: strip typos, then drop function words.
 *
 * This only succeeds for phrasings whose filler happens to appear in
 * STOP_WORDS — "i am curious regarding entanglement" survives as "curious
 * entanglement", and non-English passes through untouched. It is therefore the
 * fallback, not the primary path; extractTopic prefers the model.
 */
function extractTopicHeuristically(rawTopic) {
  const cleaned = cleanQuantumQuery(rawTopic);
  const terms = queryTerms(cleaned);
  const query = terms.length ? terms.join(' ') : cleaned;
  return { query, terms: terms.length ? terms : queryTerms(rawTopic), method: 'heuristic' };
}

const topicCache = new Map();

/**
 * Reduces whatever the user said, in whatever language or phrasing, to the
 * subject to search for. The model does the understanding; the word-list
 * heuristic is only used when no provider is configured or the call fails.
 */
async function extractTopic(rawTopic) {
  const raw = String(rawTopic || '').trim();
  const cacheKey = raw.toLowerCase();
  if (topicCache.has(cacheKey)) return topicCache.get(cacheKey);

  const fallback = extractTopicHeuristically(raw);
  let result = fallback;

  try {
    const { askJson } = require('../../api/gemini');
    const answer = await askJson(
      `Extract the scientific subject someone wants literature about, from their request.\n\n` +
      `Rules:\n` +
      `- Return only the subject as search keywords, not a sentence.\n` +
      `- Drop conversational wrapping ("I want to know about", "could you dig up something on").\n` +
      `- Translate to English if the request is in another language.\n` +
      `- Correct obvious misspellings of technical terms.\n` +
      `- Keep it to the essential terms, typically one to four words.\n` +
      `- If there is no discernible subject, return an empty string.\n\n` +
      `Request: ${JSON.stringify(raw)}\n\n` +
      `Return only JSON: {"subject": "<keywords>"}`
    );

    const subject = answer && typeof answer.subject === 'string' ? answer.subject.trim() : '';
    if (subject) {
      result = { query: subject, terms: queryTerms(subject), method: 'model' };
      // A model that returns nothing usable should not beat the heuristic.
      if (!result.terms.length) result = fallback;
    }
  } catch (err) {
    console.warn('[researchArchive] Subject extraction fell back to heuristic:', err.message);
  }

  topicCache.set(cacheKey, result);
  if (topicCache.size > 200) topicCache.delete(topicCache.keys().next().value);
  return result;
}

/**
 * Relevance first (how much of the topic the title and abstract actually
 * cover), then citations, then recency. Everything is derived from the fetched
 * record — nothing is pre-assigned per paper.
 */
function scorePaper(paper, terms) {
  const title = (paper.title || '').toLowerCase();
  const abstract = (paper.abstract || '').toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 12;
    if (abstract.includes(term)) score += 4;
  }
  if (terms.length && terms.every(t => title.includes(t) || abstract.includes(t))) score += 10;

  if (paper.citationCount) score += Math.min(15, Math.log10(paper.citationCount + 1) * 6);
  if (paper.year) {
    const age = new Date().getFullYear() - paper.year;
    if (age >= 0 && age <= 40) score += Math.max(0, 6 - age * 0.15);
  }
  if (paper.abstract && paper.abstract.length > 200) score += 3;

  return score;
}

/** Same work can appear in several sources; prefer the richest record. */
function dedupe(papers) {
  const byKey = new Map();

  for (const paper of papers) {
    const key = paper.doi ? `doi:${paper.doi.toLowerCase()}`
      : paper.arxivId ? `arxiv:${paper.arxivId.replace(/v\d+$/, '')}`
      : `title:${normalizeTitle(paper.title)}`;
    if (!key || key === 'title:') continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, paper);
      continue;
    }

    // Merge: keep the longer abstract, any DOI/PDF/citation data either has.
    byKey.set(key, {
      ...existing,
      abstract: (paper.abstract || '').length > (existing.abstract || '').length ? paper.abstract : existing.abstract,
      doi: existing.doi || paper.doi,
      arxivId: existing.arxivId || paper.arxivId,
      pdfUrl: existing.pdfUrl || paper.pdfUrl,
      citationCount: existing.citationCount ?? paper.citationCount,
      venue: existing.source === 'Crossref' ? existing.venue : (paper.venue || existing.venue),
      source: existing.source === paper.source ? existing.source : `${existing.source} + ${paper.source}`
    });
  }

  // Second pass: the same work is often filed twice under different DOIs, so
  // collapse anything whose title matches once identifiers have had their say.
  const byTitle = new Map();
  for (const paper of byKey.values()) {
    const key = normalizeTitle(paper.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, paper);
    } else if ((paper.abstract || '').length > (existing.abstract || '').length) {
      byTitle.set(key, { ...paper, citationCount: existing.citationCount ?? paper.citationCount });
    }
  }

  return [...byTitle.values()];
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

/**
 * Searches every source for a topic and returns a ranked, de-duplicated list.
 * A source that fails is reported rather than throwing, so one provider being
 * down still yields results from the others.
 */
async function discoverPapers({ topic, limit = 20, refresh = false } = {}) {
  const rawTopic = String(topic || '').trim();
  if (!rawTopic) throw new Error('topic is required');

  const { query, terms, method } = await extractTopic(rawTopic);
  const cacheKey = `${query}::${limit}`;
  if (!refresh) {
    const cached = readCache(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const perSource = Math.max(8, Math.ceil(limit * 0.8));
  const settled = await Promise.all(SOURCES.map(async (source) => {
    try {
      const found = await source.search(query, perSource);
      return { id: source.id, label: source.label, count: found.length, error: null, papers: found };
    } catch (err) {
      return { id: source.id, label: source.label, count: 0, error: err.message, papers: [] };
    }
  }));

  // A record must actually mention the subject somewhere. Without this floor a
  // keyword search returns whatever the provider's relevance model liked, which
  // is how "superposition" once surfaced papers on hospice care and enzymes.
  const onTopic = (paper) => {
    if (!terms.length) return true;
    const haystack = `${paper.title} ${paper.abstract}`.toLowerCase();
    return terms.some(t => haystack.includes(t));
  };

  const merged = dedupe(settled.flatMap(s => s.papers))
    .filter(p => p.title && onTopic(p))
    .map(p => ({ ...p, relevance: scorePaper(p, terms) }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map((p, i) => ({ ...p, id: `P${i + 1}` }));

  const value = {
    topic: rawTopic,
    query,
    queryMethod: method,
    papers: merged,
    totalFound: merged.length,
    sources: settled.map(({ id, label, count, error }) => ({ id, label, count, error })),
    generatedAt: new Date().toISOString(),
    cached: false
  };

  writeCache(cacheKey, value);
  return value;
}

/**
 * The whole ask in one call: find the literature on a topic, then have it
 * synthesized into a cited narrative. Discovery still returns even if synthesis
 * fails, because a reading list without a summary is far better than an error.
 */
async function briefTopic({ topic, limit = 12, refresh = false } = {}) {
  const discovery = await discoverPapers({ topic, limit, refresh });

  if (!discovery.papers.length) {
    return { ...discovery, synthesis: null, synthesisError: 'No papers found to summarize.' };
  }

  try {
    const { synthesizeTopic } = require('./summarize');
    // Synthesize against the extracted subject, not the raw sentence, so the
    // narrative reads "In investigating superposition", not "In investigating
    // i want to know about superposition".
    const synthesis = await synthesizeTopic(discovery.query, discovery.papers);
    return { ...discovery, synthesis, synthesisError: null };
  } catch (err) {
    return { ...discovery, synthesis: null, synthesisError: err.message };
  }
}

module.exports = { discoverPapers, briefTopic, SOURCES, scorePaper, dedupe, extractTopic, extractTopicHeuristically };
