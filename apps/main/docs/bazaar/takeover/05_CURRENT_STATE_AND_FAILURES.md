# Current state and failure ledger

Date: 2026-07-28.

This is a factual handoff, not a defense of the current work.

## Live route

The route is:

```text
app/bazaar3/page.tsx
  -> app/bazaar3/bazaar3-view.tsx
```

The live implementation currently has:

- desktop Floor 1: Uses + Papers, stairs right;
- desktop Floor 2: Manual + Console + Talks, stairs left;
- desktop Floor 3: Projects + Games + Travel, stairs left;
- mobile pair 1: Uses above Papers, stairs right;
- mobile pair 2: Manual above Talks, stairs left;
- mobile pair 3: Console above Projects, stairs right;
- mobile pair 4: Games above Travel, stairs left;
- one mobile stair with midpoint deck/fascia/underside;
- Up/Down navigation and no Down on the final floor;
- a portalled dialog at a global high z-index;
- roughly 9 ms character-by-character dialog text;
- two idle and three hover frame slots.

The live family mapping is:

```text
Uses      -> uses
Papers    -> papers
Manual    -> manual-v3
Console   -> console-v2
Talks     -> talks
Projects  -> projects-v2
Games     -> games
Travel    -> travel-v2
```

Functional presence does not make this visual result acceptable.

## What the live desktop floors actually are

All three desktop floor systems render through:

```text
FloorIntegrationLayers
  -> FloorSystemLayers
```

They combine:

- `public/images/bazaar3/assets/environment/{archive,workshop,reclaimed}.png`;
- generic H-beams;
- `props-v3`;
- CSS receivers, contacts, rails, and plates;
- the existing complete stall images.

The environment builder produces repeated dark rectangular bays, rails, small
accent marks, and simple floor bands. Archive, workshop, and reclaimed are
mostly the same shell with accent changes. They are not derived from an
approved floor master.

This creates the exact rejected read:

- detailed stall illustrations over generic flat panels;
- repeated beam cages rather than stalls installed into architecture;
- isolated cyan/amber bars instead of convincing causal light;
- generic contacts and recesses;
- inconsistent stall scale and rendering density;
- three unrelated cards inside one steel frame.

## Major raster inconsistency

The currently mounted families use incompatible rendering systems.

Uses, Papers, Talks, and Games contain very large high-resolution color
populations and almost no exact uniform 3× blocks. Manual, Console, Projects,
and Travel are small limited-palette exact-3× families.

The result cannot look like one world even when the CSS geometry aligns.

Manual-v3 is also a completely opaque 960×1264 RGB composite. Its wall/floor
bay is baked into every frame, so real rear/front/environment interleaving is
impossible. Its transparent cels do not solve the opaque base.

## Prototype status

The older authored integration system is separate from the three live floor
systems.

- The workshop authored plates are marked `prototype`.
- They mount only under `?qa=1`.
- Archive and reclaimed authored packages were never completed.
- The hybrid-floor test is a standalone experiment.
- `LayeredStallSprite` is exported but not mounted by the live route.

All are evidence and tooling, not approved foundations.

## Latest three review PNGs

Files:

```text
masters/unapproved-latest/floor-1-archive-service.png
masters/unapproved-latest/floor-2-workshop-media.png
masters/unapproved-latest/floor-3-leisure-transit.png
```

They are 1536×1024 RGB PNGs. They have no original repo-stored tool prompt,
provenance manifest, semantic review, approval record, crop guide, or runtime
reference.

Read-only measurements from the handoff audit:

| Floor | Approx. unique RGB colors | Uniform 3× blocks |
|---|---:|---:|
| Floor 1 | 177,331 | 2.5935% |
| Floor 2 | 204,245 | 0.7623% |
| Floor 3 | 157,967 | 0.0023% |

They therefore fail the declared flat, limited-palette, authored-grid contract
before subjective review.

Semantic failures include:

- approved stall layouts and silhouettes were reinterpreted;
- Floor 2 Manual is not a safe approved/layerable production basis;
- Floor 3 Games does not center the approved siblings sharing the handheld;
- proportions and floor depth vary;
- full-height crop corridors and posterior modular extraction were not proven;
- the rendering remains richly textured pseudo-pixel illustration.

Treat all three as rejected evidence.

## Prior Floor 3 master evidence

`masters/prior-master-reference/leisure-transit-master-v5-source.png` is useful
only because the user described its rendering direction as comparatively good
or “not that bad.” It is not approved and fails the existing machine audit.

The later authored v6 proves the inverse problem: it can pass the mechanical
palette/grid/rail gate while losing character identity and visual quality.

Machine validity is necessary, never sufficient.

## What the existing checks prove

Useful checks exist for:

- frame dimensions;
- exact 3× block structure in selected families;
- palette membership in selected families;
- zero motion outside declared animation masks;
- fixed root/torso/sign/structure;
- file presence and route string contracts;
- prototype plate registration.

They do not prove:

- an approved floor composition;
- faithful character/stall identity;
- convincing physical integration;
- coherent lighting;
- correct relative scale;
- good rendering;
- human approval.

`pnpm bazaar3:verify` must never be used as shorthand for “Bazaar 3 is good.”

## Root causes

1. The master-first approval gate was skipped for Floors 1 and 2.
2. Generic modular backgrounds were implemented before one complete floor was
   visually approved.
3. Technical compliance was mistaken for art-direction compliance.
4. Repeated rectangles, H-beams, darkness, and CSS receiver shapes were used as
   integration.
5. Two incompatible raster/rendering systems were mixed.
6. The opaque Manual composite prevents genuine interleaving.
7. Unapproved work was promoted into the live route.
8. Browser screenshots were treated as success because interactions worked,
   while the decisive pasted-on visual failure remained.
9. Documentation, validators, and runtime drifted apart.
10. Too much downstream code and animation work was done before static floor
    approval.

## Repository safety

The worktree contains extensive unrelated user work.

At the time of handoff:

- `app/bazaar3/` is untracked;
- `scripts/bazaar3/` is untracked;
- `public/images/bazaar3/` is untracked;
- Bazaar 2 contains modified and untracked approved work;
- `package.json` and many unrelated project areas are dirty.

Never run a destructive reset, checkout, clean, or broad deletion. Never
reconstruct Bazaar 2 from Git history.

