// ---- Web Audio API Synthesizer ----
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playFootstepSound() {
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
