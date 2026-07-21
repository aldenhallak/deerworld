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

// --- In-Memory State (Single Threaded, Zero Race Conditions) ---
const players = {};
let coinIdCounter = 0;
const coins = {};
let plantIdCounter = 0;
const plants = {};
let droppedItemIdCounter = 0;
const droppedItems = {}; // ground items: { id, type, x, yRel, label, value }

// --- Catalog & Configs ---
const SHOP_ITEMS = {
  straw_hat: { id: 'straw_hat', name: 'Farmer Straw Hat', type: 'hat', cost: 5, color: '#e5c158' },
  flower_crown: { id: 'flower_crown', name: 'Flower Crown', type: 'hat', cost: 8, color: '#ff77aa' },
  cute_bow: { id: 'cute_bow', name: 'Cute Pink Bow', type: 'hat', cost: 4, color: '#ff5599' },
  party_hat: { id: 'party_hat', name: 'Party Cone Hat', type: 'hat', cost: 10, color: '#aa33ff' },
  cool_shades: { id: 'cool_shades', name: 'Cool Sunglasses', type: 'hat', cost: 6, color: '#222222' },
  carrot_seed: { id: 'carrot_seed', name: 'Carrot Seed', type: 'seed', seedType: 'carrot', cost: 2 },
  strawberry_seed: { id: 'strawberry_seed', name: 'Strawberry Seed', type: 'seed', seedType: 'strawberry', cost: 3 },
  flower_seed: { id: 'flower_seed', name: 'Golden Flower Seed', type: 'seed', seedType: 'flower', cost: 4 }
};

const SEED_CONFIG = {
  carrot: { name: 'Carrot', cost: 2, yield: 6, maxStage: 2, stageTime: 7000 },
  strawberry: { name: 'Strawberry', cost: 3, yield: 9, maxStage: 2, stageTime: 9000 },
  flower: { name: 'Golden Flower', cost: 4, yield: 14, maxStage: 3, stageTime: 10000 },
  crop: { name: 'Wheat Crop', cost: 1, yield: 4, maxStage: 2, stageTime: 6000 },
  tree: { name: 'Apple Tree', cost: 2, yield: 10, maxStage: 3, stageTime: 12000 }
};

// --- Atomic File Writer to prevent race conditions ---
let isSaving = false;
async function atomicSaveState() {
  if (isSaving) return;
  isSaving = true;
  try {
    const dataToSave = JSON.stringify({
      plants,
      coins,
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

// Load initial state if present
try {
  if (fs.existsSync(SAVE_PATH)) {
    const raw = fs.readFileSync(SAVE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.plants) Object.assign(plants, parsed.plants);
  }
} catch (e) {
  console.log('No prior save file loaded.');
}

function spawnCoin(x, yRel) {
  const id = `coin_${coinIdCounter++}`;
  coins[id] = { id, x, yRel };
  return coins[id];
}

function initCoins() {
  if (Object.keys(coins).length > 0) return;
  const coinPositions = [
    { x: 150, yRel: -20 }, { x: 300, yRel: -20 }, { x: 500, yRel: -20 },
    { x: 700, yRel: -20 }, { x: 900, yRel: -20 }, { x: 1050, yRel: -20 },
    { x: 130, yRel: -130 }, { x: 200, yRel: -130 },
    { x: 390, yRel: -220 }, { x: 470, yRel: -220 },
    { x: 690, yRel: -150 }, { x: 770, yRel: -150 },
    { x: 230, yRel: -310 }, { x: 300, yRel: -310 },
    { x: 540, yRel: -390 }, { x: 620, yRel: -390 },
    { x: 850, yRel: -280 }, { x: 930, yRel: -280 },
  ];
  coinPositions.forEach(pos => spawnCoin(pos.x, pos.yRel));
}
initCoins();

// --- Growth Loop ---
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

    const spawnX = 200 + Math.random() * 400;

    players[socket.id] = {
      id: socket.id,
      name: username,
      x: spawnX, yRel: 0,
      vx: 0, vy: 0,
      facing: 'right',
      isMoving: false, isJumping: false, isGrounded: true,
      coins: 5, // Start with 5 coins!
      equippedHat: null,
      inventory: ['carrot_seed'] // Free starter seed!
    };

    socket.emit('init', {
      selfId: socket.id,
      players,
      coins,
      plants,
      droppedItems,
      shopCatalog: SHOP_ITEMS
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
      equippedHat: player.equippedHat
    });
  });

  // Collect coin
  socket.on('collectCoin', (coinId) => {
    if (!players[socket.id] || !coins[coinId]) return;
    delete coins[coinId];
    players[socket.id].coins += 1;
    io.emit('coinCollected', { coinId, playerId: socket.id, coins: players[socket.id].coins });
    atomicSaveState();

    setTimeout(() => {
      if (Object.keys(coins).length < 24) {
        const x = 80 + Math.random() * 900;
        const platformYRels = [0, -110, -200, -130, -290, -370, -260];
        const yRel = platformYRels[Math.floor(Math.random() * platformYRels.length)] - 20;
        const nc = spawnCoin(x, yRel);
        io.emit('coinSpawned', nc);
      }
    }, 15000);
  });

  // Buy item from physical shop stall
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

  // Equip hat from inventory
  socket.on('equipItem', (hatId) => {
    const player = players[socket.id];
    if (!player) return;
    if (hatId === null || player.inventory.includes(hatId)) {
      player.equippedHat = hatId;
      io.emit('playerEquipUpdated', { id: socket.id, equippedHat: player.equippedHat, coins: player.coins, inventory: player.inventory });
    }
  });

  // Plant a crop/tree into dirt bed
  socket.on('plant', (data) => {
    const player = players[socket.id];
    if (!player || !data) return;
    
    const plantType = data.type || 'crop';
    const config = SEED_CONFIG[plantType] || SEED_CONFIG.crop;

    // Check if player has seed item or enough coins
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
    if (plant.stage < plant.maxStage) return; // Must be fully grown

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

  // Drop item onto ground (Animal Crossing style)
  socket.on('dropItem', (data) => {
    const player = players[socket.id];
    if (!player || !data) return;
    
    let dropLabel = 'Gift';
    if (data.type === 'coin') {
      if (player.coins < 1) return;
      player.coins -= 1;
      dropLabel = '1 Coin 🪙';
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
      x: player.x,
      yRel: player.yRel,
      type: data.type,
      itemId: data.itemId,
      label: dropLabel
    };

    io.emit('itemDropped', droppedItems[id]);
    socket.emit('coinsUpdated', { coins: player.coins, inventory: player.inventory });
  });

  // Pickup dropped item
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
    io.emit('chatMessage', {
      id: socket.id,
      sender: players[socket.id].name,
      text: cleanMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    });
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Klipspringer Farmville Server running on http://localhost:${PORT}`);
});
