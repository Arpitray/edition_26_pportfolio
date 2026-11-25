// Small animation helpers with no three.js in them, so components that only need these do not
// pull the WebGL code into the first download.

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 before a, 1 after b, eased in between. */
export const ramp = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The scroll range of the NudeNet plate's veil (VeilCanvas on desktop, a CSS blur elsewhere). */
export const veilRange = (el: HTMLElement) => ({ trigger: el, start: "top 62%", end: "center 38%", scrub: true });
