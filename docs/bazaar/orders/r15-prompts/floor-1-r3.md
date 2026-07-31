# Codex subagent order — Bazaar 3 Floor 1 master (round 3: v2 geometry + design fixes)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: geometry guide v2. Authoritative for zones, rails, beams, stair tile, roots, scale.
- Image 2: camera gospel — the Uses countertop crop. Copy this exact camera.
- Image 3: Uses identity reference (approved design; note the back-facing seated customers; chroma-green sheet).
- Image 4: Papers identity reference (chroma-green sheet).
- Image 5: the approved round-2 Floor 1 master. Composition and RENDERING STYLE anchor: keep this look and general composition, then apply every listed change.

Steps:

1. Call your built-in image_gen tool ONCE to GENERATE (not edit) a NEW image at
   size 1536×1024 (wide landscape), using the attached images as references and
   the IMAGE SPEC below as the prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, regenerate with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-1-r3.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen or color-correct the
   image. Do not edit repository files. Do not run other commands.

## IMAGE SPEC

Use case: stylized-concept.
Asset type: complete 2D pixel-art game environment master, desktop floor 1 of an underground market website route. This master will later be cut into modules (stalls with alpha, H-beams, tileable wall/floor, stair tile), so module boundaries must be surgically clean.

Primary request: one coherent authored pixel-art scene, identical in mood and rendering to Image 5, of the underground market floor 1: the Uses ramen stall and the Papers archive kiosk installed in rear bays, a complete industrial spiral stair on the right, and an open market lobby along the front.

Geometry (Image 1 is law):
- The black border is disposable matte: render it as perfectly flat solid #020307 with nothing on it. The scene fills the inner window edge to edge (window is wider than in Image 5).
- The four red lines are camera rails: ceiling line, wall-to-floor contact, fascia top, underside. Render them as crisp horizontal architecture value-step edges, NEVER as red or colored lines.
- Grey vertical strips are riveted steel H-beams. EVERY stall has its own H-beam tight against EACH side: beam, Uses, beam, then a plain wall gap, then beam, Papers, beam, then a plain gap, then the stair tile at the right edge. Two beams therefore stand between Uses and Papers, separated by plain wall. Beams run ceiling to floor, carry rivets and restrained wear, and never overlap stall pixels: each stall's edge stops exactly at its beams.
- The dark-blue vertical slots between beam pairs are pure wall/floor: no stall part, prop, sign, character or colored light may enter them.
- The tall right column is the stair tile: ONE COMPLETE self-contained industrial spiral stair, fully visible inside the tile with margin on both sides — full drum/column, treads, ceiling aperture with reinforced collar, floor landing, worn threshold. Nothing about the stair is cut by the scene edge. Same design language as Image 5's stair, but complete.
- Cream ticks with thin bars: exact character roots and heights. Left bar in Uses: standing adult chef. Short bar near the counter front: a SEATED back-facing customer on a stool. Right bar: adult archivist.

Scene: hidden reclaimed underground night market, archive/service floor. Welded metal and raw concrete, quiet large planes, one continuous rear cable tray, wall meter box, mounting scars. Japanese back-alley intimacy, Blade Runner noir without cyberpunk wash, CRT lo-fi, Fallout-style repair. IMPORTANT: this is a sealed underground interior — there is NO rain, NO drain, NO grate, NO gutter, NO water anywhere on the floor.

Subjects:
- Uses: stern older grey-haired ramen chef, dark work garb and apron, upright behind the counter, arms folded. ONE back-facing customer sits on a stool at the counter, hunched slightly, eating a bowl of ramen (chopsticks up, steam wisp as 2-3 flat pixels). One more stool stays empty. Stall: striped red/purple/grey canopy, warped timber, red lacquer, plank-front counter, cooking vessels and kettles, grouped shelf clutter, unreadable menu scraps, rough lowercase "uses" sign with its small katakana row beneath.
- Papers: narrow teal archive kiosk, scalloped cream/teal awning with lowercase "papers" lettering, shelves with cream books and tied paper bundles, pamphlet rack and wheeled display rack fully inside the bay. Cyan hologram archivist with glasses, composed, reading one physical open book at chest height; hard scanline steps and a few bounded square fragments, never a soft glow.

