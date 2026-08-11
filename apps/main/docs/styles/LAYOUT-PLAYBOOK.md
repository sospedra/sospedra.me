# The /styles layout playbook

Written 2026-08-11 after building six aesthetic demo pages and auditing 34 online magazines. Read this before adding a style page. It exists so the next agent does not repeat the research, does not repeat the mistakes, and does not reuse a mechanism that is already spent.

## 1. The doctrine

The owner's ruling, verbatim in spirit: **each page must look like a magazine whose unique style is the one being demoed.**

That means three things, in order of importance.

1. **The page is a publication, not a page with magazine decoration.** A folio bar and a figure caption are not enough. Pick a real publication FORM (street paper, printed weekly, scholarly journal, toy catalog, poster archive, festival programme) and commit the whole layout to it.
2. **The form must belong to the aesthetic's own world.** Sticker culture publishes street papers. Riso printing publishes newspapers. Blind-box toys publish catalogs. Do not assign a form because it is unused; assign it because the aesthetic would actually be published that way.
3. **The mechanism comes from a publication that shares the aesthetic.** When stickers needed a form, the reference was Arts of the Working Class, an actual Berlin street newspaper. When clay needed one, it was Stripe Press, whose catalog is one rigid template plus one animated object. Matching mechanism to source aesthetic is what stops the pages reading as templated.

Rejected approaches, both tried and both judged insufficient by the owner: adding editorial chrome (folios, captions, page numbers) to an existing layout, and giving every page the same magazine grammar. The correction was "each page must ALSO present the layout that reflects its own style".

## 2. Mechanism catalog

Every entry was read from production CSS or confirmed structurally in 2026-08. Status marks whether this repo has spent it.

### Type and rhythm

**Derived type scale — Triple Canopy** (canopycanopycanopy.com). USED on frasurbane.
Every size is a fraction of one width token. `--header-font-size: calc(var(--body-width) * 0.042)`, logo `.062`, body `.02`, meta `.014`. Change the token per breakpoint and the entire hierarchy re-derives, so there is no second ladder to maintain. Their CSS is 679 KB with 526 media queries, which tells you how much is bespoke.
Also theirs, UNUSED: **named motion speeds** (`--crawl: 0.8s`, `--walk: 0.4s`, `--run: 0.2s`) and a **halftone token set** (`--rasterboy-raster-size: 4px`) for screen-print texture. The speeds are used on frasurbane; the halftone tokens are not used anywhere.
Trap: Triple Canopy serves an unsupported-browser string to non-JS clients. It looks dead and is not.

**One paired rhythm value — The Atavist.** UNUSED.
A single vertical value, 210px desktop and 70px mobile, is reused by the chapter break, the pull quote and the image block. Three different block types, one rhythm pair. Cheap and invisible until you remove it.

**Section-break drop initials — The Drift** (thedriftmag.com). USED on frasurbane.
A drop initial at EVERY section break, not only the opener. It replaces subheadings and section rules with one device. Implementation: a `.sectionOpen::first-letter` rule with `float: left`, a display face and a colour accent.

**Editor-selectable drop cap — Nautilus** (nautil.us). UNUSED.
`p.is-style-raised-cap:first-letter` at `clamp(5.5rem, 10vw, 7rem)`, `line-height: .82`. The point is that the drop cap is a per-paragraph content decision, not a CSS special case. Worth copying whenever a page has authored prose.

**Measure in viewport width — Asterisk** (asteriskmag.com). UNUSED.
`--maxwidth-text` steps 750px, then 50vw, then 60vw, then `none`. Measure set in vw rather than `ch`, redeclared inside repeated `:root` blocks per breakpoint.

### Grid

**Named grid lines with `l-*` placement classes — Distill** (distill.pub). PARTIALLY USED on overprint.
The grid names its lines, then exposes placement as four utility classes: `.l-body`, `.l-page`, `.l-gutter`, `.l-body-outset`. An author writes `class="l-page"` and gets a correct outset figure at all five widths with zero per-article CSS. `.subgrid` inherits the parent template so a nested figure still lands on parent lines.
Overprint uses a named-track figure and one real gutter note. The full four-class system is unspent.

**24-column canvas plus header archetypes — Emergence** (emergencemagazine.org). UNUSED. **This is the strongest per-story system found and nothing in this repo uses it.**
Headers come from a closed named set (`essay-header--a`, `--b`, `--c`, `--c-reverse`) crossed with size variants (small, medium, big, plus an `--animating` entrance state). Body figures sit on `grid-template-columns: 14px repeat(24,1fr) 14px` with explicit row and column coordinates per figure, authored from the CMS. Figure scale is a second named set (`m-media--small` through `--bleed`, plus `--left/-center/-right`). Nobody touches CSS to art-direct an essay.
Why it matters here: a style page with several sections could declare each section's archetype in a data array, which is exactly how this repo already writes `SCHEDULE`, `MOTIFS` and `ARCHIVE` constants.

