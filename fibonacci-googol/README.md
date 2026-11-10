# Fibonacci vs Googol

"Can a Fibonacci Ball Deal 1 Googol Damage in 60 Seconds?" A vertical, futuristic HUD-style simulation for reels.

- A square arena holds two balls: a giant red ball with **exactly 1 googol HP (10¹⁰⁰)**, and a small gold
  "F" ball.
- Hit number *n* deals **F(n)** damage, the n-th Fibonacci number: 1, 1, 2, 3, 5, 8, 13… The maths uses
  exact big integers, so no rounding happens anywhere.
- A googol takes **479 hits**. Hit 479 alone deals F(479), a 100-digit number. Right before it, the giant
  ball still has about 8% of its HP left.
- The small ball speeds up a little with every hit, and the hit sound climbs in pitch as the numbers grow.
- The panel shows every digit of the total damage and counts digits toward 101 (a googol has 101 digits).
  The last 3 hits play in slow motion.

The clock is real time. On load ("LOADING…"), the page runs candidate matches invisibly and picks one where
hit 479 lands between 58.6s and 59.85s. The run you watch replays exactly that physics, so it always ends
with "YES." and under a second left.

## Record it
Start your screen recorder, open `index.html` and tap **TAP TO START**. It goes full screen and matches your
screen's shape. A run is about 62 seconds including the slow-motion finish. **RUN IT AGAIN** appears 4.5
seconds after the win, so trim it off.
