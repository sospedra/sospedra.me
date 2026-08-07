import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, toHex, utf8 } from '../src/core/bytes.ts'
import { chainedWork } from '../src/core/congestion.ts'
import { verifyInclusion } from '../src/core/merkle.ts'
import { verifyVtd } from '../src/core/vtd.ts'
import {
  anchorArchiveDigest,
  createChainValidator,
  validateAnchor,
} from '../src/world/chain-validator.ts'
import { accountCommitment } from '../src/world/derivations.ts'
import { type DocketRecord, reconcile } from '../src/world/docket.ts'
import {
  createKeylessVerifier,
  transparencyReport,
} from '../src/world/keyless-verifier.ts'
import { tuned } from '../src/world/params.ts'
import { ES, GENERIC } from '../src/world/profile.ts'
import {
  congestionStampLeafHash,
  hashEnrollmentRecordV1,
  parseLeaf,
  TRACKS,
} from '../src/world/records.ts'
import {
  anchorSignedHead,
  buildUnsealLeaf,
  createAuthorization,
  createWorld,
  currentDifficulty,
  deriveBothOutOfInterface,
  detectionTag,
  enroll,
  enrollReusingProofNonce,
  enrollWithTamperedProof,
  evidencePublicKeys,
  issueOrder,
  logGate,
  openOuter,
  payDelayAndDecrypt,
  performUnseal,
  ratifyEmergencyUnseal,
  requiredDifficultyForTrack,
  scanForOwnTags,
  signHeadRecord,
  stampUnsealLeaf,
  unratifiedEmergencyAlarms,
  unsealCountsByTrack,
  warrantGate,
} from '../src/world/world.ts'

const PERSON = {
  fullLegalName: 'Ada Voss',
  dateOfBirth: '1990-04-12',
  documentNumber: 'ID-A-4472',
}

function mustEnroll(world: ReturnType<typeof createWorld>, doc: string) {
  const r = enroll(world, doc, PERSON)
  assert.ok(!('error' in r))
  return r
}

test('enrollment stores no identity and blocks duplicate documents', () => {
  const world = createWorld(GENERIC, { t: tuned(800) })
  const { record } = mustEnroll(world, 'DOC-1')
  const dump = JSON.stringify({
    commitment: toHex(record.identityCommitment),
    nullifier: toHex(record.documentNullifier),
    ciphertext: toHex(record.tracks.standard.outer.ciphertext),
    U: toHex(record.tracks.standard.U),
  })
  assert.ok(!dump.includes('Ada'))
  assert.ok(!dump.includes('ID-A-4472'))
  const dup = enroll(world, 'DOC-1', PERSON)
  assert.ok('error' in dup && dup.error === 'CREDENTIAL_ALREADY_ENROLLED')
})

test('the envelope carries a public commitment and a verifiable delay proof', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-VTD')
  const contributions = deriveBothOutOfInterface(world, record, {
    unsafe: true,
  })
  const opened = openOuter(world, record, contributions)
  assert.ok(opened, 'outer envelope should open for a holder of both secrets')
  const { envelope } = opened
  assert.equal(envelope.hS.length, 48, 'compressed G1')
  const expectations = { hS: envelope.hS, profile: world.policy.vtdProfile }
  assert.equal(verifyVtd(world.delayParams, envelope.proof, expectations), null)
  assert.equal(envelope.t, world.policy.t)
})

test('a repeated proof nonce is refused at the envelope layer', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const first = mustEnroll(world, 'DOC-NONCE-1')
  const refusal = enrollReusingProofNonce(world, 'DOC-NONCE-2', first.record)
  assert.match(String(refusal), /nonce/i)
})

test('an envelope whose proof does not match its commitment is refused at enrollment', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const refusal = enrollWithTamperedProof(world, 'DOC-BAD-VTD')
  assert.match(String(refusal), /vtd|commit/i)
})

