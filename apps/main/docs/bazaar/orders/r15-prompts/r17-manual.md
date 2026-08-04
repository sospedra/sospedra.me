# r17 order — MANUAL — layered animation build (floating repair robot)

READ FIRST:
1. .../master-run-20260728/r17/DOCTRINE.md
2. The papers pilot reference implementations it names.
Work only inside .../master-run-20260728/r17/manual/

LOCKED STATIC: r15/gen-manual.png · Chroma #ff00ff.

## The stall, described

A workshop bench stall. THE ROBOT floats above/behind the bench: a
small round olive-green body with rivets, THREE eye stalks rising
from the top (each stalk ends in an eye), two arms — one holds a
feather duster, the other a wrench — and below the body a thruster
cone with a small FLAME. Hanging lamps left and right; a parts bench
in front with gears, springs, tubes, canisters. The sign is letter
tiles on strings: "m a n u a l".

## Extraction duties

- CHARACTER = the whole floating robot: body, all three eye stalks,
  both arms + held tools, thruster cone AND its flame. Probe the
  cluster (olive-green body tones + the flame's warm pixels) —
  expect it centered above the bench.
- PROTECTED: the letter-tile sign, both lamps, the bench and every
  part on it, wall panels, chroma.
- Inpaint behind the robot: wall panels — strip-tile from clean wall
  columns beside him. The flame's small hole: nearest-side fill.

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms) — THE BOB

- f2 (A): the WHOLE robot layer rises 7px (one rigid translate — the
  beauty of the layered architecture). Flame: one frame longer —
  extend the flame 3px down by repeating its base rows; brighten its
  core one palette step (existing colors only). Left + center eye
  pupils look LEFT (pupil pixels shift 2px).
- f3 (B): the robot sits 3px BELOW rest height. Flame shorter than
  rest by 2px (trim base rows). All three pupils look RIGHT 2px.
- The loop rest→A→B→rest reads as continuous floating: up, down
  past center, settle.

## Hover — 4 frames (150ms each, h4 held)

- h1: all three pupils LOCK on the camera (centered), stalks
  straighten 2px taller, arms pause exactly as rest.
- h2: the robot DIPS toward the viewer: whole layer down 10px, and
  the eye stalks BOW — the top 12 rows of each stalk shear 3px
  forward (toward the viewer = downward-right in this projection),
  eyes keep camera lock.
- h3: the free claw (duster arm) SWEEPS UP AND OUT presenting the
  bench: rebuild that arm rotated ~40° outward, claw travels ~30px
  up-right from its rest position, duster rides along. Wrench arm
  tucks 4px inward. Robot body still 10px low.
- h4 (held): robot rises back to rest height (flame +2px this frame),
  stalks straighten, presenting claw HOLDS at its h3 position, other
  arm returns to rest pose. Calm float, held.

## Effects

None for this stall (lamps stay frozen; the flame lives in the char
frames). manifest.json: no effect layers.

## Deliver

Doctrine output contract in r17/manual/, manifest.json, verify.mjs
green, DONE line.
