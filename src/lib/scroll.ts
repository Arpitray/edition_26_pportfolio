import type Lenis from "lenis";

// The one Lenis instance, so any component can scroll to a chapter smoothly.
let instance: Lenis | null = null;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
  if (lenis && locked) lenis.stop();
};

// While the loader is up the page must not scroll. Native scrolling is held by CSS
// (html:has(#loader) in globals.css); this holds the smooth scrolling too, even if it starts
// after the loader.
let locked = false;
export function lockScroll(on: boolean) {
  locked = on;
  if (on) instance?.stop(); else instance?.start();
}

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
