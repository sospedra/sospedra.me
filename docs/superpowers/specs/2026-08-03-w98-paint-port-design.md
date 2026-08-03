# W98 Paint port

Replace the vendored jspaint iframe with a React and TypeScript Paint that lives in our codebase and uses our Windows 98 chrome.

## Current state, verified

`app/w98/w98-view.tsx:451` renders an iframe on `/vendor/jspaint/index.html`. Our titlebar and status bar wrap it. Inside, jspaint draws its own menubar, toolbox, palette, and a second status bar.

Measured on open, headless Chrome against `localhost:3000`:

| Fact | Value |
|---|---|
| Scripts loaded | 53 |
| Requests | 96 |
| Bytes transferred | 1280 KB |
| Largest single asset | `images/tracky-mouse-jspaint-demo.mp4`, 1254 KB |
| Vendor directory on disk | 47 MB |
| jspaint paths in `service/io/static-files.json` | 2802 |
| Canvas bitmap | 683x384, fixed |
| Tools rendered | 16 |
| Palette swatches | 28 colors, each a `<canvas>` |

The 1254 KB video belongs to a news article. It has nothing to do with Paint and downloads on every open.

### The scope is already declared in code

`public/vendor/jspaint/src/menus.js:1425-1452` trims the menus at runtime. `src/menus.js` declares seven top-level menus; only two survive.

| Menu | Kept |
|---|---|
| File | New, Open, Save As |
| Edit | Undo, Cut, Copy, Paste, Clear Selection, Select All |
| View, Image, Colors, Help, Extras | deleted at line 1451 |

Verified at runtime: `import('/vendor/jspaint/src/menus.js').then(m => Object.keys(m.menus))` returns `['&File', '&Edit']`.

### Duplicate Windows 98 CSS

Three vendor stylesheets overlap while `app/w98/w98.module.css` already draws the same chrome from `--win-*` tokens.

| File | Size |
|---|---|
| `lib/os-gui/build/windows-98.css` | 56 K |
| `styles/layout.css` | 28 K |
| `lib/98.css/98.custom-build.css` | 24 K |

### Two open bugs the port closes

1. Two status bars stack. Ours reads "Ready", jspaint's reads "Ready.".
2. jspaint mints a session per load and writes a PNG dataURL to `localStorage` under `image#<id>`. The iframe `src` carries no hash, so every open leaks a fresh key. Four probe loads left four keys.

## Decisions

| Question | Decision |
|---|---|
| Tool set | 14. Text and Free-Form Select are cut. |
| File I/O | PNG only, native browser APIs. |
| Canvas size | Fixed 683x384 with working resize nubs. |
| Persistence | In memory. A dirty-state warning guards every exit. |
| Menus | File and Edit only, matching the existing trim. |

## Architecture

### File layout

Follows `app/w98/realplayer/`: pure logic modules, tests beside them, one view, one stylesheet.

```
app/w98/paint/
  paint-view.tsx     chrome + canvas wiring
  paint.module.css   paint-only styles
  state.ts           PaintState union + reducer
  tools.ts           the 14 tool descriptors
  raster.ts          bresenham line, ellipse, rounded rect, polygon, bezier, brush stamp, spray
  fill.ts            scanline flood fill
  history.ts         byte-capped undo/redo
  selection.ts       rect select: move, resize, clipboard
  palette.ts         the 28 default colors
  file-io.ts         PNG open and save
  options.ts         tool option widgets
  use-paint.ts       owns canvas refs and dispatch
  exit-guard.ts      beforeunload + Link onNavigate
```

`raster.ts` and `fill.ts` accept a `Uint8ClampedArray` plus width and height. They never touch `CanvasRenderingContext2D`. Two reasons: `ctx.stroke()` antialiases and mspaint never did, and a plain buffer runs under `node --test` with no DOM.

### Tool contract

A discriminated union. No behavior flags, no mode strings.

```ts
type Tool =
  | { kind: 'freehand'; id; name; icon; cursor; options; paint(c: Ctx): void }
  | { kind: 'shape';    id; name; icon; cursor; options; render(buf, from, to, o): void }
  | { kind: 'point';    id; name; icon; cursor; options; apply(c: Ctx): void }
  | { kind: 'select';   id; name; icon; cursor; options }
```

Freehand tools write the main bitmap on each move. Shape tools redraw a helper layer on move and commit on release. Point tools fire on press only.

The 14 tools: Select, Eraser, Fill With Color, Pick Color, Magnifier, Pencil, Brush, Airbrush, Line, Curve, Rectangle, Polygon, Ellipse, Rounded Rectangle.

### Tool options

`options.ts` holds the widget data per tool.

