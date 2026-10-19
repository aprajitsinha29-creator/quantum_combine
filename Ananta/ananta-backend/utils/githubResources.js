/**
 * Live Community Resource Library.
 *
 * Fetches curated quantum-computing/QML resource lists directly from a set of
 * public GitHub "awesome-list" style repositories (their README.md), parses
 * out categorized links, and serves them as structured JSON. Nothing about
 * the actual resource content is hardcoded here — only the source repo
 * coordinates are configured; the links, titles and categories are all
 * extracted live from each repo's current README at request time and cached
 * briefly to stay within GitHub's unauthenticated rate limits.
 */

const SOURCES = [
  {
    id: 'roadmap-qml',
    owner: 'Christophe-pere',
    repo: 'Roadmap-to-QML',
    branch: 'main',
    label: 'Roadmap to QML',
    description: 'Major quantum machine learning papers, books, and blog posts, indexed year by year.'
  },
  {
    id: 'polarization',
    owner: 'BoltzmannEntropy',
    repo: 'polarization',
    branch: 'main',
    label: 'Polarization',
    description: 'Publicly available quantum computing books, math/physics refreshers, and graduate-school guidance.'
  },
  {
    id: 'ultimate-quantum',
    owner: 'NatashiaKaurRaina',
    repo: 'Ultimate-Quantum-Resources',
    branch: 'main',
    label: 'Ultimate Quantum Resources',
    description: "The Hitchhiker's Guide to the Quantum Galaxy: roadmaps, books, courses, hackathons, SDKs, and career guides."
  },
  {
    id: 'qc-collection',
    owner: 'aryashah2k',
    repo: 'Quantum-Computing-Collection-Of-Resources',
    branch: 'main',
    label: 'QC Collection of Resources',
    description: 'IBM/Qiskit guided projects, CERN lectures, cheatsheets, and Microsoft Azure Quantum resources.'
  },
  {
    id: 'awesome-qml',
    owner: 'krishnakumarsekar',
    repo: 'awesome-quantum-machine-learning',
    branch: 'master',
    label: 'Awesome Quantum ML',
    description: 'Curated list of quantum machine learning frameworks, research papers, classical-quantum neural networks, and libraries.'
  }
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let cache = { data: null, fetchedAt: 0 };

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|bmp)(\?.*)?$/i;

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleFromUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname !== '/' ? u.pathname.replace(/\/+$/, '').slice(0, 60) : '';
    return (u.hostname.replace(/^www\./, '') + path).replace(/%20/g, ' ');
  } catch (e) {
    return url;
  }
}

/**
 * Parses a repo README's markdown into a flat list of categorized resource
 * links. Handles markdown links, HTML `<a>` links, and bare URLs (common in
 * these particular repos), grouping them under the nearest preceding
 * markdown/HTML heading.
 */
function parseMarkdownToResources(markdown, source) {
  const lines = markdown.split(/\r?\n/);
  const items = [];
  const seen = new Set();
  let currentCategory = 'General';

  function pushItem(rawTitle, rawUrl) {
    if (!rawUrl) return;
    const url = rawUrl.trim().replace(/["')\]>.,;]+$/, '');
    if (!/^https?:\/\//i.test(url)) return;
    if (IMAGE_EXT_RE.test(url)) return;
    if (seen.has(url)) return;

    let title = stripTags(rawTitle).replace(/^[-*•>|:\s]+|[-–:\s]+$/g, '').trim();
    if (!title || /^https?:\/\//i.test(title)) title = titleFromUrl(url);
    if (title.length > 140) title = title.slice(0, 140) + '…';

    seen.add(url);
    items.push({ title, url, category: currentCategory, source: source.id });
  }

  for (const raw of lines) {
    let line = raw.trim();
    if (!line) continue;

    const mdHeading = line.match(/^#{1,4}\s+(.*)$/);
    const htmlHeading = line.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    if (mdHeading || htmlHeading) {
      const text = stripTags(mdHeading ? mdHeading[1] : htmlHeading[1]).replace(/[:#]+$/, '').trim();
      if (text) currentCategory = text;
      continue;
    }

    if (/^[-=*]{3,}$/.test(line) || /^\|[\s:-]+\|$/.test(line)) continue;

    // Strip standalone image embeds so their `src` URLs don't get picked up as bare links
    line = line.replace(/<img\b[^>]*>/gi, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').trim();
    if (!line) continue;

    let matchedAny = false;

    const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = mdLinkRe.exec(line))) {
      matchedAny = true;
      pushItem(m[1], m[2]);
    }

    const htmlLinkRe = /<a\s+[^>]*href=["']?(https?:\/\/[^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = htmlLinkRe.exec(line))) {
      matchedAny = true;
      pushItem(m[2], m[1]);
    }

    if (!matchedAny) {
      const bareUrlRe = /(https?:\/\/[^\s)<>\]]+)/g;
      let bm;
      while ((bm = bareUrlRe.exec(line))) {
        const before = stripTags(line.slice(0, bm.index));
        pushItem(before, bm[1]);
      }
    }
  }

  return items;
}

async function fetchReadme(source) {
  const url = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/README.md`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Ananta-Quantum-Studio-Resource-Library' } });
  if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status} for ${source.owner}/${source.repo}`);
  return res.text();
}

async function loadSource(source) {
  const base = {
    id: source.id,
    label: source.label,
    description: source.description,
    repoUrl: `https://github.com/${source.owner}/${source.repo}`
  };
  try {
    const markdown = await fetchReadme(source);
    const items = parseMarkdownToResources(markdown, source);
    const categories = [...new Set(items.map((i) => i.category))];
    return { ...base, categories, items, itemCount: items.length, error: null };
  } catch (err) {
    return { ...base, categories: [], items: [], itemCount: 0, error: err.message };
  }
}

/**
 * Returns the full resource library, live-fetched from GitHub and cached
 * in-memory for CACHE_TTL_MS. Pass forceRefresh to bypass the cache.
 */
async function getResourceLibrary({ forceRefresh = false } = {}) {
  if (!forceRefresh && cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const sources = await Promise.all(SOURCES.map(loadSource));
  const data = {
    sources,
    totalItems: sources.reduce((sum, s) => sum + s.itemCount, 0),
    generatedAt: new Date().toISOString(),
    cacheTtlMs: CACHE_TTL_MS
  };

  cache = { data, fetchedAt: Date.now() };
  return data;
}

module.exports = { getResourceLibrary, parseMarkdownToResources, SOURCES };
