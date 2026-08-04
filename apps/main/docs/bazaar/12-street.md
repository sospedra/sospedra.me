# 12 — the whole street thing

The street level is the front door: the only floor that isn't market
architecture, and the one place the site's fiction touches "outside".
It was restyled asset-by-asset in r18 and has survived two view rebuilds
because its composition system is self-contained.

## The kit

bg skyline (repeat-x), bg-tower (the arasaka silhouette), building-a,
building-cd (door + neon host), building-pad x2 (random filler blocks),
alley-signs 1/2 (animated pair), bus + bus-on, door + door-open-1/2,
neon + neon-off, floor strip 1920w. Plus CSS-only layers: alley shade,
alley glow, skyline haze, pavement recession gradient, parallax
foreground silhouettes, the sprite car driving through.

## The restyle war stories

- ZONE-CONTRACT ORDERS: per-element pixel boxes (±6) transformed into
  staged canvas coordinates; the layout is dictated by regions, not
  vibes. Buildings A and CD kept confusing codex with "very weird
  axonometric layout" until orders described one-side-reveal buildings
  with pixel-buffered zone descriptions.
- FIDELITY RULINGS: the first restyle round lost the bus's rusty
  abandoned elements and CD's magenta side-wall neon reflection; the
  second lost the chunky limited colors. Every regen risks losing an
  approved property — orders must NAME the properties to keep
  ("magenta side-wall glow mandatory", "rust as flat two-tone patches").
- THE ARASAKA TOWER: pinned by a Pinterest reference; the sign must read
  "arasaka"; the tower was cut in half vertically twice before a
  full-layout order landed it. Placement: BEHIND the skyline (painted
  before the bg in DOM), tallest peak, at 63vw right of the door.
- DOORS OPEN INWARD: door-open frames redrawn to swing inside with a
  "subtle warm light from within" law — single-delta chained edits from
  the approved base.
- ALLEY SIGNS: the restyle attempts lost; originals kept. Knowing when
  to stop regenerating is a ruling too.
- THE TILEABLE FLOOR: gen edges never matched and floor lines weren't
  parallel. Fix: HORIZONTAL RAIL LAW (level rows edge to edge, sag named
  as a rejection) + a WIDER canvas ask (1500 -> the 1536 exact size) +
  a continuation gen with a 500px FROZEN OVERLAP, stitched at the
  minimum-difference overlap column (~2 diff/px). One seamless 1920
  strip, repeat-x forever.

## The composition system (why it's "its own animal")

The street predates the su system and lives in svh units with its own
variable set: --street-margin centers the A+CD block from real measured
building widths, --street-shift slides the whole block, --alley-gap is
constant, pads hang off computed building edges, and every overlay
(neon, door) positions in PERCENT of its host building so it tracks any
move. The door and neon are baked INTO building-cd's geometry; overlays
sit on measured fractions (neon plate x118-289 y353-423 of 1113x776).

The bazaar5 lesson made it doctrine: porting the street onto the market
layout system broke it instantly ("completely fucked up, it's its own
animal"). The fix was a context wrapper carrying bazaar4's variables
with the scroll shell disabled. The street is a sealed component with
its own physics; the market system stops at its border.

## The living bits

Neon blink with two stutter clusters per 8s (the rhythm ruling: blink
more often, not faster); bus flips to bus-on on hover, exits to the
homepage; the door click scrolls you underground; alley signs alternate;
the car drives by under stretch/squash wrappers; skyline haze breathes
pink over the roofline. The street sells motion density that the market
floors deliberately don't have — arrival should feel busier than
browsing.
