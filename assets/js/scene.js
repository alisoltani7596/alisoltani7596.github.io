/* scene.js — the fixed WebGL backdrop.
   One full-screen shader paints each chapter's ground (water caustics, white, sky haze,
   a dark tunnel, paper, deep sea). On top of it: a glass eye that watches the cursor,
   drifting detection boxes, and a tunnel of project frames. Everything is procedural
   except the project thumbnails, so the page ships no 3D assets. */

import * as THREE from "../vendor/three.module.min.js";

// Hex colours go straight to the shaders as written.
THREE.ColorManagement.enabled = false;

const STAGES = {
  water:  { a: "#cde7df", b: "#4c8b7d", caustic: 1.0,  frost: 1.0, haze: 0.22, rays: 0.0, dark: 0 },
  white:  { a: "#ffffff", b: "#eef5f2", caustic: 0.0,  frost: 0.0, haze: 0.0,  rays: 0.0, dark: 0 },
  sky:    { a: "#f7fbf9", b: "#c4dde4", caustic: 0.07, frost: 0.0, haze: 0.75, rays: 1.0, dark: 0 },
  tunnel: { a: "#1d4441", b: "#06171a", caustic: 0.16, frost: 0.0, haze: 0.0,  rays: 0.0, dark: 1 },
  paper:  { a: "#fbfcfb", b: "#edf3f0", caustic: 0.0,  frost: 0.0, haze: 0.0,  rays: 0.0, dark: 0 },
  sea:    { a: "#21524d", b: "#051719", caustic: 0.75, frost: 0.25, haze: 0.0, rays: 0.4, dark: 1 },
  ripple: { a: "#d6ede5", b: "#5f9d8e", caustic: 0.9,  frost: 0.6, haze: 0.18, rays: 0.0, dark: 0 },
};

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  // Distance to the nearest cell wall of an animated Voronoi field (F2 - F1).
  float cellEdge(vec2 p, float t) {
    vec2 n = floor(p), f = fract(p);
    float f1 = 8.0, f2 = 8.0;
    for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.5 * sin(t + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
      }
    return sqrt(f2) - sqrt(f1);
  }
