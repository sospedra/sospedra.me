# Jukebox stall and side-projects catalog: design

Date: 2026-08-05. Branch: codex/midnight-io-design-system. Status: awaiting owner review.

## Summary

A ninth bazaar stall: a sentient jukebox. Its marquee reads SIDE PROJECTS. The stall links to `/jukebox`, the projects catalog. The page is the machine's selector glass at full screen: a record carousel, typed title strips, letter and number keys. Each record is one `*.sospedra.me` app. Eleven records today. You release software and you release records. The frame is honest.

## Naming

- Stall id: `jukebox`
- Catalog label: `projects` (feeds aria-label and data-label)
- Route: `/jukebox` (house convention: the talks stall points at `/videoclub`)
- Page title: side projects

## The stall

### Placement

The jukebox takes a lone final floor on both trees. The machine glows alone at the end of the market. This is the scene beat, and it dodges the mobile pairing problem.

- Desktop: fourth entry in `DESKTOP_FLOORS`, single stall. Sides run R, L, R today, so the new floor takes L.
- Mobile: fifth floor. `MobileFloor.stalls` loosens from a two-tuple to an array. Sides run R, L, R, L today, so the new floor takes R.
- The trailing `sep` block indices shift by one. The decor doc keys on `sep:{n}` hosts, so existing nodes keep their anchors.

Rejected alternative: a third stall on desktop floor 0. It keeps density but kills the scene beat, and it still forces the mobile type change.

### Layers

The r17 schema fits with zero changes.

| layer | role | frames | notes |
|---|---|---|---|
| plate | plate | plate-key.png | cabinet, crate of spare 45s, coin cup |
| fx-bubble | effect | f1-f3, ~300ms | bubble tubes crawl |
| char | char | idle f1-f3 (1800/200/200 house rhythm), hover h1-h4 | the light show. Hover cycles orange, green, purple, blue, white |
| cat | prop | rest + h1-h4 | sleeps on the warm top; hover: ear twitch, one eye opens |

### Dialog (final copy)

```
Ka-chunk. Warm tubes.
Every record pressed in-house.
No covers. Originals only.
Press a letter. Press a number.
```

### Catalog entry

- tint: `#5ec48a` (green is the free slot in the current eight-tint palette, and it matches the teal side columns of the reference)
- links: `[{ label: 'browse the records', href: '/jukebox' }]`

### Registration checklist

The first four entries are compile-forced by exhaustive records.

1. `stalls-manifest.ts`: `STALL_SCENES.jukebox` and `SIM_DIMS.jukebox`. Rect and dims come from the final art.
2. `stall-catalog.ts`: `STALLS.jukebox`.
3. `sounds.ts`: `STALL_SFX.jukebox`. A short two-note sting (sine, high then lower) plus a faint noise tick as needle dust. Values tuned by ear.
4. `decor.ts`: `STALL_TUNE.jukebox`, start at `{ lift: 50 }`, tune in the editor.
5. `bazaar-view.tsx`: both floor arrays plus the `MobileFloor` type change.

## The catalog page: /jukebox

### Anatomy, top to bottom

1. The dome: record carousel behind glass. The platter spins the NOW PLAYING record. NOW PLAYING = the latest release, a manifest field in v1, no telemetry.
2. The title-strip menu: one typed paper strip per project. Name, one-liner, code (A1..A6, B1..B5). Codes are grid coordinates, letter = frame column, number = slot. They carry zero category weight. Red selector dots sit beside the codes, photo-literal.
3. The keys: a letter row (A, B) and a number row (1..6) as real buttons.
4. Liner notes: hover or focus slides the strip out. Pressed = first release year. Last spin = last deploy. Stack = one line.
5. Selection: carousel turn, arm lift, needle drop, one chiptune bar, then the subdomain loads. The whole sequence stays under 1.6 seconds.

### Records manifest

`app/jukebox/records.ts`:

```ts
type JukeRecord = {
  id: string
  title: string
  oneLiner: string
  url: string
  pressed: number
  lastSpin?: string
  stack: string
  status: 'pressed' | 'test-pressing'
}
```

The selector code derives from array index: columns of six, letter then slot.

URL rule: `https://<id>.sospedra.me`, with one exception: wkc lives at `keycodes.sospedra.me`. Status defaults to `test-pressing` until the owner confirms the live URL. A test pressing renders dimmed and unlinked, with a "test pressing" stamp. This turns unknown deploy states into defined behavior.

Display order = array order. Default: newest pressing first, so NOW PLAYING sits at A1. The owner reorders freely.

One-liners get drafted from each app's README at implementation. The owner polishes the copy.

### Interaction and a11y

- Under the paint the menu is a `ul` of anchor links. Visible focus. Normal tab order.
- The physical keyboard drives the keys: type a letter, then a number, with a short buffer timeout. This respects the site letter-keys setting.
- Test pressings carry `aria-disabled` and no link.
- Reduced motion: needle drop only, instant navigation.

### Sound

- Reuses the bazaar `soundPreference` store and its gesture rule. Same localStorage key, so the street setting carries into the machine.
- Hover sting, ka-chunk on select, needle crackle. All synth through `services/audio/kit`. No audio files.
- A small SOUND toggle sits on the page, same pattern as the bazaar HUD.

### Theming

The route departs boldly, per house rule, and it matches the owner's reference photos literally: a Wurlitzer 1015 bubbler in full neon. Magenta crown arch, amber inner arch, teal side columns, lilac and gold U-tubes, walnut body, chrome scrollwork, amber diamond grille lit from inside. The page reproduces the cabinet as the frame: neon arch around the selector, warm amber center, cream strips with typewriter type. Palette anchors: magenta `#ff2e88`, amber `#ffb84d`, teal `#46e6b0`, lilac `#b98aff`, warm white `#fff3d6`, walnut `#5a3a24`. An OG card through `scripts/og.mts` comes after the page lands, as polish.

## Assets

- Stall sprites go through the bazaar3 imagegen harness under the brief v2 rules. Reference: the two owner-provided bubbler photos, palette anchors in Theming. Files: plate, fx-bubble f1-f3, char idle f1-f3, char hover h1-h4, cat rest, cat h1-h4. About 15 files in `/public/images/bazaar/jukebox/`.
- The page is CSS and DOM only in v1. Zero page sprites.
- Build order: stall and page ship first with a placeholder plate. Final art swaps in after a pipeline session, then rect, dims, and lift get set.

## Out of scope

- Real audio per project, play counts, live deploy telemetry.
- Decor dressing around the new floor (separate editor session).
- The metro concept (dead, one organ donated: NOW PLAYING = latest release).

## Defaults the owner can veto

1. Lone final floor placement on both trees.
2. Tint `#5ec48a`.
3. Display order, newest first.
4. The URL rule and the wkc exception.
