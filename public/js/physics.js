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
  const groundY = getGroundY();

  if (myWorld === 'frogger') {
    if (typeof FroggerMode !== 'undefined') {
      FroggerMode.update(dt, (typeof animTime !== 'undefined' ? animTime : Date.now() / 1000));
    }
    const me = players[selfId];
    const now = Date.now();
    if (socket && now - lastEmitTime > 30) {
      socket.emit('playerMove', {
        x: Math.round(me.x * 10) / 10,
        yRel: Math.round((me.y - groundY) * 10) / 10,
        vx: 0, vy: 0,
        facing: me.facing || 'up',
        isMoving: false, isJumping: false, isGrounded: true,
        world: myWorld
      });
      lastEmitTime = now;
    }
    return;
  }

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
    if (Math.abs(me.vx) < 15) me.vx = 0;
    me.isMoving = Math.abs(me.vx) > 30;
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
  let finalX = nextX;

  getPlatforms().forEach(plat => {
    // Horizontal AABB Wall Collision for Gate Walls / Solid Barriers
    // Uses overlap-resolution (push-out) so it works regardless of speed or spawn position
    if (plat.isGate || plat.isLock) {
      const playerTop = me.y - 40;
      const playerBottom = me.y;
      const platTop = plat.y;
      const platBottom = plat.y + plat.h;

      // Only resolve if there is vertical overlap with the wall
      if (playerBottom > platTop + 2 && playerTop < platBottom - 2) {
        const playerLeft  = finalX - 14;
        const playerRight = finalX + 14;
        const wallLeft    = plat.x;
        const wallRight   = plat.x + plat.w;

        // Check for horizontal overlap
        if (playerRight > wallLeft && playerLeft < wallRight) {
          // Determine which side to push out from based on original position
          const prevRight = me.x + 14;
          const prevLeft  = me.x - 14;
          if (prevRight <= wallLeft + 4) {
            // Was on the left → push left
            finalX = wallLeft - 14;
          } else if (prevLeft >= wallRight - 4) {
            // Was on the right → push right
            finalX = wallRight + 14;
          } else {
            // Already inside (e.g. spawned inside) → push to nearest side
            const overlapLeft  = playerRight - wallLeft;
            const overlapRight = wallRight - playerLeft;
            if (overlapLeft < overlapRight) {
              finalX = wallLeft - 14;
            } else {
              finalX = wallRight + 14;
            }
          }
          me.vx = 0;
        }
      }
    }

    // Vertical Top Landing (skip for gate/lock walls — those are vertical barriers, not floors)
    if (!plat.isGate && !plat.isLock) {
      if (me.vy >= 0 && me.y <= plat.y + 6 && nextY >= plat.y) {
        if (finalX >= plat.x - 14 && finalX <= plat.x + plat.w + 14) {
          me.y = plat.y; me.vy = 0;
          landed = true; me.isGrounded = true; me.isJumping = false;
          if (plat.isLog) {
            finalX += plat.vx * dt; // Ride log momentum!
          }
        }
      }
    }
  });

  if (!landed) { me.y = nextY; me.isGrounded = false; }
  const maxWorldX = myWorld === 'course2' ? 4100 : (myWorld === 'frogger' ? 2200 : (myWorld === 'coop1' ? 2400 : (myWorld === 'garden' ? 2400 : (myWorld === 'beach' ? 2400 : (myWorld === 'select' ? 1400 : canvas.width)))));
  me.x = Math.max(20, Math.min(maxWorldX - 20, finalX));

  // Fall off screen in Obstacle Courses = teleport to start
  if ((myWorld === 'course' || myWorld === 'course2' || myWorld === 'coop1' || myWorld === 'frogger') && me.y > canvas.height + 60) {
    me.x = (myWorld === 'coop1' || myWorld === 'frogger') ? 100 : 120;
    me.y = getGroundY();
    me.vx = 0; me.vy = 0; me.isGrounded = true;
    if (myWorld === 'course' || myWorld === 'course2') {
      courseRunStartTime = 0; courseRunFinished = false;
    }
    if (myWorld === 'coop1') {
      coopStartTime = 0; coopFinished = false;
    }
    if (myWorld === 'frogger') {
      froggerRunStartTime = 0; froggerRunFinished = false;
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
        // Special: lock_4 and lock_4b both require plate_3 AND plate_4 pressed
        if (lock.id === 'lock_4' || lock.id === 'lock_4b') {
          const p3 = COOP_LEVEL_1.plates.find(pl => pl.id === 'plate_3');
          const p4 = COOP_LEVEL_1.plates.find(pl => pl.id === 'plate_4');
          lock.isOpen = (p3 && p3.isPressed) && (p4 && p4.isPressed);
        } else {
          const plate = COOP_LEVEL_1.plates.find(pl => pl.targetLockId === lock.id);
          lock.isOpen = plate ? plate.isPressed : false;
        }
      }
    });

    // Goal Collision — both players must be in goal zone
    const g = COOP_LEVEL_1.goal;
    const gy = g.y + offsetY;
    if (me.x >= g.x && me.x <= g.x + g.w && me.y >= gy && me.y <= gy + g.h) {
      // Check if any other player is also in the goal
      const others = Object.values(players).filter(p => p.id !== selfId && (p.world || 'main') === 'coop1');
      const allInGoal = others.some(p => p.x >= g.x && p.x <= g.x + g.w && p.y >= gy && p.y <= gy + g.h);
      if (allInGoal) {
        if (coopStartTime > 0 && !coopFinished) {
          const elapsedMs = Date.now() - coopStartTime;
          coopFinished = true;
          coopStartTime = 0;
          playHarvestSound();
          const partner = others.find(p => p.x >= g.x && p.x <= g.x + g.w && p.y >= gy && p.y <= gy + g.h);
          const partnerName = partner ? partner.name : 'Partner';
          spawnFloatText(me.x, me.y - 40, `CO-OP SOLVED! ${(elapsedMs/1000).toFixed(2)}s`, '#10b981');
          if (socket) {
            socket.emit('submitCoopTime', { timeMs: elapsedMs, partnerName });
          }
        }
      } else {
        spawnFloatText(me.x, me.y - 40, 'Waiting for partner...', '#38bdf8');
      }
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

  // Co-op Puzzle 1 Timers (Starts when crossing x: 220)
  if (myWorld === 'coop1' && selfId && players[selfId]) {
    const me = players[selfId];
    if (me.x >= 220 && coopStartTime === 0 && !coopFinished) {
      coopStartTime = Date.now();
      spawnFloatText(me.x, me.y - 40, 'CO-OP TIMER STARTED!', '#38bdf8');
    }
    if (me.x < 120) {
      coopStartTime = 0;
      coopFinished = false;
    }
  }

  // Frogger Highway & River Level Physics Checks
  if (myWorld === 'frogger' && selfId && players[selfId]) {
    const me = players[selfId];
    const groundY = getGroundY();

    // 1. Car Traffic Collision Check
    const cars = getFroggerCars(groundY);
    for (let car of cars) {
      if (me.x + 12 > car.x && me.x - 12 < car.x + car.w &&
          me.y > car.y && me.y - 32 < car.y + car.h) {
        playHonkSound();
        me.x = 100;
        me.y = groundY;
        me.vx = 0; me.vy = 0; me.isGrounded = true;
        froggerRunStartTime = 0; froggerRunFinished = false;
        spawnFloatText(me.x, me.y - 40, 'SPLAT! Hit by traffic!', '#ff1744');
        break;
      }
    }

    // 2. River Water Pit Fall Check (x: 1200..1840)
    // If player is over river water zone and falls into water (below groundY - 5 and not grounded on log)
    if (me.x > 1200 && me.x < 1840 && me.y >= groundY - 5 && !me.isGrounded) {
      playSplashSound();
      me.x = 1040; // Teleport back to Middle Safe Island
      me.y = groundY;
      me.vx = 0; me.vy = 0; me.isGrounded = true;
      spawnFloatText(me.x, me.y - 40, 'SPLASH! Fell in water!', '#00e5ff');
    }

    // 3. Frogger Speedrun Timer (Start Line x: 200, Finish Line x: 1880)
    if (me.x >= 200 && me.x < 240 && froggerRunStartTime === 0 && !froggerRunFinished) {
      froggerRunStartTime = Date.now();
      spawnFloatText(me.x, me.y - 40, 'FROGGER TIMER STARTED! GO!', '#00e676');
    }
    if (me.x < 180) {
      froggerRunStartTime = 0;
      froggerRunFinished = false;
    }
    if (me.x >= 1880 && froggerRunStartTime > 0 && !froggerRunFinished) {
      const elapsedMs = Date.now() - froggerRunStartTime;
      froggerRunFinished = true;
      froggerRunStartTime = 0;
      playHarvestSound();
      const sec = (elapsedMs / 1000).toFixed(2);
      spawnFloatText(me.x, me.y - 40, `FROGGER CLEARED! ${sec}s`, '#00e676');
      if (socket) socket.emit('submitFroggerTime', { timeMs: elapsedMs });
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
