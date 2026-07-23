// ---- Dedicated Classic Top-Down Klipspringer Crossing Engine ----
function drawKlipspringerPlayer(ctx, x, y, facing, isHopAnimating, equippedHat) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const px = Math.round(x);
  const py = Math.round(y);

  let activeSprite = (typeof spriteF !== 'undefined') ? spriteF : null;
  if (isHopAnimating && typeof spriteH !== 'undefined') {
    activeSprite = spriteH;
  }

  const scale = 0.35;
  const sw = (activeSprite && activeSprite.width ? activeSprite.width : 60) * scale;
  const sh = (activeSprite && activeSprite.height ? activeSprite.height : 80) * scale;

  ctx.translate(px, py);
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  if (typeof imagesLoaded !== 'undefined' && imagesLoaded && activeSprite && activeSprite.complete) {
    ctx.drawImage(activeSprite, -sw / 2, -sh + 10, sw, sh);
  } else {
    // Crisp 8-Bit Antelope/Klipspringer fallback
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-10, -12, 20, 20);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-7, -18, 4, 8);
    ctx.fillRect(3, -18, 4, 8);
  }

  ctx.restore();

  // Render Equipped Hat if available
  const currentHat = (typeof myEquippedHat !== 'undefined') ? myEquippedHat : equippedHat;
  if (currentHat && typeof drawWearableHat !== 'undefined') {
    drawWearableHat(px, py, currentHat, facing, activeSprite);
  }
}

