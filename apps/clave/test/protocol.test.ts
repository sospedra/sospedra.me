import assert from 'node:assert/strict'
import { test } from 'node:test'

import { bls12_381 } from '@noble/curves/bls12-381.js'
import { ed25519, x25519 } from '@noble/curves/ed25519.js'

import { MockBeacon } from '../src/beacon/beacon.ts'
import { MockChain } from '../src/chain/chain.ts'
import { bytesToBigInt, randomBytes, toHex } from '../src/core/bytes.ts'
import { setup } from '../src/core/ibe.ts'
import {
  chipChallenge,
  encodeData,
  nullifierFor,
  type PassportData,
  type Witness,
} from '../src/enrollment/relation.ts'
import { prove as proveEscrow } from '../src/escrow/proof.ts'
import {
  acceptEnrollment,
  newPlatform,
  openDeliveredKey,
  openSealedIdentity,
  requestUnseal,
  sealOnDevice,
  serveRequest,
} from '../src/protocol.ts'

const Fr = bls12_381.fields.Fr
const FAST = { n: 16, k: 6, o: 5 }

const country = ed25519.utils.randomSecretKey()
const requesterSecret = x25519.utils.randomSecretKey()
const countryPub = ed25519.getPublicKey(country)

function passport(docNumber: string, chipPub: Uint8Array): PassportData {
  return {
    documentNumber: docNumber,
    fullName: 'A REAL PERSON',
    dateOfBirth: '1990-01-01',
    nationality: 'XX',
    chipPublicKey: chipPub,
  }
}

function witnessFor(
  docNumber: string,
  accountId: string,
  serverNonce: Uint8Array,
): Witness {
  const chip = ed25519.utils.randomSecretKey()
  const data = passport(docNumber, ed25519.getPublicKey(chip))
  return {
    data,
    countrySignature: ed25519.sign(encodeData(data), country),
    chipSignature: ed25519.sign(chipChallenge(accountId, serverNonce), chip),
    secret: Fr.create(bytesToBigInt(randomBytes(48))) || 1n,
    sealNonce: randomBytes(24),
  }
}

function enrollInput(docNumber: string, accountId: string) {
  const serverNonce = randomBytes(32)
  return {
    accountId,
    serverNonce,
    witness: witnessFor(docNumber, accountId, serverNonce),
    profile: FAST,
  }
}

test('an honest enrollment is accepted and the platform stores no plaintext', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const input = enrollInput('DOC-1', 'acct-1')
  const record = sealOnDevice(master.mpk, input)

  const result = acceptEnrollment(platform, master.mpk, record, input.witness)
  assert.equal(result.ok, true)

  // What the platform holds, serialised. The holder's name must not appear.
  const stored = JSON.stringify(platform.records.get('acct-1'), (_k, v) =>
    v instanceof Uint8Array ? toHex(v) : typeof v === 'bigint' ? String(v) : v,
  )
  assert.ok(!stored.includes('A REAL PERSON'), 'plaintext name reached storage')
  assert.ok(!stored.includes('DOC-1'), 'document number reached storage')
  assert.ok(!stored.includes(String(input.witness.secret)), 'secret was stored')
})

test('paper Equation 10: sealed bytes that are not the signed identity are refused', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const input = enrollInput('DOC-2', 'acct-2')
  const record = sealOnDevice(master.mpk, input)

  // ISOLATING. The substituted data must pass every earlier check, or this
  // test would assert a refusal it did not cause. So the second identity keeps
  // the same document number (same nullifier) and the same chip key (same chip
  // response), and the country signs it too. Only the seal binding can catch
  // it. An earlier version of this test used a regex alternation and hid the
  // fact that this guard was undefended.
  const other = { ...input.witness.data, fullName: 'SOMEBODY ELSE' }
  const lying: Witness = {
    ...input.witness,
    data: other,
    countrySignature: ed25519.sign(encodeData(other), country),
  }
  const result = acceptEnrollment(platform, master.mpk, record, lying)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(
    result.reason,
    'the sealed bytes are not the signed identity under this key',
  )
})

