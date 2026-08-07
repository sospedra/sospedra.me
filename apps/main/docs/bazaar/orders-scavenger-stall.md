# order: scavenger stall (eleventh stall)

Any session executing this order reads `docs/bazaar/HANDOFF.md` first.
Its standing laws override this brief where they conflict.

Target: 12 files under `public/images/bazaar/scavenger/`. File names are a
contract with `app/bazaar/stalls-manifest.ts`. After delivery, update
`SIM_DIMS.scavenger` (artW/artH) and `STALL_SCENES.scavenger.rect` to the
real crop, then run `pnpm test` (the layer-file test guards the names).

Design source: `docs/superpowers/specs/2026-08-06-bazaar-scavenger-stall-design.md`
(repo root). The pipe-ready master prompt: `orders/scavenger/master.md`.

## concept

A wide "parada de mercadillo" table stall: steel tube frame, striped
canvas valance, long counter with a skirt cloth to the floor. The keeper
is a scavenger. The stock is dense, unrelated, and ASYMMETRIC on every
surface: back wall, furniture layers (shelf unit, locker, safe, crate
stacks), counter, skirt front, both aisles, front floor. Round-1 ruling:
at least 3x the round-1 prop count, depth by furniture overlap.
Mandatory finds: two football jerseys hanging as an overlapping pair
(white short-sleeve with two black shoulder/sleeve stripes behind; red
short-sleeve with narrow yellow pinstripes and blue sleeves in front),
the dead Hollow Knight mask on a front crate, a wine barrel with bottles
plus a bottle crate on the floor, and the hero object: an OPEN black CD
wallet on the counter, sleeves fanned, two discs visible: neon teal and
neon magenta.

The keeper: slim, slightly scary hooded figure, flat black void face,
two gold eyes (Vivi, Jawa). Wardrobe: a dark green elven-cut hooded
cloak (the cape IS the scarf, one garment wrapping shoulders and neck,
silver leaf clasp at the throat, grey hood lining) over dark
under-layers, Tusken bandage wraps, and a pouch belt. He starts SEATED
deep in the stall's back shadow, away from the counter, smoking a long
churchwarden pipe, one palette step darker than the room; only the eyes
and the pipe ember stay bright. On hover he rises, steps forward, and
offers the open case. Attitude: quiet, ironic, a tracker. The eyes do
the acting.

## references (pre-flight)

Save the user's chat references into `docs/bazaar/assets/refs/scavenger/`
when available:

1. `mercadillo.png`: the grey-canopy market stall photo (stall type authority)
2. `elven-cloak.png`: the LOTR green hooded cloak with leaf clasp
   (wardrobe authority; superseded the Ana Midnight Camo ruling after
   round 1)
3. `churchwarden.png`: the long LOTR pipe (prop authority)
4. `item-board.png`: one collage of the pixel Hollow Knight, the two
   jerseys, and the open CD wallet (item identity authority)

The two standing attachments live in `assets/`: `angle-law.png` and
`games-composed.png`. Round 1 flew on those two alone; identity rode
the inventory prose and landed. From round 2 on, the strongest
instrument is the corrective attachment: the round-1 winner
(`tmp/bazaar-scavenger/refs/r1-winner-j1.png`) labeled with its
measured numbers (aspect 1.41 drawn, law 1.12).

## structural inventory (verbose numbered inventory, docs 02 + 10)

1. canvas frame: two steel tube posts, thin top band, striped valance
2. valance: vertical grey/charcoal stripes, ragged hem, one patched
   panel off-center right
3. sign (round-3 ruling): NO plank; lowercase "scavenger" SCRATCHED
   into the back wall planks, pale crude strokes
4. light (round-3 ruling): NO bulb string; two cool fluorescent tubes
   hang at the depth plane between the furniture line and the counter.
   Everything behind them (wall, furniture, KEEPER) paints in shadow;
   the counter, skirt, and floor in front paint lit. This split is the
   shadow story of the whole stall. Painted steady (no fx)
5. jerseys: one overlapping pair at the left aisle, white with two
   black shoulder/sleeve stripes behind, red with yellow pinstripes and
   blue sleeves in front, both short-sleeve, no numbers
