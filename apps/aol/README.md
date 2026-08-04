# aol

Browser-to-browser text mesh. PoC of the peer mesh spec v0.2.

No server sits in the message path. Nostr relays carry signed SDP for first contact. STUN reports the reflexive address. Everything after first contact is peer traffic over WebRTC data channels.

## Run

```
pnpm --filter aol dev
```

Open the printed URL. The app creates a room and writes `#r=<roomId>&s=<topicSecret>` into the hash. Open the full link in a second browser or device. The peers meet on public relays and link direct. Type in either window.

The fragment never reaches a server. The topic is `SHA256(appId || roomId || topicSecret)`, so relays see only a hash.

## Test

```
pnpm --filter aol test
```

72 node tests cover the pure core: frame codec, router pipeline, sequence windows, rate limits, seal padding, offer verification, NIP-01 events.

## Deploy

Vercel project settings: root directory `apps/aol`, framework Vite. Build is `vite build`, output `dist`. No environment variables. The app is a static bundle.

## Spec coverage

| Spec section | State |
|---|---|
| 4 constants | Full table in `src/mesh/constants.ts` |
| 6.2 gossip loop | `src/mesh/router.ts`, receiver-side order: sig, ejected, seq, hop, rate |
| 7.1 PRF identity | `create passkey` button. WebAuthn PRF, 32 byte seed |
| 7.2 fallback | Ed25519 seed in IndexedDB, tier `STORED`, default |
| 7.4 multi-tab | Web Locks election per room. Standby tabs park and take over on owner close |
| 8 rendezvous | Signed offer envelopes on an ephemeral kind (21313), 5 relays, 8.4 checks |
| 9 connection | STUN only, no TURN, vanilla ICE with a gathering timeout |
| 11 membership | Active 8, passive 40, view gossip, leave gift, heartbeat death after 3 misses |
| 12 frames | Binary codec, sig excludes hop, per-source windows, 4 rate layers |
| 13.4 padding | XChaCha20-Poly1305, payloads land exactly on 256/1024/4096/16384 |
| 16.1 open room | Lone peer keeps a pool of 2 fresh offers and republishes on staleness |
| 18 content | Chat renders through `textContent`. No markup, no images |

## Deferred

| Spec section | Gap | Seam |
|---|---|---|
| 13.1 MLS | Group key is `HKDF(topicSecret)`, static per room | `deriveGroupKey` in `src/mesh/seal.ts` |
| 13.3 whispers | No pairwise sessions | `dst` routing already works |
| 14 invites | Join is by room link, not single-use invite | `inviteTopic` exists in `src/mesh/topics.ts` |
| 15 moderation | No votes. `ejected` set and router check exist and stay empty | `Room.ejected` |
| 10 peer relay | Failed ICE pairs stay unlinked | frame format carries `dst` and `hop` |

## Deviations from the letter

1. View gossip sends active plus passive ids. A strict passive-only exchange never seeds a fresh mesh.
2. A forwarder does not emit frames at `hop >= HOP_CAP`. Receivers still enforce the drop rule alone.
3. Gossip duplicates drop without penalty. Flood redundancy is the design, so a dup is not evidence.
4. Malformed, bad-sig, and hop drops penalize the delivering link. Seq and rate drops penalize the signing source.
5. `seq` seeds from clock seconds and receiver windows expire after 10 idle minutes, so a reload does not mute the sender.
6. Answer envelopes carry `re` = the offer `ephPub` outside the signature. A tampered `re` only misroutes one ICE attempt.

## Next

Implementation order from spec section 23, remaining: MLS via `ts-mls` (blocks 13, 14, 15), then invites, then vote records.
