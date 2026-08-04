# Codex subagent order — Bazaar 3 Floor 1 master (round 1)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: geometry guide (composition, zones, rails, scale).
- Image 2: camera gospel — the Uses countertop crop. Copy this exact camera.
- Image 3: Uses stall identity reference (approved design, chroma-green sheet).
- Image 4: Papers stall identity reference (chroma-green sheet).
- Image 5: rendering-density reference (chunky flat readable pixel style).

Steps:

1. Call your built-in image_gen tool ONCE to GENERATE (not edit) a NEW image at
   size 1536×1024 (wide landscape), using the attached images as references and
   the IMAGE SPEC below as the prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, regenerate with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-1-r1.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen, color-correct or
   otherwise "improve" the image. Do not edit any repository files. Do not run
   any other commands.

## IMAGE SPEC

Use case: stylized-concept.
Asset type: complete 2D pixel-art game environment master, desktop floor 1 of an underground market website route.

Primary request: One coherent authored pixel-art scene of a hidden reclaimed underground night-market floor. The Uses ramen stall and the Papers archive kiosk are physically installed in rear bays of one continuous building, with an industrial spiral-stair recess on the right and an open market lobby along the front. This is one causal interior, never separate stall images pasted over a background.

Input image roles: Image 1 is the geometry guide: the black border is disposable matte — render it as perfectly flat solid #020307 with nothing on it. The lit inner window is the scene; fill it edge to edge. The four red horizontal lines are camera rails (ceiling line, wall-to-floor contact, front fascia, underside): reproduce these exact heights as real architecture edges, perfectly horizontal. The two narrow blue-grey vertical columns are architecture-only seam corridors, each carrying one riveted steel H-beam from ceiling to fascia: no stall part, prop, character, sign or colored light may cross them. The tall dark right-side column that continues up through the ceiling band is the stair bay: real ceiling aperture, dark recess, industrial spiral stair, reinforced collar with brackets and bolts, real floor landing (the light strip), worn threshold. Cream ticks with thin vertical bars are exact character root positions and standing heights. The small pink rectangle marks the pink Up arrow blade (stair side); the small cyan rectangle marks the cyan Down arrow blade. Image 2 fixes the camera. Images 3 and 4 fix stall identity: preserve structure, sign design, character and props exactly, but re-render them simpler and flatter at master scale; ignore their flat chroma-green sheet backgrounds. Image 5 fixes rendering density: match its chunky flat readable pixel style, even flatter and cleaner; do not copy its layout.

Scene/backdrop: Floor 1 "Archive/Service". Cold upper archive infrastructure, warmer at working height. Welded metal and raw concrete with large quiet planes, one continuous rear cable tray, one wall meter box, sparse mounting scars, one floor drain. Japanese back-alley intimacy, Blade Runner noir without a generic cyberpunk wash, CRT lo-fi technology, Fallout-style improvised repair. Old but active, illicit but inviting, cluttered but graphically readable.

Layout left to right, proportions exactly as the guide: wide Uses bay (about half the scene), H-beam corridor, narrower Papers bay, second H-beam corridor, right stair bay. Below the wall-to-floor rail runs one continuous open lobby / walking aisle for the whole floor: shallow floor top, mostly empty, then the front fascia edge and a dark under-trench. Stalls never extend into the lobby; only their small authored floor contacts sit near its rear edge.

Subjects:
- Uses: stern older grey-haired ramen chef, dark work garb and apron, upright behind the counter, arms folded, quiet severe assessment; never hostile or cartoonish. Wide asymmetric working stall: red/purple/grey striped canopy, warped timber and red lacquer, plank-front counter, cooking vessels and kettles, two or three grouped shelf-clutter masses, unreadable paper menu scraps, two compact stools with exact floor contacts, rough wooden sign with lowercase "uses" and its small approved katakana row beneath. Two red/amber paper lanterns and one hanging bulb.
- Papers: narrow teal archive kiosk with scalloped cream/teal awning carrying lowercase "papers" lettering, real shelf depth with cream/yellowed books, tied paper bundles and folders, a pamphlet rack and a wheeled display rack with exact contacts. Courteous scholarly holographic archivist: cyan hologram with glasses and composed posture, reading one physical open book held at chest height. The hologram is hard cyan scanline steps and a few bounded square fragments, never a soft glow. The book stays a physical book.

Camera: front-facing shallow frontal-oblique axonometric RPG view, parallel projection. No vanishing point, no lens distortion, no bay rotation, no converging lines. Uprights perfectly vertical; counter fronts, shelves, beams, ceiling, wall contact, floor seams and fascia perfectly horizontal. Top surfaces are shallow compressed bands about 0.2 of their front-face height, never deeper than 0.25. No isometric 30/45 degree view, no perspective trapezoids, no deep ellipses.

