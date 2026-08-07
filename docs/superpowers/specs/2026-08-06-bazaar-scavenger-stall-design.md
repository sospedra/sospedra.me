# Bazaar scavenger stall

An eleventh stall for `/bazaar`. A wide "parada de mercadillo" table run by a hooded scavenger. It is the densest stall in the market and it links to a TBD /scavenger page.

## Concept

The stall is a street-market table stall: steel tube frame, striped canvas valance, a long counter draped with a skirt cloth to the floor. Every surface carries stock. The back wall, the counter, the skirt front, and both aisles are packed with finds. The items share no theme. That is the point: the keeper is a scavenger, and the table is whatever survived the week.

Mandatory finds, ruled by the user:

1. Two football jerseys hanging from the valance: one white with 2 black stripes in the shoulders and sleeves short-sleeve, one red short-sleeve with fine and very narrow vertical yellow stripes and blue sleeves. One slightly on top of the other, so they can be seen as having depth.
2. The dead mask of the Knight from Hollow Knight at the front, propped on a crate: bone-white shell, two horns, empty black sockets.
3. Wine: one upright barrel at the right aisle with dark bottles on top, more bottles on the counter and a crate of bottles on the floor.
4. An OPEN CD wallet on the counter, center: black zip case, sleeves fanned, 2 discs visible. This is the hero object. It is the link to `/scavenger`: the discs have no labels, but one is neon teal colored and the other neon magenta colored.

The hover animation ends with the keeper coming forward and offering the open CD case.

Density ruling (2026-08-06, after round 1): the stall carries at least 3x the round-1 prop count, asymmetric, never mirrored. Depth comes from furniture layers by overlap: a tall shelf unit full of small finds, a metal locker with one door ajar, stacked crates, a squat safe, suitcases, a lying barrel. The back wall alone is not enough.

Round-2 rulings (2026-08-06): the open CD case lies FLAT on the counter, following the counter's angle, never upright. Counter items plant on the band at correct sizes, zero floating. Clutter increases toward the sides; the wallet zone stays calm; big anchors mix with piles and small details. On top of the existing finds, futurist city scavenge joins as ADDITIONS (Blade Runner, Cyberpunk, Akira): dead CRT, android head, server blade, cyberdeck, broken drone, hanging robot arm, unlit neon ring, red moto helmet, traffic-light head, gas mask, satellite dish, oxygen tank, jerrycan, scrap crate. Items hang from the valance and overflow past both posts, at least 60 objects total. The KEY EFFECT stands above all: the keeper stays deep in the background shadow, dim, eyes and pipe ember the only bright points.

Width acceptance (2026-08-06): density beat the 1.12 uses-class box in both rounds (measured 1.33 to 1.52), and the stall sits solo on floor 4. The master box is now aspect ~1.44; dispW lands around 790 at dispH 520, measured at the final crop.

Round-3 rulings (2026-08-06): the stall is a storefront elevation, never a freestanding 3D table: no visible legs, the skirt covers the whole front, counter = front face + one thin band. NO sign plank: "scavenger" is scratched into the back wall. NO bulb string: two cool fluorescent tubes hang between the furniture line and the counter, splitting the light: wall, furniture, and keeper behind them in shadow; counter, skirt, and floor lit in front. The keeper tucks tighter beside the locker, a silhouette. Steel industrial shelves replace wood. No fish, no drone. More futurist gadgets joined the stock (VR visor, datapads, battery cells, robot hand, motherboard, antenna, vacuum tubes, android torso).

Round-5 ruling (2026-08-06): the palette-ladder repaint lost all furniture depth; round 5 rejected wholesale and r4-j1 stays the master. Kept from r5: the asymmetric stepped counter of r5-p13 (main band plus a lower right step). New rulings: counter goods partly in open boxes and trays, partly in offset stacks; still more futurist gadgets (spider-bot, dermatrode tin, ROM cartridge stack, biomonitor pegs, incept photos, holo-frame). The clamp stays 24 hexes.