`;

const GROUND_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  uniform float uPointerLive;
  uniform vec3 uColA, uColB;
  uniform float uCaustic, uFrost, uHaze, uRays, uDark;
  uniform vec4 uRipples[6];
  varying vec2 vUv;
  ${NOISE}

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float t = uTime;

    // Ripples: expanding rings from clicks and from the intro box.
    float rippleLight = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 r = uRipples[i];
      float age = t - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
      vec2 d = p - vec2(r.x * aspect, r.y);
      float dist = length(d);
      float front = age * 0.32;
      float band = exp(-abs(dist - front) * 26.0);
      float wave = sin((dist - front) * 70.0) * band * exp(-age * 1.1) * r.w;
      p += normalize(d + 1e-4) * wave * 0.012;
      rippleLight += wave;
    }

    // The cursor leaves a soft dent in the water.
    vec2 pd = p - vec2(uPointer.x * aspect, uPointer.y);
    float pl = length(pd);
    p += normalize(pd + 1e-4) * sin(pl * 38.0 - t * 4.0) * exp(-pl * 9.0) * 0.006 * uPointerLive;

    // Ground: two-tone gradient broken up by slow noise.
    float g = fbm(p * 1.2 + vec2(t * 0.02, -t * 0.015));
    float diag = clamp(0.55 * uv.y + 0.25 * (1.0 - uv.x) + 0.35 * g, 0.0, 1.0);
    vec3 col = mix(uColB, uColA, smoothstep(0.05, 0.95, diag));

    // Frost: mottled ice patches and fine crack lines.
    if (uFrost > 0.002) {
      float patchy = smoothstep(0.38, 0.9, fbm(p * 1.7 + 7.0)) * (0.6 + 0.4 * fbm(p * 9.0));
      float cracks = 1.0 - smoothstep(0.0, 0.02, cellEdge(p * 1.9 + 3.0, 0.0));
      cracks *= smoothstep(0.45, 0.75, fbm(p * 2.6 - 2.0));
      col += uFrost * (patchy * 0.2 + cracks * 0.08) * mix(vec3(1.0), uColA, uDark);
    }

    // Caustics: thin, small cell walls with a soft glow, faded out in patches so they never look tiled.
    if (uCaustic > 0.002) {
      vec2 w = p + 0.22 * vec2(fbm(p * 1.4 + t * 0.07), fbm(p * 1.4 - t * 0.06 + 4.0));
      float e1 = cellEdge(w * 5.2, t * 0.5);
      float e2 = cellEdge(w * 9.5 + 2.0, t * 0.75);
      float caustic = (1.0 - smoothstep(0.0, 0.032, e1)) * 0.36
                    + (1.0 - smoothstep(0.0, 0.24, e1)) * 0.12
                    + (1.0 - smoothstep(0.0, 0.022, e2)) * 0.13;
      caustic *= smoothstep(0.28, 0.78, fbm(p * 0.8 + vec2(t * 0.03, 1.7)));
      vec3 causticTint = mix(vec3(1.0, 1.0, 0.98), uColA * 2.2 + 0.1, uDark);
      col += causticTint * caustic * uCaustic * (0.5 - 0.18 * uDark);
    }
    col += vec3(1.0) * rippleLight * 0.35 * (1.0 - 0.5 * uDark);

    // Sky: soft clouds and a fan of light from the top right.
    if (uHaze > 0.002) {
      float clouds = smoothstep(0.35, 0.9, fbm(vec2(p.x * 0.9 + t * 0.012, p.y * 1.6)));
      col = mix(col, vec3(1.0), clouds * uHaze * 0.55 * smoothstep(0.1, 0.9, uv.y));
    }
    if (uRays > 0.002) {
      vec2 rd = p - vec2(0.92 * aspect, 1.15);
      float ang = atan(rd.y, rd.x);
      float rays = pow(0.5 + 0.5 * sin(ang * 22.0 + fbm(vec2(ang * 3.0, t * 0.05)) * 6.0), 6.0);
      rays *= exp(-length(rd) * 1.2);
      col += rays * uRays * mix(vec3(0.5), uColA * 0.6, uDark);
    }

    // Misty vignette (white on light chapters, near-black on dark ones).
    vec2 vq = (uv - 0.5) * vec2(aspect, 1.0);
    float vig = smoothstep(0.35, 1.15, length(vq) * 1.15);
    col = mix(col, mix(vec3(1.0), uColB * 0.4, uDark), vig * (uHaze * 0.9 + uDark * 0.55));

    // Grain.
    col += (hash(uv * uRes + fract(t) * 37.0) - 0.5) * 0.03;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const BLIT_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(uTex, vUv); }
`;

const EYE_VERT = /* glsl */ `
  uniform float uTime, uWobble;
  varying vec3 vNormal;
  varying vec3 vObjNormal;
  varying vec3 vViewPos;
  varying vec4 vClip;
  float wob(vec3 p) {
    return sin(p.x * 2.1 + uTime * 1.3) * sin(p.y * 2.3 + uTime * 1.1) * sin(p.z * 1.9 + uTime * 0.9);
  }
  void main() {
    vec3 p = position + normal * wob(position * 1.6) * uWobble;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewPos = mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    vObjNormal = normal;
    gl_Position = projectionMatrix * mv;
    vClip = gl_Position;
  }
`;

