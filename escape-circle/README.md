# Escape Circle

A reel-style (9:16) bouncing-ball simulation.

- One ball starts inside a slowly rotating circle with a medium-sized hole.
- Every time a ball escapes through the hole, 2 new balls appear inside.
- Balls come in many colours (no pink), are average-sized, and every bounce plays a simple ball sound.
- When the count inside reaches a random number between 100 and 170, the simulation "crashes":
  the circle shatters, balls explode across the screen and keep duplicating, the screen glitches,
  and **SIMULATION CRASHED** appears.

## Run it
Open `index.html` in a browser and tap **Tap to start** (sound needs a tap to begin).
A full run takes about 40–60 seconds. Screen-record it in portrait for a reel.

Optional: `index.html?target=120` makes it crash at exactly 120 balls.

Tweak the settings block at the top of the script (hole size `GAP`, `BALL_R`, `SPEED`,
`ROT_SPEED`, `CRASH_MIN`/`CRASH_MAX`, `COLORS`).