test('the delay still binds a holder of both master secrets, and now it is provable', async () => {
  const world = createWorld(GENERIC, { t: tuned(2048) })
  const { record, attrs } = mustEnroll(world, 'DOC-BOTH')
  const contributions = deriveBothOutOfInterface(world, record, {
    unsafe: true,
  })
  const opened = openOuter(world, record, contributions)
  assert.ok(opened, 'outer envelope should open for a holder of both secrets')
  const expectations = {
    hS: opened.envelope.hS,
    profile: world.policy.vtdProfile,
  }
  assert.equal(
    verifyVtd(world.delayParams, opened.envelope.proof, expectations),
    null,
  )
  const identity = await payDelayAndDecrypt(world, { record, opened })
  assert.equal(identity?.attrs.fullLegalName, attrs.fullLegalName)
})

test('supported unseal recovers the enrolled identity under the default profile', async () => {
  const world = createWorld(GENERIC, { t: tuned(800) })
  const { record } = mustEnroll(world, 'DOC-2')
  const out = await performUnseal(world, record, {})
  assert.ok(out.ok)
  assert.equal(out.identity?.attrs.fullLegalName, 'Ada Voss')
})

test('unaccepted role refused, forged order refused, unknown role throws', async () => {
  const world = createWorld(GENERIC, { t: tuned(400) })
  const a = mustEnroll(world, 'DOC-3')
  const refused = await performUnseal(world, a.record, {
    role: 'agency',
    skipDelay: true,
  })
  assert.ok(!refused.ok && refused.refusal?.gate === 'warrant')
  const b = mustEnroll(world, 'DOC-4')
  const forged = await performUnseal(world, b.record, {
    forgedOrder: true,
    skipDelay: true,
  })
  assert.ok(!forged.ok && forged.refusal?.gate === 'warrant')
  await assert.rejects(
    performUnseal(world, b.record, { role: 'pope', skipDelay: true }),
  )
})

test('es profile accepts judge and prosecutor, refuses police', async () => {
  const world = createWorld(ES, { t: tuned(400) })
  for (const [role, expected] of [
    ['judge', true],
    ['prosecutor', true],
    ['police', false],
  ] as const) {
    const { record } = mustEnroll(world, `DOC-ES-${role}`)
    const out = await performUnseal(world, record, { role, skipDelay: true })
    assert.equal(out.ok, expected, role)
  }
})

test('reconcile joins unseal sightings against the docket with a horizon', () => {
  const docket: DocketRecord[] = [
    {
      authorizationHash: 'aa',
      publishedAtHeight: 10,
      caseSummary: 'case closed',
    },
  ]
  const sightings = [
    { authorizationHash: 'aa', anchorHeight: 5 },
    { authorizationHash: 'bb', anchorHeight: 5 },
    { authorizationHash: 'cc', anchorHeight: 18 },
  ]
  const statuses = reconcile(sightings, docket, {
    tipHeight: 20,
    horizonBlocks: 12,
  }).map((e) => e.status)
  assert.deepEqual(statuses, ['matched', 'overdue', 'pending'])
})

// --- D1: standard and emergency tracks (SIGE spec 5.5C) ---

test('enrollment produces one well-formed escrow envelope per track, with distinct keys', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-D1-TWO-TRACKS')

  for (const track of TRACKS) {
    const escrow = record.tracks[track]
    assert.ok(escrow, `${track} track was not enrolled`)
    assert.equal(escrow.U.length, 96)
    assert.ok(escrow.ciphertextHash.length === 32)
  }
  assert.notDeepEqual(
    record.tracks.standard.U,
    record.tracks.emergency.U,
    'both tracks reused one encapsulation',
  )
  assert.notDeepEqual(
    record.tracks.standard.ciphertextHash,
    record.tracks.emergency.ciphertextHash,
  )
})

