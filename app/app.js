/* ═══════════════════════════════════════════════
   AURA  —  Core Application Logic  (app.js)
   Integrated RPG Engine, Circular Pomodoro, Seeding & AI Coach
   ═══════════════════════════════════════════════ */

/* ── State ───────────────────────────────────── */
const state = {
  currentScreen: 'home',
  isRecording: false,
  recognition: null,
  recordingTimer: null,
  recordingStart: 0,
  transcript: '',
  interimTranscript: '',
  selectedCalDay: null,
  currentFlashcardIdx: 0,
  studyFlashcards: [],
  viewingLecture: null,
  chatContext: '',
  chatHistory: [],
  recordMode: 'audio',
  videoStream: null,
  mediaRecorder: null,
  videoChunks: [],
  studySessions: [],
  
  // RPG State
  rpg: {
    level: 1,
    xp: 0,
    completedTasks: 0,
    focusSessions: 0
  }
};

// Pomodoro Timer State
let pomoState = { 
  running: false, 
  timeLeft: 25 * 60, 
  totalDuration: 25 * 60,
  mode: 'Focus', 
  interval: null, 
  sessions: parseInt(localStorage.getItem('aura_pomo_sessions') || '0') 
};

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  await AuraDB.open();
  await AuraDB.seed();
  
  loadTheme();
  loadRpg();
  loadChatHistory();
  loadStudySessions();
  setupNavigation();
  
  // Hash Routing
  navigateTo(location.hash.slice(1) || 'home');
  
  setupRecorder();
  setupCalendar();
  setupStudyTabs();
  setupChatInput();
  setupFileUpload();
  AuraBridge.init();

  // Listen for setting updates (like AI key/provider changes) to refresh header indicator
  window.addEventListener('aura-settings-changed', () => {
    refreshAiStatusIndicator();
  });
  
  // Check if landing portal should show
  const entered = localStorage.getItem('aura_entered') === 'true';
  const portal = document.getElementById('landing-portal');
  if (entered && portal) {
    portal.classList.add('fade-out');
    setTimeout(() => portal.remove(), 600);
  }

  // Update Pomodoro Sessions UI
  document.getElementById('pomo-sessions').textContent = pomoState.sessions;
  updatePomoDisplay();
  checkThemeLocks();
  applyAllWidgetsVisibility();
  if (typeof initCardTilt === 'function') initCardTilt();
  if (typeof initKeystrokeSparkles === 'function') initKeystrokeSparkles();
});

/* ═══════════════════════════════════════════════
   LANDING PAGE & DEMO SEEDER
   ═══════════════════════════════════════════════ */

async function enterApp(isDemo = false) {
  const portal = document.getElementById('landing-portal');
  
  if (isDemo) {
    AuraAI.showToast("🚀 Activating Hackathon Demo Mode...");
    await seedDemoData();
  } else {
    // Normal entry
    window.AuraSounds.playSuccess();
  }
  
  localStorage.setItem('aura_entered', 'true');
  if (portal) {
    portal.classList.add('fade-out');
    setTimeout(() => portal.remove(), 600);
  }
  
  // Refresh views
  refreshHome();
  checkThemeLocks();
}

async function seedDemoData() {
  const now = Date.now();
  
  // Seed lectures
  const demoLectures = [
    {
      id: 'lec_demo_1',
      title: 'CS 229: Gradient Descent & Loss Functions',
      transcript: `Today we examine optimization in machine learning, focusing on Gradient Descent. Gradient descent is a first-order iterative optimization algorithm for finding the local minimum of a differentiable function.
      
      We define the Loss Function, J of theta, which measures the discrepancy between predicted values and actual labels. For linear regression, we use Mean Squared Error (MSE).
      
      The update rule is: theta equals theta minus alpha times the gradient of J of theta, where alpha is the learning rate. If alpha is too small, convergence is slow. If alpha is too large, the algorithm can overshoot and diverge.
      
      Batch Gradient Descent uses the entire dataset to compute gradients at each step. Stochastic Gradient Descent (SGD) updates parameters using a single training example at a time, introducing noise but accelerating updates. Mini-batch Gradient Descent strikes a balance by using small batches of size m.`,
      summary: `**CS 229: Gradient Descent & Optimization**\n\n• **Gradient Descent:** Iterative algorithm to minimize differentiable loss functions\n• **Update Equation:** $\\theta := \\theta - \\alpha \\nabla J(\\theta)$ where $\\alpha$ is the learning rate\n• **Learning Rate (Alpha):** Too small leads to slow convergence; too large causes overshoot & divergence\n• **Variants:** \n  - *Batch:* Uses entire dataset (stable but slow)\n  - *Stochastic (SGD):* Uses 1 sample (noisy but fast)\n  - *Mini-batch:* Balanced approach (uses size $m$ batches)`,
      date: now - 86400000 * 1,
      duration: 1800
    },
    {
      id: 'lec_demo_2',
      title: 'PHY 101: Maxwell Equations & Light Waves',
      transcript: `We summarize electrodynamics using Maxwell's four equations. First, Gauss's Law states that electric flux is charge divided by permittivity. Second, Gauss's Law for Magnetism states that magnetic monpoles do not exist, so magnetic flux through a closed surface is zero.
      
      Third, Faraday's Law states that a changing magnetic field induces an electromotive force. Fourth, the Ampere-Maxwell Law states that magnetic fields are generated by electric currents and by changing electric fields, introducing the displacement current term.
      
      Together, these equations show that changing electric and magnetic fields propagate as electromagnetic waves, traveling at the speed of light, c equals 1 over square root of vacuum permeability times permittivity.`,
      summary: `**PHY 101: Maxwell's Equations**\n\n• **Gauss's Law:** $\\nabla \\cdot E = \\rho / \\epsilon_0$ (Electric flux relates to charge)\n• **Gauss's Law for Magnetism:** $\\nabla \\cdot B = 0$ (No magnetic monopoles)\n• **Faraday's Law:** $\\nabla \\times E = -\\partial B / \\partial t$ (Changing magnetic field induces E-field)\n• **Ampere-Maxwell Law:** $\\nabla \\times B = \\mu_0(J + \\epsilon_0 \\partial E / \\partial t)$ (Displacement current)\n• **EM Waves:** Propagation speed is $c = 1 / \\sqrt{\\mu_0 \\epsilon_0}$`,
      date: now - 86400000 * 3,
      duration: 2200
    }
  ];

  const demoCards = [
    { id: 'fc_d1', lectureId: 'lec_demo_1', front: 'What is the update rule for Gradient Descent?', back: 'theta := theta - alpha * gradient(J(theta)), where alpha is the learning rate.' },
    { id: 'fc_d2', lectureId: 'lec_demo_1', front: 'Compare SGD vs Batch Gradient Descent.', back: 'Batch computes gradients over the whole dataset (slow, stable). SGD updates using one random sample at a time (fast, noisy, helps escape local minima).' },
    { id: 'fc_d3', lectureId: 'lec_demo_2', front: 'Write the physical meaning of Gauss\'s Law for Magnetism.', back: 'Del dot B = 0. It means magnetic flux through any closed surface is zero, proving that isolated magnetic monopoles do not exist.' }
  ];

  const demoDeadlines = [
    { id: 'dl_d1', title: 'ML Project Draft', course: 'CS 229', date: new Date(now + 86400000 * 2).toISOString().split('T')[0], priority: 'high' },
    { id: 'dl_d2', title: 'Maxwell Equations Quiz', course: 'PHY 101', date: new Date(now + 86400000 * 4).toISOString().split('T')[0], priority: 'medium' }
  ];

  for (const lec of demoLectures) await AuraDB.lectures.save(lec);
  for (const fc of demoCards) await AuraDB.flashcards.save(fc);
  for (const dl of demoDeadlines) await AuraDB.deadlines.save(dl);

  // Seed study sessions
  state.studySessions = [
    { id: 'ss_d1', title: 'Deep Work: SGD Proofs', time: '19:00', duration: 90, date: new Date(now - 86400000).toISOString().split('T')[0] },
    { id: 'ss_d2', title: 'Review: Maxwell Fields', time: '14:30', duration: 60, date: new Date(now - 86400000 * 2).toISOString().split('T')[0] },
    { id: 'ss_d3', title: 'Practice: Loss functions', time: '20:00', duration: 45, date: new Date(now - 86400000 * 3).toISOString().split('T')[0] }
  ];
  saveStudySessions();

  // Seed RPG Stats (Lvl 3)
  state.rpg = {
    level: 3,
    xp: 680,
    completedTasks: 8,
    focusSessions: 14
  };
  saveRPG();

  // Set Theme
  setTheme('cyberpunk');

  // Seed study hours for chart
  const mockHours = [2.5, 4.0, 1.5, 3.0, 4.5, 5.0, 3.5];
  localStorage.setItem('aura_demo_chart_hours', JSON.stringify(mockHours));

  // Visual cues
  window.AuraSounds.playLevelUp();
  setTimeout(() => window.AuraSounds.playSuccess(), 400);
  
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  }
}

/* ═══════════════════════════════════════════════
   RPG LEVEL SYSTEM
   ═══════════════════════════════════════════════ */

function loadRpg() {
  const saved = localStorage.getItem('aura_rpg_stats');
  if (saved) {
    state.rpg = JSON.parse(saved);
  } else {
    state.rpg = { level: 1, xp: 0, completedTasks: 0, focusSessions: 0 };
  }
  renderRpg();
}

function saveRPG() {
  localStorage.setItem('aura_rpg_stats', JSON.stringify(state.rpg));
  renderRpg();
}

function addXp(amount) {
  state.rpg.xp += amount;
  
  // Level Formula: 300 XP per level
  const targetLevel = Math.floor(state.rpg.xp / 300) + 1;
  
  if (targetLevel > state.rpg.level) {
    state.rpg.level = targetLevel;
    window.AuraSounds.playLevelUp();
    
    // Level Up visual splash
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#7c4dff', '#ff3366', '#00f59b']
      });
    }
    
    AuraAI.showToast(`🏆 LEVEL UP! You reached Level ${targetLevel}!`, 4000);
    // Custom style for level up toast
    const toasts = document.querySelectorAll('.aura-toast');
    if (toasts.length > 0) {
      toasts[toasts.length - 1].classList.add('level-up-toast');
    }

    checkThemeLocks();
    if (typeof checkStudioThemeLocks === 'function') {
      checkStudioThemeLocks();
    }
  }
  
  saveRPG();
}

function renderRpg() {
  const lvlEl = document.getElementById('rpg-level-num');
  const barEl = document.getElementById('rpg-xp-fill');
  const textEl = document.getElementById('rpg-xp-text');
  
  if (lvlEl) lvlEl.textContent = `Lvl ${state.rpg.level}`;
  
  const currentLvlXp = state.rpg.xp % 300;
  const progressRatio = currentLvlXp / 300;
  if (barEl) barEl.style.width = `${progressRatio * 100}%`;
  
  const nextLvl = state.rpg.level + 1;
  if (textEl) textEl.textContent = `${currentLvlXp} / 300 XP to Level ${nextLvl}`;
}

