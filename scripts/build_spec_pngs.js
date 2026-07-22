const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function encodePng(w, h, rgba) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter type 0
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = y * stride + 1 + x * 4;
      raw[dstIdx] = rgba[srcIdx];
      raw[dstIdx+1] = rgba[srcIdx+1];
      raw[dstIdx+2] = rgba[srcIdx+2];
      raw[dstIdx+3] = rgba[srcIdx+3];
    }
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Raw Spec Pixel Points (extracted directly from isolated PNG)
const specData = {
  sunglasses: [
    {x:33,y:19,r:8,g:8,b:8},{x:34,y:19,r:8,g:8,b:8},{x:35,y:19,r:8,g:8,b:8},
    {x:36,y:19,r:8,g:8,b:8},{x:37,y:19,r:8,g:8,b:8},{x:38,y:19,r:8,g:8,b:8},{x:39,y:19,r:8,g:8,b:8}
  ],
  ascot: [
    {x:73,y:25,r:237,g:28,b:36},{x:74,y:26,r:237,g:28,b:36},{x:75,y:26,r:237,g:28,b:36},
    {x:76,y:27,r:237,g:28,b:36},{x:75,y:28,r:237,g:28,b:36},{x:77,y:28,r:237,g:28,b:36}
  ],
  beanie: [
    {x:75,y:41,r:168,g:230,b:29},{x:76,y:41,r:168,g:230,b:29},
    {x:74,y:42,r:168,g:230,b:29},{x:77,y:42,r:168,g:230,b:29}
  ],
  rainboots: [
    {x:24,y:51,r:77,g:109,b:243},{x:26,y:51,r:77,g:109,b:243},{x:32,y:51,r:77,g:109,b:243},{x:34,y:51,r:77,g:109,b:243},{x:99,y:51,r:47,g:54,b:153},
    {x:27,y:52,r:77,g:109,b:243},{x:35,y:52,r:77,g:109,b:243},{x:25,y:53,r:77,g:109,b:243},{x:33,y:53,r:77,g:109,b:243}
  ],
  cowboy_hat: [
    {x:34,y:57,r:156,g:90,b:60},{x:35,y:57,r:156,g:90,b:60},{x:37,y:57,r:156,g:90,b:60},{x:38,y:57,r:156,g:90,b:60},
    {x:36,y:58,r:156,g:90,b:60},{x:32,y:59,r:156,g:90,b:60},{x:33,y:59,r:99,g:54,b:35},{x:39,y:59,r:99,g:54,b:35},{x:40,y:59,r:156,g:90,b:60}
  ],
  glasses: [
    {x:57,y:71,r:70,g:70,b:70},{x:58,y:71,r:70,g:70,b:70},{x:59,y:71,r:70,g:70,b:70},{x:60,y:71,r:70,g:70,b:70},{x:61,y:71,r:70,g:70,b:70},
    {x:56,y:72,r:70,g:70,b:70},{x:62,y:72,r:70,g:70,b:70},{x:55,y:73,r:70,g:70,b:70},{x:58,y:73,r:70,g:70,b:70},{x:59,y:73,r:70,g:70,b:70},
    {x:60,y:73,r:70,g:70,b:70},{x:63,y:73,r:70,g:70,b:70},{x:57,y:74,r:70,g:70,b:70},{x:61,y:74,r:70,g:70,b:70}
  ],
  headphones: [
    {x:48,y:75,r:70,g:70,b:70},{x:49,y:75,r:70,g:70,b:70},{x:50,y:75,r:70,g:70,b:70},{x:51,y:75,r:70,g:70,b:70},{x:52,y:75,r:70,g:70,b:70},
    {x:59,y:75,r:70,g:70,b:70},{x:47,y:76,r:70,g:70,b:70},{x:58,y:76,r:70,g:70,b:70},{x:49,y:77,r:70,g:70,b:70},{x:50,y:77,r:70,g:70,b:70},
    {x:56,y:77,r:70,g:70,b:70},{x:60,y:77,r:70,g:70,b:70},{x:48,y:78,r:70,g:70,b:70},{x:57,y:78,r:70,g:70,b:70},{x:58,y:78,r:70,g:70,b:70},{x:59,y:78,r:70,g:70,b:70}
  ]
};

// Target canvas size: 50x50 matching base Klipspringer frame
const canvasW = 50, canvasH = 50;

// Anchor offsets and pixel scale (2x scale for bold visibility)
const targetOffsets = {
  sunglasses: { targetMinX: 7,  targetMinY: 9,  scale: 2 },
  ascot:      { targetMinX: 18, targetMinY: 19, scale: 2 },
  beanie:     { targetMinX: 9,  targetMinY: 2,  scale: 2.2 },
  rainboots:  { targetMinX: 8,  targetMinY: 33, scale: 2 },
  cowboy_hat: { targetMinX: 4,  targetMinY: 2,  scale: 2 },
  glasses:    { targetMinX: 7,  targetMinY: 9,  scale: 2 },
  headphones: { targetMinX: 9,  targetMinY: 2,  scale: 2 }
};

const accDir = path.join(process.cwd(), 'public', 'acc');
if (!fs.existsSync(accDir)) fs.mkdirSync(accDir, { recursive: true });

Object.entries(specData).forEach(([itemKey, pts]) => {
  let minX = 999, minY = 999;
  pts.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
  });

  const config = targetOffsets[itemKey] || { targetMinX: 10, targetMinY: 10, scale: 2 };
  const pScale = config.scale || 2;
  const offsetX = config.targetMinX - minX * pScale;
  const offsetY = config.targetMinY - minY * pScale;

  const rgba = Buffer.alloc(canvasW * canvasH * 4);

  pts.forEach(p => {
    const baseTx = Math.round(p.x * pScale + offsetX);
    const baseTy = Math.round(p.y * pScale + offsetY);
    const kw = Math.ceil(pScale);
    const kh = Math.ceil(pScale);

    for (let dy = 0; dy < kh; dy++) {
      for (let dx = 0; dx < kw; dx++) {
        const tx = baseTx + dx;
        const ty = baseTy + dy;
        if (tx >= 0 && tx < canvasW && ty >= 0 && ty < canvasH) {
          const idx = (ty * canvasW + tx) * 4;
          rgba[idx] = p.r;
          rgba[idx+1] = p.g;
          rgba[idx+2] = p.b;
          rgba[idx+3] = 255;
        }
      }
    }
  });

  const pngData = encodePng(canvasW, canvasH, rgba);
  fs.writeFileSync(path.join(accDir, itemKey + '.png'), pngData);
  console.log('Built pixel-perfect PNG:', itemKey + '.png', 'Size:', pngData.length);
});
