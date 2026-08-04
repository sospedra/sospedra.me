# Codex order — r16 — w98 — hover frame 2 (frame 4/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated w98 hover frame 1 and THE EDIT TARGET. It is
  the authority for every pixel outside THE MOTION below.
- Image 2 = the w98 static master (idle frame 1): identity and
  resting-pose reference.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-w98-hover2.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 4 of 5 of an in-place animation (second hover frame). At
runtime the frames swap on the same CSS box. Image 1 is law for every
pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "w98" sign, posts, string bulbs, red lamp, shelf towers, every
  other pot/plant, tools, barrel, bucket, spilled pot + soil,
  outlines, colors, lighting and glow shapes.
- The robot's two feet keep their exact ground contacts. The torso
  never translates left or right; it may lean forward only by
  articulation at the hip, a few px. Nothing rescales.
- No lighting or brightness change anywhere. Every string bulb and
  the red lamp stay byte-frozen.
- ZERO new colors: every pixel value must already occur in Image 1.
- The spider creature stays byte-frozen.

## THE MOTION — the only change

The free gripper parts the seedling's leaves:

1. The free (sprinkle) arm lowers so its gripper reaches into the
   seedling pot's plant — the fat terracotta pot in front of the
   robot. Elbow and shoulder articulate; the shoulder root is fixed.
2. THAT PLANT ONLY redraws: two or three leaf clusters part sideways,
   spread by the gripper, using the plant's existing greens. The pot
   body does not move.
3. The head keeps Image 1's toward-camera angle, gaze angled down at
   the pot this frame.
4. The bottom-left creature gives ONE small masked response: its two
   pink antennae tilt ~2 px toward the robot. Eyes, body, mouth
   unchanged.
5. Watering-can arm, can, apron, legs: byte-identical to Image 1.
   The seed-fall column stays empty.

The changed region is confined to: free arm/gripper, the seedling
pot's foliage, ≤2 px of creature antennae, small gaze change inside
the head box.

## FREEZE CHECK — explicitly unchanged

"w98" sign + post + hardware, string bulbs + wire, red lamp, both
shelf towers and every pot/plant on them, hanging vines, garden
tools, barrel, bucket, tipped pot + soil, the seedling POT BODY,
watering can + its arm, robot torso/apron/legs/feet, creature body +
eyes, spider creature, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to the free arm, the seedling
   foliage, the antennae and the gaze.
2) Every other plant, pot and bulb matches Image 1 to the pixel.
3) Feet contacts fixed; torso x unchanged; shoulder root unmoved.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
