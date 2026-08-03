# Boombox

One song per day, guessed from a growing clip. No database, no runtime content
API, no cron. The index ships with the repository and the audio lives in a
Vercel Blob store.

## Rotation

`songs.json` holds 372 songs. `songForDay` picks `songs[day % songs.length]`,
so **the index order is the rotation**. Appending is safe. Any reorder repoints
past days at other songs.

`dayNumber` counts from day 0 on `2026-07-28`. The tape flips at 02:00 on
Spain's wall clock, whatever UTC offset that is, so everyone changes song at the
same instant. Day 372 lands on `2027-08-04` and the set starts over.

## Play

Six guesses. Each wrong guess or skip unlocks more audio:

| guesses used | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| seconds audible | 1 | 2 | 4 | 7 | 11 | 16 |

The full 30 seconds unlock once the round ends, won or lost. A skip spends a
guess.

`scoreGuess` returns the first match on this ladder:

1. `hit` when the id matches.
2. `artist` when any artist name is shared. Names split on `/`, so
   `Luis Fonsi/Daddy Yankee` matches either half.
3. `album` when the album string matches and is not empty.
4. `year` when the year matches.
5. `decade` when `floor(year / 10)` matches.
6. `miss` otherwise.

## Local state

One localStorage key, `@@boombox/state-v1`, written through `lib/storage.ts`.
It holds `{ day, guesses, stage }`. `loadState` drops the value when its `day`
does not match today, so a stale round never bleeds into a new one.

## Share

`shareCard` builds a spoiler-free card. No title, no artist.

```text
BOOMBOX #7 📼
📆👩‍🎤💿🟩⬜⬜
4/6 · sospedra.me/boombox
```

The number is `day + 1`. The row pads to six with `⬜`. A loss reads `X/6`.

| score | symbol |
|---|---|
| hit | 🟩 |
| artist | 👩‍🎤 |
| album | 💿 |
| year | 📆 |
| decade | 🔟 |
| miss | ❌ |
| skip | ⬛ |

## Audio

`use-clip-audio.ts` builds a Web Audio graph over one `HTMLAudioElement` and
exposes a five band equalizer at 60, 250, 1000, 4000 and 12000 Hz. The clip
element sets `preload = 'auto'`. `deck-sfx.ts` synthesizes the deck noises.

## Assets

Clips and covers live in the Vercel Blob store under the `boombox/` prefix. The
base URL sits in `boombox-view.tsx`.

```text
boombox/clips/<id>.mp3     mp3, 44100 Hz, stereo, 128 kbps, 30 s
boombox/covers/<id>.jpg    jpeg, 600 x 600
```

Ids are opaque. The first 372 came from the original source and follow no
derivable rule. Anything added later uses `md5("<artist>|<title>")`. Replacing
a song keeps its stored id, which holds its blob path and its rotation slot.

## Changing the songs

`scripts/boombox/songs.ts`, wired as `pnpm cli boombox:songs`.

| command | does |
|---|---|
| `add <folder>` | cuts clips, resizes covers, uploads, updates the index |
| `check` | lists the store and reports missing or orphan blobs |
| `remove <id>... --yes` | deletes the blobs and the index entries |
| `reshuffle --seed <n> --yes` | reorders the whole index |

`remove` and `reshuffle` print every played day that moves, then refuse to write
without `--yes`. `add` appends, so it never needs the flag.

`add` reads `<folder>/songs.tsv`. Tab separated, one header row, one row per
song:

```text
file	start	artist	title	album	year	genre	cover
01-song.mp3	1:05	Some Artist	Some Title	Some Album	1999	Pop	
02-song.mp3	0:48						sleeve.jpg
```

Row one spells everything out. Row two takes artist, title, album, year and
genre from the ID3 tags and names its cover explicitly.

`file` is a full length mp3 in the folder. `start` is the clip offset, in
seconds or `mm:ss`. Leave `artist`, `title`, `album`, `year` or `genre` blank to
take the ID3 tag. Leave `cover` blank to use `<file basename>.jpg`. The script
refuses a `start` that leaves less than 30 seconds of audio.

Run it with `--dry-run` first. That writes the cut clip and the cropped cover
into `<folder>/preview/` and uploads nothing, so you hear the start point before
committing to it. It also prints each id, which is how you find one for
`remove`.

`--replace` overwrites a song that already exists, matched on artist and title.
Without it, a collision fails.

The historical order came from a seeded shuffle of an alphabetical list with
seed `19850701`. The seed is recorded in the script.

## Tests

`engine.test.ts` runs inside `pnpm test`, 29 tests. It covers the day number and
the flip instant, the score ladder, the reducer, the unlock schedule, the search
query and the share card.

## Files

```text
app/boombox/
  page.tsx           metadata, renders the view
  boombox-view.tsx   the UI, local state, blob URLs
  engine.ts          rotation, scoring, reducer, unlocks, share card
  use-clip-audio.ts  Web Audio graph and the equalizer
  deck-sfx.ts        synthesized deck noises
  songs.json         the index, order is the rotation
scripts/boombox/songs.ts
```
