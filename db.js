const { Firestore } = require('@google-cloud/firestore');

let firestoreOptions = {};

// 1. Support inline GCP Service Account JSON key string from env variable (Render / Cloud Config)
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  try {
    const credentials = typeof process.env.GCP_SERVICE_ACCOUNT_KEY === 'string'
      ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      : process.env.GCP_SERVICE_ACCOUNT_KEY;
    firestoreOptions.credentials = credentials;
    firestoreOptions.projectId = credentials.project_id;
  } catch (err) {
    console.error('[GCP Firestore] Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON string:', err.message);
  }
} else if (process.env.GCP_PROJECT_ID) {
  firestoreOptions.projectId = process.env.GCP_PROJECT_ID;
}

const firestore = new Firestore(firestoreOptions);

// Collections
const USERS_COL = firestore.collection('user_profiles');
const PLANTS_COL = firestore.collection('plants');
const LEADERBOARDS_COL = firestore.collection('leaderboards');
const CHAT_COL = firestore.collection('chat_history');

/**
 * Initialize Firestore database and test connection.
 */
async function initDb() {
  try {
    console.log('[GCP Firestore] Initializing Google Cloud Firestore connection...');
    // Quick ping test
    const testDoc = LEADERBOARDS_COL.doc('_ping');
    await testDoc.set({ ping: true, timestamp: Date.now() }, { merge: true });
    console.log('[GCP Firestore] Connected successfully to Google Cloud Firestore!');
  } catch (err) {
    console.warn('[GCP Firestore] Initial ping notice (will retry on operations):', err.message);
  }
}

/**
 * Load entire game state from Firestore into server memory on startup.
 */
async function loadAllState() {
  const state = {
    userProfiles: {},
    plants: {},
    courseLeaderboard: [],
    megaCourseLeaderboard: [],
    coopLeaderboard: [],
    froggerLeaderboard: [],
    fishingLeaderboard: [],
    chatHistory: []
  };

  try {
    // 1. User Profiles
    const usersSnap = await USERS_COL.get();
    usersSnap.forEach(doc => {
      state.userProfiles[doc.id] = doc.data();
    });

    // 2. Plants
    const plantsSnap = await PLANTS_COL.get();
    plantsSnap.forEach(doc => {
      state.plants[doc.id] = doc.data();
    });

    // 3. Leaderboards
    const lbCategories = ['course', 'mega_course', 'coop', 'frogger', 'fishing'];
    for (const cat of lbCategories) {
      const doc = await LEADERBOARDS_COL.doc(cat).get();
      if (doc.exists && Array.isArray(doc.data().records)) {
        if (cat === 'course') state.courseLeaderboard = doc.data().records;
        else if (cat === 'mega_course') state.megaCourseLeaderboard = doc.data().records;
        else if (cat === 'coop') state.coopLeaderboard = doc.data().records;
        else if (cat === 'frogger') state.froggerLeaderboard = doc.data().records;
        else if (cat === 'fishing') state.fishingLeaderboard = doc.data().records;
      }
    }

    // 4. Chat History
    const chatDoc = await CHAT_COL.doc('history').get();
    if (chatDoc.exists && Array.isArray(chatDoc.data().messages)) {
      state.chatHistory = chatDoc.data().messages;
    }

    console.log(`[GCP Firestore] Loaded ${Object.keys(state.userProfiles).length} profiles, ${Object.keys(state.plants).length} plants, and ${state.chatHistory.length} chat messages.`);
  } catch (err) {
    console.error('[GCP Firestore] Error loading state from Firestore:', err.message);
  }

  return state;
}

/**
 * Save user profile.
 */
async function saveUserProfile(username, profileData) {
  if (!username) return;
  try {
    await USERS_COL.doc(username).set({
      coins: profileData.coins || 0,
      inventory: profileData.inventory || [],
      equippedHat: profileData.equippedHat || null,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.error(`[GCP Firestore] Save profile error (${username}):`, err.message);
  }
}

/**
 * Save all connected user profiles.
 */
async function saveAllUserProfiles(profilesObj) {
  try {
    const batch = firestore.batch();
    Object.entries(profilesObj).forEach(([username, data]) => {
      const ref = USERS_COL.doc(username);
      batch.set(ref, {
        coins: data.coins || 0,
        inventory: data.inventory || [],
        equippedHat: data.equippedHat || null,
        updatedAt: Date.now()
      }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[GCP Firestore] Batch profile save error:', err.message);
  }
}

/**
 * Save or update plant crop.
 */
async function savePlant(plant) {
  if (!plant || !plant.id) return;
  try {
    await PLANTS_COL.doc(plant.id).set(plant, { merge: true });
  } catch (err) {
    console.error(`[GCP Firestore] Save plant error (${plant.id}):`, err.message);
  }
}

/**
 * Delete plant crop after harvest.
 */
async function deletePlant(plantId) {
  if (!plantId) return;
  try {
    await PLANTS_COL.doc(plantId).delete();
  } catch (err) {
    console.error(`[GCP Firestore] Delete plant error (${plantId}):`, err.message);
  }
}

/**
 * Save Leaderboard Category.
 */
async function saveLeaderboard(category, recordsArray) {
  if (!category) return;
  try {
    await LEADERBOARDS_COL.doc(category).set({
      category,
      records: recordsArray || [],
      updatedAt: Date.now()
    });
  } catch (err) {
    console.error(`[GCP Firestore] Save leaderboard error (${category}):`, err.message);
  }
}

/**
 * Save Chat History array.
 */
async function saveChatHistory(chatArray) {
  try {
    await CHAT_COL.doc('history').set({
      messages: (chatArray || []).slice(-100),
      updatedAt: Date.now()
    });
  } catch (err) {
    console.error('[GCP Firestore] Save chat history error:', err.message);
  }
}

module.exports = {
  firestore,
  initDb,
  loadAllState,
  saveUserProfile,
  saveAllUserProfiles,
  savePlant,
  deletePlant,
  saveLeaderboard,
  saveChatHistory
};