Round-4 rulings (2026-08-06, winner r4-j1): NO trumpet, anywhere (an earlier "no trumpet" review note was misread as "trumpet missing" for two rounds). The keeper has exactly two arms (the winner drew three). Less wood, more plastic and steel: plastic stacking crates, plastic beverage crate, plastic tub, steel drum; wood only on the counter band, wine barrel, mask crate, book spines, wall planks, oar. A 30-item futurist catalog joined the brief (Voight-Kampff unit, Esper terminal, LED umbrella, origami unicorn, blaster, cyberdeck, wrist terminal, toolkit roll, e-paper, braindance wreath, pocket CRT, reel-to-reel, cyber-eye case, holo-puck, loupe headset, pill bottle, vocoder respirator, voice-print box, pinned insect drone, plus pocket-size pile bits); density target 70+. Round 5 is a palette ladder on the closed layout: 24/20/16/13 hexes, the eye picks the final clamp.

## Keeper

Species unknown. Slim and a little scary. Standing about 200 display px, narrow shoulders, gaunt under the cloak.

Look (wardrobe ruling 2026-08-06, second revision): the face never shows. Under the hood there is one flat black void with two amber eyes: half-lidded slits at rest, VERTICAL OVALS when open, never crescents, never round dots. The hooded CAPE is DARKER green (#212819 family in shadow), closed at the chest under the leaf clasp and OPEN from the belly down: a cape, never a robe. Under it, fitted TECHNICAL clothes, futuristic scavenger gear, very dark: charcoal jacket and trousers with DARK BROWN panels and seams (the magenta died 2026-08-06), a utility strap, tech pouches, slim boots. Bandage-wrapped forearms, dark gloves.

Animation lighting doctrine (2026-08-06): flat lighting in every frame, no directional or side light. The shadow-to-counter march is expressed ONLY through per-frame palette swaps: the supervisor computes a five-step lightness ladder for every material and sends each hover cell its own exact hex list. The rest state uses the darkest step: he lives in the shadows.

He starts seated deep in the stall, against the back wall, away from the counter, smoking a long churchwarden pipe (Gandalf cut). Relaxed, chilled, in the shadow of the stall's back side: his whole figure sits one palette step darker than the room. Only three points stay bright: the two eyes and the pipe ember. The menace is stillness: the eyes track the aisle while the body never moves.

Personality: quiet and ironic. A tracker, not a barker. He never hawks; he waits. Star-Lord irony compressed into few words. He sells scavenged goods, not junk: everything on the table survived something. He takes commissions: name a thing, he returns with it. The eyes do all the acting: slits at rest, narrowed when amused, round when a customer actually wants something.

## Interaction (final architecture, APPROVED 2026-08-06)

The character frames live on a FIXED CANVAS: 460x971 art px at plate offset (556,0), full stall height, 2.2x the doorway width. Every frame declares its exact head line and figure height inside that viewport; the approach is drawn, never post-scaled into a clipping box.

Idle: ONE static char frame (`char-idle.png`), seated at head line H (y340), 256 px tall, at the DARKEST palette step (0.55 of the lightest). Two independent live layers animate over it:

1. `fx-smoke` (3 frames, 320 ms, uses-steam style, generated with the uses steam sprite as the style anchor), anchored on the pipe ember. Blanks out during hover.
2. THE EYES ARE HTML+CSS (`scavEyes` in stall-box.module.css): a black rect masks the sprite's baked eye slits on a 7 s cycle while two yellow dots read as a left glance, then the same element rotates 180deg for the right glance. Hidden on hover/focus, frozen under reduced motion.

Hover, six frames at 150 ms with a hold on the last, head lines ruled on the 20-line grid (H at rest to between E and F at the hold), darkness ladder enforced per frame (0.55/0.55/0.68/0.80/0.92/1.00):

1. `char-h1` head y340, 256 px: seated, the pipe hand lowers (stops smoking)
2. `char-h2` head y340, 256 px: seated, eyes open to VERTICAL OVALS, pipe down
3. `char-h3` head y285, 311 px: standing, still dark
4. `char-h4` head y271, 349 px: first stride, one palette step lighter
5. `char-h5` head y257, 383 px: second stride, lighter again
6. `char-h6` head y218, 442 px: HOLD, fully lit, leaning forward, gloved OPEN HAND PALM UP over the wallet, pipe in the other hand

Eye law: slits at rest, vertical ovals awake, never crescents, never round dots. Mouse-out snaps to the dark seated idle: he melts back into the shadow.

The wallet glint and the Esper CRT flicker stay independent fx loops on the counter and the suitcase TV.

A glint sweeps the teal disc in the open wallet as an independent effect loop, three frames at ~600 ms (dim band, mid band, bright band). It runs at rest and during hover, like the map dot.

Reduced motion follows the engine rule: rest frame when inactive, `char-h4` when active, static glint.

## Dialog

Standard `Dialog` component, typewriter, pixel font. No custom variant.

```
Found, not stolen. Mostly.
Everything has a price.
Name it. I can find it.
```

One link: `find your item` → `/scavenger`. The stall body click goes to the same route.

## Data changes

- `stalls-manifest.ts`
  - `STALL_SCENES.scavenger`: `plate`, `fx-glint` effect at z1 (3 frames, 600 ms), `char` at z2 (idle 3, hover 4), `counter-top` occluder prop at z3 (the talks pattern: counter band + wallet strip cut from the plate so the keeper animates behind them). `rect` measured from the art crop.
  - `SIM_DIMS.scavenger`: dispW 818, dispH 520 (measured from the locked master crop 1519x966, shipped 2026-08-06). The stall shipped STATIC first, plate-only, the jukebox pattern; the char/fx layers arrive with the animation campaign.
- `stall-catalog.ts`
  - `SCAVENGER_DIALOG` constant with the three lines above.
  - `STALLS.scavenger`: label `scavenger`, href `/scavenger`, tint `#e08030` (ember orange, the Ana accent; talks gold is `#e0a040`, keep them apart), one link. The `/scavenger` page shipped 2026-08-06, so the typed `Route` holds.
- `floors.ts`
  - `DESKTOP_FLOORS` gains a fourth floor: `['scavenger']`, stairsRight false (S sides read R, L, R, L). Floors read 3/3/3/1.
  - `MOBILE_FLOORS` gains a solo sixth floor: `['scavenger']`, smRight true (SM sides read L, R, L, R, L, R).
- `decor.ts`: `STALL_TUNE.scavenger`, lift 0 at launch. Final value tuned in the decor editor.
- `sounds.ts`: `STALL_SFX.scavenger`, a sleeve flip: band-passed noise rasp (900→2200 Hz, ~90 ms) ending in one soft square click. The `Record<BazaarStallId, ...>` type forces this entry at compile time.

Ship placeholder rectangles first, as the map stall did. The layer-file test guards the names.

## Art

Twelve images under `public/images/bazaar/scavenger/`, produced by the codex imagegen harness (r17 layered plates, sheet doctrine for poses):

- `plate-key.png`
- `counter-top.png` (occluder, byte-true mask cut from the plate)
- `char-f1.png` `char-f2.png` `char-f3.png`
- `char-h1.png` `char-h2.png` `char-h3.png` `char-h4.png`
- `fx-glint-f1.png` `fx-glint-f2.png` `fx-glint-f3.png`

The sign reads "scavenger". Nothing else is readable. Per the r17 rest assert, plate + char-f1 + fx-glint-f1 + counter-top composited in z-order must byte-match the locked master static.

The order brief and the master prompt live at `apps/main/docs/bazaar/orders-scavenger-stall.md` and `apps/main/docs/bazaar/orders/scavenger/master.md`.

## Out of scope

- No custom dialog component. The games multi-bubble stays the only special case.
- No second fx layer. The bulb string paints steady in the plate; only the disc glint animates.
- No decor nodes at launch. `HostDecor` hosts exist for free and stay empty.
- No slab platform. The table stands on the ground line like a street stall.
