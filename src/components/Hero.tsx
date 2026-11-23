"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ramp } from "@/components/DepthScene";
import LayerScene, { type Layer, type LayerTimeline } from "@/components/LayerScene";
import { person } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

/*
 * The opening, scroll by scroll (p = 0..1 over the pinned hero): the camera moves in on him
 * at work while he leans toward you a little and the name card leaves; then light bursts
 * from the tip of his pencil. The mouse turns the scene in 3D throughout. Then the About
 * painting tears in below.
 */
const heroTimeline: LayerTimeline = (p) => ({
  detach: ramp(p, 0.1, 1),
  dolly: ramp(p, 0, 1) * 0.12,
  flash: ramp(p, 0.45, 0.62) * (1 - ramp(p, 0.66, 0.9)),
  etch: 0,
  mix: 0,
});

const SCENE = "/art/scenes/hero";

/*
 * The staging: a young engineer seen from behind at his desk, under a velvet curtain, the sky
 * beyond. At the right he sketches the app he is building on a drafting board; his drawing
 * hand moves (a looping video, made on a coloured screen and keyed out in the shader). At the left, his
 * code glows on a monitor beside an hourglass (both painted in the room). As the scene comes
 * apart he leans toward you, then the light bursts from the tip of his pencil.
 *
 * Units: screen heights from the centre of the screen, for x and y alike, so the arrangement
 * is the same on every screen shape (a wider screen shows more of the room at the sides).
 * Each layer also has a depth, a starting angle, and where it floats to as the scene comes
 * apart (`at` staggers the start, so things lift off one by one).
 */
const BUILDER = { x: 0.02, y: -0.05, h: 0.94, aspect: 1248 / 704 };
const PENCIL = { u: 0.781, v: 0.511 };  // the pencil tip on the drafting board, in the video frame

const HERO_LAYERS: Layer[] = [
  // Him and his drafting board: head near the top of the screen, cut by its bottom edge, the
  // board resting on the desk at the right, his cloak over the corner of the monitor.
  { src: `${SCENE}/figure3-still.webp`, video: `${SCENE}/figure2.mp4`, key: "screen",
    z: 0.3, x: BUILDER.x, y: BUILDER.y, h: BUILDER.h,
    detach: { x: 0.05, y: -0.04, z: 0.12, rot: 0, at: 0.2 } },
];

// Where the light bursts: the tip of his pencil on the drafting board (a point on the video
// frame), so it lands on the drawing on every screen.
const PENCIL_FLASH = { layer: 0, ...PENCIL };
// On a portrait screen: smaller, centred between his head and his pencil, standing on the
// bottom edge.
const HERO_PORTRAIT = { x: 0.24, y: -0.5, scale: 0.55 };

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // The name card leaves as the camera moves in.
      gsap.to(card.current, {
        autoAlpha: 0, y: -50, ease: "none",
        scrollTrigger: { trigger: section.current, start: "top top", end: "40% top", scrub: 0.6 },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={section} className="relative h-[200vh] bg-night">
      <div className="sticky top-0 h-svh overflow-hidden">
        <LayerScene background={`${SCENE}/bg.webp`} layers={HERO_LAYERS}
          trigger={section} timeline={heroTimeline} flashAt={PENCIL_FLASH} portrait={HERO_PORTRAIT} />

        <div ref={card} className="absolute left-1/2 top-[27%] w-[min(84vw,360px)] -translate-x-1/2 -translate-y-1/2 border border-white/70 bg-black/35 px-8 py-10 text-white backdrop-blur-[3px] md:left-[24%] md:top-[27%]">
          <p className="font-display text-[28px] font-semibold leading-[1.05]">{person.name}</p>
          <p className="font-display text-[28px] leading-[1.05] opacity-80">{person.role}</p>
          <p className="mt-6 font-serif text-[19px] italic leading-snug">{person.pitch}</p>
          <p className="mt-8 font-display text-[11px] uppercase tracking-[0.2em] opacity-70">{person.edition} · scroll</p>
        </div>
      </div>
      {/* No edge here: the About painting below is torn along its own top and slides up under
          this one, so the two meet in a single burnt tear. */}
    </section>
  );
}
