/* ==========================================================================
   AURA Audio Engine — Web Audio API Synthesizer (Zero-Assets Offline SFX)
   ========================================================================== */

const AuraSounds = (() => {
  // Web Audio Context setup
  let audioCtx = null;
  let muted = false;

  function initCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Play a simple pop sound (click)
  function playClick() {
    if (muted) return;
    try {
      initCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      console.warn("Failed to play pop sound: ", e);
    }
  }

  // Play a success double chime
  function playSuccess() {
    if (muted) return;
    try {
      initCtx();
      const now = audioCtx.currentTime;
      
      // Tone 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);
      
      // Tone 2 (shifted slightly in time and pitch)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("Failed to play success chime: ", e);
    }
  }

  // Play Pomodoro completed beep
  function playPomoDone() {
    if (muted) return;
    try {
      initCtx();
      const now = audioCtx.currentTime;
      
      // Chime 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc1.start(now);
      osc1.stop(now + 0.2);
      
      // Chime 2
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.3); // A5
      gain2.gain.setValueAtTime(0.12, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn("Failed to play Pomodoro done chime: ", e);
    }
  }

  // Play Level Up Fanfare (arpeggio of major chords)
  function playLevelUp() {
    if (muted) return;
    try {
      initCtx();
      const now = audioCtx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      
      notes.forEach((freq, idx) => {
        const timeOffset = idx * 0.12;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = (idx === notes.length - 1) ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + timeOffset);
        
        gain.gain.setValueAtTime(0.08, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.005, now + timeOffset + 0.35);
        
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.4);
      });
    } catch (e) {
      console.warn("Failed to play Level Up fanfare: ", e);
    }
  }

  return {
    init: initCtx,
    click: playClick,
    success: playSuccess,
    pomo: playPomoDone,
    levelup: playLevelUp,
    toggleMute: () => { muted = !muted; return muted; },
    isMuted: () => muted
  };
})();
