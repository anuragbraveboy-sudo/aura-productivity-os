/* ───────────────────────────────────────────────
   AURA  —  AI Integration Module  (ai.js)
   Gemini API + local fallback summarization
   ─────────────────────────────────────────────── */

const AI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/* ── API Provider & Key Management ───────────── */
function getProvider() {
  return localStorage.getItem('aura_ai_provider') || 'gemini';
}

function setProvider(prov) {
  localStorage.setItem('aura_ai_provider', prov);
  window.dispatchEvent(new Event('aura-settings-changed'));
}

function getApiKey(provider = '') {
  const p = provider || getProvider();
  if (p === 'claude') return localStorage.getItem('aura_claude_key') || '';
  return localStorage.getItem('aura_gemini_key') || '';
}

function setApiKey(key, provider = '') {
  const p = provider || getProvider();
  if (p === 'claude') {
    localStorage.setItem('aura_claude_key', key.trim());
  } else {
    localStorage.setItem('aura_gemini_key', key.trim());
  }
  window.dispatchEvent(new Event('aura-settings-changed'));
}

function hasApiKey() {
  return getApiKey().length > 10;
}

/* ── Core Claude Call (supports PC Bridge) ───── */
async function callClaude(prompt, maxTokens = 2048) {
  const key = getApiKey('claude');
  if (!key) throw new Error('NO_CLAUDE_KEY');

  // Try routing through PC Bridge first if online
  if (window.AuraBridge && window.AuraBridge.isConnected) {
    try {
      const settings = window.AuraBridge.getSettings();
      const bridgeUrl = `http://${settings.ip}:${settings.port}/api/claude`;
      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, key, max_tokens: maxTokens })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.text || '';
      }
    } catch(e) {
      console.warn('[AI] Bridge Claude call failed, trying direct:', e.message);
    }
  }

  // Direct call (will hit browser CORS blocks without bridge)
  const url = 'https://api.anthropic.com/v1/messages';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude API error ${res.status}`);
    }

    const data = await res.json();
    return data?.content?.[0]?.text || '';
  } catch (e) {
    if (e.message.includes('Failed to fetch') || e.name === 'TypeError') {
      throw new Error('CORS_BLOCKED_BY_BROWSER');
    }
    throw e;
  }
}

/* ── Core Gemini Call ────────────────────────── */
async function callGemini(prompt, maxTokens = 2048) {
  const key = getApiKey('gemini');
  if (!key) throw new Error('NO_KEY');

  const modelsToTry = [AI_MODEL, 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastErr = null;

  for (const model of modelsToTry) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: maxTokens
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch(e) {
      lastErr = e;
      if (e.message.includes('high demand') || e.message.includes('503') || e.message.includes('not found')) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/* ── Unified AI Router ───────────────────────── */
async function callActiveAI(prompt, maxTokens = 2048) {
  const provider = getProvider();
  if (provider === 'claude') {
    try {
      return await callClaude(prompt, maxTokens);
    } catch (e) {
      if (e.message === 'CORS_BLOCKED_BY_BROWSER') {
        throw new Error('Anthropic Claude API direct request was blocked by browser CORS policy. Please start the AURA PC Bridge on your laptop and connect the phone to route requests securely, or switch back to Google Gemini.');
      }
      throw e;
    }
  } else {
    return await callGemini(prompt, maxTokens);
  }
}

/* ── Summarize Lecture ───────────────────────── */
async function summarizeLecture(transcript) {
  if (!hasApiKey()) return fallbackSummarize(transcript);

  const prompt = `You are an expert academic study assistant. Summarize the following lecture transcript into clear, concise bullet points that a student can use for revision. Use markdown formatting with bold key terms. Group related points under sub-headings if appropriate.

LECTURE TRANSCRIPT:
${transcript}

