import { sha256 } from '@noble/hashes/sha2.js'
import { ascii, concat, u16be, u32be } from './bytes.ts'
import { MAGIC, PROTOCOL_VERSION } from './constants.ts'

export type Domain =
  | 'author-event'
  | 'author-signing'
  | 'event-record'
  | 'write-ack'
  | 'state-key'
  | 'state-value'
  | 'state-leaf'
  | 'state-node'
  | 'transition-journal'
  | 'query-request'
  | 'query-result'
  | 'query-journal'
  | 'query-receipt'
  | 'latest-head'
  | 'program-chain'
  | 'proof-cache-key'
  | 'program-id'
  | 'scenario-fixture'
  | 'program-migration'
  | 'program-manifest-pair'
  | 'key-state'

export function hash(domain: Domain, ...parts: Uint8Array[]): Uint8Array {
  const preimage = concat(
    MAGIC,
    u16be(PROTOCOL_VERSION),
    u16be(domain.length),
    ascii(domain),
    ...parts.flatMap((part) => [u32be(part.length), part]),
  )
  return sha256(preimage)
}