**Visible column rules and a rotated margin wordmark — Sabzian** (sabzian.be). USED on overprint.
Vertical column rules stay visible so the page reads as a printed weekly rather than a card feed, and the wordmark sets rotated 90 degrees in the left margin beside a rail of dot markers.

**Gutterless full-bleed image grid — Kajet** (kajetjournal.com). UNUSED.
Three-column image grid with no gutters and no page margin, red tag chips overprinting the top-left corner of each tile, masthead as a solid bar bled to the viewport edge.

**Area-named card grids — Nautilus.** UNUSED.
`grid-template-areas: "eyebrow title" "eyebrow dek" "eyebrow meta"` with `aspect-ratio: 3/2` thumbnails. Full-bleed via the classic `left: 50%; margin-left: -50vw; width: 100vw`.

**Percentage float grid — Places Journal** (placesjournal.org). UNUSED, and deliberately so.
Still shipping a Bourbon and Neat float grid in 2026: 379 KB of CSS, 210 `float: left` rules, no `sticky`, no `clamp()`, no grid on article pages. Only relevant if a style page wants to be honestly period-accurate to 2013 web.

### Identity and theming

**One section token behind every accent — Aeon** (aeon.co). USED on mishko.
`--color-section` with a brand-red fallback feeds 39 rules including `.bg-section`, `.text-section`, `.border-section` and `.group-hover/card:text-section`. Assign it once per section and nav, cards, rules and hover states all repaint. The fallback means an unset section still looks deliberate.

**The issue re-skins the publication's own shell — Techniques Journal** (techniquesjournal.com). USED on mishko.
Issues are alphabetized by theme, and issue D on dark infrastructure re-skins the journal itself into an "upside-down" issue, deliberately breaking its own alphabet sequence. The device: a reader choice or an issue identity repaints the entire publication chrome, not just the content well.

**`body:has()` retheming — Works in Progress** (worksinprogress.co). UNUSED as a pattern.
`html:has(.print-v2) { scroll-behavior: smooth }` and `body:has(.print-v2) { --masthead-override-height: 63.75px }`. One class deep inside the page retints tokens, resizes the masthead and unsticks the header, with no route config and no layout prop threaded up the tree. This repo currently themes with `data-*` attributes on a wrapper, which is equivalent in effect but requires the attribute to live on an ancestor. The `:has()` form lets a leaf component retheme the shell.

**Identity rebuilds every N issues — ARCHIVIO** (magazine.archivio.com). UNUSED.
The magazine rebuilds itself every four issues: new editorial staff, new graphics, new inspirations, same name. Issue 11's cover is drawn in PETSCII, the Commodore character set. The previous cycle survives at a separate domain, which proves the reset is real.

**Headline case as a content field — SSENSE** (ssense.com/en-us/editorial). UNUSED.
One index runs both `ISABELLA LOVESTORY IS COMING CLEAN` and `The Rise of Intellectual Clout`, so case is stored per article rather than fixed in CSS.

**Run dates in the masthead — Real Life** (reallifemag.com). UNUSED.
The masthead states "2016 — 2022". Nine characters tell the reader the publication is over. The most honest design decision in the whole audit.

**Named columns promoted to routes — 032c** (magazine.032c.com). UNUSED.
Recurring columns ("Brenda's Business", "Hardcore Wellness") are first-class routes with their own identity, so a column is a place rather than a tag.

### Navigation and index

**Three orthogonal taxonomies — Rest of World** (restofworld.org). USED on neubrutalism.
Beats, regions and sections all exposed at once, so every story sits at an intersection and reaches readers through three doors. Article pages stay deliberately plain by contrast, one 600 to 700 pixel column.

**Rolling issue contents with unpublished slots — Asterisk.** USED on neubrutalism.
The issue table of contents lists pieces as "Coming Soon", so an issue publishes as a rolling page and the reader sees its shape before it is full.

**Per-article body id as an escape hatch — Asterisk.** UNUSED.
`<body class="article" id="chinas-last-bus">`. Any single piece is addressable for one-off art direction without inventing a variant class.

**Dual address per piece — European Review of Books** (europeanreviewofbooks.com). UNUSED.
Content splits across two peer surfaces, a Library taxonomy and a Magazine of bound issues, so the same piece has both an issue address and a taxonomy address.

**Two nav axes, no cover art — Developments** (developments.media). UNUSED.
A descending numeric index alongside a 40-plus tag vocabulary, with zero cover images, so names carry the entire visual hierarchy.

