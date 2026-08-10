import { fromHex, randomBytes, toHex, utf8 } from './mesh/bytes.ts'
import { NICK_MAX } from './mesh/constants.ts'
import { open, seal } from './mesh/seal.ts'
import type { PlanMode } from './plans.ts'

export type SessionLink = { sessionId: string; secret: string }

export type SessionSnapshot = {
  plan: PlanMode | null
  planEpoch: number
  trackIndex: number
  positionMs: number
  playing: boolean
  positionEpoch: number
  seq: number
}

export type SessionPayload =
  | ({ type: 'state' } & SessionSnapshot)
  | { type: 'presence'; nick: string }
  | { type: 'bye' }

export const INITIAL_SNAPSHOT: SessionSnapshot = {
  plan: null,
  planEpoch: 0,
  trackIndex: 0,
  positionMs: 0,
  playing: false,
  positionEpoch: 0,
  seq: 0,
}

export const createSessionLink = (): SessionLink => ({
  sessionId: toHex(randomBytes(8)),
  secret: toHex(randomBytes(16)),
})

export const sessionHash = (link: SessionLink): string =>
  `#s=${link.sessionId}.${link.secret}`

export const parseSessionHash = (hash: string): SessionLink | null => {
  if (!hash.startsWith('#s=')) return null
  const [sessionId, secret] = hash.slice(3).split('.')
  if (!sessionId || !secret) return null
  return { sessionId, secret }
}

const NONCE_LENGTH = 24

export const encodePayload = (
  key: Uint8Array,
  payload: SessionPayload,
): string => {
  const nonce = randomBytes(NONCE_LENGTH)
  const sealed = seal(key, nonce, utf8(JSON.stringify(payload)))
  return toHex(nonce) + toHex(sealed)
}

export const decodePayload = (
  key: Uint8Array,
  content: string,
): SessionPayload | null => {
  const bytes = tryFromHex(content)
  if (bytes === null || bytes.length <= NONCE_LENGTH) return null
  const opened = open(
    key,
    bytes.slice(0, NONCE_LENGTH),
    bytes.slice(NONCE_LENGTH),
  )
  if (opened === null) return null
  return parsePayload(new TextDecoder().decode(opened))
}

const tryFromHex = (content: string): Uint8Array | null => {
  try {
    return fromHex(content)
  } catch {
    return null
  }
}

const parsePayload = (text: string): SessionPayload | null => {
  try {
    const value: unknown = JSON.parse(text)
    return isSessionPayload(value) ? value : null
  } catch {
    return null
  }
}

const PLAN_MODES: readonly (PlanMode | null)[] = ['long', 'short', null]

const isSnapshotShape = (raw: Record<string, unknown>): boolean =>
  PLAN_MODES.includes(raw.plan as PlanMode | null) &&
  typeof raw.planEpoch === 'number' &&
  typeof raw.trackIndex === 'number' &&
  typeof raw.positionMs === 'number' &&
  typeof raw.playing === 'boolean' &&
  typeof raw.positionEpoch === 'number' &&
  typeof raw.seq === 'number'

export const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (typeof value !== 'object' || value === null) return false
  const raw = value as Record<string, unknown>
  if (raw.type === 'state') return isSnapshotShape(raw)
  if (raw.type === 'presence') return isNick(raw.nick)
  return raw.type === 'bye'
}

const isNick = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= NICK_MAX

export const snapshotTarget = (
  snapshot: SessionSnapshot,
  nowMs: number,
): number =>
  snapshot.playing
    ? snapshot.positionMs + (nowMs - snapshot.positionEpoch)
    : snapshot.positionMs
