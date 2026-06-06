/* ═══════════════════════════════════════════════
   AURA  —  Canvas Particle Background (particles.js)
   10 Rendering Modes, Sliders, and Performance Systems
   ═══════════════════════════════════════════════ */

class AuraParticles {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'bg-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '-2';
    this.canvas.style.pointerEvents = 'none';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 110 };
    
    // Load Settings
    this.loadSettings();

    // Init & Loop
    this.init();
    this.animate();

    // Listeners
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    });
    window.addEventListener('touchend', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // Dynamic settings changer event
    window.addEventListener('aura-settings-changed', () => {
      this.loadSettings();
      this.resize();
    });
  }

  loadSettings() {
    this.style = localStorage.getItem('aura_bg_style') || 'constellations';
    this.intensity = parseFloat(localStorage.getItem('aura_bg_intensity') || '0.85');
    this.speedMultiplier = parseFloat(localStorage.getItem('aura_bg_speed') || '1.0');
    this.density = parseFloat(localStorage.getItem('aura_bg_density') || '1.0');
    this.glow = parseFloat(localStorage.getItem('aura_glow_intensity') || '0.4');
    
    // Set custom CSS variables on root based on sliders
    const blurVal = parseInt(localStorage.getItem('aura_blur_intensity') || '20');
    document.documentElement.style.setProperty('--aura-blur-val', `${blurVal}px`);
    document.documentElement.style.setProperty('--aura-glow-factor', this.glow);

    // Dynamic particle counts based on density
    this.maxParticles = Math.round(55 * this.density);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  getColors() {
    const isLight = document.documentElement.dataset.theme === 'light';
    const activeTheme = document.documentElement.dataset.theme || 'dark';
    
    // Returns [R, G, B] values for dynamic alpha conversions
    if (isLight) {
      return {
        particle: [0, 102, 255],
        line: [0, 102, 255],
        star: [0, 102, 255]
      };
    } else if (activeTheme === 'cyberpunk') {
      return {
        particle: [255, 0, 128],
        line: [0, 240, 255],
        star: [255, 255, 0]
      };
    } else if (activeTheme === 'cyber-luxury') {
      return {
        particle: [212, 175, 55],
        line: [212, 175, 55],
        star: [255, 255, 255]
      };
    } else if (activeTheme === 'cosmic-scholar') {
      return {
        particle: [157, 78, 221],
        line: [90, 24, 154],
        star: [243, 238, 252]
      };
    } else if (activeTheme === 'ai-core') {
      return {
        particle: [57, 255, 20],
        line: [0, 100, 0],
        star: [229, 255, 229]
      };
    } else if (activeTheme === 'vision-os') {
      return {
        particle: [255, 255, 255],
        line: [255, 255, 255],
        star: [255, 255, 255]
      };
    } else if (activeTheme === 'future-os') {
      return {
        particle: [0, 240, 255],
        line: [162, 0, 255],
        star: [243, 243, 249]
      };
    } else if (activeTheme === 'solar') {
      return {
        particle: [255, 120, 0],
        line: [255, 60, 0],
        star: [255, 200, 0]
      };
    } else if (activeTheme === 'sakura') {
      return {
        particle: [255, 102, 170],
        line: [204, 51, 119],
        star: [255, 229, 239]
      };
    } else if (activeTheme === 'aurora') {
      return {
        particle: [34, 221, 136],
        line: [0, 184, 212],
        star: [226, 245, 240]
      };
    } else {
      // Midnight / default Dark
      return {
        particle: [88, 166, 255],
        line: [56, 139, 253],
        star: [201, 209, 217]
      };
    }
  }

  init() {
    this.resize();
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        baseSize: Math.random() * 2 + 0.5,
        speedX: (Math.random() * 0.4 - 0.2) * this.speedMultiplier,
        speedY: (Math.random() * 0.4 - 0.2) * this.speedMultiplier,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseVal: Math.random() * Math.PI
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const colors = this.getColors();

    // Draw background nebula dust blobs (gradient circular glows)
    const activeTheme = document.documentElement.dataset.theme || 'dark';
    if (activeTheme !== 'light' && this.style !== 'minimal-focus') {
      this.drawNebulaBlobs();
    }

    // Render active style engine
    switch (this.style) {
      case 'aurora-neural':
        this.drawAuroraNeural(colors);
        break;
      case 'liquid-energy':
        this.drawLiquidEnergy(colors);
        break;
      case 'cosmic-dust':
        this.drawCosmicDust(colors);
        break;
      case 'topo-intel':
        this.drawTopoIntel(colors);
        break;
      case 'brain-pulse':
        this.drawBrainPulse(colors);
        break;
      case 'mesh-gradient':
        this.drawMeshGradient(colors);
        break;
      case 'ambient-ocean':
        this.drawAmbientOcean(colors);
        break;
      case 'particle-galaxy':
        this.drawParticleGalaxy(colors);
        break;
      case 'quantum-field':
        this.drawQuantumField(colors);
        break;
      case 'minimal-focus':
        this.drawMinimalFocus(colors);
        break;
      case 'constellations':
      default:
        this.drawConstellations(colors, true);
        break;
    }

    requestAnimationFrame(() => this.animate());
  }

  drawNebulaBlobs() {
    const activeTheme = document.documentElement.dataset.theme || 'dark';
    let color1, color2;

    const colors = this.getColors();
    color1 = `rgba(${colors.particle.join(',')}, ${0.12 * this.intensity})`;
    color2 = `rgba(${colors.line.join(',')}, ${0.08 * this.intensity})`;

    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Drift base
    const drift = Date.now() * 0.0001;
    const x1 = w * 0.7 + Math.sin(drift) * 100;
    const y1 = h * 0.3 + Math.cos(drift) * 60;
    const x2 = w * 0.3 + Math.cos(drift * 0.8) * 100;
    const y2 = h * 0.7 + Math.sin(drift * 0.8) * 60;
    
    let grad1 = this.ctx.createRadialGradient(x1, y1, 0, x1, y1, Math.min(w, h) * 0.45);
    grad1.addColorStop(0, color1);
    grad1.addColorStop(1, 'transparent');
    this.ctx.fillStyle = grad1;
    this.ctx.beginPath();
    this.ctx.arc(x1, y1, Math.min(w, h) * 0.45, 0, Math.PI * 2);
    this.ctx.fill();

    let grad2 = this.ctx.createRadialGradient(x2, y2, 0, x2, y2, Math.min(w, h) * 0.5);
    grad2.addColorStop(0, color2);
    grad2.addColorStop(1, 'transparent');
    this.ctx.fillStyle = grad2;
    this.ctx.beginPath();
    this.ctx.arc(x2, y2, Math.min(w, h) * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawConstellations(colors, drawStars = true) {
    // Constellation lines & optionally stars
    const particleColor = `rgba(${colors.particle.join(',')}, ${0.35 * this.intensity})`;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around walls
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Pulse size slightly
      p.pulseVal += p.pulseSpeed * this.speedMultiplier;
      p.size = p.baseSize + Math.sin(p.pulseVal) * 0.5;

      // Mouse interactive repelling
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }
      }

      if (drawStars) {
        // Draw star
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = particleColor;
        this.ctx.fill();
      }

      // Connect lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 115) {
          const alpha = (1 - dist / 115) * 0.55 * this.intensity;
          this.ctx.strokeStyle = `rgba(${colors.line.join(',')}, ${alpha.toFixed(2)})`;
          this.ctx.lineWidth = 0.55;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawAuroraNeural(colors) {
    this.ctx.save();
    const time = Date.now() * 0.0006 * this.speedMultiplier;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw 3 layers of aurora waves
    const waves = [
      { amp: 85, freq: 0.0018, speed: 0.7, color: colors.particle, alpha: 0.24 * this.intensity },
      { amp: 110, freq: 0.0012, speed: -0.4, color: colors.line, alpha: 0.18 * this.intensity },
      { amp: 65, freq: 0.0025, speed: 1.1, color: colors.star, alpha: 0.12 * this.intensity }
    ];
    
    waves.forEach(w => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 30) {
        const y = height * 0.45 + Math.sin(x * w.freq + time * w.speed) * w.amp;
        this.ctx.lineTo(x, y);
      }
      this.ctx.lineTo(width, height);
      this.ctx.lineTo(0, height);
      this.ctx.closePath();
      
      const grad = this.ctx.createLinearGradient(0, height * 0.3, 0, height);
      grad.addColorStop(0, `rgba(${w.color.join(',')}, ${w.alpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    });
    
    // Draw neural points overlay
    this.drawConstellations(colors, true);
    this.ctx.restore();
  }

  drawLiquidEnergy(colors) {
    this.ctx.save();
    const time = Date.now() * 0.0008 * this.speedMultiplier;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerSize = Math.min(w, h) * 0.25;

    // Draw 6 orbital liquid blobs
    for (let i = 0; i < 6; i++) {
      const angle = time * (0.08 + i * 0.03) + i * 1.04;
      const r = centerSize * (0.8 + Math.sin(time * 0.4 + i) * 0.15);
      const x = w * 0.5 + Math.cos(angle) * r;
      const y = h * 0.5 + Math.sin(angle * 1.3) * r;
      const size = (120 + i * 40) * this.density;
      
      const grad = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, `rgba(${colors.particle.join(',')}, ${this.intensity * 0.75})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawCosmicDust(colors) {
    this.ctx.save();
    const colorStr = `rgba(${colors.star.join(',')}, ${this.intensity * 0.85})`;
    this.ctx.fillStyle = colorStr;
    
    const count = this.maxParticles * 3.5;
    for (let i = 0; i < count; i++) {
      const seed = i * 492.3;
      const angle = (Date.now() * 0.00012 * this.speedMultiplier) + (seed % (Math.PI * 2));
      const dist = (seed % (Math.min(this.canvas.width, this.canvas.height) * 0.46)) + 15;
      
      const x = this.canvas.width * 0.5 + Math.cos(angle) * dist;
      const y = this.canvas.height * 0.5 + Math.sin(angle) * dist;
      
      this.ctx.fillRect(x, y, 1.5, 1.5);
    }
    this.ctx.restore();
  }

  drawTopoIntel(colors) {
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(${colors.line.join(',')}, ${this.intensity * 0.65})`;
    this.ctx.lineWidth = 1.1;
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = this.mouse.x !== null ? this.mouse.x : w * 0.5;
    const cy = this.mouse.y !== null ? this.mouse.y : h * 0.5;
    
    const maxR = Math.max(w, h);
    const step = 42 / this.density;
    const time = Date.now() * 0.001 * this.speedMultiplier;
    
    for (let r = step; r < maxR * 0.9; r += step) {
      this.ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += 0.09) {
        // Wavy map ripple calculations
        const wave = Math.sin(angle * 6 + time) * 12 + Math.cos(angle * 3 - time * 0.5) * 8;
        const targetR = r + wave;
        const x = cx + Math.cos(angle) * targetR;
        const y = cy + Math.sin(angle) * targetR;
        
        if (angle === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawBrainPulse(colors) {
    this.ctx.save();
    // Neural lattice lines base
    this.drawConstellations(colors, false);
    
    const time = Date.now() * 0.0022 * this.speedMultiplier;
    this.ctx.fillStyle = `rgba(${colors.particle.join(',')}, ${this.intensity * 0.95})`;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const offset = (time + i) % 1.0;
      
      // Get paths
      const neighbors = this.particles.filter((p2, idx) => {
        if (idx === i) return false;
        const d = Math.sqrt((p.x - p2.x)**2 + (p.y - p2.y)**2);
        return d < 110;
      });
      
      if (neighbors.length > 0) {
        const target = neighbors[i % neighbors.length];
        const sx = p.x + (target.x - p.x) * offset;
        const sy = p.y + (target.y - p.y) * offset;
        
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }

  drawMeshGradient(colors) {
    this.ctx.save();
    const time = Date.now() * 0.0003 * this.speedMultiplier;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Overlay 3 multi-colored shifting gradient spheres
    const blobs = [
      { x: w * (0.35 + Math.sin(time) * 0.12), y: h * (0.3 + Math.cos(time * 0.7) * 0.15), r: Math.max(w, h) * 0.45, rgb: colors.particle },
      { x: w * (0.65 + Math.cos(time * 0.8) * 0.14), y: h * (0.7 + Math.sin(time * 0.5) * 0.12), r: Math.max(w, h) * 0.5, rgb: colors.line },
      { x: w * (0.5 + Math.sin(time * 1.1) * 0.18), y: h * (0.45 + Math.cos(time * 0.9) * 0.1), r: Math.max(w, h) * 0.4, rgb: colors.star }
    ];
    
    blobs.forEach(b => {
      const grad = this.ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad.addColorStop(0, `rgba(${b.rgb.join(',')}, ${this.intensity * 0.68})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawAmbientOcean(colors) {
    this.ctx.save();
    const time = Date.now() * 0.0008 * this.speedMultiplier;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Draw 3 layers of stacking ocean wave bands
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, h);
      const baseH = h - (65 + i * 22);
      
      for (let x = 0; x <= w; x += 20) {
        const wave = Math.sin(x * 0.004 + time + i * 1.8) * 11 + Math.cos(x * 0.002 - time * 0.6) * 5;
        this.ctx.lineTo(x, baseH + wave);
      }
      this.ctx.lineTo(w, h);
      this.ctx.closePath();
      
      this.ctx.fillStyle = `rgba(${colors.particle.join(',')}, ${(0.15 + i * 0.08) * this.intensity})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawParticleGalaxy(colors) {
    this.ctx.save();
    const time = Date.now() * 0.00012 * this.speedMultiplier;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    this.ctx.fillStyle = `rgba(${colors.star.join(',')}, ${this.intensity * 0.85})`;
    
    const count = this.maxParticles * 4.2;
    for (let i = 0; i < count; i++) {
      const seed = i * 289.4;
      const arm = seed % 2;
      const r = (seed % (Math.min(w, h) * 0.46)) + 8;
      
      // Logarithmic spiral math: angle increases as radius wraps
      const angle = (r * 0.015) + time + (arm * Math.PI) + (seed % 0.8 - 0.4);
      
      const x = w * 0.5 + Math.cos(angle) * r;
      const y = h * 0.5 + Math.sin(angle) * r;
      
      this.ctx.fillRect(x, y, 1.4, 1.4);
    }
    this.ctx.restore();
  }

  drawQuantumField(colors) {
    this.ctx.save();
    const spacing = 45;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const mx = this.mouse.x !== null ? this.mouse.x : w * 0.5;
    const my = this.mouse.y !== null ? this.mouse.y : h * 0.5;
    
    this.ctx.strokeStyle = `rgba(${colors.line.join(',')}, ${this.intensity * 0.6})`;
    this.ctx.lineWidth = 0.95;
    
    for (let x = spacing * 0.5; x < w; x += spacing) {
      for (let y = spacing * 0.5; y < h; y += spacing) {
        const dx = mx - x;
        const dy = my - y;
        const angle = Math.atan2(dy, dx) || 0;
        const len = Math.min(11 * this.density, 12);
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        
        // Draw tiny vector arrow pointing at mouse
        this.ctx.beginPath();
        this.ctx.moveTo(-len * 0.5, 0);
        this.ctx.lineTo(len * 0.5, 0);
        this.ctx.lineTo(len * 0.2, -1.8);
        this.ctx.moveTo(len * 0.5, 0);
        this.ctx.lineTo(len * 0.2, 1.8);
        this.ctx.stroke();
        
        this.ctx.restore();
      }
    }
    this.ctx.restore();
  }

  drawMinimalFocus(colors) {
    // Zero canvas rendering loop to conserve focus & energy
    // Breathe vignette via CSS overlay in index.html is loaded automatically
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// Auto instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.AuraParticlesInstance = new AuraParticles();
});
