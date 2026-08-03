# Daily crossword

One crossword per UTC day, English and Spanish. No database, no runtime
content API, no cron.

## Content

`repo/crosswords/challenges/` holds one JSON per date, 1,618 files through
`2030-12-31`. English grids are 15×15, clues from the USA Today archive.
`repo/crosswords/sources.lock.json` records provenance.

Clue books are keyed by the answer word, not by number. The engine derives
numbering from the block layout. Two entries sharing an answer share a clue;
`scripts/crosswords/generate-replay.ts` rejects such puzzles upstream.

Spanish arrives at request time from the eldiario.es feed and merges into the
matching date. A failed fetch leaves that day English only.

## Loading

`crosswords.server-snapshot.ts` ships the last five editions up to render date
plus one day, under `cacheLife('hours')`. The cache expiry (1 day) must stay
at or below that horizon. The client picks by its own calendar.

The feed payload passes four gates before merging: ISO date, rectangular board
3 to 25 per side, grid alphabet only (A to Z plus Ñ, accents folded), every
playable word clued. One fetch attempt, 10 second timeout, origin header the
endpoint accepts.

## Local state

| key | holds |
|---|---|
| `crossword:v1:settings` | player settings |
| `crossword:v1:locale` | last chosen locale |
| `crossword:<version>:progress:<locale>:<date>` | one puzzle's board and timer |
