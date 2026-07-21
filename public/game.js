// Barebones Klipspringer Platformer with Kiss Mechanic & Footstep Audio
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
  let particles = []; // Floating heart particles
  let stepTimer = 0;

  // Web Audio API Sound Synthesizer
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Play procedural footstep sound (soft pitter-patter hoof tap)
  function playFootstepSound() {
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 40, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.start();
      osc.stop(actx.currentTime + 0.04);
    } catch(e) {}
  }

  // Play procedural kiss sound (chime & pop)
  function playKissSound() {
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const gain = actx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, actx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, actx.currentTime + 0.15); // G5

      osc2.frequency.setValueAtTime(659.25, actx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, actx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.12, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(actx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(actx.currentTime + 0.18);
      osc2.stop(actx.currentTime + 0.18);
    } catch(e) {}
  }

  // Load PNG sprite assets (F, G, H)
  const spriteF = new Image();
  spriteF.src = 'sprite_f.png';

  const spriteG = new Image();
  spriteG.src = 'sprite_g.png';

  const spriteH = new Image();
  spriteH.src = 'sprite_h.png';

  let imagesLoaded = false;
  let loadedCount = 0;
  function onImgLoad() {
    loadedCount++;
    if (loadedCount >= 3) {
      imagesLoaded = true;
    }
  }
  spriteF.onload = onImgLoad;
  spriteG.onload = onImgLoad;
  spriteH.onload = onImgLoad;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Reachable Platforms
  function getPlatforms() {
    const groundY = canvas.height - 40;
    return [
      { x: 0, y: groundY, w: canvas.width, h: 40 },
      { x: 80, y: groundY - 110, w: 200, h: 16 },
      { x: 340, y: groundY - 200, w: 220, h: 16 },
      { x: 640, y: groundY - 130, w: 200, h: 16 },
      { x: 180, y: groundY - 290, w: 180, h: 16 },
      { x: 480, y: groundY - 370, w: 220, h: 16 },
      { x: 800, y: groundY - 260, w: 180, h: 16 }
    ];
  }

  function connectSocket(username) {
    socket = io();

    socket.on('connect', () => {
      socket.emit('join', { name: username });
    });

    socket.on('init', (data) => {
      selfId = data.selfId;
      players = {};
      
      for (let id in data.players) {
        const p = data.players[id];
        players[id] = {
          ...p,
          renderX: Number(p.x) || 300,
          renderY: Number(p.y) || 400,
          vx: Number(p.vx) || 0,
          vy: Number(p.vy) || 0,
          coyoteTimer: 0,
          jumpBufferTimer: 0
        };
      }

      joinModal.classList.add('hidden');
      chatBar.classList.remove('hidden');
    });

    socket.on('playerJoined', (playerData) => {
      players[playerData.id] = {
        ...playerData,
        renderX: Number(playerData.x) || 300,
        renderY: Number(playerData.y) || 400,
        vx: 0,
        vy: 0,
        coyoteTimer: 0,
        jumpBufferTimer: 0
      };
    });

    socket.on('playerMoved', (data) => {
      if (players[data.id] && data.id !== selfId) {
        const p = players[data.id];
        p.x = Number(data.x) || p.x;
        p.y = Number(data.y) || p.y;
        p.vx = Number(data.vx) || 0;
        p.vy = Number(data.vy) || 0;
        p.facing = data.facing;
        p.isMoving = data.isMoving;
        p.isJumping = data.isJumping;
        p.isGrounded = data.isGrounded;
      }
    });

    socket.on('playerKissed', (data) => {
      if (players[data.id]) {
        spawnHeartParticles(players[data.id].x, players[data.id].y - 30);
        if (data.targetId && players[data.targetId]) {
          spawnHeartParticles(players[data.targetId].x, players[data.targetId].y - 30);
        }
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
        speechBubbles[msg.id] = {
          text: msg.text,
          expiresAt: Date.now() + 5000
        };
      }
    });
  }

  // Spawn floating heart particles above head
  function spawnHeartParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -60 - Math.random() * 50,
        alpha: 1.0,
        scale: 0.8 + Math.random() * 0.6,
        life: 1.2
      });
    }
  }

  // Trigger Kiss Mechanic
  function tryKiss() {
    getAudioContext();
    if (!selfId || !players[selfId]) return;

    const me = players[selfId];
    let nearestPartner = null;
    let minDistance = 80; // Max kiss distance

    Object.values(players).forEach(other => {
      if (other.id !== selfId) {
        const dist = Math.hypot(me.x - other.x, me.y - other.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearestPartner = other;
        }
      }
    });

    // Always allow kiss effect on self, and on partner if nearby!
    spawnHeartParticles(me.x, me.y - 30);
    playKissSound();

    if (nearestPartner) {
      spawnHeartParticles(nearestPartner.x, nearestPartner.y - 30);
      if (socket) {
        socket.emit('playerKiss', { targetId: nearestPartner.id });
      }
    } else if (socket) {
      socket.emit('playerKiss', { targetId: null });
    }
  }

  // Inputs
  window.addEventListener('keydown', (e) => {
    getAudioContext();

    if (document.activeElement === chatInput || document.activeElement === usernameInput) {
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space'].includes(e.code)) {
      keysPressed[e.code] = true;
    }

    if (e.code === 'KeyK') {
      tryKiss();
    }

    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
      if (selfId && players[selfId]) {
        players[selfId].jumpBufferTimer = 0.15;
      }
    }

    if (e.key === 'Enter') {
      chatInput.focus();
    }
  });

  window.addEventListener('keyup', (e) => {
    delete keysPressed[e.code];
    
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
      if (selfId && players[selfId]) {
        const me = players[selfId];
        if (me.vy < -250) {
          me.vy *= 0.45;
        }
      }
    }
  });

  if (btnJump) {
    btnJump.addEventListener('pointerdown', () => {
      getAudioContext();
      if (selfId && players[selfId]) {
        players[selfId].jumpBufferTimer = 0.15;
      }
    });
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    getAudioContext();
    const text = chatInput.value.trim();
    if (text && socket) {
      socket.emit('sendChat', text);
      chatInput.value = '';
      chatInput.blur();
    }
  });

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    getAudioContext();
    const name = usernameInput.value.trim();
    if (name) connectSocket(name);
  });

  function addChatMessage(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${msg.isSystem ? 'system' : ''} ${msg.id === selfId ? 'self' : ''}`;
    
    if (msg.isSystem) {
      msgDiv.textContent = msg.text;
    } else {
      msgDiv.innerHTML = `<span class="sender">${escapeHTML(msg.sender)}:</span> ${escapeHTML(msg.text)}`;
    }

    chatMessagesEl.appendChild(msgDiv);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  function drawWarmSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '12px sans-serif';
    
    const textWidth = ctx.measureText(text).width;
    const bubbleW = Math.max(40, textWidth + 12);
    const bubbleH = 20;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - bubbleH;

    ctx.fillStyle = '#ffffcc';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
    ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, bubbleY + 14);

    ctx.restore();
  }

  function drawNameTag(ctx, x, y, name) {
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    const textWidth = ctx.measureText(name).width;
    ctx.fillRect(x - textWidth / 2 - 4, y - 14, textWidth + 8, 16);
    ctx.strokeRect(x - textWidth / 2 - 4, y - 14, textWidth + 8, 16);

    ctx.fillStyle = '#000000';
    ctx.fillText(name, x, y - 2);
    ctx.restore();
  }

  // Physics & Footstep Audio Loop
  const GRAVITY = 1750;          
  const MOVE_SPEED = 400;        
  const ACCELERATION = 3000;     
  const FRICTION = 3400;         
  const JUMP_FORCE = 740;

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

    if (me.isGrounded) {
      me.coyoteTimer = 0.14; 
    } else {
      me.coyoteTimer = Math.max(0, me.coyoteTimer - dt);
    }
    me.jumpBufferTimer = Math.max(0, me.jumpBufferTimer - dt);

    const moveLeft = keysPressed['ArrowLeft'] || keysPressed['KeyA'];
    const moveRight = keysPressed['ArrowRight'] || keysPressed['KeyD'];

    if (moveLeft) {
      me.vx = Math.max(-MOVE_SPEED, me.vx - ACCELERATION * dt);
      me.facing = 'left';
      me.isMoving = true;
    } else if (moveRight) {
      me.vx = Math.min(MOVE_SPEED, me.vx + ACCELERATION * dt);
      me.facing = 'right';
      me.isMoving = true;
    } else {
      if (me.vx > 0) {
        me.vx = Math.max(0, me.vx - FRICTION * dt);
      } else if (me.vx < 0) {
        me.vx = Math.min(0, me.vx + FRICTION * dt);
      }
      me.isMoving = false;
    }

    // Footstep Sound Effect Interval when walking on ground
    if (me.isGrounded && me.isMoving && Math.abs(me.vx) > 30) {
      stepTimer += dt;
      if (stepTimer >= 0.22) { // Step every 220ms
        playFootstepSound();
        stepTimer = 0;
      }
    } else {
      stepTimer = 0;
    }

    if (me.jumpBufferTimer > 0 && me.coyoteTimer > 0) {
      me.vy = -JUMP_FORCE;
      me.isGrounded = false;
      me.isJumping = true;
      me.coyoteTimer = 0;
      me.jumpBufferTimer = 0;
    }

    me.vy += GRAVITY * dt;

    const nextX = me.x + me.vx * dt;
    const nextY = me.y + me.vy * dt;

    const platforms = getPlatforms();
    let landed = false;

    const feetX = nextX;
    const prevFeetY = me.y;
    const nextFeetY = nextY;

    platforms.forEach(plat => {
      if (me.vy >= 0 && prevFeetY <= plat.y + 6 && nextFeetY >= plat.y) {
        if (feetX >= plat.x - 14 && feetX <= plat.x + plat.w + 14) {
          me.y = plat.y;
          me.vy = 0;
          landed = true;
          me.isGrounded = true;
          me.isJumping = false;
        }
      }
    });

    if (!landed) {
      me.y = nextY;
      me.isGrounded = false;
    }

    me.x = Math.max(20, Math.min(canvas.width - 20, nextX));

    const now = Date.now();
    if (now - lastEmitTime > 30) {
      socket.emit('playerMove', {
        x: Math.round(me.x * 10) / 10,
        y: Math.round(me.y * 10) / 10,
        vx: Math.round(me.vx),
        vy: Math.round(me.vy),
        facing: me.facing,
        isMoving: me.isMoving,
        isJumping: !me.isGrounded,
        isGrounded: me.isGrounded
      });
      lastEmitTime = now;
    }
  }

  // Render Loop & Particle Updates
  let lastFrameTime = 0;
  let animTime = 0;

  function render(now) {
    if (!lastFrameTime) lastFrameTime = now || performance.now();
    const currentTime = now || performance.now();
    let dt = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    if (isNaN(dt) || dt <= 0 || dt > 0.1) {
      dt = 0.016;
    }

    animTime += dt * 5;

    updatePhysics(dt);

    ctx.imageSmoothingEnabled = false;

    // Background
    ctx.fillStyle = '#22382b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Platforms
    const platforms = getPlatforms();
    platforms.forEach(plat => {
      ctx.fillStyle = '#1b2e23';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#2e6b45';
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    const sortedPlayers = Object.values(players);

    sortedPlayers.forEach(p => {
      if (isNaN(p.renderX)) p.renderX = p.x || 300;
      if (isNaN(p.renderY)) p.renderY = p.y || 400;

      if (p.id !== selfId) {
        p.renderX += (p.x - p.renderX) * Math.min(1, dt * 18);
        p.renderY += (p.y - p.renderY) * Math.min(1, dt * 18);
      } else {
        p.renderX = p.x;
        p.renderY = p.y;
      }

      const px = p.renderX;
      const py = p.renderY;

      // Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 20, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sprite Selection
      let activeSprite = spriteF;
      if (!p.isGrounded || p.isJumping) {
        activeSprite = spriteH;
      } else if (p.isMoving && Math.abs(p.vx || 0) > 10) {
        const step = Math.floor(animTime * 2) % 2;
        activeSprite = (step === 0) ? spriteF : spriteG;
      }

      // Draw Sprite
      if (imagesLoaded && activeSprite.complete) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const scale = 0.35;
        const spriteW = activeSprite.width * scale;
        const spriteH = activeSprite.height * scale;

        ctx.translate(px, py);

        if (p.facing === 'right') {
          ctx.scale(-1, 1);
        } else {
          ctx.scale(1, 1);
        }

        ctx.drawImage(
          activeSprite,
          -spriteW / 2,
          -spriteH + 4,
          spriteW,
          spriteH
        );

        ctx.restore();
      }

      // Speech Bubble or Name Tag
      const approxHeight = (activeSprite.height || 100) * 0.35;
      if (speechBubbles[p.id]) {
        const bubble = speechBubbles[p.id];
        if (Date.now() > bubble.expiresAt) {
          delete speechBubbles[p.id];
        } else {
          drawWarmSpeechBubble(ctx, px, py - approxHeight - 4, bubble.text);
        }
      } else {
        drawNameTag(ctx, px, py - approxHeight - 4, p.name);
      }
    });

    // Update and Draw Floating Heart Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const part = particles[i];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha -= dt / part.life;

      if (part.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, part.alpha);
      ctx.font = `${Math.round(16 * part.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('❤️', part.x, part.y);
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
