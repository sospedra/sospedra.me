import { Reader, Writer } from './encode.ts'
import { LIMITS } from './limits.ts'
import { type AccessV1, decodeAccess, encodeAccess } from './view.ts'

export type ResponseBundle = {
  canonicalRequest: Uint8Array
  canonicalResult: Uint8Array
  receipt: Uint8Array
  receiptSignature: Uint8Array
  receiptKeyWitness: AccessV1
  queryProof: Uint8Array
  transitions: Uint8Array[]
  migrations: Uint8Array[]
  latestHead: Uint8Array | null
  latestHeadSignature: Uint8Array | null
}

function encodeOptionalHead(
  w: Writer,
  head: Uint8Array | null,
  signature: Uint8Array | null,
): void {
  if ((head === null) !== (signature === null)) {
    throw new RangeError(
      'bundle: latestHead and latestHeadSignature must be both present or both absent',
    )
  }
  w.bool(head !== null)
  if (head !== null && signature !== null) {
    w.bytes(head, LIMITS.bytesField)
    w.fixed(signature, 64)
  }
}

type OptionalHead = {
  latestHead: Uint8Array | null
  latestHeadSignature: Uint8Array | null
}

function decodeOptionalHead(r: Reader): OptionalHead {
  const present = r.bool()
  if (!present) return { latestHead: null, latestHeadSignature: null }
  const latestHead = r.bytes(LIMITS.bytesField)
  const latestHeadSignature = r.fixed(64)
  return { latestHead, latestHeadSignature }
}

export function encodeBundle(b: ResponseBundle): Uint8Array {
  const w = new Writer()
  w.bytes(b.canonicalRequest, LIMITS.bytesField)
  w.bytes(b.canonicalResult, LIMITS.result)
  w.bytes(b.receipt, LIMITS.bytesField)
  w.fixed(b.receiptSignature, 64)
  const witnessBytes = encodeAccess(b.receiptKeyWitness)
  w.fixed(witnessBytes, witnessBytes.length)
  w.bytes(b.queryProof, LIMITS.bytesField)
  w.list(b.transitions, LIMITS.transitionChain, (t) => {
    w.bytes(t, LIMITS.bytesField)
  })
  w.list(b.migrations, LIMITS.migrationChain, (m) => {
    w.bytes(m, LIMITS.bytesField)
  })
  encodeOptionalHead(w, b.latestHead, b.latestHeadSignature)
  return w.done()
}

export function decodeBundle(buf: Uint8Array): ResponseBundle {
  const r = new Reader(buf)
  const canonicalRequest = r.bytes(LIMITS.bytesField)
  const canonicalResult = r.bytes(LIMITS.result)
  const receipt = r.bytes(LIMITS.bytesField)
  const receiptSignature = r.fixed(64)
  const receiptKeyWitness = decodeAccess(r)
  const queryProof = r.bytes(LIMITS.bytesField)
  const transitions = r.list(LIMITS.transitionChain, () =>
    r.bytes(LIMITS.bytesField),
  )
  const migrations = r.list(LIMITS.migrationChain, () =>
    r.bytes(LIMITS.bytesField),
  )
  const { latestHead, latestHeadSignature } = decodeOptionalHead(r)
  r.finish()
  return {
    canonicalRequest,
    canonicalResult,
    receipt,
    receiptSignature,
    receiptKeyWitness,
    queryProof,
    transitions,
    migrations,
    latestHead,
    latestHeadSignature,
  }
}
