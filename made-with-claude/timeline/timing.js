// Timing sheet and beat map. Single source of truth for every cut in the film.
// All times are frame-aligned at 30 fps (frame = seconds * 30).

export const FPS = 30;
export const DURATION = 60;
export const f = (frame) => frame / FPS;

// Scenes in order. `enter` / `exit` name the transition on each side of the boundary.
export const SCENES = [
  { id: "void",   file: "01-void.js",    start: 0,  end: 4,  exit: "whip zoom (7 f) along the line, hard cut" },
  { id: "title",  file: "02-title.js",   start: 4,  end: 10, exit: "hard cut on final letter lock + 2 f white flash; next scene lands on a whip zoom" },
  { id: "build",  file: "03-build.js",   start: 10, end: 18, exit: "zoom-through the gap between CODE and SCENE" },
  { id: "hero",   file: "04-hero.js",    start: 18, end: 28, exit: "whip zoom (7 f) out of the crystal" },
  { id: "stack",  file: "05-stack.js",   start: 28, end: 38, exit: "zoom-through the centre gap of the 2x2 grid" },
  { id: "data",   file: "06-data.js",    start: 38, end: 48, exit: "whip zoom (7 f) into the spinning wireframe" },
  { id: "climax", file: "07-climax.js",  start: 48, end: 56, exit: "whip zoom (7 f) pull-out, lands on the end card pull-back" },
  { id: "end",    file: "08-end.js",     start: 56, end: 60, exit: "hard cut to black (final 6 f)" },
];

// Every cut in the film, in frames. type: scene = scene boundary, shot = cut inside a scene.
export const CUTS = [
  { frame: 120,  type: "scene", note: "void -> title" },
  { frame: 300,  type: "scene", note: "title -> build (flash on frames 298-299)" },
  { frame: 540,  type: "scene", note: "build -> hero (zoom-through)" },
  // Hero: 4 zoom-cuts in 3 seconds, each on a new angle of the same object.
  { frame: 750,  type: "shot",  note: "hero angle 1" },
  { frame: 773,  type: "shot",  note: "hero angle 2" },
  { frame: 795,  type: "shot",  note: "hero angle 3" },
  { frame: 818,  type: "shot",  note: "hero angle 4" },
  { frame: 840,  type: "scene", note: "hero -> stack" },
  { frame: 1140, type: "scene", note: "stack -> data (zoom-through)" },
  { frame: 1395, type: "shot",  note: "dolly through numbers -> spinning wireframe" },
  { frame: 1440, type: "scene", note: "data -> climax" },
  // Climax montage: 8 cuts in 4 seconds, a soft white flash on each.
  ...[1560, 1575, 1590, 1605, 1620, 1635, 1650, 1665].map((frame, i) => ({ frame, type: "shot", note: `montage ${i + 1}`, flash: true })),
  { frame: 1680, type: "scene", note: "climax -> end card" },
  { frame: 1794, type: "black", note: "hard cut to black" },
];

// White flashes: [startFrame, frames, peak opacity]. Peak < 1 and at most 2 per second in
// the montage keeps them well under the 3-flashes-per-second photosensitivity limit.
export const FLASHES = [
  [298, 2, 1.0],
  ...CUTS.filter((c) => c.flash).map((c) => [c.frame, 3, 0.55]),
];

// Moments where on-screen text must be fully readable (checked for size and safe zone).
export const READ_TIMES = {
  void: [],
  title: [9.85],
  build: [12.4, 13.0],
  hero: [],
  stack: [30.9, 31.9, 32.9, 33.9, 35.2],
  data: [42.0],
  climax: [],
  end: [58.6, 59.4],
};

export const sceneAt = (t) => SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