test('paper Equation 5: a passport no country signed is refused', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const input = enrollInput('DOC-UNSIGNED', 'acct-unsigned')
  const record = sealOnDevice(master.mpk, input)

  // Everything else stays valid: same data, same chip response, same seal.
  // Only the country signature is from a key nobody trusts.
  const rogue = ed25519.utils.randomSecretKey()
  const forged: Witness = {
    ...input.witness,
    countrySignature: ed25519.sign(encodeData(input.witness.data), rogue),
  }
  const result = acceptEnrollment(platform, master.mpk, record, forged)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, 'no trusted country key signed these data groups')
})

test('paper Equation 7: a chip response for another account does not transfer', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const first = enrollInput('DOC-3', 'acct-3')

  // Same passport and same chip signature, replayed into a different account.
  const replay = {
    ...first,
    accountId: 'acct-other',
    witness: first.witness,
  }
  const record = sealOnDevice(master.mpk, replay)
  const result = acceptEnrollment(platform, master.mpk, record, replay.witness)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.reason, /chip did not answer this challenge/)
})

test('paper Equation 8: one document enrolls once', () => {
  const master = setup()
  const platform = newPlatform([countryPub])

  const a = enrollInput('DOC-SAME', 'acct-a')
  assert.equal(
    acceptEnrollment(
      platform,
      master.mpk,
      sealOnDevice(master.mpk, a),
      a.witness,
    ).ok,
    true,
  )

  const b = enrollInput('DOC-SAME', 'acct-b')
  const second = acceptEnrollment(
    platform,
    master.mpk,
    sealOnDevice(master.mpk, b),
    b.witness,
  )
  assert.equal(second.ok, false)
  if (second.ok) return
  assert.match(second.reason, /already enrolled/)

  // And the nullifier really is document-derived, not account-derived.
  assert.equal(
    toHex(nullifierFor(a.witness.data)),
    toHex(nullifierFor(b.witness.data)),
  )
})

test('the escrow proof must name the account being enrolled', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const victim = enrollInput('DOC-V', 'acct-victim')

  // ISOLATING, and it takes some care to reach this guard. The credential
  // statement must be genuinely for acct-victim, so the account-binding check
  // passes, AND the escrow proof must commit the same secret, so the hS check
  // passes too. Only then does the escrow account name remain as the sole
  // discrepancy.
  const victimRecord = sealOnDevice(master.mpk, victim)
  const elsewhere = proveEscrow(
    master.mpk,
    'acct-somewhere-else',
    victim.witness.secret,
    FAST,
  )
  const spliced = {
    accountId: 'acct-victim',
    statement: victimRecord.statement,
    escrow: elsewhere,
  }
  const result = acceptEnrollment(platform, master.mpk, spliced, victim.witness)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, 'escrow proof is for another account')
})

test('a credential proof for one account cannot be reused under another', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const a = enrollInput('DOC-REUSE', 'acct-A')

  // The chip answered a challenge bound to acct-A. Submitting that statement
  // under acct-B would carry the binding to the wrong place.
  const record = sealOnDevice(master.mpk, a)
  const moved = { ...record, accountId: 'acct-B' }
  const result = acceptEnrollment(platform, master.mpk, moved, a.witness)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.reason, 'credential proof is for another account')
})

test('the platform trusts its own country keys, never the ones submitted', () => {
  const master = setup()
  const rogue = ed25519.utils.randomSecretKey()
  const chip = ed25519.utils.randomSecretKey()
  const serverNonce = randomBytes(32)
  const data = {
    documentNumber: 'DOC-SELFSIGNED',
    fullName: 'INVENTED PERSON',
    dateOfBirth: '1990-01-01',
    nationality: 'XX',
    chipPublicKey: ed25519.getPublicKey(chip),
  }
  const witness: Witness = {
    data,
    countrySignature: ed25519.sign(encodeData(data), rogue),
    chipSignature: ed25519.sign(chipChallenge('acct-self', serverNonce), chip),
    secret: Fr.create(bytesToBigInt(randomBytes(48))) || 1n,
    sealNonce: randomBytes(24),
  }
  const record = sealOnDevice(master.mpk, {
    accountId: 'acct-self',
    serverNonce,
    witness,
    profile: FAST,
  })

  // A platform configured with the real country key refuses, even though the
  // passport is internally consistent and self-signed.
  const honest = newPlatform([countryPub])
  const refused = acceptEnrollment(honest, master.mpk, record, witness)
  assert.equal(refused.ok, false)
  if (refused.ok) return
  assert.equal(
    refused.reason,
    'no trusted country key signed these data groups',
  )

  // Positive control: a platform that DID trust that key would accept, which
  // is why the key set must never come from the submission.
  const naive = newPlatform([ed25519.getPublicKey(rogue)])
  assert.equal(acceptEnrollment(naive, master.mpk, record, witness).ok, true)
})

