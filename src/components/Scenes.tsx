"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type LayerSceneType from "@/components/LayerScene";
import type DepthSceneType from "@/components/DepthScene";
import type VeilCanvasType from "@/components/VeilCanvas";
import { isSimple, prefersReducedMotion } from "@/lib/scroll";
import { veilRange } from "@/lib/anim";
import { whenReady } from "@/lib/ready";

gsap.registerPlugin(ScrollTrigger);

/*
 * The WebGL pieces (three.js, about half the page's script) load only where they are used:
 * never on phones and tablets (they show still pictures instead), and on desktop only when the
 * piece is within about a screen of view, and (except the hero) not before the opening loader
 * has lifted, so the hero has the network and the graphics card to itself. Each wrapper holds
 * the piece's place with an empty box until then.
 */
const importLayerScene = () => import("@/components/LayerScene");
// On desktop the hero needs this straight away: start the download as soon as this script
// runs, instead of after the page has hydrated and the hero has mounted.
if (typeof window !== "undefined" && !isSimple()) importLayerScene().catch(() => {});
const LayerScene = dynamic(importLayerScene, { ssr: false });
const DepthScene = dynamic(() => import("@/components/DepthScene"), { ssr: false });
const VeilCanvas = dynamic(() => import("@/components/VeilCanvas"), { ssr: false });

/**
 * True once the box is within `margin` of the screen; never on phones and tablets. With
 * `afterIntro`, only once the loader has started to lift (lib/ready "intro").
 */
function useNear(margin: string, afterIntro = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || isSimple()) return;
    let io: IntersectionObserver | null = null, live = true;
    (afterIntro ? whenReady("intro") : Promise.resolve()).then(() => {
      if (!live) return;
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setNear(true); io?.disconnect(); }
      }, { rootMargin: margin });
      io.observe(el);
    });
    return () => { live = false; io?.disconnect(); };
  }, [margin, afterIntro]);
  return [ref, near] as const;
}

const BOX = "pointer-events-none absolute inset-0";

/** `hero`: the opening scene, which loads straight away (the loader is waiting for it). */
export function LazyLayerScene({ hero = false, ...props }: ComponentProps<typeof LayerSceneType> & { hero?: boolean }) {
  const [ref, near] = useNear("120% 0px", !hero);
  return <div ref={ref} className="absolute inset-0">{near && <LayerScene {...props} />}</div>;
}

export function LazyDepthScene(props: ComponentProps<typeof DepthSceneType>) {
  const [ref, near] = useNear("120% 0px");
  return <div ref={ref} className="absolute inset-0">{near && <DepthScene {...props} />}</div>;
}

/**
 * The NudeNet plate's veil: the WebGL scan on desktop; on phones and tablets the card simply
 * blurs over the same stretch of scroll (no WebGL, no three.js download).
 */
export function LazyVeil(props: ComponentProps<typeof VeilCanvasType>) {
  const [ref, near] = useNear("80% 0px");
  const { trigger, card } = props;
  useEffect(() => {
    const el = trigger.current;
    if (!el || !card.current || !isSimple() || prefersReducedMotion()) return;
    const tw = gsap.fromTo(card.current, { filter: "blur(0px)" }, { filter: "blur(9px)", ease: "power1.in", scrollTrigger: veilRange(el) });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, [trigger, card]);
  return <div ref={ref} className={BOX}>{near && <VeilCanvas {...props} />}</div>;
}
