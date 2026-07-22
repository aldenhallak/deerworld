// ---- Platforms (Multi-World Support) ----
function getGroundY() {
  return canvas.height - 40;
}

function getPlatforms() {
  const groundY = getGroundY();
  if (myWorld === 'garden') {
    // Flat ground layout for Garden World
    return [{ x: 0, y: groundY, w: canvas.width, h: 40 }];
  }
  if (myWorld === 'select') {
    // Flat ground layout with floating platform for Level Selection Hall
    const selectWidth = Math.max(1400, canvas.width);
    const plats = [
      { x: 0, y: groundY, w: selectWidth, h: 40 },
      { x: 200, y: groundY - 110, w: 300, h: 16 }
    ];
    const isLeverActive = selectLeverExpiresAt > Date.now();
    // Gate 1 at x: 500 (Full height; opened by pressure plate at x: 350 OR active lever)
    if (!selectPlatePressed && !isLeverActive) {
      plats.push({ x: 500, y: 0, w: 20, h: groundY, isGate: true });
    }
    // Gate 2 at x: 750 (Full height; opened by lever at x: 650 for 5s)
    if (!isLeverActive) {
      plats.push({ x: 750, y: 0, w: 20, h: groundY, isGate: true });
    }
    return plats;
  }
  if (myWorld === 'coop1') {
    const offsetY = canvas.height - COOP_LEVEL_1.height;
    const plats = COOP_LEVEL_1.platforms.map(p => ({ x: p.x, y: p.y + offsetY, w: p.w, h: p.h }));
    COOP_LEVEL_1.locks.forEach(l => {
      if (!l.isOpen) {
        plats.push({ x: l.x, y: l.y + offsetY, w: l.w, h: l.h });
      }
    });
    return plats;
  }
  if (myWorld === 'course') {
    // Obstacle Course - Daring Platform Gauntlet
    return [
      { x: 0,    y: groundY,       w: 220, h: 40 },  // Start Island
      { x: 300,  y: groundY - 30,  w: 70,  h: 14 },  // Hop 1 - small
      { x: 430,  y: groundY - 80,  w: 60,  h: 14 },  // Hop 2 - narrow climb
      { x: 540,  y: groundY - 150, w: 55,  h: 14 },  // Hop 3 - high narrow
      { x: 660,  y: groundY - 90,  w: 50,  h: 14 },  // Drop 4 - tiny
      { x: 760,  y: groundY - 180, w: 65,  h: 14 },  // Leap 5 - big jump up
      { x: 890,  y: groundY - 110, w: 45,  h: 14 },  // Drop 6 - smallest
      { x: 980,  y: groundY - 200, w: 70,  h: 14 },  // Leap 7 - peak
      { x: 1100, y: groundY - 130, w: 55,  h: 14 },  // Drop 8
      { x: 1210, y: groundY - 60,  w: 60,  h: 14 },  // Descent 9
      { x: 1330, y: groundY,       w: 300, h: 40 }   // Finish Island
    ];
  }
  if (myWorld === 'course2') {
    // Mega Obstacle Course - 4000px Scrolling Gauntlet
    return [
      { x: 0,    y: groundY,       w: 240, h: 40 },  // Start Island (x: 0..240)
      // Section 1: The Warmup Clamber (x: 240..1000)
      { x: 310,  y: groundY - 40,  w: 65,  h: 14 },
      { x: 440,  y: groundY - 90,  w: 60,  h: 14 },
      { x: 570,  y: groundY - 140, w: 55,  h: 14 },
      { x: 700,  y: groundY - 90,  w: 60,  h: 14 },
      { x: 830,  y: groundY - 160, w: 50,  h: 14 },
      { x: 960,  y: groundY - 80,  w: 70,  h: 14 },
      // Section 2: Sky High Stepping Stones (x: 1000..1900)
      { x: 1100, y: groundY - 50,  w: 50,  h: 14 },
      { x: 1220, y: groundY - 110, w: 50,  h: 14 },
      { x: 1340, y: groundY - 180, w: 45,  h: 14 },
      { x: 1460, y: groundY - 250, w: 45,  h: 14 },  // Sky Peak
      { x: 1590, y: groundY - 180, w: 50,  h: 14 },
      { x: 1720, y: groundY - 100, w: 55,  h: 14 },
      { x: 1850, y: groundY - 40,  w: 65,  h: 14 },
      // Section 3: Precision Drops & Gaps (x: 1900..2900)
      { x: 2000, y: groundY - 140, w: 45,  h: 14 },
      { x: 2130, y: groundY - 70,  w: 45,  h: 14 },
      { x: 2260, y: groundY - 190, w: 45,  h: 14 },
      { x: 2400, y: groundY - 100, w: 50,  h: 14 },
      { x: 2540, y: groundY - 220, w: 45,  h: 14 },
      { x: 2680, y: groundY - 130, w: 55,  h: 14 },
      { x: 2820, y: groundY - 50,  w: 60,  h: 14 },
      // Section 4: Final Gauntlet Sprint (x: 2900..3750)
      { x: 2970, y: groundY - 120, w: 55,  h: 14 },
      { x: 3110, y: groundY - 180, w: 50,  h: 14 },
      { x: 3250, y: groundY - 240, w: 45,  h: 14 },
      { x: 3390, y: groundY - 160, w: 55,  h: 14 },
      { x: 3530, y: groundY - 80,  w: 60,  h: 14 },
      { x: 3670, y: groundY - 30,  w: 70,  h: 14 },
      // Finish Island (x: 3770..4200)
      { x: 3770, y: groundY,       w: 400, h: 40 }
    ];
  }
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
