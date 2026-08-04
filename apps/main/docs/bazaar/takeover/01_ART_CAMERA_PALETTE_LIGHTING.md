# Art, camera, palette, and lighting Gospel

This file is a compact operational companion to the copied full sources:

- `source/canonical/MASTER_PLAN.md`;
- `source/canonical/ART_DIRECTION.md`;
- `source/canonical/INTEGRATION_BIBLE.md`;
- `source/reference-html/bazaar3-art-bible.html`;
- `source/reference-html/gen-places-source.html`.

## Design thesis

A hidden reclaimed night market occupies the decaying service infrastructure of
an older facility.

The visual mix is:

- Japanese back-alley intimacy;
- Blade Runner noir;
- CRT and lo-fi technology;
- improvised Fallout-like repair;
- rusted industrial structure;
- warm decay;
- playful inhabitants treated with serious environmental logic.

It should feel old but active, illicit but inviting, repaired rather than
restored, cluttered but readable, and physically coherent while materially
diverse.

Integration, never uniformity.

## Rendering hierarchy

Build an image in this order:

1. whole-floor silhouette and three camera rails;
2. stall and stair silhouettes;
3. character silhouettes and common scale;
4. individual signs;
5. primary counter, rug, platform, machine, or trellis;
6. two or three major clutter masses per stall;
7. visible practical sources;
8. stall contacts and shared lobby;
9. only then small identity/action detail.

When viewed around 300 px wide, the floor and every character/stall must still
read correctly.

## Pixel rendering

- Author at low resolution.
- Enlarge only with nearest-neighbor.
- Use square, connected pixel clusters.
- Use strong near-black outer and structural outlines.
- Use large flat bounded color regions.
- Normally use three tones per material.
- Use broad, connected shadow shapes.
- Reserve tiny hard highlights for focal edges.
- Dither only as a deliberate local transition.
- Keep surfaces quiet.
- Spend detail on face, hands, held tool/object, sign, and behavior.

Approximate material distribution:

```text
base/body:       60–75%
shadow:          20–30%
highlight/wear:   5–10%
```

Outline priority:

```text
whole stall
  > character
    > structure/furniture
      > interactive object
        > material split
          > accent
```

Simplify surfaces, never approved layout, silhouette, anatomy, or identity.

## Absolute negative rendering rules

Reject:

- painterly or airbrushed modeling;
- high-resolution illustration with a pixel filter;
- soft gradients or bloom;
- antialiasing and partial-alpha fringes;
- random fine scratches, rivets, tubes, and wires;
- multiple incompatible pixel densities;
- tiny one-pixel texture;
- noisy foliage fronds;
- excessive local entropy or confetti pixels;
- malformed hands, limbs, machinery, tools, or signs;
- detail that disappears at actual website size.

## Camera law

Uses' counter defines the camera.

The world uses a shallow frontal-oblique/axonometric RPG projection:

- parallel projection;
- no vanishing point;
- no lens distortion;
- no bay rotation;
- no converging vertical or horizontal lines;
- character centerlines and structural uprights remain vertical;
- counter fronts, shelves, beams, and floor lines remain horizontal;
- top surfaces are shallow compressed bands;
- top-plane height is normally about 0.2 of its width and never above 0.25;
- front faces dominate.

Never use:

- 30°/45° isometric perspective;
- perspective-corrected trapezoids;
- deep table tops;
- deep ellipses;
- side-wall wedges;
- a room that converges into the distance.

## Full-floor camera rails

Every master must establish:

1. the ceiling/slab line;
2. the wall-to-floor contact line;
3. the front lobby/fascia line.

These rails remain parallel and define the angle for every stall, stair,
counter, prop, light receiver, cast shadow, floor joint, and crop corridor.

## Depth sequence

```text
back wall
rear infrastructure / recess
rear stall structure
character plane
counter / display plane
ground-contact objects
foreground lobby / spill
front fascia / underside
```

The lower/front part is open circulation, not an extension of every stall.

## Material shorthand

### Metal

- near-black local shadow;
- desaturated body;
- tiny hard selected edge;
- rust only where water, touch, friction, or repair causes it.

### Wood

- warped and chipped broad masses;
- broad grain only;
- dark board gaps;
- no dense line noise.

### Concrete

- large quiet planes;
- sparse cracks, damp paths, patches, and mounting scars;
- no uniform speckle.

### Fabric, tarp, and canvas

- broad flat folds;
- visible tension;
- faded pigment;
- torn edge only where meaningful.

### Plastic

- harder selected highlight;
- sticker ghosts and limited scratches;
- Games may retain brighter cheap-plastic colors.

### Paper

