// 0:04-0:10 TITLE REVEAL
// "MADE WITH CLAUDE" assembles from scattered extruded slabs: each slab tumbles in,
// rotates into place on Z with an overshoot snap, and is carved into its letter.
// The final letter locks on frame 298; a 2-frame white flash covers the cut at 10.0 s.
import * as THREE from "three";
import {
  C, E, ez, seg, lerp, drift, rng, makeScene, makeCamera, makeDust, makeNearDust, makeFloorGrid, makeExtrudedWord, orbit,
} from "../timeline/style.js";

const LOCK = 5.933; // local time of the final lock (frame 298)
const DUR = 1.3;

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 12, fogFar: 60 });
    const cam = makeCamera(1000);
    const word = makeExtrudedWord(ctx.font3d, "MADE WITH CLAUDE", {
      size: 1, depth: 0.34, materials: [ctx.mats.ink, ctx.mats.metal], label: "MADE WITH CLAUDE (3D title)",
    });
    const k = 16.4 / word.width;
    word.group.scale.setScalar(k);
    const subject = new THREE.Group();
    subject.add(word.group);
    scene.add(subject);

    const r = rng(21);
    const n = word.letters.length;
    const step = (LOCK - DUR - 0.15) / (n - 1);
    const slabMat = ctx.mats.darkMetal;
    const anims = word.letters.map((l, i) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(l.w + 0.12, l.h + 0.12, 0.34), slabMat);
      l.pivot.add(slab);
      return {
        l, slab, start: 0.15 + i * step,
        from: new THREE.Vector3((r() - 0.5) * 28, (r() - 0.5) * 15, -16 + r() * 12),
        rz: (r() < 0.5 ? -1 : 1) * (0.9 + r() * 2.2),
        rx: (r() - 0.5) * 1.6,
        ry: (r() - 0.5) * 1.6,
      };
    });

    // Accent hairline under CLAUDE.
    const claude = word.letters.slice(-6);
    const cx0 = claude[0].home.x - claude[0].w / 2;
    const cx1 = claude[5].home.x + claude[5].w / 2;
    const baseY = Math.min(...word.letters.map((l) => l.home.y - l.h / 2)) - 0.2;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.035), ctx.mats.accent);
    hair.position.set((cx0 + cx1) / 2, baseY, 0.18);
    word.group.add(hair);

    const background = new THREE.Group();
    background.add(
      makeDust({ seed: 22, count: 1400, center: [0, 0, -34], size: [110, 60, 30], pointSize: 0.09, opacity: 0.38 }),
      makeFloorGrid({ size: 120, divisions: 60, y: -4.2, opacity: 0.09 }),
    );
    const foreground = makeNearDust({ seed: 23 });
    scene.add(background, foreground);

    const target = new THREE.Vector3();

    function update(lt) {
      let fast = false;
      for (const a of anims) {
        const p = seg(lt, a.start, a.start + DUR);
        if (p > 0 && p < 0.4) fast = true;
        const mv = E.expoOut(p);
        const rot = 1 - E.snap(p);
        a.l.pivot.position.set(
          lerp(a.from.x, a.l.home.x, mv), lerp(a.from.y, a.l.home.y, mv), lerp(a.from.z, a.l.home.z, mv),
        );
        a.l.pivot.rotation.set(a.rx * rot, a.ry * rot, a.rz * rot);
        // Carve: the slab thins away as the letter extrudes out of it.
        const carve = ez(lt, a.start + DUR * 0.5, a.start + DUR, E.expoOut);
        a.l.mesh.visible = carve > 0;
        a.l.mesh.scale.z = Math.max(0.02, E.snap(seg(lt, a.start + DUR * 0.5, a.start + DUR)));
        a.slab.scale.z = Math.max(0.02, 1 - carve);
        a.slab.scale.x = a.slab.scale.y = 1 - 0.15 * carve;
        a.slab.visible = carve < 0.97;
      }
      const h = ez(lt, 5.0, 5.85, E.expoOut);
      hair.scale.x = Math.max(1e-3, (cx1 - cx0) * h);
      hair.visible = h > 0.001;

      const push = ez(lt, 0, 5.95, E.expoOut);
      target.set(0, 0.05 * drift(lt, 6), 0);
      orbit(cam, target, lerp(17.5, 13.2, push), lerp(0.3, 0.0, E.sineInOut(seg(lt, 0, 5.9))), lerp(0.1, 0.03, push));
      foreground.userData.follow(cam);
      return { camera: cam, blur: fast ? 3 : 1 };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
