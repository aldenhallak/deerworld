// Klipspringer Platformer — Multi-World Main Entrypoint
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const joinModal = document.getElementById('joinModal');
const joinForm = document.getElementById('joinForm');
const usernameInput = document.getElementById('usernameInput');
const chatBar = document.getElementById('chatBar');
const chatMessagesEl = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const btnJump = document.getElementById('btnJump');

// Shop Modal elements
const shopModal = document.getElementById('shopModal');
const shopGrid = document.getElementById('shopGrid');
const shopCoinsText = document.getElementById('shopCoinsText');
const btnCloseShop = document.getElementById('btnCloseShop');

let socket = null;
let selfId = null;
let players = {};
let speechBubbles = {};
let keysPressed = {};
let particles = [];
let stepTimer = 0;

// World & Inventory State
let myWorld = 'main'; // 'main', 'garden', 'select', 'course', 'course2', or 'coop1'
let coins = {};        // { id: {id, x, yRel} }
let plants = {};       // { id: {id, type, x, yRel, stage, maxStage, ownerName} }
let droppedItems = {}; // { id: {id, world, type, x, yRel, label} }
let shopCatalog = {};
let courseLeaderboard = [];
let megaCourseLeaderboard = [];
let coopLeaderboard = [];
let froggerLeaderboard = [];
let courseRunStartTime = 0;
let courseRunFinished = false;
let coopStartTime = 0;
let coopFinished = false;
let froggerRunStartTime = 0;
let froggerRunFinished = false;
let myCoins = 0;
let myInventory = [];
let myEquippedHat = null;