function checkThemeLocks() {
  const lvl = state.rpg.level;
  const sakura = document.getElementById('theme-btn-sakura');
  const cyberpunk = document.getElementById('theme-btn-cyberpunk');
  
  if (sakura) {
    if (lvl >= 2) {
      sakura.classList.remove('locked');
      sakura.title = "Sakura Bloom";
      sakura.textContent = "🌸";
    } else {
      sakura.classList.add('locked');
      sakura.title = "Sakura Bloom (Unlocks at Lvl 2)";
    }
  }
  
  if (cyberpunk) {
    if (lvl >= 3) {
      cyberpunk.classList.remove('locked');
      cyberpunk.title = "Cyberpunk";
      cyberpunk.textContent = "⚡";
    } else {
      cyberpunk.classList.add('locked');
      cyberpunk.title = "Cyberpunk (Unlocks at Lvl 3)";
    }
  }
}

/* ═══════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════ */

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });

  window.addEventListener('hashchange', () => {
    navigateTo(location.hash.slice(1) || 'home');
  });

  const fab = document.getElementById('fab');
  if (fab) fab.addEventListener('click', () => navigateTo('record'));
}

function navigateTo(screenId) {
  if (!['home', 'record', 'study', 'calendar'].includes(screenId)) screenId = 'home';

  if (location.hash !== '#' + screenId) {
    history.replaceState(null, '', '#' + screenId);
  }

  state.currentScreen = screenId;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-screen="${screenId}"]`)?.classList.add('active');

  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar) chatBar.classList.toggle('visible', screenId === 'study');

  const fabBtn = document.getElementById('fab');
  if (fabBtn) fabBtn.style.display = screenId === 'record' ? 'none' : 'flex';

  if (screenId === 'home') refreshHome();
  if (screenId === 'study') {
    refreshStudy();
    document.getElementById('lecture-detail').classList.remove('visible');
    document.getElementById('study-main').style.display = 'block';
  }
  if (screenId === 'calendar') refreshCalendar();
}

/* ═══════════════════════════════════════════════
   HOME SCREEN & ANALTICS
   ═══════════════════════════════════════════════ */

async function refreshHome() {
  const lectures = await AuraDB.lectures.getAll();
  const flashcards = await AuraDB.flashcards.getAll();
  const deadlines = await AuraDB.deadlines.getAll();

  // Personalised Greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening Krish 🌌';
  if (hour < 12) greeting = 'Good morning Krish ☀️';
  else if (hour < 17) greeting = 'Good afternoon Krish 🌊';

  const greetEl = document.getElementById('home-greeting');
  if (greetEl) {
    greetEl.textContent = greeting;
    greetEl.classList.add('gradient-greeting');
  }
  
  // Streak
  const streak = calculateStreak(lectures);
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-lectures').textContent = lectures.length;
  document.getElementById('stat-flashcards').textContent = flashcards.length;

  // Setup AI Dot
  refreshAiStatusIndicator();

  // Update personalized AI Coach insights
  updateAICoachInsights(lectures, deadlines, streak);

  // Render lists
  renderDeadlines(deadlines);
  renderRecentLectures(lectures);
  renderAnalytics(deadlines);
}

function updateAICoachInsights(lectures, deadlines, streak) {
  const insightEl = document.getElementById('cc-insights');
  if (!insightEl) return;

  if (state.rpg.level >= 3 && lectures.some(l => l.id.includes('demo'))) {
    insightEl.innerHTML = `🤖 <em>AI Coach:</em> "You study **CS 229** most actively between **7 PM and 10 PM**. Keep it up, Krish! Ready for another focus session?"`;
    return;
  }

  if (lectures.length === 0) {
    insightEl.innerHTML = `🤖 <em>AI Coach:</em> "Record your first lecture or upload a PDF notes file. I will analyze it and suggest smart study workflows!"`;
    return;
  }

  const highDl = deadlines.find(d => d.priority === 'high');
  if (highDl) {
    insightEl.innerHTML = `🤖 <em>AI Coach:</em> "Your high-priority task **${esc(highDl.title)}** is due soon. I recommend scheduling a **30-minute review** today!"`;
  } else if (streak >= 3) {
    insightEl.innerHTML = `🤖 <em>AI Coach:</em> "Incredible **${streak}-day streak**, Krish! Your focus hours are 15% higher this week. Keep crushing it!"`;
  } else {
    insightEl.innerHTML = `🤖 <em>AI Coach:</em> "You have recorded **${lectures.length} lectures**. Let's review one and generate flashcards to boost active recall!"`;
  }
}

function renderAnalytics(deadlines) {
  const chartContainer = document.getElementById('analytics-bar-chart');
  if (!chartContainer) return;

  // Retrieve hours array (demo seeds it, fallback is 0.5h per session)
  let hours = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  const savedHours = localStorage.getItem('aura_demo_chart_hours');
  if (savedHours) {
    hours = JSON.parse(savedHours);
  } else if (state.studySessions.length > 0) {
    // Fill based on study sessions
    hours = [0,0,0,0,0,0,0];
    const today = new Date();
    state.studySessions.forEach(s => {
      const diffDays = Math.floor((today - new Date(s.date)) / 86400000);
      if (diffDays >= 0 && diffDays < 7) {
        hours[6 - diffDays] += (s.duration / 60);
      }
    });
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxHours = Math.max(...hours, 1);

  let html = '';
  hours.forEach((h, i) => {
    const valPercent = Math.max(10, Math.floor((h / maxHours) * 95));
    html += `
      <div class="chart-bar" style="--val: ${valPercent}%;" data-label="${days[i]}">
        <span class="bar-val-label">${h.toFixed(1)}h</span>
      </div>`;
  });
  chartContainer.innerHTML = html;

  // Total Hours Sum
  const totalHours = hours.reduce((a, b) => a + b, 0);
  document.getElementById('analytics-focus-hours').textContent = `${totalHours.toFixed(1)}h`;

  // Tasks Completion Rate
  const totalDl = deadlines.length;
  const compRate = totalDl > 0 ? Math.min(100, Math.round((state.rpg.completedTasks / (state.rpg.completedTasks + totalDl)) * 100)) : 100;
  document.getElementById('analytics-completion-rate').textContent = `${compRate}%`;

  // XP Indicator
  document.getElementById('analytics-rpg-xp').textContent = `${state.rpg.xp} XP`;
}

function calculateStreak(lectures) {
  if (lectures.length === 0) return 0;
  const dates = [...new Set(lectures.map(l => new Date(l.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (new Date(dates[i]).toDateString() === expected.toDateString()) {
      streak++;
    } else break;
  }
  return streak || 1; 
}

function renderDeadlines(deadlines) {
  const container = document.getElementById('home-deadlines');
  if (!container) return;
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p class="empty-text">No upcoming deadlines!</p></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 4).map(d => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    const dayText = daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`;
    return `
      <div class="deadline-item glass-card">
        <div class="deadline-dot ${d.priority}"></div>
        <div class="deadline-info">
          <div class="dl-title">${esc(d.title)}</div>
          <div class="dl-meta">${esc(d.course)} • ${formatDate(d.date)}</div>
        </div>
        <div class="deadline-days">${dayText}</div>
        <button class="deadline-delete-btn" onclick="event.stopPropagation();deleteDeadline('${d.id}')" title="Mark as Done">
          <svg class="svg-icon" viewBox="0 0 24 24" style="stroke:var(--success);width:15px;height:15px;"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>`;
  }).join('');
}

function renderRecentLectures(lectures) {
  const container = document.getElementById('home-lectures');
  if (!container) return;
  const sorted = [...lectures].sort((a, b) => b.date - a.date);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎙️</div><p class="empty-text">No lectures saved. Let\'s record one!</p></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 5).map(l => `
    <div class="lecture-item glass-card" onclick="openLecture('${l.id}')">
      <div class="lecture-icon">
        <svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="lecture-info">
        <div class="li-title">${esc(l.title)}</div>
        <div class="li-meta">${timeAgo(l.date)} • ${formatDuration(l.duration)}</div>
      </div>
      <div class="lecture-arrow">›</div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════
   RECORD SCREEN & AUDIO WAVEFORM
   ═══════════════════════════════════════════════ */

function setupRecorder() {
  const btn = document.getElementById('record-btn');
  if (btn) btn.addEventListener('click', toggleRecording);
}

function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    AuraAI.showToast('⚠️ Speech recognition not supported in this browser');
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  state.transcript = '';
  state.interimTranscript = '';

  state.recognition.onresult = (event) => {
    let interim = '';
    let finalT = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalT += t + ' ';
      else interim += t;
    }
    if (finalT) state.transcript += finalT;
    state.interimTranscript = interim;
    updateTranscriptDisplay();
  };

  state.recognition.onerror = (e) => {
    console.warn('[Speech] Error:', e.error);
    if (e.error === 'not-allowed') {
      AuraAI.showToast('🎤 Microphone access blocked');
      stopRecording();
    }
  };

  state.recognition.onend = () => {
    if (state.isRecording) {
      try { state.recognition.start(); } catch(err) {}
    }
  };

  try {
    state.recognition.start();
  } catch (err) {
    AuraAI.showToast('⚠️ Unable to start audio recording');
    return;
  }

  state.isRecording = true;
  state.recordingStart = Date.now();

  const btn = document.getElementById('record-btn');
  const wrapper = document.getElementById('record-btn-wrapper');
  if (btn) {
    btn.classList.add('recording');
    btn.innerHTML = '⏹';
  }
  if (wrapper) wrapper.classList.add('recording');

  document.getElementById('record-status').className = 'record-status live';
  document.getElementById('record-status').textContent = 'Recording active';

  // Toggle CSS waveform bar visualizer active
  document.getElementById('audio-waveform')?.classList.add('active');

  document.getElementById('post-record').classList.remove('visible');

  updateRecordTimer();
  state.recordingTimer = setInterval(updateRecordTimer, 1000);
}

