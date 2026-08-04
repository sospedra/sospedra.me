import { concat, fromHex, isHexOfBytes, toHex, u64be, utf8 } from './bytes.ts'
import { CLOCK_SKEW_MS, OFFER_REFRESH_MS } from './constants.ts'
import { type Identity, verifySig } from './keys.ts'

export type OfferRole = 'offer' | 'answer'

export type OfferEnvelope = {
  role: OfferRole
  peerId: string
  sdp: string
  ephPub: string
  createdAt: number
  invite: null
  sig: string
  re?: string
}

export type OfferRejectReason =
  | 'bad-sig'
  | 'stale'
  | 'future'
  | 'self'
  | 'ejected'
  | 'room-full'

export type OfferVerdict =
  | { ok: true }
  | { ok: false; reason: OfferRejectReason }

export type OfferContext = {
  nowSec: number
  selfPeerId: string
  isEjected(peerIdHex: string): boolean
  roomFull: boolean
}

const SDP_MAX_CHARS = 20_000

const offerSignBytes = (sdp: string, ephPub: string, createdAt: number) =>
  concat(utf8(sdp), fromHex(ephPub), u64be(createdAt))

export const buildOfferEnvelope = (input: {
  identity: Identity
  role: OfferRole
  sdp: string
  ephPub: string
  createdAt: number
  re?: string
}): OfferEnvelope => {
  const sig = input.identity.sign(
    offerSignBytes(input.sdp, input.ephPub, input.createdAt),
  )
  return {
    role: input.role,
    peerId: input.identity.peerIdHex,
    sdp: input.sdp,
    ephPub: input.ephPub,
    createdAt: input.createdAt,
    invite: null,
    sig: toHex(sig),
    ...(input.re === undefined ? {} : { re: input.re }),
  }
}

const isHex = isHexOfBytes

export const parseOfferEnvelope = (value: unknown): OfferEnvelope | null => {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  const validShape =
    (raw.role === 'offer' || raw.role === 'answer') &&
    isHex(raw.peerId, 32) &&
    typeof raw.sdp === 'string' &&
    raw.sdp.length <= SDP_MAX_CHARS &&
    isHex(raw.ephPub, 32) &&
    typeof raw.createdAt === 'number' &&
    Number.isFinite(raw.createdAt) &&
    raw.invite === null &&
    isHex(raw.sig, 64) &&
    (raw.re === undefined || isHex(raw.re, 32))
  if (!validShape) return null
  return {
    role: raw.role as OfferRole,
    peerId: raw.peerId as string,
    sdp: raw.sdp as string,
    ephPub: raw.ephPub as string,
    createdAt: raw.createdAt as number,
    invite: null,
    sig: raw.sig as string,
    ...(raw.re === undefined ? {} : { re: raw.re as string }),
  }
}

export const verifyOfferEnvelope = (
  envelope: OfferEnvelope,
  context: OfferContext,
): OfferVerdict => {
  const signedOk = verifySig(
    offerSignBytes(envelope.sdp, envelope.ephPub, envelope.createdAt),
    fromHex(envelope.sig),
    fromHex(envelope.peerId),
  )
  if (!signedOk) return { ok: false, reason: 'bad-sig' }
  const ageMs = (context.nowSec - envelope.createdAt) * 1000
  if (ageMs > OFFER_REFRESH_MS) return { ok: false, reason: 'stale' }
  if (ageMs < -CLOCK_SKEW_MS) return { ok: false, reason: 'future' }
  if (envelope.peerId === context.selfPeerId)
    return { ok: false, reason: 'self' }
  if (context.isEjected(envelope.peerId))
    return { ok: false, reason: 'ejected' }
  if (context.roomFull) return { ok: false, reason: 'room-full' }
  return { ok: true }
}
