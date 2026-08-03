# RealPlayer radio data

`stations.json` is a curated, repository-owned snapshot. The `/w98` RealPlayer
window imports it at build time and never calls a station directory at
runtime.

## Curation rules

- HTTPS direct MP3 streams only. No HLS, no playlists, no tokens.
- Reject dead, redirecting, or HTML-answering endpoints. The 2022 corpus had
  24 entries; 5 were dead on retrieval day (Italodance Pilot, Sunshine 90er,
  Avtoradio, Disco Factory, 80s80s Christmas) and Mayak was dropped as talk
  radio.
- Editorial order: the nine Disco Paradise label channels first, then dance,
  then lounge closes the dial.
- `verification` stores the probe result that admitted the stream. Re-verify
  with `pnpm w98:radio:verify` before touching the corpus.

## Runtime behavior

The player uses one native `<audio preload="none">` element, created on the
first tune. No remote stream is routed through Web Audio; the equalizer
belongs to the Winamp window, not this one. A tune that produces no audio
within fifteen seconds tears the element down and reports a dead channel. A
failed channel never fails over to another one: the user picked it, the UI
says it is dead, the user picks again.
