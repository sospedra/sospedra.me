import { bytesEqual } from './bytes.ts'
import { ackSigningInput, decodeWriteAck } from './events.ts'
import {
  decodeLatestHead,
  encodeHeadId,
  type HeadIdV1,
  headSigningInput,
  type LatestHeadV1,
} from './head.ts'
import { verifySig } from './keys.ts'

export type Taxonomy =
  | 'PREVENTED_BY_MATH'
  | 'PROVABLE_ON_RECORD'
  | 'POSSIBLE_UNDER_GOVERNANCE'
  | 'LIMITATION'

export type SignedHead = {
  headBytes: Uint8Array
  signature: Uint8Array
}

export type SignedAck = {
  ackBytes: Uint8Array
  signature: Uint8Array
}

export type Evidence = {
  kind: 'head-conflict' | 'ack-omission'
  taxonomy: 'PROVABLE_ON_RECORD'
  detail: string
  objects: Uint8Array[]
}

function headIdEqual(x: HeadIdV1, y: HeadIdV1): boolean {
  return bytesEqual(encodeHeadId(x), encodeHeadId(y))
}

function laterHasLowerSequence(x: LatestHeadV1, y: LatestHeadV1): boolean {
  if (x.latestAsOfMs === y.latestAsOfMs) return false
  const [earlier, later] = x.latestAsOfMs < y.latestAsOfMs ? [x, y] : [y, x]
  return later.head.sequence < earlier.head.sequence
}

function conflictDetail(x: LatestHeadV1, y: LatestHeadV1): string | null {
  if (x.latestAsOfMs === y.latestAsOfMs && !headIdEqual(x.head, y.head)) {
    return 'same latestAsOfMs, different head'
  }
  if (laterHasLowerSequence(x, y)) {
    return 'later statement has a lower sequence than the earlier one'
  }
  return null
}

export function headConflict(a: SignedHead, b: SignedHead): Evidence | null {
  const headA = decodeLatestHead(a.headBytes)
  const headB = decodeLatestHead(b.headBytes)
  if (!bytesEqual(headA.headKeyId, headB.headKeyId)) return null
  const detail = conflictDetail(headA, headB)
  if (detail === null) return null
  const signedA = verifySig(
    headSigningInput(a.headBytes),
    a.signature,
    headA.headKeyId,
  )
  const signedB = verifySig(
    headSigningInput(b.headBytes),
    b.signature,
    headB.headKeyId,
  )
  if (!signedA || !signedB) return null
  return {
    kind: 'head-conflict',
    taxonomy: 'PROVABLE_ON_RECORD',
    detail,
    objects: [a.headBytes, a.signature, b.headBytes, b.signature],
  }
}

export function ackOmission(
  ack: SignedAck,
  provenThrough: bigint,
  included: boolean,
): Evidence | null {
  if (included) return null
  const decoded = decodeWriteAck(ack.ackBytes)
  if (provenThrough < decoded.mustLandBySequence) return null
  const verified = verifySig(
    ackSigningInput(ack.ackBytes),
    ack.signature,
    decoded.receiptKeyId,
  )
  if (!verified) return null
  return {
    kind: 'ack-omission',
    taxonomy: 'PROVABLE_ON_RECORD',
    detail: `event omitted past mustLandBySequence ${decoded.mustLandBySequence}`,
    objects: [ack.ackBytes, ack.signature],
  }
}
