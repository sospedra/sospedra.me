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
boombox/clips/<id>.mp3     44100 Hz, stereo, 128 kbps, 30 s, no tags
boombox/covers/<id>.jpg    600 x 600
```

Ids are opaque. The first 372 follow no rule; later ones use
`md5("<artist>|<title>")`. Replacing a song keeps its id, which holds its blob
path and rotation slot. The historical order came from a seeded shuffle, seed
`19850701`, recorded in the script.

## Anti-cheat

The game hides the answer from casual spoilers, not from devtools.
`songs.json` ships in the bundle, so a determined reader can compute the
day's song. The line it holds:

- Blob ids are opaque. The clip and cover URLs never name the song.
- Served clips carry no ID3 tags and no embedded art. `add` strips source
  metadata on cut, and only the 30 unlock seconds ever leave the store.
- Playback hard-stops at the unlocked second. A per-frame poll enforces it.
- Masked text is fake content. The sticker scribble and the LCD `····` put
  no real title, artist, year, or genre in the DOM before their gates. The
  tuner strip reads `signal encrypted` until the round ends.
- The cover renders blurred until the round ends. Its alt text stays empty.
- Saved state binds to its day. A state from another day drops on load.

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

`add <folder>` wants only mp3 files. It takes them in name order, reads the
metadata from the ID3 tags, and starts every clip at 0:00. The cover comes
from `<file basename>.jpg`, or from the art embedded in the mp3 when that
file is absent. A song with no artist, title, year, or cover fails by name.

An optional `<folder>/songs.tsv` overrides the tags: tab separated, header
row, columns `file start artist title album year genre cover`. Blank cells
keep the fallbacks. When the TSV exists, only its rows are processed.
`start` is seconds or `mm:ss` and must leave 30 seconds of audio. Run
`--dry-run` first: it writes previews and prints ids. `--replace` overwrites
a song matched on artist and title.
