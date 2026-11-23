"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

const W = 1440;          // drawing width (stretched to the screen width)
const H = 180;           // drawing height (the --tear-h CSS height)
const BASE = H / 2;      // where the tear runs, on average
const STEP = 3;          // spacing of the tear's points: small, for a fine ragged edge

/**
 * A torn edge as y values every STEP units: several layers of noise, from long wavy runs down
 * to fine zig-zags a few units long, plus the odd sharp notch where the paper tore unevenly.
 * Fixed by its seed, so the same tear is drawn on every render (and the mask that cuts the
 * page matches it exactly).
 */
export function tearLine(seed: number) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const count = Math.floor(W / STEP) + 1;
  const ys = new Array<number>(count).fill(BASE);

  // Smooth value noise per octave: random heights at knots, eased between them.
  const octaves: [number, number][] = [[520, 18], [210, 12], [80, 6], [30, 2.6], [11, 1.1]];
  for (const [wavelength, amplitude] of octaves) {
    const knots = Array.from({ length: Math.ceil(W / wavelength) + 2 }, () => rand() * 2 - 1);
    for (let i = 0; i < count; i++) {
      const x = (i * STEP) / wavelength;
      const k = Math.floor(x);
      const f = x - k;
      const e = f * f * (3 - 2 * f);
      ys[i] += (knots[k] + (knots[k + 1] - knots[k]) * e) * amplitude;
    }
  }
  // Fibre jitter and sharp notches.
  for (let i = 0; i < count; i++) {
    ys[i] += (rand() - 0.5) * 1.2;
    if (rand() < 0.006) {
      const depth = (rand() < 0.5 ? -1 : 1) * (4 + rand() * 9);
      const width = 4 + Math.floor(rand() * 6);
      for (let j = -width; j <= width; j++) {
        if (ys[i + j] !== undefined) ys[i + j] += depth * (1 - Math.abs(j) / (width + 1));
      }
    }
  }
  return ys.map((y) => Math.min(H - 8, Math.max(8, y)));
}

const toLine = (ys: number[]) => ys.map((y, i) => `${i ? "L" : "M"}${i * STEP} ${y.toFixed(1)}`).join(" ");

/** The area on one side of the tear (`below` = toward the bottom), padded past the edges. */
export function tearArea(ys: number[], below: boolean, pad = 40) {
  const edge = below ? H + pad : -pad;
  return `${toLine(ys)} L${W + pad} ${ys[ys.length - 1].toFixed(1)} L${W + pad} ${edge} L${-pad} ${edge} L${-pad} ${ys[0].toFixed(1)} Z`;
}

/**
 * CSS mask that keeps only what is below the tear in a section's top band (--tear-h tall) and
 * everything under it, so the section itself looks torn and the one above shows through.
 */
export function tearMask(seed: number): React.CSSProperties {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${tearArea(tearLine(seed), true, 0)}" fill="black"/></svg>`;
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}"), linear-gradient(#000, #000)`;
  const size = "100% var(--tear-h), 100% calc(100% - var(--tear-h) + 1px)";
  const position = "0 0, 0 calc(var(--tear-h) - 1px)";
  return {
    maskImage: image, WebkitMaskImage: image,
    maskSize: size, WebkitMaskSize: size,
    maskPosition: position, WebkitMaskPosition: position,
    maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
  };
}

// A few sparks along the edge: where (0..1 across), how fast they rise, how big.
const sparksFor = (seed: number) => {
  let s = seed * 7919 + 13;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 16 }, () => ({ u: rand(), speed: 0.5 + rand(), r: 0.8 + rand() * 1.3, phase: rand() }));
};

/**
 * A burnt, torn edge. The burnt sheet is the side holding `color` (or, with no colour, the
 * section below, cut by tearMask): it gets a charred band fading into it, a smouldering ember
 * line, grey ash fibres right on the edge and a few rising sparks. While it is on screen the
 * scroll deepens the char and the embers glow up and die down; the edge itself stays put, like
 * real paper.
 *
 * side="bottom": at the bottom of a section; `color` fills below the tear (the next section).
 * side="top":    at the top of a section; `color` fills above the tear (the previous section),
 *                or, without `color`, the section below is the torn sheet (see tearMask).
 */
