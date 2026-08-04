# Bazaar 3 local file map

All paths outside this takeover directory are relative to repository root unless
absolute.

## Canonical task documents

Authoritative with the supersessions recorded in this handoff:

```text
app/bazaar3/MASTER_PLAN.md
app/bazaar3/ART_DIRECTION.md
app/bazaar3/INTEGRATION_BIBLE.md
app/bazaar3/references/gen-places-source.html
public/bazaar3-art-bible.html
```

Verbatim copies are under:

```text
BAZAAR3_TAKEOVER/source/canonical/
BAZAAR3_TAKEOVER/source/reference-html/
```

Important caveats:

- `MASTER_PLAN.md` is the strongest prior consolidation, but some runtime status
  is stale.
- `ART_DIRECTION.md` is the clearest normative Gospel for identity, behavior,
  animation, stairs, and responsive composition.
- `INTEGRATION_BIBLE.md` contains exhaustive history; its fixed workshop/prototype
  sections are demoted.
- the readable HTML bible predates some later implementation changes;
- the latest master-first floor-generation decision supersedes older
  “never generate all stalls in one pass” text.

## Current Bazaar 2 authority

Use the dirty working tree, not Git history:

```text
app/bazaar2/
public/images/bazaar2/
```

Primary visual assets:

```text
public/images/bazaar2/assets/stall-uses-baked.png
public/images/bazaar2/assets/stall-games-baked.png
public/images/bazaar2/assets/asset-metadata.json
```

Copies are under:

```text
visual-references/primary-gospel/
```

Current Bazaar 2 route/CSS and all uncommitted assets contain approved work.
Do not reset or reconstruct them.

Earlier Projects brief:

```text
app/bazaar2/projects-stall-v2-prompt.md
```

## Wayfinding and stair sources

Processed Bazaar 2 wayfinding:

```text
public/images/bazaar2/assets/wayfinding/sign-up.png
public/images/bazaar2/assets/wayfinding/sign-down.png
```

Mobile stair family:

```text
public/images/bazaar2/assets/stairs-mobile-column.png
public/images/bazaar2/assets/stairs-mobile-platform.png
public/images/bazaar2/assets/stairs-mobile-divider.png
public/images/bazaar2/assets/stairs-mobile.png
```

Desktop stair candidates/families:

```text
public/images/bazaar2/assets/stairs-o-desktop.png
public/images/bazaar2/assets/stairs-i-desktop.png
public/images/bazaar2/assets/stairs-h-desktop.png
public/images/bazaar2/assets/stairs-1.png
public/images/bazaar2/assets/stairs-2.png
public/images/bazaar2/assets/stairs-3.png
```

Inspect the current Bazaar 2 runtime mapping before choosing the canonical
desktop source.

Original externally generated source files mentioned by the user:

```text
/Users/sospedra/.codex/generated_images/019f9eac-5ef0-79e3-bdd4-099dbb605fe1/call_HS6heSr1J2c9kG9BK5mzWrRR.png
/Users/sospedra/.codex/generated_images/019f9eac-5ef0-79e3-bdd4-099dbb605fe1/call_Y2PGB8guTehW0FR1ynxbhpdU.png
/Users/sospedra/.codex/generated_images/019f9ffd-cfac-7501-b988-9353ea3bc3f6/call_mJ5j3i9BagHzEzOHZ0zSC2xH.png
/Users/sospedra/.codex/generated_images/019f9ffd-cfac-7501-b988-9353ea3bc3f6/call_4tfhbxBXbBups7oEKLPs0IHm.png
/Users/sospedra/.codex/generated_images/019f9ea1-9432-74b2-922f-f8cbd28ec910/call_dLopeZ6QrWuDf47zZt40nqfy.png
```

Repo copies/current runtime are preferred over these external sources.

## Current Bazaar 3 route

```text
app/bazaar3/page.tsx
app/bazaar3/bazaar3-view.tsx
app/bazaar3/bazaar3.module.css
app/bazaar3/prefetch.ts
```

These files are live but the floor visuals are rejected.

## Current rejected desktop floor system

