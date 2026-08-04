# r17 order — CONSOLE — layered animation build (Ed + static screen)

READ FIRST:
1. .../master-run-20260728/r17/DOCTRINE.md
2. The papers pilot reference implementations it names.
Work only inside .../master-run-20260728/r17/console/

LOCKED STATIC: r15/gen-console.png · Chroma #00ff00.
(This is the fleet-11 render: Ed on the grand maroon carpet.)

## The stall, described

Ed's machine den. ED sits cross-legged center on a dark-maroon woven
carpet: wild RED dreadlock hair, dark VR visor over his eyes, gentle
smile, white tank top, dark shorts, barefoot. A cable runs from his
visor toward the racks. Machines surround him: beige tower stack
left with a STATIC-NOISE monitor on top, a broken dark monitor next
to it, khaki center rack behind him, black server racks right with
LED fields. A pipe rises top-right holding the "console" sign. On
the carpet: open pizza box (one slice), power strip, PSU, an open
box with keyboard/mouse/headphones.

## Extraction duties

- CHARACTER = ED ONLY: hair, visor, face, tank, shorts, arms, legs,
  feet, plus the visor cable's first ~30px (the part that visibly
  attaches to his head and would move with it). Probe his cluster:
  the red dread mass is unmistakable (strong warm reds), skin brown
  tones, white tank.
- STATIC MONITOR SCREEN = EFFECT REGION: probe the static-noise
  screen's interior rect on the top-left monitor (the salt-and-
  pepper noise field). The effect frames replace this rect; it is
  opaque — no inpaint needed. The monitor SHELL stays plate.
- PROTECTED: every machine, the sign + pipe, the carpet, all props
  (pizza, strip, PSU, box), LEDs, chroma.
- Inpaint behind Ed: the khaki center rack (strip-tile from its
  clean columns beside him) for his torso/head rows; the carpet's
  diamond weave for his legs/lower rows — the carpet is a horizontal
  pattern: fill with nearest-side same-row continuation, and check
  the diamond motif still aligns (use a strip anchored to the
  motif's period if plain nearest-side breaks it).

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms) — VIBING

- f2 (A): Ed's head BOBS: whole head + hair block down 5px (neck
  compresses; hair mass follows rigidly), visor cable end flexes 3px,
  right hand taps: fingers lift 5px off his knee.
- f3 (B): head back up and TILTED 3px left (rotate-read: translate
  the head block up to rest then shear its top 3px left), fingers
  back down, one hair dread on the right swings 3px out.
- Visor glyphs: if the visor face shows any lit pixels, tick 3-4 of
  them between frames (existing colors).

## Hover — 4 frames (150ms each, h4 held)

- h1: head lifts 6px and faces camera (visor front-on: widen the
  visor band 2px symmetrically), smile +1px.
- h2: right forearm swings UP from the elbow: hand rises ~18px,
  halfway to a peace sign; upper arm stays planted.
- h3: PEACE SIGN at shoulder height: hand at ~35px above rest, two
  fingers extended (his own skin shades), other hand flat on the
  carpet.
- h4 (held): the sign holds byte-still; grin widens 2px (one row
  taller smile, corners +1px each); head nods 2px. Held.

## Effects — fx-static, 3 frames, 120ms each, infinite

The static screen rect: three DIFFERENT noise fields from the same
pixel population. Deterministically permute the rect's own pixels:
frame 2 = rows shifted by a fixed stride + columns swapped in pairs;
frame 3 = a different fixed permutation (e.g. reverse row order +
stride 7 column rotation). Never introduce new colors; the noise
must keep its exact black/white/gray population, just rearranged.
Loop 1→2→3→1 reads as living CRT snow.

## Deliver

Doctrine output contract in r17/console/, manifest.json (idle 3,
hover 4, fx-static 3 @120ms), verify.mjs green, DONE line.
