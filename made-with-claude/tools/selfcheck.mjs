// Self-check: runs the real composition in headless Chrome and checks every rule in the
// brief before render. Writes render/check/report.json and prints PASS / FAIL per rule.
//
//   node tools/selfcheck.mjs            all checks (MP4 checks too, if the render exists)
//   node tools/selfcheck.mjs --quick    fewer samples
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Playwright is resolved from the environment (preinstalled), not a project dependency.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const quick = process.argv.includes("--quick");
const { SCENES, CUTS, FPS, DURATION, READ_TIMES } = await import(pathToFileURL(path.join(root, "timeline/timing.js")).href);
const SAFE = { x0: 96, x1: 1824, y0: 54, y1: 1026 };
const MIN_TEXT = 36;
const MAX_ACCENT = 0.10;
const MP4 = path.join(root, "render/made-with-claude.mp4");

// ------------------------------------------------------------ static server
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
// Refresh the build log first, so the counters are checked against current numbers.
execFileSync(process.execPath, [path.join(root, "tools/stats.mjs")], { stdio: "pipe" });

const results = [];
const rule = (name, ok, detail) => { results.push({ name, ok, detail }); };

const browser = await chromium.launch({
  executablePath: fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => window.__mwc || window.__mwcError, null, { timeout: 180000 }).catch(() => {});
const booted = await page.evaluate(() => !!window.__mwc);
rule("Composition boots without errors", booted && errors.length === 0, errors.slice(0, 5));
if (!booted) { finish(); }

// ------------------------------------------------------------ sampling
const step = quick ? 1.0 : 0.5;
const samples = [];
for (const s of SCENES) {
  for (let t = s.start + 0.1; t < s.end - 0.05; t += step) samples.push(Math.round(t * FPS) / FPS);
  for (const t of READ_TIMES[s.id] || []) samples.push(t);
}
samples.sort((a, b) => a - b);

const inspections = [];
for (const t of samples) {
  const info = await page.evaluate((t) => {
    const r = window.__mwc.inspect(t);
    // Accent coverage from the WebGL canvas (preserveDrawingBuffer), at quarter size.
    const src = document.getElementById("stage");
    const c = document.createElement("canvas");
    c.width = 480; c.height = 270;
    const g = c.getContext("2d");
    g.drawImage(src, 0, 0, 480, 270);
    const d = g.getImageData(0, 0, 480, 270).data;
    let accent = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      if (R < 110 && G > 150 && B > 170 && B - R > 110) accent++;
    }
    r.accent = accent / (480 * 270);
    // One frame later: how far each text block moves (px per frame).
    const next = window.__mwc.inspect(t + 1 / 30);
    for (const tx of r.texts) {
      const m = next.texts.find((n) => n.label === tx.label);
      tx.speed = m ? Math.hypot((m.rect.x0 + m.rect.x1 - tx.rect.x0 - tx.rect.x1) / 2, (m.rect.y0 + m.rect.y1 - tx.rect.y0 - tx.rect.y1) / 2) : 999;
    }
    window.__mwc.renderAt(t);
    return r;
  }, t);
  inspections.push(info);
}

// ------------------------------------------------------------ rules
// 1. Depth planes: background, subject and foreground all on screen, ordered by depth.
{
  const bad = [];
  for (const s of SCENES) {
    const xs = inspections.filter((i) => i.scene === s.id);
    const okCount = xs.filter((i) => {
      const { background: b, subject: su, foreground: f } = i.planes;
      return b && su && f && b.count > 0 && su.count > 0 && f.count > 0 &&
        f.median < su.median && su.median < b.median;
    }).length;
    if (okCount / xs.length < 0.8) bad.push(`${s.id}: ${okCount}/${xs.length} samples with 3 ordered planes`);
  }
  rule("Every scene has at least 3 depth planes (fg < subject < bg in >= 80 % of samples)", bad.length === 0, bad);
}

