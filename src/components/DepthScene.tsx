"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { depthVertex, depthFragment } from "@/lib/depthShader";
import { prefersReducedMotion, isSimple } from "@/lib/scroll";
import type { Art } from "@/content/site";

gsap.registerPlugin(ScrollTrigger);

/** What the scene should look like at a given scroll progress (0..1 over its trigger). */
export type SceneState = { dolly: number; mix: number; etch: number; flash: number };
export type Timeline = (progress: number, entry: number) => SceneState;


/**
 * Crop a texture like CSS object-fit: cover, for a surface of the given aspect ratio.
 * `focus` is like object-position (0..1 from the image's left and top): the part of a tall
 * painting kept on a wide screen, or of a wide one on a tall screen. Default: the centre.
 */
function cover(texture: THREE.Texture, aspect: number, focus: [number, number] = [0.5, 0.5]) {
  const img = texture.image as { width: number; height: number };
  const imageAspect = img.width / img.height;
  const sx = imageAspect > aspect ? aspect / imageAspect : 1;
  const sy = imageAspect > aspect ? 1 : imageAspect / aspect;
  // Texture v runs from the bottom of the image, so the top-based focus is flipped.
  return new THREE.Vector4(sx, sy, (1 - sx) * focus[0], (1 - sy) * (1 - focus[1]));
}

/**
 * A painting made three-dimensional: drawn on a finely divided surface that its depth map
 * pushes forward (near things toward you), seen by a camera that follows the mouse, so the
 * near parts shift against the far parts. Scroll drives `timeline`: camera dolly, a light
 * burst, the silver line drawing and the hand-over from `art` to `next`.
 *
 * `trigger` is the tall section that scrolls the scene; `entry` (0..1) is how far that
 * section has come into view, for scenes that draw themselves in as they arrive.
 */