test('the escrow context separates the tracks, so standard gate contributions cannot open the emergency ciphertext', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-D1-CONTEXT-SPLIT')

  const standardZ = deriveBothOutOfInterface(world, record, {
    unsafe: true,
    track: 'standard',
  })
  assert.ok(
    openOuter(world, record, standardZ, 'standard'),
    'positive control: standard contributions open the standard track',
  )
  assert.equal(
    openOuter(world, record, standardZ, 'emergency'),
    null,
    'standard contributions opened the emergency ciphertext',
  )

  const emergencyZ = deriveBothOutOfInterface(world, record, {
    unsafe: true,
    track: 'emergency',
  })
  assert.ok(openOuter(world, record, emergencyZ, 'emergency'))
  assert.equal(openOuter(world, record, emergencyZ, 'standard'), null)
})

test('an emergency unseal is exempt from congestion and carries its own leaf type', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-D1-EMERGENCY-LEAF')

  assert.ok(
    currentDifficulty(world) > 0,
    'positive control: the standard track demands real work',
  )
  assert.equal(requiredDifficultyForTrack(world, 'emergency'), 0)

  const outcome = await performUnseal(world, record, {
    track: 'emergency',
    skipDelay: true,
  })
  assert.equal(outcome.ok, true)
  assert.equal(outcome.stampDifficulty, 0)

  const leaf = parseLeaf(outcome.published?.leafBytes ?? new Uint8Array(0))
  assert.equal(leaf?.leaf_type, 'UNSEAL_EMERGENCY')
  assert.equal(leaf?.track, 'emergency')
})

test('an emergency unseal cannot launder itself onto a standard leaf', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-D1-LAUNDER')

  const { authorization: emergencyAuth } = createAuthorization(world, {
    record,
    order: issueOrder(
      world,
      world.profile.acceptedRoles[0] ?? 'court',
      'order-x',
    ),
    track: 'emergency',
  })
  const standardLeaf = buildUnsealLeaf(world, {
    ...emergencyAuth,
    track: 'standard',
    ciphertext_hash: record.tracks.standard.ciphertextHash,
  })

  const outcome = warrantGate(
    world,
    {
      auth: emergencyAuth,
      order: issueOrder(world, 'court', 'order-x'),
      leafBytes: standardLeaf.bytes,
    },
    record,
  )
  assert.equal(outcome.refused, true)
})

test('emergency unseals are counted apart and raise a public alarm when ratification is absent', async () => {
  const world = createWorld(GENERIC, {
    t: tuned(64),
    emergencyRatificationBlocks: 2,
  })
  const { record } = mustEnroll(world, 'DOC-D1-RATIFY')

  const outcome = await performUnseal(world, record, {
    track: 'emergency',
    skipDelay: true,
  })
  assert.equal(outcome.ok, true)
  assert.deepEqual(unsealCountsByTrack(world), { standard: 0, emergency: 1 })
  assert.equal(unratifiedEmergencyAlarms(world).length, 0)

  for (let i = 0; i < 8; i++) world.chain.mine(null)
  assert.equal(
    unratifiedEmergencyAlarms(world).length,
    1,
    'an unratified emergency unseal past its window must alarm',
  )

  const authHex = toHex(
    world.emergencyUnseals[0]?.authorizationHash ?? new Uint8Array(0),
  )
  assert.equal(ratifyEmergencyUnseal(world, authHex), true)
  assert.equal(unratifiedEmergencyAlarms(world).length, 0)
  assert.equal(ratifyEmergencyUnseal(world, authHex), false)
})

// --- C5: chain validator and detection tag ---

