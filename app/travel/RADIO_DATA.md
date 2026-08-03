# Travel radio data

`radio-stations.json` is a curated, repository-owned snapshot. The `/travel`
client imports it at build time and does not call a station directory at
runtime.

## Curation rules

- Group stations by stable destination code rather than display name.
- Keep three to five unique, direct HTTPS streams per destination.
- Order presets editorially. Preset one should be an important, locally
  representative station, with local-language programming preferred over a
  merely working genre stream.
- Prefer Radio Browser's `url_resolved` value, then verify the resulting stream
  independently with a GET request.
- Accept MP3, AAC, OGG, and valid HLS playlists.
- Reject HTML, authentication pages, geographic blocks, empty responses,
  duplicate streams, HTTP-only streams, and short-lived player tokens.
- Store station coordinates when the directory or station confirms them. If
  only the city is confirmed, a verified city coordinate already used by that
  destination may be shared; otherwise coordinates remain `null`.
- Never use Radio Garden's private API.

## Runtime behavior

The player uses one native `<audio preload="none">` element. Once the traveler
chooses to listen, that intent survives a city change: local receiver static
plays while the next city's first preset connects, then fades when playback
starts. If a chosen stream fails or cannot start within twelve seconds, the
player tries the next verified preset once and stops after one pass through the
city's stations.

HLS is used only when the browser reports native support. No remote stream is
routed through Web Audio, because doing so would require station-specific CORS
headers and would add work to the globe's render loop.

The scope trace represents confirmed internet transport bitrate, not an RF
carrier wavelength. A truthful carrier wavelength would require separately
verified terrestrial AM/FM frequency metadata.

## Coverage limitations

Kyoto, Hiroshima, and Takayama currently use verified Japan-oriented internet
stations rather than city-local broadcasters. Their local official streams
were access-blocked, tokenized, or unavailable as stable direct HTTPS audio at
the last check. Keep this limitation visible in maintenance work; do not relabel
the fallback stations as local.

## Maintenance

Run the offline corpus checks:

```sh
pnpm cli travel:radio:validate
```

Re-check every direct stream against the live network:

```sh
pnpm cli travel:radio:verify
```

Live verification is deliberately separate from `build`; remote network
failures must not make a static deployment nondeterministic.
