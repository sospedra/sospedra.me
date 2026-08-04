# Master run 2026-07-28 — three floor masters, UNVERIFIED

## Round 19 — v4: single-shot + pixel anchors (LATEST)

The reflection round. Learnings ratified after the chain era failed
(photocopy degradation) and the independent era failed (morphing):
diffusion must NEVER be asked for nearly-identical frames — frames
either differ a lot (single-shot from rest) or are file copies. My
gate moved from stills to motion. The user contributed the decisive
instrument: THE PIXEL ANCHOR — declare one body region byte-identical
("like the torso of the chef... that worked very well"); anchors
flown: uses torso, papers torso+collar (challenged up from neck),
manual torso, console crossed legs, talks planted forearm (my
proposal), w98 legs, games four sneakers, travel resting arm. v4
fleet: 16 single-shot gens (mid + apex per stall, held = apex copy),
papers re-choreographed (drops the book, adjusts glasses). Saturation
drift ≤15% across all 16 with ZERO correction passes — single-shot +
anchors contain drift by construction. Gate results: uses best-ever
(palm-up + hand-on-hip), console peace sign healed, papers
glasses-adjust charming (book pops out a frame early), manual pass
(apex eye-style note), w98 pour/upright good but THE APRON MORPH
persists — next lever: apron joins the anchor; talks anchor
overpowered the sit-up beat (lazy cheek-on-palm offer — in-character,
user to judge); games + travel v4 = alternatives (style-dialect gap
vs stall renders; both keep their ACCEPTED versions). Version system
live: per-stall dropdowns, "v3 ACCEPTED ✓" marks the user's keepers,
every mount versions first. Residual defect classes: mid-frames drop
held objects (papers book, travel ticket), anchors can overpower
beats, isolation-vs-stall style dialect.

## Round 18 — THE POSE DOCTRINE: hover animation solved

