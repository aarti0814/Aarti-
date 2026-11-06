// 0:56-1:00 END CARD
// The camera starts tight on the logo, landing from the montage whip, and pulls back to
// reveal the whole built world. The logo settles, the tagline types out, and the film
// hard-cuts to black on frame 1794 (engine).
import * as THREE from "three";
import {
  C, E, ez, seg, lerp, drift, rng, makeScene, makeCamera, makeDust, makeNearDust, makeFloor, makeFloorGrid,
  makeExtrudedWord, orbit,
} from "../timeline/style.js";

const TAGLINE = "Every frame. Every move. Written in code.";

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 16, fogFar: 70 });
    const cam = makeCamera(1000);
    const M = ctx.mats;

    const word = makeExtrudedWord(ctx.font3d, "MADE WITH CLAUDE", {
      size: 1, depth: 0.3, materials: [M.ink, M.metal], label: "MADE WITH CLAUDE (logo)",
    });
    const k = 15.2 / word.width;
    word.group.scale.setScalar(k);
    const subject = new THREE.Group();
    subject.add(word.group);
    const claude = word.letters.slice(-6);
    const claudeX = ((claude[0].home.x + claude[5].home.x) / 2) * k;
    const hairW = (claude[5].home.x + claude[5].w / 2 - (claude[0].home.x - claude[0].w / 2));
    const baseY = Math.min(...word.letters.map((l) => l.home.y - l.h / 2)) - 0.2;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.035), M.accent);
    hair.position.set(claudeX / k, baseY, 0.16);
    word.group.add(hair);
    scene.add(subject);

    // The world the film built, revealed by the pull-back.
    const world = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 40), M.glass);
    sphere.position.set(-15, 1.2, -15);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.5, 48, 128), M.metal);
    torus.position.set(15.5, 1.0, -16);
    const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), M.glass);
    crystal.position.set(0, 7.2, -24);
    crystal.scale.set(1, 1.3, 1);
    world.add(sphere, torus, crystal);
    const cards = [];
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.7, 0.06), M.glass);
      const a = -0.75 + i * 0.375;
      c.position.set(Math.sin(a) * 20, -1.2, -Math.cos(a) * 20 - 2);
      c.lookAt(0, -1.2, 0);
      world.add(c);
      cards.push(c);
    }
    const r = rng(81);
    const shardGeo = new THREE.TetrahedronGeometry(0.26, 0);
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(shardGeo, M.darkMetal);
      const a = r() * Math.PI * 2, rad = 15 + r() * 10;
      m.position.set(Math.cos(a) * rad, -2 + r() * 8, Math.sin(a) * rad - 6);
      m.rotation.set(r() * 6, r() * 6, r() * 6);
      world.add(m);
    }
    const background = new THREE.Group();
    background.add(
      world,
      makeFloor({ size: 160, y: -3.2 }),
      makeFloorGrid({ size: 140, divisions: 70, y: -3.198, opacity: 0.09 }),
      makeDust({ seed: 82, count: 1800, center: [0, 6, -40], size: [140, 40, 60], pointSize: 0.1, opacity: 0.32 }),
    );
    const foreground = makeNearDust({ seed: 83 });
    scene.add(background, foreground);

    const target = new THREE.Vector3();
    const tagText = ctx.dom.taglineText;
    const tagCursor = ctx.dom.taglineCursor;

    function update(lt) {
      // Logo settles: letters swing in on Y with the overshoot snap, staggered.
      word.letters.forEach((l, i) => {
        const p = seg(lt, 0.1 + i * 0.03, 1.2 + i * 0.03);
        l.pivot.rotation.set(0, 0.55 * (1 - E.snap(p)), 0);
        l.pivot.position.copy(l.home);
      });
      const h = ez(lt, 0.8, 1.5, E.expoOut);
      hair.scale.x = Math.max(1e-3, hairW * h);
      hair.visible = h > 0.001;

      sphere.position.y = 1.2 + 0.2 * drift(lt, 3.6);
      torus.rotation.set(0.6 + 0.3 * ez(lt, 0, 4, E.sineInOut), 0.4 * drift(lt, 5), 0);
      crystal.rotation.y = 1.2 * ez(lt, 0, 4, E.sineInOut);

      // Pull back from tight on CLAUDE to the full scene.
      const pull = ez(lt, 0, 1.7, E.expoOut);
      target.set(lerp(claudeX, 0, pull), lerp(0, -0.95, pull), 0);
      const dist = lerp(2.6, 14.2, pull) + 0.5 * ez(lt, 1.7, 4, E.sineInOut);
      orbit(cam, target, dist, lerp(0.35, 0, pull) + 0.03 * drift(lt, 6), lerp(0.02, 0.07, pull));

      // Tagline types out (DOM, display face, 46 px), then holds with a blinking cursor.
      const n = Math.round(TAGLINE.length * ez(lt, 0.9, 1.7, E.sineInOut));
      ctx.dom.tagline.style.opacity = lt >= 0.85 ? "1" : "0";
      tagText.textContent = TAGLINE.slice(0, n);
      tagCursor.style.opacity = lt < 1.7 || Math.floor(lt * 2.5) % 2 === 0 ? "1" : "0";

      foreground.userData.follow(cam);
      return { camera: cam, blur: lt < 0.45 ? 3 : 1 };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
