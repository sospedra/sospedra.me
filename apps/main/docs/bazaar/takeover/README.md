# Bazaar 3 takeover package

Read this file before opening or changing Bazaar 3.

## Status on 2026-07-28

Bazaar 3 is **not visually approved**.

The current `/bazaar3` route, its three desktop floor systems, the workshop
prototype, the hybrid-floor experiments, and the three newest floor PNGs have
all failed the decisive human test: the stalls still read as illustrations
placed over an environment instead of shops physically installed in one
market.

Passing scripts, TypeScript, browser checks, palette checks, or animation
registration checks must never be represented as art approval.

The three PNGs under `masters/unapproved-latest/` are rejection evidence, not
production masters. They were generated at 1536×1024, are richly textured
pseudo-pixel illustrations, reinterpret approved designs, and do not meet the
declared low-resolution/palette contract.

No complete floor master is currently approved.

## Authority order

When sources conflict, use this order:

1. The user's latest explicit instruction.
2. `00_USER_DECISION_LEDGER.md` in this directory.
3. `source/canonical/MASTER_PLAN.md`, except where the dated handoff documents
   record a later correction.
4. The current dirty Bazaar 2 working tree, not Git `HEAD`.
5. `source/canonical/ART_DIRECTION.md`.
6. `source/reference-html/gen-places-source.html`.
7. `source/canonical/INTEGRATION_BIBLE.md`, excluding its explicitly demoted
   fixed-workshop/prototype sections.
8. Uses as the primary camera/rendering Gospel.
9. Games as the secondary clean-rendering and handmade-construction Gospel.

Runtime presence is not approval. A generated image is not approved until the
user approves that exact image.

## Absolute first instruction for the next AI

Do not edit the runtime yet.

Begin with one complete desktop-floor design master, preferably Floor 1:
Uses + Papers + right-side stairs. Build it from the written brief rather than
from the rejected live composite. Surface the actual PNG immediately as
**UNVERIFIED**, run the camera/style/semantic gate, and stop for user approval.

Only after the whole floor is approved may it be reconstructed as responsive
modules. Never ship the fixed master bitmap as the responsive floor.

## Frozen scope

- Do not touch street level.
- Do not replay historical street or stall `u` nudges.
- Do not add audio.
- Do not reset, clean, checkout, or reconstruct the dirty worktree.
- Preserve Bazaar 2 interaction, hitbox ordering, stair lane, destinations,
  dialogs, keyboard/pointer/touch access, snapping, and wayfinding behavior.

## Directory map

- `00_USER_DECISION_LEDGER.md` — latest requirements, supersessions, approvals,
  and rejections.
- `01_ART_CAMERA_PALETTE_LIGHTING.md` — consolidated visual Gospel.
- `02_STALLS_AND_ANIMATION.md` — all eight locked identities and five-frame
  behavior.
- `03_RESPONSIVE_ARCHITECTURE_AND_INTEGRATION.md` — desktop/mobile composition,
  stairs, H-beams, lobby, z-order, and seam rules.
- `04_MASTER_FIRST_WORKFLOW.md` — required master → approval → modular extraction
  process and verification gates.
- `05_CURRENT_STATE_AND_FAILURES.md` — honest live implementation audit.
- `06_FILE_MAP.md` — authoritative, useful, prototype, and rejected local paths.
- `07_LATEST_MASTER_PROMPTS.md` — recovered prompts used for the three latest
  unapproved review images.
- `08_NEXT_AI_CHECKLIST.md` — minimal safe restart checklist.
- `09_SUPPLEMENTAL_CSS_3D_REFERENCE.md` — user-supplied CSS 3D technique,
  bounded so it cannot override the pixel-art/camera Gospel.
- `10_CHRONOLOGY_AND_SUPERSESSIONS.md` — how the brief evolved and which early
  nudges/prompts must not be replayed.
- `source/canonical/` — verbatim copies of the main Markdown plan, Gospel, and
  integration history.
- `source/reference-html/` — verbatim readable art bible and preserved
  `gen-places` declarations.
- `source/prompts/` — existing per-stall and historical master prompts.
- `source/validation/` — schemas and visual rubric/configuration.
- `source/runtime-snapshot/` — rejected current Bazaar 3 runtime snapshot for
  diagnosis, not a design foundation.
- `visual-references/` — Bazaar 2 Uses/Games primary Gospel, approved-directional
  Console/Projects/Travel sources, Hearthian and Projects-robot references,
  camera guides, and current stall stills, with caveats in `06_FILE_MAP.md`.
- `masters/prior-master-reference/` — the earlier Floor 3 v5 direction the user
  considered comparatively good, but did not approve.
- `masters/unapproved-latest/` — the three rejected/unverified latest PNGs.

## The short version

The required outcome is not “eight matching stalls.” It is eight distinct
characters and shop structures obeying one physical world:

- the same shallow frontal-oblique camera;
- credible shared scale;
- one harmonized but broad semantic palette;
- visible source → stall receiver → world receiver → compact shadow;
- purposeful pipes, cables, roots, drains, anchors, wear, and H-beams crossing
  the stall/environment seam;
- rear stalls plus an open foreground lobby;
- responsive modular reconstruction after master approval;
- no redesign of the approved characters or stalls.

Integration means common physics, not uniformity.