- cream/yellowed grouped masses;
- dark grouped page edges;
- no broad pure-white fields.

### Plants

- deep yellow-biased green;
- chunky overlapping leaf masses;
- no pure chroma green;
- no fine fronds.

### Screens, holograms, and emissions

- tiny bright source core;
- one direct hard receiver band;
- at most one weaker spill band;
- no blurred glow.

## Palette Proposal A

This exact library is a proposal carried by `MASTER_PLAN.md`, not a
user-approved immutable palette. It is valuable as a semantic starting point.
Calibrate or revise it against Uses before enforcement.

### N — ink / steel

```text
#020307 #080c12 #111923 #1c2731
#2b3741 #414c55 #606970 #898e8d
```

### C — cream / paper

```text
#4b4236 #786852 #a38b69 #cfad7e #edd09c
```

### W — wood / leather

```text
#1d100a #321a0f #4b2816 #6b391c #925022 #bd7133
```

### R — red lacquer

```text
#361015 #5c171c #882225 #b83932 #dd6048
```

### P — violet / purple

```text
#171221 #2a1e38 #443153 #674870 #966d94
```

### B — blue / cyan

```text
#071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1
```

### T — teal

```text
#071c1d #0e3534 #165652 #267c73 #56b4a4
```

### G — foliage

```text
#10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247
```

### K — dusty rose

```text
#2e1723 #50283b #784159 #a95f77 #d68b9a
```

### A — amber emission

```text
#4a280d #7b4514 #ad6a1e #df9e32 #ffd26b
```

### S — skin

```text
#2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82
```

### E — source cores only

```text
#ffe3a1 #8be9e7
```

## Palette allocation

| Stall/world | Dominant families | Identity |
|---|---|---|
| Uses | W + R, P/K, tiny B/T | red lacquer, timber, purple/rose canopy |
| Papers | T + C + B, restrained W | teal kiosk, paper cream, cyan hologram |
| Manual | N + W + C + A | steel, brass, organized amber workshop |
| Console | N + W + R + T/B | servers, cardboard, Ed hair/rug, screens |
| Talks | W + C + S + B/T | mahogany, cream, warm face, CRT |
| Projects | G + W + N + P/K + A | foliage, soil, robot, creatures, bulbs |
| Games | W + B + R + S + A | handmade timber, cheap blue plastic |
| Travel | W/C + N/B + A + tiny P | canvas, wood, brass, Hearthian, lanterns |
| Architecture | mostly N, little W | tenant hue only at a real crossing |

Harmonization means the same semantic purple, cream, steel, or amber is the
same swatch. It does not mean every stall becomes brown, grey, or teal.

## Shared value ladder

Approximate perceptual roles:

| Role | Approximate L* | Use |
|---|---:|---|
| outline / AO | 2–5 | deepest contour and overlap |
| deep shadow | 8–12 | cavity and underside |
| ambient shadow | 17–22 | far/right plane |
| material body | 29–36 | front face |
| top/key plane | 43–52 | shallow upward band |
| selected highlight | 58–68 | face, tool, focal edge |
| emissive core | 82–92 | source pixels only |

## Lighting grammar

The shared ambient is cool, low-chroma, and dim.

- Background architecture remains about one material step below stalls.
- Right/far faces are one step darker.
- Undersides are two steps darker.
- Front faces use material body.
- Shallow top planes are one step brighter.
- Lobby lighting remains restrained and local.

The exact common cast direction still requires human calibration. The written
proposal is upper/front-left ambient with compact casts trending down-right.

Every source must produce this chain:

```text
visible source
  -> stall/character receiver
    -> adjacent world receiver
      -> compact contact/cast response
```

No unexplained source, receiver, rim, or pool is allowed.

Local light rules:

- maximum three hard bands: core, direct, weaker spill;
- source core normally under 1% of stall pixels;
- colored receivers normally under 8%;
- architecture response uses the same semantic hue;
- signs, counters, bodies, racks, and foliage fragment the pool;
- different materials receive different palette steps;
- hover changes only the declared source and receiver masks.

## Fixture map

- Uses: two lanterns and one hanging bulb.
- Papers: cyan hologram plus weak warm shelf strip.
- Manual: upper amber work lamp.
- Console: visor/laptop/rack screens plus one weak amber practical; overall bay
  remains darker.
- Talks: warm pendant plus rectangular CRT source.
- Projects: warm string bulbs, violet seed lamp, tiny dusty-rose creature glow.
- Games: arcade/handheld cyan plus small warm bulbs.
- Travel: bright amber lanterns plus a restrained instrument source.

Protect the tiny source masks before any palette reduction.

