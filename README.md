# DeerWorld (Klipspringer Farmville)

A retro-style, multiplayer physics-based browser sandbox and platformer starring Klipspringers! Features side-scrolling platforming, a top-down Frogger arcade mode, an agricultural crop economy, fishing at the beach, co-op puzzle levels, shop stalls with 1:1 pixel-art cosmetics, programmatic Web Audio sound effects, live chat announcements, and persistent multi-world speedrun leaderboards.

## Core Features

- **Multiplayer Synchronization**: Real-time position, velocity, jump animations, chat, and cosmetic swaps powered by Socket.io.
- **Dynamic Physics Platforming**: Responsive controls featuring Coyote time (0.14s jump allowance after leaving platform edges), variable jump height, and input buffering.
- **Top-Down Arcade Mode (Klipspringer Crossing)**: Grid-hopping arcade level inspired by classic Frogger. Features top-down Klipspringer sprites, vehicle obstacle lanes, floating logs, sanctuary goals, and speedrun timing.
- **Beach & Fishing System**: Coastal world featuring interactive fishing spots, tension/bite mechanics, fish species catalog, coin rewards, and a fishing leaderboard.
- **Co-op Puzzle Level**: Two-player cooperative stage with synchronized pressure plates, levers, and team speedrun tracking.
- **1:1 Pixel-Art Cosmetics**: 9 wearable accessories (Sunglasses, Red Ascot, Lime Green Beanie, Blue Rainboots, Cowboy Hat, Wire Glasses, Headphones, Straw Hat, Pink Bow) anchored 1:1 to Pip's pixel-art body grid across idle (`spriteF`), walking (`spriteG`), and leaping jump frames (`spriteH`).
- **Agricultural Economy**: Plant seeds with Farmville-style cooldowns (15 min to 8 hours) yielding progressively scaling coin rewards.
- **Multi-Stage Speedruns & Leaderboards**: Press `[L]` anytime to open a context-aware leaderboard modal tracking Obstacle Course 1, Mega Course 2, Co-op Puzzle, Klipspringer Crossing, and Fishing records.
- **Live System Chat & Render Logging**: Automatic plain-text chat announcements for player joins, speedrun records, co-op completions, fish catches, and item unlocks. Streamed to stdout (`console.log`) for Render dashboard visibility.
- **Programmatic Web Audio**: Hop, kiss, coin, harvest, and shop sound effects synthesized natively via the browser's Web Audio API.
- **State Persistence**: Atomic JSON state saving (`data/save.json`) for user profiles (coins, inventory, equipped hats), crops, and leaderboards.

## Game Worlds

- **Main World**: Spawning hub with single-coin collection system, chat, and world portals.
- **Garden & Shop**: Agricultural soil bed for farming and shop stall to purchase seeds and cosmetics.
- **Level Selection**: Central hub for choosing obstacle courses, co-op puzzles, and Frogger mode.
- **Obstacle Course 1**: 11-platform speedrun stage with death-fall resets and live HUD timer.
- **MEGA Course (Stage 2)**: 4,100px scrolling obstacle course with cyber styling and extreme platform gaps.
- **Co-op Puzzle**: Co-op stage requiring team coordination to unlock levers and reach the finish.
- **Klipspringer Crossing**: Top-down arcade Frogger level. Press `ESC` or `E` to return to selection.
- **Beach World**: Coastal zone for fishing and relaxation.

## Project Structure

```
├── server.js               # Node/Express backend & Socket.io state management
├── scripts/
│   └── build_spec_pngs.js  # Pixel-art accessory extraction tool
├── public/
│   ├── index.html          # Game HTML structure, HUD, and modal overlays
│   ├── style.css           # Vanilla CSS rules & Web 1.0 arcade theme styling
│   ├── game.js             # Client Socket.io events, HUD, and main game loop
│   └── js/
│       ├── config.js       # Global constants, seed configs, and world definitions
│       ├── world.js        # World geometry, platform hitboxes, and portal triggers
│       ├── render.js       # Canvas rendering routines and 1:1 accessory engine
│       ├── physics.js      # Player movement physics and collision handling
│       ├── frogger.js      # Top-down Klipspringer Crossing arcade engine
│       ├── fishing.js      # Beach fishing minigame system
│       └── audio.js        # Web Audio API sound synthesis
```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your web browser.

## Deployment (Render / Cloud)

- The server streams logs to `stdout` (`console.log`) for real-time visibility in Render's log stream dashboard.
- State is saved atomically to `data/save.json`.

