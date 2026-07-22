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

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const SAVE_PATH = path.join(DATA_DIR, 'save.json');
const SAVE_TMP_PATH = path.join(DATA_DIR, 'save.json.tmp');

// --- Persistent Game State ---
const players = {};
const plants = {};
const coins = {};
const userProfiles = {}; // { username: { coins, inventory, equippedHat } }
const chatHistory = [];   // Array of persistent chat message objects
const courseLeaderboard = []; // Array of top speedrun records: [{ name, timeMs, formattedTime }]
const megaCourseLeaderboard = []; // Array of mega speedrun records: [{ name, timeMs, formattedTime }]
const coopLeaderboard = []; // Co-op completion records: [{ names, timeMs, formattedTime, date }]
const CHAT_LOG_FILE = path.join(DATA_DIR, 'chat_history.log');
let plantIdCounter = 0;
let coinIdCounter = 0;
let droppedItemIdCounter = 0;
const droppedItems = {};

// --- Catalog & Configs ---
const SHOP_ITEMS = {
  straw_hat: { id: 'straw_hat', name: 'Straw Hat', type: 'hat', cost: 5 },
  cute_bow: { id: 'cute_bow', name: 'Pink Bow', type: 'hat', cost: 4 },
  crop_seed: { id: 'crop_seed', name: 'Wheat Seed', type: 'seed', seedType: 'crop', cost: 1 },
  carrot_seed: { id: 'carrot_seed', name: 'Carrot Seed', type: 'seed', seedType: 'carrot', cost: 3 },
  corn_seed: { id: 'corn_seed', name: 'Corn Seed', type: 'seed', seedType: 'corn', cost: 6 },
  strawberry_seed: { id: 'strawberry_seed', name: 'Strawberry Seed', type: 'seed', seedType: 'strawberry', cost: 10 },
  flower_seed: { id: 'flower_seed', name: 'Flower Seed', type: 'seed', seedType: 'flower', cost: 20 },
  pumpkin_seed: { id: 'pumpkin_seed', name: 'Pumpkin Seed', type: 'seed', seedType: 'pumpkin', cost: 35 },
  watermelon_seed: { id: 'watermelon_seed', name: 'Watermelon Seed', type: 'seed', seedType: 'watermelon', cost: 50 },
  grape_seed: { id: 'grape_seed', name: 'Grape Seed', type: 'seed', seedType: 'grape', cost: 75 },
  tree_seed: { id: 'tree_seed', name: 'Apple Tree Seed', type: 'seed', seedType: 'tree', cost: 100 }
};

// Farmville-style growth times & rebalanced yields (15 min up to 8 hours)
const SEED_CONFIG = {
  crop: { name: 'Wheat', cost: 1, yield: 3, maxStage: 2, totalTime: 900000, stageTime: 450000 },
  carrot: { name: 'Carrot', cost: 3, yield: 8, maxStage: 2, totalTime: 1800000, stageTime: 900000 },
  corn: { name: 'Corn', cost: 6, yield: 16, maxStage: 2, totalTime: 2700000, stageTime: 1350000 },
  strawberry: { name: 'Strawberry', cost: 10, yield: 28, maxStage: 2, totalTime: 3600000, stageTime: 1800000 },
  flower: { name: 'Flower', cost: 20, yield: 55, maxStage: 3, totalTime: 7200000, stageTime: 2400000 },
  pumpkin: { name: 'Pumpkin', cost: 35, yield: 100, maxStage: 3, totalTime: 10800000, stageTime: 3600000 },
  watermelon: { name: 'Watermelon', cost: 50, yield: 150, maxStage: 3, totalTime: 14400000, stageTime: 4800000 },
  grape: { name: 'Grape', cost: 75, yield: 240, maxStage: 3, totalTime: 21600000, stageTime: 7200000 },
  tree: { name: 'Apple Tree', cost: 100, yield: 350, maxStage: 3, totalTime: 28800000, stageTime: 9600000 }
};

// --- Atomic File Writer ---
let isSaving = false;
async function atomicSaveState() {
  if (isSaving) return;
  isSaving = true;
  try {
    // Sync current connected player states to userProfiles
    Object.values(players).forEach(p => {
      if (p.name) {
        userProfiles[p.name] = {
          coins: p.coins,
          inventory: p.inventory || [],
          equippedHat: p.equippedHat || null
        };
      }
    });

    const dataToSave = JSON.stringify({
      plants,
      coins,
      userProfiles,
      chatHistory: chatHistory.slice(-100),
      courseLeaderboard: courseLeaderboard.slice(0, 10),
      megaCourseLeaderboard: megaCourseLeaderboard.slice(0, 10),
      coopLeaderboard: coopLeaderboard.slice(0, 10),
      timestamp: Date.now()
    }, null, 2);
    await fs.promises.writeFile(SAVE_TMP_PATH, dataToSave, 'utf8');
    await fs.promises.rename(SAVE_TMP_PATH, SAVE_PATH);
  } catch (err) {
    console.error('Atomic save error:', err);
  } finally {
    isSaving = false;
  }
}

