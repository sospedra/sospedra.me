# Turborepo migration: sospedra.me → apps/main

## Context

The repo is a single-package Next.js 16 site on Vercel. Goal: a pnpm + Turborepo monorepo. Exploration found one deployable, 240 bare imports resolved by tsconfig `baseUrl: "./"`, runtime `process.cwd()` reads of `repo/` inside `'use cache'` scopes, a tracked `app/console/static-files.json` rewritten by `prebuild`, root-anchored `.gitignore` patterns guarding scratch, and a 533 MB `public/`.

Decided shape: move-only. The entire app moves intact into `apps/main`. No workspace packages on day one. That keeps all 240 bare imports working unchanged (`baseUrl` re-anchors to `apps/main`) and keeps every cwd-relative script correct (pnpm and turbo run package scripts with cwd = package dir). Turbo orchestrates lint, typecheck, and tests. Vercel keeps building with plain `next build`.

One pre-existing defect folds in: `app/meridian/run-variants.test.ts` reads a gitignored, generated challenge file and fails on fresh checkouts.

This file was retargeted on 2026-08-04. The original plan predated the layout unification (40f68271) and named dead paths (`content/`, `lib/`, `service/`, `meridian-daily.yml`).

## Doc-verified mechanics (do not re-derive)

| Claim | Verdict |
| --- | --- |
| `outputFileTracingIncludes` globs resolve from the Next project root (the dir with next.config), not the monorepo root | Next docs, confirmed |
| Vercel's Next launcher runs `process.chdir(__dirname)`, so runtime `process.cwd()` = `/var/task/apps/main` and the traced `repo/` copies sit exactly there | vercel/vercel source, confirmed |
| Vercel AUTO-enables skip-unaffected builds for pnpm-workspace monorepos. The daily deploy dies on empty days unless the "Skip deployment" toggle is disabled | Vercel monorepo docs, confirmed |
| `pnpm run build` fires `prebuild` (`enablePrePostScripts` defaults true) | pnpm docs, confirmed |
| lint-staged 17: closest config wins, tasks run in the config's dir, staged paths are absolute | lint-staged README, confirmed |
| Biome 2 in a subdir finds `.git` by walking up on its own. Setting `vcs.root: "../../"` BREAKS nested `.gitignore` anchoring: `tmp/` leaked into the scan with 179 errors | Empirical, 2026-08-04. The original doc-claim was wrong |
| `pnpm/action-setup` reads the version from `packageManager` when `version` is omitted | action README, confirmed |
| `turbo run build` fires pnpm pre-scripts: the root `pnpm build` printed all 14 generate-challenge lines | Empirical, 2026-08-04. The contingency is dead |

## Preconditions

1. Clean worktree. Met at 0ea1f49d.
2. No new branch. Execution happens on `codex/midnight-io-design-system`, user-picked.
3. Baseline: node tests, tsx tests, `tsc`, `biome check`, and css-refs-gate pass. loc-gate fails pre-existing: `app/bazaar/layout-editor.tsx` at 423 effective LOC over the 400 limit, landed in 0ea1f49d. The migration must reproduce this exact single failure and nothing else. Push stays blocked until the gate is settled (pre-push runs `pnpm test`).

## Phase 0: fixture fix (own commit, before the move)

1. `mkdir -p app/meridian/fixtures && cp repo/geo/challenges/2026-07-27.json app/meridian/fixtures/run-variants-challenge.json` (the file exists on disk today; regenerate via `scripts/geo/generate-challenge.ts` if missing).
2. In `app/meridian/run-variants.test.ts` replace `new URL('../../repo/geo/challenges/2026-07-27.json', import.meta.url)` with `new URL('./fixtures/run-variants-challenge.json', import.meta.url)`.
3. Verify `pnpm ci:geo:test` green and the fixture is tracked. Commit: `fix: commit the meridian run-variants fixture`.

## Phase 1: the move

`git mv` on a directory carries its gitignored contents along on disk. Only root-level untracked items need plain `mv`.

```bash
mkdir -p apps/main
git mv app docs public repo scripts services apps/main/
git mv next.config.ts tsconfig.json next-env.d.ts postcss.config.mjs \
       mdx-components.tsx biome.json .lintstagedrc.mjs package.json apps/main/
git mv .gitignore apps/main/.gitignore
mv tmp apps/main/                                        # untracked imagegen scratch
mv .env .env.local apps/main/                            # Next auto-loads .env* only from the project dir
rm -rf .next node_modules tsconfig.tsbuildinfo
```

Stays at root: `.husky/`, `.github/`, `.tool-versions`, `.npmrc`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `README.md`, `PLAN.md`, `.vercel/` (untracked). The old plan's `work/`, `output/`, `BAZAAR3_TAKEOVER`, `cf.jar`, and scene pngs are absent today. Their ignore lines stay for future scratch.

