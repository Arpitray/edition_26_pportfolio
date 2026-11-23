// Shaders for one cut-out layer of a layered scene (a figure, a table, a laptop...).
// Same looks as the single-painting scenes: colour, or the silver line drawing (uEtch) with
// glitter on the background layer, and the layer's own transparency.

export const layerVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const layerFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMap2;     // video layers: the other copy of the clip, crossfaded in by uBlend
  uniform float uBlend;
  uniform vec3 uGrade;         // exposure, contrast, saturation (1, 1, 1 = unchanged)
  uniform vec2 uTexel;
  uniform float uEtch;
  uniform float uOpacity;
  uniform float uGlitter;      // 1 on the background layer only
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uFlashAt;
  uniform float uKey;          // 1: made on flat green, 2: on flat blue, 3: on any green-to-blue
                               // screen (one that changes colour during the clip); keyed out here
  varying vec2 vUv;

  // The layer's colour; on a green-screen layer the green becomes transparent, and the green
  // spill on the edges (hair, sleeves) is pulled back to neutral.
  vec4 fetch(vec2 uv) {
    vec4 c = texture2D(uMap, uv);
    if (uBlend > 0.001) c = mix(c, texture2D(uMap2, uv), uBlend);
    return c;
  }

  vec3 grade(vec3 c) {
    c *= uGrade.x;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uGrade.z);
    return max(vec3(0.0), (c - 0.18) * uGrade.y + 0.18);
  }

  // On a blue-screen layer, blue and green swap places, so the same green-screen maths works.
  vec3 keySpace(vec3 c) { return uKey > 1.5 ? c.rbg : c; }

  float keyAlpha(vec2 uv) {
    vec3 c = fetch(uv).rgb;
    // Any cool screen: green, blue or anything between has far more of one of them than red.
    // (The figure is warm: cream, red, gold, brown and skin all have red on top.)
    if (uKey > 2.5) return 1.0 - smoothstep(0.03, 0.12, max(c.g, c.b) - c.r);
    c = keySpace(c);
    return 1.0 - smoothstep(0.01, 0.1, c.g - max(c.r, c.b));
  }

  // The green the soft edges (hair, velvet) were blended with, in linear colour.
  const vec3 KEY_GREEN = vec3(0.0, 0.85, 0.0);

  vec4 sampleMap(vec2 uv) {
    vec4 c = fetch(uv);
    if (uKey > 0.5) {
      bool anyScreen = uKey > 2.5;
      if (!anyScreen) c.rgb = keySpace(c.rgb);
      float a = keyAlpha(uv);
      // Pull the edge in by about three pixels (the smallest alpha nearby), so no green rim.
      vec2 d = uTexel * 0.8;
      float edge = a;
      edge = min(edge, min(keyAlpha(uv + vec2(d.x, 0.0)), keyAlpha(uv - vec2(d.x, 0.0))));
      edge = min(edge, min(keyAlpha(uv + vec2(0.0, d.y)), keyAlpha(uv - vec2(0.0, d.y))));
      edge = min(edge, min(keyAlpha(uv + vec2(2.0 * d.x, 0.0)), keyAlpha(uv - vec2(2.0 * d.x, 0.0))));
      edge = min(edge, min(keyAlpha(uv + vec2(0.0, 2.0 * d.y)), keyAlpha(uv - vec2(0.0, 2.0 * d.y))));
      edge = min(edge, min(keyAlpha(uv + 2.1 * d), keyAlpha(uv - 2.1 * d)));
      edge = min(edge, min(keyAlpha(uv + vec2(2.1, -2.1) * d), keyAlpha(uv - vec2(2.1, -2.1) * d)));
      edge = min(edge, min(keyAlpha(uv + vec2(3.0 * d.x, 0.0)), keyAlpha(uv - vec2(3.0 * d.x, 0.0))));
      edge = min(edge, min(keyAlpha(uv + vec2(0.0, 3.0 * d.y)), keyAlpha(uv - vec2(0.0, 3.0 * d.y))));
      // A soft inner edge instead of a hard cut.
      edge = smoothstep(0.0, 1.0, edge);
      // Un-mix the green from the soft edge pixels to get their own colour back, then limit
      // any green left by red (the figure is warm), so dark hair does not turn purple.
      vec3 raw = c.rgb;
      if (!anyScreen) c.rgb = clamp((c.rgb - (1.0 - a) * KEY_GREEN) / max(a, 0.08), 0.0, 1.0);
      // Within a few pixels of the edge the colour is still tinted by the green (olive hair
      // tips): there green is held well under red; further in, only just under it.
      vec2 f = d * 6.0;
      float inside = min(min(keyAlpha(uv + vec2(f.x, 0.0)), keyAlpha(uv - vec2(f.x, 0.0))),
                         min(keyAlpha(uv + vec2(0.0, f.y)), keyAlpha(uv - vec2(0.0, f.y))));
      c.g = min(c.g, mix(c.r * 0.8, max(c.r, c.b * 0.6), inside));
      // Near the edge, pixels whose green has caught up with their red are the olive fringe
      // left where hair blurred into the green: drop them. (His hair, skin and cloak have
      // clearly more red than green, so they stay.)
      // Olive also hides as khaki on the curl tips: green close to red with little blue.
      float r = max(raw.r, 0.001);
      float khaki = anyScreen ? 0.0 : smoothstep(0.6, 0.72, raw.g / r) * (1.0 - smoothstep(0.4, 0.55, raw.b / r));
      float cool = anyScreen ? max(raw.g, raw.b) : raw.g;
      float fringe = (1.0 - inside) * max(smoothstep(-0.05, 0.01, cool - raw.r), khaki);
      c.a = edge * (1.0 - fringe);
      // Green light the video painted into the hair: hold green just under red everywhere
      // (his shirt, skin and gold already sit below this, so they do not change).
      c.g = min(c.g, c.r * 0.92);
      if (anyScreen) c.b = min(c.b, c.r * 0.85);
      else c.rgb = keySpace(c.rgb);
    }
    if (uGrade != vec3(1.0)) c.rgb = grade(c.rgb);
    return c;
  }

  float luma(vec4 c) { return dot(c.rgb, vec3(0.299, 0.587, 0.114)) * c.a; }

  // Edges of colour AND of the cut-out's outline (luma is weighted by alpha), so a figure gets
  // its silhouette drawn too.
  vec3 etching(vec2 uv, vec2 px) {
    float tl = luma(sampleMap(uv + px * vec2(-1.0,  1.0)));
    float tc = luma(sampleMap(uv + px * vec2( 0.0,  1.0)));
    float tr = luma(sampleMap(uv + px * vec2( 1.0,  1.0)));
    float ml = luma(sampleMap(uv + px * vec2(-1.0,  0.0)));
    float mr = luma(sampleMap(uv + px * vec2( 1.0,  0.0)));
    float bl = luma(sampleMap(uv + px * vec2(-1.0, -1.0)));
    float bc = luma(sampleMap(uv + px * vec2( 0.0, -1.0)));
    float br = luma(sampleMap(uv + px * vec2( 1.0, -1.0)));
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy =  tl + 2.0 * tc + tr - bl - 2.0 * bc - br;
    float line = smoothstep(0.09, 0.34, sqrt(gx * gx + gy * gy)) * 0.9;
    vec3 base = sampleMap(uv).rgb;
    float tone = dot(base, vec3(0.299, 0.587, 0.114));
    return mix(vec3(tone), base, 0.25) * 0.3 + vec3(0.86, 0.9, 1.0) * line;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float stars(vec2 p, float scale, float density, float seed) {
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + seed);
    if (h < 1.0 - density) return 0.0;
    f -= (vec2(hash(id + seed + 7.1), hash(id + seed + 3.7)) - 0.5) * 0.6;
    float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + h * 4.0) + h * 80.0), 3.0);
    float d = length(f);
    float flare = step(1.0 - density * 0.12, h) * smoothstep(0.5, 0.0, d)
                * (smoothstep(0.025, 0.0, abs(f.x)) + smoothstep(0.025, 0.0, abs(f.y)));
    return (smoothstep(0.12, 0.0, d) + flare * 1.6) * twinkle;
  }

  void main() {
    vec4 tex = sampleMap(vUv);
    if (tex.a < 0.01 && uEtch < 0.01) discard;
    vec3 c = mix(tex.rgb, etching(vUv, uTexel), uEtch);

    if (uGlitter > 0.0) {
      // Screen-space glitter, densest around the light burst, like a nebula it left behind.
      vec2 s = gl_FragCoord.xy / uResolution.y;
      vec2 q = gl_FragCoord.xy / uResolution - uFlashAt;
      q.x *= uResolution.x / uResolution.y;
      float cloud = exp(-dot(q, q) * 7.0);
      float g = stars(s, 260.0, 0.02 + cloud * 0.22, 0.0) * (0.45 + cloud) + stars(s, 90.0, 0.012 + cloud * 0.05, 17.0) * 1.2;
      c += g * uEtch * uGlitter * vec3(1.0, 0.95, 0.86);
    }

    gl_FragColor = vec4(c, tex.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

// A full-screen burst of light, drawn additively in front of every layer.
export const flashFragment = /* glsl */ `
  uniform float uFlash;
  uniform vec2 uFlashAt;
  uniform vec2 uResolution;
  void main() {
    vec2 q = gl_FragCoord.xy / uResolution - uFlashAt;
    q.x *= uResolution.x / uResolution.y;
    float r2 = dot(q, q);
    float glow = exp(-r2 * 420.0) * 2.4 + exp(-sqrt(r2) * 9.0) * 0.45;
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * glow * uFlash, 1.0);
  }
`;
