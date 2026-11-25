// The star-atlas plates that illustrate the write-ups, each with its main figure cut out so
// the page can show the plate faded and bring colour into that figure alone:
//   - Projects: plates made new in the style of Johannes Hevelius' Firmamentum Sobiescianum;
//   - NovaFocus: hand-coloured plates from that atlas (1690, public domain), redrawn so each
//     main figure shows the work.
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
  // NovaFocus: the Hevelius plates (1690) redrawn so each main figure shows the work (made
  // with an image editor from the scans, in the plates' own style; "edit" files). Boxes and
  // outlines in units of a 640 x 520 view of the image (`units`), at the image's own size.
  { name: "pegasus", file: "hevelius-pegasus-edit.png", native: true, units: [640, 520], boxes: [[100, 122, 500, 421]] },
  { name: "canismajor", file: "hevelius-canismajor-edit.png", native: true, units: [640, 520], boxes: [[330, 45, 532, 402], [199, 222, 364, 402]],
    add: [[[306, 226], [330, 224], [358, 230], [364, 268], [352, 300], [334, 282], [308, 262]]] },
  // The ribbon's placeholder text was painted out ("-clean").
  { name: "draco", file: "hevelius-draco-edit-clean.png", native: true, units: [640, 520], boxes: [[135, 90, 515, 340]],
    poly: [[135, 90], [515, 90], [515, 262], [135, 262]] },
  { name: "libra", file: "hevelius-libra-edit.png", native: true, units: [640, 520], boxes: [[170, 112, 495, 348]] },
  { name: "perseus", file: "hevelius-perseus-edit.png", native: true, units: [640, 520], boxes: [[150, 82, 472, 432]] },
  // The funnel and the A/B cards; an outline keeps the sea serpent Hydra out.
  { name: "sextans", file: "hevelius-sextans-edit.png", native: true, units: [640, 520], boxes: [[172, 95, 468, 262], [232, 260, 392, 340]],
    poly: [[172, 95], [468, 95], [468, 178], [392, 240], [392, 340], [232, 340], [232, 262], [292, 262], [172, 178]] },
];
const only = process.argv.slice(2);

const remover = await pipeline("background-removal", "onnx-community/BiRefNet_lite-ONNX", { dtype: "fp32" });

for (const p of PLATES) {
  if (only.length && !only.includes(p.name)) continue;
  const file = join(SRC, p.file ?? `plate-${p.name}.png`);
  // Scans: scale so that cutting 12 px off every side leaves SCAN_WIDTH; boxes follow.
  const { width: srcW, height: srcH } = await sharp(file).metadata();
  // native: keep the image's own size (no enlarging); units: boxes given in a scaled view.
  const full = p.native ? srcW : p.scan ? SCAN_WIDTH + 24 : WIDTH, cut = p.scan ? 12 : 0, k = full / srcW;
  const [ux, uy] = p.units ? [srcW / p.units[0], srcH / p.units[1]] : [1, 1];
  const unit = ([x, y]) => [x * ux, y * uy];
  const big = await sharp(file).resize({ width: full }).removeAlpha().png().toBuffer({ resolveWithObject: true });
  const plate = sharp(big.data).extract({ left: cut, top: cut, width: full - 2 * cut, height: big.info.height - 2 * cut });
  const boxes = p.boxes.map(([a, b, c, d]) => [...unit([a, b]), ...unit([c, d])].map((v) => Math.max(0, Math.round(v * k) - cut)));
  // Optional outline (source pixels): only what lies inside it is kept.
  const poly = p.poly?.map((pt) => unit(pt)).map(([x, y]) => [x * k - cut, y * k - cut]);
  // Optional `add` outlines: always kept, for a part the model leaves faint.
  const adds = (p.add ?? []).map((pts) => pts.map((pt) => unit(pt)).map(([x, y]) => [x * k - cut, y * k - cut]));
  const inPoly = (x, y, pts = poly) => {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
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
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      const a = adds.some((pts) => inPoly(px, py, pts)) ? 255
        : poly && !inPoly(px, py) ? 0 : mask.data[(y * bw + x) * 4 + 3];
      if (a <= fig[d + 3]) continue;
      fig[d] = img[s]; fig[d + 1] = img[s + 1]; fig[d + 2] = img[s + 2]; fig[d + 3] = a;
    }
  }
  await sharp(fig, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile(join(OUT, `${p.name}-figure.webp`));
  console.log(`${p.name}: ${W}x${H}`);
}
