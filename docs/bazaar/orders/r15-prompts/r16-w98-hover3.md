# Codex order — r16 — w98 — hover frame 3, held (frame 5/5)

You are an image-generation subagent. Execute exactly this and nothing else.

Attached:
- Image 1 = the generated w98 hover frame 2 and THE EDIT TARGET. It is
  the authority for every pixel outside THE MOTION below.
- Image 2 = the w98 static master (idle frame 1): identity and
  resting-pose reference.

Steps: call image_gen ONCE in EDIT mode with Image 1 as the edit
target, output size 1536×1024. Verify size; retry once if wrong. Copy
the result unmodified to exactly
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r16/gen-w98-hover3.png
then print GENERATED=<that path>. No post-processing, no repo edits.

## FRAME LAW — absolute

This is frame 5 of 5 — the HELD hover frame: it stays on screen while
hover/focus remains, so it must read proud and stable. Image 1 is law
for every pixel outside the declared motion.

- Canvas 1536×1024, flat chroma magenta #ff00ff background, art exactly
  where Image 1 has it. No translation, no rescale, no crop change.
- Reproduce Image 1 pixel-for-pixel everywhere except THE MOTION:
  same "w98" sign, posts, string bulbs, red lamp, shelf towers, every
  other pot/plant, tools, barrel, bucket, spilled pot + soil,
  outlines, colors, lighting and glow shapes.
- The robot's two feet keep their exact ground contacts. The torso
  never translates left or right. Nothing rescales.
- No lighting or brightness change anywhere. Every string bulb and
  the red lamp stay byte-frozen.
- ZERO new colors: every pixel value must already occur in Image 1
  or Image 2.
- The spider creature stays byte-frozen. The bottom-left creature
  keeps Image 1's tilted antennae exactly.

## THE MOTION — the only change

The sprout reveal — the payoff frame:

1. The free gripper rises 8-10 px from the foliage, opening upward in
   a gentle "behold" gesture above the seedling pot.
2. In the parted gap of THAT plant, a NEW SPROUT becomes visible: a
   3-4 px stem with two small leaves and one pink bud tip. Draw it
   ONLY with hexes already present (plant greens + the pink of the
   shelf flowers). The sprout lives inside the pot's foliage
   silhouette plus at most 4 px above it.
3. The parted leaf clusters stay parted exactly as Image 1 — the
   sprout appears in the existing gap.
4. The head tips to a gentle, attentive angle toward the camera
   (1-2 px inside the head box). Proud gardener.
5. Watering-can arm, can, torso, legs, both creatures: byte-identical
   to Image 1. Seed-fall column stays empty.

The changed region is confined to: free gripper/forearm, the sprout
pixels in the leaf gap, 1-2 px of head angle.

## FREEZE CHECK — explicitly unchanged

"w98" sign + post + hardware, string bulbs + wire, red lamp, both
shelf towers and every pot/plant on them, hanging vines, garden
tools, barrel, bucket, tipped pot + soil, the seedling pot body and
its parted leaves, watering can + arm, robot torso/apron/legs/feet,
both creatures, chroma field.

## SELF-CHECK before returning

1) Difference vs Image 1 is confined to gripper/forearm, the sprout,
   and ≤2 px of head angle.
2) The sprout uses only existing hexes and stays in the leaf gap.
3) Feet contacts and torso x unchanged.
4) No new hexes; no lighting or glow change anywhere.
5) 1536×1024; clean #ff00ff chroma field.
