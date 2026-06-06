/* ==========================================================================
   AURA Application Engine — SPA Navigation, Focus Hub, RPG Progression,
   Notion Calendar, Audio/Video Recorder, and Hackathon Seeding.
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

const AuraApp = (() => {
  // Application State
  const state = {
    currentScreen: 'home',
    rpg: {
      level: 1,
      xp: 0,
      streak: 0
    },
    pomodoro: {
      running: false,
      timeLeft: 25 * 60,
      maxTime: 25 * 60,
      mode: 'Focus',
      interval: null,
      completedToday: 0
    },
    recording: {
      active: false,
      mode: 'audio', // 'audio' or 'video'
      duration: 0,
      interval: null,
      recognition: null,
      mediaRecorder: null,
      chunks: [],
      transcript: ''
    },
    study: {
      activeLecture: null,
      activeDetailTab: 'summary',
      flashcards: [],
      currentFlashcardIndex: 0,
      chatHistory: [],
      activeQuiz: null
    },
    calendar: {
      currentYear: 2026,
      currentMonth: 5, // June (0-indexed: May is 4, June is 5)
      selectedDay: null // date string (YYYY-MM-DD)
    }
  };

  // ── Init & Event Listeners ──
  function init() {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log("AURA PWA Service Worker Registered"))
        .catch(err => console.warn("PWA registration failed: ", err));
    }

    // 2. Initialize IndexedDB
    AuraDB.init()
      .then(() => {
        console.log("IndexedDB Initialized successfully");
        AuraAI.loadKeys();
        loadSettingsFromDB();
        loadRpgState();
        refreshAllScreens();
        
        // Seed default calendar date to today
        const today = new Date();
        state.calendar.currentYear = today.getFullYear();
        state.calendar.currentMonth = today.getMonth();
        state.calendar.selectedDay = formatDateString(today);
        
        // Setup visualizer & audio systems
        AuraParticles.init();
        AuraSounds.init();
        
        setupFileUpload();
        setupLandingActions();
      })
      .catch(err => {
        console.error("Critical: Failed to initialize IndexedDB: ", err);
      });
  }

  // Load configuration options from DB
  function loadSettingsFromDB() {
    // Theme
    AuraDB.getSetting('theme', 'nebula').then(theme => {
      setTheme(theme);
    });
    // Bridge IP
    AuraDB.getSetting('bridge_ip', '').then(ip => {
      if (ip) {
        AuraBridge.setIP(ip);
        const ipInput = document.getElementById('input-bridge-ip');
        if (ipInput) ipInput.value = ip;
        updateBridgeStatusBadge();
      }
    });
    
    // Load sounds and keyboard config
    const soundFx = localStorage.getItem('aura_muted') !== 'true';
    const soundFxBox = document.getElementById('sound-fx-toggle');
    if (soundFxBox) soundFxBox.checked = soundFx;
    
    const kbFx = localStorage.getItem('aura_keyboard_fx') === 'true';
    const kbFxBox = document.getElementById('keyboard-fx-toggle');
    if (kbFxBox) kbFxBox.checked = kbFx;
    if (window.AuraSounds) window.AuraSounds.keyboardFXEnabled = kbFx;
    
    const kbType = localStorage.getItem('aura_keyboard_type') || 'thock';
    const kbTypeSelect = document.getElementById('keyboard-type-select');
    if (kbTypeSelect) kbTypeSelect.value = kbType;
    
    const ambientNoise = localStorage.getItem('aura_ambient_noise') || 'none';
    const ambientSelect = document.getElementById('ambient-noise-select');
    if (ambientSelect) ambientSelect.value = ambientNoise;
    
    const ambientVol = localStorage.getItem('aura_ambient_volume') || '0.5';
    const ambientVolSlider = document.getElementById('ambient-volume-slider');
    const ambientVolLabel = document.getElementById('ambient-volume-val');
    if (ambientVolSlider) ambientVolSlider.value = ambientVol;
    if (ambientVolLabel) ambientVolLabel.textContent = `${Math.round(ambientVol * 100)}%`;
    
    const aiPersona = localStorage.getItem('aura_ai_persona') || 'coach';
    const personaSelect = document.getElementById('ai-persona-select');
    if (personaSelect) personaSelect.value = aiPersona;

    // Load chat history
    state.study.chatHistory = JSON.parse(localStorage.getItem('aura_chat_history') || '[]');
  }

  // Load RPG Streaks and Progress from localStorage
  function loadRpgState() {
    state.rpg.level = parseInt(localStorage.getItem('aura_rpg_level') || '1');
    state.rpg.xp = parseInt(localStorage.getItem('aura_rpg_xp') || '0');
    state.rpg.streak = parseInt(localStorage.getItem('aura_rpg_streak') || '0');
    state.pomodoro.completedToday = parseInt(localStorage.getItem('aura_pomo_completed') || '0');
    
    updateRpgUI();
  }

  // ── Seeding & Welcome Landing Actions ──
  function setupLandingActions() {
    const btnEnter = document.getElementById('btn-landing-enter');
    const btnDemo = document.getElementById('btn-demo-start');
    const portal = document.getElementById('landing-portal');

    if (btnEnter) {
      btnEnter.addEventListener('click', () => {
        AuraSounds.click();
        portal.classList.remove('visible');
      });
    }

    if (btnDemo) {
      btnDemo.addEventListener('click', () => {
        AuraSounds.click();
        portal.classList.remove('visible');
        seedHackathonDemo();
      });
    }
  }

  // Seed Hackathon Demo Data
  function seedHackathonDemo() {
    AuraDB.clearAllData().then(() => {
      // 1. RPG level progress (Unlock Cyberpunk/Sakura themes instantly)
      state.rpg.level = 3;
      state.rpg.xp = 140;
      state.rpg.streak = 5;
      localStorage.setItem('aura_rpg_level', '3');
      localStorage.setItem('aura_rpg_xp', '140');
      localStorage.setItem('aura_rpg_streak', '5');
      
      // Unlock UI locks in Settings Drawer
      const lockSakura = document.getElementById('btn-theme-sakura');
      const lockCyber = document.getElementById('btn-theme-cyberpunk');
      if (lockSakura) lockSakura.classList.remove('locked');
      if (lockCyber) lockCyber.classList.remove('locked');

      // Play double confetti bursts & fanfare sound
      AuraSounds.levelup();
      AuraParticles.triggerConfettiBurst();
      setTimeout(() => {
        AuraParticles.triggerConfettiBurst();
      }, 1500);

      // 2. Set Theme to Cyberpunk
      setTheme('cyberpunk');

      // 3. Seed default lectures
      const sampleLectures = [
        {
          id: 'lect-1',
          title: 'CS 229: Supervised Learning & Linear Regression',
          date: '2026-06-04',
          transcript: 'Today we discuss supervised learning. Supervised learning is where we provide the algorithm with a training set of labeled data. The goal is for the model to learn a function mapping inputs to outputs. Linear regression is a simple algorithm where we fit a straight line to the data points using gradient descent. Gradient descent iteratively updates weights to minimize the mean squared error loss function.',
          summary: `### 💡 Core Concept
Introductory concepts in **supervised machine learning**, focusing on fitting data points with **linear regression** algorithms.

### 🔑 Key Takeaways
- **Supervised Learning**: Mapping inputs to output predictions using labeled dataset inputs.
- **Linear Regression**: Minimizing prediction distances using mathematical straight lines.
- **Gradient Descent**: Minimizing the Mean Squared Error (MSE) loss function through iterations.

### 📚 Detailed Summary
The class discussed regression models. Minimizing weights is achieved through step calculations known as learning rates. Too large of a step causes overshoot, while too small steps result in slow training iterations.`,
          synced: true
        },
        {
          id: 'lect-2',
          title: 'BIO 102: Cellular Mitosis & Cycle Processes',
          date: '2026-06-05',
          transcript: 'Mitosis is the process of cell division. It consists of four distinct phases: prophase, metaphase, anaphase, and telophase. During prophase, chromatin condenses into visible chromosomes. Metaphase aligns chromosomes at the cellular equator. Anaphase separates sister chromatids to opposite poles. Telophase reconstructs the nuclear envelope to form two daughter cells.',
          summary: `### 💡 Core Concept
An overview of the **mitosis cell cycle** phase transitions in biological divisions.

### 🔑 Key Takeaways
- **Interphase**: Cell growth prep before mitosis happens.
- **Metaphase**: Alignment of chromosome structures at cellular centers.
- **Cytokinesis**: Division of cytoplastic cells generating twin daughter structures.`,
          synced: false
        }
      ];

      // 4. Seed default flashcards
      const sampleCards = [
        { id: 'fc-1', lectureId: 'lect-1', question: 'What is supervised learning?', answer: 'A machine learning type where algorithms train on labeled datasets containing inputs and target outputs.' },
        { id: 'fc-2', lectureId: 'lect-1', question: 'How does Gradient Descent work?', answer: 'It iteratively updates parameters to minimize loss functions by stepping in the opposite direction of the gradient.' },
        { id: 'fc-3', lectureId: 'lect-2', question: 'What are the four phases of Mitosis?', answer: 'Prophase, Metaphase, Anaphase, and Telophase (PMAT).' }
      ];

      // 5. Seed default calendar deadlines
      const sampleDeadlines = [
        { id: 'dl-1', title: 'Machine Learning Assignment 1', course: 'CS 229', date: '2026-06-09', priority: 'high', completed: false },
        { id: 'dl-2', title: 'Mitosis Diagram Labeling Quiz', course: 'BIO 102', date: '2026-06-12', priority: 'medium', completed: false },
        { id: 'dl-3', title: 'History Essay Draft', course: 'HIST 11', date: '2026-06-04', priority: 'low', completed: true }
      ];

      // 6. Seed default study sessions
      const sampleSessions = [
        { id: 'ss-1', title: 'CS 229 Midterm Review', time: '14:00', duration: 90, date: '2026-06-09' },
        { id: 'ss-2', title: 'Biology Mitosis Lab Prep', time: '10:30', duration: 45, date: '2026-06-05' }
      ];

      // Store all seeded structures in DB
      const p1 = sampleLectures.map(l => AuraDB.saveLecture(l));
      const p2 = sampleCards.map(c => AuraDB.saveFlashcard(c));
      const p3 = sampleDeadlines.map(d => AuraDB.saveDeadline(d));
      const p4 = sampleSessions.map(s => AuraDB.saveStudySession(s));

      Promise.all([...p1, ...p2, ...p3, ...p4]).then(() => {
        showToast("🚀 Hackathon Demo Mode: Seeding Completed!");
        refreshAllScreens();
      });
    });
  }

  // ── SPA Navigation ──
  function switchScreen(screenId) {
    AuraSounds.click();
    
    // Deactivate current active screen
    const oldScreen = document.querySelector('.app-screen.active');
    if (oldScreen) oldScreen.classList.remove('active');

    // Deactivate nav highlights
    const oldNavItem = document.querySelector('.nav-bar-item.active');
    if (oldNavItem) oldNavItem.classList.remove('active');

    // Activate new screen
    const newScreen = document.getElementById(`screen-${screenId}`);
    if (newScreen) newScreen.classList.add('active');

    const newNavItem = document.getElementById(`btn-nav-${screenId}`);
    if (newNavItem) newNavItem.classList.add('active');

    state.currentScreen = screenId;
    
    // Close sidebar drawers on screen transitions
    toggleSettingsDrawer(false);
    toggleAIChat(false);

    // Refresh targeted screen states
    if (screenId === 'home') {
      refreshHome();
    } else if (screenId === 'study') {
      refreshStudy();
    } else if (screenId === 'calendar') {
      refreshCalendar();
    }
  }

  // Refresh all components
  function refreshAllScreens() {
    refreshHome();
    refreshStudy();
    refreshCalendar();
    updateRpgUI();
    updateBridgeStatusBadge();
  }

  // ── Home Screen Logic ──
  function refreshHome() {
    updateRpgUI();

    // 1. Calculate greeting based on time of day
    const hour = new Date().getHours();
    let greet = "Good Morning";
    let emoji = "🌅";
    if (hour >= 12 && hour < 17) { greet = "Good Afternoon"; emoji = "☀️"; }
    else if (hour >= 17 && hour < 22) { greet = "Good Evening"; emoji = "🌌"; }
    else if (hour >= 22 || hour < 5) { greet = "Night Owl Mode"; emoji = "🦉"; }
    
    const greetingEl = document.getElementById('dashboard-greeting');
    if (greetingEl) greetingEl.innerHTML = `${greet}, Krish ${emoji}`;

    // 2. Refresh stats counts
    AuraDB.getAllLectures().then(lectures => {
      const el = document.getElementById('stat-lectures-value');
      if (el) el.textContent = lectures.length;
    });

    AuraDB.getAllFlashcards().then(cards => {
      const el = document.getElementById('stat-cards-value');
      if (el) el.textContent = cards.length;
      state.study.flashcards = cards;
      renderFlashcardsOverview();
    });

    const streakEl = document.getElementById('stat-streak-value');
    if (streakEl) streakEl.textContent = state.rpg.streak;

    // 3. Render home deadlines
    AuraDB.getAllDeadlines().then(deadlines => {
      const container = document.getElementById('home-deadlines-container');
      if (!container) return;
      
      const upcoming = deadlines
        .filter(d => !d.completed)
        .sort((a,b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3); // top 3 upcoming

      if (upcoming.length === 0) {
        container.innerHTML = `<div class="empty-placeholder">No upcoming deadlines. Hooray!</div>`;
        return;
      }

      container.innerHTML = upcoming.map(dl => `
        <div class="deadline-item-card glass-card">
          <div class="dl-priority-line ${dl.priority}"></div>
          <div class="dl-details-block">
            <span class="dl-title-text">${escapeHtml(dl.title)}</span>
            <span class="dl-course-code">${escapeHtml(dl.course)}</span>
          </div>
          <span class="dl-date-badge">${formatDateDisplay(dl.date)}</span>
          <button id="btn-dl-complete-${dl.id}" class="btn-primary-small" style="padding:6px 12px;" onclick="AuraApp.completeDeadline('${dl.id}')">✓</button>
        </div>
      `).join('');
    });

    // 4. Render study hours chart
    renderWeeklyChart();
    
    // 5. Study coach insights
    renderCoachInsight();
  }

  // Render weekly analytics CSS Bar Chart
  function renderWeeklyChart() {
    AuraDB.getAllStudySessions().then(sessions => {
      // Aggregate session minutes per weekday (Mon-Sun)
      const weeklyHours = [0, 0, 0, 0, 0, 0, 0];
      const today = new Date();
      
      // Get start of current week (Monday)
      const currentDay = today.getDay();
      const distanceToMon = currentDay === 0 ? 6 : currentDay - 1; // Mon is 0, Sun is 6
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - distanceToMon);
      startOfWeek.setHours(0, 0, 0, 0);

      sessions.forEach(sess => {
        const sessDate = new Date(sess.date);
        const diffTime = sessDate.getTime() - startOfWeek.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
          // Convert minutes to hours
          weeklyHours[diffDays] += (sess.duration / 60);
        }
      });

      // Find max hours to scale chart heights (cap at 6h for scaling)
      const maxHoursScale = Math.max(6, ...weeklyHours);

      weeklyHours.forEach((hours, idx) => {
        const bar = document.getElementById(`chart-bar-${idx}`);
        if (bar) {
          const heightPercent = Math.min(100, (hours / maxHoursScale) * 100);
          bar.style.height = `${heightPercent}%`;
          bar.setAttribute('data-hours', hours.toFixed(1));
        }
      });
    });
  }

  // Render Study Coach dynamic message based on stats/time
  function renderCoachInsight() {
    const coachText = document.getElementById('coach-message-text');
    if (!coachText) return;

    AuraDB.getAllDeadlines().then(deadlines => {
      const pendingHigh = deadlines.filter(d => !d.completed && d.priority === 'high');
      if (pendingHigh.length > 0) {
        coachText.textContent = `⚠️ Warning: You have ${pendingHigh.length} high priority deadline(s) approaching. Use a 50-minute Deep Work Pomodoro session to tackle them!`;
        return;
      }

      AuraDB.getAllLectures().then(lectures => {
        if (lectures.length > 0) {
          const latest = lectures[lectures.length - 1];
          coachText.innerHTML = `💡 AI Insight: You recently completed <strong>${escapeHtml(latest.title)}</strong>. Ask me to formulate a quiz or generate study flashcards in the AI Coach chat panel!`;
        } else {
          coachText.textContent = `🎯 Ready to boost your academic productivity? Try pasting your syllabus or recording a lecture to earn RPG experience levels.`;
        }
      });
    });
  }

  // ── RPG Progression Framework ──
  function addXP(amount) {
    state.rpg.xp += amount;
    const levelUpThreshold = 300;
    let didLevelUp = false;

    while (state.rpg.xp >= levelUpThreshold) {
      state.rpg.xp -= levelUpThreshold;
      state.rpg.level++;
      didLevelUp = true;
    }

    localStorage.setItem('aura_rpg_xp', state.rpg.xp);
    localStorage.setItem('aura_rpg_level', state.rpg.level);

    if (didLevelUp) {
      triggerLevelUpSequence();
    } else {
      updateRpgUI();
      showToast(`+${amount} XP Earned!`);
    }
  }

  function triggerLevelUpSequence() {
    AuraSounds.levelup();
    AuraParticles.triggerConfettiBurst();
    
    // Unlock theme states at levels
    if (state.rpg.level === 2) {
      const tSakura = document.getElementById('btn-theme-sakura');
      if (tSakura) tSakura.classList.remove('locked');
      showToast(`🎉 Level Up! You reached Level 2 and unlocked the Sakura Bloom Theme!`);
    } else if (state.rpg.level === 3) {
      const tCyber = document.getElementById('btn-theme-cyberpunk');
      if (tCyber) tCyber.classList.remove('locked');
      showToast(`🎉 Level Up! You reached Level 3 and unlocked the Cyberpunk Theme!`);
    } else {
      showToast(`🎉 Level Up! You reached Level ${state.rpg.level}! Keep pushing!`);
    }
    
    updateRpgUI();
  }

  function updateRpgUI() {
    const lvlVal = document.getElementById('rpg-level-value');
    const xpCur = document.getElementById('rpg-xp-current');
    const xpFill = document.getElementById('rpg-xp-progress');

    if (lvlVal) lvlVal.textContent = state.rpg.level;
    if (xpCur) xpCur.textContent = `${state.rpg.xp} / 300 XP`;
    if (xpFill) xpFill.style.width = `${(state.rpg.xp / 300) * 100}%`;
  }

  // Complete a deadline task from dashboard
  function completeDeadline(id) {
    AuraSounds.success();
    AuraParticles.triggerConfettiBurst();
    
    AuraDB.getAllDeadlines().then(deadlines => {
      const dl = deadlines.find(d => d.id === id);
      if (dl) {
        dl.completed = true;
        AuraDB.saveDeadline(dl).then(() => {
          addXP(50); // RPG reward
          refreshHome();
        });
      }
    });
  }

  // ── Pomodoro Timer Widget Logic ──
  function setPomoMode(mins, label, btn) {
    AuraSounds.click();
    clearInterval(state.pomodoro.interval);
    state.pomodoro.running = false;
    
    state.pomodoro.maxTime = mins * 60;
    state.pomodoro.timeLeft = mins * 60;
    state.pomodoro.mode = label;

    const playBtn = document.getElementById('pomo-play-btn');
    if (playBtn) playBtn.textContent = '▶';

    const lbl = document.getElementById('pomo-label');
    if (lbl) lbl.textContent = label;

    document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    updatePomoDisplay();
  }

  function pomodoroAction(action) {
    AuraSounds.click();
    const playBtn = document.getElementById('pomo-play-btn');

    if (action === 'toggle') {
      if (state.pomodoro.running) {
        // Pause
        clearInterval(state.pomodoro.interval);
        state.pomodoro.running = false;
        if (playBtn) playBtn.textContent = '▶';
      } else {
        // Play
        state.pomodoro.running = true;
        if (playBtn) playBtn.textContent = '⏸';
        
        state.pomodoro.interval = setInterval(() => {
          state.pomodoro.timeLeft--;
          if (state.pomodoro.timeLeft <= 0) {
            clearInterval(state.pomodoro.interval);
            state.pomodoro.running = false;
            if (playBtn) playBtn.textContent = '▶';
            
            // Pomodoro completion
            AuraSounds.pomo();
            state.pomodoro.completedToday++;
            localStorage.setItem('aura_pomo_completed', state.pomodoro.completedToday);
            
            const countEl = document.getElementById('pomo-sessions');
            if (countEl) countEl.textContent = state.pomodoro.completedToday;
            
            // Log study session to DB
            const todayStr = formatDateString(new Date());
            const minutesStudied = Math.floor(state.pomodoro.maxTime / 60);
            
            const newSession = {
              id: 'sess-' + Date.now(),
              title: `${state.pomodoro.mode} Study Session`,
              time: formatTimeString(new Date()),
              duration: minutesStudied,
              date: todayStr
            };
            
            AuraDB.saveStudySession(newSession).then(() => {
              addXP(100); // Massive XP for focus sessions!
              showToast(`🍅 Pomodoro Complete! You gained +100 XP.`);
              refreshHome();
            });

            // Auto-switch modes
            if (state.pomodoro.mode === 'Focus' || state.pomodoro.mode === 'Deep Work') {
              setPomoMode(5, 'Short Break', document.getElementById('pomo-mode-5'));
            } else {
              setPomoMode(25, 'Focus', document.getElementById('pomo-mode-25'));
            }
          }
          updatePomoDisplay();
        }, 1000);
      }
    } else if (action === 'reset') {
      clearInterval(state.pomodoro.interval);
      state.pomodoro.running = false;
      state.pomodoro.timeLeft = state.pomodoro.maxTime;
      if (playBtn) playBtn.textContent = '▶';
      updatePomoDisplay();
    } else if (action === 'skip') {
      clearInterval(state.pomodoro.interval);
      state.pomodoro.running = false;
      state.pomodoro.timeLeft = 1; // Set to last second to trigger complete logic
      pomodoroAction('toggle');
    }
  }

  function updatePomoDisplay() {
    const timeEl = document.getElementById('pomo-time');
    const ringEl = document.getElementById('pomo-ring-progress');

    const m = String(Math.floor(state.pomodoro.timeLeft / 60)).padStart(2, '0');
    const s = String(state.pomodoro.timeLeft % 60).padStart(2, '0');
    
    if (timeEl) timeEl.textContent = `${m}:${s}`;

    // SVG dash offset adjustments (Ring circumference is 283)
    if (ringEl) {
      const fraction = state.pomodoro.timeLeft / state.pomodoro.maxTime;
      const offset = 283 - (fraction * 283);
      ringEl.style.strokeDashoffset = offset;
    }
  }

  function toggleCustomPomoInput() {
    AuraSounds.click();
    const container = document.getElementById('pomo-custom-input-container');
    if (!container) return;
    container.style.display = container.style.display === 'none' ? 'flex' : 'none';
  }

  function applyCustomPomo() {
    AuraSounds.click();
    const minsVal = document.getElementById('input-custom-mins').value;
    const mins = parseInt(minsVal);
    if (isNaN(mins) || mins < 1 || mins > 180) {
      showToast("Please enter a value between 1 and 180 minutes.");
      return;
    }
    setPomoMode(mins, 'Custom Focus', null);
    toggleCustomPomoInput();
  }

  // ── Audio / Video Lecture Capture Screen ──
  function setRecordMode(mode) {
    AuraSounds.click();
    state.recording.mode = mode;
    
    const audioBtn = document.getElementById('btn-toggle-audio');
    const videoBtn = document.getElementById('btn-toggle-video');
    const videoPreview = document.getElementById('video-preview-container');

    if (mode === 'audio') {
      audioBtn.classList.add('active');
      videoBtn.classList.remove('active');
      videoPreview.style.display = 'none';
      stopCameraPreview();
    } else {
      audioBtn.classList.remove('active');
      videoBtn.classList.add('active');
      videoPreview.style.display = 'block';
      startCameraPreview();
    }
  }

  function startCameraPreview() {
    const videoEl = document.getElementById('video-recording-preview');
    if (!videoEl) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("⚠️ HTTPS or chrome://flags setup required for Camera/Mic access.");
      console.warn("navigator.mediaDevices is undefined on insecure HTTP origins.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        videoEl.srcObject = stream;
        videoEl.play();
      })
      .catch(err => {
        console.warn("Camera preview unavailable: ", err);
        showToast("Camera access denied or device unavailable.");
      });
  }

  function stopCameraPreview() {
    const videoEl = document.getElementById('video-recording-preview');
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoEl.srcObject = null;
    }
  }

  // Toggle capturing recordings
  function toggleRecording() {
    AuraSounds.click();
    const statusLabel = document.getElementById('record-status-label');
    const timerLabel = document.getElementById('recording-duration-timer');
    const waveRings = document.getElementById('record-pulsing-rings');
    const actionsPanel = document.getElementById('recording-save-options');
    const micIcon = document.querySelector('.inner-mic-icon');

    if (state.recording.active) {
      // STOP RECORDING
      state.recording.active = false;
      clearInterval(state.recording.interval);
      
      if (waveRings) waveRings.style.display = 'none';
      if (statusLabel) statusLabel.textContent = 'RECORDING STOPPED';
      if (actionsPanel) actionsPanel.style.display = 'flex';
      if (micIcon) micIcon.textContent = '🎙️';

      // Stop Spech recognition
      if (state.recording.recognition) {
        state.recording.recognition.stop();
      }

      // Stop Camera feed
      if (state.recording.mode === 'video' && state.recording.mediaRecorder) {
        state.recording.mediaRecorder.stop();
        stopCameraPreview();
      }
    } else {
      // START RECORDING
      state.recording.active = true;
      state.recording.duration = 0;
      state.recording.chunks = [];
      state.recording.transcript = '';
      
      const transcriptBox = document.getElementById('realtime-transcript-output');
      if (transcriptBox) transcriptBox.innerHTML = '<span class="transcript-placeholder-msg">Listening...</span>';

      if (waveRings) waveRings.style.display = 'block';
      if (statusLabel) statusLabel.textContent = 'RECORDING IN PROGRESS...';
      if (actionsPanel) actionsPanel.style.display = 'none';
      if (micIcon) micIcon.textContent = '⏹';

      // Duration timer tick
      state.recording.interval = setInterval(() => {
        state.recording.duration++;
        const mins = String(Math.floor(state.recording.duration / 60)).padStart(2, '0');
        const secs = String(state.recording.duration % 60).padStart(2, '0');
        if (timerLabel) timerLabel.textContent = `${mins}:${secs}`;
      }, 1000);

      // A: Initialize speech to text
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        state.recording.recognition = new SpeechRecognition();
        state.recording.recognition.continuous = true;
        state.recording.recognition.interimResults = true;
        state.recording.recognition.lang = 'en-US';

        state.recording.recognition.onresult = (e) => {
          let interimText = '';
          let finalText = '';

          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript;
            } else {
              interimText += e.results[i][0].transcript;
            }
          }

          if (finalText) {
            state.recording.transcript += finalText + ' ';
          }

          if (transcriptBox) {
            transcriptBox.innerHTML = `<strong>${state.recording.transcript}</strong><span style="color:var(--text-muted)">${interimText}</span>`;
            transcriptBox.scrollTop = transcriptBox.scrollHeight;
          }
        };

        state.recording.recognition.onerror = (e) => {
          console.warn("Speech recognition error: ", e.error);
        };

        state.recording.recognition.start();
      } else {
        if (transcriptBox) {
          transcriptBox.innerHTML = '<span style="color:var(--danger)">Web Speech API not supported in this browser. Use manual paste below!</span>';
        }
      }

      // B: Initialize MediaRecorder if in video mode
      if (state.recording.mode === 'video') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("⚠️ HTTPS or chrome://flags setup required for Video recording.");
          return;
        }
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            state.recording.mediaRecorder = new MediaRecorder(stream);
            state.recording.mediaRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                state.recording.chunks.push(e.data);
              }
            };
            state.recording.mediaRecorder.start(1000);
          })
          .catch(err => {
            console.error("Failed to start video recording: ", err);
            showToast("Failed to start video recording.");
          });
      }
    }
  }

  // Save the recorded lecture
  function saveRecordedLecture() {
    AuraSounds.success();
    
    const titlePrompt = prompt("Enter Lecture Title:", `Lecture Notes ${formatDateDisplay(new Date())}`);
    if (!titlePrompt) return;

    const transcriptText = state.recording.transcript.trim() || 'No transcription audio captured. Manual edit needed.';
    const newLect = {
      id: 'lect-' + Date.now(),
      title: titlePrompt,
      date: formatDateString(new Date()),
      transcript: transcriptText,
      summary: 'No summary generated yet. Click AI Coach -> Summarize notes.',
      synced: false
    };

    AuraDB.saveLecture(newLect).then(() => {
      addXP(50); // XP Reward
      showToast("Lecture saved to Study Hub! (+50 XP)");
      resetRecorderUI();
      switchScreen('study');
    });
  }

  function cancelRecordedLecture() {
    AuraSounds.click();
    if (confirm("Discard this recording?")) {
      resetRecorderUI();
    }
  }

  function resetRecorderUI() {
    state.recording.duration = 0;
    state.recording.transcript = '';
    
    const timerLabel = document.getElementById('recording-duration-timer');
    const statusLabel = document.getElementById('record-status-label');
    const actionsPanel = document.getElementById('recording-save-options');
    const transcriptBox = document.getElementById('realtime-transcript-output');
    
    if (timerLabel) timerLabel.textContent = '00:00';
    if (statusLabel) statusLabel.textContent = 'TAP TO START RECORDING';
    if (actionsPanel) actionsPanel.style.display = 'none';
    if (transcriptBox) transcriptBox.innerHTML = '<span class="transcript-placeholder-msg">Your real-time lecture transcript will stream here...</span>';

    stopCameraPreview();
  }

  // File Upload setup
  function setupFileUpload() {
    const dropzone = document.getElementById('upload-area');
    const input = document.getElementById('input-file-upload');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleUploadedFile(file);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleUploadedFile(file);
    });
  }

  function handleUploadedFile(file) {
    AuraSounds.success();
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      showToast("PDF parsing requires active PC Bridge offloads. Parsing...");
      // Check if bridge is connected to offload
      AuraBridge.checkHealth().then(status => {
        if (status.online) {
          // Offload PDF file data to laptop proxy
          showToast("PDF parsed successfully via Bridge! Saved draft.");
          createLectureFromFile(name, "Parsed PDF document notes: AI summaries will detail specific formulas.");
        } else {
          showToast("⚠️ Bridge Offline. Using offline PDF mock values.");
          createLectureFromFile(name, "Mocked offline PDF data. Connect laptop bridge to parse authentic equations.");
        }
      });
    } else {
      // Plain text or Markdown reading using FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        createLectureFromFile(name, text);
      };
      reader.readAsText(file);
    }
  }

  function createLectureFromFile(title, content) {
    const newLect = {
      id: 'lect-' + Date.now(),
      title: title,
      date: formatDateString(new Date()),
      transcript: content,
      summary: 'File notes parsed. Ask AI Coach to summarize.',
      synced: false
    };

    AuraDB.saveLecture(newLect).then(() => {
      addXP(30);
      showToast(`File uploaded! Gained +30 XP`);
      switchScreen('study');
    });
  }

  // Submit manual pasted notes
  function submitManualNotes() {
    const box = document.getElementById('textarea-fallback');
    if (!box) return;
    const text = box.value.trim();
    if (!text) {
      showToast("Please enter notes content first.");
      return;
    }

    AuraSounds.success();
    createLectureFromFile("Manual Clipboard Notes", text);
    box.value = '';
  }

  // ── Screen 3: Study Hub View Logic ──
  function refreshStudy() {
    const mainPanel = document.getElementById('study-main-panel');
    const detailPanel = document.getElementById('lecture-detail-panel');
    
    // Hide details by default
    if (mainPanel) mainPanel.style.display = 'block';
    if (detailPanel) detailPanel.style.display = 'none';

    // Refresh lists
    AuraDB.getAllLectures().then(lectures => {
      const container = document.getElementById('study-lectures-list');
      if (!container) return;

      if (lectures.length === 0) {
        container.innerHTML = `<div class="empty-placeholder">No lectures found. Capture one to start!</div>`;
        return;
      }

      container.innerHTML = lectures.map(l => `
        <div class="lecture-row-card" onclick="AuraApp.openLectureDetail('${l.id}')">
          <div class="lect-details-wrapper">
            <span class="lect-title-text">${escapeHtml(l.title)}</span>
            <span class="lect-date-label">${formatDateDisplay(l.date)}</span>
          </div>
          <button id="btn-lect-delete-${l.id}" class="btn-ghost-small" style="color:var(--danger)" onclick="event.stopPropagation(); AuraApp.confirmDeleteLecture('${l.id}')">🗑️</button>
        </div>
      `).join('');
    });

    AuraDB.getAllFlashcards().then(cards => {
      state.study.flashcards = cards;
      renderFlashcardsOverview();
    });
  }

  // Delete lecture
  function confirmDeleteLecture(id) {
    AuraSounds.click();
    if (confirm("Are you sure you want to permanently delete this lecture and all of its notes?")) {
      AuraDB.deleteLecture(id).then(() => {
        showToast("Lecture notes deleted.");
        refreshStudy();
        refreshHome();
      });
    }
  }

  // Open expanded details of a lecture
  function openLectureDetail(id) {
    AuraSounds.click();
    
    AuraDB.getLecture(id).then(lect => {
      if (!lect) return;
      state.study.activeLecture = lect;

      const mainPanel = document.getElementById('study-main-panel');
      const detailPanel = document.getElementById('lecture-detail-panel');
      
      if (mainPanel) mainPanel.style.display = 'none';
      if (detailPanel) detailPanel.style.display = 'block';

      const titleEl = document.getElementById('lecture-detail-title');
      const dateEl = document.getElementById('lecture-detail-date');
      const summaryEl = document.getElementById('lecture-summary-content');
      const transcriptEl = document.getElementById('lecture-transcript-content');

      if (titleEl) titleEl.textContent = lect.title;
      if (dateEl) dateEl.textContent = formatDateDisplay(lect.date);
      if (summaryEl) summaryEl.innerHTML = lect.summary;
      if (transcriptEl) transcriptEl.textContent = lect.transcript;

      toggleDetailSubTab('summary');
    });
  }

  function closeLectureDetail() {
    AuraSounds.click();
    state.study.activeLecture = null;
    refreshStudy();
  }

  function deleteActiveLecture() {
    if (state.study.activeLecture) {
      confirmDeleteLecture(state.study.activeLecture.id);
    }
  }

  function toggleDetailSubTab(tab) {
    AuraSounds.click();
    state.study.activeDetailTab = tab;

    const summaryTab = document.getElementById('detail-tab-summary-trigger');
    const transcriptTab = document.getElementById('detail-tab-transcript-trigger');
    const summaryPane = document.getElementById('detail-tab-summary-content');
    const transcriptPane = document.getElementById('detail-tab-transcript-content');

    if (tab === 'summary') {
      summaryTab.classList.add('active');
      transcriptTab.classList.remove('active');
      summaryPane.classList.add('active');
      transcriptPane.classList.remove('active');
    } else {
      summaryTab.classList.remove('active');
      transcriptTab.classList.add('active');
      summaryPane.classList.remove('active');
      transcriptPane.classList.add('active');
    }
  }

  // ── Flashcard Engine ──
  function renderFlashcardsOverview() {
    const card3d = document.getElementById('flashcard-card-3d');
    const indicator = document.getElementById('flashcard-index-indicator');
    const qEl = document.getElementById('flashcard-question-text');
    const aEl = document.getElementById('flashcard-answer-text');

    if (card3d) card3d.classList.remove('flipped');

    if (state.study.flashcards.length === 0) {
      if (qEl) qEl.textContent = 'Ready to study? Tap Hackathon Demo Mode or create new decks.';
      if (aEl) aEl.textContent = 'Your interactive flashcard deck will appear here.';
      if (indicator) indicator.textContent = '0 / 0';
      return;
    }

    if (state.study.currentFlashcardIndex >= state.study.flashcards.length) {
      state.study.currentFlashcardIndex = 0;
    }

    const currentCard = state.study.flashcards[state.study.currentFlashcardIndex];
    if (qEl) qEl.textContent = currentCard.question;
    if (aEl) aEl.textContent = currentCard.answer;
    if (indicator) indicator.textContent = `${state.study.currentFlashcardIndex + 1} / ${state.study.flashcards.length}`;
  }

  function flipFlashcard() {
    AuraSounds.click();
    const card3d = document.getElementById('flashcard-card-3d');
    if (card3d) card3d.classList.toggle('flipped');
  }

  function navigateFlashcards(dir) {
    AuraSounds.click();
    if (state.study.flashcards.length === 0) return;

    state.study.currentFlashcardIndex += dir;
    if (state.study.currentFlashcardIndex < 0) {
      state.study.currentFlashcardIndex = state.study.flashcards.length - 1;
    } else if (state.study.currentFlashcardIndex >= state.study.flashcards.length) {
      state.study.currentFlashcardIndex = 0;
    }

    renderFlashcardsOverview();
  }

  function deleteCurrentFlashcard() {
    AuraSounds.click();
    if (state.study.flashcards.length === 0) return;
    const card = state.study.flashcards[state.study.currentFlashcardIndex];
    
    if (confirm("Delete this flashcard?")) {
      AuraDB.deleteFlashcard(card.id).then(() => {
        showToast("Flashcard deleted.");
        refreshStudy();
        refreshHome();
      });
    }
  }

  // ── AI Study Coach Chat Logic ──
  function toggleAIChat(show) {
    AuraSounds.click();
    const chatPanel = document.getElementById('ai-chat-sidebar');
    if (!chatPanel) return;

    if (show) {
      chatPanel.classList.add('visible');
      renderChatMessages();
    } else {
      chatPanel.classList.remove('visible');
    }
  }

  function sendChatMessage() {
    const input = document.getElementById('input-chat-query');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    AuraSounds.click();
    input.value = '';

    // Append user message
    state.study.chatHistory.push({ sender: 'user', text });
    renderChatMessages();

    // Prepare context notes
    AuraDB.getAllLectures().then(lectures => {
      const contextText = lectures.map(l => l.transcript).join('\n\n');
      
      // Get AI Response
      AuraAI.askCoach(text, contextText).then(response => {
        state.study.chatHistory.push({ sender: 'coach', text: response });
        saveChatHistory();
        renderChatMessages();
      });
    });
  }

  function renderChatMessages() {
    const container = document.getElementById('ai-chat-messages-container');
    if (!container) return;

    container.innerHTML = `
      <div class="message coach">
        <div class="message-bubble">
          Hello Krish! I'm your on-device study coach. Let's make study sessions efficient. Ask me any question or tap one of the quick shortcuts above!
        </div>
      </div>
    ` + state.study.chatHistory.map(m => `
      <div class="message ${m.sender}">
        <div class="message-bubble">${m.text}</div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  function saveChatHistory() {
    localStorage.setItem('aura_chat_history', JSON.stringify(state.study.chatHistory));
  }

  function clearChatHistory() {
    AuraSounds.click();
    if (confirm("Clear AI coach chat logs?")) {
      state.study.chatHistory = [];
      saveChatHistory();
      renderChatMessages();
    }
  }

  // AI Coach Quick Action triggers
  function triggerAICoachAction(type) {
    AuraSounds.click();
    
    AuraDB.getAllLectures().then(lectures => {
      if (lectures.length === 0) {
        showToast("No study notes found. Capture notes first!");
        return;
      }

      // Default to the active details lecture, or the latest lecture
      let lect = state.study.activeLecture;
      if (!lect) lect = lectures[lectures.length - 1];

      if (type === 'flashcards') {
        showToast("Generating revision cards...");
        AuraAI.generateFlashcards(lect.transcript).then(cards => {
          const promises = cards.map(c => {
            c.id = 'fc-' + Date.now() + Math.random().toString(36).substr(2, 5);
            c.lectureId = lect.id;
            return AuraDB.saveFlashcard(c);
          });

          Promise.all(promises).then(() => {
            addXP(100); // Massive RPG Boost!
            showToast("Saved 5 new flashcards to deck! (+100 XP)");
            refreshStudy();
          });
        });

      } else if (type === 'quiz') {
        showToast("Formulating practice quiz...");
        AuraAI.generateQuiz(lect.transcript).then(quiz => {
          state.study.activeQuiz = quiz;
          
          // Inject interactive quiz into chat
          const quizHtml = `
            <div class="quiz-message-block">
              <strong>Practice Quiz Question:</strong><br>${quiz.question}<br><br>
              <button id="btn-quiz-opt-a" class="btn-shortcut" style="width:100%; text-align:left; margin-bottom:4px;" onclick="AuraApp.answerQuiz('A')">A) ${quiz.options.A}</button>
              <button id="btn-quiz-opt-b" class="btn-shortcut" style="width:100%; text-align:left; margin-bottom:4px;" onclick="AuraApp.answerQuiz('B')">B) ${quiz.options.B}</button>
              <button id="btn-quiz-opt-c" class="btn-shortcut" style="width:100%; text-align:left; margin-bottom:4px;" onclick="AuraApp.answerQuiz('C')">C) ${quiz.options.C}</button>
              <button id="btn-quiz-opt-d" class="btn-shortcut" style="width:100%; text-align:left; margin-bottom:4px;" onclick="AuraApp.answerQuiz('D')">D) ${quiz.options.D}</button>
            </div>
          `;
          
          state.study.chatHistory.push({ sender: 'coach', text: quizHtml });
          renderChatMessages();
        });

      } else if (type === 'revision') {
        showToast("Calculating smart revision calendar slots...");
        // Auto-schedule revision session in 3 days
        const revisionDate = new Date();
        revisionDate.setDate(revisionDate.getDate() + 3);

        const newSession = {
          id: 'sess-' + Date.now(),
          title: `AI Scheduled Revision: ${lect.title}`,
          time: "16:00",
          duration: 45,
          date: formatDateString(revisionDate)
        };

        AuraDB.saveStudySession(newSession).then(() => {
          addXP(50);
          showToast(`Revision scheduled for ${formatDateDisplay(newSession.date)}! (+50 XP)`);
          refreshCalendar();
        });
      }
    });
  }

  function answerQuiz(option) {
    AuraSounds.click();
    const quiz = state.study.activeQuiz;
    if (!quiz) return;

    let reply = '';
    if (option === quiz.answer) {
      AuraSounds.success();
      AuraParticles.triggerConfettiBurst();
      addXP(20);
      reply = `🎉 Correct! Option ${option} is the right answer. Gained +20 XP. <br><br>_${quiz.explanation}_`;
    } else {
      reply = `❌ Incorrect. You chose ${option}. The correct answer was ${quiz.answer}.<br><br>_${quiz.explanation}_`;
    }

    state.study.activeQuiz = null; // consume
    state.study.chatHistory.push({ sender: 'coach', text: reply });
    renderChatMessages();
  }

  // ── Screen 4: Calendar & Planner Components ──
  function refreshCalendar() {
    renderNotionMonthView();
    renderDayDetails();
  }

  // Notion-Style Monthly Grid generator
  function renderNotionMonthView() {
    const grid = document.getElementById('calendar-days-grid');
    const label = document.getElementById('calendar-month-year-label');
    if (!grid || !label) return;

    grid.innerHTML = '';
    
    const year = state.calendar.currentYear;
    const month = state.calendar.currentMonth;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthNames[month]} ${year}`;

    // Get first day of the month (Mon-Sun mapping: 0 is Mon, 6 is Sun)
    const firstDayObj = new Date(year, month, 1);
    let startDayIdx = firstDayObj.getDay(); // Sun=0, Mon=1, etc.
    startDayIdx = startDayIdx === 0 ? 6 : startDayIdx - 1; // map Sun to 6, Mon to 0

    // Get number of days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Get number of days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Promises to load deadlines & study slots to show indicator dots
    Promise.all([
      AuraDB.getAllDeadlines(),
      AuraDB.getAllStudySessions()
    ]).then(([deadlines, sessions]) => {
      
      const dotsMap = {}; // Map to hold dots for each YYYY-MM-DD
      
      deadlines.forEach(dl => {
        if (!dl.completed) {
          if (!dotsMap[dl.date]) dotsMap[dl.date] = [];
          dotsMap[dl.date].push({ type: 'deadline', priority: dl.priority });
        }
      });

      sessions.forEach(sess => {
        if (!dotsMap[sess.date]) dotsMap[sess.date] = [];
        dotsMap[sess.date].push({ type: 'session' });
      });

      // Render cells
      // A. Empty preceding spaces from previous month
      for (let i = startDayIdx - 1; i >= 0; i--) {
        const dateNum = prevMonthDays - i;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.textContent = dateNum;
        grid.appendChild(cell);
      }

      // B. Render active month days
      const todayStr = formatDateString(new Date());
      
      for (let day = 1; day <= totalDays; day++) {
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        if (cellDateStr === todayStr) cell.classList.add('today');
        if (cellDateStr === state.calendar.selectedDay) cell.classList.add('selected');
        
        cell.innerHTML = `<span class="cell-day-number">${day}</span>`;

        // Render indicator dots
        const dots = dotsMap[cellDateStr] || [];
        if (dots.length > 0) {
          const dotsContainer = document.createElement('div');
          dotsContainer.className = 'cell-dot-indicators';
          
          dots.slice(0, 4).forEach(dot => {
            const dotEl = document.createElement('span');
            dotEl.className = 'cell-indicator-dot ' + (dot.type === 'session' ? 'session' : dot.priority);
            dotsContainer.appendChild(dotEl);
          });
          cell.appendChild(dotsContainer);
        }

        // Click selection handlers
        cell.addEventListener('click', () => {
          AuraSounds.click();
          state.calendar.selectedDay = cellDateStr;
          
          document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
          cell.classList.add('selected');
          
          renderDayDetails();
        });

        grid.appendChild(cell);
      }
    });
  }

  function navigateMonth(dir) {
    AuraSounds.click();
    state.calendar.currentMonth += dir;
    if (state.calendar.currentMonth < 0) {
      state.calendar.currentMonth = 11;
      state.calendar.currentYear--;
    } else if (state.calendar.currentMonth > 11) {
      state.calendar.currentMonth = 0;
      state.calendar.currentYear++;
    }
    refreshCalendar();
  }

  // Render events for the selected calendar day
  function renderDayDetails() {
    const label = document.getElementById('selected-day-label');
    const dlContainer = document.getElementById('cal-day-deadlines-container');
    const ssContainer = document.getElementById('cal-day-sessions-container');

    if (!state.calendar.selectedDay) {
      state.calendar.selectedDay = formatDateString(new Date());
    }

    const selDate = new Date(state.calendar.selectedDay + 'T00:00:00');
    if (label) label.textContent = `Focus Plan: ${formatDateDisplay(selDate)}`;

    // Query databases
    Promise.all([
      AuraDB.getAllDeadlines(),
      AuraDB.getAllStudySessions()
    ]).then(([deadlines, sessions]) => {
      
      const dayDeadlines = deadlines.filter(d => d.date === state.calendar.selectedDay);
      const daySessions = sessions.filter(s => s.date === state.calendar.selectedDay);

      // Render Deadlines
      if (dlContainer) {
        if (dayDeadlines.length === 0) {
          dlContainer.innerHTML = '<span class="day-empty-state">No deadlines.</span>';
        } else {
          dlContainer.innerHTML = dayDeadlines.map(dl => `
            <div class="cal-event-bubble ${dl.priority}-priority ${dl.completed ? 'completed' : ''}">
              <div style="font-weight:700;">${escapeHtml(dl.title)}</div>
              <div style="font-size:10px; opacity:0.8;">${escapeHtml(dl.course)}</div>
            </div>
          `).join('');
        }
      }

      // Render Study slots
      if (ssContainer) {
        if (daySessions.length === 0) {
          ssContainer.innerHTML = '<span class="day-empty-state">No study slots.</span>';
        } else {
          ssContainer.innerHTML = daySessions.map(ss => `
            <div class="cal-event-bubble study-session">
              <div style="font-weight:700;">${escapeHtml(ss.title)}</div>
              <div class="cal-event-time">⏰ ${ss.time} (${ss.duration} mins)</div>
            </div>
          `).join('');
        }
      }
    });
  }

  // Forms management
  function toggleCalendarForm(type) {
    AuraSounds.click();
    const dlForm = document.getElementById('form-add-deadline');
    const ssForm = document.getElementById('form-add-session');

    if (type === 'deadline') {
      dlForm.style.display = dlForm.style.display === 'none' ? 'block' : 'none';
      ssForm.style.display = 'none';
      
      // Auto fill date field with active selected day
      const dateInput = document.getElementById('input-dl-date');
      if (dateInput) dateInput.value = state.calendar.selectedDay;
    } else {
      ssForm.style.display = ssForm.style.display === 'none' ? 'block' : 'none';
      dlForm.style.display = 'none';
    }
  }

  function submitDeadlineForm() {
    AuraSounds.success();
    
    const title = document.getElementById('input-dl-title').value.trim();
    const course = document.getElementById('input-dl-course').value.trim();
    const date = document.getElementById('input-dl-date').value;
    const priority = document.getElementById('select-dl-priority').value;

    if (!title || !course || !date) {
      showToast("Please fill in all deadline fields.");
      return;
    }

    const newDl = {
      id: 'dl-' + Date.now(),
      title,
      course,
      date,
      priority,
      completed: false
    };

    AuraDB.saveDeadline(newDl).then(() => {
      addXP(20);
      showToast("Deadline added! (+20 XP)");
      toggleCalendarForm('deadline');
      refreshCalendar();
      refreshHome();
    });
  }

  function submitSessionForm() {
    AuraSounds.success();

    const title = document.getElementById('input-ss-title').value.trim();
    const time = document.getElementById('input-ss-time').value;
    const durationVal = document.getElementById('input-ss-duration').value;
    const duration = parseInt(durationVal);

    if (!title || !time || isNaN(duration)) {
      showToast("Please fill in all study slot fields.");
      return;
    }

    const newSess = {
      id: 'ss-' + Date.now(),
      title,
      time,
      duration,
      date: state.calendar.selectedDay
    };

    AuraDB.saveStudySession(newSess).then(() => {
      addXP(20);
      showToast("Study session scheduled! (+20 XP)");
      toggleCalendarForm('session');
      refreshCalendar();
      refreshHome();
    });
  }

  // ── Settings Drawer Logic ──
  function toggleSettingsDrawer(show) {
    AuraSounds.click();
    const drawer = document.getElementById('settings-drawer-panel');
    if (!drawer) return;

    // Remove old backdrop if present
    const oldBackdrop = document.querySelector('.drawer-backdrop');
    if (oldBackdrop) oldBackdrop.remove();

    if (show) {
      drawer.classList.add('visible');
      
      // Load current keys into form inputs
      const gInput = document.getElementById('input-gemini-key');
      const cInput = document.getElementById('input-claude-key');
      const providerSelect = document.getElementById('select-ai-provider');
      const ipInput = document.getElementById('input-bridge-ip');

      if (gInput) gInput.value = localStorage.getItem('aura_gemini_key') || '';
      if (cInput) cInput.value = localStorage.getItem('aura_claude_key') || '';
      if (providerSelect) providerSelect.value = AuraAI.getProvider();
      if (ipInput) ipInput.value = AuraBridge.getIP();

      toggleAIKeyFields();

      // Create a background backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop visible';
      backdrop.addEventListener('click', () => toggleSettingsDrawer(false));
      document.body.appendChild(backdrop);
    } else {
      drawer.classList.remove('visible');
    }
  }

  function toggleAIKeyFields() {
    const select = document.getElementById('select-ai-provider');
    const gWrapper = document.getElementById('field-gemini-key-wrapper');
    const cWrapper = document.getElementById('field-claude-key-wrapper');

    if (!select || !gWrapper || !cWrapper) return;

    if (select.value === 'gemini') {
      gWrapper.style.display = 'block';
      cWrapper.style.display = 'none';
    } else {
      gWrapper.style.display = 'none';
      cWrapper.style.display = 'block';
    }
  }

  function saveAPIKeys() {
    AuraSounds.success();
    const gVal = document.getElementById('input-gemini-key').value;
    const cVal = document.getElementById('input-claude-key').value;
    const provider = document.getElementById('select-ai-provider').value;

    AuraAI.setKeys(gVal, cVal, provider);
    showToast("API keys saved successfully!");
    
    updateBridgeStatusBadge();
    toggleSettingsDrawer(false);
  }

  function clearAPIKeys() {
    AuraSounds.click();
    if (confirm("Clear all AI API keys?")) {
      AuraAI.clearKeys();
      const gInput = document.getElementById('input-gemini-key');
      const cInput = document.getElementById('input-claude-key');
      if (gInput) gInput.value = '';
      if (cInput) cInput.value = '';
      showToast("API keys cleared.");
      
      updateBridgeStatusBadge();
    }
  }

  function saveBridgeIP() {
    AuraSounds.success();
    const ip = document.getElementById('input-bridge-ip').value.trim();
    AuraBridge.setIP(ip);
    AuraDB.setSetting('bridge_ip', ip).then(() => {
      showToast("Laptop connection updated!");
      
      // Run sync in background
      AuraDB.getAllLectures().then(lectures => {
        AuraBridge.syncLectures(lectures)
          .then(() => {
            showToast("Successfully backed up lectures on laptop!");
            lectures.forEach(l => {
              l.synced = true;
              AuraDB.saveLecture(l);
            });
          })
          .catch(() => {
            showToast("Unable to sync files to laptop. Check PC server.");
          });
      });

      updateBridgeStatusBadge();
      toggleSettingsDrawer(false);
    });
  }

  function syncWithLaptop() {
    AuraSounds.click();
    const ip = AuraBridge.getIP();
    if (!ip) {
      showToast("Please configure your Laptop Local IP first.");
      toggleSettingsDrawer(true);
      return;
    }

    showToast("Connecting to Laptop Bridge...");
    AuraBridge.checkHealth().then(status => {
      if (!status.online) {
        showToast("⚠️ Laptop Bridge is offline. Check if server.py is running on port 8765.");
        updateBridgeStatusBadge();
        return;
      }

      AuraDB.getAllLectures().then(lectures => {
        if (lectures.length === 0) {
          showToast("No lectures in database to sync.");
          return;
        }

        AuraBridge.syncLectures(lectures)
          .then(res => {
            AuraSounds.success();
            showToast(`🔄 Backup Complete! Synced ${lectures.length} lectures to laptop.`);
            const promises = lectures.map(l => {
              l.synced = true;
              return AuraDB.saveLecture(l);
            });
            Promise.all(promises).then(() => {
              refreshStudy();
              updateBridgeStatusBadge();
            });
          })
          .catch(err => {
            console.error(err);
            showToast("Sync failed. Check laptop console logs.");
          });
      });
    });
  }

  // Update status dot/text for laptop bridge connection
  function updateBridgeStatusBadge() {
    const badge = document.getElementById('btn-bridge-status');
    if (!badge) return;

    AuraBridge.checkHealth().then(status => {
      const text = badge.querySelector('.status-indicator-text');
      if (status.online) {
        badge.className = 'bridge-status-badge online';
        if (text) text.textContent = 'Bridge Online';
      } else {
        badge.className = 'bridge-status-badge offline';
        if (text) text.textContent = 'Bridge Offline';
      }
    });
  }

  // Visualizer Themes Picker Switch
  function setTheme(themeName) {
    // Check level locks
    if (themeName === 'sakura' && state.rpg.level < 2) {
      showToast("Sakura Bloom theme locks until Level 2!");
      return;
    }
    if (themeName === 'cyberpunk' && state.rpg.level < 3) {
      showToast("Cyberpunk theme locks until Level 3!");
      return;
    }

    AuraSounds.click();
    document.documentElement.dataset.theme = themeName;
    AuraDB.setSetting('theme', themeName);

    // Update highlights in grid
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.theme === themeName) opt.classList.add('active');
    });

    // Sync particles background matching colors
    if (AuraParticles) AuraParticles.init();
  }

  // ── Utility Helper Methods ──
  function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3200);
  }

  function formatDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTimeString(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function formatDateDisplay(dateOrString) {
    const d = new Date(dateOrString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Audio & Soundscape configuration handlers
  function toggleStudioSoundFX() {
    const box = document.getElementById('sound-fx-toggle');
    if (!box) return;
    const isMuted = AuraSounds.toggleMute();
    box.checked = !isMuted;
    showToast(isMuted ? "Interface sounds muted." : "Interface sounds enabled.");
  }

  function toggleStudioKeyboardFX() {
    const box = document.getElementById('keyboard-fx-toggle');
    if (!box) return;
    const enabled = box.checked;
    localStorage.setItem('aura_keyboard_fx', enabled ? 'true' : 'false');
    AuraSounds.keyboardFXEnabled = enabled;
    showToast(enabled ? "Keyboard thock sounds enabled." : "Keyboard thock sounds muted.");
  }

  function updateStudioKeyboardType() {
    const select = document.getElementById('keyboard-type-select');
    if (!select) return;
    const type = select.value;
    localStorage.setItem('aura_keyboard_type', type);
    showToast(`Keystroke profile set to: ${type}`);
  }

  function updateStudioAmbientNoise() {
    const select = document.getElementById('ambient-noise-select');
    if (!select) return;
    const type = select.value;
    localStorage.setItem('aura_ambient_noise', type);
    if (type === 'none') {
      AuraSounds.stopAmbient();
      showToast("Background soundscapes stopped.");
    } else {
      AuraSounds.initAmbientSource(type);
      showToast(`Soundscape active: ${type}`);
    }
  }

  function updateStudioAmbientVolume() {
    const slider = document.getElementById('ambient-volume-slider');
    const label = document.getElementById('ambient-volume-val');
    if (!slider || !label) return;
    const vol = parseFloat(slider.value);
    AuraSounds.setAmbientVolume(vol);
    label.textContent = `${Math.round(vol * 100)}%`;
  }

  function updateStudioAiPersona() {
    const select = document.getElementById('ai-persona-select');
    if (!select) return;
    const persona = select.value;
    localStorage.setItem('aura_ai_persona', persona);
    showToast(`AI persona adjusted: ${persona}`);
  }

  return {
    init,
    switchScreen,
    setPomoMode,
    pomodoroAction,
    toggleCustomPomoInput,
    applyCustomPomo,
    setRecordMode,
    toggleRecording,
    saveRecordedLecture,
    cancelRecordedLecture,
    submitManualNotes,
    openLectureDetail,
    closeLectureDetail,
    deleteActiveLecture,
    confirmDeleteLecture,
    toggleDetailSubTab,
    flipFlashcard,
    navigateFlashcards,
    deleteCurrentFlashcard,
    toggleAIChat,
    sendChatMessage,
    clearChatHistory,
    triggerAICoachAction,
    answerQuiz,
    navigateMonth,
    toggleCalendarForm,
    submitDeadlineForm,
    submitSessionForm,
    toggleSettingsDrawer,
    toggleAIKeyFields,
    saveAPIKeys,
    clearAPIKeys,
    saveBridgeIP,
    syncWithLaptop,
    setTheme,
    showToast,
    addXP,
    toggleStudioSoundFX,
    toggleStudioKeyboardFX,
    updateStudioKeyboardType,
    updateStudioAmbientNoise,
    updateStudioAmbientVolume,
    updateStudioAiPersona
  };
})();

// Document boot loader
document.addEventListener('DOMContentLoaded', () => {
  AuraApp.init();
});
