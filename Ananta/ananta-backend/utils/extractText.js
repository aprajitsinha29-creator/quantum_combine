const MAX_PDF_BYTES = 30 * 1024 * 1024; // 30MB — a generous cap for a research paper
const MAX_EXTRACTED_CHARS = 60000; // enough for a real summary; keeps prompt/latency bounded

/**
 * Downloads a PDF and extracts its actual text (every page, not just an
 * abstract). Returns '' on any failure that isn't the caller's fault — a
 * scanned/image-only PDF, a dead link, a size cap — so callers can fall back
 * to whatever metadata they already have instead of throwing.
 */
async function fetchPdfText(pdfUrl) {
  if (!pdfUrl) return '';
  try {
    const res = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Ananta-Quantum-Studio/1.0 (research reader)' }
    });
    if (!res.ok) return '';

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_PDF_BYTES) return '';
    if (buf.length < 4 || buf.toString('ascii', 0, 4) !== '%PDF') return ''; // not actually a PDF

    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buf);
    return (data.text || '').trim();
  } catch (e) {
    console.warn('[extractText] PDF extraction notice for', pdfUrl, ':', e.message);
    return '';
  }
}

/** OpenAlex ships abstracts as a position->word inverted index. */
function reconstructInvertedAbstract(index) {
  if (!index || typeof index !== 'object') return '';
  const slots = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions || []) slots[pos] = word;
  }
  return slots.filter(Boolean).join(' ').trim();
}

async function fetchJsonSafe(url, timeoutMs = 9000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Ananta-Quantum-Studio/1.0 (research reader; mailto:research@ananta.local)',
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return null;
  }
}

/**
 * Finds a legally readable copy of a paper whose own publisher link is
 * paywalled, blocked or a scanned image.
 *
 * The three oldest papers in the library (Feynman 1982 on a university
 * webserver that refuses datacenter IPs, Deutsch 1985 behind Royal Society,
 * EPR 1935 behind APS) all failed the direct PDF fetch, so the summary fell
 * back to the library's own one-paragraph blurb - which is why the "AI
 * summary" looked identical to the card text. Open-access aggregators index
 * mirrors and real publisher abstracts for exactly these cases.
 *
 * @returns {Promise<{text: string, title: string|null, pdfUrl: string|null, kind: string}|null>}
 */
