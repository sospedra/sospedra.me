# Projects stall v2

## Generation prompt

Use case: stylized-concept

Asset type: production sprite for the existing Bazaar 2D pixel-art game

Primary request: Generate exactly ONE standalone PNG depicting a free-standing,
ROOFLESS, overgrown garden shop named “projects”, designed to sit naturally
beside the two supplied Bazaar stall references.

### Reference roles

- Image 1 (Uses stall): style and world reference. Match its chunky
  low-resolution pixels, heavy near-black outlines, worn practical materials,
  warm pockets of light, convincing construction, dense but readable props,
  and strong shared ground contact.
- Image 2 (Games stall): style and composition reference. Match its
  asymmetrical hand-built structure, irregular silhouette, deep dark interior,
  rope-hung bulbs, simple readable character shapes, wooden floor/base, and
  grounded overlapping foreground bins.
- Do not copy either stall’s characters, products, colors, or exact layout.
  Create a new garden shop in the same world.

### Design thesis

This is a real shop installed in the Bazaar, not a character portrait
surrounded by plants. The shop structure is the primary silhouette. The robot
gardener is a secondary working shopkeeper embedded inside it through overlap,
shared shadows, shared lighting, and shared materials. Nothing should look like
a separate sticker.

### Canvas and pixel system

- Final canvas exactly 960 × 1264 px, portrait.
- Conceptual authored grid: 320 × 421, displayed at 3× nearest-neighbor. Every
  visible art pixel reads as a crisp 3×3 block; no finer detail, antialiasing,
  gradients, or painterly texture.
- Perfectly flat pure `#ff00ff` magenta chroma-key background on all four sides
  and visible through every open gap. No shadow, texture, glow, floor plane, or
  variation in the magenta.
- Never use magenta or hot pink inside the shop artwork.

### Composition and silhouette

- A broad, stable, free-standing market stall occupying roughly x=55–910 and
  y=55–1232, with generous magenta around it.
- Absolutely NO roof, canopy, glass, greenhouse, arch, ceiling, or roof
  surface. The top is open air.
- Two uneven rusted iron posts and vine-covered shelf uprights form a ragged,
  plant-broken top silhouette. Magenta sky shows clearly between foliage
  crowns, posts, rope, and bulbs.
- One rope string with 9–11 small warm bulbs sags between the posts.
- Left and right shelf-trellis wings create a dark open central work bay. The
  back trellis is visible through the bay and falls to near-black.
- Give the stall a coherent shared base: warped plank floor, low iron rail,
  soil-dark contact band, and a broad compact contact shadow. The base must feel
  as solid and grounded as the Uses and Games references.
- Foreground pots, seed trays, a tipped watering bucket, and chunky foliage
  overlap the lower base at both sides. Avoid loose floating debris outside the
  main footprint.

### Sign

- One chipped wooden sign hangs by rope from the upper-left post, slightly
  askew.
- Render exactly the lowercase word “projects” in large worn cream-white pixel
  lettering. Spell it correctly. No other readable text anywhere.
- The sign belongs to the structure and overlaps the post and foliage; it must
  not float separately.

### Structure and merchandising

- Rusted riveted iron posts, warped dark wood shelves, rope lashings, one
  pulley, terracotta pots, seed trays, soil barrel, and a compact tool rack with
  shears, trowel, and hand rake.
- Chunky plant clusters only: broad monstera-like leaves, blunt hanging vines,
  thick moss patches, and compact alien blooms in muted violet or dusty rose.
  No fine fronds.
- Use depth layers: bright foreground merchandise and workbench; darker side
  shelving; near-black back trellis. Different layers overlap and use staggered
  ground contacts rather than sharing one flat baseline.

### Robot gardener

- Keep the idea of a slim mechanical gardener, but do NOT make a centered
  full-body robot portrait, beige skeleton, armor suit, mannequin, or isolated
  mascot.
- Place the robot in the central work bay, about 42% of total stall height. It
  has a compact rectangular head with two round lens eyes (one dimmer), a tiny
  bent antenna, narrow dark-olive segmented torso, exposed piston forearms,
  cable joints, and oversized three-finger grippers.
- Materials match the stall: dark weathered olive-gray steel, rusted joints,
  black-blue recesses, small brass fasteners, moss on one shoulder, and a worn
  brown canvas apron with pockets. Low saturation; no pale cream body.