Camera: exactly Image 2. Frontal shallow-oblique parallel projection: no vanishing point, no convergence, verticals vertical, horizontals horizontal, top planes shallow bands around 0.2 of front-face height, no isometric rotation, no deep ellipses.

Scale: guide bars are exact. Chef and archivist equal adults; the seated customer's head reaches the chef's shoulder height. Stools, counter and stair treads use adult ergonomics.

Style: EXACTLY the rendering of Image 5 — authored low-resolution pixel art on a strict 3×3 logical grid, large flat bounded color regions, three tones per material, strong near-black outlines, sparse hard highlights, quiet surfaces, detail only on faces, hands, signs, cookware, book, hologram. Readable at 300px wide.

Palette: only these 64 colors: #020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d #4b4236 #786852 #a38b69 #cfad7e #edd09c #1d100a #321a0f #4b2816 #6b391c #925022 #bd7133 #361015 #5c171c #882225 #b83932 #dd6048 #171221 #2a1e38 #443153 #674870 #966d94 #071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #071c1d #0e3534 #165652 #267c73 #56b4a4 #10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247 #2e1723 #50283b #784159 #a95f77 #d68b9a #4a280d #7b4514 #ad6a1e #df9e32 #ffd26b #2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82 #ffe3a1 #8be9e7. Architecture ink/steel one step darker than stalls; Uses wood + red lacquer + purple/rose canopy; Papers teal + cream + cyan; skin ramp for chef and customer; amber for warm sources.

Lighting (the priority of this round):
- RULE: each stall's REAR plane (back wall, rear shelving) is one to two value steps DARKER than its front plane (counter, character, sign). The stall interior reads as depth: dark back, lit front.
- Light variety at Uses: two red/amber paper lanterns (warm cores + receivers on canopy, chef, counter), one bare hanging bulb (small warm pool), and a low ember glow from the cooking vessels (deep orange receiver on the counter top and the chef's apron front).
- Light variety at Papers: the cyan scanline hologram is the dominant cool source (receivers on book, hands, counter sill, paper edges, nearest beam flange) plus one weak warm shelf strip under the awning.
- Every source: tiny core, one hard receiver band, one weaker spill band, all flat palette steps, compact contact shadow trending down-right.
- Every glow stays inside its own stall and its flanking beams. No light crosses the wall gaps. Lobby stays dark except a short spill at each stall's rear edge.
- No glow blur, bloom, halo, gradient, fog or translucent overlay.

Text (verbatim, and absolutely nothing else readable anywhere): "uses" with its small katakana row; "papers". There are NO Up or Down signs, NO arrows, NO wayfinding anywhere. Menu scraps stay unreadable marks.

Avoid: drains, grates, gutters, puddles; Up/Down arrows or blades; antialiasing, gradients, blur, glow, bloom, painterly shading, pseudo-pixel microtexture, noise, mixed pixel density; perspective convergence, isometric rotation, deep ellipses; stalls overlapping beams; props in the wall gaps or lobby; clipped stairs or props; pure-white fields; chroma green; hot magenta; extra text, logos, watermarks; malformed anatomy.

Final self-check: 1) matte flat #020307; 2) rails as horizontal value steps at guide heights, no red lines; 3) each stall flanked by its own two beams, clean edges, two beams between stalls; 4) wall gaps empty; 5) complete uncut spiral stair inside the right tile with aperture and landing; 6) chef upright + one back-facing eating customer + archivist at guide roots; 7) only "uses"+katakana and "papers" readable, no arrows; 8) every stall rear darker than front; lantern/bulb/ember/hologram/strip variety, all causal and bounded; 9) no drain or water anywhere; 10) rendering identical to Image 5, readable at 300px.
