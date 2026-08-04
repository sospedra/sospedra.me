# r17 order — TRAVEL — layered animation build (Hearthian agent + candles)

READ FIRST:
1. .../master-run-20260728/r17/DOCTRINE.md
2. The papers pilot reference implementations it names.
Work only inside .../master-run-20260728/r17/travel/

LOCKED STATIC: r15/gen-travel.png · Chroma #ff00ff.
(Fleet-8 render: the approved travel booth.)

## The stall, described

The Travel Ventures booth. THE AGENT stands behind the counter: a
blue-gray Hearthian with FOUR pale eyes (two pairs stacked), red
vest over a shirt, one hand HOLDING UP A TICKET (already raised in
the static — rendered truth), the other hand resting on the counter.
Around: the triangle pennant sign, planet route cards hanging left,
CANDLES (a pair on the counter left, more on the right wall sconce
area, one near the radar), a green-screen RADAR on the counter
right, navy trunk with brass corners bottom-left, stanchion posts
with velvet rope in front, LAST SEATS plate, banjo, diving helmet.

## Extraction duties

- CHARACTER = THE AGENT: head with all four eyes, vest, both arms,
  the TICKET in his raised hand (it moves with the arm — part of
  char). Probe his blue-gray + red-vest cluster behind the counter.
- CANDLE FLAMES = EFFECT LAYER (fx-flames): ONLY the flames + their
  immediate glow halo pixels, every candle (probe warm bright
  clusters atop wax columns: expect the counter pair, the right
  group, the radar-side one). The wax bodies stay plate.
- PROTECTED: radar (screen + sweep stay FROZEN this round), trunk,
  posts + rope, sign, route cards, LAST SEATS plate, banjo, helmet,
  counter, posters, chroma.
- Inpaint behind the agent: booth interior wall (probe what is
  actually behind him — wall planks/posters); strip-tile from clean
  wall columns; counter rows nearest-side. Behind flames: tiny
  holes, nearest-side.

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms) — THE BLINK WAVE

- f2 (A): TOP eye pair blinks (lids from his own skin shade cover
  the pale eyes), ticket flutters: ticket + hand rotate-read 4px
  (top edge 4px left, pivot at the wrist), head tips 2px left.
- f3 (B): BOTTOM eye pair blinks (top pair open), ticket back, his
  counter hand's fingers drum: two fingertips lift 3px, head back.

## Hover — 4 frames (150ms each, h4 held)

- h1: ALL FOUR eyes go WIDE at the camera: each eye 1px taller +
  brightened one palette step, brows (if present, else the ridge
  rows above the eyes) rise 2px, smile +1px.
- h2: the ticket arm SWEEPS toward the viewer over the counter:
  ticket + hand + forearm travel 18px down-right (rigid lift with
  elbow root fixed), staying BELOW the LAST SEATS plate — probe its
  position and keep 8px clearance.
- h3: FULL REACH: ticket 30px from rest, held out over the counter
  edge toward the viewer, head tips 3px following it.
- h4 (held): the other hand rises and POINTS at the planet route
  cards on the left (rebuild that arm from his own rows, fingertip
  stops ≥8px from the nearest card), four eyes on camera, ticket
  holds. Held.

## Effects — fx-flames, 3 frames, 260ms each, infinite, PHASE-OFFSET

Every flame gets 3 frames: lean LEFT 2px / UPRIGHT with a 2px taller
tip + halo one shade wider / lean RIGHT 2px. Build ONE set of frames
containing ALL flames, but give each candle a different phase (some
start on lean-left, some upright, some lean-right) so the candles
never flicker in sync. The manifest declares one fx-flames layer,
3 frames @260ms.

## Deliver

Doctrine output contract in r17/travel/, manifest.json (idle 3,
hover 4, fx-flames 3 @260ms), verify.mjs green, DONE line.