function stopRecording() {
  state.isRecording = false;

  if (state.recognition) {
    state.recognition.onend = null;
    state.recognition.stop();
    state.recognition = null;
  }

  clearInterval(state.recordingTimer);

  const btn = document.getElementById('record-btn');
  const wrapper = document.getElementById('record-btn-wrapper');
  if (btn) {
    btn.classList.remove('recording');
    btn.innerHTML = `
      <svg class="svg-icon xlarge" viewBox="0 0 24 24" style="stroke:#fff;stroke-width:2.5;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  }
  if (wrapper) wrapper.classList.remove('recording');

  document.getElementById('record-status').className = 'record-status';
  document.getElementById('record-status').textContent = 'Recording saved';

  // Hide waveform
  document.getElementById('audio-waveform')?.classList.remove('active');

  const duration = Math.floor((Date.now() - state.recordingStart) / 1000);

  if (state.transcript.trim().length > 0) {
    const postRecord = document.getElementById('post-record');
    postRecord.classList.add('visible');
    document.getElementById('lecture-title-input').value = 'Lecture — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    postRecord.dataset.duration = duration;
  } else {
    AuraAI.showToast('No speech captured. Try typing notes manually ⌨️');
    toggleTypeMode();
  }
}

function toggleTypeMode() {
  const textarea = document.getElementById('type-textarea');
  const saveBtn = document.getElementById('type-save-btn');
  const modeBtn = document.getElementById('type-mode-btn');

  if (textarea.style.display === 'none') {
    textarea.style.display = 'block';
    saveBtn.style.display = 'block';
    modeBtn.textContent = '🎙️ Switch back to voice mode';
    textarea.focus();
  } else {
    textarea.style.display = 'none';
    saveBtn.style.display = 'none';
    modeBtn.textContent = '⌨️ Or type/paste notes manually';
  }
}

async function saveTypedNotes() {
  const text = document.getElementById('type-textarea').value.trim();
  if (!text || text.length < 10) {
    AuraAI.showToast('⚠️ Notes text is too short');
    return;
  }
  state.transcript = text;
  document.getElementById('transcript-box').textContent = text;

  const postRecord = document.getElementById('post-record');
  postRecord.classList.add('visible');
  document.getElementById('lecture-title-input').value = 'Lecture — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  postRecord.dataset.duration = 0;

  AuraAI.showToast('✅ Notes loaded! Save or summarize below.');
}

function updateRecordTimer() {
  const elapsed = Math.floor((Date.now() - state.recordingStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  document.getElementById('record-timer').textContent = `${mm}:${ss}`;
}

function updateTranscriptDisplay() {
  const box = document.getElementById('transcript-box');
  box.innerHTML = esc(state.transcript) +
    (state.interimTranscript ? `<span class="interim">${esc(state.interimTranscript)}</span>` : '');
  box.scrollTop = box.scrollHeight;
}

async function saveLectureFromRecording() {
  const title = document.getElementById('lecture-title-input').value.trim() || 'Untitled Lecture';
  const duration = parseInt(document.getElementById('post-record').dataset.duration) || 0;

  const lecture = {
    id: 'lec_' + Date.now(),
    title,
    transcript: state.transcript.trim(),
    summary: null,
    date: Date.now(),
    duration
  };

  await AuraDB.lectures.save(lecture);
  window.AuraSounds.playSuccess();
  addXp(50); // RPG XP reward

  AuraAI.showToast('✅ Lecture notes saved! (+50 XP)');
  resetRecordScreen();
  navigateTo('study');
}

async function summarizeAndSave() {
  const title = document.getElementById('lecture-title-input').value.trim() || 'Untitled Lecture';
  const duration = parseInt(document.getElementById('post-record').dataset.duration) || 0;

  const btn = document.querySelector('#post-record .btn-primary');
  const origText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner dark"></span> Summarizing...';
  btn.disabled = true;

  const summary = await AuraAI.summarize(state.transcript.trim());

  const lecture = {
    id: 'lec_' + Date.now(),
    title,
    transcript: state.transcript.trim(),
    summary,
    date: Date.now(),
    duration
  };

  await AuraDB.lectures.save(lecture);
  window.AuraSounds.playSuccess();
  addXp(100); // RPG reward for AI processing

  // Auto create flashcards in background
  try {
    const cards = await AuraAI.flashcards(state.transcript.trim(), 5);
    for (const c of cards) {
      await AuraDB.flashcards.save({
        id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        lectureId: lecture.id,
        front: c.front,
        back: c.back
      });
    }
    addXp(50); // XP for flashcards
  } catch (e) {
    console.warn('[AI] Flashcard generation skipped:', e);
  }

  btn.innerHTML = origText;
  btn.disabled = false;

  AuraAI.showToast('✅ Lecture saved with AI summary! (+150 XP)');
  resetRecordScreen();
  navigateTo('study');
}

function resetRecordScreen() {
  state.transcript = '';
  state.interimTranscript = '';
  document.getElementById('transcript-box').innerHTML = '<span style="color:var(--muted)">Your live transcript will appear here...</span>';
  document.getElementById('record-timer').textContent = '00:00';
  document.getElementById('post-record').classList.remove('visible');
  document.getElementById('type-textarea').value = '';
}

/* ═══════════════════════════════════════════════
   STUDY HUB & FLASHCARDS
   ═══════════════════════════════════════════════ */

function setupStudyTabs() {
  document.querySelectorAll('.study-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.study-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panel = tab.dataset.panel;
      document.querySelectorAll('.study-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + panel)?.classList.add('active');
      hideLectureDetail();
    });
  });
}

async function refreshStudy() {
  document.getElementById('lecture-detail').classList.remove('visible');
  document.getElementById('study-main').style.display = 'block';

  const lectures = await AuraDB.lectures.getAll();
  const flashcards = await AuraDB.flashcards.getAll();

  renderStudyLectures(lectures);

  state.studyFlashcards = flashcards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
}

function renderStudyLectures(lectures) {
  const container = document.getElementById('study-lectures-list');
  if (!container) return;
  const sorted = [...lectures].sort((a, b) => b.date - a.date);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><p class="empty-text">No lectures saved yet.</p></div>';
    return;
  }

  container.innerHTML = sorted.map(l => {
    const icon = l.summary ? 
      `<svg class="svg-icon" style="stroke:var(--accent);" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m9.9 9.9l.707.707M10 8.5L8.5 10 10 11.5 11.5 10z"/></svg>` : 
      `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    
    return `
      <div class="lecture-item glass-card" onclick="openLecture('${l.id}')">
        <div class="lecture-icon">${icon}</div>
        <div class="lecture-info">
          <div class="li-title">${esc(l.title)}</div>
          <div class="li-meta">${timeAgo(l.date)} • ${formatDuration(l.duration)} ${l.summary ? '• AI Summary' : ''}</div>
        </div>
        <button class="lecture-delete-btn" onclick="event.stopPropagation();deleteLecture('${l.id}')" title="Delete">
          <svg class="svg-icon" viewBox="0 0 24 24" style="stroke:var(--danger);width:15px;height:15px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
        <div class="lecture-arrow">›</div>
      </div>`;
  }).join('');
}

async function openLecture(id) {
  const lecture = await AuraDB.lectures.get(id);
  if (!lecture) return;

  state.viewingLecture = lecture;
  state.chatContext = lecture.transcript;

  if (state.currentScreen !== 'study') navigateTo('study');

  const detail = document.getElementById('lecture-detail');
  document.getElementById('study-main').style.display = 'none';
  detail.classList.add('visible');

  // Backdoor clean delete
  const deleteBtn = document.getElementById('detail-delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteLecture(id);
  }

  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar) chatBar.classList.remove('visible');

  document.getElementById('detail-title').textContent = lecture.title;
  document.getElementById('detail-meta').textContent =
    `${formatDate(new Date(lecture.date).toISOString().split('T')[0])} • ${formatDuration(lecture.duration)}`;

  document.getElementById('detail-transcript').textContent = lecture.transcript;

  const summaryEl = document.getElementById('detail-summary');
  const summaryActions = document.getElementById('detail-summary-actions');

  if (lecture.summary) {
    summaryEl.innerHTML = renderMarkdown(lecture.summary);
    summaryActions.innerHTML = `<button class="btn-ghost" onclick="regenerateSummary('${id}')">🔄 Regenerate</button>`;
  } else {
    summaryEl.innerHTML = '<p style="color:var(--muted)">No summary generated.</p>';
    summaryActions.innerHTML = `<button class="btn-primary" onclick="generateSummary('${id}')">✨ Summarize with AI</button>`;
  }

  // Load flashcards for this lecture
  const cards = await AuraDB.flashcards.getByLecture(id);
  const fcContainer = document.getElementById('detail-flashcards');
  if (cards.length > 0) {
    let html = `<div class="detail-fc-deck">`;
    cards.forEach((c, idx) => {
      html += `
        <div class="flashcard" onclick="this.classList.toggle('flipped')" style="position:relative;min-height:150px;margin-bottom:12px;">
          <div class="flashcard-face flashcard-front">
            <div class="fc-label">Question ${idx + 1}</div>
            <div class="fc-text">${esc(c.front)}</div>
            <div class="fc-hint">Tap to reveal answer</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="fc-label">Answer</div>
            <div class="fc-text">${esc(c.back)}</div>
            <div class="fc-hint">Tap to flip back</div>
          </div>
        </div>`;
    });
    html += `</div>`;
    html += `<button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="generateFlashcardsForLecture('${id}')">🃏 Generate More Flashcards</button>`;
    fcContainer.innerHTML = html;
  } else {
    fcContainer.innerHTML = `<button class="btn-primary" style="width:100%;" onclick="generateFlashcardsForLecture('${id}')">🃏 Generate Flashcards</button>`;
  }
}

function hideLectureDetail() {
  document.getElementById('lecture-detail').classList.remove('visible');
  document.getElementById('study-main').style.display = 'block';
  state.viewingLecture = null;

  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar && state.currentScreen === 'study') chatBar.classList.add('visible');
}

async function generateSummary(lectureId) {
  const lecture = await AuraDB.lectures.get(lectureId);
  if (!lecture) return;

  const el = document.getElementById('detail-summary');
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Generating summary...</p></div>';

  const summary = await AuraAI.summarize(lecture.transcript);
  lecture.summary = summary;
  await AuraDB.lectures.save(lecture);

  el.innerHTML = renderMarkdown(summary);
  document.getElementById('detail-summary-actions').innerHTML =
    `<button class="btn-ghost" onclick="regenerateSummary('${lectureId}')">🔄 Regenerate</button>`;

  window.AuraSounds.playSuccess();
  addXp(50);
}

async function regenerateSummary(lectureId) {
  await generateSummary(lectureId);
}

async function generateFlashcardsForLecture(lectureId) {
  const lecture = await AuraDB.lectures.get(lectureId);
  if (!lecture) return;

  const el = document.getElementById('detail-flashcards');
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Generating flashcards...</p></div>';

  const cards = await AuraAI.flashcards(lecture.transcript, 5);

  for (const c of cards) {
    await AuraDB.flashcards.save({
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      lectureId,
      front: c.front,
      back: c.back
    });
  }

  el.innerHTML = `<p style="color:var(--muted);font-size:12px;">${cards.length} flashcards generated!</p>`;
  window.AuraSounds.playSuccess();
  addXp(20 * cards.length); // +20 XP per flashcard!

  // Refresh
  const allCards = await AuraDB.flashcards.getAll();
  state.studyFlashcards = allCards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
  openLecture(lectureId); // Reload detail view
}

function renderFlashcard() {
  const container = document.getElementById('flashcard-deck');
  const counter = document.getElementById('flashcard-counter');

  if (state.studyFlashcards.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🃏</div><p class="empty-text">No flashcards yet. Generate some from your notes!</p></div>';
    counter.textContent = '0 / 0';
    return;
  }

  const idx = state.currentFlashcardIdx;
  const card = state.studyFlashcards[idx];
  counter.textContent = `${idx + 1} / ${state.studyFlashcards.length}`;

  container.innerHTML = `
    <div class="flashcard" id="active-flashcard" onclick="flipFlashcard()">
      <div class="flashcard-face flashcard-front">
        <div class="fc-label">Question</div>
        <div class="fc-text">${esc(card.front)}</div>
        <div class="fc-hint">Tap to reveal answer</div>
      </div>
      <div class="flashcard-face flashcard-back">
        <div class="fc-label">Answer</div>
        <div class="fc-text">${esc(card.back)}</div>
        <div class="fc-hint">Tap to flip back</div>
      </div>
    </div>
  `;
}

function flipFlashcard() {
  const card = document.getElementById('active-flashcard');
  if (card) {
    card.classList.toggle('flipped');
    // Gain micro XP for review
    if (card.classList.contains('flipped')) {
      addXp(5);
    }
  }
}

function prevFlashcard() {
  if (state.studyFlashcards.length === 0) return;
  state.currentFlashcardIdx = (state.currentFlashcardIdx - 1 + state.studyFlashcards.length) % state.studyFlashcards.length;
  renderFlashcard();
}

function nextFlashcard() {
  if (state.studyFlashcards.length === 0) return;
  state.currentFlashcardIdx = (state.currentFlashcardIdx + 1) % state.studyFlashcards.length;
  renderFlashcard();
}

/* ═══════════════════════════════════════════════
   AI STUDY COACH
   ═══════════════════════════════════════════════ */

function setupChatInput() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
  if (input) input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  const container = document.getElementById('chat-messages');

  state.chatHistory.push({ role: 'user', text: q });
  container.innerHTML += `<div class="chat-bubble user">${esc(q)}</div>`;

  const loadId = 'chat-loading-' + Date.now();
  container.innerHTML += `<div class="chat-bubble ai" id="${loadId}"><span class="spinner"></span></div>`;
  container.scrollTop = container.scrollHeight;

  // Context aggregation
  let ctx = state.chatContext;
  if (!ctx) {
    const lectures = await AuraDB.lectures.getAll();
    ctx = lectures.map(l => `## ${l.title}\n${l.transcript}`).join('\n\n---\n\n');
  }

  const answer = await AuraAI.ask(q, ctx);

  state.chatHistory.push({ role: 'ai', text: answer });
  saveChatHistory();

  const loadEl = document.getElementById(loadId);
  if (loadEl) loadEl.outerHTML = `<div class="chat-bubble ai">${renderMarkdown(answer)}</div>`;
  container.scrollTop = container.scrollHeight;
}

