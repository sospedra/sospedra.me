import { x25519 } from '@noble/curves/ed25519.js'
import { randomBytes, toHex } from '../mesh/bytes.ts'
import {
  DIAL_TIMEOUT_MS,
  NOSTR_KIND,
  OFFER_REFRESH_MS,
} from '../mesh/constants.ts'
import type { Identity } from '../mesh/keys.ts'
import { buildEvent } from '../mesh/nostr-event.ts'
import {
  buildOfferEnvelope,
  type OfferEnvelope,
  parseOfferEnvelope,
  verifyOfferEnvelope,
} from '../mesh/offer.ts'
import { short } from '../util.ts'
import type { NostrPool } from './nostr-pool.ts'
import { acceptAnswer, createAnswerPeer, createOfferPeer } from './peer-link.ts'

export type AttachInput = {
  peerHex: string
  offererHex: string
  pc: RTCPeerConnection
  dc: RTCDataChannel
}

type RendezvousDeps = {
  identity: Identity
  topic: string
  pool: NostrPool
  canLink(peerHex: string): boolean
  isBlocked(peerHex: string): boolean
  roomFull(): boolean
  attach(input: AttachInput): void
  log(line: string): void
}

type OpenOffer = {
  pc: RTCPeerConnection
  dc: RTCDataChannel
  atMs: number
  answeredBy: string | null
}

type PendingAnswer = {
  pc: RTCPeerConnection
  atMs: number
}

const OFFER_POOL_SIZE = 2
const OFFER_STALE_MS = OFFER_REFRESH_MS - 10_000

const freshEphPub = (): string => toHex(x25519.getPublicKey(randomBytes(32)))

export class Rendezvous {
  private readonly deps: RendezvousDeps
  private readonly relaySecret = randomBytes(32)
  private readonly myOffers = new Map<string, OpenOffer>()
  private readonly pendingAnswers = new Map<string, PendingAnswer>()
  private lonely = false
  private minting = false
  private subscriptionId: string | null = null

  constructor(deps: RendezvousDeps) {
    this.deps = deps
  }

  start(): void {
    this.subscriptionId = this.deps.pool.subscribe(this.deps.topic, (event) => {
      this.handleContent(event.content)
    })
  }

  setLonely(lonely: boolean): void {
    this.lonely = lonely
    if (lonely) void this.ensureOffers()
  }

  tick(nowMs: number): void {
    for (const [ephPub, offer] of this.myOffers) {
      if (nowMs - offer.atMs <= OFFER_STALE_MS || offer.answeredBy !== null)
        continue
      offer.pc.close()
      this.myOffers.delete(ephPub)
    }
    for (const [peerHex, pending] of this.pendingAnswers) {
      if (nowMs - pending.atMs <= DIAL_TIMEOUT_MS) continue
      pending.pc.close()
      this.pendingAnswers.delete(peerHex)
    }
    if (this.lonely) void this.ensureOffers()
  }

  stop(): void {
    if (this.subscriptionId !== null) {
      this.deps.pool.unsubscribe(this.subscriptionId)
      this.subscriptionId = null
    }
    for (const offer of this.myOffers.values()) offer.pc.close()
    for (const pending of this.pendingAnswers.values()) pending.pc.close()
    this.myOffers.clear()
    this.pendingAnswers.clear()
  }

  private async ensureOffers(): Promise<void> {
    if (this.minting) return
    this.minting = true
    try {
      while (this.myOffers.size < OFFER_POOL_SIZE) await this.mintOffer()
    } finally {
      this.minting = false
    }
  }

  private async mintOffer(): Promise<void> {
    const { pc, dc, sdp } = await createOfferPeer()
    const ephPub = freshEphPub()
    this.myOffers.set(ephPub, { pc, dc, atMs: Date.now(), answeredBy: null })
    this.publishEnvelope(
      buildOfferEnvelope({
        identity: this.deps.identity,
        role: 'offer',
        sdp,
        ephPub,
        createdAt: Math.floor(Date.now() / 1000),
      }),
    )
  }

  private publishEnvelope(envelope: OfferEnvelope): void {
    const nowSec = Math.floor(Date.now() / 1000)
    const event = buildEvent({
      secret: this.relaySecret,
      kind: NOSTR_KIND,
      tags: [
        ['t', this.deps.topic],
        ['expiration', String(nowSec + 600)],
      ],
      content: JSON.stringify(envelope),
      createdAtSec: nowSec,
    })
    const reach = this.deps.pool.publish(event)
    if (reach === 0) this.deps.log('rendezvous publish reached no relay')
  }

  private handleContent(content: string): void {
    const envelope = parseOfferEnvelope(parseJson(content))
    if (envelope === null) return
    if (envelope.peerId === this.deps.identity.peerIdHex) return
    const verdict = verifyOfferEnvelope(envelope, {
      nowSec: Math.floor(Date.now() / 1000),
      selfPeerId: this.deps.identity.peerIdHex,
      isEjected: this.deps.isBlocked,
      roomFull: this.deps.roomFull(),
    })
    if (!verdict.ok) {
      this.deps.log(
        `rendezvous reject ${verdict.reason} from ${short(envelope.peerId)}`,
      )
      return
    }
    if (envelope.role === 'offer') void this.handleOffer(envelope)
    if (envelope.role === 'answer') void this.handleAnswer(envelope)
  }

  private async handleOffer(envelope: OfferEnvelope): Promise<void> {
    const peerHex = envelope.peerId
    if (!this.deps.canLink(peerHex) || this.pendingAnswers.has(peerHex)) return
    const { pc, sdp, channel } = await createAnswerPeer(envelope.sdp)
    this.pendingAnswers.set(peerHex, { pc, atMs: Date.now() })
    this.publishEnvelope(
      buildOfferEnvelope({
        identity: this.deps.identity,
        role: 'answer',
        sdp,
        ephPub: freshEphPub(),
        createdAt: Math.floor(Date.now() / 1000),
        re: envelope.ephPub,
      }),
    )
    const dc = await channel
    this.pendingAnswers.delete(peerHex)
    this.deps.attach({ peerHex, offererHex: peerHex, pc, dc })
  }

  private async handleAnswer(envelope: OfferEnvelope): Promise<void> {
    if (envelope.re === undefined) return
    const offer = this.myOffers.get(envelope.re)
    if (offer === undefined || offer.answeredBy !== null) return
    if (!this.deps.canLink(envelope.peerId)) return
    offer.answeredBy = envelope.peerId
    this.myOffers.delete(envelope.re)
    offer.dc.addEventListener('open', () => {
      this.deps.attach({
        peerHex: envelope.peerId,
        offererHex: this.deps.identity.peerIdHex,
        pc: offer.pc,
        dc: offer.dc,
      })
    })
    await acceptAnswer(offer.pc, envelope.sdp)
    if (this.lonely) void this.ensureOffers()
  }
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
