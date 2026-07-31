# Codex subagent order — Bazaar 3 Floor 3 master (round 3: v2 geometry + design fixes)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: geometry guide v2. Authoritative for zones, rails, beams, stair tile, roots, scale.
- Image 2: camera gospel — the Uses countertop crop. Copy this exact camera.
- Image 3: RENDERING STYLE anchor — the approved Floor 1 master. Match this pixel style exactly. Do not copy its layout or tenants.
- Image 4: w98 stall structure reference (foliage, shelves, sign shape, robot pose, creatures; chroma-magenta sheet). Sign text and robot color change per spec.
- Image 5: Games identity reference (approved siblings and stall; chroma-green sheet).
- Image 6: Travel identity reference (Hearthian, booth; chroma-magenta sheet). Counter contents change per spec.

Steps:

1. Call your built-in image_gen tool ONCE to GENERATE (not edit) a NEW image at
   size 1536×1024 (wide landscape), using the attached images as references and
   the IMAGE SPEC below as the prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, regenerate with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-3-r3.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen or color-correct the
   image. Do not edit repository files. Do not run other commands.

## IMAGE SPEC

Use case: stylized-concept.
Asset type: complete 2D pixel-art game environment master, desktop floor 3 of an underground market website route. This master will later be cut into modules (stalls with alpha, H-beams, tileable wall/floor, stair tile), so module boundaries must be surgically clean.

Primary request: one coherent authored pixel-art scene, rendered exactly like Image 3, of the underground market floor 3 (leisure/transit): the w98 garden stall, the Games kid-built stall and the Travel booth installed in rear bays, a complete industrial spiral stair on the left, and an open market lobby along the front.

