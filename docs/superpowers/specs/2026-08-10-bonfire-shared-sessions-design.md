# Bonfire shared sessions, design

Date: 2026-08-10. Status: implemented 2026-08-10.

## Goal

One person hosts a bonfire session. Friends open a link and share the same timer and the same music. The transport reuses the irc Nostr stack.

## Decisions from the brainstorm

1. Control: host only. The creator commands, joiners follow.
2. Presence: self-declared nicks, rendered near the fire.
3. Transport: Nostr relays as the data path. No WebRTC.
4. Audio: sync control state, never audio bytes. Each member plays its own SoundCloud stream.

## Why no audio streaming

The SoundCloud iframe is cross-origin, so `captureStream()` cannot read it. Tab capture demands a screen-share prompt. The ambience crackle is a local file on every client. Command sync makes streaming unnecessary. Check: SoundCloud HTML5 widget docs list `skip(index)`, `seekTo(ms)`, `getPosition(cb)`, `isPaused(cb)`.

## Session model

A session lives on top of a playlist page. The host presses a share control on `/[playlist]`. The app generates `sessionId` and `secret` and writes `#s=<sessionId>.<secret>` into the URL hash. The fragment never reaches a server. Anyone with the link is a member.

The host tab writes a host marker for the session into `sessionStorage`. A reload with the marker resumes hosting. A load without the marker joins as follower.

Followers have no transport controls. When the host dies, followers keep the last snapshot. The countdown runs to plan end from the epoch. The playlist keeps playing. After three missed keepalives the UI shows a keeper-left notice.

## Wire protocol, bonfire/v0

- Relays: the same five public relays as irc.
- Topic: `SHA256(appId || sessionId || secret)`. Relays see only the hash.
- Kind: 21315, ephemeral range, distinct from the irc offer kind 21313.
- Signing: an ephemeral per-tab keypair, NIP-01. The pubkey is the peer identity for presence.
- Seal: XChaCha20-Poly1305 under `HKDF(secret)`, padded to the 256-byte bucket. Copied from irc unchanged.

Payload types:

1. `state`. Host only. Sent on every command and every 10 s as keepalive. Fields: `{plan, planEpoch, trackIndex, positionMs, playing, positionEpoch, seq}`. `plan` is `'long' | 'short' | null`.
2. `presence`. Every peer, every 15 s. Fields: `{nick}`. A peer expires after three misses (45 s). A `presence` from a new peer triggers an immediate host `state` publish.
3. `bye`. Best effort on tab close.

Followers apply `state` only when `seq` increases. Stale and duplicate events drop. `seq` seeds from clock seconds, the irc precedent, so a host reload does not mute itself. Acceptance checks the seal and the seq, never the pubkey, so a host reload with a fresh keypair keeps commanding.

Trust: the seal authenticates the group, not the host. A malicious link holder can forge `state`. Accepted for v0. Same trust class as the irc static group key.

## Timer sync

The plan timeline is a pure function of `{plan, planEpoch}`. Members compute segment index and remaining time from `now - planEpoch`. `Countdown` gains an epoch prop and derives its display instead of free ticking. This also removes interval drift in solo mode. A joiner past plan end sees idle.

Clock skew shifts a follower by wall-clock error. NTP keeps consumer devices within about one second. Accepted for v0.

## Audio sync

The host publishes its widget state. It reads `getPosition()` fresh for each publish. Followers converge:

1. If `trackIndex` differs: `skip(trackIndex)`.
2. Compute target = `positionMs + (now - positionEpoch)` while playing, plain `positionMs` while paused.
3. If drift over 2 s: `seekTo(target)`.
4. Match `playing` with `play()` or `pause()`.

Autoplay policy requires one gesture per joiner. The join click is that gesture.

Known risk: geo-blocked tracks can differ per member, and track indexes could diverge. Accepted for v0.

## UI

Host: one share control in the player card area. Press once: a nick field and a copy-link button appear, and the session goes live.

Follower: a join panel replaces `Start` when the hash holds a session. One nick field, one sit-by-the-fire button. After the click: countdown in follower mode, player without play and pause buttons, song title read-only. A follower without a snapshot yet shows the idle fire.

Presence: a quiet row of nicks under the player card, one ember dot per peer. The ambience toggle stays local per member. Styling follows the current firelight pass.

## Code layout

1. `apps/bonfire/services/mesh/`: `seal.ts`, `topics.ts`, `nostr-event.ts`, `bytes.ts`, `nostr-pool.ts` copied from irc, frozen at irc/v0 semantics. Their irc tests come along. No shared package: irc moves to MLS next, and bonfire wants the frozen simple seal. Extraction is a later refactor when both consumers stabilize.
2. `apps/bonfire/services/session.ts`: pure protocol core. Payload types, encode and decode, seq acceptance, presence expiry math, timeline math (`elapsed → {segmentIndex, remaining}`).
3. `apps/bonfire/services/use-session.ts`: the one subscription point. A reducer folds relay events into `{role, peers, snapshot}`. Publish helpers for the host.
4. UI edits: `home.tsx` wiring, `timer.tsx` and `countdown.tsx` epoch derivation, `player.tsx` follower mode. New: `share.tsx`, `join.tsx`, `peers.tsx`.

## Testing

`node:test` on the pure core: seal round trip, topic derivation, payload codec, seq acceptance, presence expiry, timeline math. Manual two-browser session check, like irc. Bonfire has no e2e harness, and this change adds none.

## Failure modes

- All relays down: a "fire flickers alone" notice. Local behavior continues.
- Host silent 30 s or `bye`: keeper-left notice. Followers run to plan end.
- Garbage or unsealed events: the seal drops them.
- Duplicate or stale events: seq drops them.

## Non-goals for v0

No chat. No follower controls. No host migration. No MLS or rekey. No WebRTC. No session persistence beyond the `sessionStorage` resume.
