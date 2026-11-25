// Cuts chosen people out of a painting so they can move as their own layers, and fills the
// gaps they leave in the painting so nothing shows twice when they move.
//
//   node cut-people.mjs <painting> <out folder> <name:x0,y0,x1,y1[:outline[:add|add...]]> [...]
//   e.g. node cut-people.mjs ../art-source/peasant-wedding-phones.png ../public/art/scenes/feast child:375,760,680,1042
//
// Boxes are in pixels of the painting. For each person, BiRefNet (MIT) finds the figure in
// its box; an optional outline (a polygon, also in painting pixels) then keeps only what lies
// inside it, for a figure the model joins to the people behind it, and optional extra
// polygons ("add", separated by |) are always kept, for parts of the figure the model missed
// (an instrument, a thin pipe). Polygons are "x y;x y;..." in painting pixels; the result is saved as <name>.webp (trimmed) plus its place in the painting in
// layers.json (centre and height as fractions of the painting). bg.webp is the painting with
// every cut-out area filled from its surroundings (push-pull fill), so the gap behind a
// figure that moves away is plain painted texture, not a second copy of the figure.
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Two more options:
//   - a box can be several boxes joined with "+" (x0,y0,x1,y1+x0,y0,x1,y1): the figure is
//     found in each and they become one layer (a group that moves together);
//   - --plate=<file>:<name,name> fills the gaps of the named layers from <file>, the same
//     painting with those figures painted out (e.g. by an image editor), instead of the
//     smooth push-pull fill. For figures that move far enough to show what was behind them.
const args = process.argv.slice(2);
const plateArg = args.find((a) => a.startsWith("--plate="));
const [src, outDir, ...boxArgs] = args.filter((a) => !a.startsWith("--"));
if (!src || !outDir || !boxArgs.length) throw new Error("Usage: node cut-people.mjs <painting> <out> <name:x0,y0,x1,y1> ...");
const [plateFile, plateNames] = plateArg ? [plateArg.slice(8, plateArg.lastIndexOf(":")), plateArg.slice(plateArg.lastIndexOf(":") + 1).split(",")] : [null, []];
const OUT = resolve(outDir);
mkdirSync(OUT, { recursive: true });

const { data: img, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const remover = await pipeline("background-removal", "onnx-community/BiRefNet_lite-ONNX", { dtype: "fp32" });

const holes = new Float32Array(W * H);          // 1 where a figure was cut out
const plateHoles = new Float32Array(W * H);     // the part of that filled from the plate
const layers = [];

for (const arg of boxArgs) {
  const [name, box, outline, adds] = arg.split(":");
  const boxes = box.split("+").map((b) => b.split(",").map(Number));
  const x0 = Math.min(...boxes.map((b) => b[0])), y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[2])), y1 = Math.max(...boxes.map((b) => b[3]));
  const poly = outline ? outline.split(";").map((pt) => pt.trim().split(/\s+/).map(Number)) : null;
  const parsePoly = (text) => text.split(";").map((pt) => pt.trim().split(/\s+/).map(Number));
  const inPoly = (pts, x, y) => {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const inside = (x, y) => !poly || inPoly(poly, x, y);
  const extra = adds ? adds.split("|").map(parsePoly) : [];
  const bw = x1 - x0, bh = y1 - y0;
  // RGBA of the whole box: colour from the painting, alpha = the figure found in any sub-box.
  const rgba = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const s = ((y0 + y) * W + (x0 + x)) * 3, i = (y * bw + x) * 4;
    rgba[i] = img[s]; rgba[i + 1] = img[s + 1]; rgba[i + 2] = img[s + 2];
  }
  for (const [bx0, by0, bx1, by1] of boxes) {
    const sw = bx1 - bx0, sh = by1 - by0;
    const crop = await sharp(src).removeAlpha().extract({ left: bx0, top: by0, width: sw, height: sh }).png().toBuffer();
    const [mask] = await remover(await RawImage.fromBlob(new Blob([crop])));
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = ((by0 - y0 + y) * bw + (bx0 - x0 + x)) * 4;
      rgba[i + 3] = Math.max(rgba[i + 3], mask.data[(y * sw + x) * 4 + 3]);
    }
  }
  if (poly || extra.length) for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const px = x0 + x + 0.5, py = y0 + y + 0.5, i = (y * bw + x) * 4;
    if (extra.some((pts) => inPoly(pts, px, py))) {
      // Kept whatever the model said: colour from the painting, fully opaque.
      const src = ((y0 + y) * W + (x0 + x)) * 3;
      rgba[i] = img[src]; rgba[i + 1] = img[src + 1]; rgba[i + 2] = img[src + 2]; rgba[i + 3] = 255;
    } else if (!inside(px, py)) rgba[i + 3] = 0;
  }
  // The figure, full colour from the painting, alpha from the mask.
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const a = rgba[(y * bw + x) * 4 + 3] / 255;
    const i = (y0 + y) * W + (x0 + x);
    holes[i] = Math.max(holes[i], a > 0.08 ? 1 : 0);
    if (plateNames.includes(name) && a > 0.08) plateHoles[i] = 1;
  }
  const cut = sharp(rgba, { raw: { width: bw, height: bh, channels: 4 } });
  const { info: t } = await cut.clone().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const left = x0 - (t.trimOffsetLeft ?? 0), top = y0 - (t.trimOffsetTop ?? 0);
  await cut.trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 95 }).toFile(join(OUT, `${name}.webp`));
  layers.push({
    name, file: `${name}.webp`,
    u: (left + t.width / 2) / W, v: (top + t.height / 2) / H, h: t.height / H,
    width: t.width, height: t.height,
  });
  console.log(`${name}: ${t.width}x${t.height} at ${left},${top}`);
}

