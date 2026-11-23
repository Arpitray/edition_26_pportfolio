// Shaders for a painting pushed into 3D by its depth map.
//
// Two paintings can be loaded (A and B) so a scene can hand over from one to the next:
//   uMix   0 = painting A, 1 = painting B (depth and colour both blend)
//   uEtch  0 = full colour, 1 = silver line drawing (edges glowing white on dark) with glitter
//   uFlash a burst of light at uFlashAt
// uCover* crop each texture like CSS object-fit: cover (xy = scale, zw = offset).

export const depthVertex = /* glsl */ `
  uniform sampler2D uDepthA;
  uniform sampler2D uDepthB;
  uniform vec4 uCoverA;
  uniform vec4 uCoverB;
  uniform float uMix;
  uniform float uRelief;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    float dA = texture2D(uDepthA, uv * uCoverA.xy + uCoverA.zw).r;
    float dB = texture2D(uDepthB, uv * uCoverB.xy + uCoverB.zw).r;
    vec3 p = position;
    p.z += mix(dA, dB, uMix) * uRelief;   // white (near) comes toward the camera
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const depthFragment = /* glsl */ `
  uniform sampler2D uColorA;
  uniform sampler2D uColorB;
  uniform vec4 uCoverA;
  uniform vec4 uCoverB;
  uniform vec2 uTexelA;
  uniform vec2 uTexelB;
  uniform float uMix;
  uniform float uEtch;
  uniform float uFlash;
  uniform vec2 uFlashAt;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // Silver etching: Sobel edges of the painting drawn as bright lines over a dim, desaturated
  // version of it, like a silverpoint drawing.
  vec3 etching(sampler2D t, vec2 uv, vec2 px) {
    float tl = luma(texture2D(t, uv + px * vec2(-1.0,  1.0)).rgb);
    float tc = luma(texture2D(t, uv + px * vec2( 0.0,  1.0)).rgb);
    float tr = luma(texture2D(t, uv + px * vec2( 1.0,  1.0)).rgb);
    float ml = luma(texture2D(t, uv + px * vec2(-1.0,  0.0)).rgb);
    float mr = luma(texture2D(t, uv + px * vec2( 1.0,  0.0)).rgb);
    float bl = luma(texture2D(t, uv + px * vec2(-1.0, -1.0)).rgb);
    float bc = luma(texture2D(t, uv + px * vec2( 0.0, -1.0)).rgb);
    float br = luma(texture2D(t, uv + px * vec2( 1.0, -1.0)).rgb);
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy =  tl + 2.0 * tc + tr - bl - 2.0 * bc - br;
    float edge = sqrt(gx * gx + gy * gy);
    vec3 base = texture2D(t, uv).rgb;
    float tone = luma(base);
    // Thin lines only where the painting really changes; flat bright areas (a sheet of paper,
    // a lit wall) stay a soft grey instead of filling with white.
    float line = smoothstep(0.09, 0.34, edge) * 0.9;
    vec3 dim = mix(vec3(tone), base, 0.25) * 0.3;   // dark, slightly tinted ground
    return dim + vec3(0.86, 0.9, 1.0) * line;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // One layer of stars: a few cells of a grid hold a point of light, a rarer few a cross flare.
  float stars(vec2 uv, float scale, float density, float seed) {
    vec2 g = uv * vec2(uAspect, 1.0) * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + seed);
    if (h < 1.0 - density) return 0.0;
    vec2 jitter = vec2(hash(id + seed + 7.1), hash(id + seed + 3.7)) - 0.5;
    f -= jitter * 0.6;
    float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + h * 4.0) + h * 80.0), 3.0);
    float d = length(f);
    float core = smoothstep(0.12, 0.0, d);
    float flare = step(1.0 - density * 0.12, h) * smoothstep(0.5, 0.0, d)
                * (smoothstep(0.025, 0.0, abs(f.x)) + smoothstep(0.025, 0.0, abs(f.y)));
    return (core + flare * 1.6) * twinkle;
  }

  // Glitter: fine dust everywhere, plus a dense, brighter cloud around where the light burst,
  // like a nebula left behind by it.
  float glitter(vec2 uv) {
    vec2 q = (uv - uFlashAt) * vec2(uAspect, 1.0);
    float cloud = exp(-dot(q, q) * 7.0);
    return stars(uv, 260.0, 0.02 + cloud * 0.22, 0.0) * (0.45 + cloud)
         + stars(uv, 90.0, 0.012 + cloud * 0.05, 17.0) * 1.2;
  }

  void main() {
    vec2 uvA = vUv * uCoverA.xy + uCoverA.zw;
    vec2 uvB = vUv * uCoverB.xy + uCoverB.zw;
    vec3 colour = mix(texture2D(uColorA, uvA).rgb, texture2D(uColorB, uvB).rgb, uMix);
    vec3 drawn = mix(etching(uColorA, uvA, uTexelA), etching(uColorB, uvB, uTexelB), uMix);
    vec3 c = mix(colour, drawn, uEtch);

    c += glitter(vUv) * uEtch * vec3(1.0, 0.95, 0.86) * (1.0 - luma(drawn) * 0.7);

    vec2 q = (vUv - uFlashAt) * vec2(uAspect, 1.0);
    float r2 = dot(q, q);
    // A tight white core with a soft halo, not a wash over the whole screen.
    c += vec3(1.0, 0.97, 0.92) * uFlash * (exp(-r2 * 420.0) * 2.4 + exp(-sqrt(r2) * 9.0) * 0.45);

    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;
