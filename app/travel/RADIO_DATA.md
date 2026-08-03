# Travel radio data

`radio-stations.json` is a curated, repository-owned snapshot. The client
imports it at build time and never calls a station directory at runtime.

## Curation

- Group stations by destination code. Three to five direct HTTPS streams each.
- Preset one is the locally representative station, local language preferred.
- Prefer Radio Browser's `url_resolved`, then verify the stream with a GET.
- Accept MP3, AAC, OGG, valid HLS. Reject HTML, auth pages, geo blocks,
  HTTP-only streams, short-lived tokens, duplicates.
- Coordinates only when the directory or station confirms them; else `null`.
- Never use Radio Garden's private API.

Kyoto, Hiroshima, and Takayama use verified Japan-oriented streams, not
city-local ones: their local streams were blocked or tokenized at last check
(`RADIO_REJECTIONS.md`). Never relabel the fallbacks as local.

## Runtime

One `<audio preload="none">` element. Listening intent survives a city change:
static plays while the next city's first preset connects. A stream that fails
or stays silent for twelve seconds yields to the next unattempted preset, one
pass per city. HLS only with native support. No Web Audio on remote streams
(CORS would gate every station).

## Maintenance

`pnpm cli travel:radio:validate` checks the corpus offline.
`pnpm cli travel:radio:verify` probes every stream live. Deliberately separate
from `build`: network failures must not break deployments.
