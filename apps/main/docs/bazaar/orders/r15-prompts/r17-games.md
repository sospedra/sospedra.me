# r17 order — GAMES — layered animation build (two kids + arcade CRT)

READ FIRST:
1. .../master-run-20260728/r17/DOCTRINE.md
2. The papers pilot reference implementations it names.
Work only inside .../master-run-20260728/r17/games/

LOCKED STATIC: r15/gen-games.png · Chroma #ff00ff.
(Fleet-10 render: small kids, drippy sign, arcade left, bulb string.)

## The stall, described

The kids' game den. TWO KIDS stand center-right: THE SISTER (left of
the pair): brown ponytail with a pink tie, purple hoodie, dark
shorts, red/white sneakers, holding a dark HANDHELD console with
both hands at chest height, its screen glowing on her face. THE
BROTHER (right): messy brown hair, red/white striped tee, dark blue
shorts, blue/white sneakers, hands at his sides, watching her screen
sideways. Left: the blue ARCADE CABINET, marquee with lightning
bolts, CRT screen showing TWO FIGHTER SPRITES with health bars.
Around: kid-painted "games" sign, colored bulb string with gradient
casts, shelves with consoles/cartridges, crates left, bins right.

## Extraction duties

- CHARACTERS = BOTH KIDS as ONE layer (they animate in the same
  frames): sister incl. the handheld in her hands, brother whole.
  Probe both clusters (skin, purple hoodie, striped tee, sneakers).
- ARCADE SCREEN = EFFECT REGION: probe the CRT interior rect (the
  dark screen holding the two small fighters + health bars). Effect
  frames replace the rect; cabinet shell stays plate. No inpaint.
- PROTECTED: arcade cabinet shell + marquee, sign, bulbs + their
  wall casts, shelves and everything on them, crates, bins, chest,
  posts, floor, chroma.
- Inpaint behind the kids: the dark plank wall — vertical planks,
  strip-tile from clean plank columns beside them; floor rows
  nearest-side horizontal.

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms)

- f2 (A): the handheld's screen face FLASHES (its glow pixels swap
  to their brighter siblings — the lit pixels on her chin/hands
  brighten one step too), her thumbs press 3px down, her head tips
  2px toward the screen. Brother: pupils dart LEFT toward her screen.
- f3 (B): screen back to rest glow, her head back up, BROTHER ROCKS:
  his whole body rises 4px onto tiptoes (rigid lift of his cluster;
  sneaker toes stay planted — leave the bottom 2 sneaker rows
  unmoved and stretch above them), pupils back center.

## Hover — 4 frames (150ms each, h4 held)

- h1: sister LOOKS UP excited: her head lifts 5px to camera, mouth
  opens 1px (a gasp), brother's pupils slide to camera.
- h2: her arm SHOOTS UP: the handheld + both her hands rise 25px
  (rigid lift of hands+handheld; her arms rebuilt extended from her
  own sleeve/skin rows; head tilts up following it).
- h3: APEX: handheld 45px above her head start point, held one-
  handed (left hand back at her chest — rebuild), she is on tiptoes
  3px; BROTHER unfolds: his arms cross → uncrossed at his sides,
  chest puffs 2px.
- h4 (held): she WAVES the handheld: 6px side-tilt (the handheld +
  raised hand shear 6px right, one intermediate wave is implied by
  the hold loop later), both kids face the camera, brother wears a
  1px determined chin. Held.

## Effects — fx-arcade, 4 frames, 200ms each, infinite

The arcade CRT rect: the two fighter sprites idle-bounce — frame 2:
left fighter up 2px; frame 3: both at rest, health bars flicker
(one segment of each bar swaps to its dim sibling); frame 4: right
fighter up 2px. A 3px scanline shimmer band (existing darker
siblings of each pixel) rolls down one quarter of the screen per
frame. Loop seamless.

## Deliver

Doctrine output contract in r17/games/, manifest.json (idle 3,
hover 4, fx-arcade 4 @200ms), verify.mjs green, DONE line.