// ---- Sprites ----
const spriteF = new Image(); spriteF.src = 'sprite_f.png';
const spriteG = new Image(); spriteG.src = 'sprite_g.png';
const spriteH = new Image(); spriteH.src = 'sprite_h.png';
let imagesLoaded = false, loadedCount = 0;
function onImgLoad() { if (++loadedCount >= 3) imagesLoaded = true; }
spriteF.onload = spriteG.onload = spriteH.onload = onImgLoad;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---- Socket Connection ----
function connectSocket(username) {
  socket = io();

  socket.on('connect', () => {
    socket.emit('join', { name: username });
  });

  socket.on('init', (data) => {
    selfId = data.selfId;
    players = {};
    const groundY = getGroundY();
    for (let id in data.players) {
      const p = data.players[id];
      const absY = groundY + (p.yRel !== undefined ? p.yRel : 0);
      players[id] = {
        ...p,
        world: p.world || 'main',
        renderX: Number(p.x) || 300,
        renderY: absY,
        y: absY,
        vx: 0, vy: 0,
        coyoteTimer: 0, jumpBufferTimer: 0
      };
    }
    coins = data.coins || {};
    plants = data.plants || {};
    droppedItems = data.droppedItems || {};
    shopCatalog = data.shopCatalog || {};
    if (Array.isArray(data.courseLeaderboard)) courseLeaderboard = data.courseLeaderboard;
    if (Array.isArray(data.megaCourseLeaderboard)) megaCourseLeaderboard = data.megaCourseLeaderboard;
    if (Array.isArray(data.coopLeaderboard)) coopLeaderboard = data.coopLeaderboard;
    if (Array.isArray(data.froggerLeaderboard)) froggerLeaderboard = data.froggerLeaderboard;
    
    const me = data.players[selfId];
    if (me) {
      myWorld = me.world || 'main';
      myCoins = me.coins !== undefined ? me.coins : 0;
      myInventory = me.inventory || [];
      myEquippedHat = me.equippedHat || null;
    }

    if (Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
      chatMessagesEl.innerHTML = '';
      data.chatHistory.forEach(msg => addChatMessage(msg));
    }

    joinModal.classList.add('hidden');
    chatBar.classList.remove('hidden');
    renderShopGrid();
  });

  socket.on('playerJoined', (p) => {
    const groundY = getGroundY();
    const absY = groundY + (p.yRel !== undefined ? p.yRel : 0);
    players[p.id] = { ...p, world: p.world || 'main', renderX: p.x || 300, renderY: absY, y: absY, vx: 0, vy: 0, coyoteTimer: 0, jumpBufferTimer: 0 };
  });

  socket.on('playerMoved', (data) => {
    if (!players[data.id] || data.id === selfId) return;
    const p = players[data.id];
    const groundY = getGroundY();
    p.x = Number(data.x) || p.x;
    p.y = groundY + (data.yRel !== undefined ? Number(data.yRel) : 0);
    p.vx = Number(data.vx) || 0; p.vy = Number(data.vy) || 0;
    p.facing = data.facing; p.isMoving = data.isMoving;
    p.isJumping = data.isJumping; p.isGrounded = data.isGrounded;
    p.equippedHat = data.equippedHat;
    if (data.world) p.world = data.world;
  });

  socket.on('playerWorldSwitched', (data) => {
    if (players[data.id]) {
      players[data.id].world = data.world;
      players[data.id].x = data.x;
      const groundY = getGroundY();
      players[data.id].y = groundY + data.yRel;
      if (data.id === selfId) {
        myWorld = data.world;
        courseRunStartTime = 0;
        courseRunFinished = false;
        coopStartTime = 0;
        coopFinished = false;
        froggerRunStartTime = 0;
        froggerRunFinished = false;
        let wName = 'Main World';
        if (data.world === 'garden') wName = 'Garden World';
        else if (data.world === 'select') wName = 'Level Selection';
        else if (data.world === 'course') wName = 'Obstacle Course 1';
        else if (data.world === 'course2') wName = 'MEGA Obstacle Course';
        else if (data.world === 'coop1') wName = 'Co-op Puzzle 1';
        else if (data.world === 'frogger') {
          wName = 'Frogger Arcade';
          if (typeof FroggerMode !== 'undefined') FroggerMode.init();
        }
        spawnFloatText(players[selfId].x, players[selfId].y - 40, `Entered ${wName}!`, '#00e676');
      }
    }
  });

  socket.on('playerKissed', (data) => {
    if (players[data.id] && players[data.id].world === myWorld) {
      spawnHeartParticles(players[data.id].x, players[data.id].y - 30);
      if (data.targetId && players[data.targetId])
        spawnHeartParticles(players[data.targetId].x, players[data.targetId].y - 30);
      playKissSound();
    }
  });

  socket.on('playerEquipUpdated', (data) => {
    if (players[data.id]) {
      players[data.id].equippedHat = data.equippedHat;
      if (data.id === selfId) {
        myEquippedHat = data.equippedHat;
        myCoins = data.coins;
        myInventory = data.inventory || [];
        updateShopBalance();
      }
    }
  });

  socket.on('notice', (data) => {
    if (selfId && players[selfId]) {
      spawnFloatText(players[selfId].x, players[selfId].y - 40, data.text, '#ff5252');
    }
  });

  socket.on('itemPurchased', (data) => {
    myCoins = data.coins;
    myInventory = data.inventory;
    playShopSound();
    updateShopBalance();
    renderShopGrid();
    if (selfId && players[selfId]) {
      spawnFloatText(players[selfId].x, players[selfId].y - 40, `Bought ${data.item.name}!`, '#76ff03');
    }
  });

  socket.on('playerLeft', (id) => {
    delete players[id];
    delete speechBubbles[id];
  });

  socket.on('chatMessage', (msg) => {
    addChatMessage(msg);
    if (!msg.isSystem && msg.id && players[msg.id]) {
      speechBubbles[msg.id] = { text: msg.text, expiresAt: Date.now() + 5000 };
    }
  });

  // Coin events
  socket.on('coinCollected', (data) => {
    delete coins[data.coinId];
    if (data.playerId === selfId) {
      myCoins = data.coins;
      playCoinSound();
      updateShopBalance();
      spawnFloatText(players[selfId].x, players[selfId].y - 40, '+1 Coin', '#ffd700');
    }
  });

  socket.on('coinSpawned', (coin) => {
    coins[coin.id] = coin;
  });

  socket.on('coinsUpdated', (data) => {
    myCoins = data.coins;
    if (data.inventory) myInventory = data.inventory;
    updateShopBalance();
  });

  // Plant events
  socket.on('plantCreated', (plant) => {
    plants[plant.id] = plant;
    if (myWorld === 'garden') playPlantSound();
  });

  socket.on('plantUpdated', (data) => {
    if (plants[data.id]) plants[data.id].stage = data.stage;
  });

  socket.on('plantHarvested', (data) => {
    delete plants[data.plantId];
    if (data.playerId === selfId) {
      myCoins = data.coins;
      playHarvestSound();
      updateShopBalance();
      spawnFloatText(players[selfId].x, players[selfId].y - 40, `+${data.reward} Coins`, '#76ff03');
    }
  });

  // Item dropping / pickup
  socket.on('itemDropped', (drop) => {
    droppedItems[drop.id] = drop;
  });

  socket.on('itemPickedUp', (data) => {
    delete droppedItems[data.dropId];
    if (data.playerId === selfId) {
      myCoins = data.coins;
      if (data.inventory) myInventory = data.inventory;
      playCoinSound();
      updateShopBalance();
      spawnFloatText(players[selfId].x, players[selfId].y - 40, 'Picked up item!', '#ffd700');
    }
  });

  socket.on('leaderboardUpdated', (lb) => {
    courseLeaderboard = lb || [];
  });

  socket.on('megaLeaderboardUpdated', (lb) => {
    megaCourseLeaderboard = lb || [];
  });

  socket.on('coopLeaderboardUpdated', (lb) => {
    coopLeaderboard = lb || [];
  });

  socket.on('froggerLeaderboardUpdated', (lb) => {
    froggerLeaderboard = lb || [];
  });

  socket.on('coopLevelReset', () => {
    if (typeof COOP_LEVEL_1 !== 'undefined') {
      COOP_LEVEL_1.keys.forEach(k => k.isCollected = false);
      COOP_LEVEL_1.plates.forEach(p => p.isPressed = false);
      COOP_LEVEL_1.locks.forEach(l => l.isOpen = false);
    }
    coopStartTime = 0;
    coopFinished = false;
  });

  socket.on('selectLeverFlipped', (data) => {
    selectLeverExpiresAt = data.expiresAt;
    playShopSound();
  });
}

