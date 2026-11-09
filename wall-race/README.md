# Wall Breaker Race

Vertical (phone-shaped) neon race: **1 yellow ball (×5 per wall)** vs **1,000 blue balls (+1,000 per wall)**
smashing down through 10 walls (25 → 250,000 HP) against a 45-second clock.

The physics is real: every ball that touches a wall deals damage, so 1,000 blue balls smash the first walls
instantly while the lone yellow ball chips away one hit at a time. Blue reaches the last wall early, and
yellow's ×5 then snowballs. The last second plays in slow motion with a heartbeat, and yellow breaks
wall 10 with **0.03s left**.

How the ending is guaranteed: the physics is deterministic (seeded randomness, fixed 1/120s timestep).
While the start screen shows "PREPARING RACE…", the page runs the whole race invisibly, sizes wall 10
so blue ends a bit over 1,000 HP short, and matches the 45s clock to yellow's finish.
The race you then watch replays exactly the same physics.

## Record it
1. Start your phone's screen recorder.
2. Open `index.html` and tap **TAP TO START**. The page asks for full screen, and the canvas resizes to
   your screen's shape, so the recording has no black bars.
3. The race lasts about 46 seconds. The **RACE AGAIN** button appears 4 seconds after the finish, so trim it off.

Tune it at the top of the race setup: `TOTAL`, `FINISH_LEFT`, `BASE_HP` (walls 1–9), `RULES`, `SEEDS`.
