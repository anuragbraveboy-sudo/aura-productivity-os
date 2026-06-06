# AURA — Privacy-First On-Device Academic Co-Pilot & RPG 🧠

> **iQOO Hackathon 2026 | AgentKit Track**
> Built for the First Hybrid Mobile Architecture

---

## 💡 What is AURA?

AURA is a **free, offline AI study companion** that records lectures, processes files, auto-generates summaries/flashcards, and schedules your revisions — all integrated with a gamified RPG leveling engine to boost your study streak.

### The Problem
- 📡 **Spotty Connectivity**: Classroom Wi-Fi is often slow or restricted.
- 💸 **Subscription Cost**: Cloud AI co-pilots charge high monthly fees.
- 🔓 **Data Privacy**: Students upload private study transcripts to external servers.

### The AURA Solution
- 🎙️ **Multi-mode Recorder** → Capture audio/video lectures offline with streaming Web Speech transcription.
- 🎨 **AURA Studio** → Choose from 10 customizable particle visualizers (Constellations, Aurora, etc.) to set study ambiances.
- 🍅 **Focus Hub** → Work using a glowing Pomodoro timer widget with a dynamic SVG progress ring.
- 🧠 **RPG Leveling** → Earn XP for Pomodoro sessions (+100 XP), completing tasks (+50 XP), or solving AI Study Coach quizzes (+20 XP). Leveling up triggers visual fanfares and unlocks level-locked themes (Sakura Bloom, Cyberpunk).
- 📅 **Notion Planner** → View deadlines and sessions in a month grid calendar with priority color indicators.
- 💻 **iQOO Office Kit Bridge** → Offload PDF text chunking, local search indices, and Claude API proxying to your laptop local network to avoid browser security limits.

---

## 🏗️ Architecture Layout

```
┌─────────────────────────────────┐
│       📱 iQOO Phone             │
│                                 │
│  🎙️ Speech-to-Text (on-device) │
│  🍅 SVG Pomodoro Timer Hub     │
│  💾 IndexedDB (Local Stores)   │
│  🎨 Canvas Particle engine      │
│  🎵 Web Audio Synthesizer       │
│  📱 Offline PWA Client          │
└────────────┬────────────────────┘
             │ iQOO Office Kit Bridge
             │ (Local network sync & proxies)
┌────────────┴────────────────────┐
│       💻 Laptop Muscle          │
│                                 │
│  📚 PDF text chunking           │
│  🔍 Keyword indexing            │
│  📤 Sync back notes as files    │
│  🔀 Claude CORS proxy router    │
└─────────────────────────────────┘
```

---

## 🚀 Quick Start Instructions

### 1. Start the PWA App
```bash
cd app
python -m http.server 8080
```
Open **`http://localhost:8080`** in Chrome. To access on your phone, open **`http://<laptop-ip>:8080`**.

### 2. Start the PC Bridge Server (Laptop)
```bash
cd pc-bridge
python server.py
```
The local bridge service will listen on port **`8765`**.

### 3. Establish the Connection
- Tap the **Bridge Status Badge** at the top right of the app.
- Enter your laptop's local Wi-Fi IP address.
- Click **Connect Laptop Bridge**. The badge will light up **green (Bridge Online)**!

---

## 📁 Repository Structure
```
aura-productivity-os/
├── app/                    # SPA Progressive Web App
│   ├── index.html          # HTML Shell & testing IDs
│   ├── styles.css          # Design system & visual themes
│   ├── app.js              # Routing, timers, RPG leveler, & recorders
│   ├── ai.js               # Gemini & Claude API manager
│   ├── bridge.js           # Laptop proxy connector
│   ├── db.js               # IndexedDB offline database
│   ├── particles.js        # AURA Studio particle backgrounds
│   ├── sounds.js           # Synthesized UI audio
│   ├── sw.js               # Offline service worker cache
│   └── manifest.json       # PWA declaration
├── pc-bridge/              # Python service
│   └── server.py           # Laptop HTTP sync server
└── README.md
```

---

## 🛠️ Tech Stack Details

| Component | Technical Implementation |
|---|---|
| **Frontend** | Vanilla JavaScript + Modern HTML5 / CSS Variables |
| **Speech** | Web Speech API (`webkitSpeechRecognition`) for offline live transcription |
| **Synthesizer** | Web Audio API Oscillator nodes for assets-free audio feedback |
| **Backgrounds** | 2D HTML5 Canvas rendering engine with 60 FPS animation loops |
| **Storage** | IndexedDB local object stores (`lectures`, `flashcards`, `deadlines`, `settings`) |
| **Bridge** | HTTP endpoints mapping sync & proxy calls over local Wi-Fi |
| **Backend** | Zero-dependency Python 3 standard library server |

---

## 📊 iQOO Hackathon Judgement Alignment

- **iQOO Office Kit Bridge (25%)**: Dual device integration offloads heavy processing to laptop, syncs data, and proxies API requests.
- **Phone-First Execution (25%)**: Lightweight PWA design optimized for mobile dimensions, fully offline functional.
- **AI-Native Build (20%)**: Leverages Gemini and Claude models with smart context injections for summaries, flashcard generators, and interactive quiz bots.
- **Problem Fit (20%)**: Resolves classroom connectivity constraints and cloud service expenses for students.
- **Craft & Pitch (10%)**: Premium animations, 5 fluid themes, synthesized sounds, and constellation visualizers.