6. back wall: recessed dark panels packed with unrelated hung finds
   (cuckoo clock, hand saw, horseshoes, blank license plate, dead
   traffic light with dark lenses, gas mask, unlit neon ring, film
   reel, satellite dish, vertical oar at the right edge). NO fish
   (round-3 ruling). NO drone (round-3 ruling: nothing flies)
7. furniture layer against the wall, depth by overlap, all in shadow:
   INDUSTRIAL STEEL shelf unit left (round-3 ruling: slotted angle
   uprights, never wood) stocked with small finds (jars, vacuum-tube
   jar, alarm clock, books, globe, android head, film camera, rope),
   metal locker with one door ajar, birdcage on top, and a leaning
   motherboard, the keeper's SHADOW BAY tight beside the locker, a
   squat steel safe with a kettle and cyberdeck on top, staggered
   crate stack with a tin radio and antenna whip, a lying barrel seen
   end-on
8. counter (rounds 5-7 rulings): ASYMMETRIC two-level counter: main
   band + a RAISED right wing (the approved r7-j1 silhouette
   superseded the r5-p13 down-step). Both levels front face + one
   thin band, zero legs, star-print skirt to the floor across the
   full width. Part of the stock sits in OPEN BOXES AND TRAYS
   (compartment tray, tin box, padded case, open scrap crate); other
   goods STACK in offset piles (ROM cartridges, datapads, tins,
   coins, photos)
9. skirt front: five uneven bags in two clusters plus one hanging
   colander
10. counter items: OPEN CD wallet center (two discs: neon teal, neon
    magenta) with a tiny tinfoil origami unicorn beside it, binoculars,
    key ring, magnifying glass left, two dark bottles right. NO
    trumpet (round-4 ruling; an earlier "no trumpet" note was misread
    as "trumpet missing"). Heavy futurist piles at both wings:
    blaster, cyberdeck, wrist terminal, toolkit roll, e-paper, VR
    visor, datapads, battery cells, watches, pager left; braindance
    wreath, pocket CRT, reel-to-reel, cyber-eye case, holo-puck,
    robot hand, wire spool, credchip, data shard, neural plug,
    cortical stack, air hypo, stim inhaler, coins, spark plugs,
    lenses right
11. front floor: suitcase stack far left, crate with the Hollow Knight
    mask, leaning tire, toolbox, bottle crate, upright wine barrel,
    rolled rug leaning far right
12. keeper: SEATED tucked beside the locker (round-3 ruling: further
    deep), behind the fluorescent light plane, dark green elven cloak
    (cape = scarf, leaf clasp), long churchwarden pipe, smoke wisp,
    gold eye slits; a shadow silhouette, only eyes and pipe ember at
    full value. EXACTLY TWO ARMS (round-4 ruling: the winner drew
    three; count them)
13. disc glint: rendered as a SEPARATE fx layer sweep, dim in the master
14. smoke: baked into the char idle frames, NOT a separate fx layer

## laws in force

- camera (doc 03): copy the r15 canon language verbatim into the master
  order: "a FLAT STOREFRONT seen dead-on... NOT a room, NOT a stage, NOT
  a diorama... every box: front rectangle + one thin top band, vertical
  sides, nothing else." Two-surface law: a visible left/right side face
  is a rejection; depth is overlap only. Attach `assets/angle-law.png`.
  No slab: one ground line, contact shadow rows only.
- canvas: LANDSCAPE 1536x1024. Width ruling after round 2: the density
  demand beat the 1.12 family box (rounds 1-2 measured 1.33-1.52), and
  the stall sits SOLO on floor 4, so the box widened to x=136..1400,
  y=40..920 (1264x880, aspect ~1.44). dispW lands around 750 at dispH
  520, measured at the final crop.
- wallet law (round-2 BIGGEST error): the open CD case LIES FLAT on
  the counter band, same shallow angle as the band, discs as squashed
  ellipses. An upright book-like wallet is a rejection.
- flat counter law (round-3 BIGGEST flaw): the stall is a storefront
  elevation, never a freestanding 3D table. Counter = front rectangle
  + ONE thin top band; items in one row; the skirt covers the entire
  front to the floor. A visible table leg is a rejection.
