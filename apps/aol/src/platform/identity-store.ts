import { sha256 } from '@noble/hashes/sha2.js'
import { randomBytes, utf8 } from '../mesh/bytes.ts'
import { type Identity, identityFromSeed } from '../mesh/keys.ts'
import { kvGet, kvPut } from './idb.ts'

const SEED_KEY = 'identity-seed'
const CRED_KEY = 'prf-credential-id'
const PRF_SALT = new Uint8Array(sha256(utf8('aol/prf/v0')))

export const loadStoredIdentity = async (): Promise<Identity> => {
  const existing = await kvGet<Uint8Array>(SEED_KEY)
  if (existing !== undefined && existing.length === 32) {
    return identityFromSeed(new Uint8Array(existing), 'STORED')
  }
  const seed = randomBytes(32)
  await kvPut(SEED_KEY, seed)
  return identityFromSeed(seed, 'STORED')
}

export const hasPasskeyCredential = async (): Promise<boolean> =>
  (await kvGet<ArrayBuffer>(CRED_KEY)) !== undefined

type PrfOutputs = {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
}

const createPasskey = async (): Promise<ArrayBuffer> => {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'aol', id: location.hostname },
      user: { id: randomBytes(16), name: 'aol peer', displayName: 'aol peer' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -8 },
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (credential === null) throw new Error('passkey creation was cancelled')
  await kvPut(CRED_KEY, credential.rawId)
  return credential.rawId
}

const evalPrf = async (credentialId: ArrayBuffer): Promise<Uint8Array> => {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (assertion === null) throw new Error('passkey assertion was cancelled')
  const outputs = assertion.getClientExtensionResults() as PrfOutputs
  const first = outputs.prf?.results?.first
  if (first === undefined)
    throw new Error('authenticator lacks the PRF extension')
  const seed = new Uint8Array(first)
  if (seed.length !== 32) throw new Error(`PRF output is ${seed.length} bytes`)
  return seed
}

export const passkeyIdentity = async (): Promise<Identity> => {
  const stored = await kvGet<ArrayBuffer>(CRED_KEY)
  const credentialId = stored ?? (await createPasskey())
  return identityFromSeed(await evalPrf(credentialId), 'PRF')
}
