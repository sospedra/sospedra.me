# Bilingual Daily Crossword — Content and Publication Specification

**Revision 4, 2026-07-29.** Spanish is live. The daily `es` puzzle streams
from the eldiario.es feed (`backend.smartgames.media/api/game/crossword/last`,
PuzTrip, 13×13, clued). `app/crosswords/eldiario.ts` fetches inside the same
ISR window as the challenge loader, validates the payload (rectangular board,
A–Z/Ñ alphabet, full clue coverage), and merges it into the shipped edition
whose `publicationDate` matches the feed's. No committed `es` content and no
cron: a failed or mismatched fetch degrades that date to English-only and the
locale toggle hides itself. The generator sections below stay retired.

**Revision 3, 2026-07-29.** The daily is now a replay of the USA Today
crossword archive (8,867 puzzles, 1995–2026, all 15×15, Universal Uclick
copyright; provenance in `data/crosswords/`). Edition files carry the render
minimum: publication date, solution, clues. `scripts/crosswords/generate-replay.ts`
maps each site date to an archive puzzle of the same weekday, newest first:
`pool[floor(daysSince(2026-07-29) / 7) % pool.length]`. Weekday pools run
570–1,536 deep, so no repeat inside eleven years. Definition clues returned
with the archive. Sections 4–7 (corpus, patterns, generator, clue authoring)
describe the deterministic 13×13 generator; that path is retired from the
daily and kept as a future practice mode. Publication dropped the cron:
the challenge loader revalidates itself (`cacheLife('hours')`, ISR) and the
committed content through 2030 ships inside the function bundle via
`outputFileTracingIncludes`. Correctness invariant: cache expire (1 day)
never exceeds the loader's publication horizon (+1 day). Archive routes and
stats sections still apply.

**Revision 2, 2026-07-29.** The game dropped definition clues by design
decision, superseded by revision 3: archive clues ship as-is.

**Status:** Replay content and ISR rollover shipped
**Grid:** 15×15, American convention, from the archive
**Locales:** English (`en`) from the committed archive; Spanish (`es`) merged at runtime from the eldiario.es feed
**Cadence:** One shared publication date per UTC calendar day
**Batch horizon:** through 2030-12-31, generated and committed ahead
**Publication:** ISR. The page revalidates hourly and expires daily; no cron, no deploy hook.
**Sibling spec:** the geography challenge spec. This document fills the crossword pipeline that spec assumed.

---

## 1. Executive summary

The crossword game shipped as UI without a content system. One hand-authored 15×15 puzzle pair lives inside `app/crosswords/crossword-data.ts`. This spec adds the missing half: a versioned word corpus, a deterministic 13×13 generator, validation gates, a one-year approved batch under `content/crosswords/challenges/`, and a daily static publication path shared with the geography game.

The play experience, engine, and visual design are done and out of scope. The engine already supports any grid size present in puzzle data. This spec covers everything from word list to deployed daily.

## 2. Goals

### Player goals

1. A fresh 13×13 crossword every day in both languages.
2. The archive stays playable at dated routes.
3. Streaks and personal statistics survive locally.
4. A share result that reveals no answers.

### Engineering goals

1. No production database and no runtime content API.
2. Deterministic generation: same inputs, byte-equal output.
3. Every third-party word source has recorded provenance and license.
4. The daily publish is atomic. A broken content day keeps yesterday's deploy alive.
5. One shared publication clock with the geo game: UTC.

### Non-goals for v1

- Themed puzzles, rebus squares, circled letters.
- Cross-language identical grids. EN and ES are separate fills on the same cadence.
- Server-verified completion or leaderboards.
- Editor UI for constructors.

## 3. Puzzle format rules

| Rule | Value |
|---|---:|
| Grid | 13×13 |
| Symmetry | 180° rotational |
| Black squares | ≤ 42 |
| Minimum word length | 3 |
| Word count | 56–74 per grid |
| Checked cells | every white cell crossed both ways |
| Connectivity | single white region |
| Letters | A–Z plus Ñ in `es` |

Accents never appear in the grid. Display forms keep them. The engine's `normalizeLetter` already implements this contract: `á` enters as `A`, `ñ` stays `Ñ`.

Difficulty in revision 2 is a single tier. A future difficulty axis can bias the fill toward rarer words on weekends.

## 4. Corpus

### 4.1 Sources

| Source | Use | License | Notes |
|---|---|---|---|
| wordfreq | frequency scores, EN + ES | MIT | pins scoring |
| WordNet | EN lemma pool + glosses | WordNet license | permissive |
| Wiktionary dumps | ES lemma pool, EN supplement | CC BY-SA | word lists only |
| Curated additions | proper nouns, crosswordese allowlist | ours | editorial file |

