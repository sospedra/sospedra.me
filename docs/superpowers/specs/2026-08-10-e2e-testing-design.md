# e2e testing design

Date: 2026-08-10. Status: approved (option A, apply all).

## problem

The workspace has unit suites in every app and zero browser tests. CI never runs the suites. Visual verification is ad-hoc CDP driving inside agent sessions. The 2026-08-10 device report listed 9 mobile bugs. All were behavior bugs: dead controls, swallowed taps, viewport offsets. Unit tests cannot see that class.

## decision

Playwright, behavior first. A new workspace package `packages/e2e` with `@playwright/test`. Two assertion tiers. Screenshot baselines stay out of scope.

Rejected alternatives: a raw CDP harness on node:test (we would own auto-wait, retries, traces, and diffing) and a screenshot-only diff net (the redesign cadence churns baselines, and screenshots miss interaction bugs).

## architecture

- `packages/e2e` joins through the existing `packages/*` workspace glob.
- `playwright.config.ts` defines two projects: `desktop` (Chromium, 1280x800) and `mobile` (iPhone viewport, touch, Chromium engine).
- The `webServer` block starts `apps/main` dev on port 3000 and reuses a running server outside CI.
- A second config, `playwright.siblings.config.ts`, starts bonfire (3010), wkc, and spg on distinct ports for the sibling smoke.
- Shared fixtures own: external-host blocking with a per-spec allowlist, console and pageerror tracking, failed same-origin request tracking, a touch swipe helper over CDP, a canvas-painted helper.
- Turbo task `e2e` (no cache), excluded from the default `test` chain. Root script `pnpm e2e`.

## tier 1: smoke pack

Every apps/main route runs under both projects. Assertions per route:

1. The route renders and the main content is visible.
2. Zero console errors and zero uncaught page errors. Resource-load errors for blocked external hosts are exempt.
3. Zero failed same-origin requests.
4. External hosts stay blocked (streams, SoundCloud, analytics). The page must survive without an error loop.

## tier 2: interaction specs

First wave:

1. crosswords. Desktop: click a cell, type, move with arrows, run the check tool. Assert letter render, selection movement, clue-rail highlight, wrong-letter mark. Mobile: letter bank renders, native keyboard stays suppressed (`inputmode="none"`), toolbar keys respond, clue sheet dialog opens and closes. Reload restores the grid.
2. boombox. Pass the autoplay gate, submit a guess. Assert playing state class, feedback row, attempt count, daily countdown. Allow the blob host. No sound assertion.
3. travel. Power on, change heading, press a station key, tune with streams blocked. Assert readout updates, ship log append, non-blank globe canvas, no recovery crash loop.
4. scavenger. Flip forward and back, open the zip at the left fold end, select a disc. Assert the visible disc set changes and the detail renders. Mobile: portrait book mode, hidden arrows, swipe flips.
5. w98. Double-click an icon, open the music player, open the start menu, close a window. Assert window and taskbar button appear together and disappear together.
6. papers. Index to one slug, scroll to the end, click one interactive component in the bazaar paper. Assert `window.scrollY` changes, in-view images report `naturalWidth > 0`, console stays clean through the scroll.

Second wave:

7. back-button contract: home to bazaar, browser back. Assert popstate cancels the transition and home renders.
8. rubiks: face clicks plus keypad. Guards the preserve-3d hit-test workarounds.
9. meridian: one guess round.
10. console: type `help`, assert the output tree.
11. rotate the viewport mid-game and assert controls still respond (container-query race class).
12. sibling smoke: bonfire, wkc, spg load error-free. irc stays deferred (Web Locks never grant in one-shot headless).

## cross-cutting validation points

1. Control acknowledgment: every pressed control must change the DOM within its timeout.
2. Persistence: reload mid-game restores state (crosswords, scavenger, boombox).
3. Determinism: assertions are structural, never content-of-the-day. The Playwright clock API pins the client date where a spec needs it.
4. Input modality: desktop project uses keyboard and mouse, mobile project uses touch. Real-iOS quirks stay on-device.
5. Shallow media asserts: state classes over sound, one non-blank check per canvas scene.

## out of scope

- Pixel baselines and screenshot diffing. Owner eyes gate visuals.
- Real iOS (first-tap hover, Low Power). Manual on-device lane.
- irc p2p flows.
- CI workflow. It comes after the suite proves stable locally.

## traps

- A dependency add rewrites `pnpm-lock.yaml` and breaks the vouch identity tests. Regen with `pnpm --dir apps/vouch program-id` then `pnpm --dir apps/vouch vectors`.
- Blocked externals log resource-load console errors. The console assertion must exempt them by origin.
- Dev-server first hits compile on demand. Timeouts must absorb that.
