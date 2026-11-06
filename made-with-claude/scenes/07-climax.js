// 0:48-0:56 TRANSFORM CLIMAX
// Every object from the piece (title slabs, cards, panels, sphere, torus, crystal, wireframe)
// converges into one central form, then bursts outward. Then an 8-cut montage in 4 seconds,
// a soft white flash on each cut (handled by the engine from timing.js).
import * as THREE from "three";
import { C, E, ez, seg, lerp, drift, rng, makeScene, makeCamera, makeDust, makeNearDust, orbit } from "../timeline/style.js";
import { CUTS, FPS } from "../timeline/timing.js";

const START = 48;
const MONTAGE = CUTS.filter((c) => c.flash).map((c) => c.frame / FPS - START); // 4.0 .. 7.5
const CONVERGE = [0.4, 2.4];
const BURST = 2.7;

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 14, fogFar: 80 });
    scene.environmentIntensity = 0.7;
    const cam = makeCamera(950);
    const M = ctx.mats;
    const r = rng(71);

    // Proxies of everything the film has shown.
    const kinds = [];
    for (let i = 0; i < 14; i++) kinds.push([new THREE.BoxGeometry(0.62, 0.84, 0.3), M.darkMetal]); // title slabs
    for (let i = 0; i < 5; i++) kinds.push([new THREE.BoxGeometry(1.3, 1.75, 0.05), M.glass]);      // cards
    for (let i = 0; i < 4; i++) kinds.push([new THREE.BoxGeometry(2.6, 1.45, 0.08), M.metal]);      // panels
    kinds.push([new THREE.SphereGeometry(0.8, 48, 32), M.glass]);                                   // glass sphere
    kinds.push([new THREE.TorusGeometry(0.7, 0.26, 32, 96), M.metal]);                              // torus
    kinds.push([new THREE.IcosahedronGeometry(0.85, 0), M.glass]);                                  // crystal
    for (let i = 0; i < 10; i++) kinds.push([new THREE.TetrahedronGeometry(0.3, 0), M.matte]);      // shards

    const subject = new THREE.Group();
    const objs = kinds.map(([geo, mat], j) => {
      const mesh = new THREE.Mesh(geo, mat);
      subject.add(mesh);
      const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const home = dir.clone().multiplyScalar(8 + r() * 5);
      home.y *= 0.6;
      const core = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.25 + 0.75 * Math.cbrt(r()));
      const out = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(13 + r() * 13);
      return {
        mesh, home, core, out, delay: r() * 0.35,
        rot0: new THREE.Euler(r() * 6, r() * 6, r() * 6),
        spin: new THREE.Vector3((r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 6),
      };
    });
    // The wireframe joins the convergence too.
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.1, 1)),
      new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.85, toneMapped: false }),
    );
    subject.add(wire);
    objs.push({
      mesh: wire, home: new THREE.Vector3(-9, 3, -4), core: new THREE.Vector3(), out: new THREE.Vector3(0, 0, 0),
      delay: 0.2, rot0: new THREE.Euler(), spin: new THREE.Vector3(2, 3, 1), isWire: true,
    });

    // Burst: an off-white ring, a thin cyan ring, and a radial spray of points.
    // Hairline loops: they stay one pixel wide however large the ring grows.
    const circle = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 256 }, (_, i) => new THREE.Vector3(Math.cos((i / 256) * Math.PI * 2), Math.sin((i / 256) * Math.PI * 2), 0)),
    );
    const ringW = new THREE.LineLoop(circle, new THREE.LineBasicMaterial({ color: C.ink, transparent: true, toneMapped: false, depthWrite: false }));
    const ringC = new THREE.LineLoop(circle, new THREE.LineBasicMaterial({ color: C.accent, transparent: true, toneMapped: false, depthWrite: false }));
    const sprayN = 700;
    const sprayDir = new Float32Array(sprayN * 3);
    const sprayPos = new Float32Array(sprayN * 3);
    for (let i = 0; i < sprayN; i++) {
      const d = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.7, r() - 0.5).normalize().multiplyScalar(6 + r() * 26);
      sprayDir.set([d.x, d.y, d.z], i * 3);
    }
    const sprayGeo = new THREE.BufferGeometry();
    const sprayAttr = new THREE.BufferAttribute(sprayPos, 3);
    sprayGeo.setAttribute("position", sprayAttr);
    const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({
      color: C.ink, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false,
    }));
    spray.frustumCulled = false;
    subject.add(ringW, ringC, spray);
    scene.add(subject);

    const background = makeDust({ seed: 72, count: 2200, center: [0, 0, 0], size: [160, 90, 160], pointSize: 0.12, opacity: 0.3 });
    const foreground = makeNearDust({ seed: 73 });
    scene.add(background, foreground);

    // Montage shots: each follows one piece of debris from a new angle.
    const shots = MONTAGE.map((t0, k) => ({
      t0, t1: t0 + 0.5, obj: [24, 3, 21, 25, 9, 17, 26, -1][k],
      az: [0.6, 2.4, -1.5, 3.6, 1.1, -2.6, 4.4, 0.2][k],
      el: [0.25, -0.3, 0.6, 0.1, -0.15, 0.45, 0.0, 0.18][k],
      d0: [4.2, 3.6, 4.8, 3.4, 4.0, 3.8, 3.2, 26][k],
      d1: [3.3, 2.8, 3.8, 2.7, 3.1, 3.0, 2.6, 21][k],
    }));
    const target = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    function update(lt) {
      // Core squeeze before the burst.
      const squeeze = 1 - 0.2 * Math.sin(Math.PI * seg(lt, 2.4, BURST));
      for (const o of objs) {
        const g = ez(lt, CONVERGE[0] + o.delay, CONVERGE[1], E.expoIn);
        const b = ez(lt, BURST, 8.0, E.expoOut);
        tmp.copy(o.home).lerp(o.core.clone().multiplyScalar(squeeze), g);
        if (b > 0) tmp.copy(o.core).multiplyScalar(squeeze).lerp(o.out, b);
        o.mesh.position.copy(tmp);
        o.mesh.position.y += 0.15 * drift(lt, 3, o.delay) * (1 - g);
        const sp = 0.6 * ez(lt, 0, CONVERGE[1], E.sineInOut) + 1.4 * b;
        o.mesh.rotation.set(o.rot0.x + o.spin.x * sp, o.rot0.y + o.spin.y * sp, o.rot0.z + o.spin.z * sp);
        const sc = b > 0 ? lerp(0.42, 1, ez(lt, BURST, BURST + 0.8, E.expoOut)) : lerp(1, 0.42, g);
        o.mesh.scale.setScalar(o.isWire ? sc * (b > 0 ? 3.2 * b + 0.42 : 1) : sc);
      }
      const rk = ez(lt, BURST, 4.1, E.expoOut);
      const fade = 1 - ez(lt, BURST + 0.25, 4.1, E.sineInOut);
      ringW.visible = ringC.visible = lt >= BURST && fade > 0.01;
      ringW.scale.setScalar(0.1 + 24 * rk);
      ringC.scale.setScalar(0.1 + 21 * ez(lt, BURST + 0.05, 4.1, E.expoOut));
      ringW.rotation.x = ringC.rotation.x = Math.PI / 2 - 0.18;
      ringW.material.opacity = 0.9 * fade;
      ringC.material.opacity = 0.9 * fade;
      const sk = ez(lt, BURST, 6.5, E.expoOut);
      spray.visible = lt >= BURST;
      for (let i = 0; i < sprayN * 3; i++) sprayPos[i] = sprayDir[i] * sk;
      sprayAttr.needsUpdate = true;
      spray.material.opacity = 0.9 * (1 - 0.6 * seg(lt, 4, 8));

      let blur = 1;
      if (lt < MONTAGE[0]) {
        const land = ez(lt, 0, 0.7, E.expoOut);
        let dist = lerp(36, 22, land) - 11 * ez(lt, CONVERGE[0], CONVERGE[1], E.sineInOut);
        dist += 13 * ez(lt, BURST, 4.0, E.expoOut);
        target.set(0, 0, 0);
        orbit(cam, target, dist, 0.3 - 0.8 * ez(lt, 0, 4, E.sineInOut), 0.22 - 0.1 * ez(lt, 0, 4, E.sineInOut));
        if (lt < 0.233 || (lt > 1.6 && lt < CONVERGE[1]) || (lt > BURST && lt < BURST + 0.6)) blur = 3;
      } else {
        let s = 0;
        while (s < 7 && lt >= shots[s + 1].t0) s++;
        const sh = shots[s];
        if (sh.obj >= 0) objs[sh.obj].mesh.getWorldPosition(target);
        else target.set(0, 0, 0);
        let dist = lerp(sh.d0, sh.d1, ez(lt, sh.t0, sh.t1, E.expoOut));
        if (lt - sh.t0 < 0.1) blur = 3;
        if (s === 7) {
          const whip = ez(lt, 7.767, 8.0, E.expoIn);
          dist += 30 * whip;
          if (whip > 0) blur = 3;
        }
        orbit(cam, target, dist, sh.az + 0.1 * ez(lt, sh.t0, sh.t1, E.sineInOut), sh.el);
      }
      foreground.userData.follow(cam);
      return { camera: cam, blur };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
