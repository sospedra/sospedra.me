import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bytesEqual, randomBytes, toHex, utf8 } from '../src/core/bytes.ts'
import { chainedWork } from '../src/core/congestion.ts'
import { dhash } from '../src/core/hash.ts'
import { leafHash } from '../src/core/merkle.ts'
import { SUBMITTER_REFUSAL_MESSAGE } from '../src/world/enrollment-verifier.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import {
  decodeDisclosureV1,
  disclosureV1,
  disclosureV1Cbor,
  encodeDisclosureV1,
  RECORD_SCHEMA_VERSION,
} from '../src/world/records.ts'
import {
  anchorSignedHead,
  buildUnsealLeaf,
  createAuthorization,
  createWorld,
  currentDifficulty,
  deriveBothOutOfInterface,
  type EnrollmentRecord,
  enroll,
  enrollReusingProofNonce,
  enrollWithTamperedProof,
  issueOrder,
  logGate,
  openOuter,
  payDelayAndDecrypt,
  performUnseal,
  signHeadRecord,
  warrantGate,
} from '../src/world/world.ts'

// SIGE spec 18.2 conformance suite. Every MUST-fail is a named test. A
// passing unseal in any MUST-fail test is a build failure, not a warning.

const PERSON = {
  fullLegalName: 'Conformance Subject',
  dateOfBirth: '1988-02-02',
  documentNumber: 'ID-CONF-1',
}

function world() {
  return createWorld(GENERIC, { t: tuned(64) })
}

function mustEnroll(w: ReturnType<typeof createWorld>, doc: string) {
  const result = enroll(w, doc, { ...PERSON, documentNumber: doc })
  assert.ok(!('error' in result), `fixture enrollment failed for ${doc}`)
  if ('error' in result) throw new Error('unreachable')
  return result
}

function bothContributions(
  w: ReturnType<typeof createWorld>,
  record: EnrollmentRecord,
) {
  return deriveBothOutOfInterface(w, record, { unsafe: true })
}

// 18.2 MUST-fail: a ciphertext bound to another account must not open.
test('18.2 wrong-account ciphertext does not open', () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-A')
  const b = mustEnroll(w, 'DOC-CONF-B')

  assert.ok(
    openOuter(w, a.record, bothContributions(w, a.record), 'standard'),
    'positive control: the matching record opens',
  )
  const crossed: EnrollmentRecord = { ...a.record, tracks: b.record.tracks }
  assert.equal(
    openOuter(w, crossed, bothContributions(w, crossed), 'standard'),
    null,
  )
})

// 18.2 MUST-fail: a commitment paired with an unrelated ciphertext.
test('18.2 identity commitment paired with an unrelated ciphertext does not verify', async () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-C')
  const b = mustEnroll(w, 'DOC-CONF-D')

  const opened = openOuter(w, b.record, bothContributions(w, b.record))
  assert.ok(opened, 'positive control: b opens its own envelope')
  const identity = await payDelayAndDecrypt(w, { record: b.record, opened })
  assert.ok(identity)

  const commitment = dhash(
    'commitment',
    utf8(JSON.stringify(identity.attrs)),
    a.record.accountPublicKey,
    identity.opening,
  )
  assert.equal(bytesEqual(commitment, a.record.identityCommitment), false)
})

// 18.2 MUST-fail: a copied proof with a fresh nonce.
test('18.2 a copied timed-commitment proof with a reused nonce is refused', () => {
  const w = world()
  const prior = mustEnroll(w, 'DOC-CONF-E')
  const replayed = enrollReusingProofNonce(w, 'DOC-CONF-E2', prior.record)
  assert.notEqual(replayed, null, 'a replayed proof nonce was accepted')
  assert.match(replayed ?? '', /nonce/i)
})

// 18.2 MUST-fail: a duplicate document nullifier.
test('18.2 a duplicate document nullifier is refused', () => {
  const w = world()
  mustEnroll(w, 'DOC-CONF-DUP')
  const second = enroll(w, 'DOC-CONF-DUP', PERSON)
  assert.deepEqual(second, {
    error: 'ENROLLMENT_REFUSED',
    message: SUBMITTER_REFUSAL_MESSAGE,
  })
  assert.match(String(w.operatorJournal.at(-1)), /already enrolled/)
})