const EYE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;
  uniform float uTime, uOpacity, uPupil;
  varying vec3 vNormal;
  varying vec3 vObjNormal;
  varying vec3 vViewPos;
  varying vec4 vClip;
  ${NOISE}

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    float facing = max(dot(N, V), 0.0);
    float fres = pow(1.0 - facing, 2.6);

    // Refract the ground behind the glass, with a little chromatic split.
    vec2 suv = (vClip.xy / vClip.w) * 0.5 + 0.5;
    vec2 off = N.xy * (0.09 + 0.05 * fres);
    vec3 col;
    col.r = texture2D(uScene, suv - off * 1.00).r;
    col.g = texture2D(uScene, suv - off * 1.06).g;
    col.b = texture2D(uScene, suv - off * 1.12).b;
    col = mix(col, col * vec3(0.86, 0.97, 0.95), 0.4);

    // Iris and pupil around the object's +Z axis, so they turn with the eye.
    vec3 on = normalize(vObjNormal);
    float d = length(on.xy) * step(0.0, on.z);
    if (on.z < 0.0) d = 2.0;
    float a = atan(on.y, on.x);
    float irisR = 0.43, pupilR = uPupil;
    float iris = smoothstep(irisR + 0.012, irisR - 0.012, d) * smoothstep(pupilR - 0.012, pupilR + 0.012, d);
    float streaks = fbm(vec2(a * 5.0, d * 14.0 - uTime * 0.05)) * 0.7 + fbm(vec2(a * 18.0, d * 4.0)) * 0.45;
    vec3 irisCol = mix(vec3(0.10, 0.36, 0.33), vec3(0.62, 0.86, 0.38), smoothstep(0.25, 0.95, streaks));
    irisCol = mix(irisCol, vec3(0.05, 0.18, 0.17), smoothstep(irisR - 0.10, irisR, d) * 0.85);
    irisCol = mix(irisCol, vec3(0.75, 0.95, 0.55), smoothstep(pupilR + 0.07, pupilR + 0.01, d) * 0.5);
    col = mix(col, irisCol, iris * 0.92);
    float pupil = smoothstep(pupilR + 0.012, pupilR - 0.012, d);
    col = mix(col, vec3(0.02, 0.07, 0.07), pupil);

    // Cornea: rim light and a specular window.
    vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 90.0);
    float spec2 = pow(max(dot(N, normalize(vec3(0.5, -0.3, 0.8) + V)), 0.0), 40.0);
    col += spec * 1.3 + spec2 * 0.12;
    col += fres * vec3(0.8, 1.0, 0.94) * 0.38;
    col *= 1.0 - smoothstep(0.82, 1.0, 1.0 - facing) * 0.18;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

const BOX_VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec2 aSize;
  attribute vec3 aTint;
  attribute float aSeed;
  uniform float uTime, uDrift;
  varying vec2 vUv;
  varying vec2 vSize;
  varying vec3 vTint;
  varying float vFade;
  void main() {
    float t = uTime * 0.18 + aSeed * 40.0;
    vec3 o = aOffset;
    o.y = mod(o.y - uTime * (0.10 + 0.12 * fract(aSeed * 7.0)) - uDrift * 3.0 + 5.0, 10.0) - 5.0;
    o.x += sin(t * 1.3) * 0.35;
    o.z += cos(t * 0.9) * 0.35;
    float ry = sin(t * 0.7) * 0.9, rx = cos(t * 0.5) * 0.5, rz = sin(t * 0.4) * 0.3;
    vec3 p = vec3(position.xy * aSize, 0.0);
    p = vec3(p.x * cos(rz) - p.y * sin(rz), p.x * sin(rz) + p.y * cos(rz), p.z);
    p = vec3(p.x, p.y * cos(rx) - p.z * sin(rx), p.y * sin(rx) + p.z * cos(rx));
    p = vec3(p.x * cos(ry) + p.z * sin(ry), p.y, -p.x * sin(ry) + p.z * cos(ry));
    vec4 mv = modelViewMatrix * vec4(p + o, 1.0);
    vFade = smoothstep(-16.0, -7.0, mv.z) * (1.0 - smoothstep(-4.5, -2.5, mv.z));
    vUv = uv;
    vSize = aSize;
    vTint = aTint;
    gl_Position = projectionMatrix * mv;
  }
