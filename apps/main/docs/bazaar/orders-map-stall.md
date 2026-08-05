# order: map stall (ninth stall)

Target: 11 files under `public/images/bazaar/map/`, replacing the
placeholder rectangles shipped 2026-08-05. File names are a contract with
`app/bazaar/stalls-manifest.ts`. After delivery, update `SIM_DIMS.map`
(artW/artH) and `STALL_SCENES.map.rect` to the real crop, then run
`pnpm test` (the layer-file test guards the names).

## concept

A narrow freestanding directory board at a market entrance. Backlit
panel, pixel map of a market. THE MAP IS ILLUSTRATIVE: any plausible
pixel market map. No fidelity to the real bazaar layout. Board label:
"U ARE HERE". A raccoon sleeps on the top ledge, Cheshire Cat energy:
the grin stays faintly visible through sleep, and the wake starts with
the grin.

## structural inventory (verbose numbered inventory, docs 02 + 10)

1. board panel: backlit, rounded pixel frame, occupies the middle band
2. two legs: simple posts to the floor
3. top ledge: deep enough for a curled raccoon
4. raccoon: curled ball, striped tail hanging over the panel edge
5. map illustration: streets + stall blocks, decorative
6. label strip: "U ARE HERE" in pixel caps
7. red dot on the map: rendered as a SEPARATE fx layer, not in the plate

## laws in force

- camera (doc 03): copy the r15 canon language verbatim into the master
  order: "a FLAT STOREFRONT seen dead-on... NOT a room, NOT a stage, NOT
  a diorama... every box: front rectangle + one thin top band, vertical
  sides, nothing else." Two-surface law: a visible left/right side face
  is a rejection; depth is overlap only. Attach `assets/angle-law.png`
  (canon on every scene order since r13). If the booth stands on a slab,
  state the slope as the integers 68:81, never a rounded restatement.
- palette (doc 04): the master order carries a PALETTE CLAMP: list the
  full legal hex set (r20 convergence: 15-25 hexes) and open the color
  law with "use ONLY these colors, nothing else". Scope one-use colors,
  including the accent: "#c86fd6 only the sign glow and dot, never the
  map panel". FLATNESS ABSOLUTE: zero stipple, zero gradients, every
  region one flat chunk, blocks never smaller than 4x4 px. The site
  vibe is the midnight design language (doc 16): midnight blacks, neon
  accents, rust and steel.
- scale (display px currency, doc 10): board total ~460 display tall;
  curled raccoon ~95 display; calibration: seated Ed 170, w98 robot 294
- target display box: 260 x 460 su (narrowest stall; travel is 341).
  Source: SIM_DIMS in app/bazaar/stalls-manifest.ts, not prose doctrine.
- chroma contract (doc 02): flat chroma green #00ff00 outside the art,
  scoped "background key only, zero art pixels"
- keying: doc 10 official keyer, NO --despill (orchid is a purple; the
  w98 violet execution warning applies), binary alpha, hostile-color
  composite audit
- rest assert, the PRIME INVARIANT (doc 08 + doctrine/DOCTRINE.md):
  plate + all layers' frame-1 assets (char-f1, fx-dot-f1), composited in
  declared z-order, must equal the locked static byte-for-byte
- poses (doc 08): prefer the SHEET DOCTRINE, which superseded r18 chains
  on the console rebuild: ONE generation per pose set, frame 0 attached
  as the only asset, the order asks for a sprite-sheet row whose first
  cell is an exact copy of frame 0. Chains re-diffuse every leg and
  compound saturation. If sheets fail, fall back to r18 chaining:
  minimal 3-sentence orders, compact invariant list (same colors, size,
  position, style), held objects in the same hand, bare chroma
  background, each frame chained from the previous frame's raw gen.
- per-gen orders follow the doc 02 skeleton: attachment declarations
  with roles plus the never-draw clause, canvas + chroma contract, laws
  ordered numbers-first, output contract with exact size, exact
  destination path, and "print GENERATED=<path>"

## deliverables

- `plate-key.png` — booth + board + map + label. NO raccoon. NO red dot.
- `char-f1.png` — curled sleep, faint grin (rest anchor)
- `char-f2.png` — breath rise (minimal diff from f1)
- `char-f3.png` — tail-tip flick (minimal diff from f1)
- `char-h1.png` — grin widens, eyes still shut
- `char-h2.png` — eyes snap open, too wide
- `char-h3.png` — body unfurls, hangs head-first over the board edge
- `char-h4.png` — paw pins the red dot, tail curled into a question mark
- `fx-dot-f1.png` / `fx-dot-f2.png` / `fx-dot-f3.png` — dot pulse,
  dim -> mid -> bright glow

All files pre-cropped to one shared content rect inside the 1536x1024
master canvas. Report the rect with the delivery.