// 18.2 MUST-fail: an order mapped to another enrollment.
test('18.2 an authorization for another enrollment is refused at both gates', () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-F')
  const b = mustEnroll(w, 'DOC-CONF-G')

  const order = issueOrder(w, 'court', 'order-crossed')
  const { authorization: authForB } = createAuthorization(w, {
    record: b.record,
    order,
  })
  const leaf = buildUnsealLeaf(w, authForB)

  const outcome = warrantGate(
    w,
    { auth: authForB, order, leafBytes: leaf.bytes },
    a.record,
  )
  assert.equal(outcome.refused, true)
  if (!outcome.refused) return
  assert.match(outcome.reason, /another (account|enrollment)|ciphertext/i)
})

// 18.2 MUST-fail: an order from a role the profile does not accept.
test('18.2 an order from an unaccepted role is refused', async () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-H').record
  const outcome = await performUnseal(w, record, {
    role: 'agency',
    skipDelay: true,
  })
  assert.equal(outcome.ok, false)
  assert.equal(outcome.refusal?.gate, 'warrant')
})

// 18.2 MUST-fail: inclusion presented under an inconsistent head.
test('18.2 a head inconsistent with the last accepted head is refused', async () => {
  const w = world()
  const first = mustEnroll(w, 'DOC-CONF-I')
  const second = mustEnroll(w, 'DOC-CONF-J')
  assert.equal(
    (await performUnseal(w, first.record, { skipDelay: true })).ok,
    true,
  )

  const order = issueOrder(w, 'court', 'o')
  const { authorization: auth } = createAuthorization(w, {
    record: second.record,
    order,
  })
  const built = buildUnsealLeaf(w, auth)
  const leafIndex = w.log.append(built.bytes)
  const sth = signHeadRecord(w, null)
  const anchor = anchorSignedHead(w, sth)
  for (let i = 1; i < w.policy.k; i++) w.chain.mine(null)

  const outcome = logGate(
    w,
    {
      auth,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: w.log.inclusionProof(leafIndex),
      consistency: [],
      sth,
      anchor,
      stamp: chainedWork(
        w.logGateState.lastStampOutput,
        leafHash(built.bytes),
        currentDifficulty(w),
      ),
    },
    second.record,
  )
  assert.equal(outcome.refused, true)
  if (!outcome.refused) return
  assert.match(outcome.reason, /not consistent/i)
})

// 18.2 MUST-fail: an anchor that does not commit the presented head.
test('18.2 an anchor on another branch does not commit this head', async () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-K').record
  const order = issueOrder(w, 'court', 'o')
  const { authorization: auth } = createAuthorization(w, { record, order })
  const built = buildUnsealLeaf(w, auth)
  const leafIndex = w.log.append(built.bytes)
  const sth = signHeadRecord(w, null)
  const foreignAnchor = anchorSignedHead(w, {
    ...sth,
    root_hash: randomBytes(32),
  })
  for (let i = 1; i < w.policy.k; i++) w.chain.mine(null)

  const outcome = logGate(
    w,
    {
      auth,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: w.log.inclusionProof(leafIndex),
      consistency: w.log.consistencyProof(
        w.logGateState.treeSize,
        sth.tree_size,
      ),
      sth,
      anchor: foreignAnchor,
      stamp: chainedWork(
        w.logGateState.lastStampOutput,
        leafHash(built.bytes),
        currentDifficulty(w),
      ),
    },
    record,
  )
  assert.equal(outcome.refused, true)
  if (!outcome.refused) return
  assert.match(outcome.reason, /anchor/i)
})

// 18.2 MUST-fail: an anchor with fewer confirmations than policy demands.
test('18.2 an under-confirmed anchor is refused', async () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-L').record
  const outcome = await performUnseal(w, record, {
    skipDelay: true,
    confirmations: 1,
  })
  assert.equal(outcome.ok, false)
  assert.equal(outcome.refusal?.gate, 'log')
})

