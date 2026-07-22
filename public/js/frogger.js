// ---- Dedicated Classic Top-Down Frogger Engine ----
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
    targetX: 0,
    targetY: 0,
    facing: 'up',
    deaths: 0,
    score: 0,
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
    { row: 7, type: 'road', speed: 190,  carType: 'racecar',  carW: 55, carColor: '#ef4444', spacing: 220 },
    { row: 8, type: 'road', speed: -130, carType: 'truck',    carW: 95, carColor: '#3b82f6', spacing: 290 },
    { row: 9, type: 'road', speed: 220,  carType: 'taxi',     carW: 50, carColor: '#eab308', spacing: 210 },
    { row: 10, type: 'road', speed: -170, carType: 'sports',   carW: 65, carColor: '#ec4899', spacing: 240 },
    { row: 11, type: 'road', speed: 140,  carType: 'sedan',    carW: 55, carColor: '#10b981', spacing: 220 },
    { row: 12, type: 'safe' }
  ],

  // Home alcove column positions in Row 0
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
    this.syncPositionImmediate();
  },

  syncPositionImmediate() {
    const board = this.getBoardBounds();
    this.player.x = board.startX + this.player.gridX * this.tileSize + this.tileSize / 2;
    this.player.y = board.startY + this.player.gridY * this.tileSize + this.tileSize / 2;
    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;
  },

  getBoardBounds() {
    const boardW = this.cols * this.tileSize; // 672px
    const boardH = this.rows * this.tileSize; // 624px
    const startX = Math.max(100, (canvas.width - boardW) / 2);
    const startY = Math.max(80, (canvas.height - boardH) / 2);
    return { boardW, boardH, startX, startY };
  },

  handleKeyDown(code) {
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

    // Boundary check
    if (nextGX >= 0 && nextGX < this.cols && nextGY >= 0 && nextGY < this.rows) {
      this.player.gridX = nextGX;
      this.player.gridY = nextGY;

      // Start timer on first hop upwards
      if (this.startTime === 0 && nextGY < 12) {
        this.startTime = Date.now();
        spawnFloatText(this.player.x, this.player.y - 30, 'FROGGER STARTED!', '#00e676');
      }

      playHopSound();
    }
  },

  update(dt, animTime) {
    if (!selfId || !players[selfId]) return;
    const board = this.getBoardBounds();
    const targetX = board.startX + this.player.gridX * this.tileSize + this.tileSize / 2;
    const targetY = board.startY + this.player.gridY * this.tileSize + this.tileSize / 2;

    // Smooth movement interpolation toward target grid spot
    this.player.x += (targetX - this.player.x) * Math.min(1, 20 * dt);
    this.player.y += (targetY - this.player.y) * Math.min(1, 20 * dt);

    const me = players[selfId];
    me.x = this.player.x;
    me.y = this.player.y;

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
        // Filled a home!
        this.player.homesFilled[hitHomeIndex] = true;
        this.player.score += 500;
        playHarvestSound();
        spawnFloatText(this.player.x, this.player.y - 30, '+500 HOME REACHED!', '#ffd700');

        // Check if all 5 homes are filled
        if (this.player.homesFilled.every(f => f)) {
          const elapsedMs = Date.now() - this.startTime;
          this.finished = true;
          const sec = (elapsedMs / 1000).toFixed(2);
          spawnFloatText(this.player.x, this.player.y - 40, `VICTORY! ALL HOMES FILLED IN ${sec}s!`, '#00e676');
          if (socket) socket.emit('submitFroggerTime', { timeMs: elapsedMs });
        } else {
          this.resetPlayer();
        }
      } else {
        // Hit wall in row 0 outside home alcove -> SPLAT
        playHonkSound();
        this.player.deaths++;
        spawnFloatText(this.player.x, this.player.y - 30, 'MISSED HOME ALCOVE!', '#ff1744');
        this.resetPlayer();
      }
      return;
    }

    // 2. River Lanes (Rows 1..5) - Check floating logs & ride log velocity!
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
        // Ride log horizontally!
        const dx = lane.speed * dt;
        this.player.x += dx;
        this.player.gridX = Math.max(0, Math.min(this.cols - 1, (this.player.x - board.startX - this.tileSize / 2) / this.tileSize));

        // Check side board boundaries
        if (this.player.x < board.startX || this.player.x > board.startX + board.boardW) {
          playSplashSound();
          this.player.deaths++;
          spawnFloatText(this.player.x, this.player.y - 30, 'SWEPT OFF BOARD!', '#00e5ff');
          this.resetPlayer();
        }
      } else {
        // Fell in water!
        playSplashSound();
        this.player.deaths++;
        spawnFloatText(this.player.x, this.player.y - 30, 'SPLASH! Fell in water!', '#00e5ff');
        this.resetPlayer();
      }
      return;
    }

    // 3. Road Lanes (Rows 7..11) - Check car collisions!
    if (lane && lane.type === 'road') {
      const carsInLane = this.getCarsInLane(lane, board, animTime);
      for (let car of carsInLane) {
        if (Math.abs(this.player.x - (car.x + car.w / 2)) < (car.w / 2 + 14) &&
            Math.abs(this.player.y - (car.y + car.h / 2)) < (car.h / 2 + 14)) {
          playHonkSound();
          this.player.deaths++;
          spawnFloatText(this.player.x, this.player.y - 30, 'SPLAT! Hit by vehicle!', '#ff1744');
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

  render(ctx, animTime) {
    const board = this.getBoardBounds();
    const ts = this.tileSize;

    ctx.save();

    // 1. Arcade Cabinet Backdrop & Outer Border
    ctx.fillStyle = '#09090b';
    ctx.fillRect(board.startX - 16, board.startY - 50, board.boardW + 32, board.boardH + 70);
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 3;
    ctx.strokeRect(board.startX - 16, board.startY - 50, board.boardW + 32, board.boardH + 70);

    // Header Title Banner
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🐸 CLASSIC FROGGER 🐸', board.startX + board.boardW / 2, board.startY - 22);

    // 2. Render Board Rows
    this.lanes.forEach(lane => {
      const ry = board.startY + lane.row * ts;

      if (lane.type === 'goal') {
        // Goal bank (green grass with 5 frog home lilypad alcoves)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Render 5 Home Alcoves
        this.homeCols.forEach((col, idx) => {
          const hx = board.startX + col * ts;
          const isFilled = this.player.homesFilled[idx];

          ctx.fillStyle = isFilled ? '#facc15' : '#0284c7';
          ctx.fillRect(hx, ry + 4, ts, ts - 8);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx, ry + 4, ts, ts - 8);

          if (isFilled) {
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🐸', hx + ts / 2, ry + ts - 10);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`HOME ${idx+1}`, hx + ts / 2, ry + ts / 2 + 4);
          }
        });
      } else if (lane.type === 'river') {
        // Deep Water
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Animated Waves
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
            ctx.beginPath();
            ctx.ellipse(log.x + log.w / 2, log.y + log.h / 2, log.w / 2, log.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#86efac';
            ctx.beginPath();
            ctx.ellipse(log.x + log.w / 2, log.y + log.h / 2, log.w / 3, log.h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (log.type === 'turtle') {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(log.x, log.y + 2, log.w, log.h - 4);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(log.x + 4, log.y + 4, log.w - 8, log.h - 8);
          } else { // Log
            ctx.fillStyle = '#78350f';
            ctx.fillRect(log.x, log.y, log.w, log.h);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(log.x + 3, log.y + 3, log.w - 6, log.h - 6);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(log.x + 8, log.y + 8, log.w / 2, 2);
          }
        });
      } else if (lane.type === 'safe') {
        // Grass Bank
        ctx.fillStyle = lane.row === 6 ? '#166534' : '#15803d';
        ctx.fillRect(board.startX, ry, board.boardW, ts);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(board.startX, ry, board.boardW, 3);
      } else if (lane.type === 'road') {
        // Asphalt Road
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(board.startX, ry, board.boardW, ts);

        // Yellow Lane Stripe
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(board.startX, ry + ts);
        ctx.lineTo(board.startX + board.boardW, ry + ts);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vehicles
        const cars = this.getCarsInLane(lane, board, animTime);
        cars.forEach(car => {
          ctx.fillStyle = car.color;
          ctx.fillRect(car.x, car.y, car.w, car.h);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(car.x + 6, car.y + 4, car.w - 12, car.h - 8);
          ctx.fillStyle = '#fef08a';
          if (car.speed > 0) {
            ctx.fillRect(car.x + car.w - 4, car.y + 4, 4, 4);
            ctx.fillRect(car.x + car.w - 4, car.y + car.h - 8, 4, 4);
          } else {
            ctx.fillRect(car.x, car.y + 4, 4, 4);
            ctx.fillRect(car.x, car.y + car.h - 8, 4, 4);
          }
        });
      }
    });

    // 3. Render Top-Down Frog Player
    ctx.save();
    const px = this.player.x;
    const py = this.player.y;

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐸', px, py);
    ctx.restore();

    // 4. Return Portal Prompt on Row 12 (Start Bank)
    const portalX = board.startX + 60;
    const portalY = board.startY + 12 * ts + ts / 2;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#76ff03';
    ctx.fillText('← [E] RETURN TO SELECT', board.startX + 10, board.startY + 12 * ts + ts / 2 + 4);

    // 5. Arcade Stats Footer
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`SCORE: ${this.player.score} | SPLATS: ${this.player.deaths}`, board.startX, board.startY + board.boardH + 20);

    if (this.startTime > 0 && !this.finished) {
      const elapsedSec = ((Date.now() - this.startTime) / 1000).toFixed(2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00e676';
      ctx.fillText(`TIME: ${elapsedSec}s`, board.startX + board.boardW, board.startY + board.boardH + 20);
    }

    ctx.restore();
  }
};