// ---- Shop Popup Modal Logic ----
function updateShopBalance() {
  if (shopCoinsText) shopCoinsText.innerText = myCoins;
}

function renderShopGrid() {
  if (!shopGrid || !shopCatalog) return;
  shopGrid.innerHTML = '';

  Object.values(shopCatalog).forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    const canAfford = myCoins >= item.cost;

    card.innerHTML = `
      <div>
        <div class="item-name">${escapeHTML(item.name)}</div>
      </div>
      <div class="item-footer">
        <span class="item-cost">${item.cost} 🪙</span>
        <button type="button" class="buy-btn" ${canAfford ? '' : 'disabled'}>BUY</button>
      </div>
    `;

    const buyBtn = card.querySelector('.buy-btn');
    buyBtn.addEventListener('click', () => {
      if (socket) socket.emit('buyStallItem', item.id);
    });

    shopGrid.appendChild(card);
  });
}

function openShopModal() {
  updateShopBalance();
  renderShopGrid();
  shopModal.classList.remove('hidden');
}

function closeShopModal() {
  shopModal.classList.add('hidden');
}

if (btnCloseShop) {
  btnCloseShop.addEventListener('click', closeShopModal);
}

// ---- Particles & Text ----
const floatTexts = [];

function spawnHeartParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 40,
      vy: -60 - Math.random() * 50,
      alpha: 1.0,
      scale: 0.8 + Math.random() * 0.6,
      life: 1.2,
      emoji: '❤️'
    });
  }
}

function spawnFloatText(x, y, text, color = '#ffe066') {
  floatTexts.push({ x, y, text, color, alpha: 1, vy: -50, life: 1.2 });
}

// ---- Actions & Interactions ----
function tryKiss() {
  getAudioContext();
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  let nearestPartner = null, minDist = 80;
  Object.values(players).forEach(other => {
    if (other.id !== selfId && other.world === myWorld) {
      const d = Math.hypot(me.x - other.x, me.y - other.y);
      if (d < minDist) { minDist = d; nearestPartner = other; }
    }
  });
  spawnHeartParticles(me.x, me.y - 30);
  playKissSound();
  if (nearestPartner) spawnHeartParticles(nearestPartner.x, nearestPartner.y - 30);
  socket.emit('playerKiss', { targetId: nearestPartner ? nearestPartner.id : null });
}

function tryInteract() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const groundY = getGroundY();

  // 1. World Portal / Doorway Interaction
  const mainPortalX = canvas.width - 100;
  const shopX = canvas.width - 100;

  if (myWorld === 'main' && Math.abs(me.x - mainPortalX) < 70 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'garden');
    return;
  }
  if (myWorld === 'main' && Math.abs(me.x - (canvas.width - 200)) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'select');
    return;
  }
  if (myWorld === 'garden' && Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'main');
    return;
  }
  if (myWorld === 'select') {
    if (Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
      socket.emit('switchWorld', 'main');
      return;
    }
    if (Math.abs(me.x - 240) < 60 && Math.abs(me.y - groundY) < 30) {
      socket.emit('switchWorld', 'course');
      return;
    }
    if (Math.abs(me.x - 450) < 60 && Math.abs(me.y - groundY) < 30) {
      socket.emit('switchWorld', 'frogger');
      return;
    }
    if (Math.abs(me.x - 650) < 60 && Math.abs(me.y - groundY) < 30) {
      if (socket) socket.emit('flipSelectLever');
      return;
    }
    if (Math.abs(me.x - 850) < 60 && Math.abs(me.y - groundY) < 30) {
      socket.emit('switchWorld', 'coop1');
      return;
    }
    if (Math.abs(me.x - 950) < 60 && Math.abs(me.y - groundY) < 30) {
      if (socket) socket.emit('flipSelectLever');
      return;
    }
  }
  if (myWorld === 'course' && Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'select');
    return;
  }
  // Enter Mega Course from Finish Island of Course 1 (x: 1440)
  if (myWorld === 'course' && Math.abs(me.x - 1440) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'course2');
    return;
  }
  if (myWorld === 'course2' && Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'course');
    return;
  }
  if (myWorld === 'coop1' && Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'select');
    return;
  }
  if (myWorld === 'frogger' && Math.abs(me.x - 80) < 60 && Math.abs(me.y - groundY) < 30) {
    socket.emit('switchWorld', 'select');
    return;
  }

  // 2. Open Shop Popup Modal (when near Shop Stall on far right in Garden World)
  if (myWorld === 'garden' && Math.abs(me.x - shopX) < 75 && Math.abs(me.y - groundY) < 30) {
    openShopModal();
    return;
  }

  // 4. Harvestable Plants nearby (Garden World only)
  if (myWorld === 'garden') {
    let harvestTarget = null, minDist = 70;
    Object.values(plants).forEach(plant => {
      const plantAbsY = groundY + plant.yRel;
      if (plant.stage >= plant.maxStage) {
        const d = Math.hypot(me.x - plant.x, me.y - plantAbsY);
        if (d < minDist) { minDist = d; harvestTarget = plant; }
      }
    });

    if (harvestTarget) {
      socket.emit('harvest', harvestTarget.id);
      return;
    }
  }

  // 5. Plant Seed (STRICT Soil Bed Constraint in Garden World: x: 180..canvas.width - 220)
  if (myWorld !== 'garden') {
    spawnFloatText(me.x, me.y - 40, 'Enter Garden World to plant!', '#ffab40');
    return;
  }
  if (me.x < 180 || me.x > canvas.width - 220 || Math.abs(me.y - groundY) > 20) {
    spawnFloatText(me.x, me.y - 40, 'Must plant inside soil bed!', '#ff5252');
    return;
  }

  const yRel = me.y - groundY;
  const seedOrder = ['carrot_seed','corn_seed','strawberry_seed','flower_seed','pumpkin_seed','watermelon_seed','grape_seed','tree_seed','crop_seed'];
  let foundSeed = seedOrder.find(s => myInventory.includes(s));

  if (foundSeed) {
    const type = shopCatalog[foundSeed] ? shopCatalog[foundSeed].seedType || 'crop' : 'crop';
    socket.emit('plant', { type, x: me.x, yRel });
  } else if (myCoins >= 1) {
    socket.emit('plant', { type: 'crop', x: me.x, yRel });
  } else {
    spawnFloatText(me.x, me.y - 40, 'No seeds or coins to plant!', '#ff5252');
  }
}

