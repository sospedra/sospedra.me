# Stall identities and animation contract

The customer is the camera/viewer.

Every approved stall design and character identity is Gospel. Integration may
touch the world around a stall; it may not normalize or redesign the stall.

## Universal animation contract

Every stall ultimately has exactly:

- two looping idle frames;
- three hover frames.

Hover behavior:

```text
hover-1 -> hover-2 -> hover-3
```

The sequence plays once and holds `hover-3` while hover/focus remains.

### Immutable across all five frames

- canvas;
- crop;
- dimensions;
- CSS box;
- scale;
- transform and origin;
- root placement;
- rear architecture;
- stall structure;
- sign and lettering;
- fixed shelves, counters, rugs, machines, and clutter;
- floor and support contacts;
- surrounding environment;
- character torso/root position.

Nothing rescales.

No whole-layer translation, bounce, fake breathing, or camera change.

The torso never moves left or right. A character can rotate or bend around a
fixed root, lean over a counter, extend an arm, dip the head, or bow, provided
the root and surrounding structure remain fixed.

### Layered construction

Preferred model:

1. immutable rear plate;
2. bounded character cel;
3. bounded tool/held-object/effect cel;
4. immutable front occluder plate.

Do not generate five unrelated complete scenes.

### Required animation evidence

- five-frame contact sheet;
- onion-skin sheet;
- motion heatmap;
- immutable-byte diff;
- declared motion envelopes;
- root and torso deltas;
- alpha report;
- palette report;
- pixel-grid report;
- emitter/receiver mask;
- desktop and mobile captures at actual runtime size.

Any changed pixel outside its declared mask is a hard reject.

## Uses — the severe ramen curator

### Locked design

- Stern ramen chef.
- Upright with folded arms.
- Quiet, disciplined, exacting, and highly opinionated.
- Never hostile or cartoonishly angry.
- Working ramen stall.
- Stools, menu, cooking vessels, shelves, canopy, lanterns, and individual sign
  are retained.
- Uses is the primary camera and rendering Gospel.

### Idle

1. Silent assessment.
2. Slow blink plus tiny finger or eyebrow adjustment.

No body movement.

### Hover

1. Eyes meet customer; chin rises slightly.
2. One arm unfolds; two fingers indicate stool/menu.
3. Restrained nod and open palm: “Omakase.”

### Environmental integration

- grease;
- soot;
- scrape marks;
- heat;
- lantern wiring into shared utility;
- compact stool/crate contacts;
- warm receiver on nearby wall/metal;
- one meaningful foreground seam crossing.

## Papers — the holographic archivist

### Locked design

- Smiling, courteous, scholarly holographic archivist.
- Glasses.
- Holds and reads a physical/open book at a fixed height.
- Composed posture.
- Archive kiosk, shelves, paper, individual sign, and book context remain.
- Signal instability does not make the intellect or body chaotic.

### Idle

1. Calm reading.
2. Scanlines, glasses, page edges, and a few holographic fragments flicker.

Body and book anchor remain fixed.

### Hover

1. Signal stabilizes; archivist looks up.
2. Book opens wider; one finger finds a passage.
3. Open book is offered toward customer.

### Environmental integration

- archive/data conduit;
- paper dust and accumulation;
- rack-wheel contact;
- real shelf depth;
- cyan receiver on book, hands, sill, paper edges, H-beam, and wall.

Do not replace the book with a screen. Do not wash the entire booth cyan.

## Manual — the courteous floating service robot

Latest decisions supersede the original four-arm and pedestal declarations.

### Locked design

- Original non-copying domestic/service-robot design with a Codsworth-like
  useful personality.
- Compact round/ovoid floating torso.
- Exactly three connected eye stalks.
- Exactly three connected articulated arms.
- Downward thruster and visible hover gap.
- Floats in the rear aisle behind a substantial foreground counter.
- Counter occludes the lower thruster.
- No legs.
- No pedestal.
- No wheels.
- No support pole.
- No counter/table attachment.
- No body sitting on top of the counter.
- Individual Manual sign.
- Organized tools and parts.
- Different junk/scrap sale items in several distinct complete front boxes and
  bins.

