# CIMS design

Date: 2026-08-05
Source: `~/Downloads/cims-tour.html` (single-file three.js r128 prototype, 17.2 MB, 1781 lines)
Target: `apps/main/app/cims/` behind the route `/cims`

## Problem

The prototype is one HTML file. It renders a guided flight tour over Catalan terrain: a full-country relief mesh, thirteen high-resolution mountain patches, contour and river overlays, real sun and moon positions, a flight state machine, synth SFX, and a CRT-green HUD. The file uses globals, CDN three.js, and inline data. The port moves it to the Next.js app with the repo doctrine: pure core, typed modules, tests, a11y, and per-route art direction.

## Approach

Chosen: faithful imperative port under a React shell.

- The engine stays imperative TypeScript. Pure math modules feed a thin three.js shell.
- React owns the chrome: panel, telemetry frame, labels containers, compass. Low-frequency state crosses through one external store (`services/external-store.ts`).
- Per-frame values (telemetry digits, label transforms, compass needle) write to DOM refs imperatively. React state there would be a render storm.
- The visual result must match the prototype. Route theming doctrine: match the reference literally.

Rejected alternatives:

- react-three-fiber. A paradigm library the codebase does not use, and a rewrite rather than a port.
- Raw WebGL rewrite. Removes the dependency but re-implements three.js scene management with high fidelity risk.

## Data

- `apps/main/public/cims/terrain.json` holds the prototype `DATA` object verbatim. Measured: 17.1 MB raw, 7.3 MB gzip -9.
- The client fetches it after mount and shows a HUD-styled loading line. Fetch failure shows a retry line in the same style.
- A zod schema validates the envelope: scalar fields, string fields, array presence, and grid-length consistency (`b64` decoded length must equal `nx*nz*2`). The numeric contour, river, and border arrays pass through unvalidated. Reason: millions of numbers, first-party static asset, same trust as code.
- The decode path (`decodeMasked`, `smoothGrid`) ports byte-identical and carries golden-vector tests.
- Deferred: repack `b64` grids as binary `.bin` assets (drops ~2.4 MB wire). Follow-up, not v1.

## Dependency

- `three@0.185.1` (dependencies) and `@types/three@0.185.4` (devDependencies), exact pins. Verified against the npm registry on 2026-08-05 (`npm view`).
- r128 → r185 delta: color management now defaults on. The port sets `THREE.ColorManagement.enabled = false` and `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` to restore r128 color math. Every other used API (BufferGeometry, ShaderMaterial, Points, LineSegments, WebGLRenderTarget + DepthTexture, layers, overrideMaterial) is unchanged.

## Module map

Every file stays at or under 400 effective LOC (loc-gate). Pure modules import no three.js, so `node --test` runs them.

| File | Owns |
| --- | --- |
| `page.tsx` | metadata, server shell |
| `cims-view.tsx` | client composition: fetch, engine mount, HUD |
| `terrain-schema.ts` | zod envelope, `TerrainData` types |
| `decode.ts` | `decodeMasked`, `smoothGrid`, bilinear samplers |
| `ramps.ts` | elevation ramp, hillshade, line and contour brightness (rgb tuples) |
| `astronomy.ts` | `sunPos`, `moonPos`, horizon conversion, direction vectors |
| `flight.ts` | tour state machine: fly/orbit union, targets, damping, launch and arrive math |
| `ground-hit.ts` | terrain ray march with injected height sampler |
| `terrain-build.ts` | Float32Array builders: base mesh, grid lines, contours, points, borders, rivers |
| `patch-slots.ts` | mountain slot fill: mesh, lines, contours, points arrays |
| `shaders.ts` | GLSL strings, uniform factories |
| `scene.ts` | renderer, materials, meshes, depth-edge pass |
| `sky.ts` | sun and moon bodies, orbit rings, glow textures |
| `trail.ts` | route line, comet tail, head glow |
| `sfx.ts` | WebAudio blips and flight drone |
| `engine.ts` | frame loop orchestration, store publishing, dispose |
| `pointer-input.ts` | pointer, pinch, wheel, keyboard handlers |
| `cims-store.ts` | external store snapshot for React |
| components | `telemetry-hud.tsx`, `tour-panel.tsx`, `compass.tsx`, `stage-labels.tsx` + css modules |

State ownership:

- Engine struct owns every per-frame value. One owner, no copies.
- The external store owns the low-frequency snapshot: step index, phase (fly/orbit), caption text, auto flag, surface mode, exaggeration, load state.
- React derives everything else during render. The caption typewriter is component-local and honors quiet mode.

