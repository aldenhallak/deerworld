// ---- Level Data Structures ----
// Co-op Puzzle Level 1
// Layout (world space, 2400px wide, 800px tall):
//
// ROOM 1 (x:0..780): Spawn area + elevated plate for P1
//   P1 stands on plate_1 (on plat_high_1) → opens lock_1 → P2 can cross to Room 2
//   P1 must STAY on plate while P2 crosses
//
// ROOM 2 (x:820..1580): Key chamber
//   Spring launches P2 up to key island (plat_mid_1)
//   key_1 is there → once collected, lock_2 opens permanently
//   P1 can now leave plate_1 and cross lock_1 (still open if P1 steps off, but
//   lock_2 is key-based so it stays open for P1 to follow)
//   NOTE: lock_1 closes when P1 steps off — but by this point P1 needs to cross too.
//   So the trick: P2 must collect key (which opens lock_2 for P1 to follow).
//   P2 then lands on plate_2 on far side (plat_mid_2) to hold lock_3 open → P1 crosses.
//
// ROOM 3 (x:1620..2400): Double-plate finale
//   Two plates side by side (plate_3 and plate_4) that BOTH must be held simultaneously
//   to open the final gate lock_4 → goal zone at x:2250
//   Impossible alone since both plates must be held at same time.

const COOP_LEVEL_1 = {
  name: "Co-op Puzzle Level 1",
  width: 2400,
  height: 800,
  spawnP1: { x: 100, y: 720 },
  spawnP2: { x: 180, y: 720 },
  platforms: [
    // ── ROOM 1 ──
    // Ground
    { id: "plat_r1_ground", x: 0, y: 760, w: 780, h: 40, type: "normal" },
    // Elevated platform for P1 to stand on plate (accessed via steps)
    { id: "plat_r1_step1",  x: 200, y: 680, w: 80,  h: 16, type: "normal" },
    { id: "plat_r1_step2",  x: 330, y: 610, w: 80,  h: 16, type: "normal" },
    { id: "plat_r1_high",   x: 460, y: 540, w: 160, h: 16, type: "normal" },

    // ── ROOM 2 ──
    // Ground (with gap between room 1 and 2 — the gap is the lock_1 wall itself)
    { id: "plat_r2_ground", x: 820, y: 760, w: 760, h: 40, type: "normal" },
    // Mid-air island with the key (reachable via spring)
    { id: "plat_r2_key_island", x: 1050, y: 560, w: 160, h: 16, type: "normal" },
    // Far right elevated platform where P2 stands on plate_2
    { id: "plat_r2_plate_ledge", x: 1380, y: 640, w: 160, h: 16, type: "normal" },

    // ── ROOM 3 ──
    // Ground
    { id: "plat_r3_ground", x: 1640, y: 760, w: 760, h: 40, type: "normal" },
    // Two side-by-side plate islands (slightly elevated so plates are clear)
    { id: "plat_r3_plate1_island", x: 1720, y: 660, w: 120, h: 16, type: "normal" },
    { id: "plat_r3_plate2_island", x: 1920, y: 660, w: 120, h: 16, type: "normal" },
    // Exit platform past the final gate
    { id: "plat_r3_exit", x: 2200, y: 700, w: 200, h: 60, type: "normal" }
  ],
  springs: [
    // Spring in Room 2 to launch players up to key island
    { id: "spring_r2", x: 1060, y: 742, w: 50, h: 18, bounceForce: 1250 }
  ],
  plates: [
    // plate_1: On the high platform in Room 1 — held by P1 to open lock_1
    { id: "plate_1", x: 480, y: 530, w: 50, h: 10, targetLockId: "lock_1", isPressed: false },
    // plate_2: On far right ledge in Room 2 — held by P2 to open lock_3 (lets P1 cross Room 2)
    { id: "plate_2", x: 1400, y: 630, w: 50, h: 10, targetLockId: "lock_3", isPressed: false },
    // plate_3 & plate_4: Both must be held simultaneously in Room 3 to open lock_4
    { id: "plate_3", x: 1735, y: 650, w: 50, h: 10, targetLockId: "lock_4", isPressed: false },
    { id: "plate_4", x: 1935, y: 650, w: 50, h: 10, targetLockId: "lock_4b", isPressed: false }
  ],
  keys: [
    // key_1: Sitting on the key island in Room 2 — picked up by P2, permanently opens lock_2
    { id: "key_1", x: 1110, y: 524, w: 24, h: 24, targetLockId: "lock_2", isCollected: false }
  ],
  locks: [
    // lock_1: Vertical gate at x:790 — plate lock, held open by plate_1 (P1 on high platform)
    { id: "lock_1", x: 790, y: 480, w: 24, h: 280, lockType: "plate", isOpen: false },
    // lock_2: Vertical gate — opened permanently by key, blocks Room 3 entry
    { id: "lock_2", x: 1600, y: 480, w: 24, h: 280, lockType: "key", isOpen: false },
    // lock_3: Plate lock, held open by plate_2 (P2 on far right of Room 2)
    { id: "lock_3", x: 1560, y: 480, w: 24, h: 280, lockType: "plate", isOpen: false },
    // lock_4 & lock_4b: The FINAL double gate — BOTH plate_3 and plate_4 must be held simultaneously
    { id: "lock_4",  x: 2140, y: 480, w: 24, h: 280, lockType: "plate", isOpen: false },
    { id: "lock_4b", x: 2164, y: 480, w: 24, h: 280, lockType: "plate", isOpen: false }
  ],
  goal: { x: 2220, y: 650, w: 150, h: 110 }
};