**Type badge on cards — A24 Notes** (a24films.com/notes). USED on stickers.
A filter chip row over a card stack where each card carries a type badge, so essays, zines and podcasts share one index.

**Same feed at two densities — EE72** (ee72.com). UNUSED.
`/explore` prints the identical feed twice, first as a card grid, then as a link-only list.

**Chaptered issues — The Vessel** (vessel-magazine.no). UNUSED.
Issues addressed as `/issues/11/garden` and chaptered rather than paginated, with the issue sequence carrying a multi-part arc (home, garden, studio).

**One rigid template plus one living cover — Stripe Press** (press.stripe.com). USED on clay.
Every book page follows the same template (title, description, retailers, bio, praise) and all variation lives in the cover object, which their markup calls a "living cover". Several titles ship a companion zine, so the page doubles as an asset page.

### Front page and print objects

**Homepage as a scaled front page with crop marks — Arts of the Working Class** (artsoftheworkingclass.org). USED on stickers.
The current issue presents as a scaled newspaper front page with live crop marks and the printed contents list, not as article cards. The masthead runs as a marquee translated across roughly ten scripts.

**Drag-scroll snap spread track — Works in Progress.** UNUSED.
`overflow-x: auto; scroll-snap-type: x mandatory; cursor: grab`, covers at `clamp(150px, 50vw, 190px)` with rotation and offset tokens. Also theirs: vertical spines via `writing-mode: vertical-lr; text-orientation: sideways; transform: rotate(-180deg)`.

**Angled overlapping spread stack — Simulacrum** (simulacrum.nl). UNUSED.
Print spreads scattered as an angled overlapping pile, crimson-on-cream duotone across every scan.

**Ink-bleed ground with mirrored outline type — Revista Rosa** (revistarosa.com). UNUSED.
A full-bleed pink ink bleed as the page ground instead of a hero photo, giant outlined display type mirrored and half-transparent behind the content, colour swapped per dossier.

**Cover and back-cover pair as the archive unit — Real Review** (real-review.org). UNUSED.
Both faces of every issue in one grid, no titles. Note: Real Review has only six routes and no article pages, so its web layout is otherwise useless as a reference.

### Constraint as identity

**Hard byte budget — Taper** (taper.badquar.to). UNUSED.
Every piece must fit under 2 kilobytes, so each poem is a hand-written HTML and JS artifact and the constraint sets the visual language. Sixteen biannual issues with no gaps, each with a numeric theme the code obeys ("powers of ten", "a throw of the dice"). Use the correct hostname; `badquarto.com` serves a mismatched certificate.

**Context-driven layout state — Branch** (branch.climateaction.tech). UNUSED. **The single most interesting idea in the audit.**
The layout switches between low, moderate and high states based on the fossil-fuel intensity of the reader's local electricity grid. Image weight, colour and density all change, and the reader can auto-follow the grid or pick a state by hand. `writing-mode` appears 14 times for rotated rail labels.
Generalised: let something outside the page (time of day, battery level, connection type, local weather, reduced-motion, viewport aspect) select among named layout states, and expose the override.

**Preservation as a publishing step — Parametric Press** (parametric.press). UNUSED.
Each issue ships a WARC capture recorded at publication, hosted on S3 and playable through replayweb.page. The interactive piece keeps running after its JavaScript rots. Also theirs: sticky scroll graphics (`.idyll-scroll-graphic { position: sticky }` with `max-height: 100vh`) and a margin rail sized from leftover space, `width: calc((80vw - 600px) - 50px)`.

**Permanent citation in the rail — Places Journal.** USED on frasurbane.
Every essay carries a formatted permanent citation. One partial to build, and it makes the piece quotable.

**Theme-named issue routes — Increment** (increment.com, frozen 2021). UNUSED.
`/planning/`, `/mobile/`, `/containers/`, with articles nested beneath (`/planning/reframing-tech-debt/`). The path states the theme before the reader clicks.

### 3D and soft rendering

**Cheap soft 3D — Kohkoku** (kohkoku.jp/case02, owner flagged this one). UNUSED.
広告 Kohkoku is Hakuhodo's magazine, and each print issue gets a bespoke WebGL microsite named CASE #NN, with the domain root redirecting to the newest one. Case 02's clay-toy look comes from GLTF models with matcap plus toon materials and GSAP, not raymarched SDFs. That is the cheap path to a soft look, and it means the site's jank is fixable rather than inherent. Owner's note: "great for clay using webgl (tho perf is shitty)". Anything built here must beat it.
Other devices there: draggable mahjong tiles in the hero, eleven numbered scroll chapters each staging one idea, and a game HUD vocabulary (START, TIME, BOSS, POWER UP) in a pixel font.

