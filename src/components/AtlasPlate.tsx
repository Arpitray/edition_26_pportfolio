"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";
import { LazyVeil } from "@/components/Scenes";

gsap.registerPlugin(ScrollTrigger);

/*
 * A write-up's illustration: a star-atlas plate whose constellation stands for the work.
 * Projects use plates made for this site in the style of Johannes Hevelius' hand-coloured
 * Firmamentum Sobiescianum (1690); NovaFocus uses real plates from that atlas. The plate is
 * shown faded, like an old print, and as it scrolls into view the colour comes back into its
 * main figure only. Assets from tools/make-plates.mjs.
 */

export type Sky =
  | "scutum" | "gemma" | "noctua" | "columbae"
  | "pegasus" | "canismajor" | "draco" | "libra" | "perseus" | "sextans";
export type SkyProject = { tagline: string; label: string; body: string; link?: string; sky: Sky };

// width / height of each plate image. All are new or redrawn plates in the style of Hevelius'
// atlas (1690). `veil`: in the middle of the screen a scan sweeps the card and veils it in
// mist (VeilCanvas), the way BlockP blurs an image on the device (the NudeNet write-up).
const PLATES: Record<Sky, { name: string; fig: string; alt: string; aspect: number; veil?: string }> = {
  scutum: { name: "Scutum", fig: "A", aspect: 1.5, alt: "Scutum: a gilded shield that has caught a fishing hook baited with a sealed letter and coins" },
  gemma: { name: "Gemma", fig: "B", aspect: 1.5, alt: "Gemma: a diamond ring on a velvet cushion, a prism splitting the light that falls on it" },
  noctua: { name: "Noctua", fig: "C", aspect: 1.5, alt: "Noctua: an owl in spectacles writing with a quill on a stack of books, a magnifying glass beside it" },
  columbae: { name: "Columbae", fig: "D", aspect: 1.5, alt: "Columbae: two doves passing a sealed, padlocked letter between them" },
  pegasus: { name: "Pagina", fig: "T", aspect: 1388 / 1133, alt: "Pagina: the BlockP website drawn as an engraved browser window, the corgi mascot peeking up, on a ribbon reading 70,000 a day" },
  canismajor: { name: "Custos", fig: "DD", aspect: 1385 / 1136, alt: "Custos: the BlockP extension's panel with its blockers, timed unlock and partners, guarded by the corgi mascot, on a ribbon reading 20,000+ users" },
  draco: { name: "Claves", fig: "B", aspect: 1387 / 1134, alt: "Claves: a cloud linked to a code lock, an email approval with a wax seal, and a key with a padlock" },
  libra: { name: "Categoriae", fig: "H", aspect: 1383 / 1137, alt: "Categoriae: website cards filed into a cabinet of labelled drawers, a balance scale beside them" },
  perseus: { name: "Velum", fig: "W", aspect: 1377 / 1142, veil: "Scanned and veiled as it scrolls into view, the way BlockP blurs an image on the user's own device.",
    alt: "Velum: a laptop showing a gallery in which one picture is veiled by mist, a shield with a tick, the corgi peeking over it" },
  sextans: { name: "Mensura", fig: "VV", aspect: 1382 / 1138, alt: "Mensura: a funnel narrowing in coloured bands, its stream splitting into two cards, A and B" },
};
export const plateAspect = (sky: Sky) => PLATES[sky].aspect;