| Tool | Options |
|---|---|
| Eraser | 4 sizes |
| Brush | 4 shapes x 3 sizes |
| Airbrush | 3 sizes |
| Line, Curve | 5 widths |
| Magnifier | 1x, 2x, 6x, 8x |
| Rectangle, Polygon, Ellipse, Rounded Rectangle | outline, filled with outline, filled |
| Select | 2 transparency modes |
| Pencil, Fill With Color, Pick Color | none |

### State

One discriminated union plus one `(state, event) => state` reducer in `state.ts`. Every transition lives there.

### Canvas and history

The bitmap starts at 683x384. The three resize nubs are wired. `Image > Attributes` is deleted, so the nubs are the only size control left, and a nub that does nothing is a lie in the UI. A nub drag allocates a new bitmap, copies the old at 0,0, and fills the new area white.

History is linear with a byte cap, not a count cap. One snapshot at 683x384 costs 1,049,088 bytes. A 24 MB ceiling yields 23 levels at the default size and fewer after a grow. One rule, no per-size tuning.

### CSS

Extract `app/w98/chrome.module.css` holding the Windows 98 primitives that `w98.module.css` already owns: bevel out, bevel in, titlebar, menubar, menuTrigger, menu, menuItem, windowControls, field, face. Both `w98.module.css` and `paint.module.css` `composes` from it.

`composes` is already proven in this repo at `app/w98/w98.module.css:522` and in the Sprite components.

`--win-*` tokens need no work. They sit on `.frame` at `app/w98/w98.module.css:5` and cascade into any descendant module.

Paint ends with one status bar carrying three fields: text, coordinates, size.

### Assets

Copy 14 tool icons and the whole 14-file cursor set into `public/images/w98/paint/`. Each icon is a 15x11 GIF, verified with a header read. Measured: icons 11,113 bytes, cursors 9,194 bytes. 20 KB replaces 47 MB.

Icons, from `public/vendor/jspaint/help/`: `p_sel.gif`, `p_erase.gif`, `p_paint.gif`, `p_eye.gif`, `p_zoom.gif`, `p_pencil.gif`, `p_brush.gif`, `p_airb.gif`, `p_line.gif`, `p_curve.gif`, `p_rect.gif`, `p_poly.gif`, `p_oval.gif`, `p_rrect.gif`.

Cursors: copy `public/vendor/jspaint/images/cursors/` whole. Cherry-picking 11 of the 14 saves 600 bytes and costs a decision per file.

`p_free.gif` and `p_txt.gif` are not copied. Text and Free-Form Select are cut.

### Exit guard

`dirty` is set on commit. It clears on save and on New.

1. `beforeunload` while dirty covers reload, tab close, and the address bar.
2. The window close button opens a Windows 98 box reading "Save changes to untitled?" with Yes, No, Cancel. Yes saves then closes. No closes. Cancel stays.
3. The five Start-menu `<Link>` elements get `onNavigate`. Dirty means `preventDefault()` and the same box. The prop exists in Next 16.2.10 at `node_modules/next/dist/client/app-dir/link.d.ts:170`.

## Testing

Pure modules get `node --test` suites: `raster.test.ts`, `fill.test.ts`, `history.test.ts`, `state.test.ts`, `selection.test.ts`.

Test-reachable modules import with relative `.ts` paths. Bare `baseUrl` paths crash `node --test`.

Register the new suites in the `test` script in `package.json`.

Visual checks use headless Chrome against `localhost:3000`, never `127.0.0.1:3000`. Next 16 dev blocks cross-origin requests to `/_next/*` from the IP origin, so hydration never runs.

## Order of work

1. Extract `app/w98/chrome.module.css`. The desktop must screenshot identical.
2. Copy the 14 icons and the cursors to `public/images/w98/paint/`.
3. Build the static Paint chrome in React with the canvas inert. Screenshot against the baseline.
4. Port `raster.ts`, `fill.ts`, `history.ts`, `state.ts` with tests.
5. Wire the freehand, shape, and point tools plus magnification.
6. Wire Select, the Edit and File menus, the resize nubs, the exit guard.
7. Delete `public/vendor/jspaint/`, drop `JSPAINT_URL` at `app/w98/w98-view.tsx:35`, re-run `scripts/io/snapshot-static-files.ts`, register the tests.

Stages 1 to 3 are an afternoon. Stages 4 to 6 are the real work: the rasterizers and the selection layer. Two to three days with tests.

## Cut on purpose

jQuery. `audio/chord.wav` and all audio. All 32 locales. Tracky-mouse head tracking and its 9.9 MB of models. The 1254 KB news video. Speech recognition, 89 K. Eye gaze mode, 19 K. Firebase and multi-user sessions. The Discord embed SDK. Imgur upload. Eight themes. The help viewer. PDF, TIFF, BMP, and palette import. The `image#<id>` localStorage leak.