**Single-mesh toy with shareable state — Blobmixer** (blobmixer.14islands.com). UNUSED.
One sphere displaced by vertex noise, dressed in gradient and matcap materials, with sliders, preset worlds and the blob state serialized into a shareable URL. Performance is strong because the scene is one mesh.

**Hand-painted texture instead of shader complexity — Chartogne-Taillet** (chartogne-taillet.com). UNUSED.
Two real villages rebuilt in three.js from satellite photos, with watercolour textures on simple geometry, navigating plot to plot where each parcel opens editorial content. Proof that "soft" can come from texture art rather than shader math, which keeps rendering cheap.

**Toy as navigation — Choo-Choo World** (choochooworld.com), Bruno Simon (bruno-simon.com). UNUSED.
Drag-and-drop wooden track pieces, then the camera rides the train. Or drive a toy car across a playground where content areas are physical zones. Both teach navigation-as-play; both are heavy.

## 3. What each existing page already spends

Do not reassign these. The point of the catalog is that the next page uses something new.

| Page | Publication form | Mechanisms spent |
|---|---|---|
| `/styles` (hub) | newsstand contents | folio, dotted-leader contents list |
| `/styles/stickers` | street paper | Arts of the Working Class front page with crop marks, multi-script masthead marquee, A24 type badges |
| `/styles/overprint` | printed weekly, printed twice | Sabzian column rules and margin spine, Distill named tracks and gutter note |
| `/styles/frasurbane` | scholarly literary journal | Triple Canopy derived scale and named speeds, Drift section drop initials, Places citation rail, margin sidenotes |
| `/styles/clay` | blind-box toy catalog | Stripe Press rigid template and living cover, pull-odds card, mail-order coupon |
| `/styles/mishko` | numbered poster archive | Techniques Journal self-reskin, Aeon section token, edition tech sheet |
| `/styles/neubrutalism` | festival programme | Rest of World three axes, Asterisk rolling TBA slots, zebra schedule, ticket tiers |

The hub is the weakest and the most available. It currently has generic magazine chrome and no signature mechanism. Candidates: ARCHIVIO's cycle rebuild (the hub re-skins itself every time a style is added), Developments' dual-axis index (browse by number and by mechanism), European Review's dual address (each style reachable by aesthetic and by publication form), or EE72's same-feed-at-two-densities.

## 3b. Unspent mechanisms at a glance

Everything below is documented in section 2 and used by nothing in this repo. Ranked by how much it would change a page.

| Mechanism | Source | What it buys |
|---|---|---|
| Context-driven layout states | Branch | The reader's grid, battery or weather picks the layout, with an override |
| 24-column canvas + header archetypes | Emergence | Per-story art direction authored as data, zero new CSS per page |
| Byte budget as identity | Taper | A stated weight ceiling that visibly shapes the design |
| Identity rebuilds every N issues | ARCHIVIO | The publication resets its own look on a cycle |
| WARC capture at publish | Parametric Press | The interactive page survives its own JavaScript rotting |
| `body:has()` retheming | Works in Progress | A leaf element retints the shell, no prop threading |
| Drag-scroll snap spread track | Works in Progress | Print spreads you drag through |
| Vertical spines | Works in Progress | `writing-mode` plus `rotate(-180deg)` on issue cards |
| Gutterless full-bleed image grid | Kajet | Pattern and image run edge to edge, tag chips overprinted |
| Ink-bleed ground + mirrored outline type | Revista Rosa | A colour ground instead of a hero image |
| Angled overlapping spread stack | Simulacrum | Overlap as the organising principle |
| Two nav axes, no cover art | Developments | Numeric index plus tag vocabulary, names carry hierarchy |
| Dual address per piece | European Review of Books | One piece, an issue URL and a taxonomy URL |
| Chaptered issues | The Vessel | `/issues/11/garden`, arcs across issues |
| Same feed at two densities | EE72 | Card grid, then the identical feed as a link list |
| Theme-named issue routes | Increment | The path states the theme before the click |
| Named columns as routes | 032c | A recurring column becomes a place |
| Headline case as content field | SSENSE | Case stored per item, not fixed in CSS |
| Run dates in the masthead | Real Life | Nine characters state the publication's life span |
| Per-article body id | Asterisk | One-off art direction without a variant class |
| Measure in vw | Asterisk | Redeclared `:root` blocks per breakpoint |
| Editor-selectable drop cap | Nautilus | Drop cap as a content decision |
| Area-named card grids | Nautilus | `grid-template-areas` naming the slots |
| One paired rhythm value | Atavist | Two numbers govern three block types |
| Full `l-*` placement system | Distill | Four classes place any figure at any width |
| Halftone token set | Triple Canopy | Screen-print texture as variables |
| Cover and back-cover pair | Real Review | Both faces of an issue, one grid, no titles |
| Cheap soft 3D | Kohkoku | GLTF plus matcap plus toon, no raymarching |
| Single-mesh toy, shareable URL | Blobmixer | One displaced sphere, state in the URL |
| Painted texture over shader math | Chartogne-Taillet | Soft look at low GPU cost |
| Toy as navigation | Choo-Choo World | Content zones you physically drive or build through |
| Category-first browsing | Subsequence | Six named categories instead of a date feed |
| Sticky scroll graphic + leftover-space rail | Parametric Press | A margin rail sized from whatever the measure leaves |

