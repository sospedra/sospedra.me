# r17h order — TALKS hover rebuild (translation law)

READ FIRST: r17/DOCTRINE.md, then r17/HOVER-DOCTRINE.md, then
r17/author-hover.mjs (papers pilot). Work only in r17/talks/.
Rebuild ONLY char-h1..h4.png and the tape hover assets named in the
manifest. Idle, fx-smpte, plate, manifest structure: UNTOUCHED.

The old hover synthesized her sitting-up pose — REJECTED. New read:
eyes flick to you → she sits up off her palm → the tape rises →
offered with a knowing half-smile.

## Groups to probe first (debug crops mandatory)

- HEAD: her head + hair cluster above the neckline. The supporting
  palm/forearm is NOT part of this group — probe the boundary
  carefully (the palm stays planted through the whole sequence).
- FREEHAND: her non-planted hand cluster on the counter.
- TAPE: the authored tape sprite (already exists as an asset).

## Frames (150ms each, h4 held)

- h1 FLICK: pupils translate to camera; brow rows translate up 2;
  HEAD translates up 3 (a first stir; the 3-row neck seam fills by
  duplicating her existing neck/vest row).
- h2 SIT UP: from h1, HEAD translates up a further 11 (total 14
  above rest). Her cheek leaves the palm — the palm-arm column stays
  exactly where it was, now supporting air. Neck/vest seam: continue
  her own vest rows (interior vacancy fill).
- h3 TAPE UP: the TAPE sprite translates up 26 to the counter edge;
  FREEHAND translates up 8 and right 4 to meet it (trailing boundary
  inside her forearm — self-healing).
- h4 OFFERED: TAPE + FREEHAND translate together down 4, right 6 —
  over the counter edge toward the viewer, label out. Mouth corner
  widens 1px by copying her existing lip pixels; one brow row up 1.
  Held.

## Verify

Envelopes re-declared per group. tape-f1 stays fully transparent so
the rest assert is untouched. Green before DONE talks-hover
VERIFY=PASS.
