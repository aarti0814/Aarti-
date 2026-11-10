const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const SEED = 330, FPS = 30;
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?render&seed=' + SEED);
  await p.waitForFunction(() => window.__battle); await p.waitForTimeout(1000);
  const sim = await p.evaluate((s) => __battle.simulate(s), SEED);
  const DUR = 3.2 + sim.endT + 6.5, N = Math.round(DUR * FPS);
  console.log('battle', JSON.stringify(sim), 'video', DUR.toFixed(2) + 's');
  await p.evaluate((s) => { __battle.reset(s); __battle.frame(); }, SEED);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), 'video_noaudio.mp4']);
  const canvas = await p.$('#view'); const t0 = Date.now();
  const thumbAt = Math.round((3.2 + sim.kos[2] - 0.7) * FPS), winAt = Math.round((3.2 + sim.endT + 2.6) * FPS);
  for (let f = 0; f < N; f++) {
    if (f > 0) await p.evaluate(() => { __battle.advanceVideo(1 / 30); __battle.frame(); });
    const buf = await canvas.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f === thumbAt) fs.writeFileSync('thumb_final2.jpg', buf);
    if (f === winAt) fs.writeFileSync('thumb_winner.jpg', buf);
    if (f % 400 === 0) console.log('frame', f, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  const out = await p.evaluate(() => ({ info: __battle.info(), events: __battle.events() }));
  out.duration = DUR; fs.writeFileSync('events.json', JSON.stringify(out));
  console.log('done', JSON.stringify(out.info), 'events', out.events.length);
  await br.close();
})();
