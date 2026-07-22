// ---- Physics Engine & Pickups ----
function checkCoinPickup() {
  if (!selfId || !players[selfId] || myWorld !== 'main') return;
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

function checkDroppedItemPickup() {
  if (!selfId || !players[selfId]) return;
  const me = players[selfId];
  const groundY = getGroundY();
  const now = Date.now();

  Object.values(droppedItems).forEach(drop => {
    if ((drop.world || 'main') === myWorld) {
      const dropAbsY = groundY + drop.yRel;
      const dx = Math.abs(me.x - drop.x);
      const dy = Math.abs((me.y - 20) - dropAbsY);

      const age = now - (drop.createdAt || 0);
      // If owner is still standing right on top of drop point, delay re-pickup for 1s
      if (drop.droppedBy === selfId && dx < 30 && age < 1000) return;

      // Walk over collision check
      if (dx < 36 && dy < 44) {
        socket.emit('pickupItem', drop.id);
        delete droppedItems[drop.id];
      }
    }
  });
}

let lastEmitTime = 0;
let selectPlatePressed = false;
let selectLeverExpiresAt = 0;

function updatePhysics(dt) {
  if (!selfId || !players[selfId]) return;

  // Selection Hall Pressure Plate Check (x: 350)
  selectPlatePressed = false;
  if (myWorld === 'select') {
    Object.values(players).forEach(p => {
      if ((p.world || 'main') === 'select') {
        if (Math.abs(p.x - 350) < 25 && Math.abs(p.y - groundY) < 14) {
          selectPlatePressed = true;
        }
      }
    });
  }
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

  if (me.isGrounded && me.isMoving && Math.abs(me.vx) > 30) {
    stepTimer += dt;
    if (stepTimer >= 0.22) { playFootstepSound(); stepTimer = 0; }
  } else { stepTimer = 0; }

  if (me.jumpBufferTimer > 0 && me.coyoteTimer > 0) {
    me.vy = -JUMP_FORCE;
    me.isGrounded = false; me.isJumping = true;
    me.coyoteTimer = 0; me.jumpBufferTimer = 0;
    playHopSound();
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
  const maxWorldX = myWorld === 'course2' ? 4100 : (myWorld === 'coop1' ? 2400 : canvas.width);
  me.x = Math.max(20, Math.min(maxWorldX - 20, nextX));

  // Fall off screen in Obstacle Courses = teleport to start
  if ((myWorld === 'course' || myWorld === 'course2' || myWorld === 'coop1') && me.y > canvas.height + 60) {
    me.x = myWorld === 'coop1' ? 100 : 120;
    me.y = getGroundY();
    me.vx = 0; me.vy = 0; me.isGrounded = true;
    if (myWorld === 'course' || myWorld === 'course2') {
      courseRunStartTime = 0; courseRunFinished = false;
    }
    spawnFloatText(me.x, me.y - 40, 'FELL! Back to start...', '#e94560');
  }

  // Spring Collision for Co-op Level 1
  if (myWorld === 'coop1') {
    const offsetY = canvas.height - COOP_LEVEL_1.height;

    COOP_LEVEL_1.springs.forEach(s => {
      const sy = s.y + offsetY;
      if (me.vy >= 0 && me.y <= sy + 6 && nextY >= sy) {
        if (nextX >= s.x - 14 && nextX <= s.x + s.w + 14) {
          me.vy = -(s.bounceForce || 1100);
          me.isGrounded = false;
          playHopSound();
        }
      }
    });

    // Reset Pressure Plates state each frame for coop1
    COOP_LEVEL_1.plates.forEach(plate => plate.isPressed = false);

    // Check all players in coop1 world
    Object.values(players).forEach(p => {
      if ((p.world || 'main') !== 'coop1') return;
      const py = p.y;
      const px = p.x;

      // Pressure plates
      COOP_LEVEL_1.plates.forEach(plate => {
        const plateY = plate.y + offsetY;
        if (px >= plate.x - 14 && px <= plate.x + plate.w + 14 && Math.abs(py - plateY) < 14) {
          plate.isPressed = true;
        }
      });

      // Keys (on walkover)
      COOP_LEVEL_1.keys.forEach(k => {
        const keyY = k.y + offsetY;
        if (!k.isCollected) {
          if (Math.abs(px - (k.x + 12)) < 30 && Math.abs(py - (keyY + 12)) < 30) {
            k.isCollected = true;
            playCoinSound();
            spawnFloatText(px, py - 40, 'KEY COLLECTED!', '#f59e0b');
          }
        }
      });
    });

    // Update Lock doors open status
    COOP_LEVEL_1.locks.forEach(lock => {
      if (lock.lockType === 'key') {
        const key = COOP_LEVEL_1.keys.find(k => k.targetLockId === lock.id);
        if (key && key.isCollected) lock.isOpen = true;
      } else if (lock.lockType === 'plate') {
        const plate = COOP_LEVEL_1.plates.find(pl => pl.targetLockId === lock.id);
        lock.isOpen = plate ? plate.isPressed : false;
      }
    });

    // Goal Collision
    const g = COOP_LEVEL_1.goal;
    const gy = g.y + offsetY;
    if (me.x >= g.x && me.x <= g.x + g.w && me.y >= gy && me.y <= gy + g.h) {
      spawnFloatText(me.x, me.y - 40, 'CO-OP LEVEL SOLVED!', '#10b981');
    }
  }

  checkCoinPickup();
  checkDroppedItemPickup();

  // Obstacle Course 1 Timers (Start Line x: 200, Finish Line x: 1370)
  if (myWorld === 'course' && selfId && players[selfId]) {
    const me = players[selfId];
    if (me.x >= 200 && me.x < 240 && courseRunStartTime === 0 && !courseRunFinished) {
      courseRunStartTime = Date.now();
      spawnFloatText(me.x, me.y - 40, 'TIMER STARTED! GO GO GO!', '#76ff03');
    }
    if (me.x < 180) {
      courseRunStartTime = 0;
      courseRunFinished = false;
    }
    if (me.x >= 1370 && courseRunStartTime > 0 && !courseRunFinished) {
      const elapsedMs = Date.now() - courseRunStartTime;
      courseRunFinished = true;
      courseRunStartTime = 0;
      playHarvestSound();
      const sec = (elapsedMs / 1000).toFixed(2);
      spawnFloatText(me.x, me.y - 40, `COURSE FINISHED! ${sec}s`, '#76ff03');
      if (socket) socket.emit('submitCourseTime', { timeMs: elapsedMs, courseId: 'course' });
    }
  }

  // Mega Obstacle Course 2 Timers (Start Line x: 200, Finish Line x: 3870)
  if (myWorld === 'course2' && selfId && players[selfId]) {
    const me = players[selfId];
    if (me.x >= 200 && me.x < 240 && courseRunStartTime === 0 && !courseRunFinished) {
      courseRunStartTime = Date.now();
      spawnFloatText(me.x, me.y - 40, 'MEGA TIMER STARTED! GO!', '#ff007f');
    }
    if (me.x < 180) {
      courseRunStartTime = 0;
      courseRunFinished = false;
    }
    if (me.x >= 3870 && courseRunStartTime > 0 && !courseRunFinished) {
      const elapsedMs = Date.now() - courseRunStartTime;
      courseRunFinished = true;
      courseRunStartTime = 0;
      playHarvestSound();
      const sec = (elapsedMs / 1000).toFixed(2);
      spawnFloatText(me.x, me.y - 40, `MEGA COURSE FINISHED! ${sec}s`, '#ff007f');
      if (socket) socket.emit('submitCourseTime', { timeMs: elapsedMs, courseId: 'course2' });
    }
  }

  const now = Date.now();
  if (socket && now - lastEmitTime > 30) {
    socket.emit('playerMove', {
      x: Math.round(me.x * 10) / 10,
      yRel: Math.round((me.y - groundY) * 10) / 10,
      vx: Math.round(me.vx), vy: Math.round(me.vy),
      facing: me.facing, isMoving: me.isMoving,
      isJumping: !me.isGrounded, isGrounded: me.isGrounded,
      world: myWorld
    });
    lastEmitTime = now;
  }
}