```text
app/bazaar3/floor-system-manifest.ts
app/bazaar3/floor-system.module.css
app/bazaar3/components/FloorSystemLayers.tsx
app/bazaar3/components/FloorIntegrationLayers.tsx
public/images/bazaar3/assets/environment/
public/images/bazaar3/assets/props-v3/
public/images/bazaar3/assets/architecture/
scripts/bazaar3/build-floor-environments.mjs
scripts/bazaar3/build-desktop-floor-previews.mjs
```

This is negative evidence. Do not use its generic panels as the next design
foundation.

## Authored integration prototype

```text
app/bazaar3/integration-manifest.ts
app/bazaar3/integration.module.css
app/bazaar3/components/StallIntegrationLayers.tsx
public/images/bazaar3/assets/integration/
scripts/bazaar3/build-workshop-*.mjs
scripts/bazaar3/audit-workshop-registration.mjs
scripts/bazaar3/verify-workshop-v2.mjs
scripts/bazaar3/reports/integration/
```

Only the workshop package exists. It is prototype-gated and rejected.

## Dormant layered renderer

```text
app/bazaar3/components/LayeredStallSprite.tsx
app/bazaar3/components/LayeredStallSprite.module.css
```

Exported but not mounted by the live route.

## Current production frame families

```text
public/images/bazaar3/assets/stalls/uses/frames/
public/images/bazaar3/assets/stalls/papers/frames/
public/images/bazaar3/assets/stalls/manual-v3/frames/
public/images/bazaar3/assets/stalls/console-v2/frames/
public/images/bazaar3/assets/stalls/talks/frames/
public/images/bazaar3/assets/stalls/projects-v2/frames/
public/images/bazaar3/assets/stalls/games/frames/
public/images/bazaar3/assets/stalls/travel-v2/frames/
```

Mechanical verification does not imply visual approval. Manual-v3 is opaque and
not an approved final design.

Current idle stills are copied under:

```text
BAZAAR3_TAKEOVER/visual-references/current-stalls/
```

Use them to understand current identity, not as proof that their palette,
camera, opacity, or floor integration is correct.

## Recorded positive identity sources

```text
public/images/bazaar3/sources/approved/console-c4-ed-i1-raw.png
public/images/bazaar3/sources/approved/projects-c3-i1-raw.png
public/images/bazaar3/sources/approved/travel-c7-i1-raw.png
```

These are directional identity/composition references. They are not approved
full floor masters.

Copies are under:

```text
visual-references/approved-directional/
```

Exploratory source families:

```text
public/images/bazaar3/sources/
tmp/bazaar3/gen-places-round2/
tmp/bazaar3/design-review/
tmp/bazaar3/from-scratch-round1/
```

Useful positive guide images copied into this package:

```text
visual-references/gospel/uses-countertop-gospel.png
visual-references/gospel/axonometric-gospel-guide.png
visual-references/gospel/uses-games-projects-console-travel-review-v3.png
```

Other useful local review references:

```text
tmp/bazaar3/design-review/hearthian-refs/
tmp/bazaar3/design-review/projects-anime-refs/
tmp/bazaar3/design-review/travel-style-gospel-contact.png
```

Copies are under:

```text
visual-references/hearthian/
visual-references/projects-robot/
visual-references/gospel/travel-style-gospel-contact.png
```

## Prompt library

Current per-stall/historical prompts:

```text
app/bazaar3/prompts/uses.md
app/bazaar3/prompts/papers.md
app/bazaar3/prompts/manual.md
app/bazaar3/prompts/manual-integrated-bay-camera-locked.md
app/bazaar3/prompts/console.md
app/bazaar3/prompts/talks.md
app/bazaar3/prompts/projects.md
app/bazaar3/prompts/games.md
app/bazaar3/prompts/travel.md
app/bazaar3/prompts/integration-workshop-desktop.md
app/bazaar3/prompts/leisure-transit-master-v4.md
app/bazaar3/prompts/leisure-transit-master-v5-correction.md
app/bazaar3/prompts/leisure-transit-master-v6-correction.md
```

Verbatim copies are under `source/prompts/`.

Explicitly obsolete:

```text
app/bazaar3/prompts/archive/manual-pedestal-v1.md
```

It is intentionally not copied into the takeover prompt folder.

The prompt that produced the three latest review PNGs was not stored by the
original generation tools. A semantically recovered record is in
`07_LATEST_MASTER_PROMPTS.md`.

