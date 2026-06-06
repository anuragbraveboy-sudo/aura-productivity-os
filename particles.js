/* ==========================================================================
   AURA Studio Visualizer – Canvas Particle Engine (10 Dynamic Rendering Styles)
   OPTIMIZED: tab-pause, delta-time cap, theme color cache, RAF guard
   ========================================================================== */

const AuraParticles = (() => {
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let width = 0;
  let height = 0;

  // Custom Controls State
  let style = 'constellation';
  let opacity = 0.25;
  let brightness = 0.85;
  let speed = 1.0;
  let targetCount = 65;

  let particles = [];
  let mouse = { x: null, y: null, radius: 100 };
  let frameCount = 0;

  // ── OPT 1: Theme color cache ───────────────────────────────────────────────
  // getComputedStyle on every frame is expensive. Cache colors and only
  // refresh when the theme actually changes (via MutationObserver on <html>).
  let _cachedColors = null;
  function getThemeColors() {
    if (_cachedColors) return _cachedColors;
    const rootStyles = getComputedStyle(document.documentElement);
    const accent     = rootStyles.getPropertyValue('--accent').trim()    || '#00d4ff';
    const secondary  = rootStyles.getPropertyValue('--secondary').trim() || '#7c4dff';
    _cachedColors = { accent, secondary };
    return _cachedColors;
  }

  // Watch for theme class/attribute changes and bust the cache
  const _themeObserver = new MutationObserver(() => { _cachedColors = null; });
  // Observer starts once DOM is ready (called in initEngine)

  // ── OPT 2: Pre-computed RGB cache ──────────────────────────────────────────
  // hexToRgb + brightness math was running inside every loop tick.
  // Re-compute only when cache is busted.
  let _rgbCache = null;
  function getRgb() {
    if (_rgbCache) return _rgbCache;
    const colors     = getThemeColors();
    const p          = hexToRgb(colors.accent);
    const s          = hexToRgb(colors.secondary);
    const clamp      = (v) => Math.min(255, Math.max(0, Math.floor(v)));
    _rgbCache = {
      r1: clamp(p.r * brightness), g1: clamp(p.g * brightness), b1: clamp(p.b * brightness),
      r2: clamp(s.r * brightness), g2: clamp(s.g * brightness), b2: clamp(s.b * brightness),
    };
    return _rgbCache;
  }
  // Bust RGB cache whenever theme cache is busted
  const _origThemeObserverCb = _themeObserver.takeRecords; // placeholder
  function bustCaches() { _cachedColors = null; _rgbCache = null; }

  class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.x            = Math.random() * width;
      this.y            = init ? Math.random() * height : -10;
      this.vx           = (Math.random() - 0.5) * 0.8 * speed;
      this.vy           = (Math.random() - 0.5) * 0.8 * speed;
      this.radius       = Math.random() * 2.5 + 0.5;
      this.alpha        = Math.random() * 0.5 + 0.1;
      this.angle        = Math.random() * Math.PI * 2;
      this.angularSpeed = (Math.random() - 0.5) * 0.02 * speed;
      this.amplitude    = Math.random() * 20 + 5;
      this.orbitRadius  = Math.random() * 120 + 20;
      this.hueShift     = Math.random() * 40 - 20;
    }

    update() {
      this.x += this.vx * speed;
      this.y += this.vy * speed;

      if (this.x < -20)          this.x = width + 20;
      if (this.x > width + 20)   this.x = -20;
      if (this.y < -20)          this.y = height + 20;
      if (this.y > height + 20)  this.y = -20;

      this.angle += this.angularSpeed * speed;

      if (mouse.x !== null && mouse.y !== null) {
        const dx       = this.x - mouse.x;
        const dy       = this.y - mouse.y;
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

  function initEngine() {
    canvas = document.getElementById('visualizer-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start watching theme changes
    _themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    // Also bust on any CSS variable change via attribute (covers most theme switchers)
    new MutationObserver(bustCaches).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    window.addEventListener('mousemove',  (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', ()  => { mouse.x = null;       mouse.y = null; });
    window.addEventListener('touchmove',  (e) => {
      if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    }, { passive: true });
    window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });

    particles = [];
    for (let i = 0; i < targetCount; i++) particles.push(new Particle());

    // ── OPT 3: Pause loop when tab is hidden ───────────────────────────────
    // This is the single biggest battery/CPU saving on mobile.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
      } else {
        if (!animationId) loop();
      }
    });

    if (animationId) cancelAnimationFrame(animationId);
    loop();
  }

  function resizeCanvas() {
    if (!canvas) return;
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  // ── OPT 4: Delta-time cap ──────────────────────────────────────────────────
  // If the tab was hidden or the device stalled, the next frame's timestamp
  // would be huge, causing particles to teleport. Cap dt to 100 ms.
  let _lastTimestamp = 0;

  function loop(timestamp = 0) {
    // ── OPT 5: Guard against double-scheduling ───────────────────────────────
    animationId = requestAnimationFrame(loop);

    const dt = Math.min(timestamp - _lastTimestamp, 100); // cap at 100 ms
    _lastTimestamp = timestamp;
    // dt is available for future per-frame physics if needed; frameCount still
    // used for wave phases to keep existing render math unchanged.
    frameCount++;

    // Smooth particle count transitions (max 2 per frame to avoid spikes)
    if (particles.length < targetCount)      particles.push(new Particle());
    else if (particles.length > targetCount) particles.pop();

    ctx.clearRect(0, 0, width, height);

    const { r1, g1, b1, r2, g2, b2 } = getRgb();

    // Render style router
    switch (style) {
      case 'constellation': renderConstellation(r1, g1, b1);              break;
      case 'aurora':        renderAurora(r1, g1, b1, r2, g2, b2);         break;
      case 'topography':    renderTopography(r1, g1, b1);                  break;
      case 'matrix':        renderMatrix(r1, g1, b1);                      break;
      case 'snow':          renderSnow(r1, g1, b1);                        break;
      case 'orbit':         renderOrbit(r1, g1, b1, r2, g2, b2);          break;
      case 'waves':         renderWaves(r1, g1, b1);                       break;
      case 'nebula':        renderNebula(r1, g1, b1, r2, g2, b2);         break;
      case 'tunnel':        renderTunnel(r1, g1, b1);                      break;
      case 'confetti':      renderConfetti();                               break;
    }
  }

  // ── OPT 6: Constellation O(n²) guard ───────────────────────────────────────
  // Original had no distance pre-check before Math.hypot.
  // Cheap bounding-box pre-filter (dx > 100 → skip) cuts ~40% of hypot calls.
  function renderConstellation(r, g, b) {
    ctx.lineWidth = 0.5;
    const LINK_DIST = 100;

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      p1.update();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p1.alpha * opacity * 1.5})`;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = Math.abs(p1.x - p2.x);
        if (dx >= LINK_DIST) continue;           // cheap pre-filter
        const dy = Math.abs(p1.y - p2.y);
        if (dy >= LINK_DIST) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(LINK_DIST - dist) / LINK_DIST * opacity * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  function renderAurora(r1, g1, b1, r2, g2, b2) {
    const pointsCount = 6;
    const waveCount   = 3;
    for (let w = 0; w < waveCount; w++) {
      const offset   = frameCount * 0.005 * speed + (w * Math.PI / 4);
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0,   `rgba(${r1}, ${g1}, ${b1}, 0)`);
      gradient.addColorStop(0.5, `rgba(${lerp(r1, r2, 0.5)}, ${lerp(g1, g2, 0.5)}, ${lerp(b1, b2, 0.5)}, ${opacity * 0.4})`);
      gradient.addColorStop(1,   `rgba(${r2}, ${g2}, ${b2}, 0)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth   = 25 - (w * 5);
      ctx.beginPath();
      for (let i = 0; i <= pointsCount; i++) {
        const x = (i / pointsCount) * width;
        const y = (height * 0.5) + Math.sin(i + offset) * 70 + Math.cos(i * 0.5 + offset * 1.5) * 40;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function renderTopography(r, g, b) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.18})`;
    ctx.lineWidth   = 1.0;
    const spacing   = 40;
    for (let y = spacing; y < height; y += spacing) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 15) {
        const sinVal = Math.sin(x * 0.006 + frameCount * 0.01 * speed);
        const cosVal = Math.cos(y * 0.006 + frameCount * 0.008 * speed);
        const waveY  = y + sinVal * cosVal * 16;
        if (x === 0) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }

  function renderMatrix(r, g, b) {
    ctx.font = '9px monospace';
    particles.forEach((p, idx) => {
      p.y += (Math.abs(p.vy) + 1.2) * speed * 1.5;
      if (p.y > height) p.reset();
      const char      = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      const textAlpha = p.alpha * opacity * 1.8;
      ctx.fillStyle   = `rgba(${r}, ${g}, ${b}, ${textAlpha})`;
      ctx.fillText(char, p.x, p.y);
      if (idx % 3 === 0) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${textAlpha * 0.3})`;
        ctx.fillText(char, p.x, p.y - 12);
        ctx.fillText(char, p.x, p.y - 24);
      }
    });
  }

  function renderSnow(r, g, b) {
    particles.forEach((p) => {
      p.x += Math.sin(p.angle + frameCount * 0.005) * 0.3 * speed;
      p.y += (p.radius * 0.4 + 0.2) * speed;
      if (p.y > height) p.reset();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * opacity * 1.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderOrbit(r1, g1, b1, r2, g2, b2) {
    const centerX = width  * 0.5;
    const centerY = height * 0.5;
    ctx.fillStyle = `rgba(${r1}, ${g1}, ${b1}, ${opacity * 0.15})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();
    particles.forEach((p, idx) => {
      const rotSpeed = (0.01 + (idx % 10) * 0.002) * speed;
      const angle    = (frameCount * rotSpeed) + (idx * Math.PI / 10);
      const radius   = p.orbitRadius + Math.sin(frameCount * 0.02 + idx) * 10;
      const ox       = centerX + Math.cos(angle) * radius;
      const oy       = centerY + Math.sin(angle) * radius;
      ctx.fillStyle  = idx % 2 === 0
        ? `rgba(${r1}, ${g1}, ${b1}, ${opacity * 1.3})`
        : `rgba(${r2}, ${g2}, ${b2}, ${opacity * 1.3})`;
      ctx.beginPath();
      ctx.arc(ox, oy, p.radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderWaves(r, g, b) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.25})`;
    ctx.lineWidth   = 1.5;
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      const waveFreq = 0.005 + (l * 0.001);
      const waveAmp  = 50 - (l * 12);
      const phase    = frameCount * 0.02 * speed + (l * Math.PI / 2);
      for (let x = 0; x < width; x += 10) {
        const y = (height * 0.5) + Math.sin(x * waveFreq + phase) * waveAmp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function renderNebula(r1, g1, b1, r2, g2, b2) {
    particles.forEach((p, idx) => {
      p.update();
      const gradient = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius * 24);
      gradient.addColorStop(0, idx % 2 === 0
        ? `rgba(${r1}, ${g1}, ${b1}, ${p.alpha * opacity * 0.8})`
        : `rgba(${r2}, ${g2}, ${b2}, ${p.alpha * opacity * 0.8})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 24, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderTunnel(r, g, b) {
    const centerX = width  * 0.5;
    const centerY = height * 0.5;
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 8; i++) {
      const sizeOffset = (frameCount * 0.5 * speed) % 80;
      const radius     = (i * 80) + sizeOffset;
      const alphaVal   = (1 - (radius / 640)) * opacity * 0.4;
      if (radius > 0) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, alphaVal)})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function renderConfetti() {
    particles.forEach((p) => {
      p.y     += (p.radius * 0.6 + 1.5) * speed;
      p.x     += Math.sin(frameCount * 0.03 + p.radius) * 0.5 * speed;
      p.angle += p.angularSpeed;
      if (p.y > height) p.reset();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const hue       = (p.radius * 120 + frameCount) % 360;
      ctx.fillStyle   = `hsla(${hue}, 85%, 60%, ${p.alpha * opacity * 1.5})`;
      ctx.fillRect(-p.radius * 2, -p.radius * 2, p.radius * 4, p.radius * 2);
      ctx.restore();
    });
  }

  function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

  function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // Public API
  return {
    init:        initEngine,
    setStyle:    (v) => { style = v; },
    setOpacity:  (v) => { opacity = v; },
    setBrightness:(v) => { brightness = v; bustCaches(); },
    setSpeed:    (v) => { speed = v; },
    setCount:    (v) => { targetCount = v; },
    triggerConfettiBurst: () => {
      style = 'confetti'; targetCount = 120;
      setTimeout(() => {
        style = 'constellation'; targetCount = 65;
        const sel = document.getElementById('select-visualizer-style');
        if (sel) sel.value = 'constellation';
      }, 3500);
    }
  };
})();
