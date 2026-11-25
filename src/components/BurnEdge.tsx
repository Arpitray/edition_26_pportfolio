import type { CSSProperties } from "react";

/*
 * The burnt, torn paper edges between sections are painted images (tools/make-burn.mjs):
 *   edge-*.png  the burn itself: ragged black char, scorched brown, toasted fringe, soot and
 *               a few glowing embers; transparent elsewhere
 *   mask-*.png  the torn sheet's exact shape, for CSS masks, so a section is cut along the
 *               same line the burn is drawn on
 * "below" is a sheet lying below the tear, "above" one lying above it. The strip tiles left to
 * right and is shown at the height of --tear-h; each edge starts the tile at a different
 * point (from its seed), so no two edges look the same.
 */
const TILE_RATIO = 3200 / 360;           // the strip's width / height
// The burn is a WebP (colour and alpha); the masks are small PNGs.
const art = (kind: "edge" | "mask", below: boolean) => `url("/art/burn/${kind}-${below ? "below" : "above"}.${kind === "edge" ? "webp" : "png"}")`;
const tileSize = `calc(var(--tear-h) * ${TILE_RATIO}) var(--tear-h)`;
const tileX = (seed: number) => `calc(var(--tear-h) * ${TILE_RATIO} * -${((seed * 0.6180339) % 1).toFixed(4)})`;

/**
 * CSS mask that cuts a section's top along a burnt tear: only what is below the tear in its
 * top band (--tear-h tall) is kept, and everything under that band, so the section above shows
 * through. Pair it with <BurnEdge side="top" seed={same seed} /> for the burn itself.
 */
export function tearMask(seed: number): CSSProperties {
  const image = `${art("mask", true)}, linear-gradient(#000, #000)`;
  const size = `${tileSize}, 100% calc(100% - var(--tear-h) + 1px)`;
  const position = `${tileX(seed)} 0, 0 calc(var(--tear-h) - 1px)`;
  const repeat = "repeat-x, no-repeat";
  return {
    maskImage: image, WebkitMaskImage: image,
    maskSize: size, WebkitMaskSize: size,
    maskPosition: position, WebkitMaskPosition: position,
    maskRepeat: repeat, WebkitMaskRepeat: repeat,
  };
}

/**
 * A burnt, torn edge, --tear-h tall.
 * side="bottom": at the bottom of a section; `color` is the next section, which lies below the
 *                tear and is the burnt sheet.
 * side="top":    at the top of a section; `color` is the previous section, which lies above the
 *                tear and is the burnt sheet. Without `color`, the section itself (cut by
 *                tearMask) is the sheet below the tear, and only the burn is drawn.
 */
export default function BurnEdge({ side = "bottom", color, seed = 11 }: { side?: "top" | "bottom"; color?: string; seed?: number }) {
  const below = side === "bottom" || !color;
  const tile: CSSProperties = {
    backgroundSize: tileSize, backgroundRepeat: "repeat-x", backgroundPosition: `${tileX(seed)} 0`,
  };
  const sheet: CSSProperties = color ? {
    backgroundColor: color,
    maskImage: art("mask", below), WebkitMaskImage: art("mask", below),
    maskSize: tileSize, WebkitMaskSize: tileSize,
    maskRepeat: "repeat-x", WebkitMaskRepeat: "repeat-x",
    maskPosition: `${tileX(seed)} 0`, WebkitMaskPosition: `${tileX(seed)} 0`,
  } : {};
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-[var(--tear-h)] ${side === "bottom" ? "-bottom-px" : color ? "-top-px" : "top-0"}`}
    >
      {color && <div className="absolute inset-0" style={sheet} />}
      <div className="absolute inset-0" style={{ ...tile, backgroundImage: art("edge", below) }} />
    </div>
  );
}
