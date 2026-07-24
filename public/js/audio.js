// ---- Web Audio API Synthesizer & Stage Background Music ----
let audioCtx = null;
let bgMusic = null;
let musicMuted = false;
let sfxMuted = false;
let currentStageName = 'main';
let currentMusicTrack = null;

const STAGE_MUSIC_MAP = {
  garden: '/garden.wav',
  main: '/lobby.wav'
};

function getStageMusicTrack(stageName) {
  return STAGE_MUSIC_MAP[stageName] || STAGE_MUSIC_MAP.main;
}

function playStageMusic(stageName) {
  const targetStage = stageName || 'main';
  const targetTrack = getStageMusicTrack(targetStage);
  currentStageName = targetStage;

  if (bgMusic && currentMusicTrack === targetTrack) {
    if (!musicMuted && bgMusic.paused) {
      bgMusic.play().catch(() => {});
    }
    return;
  }

  if (bgMusic) {
    bgMusic.pause();
    bgMusic = null;
  }

  try {
    bgMusic = new Audio(targetTrack);
    bgMusic.loop = true;
    bgMusic.volume = 0.20; // 20% volume
    currentMusicTrack = targetTrack;
    if (!musicMuted) {
      bgMusic.play().catch(e => {
        // Autoplay policy
      });
    }
  } catch (e) {
    console.warn("Could not load background music track:", targetTrack, e);
  }
}

function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    if (bgMusic) bgMusic.pause();
  } else {
    if (!bgMusic) {
      playStageMusic(currentStageName);
    } else if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
    }
  }
  updateMusicButtonText();
  return !musicMuted;
}

function toggleSfx() {
  sfxMuted = !sfxMuted;
  updateSfxButtonText();
  return !sfxMuted;
}

function updateMusicButtonText() {
  const btn = document.getElementById('btnToggleMusic');
  if (btn) {
    btn.innerText = musicMuted ? '[ Music: OFF ]' : '[ Music: ON ]';
  }
}

function updateSfxButtonText() {
  const btn = document.getElementById('btnToggleSfx');
  if (btn) {
    btn.innerText = sfxMuted ? '[ SFX: OFF ]' : '[ SFX: ON ]';
  }
}

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!currentMusicTrack) {
    playStageMusic(currentStageName || 'main');
  } else if (bgMusic && bgMusic.paused && !musicMuted) {
    bgMusic.play().catch(() => {});
  }
  return audioCtx;
}

// Global listeners to start audio/music on first user action
document.addEventListener('pointerdown', () => { getAudioContext(); }, { once: true });
document.addEventListener('keydown', () => { getAudioContext(); }, { once: true });

function playFootstepSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, actx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.04);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.04);
  } catch(e) {}
}

function playKissSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc1 = actx.createOscillator(); const osc2 = actx.createOscillator();
    const gain = actx.createGain();
    osc1.type = 'sine'; osc2.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, actx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(783.99, actx.currentTime + 0.15);
    osc2.frequency.setValueAtTime(659.25, actx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, actx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
    osc1.connect(gain); osc2.connect(gain); gain.connect(actx.destination);
    osc1.start(); osc2.start();
    osc1.stop(actx.currentTime + 0.18); osc2.stop(actx.currentTime + 0.18);
  } catch(e) {}
}

function playCoinSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(988, actx.currentTime);
    osc.frequency.setValueAtTime(1319, actx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.12);
  } catch(e) {}
}

function playPlantSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.12);
  } catch(e) {}
}

function playHarvestSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    [0, 0.07, 0.14].forEach((t, i) => {
      const osc = actx.createOscillator(); const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime([523.25, 659.25, 783.99][i], actx.currentTime + t);
      gain.gain.setValueAtTime(0.12, actx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.14);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(actx.currentTime + t); osc.stop(actx.currentTime + t + 0.14);
    });
  } catch(e) {}
}

function playShopSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, actx.currentTime);
    osc.frequency.setValueAtTime(880, actx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.18);
  } catch(e) {}
}

function playHopSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, actx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.14, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.1);
  } catch(e) {}
}

function playSplashSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.25);
  } catch(e) {}
}

function playHonkSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc1 = actx.createOscillator(); const osc2 = actx.createOscillator();
    const gain = actx.createGain();
    osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, actx.currentTime);
    osc2.frequency.setValueAtTime(220, actx.currentTime);
    gain.gain.setValueAtTime(0.15, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
    osc1.connect(gain); gain.connect(actx.destination);
    osc1.start(); osc2.start();
    osc1.stop(actx.currentTime + 0.2); osc2.stop(actx.currentTime + 0.2);
  } catch(e) {}
}

function playReelSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, actx.currentTime);
    gain.gain.setValueAtTime(0.04, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.03);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.03);
  } catch(e) {}
}

function playCatchSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = actx.createOscillator(); const gain = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, actx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.12, actx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + i * 0.08 + 0.15);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(actx.currentTime + i * 0.08);
      osc.stop(actx.currentTime + i * 0.08 + 0.15);
    });
  } catch(e) {}
}

function playSurfCarveSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, actx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.15);
  } catch(e) {}
}

function playTrickSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, actx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.14, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.2);
  } catch(e) {}
}

function playWipeoutSound() {
  if (sfxMuted) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.18, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.3);
  } catch(e) {}
}

