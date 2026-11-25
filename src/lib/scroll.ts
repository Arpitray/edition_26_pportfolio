import type Lenis from "lenis";

// The one Lenis instance, so any component can scroll to a chapter smoothly.
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => { instance = lenis; };

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instance) instance.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: "smooth" });
}

/** Phones, tablets and touch screens without a mouse: the light version of the site (the
 *  `simple:` variant in globals.css is the same test). */
export const SIMPLE_QUERY = "(max-width: 1023px), (hover: none)";
export const isSimple = () => typeof window !== "undefined" && window.matchMedia(SIMPLE_QUERY).matches;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
