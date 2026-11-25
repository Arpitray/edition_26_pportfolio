"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";
import { veilRange } from "@/lib/anim";

gsap.registerPlugin(ScrollTrigger);

/*
 * The NudeNet plate's veil, drawn in WebGL over the card. The card arrives clear; when it
 * reaches the middle of the screen a fine golden scan line sweeps down it, as if BlockP's
 * on-device model were checking it, and behind the line the picture dissolves into a veil of
 * mist: a soft lens blur (a golden-angle spiral of samples), slowly swirling, warmed toward
 * the paper, with engraved-looking stipple and faint hatching so it still belongs to a 1690
 * plate. Scrolling back lifts it again. It renders only while the card is on screen.
 *
 * Desktop only: phones and tablets get a CSS blur instead (LazyVeil in Scenes.tsx).
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uScan;      // where the scan line is, 0 = top .. 1 = bottom (past 1: done)
  uniform float uTime;
  uniform float uAspect;    // width / height of the card
  uniform vec2 uRes;        // canvas size in pixels

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float fromTop = 1.0 - uv.y;

    // Mist that drifts and curls: a slow domain warp that also bends the picture a little.
    float t = uTime * 0.12;
    vec2 w = vec2(fbm(uv * 3.0 + vec2(t, -t * 0.7)), fbm(uv * 3.0 + vec2(5.2 - t * 0.8, 1.3 + t)));
    float mist = fbm(uv * 4.0 + w * 1.6 + t * 0.5);

    // The scan front is a natural, torn-paper edge (like the burnt, torn edges between the
    // site's sections): uneven teeth, each a different width and height with softened tips,
    // plus a fine fibrous tremor, as if the veil were a sheet torn by hand. edge(x) is its
    // offset (in card heights) at this column, fixed in time.
    float ph = uv.x * 15.0 + fbm(vec2(uv.x * 2.3, 3.7)) * 4.0;          // uneven spacing
    float tri = abs(fract(ph) - 0.5) * 2.0;                                  // 0..1..0 teeth
    tri = sqrt(tri * tri + 0.015);                                           // softened tips
    float amp = 0.008 + 0.017 * noise(vec2(uv.x * 6.0, 1.3));                // uneven heights
    float fibre = (noise(vec2(uv.x * 140.0, 7.1)) - 0.5) * 0.005
                + (noise(vec2(uv.x * 380.0, 2.9)) - 0.5) * 0.0025;
    float edge = (tri - 0.5) * amp * 2.0 + fibre;
    // Its local slope, to keep the line an even thickness on steep parts.
    float e2 = (abs(fract(ph + 0.01) - 0.5) * 2.0 - abs(fract(ph) - 0.5) * 2.0) * amp * 2.0 / 0.01 * 15.0;
    float thin = 1.0 / sqrt(1.0 + pow(e2 / uAspect, 2.0));

    // 1 where the front has passed (above it): it follows that torn edge, softened a little
    // by the mist, so the veil rolls in.
    float front = fromTop - edge + (mist - 0.5) * 0.02;
    // A short soft margin just inside the edge, so the gold line sits right on the edge.
    float veil = 1.0 - smoothstep(uScan - 0.022, uScan - 0.002, front);
    vec2 q = uv + veil * 0.018 * (w - 0.5);

    // Lens blur: samples on a golden-angle spiral (round, soft highlights), wider where the
    // mist is thicker.
    float radius = veil * (0.016 + 0.014 * mist);
    vec3 col = vec3(0.0);
    const int N = 40;
    for (int i = 0; i < N; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / float(N));
      float a = fi * 2.39996323;
      vec2 o = vec2(cos(a), sin(a) * uAspect) * r * radius;
      col += texture2D(uTex, q + o).rgb;
    }
    col /= float(N);

    // Warm haze toward the paper, brighter where the mist gathers.
    vec3 paper = vec3(0.93, 0.89, 0.81);
    col = mix(col, paper, veil * (0.18 + 0.32 * smoothstep(0.35, 0.8, mist)));

    // Engraved texture in the veil: stipple dots and faint diagonal hatching, like the way a
    // copperplate engraver draws mist.
    vec2 px = gl_FragCoord.xy;
    float stip = step(0.86, hash(floor(px / 1.6) + floor(uTime * 6.0)));
    float hatch = smoothstep(0.75, 1.0, sin((px.x + px.y) * 0.9));
    col *= 1.0 - veil * (0.07 * stip + 0.05 * hatch * smoothstep(0.45, 0.75, mist));

    // The scan line: one warm gold line along the torn edge, swelling and thinning like a
    // quill stroke, with a soft glow, a few gold sparks and a warm afterglow behind it. All
    // gone once the sweep is done.
    float lineOn = 1.0 - smoothstep(1.0, 1.08, uScan);
    float along = front;                              // the same edge the veil follows
    float d = abs(along - uScan) * thin;
    float stroke = 0.55 + 0.9 * noise(vec2(uv.x * 9.0, 4.4));              // quill pressure
    float line = exp(-d * d * 52000.0 / (stroke * stroke));
    float glow = 0.28 * exp(-d * 48.0);
    float spark = step(0.993, hash(floor(px / 2.0) + floor(uTime * 18.0))) * exp(-d * 30.0);
    float trail = (along < uScan ? 1.0 : 0.0) * exp(-(uScan - along) * 14.0) * 0.18;
    vec3 gold = vec3(1.0, 0.8, 0.42);
    vec3 deep = vec3(0.72, 0.48, 0.16);                                      // the stroke's core
    col = mix(col, gold, clamp((glow + spark * 1.5 + trail) * lineOn, 0.0, 1.0) * 0.85);
    col = mix(col, mix(gold, deep, 0.55), clamp(line * lineOn, 0.0, 1.0) * 0.95);

    float alpha = clamp(veil + (line + glow + spark) * lineOn, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function VeilCanvas({ src, trigger, card }: {
  /** The full-colour plate image. */
  src: string;
  /** The element whose scroll position drives the veil (the plate's place on the page). */
  trigger: React.RefObject<HTMLElement | null>;
  /** The card element (used by the CSS version on phones and tablets, in LazyVeil). */
  card: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = trigger.current, canvas = canvasRef.current;
    if (!el || !canvas || prefersReducedMotion()) return;
    // The scan reaches the bottom at 85% of the range; the veil then holds.
    const range = veilRange(el);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false, antialias: false });
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uScan: { value: -0.1 }, uTime: { value: 0 }, uAspect: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    let ready = false, visible = false, frame = 0;
    const clock = new THREE.Clock();
    const size = () => {
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      uniforms.uAspect.value = w / h;
      uniforms.uRes.value.set(w, h);
    };
    const draw = () => {
      if (!ready) return;
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    // Animate the mist only while the card is on screen and the veil is showing.
    const loop = () => {
      frame = 0;
      if (!visible) return;
      draw();
      if (uniforms.uScan.value > -0.05) frame = requestAnimationFrame(loop);
    };
    const kick = () => { if (!frame && visible) frame = requestAnimationFrame(loop); };

    new THREE.TextureLoader().load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      uniforms.uTex.value = tex;
      ready = true;
      size();
      draw();
    });

    const state = { p: 0 };
    const tw = gsap.to(state, {
      p: 1, ease: "none", scrollTrigger: range,
      onUpdate: () => { uniforms.uScan.value = -0.1 + state.p * 1.3; kick(); if (!frame) draw(); },
    });
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    io.observe(canvas);
    const onResize = () => { size(); draw(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      tw.scrollTrigger?.kill(); tw.kill();
      uniforms.uTex.value?.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [src, trigger, card]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
