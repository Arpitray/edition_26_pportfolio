// The engravings for "Also built" (one per smaller project), cropped square from the Met's
// Open Access scans in art-source/also and saved as public/art/also/<name>.webp.
//
// Each crop is a centre (0..1 of the width and height) and a side (0..1 of the shorter edge).
//   node tools/make-also.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const CROPS = [
  // Albrecht Dürer, Saint Jerome in His Study (1514), for Education: the plate inside its
  // border, upright (aspect = width / height; `side` is then a fraction of the width).
  { name: "durer-jerome", cx: 0.5, cy: 0.49, side: 0.92, aspect: 0.8, out: 900 },
  // Marco Dente, scholars gathered around an open book (c. 1515–27): questions and answers.
  { name: "dente-scholars", cx: 0.5, cy: 0.6, side: 0.95 },
  // Henri Merke, A Magic Lantern (1799): a room watching a picture thrown on the wall. A
  // coloured print, so it is turned to ink on paper like the others (mono).
  { name: "merke-lantern", cx: 0.5, cy: 0.45, side: 0.9, mono: true },
  // Abraham Bosse, The Gallery of the Palace of Justice (c. 1638): shoppers at the stalls.
  { name: "bosse-gallery", cx: 0.47, cy: 0.42, side: 0.74 },
  // Giovanni Battista Ferrari, De Florum Cultura (1633): an engraved flower.
  { name: "ferrari-florum", cx: 0.41, cy: 0.55, side: 0.7 },
  // Albrecht Dürer, The Draughtsman of the Lute (1525): drawing a 3D object in perspective.
  { name: "durer-lute", cx: 0.44, cy: 0.5, side: 0.9 },
];

mkdirSync("../public/art/also", { recursive: true });
for (const c of CROPS) {
  const src = `../art-source/also/${c.name}.jpg`;
  const { width: W, height: H } = await sharp(src).metadata();
  // Square by default; with an aspect, a rectangle `side` of the width wide.
  const s = c.aspect ? Math.round(W * c.side) : Math.round(Math.min(W, H) * c.side);
  const h = c.aspect ? Math.round(s / c.aspect) : s;
  const left = Math.max(0, Math.min(W - s, Math.round(c.cx * W - s / 2)));
  const top = Math.max(0, Math.min(H - h, Math.round(c.cy * H - h / 2)));
  // The cards show at most ~250 css px wide (640 px covers 2x screens); Education's print is larger.
  const out = c.out ?? 640;
  let img = sharp(src).extract({ left, top, width: s, height: h }).resize(out, Math.round(out * h / s));
  // Colour prints: to warm grey ink, lifted a little so the dark room still reads.
  if (c.mono) img = img.modulate({ saturation: 0 }).normalise().linear(0.72, 78).tint({ r: 176, g: 150, b: 112 });
  await img
    .webp({ quality: 72 }).toFile(`../public/art/also/${c.name}.webp`);
  console.log(c.name, { left, top, s });
}
