# Boombox boombox: UI design brief

## Mission

Design and build the UI of "Boombox" as a photorealistic-illustrated 90s/2000s boombox. HTML + CSS only. No game logic. This is a visual prototype: one static screen showing a rich mid-game state, plus CSS-only ambient animation where noted.

Deliverable: a single self-contained file at `/tmp/boombox-codex/index.html`. Inline all CSS in a `<style>` tag. Load fonts from Google Fonts (`Caveat` for handwriting, `VT323` or `Share Tech Mono` for LCD digits). No external JS. No build step. The file must render standalone when opened in Chrome at 1400×1100.

## The product in one paragraph

Boombox is a daily song-guessing game (Heardle-like). One mystery song per day plays from a cassette. The player hears 1 second, then guesses or skips; each miss unlocks more seconds (ladder: 1, 2, 4, 7, 11, 16). Six attempts max. The whole game lives inside one machine: the boombox IS the entire page.

## Aesthetic gospel

Primary reference, follow its density and material language closely:
- https://codepen.io/MikUrrey/pen/gOxqzdE — "Stereo radio cassette recorder". Dense hardware realism: tuner scales, EQ ranges, cassette bay, LED displays, chunky transport keys, machined-metal slider thumbs, perforated grilles, projected floor shadow. THE GOSPEL. Fetch it, study its CSS.

Supporting references, take the named element from each:
- https://codepen.io/alvaromontoro/pen/jOJLjVr — transport keys. Raised keys via `transform: perspective(30em) translateZ(3em)`, pressed = translateZ(0). Recessed black tray. Take the key press physics.
- https://codepen.io/miukimiu/pen/rNZKZV — cassette proportions. Orange shell, yellow label with ruled lines, clipped oversized reels (window with `overflow: hidden`, reels bigger than the window), dual-speed hub spin, crisp offset shadows with zero blur. Take the cassette.
- https://codepen.io/blucube/pen/gOoZwQ — spinning reels and tape mass migrating between spools (left spool shrinks while right grows). Take the tape motion concept.
- https://codepen.io/YURISSAN/pen/EaVmaRR — small flat boombox. Take the vmin-token sizing approach if useful.
- https://codepen.io/tomhazledine/pen/RwxeVw — materials built from stacked inset box-shadows. Take the shadow-stack technique.
- https://codepen.io/collection/nwzQJq — Sarah Fossheim's CSS drawings (Roland, Casio, Braun radio, Macintosh). Take the surface language: crisp shadow steps, dot grilles, molded plastic, seams, bevels.
- https://frontend.horse/articles/creating-3d-illustrations-with-css/ — CSS 3D construction with cuboids and 3-tone lighting. Use ONLY if you go 3D; flat illustrated is acceptable and safer.

Photo references (fetch if reachable; descriptions below are authoritative):
- https://img848.imageshack.us/img848/2959/so2x.jpg
- https://media.sketchfab.com/models/2ca0c368a4d1422dbfcd34d121acaf8b/thumbnails/f7c1de4b575348a5a0adf2d364fab5cf/c540732355bc4d21affd70c31b884386.jpeg
- https://www.pngitem.com/pimgs/m/111-1119846_subemelaradio-90s-radio-hd-png-download.png
- https://drewography.com/wp-content/uploads/2022/02/aiwa--1024x768.jpg

Photo 1 (primary, described): ION "Boombox Deluxe" product shot. Brushed-silver body, black raised handle on two posts. Full-width black tuner band across the top: FM and AM frequency scales in small print, amber backlight, a red vertical needle, and two analog VU meters with cream faces at the band's left and right ends labeled LEVEL-LEFT / LEVEL-RIGHT. Center column: silver cassette door with smoked window, brand text, a wide silver eject strip below. Two huge round speakers with black grilles and thin chrome trim rings flank the center. Right edge: a black volume knob and a vertical strip of small silver function buttons. Density, seams and screws everywhere.

Photo 2 (secondary, described): JVC MX-J500 mini stereo, year ~2000. Silver plastic, navy-blue woven mesh speaker cones, a dark LCD with green/cyan text, blue accent buttons, red/yellow "240W Rolling Panel Active-Bass" badge sticker, twin cassette doors at the bottom. Take the 2000s flavor: navy mesh, dark LCD with cyan text, loud wattage badge.

## Machine inventory (every part, with its meaning)

Compose ALL of these into one machine. Nothing may float outside the case except the handle.

