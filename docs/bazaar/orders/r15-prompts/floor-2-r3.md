# Codex subagent order — Bazaar 3 Floor 2 master (round 3: v2 geometry + design fixes)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: geometry guide v2. Authoritative for zones, rails, beams, stair tile, roots, scale.
- Image 2: camera gospel — the Uses countertop crop. Copy this exact camera.
- Image 3: RENDERING STYLE anchor — the approved Floor 1 master. Match this pixel style exactly. Do not copy its layout or tenants.
- Image 4: Ed identity reference (chroma-green sheet). This exact character and rug. The sign pole design too, but WITHOUT the arrow.
- Image 5: Manual stall structure reference (sign, counter, front bins; chroma sheet). The robot gets repainted per spec.
- Image 6: Talks / Video Club structure reference (clerk, shelves, CRT, bin, standee; chroma-green sheet). Counter material changes per spec.

Steps:

1. Call your built-in image_gen tool ONCE to GENERATE (not edit) a NEW image at
   size 1536×1024 (wide landscape), using the attached images as references and
   the IMAGE SPEC below as the prompt. Pass the spec faithfully.
2. Verify the output PNG is exactly 1536×1024. If not, regenerate with the size
   corrected (maximum 2 generation attempts total).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-2-r3.png
4. Print one line: GENERATED=<that absolute path>
5. Do NOT post-process, resize, crop, quantize, sharpen or color-correct the
   image. Do not edit repository files. Do not run other commands.

## IMAGE SPEC

Use case: stylized-concept.
Asset type: complete 2D pixel-art game environment master, desktop floor 2 of an underground market website route. This master will later be cut into modules (stalls with alpha, H-beams, tileable wall/floor, stair tile), so module boundaries must be surgically clean.

Primary request: one coherent authored pixel-art scene, rendered exactly like Image 3, of the underground market floor 2 (workshop/media): the Manual repair stall, the Console hacker nest and the Talks Video Club installed in rear bays, a complete industrial spiral stair on the left, and an open market lobby along the front.