## 3c. The composition lesson, learned the hard way

Rounds one through four of this work added magazine COMPONENTS to pages whose COMPOSITION never changed: mastheads, folios, figure captions, spec tables, filter chips, all sitting on a centred single column of stacked sections. The owner's verdict was blunt and correct: the pages were the same as before, and the magazine layout was missing.

A magazine layout is a GRID, not a set of widgets. Round five gave every page a real page-level grid and placed blocks asymmetrically on it.

What actually changed the pages:

- **One page-level grid, not per-section centred containers.** Each page declares `grid-template-columns: repeat(12, minmax(0, 1fr))` once (24 on frasurbane), and sections claim spans on it. Before, every section was its own `width: min(Xpx, 100% - 40px); margin: 0 auto`, which guarantees a stack.
- **Figures beside text, not above it.** Frasurbane's statue plate holds columns 2 to 12 while the article runs 13 to 24, so the eye moves across rather than down.
- **Blocks that do not share edges.** Overprint's plate sits at columns 2 to 9, the smear row spans all 12, the supplement starts at 3, the colophon stops at 7. Clay's hero plate ends at column 9 and the next plate starts at 5, so consecutive figures overlap in the horizontal band.
- **Text that breaks out of its own column.** Frasurbane's pull quote carries `margin-left: -38%` so it crosses into the plate's air, which is what a real pull quote does.
- **Marginalia positioned in grid units.** `left: calc(-1 * (100% / 11 * 2))` puts a sidenote two columns out, so it tracks the grid rather than a magic pixel value.
- **A main well plus a rail.** Neubrutalism's schedule holds columns 1 to 9 and the ticket tiers stack in 9 to 13. Overprint gained an "ALSO IN THIS RUN" rail at 10 to 13. Clay gained an "on the cover" rail beside the hero plate.
- **A visible gutter for spreads.** Stickers is two facing pages with a dashed centre gutter and folios at the bottom outer corners.
- **Asymmetric internal grids.** Neubrutalism's hero is `1.45fr 1fr`, not `1fr 1fr`.

Two traps this created, both of which broke a page:

1. **Nested grids inherit outer spans.** A child carrying `grid-column: 1 / 13` that lands inside a two-column grid creates implicit columns and overflows the viewport. Neubrutalism's bento and ticket panels broke exactly this way. Either place cells directly in the page grid, or reset the span with `grid-column: auto` on anything that moves into a nested grid. Clay's icon plate needed the same reset.
2. **`width: min(Xpx, calc(100% - 40px))` fights a grid span.** Every regridded block needs its old centring width and auto margins removed, or it refuses to fill the span you gave it.

Verify a regrid by looking for a straight left edge running the height of the screenshot. If every block starts at the same x, it is still a stack.

## 4. How to pair a new style with a form

Work in this order.

1. **Name the artifact the aesthetic actually produces.** Riso makes posters and newspapers. Blind-box makes catalogs. Rave makes flyers. Academic makes journals. Software makes documentation. If the aesthetic has no native print artifact, ask what it would be sold or distributed in.
2. **Find a real publication in that form whose own design shares the aesthetic.** The catalog above is the shortlist; the reference index at the end has the rest.
3. **Take one structural mechanism plus one or two details.** One is not enough to change the reading experience, and four turns into pastiche. Every existing page uses two or three.
4. **Keep the page interactive.** Every style page has a working toy: drag, misregister, flip eras, poke, melt, filter. The magazine form wraps the toy; it does not replace it.
5. **Check the mechanism is unspent** against the table in section 3.

## 5. Candidate styles, each with a suggested form

Aesthetics not yet built, paired with a mechanism that fits and is currently unspent. These are suggestions with a rationale, not orders.

