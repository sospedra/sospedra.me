# Master-first production and verification workflow

This workflow is the latest user decision. It supersedes older instructions
that said not to generate all stalls in one full-floor design.

## Purpose of a floor master

A floor master is a complete visual blueprint for:

- composition;
- camera;
- common scale;
- depth;
- palette relationships;
- shared ambient;
- local source/receiver relationships;
- architecture;
- stall/environment seams;
- stairs;
- lobby;
- crop/extraction planning.

It is not the final responsive runtime bitmap.

## Required order

### Phase 1 — make one master

Start with one floor only.

Preferred calibration:

```text
Floor 1:
Uses + Papers + stairs right
```

Do not begin with runtime code or animation.

### Phase 2 — surface it immediately

The generated PNG must be shown immediately with:

- exact local path;
- canvas dimensions;
- `UNVERIFIED` label;
- no claim of approval.

### Phase 3 — reject before rescue

Run the mechanical and semantic gates on the untouched source.

If it fails camera, identity, scale, rendering, lighting, layout, crop
corridors, or integration, regenerate. Do not rescue a fundamentally failed
master through downscaling, aggressive quantization, corrective perspective,
or painting over it.

### Phase 4 — stop for user approval

No extraction, modular generation, animation, or runtime implementation before
the user explicitly approves the whole floor.

### Phase 5 — derive responsive assets

After approval, use the master as relationship truth and produce:

1. empty tileable ceiling/wall/floor/fascia;
2. matching stair section and landing;
3. each stall isolated without environmental wall/floor;
4. internal stall identity props retained with stall;
5. environmental integration props separately;
6. rear and front connection/occluder plates;
7. contact, caster, receiver, and emitter masks.

Then reconstruct the approved composition responsively.

Do not deploy the fixed master as the floor.

## Master canvas and crop guide

Historical generation commonly produces 1536×1024 raw images. The existing
master verifier expects a canonical 1248×597 scene region.

Before generation, define an exact low-color guide inside the disposable raw
canvas:

- canonical scene bounds;
- ceiling rail;
- wall/floor rail;
- lobby/fascia rail;
- stair side and stair width;
- bay divisions;
- H-beam locations;
- adult and child scale bars;
- character roots;
- counter/rug/platform contacts;
- full-height crop corridors;
- source locations;
- rear/frontend prop zones;
- protected lobby circulation.

The raw image may have disposable matte around the canonical region, but no
required silhouette, sign, stair, character, luggage, plant, or prop may cross
outside the safe scene.

## Full-floor master content

Every master must show, not merely imply:

- ceiling and slab;
- wall and mounting history;
- all three camera rails;
- rear stalls;
- open front lobby;
- correct stair aperture, core, landing, and threshold;
- H-beam seam logic;
- shared utilities;
- tenant-specific physical connections;
- visible practical sources;
- receivers on both stall and world;
- contacts and compact casters;
- shadows;
- ambient;
- responsive extraction corridors;
- Up/Down wayfinding, with no Down on Floor 3;
- complete uncropped environmental props.

Integration cannot be deferred to later CSS.

## Prompt construction

Every master prompt should explicitly include:

- intended floor and exact tenant order;
- exact camera projection and three rails;
- percentage/coordinate zones for stalls, stairs, lobby, fascia, and gaps;
- adult/child/robot/Hearthian scale;
- every locked character anatomy and pose;
- every locked stall structure and sign;
- exact readable text;
- light-source map;
- world receiver map;
- physical connection map;
- palette roles;
- low-resolution rendering rules;
- crop-safe corridors;
- prohibited style and semantic failures;
- final self-check.

Do not feed the rejected current floor composite or a downscaled sprite montage
into master generation. Use the detailed written brief and geometry guide.

## Mechanical source gate

The source is rejected if it has:

- wrong dimensions or canonical crop;
- missing camera rails;
- incorrect stair side or scale;
- perspective convergence;
- rotated bays;
- deep top planes;
- non-binary alpha when alpha is required;
- broken pixel block structure;
- off-palette explosion;
- tiny connected-component confetti;
- excessive edge density;
- high local entropy;
- unreadable/malformed required text;
- clipped silhouettes or props.

Useful existing tooling:

```text
scripts/bazaar3/verify-master-candidate.mjs
scripts/bazaar3/master-candidate.config.json
scripts/bazaar3/master-visual-rubric.json
scripts/bazaar3/master-candidate-self-test.mjs
```

The config/rubric must be reviewed against the latest brief before reuse.

## Semantic source gate

Machine checks cannot determine these alone:

- Is Uses' camera truly obeyed?
- Are character/stall identities preserved?
- Is the relative human/child/robot/Hearthian scale credible?
- Are stalls physically installed rather than framed cards?
- Does every light have a visible cause and world receiver?
- Is tenant color retained?
- Are surfaces flat and restrained?
- Are props complete and purposeful?
- Are crop corridors usable?
- Is the lobby genuinely open?
- Are H-beams structural without becoming identical cages?
- Does the scene still look good at real website size?

The semantic review must be bound to the exact image hash. A later modified
file requires a new review.

## Rendering normalization comparison

If the composition, camera, anatomy, and lighting are correct but rendering is
too dense, make a comparison with:

- exact same layout;
- exact same shapes;
- exact same character and stall design;
- exact same light positions;
- exact same crop;
- flatter colors;
- fewer transitions;
- stronger outlines;
- chunkier 16-bit-inspired shading;
- simplified surfaces.

Reject the normalization if it redesigns or repositions anything.

## Background removal and isolation

Do not regenerate a downscaled crop.

Preferred paths after master approval:

- derive from full-quality layers if available;
- regenerate each isolated asset from the approved geometry and semantic brief;
- or perform a precise “remove background only; keep exact layout and shape”
  operation.

For chroma:

- choose a key absent from art;
- use a perfectly flat key;
- no floor, shadow, gradient, or texture in key area;
- inspect transparent corners and edge despill;
- reject holes and fringe;
- do not let cleanup alter silhouette.

## Per-stall five-frame production

Only after static stall/floor approval:

1. create immutable rear plate;
2. create bounded character/prop cels;
3. create immutable front occluder;
4. produce two idle and three hover states;
5. declare masks and roots;
6. verify no structure or torso translation;
7. composite back into approved floor;
8. test desktop/mobile and interaction.

## Responsive reconstruction gate

At every target width verify:

- correct floor composition;
- no overflow;
- no clipped props;
- correct stair side;
- real mobile midpoint floor;
- exact navigation targets;
- no decorative hit interception;
- dialog above everything;
- no hover-driven architecture changes;
- stall/world seams preserved;
- common light and camera preserved.

Chrome is final runtime authority, but a functional Chrome pass is not art
approval.

## Required stop points

Stop for the user after:

1. each full-floor master;
2. any rendering normalization comparison;
3. first clean modular reconstruction of an approved floor;
4. first five-frame animation family in context.

Do not complete hours of downstream work past an unapproved visual gate.