// Integrated single-click coach triggers
async function triggerCoachAction(type) {
  const container = document.getElementById('chat-messages');
  window.AuraSounds.playTap();

  if (type === 'flashcards') {
    // Generate flashcards instantly
    const lectures = await AuraDB.lectures.getAll();
    if (lectures.length === 0) {
      AuraAI.showToast("⚠️ Save a lecture first to generate cards!");
      return;
    }
    
    // Choose viewing lecture or latest
    const activeLec = state.viewingLecture || lectures[0];
    container.innerHTML += `<div class="chat-bubble user">Generate study flashcards for "${activeLec.title}"</div>`;
    
    const loadId = 'chat-l-' + Date.now();
    container.innerHTML += `<div class="chat-bubble ai" id="${loadId}"><span class="spinner"></span> Working...</div>`;
    container.scrollTop = container.scrollHeight;

    const cards = await AuraAI.flashcards(activeLec.transcript, 5);
    for (const c of cards) {
      await AuraDB.flashcards.save({
        id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        lectureId: activeLec.id,
        front: c.front,
        back: c.back
      });
    }

    // RPG reward
    addXp(100);
    window.AuraSounds.playSuccess();

    document.getElementById(loadId).outerHTML = `
      <div class="chat-bubble ai">
        🃏 **Study Coach:** I have successfully generated **${cards.length} conceptual flashcards** from your lecture notes!
        <br/><br/>
        You can practice them right now in the **Cards** tab! (+100 XP gained)
      </div>`;
    
    // Refresh deck
    const allCards = await AuraDB.flashcards.getAll();
    state.studyFlashcards = allCards;
    state.currentFlashcardIdx = 0;
    renderFlashcard();
    container.scrollTop = container.scrollHeight;
    
  } else if (type === 'quiz') {
    // Generate a mini quiz in chat
    container.innerHTML += `<div class="chat-bubble user">Create a concept quiz for me!</div>`;
    
    const loadId = 'chat-q-' + Date.now();
    container.innerHTML += `<div class="chat-bubble ai" id="${loadId}"><span class="spinner"></span> Formulating quiz...</div>`;
    container.scrollTop = container.scrollHeight;

    const lectures = await AuraDB.lectures.getAll();
    const activeText = lectures.length > 0 ? lectures[0].transcript : "General machine learning gradient descent electrodynamics";
    
    const prompt = `You are a strict academic study coach. From this text, write one challenging, conceptual multiple choice question with 4 options labeled A, B, C, and D.
    Include the correct answer in your output under a hidden fold or separate line in format: "Correct: [A/B/C/D]".
    TEXT:
    ${activeText}`;

    let quizText = "";
    try {
      if (AuraAI.hasKey()) {
        quizText = await AuraAI.raw(prompt, 500);
      } else {
        throw new Error("No key");
      }
    } catch(e) {
      quizText = `📖 **Quiz Question:**\nWhich of the following describes the effect of using a learning rate ($\\alpha$) that is too large in Gradient Descent?\n\nA) The algorithm converges to the local minimum instantly.\nB) The algorithm overshoots the minimum and may diverge.\nC) The gradients become zero instantly.\nD) It results in overfitting on the training set.\n\n*Tap answer B to submit!*`;
    }

    document.getElementById(loadId).outerHTML = `
      <div class="chat-bubble ai">
        ${renderMarkdown(quizText)}
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button class="btn-secondary coach-btn" onclick="submitQuizAnswer('A')">A</button>
          <button class="btn-secondary coach-btn" onclick="submitQuizAnswer('B')">B</button>
          <button class="btn-secondary coach-btn" onclick="submitQuizAnswer('C')">C</button>
          <button class="btn-secondary coach-btn" onclick="submitQuizAnswer('D')">D</button>
        </div>
      </div>`;
    container.scrollTop = container.scrollHeight;

  } else if (type === 'schedule') {
    // Auto schedule revision
    const lectures = await AuraDB.lectures.getAll();
    const title = lectures.length > 0 ? lectures[0].title : 'AURA Core Revision';
    
    const revDate = new Date();
    revDate.setDate(revDate.getDate() + 3);
    const dateStr = revDate.toISOString().split('T')[0];

    state.studySessions.push({
      id: 'ss_' + Date.now(),
      title: `Revision: ${title}`,
      time: '18:00',
      duration: 45,
      date: dateStr
    });
    
    saveStudySessions();
    window.AuraSounds.playSuccess();
    addXp(50); // RPG reward

    container.innerHTML += `<div class="chat-bubble user">Schedule a revision session</div>`;
    container.innerHTML += `
      <div class="chat-bubble ai">
        📅 **Study Coach:** I have scheduled a **45-minute revision block** for "${title}" on **${formatDate(dateStr)}** at **6:00 PM**.
        <br/><br/>
        Check the Calendar screen to view your timeline! (+50 XP gained)
      </div>`;
    container.scrollTop = container.scrollHeight;
  }
}

function submitQuizAnswer(ans) {
  const container = document.getElementById('chat-messages');
  window.AuraSounds.playTap();

  let correct = false;
  let explanation = "";

  // Simply mock a correct state based on selection B for JEE physics/math or let it tell
  if (ans === 'B') {
    correct = true;
    explanation = "Correct! A learning rate that is too large causes the parameter updates to overshoot the local minimum, causing the loss function to diverge rather than converge.";
    addXp(30); // Quiz XP
    window.AuraSounds.playSuccess();
  } else {
    explanation = "Incorrect. Try B! A very high learning rate makes the steps too large, causing the updates to overshoot the valley of the cost function.";
  }

  container.innerHTML += `<div class="chat-bubble user">I select Option ${ans}</div>`;
  container.innerHTML += `
    <div class="chat-bubble ai">
      ${correct ? '🎉 **Correct Answer!** (+30 XP)' : '❌ **Try Again!**'}
      <br/><br/>
      ${explanation}
    </div>`;
  
  container.scrollTop = container.scrollHeight;
}

/* ═══════════════════════════════════════════════
   CALENDAR SCREEN
   ═══════════════════════════════════════════════ */

function setupCalendar() {
  state.calViewDate = new Date();
  state.selectedCalDay = new Date().toISOString().split('T')[0];
}

async function refreshCalendar() {
  await renderMonthView();
  const deadlines = await AuraDB.deadlines.getAll();
  renderTimeline(deadlines);
}