// 2. Easing: no linear easing anywhere.
{
  const bad = [];
  const files = ["index.html", ...["scenes", "timeline"].flatMap((d) => fs.readdirSync(path.join(root, d)).map((f) => path.join(d, f)))];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    src.split("\n").forEach((line, n) => {
      if (/\blinear\b|ease:\s*["']none["']|power0|Linear\./i.test(line) && !/no linear|never linear|not linear|No linear/.test(line)) bad.push(`${f}:${n + 1}: ${line.trim()}`);
    });
  }
  const tweens = await page.evaluate(() => {
    const tl = window.__timelines.main;
    return tl.getChildren(true, true, true).map((c) => (c.vars && c.vars.ease) || "default");
  });
  const linearTweens = tweens.filter((e) => e === "none" || e === "linear" || e === "power0");
  rule("No linear easing in the timeline or scene code", bad.length === 0 && linearTweens.length === 0,
    { sourceHits: bad, gsapTweens: tweens.length, linearTweens: linearTweens.length });
}

// 3. Transitions: every scene boundary is a zoom or a cut, never a fade.
{
  const bad = SCENES.filter((s) => !/zoom|cut/i.test(s.exit) || /fade|dissolve|cross/i.test(s.exit)).map((s) => `${s.id}: ${s.exit}`);
  rule("Every scene transition is a zoom or a cut, never a plain fade", bad.length === 0, SCENES.map((s) => `${s.id} -> ${s.exit}`).concat(bad));
}

// 4. Text: >= 36 px at read times, and inside the safe zone whenever fully on screen.
{
  const small = [];
  const unsafe = [];
  for (const i of inspections) {
    const isRead = (READ_TIMES[i.scene] || []).some((t) => Math.abs(t - i.t) < 1e-3);
    for (const tx of i.texts) {
      const r = tx.rect;
      const onScreen = r.x0 >= 0 && r.x1 <= 1920 && r.y0 >= 0 && r.y1 <= 1080;
      if (isRead && tx.fontPx < MIN_TEXT) small.push(`${i.t.toFixed(2)}s ${tx.label}: ${tx.fontPx}px`);
      // Readable = a read time, or settled on screen (moving < 6 px/frame). Text sweeping
      // out of frame mid-move is an exit, not a placement.
      const settled = onScreen && tx.speed < 6;
      if ((isRead || settled) && (r.x0 < SAFE.x0 - 0.5 || r.x1 > SAFE.x1 + 0.5 || r.y0 < SAFE.y0 - 0.5 || r.y1 > SAFE.y1 + 0.5)) {
        unsafe.push(`${i.t.toFixed(2)}s ${tx.label}: x ${r.x0.toFixed(0)}-${r.x1.toFixed(0)}, y ${r.y0.toFixed(0)}-${r.y1.toFixed(0)}`);
      }
    }
  }
  rule(`No text smaller than ${MIN_TEXT}px at read times`, small.length === 0, small.slice(0, 20));
  rule("No text outside the safe zone (central 90 %) while readable", unsafe.length === 0, unsafe.slice(0, 20));
}

// 5. Accent under 10 % of the frame at every sample.
{
  const worst = [...inspections].sort((a, b) => b.accent - a.accent)[0];
  const over = inspections.filter((i) => i.accent >= MAX_ACCENT).map((i) => `${i.t.toFixed(2)}s ${(i.accent * 100).toFixed(2)}%`);
  rule("Accent colour under 10 % of frame area in every scene", over.length === 0,
    { worst: `${worst.t.toFixed(2)}s ${worst.scene} ${(worst.accent * 100).toFixed(3)}%`, over });
}

// 6. Runtime 55-65 s, perspective 800-1200 px.
rule("Total runtime is 55 to 65 seconds", DURATION >= 55 && DURATION <= 65, `${DURATION}s at ${FPS} fps`);
{
  const ps = inspections.map((i) => i.perspectivePx);
  rule("Camera perspective between 800 and 1200 px", Math.min(...ps) >= 800 && Math.max(...ps) <= 1200, `${Math.min(...ps)}-${Math.max(...ps)} px`);
}

// 7. Counters match the build log.
{
  const shown = await page.evaluate(() => window.MWC_STATS);
  execFileSync(process.execPath, [path.join(root, "tools/stats.mjs")], { stdio: "pipe" });
  const fresh = JSON.parse(fs.readFileSync(path.join(root, "assets/build-stats.js"), "utf8").replace(/^[^{]*/, "").replace(/;\s*$/, ""));
  const same = shown.scenes === fresh.scenes && shown.frames === fresh.frames && shown.lines === fresh.lines;
  let mp4 = "no render yet";
  let mp4ok = true;
  if (fs.existsSync(MP4)) {
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames,width,height,r_frame_rate", "-of", "json", MP4]).toString();
    const st = JSON.parse(out).streams[0];
    mp4 = st;
    mp4ok = Number(st.nb_read_frames) === fresh.frames && st.width === 1920 && st.height === 1080;
  }
  rule("Counter values match the real build log", same && mp4ok, { counters: { scenes: shown.scenes, frames: shown.frames, lines: shown.lines }, buildLog: { scenes: fresh.scenes, frames: fresh.frames, lines: fresh.lines }, mp4 });
}

// 8. End card readable for at least 2 full seconds.
{
  const endScene = SCENES.find((s) => s.id === "end");
  let readable = 0;
  for (let f = Math.round(endScene.start * FPS); f < Math.round(endScene.end * FPS); f++) {
    const ok = await page.evaluate((t) => {
      window.__mwc.renderAt(t);
      const tag = document.getElementById("tagline");
      const full = tag.querySelector(".text").textContent === "Every frame. Every move. Written in code.";
      return full && tag.style.opacity === "1" && document.getElementById("black").style.opacity === "0";
    }, f / FPS);
    if (ok) readable++;
  }
  rule("End card readable for at least 2 full seconds", readable >= 2 * FPS, `${readable} frames = ${(readable / FPS).toFixed(2)} s`);
}

// 9. Holds: no static stretch longer than 1.5 s (outside title / end card).
{
  const still = [];
  const sig = async (t) => page.evaluate((t) => {
    window.__mwc.renderAt(t);
    const c = document.createElement("canvas");
    c.width = 96; c.height = 54;
    const g = c.getContext("2d");
    g.drawImage(document.getElementById("stage"), 0, 0, 96, 54);
    return Array.from(g.getImageData(0, 0, 96, 54).data.filter((_, i) => i % 4 !== 3));
  }, t);
  let prev = await sig(0);
  let run = 0;
  for (let t = 0.25; t < DURATION; t += 0.25) {
    const cur = await sig(t);
    let diff = 0;
    for (let i = 0; i < cur.length; i++) diff += Math.abs(cur[i] - prev[i]);
    diff /= cur.length;
    run = diff < 0.15 ? run + 0.25 : 0;
    const sc = SCENES.find((s) => t >= s.start && t < s.end).id;
    if (run > 1.5 && sc !== "title" && sc !== "end") still.push(`${t.toFixed(2)}s (${sc})`);
    prev = cur;
  }
  rule("No static hold longer than 1.5 s outside title and end card", still.length === 0, still);
}

rule("Cut list is frame-aligned", CUTS.every((c) => Number.isInteger(c.frame)), CUTS.length + " cuts");

finish();

function finish() {
  fs.mkdirSync(path.join(root, "render/check"), { recursive: true });
  fs.writeFileSync(path.join(root, "render/check/report.json"), JSON.stringify({ results, inspections }, null, 2));
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
    if (!r.ok || process.argv.includes("--verbose")) console.log("      " + JSON.stringify(r.detail).slice(0, 1200));
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed. Report: render/check/report.json`);
  browser.close().then(() => { server.close(); process.exit(failed ? 1 : 0); });
}
