# r17 order — PAPERS — amplification upgrade (bigger, more frames)

READ FIRST:
1. /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r17/DOCTRINE.md
2. The papers pilot scripts — THIS STALL IS THE PILOT. You are
   upgrading it, not rebuilding it.

Work only inside .../master-run-20260728/r17/papers/ (a NEW directory;
leave the pilot files in r17/ untouched — copy what you reuse).

LOCKED STATIC: r15/gen-papers.png · Chroma #ff00ff.

EXISTING, PROVEN, REUSE THEM: r17/papers-plate.png (inpainted plate),
r17/papers-char.png (character layer), r17/papers-book-f1.png (book
layer), r17/papers-char-f2.png (tear v1), hover frames char-h1..h3 +
book-empty. Copy these into r17/papers/ under the doctrine's naming
(plate.png, char-f1.png, book-f1.png, ...) and build the upgrade on
top. The extraction and inpaint are DONE — do not redo them.

## User ruling driving this upgrade

"More movement, barely visible, maybe more frames." Every amplitude
below is a minimum. The old tear (6px shears) and the old hover
(20px book rise) were TOO SMALL.

## Idle — 3 frames now (rest 1800ms, A 200ms, B 200ms)

- char-f2 (tear A): rebuild the signal tear BIGGER: 8 slice tears,
  each 4-6 rows tall, shifted 8-10px alternating direction, spread
  from forehead to sleeves; whole-hologram dim via palette-snap;
  all four floaters jump 8-12px; lens glints flare. (Pattern:
  r17/author-char-idle.mjs, amplitudes doubled, two extra slices.)
- char-f3 (tear B): a DIFFERENT tear: different slice rows, opposite
  shift directions, floaters in a THIRD position set, dim slightly
  weaker (one palette step brighter than f2's dim). The idle loop
  rest→A→B must read as a dancing glitch, not a repeated stamp.

## Hover — 4 frames (150ms each, h4 held)

- h1: as pilot h1 but face lift 6px (was 4) and pupils widen by TWO
  rows; floaters vanish.
- h2: book + hands + forearms rise 15px (the pilot's mechanics:
  rigid lift, book baked into the char frame over the torso under
  the hands, book layer swapped to empty).
- h3: rise continues to 30px total; add a 2px outward crest spread
  (the pages tip toward the viewer).
- h4 (held): at 30px: a 2px nod + smile widens 1px each side.

## Deliver

Doctrine output contract in r17/papers/, manifest.json (idle 3
frames, hover 4, book prop layer with rest/hover assets, no effect
layers for this stall), verify.mjs green (rest assert must still be
byte-identical — the pilot's plate + your copied layers), DONE line.
