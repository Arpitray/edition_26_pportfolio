import type { Layer, LayeredScene } from "@/components/LayerScene";

/*
 * The About painting: a night study, moonlight at the window and a lantern glowing on the
 * right. A young man sits in the right foreground, cut by the bottom of the frame, and reaches
 * out to touch the celestial globe that stands on the floor beside him; his open notebook,
 * the bell curve on its page, lies on the floor at the globe's foot. As the chapter scrolls,
 * the globe lifts off the floor and turns, the notebook rises after it, and he leans back a
 * little. (Replace figure.webp with your own portrait cut-out to put yourself in the scene.)
 *
 * Units: screen heights from the centre of the screen, for x and y alike (see Layer). The
 * globe is placed from his fingertip (a point on the figure image), so his finger stays on it
 * on every screen.
 */
const ABOUT = "/art/scenes/about";
const SITTER = { x: 0.42, y: -0.18, h: 1.2, aspect: 1516 / 1800 };
/** A point on the figure image (0..1 from its top-left), in screen units. */
const onSitter = (u: number, v: number) => ({
  x: SITTER.x + (u - 0.5) * SITTER.h * SITTER.aspect,
  y: SITTER.y + (0.5 - v) * SITTER.h,
});
const FINGERTIP = onSitter(0.03, 0.27);
// The globe, and the point on its sphere (0..1 on the globe image) that his finger touches.
const GLOBE = { h: 0.75, aspect: 1476 / 1800, touch: { u: 0.86, v: 0.25 } };

const layers: Layer[] = [
  { src: `${ABOUT}/globe.webp`, z: 0.28, h: GLOBE.h,
    x: FINGERTIP.x - (GLOBE.touch.u - 0.5) * GLOBE.h * GLOBE.aspect,
    y: FINGERTIP.y - (0.5 - GLOBE.touch.v) * GLOBE.h,
    detach: { x: 0.1, y: 0.32, z: 0.22, rot: 0.22, at: 0 } },
  { src: `${ABOUT}/figure.webp`, z: 0.32, x: SITTER.x, y: SITTER.y, h: SITTER.h,
    detach: { x: 0.07, y: 0, z: -0.05, rot: -0.02, at: 0.25 } },
  // Dropped open on the floorboards at the globe's foot, between it and his knee.
  { src: `${ABOUT}/notebook.webp`, z: 0.42, x: -0.04, y: -0.42, h: 0.16, r: -0.06,
    detach: { x: -0.12, y: 0.66, z: 0.4, rot: 0.45, at: 0.12 } },
];

export const aboutScene: LayeredScene = { background: `${ABOUT}/bg.webp`, layers };