## Behavior parity checklist

1. Boot: slot 0 built, high-altitude camera drop-in, no trail.
2. Auto tour every 9 s with arrival showcase half-orbit and range breathing.
3. prev/next/dots with 350 ms debounce and wrap-around.
4. City labels fly to cities. Destination labels skip the current target.
5. Two patch slots double-buffer mountains. Height cache. 22-cell edge fade into the base grid.
6. Surface modes grid/contour/points for base and patch. Points build lazily.
7. Vertical exaggeration slider 1–3 step 0.05 drives world scale, uniforms, and label heights.
8. Flight easing, arc height, terrain clearance floor, drag look-around while flying.
9. Orbit gestures: drag orbit, right or space pan, middle or ctrl look, wheel zoom anchored to terrain hit (300 ms anchor cache), pinch zoom and pan, double-click and double-tap focus, space tap toggles hold.
10. Compass shows while the camera moves, hides 900 ms after, click faces north.
11. Telemetry alt/spd/hdg/seq refreshes every 120 ms.
12. Peak labels (first one hot), city and destination labels culled by altitude range, sun and moon labels.
13. Real sun and moon positions per frame, orbit rings, warm sun tint and day/night mix uniforms.
14. River flow animation, altitude sweep cycle, terrain grain, peak-band glow.
15. Trail: 180-point route, comet tail with decay window 50, pulsing head and halo.
16. Fog far tracks camera altitude. Camera near tracks ground clearance.
17. Depth-edge pass: layer-1 depth render with override material, then additive fullscreen silhouette shader.
18. SFX: UI click blips, travel double-blip, arrival chirp, flight drone with LFO, context resume on first input.
19. Caption typewriter at 16 ms per character.
20. Resize rebuilds the edge render target. Pixel ratio cap 2, or 1.75 under 700 px width.
21. Context menu suppressed on the canvas. Grab cursors.
22. Mobile media rules from the prototype CSS.

## Sanctioned deviations

- Lifecycle: the prototype never unmounts. The port disposes everything on unmount: rAF, listeners, geometries, materials, render targets, GL context, audio nodes, intervals.
- Quiet mode: the prototype reads `prefers-reduced-motion` once at load. The port reads `useTheme().fxMode`, which folds in the site fx switch, and reacts live. Quiet keeps the prototype semantics (no auto tour, instant flights, instant captions, no showcase orbit) and also freezes the river and sweep shader clocks.
- Keyboard: arrow and space handlers ignore events from interactive targets, so buttons and the slider keep native behavior. With the canvas focused, arrows orbit, plus and minus zoom. Elsewhere, left and right arrows stay prev/next.
- Wheel capture scopes to the canvas element, never the window.
- A11y: canvas gets `role="application"` with a key-teaching label. Dots get names and `aria-current`. Auto gets `aria-pressed`. One `role="status"` region announces arrivals with the caption text.
- Sound stays on under quiet mode. It is user-initiated feedback, not motion.

## Testing

Golden vectors generate from the reference implementation: a scratch node script extracts the pure functions from `cims-tour.html` and dumps `golden-vectors.json` (small, committed). Fix the code, never the fixture.

- `decode.test.ts`: `decodeMasked` round-trip and mask semantics, `smoothGrid` passes against fixtures.
- `ramps.test.ts`: ramp colors, brightness curves against fixtures.
- `astronomy.test.ts`: sun and moon az/el at three fixed instants against fixtures.
- `flight.test.ts`: wrap, easing, damping steps, launch geometry against fixtures.
- `ground-hit.test.ts`: ray march on a synthetic sampler: hit, miss, refinement bound.
- `terrain-build.test.ts`: builder output lengths and spot values on a tiny synthetic grid.

Suites join the `node --test` segment of `pnpm test`. Fixtures load with `readFileSync`, so no JSON import attribute.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (includes loc-gate and css-refs-gate).
- Headless Chrome screenshots of `/cims` against the prototype file at the same viewport: boot frame, arrival frame, contour and points modes.
- Hostile pass: fx-quiet on, keyboard-only walk, non-UTC timezone.

## Follow-up ledger

- Binary repack of the heightmap grids. Problem: 7.3 MB wire payload. Direction: `.bin` uint16 assets plus a slim meta JSON, decode via `fetch` ArrayBuffer.
- OG card for `/cims` through `scripts/og.mts`.
