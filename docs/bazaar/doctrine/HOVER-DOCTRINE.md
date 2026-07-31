# r17 HOVER DOCTRINE v2 — the translation law

Supplement to r17/DOCTRINE.md. Governs every hover rebuild. The user
gated the fleet's hovers: papers PASSED, all seven others FAILED.

## Why papers passed and the others failed

Papers' hover is built EXCLUSIVELY from translations of pixels that
already exist: the face band slides up (with a 2-row stretch at the
chin), the book + hands + forearms lift as one rigid group, the book
layer translates, vacated pixels reveal the real plate. Not one pixel
was drawn freehand.

The failed hovers tried to SYNTHESIZE: rebuild an arm rotated 40°,
draw a peace sign, extend two pointing fingers, redraw an unfolding
forearm. Deterministic scripts drawing new anatomy produce mush. The
capability does not exist. It is now BANNED.

## THE TRANSLATION LAW

ALLOWED, and the only things allowed:
1. RIGID GROUP TRANSLATE — BFS-probe a connected pixel cluster (a
   head, a hand+forearm, a held object with the hands on it), move it
   dy/dx as one unit.
2. FEATURE-BAND TRANSLATE — eyes/brows/mouth rows slide inside the
   head silhouette; the 1-2 row seam fills by duplicating the
   adjacent existing row (the papers chin-stretch).
3. WHOLE-LAYER TRANSLATE — the entire character floats/leans (manual
   bob proved it).
4. PROP-SPRITE TRANSLATE — a prop layer or authored sprite moves.
5. PALETTE ACCENT — brighten/dim by swapping to EXISTING palette
   colors (glints, eye flares, screen glows).
6. TRANSPARENCY REVEAL — pixels a group vacates toward the OUTSIDE of
   the body become transparent; the plate behind is real.
7. INTERIOR VACANCY FILL — when a group vacates space INSIDE the
   body (a hand leaving its spot on the chest), continue the
   garment's own pattern from the adjacent rows/columns of the SAME
   material. Copy, never invent. (The papers scanline-phase fill.)
8. OVERLAP SELF-HEALING — always translate a limb group so its
   trailing boundary lands INSIDE the body it belongs to: the moved
   pixels paint over same-material pixels and no seam shows. Choose
   group boundaries inside the torso, never at the joint line.

BANNED: drawing new limbs, fingers, hands or poses; rotating
anatomy; shearing limbs; any pixel whose value+position pair cannot
be traced to a copy/translate/palette-swap of existing pixels.

## Choreography design rules

- Gestures must be expressible as stacked translates. When the old
  spec demanded synthesis (a peace sign, a pointing finger, an
  unfolding arm), the order below REPLACES it with a translate-only
  gesture of equal energy: raised existing hand, deep bow, full-body
  lean, bigger prop travel.
- Amplitudes stay BIG (user law): 12-45 px travels.
- Chain h1→h2→h3→h4; h4 reads calm and holds forever.
- Idle frames and effect layers are UNTOUCHED by hover rebuilds.
- Filenames stay char-h1..h4.png (+ prop hover assets): overwrite in
  place, manifests keep working.
- verify.mjs: re-declare the hover envelopes for the new choreography,
  keep every other assert identical, everything green before DONE.
- Probe every group first; write a debug crop of each mask
  (group-<name>.png on a #222 background) BEFORE authoring frames,
  and eyeball it yourself in the log narrative.

## Effect layers during hover

If the order says an effect reacts to hover (w98's water stops), add
to that fx layer in manifest.json: "hover": "<frame file>" — a single
frame shown while hovered. The preview runtime honors it.
