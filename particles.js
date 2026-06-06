/* ==========================================================================
   AURA Studio Visualizer — Canvas Particle Engine (10 Dynamic Rendering Styles)
   ========================================================================== */

const AuraParticles = (() => {
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let width = 0;
  let height = 0;
  
  // Custom Controls State
  let style = 'constellation'; // active style
  let opacity = 0.25;          // base opacity scaler
  let brightness = 0.85;       // base color intensity
  let speed = 1.0;             // drift speed scaler
  let targetCount = 65;        // particle count
  
  let particles = [];
  let mouse = { x: null, y: null, radius: 100 };
  let frameCount = 0;

  // Colors mapping matching the active theme colors
  function getThemeColors() {
    const rootStyles = getComputedStyle(document.documentElement);
    const accent = rootStyles.getPropertyValue('--accent').trim() || '#00d4ff';
    const secondary = rootStyles.getPropertyValue('--secondary').trim() || '#7c4dff';
    return { accent, secondary };
  }

  // Particle Class Definition
  class Particle {
    constructor() {
      this.reset(true);
    }
    
    reset(init = false) {
      this.x = Math.random() * width;
      this.y = init ? Math.random() * height : -10;
      this.vx = (Math.random() - 0.5) * 0.8 * speed;
      this.vy = (Math.random() - 0.5) * 0.8 * speed;
      this.radius = Math.random() * 2.5 + 0.5;
      
      // Dynamic variables for special effects
      this.alpha = Math.random() * 0.5 + 0.1;
      this.angle = Math.random() * Math.PI * 2;
      this.angularSpeed = (Math.random() - 0.5) * 0.02 * speed;
      this.amplitude = Math.random() * 20 + 5;
      this.orbitRadius = Math.random() * 120 + 20;
      this.hueShift = Math.random() * 40 - 20;
    }

    update() {
      // Basic movement drift
      this.x += this.vx * speed;
      this.y += this.vy * speed;

      // Wrap-around boundary controls
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;
      
      this.angle += this.angularSpeed * speed;

      // Mouse/Touch Repulsion physics
      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.hypot(dx, dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          this.x += Math.cos(angle) * force * 4 * speed;
          this.y += Math.sin(angle) * force * 4 * speed;
        }
      }
    }
  }

  // Initialize and populate array
  function initEngine() {
    canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Add Mouse/Touch movement event listeners
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    });
    window.addEventListener('touchend', () => {
      mouse.x = null;
      mouse.y = null;
    });

    // Seed initial particles
    particles = [];
    for (let i = 0; i < targetCount; i++) {
      particles.push(new Particle());
    }

    // Begin render frame cycle
    if (animationId) cancelAnimationFrame(animationId);
    loop();
  }

  function resizeCanvas() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  // Main Render Loop
  function loop() {
    animationId = requestAnimationFrame(loop);
    frameCount++;
    
    // Smooth transition list limits
    if (particles.length < targetCount) {
      particles.push(new Particle());
    } else if (particles.length > targetCount) {
      particles.pop();
    }

    ctx.clearRect(0, 0, width, height);

    // Get active theme primary/secondary colors
    const colors = getThemeColors();
    const primaryRGB = hexToRgb(colors.accent);
    const secondaryRGB = hexToRgb(colors.secondary);

    // Apply color brightness adjustments
    const r1 = Math.min(255, Math.max(0, Math.floor(primaryRGB.r * brightness)));
    const g1 = Math.min(255, Math.max(0, Math.floor(primaryRGB.g * brightness)));
    const b1 = Math.min(255, Math.max(0, Math.floor(primaryRGB.b * brightness)));
    const r2 = Math.min(255, Math.max(0, Math.floor(secondaryRGB.r * brightness)));
    const g2 = Math.min(255, Math.max(0, Math.floor(secondaryRGB.g * brightness)));
    const b2 = Math.min(255, Math.max(0, Math.floor(secondaryRGB.b * brightness)));

    // Render styles router
    if (style === 'constellation') {
      renderConstellation(r1, g1, b1);
    } else if (style === 'aurora') {
      renderAurora(r1, g1, b1, r2, g2, b2);
    } else if (style === 'topography') {
      renderTopography(r1, g1, b1);
    } else if (style === 'matrix') {
      renderMatrix(r1, g1, b1);
    } else if (style === 'snow') {
      renderSnow(r1, g1, b1);
    } else if (style === 'orbit') {
      renderOrbit(r1, g1, b1, r2, g2, b2);
    } else if (style === 'waves') {
      renderWaves(r1, g1, b1);
    } else if (style === 'nebula') {
      renderNebula(r1, g1, b1, r2, g2, b2);
    } else if (style === 'tunnel') {
      renderTunnel(r1, g1, b1);
    } else if (style === 'confetti') {
      renderConfetti();
    }
  }

  // 1. Constellation Drift
  function renderConstellation(r, g, b) {
    ctx.lineWidth = 0.5;
    
    // Connect neighboring lines
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      p1.update();
      
      // Draw particle dot
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p1.alpha * opacity * 1.5})`;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        if (dist < 100) {
          const alphaLine = (100 - dist) / 100 * opacity * 0.5;
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alphaLine})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  // 2. Aurora Ribbon
  function renderAurora(r1, g1, b1, r2, g2, b2) {
    const pointsCount = 6;
    const waveCount = 3;
    
    for (let w = 0; w < waveCount; w++) {
      const offset = frameCount * 0.005 * speed + (w * Math.PI / 4);
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, 0)`);
      gradient.addColorStop(0.5, `rgba(${lerp(r1, r2, 0.5)}, ${lerp(g1, g2, 0.5)}, ${lerp(b1, b2, 0.5)}, ${opacity * 0.4})`);
      gradient.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, 0)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 25 - (w * 5);
      ctx.beginPath();
      
      for (let i = 0; i <= pointsCount; i++) {
        const x = (i / pointsCount) * width;
        const y = (height * 0.5) + Math.sin(i + offset) * 70 + Math.cos(i * 0.5 + offset * 1.5) * 40;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // 3. Topographical Paths
  function renderTopography(r, g, b) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.18})`;
    ctx.lineWidth = 1.0;
    const spacing = 40;
    
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 15) {
        // Form wavy lines using frame counts
        const sinVal = Math.sin(x * 0.006 + frameCount * 0.01 * speed);
        const cosVal = Math.cos(y * 0.006 + frameCount * 0.008 * speed);
        const waveY = y + sinVal * cosVal * 16;
        
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }

  // 4. Matrix Streams
  function renderMatrix(r, g, b) {
    ctx.font = '9px monospace';
    particles.forEach((p, idx) => {
      p.y += (Math.abs(p.vy) + 1.2) * speed * 1.5;
      if (p.y > height) p.reset();
      
      const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      const textAlpha = p.alpha * opacity * 1.8;
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${textAlpha})`;
      ctx.fillText(char, p.x, p.y);
      
      // Draw faded tails
      if (idx % 3 === 0) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${textAlpha * 0.3})`;
        ctx.fillText(char, p.x, p.y - 12);
        ctx.fillText(char, p.x, p.y - 24);
      }
    });
  }

  // 5. Ambient Snowfall
  function renderSnow(r, g, b) {
    particles.forEach((p) => {
      // Wind speed offset
      p.x += Math.sin(p.angle + frameCount * 0.005) * 0.3 * speed;
      p.y += (p.radius * 0.4 + 0.2) * speed;
      
      if (p.y > height) p.reset();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * opacity * 1.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 6. Gravity Orbits
  function renderOrbit(r1, g1, b1, r2, g2, b2) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    
    // Draw central gravity node
    ctx.fillStyle = `rgba(${r1}, ${g1}, ${b1}, ${opacity * 0.15})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    particles.forEach((p, idx) => {
      // Update rotation angles
      const rotSpeed = (0.01 + (idx % 10) * 0.002) * speed;
      const angle = (frameCount * rotSpeed) + (idx * Math.PI / 10);
      const radius = p.orbitRadius + Math.sin(frameCount * 0.02 + idx) * 10;
      
      const ox = centerX + Math.cos(angle) * radius;
      const oy = centerY + Math.sin(angle) * radius;
      
      const color = idx % 2 === 0 ? `rgba(${r1}, ${g1}, ${b1}, ${opacity * 1.3})` : `rgba(${r2}, ${g2}, ${b2}, ${opacity * 1.3})`;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ox, oy, p.radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 7. Sine Waveform
  function renderWaves(r, g, b) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.25})`;
    ctx.lineWidth = 1.5;
    
    const lines = 3;
    for (let l = 0; l < lines; l++) {
      ctx.beginPath();
      const waveFreq = 0.005 + (l * 0.001);
      const waveAmp = 50 - (l * 12);
      const phase = frameCount * 0.02 * speed + (l * Math.PI / 2);
      
      for (let x = 0; x < width; x += 10) {
        const y = (height * 0.5) + Math.sin(x * waveFreq + phase) * waveAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // 8. Gas Cloud Dust (Nebula)
  function renderNebula(r1, g1, b1, r2, g2, b2) {
    particles.forEach((p, idx) => {
      p.update();
      
      // Multi-color dynamic cloud flares
      const gradient = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius * 24);
      const color1 = idx % 2 === 0 ? `rgba(${r1}, ${g1}, ${b1}, ${p.alpha * opacity * 0.8})` : `rgba(${r2}, ${g2}, ${b2}, ${p.alpha * opacity * 0.8})`;
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 24, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 9. Wormhole Tunnel
  function renderTunnel(r, g, b) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const rings = 8;
    
    ctx.lineWidth = 1.0;
    for (let i = 0; i < rings; i++) {
      // Calculate ring growth rates
      const sizeOffset = (frameCount * 0.5 * speed) % 80;
      const radius = (i * 80) + sizeOffset;
      const alphaVal = (1 - (radius / (rings * 80))) * opacity * 0.4;
      
      if (radius > 0) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, alphaVal)})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 10. Party Confetti (Grants celebration states on RPG level-up)
  function renderConfetti() {
    particles.forEach((p) => {
      p.y += (p.radius * 0.6 + 1.5) * speed;
      p.x += Math.sin(frameCount * 0.03 + p.radius) * 0.5 * speed;
      p.angle += p.angularSpeed;

      if (p.y > height) p.reset();

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      // Dynamic multicolor block fills
      const hue = (p.radius * 120 + frameCount) % 360;
      ctx.fillStyle = `hsla(${hue}, 85%, 60%, ${p.alpha * opacity * 1.5})`;
      ctx.fillRect(-p.radius * 2, -p.radius * 2, p.radius * 4, p.radius * 2);
      
      ctx.restore();
    });
  }

  // Math interpolator
  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  // Hex to RGB parser helper
  function hexToRgb(hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  return {
    init: initEngine,
    setStyle: (newStyle) => { style = newStyle; },
    setOpacity: (newOpacity) => { opacity = newOpacity; },
    setBrightness: (newBrightness) => { brightness = newBrightness; },
    setSpeed: (newSpeed) => { speed = newSpeed; },
    setCount: (newCount) => { targetCount = newCount; },
    triggerConfettiBurst: () => {
      style = 'confetti';
      targetCount = 120;
      setTimeout(() => {
        style = 'constellation';
        targetCount = 65;
        const selector = document.getElementById('select-visualizer-style');
        if (selector) selector.value = 'constellation';
      }, 3500);
    }
  };
})();
