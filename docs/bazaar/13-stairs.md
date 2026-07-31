# 13 — the whole stairs thing

The stairs are the market's skeleton: they connect floors, they define
floor height, and they are the layout system's fixed point. Two assets,
two very different lives.

## Desktop S: the spiral drum

r15 canon: a caged spiral staircase, 480x955 art, ~15 treads, riser 48,
amber base strip. Approved in the first architecture batch and then
HAND-POLISHED by the user in place (public/images/bazaar4/arch/
stairs.png is a sacred file under the hand-polish law — the exporter
skip-existing guard exists because a rerun once clobbered it mid-polish).

Layout role: S = 324x597 su. FLOOR HEIGHT = S HEIGHT — the stairs' aspect
is never modified (spec rule 3); everything else derives from it. The
sprite mirrors with scaleX(-1) per floor so the platform exits always
face the stalls; the side is DOM order, not flex tricks (S last in the
floor = stairs right). Sides alternate R, L, R down the building.

Under 1200px viewports the stairs SLIDE OFFSCREEN progressively (a
clamp-ramp negative margin on their own side), reaching exactly HALF
their width at the 700px handoff — rule 2: stairs may crop to half, never
more. In regime A they live OUTSIDE the 1400px container, separated by
one equal gap, and crop against the viewport edge when the window
tightens. The crop ramp feeds back into the su formula so reclaimed
width grows stalls, not gaps.

## Mobile SM: one asset spanning two stories

Mobile floors stack two stories, and the mobile stairwell must span BOTH
— that is why SM is a distinct asset, not a scaled S. History:

- bazaar4's first mobile stairs: a caged stairwell shaft with a baked
  halfway exit deck + extended platform, approved first-shot via a
  pixel-box order with the r15 stairs as style authority. It also
  exposed a real CSS bug: Tailwind preflight img{max-width:100%}
  squashed the sprite 3.9x against a fixed height.
- The r23 probe era produced candidates B and C (trim aspects 0.440 /
  0.449, measured platform lines 46.6% / 49.9%) with a side-by-side gate
  page. The gate closed on B2: a refined B with a drum base and plaque
  (public/images/bazaar4/arch/sm.png, keyed 705x1518).
- ART WINS, LAYOUT BENDS: the SM asset carries exactly two knobs into
  CSS: --sm-ar (trim aspect, 0.464 measured) and --sm-split (the deck
  walk line as a fraction, 0.497 measured mechanically as the densest
  wide band beyond the cage). The story divider sits AT the art's deck
  line, so the platform in the drawing is the platform in the layout.

Mobile layout role: floor height = min(SM height, 100vh) with SM
targeting 75svh; the two stalls share ONE width so all four gaps of the
floor equalize by construction; SM slides offscreen on a viewport ramp
AND on stall demand, capped at half its width; SM mirrors per floor
(R, L, R, L) so the deck exits face the stalls.

## Why stairs anchor everything

Three separate systems agree to treat the stairs as truth: the asset
pipeline (stairs got their own orders and the strictest aspect
discipline), the layout system (floor height and VSTAR derive from S's
597 su; the mobile split derives from SM's painted deck), and the
editor (stairs are editable targets with their own hitboxes, and su
itself is measured live as floor-height/597 — which is S again).
When one sprite defines the coordinate system, polish it by hand and
guard it by law.