SUMMARY:`;

  try {
    return await callActiveAI(prompt);
  } catch (e) {
    console.warn('[AI] active API call failed, using fallback:', e.message);
    const errPrefix = `⚠️ **AI Summary Generation Failed**: ${e.message}\n*Falling back to local offline summarizer...*\n\n---\n\n`;
    return errPrefix + fallbackSummarize(transcript);
  }
}

/* ── Generate Flashcards ─────────────────────── */
async function generateFlashcards(transcript, count = 5) {
  if (!hasApiKey()) return fallbackFlashcards(transcript, count);

  const prompt = `You are an expert university-level academic tutor in STEM and physics. From the following lecture notes/transcript, generate exactly ${count} highly valuable, challenging study flashcards.
  
Each flashcard must test a core concept, key formula, physical law, or derivation at a deep conceptual or quantitative level.
Avoid trivial, low-value definition questions (e.g. "What is X?"). Instead, formulate questions that require reasoning, synthesis, or explain how a mechanism/formula works.

Examples of high-value flashcard styles:
1. "Explain the physical significance of each term in the Larmor formula, and under what condition is it valid?"
2. "Under what conditions do the parallel and perpendicular components of the electric field ($E_{||}$ and $E_{\\perp}$) change at a boundary? State the boundary conditions."
3. "Why does the magnetic field do no work on a moving charged particle? Explain using the Lorentz force equation."
4. "What is the physical meaning of the displacement current term in Ampere's law, and why did Maxwell introduce it?"

Return ONLY a valid JSON array (no markdown fences, no extra text) with objects having "front" (question) and "back" (answer) fields.

LECTURE NOTES/TRANSCRIPT:
${transcript}`;

  try {
    let raw = await callActiveAI(prompt, 1500);
    // Strip markdown code fences if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const cards = JSON.parse(raw);
    if (Array.isArray(cards)) return cards.slice(0, count);
    throw new Error('Not an array');
  } catch (e) {
    console.warn('[AI] Flashcard generation failed, using fallback:', e.message);
    showToast(`⚠️ AI Flashcards failed: ${e.message}. Using offline fallback.`);
    return fallbackFlashcards(transcript, count);
  }
}

/* ── Q&A About Notes ─────────────────────────── */
function getPersonaInstruction() {
  const persona = localStorage.getItem('aura_ai_persona') || 'coach';
  switch (persona) {
    case 'mentor':
      return 'You are an expert academic mentor and professor. Your tone is academic, formal, highly structured, and instructive. Use scholarly references and encourage rigorous analytical thinking.';
    case 'friend':
      return 'You are a casual, friendly study partner. Your tone is supportive, casual, and warm. Use emojis (e.g. 📚, 🚀, 💡), speak in direct and simple terms, and keep it lighthearted.';
    case 'researcher':
      return 'You are a focused, objective research assistant. Your tone is highly scientific, detailed, neutral, and data-driven. Highlight empirical facts, structure your response as clear summaries or bulleted lists, and cite general concepts.';
    case 'coach':
    default:
      return 'You are an encouraging study coach. Your tone is high-energy, motivating, structured, and action-oriented. Motivate the user to complete their tasks and remind them of their potential!';
  }
}

async function askAboutNotes(question, context) {
  if (!hasApiKey()) return fallbackQA(question, context);

  const personaInstr = getPersonaInstruction();
  const prompt = `${personaInstr}
A student is asking a question about their lecture notes. Answer concisely and accurately based on the provided context. If the answer is not in the context, say so and provide your best general knowledge answer.

LECTURE NOTES:
${context}

STUDENT QUESTION:
${question}