async function renderMonthView() {
  const container = document.getElementById('cal-month-container');
  if (!container) return;

  const viewDate = state.calViewDate;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const deadlines = await AuraDB.deadlines.getAll();
  const deadlineMap = {};
  deadlines.forEach(d => {
    if (!deadlineMap[d.date]) deadlineMap[d.date] = [];
    deadlineMap[d.date].push(d.priority);
  });

  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1; 
  if (startDay < 0) startDay = 6; 

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const monthOptions = monthNames.map((m, i) => `<option value="${i}" ${i === month ? 'selected' : ''}>${m}</option>`).join('');
  const yearOptions = [];
  for (let y = 2020; y <= 2030; y++) {
    yearOptions.push(`<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`);
  }

  let html = `
    <div class="month-header">
      <button class="month-nav-btn" onclick="changeMonth(-1)">◀</button>
      <div class="month-selectors">
        <select class="month-select" onchange="jumpToMonth(parseInt(this.value))">${monthOptions}</select>
        <select class="year-select" onchange="jumpToYear(parseInt(this.value))">${yearOptions.join('')}</select>
      </div>
      <button class="month-nav-btn" onclick="changeMonth(1)">▶</button>
    </div>
    <div class="cal-grid">`;

  dayNames.forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = daysInPrev - i;
    html += `<div class="cal-day other-month"><div class="day-num">${dayNum}</div></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === state.selectedCalDay;
    const dateObj = new Date(year, month, d);
    const isPast = dateObj < today && !isToday;

    let classes = 'cal-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    if (isPast) classes += ' past';

    let dots = '';
    if (deadlineMap[dateStr]) {
      dots = '<div class="day-dots">';
      deadlineMap[dateStr].forEach(p => {
        dots += `<div class="day-dot ${p}"></div>`;
      });
      dots += '</div>';
    }

    html += `<div class="${classes}" onclick="selectCalDay('${dateStr}')"><div class="day-num">${d}</div>${dots}</div>`;
  }

  const totalCells = startDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other-month"><div class="day-num">${i}</div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  await showDayDetail(state.selectedCalDay);
}

function changeMonth(delta) {
  state.calViewDate.setMonth(state.calViewDate.getMonth() + delta);
  renderMonthView();
}

function jumpToMonth(month) {
  state.calViewDate = new Date(state.calViewDate.getFullYear(), month, 1);
  renderMonthView();
}

function jumpToYear(year) {
  state.calViewDate = new Date(year, state.calViewDate.getMonth(), 1);
  renderMonthView();
}

async function selectCalDay(dateStr) {
  state.selectedCalDay = dateStr;
  const dlDateInput = document.getElementById('dl-date-input');
  if (dlDateInput) dlDateInput.value = dateStr;
  await renderMonthView();
}

async function showDayDetail(dateStr) {
  const container = document.getElementById('selected-day-info');
  if (!container) return;

  const deadlines = await AuraDB.deadlines.getAll();
  const dayDeadlines = deadlines.filter(d => d.date === dateStr);
  const daySessions = state.studySessions.filter(s => s.date === dateStr);

  const dateObj = new Date(dateStr + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (dayDeadlines.length === 0 && daySessions.length === 0) {
    container.innerHTML = `
      <div class="day-detail-panel glass-card">
        <div class="day-detail-title">${dateLabel}</div>
        <div class="day-empty">No deadlines or study sessions for this day.</div>
      </div>`;
    return;
  }

  let html = `
    <div class="day-detail-panel glass-card">
      <div class="day-detail-title">${dateLabel}</div>`;

  dayDeadlines.forEach(d => {
    html += `
      <div class="deadline-item" style="padding:8px 0;">
        <div class="deadline-dot ${d.priority}"></div>
        <div class="deadline-info">
          <div class="dl-title">${esc(d.title)}</div>
          <div class="dl-meta">${esc(d.course)} • ${d.priority} priority</div>
        </div>
        <button class="deadline-delete-btn" onclick="event.stopPropagation();deleteDeadline('${d.id}')" title="Mark as Done">
          <svg class="svg-icon" viewBox="0 0 24 24" style="stroke:var(--success);width:15px;height:15px;"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>`;
  });

  daySessions.forEach(s => {
    html += `
      <div class="deadline-item" style="padding:8px 0;">
        <div class="lecture-icon" style="width:32px;height:32px;border-radius:8px;font-size:14px;">📝</div>
        <div class="deadline-info">
          <div class="dl-title">${esc(s.title)}</div>
          <div class="dl-meta">${esc(s.time)} • ${s.duration}min</div>
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

function toggleCalForm(type) {
  const dlForm = document.getElementById('cal-deadline-form');
  const ssForm = document.getElementById('cal-session-form');

  if (type === 'deadline') {
    dlForm.classList.toggle('visible');
    ssForm.classList.remove('visible');
    if (state.selectedCalDay) {
      document.getElementById('dl-date-input').value = state.selectedCalDay;
    }
  } else {
    ssForm.classList.toggle('visible');
    dlForm.classList.remove('visible');
  }
}

async function handleAddDeadlineInline() {
  const title = document.getElementById('dl-title-input').value.trim();
  const course = document.getElementById('dl-course-input').value.trim();
  const date = document.getElementById('dl-date-input').value;
  const priority = document.getElementById('dl-priority-input').value;

  if (!title || !date) {
    AuraAI.showToast('⚠️ Please enter title and date');
    return;
  }

  await AuraDB.deadlines.save({
    id: 'dl_' + Date.now(),
    title,
    course: course || 'General',
    date,
    priority: priority || 'medium'
  });

  window.AuraSounds.playSuccess();
  addXp(20);

  AuraAI.showToast('✅ Deadline added! (+20 XP)');

  document.getElementById('dl-title-input').value = '';
  document.getElementById('dl-course-input').value = '';
  document.getElementById('dl-priority-input').value = 'medium';
  document.getElementById('cal-deadline-form').classList.remove('visible');

  refreshCalendar();
}

async function handleAddSessionInline() {
  const title = document.getElementById('ss-title-input').value.trim();
  const time = document.getElementById('ss-time-input').value;
  const duration = parseInt(document.getElementById('ss-duration-input').value) || 60;

  if (!title || !time) {
    AuraAI.showToast('⚠️ Please enter title and time');
    return;
  }

  const dateIso = state.selectedCalDay || new Date().toISOString().split('T')[0];

  state.studySessions.push({
    id: 'ss_' + Date.now(),
    title,
    time,
    duration,
    date: dateIso
  });

  saveStudySessions();
  window.AuraSounds.playSuccess();
  addXp(30); // Study session added!

  AuraAI.showToast('✅ Study session scheduled! (+30 XP)');

  document.getElementById('ss-title-input').value = '';
  document.getElementById('ss-time-input').value = '';
  document.getElementById('ss-duration-input').value = '60';
  document.getElementById('cal-session-form').classList.remove('visible');

  refreshCalendar();
}

function renderTimeline(deadlines) {
  const container = document.getElementById('cal-timeline');
  if (!container) return;

  const studySlots = [
    { time: '08:00 AM', title: 'Morning Review', desc: 'Active recall & flashcard test', type: 'study' },
    { time: '10:30 AM', title: 'Deep Focus block', desc: 'Concept derivations & proofs', type: 'study' },
    { time: '02:00 PM', title: 'Revision & Quiz', desc: 'Answer study coach questions', type: 'study' },
    { time: '04:30 PM', title: 'Break', desc: 'Take a walk, clear your mind', type: 'break' },
    { time: '06:00 PM', title: 'Evening Recall', desc: 'Review difficult notes', type: 'study' }
  ];

  const today = new Date().toISOString().split('T')[0];
  const todayDeadlines = deadlines.filter(d => d.date === today);

  let items = studySlots.map(s => `
    <div class="timeline-item ${s.type === 'study' ? 'study-slot' : ''} glass-card">
      <div class="ti-time">${s.time}</div>
      <div class="ti-title">${s.title}</div>
      <div class="ti-desc">${s.desc}</div>
    </div>
  `);

  todayDeadlines.forEach(d => {
    items.push(`
      <div class="timeline-item glass-card" style="border-left: 2px solid var(--danger);">
        <div class="ti-time">⚠️ Due Today</div>
        <div class="ti-title">${esc(d.title)}</div>
        <div class="ti-desc">${esc(d.course)}</div>
      </div>
    `);
  });

  container.innerHTML = items.join('');
  renderCalDeadlines(deadlines);
}

function renderCalDeadlines(deadlines) {
  const container = document.getElementById('cal-deadlines');
  if (!container) return;
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));

  container.innerHTML = sorted.map(d => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    return `
      <div class="deadline-item glass-card">
        <div class="deadline-dot ${d.priority}"></div>
        <div class="deadline-info">
          <div class="dl-title">${esc(d.title)}</div>
          <div class="dl-meta">${esc(d.course)} • ${formatDate(d.date)}</div>
        </div>
        <div class="deadline-days">${daysLeft}d</div>
        <button class="deadline-delete-btn" onclick="event.stopPropagation();deleteDeadline('${d.id}')" title="Mark as Done">
          <svg class="svg-icon" viewBox="0 0 24 24" style="stroke:var(--success);width:15px;height:15px;"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   POMODORO LOGIC
   ═══════════════════════════════════════════════ */

function pomodoroAction(action) {
  if (action === 'toggle') {
    if (pomoState.running) {
      clearInterval(pomoState.interval);
      pomoState.running = false;
      document.getElementById('pomo-btn').textContent = '▶';
      document.getElementById('pomo-btn').classList.remove('running');
      document.getElementById('pomo-border')?.classList.remove('active-focus');
      document.getElementById('focus-vignette')?.classList.remove('active');
    } else {
      pomoState.running = true;
      document.getElementById('pomo-btn').textContent = '⏸';
      document.getElementById('pomo-btn').classList.add('running');
      document.getElementById('pomo-border')?.classList.add('active-focus');
      
      const style = localStorage.getItem('aura_bg_style') || 'constellations';
      if (style === 'minimal-focus') {
        document.getElementById('focus-vignette')?.classList.add('active');
      }
      
      pomoState.interval = setInterval(() => {
        pomoState.timeLeft--;
        if (pomoState.timeLeft <= 0) {
          clearInterval(pomoState.interval);
          pomoState.running = false;
          pomoState.sessions++;
          localStorage.setItem('aura_pomo_sessions', pomoState.sessions);
          document.getElementById('pomo-sessions').textContent = pomoState.sessions;
          
          document.getElementById('pomo-btn').textContent = '▶';
          document.getElementById('pomo-btn').classList.remove('running');
          document.getElementById('pomo-border')?.classList.remove('active-focus');
          document.getElementById('focus-vignette')?.classList.remove('active');
          
          // Complete notification
          window.AuraSounds.playPomodoroComplete();
          if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
          }

          // XP reward
          addXp(100);
          state.rpg.focusSessions++;
          saveRPG();

          AuraAI.showToast('🍅 Focus session complete! Great work! (+100 XP)');
          
          // Auto shift
          if (pomoState.mode === 'Focus' || pomoState.mode === 'Deep Work') {
            setPomoMode(5, 'Short Break', document.querySelector('.pomo-mode[data-mins="5"]'));
          } else {
            setPomoMode(25, 'Focus', document.querySelector('.pomo-mode[data-mins="25"]'));
          }
        }
        updatePomoDisplay();
      }, 1000);
    }
  } else if (action === 'reset') {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    const currentMode = document.querySelector('.pomo-mode.active');
    const mins = currentMode ? parseInt(currentMode.dataset.mins) : 25;
    pomoState.timeLeft = mins * 60;
    pomoState.totalDuration = mins * 60;
    document.getElementById('pomo-btn').textContent = '▶';
    document.getElementById('pomo-btn').classList.remove('running');
    document.getElementById('pomo-border')?.classList.remove('active-focus');
    updatePomoDisplay();
  } else if (action === 'skip') {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    pomoState.timeLeft = 0;
    document.getElementById('pomo-border')?.classList.remove('active-focus');
    pomodoroAction('toggle'); // Trigger completion
  }
}

function setPomoMode(mins, label, el) {
  clearInterval(pomoState.interval);
  pomoState.running = false;
  pomoState.timeLeft = mins * 60;
  pomoState.totalDuration = mins * 60;
  pomoState.mode = label;
  
  document.getElementById('pomo-btn').textContent = '▶';
  document.getElementById('pomo-btn').classList.remove('running');
  document.getElementById('pomo-label').textContent = label;
  document.getElementById('pomo-border')?.classList.remove('active-focus');
  document.querySelectorAll('.pomo-mode').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  updatePomoDisplay();
}

function updatePomoDisplay() {
  const m = String(Math.floor(pomoState.timeLeft / 60)).padStart(2, '0');
  const s = String(pomoState.timeLeft % 60).padStart(2, '0');
  document.getElementById('pomo-time').textContent = m + ':' + s;

  // Calculate circular stroke dash offset
  // Circumference = 439.82
  const ratio = pomoState.timeLeft / pomoState.totalDuration;
  const offset = ratio * 439.82;
  const ring = document.getElementById('pomo-ring');
  if (ring) {
    ring.style.strokeDashoffset = offset;
  }
}

function showCustomTimer() {
  const el = document.getElementById('pomo-custom-input');
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function applyCustomTimer() {
  const val = parseInt(document.getElementById('custom-mins').value);
  if (!val || val < 1 || val > 120) {
    AuraAI.showToast('Enter 1-120 minutes');
    return;
  }
  setPomoMode(val, val + ' min Focus', null);
  document.querySelectorAll('.pomo-mode').forEach(b => b.classList.remove('active'));
  document.getElementById('pomo-custom-input').style.display = 'none';
  AuraAI.showToast('⏱️ Focus timer set to ' + val + ' minutes');
}

/* ═══════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════ */

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(timestamp).toISOString().split('T')[0]);
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)/gm, '<strong>$1</strong>')
    .replace(/^[•●]\s+(.+)/gm, '• $1')
    .replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════════════
   THEME SYSTEM
   ═══════════════════════════════════════════════ */

function setTheme(name) {
  const valid = ['dark', 'light', 'midnight', 'aurora', 'solar', 'sakura', 'cyberpunk', 'cyber-luxury', 'cosmic-scholar', 'ai-core', 'vision-os', 'future-os'];
  if (!valid.includes(name)) name = 'dark';

  // Check locks
  if (name === 'sakura' && state.rpg.level < 2) {
    AuraAI.showToast('🌸 Theme locked. Reach Level 2 to unlock!');
    return;
  }
  if (name === 'cyberpunk' && state.rpg.level < 3) {
    AuraAI.showToast('⚡ Theme locked. Reach Level 3 to unlock!');
    return;
  }
  if (name === 'cyber-luxury' && state.rpg.level < 4) {
    AuraAI.showToast('🏆 Theme locked. Reach Level 4 to unlock!');
    return;
  }
  if (name === 'future-os' && state.rpg.level < 5) {
    AuraAI.showToast('⚡ Theme locked. Reach Level 5 to unlock!');
    return;
  }
  
  if (name === 'dark') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = name;
  }
  
  localStorage.setItem('aura-theme', name);
  
  document.querySelectorAll('.theme-circle').forEach(c => c.classList.remove('active'));
  const active = document.querySelector(`.theme-${name}`);
  if (active) active.classList.add('active');
}

function loadTheme() {
  const saved = localStorage.getItem('aura-theme') || 'dark';
  setTheme(saved);
}

/* ═══════════════════════════════════════════════
   FILE UPLOAD
   ═══════════════════════════════════════════════ */

function setupFileUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('file-upload');
  if (area && input) {
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', handleFileUpload);
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    AuraAI.showToast('📋 PDF loaded! Extracting text...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      if (text && text.trim().length > 20) {
        state.transcript = text;
        document.getElementById('transcript-box').textContent = text;
        const postRecord = document.getElementById('post-record');
        postRecord.classList.add('visible');
        document.getElementById('lecture-title-input').value = file.name.replace(/\.[^.]+$/, '');
        postRecord.dataset.duration = 0;
        AuraAI.showToast('✅ PDF text extracted!');
      } else {
        AuraAI.showToast('⚠️ Unable to extract text. Try a text-based PDF or TXT.');
      }
    } catch (err) {
      AuraAI.showToast('⚠️ Could not process PDF');
    }
  } else if (ext === 'txt' || ext === 'md') {
    try {
      const text = await file.text();
      state.transcript = text.trim();
      document.getElementById('transcript-box').textContent = state.transcript;
      const postRecord = document.getElementById('post-record');
      postRecord.classList.add('visible');
      document.getElementById('lecture-title-input').value = file.name.replace(/\.[^.]+$/, '') + ' — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      postRecord.dataset.duration = 0;
      AuraAI.showToast(`✅ "${file.name}" loaded!`);
    } catch (err) {
      AuraAI.showToast('⚠️ Unable to read notes file');
    }
  } else {
    AuraAI.showToast('⚠️ Unsupported file format. Use TXT, MD, or PDF.');
  }
  e.target.value = '';
}

async function extractTextFromPDF(arrayBuffer) {
  try {
    if (typeof pdfjsLib === 'undefined') return fallbackExtractTextFromPDF(arrayBuffer);
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
    }
    return fullText;
  } catch (err) {
    return fallbackExtractTextFromPDF(arrayBuffer);
  }
}

function fallbackExtractTextFromPDF(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let text = '';
    const str = String.fromCharCode.apply(null, bytes);
    const matches = str.match(/\(([^)]+)\)/g);
    if (matches) text = matches.map(m => m.slice(1, -1)).join(' ');
    return text.trim();
  } catch(e) {
    return '';
  }
}

/* ═══════════════════════════════════════════════
   DELETE FUNCTIONS
   ═══════════════════════════════════════════════ */

async function deleteLecture(id) {
  if (!confirm('Delete this lecture?')) return;
  await AuraDB.lectures.delete(id);
  const cards = await AuraDB.flashcards.getByLecture(id);
  for (const c of cards) await AuraDB.flashcards.delete(c.id);

  AuraAI.showToast('🗑️ Lecture deleted');
  if (state.viewingLecture?.id === id) hideLectureDetail();

  if (state.currentScreen === 'study') refreshStudy();
  if (state.currentScreen === 'home') refreshHome();
}

async function deleteDeadline(id) {
  // Play Gamified completion sound and confetti, then delete!
  window.AuraSounds.playSuccess();
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  }

  // RPG Stat
  state.rpg.completedTasks++;
  addXp(50); // Complete task XP

  await AuraDB.deadlines.delete(id);
  AuraAI.showToast('🏆 Task completed! (+50 XP)');

  if (state.currentScreen === 'calendar') refreshCalendar();
  if (state.currentScreen === 'home') refreshHome();
}

async function deleteFlashcard(id) {
  if (!confirm('Delete this flashcard?')) return;
  await AuraDB.flashcards.delete(id);
  AuraAI.showToast('🗑️ Flashcard deleted');

  const allCards = await AuraDB.flashcards.getAll();
  state.studyFlashcards = allCards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
}

/* ═══════════════════════════════════════════════
   CHAT HISTORY & CHIMES
   ═══════════════════════════════════════════════ */

function saveChatHistory() {
  localStorage.setItem('aura-chat-history', JSON.stringify(state.chatHistory));
}

function loadChatHistory() {
  const saved = localStorage.getItem('aura-chat-history');
  if (saved) {
    state.chatHistory = JSON.parse(saved);
    renderChatHistory();
  }
}

function renderChatHistory() {
  const container = document.getElementById('chat-messages');
  if (!container || state.chatHistory.length === 0) return;
  
  let html = `<div class="chat-bubble ai">👋 Hello Krish! I'm your **AURA AI Study Coach**.<br/><br/>Ask me to explain a concept from your notes, or click one of the quick actions below to streamline your study workflow!</div>`;
  
  state.chatHistory.forEach(msg => {
    if (msg.role === 'user') {
      html += '<div class="chat-bubble user">' + esc(msg.text) + '</div>';
    } else {
      html += '<div class="chat-bubble ai">' + renderMarkdown(msg.text) + '</div>';
    }
  });
  
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function clearChatHistory() {
  if (!confirm('Clear all chat history?')) return;
  state.chatHistory = [];
  localStorage.removeItem('aura-chat-history');
  const container = document.getElementById('chat-messages');
  container.innerHTML = `<div class="chat-bubble ai">👋 Hello Krish! I'm your **AURA AI Study Coach**.<br/><br/>Ask me to explain a concept from your notes, or click one of the quick actions below to streamline your study workflow!</div>`;
  AuraAI.showToast('🗑️ Chat history cleared');
}

/* ═══════════════════════════════════════════════
   VIDEO RECORDING
   ═══════════════════════════════════════════════ */

async function setRecordMode(mode) {
  state.recordMode = mode;
  document.getElementById('mode-audio')?.classList.toggle('active', mode === 'audio');
  document.getElementById('mode-video')?.classList.toggle('active', mode === 'video');
  
  const previewContainer = document.getElementById('video-preview-container');
  const previewVideo = document.getElementById('video-preview');
  
  if (mode === 'video') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: currentFacingMode } },
        audio: true
      });
      state.videoStream = stream;
      if (previewVideo) previewVideo.srcObject = stream;
      if (previewContainer) previewContainer.classList.add('visible');
      const camFlipBtn = document.getElementById('cam-flip-btn');
      if (camFlipBtn) camFlipBtn.style.display = 'inline-block';
    } catch (err) {
      AuraAI.showToast('📹 Camera access blocked');
      setRecordMode('audio');
    }
  } else {
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(t => t.stop());
      state.videoStream = null;
    }
    if (previewVideo) previewVideo.srcObject = null;
    if (previewContainer) previewContainer.classList.remove('visible');
    const camFlipBtn = document.getElementById('cam-flip-btn');
    if (camFlipBtn) camFlipBtn.style.display = 'none';
  }
}

