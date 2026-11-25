"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** 0..1 progress of an element travelling through the screen, for scroll-scrubbed visuals. */
function useScrub<T extends HTMLElement>(start = "top 80%", end = "bottom 40%") {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const st = ScrollTrigger.create({ trigger: ref.current, start, end, scrub: true, onUpdate: (s) => setProgress(s.progress) });
    return () => st.kill();
  }, [start, end]);
  return [ref, progress] as const;
}

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-[28px] bg-[#d8d4c8] p-8 ${className}`}>{children}</div>
);

/** Words at different depths that drift at different speeds, like a slow 3D cloud. */
export function WordCloud({ words, tall = false }: { words: string[]; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
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
  return (
    // overflow-x-clip: long words near the right edge must never widen the page sideways
    // (clip, unlike hidden, makes no scroll box and keeps the vertical drift).
    <div ref={ref} className={`relative overflow-x-clip ${tall ? "h-[90vh]" : "h-[60vh]"}`}>
      {words.map((word, i) => {
        // One cell per word in a 3-column grid, nudged inside its cell, so words never
        // collide. Deterministic (no Math.random), so server and browser render the same.
        const depth = 0.3 + ((i * 37) % 10) / 10;
        const rows = Math.ceil(words.length / 3);
        const left = (i % 3) * 33 + ((i * 7) % 9);
        const top = (Math.floor(i / 3) / rows) * 92 + ((i * 5) % 4);
        return (
          <span key={word} data-depth={depth}
            className="absolute whitespace-nowrap font-serif italic text-ink"
            style={{ left: `${left}%`, top: `${top}%`, fontSize: `${12 + depth * 22}px`, opacity: 0.25 + depth * 0.6 }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

/** A page being read: matched words light up one by one and the score climbs to the threshold. */
export function ScoreMeter() {
  const [ref, p] = useScrub<HTMLDivElement>();
  const words = ["erotic", "nsfw", "nude", "sexy"];
  const lit = Math.floor(p * (words.length + 1));
  return (
    <div ref={ref}><Panel>
      <p className="font-display text-[12px] text-ink/60">vimeo.com/showcase/…  ·  JSON-LD video titles</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {words.map((w, i) => (
          <span key={w} className={`rounded-full px-3 py-1 font-display text-[13px] transition-all duration-300 ${i < lit ? "bg-magenta text-white" : "bg-white/60 text-ink/30"}`}>{w}</span>
        ))}
      </div>
      <div className="mt-8 h-3 rounded-full bg-white/60">
        <div className="h-3 rounded-full bg-ink transition-[width] duration-300" style={{ width: `${Math.min(lit, 4) * 25}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-display text-[11px] text-ink/60">
        <span>{Math.min(lit, 4)} adult words</span><span>threshold: 3</span>
      </div>
      <p className={`mt-6 font-display text-[15px] font-semibold ${lit >= 3 ? "text-magenta" : "text-ink/40"}`}>{lit >= 3 ? "Page blocked" : "Checking…"}</p>
    </Panel></div>
  );
}

/** Where the spend went: storage writes against everything else (the measured 88%). */
export function CostBars() {
  const [ref, p] = useScrub<HTMLDivElement>();
  const bars = [
    { label: "Storage writes", value: 88, highlight: true },
    { label: "Everything else", value: 12, highlight: false },
  ];
  const grow = Math.min(1, p / 0.5);
  return (
    <div ref={ref}><Panel>
      <p className="font-display text-[12px] text-ink/60">Share of Cloudflare spend, before the fix</p>
      <div className="mt-8 flex h-64 items-end gap-8">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-display text-[13px] font-semibold text-ink">{Math.round(b.value * grow)}%</span>
            <div className={`w-full rounded-t-xl ${b.highlight ? "bg-magenta" : "bg-ink/70"}`} style={{ height: `${b.value * grow * 2.4}px` }} />
            <span className="text-center font-display text-[11px] text-ink/60">{b.label}</span>
          </div>
        ))}
      </div>
      <p className={`mt-6 font-display text-[13px] font-semibold transition-opacity duration-500 ${p > 0.7 ? "opacity-100" : "opacity-0"}`}>
        Cause found: a cache-revalidation setting. Fixed by changing the caching strategy.
      </p>
    </Panel></div>
  );
}

/** Headline numbers that count up as the panel scrolls into view, with a line of what is behind them. */
export function StatPanel({ stats, note }: { stats: { value: number; suffix: string; label: string }[]; note?: string }) {
  const [ref, p] = useScrub<HTMLDivElement>();
  const grow = Math.min(1, p / 0.5);
  return (
    <div ref={ref}><Panel>
      <div className="grid gap-8 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-display text-[clamp(56px,6.5vw,104px)] font-bold leading-none tracking-[-0.04em] text-ink">
              {Math.round(s.value * grow)}{s.suffix}
            </p>
            <p className="mt-3 font-display text-[12px] text-ink/60">{s.label}</p>
          </div>
        ))}
      </div>
      {note && (
        <p className={`mt-10 font-display text-[13px] font-semibold text-ink transition-opacity duration-500 ${p > 0.6 ? "opacity-100" : "opacity-0"}`}>{note}</p>
      )}
    </Panel></div>
  );
}

/** Onboarding-to-subscription funnel filling step by step. */
export function Funnel() {
  const [ref, p] = useScrub<HTMLDivElement>();
  const steps = ["Installed", "Onboarded", "Logged in", "Saw paywall", "Subscribed"];
  return (
    <div ref={ref}><Panel>
      <p className="font-display text-[12px] text-ink/60">Event funnel (shape only)</p>
      <div className="mt-6 space-y-3">
        {steps.map((s, i) => {
          const shown = p * steps.length > i;
          return (
            <div key={s} className="flex items-center gap-4">
              <span className="w-28 font-display text-[12px] text-ink">{s}</span>
              <div className="h-7 rounded-lg bg-ink transition-all duration-500" style={{ width: shown ? `${100 - i * 18}%` : "0%", opacity: 1 - i * 0.12 }} />
            </div>
          );
        })}
      </div>
    </Panel></div>
  );
}

/** A painting blurred until the scan line passes over it, as the on-device model does. */
export function ScanReveal({ src }: { src: string }) {
  const [ref, p] = useScrub<HTMLDivElement>();
  const line = Math.min(100, p * 120);
  return (
    <div ref={ref} className="relative aspect-[4/3] overflow-hidden rounded-[28px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 ${100 - line}% 0)` }} />
      <div className="absolute inset-x-0 h-[2px] bg-magenta shadow-[0_0_24px_4px_rgba(255,46,136,0.7)]" style={{ top: `${line}%` }} />
      <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 font-display text-[11px] text-white">ONNX · on-device · safe</span>
    </div>
  );
}

/** Interface cards that float in with a soft glow: partner approval and the code entry. */
export function GlowCards() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-card]", {
        y: 120, opacity: 0, rotate: (i) => (i ? 4 : -4), stagger: 0.15, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className="relative flex flex-col gap-6 md:flex-row">
      <div data-card className="glow flex-1 rounded-2xl bg-white p-6">
        <p className="font-display text-[13px] font-semibold text-ink">Your partner wants to turn off Adult Content Blocker</p>
        <div className="mt-5 flex gap-3">
          <span className="rounded-full bg-[#0076F4] px-5 py-2 font-display text-[13px] font-semibold text-white">Accept</span>
          <span className="rounded-full border-2 border-ink px-5 py-2 font-display text-[13px] font-semibold text-ink">Decline</span>
        </div>
      </div>
      <div data-card className="glow flex-1 rounded-2xl bg-white p-6">
        <p className="font-display text-[13px] font-semibold text-ink">Enter your unlock code</p>
        <div className="mt-5 flex gap-2">
          {"482913".split("").map((d, i) => (
            <span key={i} className="grid h-11 w-9 place-items-center rounded-lg border border-ink/15 font-display text-[18px] font-semibold text-ink">{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Numbers that count up once they come into view. */
export function Counter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const obj = { v: 0 };
    const t = gsap.to(obj, {
      v: value, duration: 1.8, ease: "power2.out", onUpdate: () => setShown(Math.round(obj.v)),
      scrollTrigger: { trigger: ref.current, start: "top 80%" },
    });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, [value]);
  return (
    <div ref={ref}>
      <p className="font-display text-[clamp(56px,8vw,120px)] font-bold leading-none tracking-[-0.04em] text-white">{shown}{suffix}</p>
      <p className="mt-2 font-serif text-[20px] italic text-white/70">{label}</p>
    </div>
  );
}
