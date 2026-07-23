/**
 * Data Migration Tool: Flatfile (save.json) -> Google Cloud Firestore
 *
 * Usage: node scripts/migrate_flatfile.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');

const SAVE_PATH = path.join(__dirname, '../data/save.json');

async function migrate() {
  console.log('=== Google Cloud Firestore Migration Utility ===');

  if (!fs.existsSync(SAVE_PATH)) {
    console.log('No save.json file found at:', SAVE_PATH);
    console.log('Migration complete (fresh database).');
    process.exit(0);
  }

  try {
    const raw = fs.readFileSync(SAVE_PATH, 'utf8');
    const data = JSON.parse(raw);

    console.log('Found save.json file. Importing to Firestore...');

    // 1. User Profiles
    if (data.userProfiles && Object.keys(data.userProfiles).length > 0) {
      console.log(`Migrating ${Object.keys(data.userProfiles).length} user profiles...`);
      await db.saveAllUserProfiles(data.userProfiles);
    }

    // 2. Plants
    if (data.plants && Object.keys(data.plants).length > 0) {
      console.log(`Migrating ${Object.keys(data.plants).length} plants...`);
      for (const plant of Object.values(data.plants)) {
        await db.savePlant(plant);
      }
    }

    // 3. Leaderboards
    if (Array.isArray(data.courseLeaderboard)) {
      console.log('Migrating courseLeaderboard...');
      await db.saveLeaderboard('course', data.courseLeaderboard);
    }
    if (Array.isArray(data.megaCourseLeaderboard)) {
      console.log('Migrating megaCourseLeaderboard...');
      await db.saveLeaderboard('mega_course', data.megaCourseLeaderboard);
    }
    if (Array.isArray(data.coopLeaderboard)) {
      console.log('Migrating coopLeaderboard...');
      await db.saveLeaderboard('coop', data.coopLeaderboard);
    }
    if (Array.isArray(data.froggerLeaderboard)) {
      console.log('Migrating froggerLeaderboard...');
      await db.saveLeaderboard('frogger', data.froggerLeaderboard);
    }
    if (Array.isArray(data.fishingLeaderboard)) {
      console.log('Migrating fishingLeaderboard...');
      await db.saveLeaderboard('fishing', data.fishingLeaderboard);
    }

    // 4. Chat History
    if (Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
      console.log(`Migrating ${data.chatHistory.length} chat messages...`);
      await db.saveChatHistory(data.chatHistory);
    }

    console.log('✅ Migration to Google Cloud Firestore completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
