// ---- Dedicated Interactive Fishing Engine for Beach World ----
const FISH_SPECIES = [
  { id: 'small_fry', name: 'Small Fry', yield: 2, rarity: 0.40, color: '#38bdf8', diff: 0.6, icon: '🐟' },
  { id: 'sea_bass', name: 'Sea Bass', yield: 5, rarity: 0.30, color: '#10b981', diff: 1.0, icon: '🐠' },
  { id: 'golden_salmon', name: 'Golden Salmon', yield: 12, rarity: 0.18, color: '#f59e0b', diff: 1.4, icon: '🐡' },
  { id: 'legendary_marlin', name: 'Legendary Marlin', yield: 25, rarity: 0.08, color: '#ec4899', diff: 2.0, icon: '🦈' },
  { id: 'old_boot', name: 'Old Boot', yield: 1, rarity: 0.04, color: '#78350f', diff: 0.3, icon: '👞' }
];

const FishingMode = {
  active: false,
  state: 'idle', // 'casting', 'waiting', 'hooked', 'caught', 'failed'
  timer: 0,
  bobber: { x: 0, y: 0, startX: 0, startY: 0, targetX: 0, targetY: 0 },
  fish: null,
  fishShadowX: 0,
  nibbleTriggered: false,
  
  // Tension Gauge Minigame State
  barPos: 50,      // Player green bar position (0..100)
  barSize: 28,     // Size of green catch zone
  barVel: 0,       // Velocity of green catch zone
  fishPos: 50,     // Target fish position (0..100)
  fishTargetPos: 50,
  fishMoveTimer: 0,
  catchProgress: 35, // Progress (0..100) -> 100 = catch, 0 = fail
  isReeling: false,
  syncTimer: 0,

  syncNetworkState() {
    if (typeof socket !== 'undefined' && socket) {
      socket.emit('playerFishingState', {
        isFishing: this.active,
        state: this.state,
        bobberX: this.bobber ? this.bobber.x : 0,
        bobberY: this.bobber ? this.bobber.y : 0,
        targetY: this.bobber ? this.bobber.targetY : 0,
        nibble: this.nibbleTriggered
      });
    }
  },

  init(playerX, groundY) {
    this.active = true;
    this.state = 'casting';
    this.timer = 0.6; // Cast duration
    const castDist = 100 + Math.random() * 60;
    this.bobber = {
      x: playerX + 15,
      y: groundY - 30,
      startX: playerX + 15,
      startY: groundY - 30,
      targetX: Math.max(1330, playerX + castDist),
      targetY: groundY + 12
    };
    this.catchProgress = 35;
    this.barPos = 50;
    this.barVel = 0;
    this.fishPos = 50;
    this.fishTargetPos = 50;
    this.fishMoveTimer = 0;
    this.fish = this.pickRandomFish();
    this.fishShadowX = this.bobber.targetX + 60;
    this.nibbleTriggered = false;
    this.isReeling = false;
    this.syncTimer = 0;
    this.syncNetworkState();
  },

  pickRandomFish() {
    const r = Math.random();
    let cumulative = 0;
    for (let f of FISH_SPECIES) {
      cumulative += f.rarity;
      if (r <= cumulative) return f;
    }
    return FISH_SPECIES[0];
  },

  cancel() {
    const wasActive = this.active;
    this.active = false;
    this.state = 'idle';
    this.isReeling = false;
    this.nibbleTriggered = false;
    if (wasActive) {
      this.syncNetworkState();
    }
  },

  handleKeyDown(code) {
    if (!this.active) return false;

    if (code === 'Escape') {
      this.cancel();
      return true;
    }

    if (code === 'Space' || code === 'KeyE') {
      if (this.state === 'waiting') {
        if (this.nibbleTriggered) {
          // Fish hooked!
          this.state = 'hooked';
          this.catchProgress = 40;
          this.syncNetworkState();
          if (typeof playSplashSound !== 'undefined') playSplashSound();
        } else {
          // Reeled in early before bite -> cancel
          this.cancel();
          if (typeof spawnFloatText !== 'undefined' && typeof selfId !== 'undefined' && players[selfId]) {
            spawnFloatText(players[selfId].x, players[selfId].y - 40, 'Reeled in early', '#94a3b8');
          }
        }
        return true;
      }
      if (this.state === 'hooked') {
        this.isReeling = true;
        return true;
      }
      if (this.state === 'casting' || this.state === 'caught' || this.state === 'failed') {
        return true; // Consume keypress while active so tryInteract() is NOT called
      }
    }
    return false;
  },

  handleKeyUp(code) {
    if (!this.active) return;
    if (code === 'Space' || code === 'KeyE') {
      this.isReeling = false;
    }
  },

  handlePointerDown() {
    if (!this.active) return false;
    if (this.state === 'waiting') {
      if (this.nibbleTriggered) {
        this.state = 'hooked';
        this.catchProgress = 40;
        this.syncNetworkState();
        if (typeof playSplashSound !== 'undefined') playSplashSound();
      } else {
        this.cancel();
      }
      return true;
    }
    if (this.state === 'hooked') {
      this.isReeling = true;
      return true;
    }
    return true;
  },

  handlePointerUp() {
    if (!this.active) return;
    this.isReeling = false;
  },

  update(dt) {
    if (!this.active) return;

    this.syncTimer += dt;
    if (this.syncTimer >= 0.1) {
      this.syncTimer = 0;
      this.syncNetworkState();
    }

    if (this.state === 'casting') {
      this.timer -= dt;
      const t = 1 - Math.max(0, this.timer / 0.6);
      this.bobber.x = this.bobber.startX + (this.bobber.targetX - this.bobber.startX) * t;
      const arc = Math.sin(t * Math.PI) * 45;
      this.bobber.y = this.bobber.startY + (this.bobber.targetY - this.bobber.startY) * t - arc;

      if (this.timer <= 0) {
        this.state = 'waiting';
        this.timer = 1.8 + Math.random() * 2.2; // Wait for bite
        this.syncNetworkState();
        if (typeof playSplashSound !== 'undefined') playSplashSound();
      }
    } else if (this.state === 'waiting') {
      this.timer -= dt;
      // Floating bobber motion
      this.bobber.y = this.bobber.targetY + Math.sin(Date.now() / 250) * 3;

      // Underwater fish shadow approaching
      if (this.fishShadowX > this.bobber.targetX + 5) {
        this.fishShadowX -= dt * 35;
      }

      if (this.timer <= 0 && !this.nibbleTriggered) {
        this.nibbleTriggered = true;
        this.timer = 1.6; // 1.6 second bite window to hook!
        this.syncNetworkState();
        if (typeof playSplashSound !== 'undefined') playSplashSound();
      }

      if (this.nibbleTriggered && this.timer <= -1.6) {
        // Missed the bite!
        this.state = 'failed';
        this.timer = 1.0;
        this.syncNetworkState();
        if (typeof spawnFloatText !== 'undefined' && typeof selfId !== 'undefined' && players[selfId]) {
          spawnFloatText(players[selfId].x, players[selfId].y - 40, 'Got away...', '#94a3b8');
        }
      }
    } else if (this.state === 'hooked') {
      const diff = this.fish ? this.fish.diff : 1.0;

      // 1. Reel Bar Acceleration & Gravity
      if (this.isReeling) {
        this.barVel += 240 * dt;
        if (typeof playReelSound !== 'undefined' && Math.random() < 0.2) playReelSound();
      } else {
        this.barVel -= 180 * dt;
      }

      this.barPos += this.barVel * dt;
      if (this.barPos < 0) { this.barPos = 0; this.barVel = 0; }
      if (this.barPos > 100 - this.barSize) { this.barPos = 100 - this.barSize; this.barVel = 0; }

      // 2. Fish AI Movement
      this.fishMoveTimer -= dt;
      if (this.fishMoveTimer <= 0) {
        this.fishTargetPos = Math.random() * (100 - 15) + 5;
        this.fishMoveTimer = (0.5 + Math.random() * 0.7) / diff;
      }
      this.fishPos += (this.fishTargetPos - this.fishPos) * Math.min(1, dt * 5 * diff);

      // 3. Gauge Progress
      const inZone = (this.fishPos >= this.barPos && this.fishPos <= this.barPos + this.barSize);
      if (inZone) {
        this.catchProgress += 32 * dt;
      } else {
        this.catchProgress -= 24 * dt;
      }

      if (this.catchProgress >= 100) {
        this.state = 'caught';
        this.timer = 1.5;
        this.syncNetworkState();

        if (socket) {
          socket.emit('submitFishCatch', { fishId: this.fish.id, yield: this.fish.yield, name: this.fish.name });
        }

        if (typeof playCatchSound !== 'undefined') playCatchSound();
        if (typeof spawnFloatText !== 'undefined' && typeof selfId !== 'undefined' && players[selfId]) {
          spawnFloatText(players[selfId].x, players[selfId].y - 45, `CATCH! ${this.fish.name}`, this.fish.color);
        }
      } else if (this.catchProgress <= 0) {
        this.state = 'failed';
        this.timer = 1.0;
        this.syncNetworkState();
        if (typeof spawnFloatText !== 'undefined' && typeof selfId !== 'undefined' && players[selfId]) {
          spawnFloatText(players[selfId].x, players[selfId].y - 40, 'Line snapped!', '#ef4444');
        }
      }
    } else if (this.state === 'caught' || this.state === 'failed') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.cancel();
      }
    }
  },

  render(ctx, animTime) {
    if (!this.active) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (typeof selfId !== 'undefined' && players[selfId]) {
      const me = players[selfId];
      const rodX = me.x + (me.facing === 'left' ? -20 : 20);
      const rodY = me.y - 28;

      // Draw Wooden Fishing Rod
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(me.x, me.y - 10);
      ctx.lineTo(rodX, rodY);
      ctx.stroke();

      // Fishing Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rodX, rodY);
      ctx.lineTo(this.bobber.x, this.bobber.y);
      ctx.stroke();

      // Bobber & Water Ripples
      if (this.state !== 'idle') {
        // Water Ripple Rings around Bobber
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        const ripR = 6 + Math.sin(animTime * 5) * 4;
        ctx.beginPath(); ctx.ellipse(this.bobber.x, this.bobber.targetY + 4, ripR, ripR * 0.4, 0, 0, Math.PI * 2); ctx.stroke();

        // Red/White Bobber
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(this.bobber.x, this.bobber.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(this.bobber.x, this.bobber.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Fish Shadow swimming underwater towards bobber
      if (this.state === 'waiting') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.ellipse(this.fishShadowX, this.bobber.targetY + 8, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Waiting / Nibble Prompt
    if (this.state === 'waiting') {
      const promptX = this.bobber.x;
      const promptY = this.bobber.y - 35;

      if (this.nibbleTriggered) {
        // Fish Bite Alert!
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(promptX - 55, promptY - 5, 110, 24);
        ctx.strokeStyle = '#76ff03';
        ctx.lineWidth = 2;
        ctx.strokeRect(promptX - 55, promptY - 5, 110, 24);
        ctx.fillStyle = '#76ff03';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FISH ON! [SPACE]', promptX, promptY + 11);
      } else {
        // Waiting for bite...
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(promptX - 40, promptY, 80, 18);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting...', promptX, promptY + 12);
      }
    }

    // 3. Reeling Tension Gauge Minigame Overlay
    if (this.state === 'hooked' && typeof selfId !== 'undefined' && players[selfId]) {
      const me = players[selfId];
      const gx = me.x + 35;
      const gy = me.y - 130;
      const gw = 28;
      const gh = 120;

      // Background Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy, gw, gh);

      // Green Target Catch Zone Bar
      const greenY = gy + gh - (this.barPos + this.barSize) * (gh / 100);
      const greenH = this.barSize * (gh / 100);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
      ctx.fillRect(gx + 3, greenY, gw - 6, greenH);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx + 3, greenY, gw - 6, greenH);

      // Target Fish Icon
      const fishIconY = gy + gh - (this.fishPos) * (gh / 100);
      ctx.fillStyle = this.fish ? this.fish.color : '#ffd700';
      ctx.beginPath(); ctx.arc(gx + gw / 2, fishIconY, 6, 0, Math.PI * 2); ctx.fill();

      // Side Progress Bar
      const progH = (this.catchProgress / 100) * gh;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(gx + gw + 4, gy, 8, gh);
      ctx.fillStyle = this.catchProgress > 60 ? '#10b981' : (this.catchProgress > 30 ? '#f59e0b' : '#ef4444');
      ctx.fillRect(gx + gw + 4, gy + gh - progH, 8, progH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx + gw + 4, gy, 8, gh);

      // Instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[HOLD SPACE] REEL', me.x, gy - 8);
    }

    ctx.restore();
  }
};
