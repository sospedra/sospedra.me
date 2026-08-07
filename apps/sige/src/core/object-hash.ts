import { concatBytes, u32be, u64be, utf8 } from './bytes.ts'
import type { CborValue } from './cbor.ts'
import { encodeCbor } from './cbor.ts'
import { sha256 } from './hash.ts'

const OBJECT_HASH_DOMAIN = 'SIGE/object-hash/v1'

// Length-framed to block a concatenation ambiguity between type_url and the
// canonical payload (spec 6.1).
export function objectHash(typeUrl: string, value: CborValue): Uint8Array {
  const typeUrlBytes = utf8(typeUrl)
  const canonicalCbor = encodeCbor(value)
  return sha256(
    concatBytes(
      utf8(OBJECT_HASH_DOMAIN),
      u32be(typeUrlBytes.length),
      typeUrlBytes,
      u64be(canonicalCbor.length),
      canonicalCbor,
    ),
  )
}
