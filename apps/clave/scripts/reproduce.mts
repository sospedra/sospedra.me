// Emits every number the paper cites. One command, so a reader can check the
// tables instead of trusting them.
//
//   node --experimental-strip-types scripts/reproduce.mts
//
// Soundness figures are computed from the formulas and reproduce exactly on
// every host and every run. Sizes and timings do not, and the output says so.

import { cpus, totalmem } from 'node:os'

import { bls12_381 } from '@noble/curves/bls12-381.js'
import { ed25519, x25519 } from '@noble/curves/ed25519.js'

import { MockBeacon } from '../src/beacon/beacon.ts'
import { MockChain } from '../src/chain/chain.ts'
import { bytesToBigInt, randomBytes, toHex } from '../src/core/bytes.ts'
import { derive, setup } from '../src/core/ibe.ts'
import {
  chipChallenge,
  encodeData,
  type PassportData,
} from '../src/enrollment/relation.ts'
import {
  corruptionFloor,
  passProbability,
  prove,
  recover,
  soundnessBits,
  verify,
  worstCaseDecryptions,
} from '../src/escrow/proof.ts'
import {
  acceptEnrollment,
  newPlatform,
  requestUnseal,
  sealOnDevice,
  serveRequest,
} from '../src/protocol.ts'

const Fr = bls12_381.fields.Fr

function ms<T>(fn: () => T): { ms: number; value: T } {
  const start = process.hrtime.bigint()
  const value = fn()
  return { ms: Number(process.hrtime.bigint() - start) / 1e6, value }
}

const PROFILES = [
  { n: 24, k: 7, o: 6 },
  { n: 120, k: 25, o: 24 },
  { n: 126, k: 26, o: 25 },
  { n: 130, k: 27, o: 26 },
]

const lines: string[] = []
const say = (s: string) => lines.push(s)

const cpu = cpus()
say('CLAVE reproducibility report')
say('')
say(
  `host   ${cpu[0]?.model ?? 'unknown'} x${cpu.length}, ` +
    `${Math.round(totalmem() / 1e9)} GB, node ${process.version}`,
)
say('')

say('# Table 1: escrow proof parameters. Exact on every host and every run.')
for (const p of PROFILES) {
  say(
    `${`soundness[n=${p.n},k=${p.k},o=${p.o}]`.padEnd(34)}${soundnessBits(p).toFixed(2)} bits   b=${corruptionFloor(p)}   worst-case decryptions ${worstCaseDecryptions(p)}`,
  )
}
say('')

say('# Figure 5: probability a cheating prover survives one round, n=130 o=26.')
const REF = PROFILES[3] ?? { n: 130, k: 27, o: 26 }
for (const b of [1, 2, 5, 13, 34, 65, 78]) {
  say(`${`pass[b=${b}]`.padEnd(34)}${passProbability(REF, b).toExponential(3)}`)
}
say('')

// -- measured, host specific ------------------------------------------------

const master = setup()
const secret = Fr.create(bytesToBigInt(randomBytes(48))) || 1n
const accountId = 'acct-reproduce'

const proved = ms(() => prove(master.mpk, accountId, secret, REF))
const proof = proved.value
const verified = ms(() => verify(master.mpk, proof, proof.hS))
if (verified.value !== null)
  throw new Error(`proof did not verify: ${verified.value}`)
const key = derive(master, accountId)
const recovered = ms(() => recover(key, proof))
if (!recovered.value.ok) throw new Error('recovery failed')
if (recovered.value.secret !== secret)
  throw new Error('recovered the wrong secret')

const proofBytes = JSON.stringify(proof, (_k, v) =>
  v instanceof Uint8Array
    ? Buffer.from(v).toString('base64')
    : typeof v === 'bigint'
      ? String(v)
      : v,
).length

say('# Measured. Timings are host specific. Sizes vary a little per run.')
say(`${'escrow.prove'.padEnd(34)}${Math.round(proved.ms)} ms`)
say(`${'escrow.verify'.padEnd(34)}${Math.round(verified.ms)} ms`)
say(`${'escrow.recover'.padEnd(34)}${Math.round(recovered.ms)} ms`)
say(
  `${'escrow.recover_decryptions'.padEnd(34)}${recovered.value.decryptions} of at most ${worstCaseDecryptions(REF)}`,
)
say(`${'escrow.record_size'.padEnd(34)}${proofBytes} bytes (json, base64)`)
say('')

// -- end to end -------------------------------------------------------------

const country = ed25519.utils.randomSecretKey()
const countryPub = ed25519.getPublicKey(country)
const chip = ed25519.utils.randomSecretKey()
const serverNonce = randomBytes(32)
const data: PassportData = {
  documentNumber: 'DOC-REPRODUCE',
  fullName: 'A REAL PERSON',
  dateOfBirth: '1990-01-01',
  nationality: 'XX',
  chipPublicKey: ed25519.getPublicKey(chip),
}
const witness = {
  data,
  countrySignature: ed25519.sign(encodeData(data), country),
  chipSignature: ed25519.sign(chipChallenge('acct-e2e', serverNonce), chip),
  secret: Fr.create(bytesToBigInt(randomBytes(48))) || 1n,
  sealNonce: randomBytes(24),
}

const platform = newPlatform([countryPub])
const sealed = ms(() =>
  sealOnDevice(master.mpk, {
    accountId: 'acct-e2e',
    serverNonce,
    witness,
    profile: REF,
  }),
)
const accepted = ms(() =>
  acceptEnrollment(platform, master.mpk, sealed.value, witness),
)
if (!accepted.value.ok)
  throw new Error(`enrollment refused: ${accepted.value.reason}`)

const chain = new MockChain()
const beacon = new MockBeacon()
const requesterSecret = x25519.utils.randomSecretKey()
await requestUnseal(chain, {
  accountId: 'acct-e2e',
  reason: 'judicial case-0001',
  requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
})
chain.advance(6)
const served = await serveRequest(
  master,
  chain,
  beacon,
  { minConfirmations: 6, disclosureDelayRounds: 90 },
  { accountId: 'acct-e2e', reason: 'judicial case-0001' },
)
if (!served.ok) throw new Error(`serve refused: ${served.reason}`)

say('# End to end, mock chain and mock beacon.')
say(`${'e2e.seal_on_device'.padEnd(34)}${Math.round(sealed.ms)} ms`)
say(`${'e2e.platform_accept'.padEnd(34)}${Math.round(accepted.ms)} ms`)
say(`${'e2e.disclosure_sealed_until'.padEnd(34)}round ${served.capsule.round}`)
say(
  `${'e2e.disclosure_before_round'.padEnd(34)}${beacon.tryOpen(served.capsule) === null ? 'closed' : 'OPEN (defect)'}`,
)
beacon.advanceTo(served.capsule.round)
const opened = beacon.tryOpen(served.capsule)
say(
  `${'e2e.disclosure_after_round'.padEnd(34)}${opened ? 'open' : 'CLOSED (defect)'}`,
)
say('')
say('Soundness and probabilities are exact. Timings and sizes are not.')

process.stdout.write(`${lines.join('\n')}\n`)