Scale: the guide bars are exact. Chef and archivist are equal-height adults. Stools, counter, shelves and stair treads use those adults' ergonomics. Nothing floats, nothing is toy-scaled.

Style/medium: authored low-resolution 16-bit pixel art enlarged nearest-neighbor: every logical pixel is one crisp uniform 3×3 block of the 1536×1024 canvas. Large flat bounded color regions, chunky square clusters, strong near-black outer and structural outlines, normally exactly three tones per material (shadow, body, highlight), large connected shadow masses, sparse hard highlights, quiet large surfaces. Spend detail only on faces, hands, signs, cookware, book and hologram. Must stay readable shrunk to 300px wide.

Color palette: use ONLY these 64 colors, nothing else: #020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d #4b4236 #786852 #a38b69 #cfad7e #edd09c #1d100a #321a0f #4b2816 #6b391c #925022 #bd7133 #361015 #5c171c #882225 #b83932 #dd6048 #171221 #2a1e38 #443153 #674870 #966d94 #071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #071c1d #0e3534 #165652 #267c73 #56b4a4 #10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247 #2e1723 #50283b #784159 #a95f77 #d68b9a #4a280d #7b4514 #ad6a1e #df9e32 #ffd26b #2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82 #ffe3a1 #8be9e7. Allocation: architecture, stairs and beams mostly the ink/steel ramp (#020307–#898e8d), one value step darker than the stalls; Uses is wood (#1d100a–#bd7133) + red lacquer (#361015–#dd6048) + muted purple/rose canopy (#443153 #674870 #784159 #a95f77); Papers is teal (#071c1d–#56b4a4) + cream (#4b4236–#edd09c) + cyan hologram (#126e9b #1f9cc8 #4bd2e1, core #8be9e7); skin #542b22–#efbd82; amber emissions #4a280d–#ffd26b with core #ffe3a1. A shared semantic material uses the same exact swatch in both stalls.

Lighting/mood: shared ambient cool, low-chroma, dim, from upper front-left. Right/far faces one palette step darker, undersides two steps darker, shallow tops one step brighter, background architecture one step below stalls. Every source forms a complete visible causal chain: tiny source core, hard direct receiver band on its own stall/character, weaker spill receiver on adjacent shared architecture, compact contact/cast shadow trending down-right. At most three hard flat bands per source. Uses lanterns and bulb: warm receivers on counter, chef and nearby wall metal, one short warm pool at the stall's rear floor edge. Papers hologram: cyan receivers on book, hands, counter sill, paper edges, the nearest H-beam flange, a wall patch and one short floor strip; the weak warm shelf strip stays secondary; the booth is not washed cyan. The lobby stays dark except short rear-edge spill. No glow, bloom, halo, gradient, fog or translucent overlay.

Integration (mandatory): one greasy service/heat pipe leaves the shared wall infrastructure and visibly feeds Uses; grease, soot and scrape wear continue past the stall boundary onto shared concrete and metal; the lantern wiring joins the shared cable tray. One archive data conduit leaves the cable tray and terminates at Papers, with faint paper-dust accumulation and wheel contact marks. Both stalls stand on exact irregular support/contact islands, have architecture behind them and one or two selected complete environmental props near their rear line, and the H-beams carry real bay seams with ceiling and floor contact and restrained wear. No random cables, no confetti pixels, no filler trash.

Text (verbatim, and absolutely nothing else readable anywhere): "uses" lowercase on the rough sign with its small katakana row beneath; "papers" lowercase on the awning; one pink Up arrow blade at the marked stair-side position; one cyan Down arrow blade at the marked opposite position. Arrow blades are arrow glyphs only, no words.

Avoid (hard rejections): antialiasing, gradients, blur, soft glow, bloom, painterly or airbrushed shading, high-resolution illustration pixelated afterwards, pseudo-pixel microtexture, fine one-pixel noise, scratches or rivets everywhere, mixed pixel densities, random colored pixels or wires, perspective convergence, isometric rotation, deep ellipses, foreground stalls, stalls reading as framed cards over wallpaper, one global brown/teal tint, large pure-white fields, chroma green, hot magenta, extra readable text, logos, watermarks, malformed anatomy or props, clipped or cropped props, missing H-beams, identical H-beam cages around both stalls, floating or disproportionate stairs, clutter filling the lobby.

Final self-check before output: 1) matte perfectly flat #020307; 2) four rails at guide heights, horizontal; 3) all uprights vertical; 4) both corridors architecture-only; 5) stairs on the right with aperture, landing, pink Up; cyan Down opposite; 6) chef and archivist at the guide roots and heights with locked identities; 7) only whitelisted text, spelled exactly; 8) every light causal (source, receiver, world receiver, contact shadow); 9) flat chunky three-tone rendering on a strict 3×3 grid, no texture noise; 10) open lobby, complete props, one physical world.