// Grow the holes a little, so the fill also covers each figure's soft edge.
const grow = (m, r) => {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) out[yy * W + xx] = 1;
    }
  }
  return out;
};
const hole = grow(holes, 4);

// Push-pull fill: average the known pixels down a pyramid, then pull the averages back up
// into the holes. Smooth and seamless; then a little of the painting's own grain on top.
function fill(rgb, known, w, h) {
  if (w <= 2 || h <= 2) {
    const sum = [0, 0, 0]; let n = 0;
    for (let i = 0; i < w * h; i++) if (known[i]) { for (let c = 0; c < 3; c++) sum[c] += rgb[i * 3 + c]; n++; }
    for (let i = 0; i < w * h; i++) if (!known[i]) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = n ? sum[c] / n : 0;
    return;
  }
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2);
  const rgb2 = new Float32Array(w2 * h2 * 3), known2 = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    let n = 0; const s = [0, 0, 0];
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const yy = y * 2 + dy, xx = x * 2 + dx;
      if (yy < h && xx < w && known[yy * w + xx]) { for (let c = 0; c < 3; c++) s[c] += rgb[(yy * w + xx) * 3 + c]; n++; }
    }
    if (n) { for (let c = 0; c < 3; c++) rgb2[(y * w2 + x) * 3 + c] = s[c] / n; known2[y * w2 + x] = 1; }
  }
  fill(rgb2, known2, w2, h2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (known[i]) continue;
    // Bilinear from the coarser level.
    const fx = Math.min(w2 - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(h2 - 1, Math.max(0, (y - 0.5) / 2));
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const ix1 = Math.min(w2 - 1, ix + 1), iy1 = Math.min(h2 - 1, iy + 1);
    for (let c = 0; c < 3; c++) {
      const a = rgb2[(iy * w2 + ix) * 3 + c], b = rgb2[(iy * w2 + ix1) * 3 + c];
      const d = rgb2[(iy1 * w2 + ix) * 3 + c], e = rgb2[(iy1 * w2 + ix1) * 3 + c];
      rgb[i * 3 + c] = (a + (b - a) * tx) + ((d + (e - d) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
}
const rgb = new Float32Array(W * H * 3);
for (let i = 0; i < W * H * 3; i++) rgb[i] = img[i];
const known = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) known[i] = hole[i] ? 0 : 1;
fill(rgb, known, W, H);
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const bg = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const grain = hole[i] ? (rand() - 0.5) * 10 : 0;
  for (let c = 0; c < 3; c++) bg[i * 3 + c] = Math.max(0, Math.min(255, Math.round(rgb[i * 3 + c] + grain)));
}

// The plate: inside the named layers' gaps (grown a little), the painted-out version; a
// soft ramp at the border so the two images meet without a seam.
if (plateFile) {
  const plate = await sharp(plateFile).removeAlpha().resize(W, H, { fit: "fill" }).raw().toBuffer();
  // Fully the plate up to 6 px past the figure; the ramp lies outside that, so no trace of the
  // figure's edge is mixed back in.
  const R = 10;
  const core = grow(plateHoles, 6 + R);
  // Distance (in pixels, up to R) from the edge of the grown gap, for the soft border.
  const weight = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!core[y * W + x]) continue;
    let d = R;
    for (let dy = -R; dy <= R && d > 0; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || yy >= H || xx < 0 || xx >= W || !core[yy * W + xx]) d = Math.min(d, Math.hypot(dx, dy));
    }
    weight[y * W + x] = Math.min(1, d / R);
  }
  for (let i = 0; i < W * H; i++) {
    const w = weight[i];
    if (!w) continue;
    for (let c = 0; c < 3; c++) bg[i * 3 + c] = Math.round(img[i * 3 + c] * (1 - w) + plate[i * 3 + c] * w);
  }
  console.log(`gaps of ${plateNames.join(", ")} filled from ${plateFile}`);
}
await sharp(bg, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 88 }).toFile(join(OUT, "bg.webp"));
writeFileSync(join(OUT, "layers.json"), JSON.stringify({ width: W, height: H, layers }, null, 2));
console.log(`bg.webp and layers.json written to ${OUT}`);
