# AURA — Privacy-First On-Device Academic Co-Pilot 🧠

> **iQOO Hackathon 2026 | AgentKit Track**
> Built for the First Hybrid Mobile Architecture

![AURA](https://img.shields.io/badge/AURA-Academic_Co--Pilot-00d4ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGNpcmNsZSBjeD0iMzIiIGN5PSIyOCIgcj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwZDRmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIyOCIgcj0iMyIgZmlsbD0iIzAwZDRmZiIvPjwvc3ZnPg==)
![Track](https://img.shields.io/badge/Track-AgentKit-ff4466?style=for-the-badge)
![Phone First](https://img.shields.io/badge/Phone_First-iQOO-ffaa22?style=for-the-badge)

---

## 💡 What is AURA?

AURA is a **free, offline AI study companion** that records your lectures, summarizes them, creates flashcards, and schedules your revision — all running locally on your phone with **zero internet** and **zero cost**.

### The Problem
- 📡 **No Internet**: 68% of Indian classrooms have unreliable connectivity
- 💸 **No Budget**: ChatGPT Plus costs ₹1,700/mo — unaffordable for students
- 🔓 **No Privacy**: Cloud AI uploads your university notes to external servers

### The AURA Solution
- 🎙️ **Record Lecture** → Live speech-to-text, all on-device
- 📝 **AI Summary** → Instant lecture summaries via Gemini API
- 🃏 **Flashcards** → Auto-generated Q&A cards with 3D flip animation
- 📅 **Smart Calendar** → AI suggests optimal study times
- 🔗 **Hybrid Bridge** → Sync heavy tasks to laptop via iQOO Office Kit

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│       📱 iQOO Phone             │
│                                 │
│  🎙️ Speech-to-Text (on-device) │
│  🧠 Gemini API (AI summaries)  │
│  💾 IndexedDB (local storage)  │
│  📱 PWA (works offline)        │
└────────────┬────────────────────┘
             │ iQOO Office Kit Bridge
             │ (Local network sync)
┌────────────┴────────────────────┐
│       💻 Laptop Muscle          │
│                                 │
│  📚 PDF processing              │
│  🔍 Document vectorization     │
│  📤 Sync back to phone         │
└─────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Run the Phone App (PWA)
```bash
cd app
python -m http.server 8080
```
Open `http://localhost:8080` in Chrome. On phone, open `http://<laptop-ip>:8080`.

### 2. Run the PC Bridge Server (Laptop)
```bash
cd pc-bridge
python server.py
```
The bridge server starts on port `8765`.

### 3. Connect Phone → Laptop
- In the app, tap the **Bridge Status Bar** at the top
- Enter your laptop's IP address
- Tap **Save & Connect**
- Hit **Sync** on the home screen to transfer lectures

---

## 📁 Project Structure

```
aura-student-copilot/
├── app/                    # PWA (runs on phone browser)
│   ├── index.html          # Main app entry point
│   ├── styles.css          # Dark theme, glassmorphism, animations
│   ├── app.js              # Core logic (recording, navigation, etc.)
│   ├── ai.js               # Gemini API integration + fallback
│   ├── bridge.js           # iQOO Office Kit phone↔laptop sync
│   ├── db.js               # IndexedDB local storage
│   ├── sw.js               # Service worker (offline support)
│   └── manifest.json       # PWA manifest
├── pc-bridge/              # Laptop server (Python)
│   └── server.py           # FastAPI-style bridge server
├── docs/                   # Presentation & submission docs
│   └── aura_architecture_presentation.pptx
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla JS + CSS | Zero-dependency PWA |
| **Speech** | Web Speech API | Real-time voice-to-text |
| **AI** | Gemini API | Summarization, flashcards, Q&A |
| **Storage** | IndexedDB | Offline-first local database |
| **Bridge** | HTTP + Local Network | Phone ↔ Laptop sync via iQOO Office Kit |
| **Backend** | Python (stdlib) | PDF processing, document indexing |

---

## 📊 Judging Alignment

| Criteria | Weight | How AURA Addresses It |
|----------|--------|----------------------|
| iQOO Office Kit Usage | 25% | Bridge module with real-time sync, health monitoring |
| Phone-First Execution | 25% | PWA feels native, works offline, mobile-optimized |
| AI-Native Build | 20% | On-device STT + Gemini API for smart features |
| Problem Fit | 20% | Every Indian student struggles with this |
| Craft & Pitch | 10% | Premium dark UI, smooth animations, polished UX |

---

## 📄 License

MIT License — Built for iQOO Hackathon 2026
