// Draws the installable app's icons from the site's shield mark (the header's BrandBadge: lucide's
// shield-alert outline in emerald on the tinted badge, with the red attention dot) and writes them to
// public/icons. Dev-only, no dependency: Node's own zlib for the PNG data. The output is committed;
// run again only if the mark or the colours change:
//   node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// Colours from src/app/globals.css (:root tokens).
const GREEN_BG = [0x02, 0x2c, 0x22]; // --green-bg
const SURFACE = [0x0f, 0x17, 0x2a]; // --surface
const RED_BG = [0x45, 0x0a, 0x0a]; // --red-bg
const GREEN_LINE = [0x06, 0x5f, 0x46]; // --green-line
const GREEN = [0x34, 0xd3, 0x99]; // --green
const RED = [0xf8, 0x71, 0x71]; // --red

// lucide-react 0.546.0 shield-alert, 24 x 24 view box, stroke width 2, round caps and joins:
// M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2
// 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z, M12 8v4, M12 16h.01
function cubic(p0, p1, p2, p3, steps = 24) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

function arc(center, radius, from, to, steps = 12) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    out.push([center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)]);
  }
  return out;
}

const topArcCentre = [12, 2.28 + Math.sqrt(1.17 ** 2 - 0.76 ** 2)];
const topFrom = Math.atan2(2.28 - topArcCentre[1], 11.24 - topArcCentre[0]);
const topTo = Math.atan2(2.28 - topArcCentre[1], 12.76 - topArcCentre[0]);
const SHIELD = [
  [20, 13],
  ...cubic([20, 13], [20, 18], [16.5, 20.5], [12.34, 21.95]),
  [11.67, 21.94],
  ...cubic([11.67, 21.94], [7.5, 20.5], [4, 18], [4, 13]),
  [4, 6],
  ...arc([5, 6], 1, Math.PI, 1.5 * Math.PI),
  ...cubic([5, 5], [7, 5], [9.5, 3.8], [11.24, 2.28]),
  ...arc(topArcCentre, 1.17, topFrom, topTo + 2 * Math.PI * (topTo < topFrom ? 1 : 0)),
  ...cubic([12.76, 2.28], [14.51, 3.81], [17, 5], [19, 5]),
  ...arc([19, 6], 1, 1.5 * Math.PI, 2 * Math.PI),
  [20, 13],
];
const SEGMENTS = [];
for (let i = 1; i < SHIELD.length; i++) SEGMENTS.push([SHIELD[i - 1], SHIELD[i]]);
SEGMENTS.push([[12, 8], [12, 12]]);
SEGMENTS.push([[12, 16], [12.01, 16]]);

function segmentDistance(px, py, [a, b]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len));
  const x = a[0] + t * dx - px;
  const y = a[1] + t * dy - py;
  return Math.sqrt(x * x + y * y);
}

function onStroke(x, y) {
  if (x < 2 || x > 22 || y < 0.5 || y > 23.5) return false;
  for (const segment of SEGMENTS) if (segmentDistance(x, y, segment) <= 1) return true;
  return false;
}

function mix(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

// The badge's 135-degree gradient: green-bg, surface, red-bg.
function gradient(x, y) {
  const t = (x + y) / 2;
  return t < 0.5 ? mix(GREEN_BG, SURFACE, t * 2) : mix(SURFACE, RED_BG, (t - 0.5) * 2);
}

function insideRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
}

// One colour sample at (x, y) in 0..1 icon space, or null for transparent.
// kind "any": the badge as a rounded square with its border, transparent outside.
// kind "full": the badge filling the whole square (iPhone home screen, maskable), the mark scaled
// by `scale` around the centre so it stays inside the maskable safe zone.
function sample(x, y, kind, scale) {
  let colour;
  if (kind === "any") {
    if (!insideRoundedSquare(x, y, 0.22)) return null;
    const border = 1 / 40;
    colour = insideRoundedSquare((x - border) / (1 - 2 * border), (y - border) / (1 - 2 * border), 0.22) ? gradient(x, y) : GREEN_LINE;
  } else {
    colour = gradient(x, y);
  }
  // The mark: the shield is 24/40 of the badge, centred; the red dot at the top end corner.
  const mx = 0.5 + (x - 0.5) / scale;
  const my = 0.5 + (y - 0.5) / scale;
  const sx = ((mx - 0.2) / 0.6) * 24;
  const sy = ((my - 0.2) / 0.6) * 24;
  if (onStroke(sx, sy)) colour = GREEN;
  if ((mx - 0.8) ** 2 + (my - 0.2) ** 2 <= 0.075 ** 2) colour = RED;
  return colour;
}

function render(size, kind, scale = 1) {
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const c = sample((px + (i + 0.5) / SS) / size, (py + (j + 0.5) / SS) / size, kind, scale);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        }
      }
      const o = (py * size + px) * 4;
      if (a > 0) {
        rgba[o] = Math.round(r / a);
        rgba[o + 1] = Math.round(g / a);
        rgba[o + 2] = Math.round(b / a);
      }
      rgba[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return png(size, rgba);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
const ICONS = [
  ["icon-192.png", 192, "any", 1],
  ["icon-512.png", 512, "any", 1],
  // Maskable: the mark inside the central safe circle (80% of the width).
  ["icon-maskable-512.png", 512, "full", 0.75],
  // iPhone and iPad round the corners themselves and show black for transparency, so: full square.
  ["apple-touch-icon.png", 180, "full", 0.85],
];
for (const [name, size, kind, scale] of ICONS) {
  writeFileSync(`public/icons/${name}`, render(size, kind, scale));
  console.log(`public/icons/${name} ${size}x${size}`);
}
