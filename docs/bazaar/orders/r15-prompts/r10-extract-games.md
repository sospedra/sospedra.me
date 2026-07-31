# Codex order — r10 — Games stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Games bay crop from the approved Floor 3 master,
1536×1024, content roughly x553–983, y213–810. Image 1 is the ONLY source of
truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-stall-games.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Games stall from Image 1 as one isolated sprite on flat chroma
magenta. This is a COPY task, not a design task: every element keeps its
position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Coordinates below are Image 1 canvas coordinates;
keep the same arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — the sign, its hanging wire, and the whole
christmas light string with every bulb are part of the asset.

Element inventory (all from Image 1):
1. Sign, x≈625–775 y≈220–285: rough plank with lowercase "games" in
   mismatched kid-painted letters (orange g, blue a, red m, orange e, blue
   s), hung from a wire; the christmas light string wraps the sign and runs
   right along the top to x≈880 — small red, green, amber and cyan bulbs,
   each with a small flat glow dot of its own color on the wood nearby.
2. Arcade cabinet, left, x≈625–730 y≈310–560: blue body; marquee with an
   orange zigzag mark; screen showing a very low-poly fighting-game intro —
   two blocky tan fighters facing off on a blue field, unreadable title
   marks; red buttons and a joystick on the control panel; dark base. The
   screen casts a faint flat cyan step on the sister's near side.
3. Rear wall of dark brown wood planks (part of the stall's own structure,
   x≈620–950 y≈290–600).
4. Shelf unit, right, x≈820–930 y≈330–500: wooden shelves holding a grey
   console and dark box on top, a tan retro console mid, and a row of
   red/orange cartridge spines below.
5. The sister, x≈730–800 y≈385–635: taller, brown ponytail, dusty-blue
   hoodie, dark shorts, blue-and-white sneakers; she holds the dark handheld
   in BOTH hands at chest height, looking down at it with a slight smile.
   The handheld's screen casts a faint cool step on both children's faces
   and chests.
6. The brother, x≈790–850 y≈420–640: smaller, black hair, red-and-cream
   striped tee, blue shorts, red-and-cream sneakers; he stands beside her
   watching the same handheld, serious and protective. The two children
   SHARE one handheld — neither touches the arcade.
7. Left crates, x≈595–745 y≈575–710: a red inner crate full of dark
   cartridges sitting in a blue crate, a second blue crate below-left with
   tapes, and a small tan box at x≈700–745 y≈645–700.
8. Right bins, x≈860–945 y≈530–710: a blue bin of coiled dark cables, and
   below it a second blue bin with a grey controller and a red-ball
   joystick.
9. The wooden floor, y≈600–720: a single-level warm brown plank platform
   spanning the stall, its top drawn at the shallow gospel angle, with a
   front edge board at y≈700–720 and a dark shadow band under the edge. The
   children's feet and all crates sit ON this floor with exact contacts.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

EXCLUDE: the riveted H-beam columns at both edges, the dark bay backdrop
beyond the stall's own wood wall, the concrete lobby floor, the neighboring
bays. The asset floats on chroma, ending at the wood floor's front edge.

Background: one perfectly flat solid #ff00ff everywhere around the asset. No
shadows, no reflections, no glow spill, no texture. #ff00ff appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "games" on the sign. The arcade marquee, screen and cartridge
labels stay unreadable marks.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) sign reads exactly
games with the light string wrapped around it and real glow dots; 3) the
sister holds the one handheld, the brother watches it, neither touches the
arcade; 4) low-poly two-fighter intro on the arcade screen; 5) single-level
wood floor with front edge and under-shadow, everything standing on it;
6) no beam, backdrop or concrete floor; 7) flat #ff00ff background, no
spill; 8) 1536×1024.
