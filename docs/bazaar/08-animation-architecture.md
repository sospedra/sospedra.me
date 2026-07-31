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

The console stall ships STATIC by design (the r20 master, no layers) —
a reminder that the architecture is per-stall opt-in, not a religion.
