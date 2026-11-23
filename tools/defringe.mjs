// Removes the light halo round a cut-out. The generator painted a light checkerboard behind the
// objects, so the soft edge pixels the background remover keeps (hair, sleeves) still carry
// that light colour. Here every not-quite-opaque pixel takes the colour of the solid pixels
// just inside the edge, and the edge is tightened slightly.
//
//   node defringe.mjs <file.webp> [more files...]     (rewrites them in place)
//
// cutout.mjs runs this on every cut-out it makes; the CLI is for ones made before it did.
import sharp from "sharp";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";

const SOLID = 0.98;     // alpha at or above this is trusted as clean colour
const EDGE_IN = 2;      // solid pixels this close to the edge are recoloured too
const RADIUS = 6;       // how far in (pixels) to look for clean colour
const CHOKE = [0.2, 0.95];   // alpha below the first is dropped, above the second is solid

/** Box blur of `src` (one channel, w x h), in place via `tmp`, separably. */
function boxBlur(src, tmp, w, h, r) {
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / n;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      src[y * w + x] = sum / n;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
}

/** Defringes RGBA pixel data (Uint8 / Uint8Clamped, w x h) in place and returns it. */
export function defringe(data, w, h) {
  const count = w * h;
  const tmp = new Float32Array(count);
  // Clean pixels: solid, and with only solid pixels for EDGE_IN around them (the solid ring
  // right at the edge can still hold the light background colour).
  const core = new Float32Array(count);
  for (let i = 0; i < count; i++) core[i] = data[i * 4 + 3] / 255 >= SOLID ? 1 : 0;
  boxBlur(core, tmp, w, h, EDGE_IN);
  for (let i = 0; i < count; i++) core[i] = core[i] > 0.999 ? 1 : 0;

  const chans = [new Float32Array(count), new Float32Array(count), new Float32Array(count)];
  const clean = Uint8Array.from(core);
  for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) chans[c][i] = data[i * 4 + c] * core[i];
  // Two passes of the box blur: a smoother spread of the clean colour outward.
  for (const ch of [core, ...chans]) { boxBlur(ch, tmp, w, h, RADIUS); boxBlur(ch, tmp, w, h, RADIUS); }

  for (let i = 0; i < count; i++) {
    if (clean[i]) continue;
    const a = data[i * 4 + 3] / 255;
    if (core[i] > 1e-4) for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(chans[c][i] / core[i]);
    if (a >= SOLID) continue;
    const t = Math.min(1, Math.max(0, (a - CHOKE[0]) / (CHOKE[1] - CHOKE[0])));
    data[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  return data;
}

// CLI: rewrite the given cut-outs in place.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of process.argv.slice(2)) {
    // Read into memory first, so the file is not held open while it is rewritten (Windows).
    const { data, info } = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    defringe(data, info.width, info.height);
    const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: 86, alphaQuality: 90 }).toBuffer();
    writeFileSync(file, out);
    console.log(`defringed ${file}`);
  }
}
