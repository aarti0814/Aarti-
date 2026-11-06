// 0:28-0:38 THE STACK
// Four brushed-metal panels fly in from four directions and dock into a 2x2 grid, each
// naming one layer of the stack. Each gets a 1-second hold with a parallax push, the camera
// pulls back to the full grid, then zooms through the gap at its centre.
import * as THREE from "three";
import {
  C, FONT, E, ez, seg, lerp, drift, makeScene, makeCamera, makeDust, makeNearDust, makeFloorGrid,
  makeTextTexture, makeTextPlane, fitFont, orbit,
} from "../timeline/style.js";

const PW = 5.2;
const PH = 2.9;
const G = 0.3;
const PANELS = [
  { name: "HYPERFRAMES",     role: "rendering",           from: [-22, 1.6, -5],  rz: -1.1 },
  { name: "CLAUDE",          role: "writing & direction", from: [2.8, 14, -5],   rz: 0.9 },
  { name: "FRONTEND DESIGN", role: "visual language",     from: [-2.8, -14, -5], rz: -0.8 },
  { name: "MOTION TIMING",   role: "easing & sync",       from: [22, -1.6, -5],  rz: 1.2 },
];
const HOLDS = [2.6, 3.6, 4.6, 5.6]; // each panel's 1 s hold starts here (local time)

function panelTexture(p, i) {
  return makeTextTexture(1040, 580, (g, w, h) => {
    g.fillStyle = "rgba(11,11,15,0.72)";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(244,244,246,0.28)";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = C.inkCss;
    g.textBaseline = "alphabetic";
    g.font = `700 72px "${FONT.mono}"`;
    g.letterSpacing = "0px";
    g.fillText(String(i + 1).padStart(2, "0"), 56, 120);
    fitFont(g, p.name, FONT.display, 700, 112, w - 112, -0.02);
    g.fillText(p.name, 56, 352);
    g.font = `400 72px "${FONT.mono}"`;
    g.letterSpacing = "0px";
    g.fillStyle = "rgba(244,244,246,0.78)";
    g.fillText(p.role, 56, 480);
    g.fillStyle = C.accentCss;
    g.fillRect(56, 520, 96, 6);
  });
}

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 10, fogFar: 52 });
    const cam = makeCamera(1000);

    const subject = new THREE.Group();
    const panels = PANELS.map((p, i) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.14), ctx.mats.darkMetal);
      const face = makeTextPlane(PW, PH, panelTexture(p, i), { fontPx: 72, label: `panel ${p.name}` });
      face.position.z = 0.072;
      // Active marker: a cyan hairline along the top edge during the panel's hold.
      const mark = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.04, 0.04), ctx.mats.accent);
      mark.position.set(0, PH / 2 + 0.07, 0.05);
      group.add(body, face, mark);
      subject.add(group);
      const col = i % 2, row = Math.floor(i / 2);
      const home = new THREE.Vector3((col ? 1 : -1) * (PW + G) / 2, (row ? -1 : 1) * (PH + G) / 2, 0);
      return { ...p, group, face, mark, home, start: 0.2 + i * 0.28 };
    });
    scene.add(subject);

    const background = new THREE.Group();
    background.add(
      makeDust({ seed: 51, count: 1700, center: [0, 0, -30], size: [120, 70, 40], pointSize: 0.09, opacity: 0.34 }),
      makeFloorGrid({ size: 120, divisions: 60, y: -5.5, opacity: 0.08 }),
    );
    const foreground = makeNearDust({ seed: 52 });
    scene.add(background, foreground);

    const target = new THREE.Vector3();
    const look = new THREE.Vector3();

    function update(lt) {
      let blur = lt < 0.233 ? 3 : 1;
      for (const p of panels) {
        const k = seg(lt, p.start, p.start + 1.4);
        if (k > 0 && k < 0.45) blur = 3;
        const mv = E.expoOut(k);
        p.group.position.set(
          lerp(p.from[0], p.home.x, mv), lerp(p.from[1], p.home.y, mv), lerp(p.from[2], p.home.z, mv),
        );
        const snap = 1 - E.snap(k);
        p.group.rotation.set(0.5 * snap, -0.7 * snap * Math.sign(p.from[0] || 1), p.rz * snap);
        // Gentle float once docked, so no hold is static.
        p.group.position.z += 0.05 * drift(lt, 3.3, p.home.x * 0.1 + p.home.y * 0.07);
      }

      // Holds: push toward each panel in turn, with parallax from the camera offset.
      let focus = -1;
      for (let i = 0; i < 4; i++) if (lt >= HOLDS[i] && lt < HOLDS[i] + 1) focus = i;
      panels.forEach((p, i) => {
        p.face.material.opacity = focus === -1 || focus === i ? 1 : 0.62;
        p.mark.visible = focus === i;
        p.mark.scale.x = focus === i ? Math.max(1e-3, ez(lt, HOLDS[i], HOLDS[i] + 0.45, E.expoOut)) : 1e-3;
      });

      // Camera target: grid centre, eased toward the focused panel during the holds.
      const tx = [0, 0, 0, 0];
      let tgtX = 0, tgtY = 0, dist;
      const land = ez(lt, 0, 0.75, E.expoOut);
      dist = lerp(24, 9.4, land) - 0.8 * ez(lt, 0.75, 2.6, E.sineInOut);
      for (let i = 0; i < 4; i++) {
        const into = ez(lt, HOLDS[i], HOLDS[i] + 0.35, E.expoInOut);
        const out = i < 3 ? 0 : ez(lt, 6.6, 7.6, E.expoInOut);
        const w = i < 3 ? into * (1 - ez(lt, HOLDS[i + 1], HOLDS[i + 1] + 0.35, E.expoInOut)) : into * (1 - out);
        tgtX += panels[i].home.x * 0.3 * w;
        tgtY += panels[i].home.y * 0.3 * w;
        tx[i] = w;
      }
      const holdPush = ez(lt, 2.6, 2.95, E.expoInOut) * (1 - ez(lt, 6.6, 7.6, E.expoInOut));
      dist -= 1.0 * holdPush;
      const pull = ez(lt, 6.6, 8.4, E.expoInOut);
      dist += 0.4 * pull;
      target.set(tgtX, tgtY, 0);

      if (lt < 8.4) {
        // Parallax: the camera sits further toward the focused panel than its target.
        orbit(cam, target, dist, tgtX * 0.035 + 0.1 * pull, tgtY * 0.03 + 0.02 * drift(lt, 5));
      } else {
        // Zoom-through the centre gap: straight down the axis, accelerating.
        const s = seg(lt, 8.4, 10);
        const u = 0.3 * E.sineInOut(s) + 0.7 * E.expoIn(s);
        orbit(cam, target, dist, 0.1 * (1 - u), 0.02 * (1 - u));
        const p0 = cam.position.clone();
        cam.position.set(lerp(p0.x, 0, u), lerp(p0.y, 0, u), lerp(p0.z, -7, u));
        look.set(0, 0, lerp(0, -40, u));
        cam.lookAt(look);
        if (u > 0.1) blur = 3;
      }
      foreground.userData.follow(cam);
      return { camera: cam, blur };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
