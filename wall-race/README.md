# Wall Breaker Race

Vertical (phone-shaped) neon race: **1 yellow ball (×100 per wall)** vs **1,000 blue balls (+1,000 per wall)**
smashing down through 10 walls against a 20-second clock.

Wall health (same for both lanes): 50, 300, 1,000, 1,500, 2,500, 4,000, 6,000, 8,000, 10,000, 15,000.

The physics is real: every ball that touches a wall deals damage. Blue's 1,000 balls smash the early walls
instantly and reach the last wall at about 13s. The lone yellow ball chips at wall 1 one hit at a time for
about 15s. Its 100 balls then break wall 2, and its 10,000 balls tear through the last 8 walls in about a
second, in slow motion. Yellow breaks wall 10 with **0.03s left**, while blue is 190 HP short.

How the ending is guaranteed: the physics is deterministic (seeded randomness, fixed 1/120s timestep).
While the start screen shows "PREPARING RACE…", the page runs candidate races invisibly. It keeps the first
one where yellow wins and blue is stuck on wall 10, and matches the clock to yellow's finish. The race you
then watch replays exactly the same physics. Other browsers can round maths slightly differently, so the
leftover HP shown at the end may differ on some phones.

## Record it
1. Start your phone's screen recorder.
2. Open `index.html` and tap **TAP TO START**. The page asks for full screen, and the canvas resizes to
   your screen's shape, so the recording has no black bars.
3. The race lasts about 23 seconds with the slow-motion finish. The **RACE AGAIN** button appears 4 seconds
   after the finish, so trim it off.

Settings are at the top of the race setup: `TOTAL`, `FINISH_LEFT`, `HP`, `RULES`, `SEEDS`.
