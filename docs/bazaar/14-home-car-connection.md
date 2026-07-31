# 14 — the home-to-bazaar connection (the car)

The bazaar is not a link, it is a DRIVE. The homepage and the market are
joined by one vehicle, one road fiction, and one carefully timed page
transition. This is the site's best "it's a place, not a page" argument.

## The car itself

A hand-built SVG sprite (components/Sprite/Car): chassis, wheels, rims,
windshield, reflection as separate SVG layers, plus CSS-only exhaust
puffs and a headlight cone. Props: engineOn, isMoving. It is code-split
and lazy — the home page warms the import 320ms into the intro so the
car never blocks first paint but is always ready to drive in on cue.
The car even has an engine toggle button (an easter egg: "Turn off the
car engine").

## Home: the arrival ritual

The home hero is a bridge. The intro runs, and at HOME_INTRO_DURATION
the car ARRIVES onto it: an 820ms drive-in, a park, engine off 320ms
later. A useReducer state machine owns the choreography (car-arrive ->
car-park -> engine-off), and the dock state reads parked / idling /
arriving / departing. The car sitting parked on the bridge IS the bazaar
affordance: your ride is waiting.

## The departure: clicking "bazaar"

departForBazaar hijacks the link click:

1. Reduced motion or storage failure: plain router.push('/bazaar').
   Fiction never blocks access.
2. Otherwise: engine-on, then a DEPART action with a duration, and the
   navigation is scheduled LATER: transition.navigateLater('/bazaar',
   duration - 360). The route change fires 360ms before the drive ends,
   so the page swaps while the car exits the viewport — the cut hides
   inside the motion.
3. FIRST RIDE SIGNATURE: a sessionStorage flag makes the first ride of
   the session the long, cinematic one (3100ms); repeat rides take the
   express (2500ms). The trick: ceremony on arrival, speed on habit.
   The flag claims optimistically and falls back to the signature ride
   if storage throws.

## The easing trick

The drive uses cubic-bezier(0.4, 0, 0.6, 0.52) — "the car pulls away
from rest and settles into a ~1.2x cruise on the bridge". The same curve
lives twice: as --drive-ease in home.module.css for the CSS transform,
and solved numerically in JS (bezier axis functions + binary search) so
the code can know WHERE the car is at any moment. When CSS and JS must
agree about a moving object, share the curve, not the guesses.

## The bazaar side: continuity

The street level (doc 12) has the same SpriteCar driving through the
scene, wrapped in stretch/squash/scale containers for the pixel-street
perspective, engine on. You drove out of the home bridge; the street
shows the road life you joined. The return trip is the BUS: the street's
bus stop links back to '/' ("bus stop: exit to the city") with its own
sfx and a lit bus-on hover frame. Two vehicles, one loop: car out,
bus home.

## The revival edge case

Next's cacheComponents can revive the home page with old exit offsets
intact (the car mid-departure, frozen). The fix: a revival detector
(an effect that notices its second run on the same mounted tree) bumps
an epoch key and remounts the stage clean. Page-transition fiction has
state, and state survives navigation in ways plain pages never test.

## Why this matters for the blog

Every other section of the site is one click away. The bazaar earns a
vehicle, a ritual, and a session memory because it is the index — the
place where the site admits it is a world. The car is ~200 lines of
choreography for a 3-second joke that nobody skips.
