# 10 — integrating stalls with the backgrounds

Generating a good stall is half the job. Making eight independently
generated sprites sit in ONE architecture without reading as stickers is
the other half, and it consumed as many rounds as the art itself.

## The extraction problem

Stalls are born inside full-scene masters or on chroma sheets. Getting
them OUT clean took an evolution:

- Round 8: "redo as isolated asset on flat chroma" (green for warm art,
  magenta for teal art) + corner-sampled keying, island removal, despill.
  Worked, but every reattempt drifted identity.
- Round 9 verdict, two paths tested on Uses: (1) deterministic mask-cut
  (byte-true pixels, needs per-bay rects and a never-background rule for
  near-black outlines — flood fills tunnel through diffusion edge noise);
  (2) verbose redo, which only works with a full numbered structural
  inventory transcribed from the master. Codex needs inventory-grade
  verbosity or it invents.
- The official keyer: codex's remove_chroma_key.py with soft matte but NO
  --despill (its color metric executes purples: w98's violets went grey,
  games went half-transparent). Then a geometric partial resolver:
  edge partials to 0, interior partials to 255. Binary alpha is what the
  verifier demands.
- CHROMA FRINGE LAW: diffusion blends art into the key color, so a 1-2px
  tinted rim always survives distance thresholds. Edge-contract the
  alpha, despill at radius, scrub key-leaning edge pixels, audit, and
  verify by compositing on a HOSTILE color, never on white.

## The scale contract (why stalls match each other)

Every stall carries SIM_DIMS: art size -> display size (dispW/dispH).
Sim units (su) are the shared currency; the world-scale gospel (human
205px world unit, ratified stall boxes, figure heights per character) is
the contract sprites must fit. The lesson that cost the most: canvas
pixels are NOT comparable across gens — bake scales ranged 0.49-0.59, so
all cross-stall reasoning happens in display px. Character heights are
the calibration instrument: the approved seated Ed displays at 170 px,
the same as a standing games kid; the w98 robot at 294 is the tallest.
Editor sessions then applied per-stall tune factors (console 0.86,
travel 1.05, manual 1.019) — the human eye correcting the last 5%.

## Sitting ON the architecture

- WALKWAY STRIP: stalls plant their feet on the WF tile's floor band.
  In bazaar4 the stall boxes lift 44 su and a walkway strip paints OVER
  their feet zone (z -4 under the stage) so sprites read as standing on
  the walkway, not floating in front of it.
- CONTACT SHADOWS: a radial ellipse under every stall (CSS, not baked).
  Grounding is projected, so it survives repositioning.
- BEAM Z-ORDER LAW (since r8): beams OCCLUDE stall edges. The vertical
  beams flank stall bands and paint above them; the separator bands are
  the max layer (z 9) with soft-focus blur — nearer than the floors.
- THE FLOOR STAGE: one absolute stacking context per floor. Before it,
  z-indexes silently failed across sibling bands (each band was its own
  stacking context); after it, every z works globally and negatives go
  behind stalls. Z-values normalized to a small named range instead of
  accumulated 32s and -21s.
- DIMMING: an IntersectionObserver keeps the most-visible floor bright
  and dims the rest — depth of field by attention.

## Backgrounds behind, occluders in front

The r17 layer architecture (doc 08) meets the background here: where a
character overlaps furniture that belongs to the PLATE (talks counter,
uses customer head, manual bench), those plate pixels become permanent
occluder layers so the char animates behind them while the composite
stays byte-identical at rest. Integration is a z-sandwich: WF wall,
stall plate, character, occluders, props, beams.

## The sim harness

Every architecture round rebuilt a floors SIMULATION (build-sim.mjs):
trim the assets, display height-true (never width-fit — width-fitting
makes midgets), compute the layout from dims.json, and screenshot. The
sim answered "do these eight strangers look like one market?" before
anything shipped. The same instinct became the bazaar5 layout proto:
boxes first, art second.
