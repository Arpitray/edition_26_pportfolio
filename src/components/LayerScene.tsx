"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { layerVertex, layerFragment, flashFragment } from "@/lib/layerShader";
import { depthVertex, depthFragment } from "@/lib/depthShader";
import { prefersReducedMotion, isSimple } from "@/lib/scroll";
import type { Art } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

/** One cut-out layer, placed in screen terms and pushed toward the camera by `z`. */
export type Layer = {
  /** The image; for a video layer, its still (shown to reduced-motion users and while loading fails). */
  src: string;
  /** Optional looping video (MP4) played on the layer instead of the still. */
  video?: string;
  /**
   * The layer was made on a flat screen: key it out, and its spill on the edges. "screen" keys
   * any green-to-blue background (for a clip whose screen changes colour as it plays).
   */
  key?: "green" | "blue" | "screen";
  /** Colour grade, to match the layer to its scene: 1 = unchanged for each. */
  grade?: { exposure?: number; contrast?: number; saturation?: number };
  /**
   * "background": the layer is a piece cut out of the background picture (tools/cut-people.mjs)
   * and sits exactly over its own spot in it on every screen. Then x and y are the centre of
   * the piece as fractions of the background picture (0..1 from its top-left), and h is its
   * height as a fraction of the picture's height. It still moves with its depth and detach.
   */
  anchor?: "background";
  /** Distance in front of the background (0 = on it). Nearer layers move more with the mouse. */
  z: number;
  /**
   * Centre of the layer, in screen heights from the middle of the screen (y: -0.5 bottom ..
   * 0.5 top; x uses the same unit, so x = 0.5 is half a screen height right of centre). One
   * unit for both keeps the arrangement identical on every screen shape: a wider screen just
   * shows more of the room at the sides.
   */
  x: number;
  y: number;
  /** Height as a fraction of the screen height. */
  h: number;
  /** Starting angle in radians (e.g. dividers lying across the papers). */
  r?: number;
  /**
   * Where the layer floats off to while the scene comes apart: offsets in screen fractions
   * and depth, a turn (radians), and when it starts (0..1 of the detach phase).
   */
  detach?: { x: number; y: number; z: number; rot: number; at?: number };
};

/** A scene made of layers: a background that covers the screen, and cut-out layers on it. */
/**
 * How a layered scene re-frames on a portrait screen (taller than wide), where the whole
 * arrangement cannot fit across: every layer is scaled by `scale` about the point (x, y), in
 * the layers' own units, and that point moves to the middle of the screen horizontally. Pick
 * the point between the things that must stay in view.
 */
export type Portrait = { x: number; y: number; scale: number };

export type LayeredScene = {
  /** The background image; with `backgroundVideo`, its still (reduced motion, or if the video fails). */
  background: string;
  /** Optional looping video (MP4) that fills the background, drawn like a video layer. */
  backgroundVideo?: string;
  layers: Layer[];
  portrait?: Portrait;
};

/**
 * detach: how far this scene has come apart. nextDetach: the same for a layered `next` scene,
 * so its pieces (a kite, a paper plane) can drift while it is on screen.
 */
export type LayerState = { dolly: number; detach: number; flash: number; etch: number; mix: number; nextDetach: number };
export type LayerTimeline = (progress: number) => Omit<LayerState, "nextDetach"> & { nextDetach?: number };

const FOV = 30;
const OVERSCAN = 1.3;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * A painting built from separate layers (background, figure, foreground, objects), each at
 * its own depth. The camera follows the mouse, so near layers slide past far ones; scrolling
 * makes the objects lift off and float away (detach), then the whole scene turns into the
 * silver line drawing, and fades into `next`, which colours back in. `next` is either a single
 * painting with a depth map, or another layered scene whose pieces move with `nextDetach`.
 */
