"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { markReady, whenReady } from "@/lib/ready";
import { lockScroll, prefersReducedMotion } from "@/lib/scroll";

/*
 * The opening sheet: the site's paper with the name set small on it, and in the middle an
 * ember. As the page loads the ember scorches the paper and burns a small ragged hole through
 * it (the night of the hero shows through), its edge charred and glowing, the same burnt paper
 * that joins the sections further down. When everything is in, the burn races outward and
 * consumes the sheet, uncovering the hero.
 *
 * The burn is one small WebGL shader (no three.js, so it costs almost nothing to download, on
 * phones too). Before any script runs the sheet is already there with a faint warm scorch in
 * the middle (CSS), so the very first paint is right. It waits for the fonts and for the hero
 * to say it is ready (lib/ready.ts), and at least MIN_MS so it never just flickers. However
 * slow the connection, it opens only once the hero is ready; the hero reports ready even when a
 * picture fails or there is no WebGL. SAFETY_MS is only for a failure nothing reports (say the
 * scene's script never arrives), so the site can never stay locked behind the sheet. While it
 * is up the page cannot scroll (globals.css, and lockScroll for the smooth scrolling).
 */

const MIN_MS = 1400;
const SAFETY_MS = 45000;
// The burn's centre, as fractions of the screen from the left and the top.
const CENTRE = [0.5, 0.44];

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uC;      // centre, 0..1 from the left and the bottom
uniform float uR;     // the hole's radius, in short sides of the screen
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.07 + 1.3; a *= 0.5; }
  return v;
}

