/* ==========================================================================
   AURA Local Storage — IndexedDB Wrapper (Offline-First Local DB)
   ========================================================================== */

const AuraDB = (() => {
  const DB_NAME = 'aura_db';
  const DB_VERSION = 1;
  let dbInstance = null;

  // Initialize/Upgrade DB
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Lectures Store
        if (!db.objectStoreNames.contains('lectures')) {
          db.createObjectStore('lectures', { keyPath: 'id' });
        }
        
        // Flashcards Store
        if (!db.objectStoreNames.contains('flashcards')) {
          db.createObjectStore('flashcards', { keyPath: 'id' });
        }
        
        // Deadlines Store
        if (!db.objectStoreNames.contains('deadlines')) {
          db.createObjectStore('deadlines', { keyPath: 'id' });
        }

        // Study Sessions Store
        if (!db.objectStoreNames.contains('studySessions')) {
          db.createObjectStore('studySessions', { keyPath: 'id' });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  // Get Store connection helper
  function getStore(storeName, mode = 'readonly') {
    if (!dbInstance) {
      throw new Error("IndexedDB instance not initialized. Call AuraDB.init() first.");
    }
    const tx = dbInstance.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // Generic DB Actions wrapper
  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Database Operations ──

  // 1. Settings (Key-Value KeyPath 'key')
  function getSetting(key, defaultValue = null) {
    try {
      const store = getStore('settings');
      return requestPromise(store.get(key)).then(res => res ? res.value : defaultValue);
    } catch (e) {
      // Fallback to localStorage if IndexedDB is not fully initialized
      return Promise.resolve(localStorage.getItem('aura_' + key) || defaultValue);
    }
  }

  function setSetting(key, value) {
    try {
      const store = getStore('settings', 'readwrite');
      localStorage.setItem('aura_' + key, value); // Dual persistence
      return requestPromise(store.put({ key, value }));
    } catch (e) {
      localStorage.setItem('aura_' + key, value);
      return Promise.resolve(value);
    }
  }

  // 2. Lectures Store
  function saveLecture(lecture) {
    const store = getStore('lectures', 'readwrite');
    return requestPromise(store.put(lecture));
  }

  function getLecture(id) {
    const store = getStore('lectures');
    return requestPromise(store.get(id));
  }

  function getAllLectures() {
    const store = getStore('lectures');
    return requestPromise(store.getAll());
  }

  function deleteLecture(id) {
    const store = getStore('lectures', 'readwrite');
    return requestPromise(store.delete(id));
  }

  // 3. Flashcards Store
  function saveFlashcard(card) {
    const store = getStore('flashcards', 'readwrite');
    return requestPromise(store.put(card));
  }

  function getAllFlashcards() {
    const store = getStore('flashcards');
    return requestPromise(store.getAll());
  }

  function deleteFlashcard(id) {
    const store = getStore('flashcards', 'readwrite');
    return requestPromise(store.delete(id));
  }

  // 4. Deadlines Store
  function saveDeadline(deadline) {
    const store = getStore('deadlines', 'readwrite');
    return requestPromise(store.put(deadline));
  }

  function getAllDeadlines() {
    const store = getStore('deadlines');
    return requestPromise(store.getAll());
  }

  function deleteDeadline(id) {
    const store = getStore('deadlines', 'readwrite');
    return requestPromise(store.delete(id));
  }

  // 5. Study Sessions Store
  function saveStudySession(session) {
    const store = getStore('studySessions', 'readwrite');
    return requestPromise(store.put(session));
  }

  function getAllStudySessions() {
    const store = getStore('studySessions');
    return requestPromise(store.getAll());
  }

  function deleteStudySession(id) {
    const store = getStore('studySessions', 'readwrite');
    return requestPromise(store.delete(id));
  }

  // Wipe whole database (For resets)
  function clearAllData() {
    return new Promise((resolve, reject) => {
      const req1 = getStore('lectures', 'readwrite').clear();
      const req2 = getStore('flashcards', 'readwrite').clear();
      const req3 = getStore('deadlines', 'readwrite').clear();
      const req4 = getStore('studySessions', 'readwrite').clear();
      
      let count = 4;
      const done = () => {
        count--;
        if (count === 0) resolve();
      };
      req1.onsuccess = done;
      req2.onsuccess = done;
      req3.onsuccess = done;
      req4.onsuccess = done;
    });
  }

  return {
    init,
    getSetting,
    setSetting,
    saveLecture,
    getLecture,
    getAllLectures,
    deleteLecture,
    saveFlashcard,
    getAllFlashcards,
    deleteFlashcard,
    saveDeadline,
    getAllDeadlines,
    deleteDeadline,
    saveStudySession,
    getAllStudySessions,
    deleteStudySession,
    clearAllData
  };
})();