## Phase 2: new root files

`package.json` (new):

```json
{
  "name": "sospedra.me",
  "version": "4.0.0",
  "private": true,
  "license": "ISC",
  "packageManager": "pnpm@11.13.0",
  "engines": { "node": "24.x" },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run lint typecheck test",
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "9.1.7",
    "lint-staged": "17.1.0",
    "turbo": "2.10.8"
  }
}
```

husky and lint-staged live at root: hooks are repo-scoped and `prepare` must run where `.git` lives. Root `test` fans out through turbo, so `.husky/pre-push` (`pnpm test`) needs zero edits. `.husky/pre-commit` (`pnpm exec lint-staged`) also survives: lint-staged resolves the config that moved to `apps/main/.lintstagedrc.mjs` per file.

`pnpm-workspace.yaml` (edit in place, add the `packages` key, keep the rest byte-identical):

```yaml
packages:
  - apps/*
```

`turbo.json` (new):

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": { "cache": false, "env": ["MERIDIAN_PUBLICATION_DATE", "VERCEL_ENV"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
    "test": {},
    "ci:geo:test": {},
    "ci:geo:validate:challenges": { "cache": false }
  }
}
```

`build` is permanently uncacheable. `prebuild` writes gitignored, date-dependent `repo/geo/challenges/` JSONs and rewrites `app/console/static-files.json`. Both are invisible to input hashing, so any cache hit would restore a stale `.next` and skip generation. Cache-off removes the class. Turbo hashes tracked files via git object ids, so the 533 MB `public/` costs little for the cacheable tasks.

`.gitignore` (new, root):

```
node_modules
.DS_Store
.env*
.vercel
.turbo
*.tsbuildinfo
```

`apps/main/.gitignore` (the moved file): delete the lines now covered at root (`node_modules`, `.DS_Store`, `.vercel`, `.env`, `.env.local`, `.env*`, `*.tsbuildinfo`). Keep everything else byte-identical, `.next` included. The leading-slash patterns now anchor to `apps/main/` for free, because nested gitignores anchor at their own directory.

## Phase 3: app config edits (inside apps/main)

1. `package.json`: rename to `"name": "main"`, add `"private": true`, keep `"type": "module"` and `engines` (Vercel reads the Node version here). Delete `packageManager`, `prepare`, and the husky + lint-staged devDeps. Split the test chain: `test` keeps `node --test <39 files> && tsx --test app/travel/radio-stations.test.ts && node scripts/loc-gate.ts && node scripts/css-refs-gate.ts`, new `"typecheck": "tsc"`, and `lint` already exists as `biome check .`. All other scripts stay verbatim.
2. `next.config.ts`: add `import { join } from 'node:path'` and `outputFileTracingRoot: join(__dirname, '../..')` as the first config key. If the TS config loader leaves `__dirname` undefined, switch to `import.meta.dirname`. The Phase 5 build is the probe. The `./repo/...` tracing globs stay unchanged. Never run `next build` bare from the repo root.
3. `biome.json`: unchanged. Biome walks up to `.git` itself and honors the nested ignore files with correct anchoring. A `vcs.root` override breaks that.
4. `services/markdown/footer.tsx`: `createGithubLink` gains the `apps/main/` segment: `blob/master/apps/main/repo/papers/...`.
5. Unchanged, with reasons: `tsconfig.json` (baseUrl, include, exclude are app-dir-relative), `.lintstagedrc.mjs` (its `./scripts/*.mts` imports moved with it, absolute staged paths still substring-match), `.husky/*`, `postcss.config.mjs`, `mdx-components.tsx`, `next-env.d.ts`.

## Phase 4: CI workflow

`.github/workflows/publish-dailies.yml`, six deltas, everything else byte-identical:

1. `pnpm/action-setup@v4` drops `version: 11.13.0` (reads `packageManager`).
2. `pnpm ci:crosswords:archive-es` → `pnpm --filter main ci:crosswords:archive-es`
3. `pnpm ci:geo:test` → `pnpm --filter main ci:geo:test`
4. `pnpm build` → `pnpm --filter main build`
5. `pnpm ci:geo:validate:challenges` → `pnpm --filter main ci:geo:validate:challenges`
6. `git add repo/crosswords/challenges` → `git add apps/main/repo/crosswords/challenges` (an unmatched pathspec fails the step).

Plain pnpm, not turbo, so the daily build can never be cache-skipped. `--filter` sets cwd to `apps/main`, so `generate-window.mjs`'s relative child argv keeps working.

## Phase 5: local verification

```bash
pnpm install                                   # lockfile importers "." -> "apps/main"; commit it
pnpm exec turbo run lint typecheck test ci:geo:test   # expect exactly the pinned loc-gate failure
pnpm --filter main build                       # prebuild generates the window + snapshot, then next build
pnpm build                                     # probe: turbo path MUST also print generate output
pnpm --filter main dev                         # predev fires; smoke: / /papers/css-has /crosswords /meridian /console /w98
```

Checks: `apps/main/app/console/static-files.json` has a fresh mtime. `git status --porcelain` shows zero scratch artifacts (tmp, challenges, puzzles). `git check-ignore -v apps/main/tmp apps/main/repo/geo/challenges` names `apps/main/.gitignore`. `apps/main/.lintstagedrc.mjs` imports resolve from the new location. Pre-push runs the turbo chain.

The move commit runs with `--no-verify`: lint-staged would run sharp resize over every staged `public/` image on a repo-wide rename, and renames carry no content change.

Contingency if the `pnpm build` probe shows turbo skipping `prebuild`: inline the pre-steps (`"build": "node scripts/geo/generate-window.mjs && node scripts/snapshot-static-files.ts && next build"`, same for `dev` with `generate-challenge.ts`) and delete the `pre*` entries. Vercel and CI semantics are unaffected either way.

Commit: `refactor: move the app into apps/main behind a turborepo workspace`.

## Phase 6: Vercel validation and cutover (dashboard steps are manual)

Pre-flip validation on a throwaway project, so production never sees an experiment:

1. Push the migration branch (blocked on the loc-gate fix). Import the repo as a NEW Vercel project, Root Directory `apps/main`, framework Next.js, no command overrides. Deploy the branch.
2. Build logs must show: workspace install at repo root, pnpm version honored from `packageManager`, `Running "pnpm run build"` followed by the generate-challenge lines, and no injected `turbo run build` / `turbo-ignore` commands.
3. Tracing proof: `vercel link` to the throwaway, `vercel pull && vercel build`, then `find .vercel/output/functions -path '*apps/main/repo/papers*' | head` and the geo equivalent. Content must sit under `apps/main/repo/...` inside each `.func`.
4. Smoke the throwaway URL: `/`, `/papers/<slug>`, `/crosswords`, `/meridian`, `/console`, `/w98`, `/rss.xml`. A non-empty `/papers` listing proves the `'use cache'` fs reads resolve in the deployed function.

Cutover on project `sospedra-me`:

5. Dashboard: Root Directory → `apps/main`. Keep "Include source files outside of the Root Directory" enabled. Disable the "Skip deployment" toggle (kills auto skip-unaffected, which would swallow empty daily commits). Confirm no Build/Install command overrides appeared.
6. Merge the migration branch into `master` and push. This ships the 81 unmerged commits (meridian, w98, boombox, bazaar, the layout unification) together with the monorepo flip. Confirmed 2026-08-04. Watch the deploy, then smoke the same routes in prod.
7. `workflow_dispatch` the Publish dailies workflow: commit lands, Vercel builds it (not "Skipped"). Known blocker: the validate step fails today with 1148 pre-existing errors (follow-up 5). Fix that first or the run dies before the commit step.
8. Cleanup: delete the throwaway project, `vercel link` back to `sospedra-me`, `vercel pull`. Future env pulls: `vercel env pull apps/main/.env.local`.

Rollback: revert Root Directory to empty and revert the merge commit. Production serving is always the last good deployment, so nothing user-facing breaks in between.

## Critical files

- `next.config.ts` → `apps/main/next.config.ts` (the `outputFileTracingRoot` addition is the tracing-risk fix)
- `package.json` → new root manifest + `apps/main/package.json` rewrite
- `pnpm-workspace.yaml` (gains `packages`, becomes a real workspace)
- `.gitignore` → minimal root file + re-anchored `apps/main/.gitignore`
- `.github/workflows/publish-dailies.yml` (`--filter main`, version-less pnpm setup, `apps/main/` git add path)
- `turbo.json` (new)
- `app/meridian/run-variants.test.ts` + new fixture

## Out of scope, listed as follow-ups

1. `app/bazaar/layout-editor.tsx` is over the loc gate (423 > 400). Trim it or raise the limit. This blocks the push.
2. Hoist the `app/w98/taskbar.tsx → ../games/catalogue` cross-route import into `services/`.
3. `app/console/static-files.json` is tracked yet rewritten by every build. Candidate for gitignoring plus generation-on-build.
4. Prune the `.gitignore` guards for scratch that no longer exists (`/work/raw-data/`, `/output/`, `/cf.jar`, scene pngs) or keep them for future imagegen runs.
5. `ci:geo:validate:challenges` fails with 1148 pre-existing errors: `CREDITS.txt` was deleted in 6bd221e7, `work/raw-data/` locks are absent, and every shape hash differs from the manifest. Verified pre-existing on 2026-08-04 (lexicon, corpus, and determinism checks pass). The daily workflow gates on this step.