`;

const BOX_FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec2 vSize;
  varying vec3 vTint;
  varying float vFade;
  void main() {
    vec2 px = vUv * vSize;
    vec2 d = min(px, vSize - px);
    float edge = min(d.x, d.y);
    float aa = fwidth(edge) * 1.2;
    float lw = 0.012;
    float line = 1.0 - smoothstep(lw, lw + aa, edge);
    float cl = 0.24 * min(vSize.x, vSize.y);
    float corner = (1.0 - step(cl, d.x)) * (1.0 - step(cl, d.y));
    float cline = 1.0 - smoothstep(lw * 2.4, lw * 2.4 + aa, edge);
    float tab = step(vSize.y - 0.07, px.y) * step(px.x, 0.36 * vSize.x);
    float a = line * 0.28 + cline * corner + tab * 0.85 + 0.05;
    gl_FragColor = vec4(vTint, a * vFade * uOpacity);
  }
`;

const FRAME_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAME_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float near = 1.0 - smoothstep(-8.5, -4.5, vDepth);
    float far = smoothstep(-46.0, -18.0, vDepth);
    gl_FragColor = vec4(tex.rgb, tex.a * near * far * uOpacity);
  }
`;

function hexToVec(hex) { return new THREE.Color(hex); }
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function createScene(canvas, { reduceMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false;

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const maxDpr = small ? 1.5 : 1.75;
  const clock = new THREE.Clock();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  // --- Ground ---
  const s0 = STAGES.water;
  const ripples = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -10, 0));
  const groundU = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerLive: { value: 0 },
    uColA: { value: hexToVec(s0.a) },
    uColB: { value: hexToVec(s0.b) },
    uCaustic: { value: s0.caustic },
    uFrost: { value: s0.frost },
    uHaze: { value: s0.haze },
    uRays: { value: s0.rays },
    uDark: { value: s0.dark },
    uRipples: { value: ripples },
  };
  const groundScene = new THREE.Scene();
  groundScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT, fragmentShader: GROUND_FRAG, uniforms: groundU, depthTest: false, depthWrite: false,
  })));

  const rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const blitScene = new THREE.Scene();
  blitScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT, fragmentShader: BLIT_FRAG, uniforms: { uTex: { value: rt.texture } }, depthTest: false, depthWrite: false,
  })));

  // --- 3D layer ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Glass eye
  const eyeU = {
    uScene: { value: rt.texture }, uTime: { value: 0 }, uOpacity: { value: 1 },
    uPupil: { value: 0.17 }, uWobble: { value: 0.022 },
  };
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.ShaderMaterial({ vertexShader: EYE_VERT, fragmentShader: EYE_FRAG, uniforms: eyeU, transparent: true }),
  );
  scene.add(eye);
  const eyeLook = new THREE.Object3D();
  const eyeTarget = new THREE.Vector3(0, 0, 6);

  // Detection boxes drifting like petals
  const BOXES = small ? 34 : 70;
  const boxGeo = new THREE.InstancedBufferGeometry();
  boxGeo.index = new THREE.PlaneGeometry(1, 1).index;
  boxGeo.attributes.position = new THREE.PlaneGeometry(1, 1).attributes.position;
  boxGeo.attributes.uv = new THREE.PlaneGeometry(1, 1).attributes.uv;
  const offs = new Float32Array(BOXES * 3), sizes = new Float32Array(BOXES * 2), tints = new Float32Array(BOXES * 3), seeds = new Float32Array(BOXES);
  const palette = ["#3f8f80", "#3f8f80", "#e78fb0", "#ffffff", "#8fc95a", "#47616e"].map((h) => new THREE.Color(h));
  for (let i = 0; i < BOXES; i++) {
    offs.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, -Math.random() * 12 - 1.5], i * 3);
    const w = 0.3 + Math.random() * 0.6;
    sizes.set([w, w * (0.55 + Math.random() * 0.7)], i * 2);
    const c = palette[i % palette.length];
    tints.set([c.r, c.g, c.b], i * 3);
    seeds[i] = Math.random();
  }
  boxGeo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offs, 3));
  boxGeo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 2));
  boxGeo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 3));
  boxGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  boxGeo.instanceCount = BOXES;
  const boxU = { uTime: { value: 0 }, uOpacity: { value: 0 }, uDrift: { value: 0 } };
  const boxes = new THREE.Mesh(boxGeo, new THREE.ShaderMaterial({
    vertexShader: BOX_VERT, fragmentShader: BOX_FRAG, uniforms: boxU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  boxes.frustumCulled = false;
  scene.add(boxes);

  // Tunnel of project frames (filled by loadFrames)
  const tunnel = new THREE.Group();
  scene.add(tunnel);
  const frameMats = [];
  let tunnelLength = 1;

  // Specks streaming past inside the tunnel
  const SPECKS = small ? 260 : 600;
  const speckPos = new Float32Array(SPECKS * 3);
  for (let i = 0; i < SPECKS; i++) {
    const r = 1.2 + Math.random() * 4.5, a = Math.random() * Math.PI * 2;
    speckPos.set([Math.cos(a) * r * 1.4, Math.sin(a) * r, -Math.random() * 60 + 6], i * 3);
  }
  const speckGeo = new THREE.BufferGeometry();
  speckGeo.setAttribute("position", new THREE.BufferAttribute(speckPos, 3));
  const speckMat = new THREE.PointsMaterial({ color: 0xd8f5c0, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
  const specks = new THREE.Points(speckGeo, speckMat);
  specks.frustumCulled = false;
  tunnel.add(specks);

  // --- State ---
  const state = {
    stage: "water",
    hero: 0, tunnel: 0, contact: 0, scrollV: 0,
    eyeW: 1, boxW: 0, tunnelW: 0,
    pupil: 0.17, pupilTarget: 0.17,
    pointer: new THREE.Vector2(0.5, 0.5), pointerSmooth: new THREE.Vector2(0.5, 0.5),
    pointerLive: 0, lastMove: 0,
    paused: reduceMotion, time: 0, wakeUntil: 0, rippleIdx: 0,
    w: 1, h: 1, mobile: false,
  };
  const target = { ...STAGES.water, colA: hexToVec(STAGES.water.a), colB: hexToVec(STAGES.water.b) };

  function wake(ms = 1600) { state.wakeUntil = Math.max(state.wakeUntil, performance.now() + ms); kick(); }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const db = renderer.getDrawingBufferSize(new THREE.Vector2());
    rt.setSize(db.x, db.y);
    groundU.uRes.value.set(db.x, db.y);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    state.w = w; state.h = h; state.mobile = w < 760;
    wake(300);
  }

  function setStage(name) {
    if (!STAGES[name] || name === state.stage) return;
    state.stage = name;
    const s = STAGES[name];
    Object.assign(target, s);
    target.colA = hexToVec(s.a);
    target.colB = hexToVec(s.b);
    wake(2400);
  }

  function setProgress(p) { Object.assign(state, p); if (state.paused) wake(900); }

  function setPointer(clientX, clientY) {
    state.pointer.set(clientX / state.w, 1 - clientY / state.h);
    state.lastMove = performance.now();
    if (state.paused) wake(600);
  }

  function ripple(clientX, clientY, strength = 1) {
    const r = ripples[state.rippleIdx++ % ripples.length];
    r.set(clientX / state.w, 1 - clientY / state.h, state.time, strength);
    wake(4200);
  }

  function setPupil(kind) {
    state.pupilTarget = kind === "focus" ? 0.11 : kind === "wide" ? 0.25 : 0.17;
    wake(800);
  }

  function setPaused(p) { state.paused = p; wake(1600); }

  // Each project becomes a canvas texture: thumbnail, corner brackets, and a label chip.
  function frameTexture(img, project) {
    const W = 1024, H = 640, R = 34;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.beginPath();
    g.roundRect(0, 0, W, H, R);
    g.clip();
    const contain = project.imgFit === "contain";
    g.fillStyle = contain ? "#f2f6f4" : "#0b1f20";
    g.fillRect(0, 0, W, H);
    if (img) {
      const s = contain ? Math.min((W - 60) / img.width, (H - 60) / img.height) : Math.max(W / img.width, H / img.height);
      const iw = img.width * s, ih = img.height * s;
      g.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
    }
    const grad = g.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, "rgba(6,23,26,0)");
    grad.addColorStop(1, "rgba(6,23,26,.55)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#b4ec78";
    g.lineWidth = 5;
    g.lineCap = "round";
    const m = 30, L = 64;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
    });
    const label = (project.short + "  ·  " + project.badge).toUpperCase();
    g.font = '500 26px "Geist Mono", ui-monospace, monospace';
    const tw = g.measureText(label).width;
    g.fillStyle = "#b4ec78";
    g.beginPath(); g.roundRect(m, H - m - 52, tw + 32, 46, 8); g.fill();
    g.fillStyle = "#0f2a26";
    g.fillText(label, m + 16, H - m - 20);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function loadFrames(projects) {
    const count = small ? 18 : 30;
    const gap = 3.1;
    tunnelLength = count * gap;
    const geo = new THREE.PlaneGeometry(1.6, 1.0);
    const loads = projects.map((p) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = p.img;
    }));
    return Promise.all([document.fonts ? document.fonts.ready : null, ...loads]).then(([, ...imgs]) => {
      const textures = projects.map((p, i) => frameTexture(imgs[i], p));
      for (let i = 0; i < count; i++) {
        const mat = new THREE.ShaderMaterial({
          vertexShader: FRAME_VERT, fragmentShader: FRAME_FRAG,
          uniforms: { uMap: { value: textures[i % textures.length] }, uOpacity: { value: 0 } },
          transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const a = i * 1.05 + 0.6;
        mesh.position.set(Math.cos(a) * 2.6, Math.sin(a) * 1.4, -i * gap - 9);
        mesh.rotation.y = -Math.cos(a) * 0.35;
        mesh.rotation.x = Math.sin(a) * 0.18;
        mesh.userData.baseY = mesh.position.y;
        mesh.userData.phase = Math.random() * 6.28;
        tunnel.add(mesh);
        frameMats.push(mat);
      }
      wake(600);
    });
  }

  // --- Loop ---
  let raf = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame() {
    raf = 0;
    const now = performance.now();
    const dt = Math.min(clock.getDelta(), 0.05);
    const animating = !state.paused && !document.hidden;
    if (animating) state.time += dt;
    const t = state.time;

    // Ease the ground toward the active chapter.
    const k = 2.6;
    groundU.uColA.value.lerp(target.colA, 1 - Math.exp(-k * dt));
    groundU.uColB.value.lerp(target.colB, 1 - Math.exp(-k * dt));
    for (const key of ["caustic", "frost", "haze", "rays", "dark"]) {
      const u = groundU["u" + key[0].toUpperCase() + key.slice(1)];
      u.value = damp(u.value, target[key], k, dt);
    }
    groundU.uTime.value = t;

    // Pointer, with an idle wander so the eye never freezes.
    const idle = now - state.lastMove > 2600;
    const px = idle ? 0.5 + Math.sin(t * 0.35) * 0.22 : state.pointer.x;
    const py = idle ? 0.55 + Math.sin(t * 0.27 + 1.3) * 0.16 : state.pointer.y;
    state.pointerSmooth.x = damp(state.pointerSmooth.x, px, 5, dt);
    state.pointerSmooth.y = damp(state.pointerSmooth.y, py, 5, dt);
    state.pointerLive = damp(state.pointerLive, idle ? 0 : 1, 2, dt);
    groundU.uPointer.value.copy(state.pointerSmooth);
    groundU.uPointerLive.value = state.pointerLive * (target.caustic > 0.5 ? 1 : 0);

    // Which objects belong to this chapter.
    const st = state.stage;
    const eyeOn = st === "water" || (st === "ripple" && !state.mobile);
    state.eyeW = damp(state.eyeW, eyeOn ? 1 : 0, 3, dt);
    state.boxW = damp(state.boxW, st === "sky" ? 0.8 : st === "white" ? 0.3 : 0, 2.2, dt);
    state.tunnelW = damp(state.tunnelW, st === "tunnel" ? 1 : 0, 2.4, dt);

    // Eye: big on the hero, rising away as you scroll; small above the contact copy.
    const m = state.mobile;
    const heroPos = m ? [0, 0.78 + state.hero * 1.6, 0] : [1.75, 0.42 + state.hero * 1.9, 0];
    const heroScale = (m ? 0.58 : 0.8) * (1 - state.hero * 0.35);
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    const contactPos = m ? [0, 1.32, 0] : [-(halfW - 0.8), 0.3, 0];
    const contactScale = m ? 0.3 : 0.4;
    const inContact = st === "ripple";
    const tp = inContact ? contactPos : heroPos;
    const ts = inContact ? contactScale : heroScale;
    eye.position.x = damp(eye.position.x, tp[0], 4, dt);
    eye.position.y = damp(eye.position.y, tp[1], 4, dt);
    const sc = damp(eye.scale.x, ts, 4, dt);
    eye.scale.setScalar(sc);
    eye.position.y += Math.sin(t * 0.8) * 0.04;
    eyeU.uOpacity.value = state.eyeW;
    eyeU.uTime.value = t;
    state.pupil = damp(state.pupil, state.pupilTarget, 6, dt);
    eyeU.uPupil.value = state.pupil;
    eye.visible = state.eyeW > 0.01;

    // Look toward the pointer, projected onto a plane in front of the camera.
    eyeTarget.set((state.pointerSmooth.x - 0.5) * 9, (state.pointerSmooth.y - 0.5) * 5.2, 7);
    eyeLook.position.copy(eye.position);
    eyeLook.lookAt(eyeTarget);
    eye.quaternion.slerp(eyeLook.quaternion, 1 - Math.exp(-6 * dt));

    boxU.uTime.value = t;
    boxU.uOpacity.value = state.boxW;
    boxU.uDrift.value = state.scrollV;
    boxes.visible = state.boxW > 0.01;

    tunnel.visible = state.tunnelW > 0.01;
    if (tunnel.visible) {
      // Hold the frames back while the section heading is on screen, then fly through.
      tunnel.position.z = Math.max(0, (state.tunnel - 0.14) / 0.86) * tunnelLength;
      tunnel.rotation.z = state.tunnel * 0.9;
      for (const mat of frameMats) mat.uniforms.uOpacity.value = state.tunnelW;
      for (const mesh of tunnel.children) {
        if (mesh.userData.baseY !== undefined) mesh.position.y = mesh.userData.baseY + Math.sin(t * 0.6 + mesh.userData.phase) * 0.06;
      }
      speckMat.opacity = state.tunnelW * 0.8;
    }

    // Render: ground to a texture (the eye refracts it), then to screen, then 3D on top.
    if (eye.visible) {
      renderer.setRenderTarget(rt);
      renderer.render(groundScene, ortho);
      renderer.setRenderTarget(null);
      renderer.render(blitScene, ortho);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(groundScene, ortho);
    }
    renderer.clearDepth();
    renderer.render(scene, camera);

    if (animating || now < state.wakeUntil) kick();
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { clock.getDelta(); kick(); } });
  resize();
  kick();

  return { setStage, setProgress, setPointer, ripple, setPupil, setPaused, loadFrames, get paused() { return state.paused; } };
}