export default function LayerScene({
  background, backgroundVideo, layers, next, trigger, timeline, flashAt, nextTrigger, portrait, onReady,
}: {
  /** Called once, when everything has loaded and the first frame is on screen. */
  onReady?: () => void;
  background: string; backgroundVideo?: string; layers: Layer[];
  /** How the scene re-frames on portrait screens (see Portrait). */
  portrait?: Portrait;
  /** Optional: the scene this one turns into at the end (see the timeline's etch and mix). */
  next?: Art | LayeredScene;
  trigger: React.RefObject<HTMLElement | null>; timeline: LayerTimeline;
  /**
   * Optional: content that scrolls over the finished next scene. While it scrolls past (from
   * entering the screen to its bottom reaching the bottom of the screen), the next scene's
   * pieces come apart (this replaces the timeline's nextDetach). The scene keeps drawing until
   * it has gone.
   */
  nextTrigger?: React.RefObject<HTMLElement | null>;
  /** Where the light bursts: a point on one of the layers (index into `layers`, 0..1 across its image from the top-left). */
  flashAt: { layer: number; u: number; v: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    // Phones and tablets get a still image instead (the canvas is hidden there): no WebGL.
    if (isSimple()) return;
    const canvas = canvasRef.current!;
    const section = trigger.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      // No WebGL here: nothing to wait for, so the loader must not either.
      readyRef.current?.();
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 20);
    const D = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));   // a 2-unit-tall plane at z=0 fills the screen
    const visibleHeight = (z: number) => (2 * (D - z)) / D;

    const loader = new THREE.TextureLoader();
    // A picture that fails to load becomes an empty pixel, so the scene (and the loader waiting
    // on it) still finishes instead of waiting forever.
    const load = (url: string, colour = true) => new Promise<THREE.Texture>((resolve) => loader.load(url, (t) => {
      t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      resolve(t);
    }, undefined, () => {
      const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
      empty.needsUpdate = true;
      resolve(empty);
    }));

    const resolution = new THREE.Vector2();
    const shared = {
      uEtch: { value: 0 }, uTime: { value: 0 }, uResolution: { value: resolution },
      uFlashAt: { value: new THREE.Vector2(0.5, 0.5) }, uFlash: { value: 0 },
    };
    const layerMaterial = (map: THREE.Texture, glitter: number, layer: Layer | null) => new THREE.ShaderMaterial({
      vertexShader: layerVertex, fragmentShader: layerFragment, transparent: true, depthWrite: false,
      uniforms: {
        ...shared, uMap: { value: map }, uMap2: { value: map }, uBlend: { value: 0 },
        uTexel: { value: new THREE.Vector2() }, uOpacity: { value: 1 }, uGlitter: { value: glitter },
        uKey: { value: layer?.key ? { green: 1, blue: 2, screen: 3 }[layer.key] : 0 },
        uGrade: { value: new THREE.Vector3(layer?.grade?.exposure ?? 1, layer?.grade?.contrast ?? 1, layer?.grade?.saturation ?? 1) },
      },
    });

    const nextIsLayered = !!next && "layers" in next;

    // Video layers never visibly restart. Two copies of the clip take turns: shortly before the
    // playing one ends, the other starts at the moment of the clip whose frame looks most like
    // the current one (found from small thumbnails taken at load), and the two crossfade. So the
    // motion carries on from a matching pose, at a different point each time, and never shows a
    // fixed repeat. They play only while the scene is drawn; people who prefer reduced motion
    // get the still instead.
    const FADE = 0.9;                       // seconds of crossfade at each jump
    type VideoLoop = {
      v: [HTMLVideoElement, HTMLVideoElement]; t: [THREE.VideoTexture, THREE.VideoTexture];
      front: 0 | 1; fadeStart: number; pending: boolean; thumbs: { time: number; px: Float32Array }[];
      material: THREE.ShaderMaterial | null;
    };
    const loops: VideoLoop[] = [];
    const videos: HTMLVideoElement[] = [];
    const TW = 24, TH = 16;
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = TW; thumbCanvas.height = TH;
    const thumbCtx = thumbCanvas.getContext("2d", { willReadFrequently: true });
    const thumbOf = (v: HTMLVideoElement) => {
      if (!thumbCtx) return null;
      thumbCtx.drawImage(v, 0, 0, TW, TH);
      const d = thumbCtx.getImageData(0, 0, TW, TH).data;
      const px = new Float32Array(TW * TH);
      for (let i = 0; i < px.length; i++) px[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
      return px;
    };
    /** Thumbnails every half second of the clip, taken by a third, hidden copy. */
    const scanThumbs = async (url: string, loop: VideoLoop) => {
      const v = document.createElement("video");
      v.muted = true; v.preload = "auto"; v.src = url;
      await new Promise((r) => v.addEventListener("loadeddata", r, { once: true }));
      for (let time = 0.3; time < v.duration - 0.3; time += 0.5) {
        await new Promise((r) => { v.addEventListener("seeked", r, { once: true }); v.currentTime = time; });
        const px = thumbOf(v);
        if (px) loop.thumbs.push({ time, px });
      }
      v.removeAttribute("src"); v.load();
    };
    /** Where to jump to: the frame most like the current one, away from now and from the end. */
    const jumpTarget = (loop: VideoLoop, cur: HTMLVideoElement) => {
      const dur = cur.duration;
      const ok = loop.thumbs.filter((t) => t.time < dur - FADE - 1.5 && Math.abs(t.time - cur.currentTime) > 2);
      const now = ok.length ? thumbOf(cur) : null;
      if (!now) return Math.random() * Math.max(0.1, dur - FADE - 2);
      const scored = ok.map((t) => {
        let d = 0;
        for (let i = 0; i < now.length; i++) d += Math.abs(now[i] - t.px[i]);
        return { time: t.time, d };
      }).sort((x, y) => x.d - y.d);
      // One of the closest few, so the jumps do not settle into a pattern either.
      return scored[Math.floor(Math.random() * Math.min(3, scored.length))].time;
    };
    const updateLoops = () => {
      const now = performance.now() / 1000;
      for (const loop of loops) {
        const mat = loop.material;
        if (!mat) continue;
        const cur = loop.v[loop.front], other = loop.v[1 - loop.front];
        if (!loop.pending && loop.fadeStart < 0 && cur.duration && cur.currentTime > cur.duration - FADE - 0.25) {
          loop.pending = true;
          other.addEventListener("seeked", () => {
            other.play().catch(() => {});
            loop.fadeStart = performance.now() / 1000;
            loop.pending = false;
          }, { once: true });
          other.currentTime = jumpTarget(loop, cur);
        }
        if (loop.fadeStart >= 0) {
          const k = Math.min(1, (now - loop.fadeStart) / FADE);
          mat.uniforms.uBlend.value = k * k * (3 - 2 * k);
          if (k >= 1) {
            cur.pause();
            loop.front = (1 - loop.front) as 0 | 1;
            loop.fadeStart = -1;
            mat.uniforms.uMap.value = loop.t[loop.front];
            mat.uniforms.uMap2.value = loop.t[1 - loop.front];
            mat.uniforms.uBlend.value = 0;
          }
        }
      }
    };
    // A clip is downloaded once and shared by both copies and the thumbnail scan; three video
    // elements on the same address would otherwise each fetch it, all at the same time.
    const objectUrls: string[] = [];
    const clipUrl = (url: string) => fetch(url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((blob) => { const u = URL.createObjectURL(blob); objectUrls.push(u); return u; })
      .catch(() => url);
    /** The clip as a looping texture, or null when it cannot play (the still then stays). */
    const loadVideo = (url: string) => clipUrl(url).then((src) => new Promise<THREE.VideoTexture | null>((resolve) => {
      if (!alive) { resolve(null); return; }
      const copy = () => {
        const v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.preload = "auto";
        v.setAttribute("playsinline", "");
        v.src = src;
        videos.push(v);
        return v;
      };
      const a = copy(), b = copy();
      a.addEventListener("loadeddata", () => {
        const ta = new THREE.VideoTexture(a), tb = new THREE.VideoTexture(b);
        ta.colorSpace = THREE.SRGBColorSpace;
        tb.colorSpace = THREE.SRGBColorSpace;
        const loop: VideoLoop = { v: [a, b], t: [ta, tb], front: 0, fadeStart: -1, pending: false, thumbs: [], material: null };
        loops.push(loop);
        ta.userData.loop = loop;
        scanThumbs(src, loop).catch(() => {});
        resolve(ta);
      }, { once: true });
      a.addEventListener("error", () => resolve(null), { once: true });
    }));

    // The next scene, behind everything, revealed as this one fades. As a single painting it is
    // one surface pushed into 3D by its depth map; as layers it is built like this scene.
    const nextUniforms = {
      uColorA: { value: null as THREE.Texture | null }, uColorB: { value: null as THREE.Texture | null },
      uDepthA: { value: null as THREE.Texture | null }, uDepthB: { value: null as THREE.Texture | null },
      uCoverA: { value: new THREE.Vector4(1, 1, 0, 0) }, uCoverB: { value: new THREE.Vector4(1, 1, 0, 0) },
      uTexelA: { value: new THREE.Vector2() }, uTexelB: { value: new THREE.Vector2() },
      uMix: { value: 0 }, uEtch: { value: 0 }, uFlash: { value: 0 }, uFlashAt: shared.uFlashAt,
      uTime: shared.uTime, uAspect: { value: 1 }, uRelief: { value: 0.42 },
    };
    const nextMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 240, 240),
      new THREE.ShaderMaterial({ vertexShader: depthVertex, fragmentShader: depthFragment, uniforms: nextUniforms }));
    nextMesh.position.z = -0.6;
    nextMesh.renderOrder = 0;
    if (next && !nextIsLayered) scene.add(nextMesh);

    // The light burst, drawn additively over everything.
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: flashFragment, uniforms: shared,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    flash.frustumCulled = false;
    flash.renderOrder = 100;
    scene.add(flash);

    // group 0: this scene; group 1: the layered next scene.
    type Placed = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; layer: Layer | null; aspect: number; texH: number; group: 0 | 1 };
    let placed: Placed[] = [];
    let alive = true;
    let nextTextures: THREE.Texture[] = [];

    const reduced = prefersReducedMotion();
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const state = { progress: 0, nextProgress: 0, shown: { dolly: 0, detach: 0, flash: 0, etch: 0, mix: 0, nextDetach: 0 } as LayerState };
    let running = false;
    let frame = 0;
    const clock = new THREE.Clock();

    /** Position and size every layer for the current screen and detach amounts. */
    const arrange = (aspect: number, detachOf: [number, number]) => {
      // On a portrait screen, scale the arrangement about its focus point (see Portrait).
      const P = portrait && aspect < 0.9 ? portrait : null;
      const s = P ? P.scale : 1;
      const fx = P ? P.x : 0, fy = P ? P.y : 0;
      // Size of each group's background on screen, in screen heights, for anchored layers.
      const bgOf: { h: number; aspect: number }[] = [];
      for (const p of placed) {
        const detach = detachOf[p.group];
        if (!p.layer) {
          // The background covers the screen at z = 0 (2 units tall), like object-fit: cover,
          // with some overscan so camera moves never show its edge.
          const height = p.aspect > aspect ? 2 : (2 * aspect) / p.aspect;
          p.mesh.scale.set(height * p.aspect * OVERSCAN, height * OVERSCAN, 1);
          bgOf[p.group] = { h: (height * OVERSCAN) / 2, aspect: p.aspect };
          continue;
        }
        const L = p.layer;
        const d = L.detach;
        const t = d ? ease(clamp01((detach - (d.at ?? 0)) / (1 - (d.at ?? 0)))) : 0;
        const z = L.z + (d ? d.z * t : 0);
        const vh = visibleHeight(L.z);
        // A piece of the background: its place in the picture, turned into screen units. It
        // follows the background, so the portrait re-framing does not apply to it.
        const bg = L.anchor === "background" ? bgOf[p.group] : undefined;
        const ls = bg ? 1 : s, lfx = bg ? 0 : fx, lfy = bg ? 0 : fy;
        const lx = bg ? (L.x - 0.5) * bg.h * bg.aspect : L.x;
        const ly = bg ? (0.5 - L.y) * bg.h : L.y;
        const height = (bg ? L.h * bg.h : L.h * ls) * vh;
        p.mesh.scale.set(height * p.aspect, height, 1);
        p.mesh.position.set(
          ((lx - lfx) * ls + (d ? d.x * t * ls : 0)) * vh,
          (lfy + (ly - lfy) * ls + (d ? d.y * t * ls : 0)) * vh,
          z,
        );
        p.mesh.rotation.z = (L.r ?? 0) + (d ? d.rot * t : 0);
      }
    };

    const layout = () => {
      const w = section.clientWidth || window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(resolution);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      // One screen pixel and a half, in each layer's texture space, for the line drawing.
      for (const p of placed) {
        const screenH = (p.layer ? p.layer.h : OVERSCAN) * h;
        p.mesh.material.uniforms.uTexel.value.set(1.5 / (screenH * p.aspect), 1.5 / screenH);
      }
      // The next painting covers the screen at its depth.
      const [nextColor] = nextTextures;
      if (nextColor) {
        const img = nextColor.image as { width: number; height: number };
        // The plane is 2 units square, so half the visible size is its scale.
        const vh = (visibleHeight(nextMesh.position.z) * OVERSCAN) / 2;
        nextMesh.scale.set(vh * aspect, vh, 1);
        const ia = img.width / img.height;
        const sx = ia > aspect ? aspect / ia : 1, sy = ia > aspect ? 1 : ia / aspect;
        nextUniforms.uCoverA.value.set(sx, sy, (1 - sx) / 2, (1 - sy) / 2);
        nextUniforms.uCoverB.value.copy(nextUniforms.uCoverA.value);
        nextUniforms.uTexelA.value.set((1.5 / w) * sx, (1.5 / h) * sy);
        nextUniforms.uTexelB.value.copy(nextUniforms.uTexelA.value);
        nextUniforms.uAspect.value = aspect;
      }
      arrange(aspect, [state.shown.detach, state.shown.nextDetach]);
    };

    // The burst follows its point on the layer, wherever that layer is drawn this frame.
    const flashPoint = new THREE.Vector3();
    const aimFlash = () => {
      const host = placed.find((p) => p.group === 0 && p.layer === layers[flashAt.layer]);
      if (!host) return;
      host.mesh.updateMatrixWorld();
      camera.updateMatrixWorld();
      flashPoint.set(flashAt.u - 0.5, 0.5 - flashAt.v, 0).applyMatrix4(host.mesh.matrixWorld).project(camera);
      shared.uFlashAt.value.set((flashPoint.x + 1) / 2, (flashPoint.y + 1) / 2);
    };

    const render = () => {
      if (!running) return;
      const target = current();
      const s = state.shown;
      (Object.keys(s) as (keyof LayerState)[]).forEach((k) => { s[k] += (target[k] - s[k]) * 0.09; });
      mouse.x += (mouse.tx - mouse.x) * 0.075;
      mouse.y += (mouse.ty - mouse.y) * 0.075;

      shared.uTime.value = clock.getElapsedTime();
      shared.uEtch.value = s.etch;
      shared.uFlash.value = s.flash;
      nextUniforms.uEtch.value = s.etch;
      // This scene fades out over the next one, which stays fully drawn behind it.
      for (const p of placed) p.mesh.material.uniforms.uOpacity.value = p.group === 0 ? 1 - s.mix : 1;
      arrange(camera.aspect, [s.detach, s.nextDetach]);

      const idle = reduced ? 0 : Math.sin(shared.uTime.value * 0.25) * 0.015;
      camera.position.set(mouse.x * 0.48 + idle, -mouse.y * 0.3, D * (1 - s.dolly));
      camera.lookAt(mouse.x * 0.06, -mouse.y * 0.04, 0.2);
      aimFlash();
      updateLoops();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    const after = nextTrigger?.current ?? null;
    /** Where the timeline (and the content scrolling over the next scene) say things should be. */
    const current = (): LayerState => ({
      nextDetach: 0,
      ...timeline(state.progress),
      ...(after ? { nextDetach: state.nextProgress } : {}),
    });

    const scrub = ScrollTrigger.create({
      trigger: section, start: "top top", end: "bottom bottom",
      onUpdate: (self) => { state.progress = self.progress; },
    });
    const nextScrub = after && ScrollTrigger.create({
      trigger: after, start: "top bottom", end: "bottom bottom",
      onUpdate: (self) => { state.nextProgress = self.progress; },
    });
    const visible = ScrollTrigger.create({
      trigger: section, start: "top bottom", endTrigger: after ?? section, end: "bottom top",
      onToggle: (self) => (self.isActive ? start() : stop()),
    });
    function start() {
      if (running || !placed.length) return;
      running = true;
      loops.forEach((l) => l.v[l.front].play().catch(() => {}));
      cancelAnimationFrame(frame);
      render();
    }
    function stop() { running = false; cancelAnimationFrame(frame); videos.forEach((v) => v.pause()); }

    const onMouse = (e: PointerEvent) => {
      if (reduced) return;
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(layout, 150); };
    window.addEventListener("pointermove", onMouse);
    window.addEventListener("resize", onResize);

    // Every video layer opens on its still, so the scene is ready (and the loader can lift) as
    // soon as the pictures are in; the clips download afterwards and take over (playVideos).
    const loadLayer = (l: Layer) => load(l.src);
    const nextLoads = !next ? []
      : "layers" in next ? [load(next.background), ...next.layers.map(loadLayer)]
      : [load(next.color), load(next.depth, false)];

    /** Swaps each video layer's still for its clip once the clip can play. */
    const playVideos = () => {
      if (reduced) return;
      for (const p of placed) {
        const url = p.layer ? p.layer.video : (p.group === 0 ? backgroundVideo : undefined);
        if (!url) continue;
        loadVideo(url).then((tex) => {
          if (!tex || !alive) return;
          const mat = p.mesh.material;
          const still = mat.uniforms.uMap.value as THREE.Texture;
          const loop = tex.userData.loop as VideoLoop;
          loop.material = mat;
          mat.uniforms.uMap.value = tex;
          mat.uniforms.uMap2.value = loop.t[1];
          mat.uniforms.uBlend.value = 0;
          if (running) loop.v[loop.front].play().catch(() => {});
          still.dispose();
        });
      }
    };

    Promise.all([load(background), ...layers.map(loadLayer), ...nextLoads]).then((textures) => {
      const [bgTex, ...rest] = textures;
      const layerTextures = rest.slice(0, layers.length);
      const nextLoaded = rest.slice(layers.length);

      const size = (t: THREE.Texture) => {
        const img = t.image as { width: number; height: number; videoWidth?: number; videoHeight?: number };
        return { width: img.videoWidth || img.width, height: img.videoHeight || img.height };
      };
      const make = (tex: THREE.Texture, layer: Layer | null, order: number, group: 0 | 1): Placed => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), layerMaterial(tex, layer ? 0 : 1, layer));
        const loop = tex.userData.loop as VideoLoop | undefined;
        if (loop) { loop.material = mesh.material; mesh.material.uniforms.uMap2.value = loop.t[1]; }
        mesh.renderOrder = order;
        scene.add(mesh);
        return { mesh, layer, aspect: size(tex).width / size(tex).height, texH: size(tex).height, group };
      };
      /** A scene's background, then its layers far to near, so transparency blends in order. */
      const build = (bg: THREE.Texture, sceneLayers: Layer[], textures: THREE.Texture[], firstOrder: number, group: 0 | 1) => {
        const built = [make(bg, null, firstOrder, group)];
        sceneLayers
          .map((layer, i) => ({ layer, tex: textures[i] }))
          .sort((a, b) => a.layer.z - b.layer.z)
          .forEach(({ layer, tex }, i) => built.push(make(tex, layer, firstOrder + 1 + i, group)));
        return built;
      };

      // The next scene is drawn first (behind), this one over it.
      let order = 1;
      placed = [];
      if (next && "layers" in next) {
        const [nextBg, ...nextLayerTextures] = nextLoaded;
        placed.push(...build(nextBg, next.layers, nextLayerTextures, order, 1));
        order += next.layers.length + 1;
      } else if (next) {
        nextTextures = nextLoaded;
        [nextUniforms.uColorA.value, nextUniforms.uDepthA.value] = nextTextures;
        [nextUniforms.uColorB.value, nextUniforms.uDepthB.value] = nextTextures;
      }
      placed.push(...build(bgTex, layers, layerTextures, order, 0));

      layout();
      state.progress = scrub.progress;
      state.nextProgress = nextScrub ? nextScrub.progress : 0;
      Object.assign(state.shown, current());
      // Compile the shaders off the main thread where the browser can
      // (KHR_parallel_shader_compile), so the page and the loader keep moving meanwhile.
      renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
        if (!alive) return;
        if (visible.isActive) start();
        requestAnimationFrame(() => requestAnimationFrame(() => readyRef.current?.()));
        playVideos();
      });
    });

    return () => {
      alive = false;
      stop();
      videos.forEach((v) => { v.removeAttribute("src"); v.load(); });
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      window.removeEventListener("pointermove", onMouse);
      window.removeEventListener("resize", onResize);
      scrub.kill();
      nextScrub?.kill();
      visible.kill();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.ShaderMaterial;
          Object.values(mat.uniforms ?? {}).forEach((u) => (u.value as THREE.Texture)?.isTexture && (u.value as THREE.Texture).dispose());
          mat.dispose();
        }
      });
      renderer.dispose();
    };
  }, [background, backgroundVideo, layers, next, trigger, timeline, flashAt, nextTrigger, portrait]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