const FroggerMode = {
  active: false,
  cols: 14,
  rows: 13,
  tileSize: 48,

  // State
  player: {
    gridX: 6,
    gridY: 12,
    x: 0,
    y: 0,
    facing: 'up',
    deaths: 0,
    score: 0,
    isHopAnimating: false,
    hopTimer: 0,
    homesFilled: [false, false, false, false, false]
  },

  startTime: 0,
  finished: false,

  // 13 Rows: Row 0 (Homes), Rows 1-5 (River), Row 6 (Middle Grass), Rows 7-11 (Road), Row 12 (Start Grass)
  lanes: [
    { row: 0, type: 'goal' },
    { row: 1, type: 'river', speed: -110, itemType: 'lilypad', itemW: 60, spacing: 170 },
    { row: 2, type: 'river', speed: 90,   itemType: 'log_long', itemW: 170, spacing: 250 },
    { row: 3, type: 'river', speed: -130, itemType: 'log_med', itemW: 120, spacing: 200 },
    { row: 4, type: 'river', speed: 100,  itemType: 'turtle', itemW: 90,  spacing: 210 },
    { row: 5, type: 'river', speed: -80,  itemType: 'log_short', itemW: 80, spacing: 160 },
    { row: 6, type: 'safe' },
    { row: 7, type: 'road', speed: 190,  carType: 'racecar',  carW: 55, carColor: '#dc2626', spacing: 220 },
    { row: 8, type: 'road', speed: -130, carType: 'truck',    carW: 95, carColor: '#2563eb', spacing: 290 },
    { row: 9, type: 'road', speed: 220,  carType: 'taxi',     carW: 50, carColor: '#ca8a04', spacing: 210 },
    { row: 10, type: 'road', speed: -170, carType: 'sports',   carW: 65, carColor: '#db2777', spacing: 240 },
    { row: 11, type: 'road', speed: 140,  carType: 'sedan',    carW: 55, carColor: '#059669', spacing: 220 },
    { row: 12, type: 'safe' }
  ],

  homeCols: [1, 4, 7, 10, 13],

  init() {
    this.resetPlayer();
    this.player.deaths = 0;
    this.player.score = 0;
    this.player.homesFilled = [false, false, false, false, false];
    this.startTime = 0;
    this.finished = false;
  },

  resetPlayer() {
    this.player.gridX = 6;
    this.player.gridY = 12;
    this.player.facing = 'up';
    this.player.isHopAnimating = false;
    this.player.hopTimer = 0;
    this.syncPositionImmediate();
  },

  syncPositionImmediate() {
    const board = this.getBoardBounds();
    this.player.x = board.startX + this.player.gridX * this.tileSize + this.tileSize / 2;
    this.player.y = board.startY + this.player.gridY * this.tileSize + this.tileSize / 2;
  },

  getBoardBounds() {
    const boardW = this.cols * this.tileSize; // 672px
    const boardH = this.rows * this.tileSize; // 624px
    const startX = Math.max(100, (canvas.width - boardW) / 2);
    const startY = Math.max(60, (canvas.height - boardH) / 2);
    return { boardW, boardH, startX, startY };
  },

  handleKeyDown(code) {
    if (code === 'Escape' || code === 'KeyE') {
      if (socket) socket.emit('switchWorld', 'select');
      return;
    }

    if (this.finished) return;

    let nextGX = this.player.gridX;
    let nextGY = this.player.gridY;

    if (code === 'KeyW' || code === 'ArrowUp') {
      nextGY--; this.player.facing = 'up';
    } else if (code === 'KeyS' || code === 'ArrowDown') {
      nextGY++; this.player.facing = 'down';
    } else if (code === 'KeyA' || code === 'ArrowLeft') {
      nextGX--; this.player.facing = 'left';
    } else if (code === 'KeyD' || code === 'ArrowRight') {
      nextGX++; this.player.facing = 'right';
    } else {
      return;
    }

    if (nextGX >= 0 && nextGX < this.cols && nextGY >= 0 && nextGY < this.rows) {
      this.player.gridX = nextGX;
      this.player.gridY = nextGY;
      this.player.isHopAnimating = true;
      this.player.hopTimer = 0.18;

      if (this.startTime === 0 && nextGY < 12) {
        this.startTime = Date.now();
      }

      playHopSound();
    }
  },

  update(dt, animTime) {
    if (!selfId || !players[selfId]) return;
    const board = this.getBoardBounds();
    const targetX = board.startX + this.player.gridX * this.tileSize + this.tileSize / 2;
    const targetY = board.startY + this.player.gridY * this.tileSize + this.tileSize / 2;

    this.player.x += (targetX - this.player.x) * Math.min(1, 20 * dt);
    this.player.y += (targetY - this.player.y) * Math.min(1, 20 * dt);

    if (this.player.hopTimer > 0) {
      this.player.hopTimer -= dt;
      if (this.player.hopTimer <= 0) this.player.isHopAnimating = false;
    }

    const me = players[selfId];
    me.x = this.player.x;
    me.y = this.player.y;
    me.gridX = this.player.gridX;
    me.gridY = this.player.gridY;
    me.facing = this.player.facing;
    me.isMoving = this.player.isHopAnimating;
    me.isJumping = this.player.isHopAnimating;
    me.isGrounded = !this.player.isHopAnimating;

    const row = this.player.gridY;
    const lane = this.lanes.find(l => l.row === row);

    // 1. Row 0: Goal Check
    if (row === 0) {
      let hitHomeIndex = -1;
      for (let i = 0; i < this.homeCols.length; i++) {
        if (Math.abs(this.player.gridX - this.homeCols[i]) <= 0.6) {
          hitHomeIndex = i;
          break;
        }
      }

      if (hitHomeIndex !== -1 && !this.player.homesFilled[hitHomeIndex]) {
        this.player.homesFilled[hitHomeIndex] = true;
        this.player.score += 500;
        playHarvestSound();
        spawnFloatText(this.player.x, this.player.y - 30, '+500', '#ffd700');

        if (this.player.homesFilled.every(f => f)) {
          const elapsedMs = Date.now() - this.startTime;
          this.finished = true;
          const sec = (elapsedMs / 1000).toFixed(2);
          spawnFloatText(this.player.x, this.player.y - 40, `WIN! ${sec}s`, '#00e676');
          if (socket) socket.emit('submitFroggerTime', { timeMs: elapsedMs });
        } else {
          this.resetPlayer();
        }
      } else {
        playHonkSound();
        this.player.deaths++;
        spawnFloatText(this.player.x, this.player.y - 30, 'SPLAT!', '#ff1744');
        this.resetPlayer();
      }
      return;
    }

    // 2. River Lanes (Rows 1..5)
    if (lane && lane.type === 'river') {
      const logsInLane = this.getLogsInLane(lane, board, animTime);
      let standingOnLog = null;

      for (let log of logsInLane) {
        if (this.player.x >= log.x - 12 && this.player.x <= log.x + log.w + 12) {
          standingOnLog = log;
          break;
        }
      }

      if (standingOnLog) {
        const dx = lane.speed * dt;
        this.player.x += dx;
        this.player.gridX = Math.max(0, Math.min(this.cols - 1, (this.player.x - board.startX - this.tileSize / 2) / this.tileSize));

        if (this.player.x < board.startX || this.player.x > board.startX + board.boardW) {
          playSplashSound();
          this.player.deaths++;
          spawnFloatText(this.player.x, this.player.y - 30, 'SWEPT AWAY!', '#00e5ff');
          this.resetPlayer();
        }
      } else {
        playSplashSound();
        this.player.deaths++;
        spawnFloatText(this.player.x, this.player.y - 30, 'SPLASH!', '#00e5ff');
        this.resetPlayer();
      }
      return;
    }

    // 3. Road Lanes (Rows 7..11)
    if (lane && lane.type === 'road') {
      const carsInLane = this.getCarsInLane(lane, board, animTime);
      for (let car of carsInLane) {
        if (Math.abs(this.player.x - (car.x + car.w / 2)) < (car.w / 2 + 14) &&
            Math.abs(this.player.y - (car.y + car.h / 2)) < (car.h / 2 + 14)) {
          playHonkSound();
          this.player.deaths++;
          spawnFloatText(this.player.x, this.player.y - 30, 'SPLAT!', '#ff1744');
          this.resetPlayer();
          break;
        }
      }
    }
  },

  getLogsInLane(lane, board, animTime) {
    const logs = [];
    const nowSec = animTime || (Date.now() / 1000);
    const laneY = board.startY + lane.row * this.tileSize;
    const offsets = [0, lane.spacing, lane.spacing * 2, lane.spacing * 3];

    offsets.forEach(offset => {
      let logX = (offset + lane.speed * nowSec) % board.boardW;
      if (logX < 0) logX += board.boardW;
      logX += board.startX;

      logs.push({
        x: logX,
        y: laneY + 6,
        w: lane.itemW,
        h: this.tileSize - 12,
        type: lane.itemType,
        speed: lane.speed
      });
    });
    return logs;
  },

  getCarsInLane(lane, board, animTime) {
    const cars = [];
    const nowSec = animTime || (Date.now() / 1000);
    const laneY = board.startY + lane.row * this.tileSize;
    const offsets = [0, lane.spacing, lane.spacing * 2, lane.spacing * 3];

    offsets.forEach(offset => {
      let carX = (offset + lane.speed * nowSec) % board.boardW;
      if (carX < 0) carX += board.boardW;
      carX += board.startX;

      cars.push({
        x: carX,
        y: laneY + 6,
        w: lane.carW,
        h: this.tileSize - 12,
        color: lane.carColor,
        carType: lane.carType,
        speed: lane.speed
      });
    });
    return cars;
  },

  render(ctx, animTime, dt) {
    const frameDt = dt || 0.016;
    const board = this.getBoardBounds();
    const ts = this.tileSize;

    ctx.save();

    // 8-Bit Outer Arcade Border
    ctx.fillStyle = '#000000';
    ctx.fillRect(board.startX - 6, board.startY - 6, board.boardW + 12, board.boardH + 12);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    ctx.strokeRect(board.startX - 6, board.startY - 6, board.boardW + 12, board.boardH + 12);

    // Render Board Rows
    this.lanes.forEach(lane => {
      const ry = board.startY + lane.row * ts;

      if (lane.type === 'goal') {
        // Goal bank (8-bit green grass with alcoves)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Render 5 Home Alcoves
        this.homeCols.forEach((col, idx) => {
          const hx = board.startX + col * ts;
          const isFilled = this.player.homesFilled[idx];

          ctx.fillStyle = isFilled ? '#1e3a8a' : '#0284c7';
          ctx.fillRect(hx, ry + 4, ts, ts - 8);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx, ry + 4, ts, ts - 8);

          if (isFilled) {
            drawKlipspringerPlayer(ctx, hx + ts / 2, ry + ts / 2 + 10, 'right', false, 'cute_bow');
          }
        });
      } else if (lane.type === 'river') {
        // Water
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Waves
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let wx = 0; wx < board.boardW; wx += 60) {
          const waveShift = Math.sin(animTime * 4 + lane.row + wx) * 8;
          ctx.fillRect(board.startX + ((wx + waveShift + 600) % board.boardW), ry + 16, 28, 3);
        }

        // Floating Logs, Lilypads, Turtles
        const logs = this.getLogsInLane(lane, board, animTime);
        logs.forEach(log => {
          if (log.type === 'lilypad') {
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(log.x, log.y, log.w, log.h);
            ctx.fillStyle = '#86efac';
            ctx.fillRect(log.x + 4, log.y + 4, log.w - 8, log.h - 8);
          } else if (log.type === 'turtle') {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(log.x, log.y + 2, log.w, log.h - 4);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(log.x + 4, log.y + 4, log.w - 8, log.h - 8);
          } else { // Log
            ctx.fillStyle = '#78350f';
            ctx.fillRect(log.x, log.y, log.w, log.h);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(log.x + 4, log.y + 4, log.w - 8, log.h - 8);
          }
        });
      } else if (lane.type === 'safe') {
        // Grass Bank
        ctx.fillStyle = lane.row === 6 ? '#166534' : '#15803d';
        ctx.fillRect(board.startX, ry, board.boardW, ts);
      } else if (lane.type === 'road') {
        // Asphalt Road
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Lane Stripe
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(board.startX, ry + ts);
        ctx.lineTo(board.startX + board.boardW, ry + ts);
        ctx.stroke();
        ctx.setLineDash([]);

        // 8-Bit Vehicles
        const cars = this.getCarsInLane(lane, board, animTime);
        cars.forEach(car => {
          ctx.fillStyle = car.color;
          ctx.fillRect(car.x, car.y, car.w, car.h);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(car.x + 6, car.y + 4, car.w - 12, car.h - 8);
          ctx.fillStyle = '#fef08a';
          if (car.speed > 0) {
            ctx.fillRect(car.x + car.w - 4, car.y + 4, 3, 3);
            ctx.fillRect(car.x + car.w - 4, car.y + car.h - 7, 3, 3);
          } else {
            ctx.fillRect(car.x + 1, car.y + 4, 3, 3);
            ctx.fillRect(car.x + 1, car.y + car.h - 7, 3, 3);
          }
        });
      }
    });

    // Render Other Connected Players in Frogger Mode
    if (typeof players !== 'undefined') {
      Object.values(players).forEach(other => {
        if (other.id !== selfId && (other.world || 'main') === 'frogger') {
          const gx = other.gridX !== undefined ? other.gridX : 6;
          const gy = other.gridY !== undefined ? other.gridY : 12;
          const targetX = board.startX + gx * this.tileSize + this.tileSize / 2;
          const targetY = board.startY + gy * this.tileSize + this.tileSize / 2;

          if (other.renderX === undefined) other.renderX = targetX;
          if (other.renderY === undefined) other.renderY = targetY;

          other.renderX += (targetX - other.renderX) * Math.min(1, 20 * frameDt);
          other.renderY += (targetY - other.renderY) * Math.min(1, 20 * frameDt);

          const isHop = (Math.hypot(targetX - other.renderX, targetY - other.renderY) > 2);
          drawKlipspringerPlayer(ctx, other.renderX, other.renderY, other.facing || 'right', isHop, other.equippedHat);

          if (typeof drawNameTag !== 'undefined') {
            drawNameTag(other.renderX, other.renderY - 22, other.name || 'Pip');
          }
          if (typeof speechBubbles !== 'undefined' && speechBubbles[other.id] && speechBubbles[other.id].expiresAt > Date.now()) {
            if (typeof drawSpeechBubble !== 'undefined') {
              drawSpeechBubble(other.renderX, other.renderY - 42, speechBubbles[other.id].text);
            }
          }
        }
      });
    }

    // Render Player Klipspringer Character
    drawKlipspringerPlayer(ctx, this.player.x, this.player.y, this.player.facing, this.player.isHopAnimating, myEquippedHat);
    if (typeof selfId !== 'undefined' && players[selfId]) {
      const me = players[selfId];
      if (typeof drawNameTag !== 'undefined') {
        drawNameTag(this.player.x, this.player.y - 22, me.name || 'Pip');
      }
      if (typeof speechBubbles !== 'undefined' && speechBubbles[selfId] && speechBubbles[selfId].expiresAt > Date.now()) {
        if (typeof drawSpeechBubble !== 'undefined') {
          drawSpeechBubble(this.player.x, this.player.y - 42, speechBubbles[selfId].text);
        }
      }
    }

    // Basic Web 1.0 Environmental Leaderboard Billboard on Side of Board
    const lbWidth = 140;
    let lbX = board.startX + board.boardW + 12;
    if (lbX + lbWidth > canvas.width - 10) {
      lbX = Math.max(10, board.startX - lbWidth - 12);
    }
    const lbY = board.startY + 40;
    const lbH = 140;

    // Simple Support Posts
    ctx.fillStyle = '#444444';
    ctx.fillRect(lbX + 12, lbY + lbH, 6, board.boardH - (lbY - board.startY) - lbH);
    ctx.fillRect(lbX + lbWidth - 18, lbY + lbH, 6, board.boardH - (lbY - board.startY) - lbH);

    // Basic Black Box with 1px border
    ctx.fillStyle = '#000000';
    ctx.fillRect(lbX, lbY, lbWidth, lbH);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(lbX, lbY, lbWidth, lbH);

    // Title Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SCORES', lbX + lbWidth / 2, lbY + 15);

    ctx.strokeStyle = '#444444';
    ctx.beginPath(); ctx.moveTo(lbX + 5, lbY + 20); ctx.lineTo(lbX + lbWidth - 5, lbY + 20); ctx.stroke();

    // High Scores List
    ctx.font = '10px monospace';
    const topRuns = (typeof froggerLeaderboard !== 'undefined' ? froggerLeaderboard : []).slice(0, 7);
    topRuns.forEach((entry, i) => {
      const sec = (entry.timeMs / 1000).toFixed(2);
      ctx.fillStyle = i === 0 ? '#ffff00' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${entry.name.substring(0, 8)}`, lbX + 6, lbY + 34 + i * 14);
      ctx.textAlign = 'right';
      ctx.fillText(`${sec}s`, lbX + lbWidth - 6, lbY + 34 + i * 14);
    });

    if (topRuns.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.fillText('No runs yet', lbX + lbWidth / 2, lbY + 50);
    }

    // 8-Bit Clean Retro HUD
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00e676';
    ctx.fillText('[ESC / E] EXIT TO HALL | [L] LEADERBOARDS', board.startX, board.startY + board.boardH + 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    let timeStr = this.startTime > 0 && !this.finished ? `${((Date.now() - this.startTime) / 1000).toFixed(2)}s` : '0.00s';
    ctx.fillText(`SCORE: ${this.player.score}  TIME: ${timeStr}`, board.startX + board.boardW, board.startY + board.boardH + 20);

    ctx.restore();
  }
};
