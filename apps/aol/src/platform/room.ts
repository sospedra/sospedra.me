import { fromHex, randomBytes, toHex } from '../mesh/bytes.ts'
import {
  ACTIVE_VIEW,
  APP_ID,
  BUFFERED_HIGH_WATER,
  DIAL_TIMEOUT_MS,
  FORWARD_BUDGET_BYTES_PER_SEC,
  HEARTBEAT_MISS,
  HEARTBEAT_MS,
  HOP_CAP,
  OFFER_COOLDOWN_MS,
  PASSIVE_VIEW,
  ROOM_CAP,
  SCORE_FLOOR,
  SEQ_EPOCH_SEC,
  VIEW_GOSSIP_MS,
} from '../mesh/constants.ts'
import { buildFrame, encodeFrame, type Frame, WILDCARD } from '../mesh/frame.ts'
import type { Identity } from '../mesh/keys.ts'
import {
  decodeMessage,
  encodeMessage,
  type MeshMessage,
} from '../mesh/messages.ts'
import { ByteBudget, PeerScores } from '../mesh/rate-limit.ts'
import { type DropRecord, Router } from '../mesh/router.ts'
import { deriveGroupKey, open, seal } from '../mesh/seal.ts'
import { roomTopic } from '../mesh/topics.ts'
import { sample, short } from '../util.ts'
import { NostrPool, type RelayState } from './nostr-pool.ts'
import {
  acceptAnswer,
  createAnswerPeer,
  createOfferPeer,
  PeerLink,
} from './peer-link.ts'
import { type AttachInput, Rendezvous } from './rendezvous.ts'

export type RoomEvent =
  | { kind: 'chat'; from: string; text: string; ts: number; self: boolean }
  | { kind: 'log'; line: string }
  | { kind: 'peers'; active: string[]; passive: number }
  | { kind: 'relay'; url: string; state: RelayState }

type RoomConfig = {
  identity: Identity
  roomId: string
  topicSecret: string
  relays: string[]
  onEvent(event: RoomEvent): void
}

type PendingDial = {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  targetHex: string
  atMs: number
}

const SWEEP_MS = 5000
const DEAD_AFTER_MS = HEARTBEAT_MS * HEARTBEAT_MISS

export class Room {
  private readonly config: RoomConfig
  private readonly selfHex: string
  private readonly groupKey: Uint8Array
  private readonly links = new Map<string, PeerLink>()
  private readonly passive = new Set<string>()
  private readonly ejected = new Set<string>()
  private readonly refusedUntil = new Map<string, number>()
  private readonly scores = new PeerScores()
  private readonly budget = new ByteBudget(FORWARD_BUDGET_BYTES_PER_SEC)
  private readonly router: Router
  private readonly pool: NostrPool
  private readonly rendezvous: Rendezvous
  private readonly pendingDials = new Map<string, PendingDial>()
  private timers: ReturnType<typeof setInterval>[] = []
  private seq = 0
  private joined = false

  constructor(config: RoomConfig) {
    this.config = config
    this.selfHex = config.identity.peerIdHex
    this.groupKey = deriveGroupKey(config.topicSecret)
    this.router = new Router({
      selfHex: this.selfHex,
      isEjected: (hex) => this.ejected.has(hex),
      onDrop: (record) => this.onDrop(record),
    })
    this.pool = new NostrPool({
      urls: config.relays,
      log: (line) => this.log(line),
      onState: (url, state) => config.onEvent({ kind: 'relay', url, state }),
    })
    this.rendezvous = new Rendezvous({
      identity: config.identity,
      topic: roomTopic(APP_ID, config.roomId, config.topicSecret),
      pool: this.pool,
      canLink: (hex) => this.canLink(hex),
      isBlocked: (hex) => this.isBlocked(hex),
      roomFull: () => this.links.size + this.passive.size + 1 >= ROOM_CAP,
      attach: (input) => this.attach(input),
      log: (line) => this.log(line),
    })
  }

  join(): void {
    if (this.joined) return
    this.joined = true
    this.pool.start()
    this.rendezvous.start()
    this.rendezvous.setLonely(true)
    this.timers = [
      setInterval(() => this.beat(), HEARTBEAT_MS),
      setInterval(() => this.gossipView(), VIEW_GOSSIP_MS),
      setInterval(() => this.sweep(), SWEEP_MS),
    ]
    this.log(`joined as ${short(this.selfHex)} (${this.config.identity.tier})`)
  }

  leave(): void {
    if (!this.joined) return
    this.joined = false
    const gift = sample([...this.passive], PASSIVE_VIEW)
    for (const link of this.links.values()) {
      this.sendMessage(link.peerHex, { t: 'leave', peers: gift })
      link.close()
    }
    for (const timer of this.timers) clearInterval(timer)
    this.timers = []
    for (const dial of this.pendingDials.values()) dial.pc.close()
    this.pendingDials.clear()
    this.rendezvous.stop()
    this.pool.stop()
  }

