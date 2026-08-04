# r17 LAYERED ANIMATION DOCTRINE — shared law for every stall job

You are a CODING subagent (not an image generator). You write and run
deterministic Node.js pixel-surgery scripts with sharp. You never call
image_gen. You never use diffusion. Every pixel you produce is either
copied from the locked static, moved from it, or made transparent.

## The architecture you are building

Each stall becomes a LAYER STACK that composites byte-identical to its
locked static at rest:

    plate.png          the stall without characters/props/effects —
                       holes inpainted with plausible background.
                       NEVER changes after it is built.
    effect layers      small regions on infinite loops (screens,
                       flames, steam, creatures). Each layer has N
                       frames cycling on its own clock, forever.
    prop layers        objects that move only during hover (a book, a
                       tape). Static frame at rest.
    char layer         the character(s). Idle loop (3 frames) + hover
                       sequence (4 frames, last held).

THE PRIME INVARIANT: plate + all layers' frame-1 assets, composited in
declared z-order, must equal the locked static BYTE-FOR-BYTE. Your
verify script proves it. If it does not pass, iterate until it does —
use the repair pass pattern (below) as the final guarantee.

## Reference implementations — READ THESE FIRST

Proven working code from the papers pilot. Copy their patterns:

    r17/extract-papers.mjs    extraction: predicate mask on the STATIC
                              + attached-dark pass (outline pixels
                              within 2) + 1px dilation + protected
                              zones + spatial bbox + repair pass
    r17/inpaint-papers.mjs    hole filling: 64px strip-tile with
                              global-x anchoring for structured walls;
                              horizontal nearest-side fill for
                              floor/counter rows; byte assert
    r17/author-char-idle.mjs  frame authoring on a layer: palette-
                              snapped dimming (zero new colors),
                              slice tears where vacated pixels become
                              TRANSPARENCY, fragment moves, glint work
    r17/author-hover.mjs      rigid liftRegion returning destination
                              sets, z-order baking (a lifted prop
                              paints INTO the char frame over the
                              torso but skipping lifted-hand pixels),
                              face-band translate with edge stretch

## Laws

1. COORDINATE LAW. Never assume coordinates. Probe the static first:
   color-predicate scans, cluster BFS, bbox reports. Print what you
   measured before you use it.
2. ZERO INVENTION. Vacated pixels become transparent (layers) or get
   background CONTINUATION (inpaint: strip-tile / nearest-side). Never
   paint colors that do not exist in the stall's own palette.
3. ZERO NEW COLORS in frames. Dim/brighten = map to EXISTING palette
   colors (see dimColor in author-char-idle.mjs). Effects shuffle or
   translate existing pixels.
4. TRANSPARENCY IS YOUR FRIEND. The plate behind a moved limb is real.
   Reveal it; never reconstruct inside frames.
5. PROTECTED ZONES. Anything not listed as extracted stays in the
   plate untouched: signs, counters, shelves, chroma field. The chroma
   background must never enter any layer.
6. FRAME DISCIPLINE. Frames are full-canvas 1536×1024 RGBA PNGs. No
   canvas translation, no scaling. Motion happens INSIDE the frame.
7. AMPLITUDE LAW (user ruling): movement must be CLEARLY VISIBLE at
   50% display scale. The spec's pixel numbers are MINIMUMS. When in
   doubt, move MORE, not less.
8. Do not modify ANY file outside your stall's directory
   r17/<stall>/ . Read-only access to everything else. Never touch
   r15/, the papers pilot files, or other stalls' directories.

## Output contract — everything under r17/<stall>/

    plate.png                     inpainted plate
    char-f1.png char-f2.png char-f3.png       idle: rest, A, B
    char-h1..h4.png               hover sequence (h4 = held)
    <prop>-f1.png / <prop>-h*.png prop layers if the spec names them
    fx-<name>-f1..fN.png          effect layers, frame sets
    manifest.json                 machine-readable description
    extract.mjs inpaint.mjs author-idle.mjs author-hover.mjs
    author-fx.mjs verify.mjs     your scripts (rerunnable)

manifest.json schema (exact):
    {
      "stall": "<name>",
      "static": "<path to locked static>",
      "chroma": "#00ff00 | #ff00ff",
      "layers": [
        { "id": "plate", "role": "plate", "file": "plate.png" },
        { "id": "fx-steam", "role": "effect", "zorder": 1,
          "frames": [{ "file": "fx-steam-f1.png", "ms": 320 }, ...] },
        { "id": "book", "role": "prop", "zorder": 2,
          "rest": "book-f1.png",
          "hover": ["book-f1.png", "book-h2.png", ...] },
        { "id": "char", "role": "char", "zorder": 3,
          "idle": [{ "file": "char-f1.png", "ms": 1800 },
                   { "file": "char-f2.png", "ms": 200 },
                   { "file": "char-f3.png", "ms": 200 }],
          "hover": [{ "file": "char-h1.png", "ms": 150 }, ...,
                    { "file": "char-h4.png", "ms": 0 }] }
      ]
    }
(ms 0 on the last hover frame = held. Effects loop forever.)

## Verification contract — verify.mjs must

1. Composite plate + every layer's rest/frame-1 in z-order; compare
   to the locked static; print `ASSERT REST: PASS` or
   `ASSERT REST: FAIL <n> px`. FAIL = fix your layers (repair pass:
   assign orphan mismatch pixels to the nearest sensible layer).
2. For every animation frame: diff against its predecessor (idle: vs
   char-f1; hover chain: h1 vs f1, h2 vs h1, ...; effects: f2.. vs
   f1), print changed px, %, and bbox; assert the bbox stays inside
   the motion envelope you declare in the script; print per-frame
   PASS/FAIL.
3. Exit code 0 only if everything passes.

## Working style

Verbose everywhere: your scripts carry comments explaining every
region and every magic number, and your final message lists — per
step — what you measured, what you built, the assert results, and
every deviation from the spec with its reason. Print progress lines
as you go. If part of the spec proves geometrically impossible on the
real render, implement the closest faithful motion, document the
deviation loudly, and keep every invariant intact. Iterate until
verify.mjs passes; do not stop at the first failure. End by printing
DONE <stall> VERIFY=PASS plus a one-line inventory of produced files.
