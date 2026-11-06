# MADE WITH CLAUDE

*Every frame. Every move. Written in code.*

A 60-second 3D motion graphics showcase, 1920x1080 at 30 fps, built entirely in code with
[Hyperframes](https://hyperframes.heygen.com) (HTML to MP4), Three.js and GSAP. See
`BUILD_LOG.md` for which skill and tool made each part, and `design/visual-language.md`
for the locked palette, type, materials and eases.

## Run it

```bash
npm install
npm run check        # self-check: depth planes, easing, safe zone, accent, runtime, counters
npm run keyframes    # one still per scene -> render/keyframes/
npm run render       # refreshes the counters, then renders render/made-with-claude.mp4
npx hyperframes preview   # live preview in the browser
```

`node tools/sound.mjs` rebuilds `assets/audio/mix.m4a` from the beat map. It needs ffmpeg and
`assets/audio/el-impact.mp3`.

## Layout

```
index.html              root composition (canvas, overlays, sound)
scenes/                 one module per scene: 01-void ... 08-end
timeline/timing.js      timing sheet and beat map (every cut, flash and read time)
timeline/engine.js      renderer, studio light, motion blur, overlays, inspection
timeline/style.js       palette, eases, materials, dust, type helpers
timeline/main.js        boot: fonts, scenes, the hf-seek listener
assets/                 fonts, vendored three.js / gsap, audio, build stats
tools/                  stats, self-check, keyframes, sound mix, typeface converter
render/                 final MP4, keyframes, self-check report
design/                 visual language
```

## Storyboard

| Time | Scene | Exit |
|---|---|---|
| 0:00-0:04 | The void: a line draws across the dark | whip zoom along the line |
| 0:04-0:10 | Title: extruded slabs assemble "MADE WITH CLAUDE" | cut on lock, 2-frame flash |
| 0:10-0:18 | The build: IDEA, CODE, SCENE, TIMING, RENDER cards rise; 90 degree orbit | zoom-through between two cards |
| 0:18-0:28 | Hero: glass sphere, metal torus, faceted crystal on one axis; 4 zoom-cuts | whip zoom out |
| 0:28-0:38 | The stack: Hyperframes, Claude, frontend design, motion timing | zoom-through the grid centre |
| 0:38-0:48 | Data: scenes, frames, lines of code; dolly through; spinning wireframe | whip zoom in |
| 0:48-0:56 | Climax: everything converges, bursts; 8 cuts in 4 seconds | whip zoom out |
| 0:56-1:00 | End card: pull back, logo settles, tagline types | hard cut to black |

## Licences

Space Grotesk and JetBrains Mono: SIL Open Font License (`assets/fonts/*-OFL.txt`).
three.js: MIT (`assets/vendor/three-LICENSE.txt`). GSAP: GreenSock standard licence.
Impact sound effect generated with ElevenLabs. Check its terms before commercial use.
