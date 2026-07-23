const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');

// --- Persistent Game State ---
const players = {};
const plants = {};
const coins = {};
const userProfiles = {}; // { username: { coins, inventory, equippedHat } }
const chatHistory = [];   // Array of persistent chat message objects
const courseLeaderboard = []; // Array of top speedrun records
const megaCourseLeaderboard = []; // Array of mega speedrun records
const coopLeaderboard = []; // Co-op completion records
const froggerLeaderboard = []; // Frogger speedrun records
const fishingLeaderboard = []; // Fishing records
let plantIdCounter = 0;
let coinIdCounter = 0;
let droppedItemIdCounter = 0;
const droppedItems = {};

// Initialize Google Cloud Firestore and load state on startup
(async () => {
  await db.initDb();
  const loaded = await db.loadAllState();
  if (loaded.plants) Object.assign(plants, loaded.plants);
  if (loaded.userProfiles) Object.assign(userProfiles, loaded.userProfiles);
  if (Array.isArray(loaded.chatHistory)) chatHistory.push(...loaded.chatHistory);
  if (Array.isArray(loaded.courseLeaderboard)) courseLeaderboard.push(...loaded.courseLeaderboard);
  if (Array.isArray(loaded.megaCourseLeaderboard)) megaCourseLeaderboard.push(...loaded.megaCourseLeaderboard);
  if (Array.isArray(loaded.coopLeaderboard)) coopLeaderboard.push(...loaded.coopLeaderboard);
  if (Array.isArray(loaded.froggerLeaderboard)) froggerLeaderboard.push(...loaded.froggerLeaderboard);
  if (Array.isArray(loaded.fishingLeaderboard)) fishingLeaderboard.push(...loaded.fishingLeaderboard);

  // Sync plant counter
  Object.keys(plants).forEach(id => {
    const num = parseInt(id.replace('plant_', ''), 10);
    if (!isNaN(num) && num >= plantIdCounter) plantIdCounter = num + 1;
  });
})();

// --- SINGLE COIN SPAWNING SYSTEM ---
const COIN_POSITIONS = [
  { x: 150, yRel: -20 }, { x: 300, yRel: -20 }, { x: 500, yRel: -20 },
  { x: 700, yRel: -20 }, { x: 900, yRel: -20 }, { x: 1050, yRel: -20 },
  { x: 130, yRel: -130 }, { x: 200, yRel: -130 },
  { x: 390, yRel: -220 }, { x: 470, yRel: -220 },
  { x: 690, yRel: -150 }, { x: 770, yRel: -150 },
  { x: 230, yRel: -310 }, { x: 300, yRel: -310 },
  { x: 540, yRel: -390 }, { x: 620, yRel: -390 },
  { x: 850, yRel: -280 }, { x: 930, yRel: -280 },
];

function spawnSingleCoin() {
  // Clear any existing coins to ensure strictly ONE coin exists
  Object.keys(coins).forEach(k => delete coins[k]);

  const pos = COIN_POSITIONS[Math.floor(Math.random() * COIN_POSITIONS.length)];
  const id = `coin_${coinIdCounter++}`;
  coins[id] = { id, x: pos.x, yRel: pos.yRel };
  return coins[id];
}

// Initial Single Coin
spawnSingleCoin();

// Growth Tick
setInterval(() => {
  const now = Date.now();
  let updated = false;
  Object.values(plants).forEach(plant => {
    const config = SEED_CONFIG[plant.type] || SEED_CONFIG.crop;
    if (plant.stage < plant.maxStage) {
      const elapsed = now - plant.plantedAt;
      const targetStage = Math.min(plant.maxStage, Math.floor(elapsed / config.stageTime));
      if (targetStage > plant.stage) {
        plant.stage = targetStage;
        updated = true;
        io.emit('plantUpdated', { id: plant.id, stage: plant.stage });
      }
    }
  });
  if (updated) {
    Object.values(plants).forEach(p => db.savePlant(p));
  }
}, 1000);