  broadcastChat(text: string): void {
    const ts = Date.now()
    this.sendMessage('wildcard', { t: 'chat', text, ts })
    this.config.onEvent({
      kind: 'chat',
      from: this.selfHex,
      text,
      ts,
      self: true,
    })
  }

  private nextSeq(): number {
    const floor = Math.floor(Date.now() / 1000) - SEQ_EPOCH_SEC
    this.seq = Math.max(this.seq + 1, floor)
    return this.seq
  }

  private sendMessage(dst: 'wildcard' | string, message: MeshMessage): void {
    const linkLocal =
      message.t === 'beat' || message.t === 'view' || message.t === 'leave'
    const nonce = randomBytes(24)
    const frame = buildFrame({
      identity: this.config.identity,
      dst: dst === 'wildcard' ? WILDCARD : fromHex(dst),
      seq: this.nextSeq(),
      nonce,
      payload: seal(this.groupKey, nonce, encodeMessage(message)),
      hop: linkLocal ? HOP_CAP - 1 : 0,
    })
    const bytes = encodeFrame(frame)
    const direct = dst === 'wildcard' ? undefined : this.links.get(dst)
    const targets = direct === undefined ? [...this.links.values()] : [direct]
    for (const link of targets) {
      if (link.bufferedAmount < BUFFERED_HIGH_WATER) link.send(bytes)
    }
  }

  private onRaw(fromHex: string, bytes: Uint8Array): void {
    const result = this.router.accept(bytes, fromHex, Date.now())
    if (result.kind === 'drop') return
    if (result.deliver) this.deliver(result.frame)
    if (result.forward) this.forward(result.frame, fromHex)
  }

  private forward(frame: Frame, fromHex: string): void {
    const bytes = encodeFrame(frame)
    if (!this.budget.take(bytes.length, Date.now())) return
    const srcHex = toHex(frame.src)
    for (const link of this.links.values()) {
      const skip =
        link.peerHex === fromHex ||
        link.peerHex === srcHex ||
        link.bufferedAmount >= BUFFERED_HIGH_WATER
      if (!skip) link.send(bytes)
    }
  }

  private deliver(frame: Frame): void {
    const srcHex = toHex(frame.src)
    const plain = open(this.groupKey, frame.nonce, frame.payload)
    if (plain === null) {
      this.log(`unreadable payload from ${short(srcHex)}`)
      return
    }
    const message = decodeMessage(plain)
    if (message === null) {
      this.log(`malformed message from ${short(srcHex)}`)
      return
    }
    this.dispatch(srcHex, message)
  }

  private dispatch(srcHex: string, message: MeshMessage): void {
    switch (message.t) {
      case 'chat': {
        this.config.onEvent({
          kind: 'chat',
          from: srcHex,
          text: message.text,
          ts: message.ts,
          self: false,
        })
        return
      }
      case 'beat':
        return
      case 'view': {
        this.mergePassive(message.peers)
        return
      }
      case 'leave': {
        this.onLeave(srcHex, message.peers)
        return
      }
      case 'dial-offer': {
        void this.onDialOffer(srcHex, message.dialId, message.sdp)
        return
      }
      case 'dial-answer': {
        void this.onDialAnswer(srcHex, message.dialId, message.sdp)
        return
      }
    }
  }

  private onLeave(srcHex: string, gift: string[]): void {
    this.mergePassive(gift)
    this.log(`${short(srcHex)} left`)
    this.links.get(srcHex)?.close()
  }

  private mergePassive(peers: string[]): void {
    const admissible = peers.filter(
      (hex) =>
        hex !== this.selfHex && !this.links.has(hex) && !this.isBlocked(hex),
    )
    for (const hex of admissible) this.passive.add(hex)
    for (const hex of this.passive) {
      if (this.passive.size <= PASSIVE_VIEW) break
      this.passive.delete(hex)
    }
    this.emitPeers()
  }

  private async onDialOffer(
    srcHex: string,
    dialId: string,
    sdp: string,
  ): Promise<void> {
    if (!this.canLink(srcHex)) return
    const { pc, sdp: answerSdp, channel } = await createAnswerPeer(sdp)
    this.sendMessage(srcHex, { t: 'dial-answer', dialId, sdp: answerSdp })
    const dc = await channel
    this.attach({ peerHex: srcHex, offererHex: srcHex, pc, dc })
  }

  private async onDialAnswer(
    srcHex: string,
    dialId: string,
    sdp: string,
  ): Promise<void> {
    const dial = this.pendingDials.get(dialId)
    if (dial === undefined || dial.targetHex !== srcHex) return
    this.pendingDials.delete(dialId)
    dial.dc.addEventListener('open', () => {
      this.attach({
        peerHex: srcHex,
        offererHex: this.selfHex,
        pc: dial.pc,
        dc: dial.dc,
      })
    })
    await acceptAnswer(dial.pc, sdp)
  }

