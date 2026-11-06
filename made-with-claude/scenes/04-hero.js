// 0:18-0:28 HERO SHOWCASE
// One mesh, three shapes: a glass sphere morphs into a brushed-metal torus, then into a
// faceted frosted crystal, turning on a single tilted axis. Then four zoom-cuts in three
// seconds, each on a new angle of the same object, and a 7-frame whip zoom out.
import * as THREE from "three";
import { E, ez, seg, lerp, drift, rng, makeScene, makeCamera, makeDust, makeNearDust, makeFloorGrid, orbit } from "../timeline/style.js";
import { CUTS, FPS } from "../timeline/timing.js";

const U = 288; // segments around
const V = 176; // segments pole to pole
const START = 18;
const SHOT_AT = CUTS.filter((c) => c.type === "shot" && c.frame >= 750 && c.frame < 840).map((c) => c.frame / FPS - START);

function buildShapes() {
  const n = (U + 1) * (V + 1);
  const S = { p: new Float32Array(n * 3), n: new Float32Array(n * 3) };
  const T = { p: new Float32Array(n * 3), n: new Float32Array(n * 3) };
  const K = { p: new Float32Array(n * 3), n: new Float32Array(n * 3) };
  // Crystal: icosahedron face planes, stretched on Y. Flat facets come from using the
  // hit plane's normal for every vertex on it.
  const ico = new THREE.IcosahedronGeometry(1, 0); // already non-indexed
  const ip = ico.attributes.position;
  const planes = [];
  for (let i = 0; i < ip.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(ip, i);
    const b = new THREE.Vector3().fromBufferAttribute(ip, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(ip, i + 2);
    planes.push(a.add(b).add(c).normalize());
  }
  const H = 1.22, SY = 1.32, RS = 1.6, TR = 1.3, Tr = 0.56;
  let k = 0;
  for (let j = 0; j <= V; j++) {
    const phi = (j / V) * Math.PI;
    for (let i = 0; i <= U; i++, k++) {
      const th = (i / U) * Math.PI * 2;
      const dx = Math.sin(phi) * Math.cos(th), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(th);
      S.p.set([dx * RS, dy * RS, dz * RS], k * 3);
      S.n.set([dx, dy, dz], k * 3);
      const psi = 2 * phi + Math.PI / 2;
      const ring = TR + Tr * Math.cos(psi);
      T.p.set([ring * Math.cos(th), Tr * Math.sin(psi), ring * Math.sin(th)], k * 3);
      T.n.set([Math.cos(psi) * Math.cos(th), Math.sin(psi), Math.cos(psi) * Math.sin(th)], k * 3);
      let best = Infinity, bn = planes[0];
      for (const pn of planes) {
        const d = pn.x * dx + pn.y * dy + pn.z * dz;
        if (d > 1e-4 && H / d < best) { best = H / d; bn = pn; }
      }
      K.p.set([dx * best, dy * best * SY, dz * best], k * 3);
      const nn = new THREE.Vector3(bn.x, bn.y / SY, bn.z).normalize();
      K.n.set([nn.x, nn.y, nn.z], k * 3);
    }
  }
  const idx = [];
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * (U + 1) + i, b = a + U + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { S, T, K, idx, n };
}

const LOOKS = {
  sphere:  { transmission: 1,      metalness: 0, roughness: 0.06, color: new THREE.Color(0xf2faff) },
  torus:   { transmission: 0.0001, metalness: 1, roughness: 0.4,  color: new THREE.Color(0xc8cbd2) },
  crystal: { transmission: 1,      metalness: 0, roughness: 0.3,  color: new THREE.Color(0xe4f3ff) },
};

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 8, fogFar: 44 });
    scene.environmentIntensity = 0.55;
    const cam = makeCamera(950);

    const shapes = buildShapes();
    const geo = new THREE.BufferGeometry();
    const pos = new THREE.BufferAttribute(new Float32Array(shapes.n * 3), 3);
    const nor = new THREE.BufferAttribute(new Float32Array(shapes.n * 3), 3);
    geo.setAttribute("position", pos);
    geo.setAttribute("normal", nor);
    // UVs: the brushed-metal (anisotropic) shading derives its tangent frame from them.
    const uv = new Float32Array(shapes.n * 2);
    for (let j = 0, q = 0; j <= V; j++) for (let i = 0; i <= U; i++, q++) { uv[q * 2] = i / U; uv[q * 2 + 1] = j / V; }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(shapes.idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.4);
    const mat = new THREE.MeshPhysicalMaterial({
      thickness: 1.6, ior: 1.5, anisotropy: 0.7, anisotropyRotation: Math.PI / 2,
      attenuationColor: new THREE.Color(0xbfe9ff), attenuationDistance: 5, side: THREE.FrontSide,
      transmission: 1, metalness: 0, roughness: 0.1,
    });
    const morph = new THREE.Mesh(geo, mat);
    const pivot = new THREE.Group();
    pivot.add(morph);
    const subject = new THREE.Group();
    subject.add(pivot);
    scene.add(subject);
    const axis = new THREE.Vector3(0.25, 1, 0.12).normalize();

    // Background: a ring of brushed shards, a floor grid, far dust.
    const background = new THREE.Group();
    const r = rng(41);
    const shards = new THREE.Group();
    const shardGeo = new THREE.TetrahedronGeometry(0.28, 0);
    for (let i = 0; i < 110; i++) {
      const m = new THREE.Mesh(shardGeo, ctx.mats.darkMetal);
      const a = r() * Math.PI * 2, rad = 10 + r() * 6;
      m.position.set(Math.cos(a) * rad, -1.5 + r() * 4.5, Math.sin(a) * rad);
      m.rotation.set(r() * 6, r() * 6, r() * 6);
      m.scale.setScalar(0.6 + r() * 1.4);
      shards.add(m);
    }
    // Light strips on a far ring: something bright for the glass to refract from any angle.
    const strips = new THREE.Group();
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f6, toneMapped: false, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r() * 0.2;
      const h = 3 + r() * 5;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.09, h), stripMat);
      s.position.set(Math.cos(a) * 18, -1 + r() * 3, Math.sin(a) * 18);
      s.lookAt(0, s.position.y, 0);
      strips.add(s);
    }
    background.add(
      strips,
      shards,
      makeFloorGrid({ size: 100, divisions: 50, y: -2.6, opacity: 0.08 }),
      makeDust({ seed: 42, count: 1500, center: [0, 2, 0], size: [110, 50, 110], pointSize: 0.1, opacity: 0.32 }),
    );
    const foreground = makeNearDust({ seed: 43, half: 2.2, pointSize: 0.018 });
    scene.add(background, foreground);

    const shots = [
      { az: 2.3,  el: -0.32, d0: 4.4, d1: 3.5 },
      { az: -1.2, el: 0.92,  d0: 3.8, d1: 3.0 },
      { az: 0.45, el: 0.08,  d0: 2.9, d1: 2.35 },
      { az: 3.7,  el: 0.3,   d0: 5.6, d1: 4.9 },
    ];
    const target = new THREE.Vector3();
    const set = (look) => {
      mat.transmission = look.transmission;
      mat.metalness = look.metalness;
      mat.roughness = look.roughness;
      mat.color.copy(look.color);
    };
    const mixLook = (a, b, k) => {
      mat.transmission = lerp(a.transmission, b.transmission, k);
      mat.metalness = lerp(a.metalness, b.metalness, k);
      mat.roughness = lerp(a.roughness, b.roughness, k);
      mat.color.copy(a.color).lerp(b.color, k);
    };

    function update(lt) {
      // Morph: sphere -> torus (2.0-3.4), torus -> crystal (4.6-6.0).
      const k1 = ez(lt, 2.0, 3.4, E.expoInOut);
      const k2 = ez(lt, 4.6, 6.0, E.expoInOut);
      const A = k2 > 0 ? shapes.T : shapes.S;
      const B = k2 > 0 ? shapes.K : shapes.T;
      const k = k2 > 0 ? k2 : k1;
      const pa = pos.array, na = nor.array;
      for (let i = 0; i < pa.length; i += 3) {
        pa[i] = A.p[i] + (B.p[i] - A.p[i]) * k;
        pa[i + 1] = A.p[i + 1] + (B.p[i + 1] - A.p[i + 1]) * k;
        pa[i + 2] = A.p[i + 2] + (B.p[i + 2] - A.p[i + 2]) * k;
        const x = A.n[i] + (B.n[i] - A.n[i]) * k;
        const y = A.n[i + 1] + (B.n[i + 1] - A.n[i + 1]) * k;
        const z = A.n[i + 2] + (B.n[i + 2] - A.n[i + 2]) * k;
        const l = Math.hypot(x, y, z) || 1;
        na[i] = x / l; na[i + 1] = y / l; na[i + 2] = z / l;
      }
      pos.needsUpdate = true;
      nor.needsUpdate = true;
      if (k2 > 0) mixLook(LOOKS.torus, LOOKS.crystal, k2);
      else if (k1 > 0) mixLook(LOOKS.sphere, LOOKS.torus, k1);
      else set(LOOKS.sphere);

      // One rotation axis for the whole scene.
      pivot.quaternion.setFromAxisAngle(axis, 0.4 + 7.2 * ez(lt, 0, 10, E.sineInOut));
      pivot.position.y = 0.08 * drift(lt, 4.2);
      shards.rotation.y = 0.35 * ez(lt, 0, 10, E.sineInOut);

      let blur = 1;
      target.set(0, 0, 0);
      if (lt < SHOT_AT[0]) {
        // Arrive out of the zoom-through, decelerating; slow orbit while it morphs.
        const land = ez(lt, 0, 1.2, E.expoOut);
        const dist = lerp(12, 5.8, land) - 0.9 * ez(lt, 1.2, SHOT_AT[0], E.sineInOut);
        orbit(cam, target, dist, -0.6 + 1.2 * ez(lt, 0, SHOT_AT[0], E.sineInOut), 0.2);
        if (lt < 0.25) blur = 3;
      } else {
        // Zoom-cuts: each shot lands on a new angle and pushes in (expo-out).
        let s = 0;
        while (s < 3 && lt >= SHOT_AT[s + 1]) s++;
        const t0 = SHOT_AT[s];
        const t1 = s < 3 ? SHOT_AT[s + 1] : 10;
        const sh = shots[s];
        let dist = lerp(sh.d0, sh.d1, ez(lt, t0, t1, E.expoOut));
        if (lt - t0 < 0.12) blur = 3;
        if (s === 3) {
          const whip = ez(lt, 9.767, 10, E.expoIn);
          dist += 16 * whip;
          if (whip > 0) blur = 3;
        }
        orbit(cam, target, dist, sh.az + 0.08 * ez(lt, t0, t1, E.sineInOut), sh.el);
      }
      foreground.userData.follow(cam);
      return { camera: cam, blur };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