export default function BurnEdge({ side = "bottom", color, seed = 11 }: { side?: "top" | "bottom"; color?: string; seed?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const char = useRef<SVGPathElement>(null);
  const ember = useRef<SVGPathElement>(null);
  const sparks = useRef<SVGGElement>(null);
  const id = useId().replace(/:/g, "");

  // Which side of the tear is the burnt sheet.
  const burntBelow = side === "bottom" || !color;
  const ys = useMemo(() => tearLine(seed), [seed]);
  const line = useMemo(() => toLine(ys), [ys]);
  const sparkList = useMemo(() => sparksFor(seed), [seed]);

  useEffect(() => {
    const edgeY = (u: number) => ys[Math.min(ys.length - 1, Math.round((u * W) / STEP))];
    const draw = (t: number, time: number) => {
      // Char deepens as the edge crosses the screen; embers flare in the middle of the crossing.
      const heat = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const flicker = 0.75 + Math.sin(time * 7.3) * 0.12 + Math.sin(time * 19.1) * 0.08 + Math.sin(time * 3.1) * 0.05;
      char.current?.setAttribute("stroke-width", String(15 + t * 6));
      ember.current?.setAttribute("opacity", String((0.35 + heat * 0.55) * flicker));
      sparks.current?.querySelectorAll("circle").forEach((c, i) => {
        const sp = sparkList[i];
        const life = (time * 0.35 * sp.speed + sp.phase) % 1;
        const rise = life * 70 * sp.speed;
        c.setAttribute("cy", String(edgeY(sp.u) + (burntBelow ? -rise : rise)));
        c.setAttribute("cx", String(sp.u * W + Math.sin((time + sp.phase * 10) * 2) * 4));
        c.setAttribute("opacity", String(heat * (1 - life) * 0.9));
      });
    };

    let progress = 0.5;
    draw(progress, 0);
    if (prefersReducedMotion()) return;

    let frame = 0;
    let running = false;
    const start = performance.now();
    const loop = () => {
      if (!running) return;
      draw(progress, (performance.now() - start) / 1000);
      frame = requestAnimationFrame(loop);
    };
    const st = ScrollTrigger.create({
      trigger: wrap.current, start: "top bottom", end: "bottom top",
      onUpdate: (self) => { progress = self.progress; },
      onToggle: (self) => {
        running = self.isActive;
        cancelAnimationFrame(frame);
        if (running) loop();
      },
    });
    return () => { running = false; cancelAnimationFrame(frame); st.kill(); };
  }, [ys, burntBelow, sparkList]);

  const burnt = `burnt-${id}`;
  return (
    <div
      ref={wrap}
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-[var(--tear-h)] ${side === "bottom" ? "-bottom-px" : "-top-px"}`}
    >
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <clipPath id={burnt}><path d={tearArea(ys, burntBelow, 60)} /></clipPath>
          {/* Uneven scorch: wide soft bands pushed around by low noise, so the burn bites
              deeper in some places than others, as on real paper. */}
          <filter id={`scorch-${id}`} x="-2%" y="-150%" width="104%" height="400%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation="2.2" />
          </filter>
          <filter id={`char-${id}`} x="-2%" y="-150%" width="104%" height="400%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.12" numOctaves="3" seed={seed + 1} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation="0.6" />
          </filter>
          {/* Torn fibres right on the edge. */}
          <filter id={`fibre-${id}`} x="-2%" y="-150%" width="104%" height="400%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.12 0.7" numOctaves="2" seed={seed + 3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Ember: a glow, broken into short live stretches by noise. */}
          <filter id={`glow-${id}`} x="-2%" y="-300%" width="104%" height="700%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.5" numOctaves="2" seed={seed + 7} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  6 0 0 0 -3.2" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" result="e" />
            <feGaussianBlur in="e" stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="e" /></feMerge>
          </filter>
        </defs>

        {/* The sheet's own colour, when it is a plain section (paper, night). */}
        {color && <path d={tearArea(ys, burntBelow, 36)} style={{ fill: color }} />}

        <g clipPath={`url(#${burnt})`}>
          {/* Toasted paper: a thin warm-brown fade into the sheet. */}
          <path d={line} fill="none" stroke="#8a5a2b" strokeWidth="30" strokeLinejoin="round" opacity="0.4" filter={`url(#scorch-${id})`} />
          {/* Scorched brown. */}
          <path ref={char} d={line} fill="none" stroke="#3f220c" strokeWidth="16" strokeLinejoin="round" opacity="0.9" filter={`url(#scorch-${id})`} />
          {/* Charcoal: a narrow, crisp black band right at the edge. */}
          <path d={line} fill="none" stroke="#0f0703" strokeWidth="8" strokeLinejoin="round" filter={`url(#char-${id})`} />
          {/* The burnt rim itself: black, fibrous. */}
          <path d={line} fill="none" stroke="#050302" strokeWidth="3" strokeLinejoin="round" filter={`url(#fibre-${id})`} />
          {/* Smouldering embers, alive only in stretches. */}
          <path ref={ember} d={line} fill="none" stroke="#ff7a2c" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" filter={`url(#glow-${id})`} />
        </g>
        {/* A few grey ash fibres lifting off the edge. */}
        <path d={line} fill="none" stroke="#bfb6a8" strokeWidth="0.9" opacity="0.35" filter={`url(#fibre-${id})`} />
        {/* Sparks drifting off the burning edge. */}
        <g ref={sparks}>
          {sparkList.map((sp, i) => <circle key={i} r={sp.r} cx={sp.u * W} cy={BASE} fill="#ffb067" opacity="0" />)}
        </g>
      </svg>
    </div>
  );
}