function broadcastSystemMessage(text) {
  const msgObj = {
    id: 'system',
    sender: 'SYSTEM',
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem: true
  };
  chatHistory.push(msgObj);
  if (chatHistory.length > 200) chatHistory.shift();

  console.log(`[SYSTEM] ${text}`);
  io.emit('chatMessage', msgObj);
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join', (data) => {
    const username = (data && data.name && data.name.trim())
      ? data.name.trim().substring(0, 16)
      : `Klipspringer #${Math.floor(1000 + Math.random() * 9000)}`;

    const saved = userProfiles[username] || { coins: 0, inventory: [], equippedHat: null };
    const spawnX = 200 + Math.random() * 400;

    players[socket.id] = {
      id: socket.id,
      name: username,
      x: spawnX, yRel: 0,
      vx: 0, vy: 0,
      facing: 'right',
      isMoving: false, isJumping: false, isGrounded: true,
      coins: saved.coins !== undefined ? saved.coins : 0,
      equippedHat: saved.equippedHat || null,
      inventory: saved.inventory || [],
      world: 'main'
    };

    socket.emit('init', {
      selfId: socket.id,
      players,
      coins,
      plants,
      droppedItems,
      shopCatalog: SHOP_ITEMS,
      chatHistory,
      courseLeaderboard,
      megaCourseLeaderboard,
      coopLeaderboard,
      froggerLeaderboard,
      fishingLeaderboard
    });

    console.log(`[JOIN] ${username} (${socket.id}) connected`);
    broadcastSystemMessage(`${username} joined the world!`);

    socket.broadcast.emit('playerJoined', players[socket.id]);
  });

  socket.on('playerMove', (data) => {
    if (!players[socket.id]) return;
    const player = players[socket.id];
    player.x = data.x;
    player.yRel = data.yRel !== undefined ? data.yRel : 0;
    if (data.gridX !== undefined) player.gridX = data.gridX;
    if (data.gridY !== undefined) player.gridY = data.gridY;
    player.vx = data.vx || 0; player.vy = data.vy || 0;
    player.facing = data.facing || player.facing;
    player.isMoving = !!data.isMoving;
    player.isJumping = !!data.isJumping;
    player.isGrounded = !!data.isGrounded;

    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      yRel: player.yRel,
      gridX: player.gridX,
      gridY: player.gridY,
      vx: player.vx, vy: player.vy,
      facing: player.facing,
      isMoving: player.isMoving,
      isJumping: player.isJumping,
      isGrounded: player.isGrounded,
      equippedHat: player.equippedHat,
      world: player.world
    });
  });

  // Switch World
  socket.on('switchWorld', (targetWorld) => {
    const player = players[socket.id];
    if (!player) return;
    const allowed = ['main', 'garden', 'select', 'course', 'course2', 'coop1', 'frogger', 'beach'];
    if (!allowed.includes(targetWorld)) return;

    const prevWorld = player.world;
    player.world = targetWorld;
    if (targetWorld === 'garden') player.x = prevWorld === 'beach' ? 1850 : 120;
    else if (targetWorld === 'beach') player.x = 100;
    else if (targetWorld === 'select') player.x = (prevWorld === 'course' ? 240 : (prevWorld === 'frogger' ? 450 : (prevWorld === 'coop1' ? 850 : 120)));
    else if (targetWorld === 'course') player.x = 120;
    else if (targetWorld === 'course2') player.x = 120;
    else if (targetWorld === 'coop1') player.x = 100;
    else if (targetWorld === 'frogger') {
      player.x = 100;
      player.gridX = 6;
      player.gridY = 12;
    }
    else if (prevWorld === 'course2') player.x = 1420;
    else if (prevWorld === 'select') player.x = 1400; // far right in main
    else player.x = 880;

    player.yRel = 0;
    io.emit('playerWorldSwitched', { id: socket.id, world: player.world, x: player.x, yRel: player.yRel, gridX: player.gridX, gridY: player.gridY });
  });

  socket.on('flipSelectLever', () => {
    const expiresAt = Date.now() + 5000;
    io.emit('selectLeverFlipped', { expiresAt });
  });

  // Collect single coin & spawn next single coin after short delay
  socket.on('collectCoin', (coinId) => {
    if (!players[socket.id] || !coins[coinId]) return;
    delete coins[coinId];
    const player = players[socket.id];
    player.coins += 1;
    io.emit('coinCollected', { coinId, playerId: socket.id, coins: player.coins });
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });

    // Spawn next single coin after 1.5 seconds
    setTimeout(() => {
      if (Object.keys(coins).length === 0) {
        const newCoin = spawnSingleCoin();
        io.emit('coinSpawned', newCoin);
      }
    }, 1500);
  });

  // Buy item from shop
  socket.on('buyStallItem', (itemId) => {
    const player = players[socket.id];
    const item = SHOP_ITEMS[itemId];
    if (!player || !item) return;

    if (player.coins < item.cost) {
      socket.emit('notice', { text: `Need ${item.cost} coins for ${item.name}!` });
      return;
    }

    player.coins -= item.cost;
    if (item.type === 'hat') {
      player.equippedHat = item.id;
      if (!player.inventory.includes(item.id)) player.inventory.push(item.id);
    } else {
      player.inventory.push(item.id);
    }

    io.emit('playerEquipUpdated', { id: socket.id, equippedHat: player.equippedHat, coins: player.coins, inventory: player.inventory });
    socket.emit('itemPurchased', { item, coins: player.coins, inventory: player.inventory });
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
    if (item.type === 'hat') {
      broadcastSystemMessage(`${player.name} unlocked the ${item.name}!`);
    }
  });

  // Equip hat
  socket.on('equipItem', (hatId) => {
    const player = players[socket.id];
    if (!player) return;
    if (hatId === null || player.inventory.includes(hatId)) {
      player.equippedHat = hatId;
      io.emit('playerEquipUpdated', { id: socket.id, equippedHat: player.equippedHat, coins: player.coins, inventory: player.inventory });
      if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
    }
  });

  // Plant a crop/tree (restricted strictly to garden world & soil bed)
  socket.on('plant', (data) => {
    const player = players[socket.id];
    if (!player || !data) return;

    if (player.world !== 'garden') {
      socket.emit('notice', { text: 'You can only plant in the Garden World!' });
      return;
    }
    if (data.x < 180 || data.x > 780 || Math.abs(data.yRel) > 40) {
      socket.emit('notice', { text: 'Must plant inside soil bed!' });
      return;
    }

    const plantType = data.type || 'crop';
    const config = SEED_CONFIG[plantType] || SEED_CONFIG.crop;

    const seedItemId = `${plantType}_seed`;
    const seedIdx = player.inventory.indexOf(seedItemId);

    if (seedIdx !== -1) {
      player.inventory.splice(seedIdx, 1);
    } else if (player.coins >= config.cost) {
      player.coins -= config.cost;
    } else {
      socket.emit('notice', { text: `Need seed or ${config.cost} coins to plant!` });
      return;
    }

    const id = `plant_${plantIdCounter++}`;
    plants[id] = {
      id,
      type: plantType,
      x: data.x,
      yRel: data.yRel,
      ownerId: socket.id,
      ownerName: player.name,
      stage: 0,
      maxStage: config.maxStage,
      plantedAt: Date.now()
    };

    socket.emit('coinsUpdated', { coins: player.coins, inventory: player.inventory });
    io.emit('plantCreated', plants[id]);
    db.savePlant(plants[id]);
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
  });

  // Harvest plant
  socket.on('harvest', (plantId) => {
    const player = players[socket.id];
    const plant = plants[plantId];
    if (!player || !plant) return;

    const config = SEED_CONFIG[plant.type] || SEED_CONFIG.crop;
    if (plant.stage < plant.maxStage) return;

    delete plants[plantId];
    player.coins += config.yield;
    io.emit('plantHarvested', {
      plantId,
      playerId: socket.id,
      coins: player.coins,
      reward: config.yield,
      plantType: plant.type
    });
    db.deletePlant(plantId);
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
  });

  // Drop item
  socket.on('dropItem', (data) => {
    const player = players[socket.id];
    if (!player || !data) return;

    let dropLabel = 'Gift';
    if (data.type === 'coin') {
      if (player.coins < 1) return;
      player.coins -= 1;
      dropLabel = '1 Coin';
    } else if (data.type === 'item') {
      const idx = player.inventory.indexOf(data.itemId);
      if (idx === -1) return;
      const itemId = player.inventory.splice(idx, 1)[0];
      const itemInfo = SHOP_ITEMS[itemId];
      dropLabel = itemInfo ? itemInfo.name : itemId;
    }

    const id = `drop_${droppedItemIdCounter++}`;
    droppedItems[id] = {
      id,
      world: player.world,
      x: player.x,
      yRel: player.yRel,
      type: data.type,
      itemId: data.itemId,
      label: dropLabel,
      droppedBy: socket.id,
      createdAt: Date.now()
    };

    io.emit('itemDropped', droppedItems[id]);
    socket.emit('coinsUpdated', { coins: player.coins, inventory: player.inventory });
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
  });

  // Pickup item
  socket.on('pickupItem', (dropId) => {
    const player = players[socket.id];
    const drop = droppedItems[dropId];
    if (!player || !drop) return;

    delete droppedItems[dropId];
    if (drop.type === 'coin') {
      player.coins += 1;
    } else if (drop.itemId) {
      player.inventory.push(drop.itemId);
    }

    io.emit('itemPickedUp', { dropId, playerId: socket.id, coins: player.coins, inventory: player.inventory });
    socket.emit('coinsUpdated', { coins: player.coins, inventory: player.inventory });
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
  });

  // Kiss
  socket.on('playerKiss', (data) => {
    if (!players[socket.id]) return;
    socket.broadcast.emit('playerKissed', {
      id: socket.id,
      targetId: data ? data.targetId : null
    });
  });

  socket.on('sendChat', (messageText) => {
    if (!players[socket.id]) return;
    const cleanMsg = (messageText || '').trim().substring(0, 140);
    if (!cleanMsg) return;

    const msgObj = {
      id: socket.id,
      sender: players[socket.id].name,
      text: cleanMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    chatHistory.push(msgObj);
    if (chatHistory.length > 200) chatHistory.shift();

    // Log chat message to stdout (Render log stream)
    console.log(`[CHAT] [${msgObj.time}] ${msgObj.sender}: ${msgObj.text}`);

    io.emit('chatMessage', msgObj);
    db.saveChatHistory(chatHistory);
  });

  // Submit Obstacle Course Speedrun Time (courseId: 'course' or 'course2')
  socket.on('submitCourseTime', (payload) => {
    const player = players[socket.id];
    let timeMs = typeof payload === 'number' ? payload : (payload ? payload.timeMs : null);
    let courseId = (payload && payload.courseId) || 'course';

    if (!player || typeof timeMs !== 'number' || timeMs < 500) return; // Min 0.5 sec sanity check

    const sec = (timeMs / 1000).toFixed(2);
    const formattedTime = `${sec}s`;

    const record = {
      name: player.name,
      timeMs: Math.round(timeMs),
      formattedTime,
      date: new Date().toLocaleDateString()
    };

    if (courseId === 'course2') {
      megaCourseLeaderboard.push(record);
      megaCourseLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
      if (megaCourseLeaderboard.length > 10) megaCourseLeaderboard.length = 10;
      io.emit('megaLeaderboardUpdated', megaCourseLeaderboard);
      broadcastSystemMessage(`${player.name} completed Mega Course Stage 2 in ${formattedTime}!`);
      db.saveLeaderboard('mega_course', megaCourseLeaderboard);
    } else {
      courseLeaderboard.push(record);
      courseLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
      if (courseLeaderboard.length > 10) courseLeaderboard.length = 10;
      io.emit('leaderboardUpdated', courseLeaderboard);
      broadcastSystemMessage(`${player.name} completed Obstacle Course 1 in ${formattedTime}!`);
      db.saveLeaderboard('course', courseLeaderboard);
    }
  });

  // Submit Co-op Puzzle completion time
  socket.on('submitCoopTime', (payload) => {
    const player = players[socket.id];
    if (!player || !payload || typeof payload.timeMs !== 'number' || payload.timeMs < 1000) return;

    // Find the partner (other coop1 player named in payload)
    const partnerName = payload.partnerName || '?';
    const sec = (payload.timeMs / 1000).toFixed(2);
    const formattedTime = `${sec}s`;

    const record = {
      names: [player.name, partnerName],
      timeMs: Math.round(payload.timeMs),
      formattedTime,
      date: new Date().toLocaleDateString()
    };

    coopLeaderboard.push(record);
    coopLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
    if (coopLeaderboard.length > 10) coopLeaderboard.length = 10;
    io.emit('coopLeaderboardUpdated', coopLeaderboard);
    broadcastSystemMessage(`${player.name} & ${partnerName} completed the Co-op Puzzle in ${formattedTime}!`);
    db.saveLeaderboard('coop', coopLeaderboard);

    // Teleport ALL coop1 players back to spawn after a short delay
    setTimeout(() => {
      Object.values(players).forEach(p => {
        if (p.world === 'coop1') {
          p.x = p.id === socket.id ? 100 : 180;
          p.yRel = 0;
          io.emit('playerWorldSwitched', { id: p.id, world: 'coop1', x: p.x, yRel: p.yRel });
        }
      });
      io.emit('coopLevelReset', {});
    }, 3000);
  });

  // Submit Frogger Level completion time
  socket.on('submitFroggerTime', (payload) => {
    const player = players[socket.id];
    let timeMs = typeof payload === 'number' ? payload : (payload ? payload.timeMs : null);
    if (!player || typeof timeMs !== 'number' || timeMs < 500) return;

    const sec = (timeMs / 1000).toFixed(2);
    const formattedTime = `${sec}s`;
    const record = {
      name: player.name,
      timeMs: Math.round(timeMs),
      formattedTime,
      date: new Date().toLocaleDateString()
    };

    froggerLeaderboard.push(record);
    froggerLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
    if (froggerLeaderboard.length > 10) froggerLeaderboard.length = 10;
    io.emit('froggerLeaderboardUpdated', froggerLeaderboard);
    broadcastSystemMessage(`${player.name} completed Klipspringer Crossing in ${formattedTime}!`);
    db.saveLeaderboard('frogger', froggerLeaderboard);
  });

  // Submit Fish Catch
  socket.on('submitFishCatch', (payload) => {
    const player = players[socket.id];
    if (!player || !payload) return;

    const yieldCoins = Number(payload.yield) || 1;
    player.coins += yieldCoins;

    // Update player's fishing leaderboard entry
    let entry = fishingLeaderboard.find(e => e.name === player.name);
    if (entry) {
      entry.fishCount = (entry.fishCount || 0) + 1;
      entry.lastFish = payload.name || 'Fish';
    } else {
      entry = { name: player.name, fishCount: 1, lastFish: payload.name || 'Fish' };
      fishingLeaderboard.push(entry);
    }
    fishingLeaderboard.sort((a, b) => b.fishCount - a.fishCount);
    if (fishingLeaderboard.length > 10) fishingLeaderboard.length = 10;

    io.emit('fishingLeaderboardUpdated', fishingLeaderboard);
    socket.emit('coinsUpdated', { coins: player.coins, inventory: player.inventory });
    broadcastSystemMessage(`${player.name} caught a ${payload.name || 'Fish'}! (+${yieldCoins} coins)`);
    db.saveLeaderboard('fishing', fishingLeaderboard);
    if (player.name) db.saveUserProfile(player.name, { coins: player.coins, inventory: player.inventory, equippedHat: player.equippedHat });
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      const p = players[socket.id];
      console.log(`[LEAVE] ${p.name} (${socket.id}) disconnected`);
      if (p.name) db.saveUserProfile(p.name, { coins: p.coins, inventory: p.inventory, equippedHat: p.equippedHat });
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Klipspringer Farmville Single-Coin Server running on http://localhost:${PORT}`);
});