- fluorescent depth light (round-3 ruling): two cool tubes at the
  mid-depth plane split the light: shadow behind (wall, furniture,
  keeper), lit in front (counter, skirt, floor). No halos; light is
  flat palette steps only.
- material law (round-4 ruling): less wood, more plastic and steel.
  Wood only on the counter band, wine barrel, mask crate, book
  spines, wall planks, oar. Plastic stacking crates, plastic beverage
  crate, plastic tub, steel drum replace the wooden versions.
- palette ladder (round-4 ruling): round 5 flew the closed layout at
  24/20/16/13 hexes. VERDICT: the repaint framing FLATTENED the
  furniture depth in all four; round 5 rejected wholesale, r4-j1
  stays the master, clamp stays 24. Lesson: layout-lock repaints
  lose this stall's depth; every round keeps the full layout order
  with the depth laws.
- depth law (round-5 failure, named): the furniture line stands
  proud of the wall with real overlap and separation lines; the
  keeper bay is a real gap. A flattened wall-of-stuff is a redo.
- NO ATTACHMENTS (round-6 ruling): attachment chains hyperfit; round
  6's four probes converged into near-identical renders. From round
  7 on, orders attach ZERO images. The supervisor reads the gospels
  and transcribes them into inventory-grade prose inside the order:
  paint manner, camera construction, layout, recorded failures with
  their numbers. This supersedes the instrument hierarchy for this
  stall.
- round-7 verdict: text-only restored variance and held every law;
  winner r7-j1 (keeper in a dark doorway), its camera and layout are
  LOCKED in prose. Round-8 rulings: the strip in front of the
  doorway stays EMPTY (r7-j1 stacked safes there: rejected; the safe
  moved right of the doorway), and everything behind the tubes drops
  TWO steps darker including the keeper (darkest tone + outline
  only; eyes + ember the only bright points in the back plane).
- palette experiment (round 8): two explicit clamps (18 and 14
  hexes) and two descriptive reductions where codex builds the
  palette itself (~16 and ~12 colors, families + fixed accents).
  VERDICT: r8-e14 is the new gospel; its 14-hex clamp is canonical.
  Its two fouls became named failures: the counter bands are
  dead-straight (it bowed them) and the wall is planks (it drew
  bricks).
- flatness war (round 9): still not chunky enough, too many details.
  Four text-side instruments fly, one per probe: LEAN order (the s3
  lesson: fewer style words), PER-OBJECT BUDGET (max 4 hexes + 6
  flat shapes per object; descends from the deco rounds' 8-hex prop
  cap), UPSCALED SPRITE FRAMING (the whole canvas is a 384x256
  sprite at 4x nearest-neighbor), and SURFACE DICTATION (fixed chunk
  budgets per surface, the r20.9 pattern).
- key effect (round-2 ruling): the keeper stays deep in the background
  shadow. Dim figure, eyes + ember the only bright points. Nothing may
  pull him forward.
- composition laws (round-2 major errors): planting (every counter
  item base on the band, 2 px contact row, zero floating), surface
  separation (the counter never merges into furniture tops; flat
  shadow gap lines), five depth layers + ceiling hangs, clutter
  gradient (calm center around the wallet, piles toward both wings),
  scale mixing (big anchors + piles + small details).
- futurist stock (rounds 2-3 rulings, growing): ADD Blade Runner /
  Cyberpunk / Akira scavenge on top of the existing finds, never
  instead: dead CRT (white-grey screen), android head, motherboard
  (LED dots), cyberdeck, hanging robot arm, robot hand, unlit neon
  ring, red moto helmet, dead traffic light (dark lenses), gas mask,
  satellite dish, oxygen tank, jerrycan (steel, never green), scrap
  crate with android torso, VR visor, datapad stack, battery cells,
  antenna whip, vacuum-tube jar. NO drone. Ceiling hangs from the
  valance, overflow past both posts, at least 60 objects, wings of
  the counter pile heavy.
