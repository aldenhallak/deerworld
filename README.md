# DeerWorld (Klipspringer Farmville)

A retro-style, multiplayer physics-based browser platformer starring Klipspringers! Features 2D physics platforming, an active agricultural crop economy, shop stalls, wearable cosmetics, custom programmatic Web Audio sound effects, and two stages of obstacle courses with speedrun timers and persistent leaderboards.

## Core Features

- **Multiplayer Synchronization**: Real-time position, jump animations, chat, and cosmetic swap syncing powered by Socket.io.
- **Dynamic Physics Platforming**: Responsive controls with Coyote time (0.14s jump allowance after leaving platform edges) and input jump buffering.
- **Programmatic Audio**: Hop, kiss, and shop sound effects synthesized natively via the browser's Web Audio API.
- **State Persistence**: User profiles (coins, inventory, equipped hats), agricultural crops, and speedrun records save atomically to `save.json`. Chat history is logged to `chat_history.log`.
- **Agricultural Economy**: Plant seeds with long Farmville-like real-time cooldowns (15 min to 8 hours) matching progressively scaling coin yields.
- **Stage 1 (Obstacle Course)**: A challenging 11-platform course featuring a live HUD stopwatch, death-fall teleport resets, and a speedrun leaderboard billboard.
- **Stage 2 (MEGA Obstacle Course)**: Accessible from the Stage 1 finish island. Features a massive **4,100px scrolling camera stage**, cyber neon styling, extreme platform gaps, and an independent leaderboard.

## Project Structure

```
├── server.js            # Node/Express backend & Socket.io state management
├── data/
│   ├── save.json        # Atomic JSON save state database
│   └── chat_history.log # Persistent log of public chat messages
├── public/
│   ├── index.html       # Game view structure and HUD controls overlay
│   ├── style.css        # Vanilla CSS styling rules
│   └── game.js          # Core canvas render loop, audio, physics, and socket client
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
