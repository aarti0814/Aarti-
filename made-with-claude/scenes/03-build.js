// 0:10-0:18 THE BUILD
// Five frosted cards rise from the floor: IDEA, CODE, SCENE, TIMING, RENDER. The camera
// lands on a whip, orbits 90 degrees around the grid, then zooms through the gap between
// CODE and SCENE into the next scene.
import * as THREE from "three";
import {
  C, FONT, E, ez, seg, lerp, drift, makeScene, makeCamera, makeDust, makeNearDust, makeFloor, makeFloorGrid,
  makeTextTexture, makeTextPlane, fitFont, orbit,
} from "../timeline/style.js";

const CW = 2.6;
const CH = 3.5;
const CARDS = [
  { word: "IDEA",   x: -3.1,  z: 0 },
  { word: "CODE",   x: 0,     z: 0 },
  { word: "SCENE",  x: 3.1,   z: 0 },
  { word: "TIMING", x: -1.55, z: -3.4 },
  { word: "RENDER", x: 4.65,  z: -3.4 },
];
const GAP = new THREE.Vector3(1.55, 1.7, 0); // between CODE and SCENE

function cardTexture(word, index) {
  return makeTextTexture(520, 700, (g, w, h) => {
    g.fillStyle = "rgba(11,11,15,0.55)";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(244,244,246,0.35)";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = C.inkCss;
    g.textBaseline = "alphabetic";
    g.font = `400 100px "${FONT.mono}"`;
    g.letterSpacing = "0px";
    g.fillText(String(index + 1).padStart(2, "0"), 40, 130);
    fitFont(g, word, FONT.display, 700, 118, w - 80, -0.02);
    g.fillText(word, 40, h - 70);
    g.fillStyle = C.accentCss;
    g.fillRect(40, h - 40, 64, 6);
  });
}

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 10, fogFar: 48 });
    const cam = makeCamera(1000);

    const subject = new THREE.Group();
    const cards = CARDS.map((c, i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.08), ctx.mats.glass);
      const tex = cardTexture(c.word, i);
      const face = makeTextPlane(CW, CH, tex, { fontPx: 100, label: `card ${c.word}` });
      face.position.z = 0.046;
      group.add(body, face);
      subject.add(group);
      return { ...c, group, start: 0.25 + i * 0.22 };
    });
    scene.add(subject);

    const background = new THREE.Group();
    background.add(
      makeFloor({ size: 140 }),
      makeFloorGrid({ size: 120, divisions: 60, y: 0.002, opacity: 0.1 }),
      makeDust({ seed: 31, count: 1600, center: [0, 8, -34], size: [120, 30, 40], pointSize: 0.09, opacity: 0.35 }),
    );
    const foreground = makeNearDust({ seed: 32 });
    scene.add(background, foreground);

    const O = new THREE.Vector3(0.8, 1.9, -1.3);
    const R = 10.2;
    const EL = 0.1;
    const P0 = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const look = new THREE.Vector3();

    function update(lt) {
      for (const c of cards) {
        const p = seg(lt, c.start, c.start + 1.1);
        c.group.position.set(c.x, lerp(-CH / 2 - 0.2, CH / 2, E.expoOut(p)), c.z);
        c.group.rotation.set(0.25 * (1 - E.snap(p)), 0, 0);
      }

      let blur = 1;
      // Land on a whip (incoming from the title cut), settle, orbit 90 degrees.
      const land = ez(lt, 0, 0.7, E.expoOut);
      const az = lerp(-Math.PI / 4, Math.PI / 4, ez(lt, 2.6, 6.4, E.expoInOut));
      const orbitP = seg(lt, 2.6, 6.4);
      if (lt < 0.233 || (orbitP > 0.3 && orbitP < 0.7)) blur = 3;
      const dist = lerp(24, R, land) - 0.5 * ez(lt, 0.7, 2.6, E.sineInOut);

      if (lt < 6.4) {
        orbit(cam, O, dist, az, EL + 0.02 * drift(lt, 5));
      } else {
        // Zoom-through: bend from the orbit end into the gap, accelerating (expo-in).
        orbit(cam, O, dist, Math.PI / 4, EL);
        P0.copy(cam.position);
        const s = seg(lt, 6.4, 8.0);
        const u = 0.3 * E.sineInOut(s) + 0.7 * E.expoIn(s);
        const ctrl = tmp.set(GAP.x, GAP.y, 6.0);
        const end = new THREE.Vector3(GAP.x, GAP.y, -5.0);
        const a = 1 - u;
        cam.position.set(
          a * a * P0.x + 2 * a * u * ctrl.x + u * u * end.x,
          a * a * P0.y + 2 * a * u * ctrl.y + u * u * end.y,
          a * a * P0.z + 2 * a * u * ctrl.z + u * u * end.z,
        );
        look.set(lerp(O.x, GAP.x, Math.min(1, u * 1.6)), lerp(O.y, GAP.y, u), lerp(O.z, -30, u));
        cam.up.set(0, 1, 0);
        cam.lookAt(look);
        if (u > 0.12) blur = 3;
      }
      foreground.userData.follow(cam);
      return { camera: cam, blur };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