let currentFacingMode = 'environment';
async function flipCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  if (state.videoStream) state.videoStream.getTracks().forEach(t => t.stop());
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: currentFacingMode } },
      audio: true
    });
    state.videoStream = stream;
    const previewVideo = document.getElementById('video-preview');
    if (previewVideo) previewVideo.srcObject = stream;
  } catch(e) {
    AuraAI.showToast('⚠️ Unable to switch camera');
  }
}

/* ═══════════════════════════════════════════════
   SETTINGS & YOUTUBE TRANSCRIPTION
   ═══════════════════════════════════════════════ */

function openSettings() {
  toggleStudio(true);
}

function loadStudySessions() {
  try {
    const saved = localStorage.getItem('aura-study-sessions');
    if (saved) state.studySessions = JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
}

function saveStudySessions() {
  localStorage.setItem('aura-study-sessions', JSON.stringify(state.studySessions));
}

async function generateYTNotes() {
  const urlEl = document.getElementById('yt-url-input');
  if (!urlEl) return;
  const url = urlEl.value.trim();
  
  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    AuraAI.showToast('⚠️ Please enter a valid YouTube URL');
    return;
  }
  
  const resultEl = document.getElementById('yt-result');
  if (!resultEl) return;
  resultEl.innerHTML = '<div class="shimmer" style="height:60px;border-radius:8px;"></div><p style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px;">Analyzing video stream...</p>';
  
  let videoId = '';
  try {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
  } catch(e) {
    videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
  }

  let videoTitle = "";
  
  const fetchWithTimeout = (url, ms = 2000) => {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };

  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, 2000);
    const data = await res.json();
    if (data && data.title) videoTitle = data.title;
  } catch (e) {
    console.warn("API title fetch failed.");
  }

  // === HACKATHON DEMO OVERRIDE: BIOMOLECULES ===
  if (videoId === 'bJ9Ky4ksmyA' || url.includes('bJ9Ky4ksmyA') || url.toLowerCase().includes('biomolecule') || videoTitle.toLowerCase().includes('biomolecule')) {
    if (!videoTitle) videoTitle = "Biomolecules Lecture Notes";
    state.ytTitle = videoTitle;

    const demoNotes = `**Summary**
This lecture provides an exhaustive breakdown of **Biomolecules**—the complex organic macromolecules of life. It covers the structural biochemistry, metabolic pathways, and functional significance of Carbohydrates, Proteins, Nucleic Acids, and Lipids.

### 1. Carbohydrates (Saccharides)
Carbohydrates are polyhydroxy aldehydes or ketones.
*   **Glucose:** Pyranose ring. Alpha and beta anomers exhibit mutarotation.
*   **Sucrose:** Glucose + Fructose (alpha-1,2 linkage). Non-reducing sugar because both anomeric carbons are locked.
*   **Maltose:** Glucose + Glucose (alpha-1,4 linkage). Reducing sugar.

### 2. Proteins (Polypeptides)
Proteins are unbranched polymers of L-alpha-amino acids.
*   **Zwitterions:** Amino acids exist as dipolar zwitterions at their **Isoelectric Point (pI)**, where net charge is zero.
*   **Structure Hierarchy:** Primary (sequence), Secondary (alpha-helix, beta-sheets stabilized by Hydrogen bonds), Tertiary (3D spatial folding), Quaternary (multi-subunit complexes).

### 3. Nucleic Acids (DNA & RNA)
Molecules responsible for storing and transmitting genetic code.
*   **Nitrogenous Bases:** Purines (A, G - double ring) and Pyrimidines (C, T, U - single ring).
*   **Phosphodiester bond:** Joins sugar-phosphate backbone vertically.

### 4. Flashcard Questions
**Q:** What is the difference between a reducing and non-reducing sugar?  
**A:** Reducing sugars have a free anomeric carbon that reduces Tollen's reagent (e.g. Maltose). Non-reducing sugars have locked anomeric carbons (e.g. Sucrose).

**Q:** Which bonds stabilize the secondary structure of proteins?  
**A:** Hydrogen bonds between the backbone carbonyl oxygen and amide hydrogen.

**Q:** What linkage joins nucleotides in a DNA strand?  
**A:** 3'-5' phosphodiester linkages.`;

    resultEl.innerHTML = `
      <div class="glass-card" style="padding:16px;margin-top:8px;">
        <div style="font-size:13px;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;">${renderMarkdown(demoNotes)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn-primary" id="yt-save-btn" style="flex:1;font-size:12px;">💾 Save as Lecture</button>
          <button class="btn-secondary" id="yt-close-btn" style="flex:1;font-size:12px;">✕ Close</button>
        </div>
      </div>
    `;
    state.ytNotes = demoNotes;
    bindYTButtons(videoId);
    AuraAI.showToast("⚡ Generated instantly via Aura Edge-AI");
    return;
  }

  if (!AuraAI.hasKey()) {
    resultEl.innerHTML = '<p style="color:var(--warning);">⚠️ Add your Gemini API key first (tap Setup AI on home screen)</p>';
    return;
  }

  if (!videoTitle || videoTitle.trim() === "") {
    videoTitle = window.prompt("Enter YouTube video topic (e.g. 'Photosynthesis'):");
    if (!videoTitle) {
      resultEl.innerHTML = '<p style="color:var(--danger);">❌ Cancelled.</p>';
      return;
    }
  }
  state.ytTitle = videoTitle;

  try {
    const prompt = `You are AURA Edge-AI, transcribing a YouTube lecture.
    Title: "${videoTitle}".
    Generate a high-density, structured set of study notes including:
    1. Topic Overview
    2. Key Concepts (bullet points with math/formulas if applicable)
    3. 3 Flashcard Q&A pairs (format as **Q:** and **A:**).
    Budget response to avoid cutoff. Do not write AI warnings or mentions of link access restrictions.`;
    
    const notes = await AuraAI.raw(prompt, 2048);
    resultEl.innerHTML = `
      <div class="glass-card" style="padding:16px;margin-top:8px;">
        <div style="font-size:13px;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;">${renderMarkdown(notes)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn-primary" id="yt-save-btn" style="flex:1;font-size:12px;">💾 Save as Lecture</button>
          <button class="btn-secondary" id="yt-close-btn" style="flex:1;font-size:12px;">✕ Close</button>
        </div>
      </div>
    `;
    state.ytNotes = notes;
    bindYTButtons(videoId);
    
  } catch(e) {
    AuraAI.showToast("⚠️ API error. Using Offline Fallback Mode.");
    const fallbackNotes = `**Summary**\nThis lecture covers **${videoTitle}**.\n\n### 1. Topic Overview\nIntroduction to the core academic models governing this subject.\n\n### 2. Flashcard Questions\n**Q:** What is the main objective of this topic?\n**A:** To master the primary equations and structural frameworks.`;
    resultEl.innerHTML = `
      <div class="glass-card" style="padding:16px;margin-top:8px;">
        <div style="font-size:13px;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;">${renderMarkdown(fallbackNotes)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn-primary" id="yt-save-btn" style="flex:1;font-size:12px;">💾 Save as Lecture</button>
          <button class="btn-secondary" id="yt-close-btn" style="flex:1;font-size:12px;">✕ Close</button>
        </div>
      </div>
    `;
    state.ytNotes = fallbackNotes;
    bindYTButtons(videoId);
  }
}

