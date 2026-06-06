/* ═══════════════════════════════════════════════
   AURA — iQOO Office Kit Bridge Module (bridge.js)
   Handles phone ↔ laptop sync via local network
   ═══════════════════════════════════════════════ */

const AuraBridge = (() => {
  let bridgeIP = localStorage.getItem('aura_bridge_ip') || '';
  let bridgePort = localStorage.getItem('aura_bridge_port') || '8765';
  let isConnected = false;
  let healthCheckInterval = null;

  /* ── Get Bridge URL ─────────────────────────── */
  function getBaseURL() {
    if (!bridgeIP) return null;
    return `http://${bridgeIP}:${bridgePort}`;
  }

  /* ── Health Check ──────────────────────────── */
  async function checkHealth() {
    const url = getBaseURL();
    if (!url) {
      updateStatus(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        updateStatus(true, data);
        return true;
      }
    } catch (e) {
      // Connection failed
    }

    updateStatus(false);
    return false;
  }

  /* ── Update Bridge Status UI ───────────────── */
  function updateStatus(connected, data = null) {
    isConnected = connected;

    const dot = document.getElementById('bridge-dot');
    const label = document.getElementById('bridge-label');
    const bar = document.getElementById('bridge-bar');
    const cardDesc = document.getElementById('bridge-card-desc');
    const syncBtn = document.getElementById('bridge-sync-btn');

    if (dot) dot.className = `bridge-dot ${connected ? 'connected' : ''}`;
    if (label) label.textContent = connected
      ? `PC Bridge: Connected ✓`
      : bridgeIP
        ? `PC Bridge: Offline`
        : `PC Bridge: Not configured`;

    if (bar) bar.className = `bridge-bar ${connected ? 'connected' : ''}`;

    if (cardDesc) {
      cardDesc.textContent = connected
        ? `Connected to ${bridgeIP} — Ready to sync`
        : bridgeIP
          ? `Unable to reach ${bridgeIP}. Tap to configure.`
          : 'Tap to configure laptop connection';
    }

    if (syncBtn) {
      syncBtn.textContent = connected ? 'Sync' : 'Setup';
      syncBtn.className = `bridge-sync-btn ${connected ? 'ready' : ''}`;
    }
  }

  /* ── Start Health Check Polling ─────────────── */
  function startHealthCheck() {
    checkHealth();
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    healthCheckInterval = setInterval(checkHealth, 15000); // every 15 seconds
  }

  /* ── Sync Lectures to PC ───────────────────── */
  async function syncLectures() {
    const url = getBaseURL();
    if (!url || !isConnected) {
      openBridgeSettings();
      return { success: false, message: 'Bridge not connected' };
    }

    try {
      // Get all lectures from IndexedDB
      const lectures = await AuraDB.lectures.getAll();

      if (lectures.length === 0) {
        AuraAI.showToast('📭 No lectures to sync');
        return { success: false, message: 'No lectures' };
      }

      // Show syncing animation
      const syncBtn = document.getElementById('bridge-sync-btn');
      const cardDesc = document.getElementById('bridge-card-desc');
      if (syncBtn) {
        syncBtn.innerHTML = '<span class="spinner"></span>';
        syncBtn.classList.add('syncing');
      }
      if (cardDesc) cardDesc.textContent = `Syncing ${lectures.length} lectures...`;

      // Send lectures to PC bridge
      const response = await fetch(`${url}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectures: lectures.map(l => ({
            id: l.id,
            title: l.title,
            transcript: l.transcript,
            summary: l.summary,
            date: l.date,
            duration: l.duration
          }))
        })
      });

      const result = await response.json();

      // Also send for text processing
      for (const lecture of lectures) {
        if (lecture.transcript && lecture.transcript.length > 200) {
          try {
            await fetch(`${url}/api/process-text`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: lecture.transcript })
            });
          } catch (e) {
            // Non-critical
          }
        }
      }

      // Success animation
      if (syncBtn) {
        syncBtn.innerHTML = '✓';
        syncBtn.classList.remove('syncing');
        syncBtn.classList.add('done');
        setTimeout(() => {
          syncBtn.textContent = 'Sync';
          syncBtn.classList.remove('done');
        }, 2000);
      }
      if (cardDesc) {
        cardDesc.textContent = `✅ ${lectures.length} lectures synced to laptop!`;
        setTimeout(() => {
          cardDesc.textContent = `Connected to ${bridgeIP} — Ready to sync`;
        }, 3000);
      }

      AuraAI.showToast(`✅ ${lectures.length} lectures synced to PC!`);
      return { success: true, synced: lectures.length };

    } catch (e) {
      console.error('[Bridge] Sync failed:', e);
      const syncBtn = document.getElementById('bridge-sync-btn');
      if (syncBtn) {
        syncBtn.textContent = '✗';
        syncBtn.classList.remove('syncing');
        setTimeout(() => { syncBtn.textContent = 'Sync'; }, 2000);
      }
      AuraAI.showToast('⚠️ Sync failed. Check connection.');
      return { success: false, message: e.message };
    }
  }

  /* ── Save Settings ─────────────────────────── */
  function saveSettings(ip, port) {
    bridgeIP = ip.trim();
    bridgePort = port || '8765';
    localStorage.setItem('aura_bridge_ip', bridgeIP);
    localStorage.setItem('aura_bridge_port', bridgePort);
    startHealthCheck();
  }

  /* ── Get Settings ─────────────────────────── */
  function getSettings() {
    return { ip: bridgeIP, port: bridgePort, connected: isConnected };
  }

  /* ── Test Connection ─────────────────────────── */
  async function testConnection() {
    const resultEl = document.getElementById('bridge-test-result');
    if (resultEl) resultEl.innerHTML = '<span class="spinner"></span> Testing...';

    const tempIP = document.getElementById('bridge-ip-input')?.value?.trim();
    const tempPort = document.getElementById('bridge-port-input')?.value || '8765';

    if (!tempIP) {
      if (resultEl) resultEl.innerHTML = '<span style="color:#ff6b6b;">Please enter an IP address</span>';
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`http://${tempIP}:${tempPort}/api/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (resultEl) resultEl.innerHTML = `<span style="color:#82e696;">✅ Connected! Server: ${data.server || 'AURA Bridge'}</span>`;
      } else {
        if (resultEl) resultEl.innerHTML = '<span style="color:#ff6b6b;">❌ Server responded with error</span>';
      }
    } catch (e) {
      if (resultEl) resultEl.innerHTML = '<span style="color:#ff6b6b;">❌ Could not reach server. Check IP & make sure server.py is running on laptop.</span>';
    }
  }

  /* ── Initialize ─────────────────────────── */
  function init() {
    if (bridgeIP) {
      startHealthCheck();
    } else {
      updateStatus(false);
    }
  }

  return {
    init,
    checkHealth,
    syncLectures,
    saveSettings,
    getSettings,
    testConnection,
    get isConnected() { return isConnected; }
  };
})();

/* ── Global Bridge Functions (called from HTML) ── */

function openBridgeSettings() {
  const modal = document.getElementById('bridge-modal');
  const settings = AuraBridge.getSettings();
  document.getElementById('bridge-ip-input').value = settings.ip;
  document.getElementById('bridge-port-input').value = settings.port;
  document.getElementById('bridge-test-result').innerHTML = '';
  if (modal) modal.classList.add('visible');
}

function closeBridgeModal() {
  const modal = document.getElementById('bridge-modal');
  if (modal) modal.classList.remove('visible');
}

function saveBridgeSettings() {
  const ip = document.getElementById('bridge-ip-input').value;
  const port = document.getElementById('bridge-port-input').value;
  AuraBridge.saveSettings(ip, port);
  closeBridgeModal();
  AuraAI.showToast('💾 Bridge settings saved!');
}

function testBridgeConnection() {
  AuraBridge.testConnection();
}

function syncToPC() {
  if (AuraBridge.isConnected) {
    AuraBridge.syncLectures();
  } else {
    openBridgeSettings();
  }
}
