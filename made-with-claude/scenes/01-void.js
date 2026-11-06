// 0:00-0:04 COLD OPEN, THE VOID
// A single thin white line draws itself across the centre. The camera pushes in slowly
// along it, then whips along the line (7 frames) into a hard cut.
import * as THREE from "three";
import { E, ez, lerp, drift, makeScene, makeCamera, makeDust, makeNearDust } from "../timeline/style.js";

const LEN = 16;

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.5, "rgba(255,255,255,1)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  async build(ctx) {
    const scene = makeScene(ctx.env, { fogNear: 4, fogFar: 46 });
    const cam = makeCamera(1050);

    const subject = new THREE.Group();
    const line = new THREE.Mesh(new THREE.BoxGeometry(1, 0.009, 0.009), ctx.mats.inkFlat);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.16),
      new THREE.MeshBasicMaterial({
        map: glowTexture(), transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    );
    // The pen tip: the one accent in the shot, gone the moment the line is drawn.
    const pen = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 12), ctx.mats.accent);
    subject.add(line, glow, pen);
    scene.add(subject);

    const background = makeDust({ seed: 11, count: 1600, center: [0, 0, -26], size: [90, 48, 24], pointSize: 0.07, opacity: 0.4 });
    const foreground = makeNearDust({ seed: 12, count: 120, opacity: 0.3 });
    scene.add(background, foreground);

    const look = new THREE.Vector3();

    function update(lt) {
      const draw = ez(lt, 0.2, 1.7, E.expoOut);
      const len = Math.max(1e-4, LEN * draw);
      const x = -LEN / 2 + len / 2;
      line.scale.x = len;
      line.position.x = x;
      glow.scale.x = len;
      glow.position.x = x;
      glow.material.opacity = 0.14 * draw;
      pen.position.x = -LEN / 2 + len;
      pen.visible = draw > 0.001 && draw < 0.995;

      // Slow push in along the line, then a 7-frame whip along it into the cut.
      const push = ez(lt, 0.25, 3.77, E.sineInOut);
      const whip = ez(lt, 3.767, 4.0, E.expoIn);
      cam.position.set(
        lerp(-3.2, 1.6, push) + 10 * whip,
        lerp(0.6, 0.24, push) + 0.03 * drift(lt, 3.1),
        lerp(9.6, 5.0, push) - 4.4 * whip,
      );
      look.set(lerp(-1.4, 2.4, push) + 16 * whip, 0, 0);
      cam.lookAt(look);
      foreground.userData.follow(cam);
      return { camera: cam, blur: lt >= 3.767 ? 3 : 1 };
    }

    return { scene, update, planes: { background, subject, foreground } };
  },
};
