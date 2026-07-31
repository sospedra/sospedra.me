# Codex order — r10 — Travel stall extraction, maximum verbosity

You are an image-generation subagent. Execute exactly this and nothing else.

Attached: Image 1 = the Travel bay crop from the approved Floor 3 master,
1536×1024, content roughly x583–953, y213–810. Image 1 is the ONLY source of
truth for every color and every shape.

Steps: call image_gen ONCE to GENERATE a NEW image at size 1536×1024. Verify
size; retry once if wrong. Copy the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r10/gen-stall-travel.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## IMAGE SPEC

Reproduce the Travel booth from Image 1 as one isolated sprite on flat
chroma magenta. This is a COPY task, not a design task: every element keeps
its position, size, silhouette and colors from Image 1. Sample every color
directly from Image 1. Coordinates below are Image 1 canvas coordinates;
keep the same arrangement, centered, with padding on all sides.

TOP PARTS ARE STALL, NOT WALL — the tarp marquee and the triangular sign are
part of the asset. And one repair: Image 1 clips the sign's apex at the
canvas edge; in your output the triangle is COMPLETE, its apex fully
visible, nothing cut.

Element inventory (all from Image 1):
1. Triangular sign, complete, centered around x≈680–870 y≈205–290: a
   repainted road-sign triangle pointing UP — cream border band, dark navy
   night-sky inner triangle with a tiny orange rocket dome and small stars,
   and across the lower cream band the words "Travel Ventures" in clean dark
   capitals-and-lowercase. Polished compared to the other signs. Complete
   the apex plausibly in the same style.
2. Tarp marquee behind the sign, x≈600–940 y≈215–255: olive/khaki military
   canvas band stretched across the booth top, with strap and grommet marks.
3. Booth structure: corrugated white-ish rust-streaked metal panels framed
   by dark wood posts; visible side returns left and right; the interior
   rear wall is dark navy with faint star-chart lines. Strong value
   contrast: rear wall two steps darker than the counter front.
4. Rear wall items: a row of three cream route cards with planet marks
   (ringed planet, red planet, cratered moon) at x≈680–810 y≈310–360; a
   brass diving-bell helmet hanging at x≈840–900 y≈305–365; a BANJO hanging
   below the helmet at x≈815–870 y≈430–530 — round pale body, long dark
   neck — darkened like everything on the rear wall.
5. LAST SEATS board: small cream board with dark capitals "LAST SEATS",
   hung at x≈640–690 y≈365–405.
6. The agent, x≈680–820 y≈390–590: adult Hearthian, blue-grey skin, exactly
   FOUR amber eyes in two pairs, long pointed side ears, SMILING and
   welcoming; RED fighter-jet-style vest with a wing patch and a round
   badge over a tan flight-suit; dark gloves; his left hand raised holding a
   tan ticket with unreadable stamps, his right glove resting flat on the
   counter.
7. Candles: two cream candles with small flame cores on a brass dish at the
   counter's left end, x≈615–665 y≈510–580; and a pair of candles on the
   right shelf ledge, x≈885–925 y≈460–520. Their warm receivers land as
   hard flat steps on the agent's vest front, the counter top and the LAST
   SEATS board edge, exactly as Image 1.
8. The radar, x≈840–940 y≈530–620, seated firmly on the right counter wing:
   brass-and-wood signalscope box with a round GREEN CRT scope — sweep
   wedge, tiny blips, faint ring lines — and a small antenna; its green
   glow lies flat on the counter beside it.
9. Counter, x≈600–950 y≈560–760: wood plank top with the lower right wing;
   corrugated panel front framed in wood.
10. Queue posts in FRONT of the counter, x≈755–950 y≈630–760: three brass
    posts with a red velvet rope sagging between them, exact floor
    contacts.
11. Luggage trunk, front left, x≈610–730 y≈640–760: brown chest with brass
    corners and a winged emblem, complete, with its contact shadow.

Style: exactly Image 1's rendering — chunky flat pixel art on a strict 3×3
logical grid, large single-color fields, at most three tones per material,
strong continuous near-black outlines, sparse hard highlights, zero noise,
zero antialiasing, zero gradients, zero soft glow.

EXCLUDE: the riveted H-beam columns at the edges, anything beyond the
booth's own side returns, the concrete lobby floor, the neighboring bays.
The asset floats on chroma with only its own base contacts.

Background: one perfectly flat solid #ff00ff everywhere around the asset. No
shadows, no reflections, no glow spill, no texture. #ff00ff appears nowhere
in the art. Crisp edges, generous padding, nothing touching the canvas
border.

Text: only "Travel Ventures" on the sign band and "LAST SEATS" on the small
board. Ticket stamps and route cards stay unreadable marks.

Self-check before returning: 1) side-by-side with Image 1: every numbered
element present, same relative position, same colors; 2) the triangle sign
is complete with its apex, reading exactly Travel Ventures; 3) the agent
smiles, four paired amber eyes, red vest, ticket raised; 4) banjo below the
helmet, both darkened; 5) radar seated with green scope and flat green
glow; 6) candles with warm receivers; 7) no beam, no concrete floor; 8) flat
#ff00ff background, no spill; 9) 1536×1024.
