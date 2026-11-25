// Paints the burnt, torn paper edge used between sections, as images (so it can look real).
//
//   node make-burn.mjs
//
// Writes public/art/burn/:
//   edge-below.png  the burn on a sheet that lies BELOW the tear (char, scorch, toast, embers,
//                   fibres), transparent elsewhere; drawn over the sheet
//   mask-below.png  that sheet's shape: opaque below the tear, transparent above; used as a
//                   CSS mask so the sheet is cut exactly along the tear
//   edge-above.png, mask-above.png   the same, flipped, for a sheet ABOVE the tear
// The strip tiles seamlessly left to right. It is TILE_W x TILE_H pixels and is shown at the
// height of --tear-h (see globals.css), so it is drawn at about twice that for sharpness.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const TILE_W = 3200;
const TILE_H = 360;
const OUT = join(import.meta.dirname, "..", "public", "art", "burn");
mkdirSync(OUT, { recursive: true });

// Seeded random and noise that repeats every TILE_W pixels across, so the strip tiles.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const smooth = (t) => t * t * (3 - 2 * t);

/** 1D value noise, period `cells` knots across the tile, -1..1. */
function noise1(cells) {
  const knots = Array.from({ length: cells }, () => rand() * 2 - 1);
  return (x) => {
    const f = (x / TILE_W) * cells;
    const i = Math.floor(f), t = smooth(f - i);
    const a = knots[((i % cells) + cells) % cells], b = knots[(((i + 1) % cells) + cells) % cells];
    return a + (b - a) * t;
  };
}
/** 2D value noise, `cx` cells across (wrapping) and `cy` cells down, -1..1. */
function noise2(cx, cy) {
  const g = Array.from({ length: cx * (cy + 1) }, () => rand() * 2 - 1);
  const at = (i, j) => g[(((i % cx) + cx) % cx) + Math.min(cy, Math.max(0, j)) * cx];
  return (x, y) => {
    const fx = (x / TILE_W) * cx, fy = (y / TILE_H) * cy;
    const i = Math.floor(fx), j = Math.floor(fy);
    const tx = smooth(fx - i), ty = smooth(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    return a + (b - a) * ty;
  };
}
const fractal1 = (layers) => (x) => layers.reduce((s, [n, a]) => s + n(x) * a, 0);
const fractal2 = (layers) => (x, y) => layers.reduce((s, [n, a]) => s + n(x, y) * a, 0);

// The tear: long waves, medium wobble, small bites, and fine fibre jitter (pixels).
const tear = fractal1([[noise1(5), 34], [noise1(13), 20], [noise1(37), 9], [noise1(110), 4], [noise1(420), 1.6]]);
// How deep the burn reaches, varying along the edge and in patches.
const reach = fractal2([[noise2(9, 2), 1], [noise2(31, 4), 0.5]]);
// 2D noises with square cells (cells down = cells across * TILE_H / TILE_W), so nothing streaks.
const sq = (cx) => noise2(cx, Math.max(1, Math.round((cx * TILE_H) / TILE_W)));
const blotch = fractal2([[sq(70), 1], [sq(200), 0.5]]);
const outer = fractal2([[sq(40), 1], [sq(120), 0.6], [sq(360), 0.3]]);
const rag = fractal2([[sq(500), 1], [sq(1100), 0.6]]);
const grain = fractal2([[sq(900), 1], [sq(2200), 0.6]]);
const emberAlong = fractal1([[noise1(29), 1], [noise1(83), 0.6]]);
const sparkle = fractal1([[noise1(260), 1], [noise1(700), 0.5]]);

const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const CHAR = [14, 9, 6];          // charcoal
const SCORCH = [58, 30, 12];      // dark scorched brown
const BROWN = [112, 66, 28];      // burnt brown
const TOAST = [176, 128, 72];     // toasted paper
const EMBER = [255, 112, 36];
const CORE = [255, 214, 140];

const MID = TILE_H * 0.42;

/**
 * Paints one side of the tear: side 1 is the sheet below the line, side -1 the sheet above
 * the SAME line (the other half of a rip), each with its own burn.
 */
function paint(side) {
const edge = Buffer.alloc(TILE_W * TILE_H * 4);
const mask = Buffer.alloc(TILE_W * TILE_H * 4);
for (let x = 0; x < TILE_W; x++) {
  const ty = MID + tear(x);
  const r = reach(x, 0) * 0.5 + 0.5;                       // 0..1 along the edge
  const charW = 4 + r * 8;                                   // px of solid char
  const scorchW = charW + 4 + r * 9;
  const brownW = scorchW + 6 + r * 14;
  const toastW = brownW + 10 + r * 22;
  const emberHere = ss(0.62, 0.85, emberAlong(x) * 0.5 + 0.5) * ss(0.2, 0.7, sparkle(x) * 0.5 + 0.5);
  for (let y = 0; y < TILE_H; y++) {
    const i = (y * TILE_W + x) * 4;
    const b = blotch(x, y);
    // Depth into the sheet: the edge itself is ragged at a fine scale, and each band's
    // boundary wanders more the further in it lies (burns bite unevenly).
    const d = side * (y - ty) + rag(x, y) * 3.2 + b * 3;
    const dOut = d + outer(x, y) * 9;
    const gr = grain(x, y);
    const shape = clamp01(d + 0.5);
    mask[i] = mask[i + 1] = mask[i + 2] = 255;
    mask[i + 3] = Math.round(shape * 255);
    if (shape <= 0) continue;

    // Colour by depth: char, scorch, brown, toast, then the sheet's own colour (transparent).
    let c, a;
    if (d < charW) { c = CHAR; a = 1; }
    else if (dOut < scorchW) { c = mix3(CHAR, SCORCH, ss(charW, scorchW, dOut)); a = 1; }
    else if (dOut < brownW) { c = mix3(SCORCH, BROWN, ss(scorchW, brownW, dOut)); a = 1; }
    else if (dOut < toastW) { c = mix3(BROWN, TOAST, ss(brownW, toastW, dOut)); a = 1 - ss(brownW + (toastW - brownW) * 0.2, toastW, dOut); }
    else { c = TOAST; a = 0; }
    // Paper grain and soot speckle.
    const k = 0.9 + gr * 0.1;
    c = [c[0] * k, c[1] * k, c[2] * k];
    if (d > charW && dOut < brownW && gr > 0.55) c = mix3(c, CHAR, 0.55);
    // Embers: scattered glowing spots in the char, right at the edge, with hot cores.
    if (d > 0.3 && d < charW * 0.75) {
      const glow = emberHere * ss(charW * 0.75, 0.6, d) * ss(-0.2, 0.5, gr);
      c = mix3(c, EMBER, Math.min(1, glow * 1.3));
      if (glow > 0.55) c = mix3(c, CORE, (glow - 0.55) * 1.6);
    }
    edge[i] = Math.round(c[0]); edge[i + 1] = Math.round(c[1]); edge[i + 2] = Math.round(c[2]);
    edge[i + 3] = Math.round(a * shape * 255);
  }
}
return { edge, mask };
}
const below = paint(1);
const above = paint(-1);
const { edge, mask } = below;

const write = async (buf, name, flip) => {
  let img = sharp(buf, { raw: { width: TILE_W, height: TILE_H, channels: 4 } });
  if (flip) img = img.flip();
  await img.png({ compressionLevel: 9 }).toFile(join(OUT, name));
};
await write(edge, "edge-below.png", false);
await write(mask, "mask-below.png", false);
await write(edge, "edge-above.png", true);
await write(mask, "mask-above.png", true);
console.log(`burn edges written to ${OUT}`);