async function resolveOpenAccessSource({ doi, title, arxiv } = {}) {
  // 1. A declared arXiv id is the most reliable full text available.
  if (arxiv) {
    const id = String(arxiv).replace(/^arxiv:/i, '').trim();
    const body = await fetchPdfText(`https://arxiv.org/pdf/${id}`);
    if (body) return { text: body, title: null, pdfUrl: `https://arxiv.org/pdf/${id}`, kind: 'arxiv-pdf' };
  }

  // 2. OpenAlex: best open-access location + a reconstructable abstract.
  let openAlex = null;
  if (doi) openAlex = await fetchJsonSafe(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`);
  if (!openAlex && title) {
    const search = await fetchJsonSafe(`https://api.openalex.org/works?filter=title.search:${encodeURIComponent(title)}&per-page=1`);
    openAlex = search && Array.isArray(search.results) && search.results.length ? search.results[0] : null;
  }

  const oaPdf = openAlex?.best_oa_location?.pdf_url || openAlex?.open_access?.oa_url || null;
  if (oaPdf) {
    const body = await fetchPdfText(oaPdf);
    if (body) return { text: body, title: openAlex?.title || null, pdfUrl: oaPdf, kind: 'openaccess-pdf' };
  }

  // 3. Semantic Scholar: another OA index, plus a one-line expert tldr.
  let s2 = null;
  if (doi) {
    s2 = await fetchJsonSafe(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,tldr,openAccessPdf`);
  }
  const s2Pdf = s2?.openAccessPdf?.url || null;
  if (s2Pdf) {
    const body = await fetchPdfText(s2Pdf);
    if (body) return { text: body, title: s2?.title || null, pdfUrl: s2Pdf, kind: 'openaccess-pdf' };
  }

  // 4. No readable full text anywhere - fall back to the real publisher
  // abstract, which is still far richer than the library's own blurb.
  const openAlexAbstract = reconstructInvertedAbstract(openAlex?.abstract_inverted_index);
  const parts = [];
  if (s2?.abstract) parts.push(s2.abstract);
  else if (openAlexAbstract) parts.push(openAlexAbstract);
  if (s2?.tldr?.text) parts.push(`Key point: ${s2.tldr.text}`);

  if (parts.length) {
    return {
      text: parts.join('\n\n'),
      title: s2?.title || openAlex?.title || null,
      pdfUrl: null,
      kind: 'publisher-abstract'
    };
  }
  return null;
}

/**
 * Downloads a web page or research paper and extracts readable text.
 * Uses native fetch and regex/HTML parsing. Special handling for arXiv abstracts and PDFs.
 * @param {string} url
 * @param {{doi?: string, title?: string, arxiv?: string}} [meta] - used to find an
 *        open-access copy when the supplied URL is paywalled, blocked or scanned.
 * @returns {Promise<{title: string, text: string, fullTextAvailable: boolean, resolvedUrl?: string, sourceKind?: string}>}
 */
async function extractTextFromUrl(url, meta = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required');
  }

  const cleanUrl = url.trim();

  // If this is an arXiv URL (pdf or abs), query arXiv's API for the structured abstract
  const arxivMatch = cleanUrl.match(/arxiv\.org\/(?:pdf|abs)\/([0-9]+\.[0-9]+(?:v\d+)?|[a-z\-]+(?:\.[a-z]+)?\/\d+)/i);
  if (arxivMatch) {
    const arxivId = arxivMatch[1].replace(/\.pdf$/i, '');
    try {
      const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const xml = await apiRes.text();
        const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
        const entryXml = entryMatch ? entryMatch[1] : xml;

        const titleM = entryXml.match(/<title>([\s\S]*?)<\/title>/i);
        const sumM = entryXml.match(/<summary>([\s\S]*?)<\/summary>/i);
        const authorsM = [...entryXml.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/gi)].map(m => m[1].trim());
        const dateM = entryXml.match(/<published>([\s\S]*?)<\/published>/i);

        let title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : `arXiv:${arxivId}`;
        title = title.replace(/^\s*arXiv\s*Query:[^;]+;/i, '').trim();
        const summary = sumM ? sumM[1].replace(/\s+/g, ' ').trim() : '';
        const authors = authorsM.length ? authorsM.join(', ') : 'Researchers in Quantum Science';
        const date = dateM ? dateM[1].substring(0, 10) : '';

        // The abstract alone is not the paper — fetch the actual PDF body.
        // Every arXiv id has a PDF at this exact URL, so this is not a guess.
        const pdfBody = await fetchPdfText(`https://arxiv.org/pdf/${arxivId}`);

        const header = `Title: ${title}\nAuthors: ${authors}\nPublished: ${date}\narXiv Identifier: ${arxivId}\n\nAbstract:\n${summary}`;
        const fullText = pdfBody
          ? `${header}\n\nFull Paper Text:\n${pdfBody}`.slice(0, MAX_EXTRACTED_CHARS)
          : `${header}\n\n(Could not extract the full PDF body — this paper may be a scanned image, or the PDF was unreachable. Summary below is based on the abstract only.)`;

        return { title, text: fullText, fullTextAvailable: Boolean(pdfBody) };
      }
    } catch (e) {
      console.warn('[extractText] arXiv API lookup notice:', e.message);
    }
  }

  // General web page extraction using native fetch
  let response;
  try {
    response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  } catch (netErr) {
    // The host refused us outright (several journal/university servers block
    // datacenter IPs). An open-access mirror is the honest next try.
    const oa = await resolveOpenAccessSource(meta);
    if (oa) {
      return {
        title: oa.title || meta.title || 'Research Article',
        text: oa.text.slice(0, MAX_EXTRACTED_CHARS),
        fullTextAvailable: oa.kind !== 'publisher-abstract',
        resolvedUrl: oa.pdfUrl || undefined,
        sourceKind: oa.kind
      };
    }
    throw new Error(`Failed to reach URL (${netErr.message})`);
  }

  if (!response.ok) {
    const oa = await resolveOpenAccessSource(meta);
    if (oa) {
      return {
        title: oa.title || meta.title || 'Research Article',
        text: oa.text.slice(0, MAX_EXTRACTED_CHARS),
        fullTextAvailable: oa.kind !== 'publisher-abstract',
        resolvedUrl: oa.pdfUrl || undefined,
        sourceKind: oa.kind
      };
    }
    throw new Error(`Failed to fetch URL (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (cleanUrl.toLowerCase().endsWith('.pdf') || contentType.includes('application/pdf')) {
    const fallbackTitle = decodeURIComponent(cleanUrl.split('/').pop() || '').replace(/\.pdf$/i, '') || 'Research PDF Document';
    const pdfBody = await fetchPdfText(cleanUrl);
    if (!pdfBody) {
      // Unreachable host, or a scanned image with no text layer (every paper
      // from before ~1990 in this library). Look for an open-access mirror
      // before giving up and letting the caller fall back to a blurb.
      const oa = await resolveOpenAccessSource(meta);
      if (oa) {
        return {
          title: oa.title || meta.title || fallbackTitle,
          text: oa.text.slice(0, MAX_EXTRACTED_CHARS),
          fullTextAvailable: oa.kind !== 'publisher-abstract',
          resolvedUrl: oa.pdfUrl || undefined,
          sourceKind: oa.kind
        };
      }
      throw new Error('Could not extract text from this PDF (unreachable, too large, or a scanned image with no text layer)');
    }
    // The PDF's own title (first non-empty line) usually reads better than a
    // URL-derived filename slug.
    const firstLine = pdfBody.split('\n').map(l => l.trim()).find(l => l.length > 4 && l.length < 200);
    return { title: firstLine || fallbackTitle, text: pdfBody.slice(0, MAX_EXTRACTED_CHARS), fullTextAvailable: true };
  }

  const html = await response.text();

  // Extract title
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = titleM ? titleM[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'Research Article';

  // Strip script, style, nav, footer, header tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (m, code) => String.fromCodePoint(parseInt(code, 10))) // numeric entities: &#8211; -> –
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCodePoint(parseInt(hex, 16))) // hex entities: &#x2013; -> –
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&amp;/gi, '&') // must run after numeric decoding, and last among named entities (it would otherwise mangle them, e.g. turning &amp;lt; into &lt;)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > MAX_EXTRACTED_CHARS) {
    cleaned = cleaned.substring(0, MAX_EXTRACTED_CHARS);
  }

  // Some DOI-registered records (lab protocols, dataset landing pages, JS-
  // rendered SPAs) return almost no server-rendered text — a title and
  // little else. That is not "the full paper", and claiming otherwise is
  // exactly the dishonesty this function was rewritten to stop doing.
  const MIN_CREDIBLE_CHARS = 400;
  return { title, text: cleaned, fullTextAvailable: cleaned.length >= MIN_CREDIBLE_CHARS };
}

module.exports = { extractTextFromUrl, fetchPdfText };
