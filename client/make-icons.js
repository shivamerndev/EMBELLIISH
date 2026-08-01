import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC32 for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(width, height, getPixel) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // Bit depth
  ihdr[9] = 6;  // Color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function generateEmbellishIcon(size, isMaskable = false) {
  const cornerRadius = isMaskable ? 0 : Math.round(size * 0.2);

  return createPng(size, size, (x, y) => {
    // Check rounded corners if not maskable
    if (!isMaskable) {
      const cx = x < cornerRadius ? cornerRadius : (x > size - cornerRadius ? size - cornerRadius : x);
      const cy = y < cornerRadius ? cornerRadius : (y > size - cornerRadius ? size - cornerRadius : y);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
        return [0, 0, 0, 0]; // Transparent outside rounded corner
      }
    }

    // Background Gradient: #0f172a to #020617
    const ny = y / size;
    const nx = x / size;
    let r = Math.round(15 * (1 - ny) + 2 * ny);
    let g = Math.round(23 * (1 - ny) + 6 * ny);
    let b = Math.round(42 * (1 - ny) + 23 * ny);

    // Inner Gold Border (for non-maskable)
    if (!isMaskable) {
      const borderThick = Math.max(2, Math.round(size * 0.015));
      const distFromEdge = Math.min(x, size - 1 - x, y, size - 1 - y);
      if (distFromEdge < borderThick + 4 && distFromEdge >= 4) {
        return [245, 158, 11, 220]; // Gold border accent
      }
    }

    // Draw 'E' Crest Emblem in center
    // Normalized coordinates inside center safe area (0.25 to 0.75)
    const relX = (nx - 0.22) / 0.56; // 0 to 1
    const relY = (ny - 0.22) / 0.56; // 0 to 1

    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      // Left vertical spine of E
      if (relX >= 0.15 && relX <= 0.35 && relY >= 0.15 && relY <= 0.85) {
        return [251, 191, 36, 255]; // Bright Gold
      }
      // Top horizontal bar
      if (relX >= 0.15 && relX <= 0.82 && relY >= 0.15 && relY <= 0.30) {
        return [245, 158, 11, 255];
      }
      // Middle horizontal bar
      if (relX >= 0.15 && relX <= 0.68 && relY >= 0.43 && relY <= 0.57) {
        return [245, 158, 11, 255];
      }
      // Bottom horizontal bar
      if (relX >= 0.15 && relX <= 0.82 && relY >= 0.70 && relY <= 0.85) {
        return [245, 158, 11, 255];
      }
      // Elegant Gem Accents on right tips
      if ((Math.abs(relX - 0.82) < 0.06 && Math.abs(relY - 0.225) < 0.06) ||
          (Math.abs(relX - 0.68) < 0.06 && Math.abs(relY - 0.50) < 0.06) ||
          (Math.abs(relX - 0.82) < 0.06 && Math.abs(relY - 0.775) < 0.06)) {
        return [255, 255, 255, 255]; // White Diamond highlight
      }
    }

    return [r, g, b, 255];
  });
}

const publicDir = path.join(__dirname, 'public');

console.log('Generating PWA Icons...');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateEmbellishIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateEmbellishIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), generateEmbellishIcon(192, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), generateEmbellishIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateEmbellishIcon(180, false));
console.log('PWA Icons generated successfully!');