ANSWER:`;

  try {
    return await callActiveAI(prompt, 1024);
  } catch (e) {
    console.warn('[AI] Q&A failed, using fallback:', e.message);
    const errPrefix = `⚠️ **AI Answer Generation Failed**: ${e.message}\n*Falling back to local offline search...*\n\n---\n\n`;
    return errPrefix + fallbackQA(question, context);
  }
}

/* ── Suggest Study Plan ──────────────────────── */
async function suggestStudyPlan(deadlines, lectures) {
  if (!hasApiKey()) return fallbackStudyPlan(deadlines);

  const dlText = deadlines.map(d => `• ${d.title} (${d.course}) — Due: ${d.date} — Priority: ${d.priority}`).join('\n');
  const lecText = lectures.map(l => `• ${l.title}`).join('\n');

  const prompt = `You are an academic study planner. Based on the following deadlines and recently recorded lectures, suggest an optimized study plan for the next 7 days. Use time blocks (morning, afternoon, evening). Be specific and practical.

UPCOMING DEADLINES:
${dlText}

RECENT LECTURES:
${lecText}

Return the plan as a simple, readable schedule.`;

  try {
    return await callActiveAI(prompt, 1024);
  } catch {
    return fallbackStudyPlan(deadlines);
  }
}

/* ═══════════════════════════════════════════════
   SMART FALLBACK ENGINE
   Genuinely parses and reasons from uploaded content.
   No hardcoded fake answers — all responses come
   from the actual document text.
   ═══════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────── */

/**
 * Pre-process raw PDF text: insert newlines before section numbers
 * so that TOC content extracted as one long line gets properly structured.
 * e.g. "1.1   Vector Algebra   1 1.1.2   Component Form   4" →
 *      "1.1   Vector Algebra   1\n1.1.2   Component Form   4"
 */
function _preprocessText(text) {
  let t = text;

  // Insert newline before chapter-level numbers: "  1   Vector Analysis"
  // Pattern: page-number-space(s) followed by a new chapter/section number
  t = t.replace(/(\s{2,})(\d{1,2}\.\d{1,2}\.\d{1,2}\s{2,})/g, '\n$2');  // sub-subsections first (1.1.1)
  t = t.replace(/(\s{2,})(\d{1,2}\.\d{1,2}\s{2,})/g, '\n$2');           // subsections (1.1)
  t = t.replace(/(\d+\s{2,})(\d{1,2}\s{2,}[A-Z])/g, '$1\n$2');          // chapters (1   Title)

  // Insert newline before "Chapter X" or "CHAPTER X"
  t = t.replace(/\s+(Chapter\s+\d+)/gi, '\n$1');

  // Insert newline before common textbook section markers
  t = t.replace(/\s+(Contents|Preface|Advertisement|Index|Appendix|Bibliography)/gi, '\n$1');

  // Insert newline before "Problem X.Y" or "Example X.Y"
  t = t.replace(/\s+((?:Problem|Example|Figure|Table)\s+\d+\.\d+)/gi, '\n$1');

  // Collapse multiple consecutive newlines
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

/** Split text into logical chunks (lines, sentences, paragraphs) */
function _splitIntoChunks(text) {
  const processed = _preprocessText(text);
  const raw = processed.split(/\n{2,}/);
  const chunks = [];
  for (const block of raw) {
    const lines = block.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      // Further split long lines on sentence boundaries
      if (line.length > 300) {
        const sents = line.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
        chunks.push(...sents);
      } else {
        chunks.push(line);
      }
    }
  }
  return chunks.filter(c => c.length > 5);
}

/** Detect if text looks like a structured document (TOC, outline, syllabus) */
function _isStructuredDoc(text) {
  const processed = _preprocessText(text);
  const lines = processed.split('\n').filter(l => l.trim().length > 0);
  let numberedLines = 0;
  for (const l of lines) {
    if (/^\s*\d+[\.\)]\s/.test(l) || /^\s*[A-Z][\.\)]\s/.test(l) || /^\d+\.\d+/.test(l.trim())) {
      numberedLines++;
    }
  }
  // Also detect if the raw text has many section-number patterns even without newlines
  const sectionMatches = (text.match(/\d+\.\d+\s{2,}[A-Z]/g) || []).length;
  return numberedLines > lines.length * 0.15 || sectionMatches > 8;
}

/** Extract chapter/section structure from a TOC-like document */
function _extractStructure(text) {
  const processed = _preprocessText(text);
  const lines = processed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;

  for (const line of lines) {
    // Match chapter-level: "1   Vector Analysis   1" (with optional trailing page number)
    const chMatch = line.match(/^(\d{1,2})\s{2,}([A-Z].+?)(?:\s+\d+\s*)?$/);
    if (chMatch && !/\d+\.\d+/.test(line.substring(0, 6))) {
      currentChapter = { num: chMatch[1], title: chMatch[2].trim().replace(/\s+\d+$/, ''), sections: [] };
      chapters.push(currentChapter);
      currentSection = null;
      continue;
    }
    // Match section-level: "1.1   Vector Algebra   1" or "5.3.2   The Divergence   17"
    const secMatch = line.match(/^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s{2,}(.+?)(?:\s+\d+\s*)?$/);
    if (secMatch) {
      const depth = secMatch[1].split('.').length;
      const title = secMatch[2].trim().replace(/\s+\d+$/, '');
      const sec = { num: secMatch[1], title, depth };

      // If no current chapter, create an implicit one
      if (!currentChapter) {
        const chNum = secMatch[1].split('.')[0];
        currentChapter = { num: chNum, title: `Chapter ${chNum}`, sections: [] };
        chapters.push(currentChapter);
      }

      if (depth === 2) {
        currentSection = sec;
        currentSection.subsections = [];
        currentChapter.sections.push(sec);
      } else if (depth >= 3 && currentSection) {
        currentSection.subsections = currentSection.subsections || [];
        currentSection.subsections.push(sec);
      }
      continue;
    }
  }
  return chapters;
}

/** Score a chunk's relevance to the question using weighted keyword matching */
function _scoreRelevance(chunk, qWords, qBigrams) {
  const cl = chunk.toLowerCase();
  let score = 0;
  // Exact word matches (weighted by rarity — longer words are rarer)
  for (const w of qWords) {
    // Use word-boundary matching to avoid partial matches like "line" in "outline"
    const regex = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (regex.test(cl)) {
      score += 1 + (w.length > 6 ? 1.5 : 0); // bonus for longer/rarer words
    }
  }
  // Bigram (two-word phrase) matches — much higher signal
  for (const bg of qBigrams) {
    if (cl.includes(bg)) score += 3;
  }
  return score;
}

/** Build bigrams from a word list */
function _makeBigrams(words) {
  const bgs = [];
  for (let i = 0; i < words.length - 1; i++) {
    bgs.push(words[i] + ' ' + words[i + 1]);
  }
  return bgs;
}

/** Find surrounding context for a matched chunk in the original text */
function _getSurroundingContext(allChunks, matchIdx, radius = 2) {
  const start = Math.max(0, matchIdx - radius);
  const end = Math.min(allChunks.length, matchIdx + radius + 1);
  return allChunks.slice(start, end).join('\n');
}


/* ── Fallback: Summarize ─────────────────────── */
function fallbackSummarize(text) {
  const isStructured = _isStructuredDoc(text);

  // ── Structured document (TOC / syllabus / outline) ──
  if (isStructured) {
    const chapters = _extractStructure(text);
    if (chapters.length > 0) {
      let summary = '**📖 Document Structure**\n\n';
      summary += `This document covers **${chapters.length} chapters**:\n\n`;
      for (const ch of chapters) {
        summary += `### Chapter ${ch.num}: ${ch.title}\n`;
        if (ch.sections.length > 0) {
          for (const sec of ch.sections) {
            summary += `- **${sec.num}** ${sec.title}\n`;
            if (sec.subsections && sec.subsections.length > 0) {
              for (const sub of sec.subsections.slice(0, 4)) {
                summary += `  - ${sub.num} ${sub.title}\n`;
              }
              if (sec.subsections.length > 4) {
                summary += `  - _...and ${sec.subsections.length - 4} more sub-topics_\n`;
              }
            }
          }
        }
        summary += '\n';
      }
      summary += `\n_*Note: Generated using local Offline Fallback Mode. To get advanced AI summaries, add a Gemini API Key under "Setup AI" on the Home screen.*_`;
      return summary;
    }
  }

  // ── Regular text document ──
  const chunks = _splitIntoChunks(text);
  const keyPoints = [];

  // Pass 1: Find sentences with definitional patterns
  const defPatterns = [
    /\b(?:is defined as|refers to|is the process|is a measure|states that)\b/i,
    /\b(?:is|are)\s+(?:a|an|the)\s+\w+/i,
    /\b(?:called|known as|termed|described as)\b/i,
  ];

  for (const chunk of chunks) {
    if (chunk.length < 25 || chunk.length > 400) continue;
    for (const pat of defPatterns) {
      if (pat.test(chunk) && keyPoints.length < 12) {
        keyPoints.push(chunk.trim());
        break;
      }
    }
  }

  // Pass 2: Find sentences with causal/explanatory language
  const explainKeywords = ['because', 'therefore', 'thus', 'hence', 'results in',
    'leads to', 'causes', 'important', 'significant', 'critical', 'fundamental',
    'key', 'essential', 'primary', 'major'];

  for (const chunk of chunks) {
    if (chunk.length < 25 || chunk.length > 400) continue;
    const cl = chunk.toLowerCase();
    if (explainKeywords.some(k => cl.includes(k)) && !keyPoints.includes(chunk.trim())) {
      if (keyPoints.length < 15) keyPoints.push(chunk.trim());
    }
  }

  // Pass 3: If still few points, sample evenly from the document
  if (keyPoints.length < 5) {
    const step = Math.max(1, Math.floor(chunks.length / 8));
    for (let i = 0; i < chunks.length && keyPoints.length < 10; i += step) {
      const c = chunks[i].trim();
      if (c.length > 25 && c.length < 400 && !keyPoints.includes(c)) {
        keyPoints.push(c);
      }
    }
  }

  let summary = '**📝 Summary**\n\n';
  for (const pt of keyPoints.slice(0, 12)) {
    summary += `• ${pt}\n\n`;
  }

  if (keyPoints.length === 0) {
    // Last resort: show first few chunks
    summary += chunks.slice(0, 5).map(c => `• ${c}`).join('\n\n');
  }

  summary += `\n\n_*Note: Generated using local Offline Fallback Mode. To get advanced AI summaries, add a Gemini API Key under "Setup AI" on the Home screen.*_`;
  return summary;
}


