# Boombox

One song per day, guessed from a growing clip. No database, no runtime content
API, no cron. The index ships with the repository, the audio lives in a Vercel
Blob store.

## Rotation

`songs.json` holds 372 songs. `songForDay` picks `songs[day % length]`, so
**the index order is the rotation**. Appending is safe. Any reorder repoints
past days at other songs. Day 0 is `2026-07-28`; the tape flips at 02:00 on
Spain's wall clock.

Six guesses. Unlocked seconds per guess used: 1, 2, 4, 7, 11, 16. The full 30
unlock when the round ends. `scoreGuess` ladder: hit, artist, album, year,
decade, miss. Artist names split on `/`.

State lives in one localStorage key, `@@boombox/state-v1`, dropped when its
day is not today.

## Assets

```text
boombox/clips/<id>.mp3     44100 Hz, stereo, 128 kbps, 30 s
boombox/covers/<id>.jpg    600 x 600
```

Ids are opaque. The first 372 follow no rule; later ones use
`md5("<artist>|<title>")`. Replacing a song keeps its id, which holds its blob
path and rotation slot. The historical order came from a seeded shuffle, seed
`19850701`, recorded in the script.

## Changing the songs

`pnpm cli boombox:songs`.

| command | does |
|---|---|
| `add <folder>` | cuts clips, resizes covers, uploads, updates the index |
| `check` | lists the store, reports missing or orphan blobs |
| `remove <id>... --yes` | deletes blobs and index entries |
| `reshuffle --seed <n> --yes` | reorders the whole index |

`remove` and `reshuffle` print every played day that moves and refuse to write
without `--yes`.

`add` reads `<folder>/songs.tsv`: tab separated, header row, columns
`file start artist title album year genre cover`. Blank metadata falls back to
ID3 tags, blank cover to `<file basename>.jpg`. `start` is seconds or `mm:ss`
and must leave 30 seconds of audio. Run `--dry-run` first: it writes previews
and prints ids. `--replace` overwrites a song matched on artist and title.
