// Prepares every painting in public/art for the 3D scenes:
//   public/art/web/<name>.jpg        the painting, 2048px on its long side (web size)
//   public/art/web/<name>-depth.png  its depth map, 1024px (white = near, black = far)
// The scenes push each painting into 3D with its depth map, so it moves dimensionally
// with the mouse.
//
// Run from this folder:  node make-depth.mjs
// The first run downloads the Depth Anything V2 (small) model, about 25 MB; then it is cached.
// Add a painting: drop the .jpg into public/art and run this again.
import { pipeline, RawImage } from "@huggingface/transformers";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ART = join(import.meta.dirname, "..", "public", "art");
const WEB = join(ART, "web");
mkdirSync(WEB, { recursive: true });

const fit = (img, max) => {
  const scale = max / Math.max(img.width, img.height);
  return scale < 1 ? img.resize(Math.round(img.width * scale), Math.round(img.height * scale)) : img;
};

const estimator = await pipeline("depth-estimation", "onnx-community/depth-anything-v2-small", { dtype: "q8" });

for (const file of readdirSync(ART).filter((f) => /\.jpe?g$/i.test(f))) {
  const name = file.replace(/\.jpe?g$/i, "");
  const colorOut = join(WEB, `${name}.jpg`);
  const depthOut = join(WEB, `${name}-depth.png`);
  if (existsSync(colorOut) && existsSync(depthOut)) { console.log(`${name}: up to date`); continue; }

  const image = await RawImage.read(join(ART, file));
  const web = await fit(image, 2048);
  await web.save(colorOut);
  const { depth } = await estimator(web);
  await (await fit(depth, 1024)).save(depthOut);
  console.log(`${name}: ${web.width}x${web.height}, depth ${depth.width}x${depth.height}`);
}
