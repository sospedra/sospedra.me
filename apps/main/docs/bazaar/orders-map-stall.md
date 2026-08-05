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

## structural inventory (verbose, per doc 02)

1. board panel: backlit, rounded pixel frame, occupies the middle band
2. two legs: simple posts to the floor
3. top ledge: deep enough for a curled raccoon
4. raccoon: curled ball, striped tail hanging over the panel edge
5. map illustration: streets + stall blocks, decorative
6. label strip: "U ARE HERE" in pixel caps
7. red dot on the map: rendered as a SEPARATE fx layer, not in the plate

## laws in force

- camera: doc 03 axonometric doctrine, front-facing board like the
  manual/talks fronts
- palette: midnight base, orchid accent #c86fd6, flatness laws doc 04
- scale (display px currency, doc 10): board total ~460 display tall;
  curled raccoon ~95 display; calibration: seated Ed 170, w98 robot 294
- target display box: 260 x 460 su (narrowest stall; travel is 341)
- keying: doc 10 official keyer, NO --despill (orchid is a purple; the
  w98 violet execution warning applies), binary alpha, hostile-color
  composite audit
- r17 rest assert: plate + char-f1 + fx-dot-f1 composite must byte-match
  the master key render
- r18 pose doctrine: chain minimal diffusion edits on the ISOLATED
  raccoon, one change per step

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