1. **Solarpunk or eco-brutalism** with **Branch's context-driven states.** The strongest available pairing in this document. An aesthetic about energy, on a layout that reads the reader's grid or battery and shifts density accordingly, with a manual override.
2. **Y2K or Frutiger Aero** with **ARCHIVIO's cycle rebuild** or **Increment's theme-named issue routes.** Both aesthetics are era-coded, so an identity that resets per era is native.
3. **Xerox, low-ink, photocopy zine** with **Taper's byte budget.** Print the actual page weight in the masthead and hold the page under a stated ceiling. The constraint becomes the aesthetic honestly rather than as an illustration of it.
4. **Swiss International Typographic** with **Distill's named grid lines and `l-*` classes.** The only aesthetic where an exposed, disciplined grid IS the content. Show the line names.
5. **Isotype or textbook diagram** with **Emergence's 24-column canvas.** Figures placed at explicit coordinates from a data array is exactly how a textbook plate is composed.
6. **Memphis Milano** with **Kajet's gutterless full-bleed grid** and **Revista Rosa's mirrored outline type.** Memphis is pattern-first; a grid with no gutters lets pattern run edge to edge.
7. **Acid graphics or rave flyer** with **EE72's two-density feed** and **Works in Progress's drag-scroll spread track.** A flyer wall you drag through, then the same lineup as a plain list.
8. **Art Nouveau** with **Places Journal's citation rail** and **Nautilus's editor-selectable drop cap.** Both belong to the era of the illustrated periodical.
9. **Liquid chrome or Y2K 3D** with **Kohkoku's matcap and toon recipe** plus **Blobmixer's single-mesh shareable state.** Cheap soft 3D with a URL you can send.
10. **Wabi-sabi or Japanese quiet** with **Subsequence's category-first browsing** (six named categories instead of a chronological feed) and **Sabzian's rotated margin wordmark.**
11. **Corporate Memphis** with **SSENSE's headline case as a content field.** An aesthetic built on interchangeable parts, on a system where even the case is data.
12. **Blackletter or metal** with **032c's named columns as routes.** Recurring columns as places suits a scene organised around named zines and labels.
13. **Ransom-note punk** with **Real Life's run dates in the masthead.** A scene that dates and kills its own publications.
14. **Terminal or HUD** with **Developments' two nav axes and no cover art.** Numbers and tags, nothing pictorial, which is what a terminal index is.
15. **Hyperpop maximalism** with **Simulacrum's angled overlapping spread stack.** Overlap as the organising principle.

## 6. Repo implementation contract

Facts verified in this codebase on 2026-08-11. Check them again if the tree has moved.

**Route anatomy.** One folder per style at `apps/main/app/styles/<name>/`, containing:

- `page.tsx`, a server component, about 30 lines. Declares `metadata` (bare `title`, one-sentence `description`, `alternates: { canonical: '/styles/<name>' }`), declares `export const viewport = routeViewport('/styles/<name>')`, loads fonts, and renders the view. No nested `layout.tsx` anywhere in this app.
- `<name>-view.tsx`, `'use client'`, wrapping everything in `<Shell className={`${css.page} ${fontVars}`}>` from `services/shell`.
- `<name>.module.css`, with route tokens declared on the root class.
- Extra siblings as needed. Keep every file under 400 effective lines (`scripts/loc-gate.ts`, advisory).

**Fonts.** `next/font/google` inside `page.tsx`, always `display: 'swap'` and `preload: false`, exposed as CSS variables and passed to the view as one `fontVars` string. Do not add `<link>` tags to Google.

**Chrome registration.** `apps/main/services/transition/altitude.ts` holds `ROUTE_CHROME`, keyed by path. The current shape is `{ statusTint, toolbarTint?, overscroll? }`. `statusTint` is the sky at the viewport top edge, which iOS reads from the html and body backgrounds. `toolbarTint` feeds the iOS bottom toolbar and must be omitted on document-scrolling routes, because the strip flat-paints over content bleeding through the glass. `overscroll` paints the rubber-band reveal. This file was refactored on 2026-08-11 from an older `{ top, bottom, canvas }` shape; read it before editing.

**Navigation.** `import Link from 'services/link'` and pass `url`, not `href`. The prop is typed `Route`, so a new path fails typecheck until the manifest regenerates. Never import `next/link`.

**Assets.** Put files under `apps/main/public/styles/`. After adding any, run `node scripts/snapshot-static-files.ts` from `apps/main` and commit the regenerated `app/console/static-files.json`, or `/console` will not list them. Resize through `sharp` (a devDependency of `apps/main`); scratch scripts belong in the gitignored `apps/main/tmp/`.

**Generating art.** `codex exec` with the built-in `image_gen` tool works headless. Prompt goes via stdin (`codex exec -s workspace-write --skip-git-repo-check - < order.md`); a positional `"$(cat)"` argument silently vanishes inside `nohup bash -c`. Only 1536x1024 and 1024x1536 are exact sizes; the square preset returns 1254x1254. Concurrent jobs sharing a working directory collide on image_gen temp files, so isolate with `-C jobs/jN` and md5-check the outputs. Write "NO text, NO letters, NO watermark" into every order. The three clay plates in `public/styles/clay-*.jpg` came from orders still sitting in `apps/main/tmp/clayjobs/`.