  private async dial(targetHex: string): Promise<void> {
    const alreadyDialing = [...this.pendingDials.values()].some(
      (dial) => dial.targetHex === targetHex,
    )
    if (alreadyDialing) return
    const { pc, dc, sdp } = await createOfferPeer()
    const dialId = toHex(randomBytes(16))
    this.pendingDials.set(dialId, { pc, dc, targetHex, atMs: Date.now() })
    this.sendMessage(targetHex, { t: 'dial-offer', dialId, sdp })
    this.log(`dialing ${short(targetHex)} over the mesh`)
  }

  private attach(input: AttachInput): void {
    if (input.peerHex === this.selfHex) {
      input.pc.close()
      return
    }
    const existing = this.links.get(input.peerHex)
    if (existing !== undefined) {
      if (existing.offererHex <= input.offererHex) {
        input.pc.close()
        return
      }
      existing.close()
    }
    const link = new PeerLink({
      peerHex: input.peerHex,
      offererHex: input.offererHex,
      pc: input.pc,
      dc: input.dc,
      nowMs: Date.now(),
      handlers: {
        onMessage: (hex, bytes) => this.onRaw(hex, bytes),
        onClose: (hex) => this.onLinkClose(hex),
      },
    })
    this.links.set(input.peerHex, link)
    this.passive.delete(input.peerHex)
    this.rendezvous.setLonely(false)
    this.log(`linked with ${short(input.peerHex)}`)
    this.emitPeers()
    this.gossipView()
  }

  private onLinkClose(peerHex: string): void {
    if (!this.links.delete(peerHex)) return
    this.log(`link to ${short(peerHex)} closed`)
    this.emitPeers()
    if (this.joined && this.links.size === 0) this.rendezvous.setLonely(true)
  }

  private beat(): void {
    const now = Date.now()
    for (const link of this.links.values()) {
      if (now - link.lastSeenMs > DEAD_AFTER_MS) {
        this.log(`${short(link.peerHex)} missed heartbeats`)
        link.close()
        continue
      }
      this.sendMessage(link.peerHex, { t: 'beat' })
    }
  }

  private gossipView(): void {
    const known = [...this.links.keys(), ...this.passive]
    for (const link of this.links.values()) {
      const peers = sample(
        known.filter((hex) => hex !== link.peerHex),
        PASSIVE_VIEW,
      )
      if (peers.length > 0) this.sendMessage(link.peerHex, { t: 'view', peers })
    }
  }

  private sweep(): void {
    const now = Date.now()
    this.router.prune(now)
    this.rendezvous.tick(now)
    for (const [hex, until] of this.refusedUntil) {
      if (until <= now) this.refusedUntil.delete(hex)
    }
    for (const [dialId, dial] of this.pendingDials) {
      if (now - dial.atMs <= DIAL_TIMEOUT_MS) continue
      dial.pc.close()
      this.pendingDials.delete(dialId)
      this.passive.delete(dial.targetHex)
    }
    this.fill()
  }

  private fill(): void {
    if (!this.joined) return
    if (this.links.size === 0) this.rendezvous.setLonely(true)
    if (this.links.size >= ACTIVE_VIEW) return
    const candidates = [...this.passive].filter((hex) => this.canLink(hex))
    const target = sample(candidates, 1)[0]
    if (target !== undefined) void this.dial(target)
  }

  private onDrop(record: DropRecord): void {
    if (record.reason === 'dup' || record.reason === 'own') return
    this.log(
      `drop ${record.reason}${record.offender ? ` by ${short(record.offender)}` : ''}`,
    )
    if (record.offender === null) return
    const score = this.scores.penalize(record.offender)
    if (score > SCORE_FLOOR) return
    this.refusedUntil.set(record.offender, Date.now() + OFFER_COOLDOWN_MS)
    this.links.get(record.offender)?.close()
    this.passive.delete(record.offender)
    this.log(`refusing ${short(record.offender)} for misbehaviour`)
  }

  private canLink(peerHex: string): boolean {
    return (
      peerHex !== this.selfHex &&
      !this.links.has(peerHex) &&
      this.links.size < ACTIVE_VIEW &&
      !this.isBlocked(peerHex)
    )
  }

  private isBlocked(peerHex: string): boolean {
    return (
      this.ejected.has(peerHex) ||
      (this.refusedUntil.get(peerHex) ?? 0) > Date.now()
    )
  }

  private emitPeers(): void {
    this.config.onEvent({
      kind: 'peers',
      active: [...this.links.keys()],
      passive: this.passive.size,
    })
  }

  private log(line: string): void {
    this.config.onEvent({ kind: 'log', line })
  }
}
