# Chronology and supersessions

This is not the authority order. It explains how the final brief evolved and
which early instructions must not be replayed literally.

## Bazaar 2 inspection and early tuning

The work began by inspecting:

- `/bazaar2`;
- the code rather than only the browser;
- the preserved `gen-places` declarations;
- the current responsive hitbox/stair ordering.

Early incremental requests included:

- install Up/Down ceiling signs;
- keep dialog above signs/floor assets;
- fast typewriter text;
- darken inter-floor assets;
- prevent hover from hiding floor architecture;
- no Down sign on the final floor;
- move individual stalls/buildings by `u` values;
- adjust Console vertically;
- adjust street buildings and a right-side shadow;
- add mobile stair column/platform/floor pieces.

Those edits accumulated into the current Bazaar 2 working tree.

Do not replay the old deltas in Bazaar 3. Preserve the current baseline.

## Responsive stair resolution

The mobile system was resolved as:

- one continuous full-height stair;
- bottom exit;
- midpoint exit;
- real midpoint floor for upper stall;
- platform/floor registered to stairs;
- entire assembly mirrored on right-side layouts;
- hitbox order already solved.

The final grouping became:

```text
desktop:
Uses + Papers / stairs right
Manual + Console + Talks / stairs left
Projects + Games + Travel / stairs left

mobile:
Uses over Papers / right
Manual over Talks / left
Console over Projects / right
Games over Travel / left
```

This supersedes the early one-off “swap Papers for Games” instruction.

## Integration brief

The user rejected stalls reading like separate images and requested:

- shared architecture;
- H-beam bay seams;
- physical contacts;
- seam-crossing utilities;
- environmental props;
- coherent palette and lighting;
- preservation of distinctive structures and signs;
- animation with fixed roots and structure.

The key phrase became:

> Integration, not uniformity.

## Stall identity clarification

The behavior cards and five-frame animation declarations were added.

Important later overrides:

- Manual changed from old four-arm/pedestal concepts to a floating three-eye,
  three-arm robot behind the counter with front junk inventory.
- Console must use the approved Bazaar 2 Ed identity, larger rug, darker bay,
  more surrounding machinery, and taller sign post.
- Talks CRT must show SMPTE color bars.
- Projects must be roofless, plant-heavy, mechanically visible, apron-only,
  90s-anime-informed, and never mascot-like.
- Games remains visibly child-built and centers siblings sharing a handheld.
- Travel must be a four-eyed Hearthian, never frog, with a deep enclosed booth.

## Art bible and palette/light diagnosis

After multiple inconsistent renders, the user required:

- one broad harmonized semantic palette;
- shared semantic colors across stalls and architecture;
- retained tenant color identity;
- one camera;
- one lighting grammar;
- causal source/receiver/world/shadow chains.

The art bible, Gospel, and integration history were written at this stage.

The 64-color Proposal A remains a proposal, not an approved final palette.

## Master-first process

The user then required:

1. generate a whole floor with all stalls, props, lights, stairs, and effects;
2. use clear crop corridors;
3. approve the design;
4. regenerate/derive tileable wall/floor;
5. isolate each stall without environmental wall/floor;
6. isolate environmental props;
7. reconstruct responsively.

This supersedes earlier “never generate all stalls in one pass” planning.

The master is a design blueprint, not the runtime bitmap.

## Repeated failures

Rejected directions included:

- downscaled crop regeneration;
- camera drift;
- wrong proportions;
- clipped props;
- one global palette wash;
- weak/noncausal light;
- random cable pixels;
- dense AI texture;
- generic backgrounds with stall images on top;
- fixed full-floor runtime image;
- missing H-beams;
- repeated H-beam cages;
- opaque Manual;
- technical PASS presented as completion.

Floor 3 v5 was judged comparatively promising in rendering direction but was
never approved.

## Rejected implementation

A full Bazaar 3 route was assembled and mechanically validated. The user
rejected it because it did not improve integration over Bazaar 2.

The decisive failure remained:

> the stalls still looked placed on top of the environment.

That live implementation is now evidence, not a visual foundation.

## Latest rejected review masters

Three new floor PNGs were generated and copied into the repo. They were shown
without first applying the existing grid/palette/semantic master gate and were
rejected.

They remain under:

```text
masters/unapproved-latest/
```

The handoff package was then requested so a different AI could take over.

## Latest supplemental reference

The user supplied:

<https://frontend.horse/articles/creating-3d-illustrations-with-css/>

Its cuboid, `preserve-3d`, hard-face, and three-tone-light ideas may help with
responsive architecture. It does not override the pixel-art camera or master
approval process. See `09_SUPPLEMENTAL_CSS_3D_REFERENCE.md`.

