# r17 order — TALKS — layered animation build (clerk + SMPTE CRT + tape)

READ FIRST:
1. .../master-run-20260728/r17/DOCTRINE.md
2. The papers pilot reference implementations it names.
Work only inside .../master-run-20260728/r17/talks/

LOCKED STATIC: r15/gen-talks.png · Chroma #00ff00.

## The stall, described

The VIDEO CLUB kiosk. THE CLERK sits behind the counter right of
center: young woman, dark hair, yellow/mustard vest over a tee,
LEANING with her cheek resting on one palm, the elbow planted on the
counter, bored half-lidded eyes. Left of her: a CRT television
showing SMPTE COLOR BARS. Around: tape shelves, reels, posters, a
neon "VIDEO CLUB" sign (frozen), a red tape crate, a boombox.

## Extraction duties

- CHARACTER = THE CLERK: hair, face, both arms (planted elbow + prop
  hand + counter hand), vest, torso down to where the counter cuts
  her. Probe her cluster (skin + mustard vest tones right of the
  CRT).
- SMPTE SCREEN = EFFECT REGION: probe the color-bar screen's interior
  rect (saturated vertical bars — unmistakable). Effect frames
  replace the rect; the CRT shell stays plate. No inpaint.
- TAPE = AUTHORED PROP LAYER: the hover needs a VHS tape that does
  not exist in the static. AUTHOR it: a ~44×26px VHS cassette drawn
  ONLY from colors already in this stall (sample the counter tapes /
  crate tapes for shell + label colors): dark shell, two lighter
  reel circles, a pale label band. tape-f1.png = fully transparent
  (at rest the tape is hidden under the counter). Hover frames bring
  it up (below).
- PROTECTED: neon sign, CRT shell, shelves, every tape stack, crate,
  boombox, posters, counter, chroma.
- Inpaint behind the clerk: the backdrop shelf wall — strip-tile
  from clean shelf columns beside her; counter rows nearest-side.

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms) — THE BORED DROOP

- f2 (A): her head SINKS 4px deeper into the palm (head block down
  4px, the supporting palm/forearm compresses 1px), eyes half-lidded
  (lid pixels lower by 1 row), free fingertip taps: 3px lift on the
  counter hand's index finger.
- f3 (B): sinks further: head 7px below rest, eyes CLOSED, shoulder
  drops 2px, fingertip back down. The snap back to rest (f1) gives
  the dozing-off-catching-herself read.

## Hover — 4 frames (150ms each, h4 held)

- h1: eyes OPEN and slide to the camera (pupils to front, lids up),
  brows rise 2px, head still on palm.
- h2: she SITS UP: head rises 14px and leaves the palm (head block
  up; the palm-arm stays planted on the counter, now supporting
  nothing; her neck/torso extends from her own vest/skin rows),
  both eyes on camera.
- h3: the TAPE RISES: tape prop appears at the counter edge in her
  free hand, 24px above its hidden start (tape-h3 asset positioned
  just above the counter line, her free hand repositioned to grip
  it — hand travels ~20px).
- h4 (held): the tape is OFFERED over the counter edge toward the
  viewer (tape + hand 8px further forward/down), label facing out,
  and she wears a faint knowing HALF-SMILE (mouth corner +1px, one
  brow +1px). Held.

## Effects — fx-smpte, 4 frames, 180ms each, infinite

The SMPTE rect: a 6px-tall DARKER SCANLINE BAND (each bar's colors
mapped one palette step darker — existing colors only, sample each
bar's darker sibling) ROLLS down the screen: frame 1 band at top
quarter, f2 middle-upper, f3 middle-lower, f4 bottom; plus on f3 the
whole screen brightens: swap each bar color one step UP for that
frame only. Loop seamless.

## Deliver

Doctrine output contract in r17/talks/, manifest.json (idle 3,
hover 4, tape prop layer, fx-smpte 4 @180ms), verify.mjs green
(tape-f1 transparent keeps the rest assert exact), DONE line.
