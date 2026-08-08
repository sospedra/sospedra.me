import { randomBytes } from '../mesh/bytes.ts'
import { type Identity, identityFromSeed } from '../mesh/keys.ts'
import { kvGet, kvPut } from './idb.ts'

const SEED_KEY = 'identity-seed'

export const loadStoredIdentity = async (): Promise<Identity> => {
  const existing = await kvGet<Uint8Array>(SEED_KEY)
  if (existing !== undefined && existing.length === 32) {
    return identityFromSeed(new Uint8Array(existing))
  }
  const seed = randomBytes(32)
  await kvPut(SEED_KEY, seed)
  return identityFromSeed(seed)
}
