# Codex order — r12 — Papers stall, clean regeneration, exact palette

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the Papers bay crop from the Floor 1 master. Source of truth for
  layout and shapes.
- Image 2 = the APPROVED Manual stall asset. Its rendering density, outline
  weight and flatness are the exact standard to match.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-papers-r12.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Rebuild the Papers kiosk from Image 1 as one isolated sprite on flat chroma
magenta #ff00ff. Same layout and silhouette as Image 1, rendered exactly as
flat and chunky as Image 2. The previous attempt had two hard defects, both
banned here: the kiosk's side columns looked like riveted steel structural
beams (they are WOODEN kiosk posts), and there were melted glyph and face
artifacts.

PALETTE LAW: every pixel of the art uses ONLY hexes named below. No other
color may appear.

1. Awning: stripes alternating teal (#165652 body, #0e3534 shadow, #267c73
   light) and cream (#cfad7e body, #a38b69 shadow, #edd09c light); scalloped
   cream tabs along the bottom edge, each tab carrying one dark teal
   (#0e3534) lowercase letter spelling exactly  p a p e r s  — six letters,
   one s — with a small #0e3534 diamond mark on the flanking tabs.
2. Side posts: PLAIN TEAL WOOD, no rivets, no steel: #165652 body, #0e3534
   shadow edge, #267c73 light edge, outline #020307. Each post carries three
   small pinned paper cards (#cfad7e with #a38b69 shadow and 2-3 print dash
   marks of #4b4236).
3. Interior shelves: frame #0e3534/#165652; two shelf rows holding tied
   cream paper bundles (#cfad7e body, #a38b69 shadow, #edd09c top, string
   #786852) and book spines in #0d486d, #126e9b, #443153, #882225, #4b4236.
   The whole interior sits one step darker and cooler: its background panel
   is #071c1d.
4. The hologram archivist, center: translucent cyan figure built from hard
   horizontal scanline rows alternating #126e9b and #1f9cc8 with edge
   highlights #4bd2e1 and 4-6 core pixels #8be9e7; round glasses rims
   #4bd2e1; he holds one physical open book: pages #edd09c with #cfad7e
   shadow, edge #a38b69, cover #6b391c. He appears from the counter line UP:
   torso, arms, book, head. NO legs, NO lower body, NO projector pad. Two or
   three detached square hologram fragments of #126e9b float within 30
   pixels of his shoulders.
5. Hologram light: one flat #0d486d wash step on the interior shelf faces
   behind him, a #126e9b band on the counter top directly in front of him,
   and a 2-pixel #126e9b edge on the side posts' inner faces.
6. Counter: front panels #165652 with #0e3534 recessed rectangles and
   #267c73 top edge; counter top board #6b391c with #4b2816 shadow and
   #925022 front lip. On it: a blue cup #126e9b with pens #b83932, #df9e32,
   #4bd2e1; a small bell #df9e32 with #7b4514 base and #ffd26b top glint; a
   flat closed ledger #4b2816 with #6b391c spine.
7. A-frame rack, left, on small wheels: frame #2b3741 with #414c55 light
   edge; three rows of leaned cream sheets (#cfad7e, shadow #a38b69, print
   dashes #4b4236); wheels #1c2731 with #414c55 rim.
8. Wheeled tower rack, right: four wire tiers, frame #2b3741/#414c55, pole
   with ball finial #414c55/#606970; pockets filled with small cards in
   #cfad7e, #a38b69, #882225, #0d486d, #443153; caster wheels #1c2731.
9. Warm shelf strip: one thin #df9e32 strip under the awning's inner edge
   with a single #ad6a1e step below it.

Rendering: strict 3×3 logical pixel grid; large flat single-color fields;
exactly the three tones per material listed; continuous #020307 outlines
around every object; no gradients, no blur, no glow, no antialiasing, no
noise, no texture. Faces, glyphs and hands must be clean: the archivist's
glasses are two simple circles, the letters are simple pixel glyphs.

EXCLUDE: H-beams, background wall, concrete floor, neighboring bays.
Background: perfectly flat #ff00ff, nothing touching the canvas border,
generous padding.

Text: only "papers". Every other mark is unreadable dashes.

Self-check: 1) six letters p-a-p-e-r-s; 2) side posts are plain teal wood
with paper cards, zero rivets, zero steel; 3) hologram legless with pages
book, scanlines, no pad; 4) every color in the spec list, no others; 5) as
flat as Image 2, no melted shapes; 6) flat #ff00ff background; 7) 1536×1024.
