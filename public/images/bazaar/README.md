# sospedra.me bazaar sprite pack

This pack contains the canonical v4 production output from the consolidated
Bazaar sprite brief. Unchanged v3 assets remain part of the pack.

- `assets/`: individually named production PNGs.
- `manifest.json`: the canonical list of 156 production assets, including exact grid
  size, exported pixel size, alpha, anchor, and horizontal tileability.
- `v4-asset-metadata.json`: street hitboxes, door slots, varied stall canvases,
  opening rectangles, counter heights, keeper actions, and market dimensions.

All production PNGs are exported at 8 output pixels per virtual pixel. Transparent assets use PNG alpha. Horizontal tiles have identical first and last pixel columns. Animation frames share their declared canvas size and anchor.

## Generation

Mode: approved v3 pixel recomposition for strict design-language continuity,
plus bounded OpenAI image edits, chroma-key cleanup, and exact-dimension export.

Every generation request used the same consolidated STYLE, PALETTE, TECHNICAL
RULES, and SCALE prefix from the v3 brief. Asset prompts then added the exact
subject, canvas, anchor, transparency, tile, and animation-frame requirements.
Approved Batch 1 art and the home city artwork were used as visual anchors;
variant frames additionally referenced their frame-1 asset for consistency.

## v4 QA

All six v4 steps are complete and integrated in-page:

- corrected 32x67u door ruler with left hinges and right-side opening;
- merged desktop/mobile street scenes with exact door slots and bus hitboxes;
- mobile-width tiled backgrounds;
- eight differently sized stall structures with baked lowercase titles;
- bounded keeper actions plus the separate manual customer;
- three market walls and a deeper 512x48u market floor.

Desktop and mobile layouts were visually checked in the local page. The door
button and every door frame share the same rendered rectangle. Exact Step-1
measurements remain in `v4-step1-door-metadata.json`.
