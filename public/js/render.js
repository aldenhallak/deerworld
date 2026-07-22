// ---- Drawing & Rendering Helpers ----
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

// Portal / Doorway Archway
function drawPortal(x, groundY, label, color = '#76ff03') {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Stone Archway
  ctx.fillStyle = '#424242';
  ctx.fillRect(x - 22, groundY - 50, 8, 50);
  ctx.fillRect(x + 14, groundY - 50, 8, 50);
  ctx.fillRect(x - 22, groundY - 58, 44, 10);

  // Glowing Archway Portal Door
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(x - 14, groundY - 48, 28, 48);
  ctx.globalAlpha = 1.0;

  // Label prompt
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x, groundY - 64);

  ctx.restore();
}

function drawSelectPlate(x, groundY, isPressed) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const pw = 40, ph = 10;
  const py = groundY - ph;
  ctx.fillStyle = isPressed ? '#15803d' : '#f59e0b';
  ctx.fillRect(x - pw/2, py + (isPressed ? 6 : 0), pw, ph - (isPressed ? 6 : 0));
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x - pw/2 + 4, py + (isPressed ? 6 : 0), pw - 8, 2);
  ctx.restore();
}

function drawLever(x, groundY, isActivated, isPowered) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#334155';
  ctx.fillRect(x - 14, groundY - 10, 28, 10);
  ctx.fillStyle = '#475569';
  ctx.fillRect(x - 10, groundY - 8, 20, 4);

  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(x, groundY - 8, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, groundY - 8);
  if (isActivated) {
    ctx.lineTo(x + 12, groundY - 30);
  } else {
    ctx.lineTo(x - 12, groundY - 30);
  }
  ctx.stroke();

  const knobX = isActivated ? x + 12 : x - 12;
  const knobY = groundY - 30;
  ctx.fillStyle = isActivated ? '#10b981' : (isPowered ? '#f59e0b' : '#ef4444');
  ctx.beginPath();
  ctx.arc(knobX, knobY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGateDoor(x, groundY, isOpen) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const gw = 20;
  const gh = 220;
  const gy = groundY - gh;

  if (isOpen) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, gy, gw, gh);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x, gy, gw, gh);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, gy, 4, gh);
    ctx.fillRect(x + gw - 4, gy, 4, gh);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', x + gw / 2, gy + gh / 2);
  }
  ctx.restore();
}

// Physical Shop Building (Far Right Edge of Garden World)
function drawShopBuilding(groundY) {
  const sx = canvas.width - 90;
  const sy = groundY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Wooden Building Wall
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(sx - 45, sy - 60, 90, 60);

  // Counter Top
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(sx - 50, sy - 30, 100, 6);

  // Roof Awning
  ctx.fillStyle = '#e53935';
  ctx.fillRect(sx - 52, sy - 72, 104, 14);

  // Shopkeeper Bunny NPC
  ctx.fillStyle = '#d7ccc8';
  ctx.fillRect(sx - 8, sy - 48, 16, 18);
  ctx.fillStyle = '#000';
  ctx.fillRect(sx - 4, sy - 44, 3, 3);
  ctx.fillRect(sx + 2, sy - 44, 3, 3);

  // Shop Sign
  ctx.fillStyle = '#795548';
  ctx.fillRect(sx - 40, sy - 90, 80, 16);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FARM SHOP', sx, sy - 78);

  // Diegetic Prompt
  if (selfId && players[selfId]) {
    const me = players[selfId];
    if (Math.abs(me.x - sx) < 70) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(sx - 80, sy - 115, 160, 20);
      ctx.fillStyle = '#76ff03';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('PRESS [E] OPEN SHOP', sx, sy - 101);
    }
  }

  ctx.restore();
}