export default function AtlasPlate({ sky }: { sky: Sky }) {
  const root = useRef<HTMLElement>(null);
  const figure = useRef<HTMLImageElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);
  const plate = PLATES[sky];

  useEffect(() => {
    if (prefersReducedMotion()) { gsap.set(figure.current, { opacity: 1 }); return; }
    const t = gsap.fromTo(figure.current, { opacity: 0 }, {
      opacity: 1, ease: "power1.inOut",
      scrollTrigger: { trigger: root.current, start: "top 75%", end: "center 55%", scrub: true },
    });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, []);

  // Hover, like the hero's paintings under the mouse: the card turns toward the pointer in
  // 3D, the coloured figure moves further than the paper so it floats above it, and a soft
  // light follows the pointer. Only with a mouse (and not with reduced motion).
  useEffect(() => {
    const el = card.current, fig = lift.current, light = glare.current;
    if (!el || !fig || !light || prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    const to = (target: Element, prop: string) => gsap.quickTo(target, prop, { duration: 0.7, ease: "power3.out" });
    const rotX = to(el, "rotationX"), rotY = to(el, "rotationY");
    const figX = to(fig, "x"), figY = to(fig, "y");
    gsap.set(el, { transformPerspective: 900 });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      rotY(px * 12); rotX(-py * 9);
      figX(px * 16); figY(py * 12);
      light.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
      light.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
    };
    const enter = () => {
      gsap.to(el, { scale: 1.025, duration: 0.6, ease: "power3.out" });
      gsap.to(fig, { scale: 1.04, duration: 0.6, ease: "power3.out" });
      gsap.to(light, { opacity: 1, duration: 0.4 });
    };
    const leave = () => {
      rotX(0); rotY(0); figX(0); figY(0);
      gsap.to(el, { scale: 1, duration: 0.8, ease: "power3.out" });
      gsap.to(fig, { scale: 1, duration: 0.8, ease: "power3.out" });
      gsap.to(light, { opacity: 0, duration: 0.5 });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      gsap.killTweensOf([el, fig, light]);
    };
  }, []);

  return (
    // At most 400 px tall (600 px for the wide 3:2 plates, ~490 px for Hevelius' squarer ones),
    // so every plate looks the same size whatever its shape.
    <figure ref={root} data-atlas-slot={sky} className="mx-auto w-full" style={{ maxWidth: Math.round(400 * plate.aspect) }}>
      {/* AtlasIntro flies this frame here from the chapter's opening grid. */}
      <div data-atlas-plate={sky} className="relative z-20 will-change-transform" style={{ aspectRatio: plate.aspect }}>
        {/* The card that turns under the mouse. */}
        <div ref={card} className="absolute inset-0 overflow-hidden bg-[#efe9db] shadow-[0_28px_60px_-28px_rgba(17,17,17,0.55)] transition-shadow duration-500 hover:shadow-[0_44px_80px_-30px_rgba(17,17,17,0.6)]">
          {/* The whole plate, faded to an old print. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/art/plates/${sky}.webp`} alt="" loading="lazy" decoding="async" draggable={false}
            className="absolute inset-0 h-full w-full select-none [filter:grayscale(1)_sepia(0.18)_contrast(0.78)_brightness(1.07)]" />
          {/* The figure itself, in its hand-painted colour, floating a little above the paper. */}
          <div ref={lift} className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={figure} src={`/art/plates/${sky}-figure.webp`} loading="lazy" decoding="async" draggable={false}
              alt={plate.alt}
              className="absolute inset-0 h-full w-full select-none opacity-0 [filter:drop-shadow(0_6px_8px_rgba(40,25,10,0.28))]" />
          </div>
          {/* The NudeNet plate: scanned and veiled in mist as it reaches the middle of the screen. */}
          {plate.veil && <LazyVeil src={`/art/plates/${sky}.webp`} trigger={root} card={card} />}
          {/* Lamp light on the paper, following the pointer. */}
          <div ref={glare} className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light [background:radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,248,230,0.75),rgba(255,248,230,0)_55%)]" />
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-3 font-display text-[11px] text-ink/55">
        <span className="font-semibold uppercase tracking-[0.22em] text-ink/75">Fig. {plate.fig} · {plate.name}</span>
        <span className="font-serif text-[14px] italic">after the star atlas of Johannes Hevelius, 1690</span>
        {plate.veil && <span className="mt-1 basis-full font-serif text-[14px] italic text-ink/70">{plate.veil}</span>}
      </figcaption>
    </figure>
  );
}