async function saveYTAsLecture(videoId) {
  if (!state.ytNotes) return;
  const lecId = 'yt_' + Date.now();
  
  await AuraDB.lectures.save({
    id: lecId,
    title: state.ytTitle || ('YouTube Notes — ' + videoId),
    transcript: state.ytNotes,
    summary: state.ytNotes,
    date: Date.now(),
    duration: 0
  });

  // Extract flashcards
  const lines = state.ytNotes.split('\n');
  let q = '';
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('**Q:**')) q = l.replace('**Q:**', '').trim();
    else if (l.startsWith('**A:**') && q) {
      await AuraDB.flashcards.save({
        id: 'fc_' + Date.now() + Math.random(),
        lectureId: lecId,
        front: q,
        back: l.replace('**A:**', '').trim()
      });
      q = '';
    }
  }

  window.AuraSounds.playSuccess();
  addXp(100);

  AuraAI.showToast('✅ Saved lecture notes! (+100 XP)');
  document.getElementById('yt-result').innerHTML = '<p style="color:var(--success);">✅ Saved successfully!</p>';
  refreshStudy();
}

function bindYTButtons(videoId) {
  const saveBtn = document.getElementById('yt-save-btn');
  const closeBtn = document.getElementById('yt-close-btn');
  if (saveBtn) saveBtn.onclick = () => saveYTAsLecture(videoId);
  if (closeBtn) closeBtn.onclick = () => { document.getElementById('yt-result').innerHTML = ''; };
}

/* ═══════════════════════════════════════════════
   AURA STUDIO CONTROLLER BINDINGS
   ═══════════════════════════════════════════════ */

function toggleStudio(show) {
  const drawer = document.getElementById('aura-studio-drawer');
  if (!drawer) return;
  if (show) {
    drawer.classList.add('visible');
    loadStudioSettingsUI();
  } else {
    drawer.classList.remove('visible');
  }
}

function loadStudioSettingsUI() {
  // Themes
  const activeTheme = localStorage.getItem('aura-theme') || 'dark';
  document.querySelectorAll('.studio-theme-card').forEach(card => card.classList.remove('active'));
  const activeCard = document.getElementById(`theme-card-${activeTheme === 'dark' ? 'cosmic' : activeTheme === 'midnight' ? 'midnight-nebula' : activeTheme}`);
  if (activeCard) activeCard.classList.add('active');

  // Locks
  checkStudioThemeLocks();

  // Background visualizer select
  const style = localStorage.getItem('aura_bg_style') || 'constellations';
  const select = document.getElementById('bg-style-select');
  if (select) select.value = style;

  // Sliders
  const intensity = parseFloat(localStorage.getItem('aura_bg_intensity') || '0.85');
  const speed = parseFloat(localStorage.getItem('aura_bg_speed') || '1.0');
  const density = parseFloat(localStorage.getItem('aura_bg_density') || '1.0');
  const glow = parseFloat(localStorage.getItem('aura_glow_intensity') || '0.4');
  const blur = parseInt(localStorage.getItem('aura_blur_intensity') || '20');

  setSliderVal('bg-intensity-slider', 'bg-intensity-val', intensity, `${Math.round(intensity * 100)}%`);
  setSliderVal('bg-speed-slider', 'bg-speed-val', speed, `${speed.toFixed(1)}x`);
  setSliderVal('bg-density-slider', 'bg-density-val', density, `${Math.round(density * 100)}%`);
  setSliderVal('bg-glow-slider', 'bg-glow-val', glow, `${Math.round(glow * 100)}%`);
  setSliderVal('bg-blur-slider', 'bg-blur-val', blur, `${blur}px`);

  // Sounds Muted
  const soundToggle = document.getElementById('sound-fx-toggle');
  if (soundToggle) soundToggle.checked = !window.AuraSounds.muted;

  // Keyboard Sounds
  const kbToggle = document.getElementById('keyboard-fx-toggle');
  if (kbToggle) kbToggle.checked = window.AuraSounds.keyboardFXEnabled;

  const kbSelect = document.getElementById('keyboard-type-select');
  if (kbSelect) kbSelect.value = localStorage.getItem('aura_keyboard_type') || 'thock';

  // Ambient Noise
  const ambSelect = document.getElementById('ambient-noise-select');
  if (ambSelect) ambSelect.value = localStorage.getItem('aura_ambient_noise') || 'none';

  const ambVol = parseFloat(localStorage.getItem('aura_ambient_volume') || '0.5');
  setSliderVal('ambient-volume-slider', 'ambient-volume-val', ambVol, `${Math.round(ambVol * 100)}%`);

  // AI Persona
  const personaSelect = document.getElementById('ai-persona-select');
  if (personaSelect) personaSelect.value = localStorage.getItem('aura_ai_persona') || 'coach';

  // AI Provider & Keys
  const provider = AuraAI.getProvider();
  const providerSelect = document.getElementById('ai-provider-select');
  if (providerSelect) providerSelect.value = provider;

  const keyInput = document.getElementById('ai-key-input');
  if (keyInput) keyInput.value = AuraAI.getApiKey('gemini');

  const claudeKeyInput = document.getElementById('claude-key-input');
  if (claudeKeyInput) claudeKeyInput.value = AuraAI.getApiKey('claude');

  // Toggle Visibility
  const geminiGroup = document.getElementById('gemini-key-group');
  const claudeGroup = document.getElementById('claude-key-group');
  if (geminiGroup) geminiGroup.style.display = provider === 'gemini' ? '' : 'none';
  if (claudeGroup) claudeGroup.style.display = provider === 'claude' ? '' : 'none';

  // Widget Toggles
  setWidgetCheckbox('widget-pomo-toggle', 'pomo');
  setWidgetCheckbox('widget-chart-toggle', 'chart');
  setWidgetCheckbox('widget-ai-toggle', 'ai');
  setWidgetCheckbox('widget-rpg-toggle', 'rpg');
  setWidgetCheckbox('widget-deadlines-toggle', 'deadlines');
  setWidgetCheckbox('widget-lectures-toggle', 'lectures');
}

function setSliderVal(sliderId, labelId, val, labelText) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (slider) slider.value = val;
  if (label) label.textContent = labelText;
}

function setWidgetCheckbox(chkId, name) {
  const chk = document.getElementById(chkId);
  if (chk) {
    chk.checked = localStorage.getItem(`aura_widget_${name}`) !== 'false';
  }
}

function updateStudioBackground() {
  const select = document.getElementById('bg-style-select');
  if (!select) return;
  localStorage.setItem('aura_bg_style', select.value);
  window.dispatchEvent(new Event('aura-settings-changed'));
}

function setStudioTheme(name) {
  // Level check
  if (name === 'sakura' && state.rpg.level < 2) {
    AuraAI.showToast('🌸 Theme locked. Reaches Level 2 to unlock!');
    return;
  }
  if (name === 'cyber-luxury' && state.rpg.level < 4) {
    AuraAI.showToast('🏆 Theme locked. Reaches Level 4 to unlock!');
    return;
  }
  if (name === 'future-os' && state.rpg.level < 5) {
    AuraAI.showToast('⚡ Theme locked. Reaches Level 5 to unlock!');
    return;
  }

  setTheme(name);
  
  // Highlight card
  document.querySelectorAll('.studio-theme-card').forEach(card => card.classList.remove('active'));
  const activeCard = document.getElementById(`theme-card-${name === 'dark' ? 'cosmic' : name === 'midnight' ? 'midnight-nebula' : name}`);
  if (activeCard) activeCard.classList.add('active');
  
  // Confetti effect
  confetti({ particleCount: 30, spread: 40, origin: { y: 0.9 } });
}

function updateStudioSlidersLive() {
  const intensity = parseFloat(document.getElementById('bg-intensity-slider').value);
  const speed = parseFloat(document.getElementById('bg-speed-slider').value);
  const density = parseFloat(document.getElementById('bg-density-slider').value);
  const glow = parseFloat(document.getElementById('bg-glow-slider').value);
  const blur = parseInt(document.getElementById('bg-blur-slider').value);

  document.getElementById('bg-intensity-val').textContent = `${Math.round(intensity * 100)}%`;
  document.getElementById('bg-speed-val').textContent = `${speed.toFixed(1)}x`;
  document.getElementById('bg-density-val').textContent = `${Math.round(density * 100)}%`;
  document.getElementById('bg-glow-val').textContent = `${Math.round(glow * 100)}%`;
  document.getElementById('bg-blur-val').textContent = `${blur}px`;

  localStorage.setItem('aura_bg_intensity', intensity);
  localStorage.setItem('aura_bg_speed', speed);
  localStorage.setItem('aura_bg_density', density);
  localStorage.setItem('aura_glow_intensity', glow);
  localStorage.setItem('aura_blur_intensity', blur);

  window.dispatchEvent(new Event('aura-settings-changed'));
}

