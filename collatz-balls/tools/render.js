const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const FPS = 30, DUR = 59.9, N = Math.round(FPS * DUR);
const CAPS = [
  { s: 0.4, e: 3.4, text: "100 balls." },
  { s: 3.4, e: 6.9, text: "Numbered 1 to 100. And just one rule." },
  { s: 7.2, e: 11.0, text: "Every time a ball hits a wall:" },
  { s: 11.0, e: 13.3, text: "if it's even, it's cut in half." },
  { s: 13.3, e: 15.6, text: "If it's odd, it triples, plus one." },
  { s: 15.8, e: 21.0, text: "Reach 1… and you're free." },
  { s: 21.4, e: 27.4, text: "Most make it home in seconds…" },
  { s: 27.9, e: 31.2, text: "But keep your eye on #27." },
  { s: 31.2, e: 33.8, text: "It climbs… and climbs…" },
  { s: 33.8, e: 37.4, text: "all the way to 9,232." },
  { s: 37.8, e: 41.8, text: "Every number ever tested falls back to 1." },
  { s: 41.8, e: 46.5, text: "Every single one… up to 2⁶⁸." },
  { s: 48.2, e: 51.6, text: "But no one has ever proven it always happens." },
  { s: 51.6, e: 54.4, text: "It's called the Collatz conjecture." },
  { s: 54.4, e: 59.9, text: "And maybe… math just isn't ready for it yet." }
];
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?render');
  await p.waitForFunction(() => window.__collatz); await p.waitForTimeout(1000);
  await p.evaluate((c) => { __collatz.reset(); __collatz.setCaptions(c); __collatz.frame(); }, CAPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), 'video_noaudio.mp4']);
  ff.stderr.on('data', d => process.stderr.write(d));
  const canvas = await p.$('#view');
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    if (f > 0) await p.evaluate(() => { __collatz.advanceVideo(1 / 30); __collatz.frame(); });
    const buf = await canvas.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f === Math.round(36.9 * FPS)) fs.writeFileSync('thumb_peak.jpg', buf);
    if (f % 300 === 0) console.log('frame', f, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const ev = await p.evaluate(() => ({ events: __collatz.events(), info: __collatz.info() }));
  fs.writeFileSync('events.json', JSON.stringify(ev));
  console.log('done', JSON.stringify(ev.info), 'events', ev.events.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await br.close();
})();
