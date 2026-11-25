"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isSimple, prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

export type AlsoItem = {
  name: string;
  text: string;
  /** The main tools, as a short line. */
  stack: string;
  /** Its repository. */
  link: string;
  /** A real engraving for it (public/art/also, from tools/make-also.mjs). */
  print: { src: string; alt: string; credit: string };
};

/*
 * The smaller projects, each with an old engraving chosen for it (a gallery of shops for the
 * shop app, Dürer's perspective machine for the 3D one, and so on), laid out like a row of
 * prints in a collector's cabinet.
 *
 * As the row scrolls in, each print is pulled off the press one after another: the paper
 * shows first, the inked picture comes down it from the top while it settles from slightly
 * enlarged, then the plate mark presses in around it. While on screen each print drifts at its
 * own speed. On hover it tilts toward the pointer and comes up from faded sepia to full ink.
 *
 * Phones and tablets: the prints fade up once as they arrive, no scrubbing and no tilt.
 */
export default function AlsoBuilt({ heading, items }: { heading: string; items: AlsoItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const prints = gsap.utils.toArray<HTMLElement>("[data-print]");
      if (isSimple()) {
        prints.forEach((p) => gsap.fromTo(p, { opacity: 0, y: 24 }, {
          opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: p, start: "top 88%" },
        }));
        return;
      }

      // The press: one after another across the row, all scrubbed to the scroll.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 80%", end: "top 25%", scrub: 0.6 },
      });
      prints.forEach((p, i) => {
        const ink = p.querySelector("[data-ink]"), img = p.querySelector("[data-img]");
        const mark = p.querySelector("[data-mark]"), cap = p.querySelector("figcaption");
        const at = i * 0.18;
        tl.fromTo(p, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, at)
          .fromTo(ink, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power1.inOut" }, at + 0.1)
          .fromTo(img, { scale: 1.18 }, { scale: 1.06, duration: 0.6, ease: "power2.out" }, at + 0.1)
          .fromTo(mark, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }, at + 0.5)
          .fromTo(cap, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, at + 0.45);
      });

      // While on screen: each picture drifts inside its frame at its own speed.
      prints.forEach((p, i) => {
        gsap.fromTo(p.querySelector("[data-img]"), { yPercent: -3 - (i % 3) }, {
          yPercent: 3 + (i % 3), ease: "none",
          scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // Hover: tilt toward the pointer.
      prints.forEach((p) => {
        const card = p.querySelector<HTMLElement>("[data-card]")!;
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 14);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
        };
        const leave = () => { rx(0); ry(0); };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="border-t border-ink/15 py-16">
      <p className="mb-10 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-ink/60">{heading}</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-7">
        {items.map((it, i) => (
          <figure key={it.name} data-print className="group flex flex-col [perspective:900px]">
            <div data-card className="relative aspect-square bg-[#efe9db] p-[7%] shadow-[0_22px_44px_-26px_rgba(17,17,17,0.55)] transition-shadow duration-500 will-change-transform [transform-style:preserve-3d] hover:shadow-[0_34px_60px_-28px_rgba(17,17,17,0.6)]">
              {/* The plate mark: the faint ridge a copper plate presses into the paper. */}
              <div data-mark aria-hidden className="pointer-events-none absolute inset-[4.5%] border border-ink/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]" />
              <div data-ink className="relative h-full w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img data-img src={it.print.src} alt={it.print.alt} loading="lazy" decoding="async" draggable={false}
                  className="h-full w-full select-none object-cover mix-blend-multiply transition-[filter] duration-700 [filter:sepia(0.45)_contrast(0.9)_brightness(1.04)] group-hover:[filter:sepia(0.1)_contrast(1.12)_brightness(1)]" />
              </div>
            </div>
            {/* The tools, link and credit line up along the row, however long each text is. */}
            <figcaption className="mt-4 flex flex-1 flex-col">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/55">No. {i + 1}</p>
              <p className="mt-1 font-display text-[14px] font-semibold leading-tight text-ink">{it.name}</p>
              <p className="mt-1 font-display text-[13px] leading-snug text-ink/65">{it.text}</p>
              <div className="mt-auto pt-2">
                <p className="font-display text-[11px] font-semibold leading-snug text-ink/80">{it.stack}</p>
                <a href={it.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-full border border-ink/20 px-3 py-1 font-display text-[11px] text-ink hover:bg-ink hover:text-paper">
                  View on GitHub <span aria-hidden>↗</span>
                </a>
                <p className="mt-3 font-serif text-[13px] italic leading-snug text-ink/45">{it.print.credit}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
