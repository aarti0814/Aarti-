# Count the Collisions

A vertical reel where real physics spells out π, even though π appears nowhere in the code.

- 8 rows. Each row has a wall, a small block (mass 1) and a big block sliding toward it. In each row the big
  block is **100× heavier** than in the row above: 1, 10², 10⁴ … 10¹⁴.
- Collisions are perfectly elastic with no friction, and every block-block and block-wall hit is counted.
- The counts come out as **3 · 31 · 314 · 3,141 · 31,415 · 314,159 · 3,141,592 · 31,415,926**. The last digit
  of each row, read top to bottom, is **π = 3.1415926**. This is a real result (Galperin, 2003).
- The simulation is exact and event-driven. Every one of the 31,415,926 collisions in row 8 is computed.
  When a row has too many hits to show in one frame, its time slows ("TIME SLOWED") so you can watch the
  counter climb.
- Sound: a clack for each collision, a buzz when they come too fast to hear separately, and each finished row
  plays its π digit as a note. The finale plays all 8 digits as a melody.

## Record it
Start your screen recorder, open `index.html` and tap **TAP TO START**. It runs about 38 seconds, goes full
screen and matches your screen's shape. **RUN IT AGAIN** appears 7 seconds into the reveal, so trim it off.