## Latest three rejected review images

```text
public/images/bazaar3/masters-review/floor-1-archive-service.png
public/images/bazaar3/masters-review/floor-2-workshop-media.png
public/images/bazaar3/masters-review/floor-3-leisure-transit.png
```

Copies:

```text
BAZAAR3_TAKEOVER/masters/unapproved-latest/
```

They are not referenced by runtime or scripts and are not approved.

## Prior master experiments

```text
public/images/bazaar3/master-tests/
scripts/bazaar3/reports/master-candidates/
app/bazaar3/prompts/leisure-transit-master-v4.md
app/bazaar3/prompts/leisure-transit-master-v5-correction.md
app/bazaar3/prompts/leisure-transit-master-v6-correction.md
```

All are formally rejected. v5 remains useful only as comparative rendering
direction.

Copied v5 references:

```text
masters/prior-master-reference/leisure-transit-master-v5-source.png
masters/prior-master-reference/leisure-transit-master-v5-canonical.png
```

## Strong reusable validation tools

Master source:

```text
scripts/bazaar3/verify-master-candidate.mjs
scripts/bazaar3/master-candidate.config.json
scripts/bazaar3/master-visual-rubric.json
scripts/bazaar3/master-candidate-self-test.mjs
```

Sprites/layers:

```text
scripts/bazaar3/verify-assets.mjs
scripts/bazaar3/manifest.schema.json
scripts/bazaar3/manifest.console.json
scripts/bazaar3/manifest.projects.json
scripts/bazaar3/manifest.travel.json
scripts/bazaar3/build-v2-frames.mjs
scripts/bazaar3/verify-v2-frames.mjs
scripts/bazaar3/verify-gospel-frames.mjs
scripts/bazaar3/build-layers.mjs
scripts/bazaar3/LAYER_BUILDER.md
scripts/bazaar3/process-keyed-sprite.mjs
scripts/bazaar3/prepare-isolated-cel.mjs
scripts/bazaar3/lock-cel-motion.mjs
scripts/bazaar3/remap-to-master-palette.mjs
```

Manual camera/five-frame:

```text
scripts/bazaar3/manual-camera/README.md
scripts/bazaar3/manual-camera/verify-camera.mjs
scripts/bazaar3/manual-camera/verify-five-frame.mjs
scripts/bazaar3/manual-camera/five-frame-manifest.schema.json
```

Schemas/config copies are under `source/validation/`.

## Useful reports

Frame review:

```text
scripts/bazaar3/reports/v2/contact-sheet.png
scripts/bazaar3/reports/gospel-contact-sheet.png
scripts/bazaar3/reports/console-contact-sheet.png
scripts/bazaar3/manual-camera/reports/manual-production-family/contact-sheet.png
scripts/bazaar3/reports/gospel-frames.md
scripts/bazaar3/reports/v2/verification.md
```

Rejected live/floor evidence:

```text
scripts/bazaar3/reports/final-live/
scripts/bazaar3/reports/floor-system-live/
scripts/bazaar3/reports/floor-system-live-v2/
scripts/bazaar3/reports/floor-environments/
```

Do not cite these as approval.

## Standalone rejected prototypes

```text
public/bazaar3-hybrid-floor-test.html
public/images/bazaar3/hybrid-floor-test/
scripts/bazaar3/build-hybrid-floor-test.mjs
public/bazaar3-projects-integration-test.html
public/bazaar3-integration-test/
```

## Large historical dumps

```text
tmp/imagegen/bazaar-v3-full/
tmp/bazaar3/from-scratch-round1/
tmp/bazaar3/design-review/
tmp/bazaar3/v2-frame-build/
tmp/bazaar3/qa-live/
```

Useful as provenance/negative evidence, not active production inputs.

## Package commands

`package.json` currently contains:

```text
bazaar3:assets
bazaar3:preview
bazaar3:verify
```

These commands validate parts of the current rejected implementation. They do
not include full semantic master approval.

## Repository safety warning

Bazaar 3 directories are currently untracked and Bazaar 2 is extensively dirty.

Never run:

- `git reset --hard`;
- `git clean`;
- broad checkout/restore;
- destructive recursive deletion;
- reconstruction from Git `HEAD`.
