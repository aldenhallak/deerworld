// Klipspringer Platformer — Diegetic Physical Shop Stall, Garden Soil Beds, Wearables & Audio
(function() {
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

  let socket = null;
  let selfId = null;
  let players = {};
  let speechBubbles = {};
  let keysPressed = {};
  let particles = [];
  let stepTimer = 0;

  // World state
  let coins = {};        // { id: {id, x, yRel} }
  let plants = {};       // { id: {id, type, x, yRel, stage, maxStage, ownerName} }
  let droppedItems = {}; // { id: {id, type, x, yRel, label} }
  let shopCatalog = {};
  let myCoins = 5;
  let myInventory = [];
  let myEquippedHat = null;

  // ---- Web Audio API Sound Synthesizer ----
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playFootstepSound() {
    try {
      const actx = getAudioContext();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.04);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(); osc.stop(actx.currentTime + 0.04);
    } catch(e) {}
  }

  function playKissSound() {
    try {
      const actx = getAudioContext();
      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const gain = actx.createGain();
      osc1.type = 'sine'; osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, actx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(783.99, actx.currentTime + 0.15);
      osc2.frequency.setValueAtTime(659.25, actx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1046.50, actx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
      osc1.connect(gain); osc2.connect(gain); gain.connect(actx.destination);
      osc1.start(); osc2.start();
      osc1.stop(actx.currentTime + 0.18); osc2.stop(actx.currentTime + 0.18);
    } catch(e) {}
  }

  function playCoinSound() {
    try {
      const actx = getAudioContext();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(988, actx.currentTime);
      osc.frequency.setValueAtTime(1319, actx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.1, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(); osc.stop(actx.currentTime + 0.12);
    } catch(e) {}
  }

  function playPlantSound() {
    try {
      const actx = getAudioContext();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(); osc.stop(actx.currentTime + 0.12);
    } catch(e) {}
  }

  function playHarvestSound() {
    try {
      const actx = getAudioContext();
      [0, 0.07, 0.14].forEach((t, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime([523.25, 659.25, 783.99][i], actx.currentTime + t);
        gain.gain.setValueAtTime(0.12, actx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.14);
        osc.connect(gain); gain.connect(actx.destination);
        osc.start(actx.currentTime + t);
        osc.stop(actx.currentTime + t + 0.14);
      });
    } catch(e) {}
  }

  function playShopSound() {
    try {
      const actx = getAudioContext();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, actx.currentTime);
      osc.frequency.setValueAtTime(880, actx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(); osc.stop(actx.currentTime + 0.18);
    } catch(e) {}
  }

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

  function getGroundY() {
    return canvas.height - 40;
  }

  // ---- Platforms ----
  function getPlatforms() {
    const groundY = getGroundY();
    return [
      { x: 0,   y: groundY,       w: canvas.width, h: 40  },
      { x: 80,  y: groundY - 110, w: 200, h: 16 },
      { x: 340, y: groundY - 200, w: 220, h: 16 },
      { x: 640, y: groundY - 130, w: 200, h: 16 },
      { x: 180, y: groundY - 290, w: 180, h: 16 },
      { x: 480, y: groundY - 370, w: 220, h: 16 },
      { x: 800, y: groundY - 260, w: 180, h: 16 }
    ];
  }

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
      
      const me = data.players[selfId];
      if (me) {
        myCoins = me.coins !== undefined ? me.coins : 5;
        myInventory = me.inventory || [];
        myEquippedHat = me.equippedHat || null;
      }

      joinModal.classList.add('hidden');
      chatBar.classList.remove('hidden');
    });

    socket.on('playerJoined', (p) => {
      const groundY = getGroundY();
      const absY = groundY + (p.yRel !== undefined ? p.yRel : 0);
      players[p.id] = { ...p, renderX: p.x || 300, renderY: absY, y: absY, vx: 0, vy: 0, coyoteTimer: 0, jumpBufferTimer: 0 };
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
    });

    socket.on('playerKissed', (data) => {
      if (players[data.id]) {
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
      if (selfId && players[selfId]) {
        spawnFloatText(players[selfId].x, players[selfId].y - 40, `Bought ${data.item.name}! 🛍️`, '#76ff03');
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
        spawnFloatText(players[selfId].x, players[selfId].y - 40, '+1 🪙', '#ffd700');
      }
    });

    socket.on('coinSpawned', (coin) => {
      coins[coin.id] = coin;
    });

    socket.on('coinsUpdated', (data) => {
      myCoins = data.coins;
      if (data.inventory) myInventory = data.inventory;
    });

    // Plant events
    socket.on('plantCreated', (plant) => {
      plants[plant.id] = plant;
      playPlantSound();
    });

    socket.on('plantUpdated', (data) => {
      if (plants[data.id]) plants[data.id].stage = data.stage;
    });

    socket.on('plantHarvested', (data) => {
      delete plants[data.plantId];
      if (data.playerId === selfId) {
        myCoins = data.coins;
        playHarvestSound();
        const icon = data.plantType === 'tree' ? '🍎' : '🌾';
        spawnFloatText(players[selfId].x, players[selfId].y - 40, `+${data.reward} 🪙 ${icon}`, '#76ff03');
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
        spawnFloatText(players[selfId].x, players[selfId].y - 40, `Picked up item! 🎁`, '#ffd700');
      }
    });
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

  // ---- Diegetic Interactivity Actions ----
  function tryKiss() {
    getAudioContext();
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    let nearestPartner = null, minDist = 80;
    Object.values(players).forEach(other => {
      if (other.id !== selfId) {
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

    // 1. Check Shop Stall Proximity (x: 850..990 on ground floor)
    if (Math.abs(me.x - 920) < 70 && Math.abs(me.y - groundY) < 30) {
      // Open / Buy default item: Straw Hat (5 coins) or first seed
      if (myCoins >= 5 && !myInventory.includes('straw_hat')) {
        socket.emit('buyStallItem', 'straw_hat');
      } else if (myCoins >= 2) {
        socket.emit('buyStallItem', 'carrot_seed');
      } else {
        spawnFloatText(me.x, me.y - 40, 'Need more coins for Shop Stall!', '#ff5252');
      }
      return;
    }

    // 2. Check Harvestable Plants nearby
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

    // 3. Check Dropped Items nearby
    let dropTarget = null, dropDist = 60;
    Object.values(droppedItems).forEach(drop => {
      const dropAbsY = groundY + drop.yRel;
      const d = Math.hypot(me.x - drop.x, me.y - dropAbsY);
      if (d < dropDist) { dropDist = d; dropTarget = drop; }
    });

    if (dropTarget) {
      socket.emit('pickupItem', dropTarget.id);
      return;
    }

    // 4. Default: Plant Crop/Seed in Garden Soil
    const yRel = me.y - groundY;
    if (myInventory.includes('carrot_seed')) {
      socket.emit('plant', { type: 'carrot', x: me.x, yRel });
    } else if (myInventory.includes('strawberry_seed')) {
      socket.emit('plant', { type: 'strawberry', x: me.x, yRel });
    } else if (myCoins >= 1) {
      socket.emit('plant', { type: 'crop', x: me.x, yRel });
    } else {
      spawnFloatText(me.x, me.y - 40, 'No seeds or coins to plant!', '#ff5252');
    }
  }

  function cycleEquippedHat() {
    if (!selfId || !players[selfId]) return;
    const hats = myInventory.filter(id => shopCatalog[id] && shopCatalog[id].type === 'hat');
    hats.unshift(null); // Allow barehead

    const currentIdx = hats.indexOf(myEquippedHat);
    const nextIdx = (currentIdx + 1) % hats.length;
    const nextHat = hats[nextIdx];

    socket.emit('equipItem', nextHat);
    playShopSound();
    const label = nextHat && shopCatalog[nextHat] ? shopCatalog[nextHat].name : 'Barehead';
    spawnFloatText(players[selfId].x, players[selfId].y - 40, `Equipped: ${label} 👒`, '#00e676');
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

  // ---- Keybind Inputs ----
  window.addEventListener('keydown', (e) => {
    getAudioContext();
    if (document.activeElement === chatInput || document.activeElement === usernameInput) return;

    if (['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space'].includes(e.code))
      keysPressed[e.code] = true;

    if (e.code === 'KeyK') tryKiss();
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'KeyH') cycleEquippedHat();
    if (e.code === 'KeyD' && !keysPressed['KeyA'] && !keysPressed['ArrowRight']) dropCoinOnGround();

    // Hotkeys 1-5 for Shop Stall Quick Buy
    if (e.code === 'Digit1') socket.emit('buyStallItem', 'straw_hat');
    if (e.code === 'Digit2') socket.emit('buyStallItem', 'flower_crown');
    if (e.code === 'Digit3') socket.emit('buyStallItem', 'cute_bow');
    if (e.code === 'Digit4') socket.emit('buyStallItem', 'carrot_seed');
    if (e.code === 'Digit5') socket.emit('buyStallItem', 'strawberry_seed');

    if (['Space','KeyW','ArrowUp'].includes(e.code) && selfId && players[selfId])
      players[selfId].jumpBufferTimer = 0.15;

    if (e.key === 'Enter') chatInput.focus();
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
    if (text && socket) { socket.emit('sendChat', text); chatInput.value = ''; chatInput.blur(); }
  });

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    getAudioContext();
    const name = usernameInput.value.trim();
    if (name) connectSocket(name);
  });

  // ---- Drawing Helpers ----
  function addChatMessage(msg) {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.isSystem ? 'system' : ''} ${msg.id === selfId ? 'self' : ''}`;
    div.innerHTML = msg.isSystem
      ? escapeHTML(msg.text)
      : `<span class="sender">${escapeHTML(msg.sender)}:</span> ${escapeHTML(msg.text)}`;
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function escapeHTML(s) {
    return s.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t));
  }

  function drawSpeechBubble(x, y, text) {
    ctx.save();
    ctx.font = '12px sans-serif';
    const tw = ctx.measureText(text).width;
    const bw = Math.max(40, tw + 12), bh = 20;
    ctx.fillStyle = '#ffffcc'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.fillRect(x - bw/2, y - bh, bw, bh);
    ctx.strokeRect(x - bw/2, y - bh, bw, bh);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 6);
    ctx.restore();
  }

  function drawNameTag(x, y, name) {
    ctx.save();
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.fillRect(x - tw/2 - 4, y - 14, tw + 8, 16);
    ctx.strokeRect(x - tw/2 - 4, y - 14, tw + 8, 16);
    ctx.fillStyle = '#000'; ctx.fillText(name, x, y - 2);
    ctx.restore();
  }

  // --- DIEGETIC PHYSICAL WORLD OBJECTS ---

  // 1. Physical Shop Stall & Shopkeeper NPC
  function drawPhysicalShopStall(groundY, t) {
    const sx = 920;
    const sy = groundY;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Wooden Counter Base
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(sx - 35, sy - 28, 70, 28);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(sx - 33, sy - 26, 66, 6);

    // Counter Top
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(sx - 40, sy - 32, 80, 5);

    // Wooden Canopy Support Poles
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sx - 36, sy - 75, 4, 43);
    ctx.fillRect(sx + 32, sy - 75, 4, 43);

    // Striped Canvas Canopy Roof
    const roofY = sy - 85;
    const stripeColors = ['#e53935', '#ffffff', '#e53935', '#ffffff', '#e53935', '#ffffff', '#e53935'];
    ctx.fillStyle = '#212121';
    ctx.fillRect(sx - 44, roofY - 2, 88, 16);
    stripeColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(sx - 42 + i * 12, roofY, 12, 14);
    });

    // Cute Shopkeeper Bunny / Klipspringer NPC standing behind counter
    const npcX = sx;
    const npcY = sy - 32;
    const bob = Math.sin(t * 3) * 2;

    // NPC Body
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(npcX - 10, npcY - 20 + bob, 20, 20);
    // Ears
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(npcX - 8, npcY - 32 + bob, 4, 12);
    ctx.fillRect(npcX + 4, npcY - 32 + bob, 4, 12);
    // Inner Ear
    ctx.fillStyle = '#ff80ab';
    ctx.fillRect(npcX - 7, npcY - 30 + bob, 2, 8);
    ctx.fillRect(npcX + 5, npcY - 30 + bob, 2, 8);
    // Eyes & Apron
    ctx.fillStyle = '#000';
    ctx.fillRect(npcX - 5, npcY - 16 + bob, 3, 3);
    ctx.fillRect(npcX + 2, npcY - 16 + bob, 3, 3);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(npcX - 8, npcY - 10 + bob, 16, 10);

    // Wooden Sign: "SHOP & OUTFITS"
    ctx.fillStyle = '#795548';
    ctx.fillRect(sx - 36, roofY - 16, 72, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🛍️ SHOP & OUTFITS', sx, roofY - 5);

    // Diegetic Floating Prompt when Player walks nearby
    if (selfId && players[selfId]) {
      const me = players[selfId];
      if (Math.abs(me.x - sx) < 80 && Math.abs(me.y - groundY) < 30) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(sx - 110, sy - 110, 220, 26);
        ctx.strokeStyle = '#ffd700';
        ctx.strokeRect(sx - 110, sy - 110, 220, 26);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('PRESS [1-3] BUY HATS | [4-5] BUY SEEDS', sx, sy - 93);
      }
    }

    ctx.restore();
  }

  // 2. Physical Garden Soil Bed (tilled earth)
  function drawPhysicalGardenBed(groundY) {
    const gx = 350;
    const gw = 350;
    const gy = groundY;

    ctx.save();
    // Fence Posts
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(gx - 8, gy - 20, 6, 20);
    ctx.fillRect(gx + gw + 2, gy - 20, 6, 20);
    ctx.fillRect(gx - 8, gy - 16, gw + 16, 4);

    // Dark Tilled Soil Patch
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(gx, gy - 6, gw, 6);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(gx + 2, gy - 4, gw - 4, 3);
    ctx.restore();
  }

  // Crisp Pixel Art Coin
  function drawPixelCoin(x, y, t) {
    if (isNaN(x) || isNaN(y)) return;
    const bob = Math.sin(t * 4 + x * 0.05) * 3;
    const cy = y + bob;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Outer pixel ring
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 6, cy - 7, 12, 14);
    ctx.fillRect(x - 7, cy - 6, 14, 12);

    // Coin face
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x - 5, cy - 5, 10, 10);

    // Coin shine highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 3, cy - 4, 3, 3);

    // Inner detail
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(x - 1, cy - 2, 3, 5);

    ctx.restore();
  }

  // Soil plot tile under plant
  function drawSoilPlot(x, y) {
    ctx.save();
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(x - 12, y - 3, 24, 5);
    ctx.fillStyle = '#2d1a0c';
    ctx.fillRect(x - 10, y - 1, 20, 3);
    ctx.restore();
  }

  // Custom Pixel Art Renderer for Crops, Trees, Carrots, Strawberries & Flowers
  function drawPixelPlant(plant, absY, t) {
    drawSoilPlot(plant.x, absY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const px = plant.x;
    const py = absY - 3;
    const plantType = plant.type || 'crop';

    if (plantType === 'carrot') {
      if (plant.stage === 0) {
        ctx.fillStyle = '#81c784'; ctx.fillRect(px - 2, py - 6, 4, 6);
      } else if (plant.stage === 1) {
        ctx.fillStyle = '#388e3c'; ctx.fillRect(px - 4, py - 10, 8, 10);
      } else {
        // Harvestable Carrot (Orange pixel top peeking out)
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(px - 6, py - 16, 12, 12);
        ctx.fillStyle = '#ff6d00'; ctx.fillRect(px - 4, py - 6, 8, 6);
        ctx.fillStyle = '#ff9100'; ctx.fillRect(px - 2, py - 4, 4, 4);
      }
    } else if (plantType === 'strawberry') {
      if (plant.stage === 0) {
        ctx.fillStyle = '#81c784'; ctx.fillRect(px - 2, py - 6, 4, 6);
      } else if (plant.stage === 1) {
        ctx.fillStyle = '#43a047'; ctx.fillRect(px - 6, py - 10, 12, 10);
      } else {
        // Harvestable Strawberry Bush
        ctx.fillStyle = '#1b5e20'; ctx.fillRect(px - 8, py - 16, 16, 14);
        ctx.fillStyle = '#d50000';
        ctx.fillRect(px - 5, py - 12, 4, 5);
        ctx.fillRect(px + 2, py - 10, 4, 5);
      }
    } else if (plantType === 'flower') {
      if (plant.stage === 0) {
        ctx.fillStyle = '#81c784'; ctx.fillRect(px - 1, py - 6, 2, 6);
      } else if (plant.stage === 1) {
        ctx.fillStyle = '#43a047'; ctx.fillRect(px - 2, py - 12, 4, 12);
      } else {
        // Harvestable Golden Flower
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(px - 2, py - 18, 4, 18);
        ctx.fillStyle = '#ffeb3b'; ctx.fillRect(px - 8, py - 24, 16, 12);
        ctx.fillStyle = '#ff6f00'; ctx.fillRect(px - 4, py - 20, 8, 6);
      }
    } else {
      // Standard Crop / Tree fallback
      if (plant.stage === 0) {
        ctx.fillStyle = '#4caf50'; ctx.fillRect(px - 1, py - 6, 2, 6);
      } else if (plant.stage === 1) {
        ctx.fillStyle = '#388e3c'; ctx.fillRect(px - 2, py - 12, 4, 12);
      } else {
        ctx.fillStyle = '#fbc02d'; ctx.fillRect(px - 4, py - 20, 8, 16);
      }
    }

    // Interactive Floating Harvest Tag
    if (plant.stage >= plant.maxStage) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#76ff03';
      ctx.textAlign = 'center';
      ctx.fillText('[E] HARVEST', px, py - 26);
    }

    ctx.restore();
  }

  // --- ON-SPRITE WEARABLES RENDERER ---
  function drawWearableHat(px, py, hatId, facing, approxH) {
    if (!hatId) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const headY = py - approxH + 8;
    const headX = px;

    if (hatId === 'straw_hat') {
      // Farmer Straw Hat
      ctx.fillStyle = '#fbc02d';
      ctx.fillRect(headX - 16, headY - 4, 32, 5); // Brim
      ctx.fillRect(headX - 10, headY - 12, 20, 9); // Crown
      ctx.fillStyle = '#d50000';
      ctx.fillRect(headX - 10, headY - 6, 20, 2); // Red Ribbon Band
    } else if (hatId === 'flower_crown') {
      // Flower Crown
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(headX - 12, headY - 4, 24, 3); // Leaf base
      const colors = ['#ff4081', '#ffeb3b', '#00e676', '#ff4081'];
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(headX - 10 + i * 6, headY - 8, 4, 5);
      });
    } else if (hatId === 'cute_bow') {
      // Pink Bow on ear
      const earX = facing === 'right' ? headX - 8 : headX + 4;
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(earX - 6, headY - 6, 12, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(earX - 2, headY - 4, 4, 4);
    } else if (hatId === 'party_hat') {
      // Striped Party Cone
      ctx.fillStyle = '#ab47bc';
      ctx.beginPath();
      ctx.moveTo(headX, headY - 18);
      ctx.lineTo(headX - 8, headY - 2);
      ctx.lineTo(headX + 8, headY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(headX - 2, headY - 20, 4, 4); // Pom pom
    } else if (hatId === 'cool_shades') {
      // Retro Sunglasses
      const eyeX = facing === 'right' ? headX + 2 : headX - 8;
      ctx.fillStyle = '#212121';
      ctx.fillRect(eyeX - 4, headY + 2, 14, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(eyeX - 2, headY + 3, 2, 2);
    }

    ctx.restore();
  }

  function drawHUD() {
    if (!selfId) return;
    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`🪙 COINS: ${myCoins}`, 14, 26);

    const hatName = myEquippedHat && shopCatalog[myEquippedHat] ? shopCatalog[myEquippedHat].name : 'None';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`👒 HAT: ${hatName} [H to Swap]`, 14, 48);

    // Direct Diegetic Hotkeys Banner
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('[E] Interact / Plant | [K] Kiss | [D] Drop 1 Coin | [1-5] Shop Hotkeys', 14, 68);
    ctx.restore();
  }

  // ---- Generous Coin & Dropped Item Pickup Check ----
  function checkCoinPickup() {
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    const groundY = getGroundY();

    Object.values(coins).forEach(coin => {
      const yRel = coin.yRel !== undefined ? Number(coin.yRel) : (coin.y !== undefined ? Number(coin.y) - groundY : -20);
      const coinAbsY = groundY + yRel;
      const coinX = Number(coin.x) || 100;

      const dx = Math.abs(me.x - coinX);
      const dy = Math.abs((me.y - 20) - coinAbsY);

      if (dx < 34 && dy < 44) {
        socket.emit('collectCoin', coin.id);
        delete coins[coin.id];
      }
    });
  }

  // ---- Physics Engine ----
  const GRAVITY = 1750, MOVE_SPEED = 400, ACCELERATION = 3000, FRICTION = 3400, JUMP_FORCE = 740;
  let lastEmitTime = 0;

  function updatePhysics(dt) {
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    if (isNaN(me.x)) me.x = 300;
    if (isNaN(me.y)) me.y = 400;
    if (isNaN(me.vx)) me.vx = 0;
    if (isNaN(me.vy)) me.vy = 0;
    if (me.coyoteTimer === undefined) me.coyoteTimer = 0;
    if (me.jumpBufferTimer === undefined) me.jumpBufferTimer = 0;

    if (me.isGrounded) me.coyoteTimer = 0.14;
    else me.coyoteTimer = Math.max(0, me.coyoteTimer - dt);
    me.jumpBufferTimer = Math.max(0, me.jumpBufferTimer - dt);

    const moveLeft  = keysPressed['ArrowLeft']  || keysPressed['KeyA'];
    const moveRight = keysPressed['ArrowRight'] || keysPressed['KeyD'];

    if (moveLeft) {
      me.vx = Math.max(-MOVE_SPEED, me.vx - ACCELERATION * dt);
      me.facing = 'left'; me.isMoving = true;
    } else if (moveRight) {
      me.vx = Math.min(MOVE_SPEED, me.vx + ACCELERATION * dt);
      me.facing = 'right'; me.isMoving = true;
    } else {
      me.vx = me.vx > 0 ? Math.max(0, me.vx - FRICTION * dt) : Math.min(0, me.vx + FRICTION * dt);
      me.isMoving = false;
    }

    // Footstep audio
    if (me.isGrounded && me.isMoving && Math.abs(me.vx) > 30) {
      stepTimer += dt;
      if (stepTimer >= 0.22) { playFootstepSound(); stepTimer = 0; }
    } else { stepTimer = 0; }

    if (me.jumpBufferTimer > 0 && me.coyoteTimer > 0) {
      me.vy = -JUMP_FORCE;
      me.isGrounded = false; me.isJumping = true;
      me.coyoteTimer = 0; me.jumpBufferTimer = 0;
    }

    me.vy += GRAVITY * dt;
    const nextX = me.x + me.vx * dt;
    const nextY = me.y + me.vy * dt;

    let landed = false;
    getPlatforms().forEach(plat => {
      if (me.vy >= 0 && me.y <= plat.y + 6 && nextY >= plat.y) {
        if (nextX >= plat.x - 14 && nextX <= plat.x + plat.w + 14) {
          me.y = plat.y; me.vy = 0;
          landed = true; me.isGrounded = true; me.isJumping = false;
        }
      }
    });

    if (!landed) { me.y = nextY; me.isGrounded = false; }
    me.x = Math.max(20, Math.min(canvas.width - 20, nextX));

    checkCoinPickup();

    const now = Date.now();
    const groundY = getGroundY();
    if (socket && now - lastEmitTime > 30) {
      socket.emit('playerMove', {
        x: Math.round(me.x * 10) / 10,
        yRel: Math.round((me.y - groundY) * 10) / 10,
        vx: Math.round(me.vx), vy: Math.round(me.vy),
        facing: me.facing, isMoving: me.isMoving,
        isJumping: !me.isGrounded, isGrounded: me.isGrounded
      });
      lastEmitTime = now;
    }
  }

  // ---- Main Render Loop ----
  let lastFrameTime = 0, animTime = 0;

  function render(now) {
    if (!lastFrameTime) lastFrameTime = now || performance.now();
    let dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    if (isNaN(dt) || dt <= 0 || dt > 0.1) dt = 0.016;
    animTime += dt;

    updatePhysics(dt);

    ctx.imageSmoothingEnabled = false;

    // Background
    ctx.fillStyle = '#22382b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const groundY = getGroundY();

    // Platforms
    getPlatforms().forEach(plat => {
      ctx.fillStyle = '#1b2e23';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#2e6b45';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Draw Physical Soil Garden Beds
    drawPhysicalGardenBed(groundY);

    // Draw Physical Shop Stall & Shopkeeper
    drawPhysicalShopStall(groundY, animTime);

    // Draw Coins with crisp Pixel Art & floating bob
    Object.values(coins).forEach(coin => {
      const yRel = coin.yRel !== undefined ? Number(coin.yRel) : (coin.y !== undefined ? Number(coin.y) - groundY : -20);
      const coinAbsY = groundY + yRel;
      const coinX = Number(coin.x) || 100;
      drawPixelCoin(coinX, coinAbsY, animTime);
    });

    // Draw Plants & Trees with Pixel Art
    Object.values(plants).forEach(plant => {
      const plantAbsY = groundY + plant.yRel;
      drawPixelPlant(plant, plantAbsY, animTime);
    });

    // Draw Dropped Items on Ground
    Object.values(droppedItems).forEach(drop => {
      const dropAbsY = groundY + drop.yRel;
      const bob = Math.sin(animTime * 5 + drop.x) * 3;
      ctx.save();
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(drop.type === 'coin' ? '🪙' : '🎁', drop.x, dropAbsY + bob - 4);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(drop.label || 'Item', drop.x, dropAbsY + bob - 18);
      ctx.restore();
    });

    // Draw Players & Wearables
    Object.values(players).forEach(p => {
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

      // Draw Wearable Hat on player head
      const currentHat = p.id === selfId ? myEquippedHat : p.equippedHat;
      drawWearableHat(px, py, currentHat, p.facing, approxH);

      // Name / speech bubble
      if (speechBubbles[p.id]) {
        const b = speechBubbles[p.id];
        if (Date.now() > b.expiresAt) delete speechBubbles[p.id];
        else drawSpeechBubble(px, py - approxH - 4, b.text);
      } else {
        drawNameTag(px, py - approxH - 4, p.name);
      }
    });

    // Heart Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.font = `${Math.round(16 * p.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji || '❤️', p.x, p.y);
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

    drawHUD();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
