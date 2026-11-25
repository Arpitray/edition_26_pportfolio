// The site's icon: the initials "AR" in the site's title typeface (Inter Tight ExtraBold), in
// the paper colour on the night of the hero, dressed in the site's own art: a faint engraved
// star chart in the night (Cellarius's northern sky, the chart behind NovaFocus's plates,
// turned to pale lines), and along the bottom the burnt, torn paper edge that joins the
// sections, the night burning into the paper the way the hero does into About.
//
// The letters are real type (art-source/fonts, SIL Open Font License, outlines via
// opentype.js); the chart and the burn are cut from the site's own artwork.
// Writes src/app/icon.png (512 px), src/app/favicon.ico (16, 32, 48 px) and
// src/app/apple-icon.png (180 px). Next.js links them automatically.
//
//   node tools/make-icon.mjs
import sharp from "sharp";
import opentype from "opentype.js";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";

const S = 512;
const NIGHT = { r: 7, g: 7, b: 12, alpha: 1 }, PAPER = { r: 231, g: 228, b: 218 };
const font = opentype.loadSync("../art-source/fonts/InterTight-ExtraBold.woff");
const CHART = "../art-source/originals/art/backgrounds/cellarius-boreale.jpg";
const MASK = "../public/art/burn/mask-below.png";
const BURN = existsSync("../art-source/originals/art/burn/edge-below.png")
  ? "../art-source/originals/art/burn/edge-below.png" : "../public/art/burn/edge-below.webp";

/** "AR" as an SVG layer on the S x S canvas: `size` px type, its ink centred on (cx, cy). */
function letters(size, cx, cy, track) {
  const a = font.charToGlyph("A"), r = font.charToGlyph("R");
  const scale = size / font.unitsPerEm;
  const pa = a.getPath(0, 0, size), pr = r.getPath(a.advanceWidth * scale + font.getKerningValue(a, r) * scale + track, 0, size);
  const ba = pa.getBoundingBox(), br = pr.getBoundingBox();
  const dx = cx - (Math.min(ba.x1, br.x1) + Math.max(ba.x2, br.x2)) / 2;
  const dy = cy - (Math.min(ba.y1, br.y1) + Math.max(ba.y2, br.y2)) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})" fill="rgb(${PAPER.r},${PAPER.g},${PAPER.b})">
      <path d="${pa.toPathData(2)}"/><path d="${pr.toPathData(2)}"/>
    </g></svg>`);
}

/** The star chart as faint pale engraved lines on the night. */
async function chartLayer(opacity) {
  const lines = await sharp(CHART).extract({ left: 520, top: 380, width: 960, height: 960 }).resize(S, S)
    .greyscale().negate().normalise().linear(1.7, -150).toColourspace("b-w").raw().toBuffer();
  const rgba = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    rgba[i * 4] = PAPER.r; rgba[i * 4 + 1] = PAPER.g; rgba[i * 4 + 2] = PAPER.b;
    rgba[i * 4 + 3] = Math.round(lines[i] * opacity);
  }
  return sharp(rgba, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();
}

/** The burnt, torn paper along the bottom: `band` px tall, starting `top` px down. */
async function tornPaper(top, band) {
  const cutW = Math.round((S / band) * 360), left = 1300;
  const strip = (f) => sharp(f).extract({ left, top: 0, width: cutW, height: 360 }).resize(S, band).png().toBuffer();
  const alpha = await sharp(await strip(MASK)).extractChannel("alpha").toBuffer();
  const sheet = await sharp({ create: { width: S, height: band, channels: 3, background: PAPER } }).joinChannel(alpha).png().toBuffer();
  const rest = S - top - band;   // plain paper under the band, if the band stops short of the bottom
  const below = rest > 0 ? [{ input: await sharp({ create: { width: S, height: rest, channels: 4, background: { ...PAPER, alpha: 1 } } }).png().toBuffer(), left: 0, top: top + band }] : [];
  return [...below, { input: sheet, left: 0, top }, { input: await strip(BURN), left: 0, top }];
}

/** The whole icon at S px. `simple`: for tab sizes, no chart and a bigger, plainer layout. */
async function square({ simple = false } = {}) {
  const layers = [];
  if (!simple) layers.push({ input: await chartLayer(0.12), left: 0, top: 0 });
  layers.push(...await tornPaper(simple ? 372 : 352, simple ? 140 : 160));
  layers.push({ input: letters(simple ? 290 : 240, S / 2, simple ? 196 : 204, simple ? -14 : -16), left: 0, top: 0 });
  return sharp({ create: { width: S, height: S, channels: 4, background: NIGHT } }).composite(layers).png().toBuffer();
}

const rounded = async (buf, size, r) => sharp(buf).resize(size, size).composite([{
  input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}"/></svg>`),
  blend: "dest-in",
}]).png().toBuffer();

const full = await square(), plain = await square({ simple: true });
writeFileSync("../src/app/icon.png", await rounded(full, 512, 112));
if (existsSync("../src/app/icon.svg")) unlinkSync("../src/app/icon.svg");
await sharp(full).resize(180, 180).png().toFile("../src/app/apple-icon.png");

// favicon.ico: PNG images in an ICO container (the plainer layout at 16 and 32 px).
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => rounded(s <= 32 ? plain : full, s, Math.round(s * 0.22))));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync("../src/app/favicon.ico", Buffer.concat([header, ...pngs]));
console.log("icon.png, favicon.ico, apple-icon.png written");