// Physical Garden Soil Bed Graphics (No Text)
function drawGardenSoilBed(groundY) {
  const gx = 180;
  const gw = Math.max(200, canvas.width - 360);
  const gy = groundY;

  ctx.save();
  // Wooden Fence Posts
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(gx - 10, gy - 24, 8, 24);
  ctx.fillRect(gx + gw + 2, gy - 24, 8, 24);
  ctx.fillRect(gx - 10, gy - 18, gw + 20, 4);

  // Tilled Earth Soil Beds
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(gx, gy - 8, gw, 8);
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(gx + 2, gy - 6, gw - 4, 4);

  ctx.restore();
}

// Crisp Pixel Art Coin
function drawPixelCoin(x, y, t) {
  if (isNaN(x) || isNaN(y)) return;
  const bob = Math.sin(t * 4 + x * 0.05) * 3;
  const cy = y + bob;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#111111';
  ctx.fillRect(x - 6, cy - 7, 12, 14);
  ctx.fillRect(x - 7, cy - 6, 14, 12);

  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x - 5, cy - 5, 10, 10);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, cy - 4, 3, 3);

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(x - 1, cy - 2, 3, 5);

  ctx.restore();
}

function drawSoilPlot(x, y) {
  ctx.save();
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(x - 12, y - 3, 24, 5);
  ctx.fillStyle = '#2d1a0c';
  ctx.fillRect(x - 10, y - 1, 20, 3);
  ctx.restore();
}

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
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(px - 2, py - 18, 4, 18);
      ctx.fillStyle = '#ffeb3b'; ctx.fillRect(px - 8, py - 24, 16, 12);
      ctx.fillStyle = '#ff6f00'; ctx.fillRect(px - 4, py - 20, 8, 6);
    }
  } else {
    if (plant.stage === 0) {
      ctx.fillStyle = '#4caf50'; ctx.fillRect(px - 1, py - 6, 2, 6);
    } else if (plant.stage === 1) {
      ctx.fillStyle = '#388e3c'; ctx.fillRect(px - 2, py - 12, 4, 12);
    } else {
      ctx.fillStyle = '#fbc02d'; ctx.fillRect(px - 4, py - 20, 8, 16);
    }
  }

  if (plant.stage >= plant.maxStage) {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#76ff03';
    ctx.textAlign = 'center';
    ctx.fillText('[E] HARVEST', px, py - 26);
  } else if (plant.plantedAt) {
    const config = SEED_CONFIG[plantType] || SEED_CONFIG.crop;
    const elapsed = Date.now() - plant.plantedAt;
    const remainingMs = Math.max(0, config.totalTime - elapsed);
    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hrs = Math.floor(mins / 60);
    const displayMins = mins % 60;

    let timeStr = `${mins}m ${secs}s`;
    if (hrs > 0) timeStr = `${hrs}h ${displayMins}m`;

    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, px, py - 22);
  }

  ctx.restore();
}

