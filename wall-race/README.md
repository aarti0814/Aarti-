# Wall Breaker Race

Vertical (phone-shaped) neon race: **1 yellow ball (×5 per wall)** vs **1,000 blue balls (+1,000 per wall)**
smashing down through 10 walls (25 → 250,000 HP) against a 45-second clock.

Blue races ahead early, and yellow is stuck on wall 1 for 13 seconds. Then yellow's ×5 snowballs. The last
second plays in slow motion with a heartbeat, and yellow breaks wall 10 with **0.03s left**.
Blue ends a little over 1,000 HP short (the exact number changes slightly each run).

## Record it
1. Start your phone's screen recorder.
2. Open `index.html` and tap **TAP TO START**. The page asks for full screen, and the canvas resizes to
   your screen's shape, so the recording has no black bars.
3. The race lasts about 46 seconds. The **RACE AGAIN** button appears 4 seconds after the finish, so trim it off.

The scripted timing lives at the top of the script (`TOTAL`, `HP`, `YELLOW_BREAKS`, `BLUE_BREAKS`,
`BLUE_LEFT_AT_END`, `SLOWMO_FROM`).
