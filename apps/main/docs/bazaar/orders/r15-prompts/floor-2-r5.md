# Codex subagent order — Bazaar 3 Floor 2 master (round 5: style repair + integration)

You are an image-generation subagent. Execute exactly this task and nothing else.

The attached images are, in order:

- Image 1: EDIT TARGET — the round-4 Floor 2 master.
- Image 2: STYLE AND STAIR CANON — the round-4 Floor 1 master. Its chunky flat rendering and its spiral stair are the standard this floor must match.
- Image 3: geometry guide v2 (bay boundaries and stall footprints).

Steps:

1. Call your built-in image_gen tool ONCE in EDIT mode with Image 1 as the edit
   target, at size 1536×1024 (wide landscape), using the EDIT SPEC below.
2. Verify the output PNG is exactly 1536×1024. If not, retry (max 2 attempts).
3. Copy the final PNG unmodified to exactly:
   /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/candidates/floor-2-r5.png
4. Print one line: GENERATED=<that absolute path>
5. No post-processing. No repository edits. No other commands.

## EDIT SPEC

THE SINGLE MOST IMPORTANT RULE: one consistent rendering style across the whole
floor, identical to Image 2 — chunky flat pixel art, large single-color
fields, at most three tones per material, strong near-black outlines, no dense
microdetail, no muddy grey noise. Every correction below must land in exactly
that style.

Keep the overall composition, camera, beam pairs, signs and identities of
Image 1. Apply these corrections:

1. Manual bay style repair (the bay currently breaks the floor's style):
   re-render the ENTIRE Manual bay in the Image 2 style. The parts wall behind
   the robot becomes a few large readable shapes (big panels, a shelf of large
   tools, one poster-sized schematic board) instead of dense grey microdetail.
   The robot keeps its exact design (elongated military-green ex-military
   torso, stencil chevron, three camera-lens eye stalks, three arms with
   duster/wrench/claw, hover gap, task lamp) but rendered in big flat fields.
   The counter and bins gain COLOR: brass gears, copper coils, red valves,
   blue cable ends, amber jars, plus the one large salvaged engine module.
   Fewer, bigger, colorful junk pieces beat many grey ones.
2. Console integration: move Ed and his ornate rug DEEPER into the bay — he
   sits clearly behind the stall front line, smaller and higher in frame, with
   ALL clutter (boxes, cable coils, pizza, power strip, rock box) inside the
   stall footprint; nothing touches the lobby floor. Light him causally: warm
   screen glow and the hanging bulb put visible flat receivers on his hair
   rim, visor edge, shoulders, knees and the rug edge, with a compact contact
   shadow under him. The bay stays the darkest on the floor, but Ed reads as
   sitting inside its light, not pasted on top.
3. Video Club neon: the neon VIDEO CLUB sign casts a visible cool glow
   DOWNWARD — a hard flat cyan receiver band on the recess top edge directly
   below the sign and a faint cool rim on the upper shelf line. Flat steps
   only, no soft gradient.
4. REMOVE the cardboard standee entirely. Plain floor where it stood; a small
   stack of two or three tapes may replace it. The tape cart stays.
5. Stairs: re-render the left stair tile to match Image 2's stair exactly,
   mirrored — same drum design, same tread contrast, same aperture and
   landing, clean and readable, nothing muddy.

Everything else is immutable: manual/console/VIDEO CLUB signs (console sign
arrowless on its tall pole), beam pairs, clerk with cheek on hand, SMPTE CRT,
plastic counter, colorful tape spines, work lamp and task glow, rear planes
darker than fronts, flat #020307 matte, no arrows, no drains, no new text.