try {
  if (fs.existsSync(SAVE_PATH)) {
    const raw = fs.readFileSync(SAVE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.plants) Object.assign(plants, parsed.plants);
    if (parsed.userProfiles) Object.assign(userProfiles, parsed.userProfiles);
    if (Array.isArray(parsed.chatHistory)) chatHistory.push(...parsed.chatHistory);
    if (Array.isArray(parsed.courseLeaderboard)) courseLeaderboard.push(...parsed.courseLeaderboard);
    if (Array.isArray(parsed.megaCourseLeaderboard)) megaCourseLeaderboard.push(...parsed.megaCourseLeaderboard);
    if (Array.isArray(parsed.coopLeaderboard)) coopLeaderboard.push(...parsed.coopLeaderboard);
  }
} catch (e) {}

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
    atomicSaveState();
  }
}, 1000);

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
      coopLeaderboard
    });

    socket.broadcast.emit('playerJoined', players[socket.id]);
  });

  socket.on('playerMove', (data) => {
    if (!players[socket.id]) return;
    const player = players[socket.id];
    player.x = data.x;
    player.yRel = data.yRel !== undefined ? data.yRel : 0;
    player.vx = data.vx || 0; player.vy = data.vy || 0;
    player.facing = data.facing || player.facing;
    player.isMoving = !!data.isMoving;
    player.isJumping = !!data.isJumping;
    player.isGrounded = !!data.isGrounded;

    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      yRel: player.yRel,
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
    const allowed = ['main', 'garden', 'select', 'course', 'course2', 'coop1'];
    if (!allowed.includes(targetWorld)) return;

    const prevWorld = player.world;
    player.world = targetWorld;
    if (targetWorld === 'garden') player.x = 120;
    else if (targetWorld === 'select') player.x = (prevWorld === 'course' ? 240 : (prevWorld === 'coop1' ? 850 : 120));
    else if (targetWorld === 'course') player.x = 120;
    else if (targetWorld === 'course2') player.x = 120;
    else if (targetWorld === 'coop1') player.x = 100;
    else if (prevWorld === 'course2') player.x = 1420;
    else if (prevWorld === 'select') player.x = 1400; // far right in main
    else player.x = 880;

    player.yRel = 0;
    io.emit('playerWorldSwitched', { id: socket.id, world: player.world, x: player.x, yRel: player.yRel });
  });

  socket.on('flipSelectLever', () => {
    const expiresAt = Date.now() + 5000;
    io.emit('selectLeverFlipped', { expiresAt });
  });

  // Collect single coin & spawn next single coin after short delay
  socket.on('collectCoin', (coinId) => {
    if (!players[socket.id] || !coins[coinId]) return;
    delete coins[coinId];
    players[socket.id].coins += 1;
    io.emit('coinCollected', { coinId, playerId: socket.id, coins: players[socket.id].coins });
    atomicSaveState();

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
  });

  // Equip hat
  socket.on('equipItem', (hatId) => {
    const player = players[socket.id];
    if (!player) return;
    if (hatId === null || player.inventory.includes(hatId)) {
      player.equippedHat = hatId;
      io.emit('playerEquipUpdated', { id: socket.id, equippedHat: player.equippedHat, coins: player.coins, inventory: player.inventory });
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
    atomicSaveState();
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
    atomicSaveState();
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

    // Append to text log file
    const logLine = `[${new Date().toISOString()}] ${msgObj.sender}: ${msgObj.text}\n`;
    fs.appendFile(CHAT_LOG_FILE, logLine, (err) => {
      if (err) console.error('Chat log write error:', err);
    });

    io.emit('chatMessage', msgObj);
    atomicSaveState();
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
    } else {
      courseLeaderboard.push(record);
      courseLeaderboard.sort((a, b) => a.timeMs - b.timeMs);
      if (courseLeaderboard.length > 10) courseLeaderboard.length = 10;
      io.emit('leaderboardUpdated', courseLeaderboard);
    }
    atomicSaveState();
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

    atomicSaveState();
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Klipspringer Farmville Single-Coin Server running on http://localhost:${PORT}`);
});
