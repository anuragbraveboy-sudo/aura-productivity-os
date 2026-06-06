/* ==========================================================================
   AURA AI Router — Multi-Provider API Client (Gemini & Claude Offline Fallbacks)
   ========================================================================== */

// Resilient Storage Guard: Polyfill localStorage if blocked by security policies
(() => {
  try {
    localStorage.getItem('__test__');
  } catch (e) {
    console.warn("localStorage is blocked by browser policies. Using in-memory fallback.");
    const store = {};
    const mockStorage = {
      getItem(key) { return store[key] || null; },
      setItem(key, val) { store[key] = String(val); },
      removeItem(key) { delete store[key]; },
      clear() { for (const k in store) delete store[k]; },
      key(i) { return Object.keys(store)[i] || null; },
      get length() { return Object.keys(store).length; }
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  }
})();

const AuraAI = (() => {
  let geminiKey = '';
  let claudeKey = '';
  let activeProvider = 'gemini'; // 'gemini' or 'claude'

  // Load API keys on startup
  function loadKeys() {
    geminiKey = localStorage.getItem('aura_gemini_key') || '';
    claudeKey = localStorage.getItem('aura_claude_key') || '';
    activeProvider = localStorage.getItem('aura_ai_provider') || 'gemini';
  }

  function setKeys(gemini, claude, provider) {
    geminiKey = gemini.trim();
    claudeKey = claude.trim();
    activeProvider = provider;
    
    localStorage.setItem('aura_gemini_key', geminiKey);
    localStorage.setItem('aura_claude_key', claudeKey);
    localStorage.setItem('aura_ai_provider', activeProvider);
  }

  function clearKeys() {
    geminiKey = '';
    claudeKey = '';
    localStorage.removeItem('aura_gemini_key');
    localStorage.removeItem('aura_claude_key');
  }

  function hasKey() {
    if (activeProvider === 'gemini') return !!geminiKey;
    if (activeProvider === 'claude') return !!claudeKey;
    return false;
  }

  // 1. Generate Lecture Summaries
  function summarize(text) {
    if (!text || text.trim().length === 0) {
      return Promise.reject("Lecture notes transcript is empty.");
    }
    
    const prompt = `You are AURA, an elite academic study partner. Synthesize these notes into a structured study guide. Format the output with clean markdown.
Use this format:
### 💡 Core Concept
[Provide a 2-3 sentence overview]

### 🔑 Key Takeaways
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]

### 📚 Detailed Summary
[Explain the technical details in depth]

Lecture Notes to summarize:
${text}`;

    return runQuery(prompt).catch((err) => {
      console.warn("API request failed, falling back to local synthesis:", err);
      return generateOfflineSummary(text);
    });
  }

  // 2. Generate Interactive Q&A Flashcards
  function generateFlashcards(text) {
    const prompt = `You are AURA. Read these study notes and generate exactly 5 high-yield question & answer flashcards.
Respond ONLY with a valid JSON array. Do not include any backticks or formatting.
Format:
[
  {"question": "What is X?", "answer": "X is Y."},
  {"question": "Explain Z.", "answer": "Z does W."}
]

Notes:
${text}`;

    return runQuery(prompt)
      .then(res => {
        // Clean JSON formatting if API returns markdown blocks
        let cleanJSON = res.trim();
        if (cleanJSON.startsWith('```json')) {
          cleanJSON = cleanJSON.substring(7);
        } else if (cleanJSON.startsWith('```')) {
          cleanJSON = cleanJSON.substring(3);
        }
        if (cleanJSON.endsWith('```')) {
          cleanJSON = cleanJSON.substring(0, cleanJSON.length - 3);
        }
        return JSON.parse(cleanJSON.trim());
      })
      .catch((err) => {
        console.warn("Failed to generate AI flashcards, using offline generator:", err);
        return generateOfflineFlashcards(text);
      });
  }

  // 3. Create Dynamic Interactive Quizzes
  function generateQuiz(text) {
    const prompt = `Generate a single multiple-choice study question based on these notes.
Include exactly four options (A, B, C, D) and specify the correct answer letter.
Respond ONLY with a valid JSON object. Do not include formatting blocks.
Format:
{
  "question": "What is the primary function of...?",
  "options": {
    "A": "Option A explanation",
    "B": "Option B explanation",
    "C": "Option C explanation",
    "D": "Option D explanation"
  },
  "answer": "B",
  "explanation": "Because B resolves..."
}

Notes:
${text}`;

    return runQuery(prompt)
      .then(res => {
        let cleanJSON = res.trim();
        if (cleanJSON.startsWith('```json')) {
          cleanJSON = cleanJSON.substring(7);
        } else if (cleanJSON.startsWith('```')) {
          cleanJSON = cleanJSON.substring(3);
        }
        if (cleanJSON.endsWith('```')) {
          cleanJSON = cleanJSON.substring(0, cleanJSON.length - 3);
        }
        return JSON.parse(cleanJSON.trim());
      })
      .catch((err) => {
        console.warn("Quiz generation failed, using offline fallback:", err);
        return generateOfflineQuiz(text);
      });
  }

  // 4. Conversational Chat queries
  function askCoach(query, contextNotes) {
    const prompt = `You are AURA, a friendly, hyper-intelligent study coach. Answer the student's question based on their notes. Keep it concise, helpful, and formatted in clear markdown.
Notes Context:
${contextNotes || "No lecture notes uploaded yet. Help the student general academic tips."}

Student Question:
${query}`;

    return runQuery(prompt).catch((err) => {
      console.warn("Chat failed, using local tips:", err);
      return "I'm currently offline or my API key is missing, but here is an offline tip: Repetition and active recall are key to memorization. Keep reviewing your flashcards regularly!";
    });
  }

  // ── Query Router Engine ──
  function runQuery(prompt) {
    if (activeProvider === 'gemini') {
      if (!geminiKey) return Promise.reject("Gemini API key is not configured.");
      return runGeminiQuery(prompt);
    } else {
      if (!claudeKey) return Promise.reject("Claude API key is not configured.");
      // Route through local PC Bridge to bypass browser CORS constraints
      return AuraBridge.proxyClaude(prompt, claudeKey);
    }
  }

  // Google Gemini API Direct Web Fetch
  function runGeminiQuery(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error?.message || `Gemini returned HTTP ${res.status}`);
        });
      }
      return res.json();
    })
    .then(data => {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini API.");
      return text;
    });
  }

  // ── Local Fallback Algorithms (Zero Internet) ──

  function generateOfflineSummary(text) {
    const keywords = extractKeywords(text);
    return `### 💡 Core Concept (Offline Summary Fallback)
This lecture discusses key elements including **${keywords[0] || 'study topics'}** and **${keywords[1] || 'revision details'}**.

### 🔑 Key Takeaways
- Active engagement with **${keywords[2] || 'notes'}** accelerates learning retention.
- Offline-first architectures allow study guides to remain accessible without network buffers.
- Structured reviews of **${keywords[3] || 'lecture cards'}** yield 2.5x better recall rates.

### 📚 Detailed Summary
Based on your notes, here is a consolidated summary of key terms:
* **${keywords[0] || 'Topic'}**: Referenced frequently as a primary focus.
* **${keywords[1] || 'Sub-concept'}**: A crucial supporting element.
* **${keywords[2] || 'Process'}**: Associated with the execution of the main topic.

*Note: Connect to the internet and input your API key in settings to unlock fully advanced AI summaries.*`;
  }

  function generateOfflineFlashcards(text) {
    const keywords = extractKeywords(text);
    return [
      {
        question: `What is the primary role of ${keywords[0] || 'the core subject'}?`,
        answer: `It serves as the main focus of this study material, frequently referenced alongside ${keywords[1] || 'secondary factors'}.`
      },
      {
        question: `How does ${keywords[1] || 'the secondary element'} relate to the overall topic?`,
        answer: `It supports the main concepts by providing context and auxiliary details.`
      },
      {
        question: `Explain the importance of ${keywords[2] || 'the third concept'}.`,
        answer: `It represents a key step in the workflow or process outlined in the notes.`
      },
      {
        question: `What is a common misconception about ${keywords[3] || 'this topic'}?`,
        answer: `Thinking it requires complex network access when it can be processed offline.`
      },
      {
        question: `State a key study habit highlighted for this material.`,
        answer: `Reviewing these flashcards regularly using active recall and spaced repetition.`
      }
    ];
  }

  function generateOfflineQuiz(text) {
    const keywords = extractKeywords(text);
    const mainWord = keywords[0] || 'the core topic';
    
    return {
      question: `Which of the following statements best describes the role of ${mainWord}?`,
      options: {
        A: `It is a secondary variable that has little impact on the core curriculum.`,
        B: `It forms the fundamental framework discussed throughout this study session.`,
        C: `It is exclusively used in cloud architectures with high monthly fees.`,
        D: `It was deprecated in the latest research reviews.`
      },
      answer: "B",
      explanation: `Based on keyword density, "${mainWord}" represents the primary subject of your notes, making B the correct answer.`
    };
  }

  function extractKeywords(text) {
    if (!text) return ['Subject', 'Topic', 'Concept', 'Detail'];
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'is', 'at', 'which', 'and', 'a', 'an', 'in', 'on', 'to', 'for', 'of', 'with', 'it', 'this', 'that', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'or', 'not', 'so', 'if', 'then', 'than', 'too', 'very', 'can', 'will']);
    
    const freq = {};
    words.forEach(w => {
      if (w.length > 4 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
    
    const sorted = Object.keys(freq).sort((a,b) => freq[b] - freq[a]);
    while (sorted.length < 5) {
      sorted.push('Topic');
    }
    return sorted.map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }

  return {
    loadKeys,
    setKeys,
    clearKeys,
    hasKey,
    summarize,
    generateFlashcards,
    generateQuiz,
    askCoach,
    getProvider: () => activeProvider
  };
})();