The hover war ended with a mechanism change. Deterministic band
translation breaks pixel-art outline continuity (three failed
rounds); the winning pipeline is DIFFUSION POSES ON THE ISOLATED
CHARACTER: flatten char-f1 onto its chroma, codex edit-mode paints
the pose, supervisor keys + counter-clamps + mounts. The recipe that
won, learned over ~10 user gates: (1) MINIMAL orders — three
sentences: what the image is, what the movement is, output contract;
over-constraint degrades output ("be less verbose... it's constrained
enough"); (2) plus a compact INVARIANT LIST of what never changes —
no beard, same clothes; (3) held objects stay in the SAME HAND every
frame (w98 can lesson); (4) NOTHING new appears, background stays
bare chroma (w98 plants lesson); (5) CHAIN each frame from its
predecessor's RAW GEN — independent gens morph aprons/hoodies/faces;
chains hold continuity (console h4 proved it, then talks/w98/games);
(6) held frames = "almost nothing changes" chained from the apex —
otherwise the model returns the character to rest; (7) color pins
when chains drift ("SAME BRIGHT PURPLE"); (8) mechanical
counter-clamp at the char layer's rest bottom row — floaters get
slack (manual's dip was amputated by a strict clamp). Console rug
saga closed: 19 regen rounds (fleets 11-17) prove diffusion cannot
draw constant-width rug edges under a seated figure; the user kept
the certified fleet-11 carpet; my surgical straighten was built,
shown, and reverted by ruling. Board: uses, travel, papers approved
by user; console self-verified (chained peace sign); talks + manual
self-verified this run; w98 h3/h4 + games h4 in final tight-chain
regen. All superseded frames archived under r17/<stall>/versions/.

## Round 17c — THE MARKET IS ALIVE: 8-stall animation fleet

User ruled: build all, verbose, codex subagents per stall, bigger
amplitudes, more frames, plus ambient infinite loops (steam, CRT
static, SMPTE roll, arcade screen, candle flames, creatures, water).
Authored r17/DOCTRINE.md (layered architecture, byte rest assert +
repair pass, zero new colors, transparency reveals, coordinate law,
amplitude law, manifest.json contract, verify.mjs contract, papers
pilot scripts as reference implementations) + 8 verbose per-stall
orders (prompts/r17-<stall>.md). Fleet-anim: 8 codex CODING
subagents (not image gen), launched 19:03:57 detached, all landed
EXIT=0 by 19:25:15. Every verify re-run by the supervisor: 8/8
PASS — motion diffs boxed in declared envelopes, zero-new-colors
population asserts, route-card clearance proved (travel 9px),
SMPTE roll frame-by-frame, static-screen permutations at constant
color population. Two supervisor findings: manual's floating robot
carried a magenta fringe (the one character bordered by raw chroma)
— scrubbed ~3k px per frame across all 7 frames (production-keying
equivalence noted: those pixels die at the keyer anyway); uses
declared an honest deviation (the red-cushion stool is screen-left,
the ordered point gesture aims screen-right) — user to judge.
Unified manifest-driven preview: r17/build-preview.mjs (plate
keying) + r17/preview/all.html — all 8 stalls live: ambient loops
on own clocks, idle cycles, hover/focus 4-step sequences with held
finals, reduced-motion static. Awaiting the market-wide gate.

## Round 17b — papers hover, layered

Hover added to the layered pilot per the approved description. The
BOOK left the plate onto its own layer (extract-book.mjs: predicate
mask on the ORIGINAL static minus char pixels — dark-olive book
predicate after the bright-olive one found 0 px; flood failed
earlier because hand-voids disconnect the book islands). A repair
pass assigns orphan boundary blends (10 px of hologram-glow-on-crest)
to the book layer so the three-layer rest composite stays
byte-identical BY CONSTRUCTION — self-healing invariant. Inpaint went
hybrid: strip-tile above y=562, horizontal nearest-side on counter
rows (the strip painted navy on the counter under the lifted arms).
Hover frames (author-hover.mjs): h1 signal locks — floaters VANISH,
face lifts 4px (the layer makes crown-growth trivial: it paints over
transparency), pupils widen; h2 book+hands+forearms rise 20px rigid
— the shifted sleeve overlaps the upper sleeve (self-healing seam),
vacated rows reveal real plate, and the lifted book BAKES INTO the
char frame over the torso, under the hands (z-order: the book layer
swaps to empty during hover — first attempt had the torso decapitate
the lifted book); h3 held: 2px nod + smile widens. Diffs: h1 0.358%,
h2 0.953%, h3 0.267%, all boxed. Preview r17/preview/papers.html:
idle loop + pointer/focus hover sequence + scrub buttons + reduced
motion. Awaiting the hover gate.

## Round 17 — LAYERED pilot: papers idle

User ruled A (strict tear) dramatically better but flagged micro
aberrations and proposed the layered strategy; correction adopted:
never regen stalls (locked statics stay), INPAINT the character
footprint instead. Pilot shipped in one round, all deterministic:
(1) EXTRACT r17/extract-papers.mjs — cyan + attached outline darks,
book-adjacent darks stay with the plate, pen-cup protected, spatial
bbox; 25,883 px character layer, the tan book stays IN the plate and
floats in the hole. (2) INPAINT r17/inpaint-papers.mjs — 64px
strip-tile of clean shelf columns (x=890) with global-x anchoring;
AT-REST COMPOSITE ASSERTED BYTE-IDENTICAL to the locked static.
(3) ANIMATE r17/author-char-idle.mjs — the signal tear ON the layer:
vacated pixels become TRANSPARENCY (real shelf shows through the
tears — zero background invention), dim maps every color to an
existing darker palette color (zero new colors by construction),
floaters jump 4-7px, glints flare to the brightest existing color.
(4) RUNTIME r17/preview/papers.html — plate (never changes) + char
layer swap, 2000/220ms. The aberration class is dead by
architecture. Awaiting the pilot gate; next: a physical-character
pilot (travel agent) to prove the hard case, then the 8-stall
rollout + integration of the two-layer runtime into bazaar3.

## Round 16b — Papers idle A/B: strict tear vs loose codex

User rejected the 16a five-frame set ("horrible"): movement too
small, idle unnoticeable, surgery aberrations. Ruling: idle-only, two
mechanisms A/B. A STRICT = hand-authored but LARGE: a hologram
signal tear — global cyan dim 12%, six slice tears 4-6px, all four
floaters jump 4-7px, lens glints flare; cyan-only, reversible, 0.995%
changed, boxed to the hologram. B LOOSE = codex infers the motion
under a hard freeze law (whole-canvas edit): landed in 4 min, RESTAGED
the entire stall — 7.285% changed, bbox wall-to-wall, new
proportions, new shelves, new archivist — the rulebook §6 failure
mode reproduced verbatim. A/B flipbook:
r16/preview/papers-idle-ab.html (same cadence both sides); sheet
r16/ab-papers-idle.png. Awaiting the mechanism ruling.

## Round 16a — animations: hand-authored mechanism, Papers five-frame set

All 12 statics locked; animation phase opened. User discarded the
diffusion-patch Uses frames and ruled the new mechanism: the
supervisor hand-authors frames as deterministic pixel-surgery scripts
(r16/author-papers.mjs) — only declared motion pixels change,
registration byte-perfect by construction, zero hallucination
surface. Papers set built per the r16 rulebook cards: idle2 =
scanline desync slices + lens glint tick + 4 cyan fragments drift
(0.037%, boxed); hover1 = face features lift 2px, pupils widen,
smile +1 (0.124%, face box only); hover2 = gold page crests spread
2px out + 1 up, index finger finds the passage (0.018%); hover3 =
book + hands + forearms lift 11px (mask + dilation, phase-preserving
vertical bridge above the counter, nearest-side horizontal below;
chest-through-V excluded unless touching the book), brow +1
(0.939%, boxed in envelope). Iterated with own eyes: bell exclusion,
ghost-crest orphans (mask dilation), scanline-phase fills, checker
dither reverted. Flipbook: r16/preview/papers.html (magenta preview
key + fringe erosion). Coordinate probes, not assumed numbers.
Awaiting the Papers gate; 7 stalls remain; stale r16 edit-target
registry for the 4 re-locked statics noted for the next sets.

## Round 15l — fleet 11: THE CARPET WAR ENDS

User approved w98 (+25%, 463 world) and games (+8%, 352 world) —
11 of 12 assets locked. Console rulings: certified-carpet restore
(the fleet-6 carpet was "the right size and angle" — root cause of
rounds 12-13: my rug-law.png showed WOOD while the text said MAROON
WOVEN; codex kept the material, invented the shape), palette cut
again (≤32 fills), mirrored sign glyphs banned, THE SURROUND
EXCEPTION (flanking stacks turn toward Ed, one narrow inward side
face each — first sanctioned angle-law exception). Fleet 11 flew
console solo with carpet-law.png (fleet-6 carpet crop, geometry AND
material agree). LANDED 15:54: THE CARPET IS RIGHT on the 14th
round — grand, straight fringed bottom, gentle certified slant,
subdued weave. Surround landed (tower + racks visibly lean toward
Ed). Sign glyphs once, no mirror. Palette 374 -> 314 buckets (-16%,
clamp still aspirational). Deviations: sign mounts on an r11-style
pole instead of chains (matches the good-Ed ref), the 144-row
clear-air count still broken though the sign visually floats clear
(offset from the machine peak), Ed rims still timid. Width 438
world (+35%). Sheet: ab-console-r15l.png. Awaiting the console
verdict — potentially the final one.

## Round 15k — fleet 10: relative width rules landed

User verdicts on fleet 9: accept all content; games + w98 widths
rejected; console rug-rename instrument approved; r15j renders kept
as fallbacks (gen-<id>-r15j.png + <id>-r15j-alpha.png). Fleet 10
instruments: WIDTH WENT RELATIVE — aspect kill with measure-both,
the BODY RULE (stall width in lying adults), the MARGIN RULE (each
chroma margin reads as wide as the stall) — replacing three fleets of
failed absolute counting; accepted r15j renders attached as content
law with named errors; console rug renamed FLOOR BAND everywhere
(word banned); w98 red wash turned up to an unmistakable 50% mix.
RESULTS: games +8% (from +49% — DONE, the body rule ended the width
war for it); w98 +25% (from +50%, narrowest ever; red wash now
unmistakable across every plant below the lamp; render runs warmer
than r15j); console +30% (from +38%), Ed + glyph reflection + cuts
all held, BUT the floor band drew a TRAPEZOID again — 13th loss. The
rename failed: the prior attaches to SCENE SEMANTICS (woven textile
under a seated figure = carpet in perspective), not to the word.
Proposed next instrument: change the MATERIAL — Ed sits on a wooden
plank platform like every other stall (wood never trapezoids in our
data), with the maroon motif as a thin painted border or a 20px flat
runner. Needs user ruling. Sim rebuilt (1864w). Sheets:
ab-{console,games,w98}-r15k.png.

## Round 15j — fleet 9: blueprint-driven regens landed

New process: per-stall composition BLUEPRINTS (r15/composition.html —
exact element rects, kill keylines, reflection zones, angle splits)
approved by the user across five iterations BEFORE order rewrites.
Rulings encoded: racks reduced (console), rug = games-floor
construction via rug-law.png picture anchor (12th attempt), Ed = r11
"good Ed", Ed rim reflections, arcade sized by real-world math (70in
= 334px at 187px/m, base +40px for 1m depth), post R half height,
shelves dropped, w98 full redesign (greenhouse ≥10 species + food,
red wash on ALL plants below the lamp, sleeping octo, K-2SO derelict
robot in /w98 desktop teal #008080 + rust). Fleet 9 (dispatch9,
detached, 3 jobs) landed 3/3 in under 5 minutes, keyed + scrubbed on
arrival (71/44/259 px). MY VERDICTS: w98 — content bullseye (K-2SO
robot, food, sleeping octo, variety all EXACT), red wash weak, width
+50% vs the 370 cap (approved fallback was +40%; fallback archived as
w98-approved-alpha.png); games — best games ever: kid heads below the
arcade top for the first time, relative proportions match the math
(cabinet 1.66x sister vs 1.55 target), drippy kid sign, gradient bulb
casts visible, handheld glow on sister's chin, straight floor, post R
half — but width +49%; console — Ed r11 identity back, glyph
reflection landed, inventory cuts held, width +38% (from +97%), BUT
the rug drew a TRAPEZOID (12th loss: picture anchor beat the diamond,
lost to the carpet prior) and the machine wall grew back to the sign
line (clear-air broken), Ed rims weak. THE PATTERN: content obeys,
absolute geometry doesn't — codex holds proportions now but cannot
count canvas columns. Sim rebuilt (2088w justified). Sheets:
ab-{console,games,w98}-r15j.png. Awaiting verdicts.

## Round 15i — fleet 8: reflection-law regens landed

Rulings encoded: THE REFLECTION LAW (gradients that blend into the
receiving surface, Manual counter = canon), Ed's five counted machine
overlaps, sign/pole glyph reflections, gradient bulb casts, games
floor-prop law, navy trunk, aggressive palette cuts, beam ends. Fleet
8 (dispatch8, detached, 5 jobs) landed 5/5 through one session
restart; console + games keyed on arrival, stains scrubbed (198 green
px / 35 magenta px). MY VERDICTS: console — Ed identity + surround
EXCELLENT (nested in monitor stacks, racks, boxes, cables), pipe
tallest, sign + faint glyph reflection, BUT the rug is an isometric
diamond AGAIN (11th angle loss) and width blew to +97% (the surround
ruling pushed clutter sideways); games — master style + drippy kid
sign + sister-only handheld all held, floor mostly flat with slight
corner splay, BUT character inflation returned (sister ~2.2x her
zone, head above the arcade screen line) driving +44% width and
vertical overflow; travel — frontal, navy+brass trunk, radar
colocated ON the counter, stanchions+rope in front (4 of 5 posts),
candle glows present, width -15% (first undershoot); beam-v — caps +
splices + aligned bolt columns perfect, shaft +57% wide (sim squishes
to 60 anyway); beam-h — END PLATES both sides, pipe terminates into
flanges, full construction stack, clean periodicity (module drew ~256,
tile normalized). Palette cuts DID NOT BITE: console 175->166
buckets, games 271->265. Sim rebuilt + justified (2035w floors).
Sheets: ab-{console,games,travel}-r15i.png. Awaiting verdicts.

## Round 15h — fleet 7 A/B: anchored vs free composition

User called fleet 6 "basically the same" — correct: previous-render
anchors lock composition (convergence by design), and the world boxes
capped perceived height (games was the market's shortest stall).
Fix: boxes raised (games 325x480, w98 370x520, gospel r15g rows) and
SIX regens flown: A = anchored orders at raised boxes, B = same kill
rules with composition FREED (positions demoted to suggestions,
anchors dropped; games-B from master crop). All landed + keyed;
ab-{console,games,w98}.png sheets. MY READ: console A better (Ed
excellent) but BOTH rugs still perspective-drifted — the rug war is
the one unresolved construction; games A better (taller wall, drippy
kid sign, dark) vs B (master-crop fresh, floor edge recedes slightly);
w98 B taller presence + fuller crown vs A friendlier bigger face. Sim
carries the A set pending user picks.

## Round 15g — fleet 6: the last three rulings landed

APPROVED to date: uses, papers, manual, talks, travel, stairs, wf,
beam-v, beam-h (9 of 12). Fleet 6 (detached, pulses) regenerated the
last three: console — THE RUG WENT FLAT: the games-floor two-surface
construction (woven band + fringe row, vertical ends) landed after
copying the games floor language verbatim; Ed kept from Image 5;
width +58. games — STYLE RECOVERED by swapping Image 1 to the user's
"prev was much better" fleet-4 render (dark chunk back, sister-only
handheld, kid-painted sign with drips, zero floor reflection, taller
structure); width +52. w98 — friendly solid face plate restored (big
amber eyes + mouth grille) over the bare-metal body, TALLER-THAN-WIDE
at last (822x924 art, +15%), crown to top, lamp casting, three green
families. Instruments that ended the wars: attach the user-preferred
PREVIOUS RENDER as the style/identity law (console Ed, games style),
copy a WORKING construction's language verbatim across stalls (games
floor -> console rug), aspect kill rules with measure-both clauses.
Remaining open: user verdicts on the three; width variance
(console +58, games +52) if he still cares.

## Round 15f — fleet 5 landed, all five rulings visibly executed

Detached fleet (dispatch5, Image 5 = fleet-3 render as console's
Ed/composition ref) + pulse-watcher updates. 5/5 landed + keyed. MY
VERDICTS: console — ED IS BACK (Image 5 worked: hair mass, visor,
presence, centered in the three-sided pocket), sign in clear air,
width +66 (from +94); talks — finally NOT the reference: taller
narrow kiosk +14%, UPPER ZONE (reel tins + high chart) present, open
interior, no standee; w98 — grow lamp CASTS (red zone on plants +
robot edge), THREE green families clearly alternating, bare-metal
robot, crown to box top, foliage overhangs face level, +36% (taller
box pulled foliage wide); games — kid-painted sign landed (wobbly
baseline, drips, blotch), ZERO floor reflection, taller structure,
sister-only handheld, +68%; travel — candles CAST (counter band, wall
patch, radar edge visible), restrained 8-family palette, +13%. Sim
rebuilt. Widths remain the one loose axis (console/games ~+66-68).

## Round 15e — fleet 4 landed through two session crashes

Two harness restarts killed fleets mid-flight (wf survived crash 1,
games crash 2); recovery relaunches + final DETACHED nohup launch
(dispatch4c) landed console/talks/w98/travel. Doctrine: long codex
fleets must launch detached (nohup + own process group + status file
on disk), with a pulse watcher for progress reporting. ALL SIX KEYED.
MY VERDICTS vs rulings: console — POCKET LANDED (racks left+right,
low units behind, clutter front; rug flat band; sign in clear air)
but width +94%; talks — taller open kiosk ✓, standee gone ✓, +35%
(from +97), green stain under cart scrubbed (5745 px); w98 — RULING
LANDED HARD: bare-metal open-frame robot, plant crown to box top,
darker bulb-lit scene, +9% width, magenta specks scrubbed (4238 px);
travel — taller stand ✓ 4 eyes ✓ smile ✓ restrained palette ✓ +18%;
games — style darker/chunkier ✓ sister-only handheld ✓ flat angle
held ✓ +38%; wf — stairs-sized tile (480 module) strongly periodic,
sim tile updated to 300 world. Sim rebuilt: best state yet. Open:
user verdicts + residual width variance (console/games).

## Round 15d — verdict round, six orders reworked, AWAITING REVIEW

User verdicts on fleet 3: beam-v and beam-h APPROVED as-is;
cross-seam lighting DROPPED by ruling ("almost impossible to do
right"); stair-aperture floor integration DROPPED (sim apertures
removed). Six orders reworked, NOT dispatched — review gate:
console (games-style THE ANGLE lead section: rug = flat 152px band
kill rule; Ed sits in a POCKET surrounded on three sides by the
nest); talks (standee REMOVED, kiosk stretched y=228..884 taller by
ruling, interior OPENED — no side walls, depth by dark back wall
alone, towers slimmer free-standing); w98 (LIGHT LAW: bulb-string-only
lighting one step darker; grow lamp casts with COUNTED receivers:
5 leaf clusters + shelf edge + 2 pot rims; robot BARE METAL — no
chassis, visible torso gaps, ≤70px wide, exposed pistons/wires, apron
only solid; 5b THE TALL PLANT reaching box top y=232 above everything);
games (STYLE kill rule vs the bright-cartoon drift — match Image 1
darkness/chunk; structure must TOUCH y=304 and fill 616; sister ALONE
holds the handheld, brother's hands empty); travel (TALLER STAND
640×832 canvas / 400×520 world, wide pass rejected, full renumber,
14-value agent clamp + 2-tone props); wf (tile = STAIRS DIMENSIONS:
480×955 canvas / 300×597 world, three identical modules, joints at
48/528/1008/1488). Gospel + stalls.mjs + guides + orders.html synced.

## Round 15c — fleet 3 (coverage clauses) landed

Orders patched with coverage/kill clauses in fraction language + named
widest-elements; fleet 3 flew 7/7, keyed, sim rebuilt. Width vs
contract, fleet2 -> fleet3: travel -30% -> +9% (WIDEN RULING LANDED —
the harder Image 1 demotion + both-direction kill rule worked); w98
+32% -> +24% (third straight improvement); console +54% -> +64%
(worse); games +44% -> +74% (worse — structure grew, but the ANGLE
held again: flat storefront, 48px floor strip); beam-v ~2x unchanged.
Travel content complete (sign, LAST SEATS, cards, helmet, banjo,
candles+sconce, radar, rope queue, trunk, 4-eye agent). Games content
its best yet (bulb patches, handheld floor glow, dead-front
everything). Fleet-2 raws archived as gen-<id>-r15b.png. Open
question for the user: accept ±10-25% width variance (hitboxes absorb)
or keep enforcing console/games/beam-v.

## Round 15b results — fleet 2 landed, sim rebuilt

7/7 generated, keyed, sim rebuilt (approved five + regens). MY VERDICTS:
games ANGLE FIXED (floor a 48px strip, dead-front everything, kids
216/194) — the leading kill-section worked; w98 tamed to +32% (from
+76%), robot visibly tallest, five plant species landed incl. pink
blooms; console compact nest, r11 palette, pipe heights kept — but
still +54% wide vs the narrowed box (rug spread); travel DISOBEYED the
20%-wider ruling — drew -30% NARROWER (the master-crop attachment
anchors narrow; needs a wider-direction kill rule or a different
Image 1); beam-v rich (rust, oil, glints) but still ~2x wide (+87%) —
downscales cleanly; wf + beam-h rich passes excellent and strongly
periodic. Sim: r15/simulation.html — floors read as one coherent
market; rich WF/separator transformed the backdrop. Width discipline
remains the open front: talks +97, console +54, games +44, w98 +32,
uses +15 (approved as-is), travel -30.

## Round 15b — user verdicts + fleet 2

APPROVED AND LOCKED: uses, papers (with magenta scrub), manual, talks,
stairs. REGEN RULINGS (all = fresh generation at new geometry, never a
rescale): console 10% narrower (box 325×520 world, pipe heights kept);
games 10% smaller (325×385, kids 135/121 world) + a leading THE ANGLE
kill section (floor = 48px strip, no stage/room) after another angle
failure; travel 20% wider (455×450, five queue posts); w98 same box but
width-kill rule (previous drew +76%), robot raised to 384 canvas / 240
world (gospel updated), five distinct plant species replacing repeated
leafy pots; wf/beam-v/beam-h rich passes — palettes doubled by ruling
(6→13, 7→14, 7→22, all master-sampled) with counted per-module detail
(bolts, rust drips, oil stains, grain, secondary conduit), periodicity
contracts kept. Gospel hitbox table + figure table updated with the
rulings. First-pass gens archived as gen-<id>-r15a.png. Fleet 2
dispatched: dispatch2.sh, 7 jobs.

## Round 15 — FLEET FLOWN, floors simulation built

All 12 generations landed (dispatch.sh, 6 concurrent, zero failures),
keyed via key-official (binary alpha), papers magenta stains scrubbed
(8077 px). PROPORTIONS WON: every stall shows master-true
figure-to-structure ratios (chef small behind counter, Ed dwarfed by
nest, kids tiny vs arcade, robot tallest on F3) — the proportion-guide
attachment + ratio self-checks defeated character inflation. Identity
strong everywhere; talks carries the full bazaar2 inventory incl.
standee/cart/decals; console wears the r11 palette; travel finally
narrow and deep. BOX COMPLIANCE loose: widths vs contract — talks +97%,
w98 +76%, console +54%, games +42%, uses +15%, stairs +8%, papers +4%,
manual +1%, travel -23%, beam-v drew 2x wide (used as single fat beam).
Sim displays height-true trims (widths as-generated, disclosed).
Defects flagged: manual steel drifted bright silver + oversized hover
gap (frozen-identity deviation); console rug still slightly
perspective-ish, 6 boxes vs 3; beam-h band order deviates from spec;
tile periodicity approximate. Deliverables: r15/simulation.html
(build-sim.mjs + sim/dims.json), contact sheets r15/sheet-{1,2,3}.png,
box-fit reporter r15/cut-boxes.mjs. Awaiting per-asset verdicts.

## Round 15 — proportion-locked orders AUTHORED, awaiting user gate

Wave extended to TWELVE orders. Talks REWRITTEN from the user-designated
bazaar2 reference (public/images/bazaar2/assets/stall-talks-baked.png,
"this is the ref for videoclub but with neon sign"): full inventory
restored — standee (pinstripe man, cream cutout border, kickstand), red
tape cart, counter decals (tape-X + rewind icon), reel tins, boombox,
star + rocket ornaments, card box, bell, 6-bar SMPTE TV with antenna —
neon sign kept from r13, all other hexes sampled from the reference,
clamped at 48. Four ARCHITECTURE orders authored (prompts/r15-beam-v,
r15-beam-h, r15-wf, r15-stairs): master-sampled palettes (7/7/6/10
values), uniform ×1.6, human-328 ratios, flush-edge box contracts,
STRICT 192px periodicity for the tileables (joints + couplings on the
grid, identical modules), stairs = F1 canon drum (480×955, ~15 treads at
riser 48, amber base strip; F2/F3 later by mirror per standing ruling).
World frame ratified in the orders: floor strip = the gospel 60-world
raise; fascia(25)+underside(60)+ceiling band(140) = the horizontal
separator beam (225 world); architecture ground line = front line at
canvas y=990 (stalls keep 920). Guides + stalls.mjs + orders.html
extended to 12 entries; auto-merge chain-damage on the new files
repaired (degenerate trios, duplicate clamp tokens, stale counts).


Eight SUPER-verbose orders at prompts/r15-<stall>.md, inspector page at
r15/orders.html (regenerate with r15/build-orders-html.mjs). Each order
fuses: the gospel hitbox as a canvas box contract (uniform world→canvas
×1.6, ground y=920, box centered x=768 — every asset downsamples by the
same 0.625), hard figure heights with self-measure checks (adult 328,
w98 robot 344, manual robot 272, Ed seated 216, sister 240, brother 216,
clerk 240, agent 320), per-element hex anchors SAMPLED from the authority
images (r15/sample.mjs bucketed sampler + r15/rule.mjs grids +
r15/rects/*.json — exact-hex counting fails on diffusion output), the
angle-law diagram, hard-step light receivers, letter-by-letter text
whitelists, counted self-checks. Color authorities: approved alphas
(uses, manual, w98), r13 alphas (console, talks, games), master crops
(papers — kiosk+glow restored; travel — narrow 380-world booth + 1m
depth by overlap). Outputs will land at r15/gen-<stall>.png, keyed via
r10/key-official.mjs. NOT DISPATCHED: user inspects orders first.

Attachment doctrine revision (user flagged the risk): Image 1 anchors
proportions harder than prose, and six of the eight Image 1s were the
inflated assets themselves. Fix: Image 1 demoted to identity+color with
an explicit "copy zero geometry from Image 1" clause, and a NEW drawn
instrument attached as Image 2 — per-stall proportion-guide PNGs
(r15/guide-<stall>.png; r15/build-guides.mjs + r15/stalls.mjs) showing
the stall box, figure boxes, keylines, ground line and adult bar, with
the never-draw clause (the model once copied guide lines literally).
Image numbering shifted accordingly in all eight orders; orders.html
now shows each guide beside its authority.

Console color authority re-designated by the user: r10/console-alpha-r11.png
("this is the correct colors reference for console"). r15-console re-anchored
from it (warm olive racks, orange frame #dc7707, gold glyphs #f5b749,
grey-white tank, dark red-brown skin, rust-brown rug + fringe, warm cable
spaghetti added as item 14). Geometry unchanged: bent-pipe sign, flat-band
rug, Ed 216. Anchor-merge EXECUTED on the user's order (tol-8 channel-distance
dedupe, representative = closest-to-cluster-mean): console 72→40,
games 87→45, uses 97→60, manual 72→53, travel 73→52, talks 65→50,
w98 79→63, papers 50→41. Each order now opens COLOR LAW with a PALETTE
CLAMP naming its exact count. Chain-merges collapsed ~18 material trios
into body==light degenerates; all repaired (two-tone wording, or the
surviving brighter step where one existed, darkest-in-file for recess/
joint lines). Mechanical post-key quantization still NOT approved.

## Round 13 — angle-law diagram round

New instrument: r12/angle-law.png — a drawn reference (green legal
construction: front rectangle + one thin top band + vertical sides; red
crossed-out isometric construction) attached to every order. Prose geometry
failed four rounds; the diagram landed it in one.

| Asset | File (r10/) | sha256 (16) | r13 verdict |
|---|---|---|---|
| console | console-alpha.png | 289848b1ee0f4a16 | rug now a flat frontal band, palette-clamped flat, boxes green-construction, sign on a tall bent half-broken pipe with chains |
| talks | talks-alpha.png | 5191baefd2939b5c | tall storefront regen, five-row tape towers, complete neon, richness restored |
| games | games-alpha.png | ce1cc64bc1c31b63 | ANGLES CORRECT (all boxes + floor green-construction), all bulbs cast lit patches, sign bracketed to post |

User approvals standing: uses, manual, w98, games(prior round: re-review
now), papers(rejected r12: rework queued), travel(rework queued: reasonable
width + 1m depth). Console/talks/games from this round: pending user review.
Floor previews rebuilt with the r13 set: r12/recompose-floor-{1,2,3}.png.
STILL PENDING: papers + travel reworks; scale doctrine ruling (uniform
character height vs fit-to-bay); F2/F3 master regens with measured coords.

User law now in force: prompts leave nothing to codex — every color a hex
from the Proposal A library, every position a number. Manual APPROVED and
frozen. Seven stalls reworked; all keyed via r10/key-official.mjs (binary
alpha).

| Asset | File (r10/) | sha256 (16) | r12 verdict |
|---|---|---|---|
| uses | uses-alpha.png | f16ee06e7b32d6e0 | marquee top + rope anchors added; edit re-rolled details (canopy fringe, crate colors, stone platform) — disclose |
| papers | papers-alpha.png | 68f113ee78907c26 | teal wood posts (steel gone), aberrations gone |
| manual | manual-alpha.png | b514f6379a0e84a3 | APPROVED, untouched |
| console | console-alpha.png | 660a60d16bb4ae7d | compact monospace board on taller pole, white monitor halo, stronger under-shadows |
| talks | talks-alpha.png | f5b475b7677c9268 | clean regen, dark-skinned clerk, complete neon, SMPTE hex columns |
| w98 | w98-alpha.png | 3ef5a18c758de193 | infrared red grow light, warm cozy bulbs, deep-blue creatures; red wash covers most of left shelf — disclose |
| games | games-alpha.png | 774866ec665a48a5 | box-angle law passed, bulbs emit with lit patches, arcade cyan rim on sister's back, sign bracketed to post |
| travel | travel-alpha.png | 5deb7829aaf06069 | 33-hex clamp, full-width booth, radar seated with contact row, three candle sets incl. interior |

Raw chroma sources: r10/gen-*-r12.png (+ prior). Checkers: r10/*-checker.png.
STILL PENDING: F2/F3 whole-floor master regens with measured coordinates;
first recomposition test (assets over WF + beams).

All eight stalls extracted via the approved verbose method. Unified keying
pipeline at r10/key-official.mjs: official codex remove_chroma_key.py
(auto-key border, soft matte 12/60) + geometric partial resolver (partials
within 2px of transparency die as edge blends; interior partials keep RGB,
snap opaque). Reason: the helper's own despill/soft-matte misclassifies
purples and warm hues against magenta keys — it executed w98's violets and
made half of games translucent (raw generations were correct; audits:
r10/games-partialmap.png). Binary alpha everywhere now.

| Asset | File (r10/) | sha256 (16) | Notes |
|---|---|---|---|
| uses | uses-alpha.png | c13d6288ff8b0346 | r9 verbose gen, re-keyed |
| papers | papers-alpha.png | 111a3d5f6dc2c2a7 | spelling fixed; side posts drifted to riveted steel |
| manual | manual-alpha.png | b514f6379a0e84a3 | r9 verbose gen, re-keyed |
| console | console-alpha.png | dc09862a0c0558db | r11: cable coherence, stepped highlights, cream pizza box, monospace taller sign |
| talks | talks-alpha.png | 809790efd8fa454b | complete neon sign; dark-skinned clerk; TV-only counter |
| w98 | w98-alpha.png | 42d6fb7614db6368 | violets restored; complete ragged foliage |
| games | games-alpha.png | e365d0b0d078ccc5 | keying-murk fixed; couple of bulbs float slightly off-string |
| travel | travel-alpha.png | 851f0f23d846e70d | complete triangle sign, Travel Ventures, banjo, radar |

Checker previews: r10/<name>-checker.png. Raw chroma sources kept as
gen-*.png for future correction rounds. STILL PENDING: the F2/F3 whole-floor
master regens with measured coordinates (user's list), and recomposition
testing of these assets over WF + beams.

## Round 9 extraction assets (UNVERIFIED, method approved by user)

All keyed with the fixed keyer (edge-contract 2px): residual fringe 0 on
every asset, verified against hostile pink.

| Asset | File | sha256 (16) | State |
|---|---|---|---|
| Uses (verbose redo) | r9/verbose-uses-alpha.png | d8a6d31aa39d42bb | user: "basically perfect", missing marquee top |
| Uses (mask-cut) | r9/cut-uses-alpha.png | f0f06ed7b20c801a | byte-true pixels, ragged edges |
| Manual (verbose redo) | r9/manual-alpha.png | a4eb7324562094a0 | identity complete, slight proportion drift |
| Console (verbose redo) | r9/console-alpha.png | 58e42defced36f2c | nest topology fixed; 2 sub-items missed |

Console detail: the nest rule worked — rack tower directly behind Ed,
machinery wrapping both sides, boxes stacked right, cables threading through,
ONE connected silhouette instead of two piles with dead space. No lamp, no
bulb, no leftover cord. Ordered but NOT landed: the pizza box and power strip
still sit off the rug's left edge instead of on it, and Ed is not visibly
dimmed (skin still reads bright; no static-monitor tint on his hair top).

## Round 9 audit — TWO PIPELINE BUGS FOUND AND FIXED

Bug 1: coordinate frame mismatch. Every prompt coordinate so far was derived
from the v2 CONFIG, but the generated masters never adopted the config's bay
geometry — gpt-image laid out its own proportions. Measured drift on Floor 2:
manual bay config 225-565 vs rendered 306-646; console bay config 623-953 vs
rendered 726-1066; beam columns render 70-80px wide, not 16px. Everything is
80-120px right of config. Consequence: the Ed box I sent (x740-840) pointed
at the BEAM, not the bay centre, and the "rug x700-880" zone straddled the
beam — which is exactly why the pizza box and power strip render outside the
stall. Fix: r9/measured-geometry.json now records bay/beam bounds READ FROM
THE RENDERED MASTERS (rulers: r9/ruler-f2.png, r9/ruler-f3.png,
r9/audit-ruler-console.png). All future prompt coordinates, crop windows and
light maps must come from measurement, never from the config.

Bug 2: chroma fringe. Every keyed asset kept a 1-2px chroma-tinted rim:
diffusion output blends art into the key colour, and no distance threshold
removes a blend. Fix in r8/key-chroma.mjs: alpha edge-contract (default 2px,
EDGE_CONTRACT env), despill radius widened to 3px, a residual-tint scrub on
surviving edge pixels, and a fringe audit printed per run. Re-keyed assets
now report residual fringe 0 (verified visually against hostile pink:
r9/fringe-check-uses.png, r9/fringe-check-manual.png).

## Round 9 update — dual extraction paths on Uses

Path 1 — deterministic mask-cut (r9/mask-cut.mjs): cuts the stall pixels
straight from floor-1-r7a. Global background color model from per-bay bgRects
+ flood-fill connectivity + never-background rule for near-black pixels (the
outlines act as flood barriers) + per-bay keepRects (platform, canopy, kana
row) and eraseRects (ceiling band, beam slot, right margin). Result:
r9/cut-uses-alpha.png — byte-true master pixels, beam column left as a
transparent slot for the beam module, minor edge raggedness and restored
wall chips that disappear over the tiled WF. Per-bay rect config is the
manual cost (~10 lines per stall).

Path 2 — maximum-verbosity redo (prompts/r9-extract-uses-verbose.md): full
structural inventory transcribed from the master (12 numbered elements with
coordinates, stripe order, garment details) + colors-from-Image-1 directive
+ chroma rules. Result: r9/verbose-uses-alpha.png — identity faithful this
time (pink cat, crates, kana, stripe order all preserved), cleaner isolated
render, slight proportion drift vs the master. Confirms the verbose-or-
nothing rule for codex.

Round-8 note: loose extraction prompts produced identity drift (rejected);
the r8 papers attempts (typo, archivist swap) stand as evidence.

---

## Round 8 update (superseded by round 9) — extraction trial + F2/F3 design fixes

Floor 1 (floor-1-r7a) is the approved-direction master; the module
extraction trial ran against it. Floors 2 and 3 took consolidated fix
passes from their r7a bases.

Extraction trial (r8/):
- stall-uses-alpha.png (sha 14e6594e…): green-chroma redo keyed to alpha via
  r8/key-chroma.mjs (corner-sampled key, island removal, despill). Strong
  flat re-render, complete platform, clean silhouette. Drift vs master:
  canopy stripe order, sign board shape, customer hoodie lost its cat motif,
  chef garb color.
- stall-papers-alpha.png (sha 41b30ef8…): v1 misspelled the awning
  ("paperss") — rejected; v2 spells papers correctly, clean keying, but the
  archivist drifted (bun-haired figure) and the kiosk re-invented counter
  and racks. Kept as trial evidence; acceptance bar is the user's call.
- Verdict: the redo→chroma→key pipeline works end to end; per-attempt
  identity drift is the open problem (options: attempt-and-select, or
  harder color/shape pinning per attempt).

Floor fixes:
- floor-2-r8c.png (sha ec846ad3…): clutter nested tight around a dimmed Ed,
  leftover bulb cable removed, counter carries only the center-facing SMPTE
  CRT, bottom VHS removed, right H-beam restored occluding the counter end,
  Congolese dark-skinned clerk, Manual bay frozen. Codex twice wrote stencil
  lettering on the rock box; residue erased with a DISCLOSED manual 46×15px
  flat-color patch sampled from the box face (r8/zoom-rockbox-fixed.png).
  Supervisor review: pass.
- floor-3-r8.png (sha d0b8ef5c…): games recovered its single-level wooden
  floor with gospel-angle crates, christmas lights confined to the sign
  string with real glows (floating dots removed), Travel rebuilt (corrugated
  white-rusty plates + wood, military tarp marquee, triangular patch-style
  "Travel Ventures" sign, smiling Hearthian in red fighter-jet vest, banjo
  below the helmet, radar seated with base contact). Supervisor review: fail
  on W98-02 only (foliage sits adjacent to its beams; the ordered
  behind-the-beam occlusion is not clearly established). Sign triangle
  points up like the patch, not down like a Yield sign — noted.

Rubrics v5 encode the round-8 rulings (beam-over-stall occlusion doctrine,
TV-only counter, Congolese clerk, corrugated Travel, Travel Ventures text,
wood games floor, contained Console). Sign reference authored at
r8/travel-ventures-sign-ref.png.

---

## Round 7 update (superseded by round 8) — strategy A/B comparison

Both strategies ran on all three floors per user request.

Strategy A (winner, all floors): one consolidated whole-floor edit per floor
from the cleanest base (F1←r4, F2←r6, F3←r6), with coordinate light maps
(r7/light-maps.json), Ed placement geometry, exact games camera spec, candle
conversion at Travel, floor-projected hologram, static-monitor Console.

Strategy B (failed, all floors): regional crop → regenerate → deterministic
paste (r7/region-tools.mjs, byte-identity assertion outside the paste window
— assertion held on every paste). Failure mode: gpt-image edit re-stages
content inside the crop, so pasted bays misalign with frozen surroundings:
truncated w98 sign, duplicated console sign fragment, hard tone seams at
window edges, half-removed lantern pair. B needs in-crop boundary markers,
wider paste windows and tone matching to become viable; not pursued further
this round. B composites kept as evidence: candidates/floor-{1,2,3}-r7b*.png.

Presented set (strategy A):

| Floor | Path | sha256 | Machine | Semantic (supervisor) |
|---|---|---|---|---|
| 1 | candidates/floor-1-r7a.png | 2c4c65bc… | fail (superseded strict axes) | pass |
| 2 | candidates/floor-2-r7a.png | f7b07b69… | fail (superseded strict axes) | pass |
| 3 | candidates/floor-3-r7a.png | feba1c8b… | fail (superseded strict axes) | pass |

Light-source table (user canon) applied and zone-checked
(region-tools.mjs lights): lanterns primary at Uses; floor-projected hologram
washing Papers blue; two two-color hanging lamps at Manual; lampless Console
lit by a white-static monitor; neon at Video Club; bulb strip + surfacing
purple lamp at w98 (violet on robot back); christmas sign lights + arcade CRT
+ handheld at Games; candles (lanterns removed) at Travel + radar green.

Known notes on record: Ed deeper but not at the exact prescribed box;
christmas glow dots subtle; Hearthian expression slightly stern; the r4
eating customer's own small bowl remains (the floating added bowl was never
reintroduced). Tooling gotchas fixed this round: image_gen square preset is
1254² (only 1536×1024 is exact → crops re-padded); sharp stats() reads the
input, not the pipeline (sampler materializes extracts now).

---

## Round 5/6 update (superseded by round 7)

Ten-item user feedback pass over the round-3/4 set, edit-mode with Floor 1 r4
as style/stair canon, plus two micro-fix edits (r6).

Presented set:

| Floor | Path | sha256 | Machine | Semantic (supervisor) |
|---|---|---|---|---|
| 1 | candidates/floor-1-r5.png | 9d8f9236… | fail (superseded strict axes) | pass |
| 2 | candidates/floor-2-r6.png | 20e8d8dd… | fail (superseded strict axes) | pass |
| 3 | candidates/floor-3-r6.png | 4caa72ba… | fail (superseded strict axes) | pass |

Applied: F1 ramen bowl on counter, Papers spans its full bay, katakana
cleaned. F2 Manual bay re-rendered chunky-flat with colorful big parts and
(r6) a metallic riveted counter, Ed moved deeper with receivers on him and
all clutter inside the footprint, neon VIDEO CLUB casts a downward cyan band,
standee removed, stairs rebuilt to F1 canon. F3 w98 bay re-rendered
chunky-flat, robot worn yellow-ochre, (r6) lower creature anatomy explicit,
Games platform top hidden with lit under-seam, christmas string lights on the
games sign with causally bright kids, Hearthian re-proportioned to c7,
stairs rebuilt to F1 canon.

Rubrics v3 encode the round-5 rulings. Reviews:
reviews/review.floor-1-r5.json, review.floor-2-r6.json,
review.floor-3-r6.json. Bound reports: reports/floor-N-r{5,6}-final/.

---

## Round 3/4 update (superseded by round 5/6)

User feedback on round 2 approved style/rendering/proportions/integration as
direction and ruled the measured color counts acceptable for a master. Rounds
3 and 4 applied the full design-fix list under v2 geometry.

v2 geometry: scene window widened to 1404×597 at x=66,y=213 (same rails);
every stall flanked by its own H-beam pair (two beams between adjacent
stalls); uniform 117px stair/WF tile; NO up/down signs; NO drains or water.
Configs: configs/*.v2.config.json. Guides: guides/guide-floor-N-v2.png.
Rubrics: rubrics/*.v2.json.

Presented set:

| Floor | Path | sha256 | Machine | Semantic (supervisor) |
|---|---|---|---|---|
| 1 | candidates/floor-1-r4.png | a5890ffb… | fail (legacy strict axes) | pass |
| 2 | candidates/floor-2-r4.png | 3f35429f… | fail (legacy strict axes) | pass |
| 3 | candidates/floor-3-r3.png | 220e951f… | fail (legacy strict axes) | fail (W98-04 lower creature fins) |

Round 3 fresh generations applied: F1 eating customer, complete stair drum,
no drain; F2 military-green camera-eye elongated Manual + metallic stall +
big junk module, exact Bazaar 2 Ed (console-master-bazaar2-v1, no laptop),
plastic-counter frontal Video Club with neon sign, complete standee; F3 w98
sign rename, rust-red robot, surfacing violet lamp, edge-on Games platform,
low-poly Tekken-style arcade intro, deep high-contrast Travel with
radar-only counter, no plant/water overflow. Rear-darker-than-front lighting
rule and light-type variety applied on all floors. F1-r2 was the style anchor.

Round 4 surgical edits (F1, F2 only): merged seam beams split into true
pairs; missing outer beams added. F3-r3 already had correct pairs.

Known open items: F3 lower-left creature shows antennae and rose belly but
not the explicit three dorsal fins / four legs (honest review fail W98-04);
F1 katakana row approximate; machine gate still fails the superseded strict
64-color/3×-grid axes plus exact-matte hex (generator-class, on record).

Prompts: prompts/floor-N-r3.md, prompts/floor-{1,2}-r4.md. Reviews:
reviews/review.floor-{1,2}-r4.json, reviews/review.floor-3-r3.json. Final
bound reports: reports/floor-{1,2}-r4-final/, reports/floor-3-r3-final/.

---

# Round 1/2 record (superseded)

Supervisor: claude-fable-5. Generators: three `codex exec` subagents using the
built-in image_gen tool (gpt-image-2 class). Two rounds per floor. No
post-processing of any candidate. No runtime files touched. Nothing promoted.

## Status

All three candidates are UNVERIFIED. User approval is absent. The verifier's
`userApprovedSha256` field is null in every review. Machine gate fails on all
three (see below). Supervisor semantic review passes floors 1-2 and fails
floor 3 on two checks.

## Deliverables (round 2, presented candidates)

| Floor | Path | sha256 | Machine | Semantic (supervisor) |
|---|---|---|---|---|
| 1 | candidates/floor-1-r2.png | 9455dbac… | fail | pass |
| 2 | candidates/floor-2-r2.png | bce8f0f0… | fail | pass |
| 3 | candidates/floor-3-r2.png | cf6fe57a… | fail | fail (PRJ-05, TRV-05) |

Round-1 comparisons: candidates/floor-{1,2,3}-r1.png. Round 2 is the
04-workflow rendering-normalization comparison over round 1 plus listed
corrections.

## Machine gate summary

All six generated candidates fail the same axes:

- exact 64-color palette (measured 110k–161k opaque colors);
- exact 3×3 pixel grid (measured 0–0.35% solid blocks vs 99.8% required);
- entropy/texture thresholds;
- exact #020307 matte (borders render near-black, not the exact hex);
- rail luma-step coverage (positions land inside tolerance; the value step is
  too soft).

Rejected-baseline comparison: the three 2026-07 rejected PNGs measured 158k–204k
colors with the same 0%-grid class. The new candidates improve macro flatness
and composition but the strict grid/palette contract is out of reach for this
generator class. Six of six samples agree. Meeting that contract requires an
authored quantization/re-pixel pass, which is a separate explicitly-approved
step, never a silent rescue.

## What was fed to generation

- Per-floor low-color geometry guide built from the per-floor verifier config
  (guides/, build-geometry-guides.mjs). Configs for floors 1-2 derived from the
  floor-3 original: same rails, thresholds, palette; bays re-cut per the locked
  desktop composition.
- Camera gospel crop (Uses countertop), per-tenant identity references
  (approved/directional sources only), v5 canonical as rendering-density
  reference. No rejected floor composites were fed.
- Full prompt orders stored under prompts/ (round 1 and round 2).

## Round-2 corrections applied

- Floor 1: cyan Down blade moved to the far upper-left. Confirmed.
- Floor 2: stair legibility raised one step. Confirmed.
- Floor 3: literal red rail stripes removed; robot plating dark olive-grey;
  upper creature three vertical amber eyes; Hearthian eyes read as two pairs.
  Confirmed. Lower creature fins still not explicit (PRJ-05 fail). Rocket
  model still absent from Travel (TRV-05 fail).

## Verification artifacts

- reports/floor-N-r1/ and reports/floor-N-r2/: unbound machine audits.
- reports/floor-N-r2-final/: machine audit + hash-bound semantic review.
- reviews/review.floor-N-r2.json: supervisor review, bound to sha256.
- Guide overlays, failure overlays, logical previews and 300px readability
  previews sit in each report directory.

## Open decisions for the user

1. Approve, reject, or redirect each floor's direction.
2. Decide whether the strict machine contract stays a hard gate for masters,
   or becomes the target of an authored quantization step after visual
   approval of composition.
3. Floor 3 fixes if direction approved: lower creature anatomy, Travel rocket.
