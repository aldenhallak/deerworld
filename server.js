const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

const players = {};

// --- Coin State ---
let coinIdCounter = 0;
const coins = {};

function spawnCoin(x, yRel) {
  const id = `coin_${coinIdCounter++}`;
  coins[id] = { id, x, yRel };
  return coins[id];
}

function initCoins() {
  // Coins spread across platforms using relative ground offsets (yRel)
  // yRel values: 0 = ground floor, -110 = plat1, -200 = plat2, -130 = plat3, -290 = plat4, -370 = plat5, -260 = plat6
  const coinPositions = [
    // Ground floor
    { x: 150, yRel: -20 }, { x: 300, yRel: -20 }, { x: 500, yRel: -20 },
    { x: 700, yRel: -20 }, { x: 900, yRel: -20 }, { x: 1050, yRel: -20 },
    // Platform 1 (yRel: -110)
    { x: 130, yRel: -130 }, { x: 200, yRel: -130 },
    // Platform 2 (yRel: -200)
    { x: 390, yRel: -220 }, { x: 470, yRel: -220 },
    // Platform 3 (yRel: -130)
    { x: 690, yRel: -150 }, { x: 770, yRel: -150 },
    // Platform 4 (yRel: -290)
    { x: 230, yRel: -310 }, { x: 300, yRel: -310 },
    // Platform 5 (yRel: -370)
    { x: 540, yRel: -390 }, { x: 620, yRel: -390 },
    // Platform 6 (yRel: -260)
    { x: 850, yRel: -280 }, { x: 930, yRel: -280 },
  ];
  coinPositions.forEach(pos => spawnCoin(pos.x, pos.yRel));
}
initCoins();

// --- Crop & Tree State ---
let plantIdCounter = 0;
const plants = {}; // { id, type ('crop'|'tree'), x, yRel, ownerId, ownerName, stage, maxStage, plantedAt }

// Growth timing thresholds (ms per stage)
const PLANT_CONFIG = {
  crop: {
    cost: 1,
    yield: 4,
    maxStage: 2, // 0: sprout, 1: growing crop, 2: harvestable wheat
    stageTime: 8000 // 8s per stage (16s total)
  },
  tree: {
    cost: 2,
    yield: 10,
    maxStage: 3, // 0: sapling, 1: small tree, 2: full tree, 3: fruit-bearing tree
    stageTime: 12000 // 12s per stage (36s total)
  }
};

setInterval(() => {
  const now = Date.now();
  Object.values(plants).forEach(plant => {
    const config = PLANT_CONFIG[plant.type] || PLANT_CONFIG.crop;
    if (plant.stage < plant.maxStage) {
      const elapsed = now - plant.plantedAt;
      const targetStage = Math.min(plant.maxStage, Math.floor(elapsed / config.stageTime));
      if (targetStage > plant.stage) {
        plant.stage = targetStage;
        io.emit('plantUpdated', { id: plant.id, stage: plant.stage });
      }
    }
  });
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
      coins: 3 // Start with 3 coins!
    };

    // Send world state to new player
    socket.emit('init', {
      selfId: socket.id,
      players,
      coins,
      plants
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
      isGrounded: player.isGrounded
    });
  });

  // Collect a coin
  socket.on('collectCoin', (coinId) => {
    if (!players[socket.id] || !coins[coinId]) return;
    delete coins[coinId];
    players[socket.id].coins += 1;
    // Broadcast collection
    io.emit('coinCollected', { coinId, playerId: socket.id, coins: players[socket.id].coins });
    // Respawn coin elsewhere after 15 seconds
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

  // Plant a crop or tree
  socket.on('plant', (data) => {
    if (!players[socket.id] || !data) return;
    const plantType = data.type === 'tree' ? 'tree' : 'crop';
    const config = PLANT_CONFIG[plantType];

    if (players[socket.id].coins < config.cost) return;

    players[socket.id].coins -= config.cost;
    const id = `plant_${plantIdCounter++}`;
    
    plants[id] = {
      id,
      type: plantType,
      x: data.x,
      yRel: data.yRel,
      ownerId: socket.id,
      ownerName: players[socket.id].name,
      stage: 0,
      maxStage: config.maxStage,
      plantedAt: Date.now()
    };

    socket.emit('coinsUpdated', { coins: players[socket.id].coins });
    io.emit('plantCreated', plants[id]);
  });

  // Harvest a plant (crop or tree)
  socket.on('harvest', (plantId) => {
    if (!players[socket.id]) return;
    const plant = plants[plantId];
    if (!plant) return;

    const config = PLANT_CONFIG[plant.type] || PLANT_CONFIG.crop;
    if (plant.stage < plant.maxStage) return; // Must be fully grown

    delete plants[plantId];
    players[socket.id].coins += config.yield;
    io.emit('plantHarvested', {
      plantId,
      playerId: socket.id,
      coins: players[socket.id].coins,
      reward: config.yield,
      plantType: plant.type
    });
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
  console.log(`Klipspringer Server running on http://localhost:${PORT}`);
});