/* ── Fallback: Flashcards ────────────────────── */
function fallbackFlashcards(text, count) {
  const chunks = _splitIntoChunks(text);
  const cards = [];
  const used = new Set();

  // Helper to check if a string contains math/formula patterns
  const hasMath = (s) => /[\d\w]+\s*=\s*[\d\w\s+\-*/\\()_^{}$%]+|[\d\w]+\s*[><=]\s*[\d\w]+|\\theta|\\mu|\\pi|\\epsilon|\bfield\b|\bforce\b|\benergy\b/i.test(s);

  // Strategy 1: Find Problems and Examples (e.g. "Problem 4.36", "Example 5.10")
  for (let i = 0; i < chunks.length && cards.length < count; i++) {
    const c = chunks[i].trim();
    if (used.has(i) || c.length < 40 || c.length > 600) continue;

    const probMatch = c.match(/^((?:Problem|Example|Fig|Figure)\s+\d+\.\d+)\s+(.+)/i);
    if (probMatch) {
      const title = probMatch[1];
      const desc = probMatch[2].split(/[.!?]/)[0] + '.'; // Get the first sentence of the problem
      if (desc.length > 15) {
        cards.push({
          front: `Analyze/Solve the following from ${title} in your notes: "${desc}"`,
          back: c
        });
        used.add(i);
      }
    }
  }

  // Strategy 2: Find Equation/Formula sentences and ask to explain them
  for (let i = 0; i < chunks.length && cards.length < count; i++) {
    const c = chunks[i].trim();
    if (used.has(i) || c.length < 30 || c.length > 500) continue;

    // Look for equations containing mathematical relations or physical terms
    if (hasMath(c) && (c.includes('=') || c.includes('→') || c.includes('gradient') || c.includes('divergence') || c.includes('curl'))) {
      let subject = 'the mathematical relationship';
      const termMatch = c.match(/\b(electric field|magnetic field|bound charge|electric potential|vector potential|flux|current density|capacitance|inductance|work|energy|force)\b/i);
      if (termMatch) {
        subject = `the ${termMatch[1].toLowerCase()}`;
      }
      
      cards.push({
        front: `Explain the physical meaning and formulas relating to ${subject} in this passage:\n"${c.substring(0, 120)}..."`,
        back: c
      });
      used.add(i);
    }
  }

  // Strategy 3: Find definition-style sentences → "What is X?" but refine it
  for (let i = 0; i < chunks.length && cards.length < count; i++) {
    const c = chunks[i].trim();
    if (c.length < 30 || c.length > 500 || used.has(i)) continue;

    // "X is defined as Y" / "X refers to Y" / "X is the Y"
    const defMatch = c.match(/^(.{5,60}?)\s+(?:is defined as|refers to|is the process of|is a measure of|is the|are the)\s+(.+)/i);
    if (defMatch) {
      const term = defMatch[1].trim();
      cards.push({ 
        front: `Based on your notes, explain the concept and physical behavior of: "${term}"`, 
        back: c 
      });
      used.add(i);
      continue;
    }
  }

  // Strategy 4: Law / Theorem matching
  for (let i = 0; i < chunks.length && cards.length < count; i++) {
    const c = chunks[i].trim();
    if (used.has(i) || c.length < 35 || c.length > 500) continue;
    
    const lawMatch = c.match(/(.{3,50}?(?:law|theorem|principle|rule|equation|condition))\s+(?:states|says|requires|defines)\s+/i);
    if (lawMatch) {
      cards.push({ 
        front: `What does ${lawMatch[1].trim()} state, and what are its applications according to your notes?`, 
        back: c 
      });
      used.add(i);
    }
  }

  // Strategy 5: Clean backup (only if we need more cards)
  if (cards.length < count) {
    for (let i = 0; i < chunks.length && cards.length < count; i++) {
      if (used.has(i)) continue;
      const c = chunks[i].trim();
      if (c.length < 50 || c.length > 400 || _isStructuredDoc(c)) continue;
      
      // Select passages containing core physics terms
      if (/\b(field|charge|potential|energy|force|flux|current|atom|wave|vector)\b/i.test(c)) {
        cards.push({
          front: `Explain the physical concept discussed in this section of your notes:\n"${c.substring(0, 100)}..."`,
          back: c
        });
        used.add(i);
      }
    }
  }

  // Strategy 6: TOC/structured fallback (only if absolutely empty/syllabus)
  if (cards.length < count && _isStructuredDoc(text)) {
    const chapters = _extractStructure(text);
    for (const ch of chapters) {
      if (cards.length >= count) break;
      if (ch.sections.length > 0) {
        const topics = ch.sections.slice(0, 5).map(s => s.title).join(', ');
        cards.push({
          front: `Outline the core topics and sub-sections introduced under Chapter ${ch.num}: ${ch.title}.`,
          back: `Chapter ${ch.num} covers: ${topics}`
        });
      }
    }
  }

  return cards.slice(0, count);
}