1. Handle: black bar raised above the body on two silver posts.
2. Tuner band (full width, black): FM scale 88 to 108 with amber tick marks and numbers. A red needle at 3/6 of the scale width. Meaning: the needle is the attempt counter; it advances one stop per guess. Include the label "FM·MHZ".
3. LED dB tickers at both ends of the band: 12 small LED lights per side in a row (green ×7, amber ×3, red ×2) with a tiny dB scale (-20, -6, 0, +3) and labels DB·L / DB·R. Show the left ticker with 8 LEDs lit, the right with 6 lit (song playing).
4. Speakers, left and right: black dot-grille panels, each with one big woofer (chrome ring, navy woven-mesh cone, dark center cap) and one small tweeter slot. The cones subtly pump while music plays (CSS animation, scale 1 to 1.018, ~0.45s, infinite).
5. LCD (classic small display, center column top): dark navy background, cyan glowing segment text, rendered in the LCD font. Four lines of content:
   - "BOOMBOX #1" and a tape counter "000/7s" on one row
   - a 16-segment unlock ruler (segments 1 to 7 lit dim, first 2 bright, rest off)
   - hint line: "YEAR 1999 · GENRE ····" (year unlocked, genre still hidden)
   - status line: "NEXT TAPE 07:42:13"
   Also a small green power LED beside the LCD, lit.
6. Cassette door (center): recessed silver frame, smoked-glass window with a diagonal glare stripe, and inside an orange cassette with a yellow label. Label carries: two color stripe bands (teal + rust), a small blurred album-cover sticker (fake it: a 44×44 div with a blurry multicolor gradient), and a handwritten scribbled-illegible title and artist in Caveat (literally write nonsense like "Wnrol Qib" and blur it 3px). Below the label, the tape window: two reels with spoked hubs spinning (CSS animation, paused-state concept not needed in the mock: show them spinning), tape spools of DIFFERENT sizes: left spool at ~66% (larger), right at ~44% (smaller). Meaning: the tape winds toward the right as attempts burn.
7. Guess input strip: a navy LCD-style inset field showing the placeholder-like typed text "rosal" with a blinking caret (CSS animation), same cyan glow as the LCD.
8. Search dropdown: OPEN, floating below the input strip, silver panel with 3 song rows ("BIZCOCHITO — ROSALÍA", "CHICKEN TERIYAKI — ROSALÍA", "Yo x Ti, Tu x Mi — ROSALÍA/Ozuna"), first row highlighted with an inverted dark background. Render the dashes in those rows as "·".
9. Transport tray: recessed black tray with four raised keys, alvaromontoro press physics: PLAY (shown PRESSED, sunk into the tray), STOP, SKIP +3S, and REC·SHARE with a red cap and a red dot glyph. Keys are light-grey plastic caps with dark glyphs and letter-spaced small-caps labels.
10. Volume knob: machined round knob (knurled edge via repeating-conic-gradient, amber pointer pin) in its own recessed cell next to the tray, label "VOLUME". Pointer at ~65%.
11. EQ bank: recessed black panel with five vertical sliders labeled 60, 250, 1K, 4K, 12K. Machined-metal thumbs (multi-stop horizontal metal gradient). Set them at 0, +2, 0, -1, +4 positions.
12. Post-it note: INSIDE the machine case, top-right corner, covering part of the right speaker. Completely within the body outline. Yellow paper gradient with a curled bottom-left corner (skewed pseudo-element) and a soft curl shadow. Header in handwriting: "today's guesses". Six ruled lines with content, ALL handwritten in Caveat, NO emojis anywhere:
    - line 1: "Skipped" struck through with a slightly rotated pen stroke
    - line 2: "Skipped" struck through
    - line 3: "One Way Or Another · Blondie" struck through, plus a tiny red margin scribble "right artist!" rotated -2deg
    - line 4: "rosal" with a blinking caret (this is the active line, mirroring the input)
    - lines 5 and 6: empty ruled lines
13. Badge: red rounded sticker on the lower-left of the body over the speaker corner, yellow italic bold text "240W" with a small caption "TOTAL MIXTAPE POWER", rotated -4deg.
14. Body details: brushed metal texture (1px repeating gradient grain), panel seams, four chrome screws in the body corners with slot lines at different angles, soft product-shot ground shadow under the machine, studio-neutral page background (#e8e5df range).

## Quality bar

- Skeuomorphism sells through shadow discipline: crisp inset steps for molded plastic (Fossheim), zero-blur offset shadows for paper and cassette, soft blur ONLY for the machine's ground shadow and glass glare.
- Density over minimalism: silkscreen micro-labels, tick marks, seams. Every control looks operable.
- One machine, one page. The boombox centered, ~1200px wide, on a plain studio background. No page chrome, no headings outside the machine.
- Use CSS custom properties for the palette. Name every part with a class. Keep the HTML semantic-ish (buttons for keys, input for the guess strip) but interactivity is NOT required beyond :hover/:active niceties.
- Ambient CSS animations: reel spin, cone pump, caret blink, LED glow. Nothing else moves.

## What NOT to do

- No JavaScript logic, no data, no fetch.
- No emojis anywhere in the UI.
- No em dashes in any visible copy; use "·" as separator.
- Do not copy my previous attempt (you have not seen it; do not ask for it). Design from the refs and this brief with your own judgment. Bolder is better: if in doubt, push closer to the MikUrrey density and the ION photo realism.

## Acceptance

I will open `/tmp/boombox-codex/index.html` in headless Chrome at 1400×1100 and screenshot it. The machine must read instantly as a real 90s/2000s boombox with a game inside it.
