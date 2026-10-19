# Ananta — Research Backend

A small Express backend that:

1. **Searches Google** for research on a topic (`/api/search`)
2. **Fetches and cleans** the text of any article/paper URL (`/api/fetch-content`)
3. **Finds an exact word/term** inside a document and returns an **AI summary of just the surrounding passage** — so a user who doesn't have time to read the whole thing can jump straight to what they need (`/api/find-term`)
4. **Summarizes a whole document** on demand (`/api/summarize`)

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `GOOGLE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — enable "Custom Search API" |
| `GOOGLE_CX` | [Programmable Search Engine](https://programmablesearchengine.google.com/) — create one, set to "search the entire web" |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |

## 2. Run it

```bash
npm start
# or, for auto-reload during development:
npm run dev
```

Server runs at `http://localhost:5000`.

## 3. API usage

### Search Google for research

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "quantum entanglement applications", "num": 5}'
```

### Fetch a paper/article's text

```bash
curl -X POST http://localhost:5000/api/fetch-content \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Quantum_entanglement"}'
```

### Find an exact term and get a summary of that part (the core feature)

By URL (fetches live):

```bash
curl -X POST http://localhost:5000/api/find-term \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Quantum_entanglement", "term": "quantum"}'
```

Or by text you already have (e.g. from a previous `/api/fetch-content` call):

```bash
curl -X POST http://localhost:5000/api/find-term \
  -H "Content-Type: application/json" \
  -d '{"text": "... full document text ...", "term": "quantum"}'
```

Response shape:

```json
{
  "term": "quantum",
  "title": "Quantum entanglement - Wikipedia",
  "found": true,
  "totalOccurrences": 12,
  "results": [
    {
      "context": "...the surrounding paragraph where the term appears...",
      "summary": "A short AI-written summary of that passage, focused on the term."
    }
  ]
}
```

### Summarize an entire document

```bash
curl -X POST http://localhost:5000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Quantum_entanglement"}'
```

## 4. Wiring this to a frontend "tab"

On your frontend, a "Search term" tab would just be a text input + button that
calls `/api/find-term` with the currently loaded document's `url` (or cached
`text`) and the word the user typed, then renders the returned `results` list
(context + summary) instead of the full document.

## Notes / things to adjust for production

- Google's Custom Search JSON API free tier is capped at 100 queries/day — for heavier use you'd need a paid quota or an alternative like SerpAPI/Bing Search API (swap this out in `utils/googleSearch.js`).
- `extractTextFromUrl` uses a generic HTML-to-text approach; some sites (paywalled journals, JS-rendered pages) may need a headless browser (e.g. Puppeteer) instead.
- Add rate limiting / auth middleware before exposing this publicly, since each request costs API credits.
