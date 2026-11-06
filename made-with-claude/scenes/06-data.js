// 0:38-0:48 DATA MOMENT
// Three counters animate from 0 to the real numbers from the build log (assets/build-stats.js,
// written by tools/stats.mjs). The camera dollies forward through the gap between them and
// cuts to a spinning wireframe, then whip-zooms into it.
import * as THREE from "three";
import {
  C, FONT, E, ez, seg, lerp, drift, makeScene, makeCamera, makeDust, makeNearDust, makeFloorGrid,
  makeTextTexture, makeTextPlane,
} from "../timeline/style.js";
import { CUTS, FPS } from "../timeline/timing.js";

const START = 38;
const WIRE_CUT = CUTS.find((c) => c.frame === 1395).frame / FPS - START; // 8.5
const ROW_W = 9.6;
const ROW_H = 2.4;
const NUM_PX = 230;
const LABEL_PX = 84;
const WIRE_Z = -70;

const fmt = (n) => n.toLocaleString("en-US");

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 10, fogFar: 60 });
    const cam = makeCamera(1000);
    const stats = ctx.stats;
    const rows = [
      { label: "SCENES BUILT",    value: stats.scenes, y: 2.8,  z: 0 },
      { label: "FRAMES RENDERED", value: stats.frames, y: 0,    z: -0.8 },
      { label: "LINES OF CODE",   value: stats.lines,  y: -2.8, z: -1.6 },
    ];
    const finalWidth = (g) => {
      g.font = `700 ${NUM_PX}px "${FONT.mono}"`;
      return Math.max(...rows.map((r) => g.measureText(fmt(r.value)).width));
    };

    const subject = new THREE.Group();
    const counters = rows.map((r, i) => {
      let shown = -1;
      let progress = 0;
      const tex = makeTextTexture(1600, 400, (g, w, h) => {
        if (shown < 0) return;
        g.fillStyle = C.inkCss;
        g.textBaseline = "alphabetic";
        g.font = `700 ${NUM_PX}px "${FONT.mono}"`;
        g.letterSpacing = "0px";
        g.fillText(fmt(shown), 40, 228);
        g.fillStyle = C.accentCss;
        g.fillRect(44, 262, Math.max(0, (finalWidth(g) - 8) * progress), 6);
        g.fillStyle = "rgba(244,244,246,0.82)";
        g.font = `500 ${LABEL_PX}px "${FONT.display}"`;
        g.letterSpacing = `${0.04 * LABEL_PX}px`;
        g.fillText(r.label, 40, 372);
      });
      const plane = makeTextPlane(ROW_W, ROW_H, tex, { fontPx: LABEL_PX, label: `counter ${r.label}` });
      plane.userData.text.box = [0.02, 0.0, 0.56, 1.0]; // u0, v0, u1, v1 of the drawn text
      plane.position.set(0.6, r.y, r.z);
      subject.add(plane);
      return {
        ...r, plane, tex, start: 0.5 + i * 0.3,
        set(value, p) {
          const q = Math.round(p * 200) / 200;
          if (value === shown && q === progress) return;
          shown = value;
          progress = q;
          tex.draw();
        },
      };
    });
    scene.add(subject);

    // The spinning wireframe, far down the dolly axis.
    const wire = new THREE.Group();
    const outer = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.3, 1)),
      new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.9, toneMapped: false }),
    );
    const inner = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.9, 0)),
      new THREE.LineBasicMaterial({ color: C.accent, toneMapped: false }),
    );
    const nodes = new THREE.Points(
      new THREE.IcosahedronGeometry(2.3, 1),
      new THREE.PointsMaterial({ color: C.ink, size: 0.07, toneMapped: false }),
    );
    wire.add(outer, inner, nodes);
    wire.position.set(0, 1.4, WIRE_Z);
    subject.add(wire);

    const background = new THREE.Group();
    background.add(
      makeDust({ seed: 61, count: 2600, center: [0, 0, -50], size: [110, 60, 130], pointSize: 0.1, opacity: 0.3 }),
      makeFloorGrid({ size: 160, divisions: 80, y: -6, opacity: 0.07 }),
    );
    const foreground = makeNearDust({ seed: 62 });
    scene.add(background, foreground);

    const look = new THREE.Vector3();
    const axisA = new THREE.Vector3(0.3, 1, 0.2).normalize();
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();

    function update(lt) {
      let blur = lt < 0.233 ? 3 : 1;
      for (const c of counters) {
        const p = ez(lt, c.start, c.start + 2.9, E.expoOut);
        c.set(Math.round(c.value * p), p);
        c.plane.position.x = 0.6 + 0.04 * drift(lt, 4, c.y * 0.1);
      }

      if (lt < WIRE_CUT) {
        const land = ez(lt, 0, 0.8, E.expoOut);
        const s = seg(lt, 4.6, WIRE_CUT);
        const u = 0.3 * E.sineInOut(s) + 0.7 * E.expoIn(s);
        const z = lerp(lerp(30, 11.5, land), -9, u);
        const y = lerp(0.15 * drift(lt, 6), 1.4, E.sineInOut(s));
        cam.position.set(0.25 * drift(lt, 7), y, z);
        look.set(0, lerp(0, 1.4, E.sineInOut(s)), z - 12);
        cam.lookAt(look);
        if (u > 0.25) blur = 3;
      } else {
        // Spinning wireframe: decelerating spin on two axes, then a whip zoom into it.
        const spin = ez(lt, WIRE_CUT, 10, E.expoOut);
        qa.setFromAxisAngle(axisA, 0.6 + 9 * spin);
        qb.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.3 + 2.4 * spin);
        wire.quaternion.copy(qa).multiply(qb);
        inner.rotation.y = -4 * spin;
        const push = ez(lt, WIRE_CUT, 9.767, E.expoOut);
        const whip = ez(lt, 9.767, 10, E.expoIn);
        const dist = lerp(lerp(9, 6.2, push), 0.4, whip);
        cam.position.set(0.3 * (1 - whip), 1.4 + 0.6 * (1 - push), WIRE_Z + dist);
        look.set(0, 1.4, WIRE_Z);
        cam.lookAt(look);
        if (lt - WIRE_CUT < 0.2 || whip > 0) blur = 3;
      }
      foreground.userData.follow(cam);
      return { camera: cam, blur };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