void main() {
  float s = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - uRes * uC) / s;

  // A ragged, organic burn front: distance from the centre, pushed in and out by warped
  // noise, more ragged as it grows (a small hole is roundish, a big one torn).
  vec2 q = p * 3.2;
  float n = fbm(q + 1.4 * fbm(q * 1.9 + 7.3));
  float d = length(p) + (n - 0.5) * (0.12 + uR * 0.45) + 0.02 * (noise(p * 40.0) - 0.5);
  float e = d - uR;                                   // < 0: burnt through

  // The paper: its colour, a fine grain, fibres, and a soft darkening toward the corners.
  vec2 px = gl_FragCoord.xy;
  vec3 paper = vec3(0.906, 0.894, 0.855);
  paper *= 0.985 + 0.03 * (hash(floor(px)) - 0.5) + 0.025 * (fbm(px / 90.0) - 0.5);
  vec2 v = gl_FragCoord.xy / uRes - 0.5;
  paper *= 1.0 - 0.13 * dot(v, v);

  // Toasted brown spreading out ahead of the edge, then a band of black char at the edge.
  float reach = 0.07 + uR * 0.22;
  float toast = 1.0 - smoothstep(0.0, reach, e + 0.02 * (fbm(p * 18.0) - 0.5));
  vec3 col = mix(paper, vec3(0.62, 0.42, 0.2), pow(toast, 1.6) * 0.75);
  float charW = 0.016 + uR * 0.03;
  float charr = 1.0 - smoothstep(0.0, charW, e + 0.006 * (noise(p * 60.0) - 0.5));
  col = mix(col, vec3(0.09, 0.055, 0.035), charr);

  // Embers along the very edge: a thin glowing line, brighter in flickering hot spots.
  float rim = exp(-abs(e) * (150.0 - uR * 60.0));
  float hot = smoothstep(0.42, 0.85, noise(p * 24.0 + vec2(uTime * 0.5, -uTime * 0.35)));
  float flick = 0.55 + 0.45 * noise(vec2(atan(p.y, p.x) * 5.0, uTime * 2.4));
  vec3 ember = mix(vec3(0.95, 0.32, 0.05), vec3(1.0, 0.78, 0.35), hot);
  float glow = rim * flick * (0.45 + 1.5 * hot);
  col += ember * glow;

  // The hole itself is transparent (the page shows through); the glow spills a little into it.
  float sheet = smoothstep(-0.003, 0.003, e);
  gl_FragColor = vec4(col, clamp(max(sheet, glow * 0.85), 0.0, 1.0));
}`;

/** Sets up the burn on the canvas; returns a draw(radius) function, or null without WebGL. */
function burnRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src); gl.compileShader(sh);
    return sh;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u("uRes"), uC = u("uC"), uR = u("uR"), uTime = u("uTime");

  const size = () => {
    // Capped resolution: the burn is soft, so it does not need every pixel of a 3x phone.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  window.addEventListener("resize", size);
  const t0 = performance.now();
  return {
    draw(r: number) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uC, CENTRE[0], 1 - CENTRE[1]);
      gl.uniform1f(uR, r);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { window.removeEventListener("resize", size); gl.getExtension("WEBGL_lose_context")?.loseContext(); },
  };
}

export default function Loader() {
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // Always open at the top of the story (the hero), not where a reload left off.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    lockScroll(true);

    const reduced = prefersReducedMotion();
    const canvas = el.querySelector("canvas")!;
    const count = el.querySelector<HTMLSpanElement>("[data-count]")!;
    const burn = reduced ? null : burnRenderer(canvas);

    // While loading, the hole only grows to a small burn; it never claims to be done.
    const radius = (p: number) => -0.035 + p * 0.115;

    let fonts = false, hero = false;
    document.fonts.ready.then(() => { fonts = true; });
    whenReady("hero").then(() => { hero = true; });

    const t0 = performance.now();
    let shown = 0, finished = false;
    const tick = () => {
      const t = performance.now() - t0;
      const ready = (fonts && hero && t > MIN_MS) || t > SAFETY_MS;
      // Each thing that has arrived counts; time fills in slowly toward (never past) 90%.
      const real = 0.15 + (fonts ? 0.2 : 0) + (hero ? 0.6 : 0);
      const creep = Math.min(0.9, real + 0.2 * (1 - Math.exp(-t / 2500)));
      const target = ready ? 1 : Math.max(shown, real, creep);
      shown += (target - shown) * (ready ? 0.12 : 0.05);
      if (ready && shown > 0.995) shown = 1;
      burn?.draw(radius(shown));
      // Once the canvas has drawn the whole sheet (paper and burn), the CSS sheet steps back.
      if (burn && !el.classList.contains("loader-live")) el.classList.add("loader-live");
      count.textContent = String(Math.round(shown * 100)).padStart(2, "0");
      if (shown === 1 && !finished) { finished = true; leave(); }
    };
    gsap.ticker.add(tick);

    const leave = () => {
      gsap.ticker.remove(tick);
      // The rest of the page's 3D scenes may start loading now (components/Scenes.tsx).
      markReady("intro");
      const done = () => { burn?.dispose(); lockScroll(false); setGone(true); };
      if (!burn) { gsap.to(el, { autoAlpha: 0, duration: 0.5, delay: 0.1, onComplete: done }); return; }
      // The burn races outward and eats the sheet; the name goes as the fire reaches it.
      const fire = { r: radius(1) };
      gsap.timeline({ onComplete: done })
        .to(fire, { r: 1.45, duration: 1.5, ease: "power2.in", onUpdate: () => burn.draw(fire.r) })
        .to(el.querySelector("[data-title]"), { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0.45)
        // Unlock while it burns, so the page is live by the time it is uncovered.
        .add(() => lockScroll(false), 0.9);
    };

    return () => { gsap.ticker.remove(tick); burn?.dispose(); lockScroll(false); markReady("intro"); };
  }, []);

  if (gone) return null;
  return (
    <div ref={root} id="loader" role="status" aria-live="polite" aria-label="Loading"
      className="loader fixed inset-0 z-[200] text-ink">
      <canvas aria-hidden className="absolute inset-0 h-full w-full" />
      <div data-title className="absolute inset-x-0 top-[66%] flex flex-col items-center gap-2 px-6 text-center">
        <p className="font-display text-[15px] font-semibold leading-none tracking-[-0.01em]">Arpit Ray</p>
        <p className="font-display text-[10px] uppercase tracking-[0.24em] text-ink/55">
          Edition ’26 · <span data-count className="tabular-nums">00</span>
        </p>
      </div>
    </div>
  );
}
