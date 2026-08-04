# Responsive architecture and physical integration

## Desktop composition

Breakpoint: `min-width: 701px`.

```text
Floor 1:
[ Uses ] [ Papers ] [ breathing/seam space ] [ stairs right ]

Floor 2:
[ stairs left ] [ Manual ] [ Console ] [ Talks ]

Floor 3:
[ stairs left ] [ Projects ] [ Games ] [ Travel ]
```

The layout is not an equal-column grid.

Uses is intentionally much wider. Console is a low rug nest. Projects is an
open trellis. Travel is a deep booth. Distinct footprints are required.

## Mobile composition

Breakpoint: `max-width: 700px`.

Four separate 100svh compositions:

```text
1. Uses
   Papers
   continuous stairs right

2. Manual
   Talks
   continuous stairs left

3. Console
   Projects
   continuous stairs right

4. Games
   Travel
   continuous stairs left
```

Each mobile composition has:

- exactly two vertically stacked stalls;
- one continuous full-height stair column;
- one bottom exit;
- one midpoint exit;
- a real midpoint floor beneath the upper stall.

Do not scale all desktop clutter down until it becomes noise. Mobile should use
fewer independent environmental props while preserving stall identity.

## Responsive implementation principle

A whole-floor master is a visual blueprint, not the runtime bitmap.

The responsive runtime should eventually be reconstructed from:

- tileable ceiling/slab bands;
- tileable rear wall bands;
- tileable wall-to-floor and lobby-floor bands;
- H-beams and joints;
- flexible utility runs with authored ends/junctions;
- exact rear/front connection plates;
- exact contact/caster/receiver plates;
- separately layerable stall structures and characters;
- independent environmental props;
- stair rear/core/front/light packages.

The modules must preserve the approved master's:

- camera;
- scale;
- palette relationships;
- lighting relationships;
- seams;
- depth order;
- tenant consequences.

## Rear bays and lobby

Every floor separates into:

```text
rear:   wall, utilities, stall bays, characters, counters
front:  shared market lobby / walking aisle
edge:   fascia, trench, underside
```

The lobby is shared circulation.

Do not:

- pull entire stalls into it;
- fill it with generic clutter;
- crop props at its lower edge;
- place unrelated shadows on it;
- let each shop own a different floor perspective.

Local light reaches only a short rear strip of the lobby.

## H-beams

H-beams are required where structure logically carries:

- bay divisions;
- stair aperture;
- slab/landing;
- heavy rack;
- deep booth return;
- repair splice.

They are not decorative cages.

Each beam should show:

- a real load or seam;
- shared camera and scale;
- contact with ceiling/wall/floor;
- selected tenant attachment or receiver;
- restrained wear.

Never repeat the same frame around all eight stalls.

## Meaningful integration seams

Every stall should have at least one authored physical crossing.

### Uses

- service/heat pipe;
- lantern wire;
- drain;
- grease/soot/scrape continuing outside.

### Papers

- data/archive conduit;
- paper dust;
- wheeled rack contact;
- cyan source touching world.

### Manual

- tool power;
- rear bracket;
- work lamp;
- front scrap inventory;
- thruster receiver in rear aisle.

### Console

- racks bolted into shared plates;
- service vent;
- cable behind equipment and across rug;
- screen response on wall/trench.

### Talks

- real wall recess;
- pendant power;
- CRT rectangle on world;
- tape/bin/standee contact.

### Projects

- water supply and drain;
- roots into cracks;
- vine around pipe/H-beam;
- damp/moss path.

### Games

- improvised power junction;
- wedges and platform contact;
- arcade receiver;
- cable/drain connection.

### Travel

- booth return attached to shared structure;
- lantern response on beam/wall/floor;
- queue wear;
- luggage scuffs/marks in lobby.

## Floor narratives

### Floor 1 — Archive / Service

Tenants: Uses + Papers.

World:

- cold upper archive infrastructure;
- warmer working height;
- welded metal and concrete;
- continuous cable tray;
- meter/support;
- drain;
- mounting scars.

