/* ==========================================================================
   AURA Sync Bridge — iQOO Office Kit Phone-to-Laptop Network Layer
   ========================================================================== */

const AuraBridge = (() => {
  let bridgeIP = '';
  const PORT = 8765;

  function setBridgeIP(ip) {
    bridgeIP = ip.trim();
  }

  function getBaseUrl() {
    return bridgeIP ? `http://${bridgeIP}:${PORT}` : '';
  }

  // Check if bridge is reachable
  function checkHealth() {
    const url = getBaseUrl();
    if (!url) return Promise.resolve({ online: false });

    return fetch(`${url}/api/health`, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    })
    .then(res => {
      if (res.ok) return { online: true };
      return { online: false };
    })
    .catch(() => ({ online: false }));
  }

  // Proxy Anthropic Claude API queries through local bridge to prevent CORS Blocks
  function proxyClaude(prompt, apiKey) {
    const url = getBaseUrl();
    if (!url) {
      return Promise.reject("Laptop local IP not set. Configure bridge first.");
    }

    return fetch(`${url}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, key: apiKey, max_tokens: 1500 })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || `Proxy returned HTTP ${res.status}`);
        });
      }
      return res.json();
    })
    .then(data => data.text);
  }

  // Push lectures to laptop PC Bridge
  function syncLecturesToLaptop(lectures) {
    const url = getBaseUrl();
    if (!url) {
      return Promise.reject("Laptop local IP not set. Configure bridge first.");
    }

    return fetch(`${url}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lectures })
    })
    .then(res => {
      if (!res.ok) throw new Error("Sync request failed.");
      return res.json();
    });
  }

  // Offload heavy document parsing
  function processLargeText(text) {
    const url = getBaseUrl();
    if (!url) {
      return Promise.reject("Laptop local IP not set. Configure bridge first.");
    }

    return fetch(`${url}/api/process-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    .then(res => {
      if (!res.ok) throw new Error("Text processing offload failed.");
      return res.json();
    });
  }

  return {
    setIP: setBridgeIP,
    getIP: () => bridgeIP,
    getUrl: getBaseUrl,
    checkHealth,
    proxyClaude,
    syncLectures: syncLecturesToLaptop,
    processText: processLargeText
  };
})();
