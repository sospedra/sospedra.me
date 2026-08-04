# r17h order v2 — USES hover — EXACT translation table, zero freedom

READ FIRST: r17/DOCTRINE.md, r17/HOVER-DOCTRINE.md. Work only in
r17/uses/. Rebuild ONLY char-h1..h4.png + verify envelopes. Idle
frames, fx-steam, plate, manifest structure: UNTOUCHED.

This order is a TRANSCRIPTION JOB. Every group, row, offset and fill
below was probed by the supervisor on r17/uses/char-f1.png. Implement
it literally. Do not choose, do not adjust, do not interpret.

## Measured geometry (already probed — do not re-derive)

- char layer bbox: x=717..878, y=271..544, 26,197 opaque px.
- HEAD group = every opaque pixel with 271 ≤ y ≤ 366 (hair + face +
  the neck top; row 366 is the collar line).
- ARMBELT group = every opaque pixel with 405 ≤ y ≤ 470 (the folded
  arms slab across his chest; widest row 423 at w=161).
- Rows 367..404 = shoulders/upper chest: never move; they are the
  overlap bed the groups slide over.
- Rows 471..544 = lower torso/apron behind the counter: never move.

## The translation table — apply per frame, in this exact order

Frame h1 (from char-f1):
  1. HEAD dy = -8. Paste order: iterate y ascending so the moved rows
     paint over what was above them.
  2. Vacated rows 359..366 (the 8 rows the head left): fill every
     previously-opaque pixel with the value from row 366 at the same
     x (duplicate the collar row 8 times).

Frame h2 (from h1):
  1. ARMBELT dy = -10 (arms lift off the chest). The belt's top rows
     paint OVER chest rows 395..404 — same fabric, self-healing.
  2. Vacated rows 461..470: fill each previously-opaque pixel with
     the value from row 471 at the same x (the apron continues).

Frame h3 (from h2):
  1. HEAD dy = +26 (the deep bow; net +18 vs rest). The head's
     bottom rows paint OVER the shoulder rows they enter — iterate y
     DESCENDING for this move so lower rows land first.
  2. Vacated rows at the top (the 26 rows the head left, 263..288):
     set fully TRANSPARENT (the plate is behind — real background).
  3. ARMBELT: unchanged from h2 (stays lifted through the bow).

Frame h4, HELD (from h3):
  1. HEAD dy = -20 (rises back; net -2 vs rest — attentive).
  2. Vacated rows at the bottom of its h3 position: re-fill from the
     current collar row exactly as in h1 rule 2.
  3. ARMBELT dy = +4 (settles; net -6 vs rest — arms held slightly
     high). Vacated top rows of its previous position: they are
     re-covered by the belt's own move; vacated bottom rows: fill
     from row 471 as in h2 rule 2.

No other pixel changes in any frame. No whole-layer moves. No
palette edits. No new pixels that are not copies from the columns
and rows named above.

## Verify

Envelopes: HEAD moves within x=717..878, y=245..430; ARMBELT within
x=717..878, y=385..480. Diffs boxed inside the union of those two
rects per frame, everything outside byte-identical to the previous
frame. Green before DONE uses-hover-v2 VERIFY=PASS.