function drawWearableHat(px, py, hatId, facing, activeSpriteOrH) {
  if (!hatId) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.translate(px, py);
  if (facing === 'right') {
    ctx.scale(-1, 1);
  }

  // Calculate actual active sprite bounds and scale
  const scale = 0.35;
  let sprW = 164;
  let sprH = 148;

  if (activeSpriteOrH && typeof activeSpriteOrH === 'object' && activeSpriteOrH.height) {
    sprW = activeSpriteOrH.width || 164;
    sprH = activeSpriteOrH.height || 148;
  } else if (typeof activeSpriteOrH === 'number' && activeSpriteOrH > 0) {
    sprH = activeSpriteOrH / scale;
    sprW = sprH * (164 / 148);
  }

  const sw = sprW * scale;
  const sh = sprH * scale;
  const sx = -sw / 2;
  const sy = -sh + 4;

  if (hatId === 'straw_hat') {
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(sx + sw * 0.10, sy + sh * 0.18, sw * 0.52, 4);
    ctx.fillRect(sx + sw * 0.22, sy + sh * 0.05, sw * 0.32, 9);
    ctx.fillStyle = '#d50000';
    ctx.fillRect(sx + sw * 0.22, sy + sh * 0.16, sw * 0.32, 2);
  } else if (hatId === 'flower_crown') {
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(sx + sw * 0.15, sy + sh * 0.18, sw * 0.45, 3);
    const colors = ['#ff4081', '#ffeb3b', '#00e676', '#ff4081'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(sx + sw * 0.18 + i * 6, sy + sh * 0.12, 4, 5);
    });
  } else if (hatId === 'cute_bow') {
    ctx.fillStyle = '#ff4081';
    ctx.fillRect(sx + sw * 0.38, sy + sh * 0.14, 12, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + sw * 0.44, sy + sh * 0.18, 4, 4);
  } else if (hatId === 'party_hat') {
    ctx.fillStyle = '#ab47bc';
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.38, sy - 6);
    ctx.lineTo(sx + sw * 0.24, sy + sh * 0.15);
    ctx.lineTo(sx + sw * 0.52, sy + sh * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(sx + sw * 0.35, sy - 9, 4, 4);
  } else if (hatId === 'cool_shades' || hatId === 'sunglasses') {
    // Spec Sheet Sunglasses: Black bar over eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + sw * 0.10, sy + sh * 0.18, sw * 0.30, sh * 0.08);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + sw * 0.14, sy + sh * 0.20, 3, 2);
  } else if (hatId === 'rainboots') {
    // Spec Sheet Rainboots: Blue periwinkle boots on feet
    ctx.fillStyle = '#4d5ec1'; // Spec sheet blue
    const bootW = sw * 0.22;
    const bootH = sh * 0.22;
    // Front legs boot
    ctx.fillRect(sx + sw * 0.26, sy + sh - bootH, bootW, bootH);
    // Back legs boot
    ctx.fillRect(sx + sw * 0.64, sy + sh - bootH, bootW, bootH);
    // Boot cuff trim
    ctx.fillStyle = '#7986cb';
    ctx.fillRect(sx + sw * 0.26, sy + sh - bootH, bootW, 2);
    ctx.fillRect(sx + sw * 0.64, sy + sh - bootH, bootW, 2);
  } else if (hatId === 'cowboy_hat') {
    // Spec Sheet Cowboy Hat: Brown hat
    ctx.fillStyle = '#8d5524'; // Spec sheet brown
    const brimW = sw * 0.55;
    const brimX = sx + sw * 0.06;
    const hatY = sy + sh * 0.08;
    ctx.fillRect(brimX, hatY + 6, brimW, 4);
    ctx.fillRect(brimX - 2, hatY + 3, 4, 4);
    ctx.fillRect(brimX + brimW - 2, hatY + 3, 4, 4);
    // Crown
    ctx.fillRect(sx + sw * 0.20, hatY - 4, sw * 0.28, 10);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(sx + sw * 0.20, hatY + 4, sw * 0.28, 2);
  } else if (hatId === 'ascot') {
    // Spec Sheet Red Ascot: Red neck scarf wrapped around neck
    ctx.fillStyle = '#dc2626'; // Spec sheet red
    const neckX = sx + sw * 0.32;
    const neckY = sy + sh * 0.34;
    ctx.fillRect(neckX, neckY, sw * 0.24, 6); // Scarf band
    ctx.fillRect(neckX - 4, neckY + 4, 5, 9); // Scarf tail hanging down
  } else if (hatId === 'beanie') {
    // Spec Sheet Lime Green Beanie
    ctx.fillStyle = '#76ff03'; // Spec sheet lime green
    const capX = sx + sw * 0.22;
    const capY = sy + sh * 0.06;
    ctx.fillRect(capX, capY, sw * 0.32, 9);
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(capX - 3, capY + 8, sw * 0.38, 3);
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(capX + sw * 0.12, capY - 4, 5, 5);
  }

  ctx.restore();
}