Geometry (Image 1 is law):
- The black border is disposable matte: render it as perfectly flat solid #020307 with nothing on it. The scene fills the inner window edge to edge.
- The four red lines are camera rails: ceiling line, wall-to-floor contact, fascia top, underside. Render them as crisp horizontal architecture value-step edges, NEVER as red or colored lines.
- Grey vertical strips are riveted steel H-beams. EVERY stall has its own H-beam tight against EACH side: stair tile, gap, beam Manual beam, gap, beam Console beam, gap, beam Talks beam, margin. Two beams stand between adjacent stalls, separated by plain wall. Beams run ceiling to floor and never overlap stall pixels.
- The dark-blue vertical slots between beam pairs are pure wall/floor: no stall part, prop, sign, character or colored light may enter them. The Talks tape cart must sit fully inside the Talks bay, never toward Console.
- The tall left column is the stair tile: ONE COMPLETE self-contained industrial spiral stair, identical in design and proportions to the Floor 1 stair (Image 3's right side) but mirrored for the left edge: full drum/column, treads, ceiling aperture with reinforced collar, floor landing, worn threshold. Nothing clipped.
- Cream ticks with thin bars: exact roots and heights. Left bar: the floating Manual robot's hover envelope. Middle short bar: Ed seated. Right bar: standing adult clerk.

Scene: repaired maintenance and obsolete-media sector. Heavy beams, one continuous power/tool rail on the rear wall, patch panel, ventilation duct, service drops, oil stains and abrasion. Quiet large steel and concrete planes. Sealed underground interior: NO rain, NO drain, NO grate, NO water anywhere.

Subjects:
- Manual: a decommissioned EX-MILITARY floating service robot, now a courteous repair vendor. Elongated ovoid torso (taller than wide), plating painted rusty MILITARY GREEN with worn edges and rust bloom, decorated with restrained non-US-inspired military markings: a stencil band, small unit chevrons, one faded roundel. Exactly three connected eye stalks whose eyes read as CAMERA LENSES (dark objective rings, small aperture glints), exactly three connected articulated arms (duster, wrench under the lamp, open claw), downward thruster with visible hover gap. No legs, no pedestal, no wheels, no pole, no mount. It floats in a visibly DEEP rear aisle behind a substantial foreground counter that occludes the lower thruster: the wall behind the robot sits clearly farther back, darker. The stall reads METALLIC: steel panels, brass fittings, minimal wood. The counter front shows big size variance in complete junk: at least one LARGE salvaged module (engine block or gear assembly) among bins of gears, valves, bolts and cable ends. Ransom-note style lowercase "manual" sign hung on chains. One upper amber work lamp plus one small cool task glow at the wrench arm.
- Console: EXACTLY the Ed of Image 4: wild red hair, dark visor covering the eyes, white tank top, dark shorts, barefoot, cross-legged, hands resting near the ankles, small calm grin. NO laptop. He sits on the large ornate red-brown patterned rug from Image 4. Surround him even more densely than Image 4 with machinery and wires: stacked vintage racks and servers, two old monitors on top (one broken, one showing flat static), cardboard boxes (one filled with rocks), thick coiled cable spaghetti crossing the rug edge and returning, a power strip, pizza box, energy can. A very tall thin pole carries the lowercase "console" sign at its top — the sign shows ONLY the word console, no arrow. The bay is the DARKEST on the floor, lit by small warm screens, tiny status LEDs and one hanging bulb on a cable.
- Talks: the Video Club in a strictly FRONTAL deep recess: shallow soffit band, straight vertical side returns, no wedges, no convergence; the rear wall clearly darker than the counter plane. The counter is worn COLORED PLASTIC (cream/blue plastic panels with a hard plastic edge highlight), not wood. Seasoned deadpan woman clerk with braids and gold hoop earrings, cheek on one hand. On the counter: a small CRT showing vertical SMPTE color bars, a cardboard tape box, a service bell. Shelves packed with MULTICOLORED VHS spines (reds, blues, teals, ambers, purples), colorful unreadable poster rectangles on the rear wall. Top sign reads exactly "VIDEO CLUB" with a cool neon-lit edge (thin cyan-white neon tube outline as a light source). In front, fully inside the bay: the red wheeled tape bin, and the COMPLETE life-size cardboard standee of a suited man with support strut — entirely visible, nothing cropped.

Camera: exactly Image 2. Frontal shallow-oblique parallel projection: no vanishing point, no convergence, verticals vertical, horizontals horizontal, top planes shallow bands around 0.2, no isometric rotation, no deep ellipses.

Scale: guide bars exact. Clerk standing adult; Ed slim adult seated low; the Manual robot torso compact, clearly smaller than an adult, floating with its top near its bar top.

Style: EXACTLY the rendering of Image 3 — authored low-res pixel art on a strict 3×3 logical grid, large flat fields, three tones per material, strong near-black outlines, sparse hard highlights, quiet surfaces, detail on faces, camera-lens eyes, claws, screens, signs, inventory. Readable at 300px.

Palette: only these 64 colors: #020307 #080c12 #111923 #1c2731 #2b3741 #414c55 #606970 #898e8d #4b4236 #786852 #a38b69 #cfad7e #edd09c #1d100a #321a0f #4b2816 #6b391c #925022 #bd7133 #361015 #5c171c #882225 #b83932 #dd6048 #171221 #2a1e38 #443153 #674870 #966d94 #071421 #0a2942 #0d486d #126e9b #1f9cc8 #4bd2e1 #071c1d #0e3534 #165652 #267c73 #56b4a4 #10180e #1e2d14 #31461a #4b6220 #6b7e2d #95a247 #2e1723 #50283b #784159 #a95f77 #d68b9a #4a280d #7b4514 #ad6a1e #df9e32 #ffd26b #2f1915 #542b22 #80442f #ad6744 #d18d5a #efbd82 #ffe3a1 #8be9e7. Manual: military green built from #31461a #4b6220 #1e2d14 over steel #414c55/#606970 with rust #6b391c/#925022 and amber; Console: darkest ink/steel + cardboard + red hair #b83932/#dd6048 + warm screens; Talks: cream/blue plastic #cfad7e/#0d486d/#126e9b + colorful tape spines + skin ramp.

Lighting (the priority of this round):
- RULE: each stall's REAR plane is one to two value steps DARKER than its front plane and character. Console demonstrates the pattern; Manual and Talks must follow it too (deep dark aisle behind the robot; dark recess wall behind the clerk).
- Variety: Manual amber work lamp + small cool task glow; Console warm screens + status LEDs + hanging bulb, darkest bay; Talks warm pendant + SMPTE CRT glow + cool neon sign edge.
- Every source: tiny core, one hard receiver band, one weaker spill band, flat steps, compact contact shadow trending down-right.
- Every glow stays inside its own stall and flanking beams; nothing crosses the wall gaps; lobby dark except short rear-edge spill.
- No glow blur, bloom, halo, gradient, fog or translucent overlay.

Text (verbatim, and absolutely nothing else readable anywhere): "manual"; "console" (no arrow on the sign); "VIDEO CLUB". NO Up or Down signs, NO arrows, NO wayfinding anywhere, NO RETURN. Posters, terminals and labels stay unreadable marks.

Avoid: drains, grates, water; Up/Down arrows; a laptop in Console; wood-dominant Manual; robot with visible legs/pedestal/pole/wheels/mount or human-like eyes; US-flag or real-nation insignia; converging Video Club returns; wooden Talks counter; the tape cart outside the Talks bay; a cropped standee; antialiasing, gradients, blur, glow, bloom, painterly shading, microtexture, noise, mixed density; perspective convergence, isometric rotation, deep ellipses; stalls overlapping beams; props in wall gaps or lobby; clipped stairs or props; extra text, logos, watermarks; malformed anatomy.

Final self-check: 1) matte flat #020307; 2) rails as horizontal value steps, no red lines; 3) every stall flanked by its own two beams, two beams between stalls, clean edges; 4) wall gaps empty; 5) complete mirrored Floor-1-style stair inside the left tile; 6) elongated military-green camera-eyed floating robot behind metallic counter with one big salvaged module up front; 7) exact Image 4 Ed, no laptop, denser machinery and wires, tall arrowless console sign pole, darkest bay; 8) frontal plastic-counter Video Club with SMPTE CRT, colorful spines, complete standee and cart inside its bay; 9) all stall rears darker than fronts, lamp/task/screens/LEDs/bulb/pendant/CRT/neon variety, all causal and bounded; 10) only manual, console, VIDEO CLUB readable; rendering identical to Image 3.
