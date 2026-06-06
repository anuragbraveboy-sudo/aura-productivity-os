# Hackathon Submission Pitch — AURA Academic OS

**iQOO Hackathon 2026 | AgentKit Track**

---

## ⚡ Pitch Video Script & Value Proposition

### 1. The Hook (0:00 - 0:15)
"Picture this: You are sitting in an Indian university lecture hall. The Wi-Fi is down, cell reception is spotty, and a premium ChatGPT subscription costs more than your monthly pocket money. How do you summarize the lecture, create review flashcards, and schedule your studies without losing focus? Meet **AURA** — your privacy-first, offline-capable academic co-pilot and productivity RPG."

### 2. The Core Solution (0:15 - 0:45)
"AURA is built as a highly responsive, zero-dependency Progressive Web App. It records your professor's voice in real-time, displaying a live transcript completely offline. 
Want to study? Our AI Coach creates structured summaries, formulates multiple-choice practice quizzes directly in the chat panel, and auto-generates 3D-flipping flashcard decks. All study details are stored locally on your device in IndexedDB."

### 3. The iQOO Office Kit Hybrid Bridge (0:45 - 1:15)
"But a phone shouldn't do all the heavy lifting alone. Through the **iQOO Office Kit Bridge**, AURA pairs with your laptop over a local network. Simply enter your laptop's IP, and your phone instantly offloads PDF processing, indexes files, and backs up notes onto your laptop. It also bypasses browser CORS limits by routing Anthropic Claude API calls through a zero-dependency Python proxy on the laptop, creating a true desktop-mobile hybrid."

### 4. Gamification & Craft (1:15 - 1:30)
"AURA turns study sessions into a game. Complete deadlines or run Pomodoro sessions to gain XP. Level up to hear synthesized fanfare sounds and unlock premium level-locked themes. With 10 customizable particle visualizers inside **AURA Studio**, you have the ultimate aesthetic study workspace. Free, offline, and private. That is AURA."

---

## 💡 Key Product Features & Highlights

1. **AURA Studio (10 Visualizer Modes)**: Custom 60 FPS HTML5 Canvas particle systems including Constellations, Aurora waves, Topographical maps, and gravity orbits. Opacity, speed, density, and brightness (up to 200%) are fully adjustable.
2. **Web Audio Synthesizer**: Implements Oscillator and Gain nodes to play pop UI sounds, success chimes, Pomodoro double-beeps, and RPG level up fanfares completely offline.
3. **Productivity RPG Engine**: Rewards focus. Focus sessions grant +100 XP, deadline completions grant +50 XP, and quiz answers grant +20 XP. Level-locked themes (Sakura Bloom, Cyberpunk) reward dedication.
4. **Notion-Style Planner Grid**: Interactive monthly calendar with color-coded dot indicators for deadlines (high, medium, low priority) and scheduled study slots.
5. **Dual-Provider AI**: Supports Google Gemini API (direct web fetch) and Anthropic Claude API (routed via CORS-safe Python PC Bridge proxy). Offline local algorithm generates keyword-based fallback notes, flashcards, and quizzes when keys are missing.
6. **Unique Testing QA IDs**: Every button, input field, slider, form, and nav item contains a unique ID attribute (e.g. `id="btn-demo-start"`) for automated testing.
7. **Single H1 Rule**: Strictly maintains a single `<h1>` tag on the landing/dashboard panels to align with clean SEO document layouts.
