"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Timeline } from "@/components/DepthScene";
import type { LayeredScene, LayerTimeline } from "@/components/LayerScene";
import { LazyDepthScene, LazyLayerScene } from "@/components/Scenes";
import { ramp } from "@/lib/anim";
import BurnEdge, { tearMask } from "@/components/BurnEdge";
import { prefersReducedMotion } from "@/lib/scroll";
import type { Art } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

/** Italic serif line whose first letter is set large, like an illuminated initial. */
export function Tagline({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`font-serif italic ${className}`}>
      <span className="swash">{text.charAt(0)}</span>
      {text.slice(1)}
    </span>
  );
}

/*
 * Each chapter's painting arrives as a silver line drawing that fills in with colour as it
 * scrolls into view (the same hand-over as the hero), then the camera slowly moves in while
 * it is pinned. The mouse turns it in 3D the whole time.
 */
const openerTimeline: Timeline = (p, entry) => ({
  dolly: p * 0.12,
  mix: 0,
  etch: 1 - ramp(entry, 0.3, 0.95),
  flash: 0,
});
/** The same, without the silver drawing: the painting is in colour from the start. */
const plainTimeline: Timeline = (p) => ({ dolly: p * 0.12, mix: 0, etch: 0, flash: 0 });
/** A layered chapter painting: its pieces come apart while it is pinned, in colour throughout. */
const layeredTimeline: LayerTimeline = (p) => ({ dolly: p * 0.12, detach: ramp(p, 0.08, 0.95), mix: 0, etch: 0, flash: 0 });
const NO_FLASH = { layer: 0, u: 0.5, v: 0.5 };
/**
 * Full-screen painted chapter opener: the painting in 3D, pinned while the giant title rises
 * over it. Burnt, torn edges join it to the sections before and after, so no boundary is a
 * straight line. `from` is what comes before it: a plain colour (paper, night), which is torn
 * over the top of the painting, or "image" (another painting), in which case this painting is
 * itself torn along the top and slides up under the one before, so there is a single tear.
 */
export function ChapterOpener({ title, tagline, art, scene, blurNote, from = "var(--color-paper)", seed = 11, drawn = true }: {
  title: string; tagline: string; from?: string; seed?: number;
  /** The painting: one picture with a depth map (`art`), or layers that come apart (`scene`). */
  art?: Art; scene?: LayeredScene;
  /** false: no silver line drawing on the way in (single pictures only). */
  drawn?: boolean;
  /**
   * The painting arrives under the blur(24px) BlockP puts on an image until its on-device
   * model has checked it, and the blur lifts as it scrolls in. This short line, in a corner,
   * says so while it is blurred.
   */
  blurNote?: string;
}) {
  const torn = from === "image";
  const wrap = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const painting = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const blurred = !!blurNote;

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Phones: the opener is a short, unpinned picture, so the title arrives while it comes
      // into view instead of after it has started to leave.
      const phone = window.matchMedia("(max-width: 767px)").matches;
      gsap.fromTo(heading.current, { yPercent: 40, opacity: 0 }, {
        yPercent: -10, opacity: 1, ease: "power2.out",
        scrollTrigger: phone
          ? { trigger: wrap.current, start: "top 85%", end: "top 30%", scrub: true }
          : { trigger: wrap.current, start: blurred ? "10% top" : "top 60%", end: blurred ? "45% top" : "35% top", scrub: true },
      });
      if (blurred && !prefersReducedMotion()) {
        // Scaled up a touch while blurred, so the soft edges stay off screen.
        const lift = { trigger: wrap.current, start: "top 45%", end: "12% top", scrub: true };
        gsap.fromTo(painting.current, { filter: "blur(24px)", scale: 1.08 }, { filter: "blur(0px)", scale: 1, ease: "power2.in", scrollTrigger: lift });
        gsap.fromTo(note.current, { autoAlpha: 1 }, { autoAlpha: 0, ease: "power1.in", scrollTrigger: { ...lift, start: "top 10%" } });
      }
    }, wrap);
    return () => ctx.revert();
  }, [blurred]);

  return (
    <div className="relative z-10" style={torn ? { marginTop: "calc(-1 * var(--tear-h))" } : undefined}>
    {/* Phones: a picture just over half the screen tall that scrolls by (no pin). */}
    <div ref={wrap} className="relative h-[200vh] simple:h-[140vh] max-md:h-auto!" style={torn ? tearMask(seed) : undefined}>
      <div className="sticky top-0 h-svh overflow-hidden bg-night max-md:relative max-md:h-[58svh]">
        <div ref={painting} className="absolute inset-0">
          <div className="absolute inset-0 simple:hidden">
            {scene ? (
              <LazyLayerScene background={scene.background} backgroundVideo={scene.backgroundVideo} layers={scene.layers} trigger={wrap}
                timeline={layeredTimeline} flashAt={NO_FLASH} portrait={scene.portrait} />
            ) : art && (
              <LazyDepthScene art={art} trigger={wrap} timeline={drawn ? openerTimeline : plainTimeline} />
            )}
          </div>
          {/* Phones and tablets: the painting as a plain image, cropped around its focus. */}
          {art && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art.color} alt={art.alt} loading="lazy" decoding="async"
              className="absolute inset-0 hidden h-full w-full object-cover simple:block"
              style={{ objectPosition: art.focus ? `${art.focus[0] * 100}% ${art.focus[1] * 100}%` : "50% 50%" }} />
          )}
          {art && <span className="sr-only simple:hidden">{art.alt}</span>}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        {blurNote && (
          <p ref={note} className="invisible absolute right-6 top-[14vh] max-w-[17rem] text-right font-serif text-[15px] italic leading-snug text-white/80 md:right-12">
            {blurNote}
          </p>
        )}
        <div ref={heading} className="absolute inset-x-6 bottom-[12vh] lg:left-[16rem] md:right-12 max-md:bottom-[calc(var(--tear-h)*0.6)]">
          <h2 className="font-display text-[clamp(64px,13vw,210px)] font-bold leading-[0.85] tracking-[-0.04em] text-white">{title}</h2>
          <p className="mt-6 max-w-3xl text-[clamp(22px,2.6vw,40px)] leading-[1.1] text-white">
            <Tagline text={tagline} />
          </p>
        </div>
      </div>
      {/* A plain section before it is torn over the top of the painting... */}
      {!torn && <BurnEdge side="top" color={from} seed={seed} />}
      {/* ...and the beige content burns its way in at the bottom. */}
      <BurnEdge side="bottom" color="var(--color-paper)" seed={seed + 5} />
    </div>
      {/* After a painting, this painting's own torn top is the edge that burns (drawn outside
          the mask, so its sparks can rise over the painting above). */}
      {torn && <BurnEdge side="top" seed={seed} />}
    </div>
  );
}