test('the chain validator refuses a rollback, a lower-work branch and a stale anchor, and prints ASSUMED when it accepts', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const validator = createChainValidator({
    minConfirmations: 2,
    freshnessBlocks: 5,
  })

  world.log.append(new Uint8Array([1]))
  const first = anchorSignedHead(world, signHeadRecord(world, null))
  world.chain.mine(null)
  world.chain.mine(null)

  const accepted = validateAnchor(validator, world.chain, first)
  assert.equal(accepted.accepted, true)
  if (!accepted.accepted) return
  assert.equal(accepted.tier, 'ASSUMED')
  assert.match(accepted.note, /not proof of publication/i)

  const rollback = validateAnchor(validator, world.chain, first)
  assert.equal(rollback.accepted, false)
  if (rollback.accepted) return
  assert.match(rollback.reason, /does not advance/i)

  const forged = { ...first, blockHash: new Uint8Array(32) }
  const forgedVerdict = validateAnchor(validator, world.chain, forged)
  assert.equal(forgedVerdict.accepted, false)

  world.log.append(new Uint8Array([2]))
  const second = anchorSignedHead(world, signHeadRecord(world, null))
  const tooFew = validateAnchor(validator, world.chain, second)
  assert.equal(tooFew.accepted, false)
  if (tooFew.accepted) return
  assert.match(tooFew.reason, /confirmations/i)

  for (let i = 0; i < 10; i++) world.chain.mine(null)
  const stale = validateAnchor(validator, world.chain, second)
  assert.equal(stale.accepted, false)
  if (stale.accepted) return
  assert.match(stale.reason, /freshness/i)

  assert.equal(anchorArchiveDigest(validator).length, 1)
})

test('an account finds its own detection tags in the public log, and an outsider holding the whole log cannot', () => {
  const mineKey = randomBytes(32)
  const otherKey = randomBytes(32)

  const published = [
    detectionTag(otherKey, 0),
    detectionTag(mineKey, 0),
    detectionTag(otherKey, 1),
    detectionTag(mineKey, 1),
    randomBytes(32),
  ]

  assert.deepEqual(scanForOwnTags(mineKey, published), [1, 3])
  assert.deepEqual(scanForOwnTags(otherKey, published), [0, 2])

  // An outsider holds every tag but no key. Without the key the tags are
  // indistinguishable from random, so no account can be linked to any of them.
  const outsiderGuesses = Array.from({ length: 200 }, () =>
    scanForOwnTags(randomBytes(32), published),
  ).flat()
  assert.deepEqual(
    outsiderGuesses,
    [],
    'a keyless outsider linked a tag to an account',
  )

  assert.notDeepEqual(detectionTag(mineKey, 0), detectionTag(mineKey, 1))
})

test('the log gate refuses a head inconsistent with the last one it accepted, and refuses a dropped proof', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record: first } = mustEnroll(world, 'DOC-C5-CONSISTENCY-1')
  const { record: second } = mustEnroll(world, 'DOC-C5-CONSISTENCY-2')

  const ok = await performUnseal(world, first, { skipDelay: true })
  assert.equal(ok.ok, true, 'positive control: the first unseal must succeed')
  assert.ok(
    world.logGateState.rootHash,
    'the gate must retain the root it accepted',
  )

  const order = issueOrder(
    world,
    world.profile.acceptedRoles[0] ?? 'court',
    'o',
  )
  const { authorization: auth } = createAuthorization(world, {
    record: second,
    order,
  })
  // The gate protocol: stamp the zeroed pre-image, then write the output into
  // the leaf that gets submitted. A leaf whose output does not match is refused.
  const unstamped = buildUnsealLeaf(world, auth)
  const stamp = chainedWork(
    world.logGateState.lastStampOutput,
    congestionStampLeafHash(unstamped.leaf),
    currentDifficulty(world),
  )
  const built = stampUnsealLeaf(unstamped, stamp.output)
  const leafIndex = world.log.append(built.bytes)
  const sth = signHeadRecord(world, null)
  const anchor = anchorSignedHead(world, sth)
  for (let i = 1; i < world.policy.k; i++) world.chain.mine(null)

  const dropped = logGate(
    world,
    {
      auth,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: world.log.inclusionProof(leafIndex),
      consistency: [],
      sth,
      anchor,
      stamp,
    },
    second,
  )
  assert.equal(dropped.refused, true, 'an empty consistency proof was accepted')
  if (!dropped.refused) return
  assert.match(dropped.reason, /not consistent/i)

  const honest = logGate(
    world,
    {
      auth,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: world.log.inclusionProof(leafIndex),
      consistency: world.log.consistencyProof(
        world.logGateState.treeSize,
        sth.tree_size,
      ),
      sth,
      anchor,
      stamp,
    },
    second,
  )
  assert.equal(honest.refused, false, 'the honest control must still pass')
})

