import { isHexOfBytes, utf8 } from './bytes.ts'

export type MeshMessage =
  | { t: 'chat'; text: string; ts: number; nick: string }
  | { t: 'beat' }
  | { t: 'view'; peers: string[] }
  | { t: 'leave'; peers: string[] }
  | { t: 'dial-offer'; dialId: string; sdp: string }
  | { t: 'dial-answer'; dialId: string; sdp: string }
  | { t: 'hello'; nick: string }
  | { t: 'kick'; target: string }

export const CHAT_TEXT_MAX = 16_000
export const NICK_MAX = 24
const PEER_LIST_MAX = 48
const SDP_MAX = 20_000

const isControl = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code < 32 || code === 127
}

export const isValidNick = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= NICK_MAX &&
  value === value.trim() &&
  ![...value].some(isControl)

export const encodeMessage = (message: MeshMessage): Uint8Array =>
  utf8(JSON.stringify(message))

const asPeerList = (value: unknown): string[] | null => {
  const valid =
    Array.isArray(value) &&
    value.length <= PEER_LIST_MAX &&
    value.every((entry) => isHexOfBytes(entry, 32))
  return valid ? (value as string[]) : null
}

const asDial = (
  t: 'dial-offer' | 'dial-answer',
  raw: Record<string, unknown>,
): MeshMessage | null => {
  const valid =
    isHexOfBytes(raw.dialId, 16) &&
    typeof raw.sdp === 'string' &&
    raw.sdp.length <= SDP_MAX
  if (!valid) return null
  return { t, dialId: raw.dialId as string, sdp: raw.sdp as string }
}

const VALIDATORS: Record<
  string,
  (raw: Record<string, unknown>) => MeshMessage | null
> = {
  chat: (raw) => {
    const valid =
      typeof raw.text === 'string' &&
      raw.text.length <= CHAT_TEXT_MAX &&
      typeof raw.ts === 'number' &&
      Number.isFinite(raw.ts) &&
      isValidNick(raw.nick)
    if (!valid) return null
    return {
      t: 'chat',
      text: raw.text as string,
      ts: raw.ts as number,
      nick: raw.nick as string,
    }
  },
  beat: () => ({ t: 'beat' }),
  view: (raw) => {
    const peers = asPeerList(raw.peers)
    return peers === null ? null : { t: 'view', peers }
  },
  leave: (raw) => {
    const peers = asPeerList(raw.peers)
    return peers === null ? null : { t: 'leave', peers }
  },
  'dial-offer': (raw) => asDial('dial-offer', raw),
  'dial-answer': (raw) => asDial('dial-answer', raw),
  hello: (raw) =>
    isValidNick(raw.nick) ? { t: 'hello', nick: raw.nick } : null,
  kick: (raw) =>
    isHexOfBytes(raw.target, 32) ? { t: 'kick', target: raw.target } : null,
}

export const decodeMessage = (bytes: Uint8Array): MeshMessage | null => {
  const raw = parseJson(bytes)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const validate =
    typeof record.t === 'string' ? VALIDATORS[record.t] : undefined
  return validate === undefined ? null : validate(record)
}

const parseJson = (bytes: Uint8Array): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
