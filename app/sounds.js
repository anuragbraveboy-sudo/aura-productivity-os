/* ═══════════════════════════════════════════════
   AURA  —  Synthesized Sound System (sounds.js)
   Pure Web Audio API chimes, tap clicks, keyboard thocks & ambient soundscapes
   ═══════════════════════════════════════════════ */

class AuraSounds {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('aura_muted') === 'true';
    this.keyboardFXEnabled = localStorage.getItem('aura_keyboard_fx') === 'true';
    
    this.ambientSource = null;
    this.ambientGain = null;
    this.rainInterval = null;
    this.lofiInterval = null;

    // Unlock AudioContext on first interaction
    const unlock = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);

    // Initial load of ambient sounds
    const savedAmbient = localStorage.getItem('aura_ambient_noise') || 'none';
    if (savedAmbient !== 'none') {
      // Will play once user interacts
      window.addEventListener('click', () => {
        if (!this.ambientSource) {
          this.initAmbientSource(savedAmbient);
        }
      }, { once: true });
    }
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTap() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Extremely short popping sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playKeystroke() {
    if (this.muted || !this.keyboardFXEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const type = localStorage.getItem('aura_keyboard_type') || 'thock';
    const now = this.ctx.currentTime;
    
    if (type === 'thock') {
      // Lubed Linear Thock: Deep, soft lowpass filtered triangle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135 + Math.random() * 20, now);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, now);
      filter.Q.setValueAtTime(1, now);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'click') {
      // Cherry MX Blue Clicky: Short high click + base pop
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(3200 + Math.random() * 400, now);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(210 + Math.random() * 20, now);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.03);
      osc2.stop(now + 0.03);
    } else if (type === 'pop') {
      // Silenced Tactile Bubble Pop: Drop frequency arpeggio
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750 + Math.random() * 150, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      
      osc.start(now);
      osc.stop(now + 0.07);
    }
  }

  createBrownNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate volume
    }
    return buffer;
  }

  createWhiteNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  initAmbientSource(type) {
    this.stopAmbient();
    this.initContext();
    if (!this.ctx) return;
    
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.connect(this.ctx.destination);
    
    const vol = parseFloat(localStorage.getItem('aura_ambient_volume') || '0.5');
    this.ambientGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
    
    if (type === 'brown' || type === 'white') {
      const buffer = type === 'brown' ? this.createBrownNoiseBuffer() : this.createWhiteNoiseBuffer();
      this.ambientSource = this.ctx.createBufferSource();
      this.ambientSource.buffer = buffer;
      this.ambientSource.loop = true;
      this.ambientSource.connect(this.ambientGain);
      this.ambientSource.start(0);
    } else if (type === 'rain') {
      // Background mist noise (white noise low-pass filtered)
      const buffer = this.createWhiteNoiseBuffer();
      this.ambientSource = this.ctx.createBufferSource();
      this.ambientSource.buffer = buffer;
      this.ambientSource.loop = true;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, this.ctx.currentTime);
      
      this.ambientSource.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientSource.start(0);
      
      // Dynamic random drops
      this.rainInterval = setInterval(() => {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        osc.connect(dropGain);
        dropGain.connect(this.ambientGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700 + Math.random() * 1100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.04);
        
        dropGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }, 80);
    } else if (type === 'lofi') {
      // Generative lofi chord sweeps
      const lofiNotes = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25]; // C chord tones
      this.lofiInterval = setInterval(() => {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const swellGain = this.ctx.createGain();
        osc.connect(swellGain);
        swellGain.connect(this.ambientGain);
        
        osc.type = 'sine';
        const freq = lofiNotes[Math.floor(Math.random() * lofiNotes.length)];
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        swellGain.gain.setValueAtTime(0, this.ctx.currentTime);
        swellGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2.2); // attack
        swellGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 6.0); // release
        
        osc.start();
        osc.stop(this.ctx.currentTime + 6.1);
      }, 3500);
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try { this.ambientSource.stop(); } catch(e) {}
      this.ambientSource = null;
    }
    if (this.rainInterval) {
      clearInterval(this.rainInterval);
      this.rainInterval = null;
    }
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
  }

  setAmbientVolume(vol) {
    localStorage.setItem('aura_ambient_volume', vol);
    if (this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
    }
  }

  playSuccess() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Upward arpeggio: C5 -> E5 -> G5
    const notes = [523.25, 659.25, 783.99]; 
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.22);
    });
  }

  playPomodoroComplete() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Pleasant double chime alert (G5 -> C6)
    const now = this.ctx.currentTime;
    
    const playChime = (freq, time, len) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + len);
      
      osc.start(time);
      osc.stop(time + len + 0.05);
    };

    playChime(783.99, now, 0.4);      // G5
    playChime(1046.50, now + 0.22, 0.6); // C6
  }

  playLevelUp() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Fanfare: C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.07 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.38);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('aura_muted', this.muted);
    return this.muted;
  }
}

// Global sounds instance
window.AuraSounds = new AuraSounds();

// Intercept click events to play subtle tap sound
document.addEventListener('click', (e) => {
  const target = e.target.closest('button, .nav-item, .quick-action-btn, .theme-circle, .cal-day, .flashcard, .study-tab, .detail-back, .clear-chat-btn, .studio-theme-card');
  if (target) {
    window.AuraSounds.playTap();
  }
});

// Intercept keyboard typing to play mechanical thocks
document.addEventListener('keydown', (e) => {
  const isInput = e.target.closest('input, textarea, [contenteditable="true"]');
  if (isInput) {
    window.AuraSounds.playKeystroke();
  }
});