test('one authorization releases once: replaying it at the log gate is refused', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-SINGLE-USE')
  const order = issueOrder(world, 'court', 'single-use')
  const { authorization } = createAuthorization(world, { record, order })
  const unstamped2 = buildUnsealLeaf(world, authorization)
  const replayStamp = chainedWork(
    world.logGateState.lastStampOutput,
    congestionStampLeafHash(unstamped2.leaf),
    currentDifficulty(world),
  )
  const built = stampUnsealLeaf(unstamped2, replayStamp.output)

  // ROW 19. The stamp pre-image zeroes the output field, so rewriting only that
  // field leaves verifyWork passing and the leaf genuinely included. Nothing
  // but the gate's own output check can refuse it, and without that check the
  // log publishes an output nobody verified.
  const mismatched = stampUnsealLeaf(unstamped2, randomBytes(32))
  const badIndex = world.log.append(mismatched.bytes)
  const badSth = signHeadRecord(world, null)
  const badAnchor = anchorSignedHead(world, badSth)
  for (let i = 1; i < world.policy.k; i++) world.chain.mine(null)
  const badOutput = logGate(
    world,
    {
      auth: authorization,
      leafBytes: mismatched.bytes,
      leafIndex: badIndex,
      inclusion: world.log.inclusionProof(badIndex),
      consistency: world.log.consistencyProof(
        world.logGateState.treeSize,
        badSth.tree_size,
      ),
      sth: badSth,
      anchor: badAnchor,
      stamp: replayStamp,
    },
    record,
  )
  assert.equal(
    badOutput.refused,
    true,
    'a mismatched stamp output was accepted',
  )
  if (!badOutput.refused) return
  assert.equal(
    badOutput.reason,
    'leaf does not carry the stamp output the gate verified',
  )

  const leafIndex = world.log.append(built.bytes)
  const sth = signHeadRecord(world, null)
  const anchor = anchorSignedHead(world, sth)
  for (let i = 1; i < world.policy.k; i++) world.chain.mine(null)

  const request = {
    auth: authorization,
    leafBytes: built.bytes,
    leafIndex,
    inclusion: world.log.inclusionProof(leafIndex),
    consistency: world.log.consistencyProof(
      world.logGateState.treeSize,
      sth.tree_size,
    ),
    sth,
    anchor,
    stamp: replayStamp,
  }
  const first = logGate(world, request, record)
  assert.equal(
    first.refused,
    false,
    'positive control: the first release passes',
  )

  const replay = logGate(world, request, record)
  assert.equal(replay.refused, true, 'one authorization released twice')
  if (!replay.refused) return
  assert.match(replay.reason, /already released/i)
})

test('a record from another network is refused rather than merely hashing differently', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const foreign = { ...world, networkId: utf8('other-net') }
  const { record } = mustEnroll(world, 'DOC-C5-NETWORK')

  assert.ok(
    openOuter(
      world,
      record,
      deriveBothOutOfInterface(world, record, { unsafe: true }),
      'standard',
    ),
    'positive control: the issuing network opens its own record',
  )
  assert.equal(
    openOuter(
      foreign,
      record,
      deriveBothOutOfInterface(foreign, record, { unsafe: true }),
      'standard',
    ),
    null,
    'a foreign network opened a record it did not issue',
  )
})

// --- the spec 7.5/7.7 verifier now runs inside enroll() ---