function drawHUD() {
  if (!selfId) return;
  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';

  let worldLabel = 'PLATFORMER';
  if (myWorld === 'garden') worldLabel = 'GARDEN & SHOP';
  else if (myWorld === 'select') worldLabel = 'LEVEL SELECTION';
  else if (myWorld === 'course') worldLabel = 'OBSTACLE COURSE 1';
  else if (myWorld === 'course2') worldLabel = 'MEGA COURSE (STAGE 2)';
  else if (myWorld === 'coop1') worldLabel = 'CO-OP PUZZLE 1';
  else if (myWorld === 'frogger') worldLabel = 'KLIPSPRINGER CROSSING';

  ctx.fillText(`COINS: ${myCoins} | WORLD: ${worldLabel}`, 14, 26);

  const hatName = myEquippedHat && shopCatalog[myEquippedHat] ? shopCatalog[myEquippedHat].name : 'None';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`HAT: ${hatName} [H to Swap]`, 14, 48);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('[E] Interact / Enter Portal | [K] Kiss | [Q] Drop Coin', 14, 68);

  // Live Obstacle Course & Frogger Stopwatch Header
  let activeRunStartTime = 0;
  let activeColor = '#76ff03';
  if ((myWorld === 'course' || myWorld === 'course2') && courseRunStartTime > 0) {
    activeRunStartTime = courseRunStartTime;
    activeColor = myWorld === 'course2' ? '#ff007f' : '#76ff03';
  } else if (myWorld === 'frogger' && typeof froggerRunStartTime !== 'undefined' && froggerRunStartTime > 0) {
    activeRunStartTime = froggerRunStartTime;
    activeColor = '#00e676';
  }

  if (activeRunStartTime > 0) {
    const elapsedSec = ((Date.now() - activeRunStartTime) / 1000).toFixed(2);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(canvas.width / 2 - 80, 10, 160, 32);
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 80, 10, 160, 32);
    ctx.fillStyle = activeColor;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`RUN TIME: ${elapsedSec}s`, canvas.width / 2, 32);
  }

  ctx.restore();
}

