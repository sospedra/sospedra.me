# Codex order — r8 — extract the Papers stall from Floor 1

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Papers stall crop from the approved-direction Floor 1
master (with beams and surroundings as context).

Steps: call image_gen ONCE to GENERATE (not edit) a NEW image at size
1536×1024 (wide landscape), spec below. Verify the size; retry once if wrong.
Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r8/gen-stall-papers.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Use case: stylized-concept. Asset: one isolated game-asset stall sprite for
chroma keying.

Redo the Papers archive kiosk from Image 1 as ONE isolated asset. Keep the
EXACT same layout, structure, silhouette, proportions and pose as Image 1 —
the same teal kiosk spanning its full width, scalloped cream/teal awning with
lowercase "papers" lettering, interior shelves with cream books and tied
paper bundles washed slightly blue, the hologram archivist rising from a
hidden floor projector (glasses, composed, physical open book at chest
height, hard cyan scanline steps, NO lower body below the counter line, NO
projector pad), the warm shelf strip, the A-frame pamphlet rack and the
wheeled display rack with their floor contacts, and the kiosk's own base.
Simplified in rendering, NOT in layout.

Rendering: flatter colors — large single-color fields, at most three tones
per material; strong continuous near-black outlines; chunky 16-bit-inspired
shading on a strict 3×3 logical pixel grid; sparse hard highlights; zero
texture noise, zero antialiasing, zero gradients, zero soft glow. The
hologram stays hard cyan steps with a few bounded square fragments; its blue
interior wash stays as one flat step on the kiosk's own surfaces only.

Isolation: include ONLY the kiosk, its racks and its base. EXCLUDE the
H-beams, the background wall, the lobby floor, wayfinding, and anything from
neighboring bays. Nothing may be cut off: the complete silhouette floats on
the background with generous padding on all four sides.

Background: the ENTIRE background is one perfectly flat solid chroma magenta
#ff00ff. No gradients, no shadows, no reflections, no glow spill, no texture
on the background. The color #ff00ff must not appear anywhere in the art
itself. Crisp hard edges between art and chroma.

Text: only "papers". Nothing else readable.

Self-check: 1) same layout and pose as Image 1; 2) flat chunky three-tone
rendering, strong outlines; 3) no beams, wall or floor included; 4) perfectly
flat #ff00ff background with no spill or shadow; 5) complete silhouette,
generous padding, 1536×1024.
