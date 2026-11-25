"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tagline } from "@/components/Chapter";
import { isSimple, prefersReducedMotion } from "@/lib/scroll";
import type { education as Education } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/*
 * Education, set like the opening of a book: the chapter title, the degree, the school, years
 * and grade on one quiet line, and the coursework as a table of contents (a
 * numeral, the group, a dotted leader, then the subjects). Beside it Dürer's Saint Jerome in
 * His Study, the classic picture of study, in the same print frame as the smaller projects.
 *
 * As it scrolls in: the contents lines come in one by one
 * with their leaders drawing across, and the print is pulled top-down like the others; on
 * hover it tilts and comes up to full ink. Phones and tablets: a plain fade-in.
 */
export default function EducationSection({ data }: { data: typeof Education }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]");

      if (isSimple()) {
        gsap.from("[data-fade]", { opacity: 0, y: 20, duration: 0.7, ease: "power2.out", stagger: 0.08, scrollTrigger: { trigger: root, start: "top 80%" } });
        return;
      }

      const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: "top 75%", end: "top 20%", scrub: 0.6 } });
      tl.from("[data-fade]", { opacity: 0, y: 40, stagger: 0.08, duration: 0.4 }, 0);
      rows.forEach((row, i) => {
        tl.from(row, { opacity: 0, x: -24, duration: 0.3 }, 0.3 + i * 0.1)
          .from(row.querySelector("[data-leader]"), { scaleX: 0, duration: 0.35, ease: "power1.out" }, 0.38 + i * 0.1);
      });
      // The print: pulled off the press, top down, then it drifts gently in its frame.
      tl.fromTo("[data-ink]", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power1.inOut" }, 0.1)
        .fromTo("[data-img]", { scale: 1.16 }, { scale: 1.05, duration: 0.8, ease: "power2.out" }, 0.1);
      gsap.fromTo("[data-img]", { yPercent: -2.5 }, {
        yPercent: 2.5, ease: "none", scrollTrigger: { trigger: "[data-card]", start: "top bottom", end: "bottom top", scrub: true },
      });

      // Hover: tilt toward the pointer.
      const card = root.querySelector<HTMLElement>("[data-card]")!;
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      card.addEventListener("pointerleave", () => { rx(0); ry(0); });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="grid gap-12 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-7">
        <h2 data-fade className="font-display text-[clamp(56px,10vw,160px)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">Education</h2>
        <p data-fade className="mt-8 text-[clamp(28px,3vw,44px)] leading-[1.05] text-ink"><Tagline text={data.degree} /></p>
        <p data-fade className="mt-3 font-display text-[14px] text-ink">
          <span className="font-semibold">{data.school}</span> · {data.years}
          <span className="text-ink/60"> · {data.score.label} {data.score.value.toFixed(1)}</span>
        </p>

        {/* Coursework, as a table of contents. */}
        <p data-fade className="mt-10 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/55">Coursework</p>
        <ol className="mt-4">
          {data.coursework.map((c, i) => (
            <li key={c.group} data-row className="flex items-baseline gap-3 border-b border-ink/10 py-3 max-sm:flex-wrap">
              <span className="w-8 shrink-0 font-serif text-[15px] italic text-ink/50">{ROMAN[i]}.</span>
              <span className="shrink-0 font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">{c.group}</span>
              <span data-leader aria-hidden className="mx-1 min-w-6 flex-1 origin-left translate-y-[-3px] border-b border-dotted border-ink/35 max-sm:hidden" />
              <span className="font-serif text-[19px] leading-snug text-ink/90 max-sm:basis-full max-sm:pl-11 sm:text-right">{c.subjects.join(" · ")}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Dürer's study, in the print frame used for the smaller projects. */}
      <figure data-fade className="group md:col-span-5 md:self-center [perspective:1000px]">
        <div data-card className="relative mx-auto aspect-[4/5] max-w-[440px] bg-[#efe9db] p-[6%] shadow-[0_28px_60px_-30px_rgba(17,17,17,0.6)] transition-shadow duration-500 will-change-transform [transform-style:preserve-3d] hover:shadow-[0_40px_80px_-30px_rgba(17,17,17,0.65)]">
          <div aria-hidden className="pointer-events-none absolute inset-[3.5%] border border-ink/25" />
          <div data-ink className="relative h-full w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-img src={data.print.src} alt={data.print.alt} loading="lazy" decoding="async" draggable={false}
              className="h-full w-full select-none object-cover mix-blend-multiply transition-[filter] duration-700 [filter:sepia(0.4)_contrast(0.92)_brightness(1.04)] group-hover:[filter:sepia(0.1)_contrast(1.1)_brightness(1)]" />
          </div>
        </div>
        <figcaption className="mx-auto mt-4 max-w-[440px] font-serif text-[14px] italic text-ink/55">{data.print.credit}</figcaption>
      </figure>
    </div>
  );
}