function drawFroggerEnvironment(groundY, animTime) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Asphalt Road Zone (x: 240..1040)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(240, 0, 800, canvas.height);

  // Yellow Lane Dividers
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 12]);
  [-45, -95, -145].forEach(yOffset => {
    ctx.beginPath();
    ctx.moveTo(240, groundY + yOffset);
    ctx.lineTo(1040, groundY + yOffset);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Road Curbs
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(240, groundY - 180, 800, 4);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(240, groundY + 4, 800, 4);

  // 2. Animated River Water Pit (x: 1200..1840)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(1200, 0, 640, canvas.height);

  // Water Waves effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let wy = 50; wy < canvas.height; wy += 40) {
    const waveOffset = Math.sin(animTime * 3 + wy * 0.05) * 12;
    ctx.fillRect(1200 + ((waveOffset + 200) % 640), wy, 80, 4);
    ctx.fillRect(1200 + ((waveOffset + 450) % 640), wy + 20, 60, 4);
  }

  // 3. Floating Logs & Lilypads & Turtles
  const logs = getFroggerLogs(groundY);
  logs.forEach(log => {
    if (log.type === 'lilypad') {
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(log.x + log.w / 2, log.y + log.h / 2, log.w / 2, log.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(log.x + log.w / 2, log.y + log.h / 2, log.w / 3, log.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (log.type === 'turtle') {
      ctx.fillStyle = '#166534';
      const numTurtles = Math.floor(log.w / 30);
      for (let t = 0; t < numTurtles; t++) {
        const tx = log.x + 15 + t * 30;
        ctx.fillRect(tx - 12, log.y + 2, 24, log.h - 2);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(tx - 8, log.y, 16, log.h - 4);
        ctx.fillStyle = '#166534';
      }
    } else { // Log
      ctx.fillStyle = '#78350f';
      ctx.fillRect(log.x, log.y, log.w, log.h);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(log.x + 2, log.y + 2, log.w - 4, log.h - 6);
      // Wood grain lines
      ctx.fillStyle = '#451a03';
      ctx.fillRect(log.x + 10, log.y + 5, log.w / 2, 2);
    }
  });

  // 4. Moving Vehicles on Highway
  const cars = getFroggerCars(groundY);
  cars.forEach(car => {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.w, car.h);

    // Car Roof / Cabin
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(car.x + 8, car.y + 4, car.w - 16, car.h - 8);

    // Wheels
    ctx.fillStyle = '#000';
    ctx.fillRect(car.x + 4, car.y - 2, 8, 4);
    ctx.fillRect(car.x + car.w - 12, car.y - 2, 8, 4);
    ctx.fillRect(car.x + 4, car.y + car.h - 2, 8, 4);
    ctx.fillRect(car.x + car.w - 12, car.y + car.h - 2, 8, 4);

    // Headlights
    ctx.fillStyle = '#fef08a';
    if (car.speed > 0) {
      ctx.fillRect(car.x + car.w - 4, car.y + 2, 4, 4);
      ctx.fillRect(car.x + car.w - 4, car.y + car.h - 6, 4, 4);
    } else {
      ctx.fillRect(car.x, car.y + 2, 4, 4);
      ctx.fillRect(car.x, car.y + car.h - 6, 4, 4);
    }
  });

  // 5. Start Line Archway (x: 200) & Finish Line Archway (x: 1880)
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(200, groundY); ctx.lineTo(200, groundY - 80);
  ctx.lineTo(240, groundY - 80); ctx.lineTo(240, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FROGGER START', 220, groundY - 86);

  // Finish Archway
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(1880, groundY); ctx.lineTo(1880, groundY - 80);
  ctx.lineTo(1920, groundY - 80); ctx.lineTo(1920, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FROGGER FINISH', 1900, groundY - 86);

  // 6. Frogger Leaderboard Billboard at x: 1960
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(1940, groundY - 200, 160, 140);
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 2;
  ctx.strokeRect(1940, groundY - 200, 160, 140);
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CROSSING RECORDS', 2020, groundY - 183);

  ctx.strokeStyle = 'rgba(0,230,118,0.5)';
  ctx.beginPath(); ctx.moveTo(1945, groundY - 174); ctx.lineTo(2095, groundY - 174); ctx.stroke();

  ctx.font = '10px monospace';
  const topRuns = (typeof froggerLeaderboard !== 'undefined' ? froggerLeaderboard : []).slice(0, 8);
  topRuns.forEach((entry, i) => {
    const sec = (entry.timeMs / 1000).toFixed(2);
    const color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${entry.name}`, 1948, groundY - 160 + i * 15);
    ctx.textAlign = 'right';
    ctx.fillText(`${sec}s`, 2094, groundY - 160 + i * 15);
  });
  if (topRuns.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('No runs yet!', 2020, groundY - 145);
  }

  // Return Portal (far left in Frogger World)
  drawPortal(80, groundY, '[E] RETURN TO SELECT', '#00e676');

  ctx.restore();
}

function drawPixelHeart(x, y, scale) {
  ctx.save();
  ctx.fillStyle = '#ff4081';
  const s = Math.max(1, Math.round(scale * 2.5));
  ctx.fillRect(x - s * 2, y - s * 2, s * 2, s * 2);
  ctx.fillRect(x + s, y - s * 2, s * 2, s * 2);
  ctx.fillRect(x - s * 3, y - s, s * 7, s * 2);
  ctx.fillRect(x - s * 2, y + s, s * 5, s);
  ctx.fillRect(x - s, y + s * 2, s * 3, s);
  ctx.fillRect(x, y + s * 3, s, s);
  ctx.restore();
}