/* ── Fallback: Q&A ───────────────────────────── */
function fallbackQA(question, context) {
  const qLower = question.toLowerCase().trim();

  // ── 0. Handle confirmations ("yes", "explain", "tell me more") ──
  const confirmWords = ['yes', 'y', 'sure', 'okay', 'ok', 'explain', 'expand',
    'more', 'tell me more', 'please', 'go ahead', 'yes please', 'haan', 'ha'];
  if (confirmWords.includes(qLower) || qLower.startsWith('expand') || qLower.startsWith('explain more')) {
    // Find last AI message that had matched content
    if (window.state && window.state.chatHistory) {
      let lastContext = '';
      for (let i = window.state.chatHistory.length - 1; i >= 0; i--) {
        const msg = window.state.chatHistory[i];
        if (msg.role === 'ai' && msg.text.includes('📚')) {
          // Extract the section heading from the last structured answer
          const headingMatch = msg.text.match(/\*\*(.+?)\*\*/);
          if (headingMatch) {
            lastContext = headingMatch[1];
            break;
          }
        }
        if (msg.role === 'ai') {
          // Try to find any quoted content
          const quoteMatch = msg.text.match(/"([^"]{15,})"/);
          if (quoteMatch) {
            lastContext = quoteMatch[1];
            break;
          }
        }
      }
      if (lastContext) {
        // Re-search with the last matched context as the question
        return fallbackQA(lastContext, context);
      }
    }
    return `Could you please rephrase your question? I'll search your notes for the specific topic you want to know about.`;
  }

  // ── 1. Skip trivial stop-words from the question ──
  const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'of', 'in', 'on', 'at',
    'to', 'for', 'and', 'or', 'with', 'from', 'by', 'about', 'how', 'does',
    'do', 'did', 'was', 'were', 'are', 'has', 'have', 'been', 'this', 'that',
    'it', 'its', 'can', 'will', 'would', 'could', 'should', 'may', 'tell',
    'me', 'explain', 'describe', 'define', 'give', 'your', 'my', 'i', 'you',
    'we', 'they', 'our', 'who', 'which', 'where', 'when', 'why', 'not',
    'one', 'two', 'line', 'just', 'only', 'also', 'some', 'any', 'each',
    'all', 'very', 'much', 'more', 'most', 'other', 'into', 'over', 'out',
    'up', 'down', 'then', 'than', 'so', 'no', 'if', 'but', 'such', 'like',
    'get', 'got', 'let', 'say', 'said', 'make', 'made', 'know', 'see',
    'use', 'used', 'using', 'find', 'show', 'take', 'come', 'go', 'new',
    'way', 'well', 'back', 'long', 'look', 'think', 'thing', 'point']);

  const qWords = qLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const qBigrams = _makeBigrams(qWords);

  // ── 2. Always search the ACTUAL text content first ──
  const chunks = _splitIntoChunks(context);
  const scored = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Skip TOC-like lines (just section numbers + short titles < 50 chars with no sentences)
    if (/^\d+\.\d+/.test(chunk.trim()) && chunk.length < 60 && !/[.!?]/.test(chunk)) continue;
    // Skip very short chunks that are just headers/labels
    if (chunk.length < 20) continue;

    const score = _scoreRelevance(chunk, qWords, qBigrams);
    if (score > 0) {
      scored.push({ idx: i, chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    // Collect the top matches and their surrounding context
    const topResults = scored.slice(0, 6);
    const usedIdxs = new Set();
    const passages = [];

    for (const r of topResults) {
      if (usedIdxs.has(r.idx)) continue;
      const ctx = _getSurroundingContext(chunks, r.idx, 2);
      // Skip if context is too short or looks like a TOC entry
      if (ctx.length < 30) continue;
      passages.push(ctx);
      // Mark nearby indices as used to avoid repeats
      for (let j = r.idx - 2; j <= r.idx + 2; j++) usedIdxs.add(j);
    }

    if (passages.length > 0) {
      let answer = `📚 **From your notes**, here's what I found about "${question}":\n\n`;

      for (let i = 0; i < passages.length; i++) {
        const p = passages[i].trim();
        if (i === 0) {
          answer += `> ${p}\n\n`;
        } else {
          answer += `• ${p}\n\n`;
        }
      }

      answer += `_Found ${scored.length} relevant passage${scored.length > 1 ? 's' : ''} in your notes. Ask a follow-up question to dive deeper!_\n\n`;
      answer += `⚠️ *Note: You are running in Offline Fallback Mode. To get genuine, high-quality AI answers, please click "Setup AI" on the Home screen and add a Gemini API Key.*`;
      return answer;
    }
  }

  // ── 3. Fallback: If no real content found, try structured outline ──
  const isStructured = _isStructuredDoc(context);

  if (isStructured && qWords.length > 0) {
    const chapters = _extractStructure(context);

    if (chapters.length > 0) {
      const matchedSections = [];

      for (const ch of chapters) {
        for (const sec of ch.sections) {
          const secText = `${sec.title} ${(sec.subsections || []).map(ss => ss.title).join(' ')}`.toLowerCase();
          const secScore = _scoreRelevance(secText, qWords, qBigrams);
          if (secScore > 0) {
            matchedSections.push({ ...sec, chapterNum: ch.num, chapterTitle: ch.title, score: secScore });
          }
        }
      }

      matchedSections.sort((a, b) => b.score - a.score);

      if (matchedSections.length > 0) {
        let answer = `📖 I couldn't find detailed explanations in your notes, but your document covers this topic in these sections:\n\n`;
        for (const sec of matchedSections.slice(0, 8)) {
          answer += `- **${sec.num} ${sec.title}** (Chapter ${sec.chapterNum}: ${sec.chapterTitle})\n`;
          if (sec.subsections && sec.subsections.length > 0) {
            for (const sub of sec.subsections) {
              answer += `  - ${sub.num} ${sub.title}\n`;
            }
          }
        }
        answer += `\n_Your uploaded document seems to be a table of contents. Try uploading the full chapter pages for detailed explanations!_\n\n`;
        answer += `⚠️ *Note: You are running in Offline Fallback Mode. To get genuine, high-quality AI answers, please click "Setup AI" on the Home screen and add a Gemini API Key.*`;
        return answer;
      }
    }
  }

  // ── 4. No matches found — honest "not found" message ──
  return `I searched through your uploaded notes but couldn't find content matching "${question}".\n\nHere are some tips:\n• Try using specific terms or keywords from your document\n• Check if the topic uses different terminology in your notes\n• You can also try asking about a chapter or section number\n\n⚠️ *Note: You are running in Offline Fallback Mode. To get genuine, high-quality AI answers, please click "Setup AI" on the Home screen and add a Gemini API Key.*`;
}

/* ── Fallback: Study Plan ────────────────────── */
function fallbackStudyPlan(deadlines) {
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));
  let plan = '**Suggested Study Plan**\n\n';
  sorted.forEach((d, i) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    plan += `**${i + 1}. ${d.title}** (${d.course})\n`;
    plan += `   📅 Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — Priority: ${d.priority}\n`;
    plan += `   ➡️ Study ${daysLeft <= 1 ? 'TODAY — URGENT!' : `${Math.ceil(daysLeft / 2)} sessions recommended`}\n\n`;
  });
  return plan;
}

function showApiKeyModal() {
  if (typeof toggleStudio === 'function') {
    toggleStudio(true);
  }
}

/* ── Toast notification ──────────────────────── */
function showToast(message, duration = 2500) {
  const existing = document.querySelector('.aura-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'aura-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Exports ─────────────────────────────────── */
window.AuraAI = {
  summarize: summarizeLecture,
  flashcards: generateFlashcards,
  ask: askAboutNotes,
  studyPlan: suggestStudyPlan,
  hasKey: hasApiKey,
  getApiKey: getApiKey,
  setApiKey: setApiKey,
  getProvider: getProvider,
  setProvider: setProvider,
  showKeyModal: showApiKeyModal,
  showToast,
  raw: callActiveAI
};