function cycleEquippedHat() {
  if (!selfId || !players[selfId]) return;
  const hats = myInventory.filter(id => shopCatalog[id] && shopCatalog[id].type === 'hat');
  hats.unshift(null);

  const currentIdx = hats.indexOf(myEquippedHat);
  const nextIdx = (currentIdx + 1) % hats.length;
  const nextHat = hats[nextIdx];

  socket.emit('equipItem', nextHat);
  playShopSound();
  const label = nextHat && shopCatalog[nextHat] ? shopCatalog[nextHat].name : 'Barehead';
  spawnFloatText(players[selfId].x, players[selfId].y - 40, `Equipped: ${label}`, '#00e676');
}

function dropCoinOnGround() {
  if (!selfId || !players[selfId]) return;
  if (myCoins < 1) {
    spawnFloatText(players[selfId].x, players[selfId].y - 40, 'No coins to drop!', '#ff5252');
    return;
  }
  const groundY = getGroundY();
  const me = players[selfId];
  socket.emit('dropItem', { type: 'coin', x: me.x, yRel: me.y - groundY });
}

// ---- Chat UI ----
function addChatMessage(msg) {
  if (!chatMessagesEl || !msg) return;
  const div = document.createElement('div');
  div.className = 'chat-msg' + (msg.isSystem ? ' system' : '');

  if (msg.isSystem) {
    div.textContent = msg.text || '';
  } else {
    const senderSpan = document.createElement('span');
    senderSpan.className = 'sender';
    senderSpan.textContent = `${msg.sender || 'Anonymous'}: `;
    div.appendChild(senderSpan);

    const textNode = document.createTextNode(msg.text || '');
    div.appendChild(textNode);
  }

  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  while (chatMessagesEl.children.length > 50) {
    chatMessagesEl.removeChild(chatMessagesEl.firstChild);
  }
}

// ---- Inputs ----
function openChatInput() {
  chatForm.classList.add('active');
  chatInput.focus();
}

function closeChatInput() {
  chatForm.classList.remove('active');
  chatInput.value = '';
  chatInput.blur();
}

window.addEventListener('keydown', (e) => {
  getAudioContext();

  if (e.code === 'Escape') {
    closeChatInput();
    closeShopModal();
    return;
  }

  if (e.key === 'Enter') {
    if (document.activeElement !== chatInput) {
      openChatInput();
      e.preventDefault();
      return;
    }
  }

  if (document.activeElement === chatInput || document.activeElement === usernameInput) return;

  if (myWorld === 'frogger') {
    if (e.code === 'Escape' || e.code === 'KeyE') {
      if (socket) socket.emit('switchWorld', 'select');
      return;
    }
    if (typeof FroggerMode !== 'undefined') {
      FroggerMode.handleKeyDown(e.code);
    }
    return;
  }

  if (['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space'].includes(e.code))
    keysPressed[e.code] = true;

  if (e.code === 'KeyK') tryKiss();
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') cycleEquippedHat();
  if (e.code === 'KeyQ') dropCoinOnGround();

  if (['Space','KeyW','ArrowUp'].includes(e.code) && selfId && players[selfId])
    players[selfId].jumpBufferTimer = 0.15;
});

window.addEventListener('keyup', (e) => {
  delete keysPressed[e.code];
  if (['Space','KeyW','ArrowUp'].includes(e.code) && selfId && players[selfId]) {
    const me = players[selfId];
    if (me.vy < -250) me.vy *= 0.45;
  }
});

if (btnJump) {
  btnJump.addEventListener('pointerdown', () => {
    getAudioContext();
    if (selfId && players[selfId]) players[selfId].jumpBufferTimer = 0.15;
  });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  getAudioContext();
  const text = chatInput.value.trim();
  if (text && socket) {
    socket.emit('sendChat', text);
  }
  closeChatInput();
});

chatInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (document.activeElement !== chatInput) {
      chatForm.classList.remove('active');
    }
  }, 150);
});

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  getAudioContext();
  const name = usernameInput.value.trim();
  if (name) connectSocket(name);
});

// Main render loop handles canvas drawing and animation frame
let lastFrameTime = 0, animTime = 0;

function render(now) {
  if (!lastFrameTime) lastFrameTime = now || performance.now();
  let dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;
  animTime += dt;

  updatePhysics(dt);

  ctx.imageSmoothingEnabled = false;

  const groundY = getGroundY();
  const meX = (selfId && players[selfId]) ? players[selfId].x : 120;
  let cameraX = 0;
  if (myWorld === 'course2') {
    cameraX = Math.max(0, Math.min(4100 - canvas.width, meX - canvas.width / 2));
  } else if (myWorld === 'frogger') {
    cameraX = Math.max(0, Math.min(2200 - canvas.width, meX - canvas.width / 2));
  } else if (myWorld === 'coop1') {
    cameraX = Math.max(0, Math.min(2400 - canvas.width, meX - canvas.width / 2));
  }

  // Background color per world
  if (myWorld === 'garden') {
    ctx.fillStyle = '#1e3323';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (myWorld === 'select') {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Background Grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.lineWidth = 2;
    for (let gx = 0; gx < canvas.width; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
    }
  } else if (myWorld === 'coop1') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (myWorld === 'frogger') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (myWorld === 'course') {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (myWorld === 'course2') {
    ctx.fillStyle = '#0b0813';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Background Cyber Grid Beams
    ctx.strokeStyle = 'rgba(224,64,251,0.06)';
    ctx.lineWidth = 2;
    for (let gx = 0; gx < canvas.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#22382b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Begin World Camera Transformation
  ctx.save();
  if (cameraX !== 0) {
    ctx.translate(-cameraX, 0);
  }

  if (myWorld === 'garden') {
    // Garden Soil Bed
    drawGardenSoilBed(groundY);
    // Shop Building
    drawShopBuilding(groundY);
    // Portal to Main World (far left in Garden World)
    drawPortal(80, groundY, '[E] RETURN TO PLATFORMER', '#00e676');
  } else if (myWorld === 'frogger') {
    if (typeof FroggerMode !== 'undefined') {
      FroggerMode.render(ctx, animTime);
    }
  } else if (myWorld === 'course') {
    // Obstacle Course World
    getPlatforms().forEach(plat => {
      ctx.fillStyle = '#16213e';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#e94560';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
      // Side edges
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(plat.x, plat.y + 4, 3, plat.h - 4);
      ctx.fillRect(plat.x + plat.w - 3, plat.y + 4, 3, plat.h - 4);
    });

    // Start Line Archway at x: 200
    ctx.save();
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(200, groundY);
    ctx.lineTo(200, groundY - 80);
    ctx.lineTo(240, groundY - 80);
    ctx.lineTo(240, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#76ff03';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START', 220, groundY - 86);
    // Chevron arrows
    ctx.font = '16px monospace';
    ctx.fillText('>>', 220, groundY - 50);
    ctx.restore();

    // Finish Line Archway at x: 1370
    ctx.save();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(1370, groundY);
    ctx.lineTo(1370, groundY - 80);
    ctx.lineTo(1410, groundY - 80);
    ctx.lineTo(1410, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', 1390, groundY - 86);
    // Checkered flag pattern
    for (let fy = 0; fy < 4; fy++) {
      for (let fx = 0; fx < 2; fx++) {
        ctx.fillStyle = (fx + fy) % 2 === 0 ? '#ffd700' : '#1a1a2e';
        ctx.fillRect(1372 + fx * 8, groundY - 78 + fy * 8, 8, 8);
      }
    }
    ctx.restore();

    // Leaderboard Billboard at x: 120
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(90, groundY - 200, 160, 140);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(90, groundY - 200, 160, 140);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEADERBOARD', 170, groundY - 183);
    // Divider line
    ctx.strokeStyle = 'rgba(233,69,96,0.5)';
    ctx.beginPath();
    ctx.moveTo(95, groundY - 174);
    ctx.lineTo(245, groundY - 174);
    ctx.stroke();
    // Entries
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const topRuns = courseLeaderboard.slice(0, 8);
    topRuns.forEach((entry, i) => {
      const sec = (entry.timeMs / 1000).toFixed(2);
      const color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
      ctx.fillStyle = color;
      ctx.fillText(`${i + 1}. ${entry.name}`, 98, groundY - 160 + i * 15);
      ctx.textAlign = 'right';
      ctx.fillText(`${sec}s`, 244, groundY - 160 + i * 15);
      ctx.textAlign = 'left';
    });
    if (topRuns.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('No runs yet!', 170, groundY - 145);
    }
    ctx.restore();

    // Return Portal (far left)
    drawPortal(80, groundY, '[E] RETURN TO MAIN', '#00e676');

    // Portal to Mega Course (far right on finish island x: 1440)
    drawPortal(1440, groundY, '[E] ENTER MEGA COURSE', '#ff007f');
  } else if (myWorld === 'course2') {
    // Mega Obstacle Course (4000px Cyber Stage)
    // Platforms with Mega Cyber styling
    getPlatforms().forEach(plat => {
      ctx.fillStyle = '#181028';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
      ctx.fillStyle = '#7b1fa2';
      ctx.fillRect(plat.x, plat.y + 4, 3, plat.h - 4);
      ctx.fillRect(plat.x + plat.w - 3, plat.y + 4, 3, plat.h - 4);
    });

    // Start Line Archway at x: 200
    ctx.save();
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(200, groundY);
    ctx.lineTo(200, groundY - 90);
    ctx.lineTo(240, groundY - 90);
    ctx.lineTo(240, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA START', 220, groundY - 96);
    ctx.font = '16px monospace';
    ctx.fillText('>>>', 220, groundY - 55);
    ctx.restore();

    // Finish Line Archway at x: 3870
    ctx.save();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(3870, groundY);
    ctx.lineTo(3870, groundY - 90);
    ctx.lineTo(3910, groundY - 90);
    ctx.lineTo(3910, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA FINISH', 3890, groundY - 96);
    for (let fy = 0; fy < 4; fy++) {
      for (let fx = 0; fx < 2; fx++) {
        ctx.fillStyle = (fx + fy) % 2 === 0 ? '#ff007f' : '#ffd700';
        ctx.fillRect(3872 + fx * 8, groundY - 88 + fy * 8, 8, 8);
      }
    }
    ctx.restore();

    // Mega Leaderboard Billboard at x: 120
    ctx.save();
    ctx.fillStyle = 'rgba(11,8,19,0.9)';
    ctx.fillRect(90, groundY - 200, 160, 140);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.strokeRect(90, groundY - 200, 160, 140);
    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA LEADERBOARD', 170, groundY - 183);
    ctx.strokeStyle = 'rgba(255,0,127,0.5)';
    ctx.beginPath();
    ctx.moveTo(95, groundY - 174);
    ctx.lineTo(245, groundY - 174);
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const topMegaRuns = megaCourseLeaderboard.slice(0, 8);
    topMegaRuns.forEach((entry, i) => {
      const sec = (entry.timeMs / 1000).toFixed(2);
      const color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
      ctx.fillStyle = color;
      ctx.fillText(`${i + 1}. ${entry.name}`, 98, groundY - 160 + i * 15);
      ctx.textAlign = 'right';
      ctx.fillText(`${sec}s`, 244, groundY - 160 + i * 15);
      ctx.textAlign = 'left';
    });
    if (topMegaRuns.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('No mega runs yet!', 170, groundY - 145);
    }
    ctx.restore();

    // Return Portal (far left)
    drawPortal(80, groundY, '[E] LEVEL SELECT', '#00e676');
  } else if (myWorld === 'select') {
    // Render Selection Hall platforms
    getPlatforms().forEach(plat => {
      if (plat.isGate) return;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Portals & Mechanisms
    drawPortal(80, groundY, '[E] RETURN TO PLATFORMER', '#00e676');
    drawPortal(240, groundY, '[E] OBSTACLE COURSES', '#e94560');
    drawPortal(450, groundY, '[E] FROGGER HIGHWAY', '#00e676');

    const isLeverActive = selectLeverExpiresAt > Date.now();
    const isGate1Open = selectPlatePressed || isLeverActive;
    const isGate2Open = isLeverActive;

    // Connecting Wires along ground
    ctx.save();
    ctx.lineWidth = 3;
    // Wire from Pressure Plate (350) to Gate Door 1 (500)
    ctx.strokeStyle = isGate1Open ? '#10b981' : '#475569';
    ctx.beginPath(); ctx.moveTo(350, groundY - 2); ctx.lineTo(500, groundY - 2); ctx.stroke();

    // Wire from Left Lever (650) to Gate Door 2 (750)
    ctx.strokeStyle = isGate2Open ? '#38bdf8' : '#475569';
    ctx.beginPath(); ctx.moveTo(650, groundY - 2); ctx.lineTo(750, groundY - 2); ctx.stroke();

    // Wire from Gate Door 2 (750) past Portal (850) to Right Lever (950)
    ctx.strokeStyle = isGate2Open ? '#38bdf8' : '#475569';
    ctx.beginPath(); ctx.moveTo(750, groundY - 2); ctx.lineTo(950, groundY - 2); ctx.stroke();
    ctx.restore();

    // Pressure Plate at x: 350 (No text label)
    drawSelectPlate(350, groundY, selectPlatePressed);

    // Gate Door 1 at x: 500 (Opened by Pressure Plate at x: 350 OR active lever)
    drawGateDoor(500, groundY, isGate1Open);

    // Left Lever Switch at x: 650 (No text label)
    drawLever(650, groundY, isLeverActive, selectPlatePressed);

    // Gate Door 2 at x: 750 (Opened by Lever for 5s)
    drawGateDoor(750, groundY, isGate2Open);

    // Anonymous Portal at x: 850 (ALWAYS ACTIVE! NO NAME ON IT!)
    drawPortal(850, groundY, '[E] ???', '#38bdf8');

    // Right Lever Switch at x: 950 (To the right of the ??? door)
    drawLever(950, groundY, isLeverActive, true);

    // Co-op Leaderboard in Selection Hall
    drawCoopLeaderboard(1050, groundY);
  } else if (myWorld === 'coop1') {
    const offsetY = canvas.height - COOP_LEVEL_1.height;

    // Co-op Leaderboard at the spawn/start of Co-op world
    drawCoopLeaderboard(260, groundY);

    // Room Section Labels (behind everything)
    ctx.save();
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('ROOM 1', 390, groundY - 200);
    ctx.fillText('ROOM 2', 1210, groundY - 200);
    ctx.fillText('ROOM 3', 2020, groundY - 200);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Render Platforms
    COOP_LEVEL_1.platforms.forEach(plat => {
      const py = plat.y + offsetY;
      // Color code by room
      const isRoom3 = plat.x >= 1640;
      const isRoom2 = plat.x >= 820 && plat.x < 1640;
      ctx.fillStyle = isRoom3 ? '#1a1a3a' : (isRoom2 ? '#0f2236' : '#1e293b');
      ctx.fillRect(plat.x, py, plat.w, plat.h);
      ctx.fillStyle = isRoom3 ? '#a78bfa' : (isRoom2 ? '#38bdf8' : '#0ea5e9');
      ctx.fillRect(plat.x, py, plat.w, 4);
    });

    // Render Springs
    COOP_LEVEL_1.springs.forEach(s => {
      const sy = s.y + offsetY;
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(s.x, sy + 6, s.w, s.h - 6);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(s.x, sy, s.w, 6);
      // Spring coil lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + 4, sy + 8 + i * 4);
        ctx.lineTo(s.x + s.w - 4, sy + 8 + i * 4);
        ctx.stroke();
      }
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPRING', s.x + s.w / 2, sy - 6);
    });

    // Render Pressure Plates
    COOP_LEVEL_1.plates.forEach(p => {
      const py = p.y + offsetY;
      const isDown = p.isPressed;
      // Double-plate finale uses purple
      const isFinale = (p.id === 'plate_3' || p.id === 'plate_4');
      ctx.fillStyle = isDown ? '#15803d' : (isFinale ? '#7c3aed' : '#d97706');
      ctx.fillRect(p.x, py + (isDown ? 5 : 0), p.w, p.h - (isDown ? 5 : 0));
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(p.x + 4, py + (isDown ? 5 : 0), p.w - 8, 2);
    });

    // Render Keys
    COOP_LEVEL_1.keys.forEach(k => {
      const ky = k.y + offsetY;
      if (!k.isCollected) {
        // Glow
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(animTime * 4);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(k.x + 12, ky + 12, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Key head
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(k.x + 12, ky + 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(k.x + 12, ky + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        // Key shaft
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(k.x + 10, ky + 17, 4, 10);
        ctx.fillRect(k.x + 14, ky + 22, 4, 3);
        ctx.fillRect(k.x + 14, ky + 26, 3, 3);
        ctx.restore();
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('KEY', k.x + 12, ky - 6);
      }
    });

    // Render Lock Doors
    COOP_LEVEL_1.locks.forEach(l => {
      const ly = l.y + offsetY;
      const isFinale = (l.id === 'lock_4' || l.id === 'lock_4b');
      if (l.isOpen) {
        ctx.strokeStyle = isFinale ? 'rgba(167,139,250,0.3)' : 'rgba(56,189,248,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(l.x, ly, l.w, l.h);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = isFinale ? '#4c1d95' : (l.lockType === 'key' ? '#92400e' : '#1e3a5f');
        ctx.fillRect(l.x, ly, l.w, l.h);
        ctx.fillStyle = isFinale ? '#7c3aed' : (l.lockType === 'key' ? '#d97706' : '#0284c7');
        ctx.fillRect(l.x, ly, 3, l.h);
        ctx.fillRect(l.x + l.w - 3, ly, 3, l.h);
        // Draw small horizontal stripes instead of emoji
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let si = 20; si < l.h - 10; si += 22) {
          ctx.fillRect(l.x + 4, ly + si, l.w - 8, 4);
        }
      }
    });

    // Render Goal Zone
    if (COOP_LEVEL_1.goal) {
      const g = COOP_LEVEL_1.goal;
      const gy = g.y + offsetY;
      const pulse = 0.15 + 0.08 * Math.sin(animTime * 3);
      ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`;
      ctx.fillRect(g.x, gy, g.w, g.h);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.x, gy, g.w, g.h);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GOAL', g.x + g.w / 2, gy + 22);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('both players', g.x + g.w / 2, gy + 38);
    }

    // Return Portal
    drawPortal(80, groundY, '[E] LEVEL SELECT', '#00e676');
  } else {
    // Main Platformer World
    getPlatforms().forEach(plat => {
      ctx.fillStyle = '#1b2e23';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#2e6b45';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Portal to Garden World (far right in Main World)
    drawPortal(canvas.width - 100, groundY, '[E] ENTER GARDEN WORLD', '#ffd700');

    // Portal to Selection World (replacing old obstacle course door)
    drawPortal(canvas.width - 200, groundY, '[E] LEVEL SELECTION', '#38bdf8');

    // Draw Coins (Main World Only)
    Object.values(coins).forEach(coin => {
      const yRel = coin.yRel !== undefined ? Number(coin.yRel) : (coin.y !== undefined ? Number(coin.y) - groundY : -20);
      const coinAbsY = groundY + yRel;
      const coinX = Number(coin.x) || 100;
      drawPixelCoin(coinX, coinAbsY, animTime);
    });
  }

  // Draw Plants & Trees (Garden World Only)
  if (myWorld === 'garden') {
    Object.values(plants).forEach(plant => {
      const plantAbsY = groundY + plant.yRel;
      drawPixelPlant(plant, plantAbsY, animTime);
    });
  }

  // Draw Dropped Items on Ground (World Filtered)
  Object.values(droppedItems).forEach(drop => {
    if ((drop.world || 'main') === myWorld) {
      const dropAbsY = groundY + drop.yRel;
      const bob = Math.sin(animTime * 5 + drop.x) * 3;
      ctx.save();
      if (drop.type === 'coin') {
        drawPixelCoin(drop.x, dropAbsY, animTime);
      } else {
        // Pixel gift box shape
        ctx.fillStyle = '#e53935';
        ctx.fillRect(drop.x - 6, dropAbsY + bob - 10, 12, 10);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(drop.x - 2, dropAbsY + bob - 10, 4, 10);
        ctx.fillRect(drop.x - 6, dropAbsY + bob - 6, 12, 2);
      }
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText(drop.label || 'Item', drop.x, dropAbsY + bob - 16);
      ctx.restore();
    }
  });

  // Draw Players (Filter by same world)
  Object.values(players).forEach(p => {
    if ((p.world || 'main') !== myWorld) return;

    if (isNaN(p.renderX)) p.renderX = p.x || 300;
    if (isNaN(p.renderY)) p.renderY = p.y || 400;

    if (p.id !== selfId) {
      p.renderX += (p.x - p.renderX) * Math.min(1, dt * 18);
      p.renderY += (p.y - p.renderY) * Math.min(1, dt * 18);
    } else {
      p.renderX = p.x; p.renderY = p.y;
    }

    const px = p.renderX, py = p.renderY;

    // Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sprite
    let activeSprite = spriteF;
    if (!p.isGrounded || p.isJumping) activeSprite = spriteH;
    else if (p.isMoving && Math.abs(p.vx || 0) > 10) {
      activeSprite = Math.floor(animTime * 10) % 2 === 0 ? spriteF : spriteG;
    }

    const approxH = (activeSprite.height || 100) * 0.35;

    if (imagesLoaded && activeSprite.complete) {
      ctx.save();
      const scale = 0.35;
      const sw = activeSprite.width * scale, sh = activeSprite.height * scale;
      ctx.translate(px, py);
      if (p.facing === 'right') ctx.scale(-1, 1);
      ctx.drawImage(activeSprite, -sw/2, -sh + 4, sw, sh);
      ctx.restore();
    }

    // Draw Wearable Hat
    const currentHat = p.id === selfId ? myEquippedHat : p.equippedHat;
    drawWearableHat(px, py, currentHat, p.facing, approxH);

    // Name / speech bubble offset higher if wearing a hat
    const textYOffset = currentHat ? -18 : -4;
    if (speechBubbles[p.id]) {
      const b = speechBubbles[p.id];
      if (Date.now() > b.expiresAt) delete speechBubbles[p.id];
      else drawSpeechBubble(px, py - approxH + textYOffset, b.text);
    } else {
      drawNameTag(px, py - approxH + textYOffset, p.name);
    }
  });

  // Render loop heart particle drawing
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.alpha -= dt / p.life;
    if (p.alpha <= 0) { particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    drawPixelHeart(p.x, p.y, p.scale);
    ctx.restore();
  }

  // Floating text feedback
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const ft = floatTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt / ft.life;
    if (ft.alpha <= 0) { floatTexts.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = ft.color || '#ffe066';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // End World Camera Transformation
  ctx.restore();

  drawHUD();

  requestAnimationFrame(render);
}

function drawCoopLeaderboard(x, groundY) {
  ctx.save();
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  ctx.fillRect(x, groundY - 200, 260, 140);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, groundY - 200, 260, 140);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CO-OP LEADERBOARD', x + 130, groundY - 183);
  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  ctx.beginPath();
  ctx.moveTo(x + 5, groundY - 174);
  ctx.lineTo(x + 255, groundY - 174);
  ctx.stroke();
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  const topCoopRuns = coopLeaderboard.slice(0, 8);
  topCoopRuns.forEach((entry, i) => {
    const namesStr = entry.names ? entry.names.join(' & ') : 'Team';
    const color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
    ctx.fillStyle = color;
    ctx.fillText(`${i + 1}. ${namesStr.substring(0, 28)}`, x + 8, groundY - 160 + i * 15);
    ctx.textAlign = 'right';
    ctx.fillText(entry.formattedTime || `${(entry.timeMs/1000).toFixed(2)}s`, x + 252, groundY - 160 + i * 15);
    ctx.textAlign = 'left';
  });
  if (topCoopRuns.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('No co-op runs yet!', x + 130, groundY - 145);
  }
  ctx.restore();
}

requestAnimationFrame(render);
