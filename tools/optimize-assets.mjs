// Shrinks the images the page downloads, in place, keeping a copy of every original in
// art-source/originals (only the first time, so running it again never loses the originals).
//
//   plates       public/art/plates/*.webp  -> 1000 px wide (they show at most ~490 css px wide,
//                so this is enough for 2x screens), WebP q78 (figures keep their alpha)
//   burn edges   public/art/burn/edge-*.png -> edge-*.webp (lossy colour, near-lossless alpha)
//   charts       public/art/backgrounds/*.jpg -> *.webp, 1400 px q50 (shown faint, behind text)
//   depth maps   public/art/web/*-depth.png -> *-depth.jpg (grey, the shader reads one channel)
//   paintings    public/art/web/*.jpg (not depth) -> re-encoded with mozjpeg, progressive
//
//   node tools/optimize-assets.mjs
import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync, copyFileSync, statSync, unlinkSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

const PUB = "../public";
const BACKUP = "../art-source/originals";
const kb = (f) => Math.round(statSync(f).size / 1024);

function backup(rel) {
  const to = join(BACKUP, rel);
  if (existsSync(to) || !existsSync(join(PUB, rel))) return;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(PUB, rel), to);
}

/** Writes through a temp file, so the source can be the same path. */
async function write(rel, out, pipeline) {
  const before = kb(join(BACKUP, rel));
  const tmp = join(PUB, out) + ".tmp";
  await pipeline(sharp(join(BACKUP, rel))).toFile(tmp);
  if (out !== rel && existsSync(join(PUB, rel))) unlinkSync(join(PUB, rel));
  renameSync(tmp, join(PUB, out));
  console.log(`${rel} ${before} KB -> ${out} ${kb(join(PUB, out))} KB`);
}

// The originals: those still in public, and those already converted (kept in the backup).
const list = (root, dir) => existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : [];
const files = (dir, re) => [...new Set([...list(PUB, dir), ...list(BACKUP, dir)])].filter((f) => re.test(f)).map((f) => `${dir}/${f}`);

for (const rel of files("art/plates", /\.webp$/)) {
  backup(rel);
  await write(rel, rel, (s) => s.resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 78, alphaQuality: 90, effort: 6 }));
}
for (const rel of files("art/burn", /^edge-.*\.png$/)) {
  backup(rel);
  await write(rel, rel.replace(/\.png$/, ".webp"), (s) => s.webp({ quality: 80, alphaQuality: 95, effort: 6 }));
}
for (const rel of files("art/backgrounds", /\.jpg$/)) {
  backup(rel);
  await write(rel, rel.replace(/\.jpg$/, ".webp"), (s) => s.resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 50, effort: 6 }));
}
for (const rel of files("art/web", /-depth\.png$/)) {
  backup(rel);
  await write(rel, rel.replace(/\.png$/, ".jpg"), (s) => s.greyscale().jpeg({ quality: 88, mozjpeg: true }));
}
for (const rel of files("art/web", /^(?!.*-depth).*\.jpg$/)) {
  backup(rel);
  await write(rel, rel, (s) => s.jpeg({ quality: 80, mozjpeg: true, progressive: true }));
}
