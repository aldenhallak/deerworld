const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join', (data) => {
    const username = (data && data.name && data.name.trim()) ? data.name.trim().substring(0, 16) : `Klipspringer #${Math.floor(1000 + Math.random() * 9000)}`;
    
    const spawnX = 200 + Math.random() * 400;
    const spawnY = 400;

    players[socket.id] = {
      id: socket.id,
      name: username,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      facing: 'right',
      isMoving: false,
      isJumping: false,
      isGrounded: true
    };

    socket.emit('init', {
      selfId: socket.id,
      players: players
    });

    socket.broadcast.emit('playerJoined', players[socket.id]);
  });

  socket.on('playerMove', (data) => {
    if (!players[socket.id]) return;
    
    const player = players[socket.id];
    player.x = data.x;
    player.y = data.y;
    player.vx = data.vx || 0;
    player.vy = data.vy || 0;
    player.facing = data.facing || player.facing;
    player.isMoving = !!data.isMoving;
    player.isJumping = !!data.isJumping;
    player.isGrounded = !!data.isGrounded;

    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      facing: player.facing,
      isMoving: player.isMoving,
      isJumping: player.isJumping,
      isGrounded: player.isGrounded
    });
  });

  // Handle Kiss event
  socket.on('playerKiss', (data) => {
    if (!players[socket.id]) return;
    socket.broadcast.emit('playerKissed', {
      id: socket.id,
      targetId: data ? data.targetId : null
    });
  });

  socket.on('sendChat', (messageText) => {
    if (!players[socket.id]) return;
    const cleanMsg = (messageText || '').trim().substring(0, 140);
    if (!cleanMsg) return;

    const chatData = {
      id: socket.id,
      sender: players[socket.id].name,
      text: cleanMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    io.emit('chatMessage', chatData);
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Klipspringer Server running on http://localhost:${PORT}`);
});
