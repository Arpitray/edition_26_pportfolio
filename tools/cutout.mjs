// Cuts out the layers whose "transparent" background is really a painted checkerboard, and
// compresses every layer of a scene for the web.
//
//   node cutout.mjs <source folder> <scene name>
//   e.g. node cutout.mjs ../public/art/scenes/heroes hero
//
// Source files are matched by the layer code at the start of their name:
//   L0 -> bg.webp           (kept opaque, max 2752px wide)
//   L1 -> figure.webp       (background removed)
//   L2 / "2 Foreground" -> foreground.webp
//   L3a..L3z -> named from the words after "Object —" (laptop, chart, mug, dividers, ...)
// Output: public/art/scenes/<scene>/*.webp, trimmed to the visible pixels.
//
// Background removal: BiRefNet lite (MIT licence), run locally; first run downloads the model.
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { defringe } from "./defringe.mjs";
import { readdirSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const [source, scene] = process.argv.slice(2);
if (!source || !scene) throw new Error("Usage: node cutout.mjs <source folder> <scene name>");
const SRC = resolve(source);
const OUT = resolve(import.meta.dirname, "..", "public", "art", "scenes", scene);
mkdirSync(OUT, { recursive: true });

// Short web names for the objects, from words in the generator's file names.
const OBJECT_NAMES = [
  [/laptop/i, "laptop"], [/parchment|scatter|chart/i, "chart"], [/mug|coffee/i, "mug"],
  [/divider|compass/i, "dividers"], [/globe/i, "globe"], [/notebook/i, "notebook"],
  [/easel/i, "easel"], [/shield|badge/i, "badge"], [/funnel|scroll/i, "funnel"], [/lamp/i, "lamp"],
  [/phone/i, "phone"], [/letter|seal/i, "letter"], [/pillow|circuit|network/i, "network"],
  [/cards|regression|knn/i, "cards"], [/instrument|warning/i, "instrument"],
];

function layerOf(file) {
  // About scene codes (ART_PROMPTS.txt section 7): A1 background, A2 you, A3 foreground,
  // A4a.. objects, A5 portrait (kept whole).
  if (/^A1\b/i.test(file)) return { name: "bg", cut: false };
  if (/^A2\b/i.test(file)) return { name: "figure", cut: true };
  if (/^A3\b/i.test(file)) return { name: "foreground", cut: true };
  if (/^A5\b/i.test(file)) return { name: "portrait", cut: false };
  if (/^A4/i.test(file)) {
    const hit = [[/chai|tea|glass/i, "chai"], [/plane/i, "plane"], [/kite/i, "kite"]].find(([re]) => re.test(file));
    return { name: hit ? hit[1] : file.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), cut: true };
  }
  if (/^L0\b/i.test(file)) return { name: "bg", cut: false };
  if (/^L1\b/i.test(file)) return { name: /figure b|model/i.test(file) ? "figure-b" : "figure", cut: true };
  if (/^(L2\b|2 Foreground)/i.test(file)) return { name: "foreground", cut: true };
  if (/^L3/i.test(file)) {
    const page = file.match(/page\s*(\d+)/i);                    // loose pages: page-1, page-2...
    if (page) return { name: `page-${page[1]}`, cut: true };
    if (/\bbook\b/i.test(file)) return { name: "book", cut: true };
    if (/monitor|screen/i.test(file)) return { name: "monitor", cut: true };
    if (/hourglass/i.test(file)) return { name: "hourglass", cut: true };
    const hit = OBJECT_NAMES.find(([re]) => re.test(file));
    return { name: hit ? hit[1] : file.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), cut: true };
  }
  return null;
}

const remover = await pipeline("background-removal", "onnx-community/BiRefNet_lite-ONNX", { dtype: "fp32" });

for (const file of readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const layer = layerOf(file);
  if (!layer) { console.log(`skip ${file} (no layer code)`); continue; }
  const input = join(SRC, file);
  const out = join(OUT, `${layer.name}.webp`);

  if (!layer.cut) {
    await sharp(input).resize({ width: 2752, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  } else {
    const [mask] = await remover(await RawImage.read(input));   // RGBA, background alpha 0
    const { data, width, height } = mask;
    defringe(data, width, height);                               // no light halo at the edge
    await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
      .trim({ threshold: 1 })                                    // drop the empty margins
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 90 })
      .toFile(out);
  }
  const meta = await sharp(out).metadata();
  const { size } = await import("node:fs").then((fs) => fs.statSync(out));
  console.log(`${file.slice(0, 48).padEnd(48)} -> ${layer.name}.webp  ${meta.width}x${meta.height}  ${(size / 1024).toFixed(0)} KB`);
}
