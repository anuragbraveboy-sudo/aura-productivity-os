/* ───────────────────────────────────────────────
   AURA  —  IndexedDB Data Layer  (db.js)
   ─────────────────────────────────────────────── */

const DB_NAME = 'aura_db';
const DB_VERSION = 1;

const STORES = {
  LECTURES: 'lectures',
  FLASHCARDS: 'flashcards',
  DEADLINES: 'deadlines',
  SETTINGS: 'settings'
};

let _db = null;

/* ── Open / Init ─────────────────────────────── */
function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.LECTURES)) {
        db.createObjectStore(STORES.LECTURES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.FLASHCARDS)) {
        const fs = db.createObjectStore(STORES.FLASHCARDS, { keyPath: 'id' });
        fs.createIndex('lectureId', 'lectureId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.DEADLINES)) {
        db.createObjectStore(STORES.DEADLINES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ── Generic helpers ─────────────────────────── */
async function _tx(storeName, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function _req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ── CRUD: Lectures ──────────────────────────── */
async function saveLecture(lecture) {
  const store = await _tx(STORES.LECTURES, 'readwrite');
  return _req(store.put(lecture));
}

async function getLecture(id) {
  const store = await _tx(STORES.LECTURES);
  return _req(store.get(id));
}

async function getAllLectures() {
  const store = await _tx(STORES.LECTURES);
  return _req(store.getAll());
}

async function deleteLecture(id) {
  const store = await _tx(STORES.LECTURES, 'readwrite');
  return _req(store.delete(id));
}

/* ── CRUD: Flashcards ────────────────────────── */
async function saveFlashcard(card) {
  const store = await _tx(STORES.FLASHCARDS, 'readwrite');
  return _req(store.put(card));
}

async function getFlashcardsByLecture(lectureId) {
  const store = await _tx(STORES.FLASHCARDS);
  const idx = store.index('lectureId');
  return _req(idx.getAll(lectureId));
}

async function getAllFlashcards() {
  const store = await _tx(STORES.FLASHCARDS);
  return _req(store.getAll());
}

async function deleteFlashcard(id) {
  const store = await _tx(STORES.FLASHCARDS, 'readwrite');
  return _req(store.delete(id));
}

/* ── CRUD: Deadlines ─────────────────────────── */
async function saveDeadline(deadline) {
  const store = await _tx(STORES.DEADLINES, 'readwrite');
  return _req(store.put(deadline));
}

async function getAllDeadlines() {
  const store = await _tx(STORES.DEADLINES);
  return _req(store.getAll());
}

async function deleteDeadline(id) {
  const store = await _tx(STORES.DEADLINES, 'readwrite');
  return _req(store.delete(id));
}

/* ── CRUD: Settings ──────────────────────────── */
async function setSetting(key, value) {
  const store = await _tx(STORES.SETTINGS, 'readwrite');
  return _req(store.put({ key, value }));
}

async function getSetting(key) {
  const store = await _tx(STORES.SETTINGS);
  const row = await _req(store.get(key));
  return row ? row.value : null;
}

/* ── Sample Data ─────────────────────────────── */
async function seedSampleData() {
  const existing = await getAllLectures();
  if (existing.length > 0) return; // already seeded

  const now = Date.now();

  const sampleLectures = [
    {
      id: 'lec_sample_1',
      title: 'Introduction to Machine Learning',
      transcript: `Welcome to Introduction to Machine Learning. Today we will cover the fundamental concepts that underpin modern AI systems.

Machine learning is a subset of artificial intelligence that focuses on building systems that learn from data. Instead of being explicitly programmed, these systems identify patterns and make decisions with minimal human intervention.

There are three main types of machine learning. First, supervised learning, where the model is trained on labeled data — for example, classifying emails as spam or not spam. Second, unsupervised learning, which finds hidden patterns in unlabeled data, such as customer segmentation. Third, reinforcement learning, where an agent learns to make decisions by receiving rewards or penalties.

Key concepts include the training set, which is the data used to build the model; the test set, used to evaluate performance; overfitting, when a model memorizes training data but fails on new data; and underfitting, when a model is too simple to capture the underlying pattern.

Common algorithms include linear regression for predicting continuous values, decision trees for classification, neural networks which are the foundation of deep learning, and support vector machines for finding optimal decision boundaries.

The machine learning pipeline typically involves data collection, data preprocessing and cleaning, feature engineering, model selection, training, evaluation, and deployment. Each step is critical for building robust models.

Remember: the goal is generalization — we want models that perform well on unseen data, not just the training set.`,
      summary: `**Machine Learning Fundamentals**\n\n• ML is a subset of AI where systems learn from data rather than being explicitly programmed\n• **Three types:** Supervised (labeled data), Unsupervised (hidden patterns), Reinforcement (reward-based)\n• **Key concepts:** Training/test sets, overfitting vs underfitting, generalization\n• **Common algorithms:** Linear regression, decision trees, neural networks, SVMs\n• **Pipeline:** Data collection → preprocessing → feature engineering → model selection → training → evaluation → deployment\n• **Core goal:** Build models that generalize well to unseen data`,
      date: now - 86400000 * 2,
      duration: 2845
    },
    {
      id: 'lec_sample_2',
      title: 'Organic Chemistry: Functional Groups',
      transcript: `Good morning, class. Today's lecture focuses on functional groups in organic chemistry — the specific groupings of atoms within molecules that determine the characteristics and chemical reactivity of those molecules.

A functional group is an atom or group of atoms that is responsible for the characteristic chemical properties of a molecule. The carbon backbone or skeleton provides the structure, but the functional groups define the behavior.

Let's start with hydroxyl groups — the O-H group found in alcohols. Methanol, ethanol, and propanol are common examples. The hydroxyl group makes these molecules polar and capable of hydrogen bonding, which explains why small alcohols are soluble in water.

Next, carbonyl groups — a carbon double-bonded to oxygen, C equals O. When the carbonyl is at the end of a chain, we have an aldehyde. When it is in the middle, we have a ketone. Formaldehyde and acetone are everyday examples.

Carboxyl groups combine the carbonyl and hydroxyl groups — COOH. These are the defining feature of carboxylic acids like acetic acid in vinegar and citric acid in citrus fruits. They are weak acids because they can donate the hydrogen from the O-H bond.

Amino groups — NH2 — are found in amines and amino acids. They are basic in nature and can accept protons. The twenty amino acids that make up proteins all contain both an amino group and a carboxyl group.

Ester groups form when a carboxylic acid reacts with an alcohol, releasing water. Esters are responsible for many fruit fragrances and flavors. Phosphate groups are critical in biochemistry — they form the backbone of DNA and are key players in energy transfer through ATP.

Understanding functional groups allows you to predict molecular behavior, reactivity, and interactions — an essential foundation for all of organic chemistry.`,
      summary: `**Organic Chemistry: Functional Groups**\n\n• Functional groups = specific atom groupings that determine a molecule's chemical behavior\n• **Hydroxyl (–OH):** Found in alcohols; enables H-bonding & water solubility\n• **Carbonyl (C=O):** End of chain → aldehyde; middle → ketone\n• **Carboxyl (–COOH):** Defines carboxylic acids; weak acid (donates H⁺)\n• **Amino (–NH₂):** Found in amines & amino acids; basic (accepts protons)\n• **Ester:** Formed from carboxylic acid + alcohol; responsible for fruit scents\n• **Phosphate:** DNA backbone; energy transfer (ATP)\n• Knowing functional groups lets you predict reactivity and molecular interactions`,
      date: now - 86400000 * 5,
      duration: 3120
    },
    {
      id: 'lec_sample_3',
      title: 'World History: The Renaissance',
      transcript: `Today we begin our exploration of the Renaissance — the great cultural, artistic, and intellectual rebirth that swept through Europe from roughly the 14th to the 17th century.

The Renaissance began in Italy, specifically in wealthy city-states like Florence, Venice, and Rome. Why Italy? Several factors converged: the wealth generated by trade and banking, the rediscovery of classical Greek and Roman texts, and the patronage of powerful families like the Medici.

The core philosophy of the Renaissance was humanism — a shift in focus from purely religious concerns to the study of human potential, achievement, and experience. Humanist scholars studied classical literature, philosophy, and history, believing that education could improve individuals and society.

In art, the Renaissance brought revolutionary changes. Artists like Leonardo da Vinci, Michelangelo, and Raphael developed techniques such as linear perspective, chiaroscuro (the use of light and shadow), and anatomically accurate human forms. The Mona Lisa, the Sistine Chapel ceiling, and The School of Athens remain among the most celebrated works in human history.

In science, the Renaissance saw the beginnings of the Scientific Revolution. Copernicus challenged the geocentric model by proposing that Earth revolves around the Sun. Galileo used the telescope to provide evidence supporting this heliocentric view. This spirit of inquiry and evidence-based reasoning was transformative.

The printing press, invented by Johannes Gutenberg around 1440, was perhaps the most consequential innovation of the era. It made books affordable and widely available, democratizing knowledge and enabling the rapid spread of new ideas across Europe.

The Renaissance fundamentally changed how humans saw themselves and their world — from passive subjects of divine will to active agents capable of reason, creativity, and progress.`,
      summary: `**The Renaissance (14th–17th Century)**\n\n• Cultural & intellectual "rebirth" originating in Italian city-states (Florence, Venice, Rome)\n• **Why Italy?** Trade wealth, classical text rediscovery, Medici patronage\n• **Humanism:** Shift from religious focus to human potential & classical education\n• **Art revolution:** Da Vinci, Michelangelo, Raphael — perspective, chiaroscuro, anatomical accuracy\n• **Scientific beginnings:** Copernicus (heliocentric model), Galileo (telescope evidence)\n• **Gutenberg's printing press (~1440):** Democratized knowledge, accelerated idea spread\n• **Legacy:** Transformed humans' self-image from passive subjects to active agents of reason & creativity`,
      date: now - 86400000 * 1,
      duration: 2560
    }
  ];

  const sampleFlashcards = [
    { id: 'fc_1', lectureId: 'lec_sample_1', front: 'What are the three main types of machine learning?', back: 'Supervised learning (labeled data), Unsupervised learning (unlabeled data/patterns), and Reinforcement learning (reward/penalty-based).' },
    { id: 'fc_2', lectureId: 'lec_sample_1', front: 'What is overfitting?', back: 'When a model memorizes the training data too well and performs poorly on new, unseen data. It captures noise instead of the true underlying pattern.' },
    { id: 'fc_3', lectureId: 'lec_sample_1', front: 'What are the steps in a typical ML pipeline?', back: 'Data collection → Data preprocessing → Feature engineering → Model selection → Training → Evaluation → Deployment.' },
    { id: 'fc_4', lectureId: 'lec_sample_2', front: 'What is a functional group?', back: 'An atom or group of atoms responsible for the characteristic chemical properties and reactivity of a molecule.' },
    { id: 'fc_5', lectureId: 'lec_sample_2', front: 'What is the difference between an aldehyde and a ketone?', back: 'Both contain a carbonyl group (C=O). In an aldehyde, the carbonyl is at the end of the carbon chain. In a ketone, it is in the middle.' },
    { id: 'fc_6', lectureId: 'lec_sample_3', front: 'What was Humanism in the Renaissance?', back: 'A philosophy that shifted focus from purely religious concerns to the study of human potential, achievement, and experience through classical education.' },
    { id: 'fc_7', lectureId: 'lec_sample_3', front: 'Why was Gutenberg\'s printing press so significant?', back: 'It made books affordable and widely available, democratizing knowledge and enabling the rapid spread of new ideas across Europe (~1440).' }
  ];

  const today = new Date();
  const sampleDeadlines = [
    {
      id: 'dl_1',
      title: 'ML Problem Set #3',
      course: 'CS 229',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString().split('T')[0],
      priority: 'high'
    },
    {
      id: 'dl_2',
      title: 'Organic Chemistry Lab Report',
      course: 'CHEM 210',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString().split('T')[0],
      priority: 'medium'
    },
    {
      id: 'dl_3',
      title: 'Renaissance Essay Draft',
      course: 'HIST 101',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0],
      priority: 'low'
    },
    {
      id: 'dl_4',
      title: 'Neural Networks Quiz',
      course: 'CS 229',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().split('T')[0],
      priority: 'high'
    }
  ];

  for (const lec of sampleLectures) await saveLecture(lec);
  for (const fc of sampleFlashcards) await saveFlashcard(fc);
  for (const dl of sampleDeadlines) await saveDeadline(dl);

  console.log('[DB] Sample data seeded.');
}

/* ── Exports ─────────────────────────────────── */
window.AuraDB = {
  open: openDB,
  seed: seedSampleData,
  lectures: { save: saveLecture, get: getLecture, getAll: getAllLectures, delete: deleteLecture },
  flashcards: { save: saveFlashcard, getByLecture: getFlashcardsByLecture, getAll: getAllFlashcards, delete: deleteFlashcard },
  deadlines: { save: saveDeadline, getAll: getAllDeadlines, delete: deleteDeadline },
  settings: { get: getSetting, set: setSetting }
};