No final Manual design is human-approved.

### Idle

1. Three arms perform separate chores: duster, wrench/task lamp, available claw.
2. Only three pupils scan; optional tiny spark.

Torso and arms do not drift.

### Hover

1. All eyes snap to visitor; work pauses.
2. Eye stalks dip in a miniature bow; tools tuck; one claw opens.
3. Eyes rise; one claw presents the counter; other arms cautiously resume.

### Environmental integration

- rear brackets;
- tool-power conduit;
- upper work lamp;
- oil and maintenance wear;
- thruster receiver in rear aisle;
- exact counter contact;
- foreground scrap inventory.

The current opaque `manual-v3` family is technically animated but not a safe
production base because its full environment is baked into the RGB frames.

## Console — the immersed infrastructure hermit

### Locked design

- Preserve the Bazaar 2 Ed identity from Cowboy Bebop.
- Wild red hair.
- Slim body.
- Sits cross-legged at a fixed root.
- Large worn patterned rug.
- VR visor always covers the eyes.
- Surrounded by racks, servers, monitors, boxes, pizza, controls, keyboards,
  and purposeful cable clutter.
- Comfortable and highly competent inside chaos.
- No conventional counter.
- Tall narrow post, almost twice the rejected short version, with individual
  `console` sign at the top.
- Bay stays darker because Ed does not care about lighting the stall properly.

Never tidy it. Never remove the visor. Never make Ed stand.

### Idle

1. Tracks invisible interfaces.
2. Small visor/interface change plus precise finger tap.

### Hover

1. Notices customer through visor; small head-angle change.
2. Raises quick peace sign.
3. Holds acknowledgment while other hand resumes controls.

Pelvis, torso, crossed legs, rug, racks, and root remain fixed.

### Environmental integration

- rack wall/floor anchors;
- power plate;
- vent and visible heat logic;
- cable behind body/equipment and back in front;
- exterior cable crossing the rug edge;
- teal/cyan receiver on Ed, hands, knees, rug, racks, wall, and trench;
- dust and rug contact.

Preserve red hair, rug, cardboard, steel, and screen colors.

## Talks / Video Club — the dry cinephile

### Locked design

- Seasoned woman clerk.
- Cheek resting on one hand.
- Cultivated boredom, not disinterest in cinema.
- Deadpan and highly discerning.
- Video Club/VHS structure, counter, shelves, tapes, individual sign, tape bin,
  and standee remain.
- CRT must show SMPTE color bars.

### Idle

1. Long quiet shift.
2. Slow blink; at most a fingertip tap.

### Hover

1. Slowly notices and evaluates customer.
2. Straightens around fixed root; selects/checks tape.
3. Offers tape with faint knowing smile.

### Environmental integration

- real wall recess;
- localized rectangular CRT receiver;
- warm pendant receiver;
- tape spill;
- worn floor;
- exact standee/bin contact.

Do not make the clerk cheerful or the stall a generic media kiosk.

## Projects — the patient robot gardener

### Locked architecture

- Completely roofless open-air garden shop.
- No canopy.
- No glass.
- No greenhouse.
- No arch.
- Ragged open silhouette of foliage and uneven posts.
- Two rusty riveted posts and low rails/trellises.
- Warped wood shelves.
- Rope/pulley.
- Terracotta pots, seed trays, soil, and tools.
- Abundant chunky plant masses.
- Nine to eleven warm string bulbs sagging between posts.
- Rope-hung, chipped, slightly askew wooden sign on upper-left reading exactly
  lowercase `projects`.
- No other readable text.

### Locked robot