// 18.2 MUST-fail: a congestion stamp below the required difficulty.
test('18.2 an under-difficulty congestion stamp is refused', () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-M').record
  const order = issueOrder(w, 'court', 'o')
  const { authorization: auth } = createAuthorization(w, { record, order })
  const built = buildUnsealLeaf(w, auth)
  const leafIndex = w.log.append(built.bytes)
  const sth = signHeadRecord(w, null)
  const anchor = anchorSignedHead(w, sth)
  for (let i = 1; i < w.policy.k; i++) w.chain.mine(null)

  const outcome = logGate(
    w,
    {
      auth,
      leafBytes: built.bytes,
      leafIndex,
      inclusion: w.log.inclusionProof(leafIndex),
      consistency: w.log.consistencyProof(
        w.logGateState.treeSize,
        sth.tree_size,
      ),
      sth,
      anchor,
      stamp: chainedWork(
        w.logGateState.lastStampOutput,
        leafHash(built.bytes),
        0,
      ),
    },
    record,
  )
  assert.equal(outcome.refused, true)
  if (!outcome.refused) return
  assert.match(outcome.reason, /difficulty/i)
})

// 18.2 MUST-fail: a stale monotonic state presented after it advanced.
test('18.2 a stale tree head is refused after the monotonic state advanced', async () => {
  const w = world()
  const first = mustEnroll(w, 'DOC-CONF-N')
  const second = mustEnroll(w, 'DOC-CONF-O')
  const staleHead = signHeadRecord(w, null)
  assert.equal(
    (await performUnseal(w, first.record, { skipDelay: true })).ok,
    true,
  )

  const outcome = await performUnseal(w, second.record, {
    skipDelay: true,
    presentStaleHead: staleHead,
  })
  assert.equal(outcome.ok, false)
  assert.equal(outcome.refusal?.gate, 'log')
})

// 18.2 MUST-fail: one gate alone must not open the envelope.
test('18.2 a single gate contribution does not open the envelope', () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-P').record
  const { zA, zB } = bothContributions(w, record)

  assert.ok(openOuter(w, record, { zA, zB }), 'positive control: both open it')
  assert.equal(
    openOuter(w, record, { zA, zB: new Uint8Array(zB.length) }),
    null,
  )
  assert.equal(
    openOuter(w, record, { zA: new Uint8Array(zA.length), zB }),
    null,
  )
})

// 18.2 MUST-fail: payload recovery without solving the timed commitment,
// including by a holder of both master secrets.
test('18.2 both master secrets open the outer envelope but do not skip the delay', async () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-Q').record
  const opened = openOuter(w, record, bothContributions(w, record))
  assert.ok(opened, 'both master secrets do open the outer layer, by design')

  const hexed = toHex(
    new Uint8Array([
      ...opened.envelope.innerCiphertext,
      ...opened.envelope.innerNonce,
    ]),
  )
  assert.equal(
    hexed.includes(toHex(utf8(PERSON.fullLegalName))),
    false,
    'the identity was readable without paying the delay',
  )

  const identity = await payDelayAndDecrypt(w, { record, opened })
  assert.ok(identity, 'the identity appears only after the delay is paid')
})

// 18.2 MUST-fail: a pi_vtd that does not match its commitment.
test('18.2 a timed-commitment proof mismatched to its commitment is refused at enrollment', () => {
  const w = world()
  const tampered = enrollWithTamperedProof(w, 'DOC-CONF-TAMPER')
  assert.notEqual(tampered, null, 'a mismatched pi_vtd was accepted')
  assert.match(tampered ?? '', /vtd proof rejected/i)
})

// 18.2 MUST-fail: a payload whose opening does not match the commitment.
test('18.2 a payload opening that does not match the commitment is detectable', async () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-R').record
  const opened = openOuter(w, record, bothContributions(w, record))
  assert.ok(opened)
  const identity = await payDelayAndDecrypt(w, { record, opened })
  assert.ok(identity)

  const wrongOpening = randomBytes(32)
  const recomputed = dhash(
    'commitment',
    utf8(JSON.stringify(identity.attrs)),
    record.accountPublicKey,
    wrongOpening,
  )
  assert.equal(bytesEqual(recomputed, record.identityCommitment), false)
})

// 18.2 MUST-fail: a disclosure opened with a wrong salt.
test('18.2 a disclosure whose salt list does not match its field list is refused', () => {
  const disclosure = disclosureV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: utf8('sige-demo-net'),
    disclosure_id: randomBytes(16),
    authorization_hash: randomBytes(32),
    reviewed_by: 'demo-reviewer',
    review_decision_hash: randomBytes(32),
    opened_fields: ['case_reference'],
    opened_salts: [randomBytes(32)],
    disclosed_at: 1,
  })
  assert.equal(
    decodeDisclosureV1(encodeDisclosureV1(disclosure)).ok,
    true,
    'positive control: a well-formed disclosure decodes',
  )

  const map = disclosureV1Cbor(disclosure)
  assert.ok(map instanceof Map)
  const hostile = new Map(map)
  hostile.set('opened_salts', [])
  const decoded = decodeDisclosureV1(
    encodeDisclosureV1({ ...disclosure, opened_salts: [] }),
  )
  assert.equal(decoded.ok, false)
})

