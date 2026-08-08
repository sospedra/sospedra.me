import { sha256 } from '@noble/hashes/sha2.js'
import { concat, toHex, utf8 } from './bytes.ts'

export const roomTopic = (
  appId: string,
  roomId: string,
  topicSecret: string,
): string => toHex(sha256(concat(utf8(appId), utf8(roomId), utf8(topicSecret))))

export const inviteTopic = (appId: string, inviteId: Uint8Array): string =>
  toHex(sha256(concat(utf8(appId), inviteId)))
