# The Olympics Score

A fair score for the Tokyo 2020 Olympic Games. The official ranking sorts by gold medals first. This app computes one score instead: gold earns 3 points, silver 2, bronze 1. A World Record adds 3 extra points and an Olympic Record adds 2.

This is a port of [sospedra/olympics](https://github.com/sospedra/olympics) into the monorepo. The original ran on Next.js 11, React 17 and Tailwind 2. This port runs on Next.js 16, React 19 and Tailwind 4 with the shared `@repo/*` configs.

## Data

The original scraped `olympics.com/tokyo-2020` inside `getStaticProps` and stopped revalidation after 2021-08-08. That subsite is offline now. The dataset is final, so the app reads a committed snapshot from `data/`.

`scripts/recover-data.mts` rebuilt the snapshot from Wayback Machine captures of the same pages the original scraped. The medal standings come from the capture at `2021-08-31T23:31:45Z`. The records pages keep the original filter: only new records of type WR or OR count. Canoe sprint and rowing publish WB and OB types, so they contribute zero records, same as the original.

- `data/medals.json`: 93 NOCs with medals and the official rank.
- `data/records.json`: 79 new records (17 WR, 62 OR).
- `data/meta.json`: the snapshot timestamp shown on the page.

## Commands

```bash
pnpm dev        # start the dev server
pnpm build      # production build
pnpm test       # node --test unit and snapshot tests
pnpm lint       # biome check
pnpm typecheck  # tsc
```