export default function DepthScene({
  art, next, trigger, timeline, flashAt = [0.5, 0.5], relief = 0.42,
}: {
  art: Art; next?: Art; trigger: React.RefObject<HTMLElement | null>;
  timeline: Timeline; flashAt?: [number, number]; relief?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Phones and tablets get a still image instead (the canvas is hidden there): no WebGL.
    if (isSimple()) return;
    const canvas = canvasRef.current!;
    const section = trigger.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const FOV = 30;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20);
    // At this distance a surface 2 units tall exactly fills the screen.
    const fitDistance = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

    const loader = new THREE.TextureLoader();
    const load = (url: string, colour: boolean) => new Promise<THREE.Texture>((resolve) => loader.load(url, (t) => {
      t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      resolve(t);
    }));

    const uniforms = {
      uColorA: { value: null as THREE.Texture | null }, uColorB: { value: null as THREE.Texture | null },
      uDepthA: { value: null as THREE.Texture | null }, uDepthB: { value: null as THREE.Texture | null },
      uCoverA: { value: new THREE.Vector4(1, 1, 0, 0) }, uCoverB: { value: new THREE.Vector4(1, 1, 0, 0) },
      uTexelA: { value: new THREE.Vector2() }, uTexelB: { value: new THREE.Vector2() },
      uMix: { value: 0 }, uEtch: { value: 0 }, uFlash: { value: 0 },
      uFlashAt: { value: new THREE.Vector2(...flashAt) },
      uTime: { value: 0 }, uAspect: { value: 1 }, uRelief: { value: relief },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: depthVertex, fragmentShader: depthFragment, uniforms });
    // Slightly larger than the screen, so camera moves never reveal an edge.
    const OVERSCAN = 1.4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 280, 280), material);
    scene.add(mesh);

    const reduced = prefersReducedMotion();
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const state = { progress: 0, entry: 1, shown: { dolly: 0, mix: 0, etch: 0, flash: 0 } as SceneState };
    let textures: THREE.Texture[] = [];
    let alive = true;
    let running = false;
    let frame = 0;
    const clock = new THREE.Clock();

    const layout = () => {
      const w = section.clientWidth || window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      mesh.scale.set(aspect * OVERSCAN, OVERSCAN, 1);
      uniforms.uAspect.value = aspect;
      const [colorA, , colorB] = textures;
      if (colorA) {
        uniforms.uCoverA.value = cover(colorA, aspect, art.focus);
        uniforms.uCoverB.value = colorB ? cover(colorB, aspect, next?.focus) : cover(colorA, aspect, art.focus);
        // Edge-detection step: about one and a half screen pixels, in texture space.
        const ca = uniforms.uCoverA.value, cb = uniforms.uCoverB.value;
        uniforms.uTexelA.value.set((1.5 / w) * ca.x, (1.5 / h) * ca.y);
        uniforms.uTexelB.value.set((1.5 / w) * cb.x, (1.5 / h) * cb.y);
      }
    };

    const render = () => {
      if (!running) return;
      const target = timeline(state.progress, state.entry);
      const s = state.shown;
      // Everything eases toward where the scroll says it should be: smooth like a camera rig.
      (Object.keys(s) as (keyof SceneState)[]).forEach((k) => { s[k] += (target[k] - s[k]) * 0.09; });
      mouse.x += (mouse.tx - mouse.x) * 0.075;
      mouse.y += (mouse.ty - mouse.y) * 0.075;

      uniforms.uMix.value = s.mix;
      uniforms.uEtch.value = s.etch;
      uniforms.uFlash.value = s.flash;
      uniforms.uTime.value = clock.getElapsedTime();

      // The camera orbits a little with the mouse and moves in with the scroll; looking at
      // the middle of the relief makes near and far parts slide past each other.
      const idle = reduced ? 0 : Math.sin(uniforms.uTime.value * 0.25) * 0.015;
      // Mouse sensitivity: how far the camera swings (x, y) and turns, per unit of mouse travel.
      camera.position.set(mouse.x * 0.48 + idle, -mouse.y * 0.3, fitDistance * (1 - s.dolly) + relief * 0.5);
      camera.lookAt(mouse.x * 0.06, -mouse.y * 0.04, relief * 0.5);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    const scrub = ScrollTrigger.create({
      trigger: section, start: "top top", end: "bottom bottom",
      onUpdate: (self) => { state.progress = self.progress; },
      onToggle: (self) => { if (self.isActive) start(); },
    });
    const arrival = ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "top top",
      onUpdate: (self) => { state.entry = self.progress; },
    });
    // Render only while any part of the scene is on screen.
    const visible = ScrollTrigger.create({
      trigger: section, start: "top bottom", end: "bottom top",
      onToggle: (self) => (self.isActive ? start() : stop()),
    });
    function start() { if (running || !textures.length) return; running = true; cancelAnimationFrame(frame); render(); }
    function stop() { running = false; cancelAnimationFrame(frame); }

    const onMouse = (e: PointerEvent) => {
      if (reduced) return;
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(layout, 150); };
    window.addEventListener("pointermove", onMouse);
    window.addEventListener("resize", onResize);

    const b = next ?? art;
    Promise.all([load(art.color, true), load(art.depth, false), load(b.color, true), load(b.depth, false)]).then((loaded) => {
      textures = loaded;
      [uniforms.uColorA.value, uniforms.uDepthA.value, uniforms.uColorB.value, uniforms.uDepthB.value] = loaded;
      layout();
      state.progress = scrub.progress;
      state.entry = arrival.progress;
      // Start already where the scroll is, instead of easing in from zero.
      Object.assign(state.shown, timeline(state.progress, state.entry));
      // Shaders compiled off the main thread where the browser can (see LayerScene).
      renderer.compileAsync(scene, camera).catch(() => {}).then(() => { if (alive && visible.isActive) start(); });
    });

    return () => {
      alive = false;
      stop();
      window.removeEventListener("pointermove", onMouse);
      window.removeEventListener("resize", onResize);
      [scrub, arrival, visible].forEach((t) => t.kill());
      textures.forEach((t) => t.dispose());
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [art, next, trigger, timeline, flashAt, relief]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