test('a witness that answers differently on each read is snapshotted', () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const real = enrollInput('DOC-TWOFACED', 'acct-twofaced')
  const record = sealOnDevice(master.mpk, real)

  const garbage = { ...real.witness.data, fullName: 'SEALED GARBAGE' }
  let reads = 0
  const twoFaced: Witness = {
    ...real.witness,
    get data() {
      reads++
      return reads <= 2 ? real.witness.data : garbage
    },
  }
  const result = acceptEnrollment(platform, master.mpk, record, twoFaced)
  // Whatever it decides, it must decide on ONE identity. The snapshot reads
  // the getter once, so the later answers never reach a check.
  assert.equal(reads, 1, `witness data was read ${reads} times, not once`)
  assert.equal(result.ok, true, 'the first, honest answer should be accepted')
})

test('paper Section 3.8: no key exists without a confirmed on-chain request', async () => {
  const master = setup()
  const chain = new MockChain()
  const beacon = new MockBeacon()
  const input = { accountId: 'acct-noreq', reason: 'judicial NIG-0001' }
  const posted = {
    accountId: 'acct-noreq',
    reason: 'judicial NIG-0001',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  }
  const policy = { minConfirmations: 6, disclosureDelayRounds: 90 }

  // Nothing posted yet.
  const early = await serveRequest(master, chain, beacon, policy, input)
  assert.equal(early.ok, false)
  if (early.ok) return
  assert.match(early.reason, /no confirmed on-chain request/)

  // Posted, but not yet buried deep enough.
  await requestUnseal(chain, posted)
  const shallow = await serveRequest(master, chain, beacon, policy, input)
  assert.equal(shallow.ok, false)

  chain.advance(6)
  const served = await serveRequest(master, chain, beacon, policy, input)
  assert.equal(served.ok, true)
})

test('end to end: seal, request, serve, recover, disclose', async () => {
  const master = setup()
  const platform = newPlatform([countryPub])
  const chain = new MockChain()
  const beacon = new MockBeacon()

  const input = enrollInput('DOC-E2E', 'acct-e2e')
  const record = sealOnDevice(master.mpk, input)
  assert.equal(
    acceptEnrollment(platform, master.mpk, record, input.witness).ok,
    true,
  )

  const unseal = {
    accountId: 'acct-e2e',
    reason: 'judicial NIG-2026-0042',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  }
  await requestUnseal(chain, unseal)
  chain.advance(6)

  const policy = { minConfirmations: 6, disclosureDelayRounds: 90 }
  const served = await serveRequest(master, chain, beacon, policy, {
    accountId: 'acct-e2e',
    reason: 'judicial NIG-2026-0042',
  })
  assert.equal(served.ok, true)
  if (!served.ok) return

  // The key arrives sealed to the requester, never in the clear.
  const key = openDeliveredKey('acct-e2e', requesterSecret, served.sealedKey)
  assert.ok(key, 'the requester could not open the delivered key')
  const opened = openSealedIdentity(record, key)
  assert.ok(opened, 'recovery failed with the served key')

  // The disclosure is sealed until the beacon reaches the round.
  assert.equal(beacon.tryOpen(served.capsule), null)
  beacon.advanceTo(90)
  const disclosed = beacon.tryOpen(served.capsule)
  assert.ok(disclosed)
  assert.match(new TextDecoder().decode(disclosed), /account=acct-e2e/)
})

