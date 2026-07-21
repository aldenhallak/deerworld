// Klipspringer Platformer — Pixel-Art Crops & Trees, Generous Coin Hitboxes & Audio
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
  let coins = {};   // { id: {id, x, yRel} }
  let plants = {};  // { id: {id, type, x, yRel, stage, maxStage, ownerName} }
  let myCoins = 3;

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
      myCoins = (data.players[selfId] && data.players[selfId].coins !== undefined) ? data.players[selfId].coins : 3;

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
    });

    socket.on('playerKissed', (data) => {
      if (players[data.id]) {
        spawnHeartParticles(players[data.id].x, players[data.id].y - 30);
        if (data.targetId && players[data.targetId])
          spawnHeartParticles(players[data.targetId].x, players[data.targetId].y - 30);
        playKissSound();
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
    });

    // Plant/Tree events
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
  }

  // ---- Particles ----
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

  // ---- Actions ----
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

  function tryPlant(type) {
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    if (!me.isGrounded) return;

    const cost = type === 'tree' ? 2 : 1;
    if (myCoins < cost) {
      spawnFloatText(me.x, me.y - 40, `Need ${cost} 🪙!`, '#ff5252');
      return;
    }

    const groundY = getGroundY();
    const yRel = me.y - groundY;

    socket.emit('plant', { type, x: me.x, yRel });
    myCoins -= cost; // optimistic update
  }

  function tryHarvest() {
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    const groundY = getGroundY();

    let closest = null, minDist = 70;
    Object.values(plants).forEach(plant => {
      const plantAbsY = groundY + plant.yRel;
      if (plant.stage >= plant.maxStage) {
        const d = Math.hypot(me.x - plant.x, me.y - plantAbsY);
        if (d < minDist) { minDist = d; closest = plant; }
      }
    });

    if (closest) {
      socket.emit('harvest', closest.id);
    } else {
      spawnFloatText(me.x, me.y - 40, 'No grown plant nearby!', '#ffab40');
    }
  }

  // ---- Inputs ----
  window.addEventListener('keydown', (e) => {
    getAudioContext();
    if (document.activeElement === chatInput || document.activeElement === usernameInput) return;

    if (['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space'].includes(e.code))
      keysPressed[e.code] = true;

    if (e.code === 'KeyK') tryKiss();
    if (e.code === 'KeyP') tryPlant('crop'); // Plant Crop
    if (e.code === 'KeyT') tryPlant('tree'); // Plant Tree
    if (e.code === 'KeyE') tryHarvest();     // Harvest

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

  // --- PIXEL ART RENDERING FOR COINS & PLANTS ---

  // Crisp Pixel Art Coin
  function drawPixelCoin(x, y, t) {
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

  // Custom Pixel Art Renderer for Crops & Trees
  function drawPixelPlant(plant, absY, t) {
    drawSoilPlot(plant.x, absY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const px = plant.x;
    const py = absY - 3;
    const isTree = plant.type === 'tree';

    if (!isTree) {
      // --- CROP (Wheat) ---
      if (plant.stage === 0) {
        // Sprout
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(px - 1, py - 6, 2, 6);
        ctx.fillRect(px - 3, py - 8, 3, 3);
        ctx.fillRect(px + 1, py - 7, 3, 3);
      } else if (plant.stage === 1) {
        // Growing Stalk
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(px - 2, py - 12, 4, 12);
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(px - 5, py - 9, 4, 3);
        ctx.fillRect(px + 1, py - 11, 4, 3);
      } else {
        // Harvestable Golden Wheat (Glow effect)
        const shimmer = Math.sin(t * 6) > 0 ? '#fff59d' : '#fbc02d';
        ctx.fillStyle = '#fbc02d';
        ctx.fillRect(px - 2, py - 18, 4, 18);
        ctx.fillStyle = shimmer;
        ctx.fillRect(px - 6, py - 20, 12, 8);
        ctx.fillRect(px - 4, py - 24, 8, 6);
        // Wheat tips
        ctx.fillStyle = '#fff176';
        ctx.fillRect(px - 5, py - 22, 3, 3);
        ctx.fillRect(px + 2, py - 22, 3, 3);
      }
    } else {
      // --- TREE (Oak / Apple Tree) ---
      if (plant.stage === 0) {
        // Sapling
        ctx.fillStyle = '#795548';
        ctx.fillRect(px - 1, py - 8, 2, 8);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(px - 4, py - 12, 8, 6);
      } else if (plant.stage === 1) {
        // Young Tree
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(px - 2, py - 16, 4, 16);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(px - 8, py - 26, 16, 12);
        ctx.fillRect(px - 6, py - 30, 12, 6);
      } else if (plant.stage === 2) {
        // Full Tree
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(px - 3, py - 24, 6, 24);
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(px - 14, py - 42, 28, 20);
        ctx.fillRect(px - 11, py - 48, 22, 10);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(px - 10, py - 40, 8, 8);
      } else {
        // Fruit-bearing Apple Tree (Harvestable)
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(px - 4, py - 26, 8, 26);
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(px - 16, py - 48, 32, 24);
        ctx.fillRect(px - 12, py - 54, 24, 10);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(px - 12, py - 44, 10, 10);

        // Pixel Apples!
        ctx.fillStyle = '#d50000';
        ctx.fillRect(px - 10, py - 42, 4, 4);
        ctx.fillRect(px + 6, py - 40, 4, 4);
        ctx.fillRect(px - 2, py - 48, 4, 4);
        ctx.fillRect(px + 8, py - 48, 4, 4);

        // Apple highlights
        ctx.fillStyle = '#ff8a80';
        ctx.fillRect(px - 10, py - 42, 2, 2);
        ctx.fillRect(px + 6, py - 40, 2, 2);
      }
    }

    // Owner name indicator
    if (plant.stage < plant.maxStage) {
      ctx.font = '9px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      const textY = isTree ? py - (plant.stage * 12 + 18) : py - 24;
      ctx.fillText(`${plant.ownerName}'s ${plant.type}`, px, textY);
    } else {
      // Glow prompt when harvestable
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#76ff03';
      ctx.textAlign = 'center';
      const textY = isTree ? py - 60 : py - 28;
      ctx.fillText('[E] HARVEST', px, textY);
    }

    ctx.restore();
  }

  function drawHUD() {
    if (!selfId) return;
    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`🪙 COINS: ${myCoins}`, 12, 24);

    // Controls hint
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('[P] Plant Crop (1🪙) | [T] Plant Tree (2🪙) | [E] Harvest | [K] Kiss', 12, 44);
    ctx.restore();
  }

  // ---- Generous Coin Hitbox & Pickup Check ----
  function checkCoinPickup() {
    if (!selfId || !players[selfId]) return;
    const me = players[selfId];
    const groundY = getGroundY();

    Object.values(coins).forEach(coin => {
      const coinAbsY = groundY + coin.yRel;
      
      // Generous AABB pickup box: 44px wide x 60px high around player center
      const dx = Math.abs(me.x - coin.x);
      const dy = Math.abs((me.y - 20) - coinAbsY);

      if (dx < 32 && dy < 40) {
        socket.emit('collectCoin', coin.id);
        delete coins[coin.id]; // optimistic client remove
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

    // Check coin pickup every frame with generous hitbox
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

    // Platforms
    const groundY = getGroundY();
    getPlatforms().forEach(plat => {
      ctx.fillStyle = '#1b2e23';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#2e6b45';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Draw Coins with crisp Pixel Art & floating bob
    Object.values(coins).forEach(coin => {
      const coinAbsY = groundY + coin.yRel;
      drawPixelCoin(coin.x, coinAbsY, animTime);
    });

    // Draw Plants & Trees with Pixel Art
    Object.values(plants).forEach(plant => {
      const plantAbsY = groundY + plant.yRel;
      drawPixelPlant(plant, plantAbsY, animTime);
    });

    // Draw Players
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

      if (imagesLoaded && activeSprite.complete) {
        ctx.save();
        const scale = 0.35;
        const sw = activeSprite.width * scale, sh = activeSprite.height * scale;
        ctx.translate(px, py);
        if (p.facing === 'right') ctx.scale(-1, 1);
        ctx.drawImage(activeSprite, -sw/2, -sh + 4, sw, sh);
        ctx.restore();
      }

      // Name / speech bubble
      const approxH = (activeSprite.height || 100) * 0.35;
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

    // Floating text feedback (+1 Coin, +10 Coin Apple Tree, etc)
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

    // HUD
    drawHUD();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
