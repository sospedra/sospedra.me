# 16 — the human craft outside the pipeline

The AI pipeline (doc 02) generates; it does not design, and it does not
finish. Four kinds of human work bracket everything the models did, and
the blog undersells the project if it skips them.

## 1. Pen and paper first

The bazaar started as pen-and-paper sketches: the vertical market, the
street entry, stall compositions, where characters sit and what they
hold. The sketches predate every prompt. The pipeline never invented a
composition; it EXECUTED compositions that already existed on paper,
translated into zone contracts, pixel boxes, and drawn plans. The
composition blueprints and plan diagrams (assets/composition*.png) are
the digitized descendants of those sketches — the drawing was always the
source of authority, which is exactly why drawn law beats written law
inside the pipeline too.

## 2. The design language

The bazaar is not a themed island; it anchors a site-wide design
language — the midnight neon futuristic city (the working branch is
literally named midnight-io-design-system). The direction work:

- Define the vibe ONCE: midnight blacks, neon accents, rust and steel,
  pixel discipline. The bazaar is its loudest expression; the rest of
  the site keeps the same night in quieter dialects (the home skyglow,
  the papers navy reading band, per-route art direction that departs
  boldly but never leaves the city).
- Consistency rules flow FROM the bazaar OUT: the same car sprite on
  the home bridge and the market street, the bus loop, shared sound
  discipline, the pixel-rendering rules. Route theming is allowed to
  vary the palette; the world stays one city at night.
- This is classic art-direction labor: deciding what is canon, what is
  dialect, and what is forbidden — none of it delegable to a model.

## 3. Affinity cleanup and hand-repainting

Nearly every shipped asset passed through human hands in Affinity after
keying. The work ranged from cleanup to outright regeneration of sprite
regions:

- Edge repair after chroma keying (diffusion edges are never clean at
  sprite scale), stray-pixel scrubbing, palette snapping where the
  clamps leaked.
- ANIMATION surgery especially: layered frames demand pixel-exact
  registration and consistent limbs across frames; entire parts of
  sprites were repainted by hand where chained diffusion drifted.
- Documented in-place polish (the hand-polish law exists because of
  it): arch/stairs.png, w98/char-f1.png, w98/char-h1.png reworked
  directly in public/images/bazaar4/, plus the r20 console master
  tweaked between rounds. The law that no script may overwrite
  public/images/bazaar4/** encodes a workflow truth: the generated
  file is a draft; the polished file is the asset.
- The honest division of labor: the model produces 90% of the pixels
  in seconds; the human produces the 10% that makes them shippable,
  and that 10% is the slow part.

## 4. CSS as the second art medium

The deliberate choice: light, atmosphere, and motion cues live in CSS,
not in more sprites (doc 07 has the technical inventory). The craft
framing matters:

- Shadows (contact ellipses, separator falloff), glows (stall tint
  washes, sign halos, editor-placed radial spots including black
  multiply pools), reflections (the CD building's wall wash masked
  through its own alpha), ambient (skyline haze, alley shade, floor
  dimming by attention) — all hand-tuned stylesheet work.
- Why CSS instead of sprites: it survives relayouts, it responds to
  interaction (hover light, focus glow), it costs zero image bytes,
  and it can be iterated in devtools at taste speed instead of
  regeneration speed.
- The rule that emerged: BAKED light belongs to the art's story (a lit
  CRT, a neon reflection on a wall the story owns); PROJECTED light
  belongs to the page (anything that moves, responds, or repositions).
  Drawing that boundary per effect is design work, done by hand, once
  per effect.

## The thesis this doc feeds

"AI-generated" describes the pixels' origin, not the work. The human
work is the frame around every generation: the sketch before, the
design language above, the Affinity pass after, and the CSS layer
beside. The pipeline made the volume feasible; the craft made it good.
