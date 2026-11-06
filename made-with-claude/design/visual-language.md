# Visual language: "Quiet Machine"

Locked before any scene was built. Every scene file reads its colours, type, materials and
eases from `timeline/style.js`, which mirrors this page.

## Philosophy

Quiet Machine treats a black void as a workbench. Nothing arrives by accident: a single line
is drawn, slabs are cut, forms are turned on one axis, and every move lands on a beat with the
weight of a machined part settling into a jig. The frame is mostly darkness so that the few
lit edges read as decisions.

Light is singular. One key from the upper left at 45 degrees and a cool rim from behind give
every object a lit shoulder and a cold edge; there is no fill to flatten them. Materials are
three and only three: matte black that absorbs, frosted glass that diffuses, brushed metal
that streaks. Off-white is for type and for the brightest highlights. Cyan is a signal, not a
colour scheme: a cursor, a hairline, a counter underline, never a surface.

Space is always layered. A far field of fine dust, a subject in the middle distance and a few
soft out-of-focus particles close to the lens give every camera move parallax, so a push or an
orbit reads as travel through a place rather than a zoom on a picture.

Type is engineered, not decorated. One geometric grotesk, set tight and large, carries every
word that matters; one monospace carries every number and every fragment of code. Nothing is
smaller than 36 px at 1080p and nothing leaves the central 90 % of the frame.

Craft is the subject. Every frame should look like it took a long time to get right: edges
aligned to a grid, eases tuned by hand, cuts landing on the frame where motion peaks. The
work should feel meticulously made, the product of patient, expert attention, because that
is exactly the claim the film makes.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ground` | `#0B0B0F` | Background, fog, end card black |
| `--ink` | `#F4F4F6` | Type, line, flashes, highlights |
| `--accent` | `#00E5FF` | Hairlines, cursor, underlines. Under 10 % of any frame |
| Display | Space Grotesk 700 / 500 | Titles, card words, panel names. Tracking -0.02 em |
| Mono | JetBrains Mono 400 / 700 | Counters, labels, tagline cursor, code fragments |
| Min type size | 36 px at 1080p | Checked per scene by `tools/selfcheck.mjs` |
| Safe zone | x 96 to 1824, y 54 to 1026 | Central 90 %, checked per scene |

## Materials and light

| Material | Three.js | Settings |
|---|---|---|
| Matte black | `MeshStandardMaterial` | `#15151B`, roughness 0.86 |
| Frosted glass | `MeshPhysicalMaterial` | transmission 1, roughness 0.3, thickness 1.2, IOR 1.45 |
| Brushed metal | `MeshPhysicalMaterial` | `#C8CBD2`, metalness 1, roughness 0.42, anisotropy 0.7 |
| Key light | `DirectionalLight` | white, from (-1, 1, 1) normalised: 45 degrees, top left |
| Rim light | `DirectionalLight` | cool `#A9E9FF`, from behind right |
| Environment | PMREM of a code-built softbox studio | 2 soft strips + 1 cool back strip |

## Motion

| Name | Curve | Use |
|---|---|---|
| `expoOut` | `1 - 2^(-10t)` | Every entrance |
| `expoIn` | `2^(10t - 10)` | Every exit |
| `expoInOut` | piecewise expo | Long camera travels |
| `snap` | `cubic-bezier(0.2, 1.4, 0.4, 1)` | Locks and docks (overshoot) |
| `sineInOut` | `-(cos(pi t) - 1) / 2` | Idle drift only, never linear |

Camera field of view is set so that the CSS-equivalent perspective is 800 to 1200 px
(`perspective = (1080 / 2) / tan(fov / 2)`): FOV 48 to 68 degrees vertical. Scenes use
50 to 62 degrees.
