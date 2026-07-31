# 05 — the responsive layout system

Full spec and derivations: `app/bazaar4/LAYOUT_HANDOFF.md` and the header
comment of `public/bz4-layout-proto.html`. This doc is the story + the
shape.

## Why bazaar4's layout died

Audit findings (all measured, not vibes): three disagreeing container
widths (1440-based su, 1248px vignette, 1248px frame); baked, unequal
gaps everywhere (floor 3 at 1680w: 89/12.7/2.2px — stalls touching);
stairs flush against the stall band; no regime between 700 and 1400px so
floors shrank into a filmstrip; the mobile stairs sprite squashed 3.9x by
a Tailwind preflight img rule fighting a fixed height. Hand-placed
absolute coordinates (the decor-manifest STAGE bakes) made every resize a
lie.

## The spec (user's notation, ratified)

```
_  = gap, dynamic, ALL EQUAL within a floor
x  = undefined leftover        |  = screen edges
sc/ec = 1400px container       a = stall   S/SM = stairs desktop/mobile

>=1400   |xS_sc_a_a_a_ecx|
700..1400 |S_a_a_a_|
<700     |SM_a_|   one floor = ONE SM + TWO stalls, one per story
         |SM_a_|
```

Rules: gaps computed (n+1 equal per floor), stairs may crop offscreen up
to HALF their width, floor height = stairs height (aspect never modified,
composition freezes at the cap), stall count per floor variable, sides
alternate R/L per floor, mobile floors cap at 100vh with ONE SM spanning
both stories and all four gaps equal across stories.

## The model (one knob)

- `--su-cap: 0.9` px per sim unit at the cap; everything derives.
- `--su = min(su-cap, (100vw + shift) * su-cap / VSTAR)`, VSTAR = 1690
  (derived: the 1400 container + one gap + HALF of S must fit; binding
  floor is the 2-stall one).
- Regime A (>=1690): stalls in a real 1400px container, n+1 equal gaps
  inside, S outside with one more equal gap; group centers; container
  edge pins first, S crops on its own side.
- Regime B (700..1690): full bleed flex; S flush to its edge; soft crop
  ramp `--shift = clamp(0, (1200px - 100vw) * 0.132, 66px)` feeds BACK
  into su so reclaimed width grows stalls, not gaps (fixpoint-derived
  constants).
- Mobile (<700): one SM + two stacked stories; shared stall width per
  floor makes all four gaps equal by construction; SM slides out
  progressively (ramp) and on demand, capped at half; the story divider
  sits at the SM art's measured platform line (`--sm-split`) — art wins,
  layout bends.
- Side alternation is DOM order (S/SM last = right); sprites mirror with
  scaleX(-1) so exits always face the stalls.

## The validation harness

The prototype (`public/bz4-layout-proto.html`) draws dashed rulers
between every box: green = all gaps on that floor equal within 1.5px
(mobile pools both stories), red = broken, grey = leftovers, amber =
stairs crop with percentage. A HUD shows regime, su, floor height.
Verified 500-1900px with headless Chrome + CDP geometry reads. The
system was proven in boxes BEFORE any art landed on it — the inverse of
bazaar4, which decorated first and audited never.

## bazaar5 (the port, this session)

`app/bazaar5/`: the proto CSS became `bazaar5.module.css` almost line for
line; floors carry `--sum`/`--n`, stalls `--w`/`--h`/`--ar`, mobile
floors `--armin`. The street level is deliberately NOT on the system: it
wraps in a bazaar4-context host (`s4.scene` class for its variables, with
nested-scroll overrides) because the street was already right and is its
own animal. WF tile backgrounds, riveted beam-h separator bands (soft
focus + shadows), and the 24svh bottom pad ported from bazaar4. Stall
internals (r17 layer stacks, dialogs, sfx) are imported from bazaar4
unchanged; console mounts as the static r20 master. The SM asset gate
closed on bz4-sm-b2 (the drum-base spiral cage): keyed to
`public/images/bazaar4/arch/sm.png`, measured ar 0.464, deck line 0.497,
wired as the two knobs.

## Open problems carried forward

Decor migration to layout-driven positions (anchored items survive,
absolute items need re-anchoring); mobile crop uniformity across floors;
`--su-cap` retune ceiling (~1.15); Windows scrollbar skew on 100vw.
