"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, isSimple } from "@/lib/scroll";
import { Tagline } from "@/components/Chapter";
import ChartBackdrop from "@/components/ChartBackdrop";
import { plateAspect, type Sky } from "@/components/AtlasPlate";

gsap.registerPlugin(ScrollTrigger);

/*
 * The Projects chapter's opening: on the beige paper, the title and the four star-atlas
 * plates laid out two by two. Each plate goes to its own project, one at a time: when a
 * project's write-up scrolls into view, its plate travels from the grid (or, once the grid
 * has scrolled away, from just above the screen) down into its place beside the text,
 * growing to full size on the way. The others wait until their project comes.
 *
 * The plates themselves live in the write-ups (AtlasPlate, [data-atlas-plate]); this moves
 * them with a transform from their grid cell ([data-atlas-cell]) to their own spot
 * ([data-atlas-slot]), measured live so it holds on any screen size and in both directions.
 */

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * `title`: a chapter title on the left with the grid on the right (Projects). Without one,
 * the line sits above a wider grid of `cols` columns (NovaFocus, after its painting).
 */
export default function AtlasIntro({ title, tagline, plates, cols = 2, backdrop }: {
  title?: string; tagline: string; plates: Sky[]; cols?: 2 | 3;
  /** A star chart laid faintly behind the grid, fading into the paper at the top and bottom. */
  backdrop?: { src: string; alt: string };
}) {
  const wrap = useRef<HTMLDivElement>(null);

  // The plates load lazily (they sit far down the page), but on desktop they fly in from this
  // grid long before their own place is near, so fetch them as soon as the grid comes within
  // a screen and a half.
  useEffect(() => {
    const el = wrap.current;
    if (!el || isSimple()) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      plates.forEach((sky) => document.querySelectorAll<HTMLImageElement>(`[data-atlas-plate="${sky}"] img`)
        .forEach((img) => { img.loading = "eager"; }));
    }, { rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [plates]);

  useEffect(() => {
    const el = wrap.current;
    // Phones and tablets: no grid and no journey; the plates simply sit in their places.
    if (!el || prefersReducedMotion() || isSimple()) return;
    const items = plates.map((sky) => ({
      cell: el.querySelector<HTMLElement>(`[data-atlas-cell="${sky}"]`),
      plate: document.querySelector<HTMLElement>(`[data-atlas-plate="${sky}"]`),
      slot: document.querySelector<HTMLElement>(`[data-atlas-slot="${sky}"]`),
    }));
    if (items.some((it) => !it.cell || !it.plate || !it.slot)) return;

    const place = () => {
      const vh = window.innerHeight;
      for (const it of items) {
        const c = it.cell!.getBoundingClientRect(), s = it.slot!.getBoundingClientRect();
        if (!s.width) continue;
        // Its journey runs while its place rises from the bottom of the screen to a
        // quarter of the way down it.
        const raw = clamp01((vh - s.top) / (vh * 0.75));
        if (raw >= 1) { gsap.set(it.plate, { x: 0, y: 0, scale: 1, opacity: 1 }); continue; }
        const t = ease(raw);
        // It travels from its grid cell to its place, growing as it goes. Once the grid has
        // gone up off the screen, it sets off from just above the top edge instead (so it
        // comes down into view at once rather than rushing from far above), in its own
        // column, left or right, so it comes straight down rather than across the text.
        const k = c.width / s.width;
        const h = it.plate!.offsetHeight * k;
        const fromTop = Math.max(c.top, -h - 16);
        // Moving the starting point into its own column happens gradually, over the first
        // 240 px after the grid cell has left the screen: a plate still on its way then
        // drifts across smoothly instead of jumping sideways in one frame.
        const away = clamp01(-c.bottom / 240);
        const fromLeft = c.left + (s.left - c.left) * away;
        const left = fromLeft + (s.left - fromLeft) * t;
        const top = fromTop + (s.top - fromTop) * t;
        gsap.set(it.plate, { x: left - s.left, y: top - s.top, scale: k + (1 - k) * t, opacity: 1, transformOrigin: "0 0" });
      }
    };

    const st = ScrollTrigger.create({
      trigger: el, start: "top bottom",
      endTrigger: items[items.length - 1].slot!, end: "bottom top",
      onUpdate: place, onRefresh: place,
    });
    place();
    return () => {
      st.kill();
      items.forEach((it) => gsap.set(it.plate, { clearProps: "transform,opacity" }));
    };
  }, [plates]);

  // Behind everything: the chart, faded into the paper (ChartBackdrop).
  const chart = backdrop && <ChartBackdrop src={backdrop.src} />;
  const cells = plates.map((sky) => (
    <div key={sky} data-atlas-cell={sky} style={{ aspectRatio: plateAspect(sky) }} />
  ));

  if (!title) return (
    <div ref={wrap} className="relative flex min-h-svh flex-col justify-center gap-8 bg-paper px-6 py-[10vh] lg:pl-[16rem] md:pr-12 simple:min-h-0 simple:pb-0">
      {chart}
      <p className="relative text-[clamp(22px,2.4vw,38px)] leading-[1.1] text-ink"><Tagline text={tagline} /></p>
      {/* The places the plates start from (the plates are drawn over them). */}
      <div className={`relative grid w-full max-w-[min(100%,128vh)] grid-cols-2 gap-[1.4vw] motion-reduce:hidden simple:hidden portrait:gap-3 ${cols === 3 ? "landscape:grid-cols-3" : ""}`}>
        {cells}
      </div>
    </div>
  );

  return (
    <div ref={wrap} className="relative h-svh min-h-[560px] bg-paper simple:h-auto simple:min-h-0 simple:px-6 simple:pt-[14vh] md:simple:px-12">
      {chart}
      {/* Title and line, on the left (above the grid on a tall screen; on phones and tablets,
          simply at the top of the section, with no grid). */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 lg:left-[16rem] portrait:top-[9vh] portrait:translate-y-0 simple:relative simple:left-auto simple:top-auto simple:translate-y-0 lg:simple:pl-[16rem]">
        <h2 className="font-display text-[clamp(56px,7.5vw,132px)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">{title}</h2>
        <p className="mt-5 max-w-md text-[clamp(22px,2.4vw,38px)] leading-[1.1] text-ink"><Tagline text={tagline} /></p>
      </div>
      {/* The four places the plates start from (the plates are drawn over them). */}
      <div className="absolute right-6 top-1/2 grid w-[min(48vw,112vh)] -translate-y-1/2 grid-cols-2 gap-[1.6vw] motion-reduce:hidden simple:hidden md:right-12 portrait:left-6 portrait:right-6 portrait:top-auto portrait:bottom-[10vh] portrait:w-auto portrait:translate-y-0 portrait:gap-3">
        {cells}
      </div>
    </div>
  );
}