Transition:

- Uses heat, grease, soot, scrape, and lantern wire;
- Papers dry dust, paper, archive conduit, and cyan hologram;
- dirt and material change gradually rather than at a rectangular sprite edge.

### Floor 2 — Workshop / Media

Tenants: Manual + Console + Talks.

World:

- repaired maintenance and obsolete-media sector;
- heavy beam;
- power/tool rail;
- patch panel;
- cable trench;
- ventilation;
- service drops;
- oil and abrasion.

Transition:

- Manual is organized and task-lit;
- Console is low, dark, chaotic, and screen-lit;
- Talks is a warm deep video recess;
- one power/vent/trench network serves all three without giving them one shape.

### Floor 3 — Leisure / Transit

Tenants: Projects + Games + Travel.

World:

- patched timber;
- scrap metal;
- plywood and tarp;
- shared drainage;
- dampness/water paths;
- old transit markings and junctions.

Transition:

- Projects supplies water, roots, moss, and creatures;
- Games supplies improvised power, cheap wood/plastic, and arcade cyan;
- Travel supplies queue wear, luggage marks, brass/canvas, and amber lanterns.

## Desktop stair contract

The stair is installed architecture, not a transparent cutout.

Required:

- rear ceiling/wall aperture;
- deep dark recess;
- reinforced collar;
- brackets and bolts;
- compact cast shadow;
- correctly proportioned spiral core;
- real landing top;
- worn approach/threshold;
- front lip/rail overlap where appropriate;
- utilities turning around or into the opening;
- clear hit/navigation lane.

Top disappears into the aperture. Bottom meets a real landing.

There is no desktop midpoint floor.

Floor-specific response:

- Floor 1: archive metal with warm/cyan response;
- Floor 2: reinforced conduit and grated workshop landing;
- Floor 3: drain/damp/vine plus restrained blue/amber response.

## Mobile stair contract

Original/latest source pieces:

- column;
- protruding midpoint platform;
- tileable floor/fascia.

Runtime assembly:

```text
mobile-stairs-column
mobile-bottom-landing
mobile-midpoint-platform
mobile-midfloor-top
mobile-midfloor-fascia
mobile-midfloor-underside-shadow
```

Rules:

- column spans the full composition and never restarts;
- bottom exit stays at bottom landing;
- second exit occurs halfway;
- midpoint platform produces a real floor beneath upper stall;
- platform is centered/registered relative to column;
- platform paints above core;
- much of the stair width may remain outside viewport;
- left is normal source orientation;
- right mirrors the entire column/platform/floor assembly;
- hover changes none of it.

Historical transform, scale, and `u` nudges are tuning records only. Inspect and
preserve the current Bazaar 2 baseline rather than replaying them.

## Wayfinding

- Up is on the stairs side.
- Down is on the opposite side.
- Final underground floor has no Down.
- Every sign scrolls to the correct target floor.
- At widths below 1024 px, signs sit inside content edges.
- At widths at/above 1024 px, signs sit in outer gutters beyond max-width.
- Signs remain below the dialog z-index.

## Inter-floor bands

- Darker than stalls.
- Behind stalls and merchandise.
- Quiet repeating architecture.
- Never disappear on hover.
- Never cover a dialog.
- Never sit above the stall-darkening boundary incorrectly.

## Paint order

Recommended conceptual order:

1. far wall/ambient;
2. rear architecture and utilities;
3. stall rear structures;
4. character and internal stall layers;
5. counters/displays;
6. contacts and ground props;
7. selected front architecture/occluders;
8. wayfinding;
9. global portalled dialog.

All decorative layers use `pointer-events: none`.

## Dialog behavior

- Portalled outside clipping contexts.
- Highest global z-index.
- Fast character-by-character rendering.
- Full text immediately under reduced motion.
- Does not move or resize stall hitbox.
- Does not modify architecture or neighbor visibility.
- Works by pointer, keyboard focus, and touch.

