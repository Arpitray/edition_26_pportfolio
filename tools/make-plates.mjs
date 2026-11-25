// The star-atlas plates that illustrate the write-ups, each with its main figure cut out so
// the page can show the plate faded and bring colour into that figure alone:
//   - Projects: plates made new in the style of Johannes Hevelius' Firmamentum Sobiescianum;
//   - NovaFocus: real hand-coloured plates from that atlas (1690, public domain; raremaps
//     scans, which have a thin dark line round their edge that is trimmed off).
//
//   node make-plates.mjs [name ...]      (no names: all)
//
// Reads art-source/projects-sky/<file>. Writes, for each, to public/art/plates/:
//   <name>.webp         the plate
//   <name>-figure.webp  the same size, transparent except the figure (BiRefNet, MIT)
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "../art-source/projects-sky";
const OUT = "../public/art/plates";
const WIDTH = 1536;          // new plates: their own size
const SCAN_WIDTH = 1400;     // scans: this wide after trimming
mkdirSync(OUT, { recursive: true });

// The main figure, found by the model in each box (pixels of the source image); several
// boxes are joined, so a figure can be found in parts that keep its neighbours out.
const PLATES = [
  // The shield that catches the phishing hook (shield, then hook, letter and coins).
  { name: "scutum", boxes: [[392, 272, 960, 752], [944, 272, 1184, 608], [384, 700, 880, 940]] },
  // The ring on its cushion, and the prism splitting the light into many versions.
  { name: "gemma", boxes: [[248, 240, 960, 936], [672, 120, 1280, 528]] },
  // The owl with spectacles, quill, books and magnifying glass.
  { name: "noctua", boxes: [[312, 96, 1064, 960], [360, 600, 1070, 965], [600, 560, 1090, 975]] },
  // The two doves passing the sealed, padlocked letter.
  { name: "columbae", boxes: [[150, 96, 832, 704], [624, 336, 1392, 960], [490, 560, 650, 830]] },
  // NovaFocus, Hevelius 1690. Pegasus: wings and head, then body and legs (Andromeda kept out).
  { name: "pegasus", file: "hevelius-pegasus.jpg", scan: true, boxes: [[60, 240, 1210, 1150]],
    poly: [[70, 282], [375, 312], [750, 284], [1032, 298], [1192, 610], [1092, 662], [905, 688], [808, 830], [958, 948], [1012, 1030], [996, 1086], [890, 1078], [856, 960], [705, 912], [750, 1136], [650, 1142], [614, 958], [368, 912], [312, 878], [372, 798], [418, 728], [380, 612], [318, 487], [192, 372]] },
  { name: "canismajor", file: "hevelius-canismajor.jpg", scan: true, boxes: [[763, 286, 1180, 988]] },
  { name: "draco", file: "hevelius-draco.jpg", scan: true, boxes: [[562, 293, 1338, 1240]] },
  { name: "libra", file: "hevelius-libra.jpg", scan: true, boxes: [[537, 211, 1039, 656]] },
  { name: "perseus", file: "hevelius-perseus.jpg", scan: true, boxes: [[300, 120, 990, 1150]],
    poly: [[425, 198], [472, 188], [572, 218], [648, 220], [770, 255], [796, 330], [806, 398], [846, 466], [896, 514], [972, 552], [978, 706], [906, 748], [814, 768], [768, 804], [798, 1052], [774, 1082], [696, 1068], [664, 952], [640, 900], [592, 956], [496, 938], [424, 886], [392, 782], [388, 700], [394, 556], [434, 400], [414, 300]] },
  // The sextant only: the sea-serpent Hydra coils through it, so an outline keeps it out.
  { name: "sextans", file: "hevelius-sextans.jpg", scan: true, boxes: [[400, 220, 1060, 830]],
    poly: [[438, 293], [600, 280], [918, 260], [922, 228], [1012, 228], [1022, 262], [1032, 380], [1030, 468], [1044, 505], [1028, 522], [1000, 600], [950, 680], [880, 752], [800, 790], [760, 802], [738, 792], [726, 762]] },
];
const only = process.argv.slice(2);

const remover = await pipeline("background-removal", "onnx-community/BiRefNet_lite-ONNX", { dtype: "fp32" });

for (const p of PLATES) {
  if (only.length && !only.includes(p.name)) continue;
  const file = join(SRC, p.file ?? `plate-${p.name}.png`);
  // Scans: scale so that cutting 12 px off every side leaves SCAN_WIDTH; boxes follow.
  const srcW = (await sharp(file).metadata()).width;
  const full = p.scan ? SCAN_WIDTH + 24 : WIDTH, cut = p.scan ? 12 : 0, k = full / srcW;
  const big = await sharp(file).resize({ width: full }).removeAlpha().png().toBuffer({ resolveWithObject: true });
  const plate = sharp(big.data).extract({ left: cut, top: cut, width: full - 2 * cut, height: big.info.height - 2 * cut });
  const boxes = p.boxes.map((b) => b.map((v) => Math.max(0, Math.round(v * k) - cut)));
  // Optional outline (source pixels): only what lies inside it is kept.
  const poly = p.poly?.map(([x, y]) => [x * k - cut, y * k - cut]);
  const inPoly = (x, y) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const { data: img, info } = await plate.clone().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  await plate.clone().webp({ quality: 86 }).toFile(join(OUT, `${p.name}.webp`));

  const fig = Buffer.alloc(W * H * 4);
  for (const [x0, y0, bx1, by1] of boxes) {
    const x1 = Math.min(bx1, W), y1 = Math.min(by1, H);
    const bw = x1 - x0, bh = y1 - y0;
    const crop = await sharp(img, { raw: { width: W, height: H, channels: 3 } })
      .extract({ left: x0, top: y0, width: bw, height: bh }).png().toBuffer();
    const [mask] = await remover(await RawImage.fromBlob(new Blob([crop])));
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const s = ((y0 + y) * W + (x0 + x)) * 3, d = ((y0 + y) * W + (x0 + x)) * 4;
      const a = poly && !inPoly(x0 + x + 0.5, y0 + y + 0.5) ? 0 : mask.data[(y * bw + x) * 4 + 3];
      if (a <= fig[d + 3]) continue;
      fig[d] = img[s]; fig[d + 1] = img[s + 1]; fig[d + 2] = img[s + 2]; fig[d + 3] = a;
    }
  }
  await sharp(fig, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(join(OUT, `${p.name}-figure.webp`));
  console.log(`${p.name}: ${W}x${H}`);
}