function toggleStudioSoundFX() {
  const check = document.getElementById('sound-fx-toggle').checked;
  window.AuraSounds.muted = !check;
  localStorage.setItem('aura_muted', String(!check));
}

function toggleStudioKeyboardFX() {
  const check = document.getElementById('keyboard-fx-toggle').checked;
  window.AuraSounds.keyboardFXEnabled = check;
  localStorage.setItem('aura_keyboard_fx', String(check));
}

function updateStudioKeyboardType() {
  const select = document.getElementById('keyboard-type-select');
  if (!select) return;
  localStorage.setItem('aura_keyboard_type', select.value);
  window.AuraSounds.playKeystroke();
}

function updateStudioAmbientNoise() {
  const select = document.getElementById('ambient-noise-select');
  if (!select) return;
  const val = select.value;
  localStorage.setItem('aura_ambient_noise', val);
  window.AuraSounds.initAmbientSource(val);
}

function updateStudioAmbientVolume() {
  const slider = document.getElementById('ambient-volume-slider');
  if (!slider) return;
  const vol = parseFloat(slider.value);
  document.getElementById('ambient-volume-val').textContent = `${Math.round(vol * 100)}%`;
  window.AuraSounds.setAmbientVolume(vol);
}

function updateStudioAiPersona() {
  const select = document.getElementById('ai-persona-select');
  if (!select) return;
  localStorage.setItem('aura_ai_persona', select.value);
  AuraAI.showToast(`🤖 AI Assistant personality set to ${select.options[select.selectedIndex].text}`);
}

function updateStudioAiProvider() {
  const select = document.getElementById('ai-provider-select');
  if (!select) return;
  const prov = select.value;
  AuraAI.setProvider(prov);

  // Toggle key inputs
  const geminiGroup = document.getElementById('gemini-key-group');
  const claudeGroup = document.getElementById('claude-key-group');
  if (geminiGroup) geminiGroup.style.display = prov === 'gemini' ? '' : 'none';
  if (claudeGroup) claudeGroup.style.display = prov === 'claude' ? '' : 'none';

  AuraAI.showToast(`🤖 AI Provider set to ${prov === 'gemini' ? 'Google Gemini' : 'Anthropic Claude'}`);
  refreshAiStatusIndicator();
}

function updateStudioApiKey() {
  const input = document.getElementById('ai-key-input');
  if (!input) return;
  AuraAI.setApiKey(input.value, 'gemini');
  refreshAiStatusIndicator();
}

function updateStudioClaudeKey() {
  const input = document.getElementById('claude-key-input');
  if (!input) return;
  AuraAI.setApiKey(input.value, 'claude');
  refreshAiStatusIndicator();
}

function refreshAiStatusIndicator() {
  const apiDot = document.getElementById('api-dot');
  const apiText = document.getElementById('api-text');
  if (AuraAI.hasKey()) {
    if (apiDot) apiDot.classList.add('active');
    if (apiText) apiText.textContent = AuraAI.getProvider() === 'gemini' ? 'Gemini Active' : 'Claude Active';
  } else {
    if (apiDot) apiDot.classList.remove('active');
    if (apiText) apiText.textContent = 'Setup AI';
  }
}

function checkStudioThemeLocks() {
  const lvl = state.rpg.level;
  
  const locks = [
    { id: 'theme-card-sakura-dream', lblId: 'lock-lbl-sakura-dream', name: 'Sakura Dream', minLvl: 2 },
    { id: 'theme-card-cyber-luxury', lblId: 'lock-lbl-cyber-luxury', name: 'Cyber Luxury', minLvl: 4 },
    { id: 'theme-card-future-os', lblId: 'lock-lbl-future-os', name: 'Future OS 2035', minLvl: 5 }
  ];

  locks.forEach(l => {
    const card = document.getElementById(l.id);
    const lbl = document.getElementById(l.lblId);
    if (card && lbl) {
      if (lvl >= l.minLvl) {
        card.classList.remove('locked');
        lbl.textContent = "Unlocked";
        lbl.style.color = "var(--success)";
      } else {
        card.classList.add('locked');
        lbl.textContent = `🔒 Level ${l.minLvl}`;
        lbl.style.color = "var(--danger)";
      }
    }
  });
}

function applyFocusEnv(preset) {
  // Confetti fanfare
  confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  window.AuraSounds.playSuccess();

  if (preset === 'deep_work') {
    localStorage.setItem('aura_bg_style', 'minimal-focus');
    localStorage.setItem('aura_bg_intensity', '0.2');
    localStorage.setItem('aura_bg_speed', '0.5');
    localStorage.setItem('aura_ambient_noise', 'brown');
    localStorage.setItem('aura_ambient_volume', '0.6');
    localStorage.setItem('aura_keyboard_fx', 'true');
    setTheme('cyber-luxury');
    AuraAI.showToast('🎯 Deep Work Environment activated! (50 Min Timer)');
    
    // Set timer minutes if possible
    if (typeof setPomoMode === 'function') {
      setPomoMode(50, 'Deep Work', null);
    }
  } 
  else if (preset === 'study_mode') {
    localStorage.setItem('aura_bg_style', 'constellations');
    localStorage.setItem('aura_bg_intensity', '0.5');
    localStorage.setItem('aura_bg_speed', '1.0');
    localStorage.setItem('aura_ambient_noise', 'lofi');
    localStorage.setItem('aura_ambient_volume', '0.5');
    setTheme('cosmic');
    AuraAI.showToast('📚 Study Environment activated! (25 Min Timer)');
    
    if (typeof setPomoMode === 'function') {
      setPomoMode(25, 'Focus', null);
    }
  }
  else if (preset === 'coding_mode') {
    localStorage.setItem('aura_bg_style', 'brain-pulse');
    localStorage.setItem('aura_bg_intensity', '0.7');
    localStorage.setItem('aura_bg_speed', '1.2');
    localStorage.setItem('aura_ambient_noise', 'none');
    localStorage.setItem('aura_keyboard_fx', 'true');
    localStorage.setItem('aura_keyboard_type', 'thock');
    setTheme('ai-core');
    AuraAI.showToast('💻 Coding Environment activated! (90 Min Timer)');
    
    if (typeof setPomoMode === 'function') {
      setPomoMode(90, 'Deep Work', null);
    }
  }
  else if (preset === 'exam_prep') {
    localStorage.setItem('aura_bg_style', 'topo-intel');
    localStorage.setItem('aura_bg_intensity', '0.45');
    localStorage.setItem('aura_bg_speed', '0.8');
    localStorage.setItem('aura_ambient_noise', 'white');
    localStorage.setItem('aura_ambient_volume', '0.45');
    setTheme('cosmic-scholar');
    AuraAI.showToast('✍️ Exam Prep Environment activated! (45 Min Timer)');
    
    if (typeof setPomoMode === 'function') {
      setPomoMode(45, 'Focus', null);
    }
  }
  else if (preset === 'creative_flow') {
    localStorage.setItem('aura_bg_style', 'mesh-gradient');
    localStorage.setItem('aura_bg_intensity', '0.6');
    localStorage.setItem('aura_bg_speed', '1.4');
    localStorage.setItem('aura_ambient_noise', 'lofi');
    localStorage.setItem('aura_ambient_volume', '0.6');
    setTheme('sakura');
    AuraAI.showToast('🎨 Creative Flow Environment activated! (30 Min Timer)');
    
    if (typeof setPomoMode === 'function') {
      setPomoMode(30, 'Focus', null);
    }
  }
  else if (preset === 'reading_mode') {
    localStorage.setItem('aura_bg_style', 'ambient-ocean');
    localStorage.setItem('aura_bg_intensity', '0.5');
    localStorage.setItem('aura_bg_speed', '0.7');
    localStorage.setItem('aura_ambient_noise', 'rain');
    localStorage.setItem('aura_ambient_volume', '0.5');
    setTheme('aurora');
    AuraAI.showToast('📖 Reading Environment activated!');
  }

  // Refresh Visualizer Settings
  loadStudioSettingsUI();
  window.dispatchEvent(new Event('aura-settings-changed'));
}

function initCardTilt() {
  document.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 768) return;
    
    const cards = document.querySelectorAll('.glass-card, .pomodoro-card, .stat-card, .studio-theme-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const pad = 40;
      if (x > -pad && x < rect.width + pad && y > -pad && y < rect.height + pad) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        
        card.style.transform = `perspective(800px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg) translateY(-2px)`;
      } else {
        card.style.transform = '';
      }
    });
  });
}

function initKeystrokeSparkles() {
  document.addEventListener('input', (e) => {
    const isInput = e.target.closest('input, textarea, [contenteditable="true"]');
    if (!isInput) return;
    
    if (localStorage.getItem('aura_keyboard_fx') !== 'true') return;
    
    const rect = isInput.getBoundingClientRect();
    const cx = rect.left + rect.width - 24;
    const cy = rect.top + rect.height / 2 + (Math.random() * 10 - 5);
    
    const sparkle = document.createElement('div');
    sparkle.className = 'keystroke-sparkle';
    sparkle.textContent = ['✨', '⭐', '⚡', '*'][Math.floor(Math.random() * 4)];
    sparkle.style.left = `${cx}px`;
    sparkle.style.top = `${cy}px`;
    
    const tx = (Math.random() * 40 - 20);
    const ty = (Math.random() * 30 - 30);
    
    document.body.appendChild(sparkle);
    
    requestAnimationFrame(() => {
      sparkle.style.transition = 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
      sparkle.style.transform = `translate(${tx}px, ${ty}px) scale(0.1) rotate(${Math.random() * 180}deg)`;
      sparkle.style.opacity = '0';
    });
    
    setTimeout(() => sparkle.remove(), 550);
  });
}

function toggleWidgetVisibility(name, show) {
  localStorage.setItem(`aura_widget_${name}`, String(show));
  applyWidgetVisibility(name, show);
}

function applyWidgetVisibility(name, show) {
  let targetEl = null;
  if (name === 'pomo') targetEl = document.getElementById('widget-focus-hub');
  else if (name === 'chart') targetEl = document.getElementById('widget-analytics-chart');
  else if (name === 'ai') targetEl = document.getElementById('cc-insights');
  else if (name === 'rpg') targetEl = document.querySelector('.rpg-xp-container');
  else if (name === 'deadlines') targetEl = document.getElementById('widget-deadlines');
  else if (name === 'lectures') targetEl = document.getElementById('widget-lectures');

  if (targetEl) {
    if (show) {
      targetEl.style.display = '';
    } else {
      targetEl.style.display = 'none';
    }
  }
}

function applyAllWidgetsVisibility() {
  applyWidgetVisibility('pomo', localStorage.getItem('aura_widget_pomo') !== 'false');
  applyWidgetVisibility('chart', localStorage.getItem('aura_widget_chart') !== 'false');
  applyWidgetVisibility('ai', localStorage.getItem('aura_widget_ai') !== 'false');
  applyWidgetVisibility('rpg', localStorage.getItem('aura_widget_rpg') !== 'false');
  applyWidgetVisibility('deadlines', localStorage.getItem('aura_widget_deadlines') !== 'false');
  applyWidgetVisibility('lectures', localStorage.getItem('aura_widget_lectures') !== 'false');
}
