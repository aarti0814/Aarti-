// Shared visual language: palette, eases, materials, atmosphere, text. Mirrors
// design/visual-language.md. Every scene builds from these helpers.
import * as THREE from "three";
import { FontLoader } from "../assets/vendor/FontLoader.js";
import { TextGeometry } from "../assets/vendor/TextGeometry.js";

export const C = {
  ground: 0x0b0b0f,
  ink: 0xf4f4f6,
  accent: 0x00e5ff,
  groundCss: "#0B0B0F",
  inkCss: "#F4F4F6",
  accentCss: "#00E5FF",
};
export const FONT = { display: "MWC Display", mono: "MWC Mono" };

// ---------------------------------------------------------------- easing
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// cubic-bezier(x1, y1, x2, y2) solved for x -> y (CSS semantics).
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (s) => ((ax * s + bx) * s + cx) * s;
  const sy = (s) => ((ay * s + by) * s + cy) * s;
  const dsx = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(s) - x;
      const d = dsx(s);
      if (Math.abs(err) < 1e-6 || Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0, hi = 1;
    for (let i = 0; i < 20 && Math.abs(sx(s) - x) > 1e-6; i++) {
      if (sx(s) < x) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}

export const E = {
  expoOut: (t) => { t = clamp01(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  expoIn: (t) => { t = clamp01(t); return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
  expoInOut: (t) => {
    t = clamp01(t);
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  sineInOut: (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2,
  snap: cubicBezier(0.2, 1.4, 0.4, 1), // overshoot for locks and docks
};
export const EASE_NAMES = Object.keys(E);

/** Progress of t through [a, b], clamped to 0..1. */
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
/** Eased progress of t through [a, b]. */
export const ez = (t, a, b, fn) => fn(seg(t, a, b));
export const lerp = (a, b, k) => a + (b - a) * k;
export { clamp01 };
/** Idle drift: smooth, never linear. Returns -1..1. */
export const drift = (t, period, phase = 0) => Math.sin(((t / period) + phase) * Math.PI * 2);

// Seeded random (mulberry32). Never Math.random().
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- camera
/** Vertical FOV for a CSS-equivalent perspective in px at 1080p. */
export const fovForPerspective = (px) => (2 * Math.atan(540 / px) * 180) / Math.PI;
export const perspectiveForFov = (fov) => 540 / Math.tan(((fov / 2) * Math.PI) / 180);

export function makeCamera(perspectivePx = 1000) {
  const cam = new THREE.PerspectiveCamera(fovForPerspective(perspectivePx), 1920 / 1080, 0.05, 260);
  cam.userData.perspectivePx = perspectivePx;
  return cam;
}

/** Place a camera on a sphere around `target`. az/el in radians. */
export function orbit(cam, target, dist, az, el, roll = 0) {
  cam.position.set(
    target.x + dist * Math.cos(el) * Math.sin(az),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(el) * Math.cos(az),
  );
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(target);
}

// ---------------------------------------------------------------- scene, light
export function makeScene(env, { fogNear = 10, fogFar = 70 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.ground);
  scene.fog = new THREE.Fog(C.ground, fogNear, fogFar);
  scene.environment = env;
  scene.environmentIntensity = 0.42;
  // One key light, 45 degrees from the top left, and a cool rim from behind. No fill.
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-6, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9e9ff, 2.2);
  rim.position.set(6, 2.5, -8);
  scene.add(rim);
  return scene;
}

/** Code-built softbox studio, baked to a PMREM environment map. */
export function makeStudioEnv(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x020203);
  const box = (w, h, pos, color, power) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    studio.add(m);
  };
  box(9, 2.2, [-6, 7, 5], 0xffffff, 3.2);   // key strip, top left
  box(1.2, 7, [-8, 1, 2], 0xffffff, 1.4);   // soft side strip
  box(10, 1.2, [3, 1.5, -8], 0xa9e9ff, 2.6); // cool rim strip behind
  box(30, 0.25, [0, -2, 9], 0xffffff, 0.8); // thin floor bounce line
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(studio, 0.02).texture;
  pmrem.dispose();
  return tex;
}

// ---------------------------------------------------------------- materials
export function makeMaterials() {
  const matte = new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.86, metalness: 0.0 });
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xc8cbd2, metalness: 1, roughness: 0.42, anisotropy: 0.7, anisotropyRotation: Math.PI / 2,
  });
  const darkMetal = new THREE.MeshPhysicalMaterial({
    color: 0x3a3d45, metalness: 1, roughness: 0.48, anisotropy: 0.7,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff, metalness: 0, roughness: 0.3, transmission: 1, thickness: 1.2, ior: 1.45,
    attenuationColor: new THREE.Color(0xbfe9ff), attenuationDistance: 6,
  });
  const ink = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.42, metalness: 0.05 });
  const inkFlat = new THREE.MeshBasicMaterial({ color: C.ink, toneMapped: false });
  const accent = new THREE.MeshBasicMaterial({ color: C.accent, toneMapped: false });
  return { matte, metal, darkMetal, glass, ink, inkFlat, accent };
}

// ---------------------------------------------------------------- atmosphere
let dotTexture = null;
function getDot() {
  if (dotTexture) return dotTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  dotTexture.colorSpace = THREE.SRGBColorSpace;
  return dotTexture;
}

/**
 * A field of soft points in a box. Used for the far background dust and the near
 * foreground particles that give every camera move parallax.
 */
