"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tagline } from "@/components/Chapter";
import { isSimple, prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/** How each link is named (the keys are lower-case ids). */
const LABEL: Record<string, string> = { github: "GitHub", linkedin: "LinkedIn", site: "Website" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
/** A link's address without the protocol and "www.", as it is shown. */
const bare = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/*
 * The last chapter, on the paper over Cellarius's southern sky (1660), faded back like the
 * charts behind the other paper sections. The chart is live: on desktop the cursor is a
 * reading glass, a thin ring under which the chart comes up in full colour and a little
 * magnified, and the chart itself drifts slowly as the page scrolls.
 *
 * The words are set like the opening of a chapter in an old book: the title and the line, then
 * the address set large (click to write, or copy it) with where I am, and beside it the other
 * ways to reach me as a register, numbered, with dotted leaders (like the Education contents),
 * then the credits as a colophon.
 */
export default function Contact({ email, links, resume, tagline, note, credits, chart }: {
  email: string; links: Record<string, string>; resume: string; tagline: string;
  /** A short line under the address (where I am, what I am looking for). */
  note: string;
  credits: string;
  /** The star chart behind. */
  chart: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // The words come in; the register's leaders draw across, row by row.
      gsap.from("[data-rise]", {
        opacity: 0, y: 40, duration: 1.1, ease: "power3.out", stagger: 0.08,
        scrollTrigger: { trigger: root, start: "top 70%" },
      });
      gsap.utils.toArray<HTMLElement>("[data-row]").forEach((row, i) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 88%" }, delay: i * 0.08 });
        tl.from(row, { opacity: 0, x: -20, duration: 0.6, ease: "power3.out" })
          .from(row.querySelector("[data-leader]"), { scaleX: 0, duration: 0.7, ease: "power2.out" }, 0.15);
      });
      // The chart drifts slowly as the page scrolls.
      gsap.fromTo("[data-chart]", { yPercent: -4 }, {
        yPercent: 4, ease: "none", scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true },
      });

      // The reading glass (mouse only).
      if (isSimple()) return;
      const lens = root.querySelector<HTMLElement>("[data-lens]")!;
      const ring = root.querySelector<HTMLElement>("[data-ring]")!;
      const pos = { x: 0, y: 0, r: 0 };
      const apply = () => {
        lens.style.setProperty("--lx", `${pos.x}px`);
        lens.style.setProperty("--ly", `${pos.y}px`);
        lens.style.setProperty("--lr", `${pos.r}px`);
        ring.style.transform = `translate(${pos.x - pos.r}px, ${pos.y - pos.r}px)`;
        ring.style.width = ring.style.height = `${pos.r * 2}px`;
      };
      const R = () => Math.min(190, window.innerWidth * 0.13);
      const move = (e: PointerEvent) => {
        const b = root.getBoundingClientRect();
        gsap.to(pos, { x: e.clientX - b.left, y: e.clientY - b.top, r: R(), duration: 0.55, ease: "power3.out", overwrite: "auto", onUpdate: apply });
      };
      const leave = () => gsap.to(pos, { r: 0, duration: 0.5, ease: "power2.in", overwrite: "auto", onUpdate: apply });
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerleave", leave);
      return () => { root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", leave); };
    }, root);
    return () => ctx.revert();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* no clipboard access: the address is still a mailto link */ }
  };

  const register: { name: string; shown: string; href: string; download?: boolean }[] = [
    ...Object.entries(links).map(([k, href]) => ({ name: LABEL[k] ?? k, shown: bare(href), href })),
    { name: "Résumé", shown: "Download the PDF", href: resume, download: true },
  ];

  return (
    <section ref={ref} id="contact" className="relative overflow-hidden bg-paper px-6 pt-[14vh] lg:pl-[16rem] md:px-12">
      {/* The chart: faded back into the paper, and (desktop) clear under the reading glass. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div data-chart className="absolute inset-[-6%_0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chart} alt="" loading="lazy" draggable={false}
            className="h-full w-full select-none object-cover opacity-[0.3] mix-blend-multiply simple:opacity-[0.16] [filter:sepia(0.35)_saturate(0.75)_contrast(0.9)]" />
        </div>
        <div data-lens className="absolute inset-0 [--lr:0px] [--lx:50%] [--ly:50%] [mask-image:radial-gradient(circle_var(--lr)_at_var(--lx)_var(--ly),#000_0,#000_86%,transparent_100%)] [-webkit-mask-image:radial-gradient(circle_var(--lr)_at_var(--lx)_var(--ly),#000_0,#000_86%,transparent_100%)]">
          <div className="absolute inset-[-6%_0] [transform-origin:var(--lx)_var(--ly)] scale-[1.18]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chart} alt="" loading="lazy" draggable={false}
              className="h-full w-full select-none object-cover opacity-75 mix-blend-multiply [filter:saturate(1.05)_contrast(1.05)]" />
          </div>
        </div>
        {/* The glass's rim. */}
        <div data-ring className="absolute left-0 top-0 h-0 w-0 rounded-full border border-ink/40 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35),inset_0_0_0_3px_rgba(231,228,218,0.35)] simple:hidden" />
        {/* Fading into plain paper at the top and bottom, as the other charts do. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-paper)_0%,transparent_22%,transparent_80%,var(--color-paper)_100%)]" />
      </div>

      <div className="relative">
        <p data-rise className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/60">VI · Contact</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 data-rise className="font-display text-[clamp(64px,11vw,180px)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">Contact</h2>
          <p data-rise className="max-w-md pb-3 text-right text-[clamp(22px,2.2vw,34px)] leading-[1.1] text-ink max-md:text-left"><Tagline text={tagline} /></p>
        </div>

        <div className="mt-[10vh] grid gap-14 md:grid-cols-12 md:gap-10">
          {/* The address, set large. */}
          <div className="md:col-span-6">
            <p data-rise className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/60">Write to me</p>
            <a data-rise href={`mailto:${email}`}
              className="group relative mt-3 inline-block break-all font-display text-[clamp(28px,3.4vw,54px)] font-bold leading-tight tracking-[-0.03em] text-ink">
              {email}
              <span aria-hidden className="absolute -bottom-1 left-0 h-[2px] w-full bg-ink/20" />
              <span aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-full origin-left scale-x-0 bg-magenta transition-transform duration-500 ease-out group-hover:scale-x-100" />
            </a>
            <div data-rise className="mt-6 flex flex-wrap items-center gap-4">
              <button type="button" onClick={copy} aria-live="polite"
                className="rounded-full border border-ink/25 bg-paper/70 px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-paper">
                {copied ? "Copied ✓" : "Copy address"}
              </button>
              <a href={`mailto:${email}`} className="rounded-full bg-magenta px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-85">Write now</a>
            </div>
            <p data-rise className="mt-8 max-w-md font-serif text-[clamp(19px,1.6vw,23px)] italic leading-snug text-ink/85">{note}</p>
          </div>

          {/* The register: the other ways to reach me. */}
          <div className="md:col-span-6 md:pt-1">
            <p data-rise className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/60">Elsewhere</p>
            <ol className="mt-3">
              {register.map((r, i) => (
                <li key={r.name} data-row>
                  <a href={r.href} {...(r.download ? { download: true } : { target: "_blank", rel: "noreferrer" })}
                    className="group flex items-baseline gap-3 border-b border-ink/12 py-3.5 max-sm:flex-wrap">
                    <span className="w-8 shrink-0 font-serif text-[15px] italic text-ink/50">{ROMAN[i]}.</span>
                    <span className="shrink-0 font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-ink">{r.name}</span>
                    <span data-leader aria-hidden className="mx-1 min-w-6 flex-1 origin-left translate-y-[-3px] border-b border-dotted border-ink/35 max-sm:hidden" />
                    <span className="truncate font-serif text-[18px] text-ink/85 transition-colors group-hover:text-magenta max-sm:order-3 max-sm:basis-full max-sm:pl-11">{r.shown}</span>
                    <span aria-hidden className="font-display text-[13px] text-ink/60 max-sm:ml-auto transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-magenta">{r.download ? "↓" : "↗"}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* The colophon. */}
        <footer className="mt-[14vh] flex flex-col gap-3 border-t border-ink/15 pb-10 pt-6 font-display text-[12px] text-ink/65 md:flex-row md:justify-between md:gap-10">
          <p className="max-w-4xl leading-relaxed">{credits}</p>
          <p className="shrink-0">© 2026 Arpit Ray</p>
        </footer>
      </div>
    </section>
  );
}
