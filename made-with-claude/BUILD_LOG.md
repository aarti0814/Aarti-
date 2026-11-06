# Build log: MADE WITH CLAUDE

Every frame of this film is drawn by code: Three.js geometry and materials, canvas-drawn
type, and a GSAP/Hyperframes timeline. No editing software, 3D package, template, stock
footage, stock music, stock model or licensed logo was used.

## The numbers on screen (DATA MOMENT counters)

| Counter | Value | Source |
|---|---|---|
| Scenes built | **8** | `SCENES` in `timeline/timing.js` |
| Frames rendered | **1,800** | 60 s x 30 fps; checked against the MP4's frame count by `tools/selfcheck.mjs` |
| Lines of code | **2,188** | Non-blank lines in `index.html`, `scenes/`, `timeline/`, `tools/` (vendored libraries, fonts, docs and generated files excluded); per-file list in `assets/build-stats.js` |

`tools/stats.mjs` writes these into `assets/build-stats.js` immediately before the render,
and the counters read them from there.

## Who did what

| Phase | Skill or tool used | What it produced |
|---|---|---|
| Visual language | Claude (the `frontend-design` skill is not installed in this environment; the design lock was written directly), `canvas-design` skill for the philosophy | `design/visual-language.md`: "Quiet Machine" philosophy, palette tokens, type pair, materials, lights, the five eases |
| Pacing and scene structure | `demo-video` skill | One focus per scene, varied scene lengths (4 s to 10 s), no linear motion |
| Timing sheet and beat map | Claude | `timeline/timing.js`: 8 scenes, 24 frame-aligned cuts, flash schedule, read times |
| Key frames | `canvas-design` skill guidance, rendered with `hyperframes snapshot` | `render/keyframes/01-void.png` to `08-end.png`, `keyframes-sheet.png` |
| Scene scripts | Claude | `scenes/01-void.js` to `scenes/08-end.js` |
| 3D, materials, light, motion blur | Three.js r187 inside Hyperframes, written by Claude | `timeline/engine.js` (renderer, studio environment, 3-sample motion blur, overlays), `timeline/style.js` (eases, materials, dust, type) |
| 3D type | `opentype.js` converter written by Claude | `assets/fonts/SpaceGrotesk-Bold.typeface.json`, extruded per letter in code |
| Hyperframes contract | `hyperframes` skill (render contract, `hf-seek`, `buildReady`) | `index.html` root composition, `timeline/main.js` |
| Sound design | ElevenLabs connector (Sound Effects, `eleven_text_to_sound_v2`) and ffmpeg synthesis written by Claude | `assets/audio/el-impact.mp3` (ElevenLabs), whoosh, stinger, riser, key tick and drone synthesised in `tools/sound.mjs`, mixed to `assets/audio/mix.m4a` with every cue placed from the beat map |
| Self-check | Claude | `tools/selfcheck.mjs`: runs the real page in headless Chrome; report in `render/check/report.json` |
| Validation | `hyperframes check` | Lint, runtime, layout, contrast, craft and audio passes |
| Render | `hyperframes render` (local Chrome, FFmpeg) | `render/made-with-claude.mp4` |

## Self-check results (before render)

| Check | Result | How it is measured |
|---|---|---|
| At least 3 depth planes per scene | PASS | Median view depth of background, subject and foreground, ordered fg < subject < bg, in at least 80 % of samples per scene |
| No linear easing | PASS | Source scan of scenes and timeline, plus every GSAP tween's ease. Motion uses expo-out, expo-in, expo-in-out, overshoot `cubic-bezier(0.2, 1.4, 0.4, 1)` and sine for idle drift |
| Transitions are zooms or cuts | PASS | Each scene exit in the beat map: 4 whip zooms, 2 zoom-throughs, 1 cut on lock (+ flash, landing on a whip), 1 hard cut to black |
| No text outside the safe zone | PASS | Projected text bounds inside x 96-1824, y 54-1026 at every read time and whenever text is settled (moving < 6 px per frame) |
| Text at least 36 px | PASS | Projected font size at every read time |
| Accent under 10 % of frame | PASS | Cyan pixel count of the rendered canvas, every 0.5 s |
| Runtime 55-65 s | PASS | 60.0 s |
| Counter values match the build log | PASS | Counters vs a fresh `tools/stats.mjs` run, and the MP4 frame count |
| End card readable at least 2 s | PASS | Frames with the full tagline visible before the cut to black |
| No static hold over 1.5 s (outside title / end) | PASS | Frame-difference scan every 0.25 s |
| Perspective 800-1200 px | PASS | Every camera: 950 to 1050 px |

## Notes

- Motion blur is done in the engine, not by Hyperframes' DOM blur: on fast moves the
  scene is rendered 3 times across a 180 degree shutter and averaged.
- The only white flashes are the 2-frame flash on the title lock and a 3-frame, 55 %
  flash on each montage cut (2 per second, below the 3-per-second photosensitivity limit).
- Of the six sounds requested from ElevenLabs, one was generated (the impact). Three were
  refused because the shared free tier was busy, and two failed because the ElevenLabs
  account ran out of credits. Those five were synthesised in code with ffmpeg instead.
