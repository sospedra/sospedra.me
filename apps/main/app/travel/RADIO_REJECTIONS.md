# Rejected travel radio streams

Final targeted check: 2026-07-27T18:23:33.000Z.

- Kyoto local Radio Mix Kyoto, FM Otokuni, and FM Tango: HTTP 403
  geographic/access block.
- Hiroshima and Takayama: no stable, direct, city-local HTTPS stream could be
  verified. Their Japan-oriented fallbacks remain explicitly nonlocal.
- Osaka BAN-BAN Radio: HTTP 403 geographic/access block.
- Takayama Hits FM: only a short-lived JCBA WebSocket token was available, not
  a direct audio URL.
- NHK regional HLS: HTTP 403 from the verification environment.
- Virgin Radio UK: geographic block outside the United Kingdom; replaced with
  Capital FM London, Heart London, and NTS Radio 1.
- Tokyo's Fred Film Radio and J1 Hits: not credible Tokyo-first choices. Fred
  did not provide Japanese-language programming, while J1's terrestrial service
  is based in Southern California.
- Radio Hamburg: connection failed; replaced with N-JOY.
- Hamburg Zwei: connection failed.
- NFRS Radio: duplicate of SOUND UP STATION NFRS; removed.
- Zanzibar's Radio Uhai, Nuru FM, and Mungu Kwanza Radio: streams worked, but
  locality could not be tied to Zanzibar. Replaced with verified Zanzibar
  stations Zenj FM, TAMU FM, and AM24 Radio.
- Amsterdam's generic dance preset, Barcelona's `_80 EXITOS`, Paris's generic
  reggae preset, Rome's generic romantic-music preset, Turin's generic dance
  preset, and Budapest's duplicate Klubrádió offshoot were removed in favor of
  more representative local, regional, or public-service stations.

Signed final CDN URLs were replaced by stable public Radio Browser
resolver/origin URLs. Verification followed those stable URLs to successful
audio responses.

Latitude and longitude remain `null` unless Radio Browser supplied station
coordinates. Destination coordinates remain separately defined in
`destinations.ts`.
