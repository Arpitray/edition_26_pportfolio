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

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
