// Sound layer: every cue is placed from the beat map in timeline/timing.js, so the audio
// stays locked to the cuts if the timing changes. Writes assets/audio/mix.wav (48 kHz stereo).
//
// Sources:
//   assets/audio/el-impact.mp3  ElevenLabs Sound Effects (eleven_text_to_sound_v2):
//                               "Deep cinematic sub boom impact with a bright shimmering debris tail, wide"
//   synth-*.wav                 synthesised here with ffmpeg (whoosh, stinger, riser, tick, drone)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "assets/audio");
const { CUTS, FPS, DURATION } = await import(pathToFileURL(path.join(root, "timeline/timing.js")).href);
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const SR = 48000;

// ------------------------------------------------------------ synth sources
const synth = {
  // Pink-noise swell that peaks right at its end: lands on the cut.
  whoosh: ["-f", "lavfi", "-i", "anoisesrc=d=0.5:c=pink:a=0.9:seed=7",
    "-af", "bandpass=f=1400:width_type=o:w=2.2,afade=t=in:d=0.42:curve=exp,afade=t=out:st=0.42:d=0.08,volume=2.2"],
  whooshLong: ["-f", "lavfi", "-i", "anoisesrc=d=1.2:c=pink:a=0.9:seed=9",
    "-af", "bandpass=f=900:width_type=o:w=2.6,afade=t=in:d=1.1:curve=exp,afade=t=out:st=1.1:d=0.1,volume=2.4"],
  // Sub thump with a falling pitch plus a bright click: the hard-cut stinger.
  stinger: ["-f", "lavfi", "-i",
    "aevalsrc=0.9*sin(2*PI*(42*t+(70/28)*(1-exp(-28*t))))*exp(-10*t)+0.25*(random(0)-0.5)*exp(-180*t):s=48000:d=0.45"],
  // Rising sweep into the burst (2.1 s), amplitude and pitch both climbing.
  riser: ["-f", "lavfi", "-i",
    "aevalsrc=0.45*pow(t/2.1\\,2)*sin(2*PI*(140*t+1900*pow(t\\,4)/(4*pow(2.1\\,3))))+0.12*pow(t/2.1\\,3)*(random(1)-0.5):s=48000:d=2.1",
    "-af", "highpass=f=90,afade=t=out:st=2.06:d=0.04"],
  // One soft key tick for the tagline typing.
  tick: ["-f", "lavfi", "-i", "aevalsrc=0.5*exp(-260*t)*sin(2*PI*2300*t)+0.18*exp(-400*t)*(random(2)-0.5):s=48000:d=0.05"],
  // Low drone bed for the whole film.
  drone: ["-f", "lavfi", "-i",
    `aevalsrc=0.16*sin(2*PI*55*t)+0.11*sin(2*PI*55.6*t)+0.05*sin(2*PI*110.4*t)+0.03*sin(2*PI*164.8*t)*(0.5+0.5*sin(2*PI*0.11*t)):s=48000:d=${DURATION}`,
    "-af", "lowpass=f=400,afade=t=in:d=1.6"],
};
for (const [name, args] of Object.entries(synth)) {
  ff([...args, "-ar", String(SR), "-ac", "2", path.join(dir, `synth-${name}.wav`)]);
}

// ------------------------------------------------------------ cue sheet
const t = (frame) => frame / FPS;
const cues = []; // [file, startSeconds, gainDb, label]
const add = (file, at, db, label) => cues.push([file, Math.max(0, at), db, label]);

// Whooshes land on every whip / zoom transition.
const zoomThroughs = new Set([540, 1140, 1395]);
for (const f of [120, 540, 840, 1140, 1395, 1440, 1680]) {
  if (zoomThroughs.has(f)) add("synth-whooshLong.wav", t(f) - 1.2, -4, `zoom-through into ${f}`);
  else add("synth-whoosh.wav", t(f) - 0.5, -3, `whip into ${f}`);
}
add("synth-whoosh.wav", t(300) - 0.05, -8, "build lands on a whip");
// Panels fly in (stack), soft.
[0.2, 0.48, 0.76, 1.04].forEach((d, i) => add("synth-whoosh.wav", 28 + d - 0.15, -12, `panel ${i + 1} fly-in`));
// A stinger on every cut.
for (const c of CUTS) add("synth-stinger.wav", t(c.frame), c.type === "shot" ? -6 : -3, `cut ${c.frame} ${c.note}`);
// ElevenLabs impact on the three big beats.
add("el-impact.mp3", t(298), -2, "title lock (flash)");
add("el-impact.mp3", 50.7, 0, "climax burst");
add("el-impact.mp3", 56.0, -7, "end card lands");
// Riser into the burst.
add("synth-riser.wav", 50.7 - 2.1, -4, "converge riser");
// Typing ticks, one per revealed character (same curve as scenes/08-end.js).
const sineInOut = (x) => -(Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2 + 0.5;
const TAG = "Every frame. Every move. Written in code.";
let prevN = 0;
for (let f = 0; f < 4 * FPS; f++) {
  const lt = f / FPS;
  const n = Math.round(TAG.length * sineInOut((lt - 0.9) / 0.8));
  if (n > prevN) add("synth-tick.wav", 56 + lt, -10, `type ${n}`);
  prevN = n;
}
add("synth-drone.wav", 0, -14, "drone bed");

// ------------------------------------------------------------ mix
const inputs = [];
const parts = [];
cues.forEach(([file, at, db], i) => {
  inputs.push("-i", path.join(dir, file));
  const ms = Math.round(at * 1000);
  parts.push(`[${i}]aresample=${SR},aformat=channel_layouts=stereo,volume=${db}dB,adelay=${ms}|${ms}[a${i}]`);
});
const BLACK = 1794 / FPS; // the picture hard-cuts to black: so does the sound
const filter = parts.join(";") + ";" + cues.map((_, i) => `[a${i}]`).join("") +
  `amix=inputs=${cues.length}:normalize=0:dropout_transition=0,` +
  `atrim=0:${DURATION},apad=whole_dur=${DURATION},` +
  `volume='if(gte(t,${BLACK.toFixed(4)}),0,1)':eval=frame,` +
  `volume=9.5dB,alimiter=limit=0.84:level=false[out]`;
const wav = path.join(dir, "mix.wav");
ff([...inputs, "-filter_complex", filter, "-map", "[out]", "-ar", String(SR), "-ac", "2", wav]);
// Ship a compact AAC; the WAV and synth stems are build intermediates (git-ignored).
ff(["-i", wav, "-c:a", "aac", "-b:a", "256k", path.join(dir, "mix.m4a")]);

fs.writeFileSync(path.join(dir, "cues.json"), JSON.stringify(cues.map(([file, at, db, label]) => ({ at: +at.toFixed(3), file, db, label })), null, 2));
console.log(`mixed ${cues.length} cues into assets/audio/mix.m4a (${DURATION}s); cue sheet: assets/audio/cues.json`);
