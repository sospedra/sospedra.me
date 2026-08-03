# Turborepo migration: sospedra.me → apps/web

## Context

The repo is a single-package Next.js 16 site on Vercel. Goal: a pnpm + Turborepo monorepo. Exploration found one deployable, 167 bare imports resolved by tsconfig `baseUrl: "./"`, runtime `process.cwd()` reads of `content/` inside `'use cache'` scopes, a config-eval `writeFileSync` in `next.config.ts`, root-anchored `.gitignore` patterns guarding 2 GB of scratch, and a 1.2 GB `public/`.

Decided shape: move-only. The entire app moves intact into `apps/web`. No workspace packages on day one. That keeps all 167 bare imports working unchanged (`baseUrl` re-anchors to `apps/web`) and keeps every cwd-relative script correct (pnpm and turbo run package scripts with cwd = package dir). Turbo orchestrates lint, typecheck, and tests. Vercel keeps building with plain `next build`.

One pre-existing defect folds in: `lib/geo/run-variants.test.ts` reads a gitignored, stale generated file and fails on fresh checkouts.

## Doc-verified mechanics (do not re-derive)

| Claim | Verdict |
| --- | --- |
| `outputFileTracingIncludes` globs resolve from the Next project root (the dir with next.config), not the monorepo root | Next docs, confirmed |
| Vercel's Next launcher runs `process.chdir(__dirname)`, so runtime `process.cwd()` = `/var/task/apps/web` and the traced `content/` copies sit exactly there | vercel/vercel source, confirmed |
| Vercel AUTO-enables skip-unaffected builds for pnpm-workspace monorepos. The daily empty-commit deploy dies unless the "Skip deployment" toggle is disabled | Vercel monorepo docs, confirmed |
| `pnpm run build` fires `prebuild` (`enablePrePostScripts` defaults true) | pnpm docs, confirmed |
| lint-staged 17: closest config wins, tasks run in the config's dir, staged paths are absolute | lint-staged README, confirmed |
| Biome 2 in a subdir needs `vcs.root` pointed at the repo root and supports nested ignore files | Biome docs, confirmed |
| `pnpm/action-setup` reads the version from `packageManager` when `version` is omitted | action README, confirmed |
| Whether `turbo run build` fires pnpm pre-scripts | Unverified. Phase 5 probes it empirically and has a contingency |

## Preconditions

1. Clean the worktree first: land or stash the bazaar4 wip, pick the branch. Execution halts while `git status --porcelain` is non-empty.
2. No new branch without an explicit ask.
3. Baseline must be green first: `pnpm install && pnpm test`.

## Phase 0: fixture fix (own commit, before the move)

1. `mkdir -p lib/geo/fixtures && cp content/geo/challenges/2026-07-27.json lib/geo/fixtures/run-variants-challenge.json` (the file exists on disk today; regenerate via the geo generator if missing).
2. In `lib/geo/run-variants.test.ts` replace `new URL('../../content/geo/challenges/2026-07-27.json', import.meta.url)` with `new URL('./fixtures/run-variants-challenge.json', import.meta.url)`.
3. Verify `pnpm geo:test` green and the fixture is tracked. Commit: `fix: commit the meridian run-variants fixture`.

## Phase 1: the move

`git mv` on a directory carries its gitignored contents along on disk. Only root-level untracked items need plain `mv`.

```bash
mkdir -p apps/web
git mv app components content data internals lib messages public scripts service apps/web/
git mv next.config.ts tsconfig.json next-env.d.ts postcss.config.js \
       mdx-components.tsx biome.json .lintstagedrc.mjs package.json apps/web/
git mv .gitignore apps/web/.gitignore
mv tmp work output BAZAAR3_TAKEOVER apps/web/            # untracked scratch; work/raw-data feeds import scripts
mv scene-*.png street-ref.png street-master-ref.png cf.jar sub-blocked.bin apps/web/ 2>/dev/null
mv .env .env.local apps/web/                             # Next auto-loads .env* only from the project dir
rm -rf .next node_modules tsconfig.tsbuildinfo
```

