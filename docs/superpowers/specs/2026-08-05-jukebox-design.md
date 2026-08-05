# Jukebox stall and side-projects catalog: design

Date: 2026-08-05. Branch: codex/midnight-io-design-system. Status: v1 built; Select·O·Matic redesign in progress (owner reference); owner data pass pending.

Redesign reference: `docs/superpowers/specs/2026-08-05-jukebox-reference.html` (owner-provided, 2026-08-05). Where this spec and the reference disagree on the page's look, motion, or sound, the reference governs. The reference's demo data, its `NAVIGATE=false` switch, and its category subtitles do not carry over.

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

1. The dome: an edge-on record magazine (21 slats, cosine height arc, colored tags), a spinning vinyl with a masked spindle hole and a paper label, a tonearm with lift and play poses, an oscilloscope canvas fed by the audio analyser, glass reflections, a NOW PLAYING lamp with a pulsing jewel. The platter boots with the NOW PLAYING record. NOW PLAYING = the latest release, a manifest field in v1, no telemetry. Marquee copy: `SIDE PROJECTS` with the `SELECT·O·MATIC` model badge.
2. The title-strip menu: one typed paper strip per project. Name, one-liner, code (A1..A6, B1..B5). Codes are grid coordinates, letter = frame column, number = slot. They carry zero category weight. Red selector dots sit beside the codes, photo-literal.
3. The keys: a letter row (A, B) and a number row (1..6) as spring-loaded buttons on a chrome deckplate, plus a selection display window reading `– –`, echoing keys, and flashing an error buzz on invalid codes. The rack headers read `SIDE A` and `SIDE B` as pure column labels: the owner's category veto stands, so the reference's subtitle flavor text does not carry over.
4. Liner notes: hover or focus slides the strip out. Pressed = first release year. Last spin = last deploy. Stack = one line.
5. Selection: tonearm lift, then a record swap when the platter holds a different record (the old record files itself edge-on into the magazine, the magazine shuffles, the picked slat glows hot, the new record drops face-on and lands with a clack), needle drop, one chiptune bar at 150 BPM, then the subdomain loads. About four seconds with a swap, under two without. Reduced motion: instant platter swap, thump, navigation after ~220ms. The reference's timing table `T` is the single source of the mechanical durations.

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

- Reuses the bazaar `soundPreference` store and its gesture rule. Same localStorage key, so the street setting carries into the machine. The reference plays ungated; the shipped page gates every voice behind the preference.
- The graph comes from the reference: voices into a master gain, master into dry (0.8) and into a convolver with a synthesized 0.2s impulse into wet (0.3), master into an analyser (fftSize 1024) that feeds the scope canvas.
- The palette comes from the reference: tick (arm), buzz (invalid), thump (needle), whoosh (record exit), clack (record landing), crackle, one chiptune bar with lead, bass, and hats derived from a 150 BPM step. No audio files.
- A small SOUND toggle sits on the deckplate, `aria-pressed`, same store as the bazaar HUD.

### Theming

The page theme is the reference's one-knob OKLCH system: `--hue` (default 25, burgundy) derives five hue lanes (warm, paper, cool, ink, plum) and every cabinet, chrome, paper, accent, and label color follows. The bubbler photos remain the reference for the street stall's sprite art; the page's neon-hex palette anchors from v1 are superseded by the OKLCH lanes. Type: Righteous for display, Special Elite for the typewriter strips, loaded through `next/font/google` (self-hosted, no external link tags). Signature element: the record swap in the dome. Everything else stays disciplined around it. An OG card through `scripts/og.mts` comes after the page lands, as polish.

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
