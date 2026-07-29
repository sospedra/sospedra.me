# Third-party data: crosswords

## USA Today crossword archive

Daily editions replay puzzles from the USA Today crossword archive (1995–2026, xd format via [xd.saul.pw](https://xd.saul.pw/data)), copyright Universal Uclick / USA Today.

- Used for: the daily puzzle itself. `scripts/crosswords/generate-replay.ts` maps each site date to an archive puzzle of the same weekday, newest first.
- Edition files carry render data only (solution and clues). Attribution and rights live here and in `sources.lock.json`; the replay formula in the generator recovers each edition's original archive date.
- The raw xd archive stays out of git and out of the working tree; re-download from the URL above before regenerating. Served editions live in `content/crosswords/challenges/`.

## spread the word(list)

The English fill corpus derives from [spread the word(list)](https://www.spreadthewordlist.com/), maintained by Brooke Husic and collaborators, licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

- Used for: candidate answers and their quality scores in `data/crosswords/generated/corpus-en.json`.
- Modifications: filtered to 3–13 letter A–Z entries scoring 50 or higher, minus a small banned list.
- The derived corpus file inherits CC BY-NC-SA 4.0. This site is non-commercial and credits the list here.
- Puzzles constructed with the list are the site's own per the list's stated terms.

Exact retrieval details and checksum: `data/crosswords/sources.lock.json`.

## NYT crossword clue archive

Clue texts in generated editions come from the New York Times crossword archive (1993–2021), used under a content license held by the site owner. Usage counts derived from the archive score the corpus in `data/crosswords/generated/nyt-usage.json`. The raw archive and the full clue lookup remain outside the repository; retrieval details and checksum live in `sources.lock.json`.