// 18.2 MUST-succeed: K is reconstructible from the stored record alone.
test('18.2 MUST-succeed: the escrow key reconstructs from the stored record', () => {
  const w = world()
  const record = mustEnroll(w, 'DOC-CONF-S').record
  const opened = openOuter(w, record, bothContributions(w, record), 'standard')
  assert.ok(opened, 'K did not reconstruct from the stored record')
})

// TENTH-REVIEW regressions. `enrollment_record_hash` rides
// hashUnsealAuthorizationV1, which both HSM gates sign, and for one round that
// was the whole fix. Signing a value is not checking it: neither gate compared
// the pin to anything, so the operator forged the record BEFORE the order and
// both gates signed his pin, with genuine reviewer approvals over it. The gate
// now needs enrollment-time memory.
test('the warrant gate refuses a pin the enrollment never accepted', () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-PIN')
  const order = issueOrder(w, 'court', 'order-pin')
  const honest = createAuthorization(w, { record: a.record, order })
  const honestLeaf = buildUnsealLeaf(w, honest.authorization)
  assert.equal(
    warrantGate(
      w,
      { auth: honest.authorization, order, leafBytes: honestLeaf.bytes },
      a.record,
    ).refused,
    false,
    'positive control',
  )

  // The operator forges the record he will later show the auditor, THEN issues
  // the order. Reviewers sign the forged pin because it is in the pre-image.
  // Account, enrollment id, escrow ciphertext and leaf are all genuine, so no
  // guard in checkAuthorizationBinding can answer for this.
  const forgedRecord = {
    ...a.record,
    stored: { ...a.record.stored, identity_commitment: randomBytes(32) },
  }
  const forged = createAuthorization(w, { record: forgedRecord, order })
  const forgedLeaf = buildUnsealLeaf(w, forged.authorization)
  const outcome = warrantGate(
    w,
    { auth: forged.authorization, order, leafBytes: forgedLeaf.bytes },
    forgedRecord,
  )
  assert.equal(outcome.refused, true, 'a forged pin opened the gate')
  if (!outcome.refused) return
  assert.equal(
    outcome.reason,
    'authorization pins a record this enrollment never accepted',
  )
})

test('the warrant gate refuses an enrollment it never accepted', () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-UNKNOWN')
  const order = issueOrder(w, 'court', 'order-unknown')
  const strangerId = randomBytes(16)
  const stranger = {
    ...a.record,
    enrollmentId: strangerId,
    stored: { ...a.record.stored, enrollment_id: strangerId },
  }
  const { authorization } = createAuthorization(w, { record: stranger, order })
  const leaf = buildUnsealLeaf(w, authorization)
  const outcome = warrantGate(
    w,
    { auth: authorization, order, leafBytes: leaf.bytes },
    stranger,
  )
  assert.equal(outcome.refused, true)
  if (!outcome.refused) return
  assert.equal(
    outcome.reason,
    'authorization names an enrollment this gate never accepted',
  )
})

// The offline verifier read expires_at; no gate did. By the time the bundle is
// audited the contribution is already out. The clock advances rather than the
// field changing, because the field is inside the reviewer-signed pre-image.
test('the warrant gate refuses an expired authorization', () => {
  const w = world()
  const a = mustEnroll(w, 'DOC-CONF-EXPIRY')
  const order = issueOrder(w, 'court', 'order-expiry')
  const { authorization } = createAuthorization(w, { record: a.record, order })
  const leaf = buildUnsealLeaf(w, authorization)
  w.clockMs = authorization.expires_at
  const outcome = warrantGate(
    w,
    { auth: authorization, order, leafBytes: leaf.bytes },
    a.record,
  )
  assert.equal(outcome.refused, true, 'an expired warrant opened the gate')
  if (!outcome.refused) return
  assert.equal(outcome.reason, 'authorization has expired')
})