Geometry (Image 1 is law):
- The black border is disposable matte: render it as perfectly flat solid #020307 with nothing on it. The scene fills the inner window edge to edge.
- The four red lines are camera rails: ceiling line, wall-to-floor contact, fascia top, underside. Render them as crisp horizontal architecture value-step edges, NEVER as red or colored lines.
- Grey vertical strips are riveted steel H-beams. EVERY stall has its own H-beam tight against EACH side: stair tile, gap, beam w98 beam, gap, beam Games beam, gap, beam Travel beam, margin. Two beams stand between adjacent stalls, separated by plain wall. Beams run ceiling to floor and never overlap stall pixels.
- The dark-blue vertical slots between beam pairs are pure wall/floor: no stall part, prop, sign, character, plant or colored light may enter them.
- The tall left column is the stair tile: ONE COMPLETE self-contained industrial spiral stair, identical in design and proportions to the Floor 1 stair (Image 3's right side) but mirrored for the left edge: full drum/column, treads, ceiling aperture with reinforced collar, floor landing, worn threshold. Nothing clipped.
- Cream ticks with thin bars: exact roots and heights. Tall bar: the w98 gardener robot. Two adjacent bars: the older sister and the smaller younger brother. Right bar: the adult Hearthian agent.

Scene: reclaimed leisure/transit level. Patched timber, scrap metal, plywood and tarp repairs, faded transit markings, junction boxes, quiet large planes. Sealed underground interior: NO rain, NO drain, NO grate, NO gutter, NO water pipe, NO runoff anywhere. Nothing from any stall spills onto the lobby floor.

Subjects:
- w98 (garden stall; the sign reads "w98" now): completely roofless ragged silhouette of foliage and two uneven rusty riveted posts, low rails, warped planted shelf wings around a darker work bay, terracotta pots, seed trays, soil, hand tools, rope and pulley. All plants and pots stay INSIDE the stall footprint: chunky leaf masses, no fine fronds, no vines or leaves reaching the lobby, the beams or the wall gaps. Nine to eleven warm string bulbs sag between the posts. The rope-hung, chipped, slightly askew wooden sign upper-left reads exactly lowercase "w98". The gardener robot is RUSTY RED-ISH: oxidized red-brown plating (rust and worn red-oxide paint), slim 1990s-anime build, compact rectangular head, exactly two round lenses (one dimmer), bent antenna, narrow segmented torso with visible gaps, exposed pistons and cables, oversized three-finger grippers, gardener apron as its only clothing, gentle stoop, both hands guiding one dented watering can over one potted seedling, embedded among shelves and foliage, partially occluded. A violet grow lamp hangs over the seed trays and VISIBLY SURFACES: hard violet receiver bands on the trays, nearby leaves and the robot's plating, with a compact violet-tinted contact below. Two alien creatures: upper-right shelf, a dozing six-limbed velvet-indigo creature with three amber eyes in a vertical row, moss on its back, curled tail with a muted dusty-rose dot; lower-left INSIDE the stall footprint, a round non-mammal with exactly four legs, three dorsal fins along its back, two feather antennae, asymmetric eyes and a dim dusty-rose belly.
- Games: open crooked kid-built stall of cheap wood and bright blue plastic, visible wedges, mismatched screws, no counter. CAMERA NOTE: the stall floor/platform is seen nearly edge-on — a thin horizontal band only, NO visible floor plane spreading toward the viewer; the children stand at the guide roots with their feet on that thin band. A blue arcade cabinet stands at the left of the bay as a background prop; its CRT shows a very LOW-POLY Tekken-style fighting-game intro: two blocky low-poly fighters facing off, flat CRT scanline steps, unreadable title marks. Stock shelves right with cartridges and consoles; two low crates fully inside the bay. Handmade plank sign on a crooked post reads lowercase "games" in kid lettering. Center: the two siblings share ONE handheld — older, taller sister (brown ponytail, dusty-blue hoodie, navy shorts, sneakers) holds it in both hands; younger, smaller brother (black hair, rust/cream striped tee, blue shorts) points at its screen, serious and protective. Both children's faces catch a small cool glow from the handheld screen.
- Travel: deep enclosed booth of wood, canvas and brass, patched red/white striped awning band, thick STRAIGHT side returns and soffit, rear wall clearly about ONE METRE behind the agent with a dark rear floor gap; strong value contrast: the rear wall is two steps darker, the counter and agent are bright. Lowercase "travel" wooden sign with small winged-rocket emblem. The agent: friendly adult Hearthian, blue-grey skin, exactly four amber eyes in two clear pairs, long pointed side ears, compact mouth, red scarf, tan flight jacket, gloves; one gloved hand rests on the counter, the other raises one ticket. On the rear wall: route cards and a star map, all unreadable. An astronaut suit and helmet hang at one side. The countertop carries ONLY ONE OBJECT: a compact brass-and-steel RADAR (signalscope style): a circular green CRT scope screen with a rotating sweep wedge, faint ring gridlines and two or three tiny blips, a small dish antenna on top; the scope's green glow lights the counter surface and the agent's gloved hand with hard flat steps. No tickets stacks, no puncher, no orrery, no telescope, no clutter on the counter. Two bright amber lanterns flank the booth. A small cream board reads exactly "LAST SEATS". Luggage trunk and compact brass queue posts sit INSIDE the Travel footprint at its front edge, complete.

Camera: exactly Image 2. Frontal shallow-oblique parallel projection: no vanishing point, no convergence, verticals vertical, horizontals horizontal, top planes shallow bands around 0.2 and the Games platform nearly edge-on, no isometric rotation, no deep ellipses.

Scale: guide bars exact and the descending order obvious: w98 robot tallest, Hearthian adult, older sister, younger brother. Luggage hand-carry scale. Stair treads adult-scaled.

Style: EXACTLY the rendering of Image 3 — authored low-res pixel art on a strict 3×3 logical grid, large flat fields, three tones per material, strong near-black outlines, sparse hard highlights, quiet surfaces, detail on faces, lenses, the handheld, signs, the radar scope, creatures. Readable at 300px.

Palette: only these 64 colors: #020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d #4b4236 #786852 #a38b69 #cfad7e #edd09c #1d100a #321a0f #4b2816 #6b391c #925022 #bd7133 #361015 #5c171c #882225 #b83932 #dd6048 #171221 #2a1e38 #443153 #674870 #966d94 #071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #071c1d #0e3534 #165652 #267c73 #56b4a4 #10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247 #2e1723 #50283b #784159 #a95f77 #d68b9a #4a280d #7b4514 #ad6a1e #df9e32 #ffd26b #2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82 #ffe3a1 #8be9e7. w98: foliage greens + terracotta + rust-red robot from #6b391c #925022 #882225 #b83932 over dark steel + violet #443153/#674870 + rose #784159/#a95f77/#d68b9a; Games: cheap timber + blue plastic #0d486d/#126e9b/#1f9cc8 + red accents + skin; Travel: canvas cream + wood + brass #7b4514/#ad6a1e + blue-grey skin + strong amber + scope green built from #31461a #4b6220 #95a247 with core #8be9e7 kept tiny.

Lighting (the priority of this round):
- RULE: each stall's REAR plane is one to two value steps DARKER than its front plane and characters. Travel especially: dark rear wall, bright counter and agent.
- Variety: w98 warm string bulbs + SURFACING violet grow lamp + tiny rose creature dots; Games low-poly arcade CRT glow + handheld glow on both children's faces + one small warm bulb; Travel bright amber lanterns + the radar's green sweep glow.
- Every source: tiny core, one hard receiver band, one weaker spill band, flat steps, compact contact shadow trending down-right.
- Every glow stays inside its own stall and flanking beams; nothing crosses the wall gaps; lobby dark except short rear-edge spill.
- No glow blur, bloom, halo, gradient, fog or translucent overlay.

Text (verbatim, and absolutely nothing else readable anywhere): "w98"; "games"; "travel"; "LAST SEATS". NO Up or Down signs, NO arrows, NO wayfinding anywhere. The word "projects" must NOT appear. Route cards, maps, cartridge labels and the arcade title stay unreadable marks.

Avoid: drains, gutters, water pipes, runoff, puddles; Up/Down arrows; plants or props overflowing onto the lobby floor or into wall gaps; a roofed or glazed w98; an olive, grey or pale robot (it is rust-red); "projects" lettering; fine fronds; chroma-green foliage; a high camera on Games or a visible spreading floor plane; arcade interaction replacing the shared handheld; counter clutter in Travel; a shallow Travel booth; frog or two-eyed agent; antialiasing, gradients, blur, glow, bloom, painterly shading, microtexture, noise, mixed density; perspective convergence, isometric rotation, deep ellipses; stalls overlapping beams; clipped stairs or props; extra text, logos, watermarks; malformed anatomy.

Final self-check: 1) matte flat #020307; 2) rails as horizontal value steps, no red lines; 3) every stall flanked by its own two beams, two beams between stalls, clean edges; 4) wall gaps empty, no lobby spill, no drains or water; 5) complete mirrored Floor-1-style stair inside the left tile; 6) w98 sign reads w98, rust-red two-lens robot, surfacing violet lamp, correct creatures inside the footprint; 7) Games nearly edge-on platform, Tekken-style low-poly intro on the arcade CRT, siblings sharing the one handheld with lit faces; 8) Travel one-metre depth with strong rear/front contrast and ONLY the green-glow radar on the counter; 9) all stall rears darker than fronts, bulbs/violet/rose/CRT/handheld/lantern/radar variety, causal and bounded; 10) only w98, games, travel, LAST SEATS readable; rendering identical to Image 3.