**Gates, in the order they bite.**

```bash
pnpm --dir apps/main exec biome check --write app/styles   # formats and lints
pnpm --dir apps/main exec next typegen                     # before typecheck on a NEW route
pnpm --dir apps/main typecheck                             # tsc
node apps/main/scripts/css-refs-gate.ts                    # blocking: every css.foo must exist
```

Biome specifics: filenames must be kebab-case, `noConsole` is an error outside `scripts/**`, CSS is linted with `cssModules` and `tailwindDirectives` on, and `noExcessiveCognitiveComplexity` warns above 10. `noDescendingSpecificity` is a real warning here, so declare a bare class before any compound selector that targets it.

## 7. Traps already paid for

Each of these cost real time in this lane.

**`max-content` children widen the Shell grid column.** A marquee track at `width: max-content` blew `main` to about 2900px, and `margin: auto` sections then centred against that phantom width and rendered off-screen right. Fix: `contain: inline-size` on the overflow-clip parent of the track. Diagnostic: full-bleed elements look correct while centred blocks sit far right; confirm with `document.scrollingElement.scrollWidth`.

**SVG filter regions paint borders.** A filter's default region is −10% to +120% of the element, so empty region pixels painted a solid ink rectangle around every filtered image. Pin `x='0%' y='0%' width='100%' height='100%'` on the `<filter>`, and multiply the alpha result by `SourceAlpha` (`feComposite operator='arithmetic' k1='1'`) so transparent pixels stay transparent.

**Runtime SVG filters are the wrong tool for a static effect.** The riso ink separations started as live `feColorMatrix` filters and the page dragged. Baking them into alpha webp files with sharp (grayscale, `linear(m·k, 127.5(1−k))`, negate, gamma crush, `joinChannel` over a flat ink) left the plates as plain images that only multiply and translate. Measured after: 8.4ms average frame and 9ms p95 during a pointer drag, in software-rasterized headless Chromium. The recipe is `apps/main/tmp/ink.mts`.

**`content-visibility: auto` renders empty in Playwright full-page captures.** Sections never intersect during capture, so they photograph blank. It was removed from overprint for that reason. If you need it, verify with a live CDP flow instead of `--full-page`.

**`new Date()` in a client component breaks the Next prerender.** It throws "encountered the unstable value". Initialise the state to a static placeholder and set the real value inside an effect.

**Typed routes lag the filesystem.** A brand-new route fails `tsc` with `Type '"/styles/x"' is not assignable to type 'Route'` until `next typegen` or a dev run regenerates the manifest.

**Keyframes replace the base transform.** A keyframe that animates `transform` stomps an element's existing `transform`. Animate `translate`, `scale` and `rotate` as individual properties instead, which is what every page here does.

**Sibling agents edit this repo in parallel.** Stage only your own paths. During this work, `tsc` reported three errors in `repo/papers/total-eclipse/umbra-field.ts`, which belonged to another lane and were correctly left alone. Re-read files before editing rather than trusting a cached copy.

**Biome reformats immediately after you write.** Expect `--write` to reflow your JSX and CSS, so anchor future string edits on the formatted output, not on what you typed.

## 8. Verification recipe

The dev server runs on port 3000 via `pnpm --dir apps/main dev`. Note that `predev` writes `app/console/static-files.json`, so starting it can dirty the tree.

Screenshots, one command per route, since a shell loop with positional parameters silently overwrote every file into one during this work:

```bash
cd packages/e2e
pnpm exec playwright screenshot --viewport-size=1440,900 \
  --wait-for-timeout=2600 --full-page \
  http://localhost:3000/styles/<name> /tmp/shots/<name>.png
```

For interaction, drive real Chromium from the `packages/e2e` directory. Node resolves imports from the script's own path, so a script living in `/tmp` cannot import `@playwright/test`; pipe it through stdin instead:

```bash
cd packages/e2e && node --input-type=module < /tmp/script.mjs
```

Measure animation cost with a real rAF sample rather than guessing:

```js
const perf = page.evaluate(() => new Promise((resolve) => {
  const frames = []; let last = performance.now(); let n = 0
  const tick = (now) => {
    frames.push(now - last); last = now
    if (++n >= 150) { frames.sort((a, b) => a - b)
      return resolve({ avg: frames.reduce((s, v) => s + v, 0) / frames.length,
                       p95: frames[Math.floor(frames.length * 0.95)] }) }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}))
```