Stays at root: `.husky/`, `.github/`, `.tool-versions`, `.npmrc`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `README.md`, `CREDITS.txt`, `.vercel/` (untracked).

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
    "turbo": "<latest at install time>"
  }
}
```

husky and lint-staged live at root: hooks are repo-scoped and `prepare` must run where `.git` lives. Root `test` fans out through turbo, so `.husky/pre-push` (`pnpm test`) needs zero edits. `.husky/pre-commit` (`pnpm exec lint-staged`) also survives: lint-staged resolves the config that moved to `apps/web/.lintstagedrc.mjs` per file.

`pnpm-workspace.yaml` (edit in place, add the first two keys):

```yaml
packages:
  - apps/*

saveExact: true

allowBuilds:
  esbuild: true
  sharp: true
overrides:
  postcss: '>=8.5.10'
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
    "geo:test": {},
    "geo:generate": { "cache": false },
    "geo:validate:challenges": { "cache": false }
  }
}
```

`build` is permanently uncacheable. `prebuild` writes gitignored, date-dependent `content/geo/challenges/` JSONs and the config writes `static-files.json` at eval time. Both are invisible to input hashing, so any cache hit would restore a stale `.next` and skip generation. Cache-off removes the class. Turbo hashes tracked files via git object ids, so the 1.2 GB `public/` costs little for the cacheable tasks.

`.gitignore` (new, root):

```
node_modules
.DS_Store
.env*
.vercel
.turbo
*.tsbuildinfo
```

`apps/web/.gitignore` (the moved file): delete the lines now covered at root (`node_modules`, `.DS_Store`, `.vercel`, `.env`, `.env.local`, `.env*`, `*.tsbuildinfo`). Keep everything else byte-identical. The ~20 leading-slash patterns now anchor to `apps/web/` for free, because nested gitignores anchor at their own directory.

## Phase 3: app config edits (inside apps/web)

1. `package.json`: rename to `"name": "web"`, add `"private": true`, keep `engines` (Vercel reads Node version here). Delete `packageManager`, `prepare`, and the husky + lint-staged devDeps. Split the test chain: `test` keeps the `node --test <13 files> && tsx --test app/travel/radio-stations.test.ts` part, new `"typecheck": "tsc"`, and `lint` already exists as `biome check .`. All other scripts stay verbatim.
2. `next.config.ts`: add `import { join } from 'node:path'` and `outputFileTracingRoot: join(__dirname, '../..')` as the first config key. The `./content/...` tracing globs stay unchanged. The `writeFileSync('./service/io/static-files.json', ...)` stays cwd-relative and correct (build cwd is always `apps/web`). Never run `next build` bare from the repo root.
3. `biome.json`: add `"root": "../../"` to the `vcs` block. `$schema` and the `files.includes` negations stay (their targets moved with the config).
4. `service/markdown/Footer/index.tsx:12`: GitHub blob URL gains the `apps/web/` segment: `.../blob/master/apps/web/content/papers/...`.
5. Unchanged, with reasons: `tsconfig.json` (baseUrl, include, exclude are app-dir-relative), `.lintstagedrc.mjs` (its `./internals/*.mts` imports moved with it, absolute staged paths still substring-match `content/papers`), `.husky/*`, `postcss.config.js`, `mdx-components.tsx`, `next-env.d.ts`.

## Phase 4: CI workflow

`.github/workflows/meridian-daily.yml`, four deltas, everything else byte-identical including the empty-commit deploy trigger:

1. `pnpm/action-setup@v4` drops `version: 11.13.0` (reads `packageManager`).
2. `pnpm geo:test` → `pnpm --filter web geo:test`
3. `pnpm build` → `pnpm --filter web build`
4. `pnpm geo:validate:challenges` → `pnpm --filter web geo:validate:challenges`

Plain pnpm, not turbo, so the daily build can never be cache-skipped. `--filter` sets cwd to `apps/web`, so `generate-window.mjs`'s relative child argv keeps working.

## Phase 5: local verification

```bash
pnpm install                                   # lockfile importers "." -> "apps/web"; commit it
pnpm exec turbo run lint typecheck test geo:test
pnpm --filter web build                        # prebuild generates 14 JSONs, then next build
pnpm build                                     # probe: turbo path MUST also print generate-window output
pnpm --filter web dev                          # predev fires; smoke: / /papers/<slug> /crosswords /meridian /console /w98
```

Checks: `apps/web/service/io/static-files.json` has a fresh mtime. `git status --porcelain` shows zero scratch artifacts (tmp, output, BAZAAR3_TAKEOVER, challenges, puzzles, bazaar3 byproducts, scene-*.png). `git check-ignore -v apps/web/tmp apps/web/content/geo/challenges` names `apps/web/.gitignore`. Pre-commit fires reading/resize on a staged MDX or image. Pre-push runs the turbo chain.

Contingency if the `pnpm build` probe shows turbo skipping `prebuild`: inline the pre-steps (`"build": "node scripts/geo/generate-window.mjs && next build"`, `"dev": "pnpm geo:generate && next dev"`) and delete the `pre*` entries. Vercel and CI semantics are unaffected either way.

Commit: `refactor: move the app into apps/web behind a turborepo workspace`.

## Phase 6: Vercel validation and cutover (dashboard steps are manual)

Pre-flip validation on a throwaway project, so production never sees an experiment:

1. Push the migration branch. Import the repo as a NEW Vercel project, Root Directory `apps/web`, framework Next.js, no command overrides. Deploy the branch.
2. Build logs must show: workspace install at repo root, pnpm version honored from `packageManager`, `Running "pnpm run build"` followed by 14 generate-challenge lines, no 250 MB function-size errors, and no injected `turbo run build` / `turbo-ignore` commands.
3. Tracing proof: `vercel link` to the throwaway, `vercel pull && vercel build`, then `find .vercel/output/functions -path '*apps/web/content/papers*' | head` and the geo equivalent. Content must sit under `apps/web/content/...` inside each `.func`.
4. Smoke the throwaway URL: `/`, `/papers/<slug>`, `/crosswords`, `/meridian`, `/console`, `/w98`, `/rss.xml`. A non-empty `/papers` listing proves the `'use cache'` fs reads resolve in the deployed function.

Cutover on project `sospedra-me`:

5. Dashboard: Root Directory → `apps/web`. Keep "Include source files outside of the Root Directory" enabled. Disable the "Skip deployment" toggle (kills auto skip-unaffected, which would swallow the daily empty commit). Confirm no Build/Install command overrides appeared.
6. Immediately merge the migration branch into `master` and push. Watch the deploy, then smoke the same routes in prod.
7. `workflow_dispatch` the meridian workflow: green run, empty commit lands, Vercel builds it (not "Skipped").
8. Cleanup: delete the throwaway project, `vercel link` back to `sospedra-me`, `vercel pull`. Future env pulls: `vercel env pull apps/web/.env.local`.

Rollback: revert Root Directory to empty and revert the merge commit. Production serving is always the last good deployment, so nothing user-facing breaks in between.

## Critical files

- `next.config.ts` → `apps/web/next.config.ts` (the `outputFileTracingRoot` addition is the tracing-risk fix)
- `package.json` → new root manifest + `apps/web/package.json` rewrite
- `pnpm-workspace.yaml` (gains `packages`, becomes a real workspace)
- `.gitignore` → minimal root file + re-anchored `apps/web/.gitignore` (guards 2 GB of scratch)
- `.github/workflows/meridian-daily.yml` (`--filter web`, version-less pnpm setup)
- `turbo.json` (new)
- `lib/geo/run-variants.test.ts` + new fixture

## Out of scope, listed as follow-ups

1. Wire the 3 orphaned test files (`app/boombox/engine.test.ts`, `components/music/bundled-playlist.test.ts`, `components/music/default-playlist.test.ts`) into the test script.
2. Hoist the cross-route imports (`app/bazaar{2,3,4} → ../bazaar/sounds`, `app/w98 → ../games/catalogue`) into `service/`.
3. `service/io/static-files.json` is tracked yet rewritten by every build. Candidate for gitignoring plus generation-on-build.
4. In-flight branches (`codex/midnight-io-design-system`): merge `master` in with `git config merge.renameLimit 15000`, never rebase across the move. Untracked wip files need manual `mv` into their `apps/web/` mirrors.