/** Fades and lifts its children in as they enter the screen. */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = gsap.fromTo(ref.current, { opacity: 0, y: 60 }, {
      opacity: 1, y: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 85%" },
    });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

/** One story beat: tagline, label and text on the left, its scroll visual on the right. */
export function Subsection({ tagline, label, body, visual, link, flip = false }: {
  tagline: string; label: string; body: string; visual?: React.ReactNode; link?: string;
  /** Visual on the left and text on the right (on wide screens), for alternating rows. */
  flip?: boolean;
}) {
  return (
    <article className="grid gap-6 py-[6vh] md:grid-cols-12 md:items-center md:gap-10 md:py-[14vh]">
      <Reveal className={`md:col-span-5 ${flip ? "md:order-2" : ""}`}>
        <h3 className="text-[clamp(34px,4vw,60px)] leading-[1.02] text-ink"><Tagline text={tagline} /></h3>
        <p className="mt-8 font-display text-[14px] font-semibold text-ink">{label}</p>
        <p className="mt-2 max-w-md font-serif text-[20px] leading-[1.25] text-ink/90">{body}</p>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 rounded-full border border-ink/20 px-3 py-1 font-display text-[11px] text-ink hover:bg-ink hover:text-paper">
            View on GitHub ↗
          </a>
        )}
      </Reveal>
      {visual && <div className={`md:col-span-7 ${flip ? "md:order-1" : ""}`}>{visual}</div>}
    </article>
  );
}

/** The dense two-column list that closes a chapter. */
export function FeatureList({ heading, items }: { heading: string; items: string[][] }) {
  return (
    <Reveal className="border-t border-ink/15 py-16">
      <p className="mb-8 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-ink/60">{heading}</p>
      <dl className="grid gap-x-12 gap-y-7 md:grid-cols-2">
        {items.map(([title, text]) => (
          <div key={title} className="grid grid-cols-[150px_1fr] gap-4">
            <dt className="font-display text-[13px] font-semibold leading-tight text-ink">{title}</dt>
            <dd className="font-display text-[13px] leading-snug text-ink/50">{text}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}