- palette (doc 04): PALETTE CLAMP, 25 hexes listed in the master order,
  opened with "use ONLY these colors, nothing else". Scoped one-use
  colors: `#1b497d` only the jersey sleeves, `#4bd2e1` only the teal
  disc face, `#c86fd6` only the magenta disc face, `#e07830` only the
  pipe ember, `#e6b339` eyes + bulb cores + jersey pinstripes, cloak
  greens `#4a5a44`/`#35402f`/`#5f7052` only the keeper's cloak.
  `#00ff00` is the background key, zero art pixels.
  FLATNESS ABSOLUTE: zero stipple, zero gradients, every region one flat
  chunk, blocks never smaller than 4x4 px, three tones per material,
  near-black outlines. Camo is large flat patches, never noise.
- screen law (HANDOFF standing law 3): no screens in this stall. The
  white-grey family (#9b9a98/#c9c8c5/#f2f1ee) paints the mask, the
  jersey whites, and the camo light patch only. The disc pair is ruled
  neon teal + neon magenta by the user; discs are media faces, not
  screens.
- greens warning: the keyer de-green clamp executes true greens. The
  cloak greens are chosen keyer-safe by construction (g <= r+24, so
  both the chroma predicate and the de-green clamp pass them
  untouched). Verify the cloak crop after keying anyway. The magenta
  disc is orchid family: the no-despill keyer rule protects it.
- dim law (round-1 ruling): the keeper sits in the back shadow. His
  whole figure paints one palette step darker than the room. Only the
  eyes and the pipe ember carry full value.
- scale (display px currency, doc 10): stall 520 display tall, 576
  display wide; keeper seated ~130 display, standing (hover) ~200
  display; mask ~70 display; calibration: seated Ed 170, w98 robot
  294, games kid 170.
- target display box: ~750 x 520 su, the widest stall in the market by
  ruling (round-2 width acceptance; the old 576 uses-class box assumed
  a shared floor). Final dispW comes from the approved crop. Source of
  truth: SIM_DIMS in app/bazaar/stalls-manifest.ts.
- chroma contract (doc 02): flat chroma green #00ff00 outside the art,
  scoped "background key only, zero art pixels"
- keying: doc 10 official keyer, NO --despill, binary alpha,
  hostile-color composite audit
- rest assert, the PRIME INVARIANT (doc 08 + doctrine/DOCTRINE.md):
  plate + char-f1 + fx-glint-f1 + counter-top, composited in declared
  z-order, must equal the locked master static byte-for-byte
- occluder (doc 10, talks pattern): `counter-top.png` is a byte-true
  mask cut of the counter band + wallet strip; the keeper animates
  behind it
- poses (doc 08): SHEET DOCTRINE. One generation per pose set, the
  isolated keeper frame 0 attached as the only asset, the order asks for
  a sprite-sheet row whose first cell is an exact copy of frame 0. Fall
  back to r18 chaining only if sheets fail.
- per-gen orders follow the doc 02 skeleton: attachment declarations
  with roles plus the never-draw clause, canvas + chroma contract, laws
  ordered numbers-first, output contract with exact size, exact
  destination path, and "print GENERATED=<path>"

## deliverables

- `plate-key.png`: stall + all stock. NO keeper. NO glint band.
- `counter-top.png`: occluder cut (counter band + wallet strip)
- `char-f1.png`: seated in the shadow bay, pipe lit, thin smoke wisp,
  eye slits (rest anchor)
- `char-f2.png`: eyes flick sideways, smoke drifts (minimal diff)
- `char-f3.png`: ember flares, smoke puff, eyes return (minimal diff)
- `char-h1.png`: eyes flare full round, head turns to the viewer
- `char-h2.png`: rises from the seat, pipe lowered
- `char-h3.png`: steps forward out of the shadow to the counter
- `char-h4.png`: hold; leans on the counter, open hand presenting the
  open wallet, eyes as crescents
- `fx-glint-f1.png` / `fx-glint-f2.png` / `fx-glint-f3.png`: glint band
  sweeps the teal disc, dim -> mid -> bright

The char hover frames move the keeper across the shadow bay to the
counter. All frames still share the one content rect; the h-frames
simply use more of it. The idle smoke lives in the char frames.

All files pre-cropped to one shared content rect inside the 1536x1024
master canvas. Report the rect with the delivery.