test('the disclosure opens whether or not the platform cooperates', async () => {
  const master = setup()
  const chain = new MockChain()
  const beacon = new MockBeacon()
  const unseal = {
    accountId: 'acct-silent',
    reason: 'administrative ref-9',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  }
  await requestUnseal(chain, unseal)
  chain.advance(2)
  const served = await serveRequest(
    master,
    chain,
    beacon,
    { minConfirmations: 1, disclosureDelayRounds: 42 },
    { accountId: 'acct-silent', reason: 'administrative ref-9' },
  )
  assert.equal(served.ok, true)
  if (!served.ok) return

  // The platform does nothing at all from here. Time passes anyway.
  beacon.advanceTo(served.capsule.round)
  const disclosed = beacon.tryOpen(served.capsule)
  assert.ok(disclosed, 'silence extended the secrecy window')
  assert.match(new TextDecoder().decode(disclosed), /account=acct-silent/)
})

test('the count of requests is public even while targets are hidden', async () => {
  const chain = new MockChain()
  for (const id of ['a', 'b', 'c']) {
    await requestUnseal(chain, {
      accountId: `acct-${id}`,
      reason: `judicial case-${id}`,
      requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
    })
  }
  chain.advance(3)
  const seen = await chain.observeRequests(1)
  assert.equal(seen.length, 3, 'an observer cannot count the requests')
  // The account is not readable from the request.
  assert.ok(!JSON.stringify(seen).includes('acct-a'))
})

test('the stated reason must match the hash committed on chain', async () => {
  const master = setup()
  const chain = new MockChain()
  const beacon = new MockBeacon()
  await requestUnseal(chain, {
    accountId: 'acct-reason',
    reason: 'judicial case-ORIGINAL',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  })
  chain.advance(6)
  const policy = { minConfirmations: 6, disclosureDelayRounds: 90 }

  // A reason revised after the outcome is known. The hash was fixed at
  // request time, so the network refuses.
  const revised = await serveRequest(master, chain, beacon, policy, {
    accountId: 'acct-reason',
    reason: 'judicial case-REVISED',
  })
  assert.equal(revised.ok, false)
  if (revised.ok) return
  assert.equal(revised.reason, 'reason does not match the committed hash')

  const honest = await serveRequest(master, chain, beacon, policy, {
    accountId: 'acct-reason',
    reason: 'judicial case-ORIGINAL',
  })
  assert.equal(honest.ok, true, 'positive control')
})

test('the disclosure schedule comes from policy, never from the requester', async () => {
  const master = setup()
  const chain = new MockChain()
  const beacon = new MockBeacon()
  await requestUnseal(chain, {
    accountId: 'acct-schedule',
    reason: 'judicial case-1',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  })
  chain.advance(6)

  beacon.advanceTo(1000)
  const served = await serveRequest(
    master,
    chain,
    beacon,
    { minConfirmations: 6, disclosureDelayRounds: 90 },
    { accountId: 'acct-schedule', reason: 'judicial case-1' },
  )
  assert.equal(served.ok, true)
  if (!served.ok) return

  // Current round plus the policy delay. A platform that could choose this
  // would push the round far enough out that the disclosure never opens.
  assert.equal(served.capsule.round, 1090)
})

test('the delivered key is sealed to the requester, not handed over', async () => {
  const master = setup()
  const chain = new MockChain()
  const beacon = new MockBeacon()
  await requestUnseal(chain, {
    accountId: 'acct-delivery',
    reason: 'judicial case-2',
    requesterPubKey: toHex(x25519.getPublicKey(requesterSecret)),
  })
  chain.advance(6)
  const served = await serveRequest(
    master,
    chain,
    beacon,
    { minConfirmations: 6, disclosureDelayRounds: 90 },
    { accountId: 'acct-delivery', reason: 'judicial case-2' },
  )
  assert.equal(served.ok, true)
  if (!served.ok) return

  // The right requester opens it.
  const key = openDeliveredKey(
    'acct-delivery',
    requesterSecret,
    served.sealedKey,
  )
  assert.ok(key, 'the committed requester could not open the key')

  // Anyone else does not.
  const stranger = x25519.utils.randomSecretKey()
  assert.equal(
    openDeliveredKey('acct-delivery', stranger, served.sealedKey),
    null,
    'a stranger opened the delivered key',
  )
})
