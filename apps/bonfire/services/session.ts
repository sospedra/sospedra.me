import { fromHex, randomBytes, toHex, utf8 } from './mesh/bytes.ts'
import {
  HOST_SILENT_MS,
  NICK_MAX,
  PRESENCE_MISS,
  PRESENCE_MS,
} from './mesh/constants.ts'
import { open, seal } from './mesh/seal.ts'
import type { PlanMode, Segment } from './plans.ts'

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

export const initialSeq = (nowMs: number): number => Math.floor(nowMs / 1000)

export const acceptsSeq = (lastSeq: number | null, seq: number): boolean =>
  lastSeq === null || seq > lastSeq

export type TimelinePoint = { index: number; remaining: number }

export const timelineAt = (
  plan: Segment[],
  elapsedMs: number,
): TimelinePoint | null => {
  const elapsed = Math.max(0, elapsedMs)
  let start = 0
  for (const [index, segment] of plan.entries()) {
    const end = start + segment.time
    if (elapsed < end) return { index, remaining: end - elapsed }
    start = end
  }
  return null
}

export type Peer = { nick: string; lastSeenMs: number }

export type SessionPhase = 'solo' | 'host' | 'gate' | 'seated'

export type SessionRuntime = {
  phase: SessionPhase
  link: SessionLink | null
  nick: string
  selfPubkey: string | null
  snapshot: SessionSnapshot | null
  lastSeq: number | null
  hostPubkey: string | null
  hostSeenMs: number | null
  hostLeft: boolean
  peers: Record<string, Peer>
  openRelays: number
  everOpen: boolean
}

export const INITIAL_RUNTIME: SessionRuntime = {
  phase: 'solo',
  link: null,
  nick: '',
  selfPubkey: null,
  snapshot: null,
  lastSeq: null,
  hostPubkey: null,
  hostSeenMs: null,
  hostLeft: false,
  peers: {},
  openRelays: 0,
  everOpen: false,
}

export type SessionEvent =
  | {
      type: 'hosted'
      link: SessionLink
      nick: string
      selfPubkey: string
      snapshot: SessionSnapshot
    }
  | { type: 'gated'; link: SessionLink }
  | { type: 'seated'; nick: string; selfPubkey: string }
  | { type: 'renamed'; nick: string }
  | { type: 'commanded'; snapshot: SessionSnapshot }
  | { type: 'received'; payload: SessionPayload; pubkey: string; nowMs: number }
  | { type: 'swept'; nowMs: number }
  | { type: 'relays'; open: number }

export const reduceSession = (
  state: SessionRuntime,
  event: SessionEvent,
): SessionRuntime => {
  switch (event.type) {
    case 'hosted':
      return {
        ...INITIAL_RUNTIME,
        phase: 'host',
        link: event.link,
        nick: event.nick,
        selfPubkey: event.selfPubkey,
        snapshot: event.snapshot,
        lastSeq: event.snapshot.seq,
      }
    case 'gated':
      return { ...INITIAL_RUNTIME, phase: 'gate', link: event.link }
    case 'seated':
      return {
        ...state,
        phase: 'seated',
        nick: event.nick,
        selfPubkey: event.selfPubkey,
      }
    case 'renamed':
      return { ...state, nick: event.nick }
    case 'commanded':
      return state.phase === 'host'
        ? { ...state, snapshot: event.snapshot, lastSeq: event.snapshot.seq }
        : state
    case 'received':
      return applyReceived(state, event)
    case 'swept':
      return applySweep(state, event.nowMs)
    case 'relays':
      return {
        ...state,
        openRelays: event.open,
        everOpen: state.everOpen || event.open > 0,
      }
  }
}

const applyReceived = (
  state: SessionRuntime,
  event: { payload: SessionPayload; pubkey: string; nowMs: number },
): SessionRuntime => {
  switch (event.payload.type) {
    case 'state':
      return applyState(state, event.payload, event.pubkey, event.nowMs)
    case 'presence':
      return applyPresence(state, event.payload.nick, event.pubkey, event.nowMs)
    case 'bye':
      return applyBye(state, event.pubkey)
  }
}

const applyState = (
  state: SessionRuntime,
  payload: { type: 'state' } & SessionSnapshot,
  pubkey: string,
  nowMs: number,
): SessionRuntime => {
  if (state.phase === 'host' || state.phase === 'solo') return state
  if (!acceptsSeq(state.lastSeq, payload.seq)) return state
  const { type: _type, ...snapshot } = payload
  return {
    ...state,
    snapshot,
    lastSeq: payload.seq,
    hostPubkey: pubkey,
    hostSeenMs: nowMs,
    hostLeft: false,
  }
}

const applyPresence = (
  state: SessionRuntime,
  nick: string,
  pubkey: string,
  nowMs: number,
): SessionRuntime => {
  if (pubkey === state.selfPubkey) return state
  return {
    ...state,
    peers: { ...state.peers, [pubkey]: { nick, lastSeenMs: nowMs } },
  }
}

const applyBye = (state: SessionRuntime, pubkey: string): SessionRuntime => {
  const peers = Object.fromEntries(
    Object.entries(state.peers).filter(([key]) => key !== pubkey),
  )
  const hostLeft = state.hostLeft || pubkey === state.hostPubkey
  return { ...state, peers, hostLeft }
}

const applySweep = (state: SessionRuntime, nowMs: number): SessionRuntime => {
  const cutoff = PRESENCE_MS * PRESENCE_MISS
  const peers = Object.fromEntries(
    Object.entries(state.peers).filter(
      ([, peer]) => nowMs - peer.lastSeenMs <= cutoff,
    ),
  )
  const following = state.phase === 'seated' || state.phase === 'gate'
  const hostSilent =
    following &&
    state.hostSeenMs !== null &&
    nowMs - state.hostSeenMs > HOST_SILENT_MS
  return { ...state, peers, hostLeft: state.hostLeft || hostSilent }
}
