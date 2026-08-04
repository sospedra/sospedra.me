# 08 — animation architecture

How eight AI-generated stalls animate without ever redrawing themselves
wrong.

## The dead ends (worth telling)

1. WHOLE-FRAME EDITS (r16 first attempt): "same image, arm raised" on the
   full stall re-stages the whole composition — measured 17-57% pixel
   drift. Motion right, registration dead.
2. PATCH EDITS (r16 doctrine): crop a window around the motion region,
   upscale to the model's native size, edit, downscale, paste back.
   Registration solved (0.2-0.8% drift) with hard laws (interior windows
   only, zero chroma in-window, never slice a face, identity pins). But
   sprite content hallucinated (a moustache appeared); ruled
   experiment-grade, not production.
3. DETERMINISTIC PIXEL SURGERY: band translations for poses break outline
   continuity on outlined pixel art. Works only for whole-layer bobs and
   palette-snap dimming.

## The shipped architecture (r17 layers)

Every stall decomposes into:
- PLATE: the inpainted background, never changes.
- EFFECT layers: infinite loops (steam, static, arcade, candles
  phase-offset, water) with per-frame durations.
- PROP layers: rest frame + optional hover-step frames.
- CHAR layer: idle cycle (3 frames) + hover greeting (4 steps, held).

PRIME INVARIANT: the rest composite is byte-identical to the approved
static. Asserted by script with a self-healing repair pass (orphan pixels
join the nearest layer). Extraction = predicate masks + attached-darks +
dilation + protected zones; inpainting = strip-tiling anchored to global
x for walls, nearest-side rows for counters.

OCCLUDERS: where a character overlaps furniture, the occluding furniture
pixels become their own thin layer (plate pixels in the region minus
rest-char pixels) so the char can move behind them. Occluders became
permanent named layers (talks counter + bell, uses customer head, manual
sign + bench band). Byte-identity survives by construction.

## Poses: diffusion on the isolated character (r18)

Pose changes are generated on the FLATTENED char layer alone, on chroma,
in edit mode. The recipe that survived ten gates:
- MINIMAL orders (3 sentences); verbosity degrades pose edits.
- Compact invariant list (same clothes/colors/size/position/style).
- Held objects stay in the SAME HAND every frame.
- Background stays bare chroma (the model once grew plants).
- CHAIN each frame from the previous frame's RAW gen — independent gens
  morph garments; chains hold identity.
- Held final frames = "almost nothing changes" chained from the apex.
- Supervisor post: chroma key, satmatch, mechanical counter-clamp at the
  rest bottom row, opaque-count ratio (+-25%) as the invented-content
  alarm.

## The runtime (bazaar4/5)

All frames of every layer mount ONCE as absolutely-stacked <img>s;
animation flips style.opacity on timers. Zero re-fetching (an earlier
src-swapping runtime generated 8000+ network requests and mid-decode
flashes). Hidden breakpoint trees don't animate (offsetParent gate +
breakpoint listener re-arms). Hover = a 150ms 4-step greeting held until
leave; effects with hover variants switch in step. prefers-reduced-motion
renders final poses statically. The papers hologram flicker wraps the
char frames in a group div because animating the imgs would fight the
opacity frame-switching.

## The implant technique (named here for good: region-shift idle)

The idle trick that reads as life without breaking ground contact:
IMPLANT a sub-region shift into a copy of the rest frame. For a head
bob: copy char-f1, shift ONLY the head region (everything above the
neck line) down 1 px, leave the body planted. The 1 px overlap at the
neck swallows the seam; the 1 px void at the hair top reveals plate
(dark wall, invisible). Zero new colors, zero diffusion, feet never
move. The failed alternative is the whole-layer bob: it detaches the
feet and the character floats. Same family as r17's palette-snap
dimming and cyan-tear reveals: deterministic pixel surgery on a copy,
never a regeneration.

## The console rebuild (2026-08-01, the architecture reapplied)

The static r20 console master got its layers back in one session using
this playbook end to end: lens-anchored two-stage extraction (the
scoped goggle-lens hex is the only sage in the stall = the seed; grow
skin/hair/tee within a head-anchored region; dark pixels join only
inside head and shorts boxes and only if not blue-leaning — cool darks
are racks and cables; largest component + lens-bearing components
survive; interior holes fill by outside-flood), nearest-side inpaint
for the plate, byte-identity assert (0 repairs), head-implant idle,
dense-run screen detection for the CRT static roll. Poses took three
failed chained runs before the SHEET DOCTRINE ended it: chains
re-diffuse the sprite every leg (saturation compounds, detail mushes),
so poses are ONE generation — frame 0 attached as the only asset, the
order asks for a four-cell sprite-sheet row whose first cell is an
exact copy of frame 0; all poses share one diffusion pass and one
palette. Slice cells by column gaps, register to the rest baseline,
de-green per frame. The user's law, verbatim: start from the good
one, never send the ones-to-fix back to codex. The shipped hover is
the sheet's peace-sign rise, opaque ratios 1.05 flat across frames.

The console stall shipped STATIC first (the r20 master, no layers) —
the architecture is per-stall opt-in, and layers returned only when
the master was final.