Published crossword collections (the xd corpus, NYT archives) are excluded. They index copyrighted works. They may inform nothing that ships.

Every source lands in `data/crosswords/sources.lock.json` with version, URL, license, and SHA-256. `THIRD_PARTY_DATA.md` discloses the set.

### 4.2 Corpus build

`scripts/crosswords/build-corpus.ts` produces `data/crosswords/generated/corpus-{en,es}.json`:

```ts
interface CorpusWord {
  grid: string        // "AREA", "ANO" (grid form, accentless, Ñ kept)
  display: string     // "área", "año"
  length: number
  score: number       // 0–100, frequency-weighted, editorially adjustable
  tags: string[]      // "proper", "plural", "abbr", "crosswordese"
  banned: boolean
}
```

Editorial files under `data/crosswords/editorial/`:

- `additions-{en,es}.yml`: words the free lists miss.
- `banned.yml`: slurs, brand minefields, sad-list entries. Banned words never fill.
- `score-overrides.yml`: push crosswordese down, push lively words up.

Corpus revision string: `crossword-corpus-YYYY-MM-DD.N`. It enters every seed.

### 4.3 Size floor

The filler needs density. Validation fails the corpus when either language has fewer than 30,000 usable entries of length 3–13, or when any length bucket from 3 to 9 holds fewer than 800 words.

## 5. Grid patterns

A curated library, not a pattern generator. `data/crosswords/editorial/patterns/13/*.json` holds 48 approved block layouts meeting section 3. `patternSetVersion` names the library revision.

The generator picks the pattern from the seed. The same pattern may not repeat within 14 days. EN and ES use different patterns on the same day.

## 6. Filler

`scripts/crosswords/fill-grid.ts`. Backtracking over slots ordered by most-constrained-first. Candidates ranked by word score with a seeded tie-break. Deterministic under seed. Budgeted: a fill that exceeds the node budget fails loudly with the slot trace. The batch runner then retries with the next seed branch, exactly the geo generator's retry discipline.

Fill acceptance:

- Mean word score ≥ 55, no word below 20.
- At most 4 words tagged `crosswordese` per puzzle.
- No duplicate answers inside a puzzle.
- No answer repeated within the previous 60 published days, per language.

## 7. Hints (revision 2: no clues)

There are no written clues. The player deduces common words from crossings.

- Standard assist: nothing. The word list shows number chips and a live
  letter mask of the player's own progress.
- Guided assist: the word's first letter, derived from `gridAnswer[0]` at
  render time. Zero authored content, zero generation cost.

The word lists remain as navigation: number chip, progress mask, solved
strike. Screen readers hear number, direction, and the first-letter hint
when guided.

### 7.3 Review

`scripts/crosswords/render-review.ts` emits one HTML contact sheet per batch: every grid and fill, flagged items first. A human approves batches, not days. Approval writes `content/crosswords/generation-approval.json` with the trio: `corpusRevision`, `generatorVersion`, `rulesVersion`, plus `approvedThrough: "YYYY-MM-DD"`.

## 8. Data model

One file per date, both locales, atomic edition:

```ts
// content/crosswords/challenges/2026-08-01.json
interface CrosswordEditionFile {
  schemaVersion: 2
  id: string                    // "crossword:2026-08-01"
  publicationDate: string       // UTC calendar date
  generatorVersion: string
  corpusRevision: string
  patternSetVersion: string
  rulesVersion: string
  seed: string
  puzzles: Record<'en' | 'es', {
    title: string
    storyDeck: string
    difficultyTier: 1 | 2 | 3
    pattern: string             // pattern id
    width: 13
    height: 13
    solution: string[]          // 13 rows, '#' for blocks
  }>
}
```

The runtime `CrosswordPuzzle` shape stays as is. A loader builds it from the edition file through the existing `buildPuzzle`. The seed follows the house idiom:

```
sha256(`crossword:${date}:${generatorVersion}:${corpusRevision}:${patternSetVersion}:${rulesVersion}`)
```

## 9. Repository structure

```text
content/crosswords/
  challenges/2026-08-01.json …
  generation-approval.json
data/crosswords/
  editorial/{additions-en,additions-es,banned,score-overrides}.yml
  editorial/patterns/13/*.json
  generated/corpus-{en,es}.json
  sources.lock.json
  THIRD_PARTY_DATA.md
scripts/crosswords/
  import-sources.ts       // network, manual, explicit
  build-corpus.ts
  fill-grid.ts
  generate-batch.ts
  validate-corpus.ts
  validate-challenges.ts
  render-review.ts
app/crosswords/           // game, unchanged except the loader
work/raw-data/            // gitignored
```

Package scripts:

```json
{
  "crosswords:corpus": "tsx scripts/crosswords/build-corpus.ts",
  "crosswords:generate": "tsx scripts/crosswords/generate-batch.ts",
  "crosswords:validate": "tsx scripts/crosswords/validate-corpus.ts && tsx scripts/crosswords/validate-challenges.ts",
  "crosswords:review": "tsx scripts/crosswords/render-review.ts"
}
```

## 10. Validation gates

`crosswords:validate` fails when any published or pending edition violates:

1. JSON schema and stable key order.
2. Grid rules from section 3, checked geometrically.
3. Every answer exists in the corpus revision named by the file.
4. Fill acceptance thresholds from section 6.
5. No clue payload present (revision 2).
6. Both locales present and complete.
7. Date continuity: no calendar gaps from the first edition through `approvedThrough`.
8. History constraints across files: answer repeats, pattern repeats, pair repeats.
9. `approvedThrough` covers today plus 7 days. Below 30 days emits a warning.

## 11. Publication

### 11.1 Mechanism

```text
Vercel cron (00:05 UTC)
      → GET /api/cron/republish   (CRON_SECRET guarded)
      → POST $CROSSWORD_DEPLOY_HOOK_URL
      → Vercel build from main
      → prebuild: geo gates + crosswords:validate
      → next build (today resolved in UTC at build time)
      → atomic deploy
```

Configured in `vercel.ts` crons plus one route handler. The deploy hook is created once in project settings and stored as an environment variable. A validation failure fails the build and the previous deployment stays live. This finally implements the geo spec's rule 12.4 for both games with one cron.

### 11.2 Date resolution

The undated `/crosswords` route resolves the publication date at build time in UTC, sharing the geo `publication-date` convention. The current client-clock edition picker in `crosswords-view.tsx` is a stopgap and gets deleted in phase 5. Dated routes `/crosswords/[date]` render the archive through `generateStaticParams` and stay immutable.

### 11.3 Migration

The inline 2026-07-27 puzzle converts to `content/crosswords/challenges/2026-07-27.json`, schemaVersion 2, 15×15 grandfathered. The engine renders it unchanged. The 13×13 rule applies from the first generated edition. The batch starts at the first missing date and covers 365 days.

## 12. Streaks, statistics, share

- `crossword:v1:stats` in localStorage: per-date completion, solve time, checks and reveals used, current streak, best streak, personal bests keyed by `rulesVersion`.
- The streak counts consecutive UTC publication dates with a completed official solve. Archive replays never count.
- Share text: day number, solve time, clean-solve flags. Never answers, never letters.

```text
CROSSWORDS #187 · 13×13
EN 07:42 · clean
ES 09:15 · 2 checks
```

## 13. Testing

Added to `pnpm test`:

1. Engine reducer transitions, including START, CLEAR walking, undo bounds.
2. Filler determinism: fixed seed, byte-equal fill, across two runs.
3. Corpus validator fixtures: each gate fails on a crafted bad input.
4. Challenge validator fixtures: symmetry, connectivity, history repeats.
5. Publication date: UTC boundary cases.

One Playwright flow stays a goal, not a v1 gate: keyboard-only solve of a short archive puzzle.

## 14. Observability

The generate and validate commands report: date range, corpus revision, pattern usage histogram, mean word score per puzzle, flagged-for-review count, and total bytes per edition. The cron route logs trigger time and deploy hook response.

## 15. Acceptance criteria

1. `crosswords:corpus` rebuilds both corpora deterministically from pinned snapshots.
2. `crosswords:generate --from <date> --days 365` produces a gapless, validated year.
3. Every edition passes all section 10 gates.
4. A reviewed batch is committed and `approvedThrough` covers one year.
5. The cron publishes daily and a sabotaged edition fails the build without downtime.
6. `/crosswords` serves today's edition in both languages with no client date logic.
7. Dated archive routes render and are excluded from streaks.
8. Streaks, stats, and share render from local storage.
9. All new tests run in `pnpm test`.
10. Every word source is recorded in `sources.lock.json` with license.

## 16. Phases

| Phase | Scope | Size |
|---|---|---|
| 1 | Corpus importers, normalization, provenance, size floor | 1–2 days |
| 2 | Pattern library, filler, determinism tests | 2–4 days |
| 3 | Review sheet | half a day |
| 4 | Year batch, human review, commit, approval file | generation cheap, review real |
| 5 | Loader, build-time date, archive routes, migration, cron | 1 day |
| 6 | Streaks, stats, share card | 1 day |
| 7 | Test suite completion, observability polish | ongoing |

Phase 2 is the risk. The filler is the hard kernel. Everything else is plumbing this repo has built twice already.

## 17. Future extensions

- Themed Sundays with a larger grid.
- Constructor mode: hand-author an edition and inject it into the batch.
- Optional clued Sunday special, authored by hand.
- A second daily variant: 5×5 mini.
