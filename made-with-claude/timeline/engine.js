// The engine: one WebGL renderer, one studio environment, eight scenes, and a pure
// renderAt(t). Every frame is computed from timeline time alone, so Hyperframes can seek
// to any frame in any order (render workers do).
import * as THREE from "three";
import { SCENES, FLASHES, FPS, DURATION, sceneAt, READ_TIMES } from "./timing.js";
import * as S from "./style.js";

const W = 1920;
const H = 1080;
// Motion blur: 180 degree shutter (half a frame), 3 samples, only on fast moves.
const SHUTTER = 0.5 / FPS;
// The end card cuts to black for its final frames.
const BLACK_FROM_FRAME = 1794;

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export async function createEngine({ canvas, modules, dom, stats }) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Palette colours must land exactly: no global tone curve. The output pass applies a
  // soft shoulder only above the off-white, so highlights roll off instead of clipping.
  renderer.toneMapping = THREE.NoToneMapping;

  const env = S.makeStudioEnv(renderer);
  const mats = S.makeMaterials();
  const font3d = await S.loadDisplayFont3D();
  const ctx = { THREE, S, renderer, env, mats, font3d, dom, stats };

  const instances = {};
  for (const s of SCENES) {
    instances[s.id] = await modules[s.id].build(ctx, s);
  }

  // Render targets for the sample / accumulate / output passes.
  const rtSample = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const rtAccum = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const accumMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, weight: { value: 1 } },
    vertexShader: quadVert,
    fragmentShader: /* glsl */ `
      uniform sampler2D tex; uniform float weight; varying vec2 vUv;
      void main() { gl_FragColor = vec4(texture2D(tex, vUv).rgb * weight, 1.0); }
    `,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rtAccum.texture } },
    vertexShader: quadVert,
    fragmentShader: /* glsl */ `
      uniform sampler2D tex; varying vec2 vUv;
      vec3 shoulder(vec3 x) {
        // Identity up to 0.92 (keeps #F4F4F6 and #00E5FF exact), smooth roll-off above.
        vec3 k = 0.92 + 0.08 * (1.0 - exp(-(x - 0.92) / 0.08));
        return mix(x, k, step(0.92, x));
      }
      void main() {
        vec3 c = max(texture2D(tex, vUv).rgb, vec3(0.0));
        gl_FragColor = vec4(shoulder(c), 1.0);
        #include <colorspace_fragment>
      }
    `,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const accumScene = new THREE.Scene();
  accumScene.add(new THREE.Mesh(quadGeo, accumMat));
  const outScene = new THREE.Scene();
  outScene.add(new THREE.Mesh(quadGeo, outMat));

  // Compile every scene's shaders before the first seek.
  for (const s of SCENES) {
    const inst = instances[s.id];
    const shot = inst.update(0.01, s.start + 0.01);
    await renderer.compileAsync(inst.scene, shot.camera);
  }

  let last = { t: 0, sceneId: SCENES[0].id, camera: null, blur: 1 };

  function overlays(t) {
    const frame = Math.round(t * FPS);
    let flash = 0;
    for (const [f0, n, peak] of FLASHES) {
      if (frame >= f0 && frame < f0 + n) {
        const k = frame - f0;
        flash = n <= 2 ? peak : peak * [1, 0.5, 0.2][k];
      }
    }
    dom.flash.style.opacity = String(flash);
    dom.black.style.opacity = frame >= BLACK_FROM_FRAME ? "1" : "0";
  }

  function update(inst, s, t) {
    const lt = Math.max(0, t - s.start);
    return inst.update(lt, t);
  }

  function renderAt(tIn) {
    const t = Math.min(Math.max(tIn, 0), DURATION - 1e-4);
    const s = sceneAt(t);
    const inst = instances[s.id];
    dom.tagline.style.opacity = "0";

    const first = update(inst, s, t);
    const n = Math.max(1, Math.min(4, first.blur || 1));

    renderer.setRenderTarget(rtAccum);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();

    // Oldest sample first, so the scene is left in its state at t.
    for (let i = n - 1; i >= 0; i--) {
      const ti = n === 1 ? t : Math.max(s.start, t - (SHUTTER * i) / (n - 1));
      const shot = i === 0 && n === 1 ? first : update(inst, s, ti);
      renderer.setRenderTarget(rtSample);
      renderer.render(inst.scene, shot.camera);
      accumMat.uniforms.tex.value = rtSample.texture;
      accumMat.uniforms.weight.value = 1 / n;
      renderer.setRenderTarget(rtAccum);
      renderer.autoClear = false;
      renderer.render(accumScene, quadCam);
      renderer.autoClear = true;
      if (i === 0) last = { t, sceneId: s.id, camera: shot.camera, blur: n };
    }
    renderer.setRenderTarget(null);
    renderer.render(outScene, quadCam);
    overlays(t);
  }

  // ------------------------------------------------------------ inspection (self-check)
  const v = new THREE.Vector3();
  const frustum = new THREE.Frustum();
  const m4 = new THREE.Matrix4();

  const toScreen = (p, cam) => {
    v.copy(p).project(cam);
    return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, z: v.z };
  };
  const visibleChain = (o) => {
    for (let n = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };

  function planeDepths(obj, cam) {
    const depths = [];
    const inv = cam.matrixWorldInverse;
    obj.updateWorldMatrix(true, true);
    obj.traverse((o) => {
      if (!visibleChain(o)) return;
      if (o.isPoints) {
        const pos = o.geometry.attributes.position;
        const step = Math.max(1, Math.floor(pos.count / 400));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (!frustum.containsPoint(v)) continue;
          depths.push(-v.applyMatrix4(inv).z);
        }
      } else if (o.isMesh || o.isLineSegments || o.isLine) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const bs = o.geometry.boundingSphere;
        v.copy(bs.center).applyMatrix4(o.matrixWorld);
        if (!frustum.intersectsObject(o)) return;
        depths.push(-v.applyMatrix4(inv).z);
      }
    });
    depths.sort((a, b) => a - b);
    return {
      count: depths.length,
      median: depths.length ? depths[Math.floor(depths.length / 2)] : null,
      min: depths.length ? depths[0] : null,
      max: depths.length ? depths[depths.length - 1] : null,
    };
  }

  function textItems(scene, cam) {
    const out = [];
    const box = new THREE.Box3();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const info = o.userData.text;
      if (!info || !visibleChain(o)) return;
      if (o.material && o.material.opacity !== undefined && o.material.opacity < 0.5) return;
      const pts = [];
      if (info.kind === "plane" && info.box) {
        // Only the part of the plane that carries text.
        const { width: pw, height: ph } = o.geometry.parameters;
        const [u0, v0, u1, v1] = info.box;
        for (const u of [u0, u1]) for (const vv of [v0, v1]) {
          const p = new THREE.Vector3((u - 0.5) * pw, (0.5 - vv) * ph, 0).applyMatrix4(o.matrixWorld);
          pts.push(toScreen(p, cam));
        }
      } else {
        box.setFromObject(o);
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          pts.push(toScreen(new THREE.Vector3(x, y, z), cam));
        }
      }
      if (pts.some((p) => p.z > 1 || p.z < -1)) return; // behind the camera
      const rect = {
        x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)),
        y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)),
      };
      // Fully off screen: not shown, not checked.
      if (rect.x1 < 0 || rect.x0 > W || rect.y1 < 0 || rect.y0 > H) return;
      let fontPx;
      const wp = new THREE.Vector3();
      o.getWorldPosition(wp);
      const ws = new THREE.Vector3();
      o.getWorldScale(ws);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      if (info.kind === "plane") {
        const h = o.geometry.parameters.height * ws.y;
        const a = toScreen(wp.clone().addScaledVector(up, h / 2), cam);
        const b = toScreen(wp.clone().addScaledVector(up, -h / 2), cam);
        fontPx = Math.hypot(a.x - b.x, a.y - b.y) * (info.fontPx / info.texH);
      } else {
        const em = info.emWorld * ws.y;
        const a = toScreen(wp, cam);
        const b = toScreen(wp.clone().addScaledVector(up, em), cam);
        fontPx = Math.hypot(a.x - b.x, a.y - b.y);
      }
      out.push({ label: info.label, fontPx: Math.round(fontPx * 10) / 10, rect });
    });
    return out;
  }

  function inspect(t) {
    renderAt(t);
    const s = SCENES.find((x) => x.id === last.sceneId);
    const inst = instances[s.id];
    const cam = last.camera;
    cam.updateMatrixWorld(true);
    m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m4);
    const planes = {};
    for (const [k, obj] of Object.entries(inst.planes || {})) planes[k] = planeDepths(obj, cam);
    const texts = textItems(inst.scene, cam);
    const tag = dom.tagline;
    if (parseFloat(tag.style.opacity) > 0.5) {
      const r = tag.getBoundingClientRect();
      texts.push({
        label: "tagline (DOM)", fontPx: parseFloat(getComputedStyle(tag).fontSize),
        rect: { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom },
      });
    }
    return {
      t, scene: s.id, blur: last.blur, fov: cam.fov,
      perspectivePx: Math.round(S.perspectiveForFov(cam.fov)),
      planes, texts,
    };
  }

  return { renderAt, inspect, instances, readTimes: READ_TIMES };
}
