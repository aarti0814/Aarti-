# Which Color Survives? (ball battle series)

4 colored balls with 100 HP in a circle arena. When two balls collide, the faster one deals 7–13 damage,
with a 12% chance of a double-damage crit. The last ball standing wins. Every wall bounce plays the next
note of *In the Hall of the Mountain King* (public domain), and the key rises after each full pass of the
melody.

- `export/which-color-survives-ep1.mp4`: episode 1 (seed 330), ready to upload. See `YOUTUBE.md`.
- `index.html`: the game. Open it to watch live; `?seed=N` picks a battle.
- `tools/seeds.js`: simulates 400 battles and lists seeds with a close, well-paced fight.
- `tools/render.js` + `tools/mix.py`: render any seed to a finished MP4 with music and sound effects.

**New episode:** run `node tools/seeds.js`, pick a seed, set `SEED` in `render.js`, run `node render.js`,
then `python3 mix.py`, then mux with ffmpeg (same command as in `collatz-balls/README.md`).
