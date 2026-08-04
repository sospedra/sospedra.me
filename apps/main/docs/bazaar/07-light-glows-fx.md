# 07 — light, glows, reflections

Two light systems coexist: BAKED light inside the sprites (what the
model paints) and PROJECTED light as CSS (what the page adds). The
boundary between them is a doctrine.

## The baked side: the causal light law

Every stall order carries a LIGHT LAW naming the single source and its
receivers: "the ONE lit CRT shows white-grey static and throws one flat
pale receiver band toward Ed and one small pool on the slab. Rack LEDs
give thin dots only. Nothing else emits." Receivers are ENUMERATED
(counted candle receivers on travel; per-floor light-map JSONs with
source coords + receiver rects in the floor-master era). Uncounted light
is how diffusion invents lamps.

The LAMP rule for props: the emitter is lit (bulb bright, banded halo
hugging the glass) but NO projected light in the sprite — projection is
CSS's job. When a sampled palette lacks bright hexes, relighting fails;
append emission ramps to the palette.

## The projected side: CSS light

- GLOW SPOTS: radial-gradient divs placed by the editor, seven colors +
  BLACK (mix-blend-mode: multiply) used as paintable shadow pools; all
  others screen-blend. ~30 baked into bazaar4's decor manifest.
- SIGN GLOWS: the up/down wayfinding signs and the street neon each get a
  ::before radial matched to the asset's own light color, synced to the
  same animation as the sprite swap (flicker on hover, blink on the
  street sign).
- NEON BLINK RHYTHM: the street BAZAAR sign runs an 8s steps() keyframe
  with TWO stutter clusters (25-36% and 62-75%) — the user tuned the
  DELAY between blinks, not the speed; motion frequency reads as life.
- GLOW WASH: every stall has a hover wash (radial in the stall's tint,
  screen blend) plus brightness(1.12) saturate(1.12) on the sprite stack.
  Hover light is runtime, never baked into hover frames.
- CONTACT SHADOWS: an ellipse radial under every stall grounds it on the
  walkway; the separator bands cast box-shadows both ways and blur
  slightly (soft focus = nearer than the floors).
- STREET AMBIENCE: skyline base haze (pink/blue screen-blend gradient),
  alley shade (near-black vertical gradient), alley glow, the CD
  building's right wall darkened through its own alpha mask (a
  linear-gradient clipped by mask-image of the building PNG — cheap
  ambient occlusion).
- REFLECTION note: the magenta side-wall glow on building CD (neon
  bouncing off the alley wall) is BAKED into the street art by order
  ("magenta side-wall glow mandatory") — reflections that belong to the
  art's story are baked; reflections that respond to interaction are CSS.

## The fx loops (animated light)

r17 effect layers run infinite loops with per-frame ms timing: CRT
static (white-grey bands), steam, SMPTE roll, arcade attract cycle,
candle flames phase-offset so they never sync, water pour. The papers
hologram flickers as a GROUP (a wrapper div with the keyframe animation;
animating the frame imgs directly overrode the opacity-based frame
switching — a real bug, shipped fix).

## The holo/CRT vocabulary

Screens are the market's light animals: one lit screen per stall
maximum, white-grey always. Dead screens get exactly one flat diagonal
glare band. The discipline exists because glow is the easiest thing for
diffusion to overdo, and one overdone screen makes a stall look like a
slot machine.
