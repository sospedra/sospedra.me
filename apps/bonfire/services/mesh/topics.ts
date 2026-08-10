import { sha256 } from '@noble/hashes/sha2.js'
import { concat, toHex, utf8 } from './bytes.ts'

export const sessionTopic = (
  appId: string,
  sessionId: string,
  secret: string,
): string => toHex(sha256(concat(utf8(appId), utf8(sessionId), utf8(secret))))
