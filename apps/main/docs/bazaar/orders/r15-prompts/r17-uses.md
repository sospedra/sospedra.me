# r17 order — USES — layered animation build (chef + steam)

READ FIRST, in this order:
1. /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r17/DOCTRINE.md
2. The four reference implementations it names (papers pilot scripts).
Everything below assumes the doctrine. Work only inside
/Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r17/uses/

LOCKED STATIC: /Users/sospedra/labs/sospedra.me/tmp/bazaar3/master-run-20260728/r15/gen-uses.png
Chroma: #00ff00.

## The stall, described

A ramen counter. THE CHEF stands behind the counter center-left: an
older man, gray/white swept-back hair, dark brows, stern face, dark
apron over a dark shirt, ARMS FOLDED across his chest. In front of the
counter on the right sits THE CUSTOMER on a stool: dark hoodie with a
pink cat motif, seen mostly from behind, eating. Steam wisps rise:
one from the big pot region left of the chef, one from the customer's
bowl. Red lanterns hang at the top corners; a cyan menu screen glows
on the left post; the counter carries bottles, crates, a stool.

## Extraction duties

- CHARACTER = THE CHEF ONLY. Probe his region first (expect torso
  roughly center-left behind the counter, head near the hanging
  lamp's light). Skin tones, gray hair, apron darks, folded arms.
  The counter edge in front of him stays PLATE — extract only above
  the counter line where his body shows, plus his full head.
- THE CUSTOMER IS FROZEN LAW: the seated customer is NOT extracted,
  NOT animated, not one pixel, in any frame. He is plate.
- STEAM = EFFECT LAYER: both wisps (pot + bowl). Steam pixels are
  light gray/white translucent-looking curls over dark background.
  Probe their exact clusters. Extract to fx-steam.
- PROTECTED: lanterns, menu screen, sign, bottles, crates, all
  counter items, the customer, chroma.
- Inpaint behind the chef: the back-counter wall with shelving and
  pots — use strip-tile from clean same-structure columns beside him;
  horizontal nearest-side for counter-band rows. Behind steam: dark
  interior; small holes, nearest-side fill is fine.

## Idle — 3 frames (rest 1800ms, A 200ms, B 200ms)

- f2 (A): the chef BREATHES IN: chest and folded arms rise 3px
  (rigid lift of the torso block below the collar, head stays), and
  he BLINKS: both eyes closed (eyelid pixels from his own skin
  shades), brows drop 1px.
- f3 (B): breath settles: torso back at rest height; head TURNS 4px
  toward the customer (face features — eyes, nose, mouth, brow —
  translate 4px right within the head silhouette; the silhouette
  itself stays; fill the vacated left band with his hair/skin tones
  continuing), eyes open looking right.

## Hover — 4 frames (150ms each, h4 held)

- h1: he NOTICES: head lifts 5px (whole head region translates up;
  neck stretches to fill), eyes to camera (features re-centered),
  brows up 1px.
- h2: right arm UNFOLDS mid-swing: the folded right forearm detaches
  from the fold and points down-right at 45°, hand ~22px from its
  folded position. Rebuild the arm from his own sleeve/skin/apron
  colors along the new direction; the vacated fold area reveals his
  apron chest — fill by continuing the apron's vertical shading from
  the rows above (his own pixels, translated).
- h3: arm FULLY EXTENDED pointing at the red-cushion stool in front
  of the counter (down-right, total hand travel ~45px from the fold).
  Two extended fingers, from his own skin shades.
- h4 (held): the pointing hand relaxes into an open palm-up at
  mid-chest height (~20px back up from h3), a 2px nod (head down 2),
  eyes stay on camera. Calm.

## Effects — fx-steam, 4 frames, 320ms each, infinite

The wisp pattern climbs: each frame shifts every wisp body up 3-4px;
the topmost 3-4 rows of each wisp DISSOLVE (become transparent); new
curl pixels respawn at the base (copied from the wisp's own base
rows); the curl's horizontal S-shape alternates phase (frames 1/3
lean left, 2/4 lean right by 2px). Loop must be seamless: frame 4
followed by frame 1 reads continuous.

## Deliver

Everything per the doctrine's output contract, manifest.json with the
exact cadences above, verify.mjs green, and the DONE line.
