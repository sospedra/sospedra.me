# Daily crossword

One crossword per UTC calendar day, in English and Spanish. No database, no
runtime content API, no cron.

## Content

English editions ship with the repository. `content/crosswords/challenges/`
holds one JSON file per date, 1,617 files, `2026-07-29` through `2030-12-31`.
Each grid is 15×15 in the American convention. The clues come from the USA
Today crossword archive. `data/crosswords/sources.lock.json` and `CREDITS.txt`
record the provenance and the license.

Spanish arrives at request time. `spanish-daily.ts` fetches one puzzle from
the feed and merges it into the edition whose `publicationDate` matches. A
failed fetch leaves that date English only, and the locale toggle hides itself.

`crossword-data.ts` also carries one hand-authored edition dated `2026-07-27`.
The view prepends it to the loaded list.

## Edition file

```jsonc
{
  "publicationDate": "2026-08-03",
  "puzzles": {
    "en": {
      "solution": ["ARF##SPOT#TARPS", "..."],
      "clues": {
        "across": { "ARF": "\"Woof\"" },
        "down": { "APART": "In pieces" }
      }
    }
  }
}
```

`solution` is one string per row. `#` marks a block. Clue books are keyed by
the answer word, not by number. The engine derives numbering from the block
layout.

## Grid alphabet

Grids hold A to Z plus Ñ. Accents never enter the grid. `normalizeLetter`
folds them at parse time, so `á` becomes `A` and `ñ` stays `Ñ`. Display forms
keep their accents.

## Loading

`page.tsx` reads the challenge directory under `'use cache'` with
`cacheLife('hours')`. It ships the last five editions up to the render date
plus one day, so the newest published edition is always tomorrow's. The client
then picks by its own calendar. Correctness needs the cache expiry (1 day) to
stay at or below that horizon (+1 day).

The committed editions reach the function bundle through
`outputFileTracingIncludes` in `next.config.ts`.

## Spanish feed

`spanish-daily.ts` validates every payload before it merges:

1. `publicationDate` matches `YYYY-MM-DD`.
2. The board is rectangular, 3 to 25 rows and columns.
3. Every character is a block or a grid letter.
4. Every playable word of 2 letters or more carries a clue.

A payload that fails any check returns `null`. The fetch carries a 10 second
timeout. The API gates on the caller's origin, so the request sends the origin
header the endpoint accepts.

## Local state

Three localStorage keys, all written by `crosswords-view.tsx`:

| key | holds |
|---|---|
| `crossword:v1:settings` | player settings |
| `crossword:v1:locale` | last chosen locale |
| `crossword:v2:progress:{locale}:{date}` | one puzzle's board and timer |

`serializeCrosswordState` writes the progress value. `restoreCrosswordState`
reads it back and drops it when the puzzle id does not match.

## Share

`shareCard` builds a spoiler-free card: brand line, an emoji grid of solved
state, elapsed time, and the site URL. No letters and no answers.

```text
CROSSWORDS 2026-08-03 🗞️
🟩🟩⬛🟩...
⏱️ 07:42 · sospedra.me/crosswords
```

`shareText` sends it. The clipboard is the fallback.

## Tests

Both run inside `pnpm test`:

- `crossword-engine.test.ts` covers reducer transitions, serialization, and
  the share card.
- `spanish-daily.test.ts` covers payload validation and the merge, against a
  3×3 fixture.

## Files

```text
app/crosswords/
  page.tsx             loads editions, merges the Spanish daily
  crosswords-view.tsx  the game UI and all local state
  crossword-engine.ts  reducer, timer, serialization, share card
  crossword-data.ts    types, puzzle builder, the 2026-07-27 edition
  spanish-daily.ts     Spanish feed fetch, validation, merge
content/crosswords/challenges/*.json
data/crosswords/sources.lock.json
scripts/crosswords/generate-replay.ts
```
