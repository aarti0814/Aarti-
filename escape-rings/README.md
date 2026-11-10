# Ring Escape

A third escape simulation, built for vertical reels. One ball starts inside **5 spinning rings, one inside
the other**. Each ring has a hole and spins the opposite way to its neighbours.

- The holes are one-way exits (shown with a faint dotted line): balls can go out, not back in.
- A gentle outward pull makes balls ride the walls until a hole comes past.
- When a ball gets out of the outermost ring, **2 new balls** appear in the middle.
- Balls come in many colours (no pink), and every bounce plays a simple ball sound. Inner rings bounce at a
  lower pitch than outer ones.
- At a random count between 100 and 170 balls the simulation **crashes**: the rings break into coloured
  pieces, balls explode and keep duplicating, the screen glitches, and **SIMULATION CRASHED** appears.

A run takes about 55–70 seconds.

## Record it
Start your screen recorder, open `index.html` and tap **TAP TO START**. It asks for full screen, and the
canvas matches your screen's shape, so there are no black bars. **RUN IT AGAIN** appears about 3 seconds
after the crash, so trim it off.

`index.html?target=150` crashes at exactly 150 balls. Ring sizes, hole sizes and spin speeds are in
`RINGS` at the top of the script.
