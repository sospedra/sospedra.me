# Recovered latest floor-master prompts

The image-generation tools did not store the exact tool prompts in the repo.
This file reconstructs the semantic instructions used for the three PNGs under
`masters/unapproved-latest/`.

These images are rejected/unapproved. Preserve these prompts as provenance and
negative evidence, not as automatically reusable production prompts.

## Shared prompt block

```text
Use case: stylized-concept.
Asset: complete 2D pixel-art game environment master.

Create one coherent authored floor scene, not separate sprites pasted over
wallpaper. Wide landscape, raw 1536x1024 acceptable, composed so a clean 2.09:1
central scene can later be cropped without cutting any character, stall,
stairs, sign, or prop.

The stalls occupy rear bays. The lower 25–30% is a continuous open market
lobby/walking aisle with visible shallow floor top, front fascia/trench, and no
cropped props.

Show ceiling/slab line, wall-floor contact line, and front lobby/fascia line as
parallel horizontal camera references.

Camera:
- front-facing shallow oblique/axonometric RPG view;
- parallel projection;
- no vanishing point;
- vertical walls, posts, racks, H-beams, and character centerlines;
- horizontal counter fronts, shelves, beams, ceiling, wall contact, floor seams,
  and fascia;
- shallow top planes around 0.2 height-to-width;
- no isometric rotation, convergence, deep trapezoids, deep ellipses, or
  dramatic top-down view.

Integration:
- real H-beams at real bay seams, not identical cages;
- shared utility network with visible purpose;
- cable behind equipment and back in front;
- pipe feeding a stall or drain;
- light touching both stall and world;
- tenant wear crossing boundaries;
- exact irregular support/contact islands;
- architecture one value step darker than stalls.

Rendering:
- genuinely low-resolution authored look;
- nearest-neighbor enlargement;
- strong near-black structural outlines;
- flat large bounded masses;
- chunky 16-bit-inspired clusters;
- normally three tones per material;
- sparse hard highlights;
- quiet surfaces;
- detail concentrated around identity and action;
- simplified surfaces, never simplified layout or identity.

Reject:
- antialiasing;
- gradients;
- blur;
- painterly shading;
- pseudo-pixel microtexture;
- tiny scratches/rivets everywhere;
- random wires or colored pixels;
- soft bloom;
- mixed pixel density;
- pasted-card stalls;
- generic dark background as integration;
- missing H-beams;
- detached/oversized stairs;
- foreground stalls;
- clipped props;
- global brown/teal tint;
- extra text, logos, watermarks, street, or dialog.

Lighting:
- cool low-chroma ambient upper/front-left;
- right/far one palette step darker;
- undersides two steps darker;
- visible source -> direct stall receiver -> weaker world receiver -> compact
  shadow trending down-right;
- at most core/direct/spill;
- no fog, global tint, blur, translucent spotlight, or arbitrary opacity;
- lobby stays mostly dark.
```

The prompt then listed most of the 64-color Proposal A swatches. That did not
prevent palette explosion in the generated raw images.

## Floor 1 — Archive / Service

Result:

```text
masters/unapproved-latest/floor-1-archive-service.png
```

Specific prompt:

```text
Floor 1, Archive / Service.

Left-to-right:
- wide Uses ramen stall, about 46% usable width;
- narrower Papers archive stall, about 30%;
- integrated industrial spiral stair/recess on the right, about 18%.

Place a real H-beam between Uses and Papers and a structural collar at stairs.
Stairs reach floor to ceiling aperture with brackets, landing, and threshold.
Pink Up arrow is on stair side; cyan Down arrow is on opposite upper edge.

Uses:
- preserve severe ramen curator;
- wide asymmetric working stall;
- red lacquer, warm warped timber, muted purple/rose canopy;
- cooking vessels, shelves, menu scraps;
- stern older chef behind counter, folded arms;
- two compact stools and restrained back-facing patrons permitted;
- rough lowercase "uses" sign;
- no extra readable copy;
- two red/amber lanterns and one hanging bulb;
- grease, soot, service pipe, scrape, and contacts continue into architecture.

Papers:
- courteous scholarly holographic archivist;
- reads open book at fixed chest height;
- glasses and composed posture;
- cyan/teal hologram with hard scanline breaks, not soft glow;
- narrow teal archive kiosk;
- cream/yellowed paper, books, folders, pamphlet racks, wheeled display;
- lowercase "papers" sign;
- hologram touches book, hands, sill, H-beam, wall, and short floor strip;
- weak warm shelf strip is secondary;
- paper dust and conduit transition from Uses without making both stalls alike.

World:
- shared rear cable tray;
- meter/support;
- drain;
- wall scars;
- greasy pipe actually feeds Uses;
- archive conduit terminates at Papers;
- H-beam carries seam;
- tenant wear crosses boundaries.
```

Observed problems after generation:

- hundreds of thousands of colors;
- not a strict authored pixel grid;
- approved Uses/Papers structures were reinterpreted;
- prompt was not run through the repo master verifier before display.

## Floor 2 — Workshop / Media

Result:

```text
masters/unapproved-latest/floor-2-workshop-media.png
```

Specific prompt:

```text
Floor 2, Workshop / Media.

Left-to-right:
- integrated industrial stair/recess on left, about 16%;
- Manual organized repair/scrap stall, about 28%;
- Console dark low rug nest, about 24%;
- Talks / Video Club recessed stall, about 30%.

Use real H-beams at seams, one shared power/tool/vent/cable-trench network,
and an open lobby. Pink Up is on stair side; cyan Down at far upper-right.

Manual:
- original floating service robot;
- exactly three connected eye stalks;
- exactly three connected articulated arms;
- round steel/brass floating torso;
- downward thruster and visible hover gap;
- no legs, pedestal, pole, wheels, mount, or counter attachment;
- floats behind separate foreground counter;
- one arm dusts, one uses wrench/task lamp, one claw available;
- organized parts wall and machines;
- different complete front boxes/trays selling gears, valves, bolts, cable ends,
  and salvaged modules;
- lowercase "manual" sign;
- upper amber work lamp touches robot, tools, bracket, H-beam, and floor.

Console:
- preserve 1990s-anime Ed hacker identity from Bazaar 2;
- wild red hair;
- sits cross-legged on large faded red patterned rug;
- VR visor always on;
- no counter;
- racks, servers, monitors, controls, cables, pizza, and boxes on both sides;
- darker than neighbors;
- small teal/cyan screen sources plus weak amber practical;
- cable behind body and back in front, one crossing rug edge;
- very tall post, almost twice normal, with lowercase "console" at top;
- never tidy or brighten it.

Talks:
- deadpan woman clerk, cheek on one hand;
- deep wall recess;
- mahogany counter;
- VHS shelves and tapes;
- CRT with vertical SMPTE color bars;
- complete tape bin and life-size standee;
- warm pendant and CRT touch clerk, counter, tapes, wall, H-beam, and floor;
- top sign exactly "VIDEO CLUB";
- no other readable text.

World:
- continuous service rail;
- patch panel;
- vent;
- cable trench;
- Manual tool power connects;
- Console racks bolt to shared plates and vent heat;
- Video Club power connects;
- tenant wear and light cross boundaries.
```

Observed problems after generation:

- hundreds of thousands of colors;
- rich pseudo-pixel texture rather than strict flat clusters;
- generated extra readable `RETURN`;
- Manual remains unapproved and not a clean layerable basis;
- prompt was not run through the repo master verifier before display.

## Floor 3 — Leisure / Transit

Result:

```text
masters/unapproved-latest/floor-3-leisure-transit.png
```

Specific prompt:

```text
Floor 3, Leisure / Transit.

Left-to-right:
- integrated industrial stair/recess on left, about 16%;
- Projects roofless garden stall, about 30%;
- Games kid-built stall, about 23%;
- Travel deep booth, about 29%.

Real H-beams at seams. Pink Up on stair side. No Down because this is the last
floor.

Projects:
- completely roofless;
- no canopy, glass, greenhouse, or arch;
- rusty posts/low rails;
- warm bulb string;
- ragged foliage/post silhouette;
- abundant chunky plants and pots;
- visible water feed, drain, roots, vines, and moss;
- slim skeletal 1990s-anime mechanical gardener;
- small lens head, segmented torso, pistons, cables, joints, grippers;
- apron only;
- gently waters seedling;
- upper-right six-limbed indigo three-eyed mossy creature;
- lower-left round four-legged finned antenna creature with rose belly;
- lowercase rope-hung "projects" sign;
- warm bulbs, violet seed, and rose creature light touch world.

Games:
- crooked child-built cheap wood and bright blue plastic;
- visible wedges, screws, and improvised power;
- two siblings sharing one handheld;
- older/taller sister social and confident;
- younger/smaller brother protective;
- children 65–70% adult height;
- lower bodies fully visible and grounded;
- blue arcade cabinet;
- cartridges/controllers and two low stock crates;
- cable/drain junction;
- lowercase "games" sign;
- arcade cyan and warm bulbs touch children, H-beam, and floor.

Travel:
- deep enclosed wood/canvas/brass booth;
- thick side returns;
- rear wall one metre behind agent;
- friendly adult four-eyed Hearthian, never frog;
- blue-grey skin, four amber eyes in two pairs, pointed ears;
- practical travel clothing;
- behind foreground counter holding ticket;
- lowercase "travel" sign;
- exact "LAST SEATS";
- route map, cubbies, suit, helmet, instruments, shelves;
- broad simple masses;
- complete luggage and compact queue posts;
- amber lanterns touch face, suit, counter, returns, H-beam, queue wear, floor.

World:
- Projects water reaches drain;
- vine wraps shared H-beam;
- Games power reaches authored junction;
- Travel booth attaches to structure;
- queue/luggage wear enters lobby.
```

Observed problems after generation:

- worst exact 3× uniform-block rate of the three;
- hundreds of thousands of colors;
- approved Games behavior changed from siblings sharing the handheld to arcade
  interaction;
- stall structures and rendering were reinterpreted;
- prompt was not run through the repo master verifier before display.

## Takeaway

Long prose alone did not enforce the camera/palette/grid/identity contract.

The next attempt must add:

- an actual input geometry/crop guide;
- exact approved reference hierarchy;
- one-floor-at-a-time generation;
- untouched-source mechanical gate before display;
- hash-bound semantic review;
- immediate regeneration on hard failure;
- explicit user approval before downstream work.