test('enroll() runs the spec verifier, and a package it refuses does not become a record', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const before = world.log.size()

  const ok = enroll(world, 'DOC-WIRED-1', PERSON)
  assert.ok(
    !('error' in ok),
    'positive control: an honest enrollment is accepted',
  )
  if ('error' in ok) return

  // The verifier ran for real: it reserved the server nonce it consumed.
  assert.equal(world.seenServerNonces.size, 1)
  assert.ok(world.log.size() > before)

  // A tampered proof is refused by the envelope layer before the verifier,
  // and nothing is written.
  const nullifiersBefore = world.nullifiers.size
  const tampered = enrollWithTamperedProof(world, 'DOC-WIRED-2')
  assert.notEqual(tampered, null)
  assert.equal(
    world.nullifiers.size,
    nullifiersBefore,
    'a refused enrollment left its nullifier reserved',
  )
})

test('enroll() reports which spec 7.5 conditions are placeholders rather than hiding them', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const result = enroll(world, 'DOC-WIRED-3', PERSON)
  assert.ok(!('error' in result))
  if ('error' in result) return

  const joined = result.placeholderConditions.join(' ')

  // Conditions 1 to 5 need a PKI this codebase does not have.
  for (const n of [1, 2, 3, 4, 5]) {
    assert.match(joined, new RegExp(`condition ${n}:`))
  }
  // The adapter also cannot make these independent, and says so.
  assert.match(joined, /condition 11 \(expiry half\)/)
  assert.match(joined, /step 2:/)
  assert.match(joined, /step 3 \(delay profile\)/)

  // The genuinely checked conditions must NOT be excused as placeholders.
  for (const n of [6, 7, 8, 9, 10]) {
    assert.doesNotMatch(joined, new RegExp(`condition ${n}:`))
  }
  assert.doesNotMatch(joined, /pi_vtd/)
})

test('STEP 4: the leaf the log actually holds is a canonical ENROLLMENT_ACCEPTED record commitment', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const before = world.log.size()
  const enrolled = mustEnroll(world, 'DOC-STEP4')
  assert.equal(world.log.size(), before + 1)

  // Read the leaf OUT of the log. Rebuilding it here would only prove the
  // test agrees with itself, which is what the previous version did.
  const { bytes, index, blinding } = enrolled.acceptedLeaf
  const head = world.log.signHead()
  assert.equal(
    verifyInclusion(
      bytes,
      index,
      head.treeSize,
      world.log.inclusionProof(index),
      head.rootHash,
    ),
    true,
    'the returned leaf is not included in the log',
  )

  const leaf = parseLeaf(bytes)
  assert.ok(leaf, 'the enrollment leaf does not decode as a LogLeafV1')
  assert.equal(leaf.leaf_type, 'ENROLLMENT_ACCEPTED')

  // It commits the hash of the exact persisted record.
  assert.deepEqual(
    leaf.authorization_hash,
    hashEnrollmentRecordV1(enrolled.record.stored),
  )
  const mutated = {
    ...enrolled.record.stored,
    escrow_epoch: enrolled.record.stored.escrow_epoch + 1,
  }
  assert.notDeepEqual(hashEnrollmentRecordV1(mutated), leaf.authorization_hash)

  // The account commitment can be opened, and its blinding is NOT the
  // identity-commitment opening.
  assert.deepEqual(
    leaf.account_commitment,
    accountCommitment(enrolled.record.accountId, blinding),
  )
  assert.notDeepEqual(
    leaf.account_commitment,
    accountCommitment(enrolled.record.accountId, randomBytes(32)),
  )
})

