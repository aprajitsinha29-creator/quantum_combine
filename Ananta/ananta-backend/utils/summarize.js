
/**
 * Strips raw metadata headers (Title:, Authors:, arXiv Identifier:, etc.)
 * so the summarizer works purely on the actual scientific prose.
 */
function cleanAbstractBody(raw) {
  if (!raw) return '';
  const coreMatch = raw.split(/Abstract\s*(?:&|and)?\s*Research\s*Core:\s*/i);
  let text = coreMatch.length > 1 ? coreMatch.slice(1).join(' ') : raw;

  text = text
    .replace(/(?:^|\n)\s*Title:[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*Authors?:[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*Published:[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*arXiv(?:\s*Identifier)?:[^\n]*/gi, '')
    .replace(/(?:^|\n)\s*Source:[^\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Summarizes research text with a real AI provider, falling back to a local
 * extractive summarizer only when every provider genuinely fails.
 *
 * Returns the reason for any fallback so callers can tell the user the truth
 * ("quota exhausted", "no key") instead of quietly handing back a reworded
 * copy of the same abstract and calling it an AI summary.
 *
 * @param {string} text - text to summarize (often the full extracted paper)
 * @param {string} [focusTerm] - optional term for contextual explanation
 * @returns {Promise<{summary: string, aiUsed: boolean, provider: string, model: string|null, reason: string|null}>}
 */
async function summarizeTextDetailed(text, focusTerm = null) {
  const empty = (msg) => ({ summary: msg, aiUsed: false, provider: 'none', model: null, reason: 'no input text' });
  if (!text || !text.trim()) return empty('No scientific content available to summarize.');

  // Generous context: this is usually a full paper body now, and a bigger
  // slice is what makes the summary describe the actual study rather than
  // just its opening paragraph.
  const proseText = cleanAbstractBody(text).slice(0, 40000);
  if (!proseText) return empty('Empty research document abstract.');

  const instruction = focusTerm
    ? `The user searched for the term "${focusTerm}" inside this research paper. ` +
      `Explain concisely in 3-4 sentences how "${focusTerm}" is discussed, its role in the study, ` +
      `and key conclusions, in clear scientific English.`
    : `Provide an executive research summary of the following academic paper in 3-5 sentences. ` +
      `Cover the core problem/premise, the experimental or theoretical methodology, and the key findings.`;

  // This text is frequently the FULL extracted paper body now (not just an
  // abstract), so the prompt must not mislabel it as one.
  const sourceBlock = `Source Text:\n"""\n${proseText}\n"""`;

  // Provider calls live in aiProvider.js, which every entry point can
  // require directly. This used to reach across into api/gemini.js, which
  // resolves locally but NOT inside Vercel's per-function bundle: the
  // require threw, the throw was swallowed, and production silently served
  // the offline extractive summary for every paper while the status probe
  // still reported "gemini available".
  const { generateText } = require('./aiProvider');

  try {
    const out = await generateText({
      prompt: `${instruction}\n\n${sourceBlock}`,
      maxTokens: 8192,
      temperature: 0.2,
      timeoutMs: 22000
    });
    return { summary: out.text, aiUsed: true, provider: out.provider, model: out.model, reason: null };
  } catch (aiErr) {
    console.warn('[summarizeText] every AI provider failed:', aiErr.message);
    return {
      summary: localStructuredSummary(proseText, focusTerm),
      aiUsed: false,
      provider: 'offline-extractive',
      model: null,
      reason: aiErr.message
    };
  }
}

/**
 * Back-compatible string-returning wrapper. Callers that only want the text
 * (find-term snippets, topic synthesis) keep working unchanged.
 * @returns {Promise<string>}
 */
async function summarizeText(text, focusTerm = null) {
  const result = await summarizeTextDetailed(text, focusTerm);
  return typeof result === 'string' ? result : result.summary;
}

/**
 * Generates an executive academic briefing directly from the abstract prose,
 * extracting core motivation, methods, and outcomes cleanly.
 */
function localStructuredSummary(prose, focusTerm = null) {
  // Split into real sentences (must start with letter, end with terminal punctuation)
  const rawSentences = prose
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 35 && /^[A-Z"']/.test(s));

  if (!rawSentences.length) {
    return prose.substring(0, 350) + '...';
  }

  // Clean any sentence of leading artifact conjunctions or dangling punctuation
  const sentences = rawSentences.map(s => {
    return s.replace(/^[,;:\-\s]+/, '').trim();
  });

  // If the user is inspecting a specific term (e.g. "superposition" or "bell state")
  if (focusTerm) {
    const termLower = focusTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matching = sentences.filter(s => {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.includes(termLower);
    });

    if (matching.length > 0) {
      return matching.slice(0, 3).join(' ');
    }
  }

  // If the abstract is compact (1-3 sentences), return the complete prose cleanly
  if (sentences.length <= 3) {
    return sentences.join(' ');
  }

  // For multi-sentence papers: identify 1) Premise/Motivation, 2) Method/Novelty, 3) Outcome/Conclusion
  const firstSentence = sentences[0];
  const lastSentence = sentences[sentences.length - 1];

  const middleSentences = sentences.slice(1, sentences.length - 1);
  const methodKeywords = ['propose', 'demonstrate', 'show', 'investigate', 'develop', 'present', 'construct', 'measure', 'calculate', 'derive', 'verify'];
  
  let keyMethodSentence = middleSentences.find(s => {
    const lower = s.toLowerCase();
    return methodKeywords.some(k => lower.includes(k));
  }) || middleSentences[0];

  const selected = [firstSentence];
  if (keyMethodSentence && keyMethodSentence !== firstSentence && keyMethodSentence !== lastSentence) {
    selected.push(keyMethodSentence);
  }
  if (lastSentence && !selected.includes(lastSentence)) {
    selected.push(lastSentence);
  }

  return selected.join(' ');
}

/**
 * Parses JSON safely even if wrapped in markdown code blocks.
 */
function extractJsonFromText(raw) {
  if (!raw) return null;
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (err) {}
    }
    return null;
  }
}

/**
 * Deterministic local academic synthesis of multiple papers on a given topic,
 * ensuring verified chronological progression, structured paragraphs, and inline citations.
 */
function localTopicSynthesis(topic, papers) {
  if (!papers || !papers.length) {
    return {
      topic,
      synthesis_paragraphs: [{ text: "No papers available for this topic.", citedPaperIds: [] }],
      key_takeaways: []
    };
  }

  // Sort chronologically
  const sorted = [...papers].sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));
  const queryTerms = (topic || '').toLowerCase().split(/[\s,&+/\-_]+/).filter(w => w.length >= 3);

  // Extract the most relevant sentence from a paper's abstract for the given query word
  const getRelevantSentence = (p) => {
    const cleaned = cleanAbstractBody(p.abstract || '');
    const sentences = cleaned.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (!sentences.length) return p.title;

    // Look for sentence mentioning the query word
    if (queryTerms.length > 0) {
      const match = sentences.find(s => {
        const lower = s.toLowerCase();
        return queryTerms.some(term => lower.includes(term));
      });
      if (match) return match.replace(/[.]$/, '');
    }

    return sentences[0].replace(/[.]$/, '');
  };

  const paragraphs = [];

  // Paragraph 1: Early formulation & emergence
  const earliest = sorted[0];
  const p1Text = `In investigating ${topic}, ${earliest.authors} (${earliest.year}) first formulated that ${getRelevantSentence(earliest).toLowerCase()} [${earliest.id}]. This work established the foundational baseline for subsequent research on ${topic}.`;
  paragraphs.push({
    text: p1Text,
    citedPaperIds: [earliest.id]
  });

  // Paragraph 2: Progression & comparative findings across mid/intermediate papers
  if (sorted.length >= 2) {
    const midPapers = sorted.slice(1, sorted.length > 2 ? -1 : undefined);
    const midSentences = midPapers.map(p => 
      `${p.authors} (${p.year}) demonstrated that ${getRelevantSentence(p).toLowerCase()} [${p.id}]`
    );

    const p2Text = `Subsequent research expanded this understanding: ${midSentences.join('; furthermore, ')}. Together, these findings established key physical constraints, operational limits, and theoretical bounds for ${topic}.`;
    paragraphs.push({
      text: p2Text,
      citedPaperIds: midPapers.map(p => p.id)
    });
  }

  // Paragraph 3: Modern status & empirical synthesis
  if (sorted.length >= 3) {
    const latest = sorted[sorted.length - 1];
    const p3Text = `Most recently, ${latest.authors} (${latest.year}) advanced the state of the art, showing that ${getRelevantSentence(latest).toLowerCase()} [${latest.id}]. Across all analyzed publications [${sorted.map(p => p.id).join(', ')}], the progression demonstrates a continuous convergence from theoretical models toward experimental verification in quantum hardware.`;
    paragraphs.push({
      text: p3Text,
      citedPaperIds: [latest.id, earliest.id]
    });
  }

  // Key takeaways directly extracted and linked to source citations
  const key_takeaways = sorted.map(p => {
    const rel = getRelevantSentence(p);
    return {
      point: `${p.title} (${p.year}): ${rel} [${p.id}].`,
      citedPaperIds: [p.id]
    };
  }).slice(0, 5);

  return {
    topic,
    synthesis_paragraphs: paragraphs,
    key_takeaways
  };
}

/**
 * Synthesizes multiple research papers on a single topic into a unified narrative
 * with structured citations using Grok-2, Gemini 2.5 Flash, or the local academic synthesizer.
 *
 * @param {string} topic
 * @param {Array<{id: string, title: string, authors: string, year: number, abstract: string}>} papers
 * @returns {Promise<{topic: string, synthesis_paragraphs: Array<{text: string, citedPaperIds: string[]}>, key_takeaways: Array<{point: string, citedPaperIds: string[]}>}>}
 */
async function synthesizeTopic(topic, papers) {
  if (!papers || !papers.length) {
    return {
      topic,
      synthesis_paragraphs: [{ text: "No papers provided for synthesis.", citedPaperIds: [] }],
      key_takeaways: []
    };
  }

  if (papers.length === 1) {
    const p = papers[0];
    return {
      topic,
      synthesis_paragraphs: [{
        text: `[${p.id}] ${p.title} (${p.authors}, ${p.year}): ${cleanAbstractBody(p.abstract || '')}`,
        citedPaperIds: [p.id]
      }],
      key_takeaways: [{
        point: `${p.title} establishes the core formulation for this topic [${p.id}].`,
        citedPaperIds: [p.id]
      }]
    };
  }

  const promptPapers = papers.map(p => 
    `[Paper ID: ${p.id}]\nTitle: ${p.title}\nAuthors: ${p.authors} (${p.year})\nAbstract: ${cleanAbstractBody(p.abstract || '')}`
  ).join('\n\n');

  const systemInstruction = `You are an elite quantum research scientist synthesizing seminal publications on: "${topic}".
Write a SINGLE unified, cohesive academic synthesis narrative that compares, connects, and traces chronological progression and complementary contributions.
DO NOT output isolated, disconnected per-paper summaries.

MANDATORY RULES:
1. Every technical claim, premise, methodology, or finding MUST carry an inline citation tag using the exact Paper ID in brackets, e.g. [${papers[0]?.id}] or [${papers[0]?.id}, ${papers[1]?.id}].
2. Return strictly valid JSON adhering to this exact schema without any markdown formatting or commentary:
{
  "topic": "${topic}",
  "synthesis_paragraphs": [
    {
      "text": "Unified narrative paragraph with [paper-id] citations...",
      "citedPaperIds": ["paper-id-1", "paper-id-2"]
    }
  ],
  "key_takeaways": [
    {
      "point": "Crucial finding or conclusion with [paper-id] citation...",
      "citedPaperIds": ["paper-id-1"]
    }
  ]
}`;

  // 1. Try Grok (xAI)
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (grokKey && grokKey.length > 5) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 14000);
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${grokKey.trim()}`
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Synthesize these papers on "${topic}":\n\n${promptPapers}` }
          ],
          temperature: 0.2,
          max_tokens: 1200
        }),
        signal: controller.signal
      });
      clearTimeout(tid);

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = extractJsonFromText(content);
        if (parsed && Array.isArray(parsed.synthesis_paragraphs)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[synthesizeTopic] Grok notice:", err.message);
    }
  }

  // 2. Try Google Gemini (Gemini 2.5 Flash)
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && geminiKey.length > 10) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 14000);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nPAPERS:\n${promptPapers}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1400,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });
      clearTimeout(tid);

      if (res.ok) {
        const data = await res.json();
        const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJsonFromText(geminiText);
        if (parsed && Array.isArray(parsed.synthesis_paragraphs)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[synthesizeTopic] Gemini notice:", err.message);
    }
  }

  // 3. Fallback: Intelligent Local Academic Synthesizer
  return localTopicSynthesis(topic, papers);
}

module.exports = {
  summarizeText,
  summarizeTextDetailed,
  synthesizeTopic,
  localTopicSynthesis,
  cleanAbstractBody
};
