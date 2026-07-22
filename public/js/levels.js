// ---- Level Data Structures ----
const COOP_LEVEL_1 = {
  name: "Co-op Puzzle Level 1",
  width: 2400,
  height: 800,
  spawnP1: { x: 100, y: 720 },
  spawnP2: { x: 160, y: 720 },
  platforms: [
    { id: "plat_ground_1", x: 0, y: 760, w: 750, h: 40, type: "normal" },
    { id: "plat_ground_2", x: 850, y: 760, w: 600, h: 40, type: "normal" },
    { id: "plat_ground_3", x: 1550, y: 760, w: 850, h: 40, type: "normal" },
    { id: "plat_high_1", x: 300, y: 620, w: 200, h: 20, type: "normal" },
    { id: "plat_high_2", x: 1000, y: 550, w: 250, h: 20, type: "normal" }
  ],
  springs: [
    { id: "spring_1", x: 680, y: 742, w: 40, h: 18, bounceForce: 1100 }
  ],
  plates: [
    { id: "plate_1", x: 400, y: 610, w: 40, h: 10, targetLockId: "lock_door_1", isPressed: false }
  ],
  keys: [
    { id: "key_1", x: 1100, y: 500, w: 24, h: 24, targetLockId: "lock_door_2", isCollected: false }
  ],
  locks: [
    { id: "lock_door_1", x: 800, y: 600, w: 20, h: 160, lockType: "plate", isOpen: false },
    { id: "lock_door_2", x: 1500, y: 600, w: 20, h: 160, lockType: "key", isOpen: false }
  ],
  goal: { x: 2220, y: 660, w: 80, h: 100 }
};