- Pose is asymmetrical and gentle: stooped over a waist-high potting bench, one
  gripper steadying a seedling while the other tips a dented watering can. Head
  tilted toward the plant.
- REQUIRED INTEGRATION: the potting bench overlaps the robot from the waist
  down; pots and tools obscure parts of both legs; one vine crosses the apron
  edge or forearm; hanging leaves overlap one shoulder; the robot receives the
  same warm bulb light and deep ambient shadow as the surrounding shelves. Its
  feet are not displayed as a clean isolated pair. Preserve readability through
  value grouping, not an empty outline around it.

### Alien creatures

- Two small unmistakably alien animals, quiet and partly nestled into the shop
  rather than posed as mascots.
- Right upper shelf: a dozing six-limbed indigo creature with three small amber
  eyes in a vertical row, moss on its back, and a curled tail ending in one
  muted dusty-rose glow dot. Partly hidden by leaves.
- Lower-left pot cluster: a palm-sized round four-legged creature with short
  translucent-looking dorsal fins, two feather antennae, and a dim dusty-rose
  belly glow. Partly behind a cracked pot.
- No Earth-animal anatomy, fur, cat/dog/sloth/bird resemblance, or cages.

### Camera and light

- Frontal oblique top-down RPG view, parallel projection. Vertical faces are
  straight-on; horizontal shelf, bench, pot-rim, and floor tops are shallow
  flat bands, never ellipses. No vanishing point or isometric diamond geometry.
- Exactly three practical light families: warm string bulbs as the dominant
  light; one dim violet seed lamp deep in the back trellis; one tiny dusty-rose
  belly/tail glow from the creatures.
- Match the Uses/Games references: hard-edged flat light pools, near-black
  recesses, strong contact shadows, and no soft airbrushed lighting.

### Palette and rendering

- Chunky 16-bit pixel art, approximately 30 colors, hard three-tone ramps per
  material, sparse checker dithering only in deep shadow, and strong near-black
  outline hierarchy.
- About 55% rusted iron, warped brown wood, dark soil, and black-blue depth;
  45% deep desaturated yellow-green foliage, olive robot metal, warm amber
  bulbs, muted violet, and dusty-rose accents.
- Foliage greens must be dark, muted, and yellow-biased, never close to chroma
  green.
- Warm decay, alive and heavily used. Nothing pristine.

### Avoid

Any roof or greenhouse; glass; a floating or isolated robot; centered
character-poster composition; clean empty contour around the robot; bulky
armor; pale beige skeleton robot; symmetrical pose; mascot-like animals; fine
foliage; illustration-grade microdetail; antialiasing; gradients; glossy
materials; depthless façade; loose objects floating beyond the base; magenta
inside the art; green spill; readable text besides “projects”; extra
characters; watermarks.

### Final check

One PNG only; exact portrait canvas; flat `#ff00ff` on all sides and through the
roofless gaps; broad grounded base; irregular open top; sign says exactly
“projects”; stall architecture dominates; robot is slim, dark, stooped,
working, partially occluded, and lit by the stall; two small alien creatures
remain secondary; no roof, glass, or greenhouse; pixel blocks remain crisp.

## Targeted correction prompt

Change ONLY the small creature in the lower-left foreground. Preserve every
other pixel-art subject, structure, robot, plant, prop, sign, light, color,
composition, scale, and the flat magenta background.

Replace the lower-left mouse-like creature with an unmistakably alien,
palm-sized garden creature: a low round body with FOUR short equal legs, NO
ears, NO mammal muzzle, NO whiskers, NO tail, NO fur, and NO rodent silhouette.
Give it three short translucent-looking dorsal fins arranged along its back,
two thin feather-like antennae emerging from its forehead, two tiny
asymmetrical black eyes, and a softly glowing muted dusty-rose belly patch.
Partly hide it behind the same cracked pot and foreground plant tray so it
remains a secondary environmental detail.

Maintain the exact chunky low-resolution pixel style, hard near-black outlines,
three-tone material ramps, existing perspective, existing occlusion, and flat
`#ff00ff` chroma-key field. Do not alter the upper-right three-eyed creature. Do
not add or remove anything else. No antialiasing, gradients, extra text, or
watermark.
