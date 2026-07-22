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
  const gh = groundY;
  const gy = 0;

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
    ctx.fillText('🔒', x + gw / 2, groundY - 80);
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

function drawWearableHat(px, py, hatId, facing, approxH) {
  if (!hatId) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const headY = py - approxH + 22;
  const headX = px;

  if (hatId === 'straw_hat') {
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(headX - 16, headY - 4, 32, 5);
    ctx.fillRect(headX - 10, headY - 12, 20, 9);
    ctx.fillStyle = '#d50000';
    ctx.fillRect(headX - 10, headY - 6, 20, 2);
  } else if (hatId === 'flower_crown') {
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(headX - 12, headY - 4, 24, 3);
    const colors = ['#ff4081', '#ffeb3b', '#00e676', '#ff4081'];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(headX - 10 + i * 6, headY - 8, 4, 5);
    });
  } else if (hatId === 'cute_bow') {
    const earX = facing === 'right' ? headX - 8 : headX + 4;
    ctx.fillStyle = '#ff4081';
    ctx.fillRect(earX - 6, headY - 6, 12, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(earX - 2, headY - 4, 4, 4);
  } else if (hatId === 'party_hat') {
    ctx.fillStyle = '#ab47bc';
    ctx.beginPath();
    ctx.moveTo(headX, headY - 18);
    ctx.lineTo(headX - 8, headY - 2);
    ctx.lineTo(headX + 8, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(headX - 2, headY - 20, 4, 4);
  } else if (hatId === 'cool_shades') {
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

  let worldLabel = 'PLATFORMER';
  if (myWorld === 'garden') worldLabel = 'GARDEN & SHOP';
  else if (myWorld === 'select') worldLabel = 'LEVEL SELECTION';
  else if (myWorld === 'course') worldLabel = 'OBSTACLE COURSE 1';
  else if (myWorld === 'course2') worldLabel = 'MEGA COURSE (STAGE 2)';
  else if (myWorld === 'coop1') worldLabel = 'CO-OP PUZZLE 1';

  ctx.fillText(`COINS: ${myCoins} | WORLD: ${worldLabel}`, 14, 26);

  const hatName = myEquippedHat && shopCatalog[myEquippedHat] ? shopCatalog[myEquippedHat].name : 'None';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`HAT: ${hatName} [H to Swap]`, 14, 48);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('[E] Interact / Enter Portal | [K] Kiss | [Q] Drop Coin', 14, 68);

  // Live Obstacle Course Stopwatch Header
  if ((myWorld === 'course' || myWorld === 'course2') && courseRunStartTime > 0) {
    const elapsedSec = ((Date.now() - courseRunStartTime) / 1000).toFixed(2);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(canvas.width / 2 - 80, 10, 160, 32);
    ctx.strokeStyle = myWorld === 'course2' ? '#ff007f' : '#76ff03';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 80, 10, 160, 32);
    ctx.fillStyle = myWorld === 'course2' ? '#ff007f' : '#76ff03';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`RUN TIME: ${elapsedSec}s`, canvas.width / 2, 32);
  }

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
