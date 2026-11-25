"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis, prefersReducedMotion, isSimple } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

// Lenis smooths the wheel; GSAP's ticker drives it, so every ScrollTrigger reads the same
// scroll position on the same frame and nothing jitters.
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Touch screens keep their own native scrolling (smoother there, and lighter).
    if (prefersReducedMotion() || isSimple()) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