test('STEP 4: the transparency report now decodes the enrollment leaf instead of counting it undecodable', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const enrolled = mustEnroll(world, 'DOC-STEP4-REPORT')
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)

  const enrollmentBytes = enrolled.acceptedLeaf.bytes
  const report = transparencyReport(
    createKeylessVerifier({
      evidenceKeys: evidencePublicKeys(world),
      congestionPolicy: world.policy.congestion,
    }),
    {
      log: {
        heads: [world.log.signHead()],
        leaves: [
          {
            index: enrolled.acceptedLeaf.index,
            bytes: enrollmentBytes,
            inclusionProof: world.log.inclusionProof(
              enrolled.acceptedLeaf.index,
            ),
          },
          {
            index: published.leafIndex,
            bytes: published.leafBytes,
            inclusionProof: world.log.inclusionProof(published.leafIndex),
          },
        ],
        anchors: [published.anchor],
      },
      chain: world.chain,
      docket: [],
      horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
      pinnedHead: world.log.signHead(),
    },
  )

  assert.equal(
    report.notIncluded + report.unparsable,
    0,
    'an enrollment leaf was undecodable',
  )
  assert.deepEqual(report.enrollmentsByEpoch, { 1: 1 })
  assert.deepEqual(report.unsealsByTrack, { standard: 1, emergency: 0 })
})

// THIRTEENTH-REVIEW regression. The gate stored the caller's Uint8Array by
// reference, so one array was the published leaf field, the stamp output, the
// gate's chain head and the next bundle's starting value at once. A single
// `.set()` on a public artifact rewrote the gate's memory.
test('the log gate copies its monotonic state instead of aliasing the caller', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const record = mustEnroll(world, 'DOC-ALIAS').record
  const order = issueOrder(world, 'court', 'order-alias')
  const { authorization } = createAuthorization(world, { record, order })
  const unstamped = buildUnsealLeaf(world, authorization)
  const stamp = chainedWork(
    world.logGateState.lastStampOutput,
    congestionStampLeafHash(unstamped.leaf),
    currentDifficulty(world),
  )
  const built = stampUnsealLeaf(unstamped, stamp.output)
  const leafIndex = world.log.append(built.bytes)
  const sth = signHeadRecord(world, null)
  const anchor = anchorSignedHead(world, sth)
  for (let i = 1; i < world.policy.k; i++) world.chain.mine(null)

  const released = logGate(
    world,
    {
      auth: authorization,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: world.log.inclusionProof(leafIndex),
      consistency: world.log.consistencyProof(0, sth.tree_size),
      sth,
      anchor,
      stamp,
    },
    record,
  )
  assert.equal(released.refused, false, 'positive control')

  const beforeStamp = toHex(world.logGateState.lastStampOutput)
  const beforeRoot = toHex(world.logGateState.rootHash ?? new Uint8Array(0))
  // The operator writes through the artifacts it already published.
  stamp.output.set(new Uint8Array(32).fill(0x41))
  sth.root_hash.set(new Uint8Array(32).fill(0x42))
  assert.equal(
    toHex(world.logGateState.lastStampOutput),
    beforeStamp,
    'the gate chain head aliased the caller stamp',
  )
  assert.equal(
    toHex(world.logGateState.rootHash ?? new Uint8Array(0)),
    beforeRoot,
    'the gate root hash aliased the caller head',
  )
})

// THIRTEENTH-REVIEW regression. ZERO_STAMP_OUTPUT was one module-level array
// handed to every zeroed leaf, so one write through any leaf moved every stamp
// pre-image in the process and poisoned every later enrollment leaf.
test('the zero stamp output is a fresh buffer per leaf', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const record = mustEnroll(world, 'DOC-ZERO').record
  const order = issueOrder(world, 'court', 'order-zero')
  const { authorization } = createAuthorization(world, { record, order })
  const first = buildUnsealLeaf(world, authorization)
  const other = buildUnsealLeaf(world, authorization)
  const beforeOther = toHex(congestionStampLeafHash(other.leaf))

  first.leaf.congestion_stamp_output.set(new Uint8Array(32).fill(0xff))

  assert.equal(
    toHex(congestionStampLeafHash(other.leaf)),
    beforeOther,
    'writing through one leaf moved another leaf stamp pre-image',
  )
  assert.equal(
    toHex(buildUnsealLeaf(world, authorization).leaf.congestion_stamp_output),
    toHex(new Uint8Array(32)),
    'a fresh leaf inherited a poisoned zero buffer',
  )
})
