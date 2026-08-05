import { hex } from './bytes.ts'
import { PROTOCOL_VERSION } from './constants.ts'
import { Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import { LIMITS } from './limits.ts'

export type ClientTrustStateV1 = {
  protocolVersion: number
  highestSequence: bigint
  acceptedRoot: Uint8Array
  programChainHash: Uint8Array
  activeUpdateProgramId: Uint8Array
  activeQueryProgramId: Uint8Array
  activeKeyStateHash: Uint8Array
  lastLatestAsOfMs: bigint
}

export function encodeClientTrustState(trust: ClientTrustStateV1): Uint8Array {
  const w = new Writer()
  w.u16(trust.protocolVersion)
  w.u64(trust.highestSequence)
  w.fixed(trust.acceptedRoot, 32)
  w.fixed(trust.programChainHash, 32)
  w.fixed(trust.activeUpdateProgramId, 32)
  w.fixed(trust.activeQueryProgramId, 32)
  w.fixed(trust.activeKeyStateHash, 32)
  w.u64(trust.lastLatestAsOfMs)
  return w.done()
}

export function decodeClientTrustState(buf: Uint8Array): ClientTrustStateV1 {
  const r = new Reader(buf)
  const protocolVersion = r.version(PROTOCOL_VERSION)
  const highestSequence = r.u64()
  const acceptedRoot = r.fixed(32)
  const programChainHash = r.fixed(32)
  const activeUpdateProgramId = r.fixed(32)
  const activeQueryProgramId = r.fixed(32)
  const activeKeyStateHash = r.fixed(32)
  const lastLatestAsOfMs = r.u64()
  r.finish()
  return {
    protocolVersion,
    highestSequence,
    acceptedRoot,
    programChainHash,
    activeUpdateProgramId,
    activeQueryProgramId,
    activeKeyStateHash,
    lastLatestAsOfMs,
  }
}

export type GenesisAnchors = {
  protocolVersion: number
  genesisRoot: Uint8Array
  programChainHash: Uint8Array
  updateProgramId: Uint8Array
  queryProgramId: Uint8Array
  keyStateHash: Uint8Array
}

export function genesisTrust(anchors: GenesisAnchors): ClientTrustStateV1 {
  return {
    protocolVersion: anchors.protocolVersion,
    highestSequence: 0n,
    acceptedRoot: anchors.genesisRoot,
    programChainHash: anchors.programChainHash,
    activeUpdateProgramId: anchors.updateProgramId,
    activeQueryProgramId: anchors.queryProgramId,
    activeKeyStateHash: anchors.keyStateHash,
    lastLatestAsOfMs: 0n,
  }
}

export type KeyStateEntryV1 = {
  keyId: Uint8Array
  status: number
  sinceSequence: bigint
}

function compareHex(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function keyStateHash(entries: KeyStateEntryV1[]): Uint8Array {
  const sorted = entries.toSorted((a, b) =>
    compareHex(hex(a.keyId), hex(b.keyId)),
  )
  const w = new Writer()
  w.list(sorted, LIMITS.listCount, (entry) => {
    w.fixed(entry.keyId, 32)
    w.u16(entry.status)
    w.u64(entry.sinceSequence)
  })
  return hash('state-value', w.done())
}