- Slim 1990s-anime-informed machine.
- Dark olive-grey plating.
- Compact rectangular head.
- Two round lenses, one dimmer.
- Bent antenna.
- Narrow segmented torso with visible gaps.
- Exposed pistons, cables, joints, and mechanics.
- Oversized three-finger grippers.
- Moss on shoulder.
- Vine crossing arm/apron.
- Gardener apron is the only clothing.
- Gentle stoop.
- Watering can and seedling.
- Embedded and partially occluded by shop/foliage, never isolated mascot.

### Locked alien animals

Upper-right:

- dozing;
- six limbs;
- velvet indigo;
- three amber eyes in a vertical row;
- moss on back;
- curled tail;
- muted dusty-rose glow dot.

Lower-left:

- round non-mammal;
- four legs;
- three dorsal fins;
- two feather antennae;
- asymmetrical eyes;
- dim dusty-rose belly.

Both are uncaged and unmistakably non-Earth.

### Idle

1. Waters seedling carefully.
2. Lens, can, gripper, and a few water pixels change; optional creature blink.

### Hover

1. Notices visitor; water pauses.
2. Parts and inspects leaves.
3. Proudly presents a new sprout.

### Environmental integration

- water feed;
- shared drain;
- roots entering floor cracks;
- vine wrapping shared pipe/H-beam;
- damp and moss continuing outside stall;
- foreground foliage;
- fragmented warm/violet/rose receiver.

Reject fine fronds, chroma green, bulky armor, pale skeleton, Earth animals,
cages, clothes beyond apron, roof, glass, or mascot composition.

## Games — the siblings' kid-built stall

### Locked design

- Two young siblings share one handheld.
- Older/taller sister is confident, social, and excited.
- Younger/smaller brother is serious, suspicious, and protective.
- Both remain visibly child-sized.
- Each has an independent fixed torso anchor.
- Lower-body arrangement, handheld, sign, and internal props remain.
- Stall is crooked and visibly child-made from cheap wood and plastic.
- Visible blocks, wedges, improvised joints, screws, and power.
- Individual handmade `games` sign.
- Retain brighter playful blue/red accents.
- Never professionalize it or wrap it in matching industrial architecture.

### Idle

1. Sister plays; brother studies the screen.
2. Handheld flash, button, eyes, and eyebrows change only.

No bounce or body translation.

### Hover

1. Sister looks up excited; brother gives suspicious side-eye.
2. Sister makes enormous “NEW CHALLENGER!!!” wave; brother closes posture.
3. She presents game / “Best of three?”; he folds or decides / “I choose.”

### Environmental integration

- visible wedges;
- improvised power into shared junction;
- arcade light;
- floor scratches;
- crates and litter;
- platform/drain overlap;
- credible child scale.

## Travel — the last-seats Hearthian

### Locked design

- Friendly adult four-eyed Hearthian.
- Never frog.
- Four distinct eyes.
- Blue-grey alien skin.
- Long pointed ears.
- Experienced, welcoming, adventurous, charmingly urgent travel agent.
- Practical astronaut/travel clothing.
- Handmade wood/canvas/brass booth.
- Individual Travel sign.
- Exact readable `LAST SEATS`.
- Tickets, route map, instruments, astronaut gear, helmet, and luggage.

### Required booth depth

- Enclosed booth.
- Rear wall approximately one metre behind agent/counter.
- Thick side returns and soffit.
- Visible overlap and darker rear floor gap.
- Environmental detail in broad masses.
- Surfaces remain simplified.

Never flatten it into a facade or turn it into a corporate kiosk.

### Idle

1. Manages tickets.
2. Slow four-eye blink plus ticket shuffle.

### Hover

1. Welcoming four-eye contact.
2. Raises selected ticket.
3. Holds ticket and points toward improbable route.

### Environmental integration

- booth attachments into shared structure;
- properly bright amber lantern receivers;
- queue and transit wear;
- arrows/tags/luggage marks continuing into lobby;
- exact luggage and queue-post contacts.

Reject frog anatomy, two eyes, shallow wall, over-detailed surfaces, clipped
luggage, or uniform corporate presentation.