export function makeDust({ seed, count, center, size, pointSize = 0.05, opacity = 0.6, color = C.ink, fog = true }) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + (r() - 0.5) * size[0];
    pos[i * 3 + 1] = center[1] + (r() - 0.5) * size[1];
    pos[i * 3 + 2] = center[2] + (r() - 0.5) * size[2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size: pointSize, map: getDot(), transparent: true, opacity, depthWrite: false,
    sizeAttenuation: true, fog, toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/**
 * Foreground particles that stay near the lens wherever the camera goes. Each point is
 * fixed in world space (so it parallaxes past the camera) and wraps inside a box of
 * half-size `half` centred on the camera: a pure function of camera position.
 * Call `points.userData.follow(camera)` after the camera is placed each frame.
 */
export function makeNearDust({ seed, count = 140, half = 2.6, pointSize = 0.022, opacity = 0.34 }) {
  const r = rng(seed);
  const base = new Float32Array(count * 3);
  for (let i = 0; i < base.length; i++) base[i] = (r() - 0.5) * 2 * half;
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute("position", attr);
  const mat = new THREE.PointsMaterial({
    color: C.ink, size: pointSize, map: getDot(), transparent: true, opacity, depthWrite: false,
    sizeAttenuation: true, toneMapped: false, fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const span = 2 * half;
  const wrap = (x) => ((((x + half) % span) + span) % span) - half;
  pts.userData.follow = (cam) => {
    const c = cam.position;
    for (let i = 0; i < count; i++) {
      const x = wrap(base[i * 3] - c.x);
      const y = wrap(base[i * 3 + 1] - c.y);
      const z = wrap(base[i * 3 + 2] - c.z);
      // Too close to the lens reads as a smudge: park it out of view.
      const near = x * x + y * y + z * z < 0.8 * 0.8;
      pos[i * 3] = c.x + x;
      pos[i * 3 + 1] = near ? -1e5 : c.y + y;
      pos[i * 3 + 2] = c.z + z;
    }
    attr.needsUpdate = true;
  };
  return pts;
}

/** Thin floor grid that fades into the fog. */
export function makeFloorGrid({ size = 80, divisions = 40, y = 0, opacity = 0.12 } = {}) {
  const grid = new THREE.GridHelper(size, divisions, C.ink, C.ink);
  grid.position.y = y;
  grid.material.transparent = true;
  grid.material.opacity = opacity;
  grid.material.depthWrite = false;
  grid.material.toneMapped = false;
  return grid;
}

/** Matte floor plane under a grid; hides anything that rises from below. */
export function makeFloor({ size = 120, y = -0.002 } = {}) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    // Lambert: no specular, so the studio strips never streak across the floor.
    new THREE.MeshLambertMaterial({ color: 0x0e0e13 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  return floor;
}

// ---------------------------------------------------------------- text
/**
 * Draws text into a canvas texture. `lines` = [{ text, font: "display"|"mono", weight,
 * px, x, y, align, color, tracking, maxWidth }]. Returns { texture, canvas, draw }.
 */
export function makeTextTexture(w, h, drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const draw = (...args) => {
    g.clearRect(0, 0, w, h);
    drawFn(g, w, h, ...args);
    texture.needsUpdate = true;
  };
  draw();
  return { texture, canvas, draw };
}

/** Set a canvas font, shrinking until `text` fits `maxWidth`. Returns the px used. */
export function fitFont(g, text, family, weight, px, maxWidth, tracking = 0) {
  let size = px;
  for (;;) {
    g.font = `${weight} ${size}px "${family}"`;
    g.letterSpacing = `${tracking * size}px`;
    if (g.measureText(text).width <= maxWidth || size <= 8) return size;
    size -= 2;
  }
}

/**
 * A plane carrying a text texture. Registers itself for the size / safe-zone check:
 * `fontPx` is the size of the smallest text on it, in texture pixels.
 */
export function makeTextPlane(width, height, tex, { fontPx, label, opacity = 1 } = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex.texture, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData.text = { kind: "plane", fontPx, texH: tex.canvas.height, label };
  return mesh;
}

let fontPromise = null;
export function loadDisplayFont3D() {
  if (!fontPromise) fontPromise = new FontLoader().loadAsync("assets/fonts/SpaceGrotesk-Bold.typeface.json");
  return fontPromise;
}

/**
 * Extruded word, one pivot per glyph so each letter can animate on its own.
 * Returns { group, letters: [{ pivot, mesh, home: Vector3, char }], width, height }.
 */
export function makeExtrudedWord(font, text, { size = 1, depth = 0.32, tracking = -0.02, materials, label } = {}) {
  const scale = size / font.data.resolution;
  const group = new THREE.Group();
  const letters = [];
  let cursor = 0;
  for (const ch of text) {
    const glyph = font.data.glyphs[ch] || font.data.glyphs[" "];
    const advance = (glyph.ha || 500) * scale;
    if (ch.trim()) {
      const geo = new TextGeometry(ch, {
        font, size, depth, curveSegments: 6,
        bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 3,
      });
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      const cx = (b.min.x + b.max.x) / 2;
      const cy = (b.min.y + b.max.y) / 2;
      geo.translate(-cx, -cy, -depth / 2);
      const mesh = new THREE.Mesh(geo, materials);
      const pivot = new THREE.Group();
      pivot.add(mesh);
      const home = new THREE.Vector3(cursor + cx, cy, 0);
      pivot.position.copy(home);
      group.add(pivot);
      letters.push({
        pivot, mesh, home, char: ch,
        w: b.max.x - b.min.x, h: b.max.y - b.min.y,
      });
    }
    cursor += advance + tracking * size;
  }
  const width = cursor - tracking * size;
  for (const l of letters) {
    l.home.x -= width / 2;
    l.home.y -= size * 0.35;
    l.pivot.position.copy(l.home);
  }
  group.userData.text = { kind: "world", emWorld: size, label: label || text };
  return { group, letters, width, height: size };
}
