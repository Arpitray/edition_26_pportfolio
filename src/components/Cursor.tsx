"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/scroll";



const INK = "17,17,17", PAPER = "231,228,218";
const SPACING = 88;        // px moved between the stars it leaves
const FADE = 0.008;        // life lost per frame (about two seconds)

type Star = { x: number; y: number; r: number; life: number; light: boolean };

/** A small engraved star: four long points, four short ones, pinched between. */
function drawStar(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, edge?: string, edgeW = 1.5) {
  g.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2;
    const rr = k % 4 === 0 ? r : k % 4 === 2 ? r * 0.45 : r * 0.18;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  if (edge) { g.strokeStyle = edge; g.lineWidth = edgeW; g.lineJoin = "round"; g.stroke(); }
  g.fillStyle = color;
  g.fill();
}

export default function Cursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const canvas = ref.current!, g = canvas.getContext("2d")!;
    const trail = !prefersReducedMotion();
    document.documentElement.classList.add("star-cursor");

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };
    let x = -100, y = -100, shown = false, over = false, light = false, dirty = true, frame = 0;
    const stars: Star[] = [];
    let last: Star | null = null;
    size();
    window.addEventListener("resize", size);

    /**
     * Is the pointer over something dark (the night, or a painting)? Then draw in paper. The
     * first coloured layer under the pointer decides (skipping the fixed header and the like).
     */
    const darkAt = (px: number, py: number) => {
      for (const el of document.elementsFromPoint(px, py)) {
        if (el.matches(".bg-night, [data-dark]")) return true;
        if (el.matches(".bg-paper, .loader, [data-light]")) return false;
      }
      return false;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY; shown = true; dirty = true;
      light = darkAt(x, y);
      if (trail && (!last || Math.hypot(x - last.x, y - last.y) > SPACING)) {
        last = { x, y, r: 5 + Math.random() * 4, life: 1, light };
        stars.push(last);
      }
      kick();
    };
    const hover = (e: PointerEvent) => {
      const live = !!(e.target as Element | null)?.closest("a, button, [role='button'], label, summary, input, textarea, select");
      if (live !== over) { over = live; dirty = true; kick(); }
    };
    const leave = () => { shown = false; dirty = true; kick(); };
    // The page scrolls under a still pointer: what is under it may change from night to paper.
    const scroll = () => { if (shown) { light = darkAt(x, y); dirty = true; kick(); } };

    const draw = () => {
      frame = 0;
      for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].life -= FADE;
        if (stars[i].life <= 0) { stars.splice(i, 1); if (stars.length === 0) last = null; }
      }
      g.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const col = (on: boolean, a: number) => `rgba(${on ? PAPER : INK},${a.toFixed(3)})`;
      // The constellation so far: fine lines between the stars, then the stars.
      g.lineWidth = 1.4;
      for (let i = 1; i < stars.length; i++) {
        const a = stars[i - 1], b = stars[i];
        g.strokeStyle = col(b.light, Math.min(a.life, b.life) * 0.6);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      }
      if (shown && last) {
        // The line still being drawn, dotted, from the last star to the pointer.
        g.strokeStyle = col(light, 0.45 * last.life);
        g.lineWidth = 1.4;
        g.setLineDash([4, 5]);
        g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(x, y); g.stroke();
        g.setLineDash([]);
      }
      for (const s of stars) drawStar(g, s.x, s.y, s.r * (0.6 + 0.4 * s.life), col(s.light, s.life), col(!s.light, 0.25 * s.life));
      // The pointer itself.
      if (shown) {
        // Large enough to find at a glance, with a soft edge of the opposite colour.
        drawStar(g, x, y, over ? 27 : 19, col(light, 1), col(!light, 0.85), 2.6);
        if (over) { g.strokeStyle = col(light, 0.85); g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.stroke(); }
      }
      dirty = false;
      if (stars.length) kick();
    };
    // Draw only when something changed or the trail is still fading.
    const kick = () => { if (!frame && (dirty || stars.length)) frame = requestAnimationFrame(draw); };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", hover, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("star-cursor");
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", hover);
      window.removeEventListener("scroll", scroll);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[300] h-full w-full" />;
}
