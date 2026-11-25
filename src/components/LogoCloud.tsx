"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TOOL_ICONS, type ToolIcon } from "@/content/toolIcons";
import { isSimple } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/*
 * The Toolkit as a slow 3D cloud of logos (the same motion as WordCloud): each technology sits
 * at its own depth and drifts up at its own speed as the page scrolls; nearer ones are larger
 * and darker, farther ones smaller and fainter. Logos are thin ink outlines with no brand
 * colours; hover fills one with ink. Logos from Simple Icons (tools/fetch-icons.mjs).
 */
export default function LogoCloud({ items, also }: { items: { name: string; icon: ToolIcon }[]; also?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Phones and tablets: a still grid that fades in as it arrives, no drift.
      if (isSimple()) {
        gsap.fromTo("[data-depth]", { opacity: 0, y: 16 }, {
          opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.03,
          scrollTrigger: { trigger: ref.current, start: "top 80%" },
        });
        return;
      }
      gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
        const depth = Number(el.dataset.depth);
        gsap.fromTo(el, { y: 160 * depth }, {
          y: -160 * depth, ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  // A zig-zag: every other column sits half a row lower, so the logos interlock and fill the
  // space instead of standing in straight columns with wide gaps (desktop; phones and
  // tablets get a plain grid).
  const zigzag = (i: number, cols: number) => {
    const col = i % cols, row = Math.floor(i / cols), rows = Math.ceil(items.length / cols);
    const rowH = 92 / (rows + 0.5);
    return {
      // Each column is 100/cols wide; a little nudge (0..1%) so it does not look ruled, and the
      // last column (85% + 15% wide) still ends inside.
      left: col * (100 / cols) + ((i * 7) % 2),
      top: row * rowH + (col % 2 ? rowH / 2 : 0) + ((i * 5) % 3),
    };
  };
  return (
    <>
      {/* overflow-x-clip: nothing may ever widen the page sideways (clip, unlike hidden,
          keeps the vertical drift and makes no scroll box). */}
      {/* Phones and tablets: an ordinary grid instead (3 or 4 across), all at full strength. */}
      <div ref={ref} className="relative h-[86vh] overflow-x-clip simple:grid simple:h-auto simple:grid-cols-3 simple:gap-x-4 simple:gap-y-10 simple:pt-10 sm:simple:grid-cols-4 md:simple:grid-cols-6">
        {items.map((t, i) => {
          // Deterministic (no Math.random), so server and browser render the same.
          const depth = 0.3 + ((i * 37) % 10) / 10;
          const wide = zigzag(i, 6);
          const size = 34 + depth * 42;
          return (
            <div key={t.name} data-depth={depth}
              className="group absolute left-[var(--wl)] top-[var(--wt)] flex w-[15%] flex-col items-start gap-2 opacity-[var(--o)] simple:static simple:w-auto simple:items-center simple:text-center simple:opacity-100"
              style={{
                "--wl": `${wide.left}%`, "--wt": `${wide.top}%`, "--o": 0.35 + depth * 0.55,
                "--sz": `clamp(${Math.round(size * 0.6)}px, ${(size / 14).toFixed(2)}vw, ${Math.round(size)}px)`,
              } as React.CSSProperties}>
              <svg viewBox="-1 -1 26 26" aria-hidden className="h-auto w-[var(--sz)] text-ink transition-transform duration-500 ease-out group-hover:scale-110 simple:w-11">
                <path d={TOOL_ICONS[t.icon]} fill="currentColor" fillRule="evenodd" stroke="currentColor" strokeWidth={1}
                  vectorEffect="non-scaling-stroke" strokeLinejoin="round"
                  className="[fill-opacity:0] transition-[fill-opacity] duration-500 group-hover:[fill-opacity:1]" />
              </svg>
              <span className="font-display text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-ink md:text-[10px]">{t.name}</span>
            </div>
          );
        })}
      </div>
      {also && also.length > 0 && (
        <p className="mt-4 font-serif text-[18px] italic text-ink/70">Also: {also.join(", ")}.</p>
      )}
    </>
  );
}