Mobile check at 390 wide as well. The owner judges by eye, so end every round by showing a rendered screenshot, not a description.

## 9. Deliberate omissions

The six style pages are **not** registered in `apps/main/app/sitemap.ts`, `apps/main/services/goto-nav.ts`, the `/console` command list, or `packages/e2e/routes.ts`. That is intentional while this is exploration. Wire them in only on an explicit instruction. When you do, `packages/e2e/routes.ts` is the smoke-coverage list and nothing enforces its completeness.

## 10. Reference index

Verified alive 2026-08-11 unless noted.

Story systems: [Emergence](https://emergencemagazine.org), [Triple Canopy](https://canopycanopycanopy.com), [Distill](https://distill.pub) (frozen 2021), [Parametric Press](https://parametric.press) (dormant 2020), [Works in Progress](https://worksinprogress.co), [Asterisk](https://asteriskmag.com), [Nautilus](https://nautil.us) (metered), [Aeon](https://aeon.co) (bot-walled, verify via `feed.rss`), [Places Journal](https://placesjournal.org) (Cloudflare-walled), [The Atavist](https://magazine.atavist.com) (bespoke era over, now Newspack).

Fashion and radical: [SSENSE](https://www.ssense.com/en-us/editorial) (article fetches 403), [032c](https://magazine.032c.com), [A24 Notes](https://a24films.com/notes), [Stripe Press](https://press.stripe.com), [Increment](https://increment.com) (archived), [Eye on Design](https://eyeondesign.aiga.org) (archived, roughly 100 articles kept), [Real Life](https://reallifemag.com) (archived 2016 to 2022), [The Drift](https://www.thedriftmag.com), [Rest of World](https://restofworld.org).

Discoveries: [Branch](https://branch.climateaction.tech), [Techniques Journal](https://techniquesjournal.com), [Taper](https://taper.badquar.to), [ARCHIVIO](https://magazine.archivio.com), [Soft Labor](https://www.softlabor.biz), [Sabzian](https://sabzian.be), [Arts of the Working Class](https://artsoftheworkingclass.org), [Revista Rosa](https://revistarosa.com), [Kajet](https://kajetjournal.com), [The Vessel](https://vessel-magazine.no), [European Review of Books](https://europeanreviewofbooks.com), [Developments](https://developments.media), [Simulacrum](https://simulacrum.nl), [The Republic](https://rpublc.com), [SHIFT](https://www.shift.jp.org/en/), [Materia](https://materia.press), [EE72](https://ee72.com).

Japanese periodicals: [Kohkoku](https://kohkoku.jp), [Subsequence](https://subsequence.tv), [POPEYE Web](https://popeyemagazine.jp), [Hanatsubaki Journal](https://hanatsubaki-journal.shiseido.com), [Fashion Tech News](https://fashiontechnews.zozo.com), [DIG THE TEA](https://digthetea.com), [ここ こ](https://co-coco.jp), [The Graphic Design Review](https://gdr.jagda.or.jp). [TOKION](https://www.tokion.jp) archive is alive but publication paused in February 2024.

WebGL and soft 3D: [Blobmixer](https://blobmixer.14islands.com), [Choo-Choo World](https://choochooworld.com), [Chartogne-Taillet](https://chartogne-taillet.com/en), [Womp](https://womp.com), [Playdate](https://play.date), [Bruno Simon](https://bruno-simon.com).

Owner's own canon, treat as taste law: The Pudding, NYT graphics, FT visual journalism (ig.ft.com), Zeit Online, Emergence, Noema, Works in Progress, Asterisk, Rest of World, The HTML Review, Poolsuite, CARI (cari.institute). Directories he uses: typewolf.com, hoverstat.es, godly.website, siteinspire.com, httpster.net.

**Dead or useless as layout references.** The Face serves only a holding page and its archive is gone. Real Review has six routes and no article pages. Dirt renders client-side and splits across two hosts. Frozen with no new issues: MOLD, Asimov Press, CARTHA, TISSUE, Hypocrite Reader, Wonderground, Offramp, Assemble Papers. Lost to domain squatters: contrajournal.com, echoes-mag.com, edgardaily.com, unbag.net. DNS dead: grove-journal.com, iiiimag.com, compostmag.cc.

**Where to mine for more.** Siteinspire's magazines category (`?categories=42`) was the densest vein at 36 named periodicals. hoverstat.es is a good vein but skews to portfolios and has no tag pages, only `/archive/`. Awwwards Site of the Day was near-useless for this brief: 31 consecutive studio portfolios and campaign microsites across July and August 2026. godly.website now redirects to recent.design, which returns 403 to fetchers. WebFetch flattens pages to markdown and will describe almost anything as "clean and minimal", so confirm visual claims with a headless screenshot before trusting them.
