# Bazaar map stall

A ninth stall for `/bazaar`. A narrow directory board with a sleeping raccoon on top. It explains the market and links to the bazaar paper.

## Concept

The stall is a freestanding map board, the kind that stands at a market entrance. A backlit panel shows a pixel map of a market. The map is illustrative. It does not need to match the real floor layout.

A raccoon sleeps on the top ledge. Its striped tail hangs over the board. The character is inspired by the Cheshire Cat: the grin stays faintly visible through sleep, and the wake starts with the grin.

The stall is narrower than every other stall. The floor layout system does not change. The extra empty space in the band is intended.

## Interaction

Idle, three frames at the standard cadence (1800/200/200 ms):

1. `char-f1` curled ball, slow breath, faint grin
2. `char-f2` breath rise
3. `char-f3` tail-tip flick

Hover, four frames at 150 ms with a hold on the last:

1. `char-h1` the grin widens first, eyes still shut
2. `char-h2` eyes snap open, too wide
3. `char-h3` the body unfurls and hangs head-first over the board edge
4. `char-h4` one paw pins the red dot, tail curled into a question mark

Mouse-out snaps to `char-f1`. The engine has no reverse animation. The snap reads as instant sleep, which fits the character.

A red "u are here" dot pulses on the board as an independent effect loop, three frames at ~600 ms. It runs at rest and during hover, like the sushi steam on `uses`.

Reduced motion follows the existing engine rule: rest frame when inactive, `char-h4` when active, static dot.

## Dialog

Standard `Dialog` component, typewriter, pixel font. No custom variant.

```
Mrh. You woke me.
Lost? We are all lost here.
Every stall is a door.
u are here.
```

One link: `read the bazaar paper` → `/papers/bazaar`. The stall body click goes to the same route.

## Data changes

- `stalls-manifest.ts`
  - `STALL_SCENES.map`: `plate` (booth + board, no raccoon, no dot), `fx-dot` effect at z1 (3 frames, 600 ms), `char` at z2 (idle 3, hover 4). `rect` measured from the art crop.
  - `SIM_DIMS.map`: dispW 260, dispH 460. artW/artH measured from the art crop.
- `stall-catalog.ts`
  - `MAP_DIALOG` constant with the four lines above.
  - `STALLS.map`: label `map`, href `/papers/bazaar`, tint `#c86fd6`, one link. The href may need a `Route` cast for the dynamic `/papers/[slug]` segment.
- `bazaar-view.tsx`
  - `DESKTOP_FLOORS[0].stalls` becomes `['uses', 'papers', 'map']`. Floors read 3/3/3. Map sits at the stairs end.
  - `MOBILE_FLOORS` gains a solo floor before the current pairs: the map alone, right after the street. The `MobileFloor` stalls type widens from a strict pair to one-or-two.
- `decor.ts`: `STALL_TUNE.map` with lift ~55. Final value tuned in the decor editor.
- `sounds.ts`: `STALL_SFX.map`, a purr. Low sine rumble 90→60 Hz plus one soft triangle blip. The `Record<BazaarStallId, ...>` type forces this entry at compile time.

## Art

Eleven images under `public/images/bazaar/map/`, produced by the bazaar3 imagegen harness (r17 layered plates, r18 pose chaining):

- `plate-key.png`
- `char-f1.png` `char-f2.png` `char-f3.png`
- `char-h1.png` `char-h2.png` `char-h3.png` `char-h4.png`
- `fx-dot-f1.png` `fx-dot-f2.png` `fx-dot-f3.png`

The board text reads "U ARE HERE". Per the r17 rest assert, the composite of plate plus rest frames must byte-match the master key render.

## Out of scope

- No custom dialog component. The games multi-bubble stays the only special case.
- No vanish/fade animation for the raccoon. The engine flips pre-rendered frames only.
- No decor nodes at launch. `HostDecor` hosts (`stall:map`) exist for free and stay empty.
