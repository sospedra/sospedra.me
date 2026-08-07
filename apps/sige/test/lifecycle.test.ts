import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ed25519 } from '@noble/curves/ed25519.js'
import { randomBytes, toHex } from '../src/core/bytes.ts'
import { type CborValue, encodeCbor } from '../src/core/cbor.ts'
import {
  createRecoveryTicketStore,
  createSupersessionLedger,
  evaluateRecoveryQuorum,
  finalizeRecovery,
  generateAccountAuthKey,
  initiateRecovery,
  isSuperseded,
  migrateAccount,
  openRecoveryAccountCommitment,
  parseRecoveryLeaf,
  proveDocumentContinuity,
  RECOVERY_DELAY_BLOCKS,
  RECOVERY_THRESHOLD,
  registerAccountKey,
  renewEnrollment,
  setupRecoveryKit,
  signAccountKeyRegistration,
  signRenewalContinuity,
} from '../src/world/lifecycle.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import {
  createWorld,
  type DemoWorld,
  type EnrollmentRecord,
  enroll,
  performUnseal,
  rotateEpoch,
} from '../src/world/world.ts'

const PERSON = {
  fullLegalName: 'Ada Voss',
  dateOfBirth: '1990-04-12',
  documentNumber: 'ID-A-4472',
}

function mustEnroll(
  world: DemoWorld,
  doc: string,
): { record: EnrollmentRecord; accountPrivateKey: Uint8Array } {
  const r = enroll(world, doc, PERSON)
  assert.ok(!('error' in r))
  if ('error' in r) throw new Error('unreachable')
  return r
}

// --- Recovery (spec 12.2) ---------------------------------------------------

test('two distinct valid factors satisfy quorum and initiate recovery', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-1')
  const { kit, shares } = setupRecoveryKit(record.accountId, [
    randomBytes(16),
    randomBytes(16),
  ])
  const tickets = createRecoveryTicketStore()
  const sizeBefore = world.log.size()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, false)
  assert.ok(
    !result.refused && result.pending.readyAtHeight > world.chain.tipHeight(),
  )
  assert.equal(world.log.size(), sizeBefore + 1)
})

test('document proof alone establishes continuity but cannot complete recovery', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-2')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()

  const proof = proveDocumentContinuity(world, shares, {
    record,
    documentIssuanceId: 'DOC-REC-2',
  })
  assert.ok(proof, 'a fresh proof of the same document issuance is genuine')

  const quorum = evaluateRecoveryQuorum(kit, [proof])
  assert.equal(quorum.satisfied, false)

  const sizeBefore = world.log.size()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [proof],
  })
  assert.equal(result.refused, true)
  assert.ok(result.refused && /quorum|factor/i.test(result.reason))
  assert.equal(world.log.size(), sizeBefore, 'a refused recovery logs nothing')
})

test('a fabricated document proof for a different document is refused, not just under-quorum', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-3')
  const { shares } = setupRecoveryKit(record.accountId, [])
  const proof = proveDocumentContinuity(world, shares, {
    record,
    documentIssuanceId: 'DOC-NOT-THE-SAME',
  })
  assert.equal(proof, null)
})

test('any single factor alone is refused, not only the document factor', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-4')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [{ kind: 'device', share: shares.device }],
  })
  assert.equal(result.refused, true)
  assert.ok(
    result.refused &&
      result.reason.includes(`${RECOVERY_THRESHOLD} distinct valid factors`),
  )
})

test('a tampered share value fails its Feldman check, even paired with a genuine factor', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-5')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tampered = { ...shares.kit, value: shares.kit.value + 1n }
  const outcome = evaluateRecoveryQuorum(kit, [
    { kind: 'recovery_key', share: shares.recovery_key },
    { kind: 'kit', share: tampered },
  ])
  assert.equal(outcome.satisfied, false)
  assert.ok(!outcome.satisfied && outcome.validKinds.length === 1)
})

test('a share submitted under the wrong claimed kind is refused, not silently accepted', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-6')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const outcome = evaluateRecoveryQuorum(kit, [
    { kind: 'device', share: shares.recovery_key },
    { kind: 'kit', share: shares.document_proof },
  ])
  assert.equal(outcome.satisfied, false)
  assert.equal(outcome.validKinds.length, 0)
})

test('hostile share values are refused with a reason, never thrown', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-7')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const hostileValues = [0n, -1n, 2n ** 4096n]
  for (const value of hostileValues) {
    const outcome = evaluateRecoveryQuorum(kit, [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: { index: 2, value } },
    ])
    assert.equal(outcome.satisfied, false)
    assert.ok(!outcome.satisfied && outcome.reason.length > 0)
  }
})

test('a structurally broken kit is refused inside initiateRecovery, not thrown', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-14')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  const brokenKit = { ...kit, devices: null as unknown as Uint8Array[] }
  const result = initiateRecovery(world, tickets, {
    kit: brokenKit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, true)
})

test('recovery is refused during lockdown', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-8')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  world.lockdown = true
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, true)
  assert.ok(result.refused && /lockdown/.test(result.reason))
})

test('existing devices are notified only once quorum is satisfied', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-9')
  const devices = [randomBytes(16), randomBytes(16)]
  const { kit, shares } = setupRecoveryKit(record.accountId, devices)
  const tickets = createRecoveryTicketStore()
  const notified: string[] = []
  const refused = initiateRecovery(world, tickets, {
    kit,
    submissions: [{ kind: 'device', share: shares.device }],
    notify: (d) => notified.push(toHex(d)),
  })
  assert.equal(refused.refused, true)
  assert.equal(notified.length, 0, 'no notification on a refused attempt')

  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'device', share: shares.device },
      { kind: 'kit', share: shares.kit },
    ],
    notify: (d) => notified.push(toHex(d)),
  })
  assert.equal(result.refused, false)
  assert.deepEqual(notified.sort(), devices.map(toHex).sort())
})

test('the recovery leaf hides the account behind a commitment that opens only with its blinding', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-10')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, false)
  if (result.refused) return
  const dump = JSON.stringify(result.leaf)
  assert.ok(!dump.includes(toHex(record.accountId)))
  assert.ok(
    openRecoveryAccountCommitment(
      result.leaf,
      record.accountId,
      result.pending.accountBlinding,
    ),
  )
  assert.ok(
    !openRecoveryAccountCommitment(
      result.leaf,
      record.accountId,
      randomBytes(32),
    ),
  )
})

test('parseRecoveryLeaf refuses a leaf carrying an unrecognized field', () => {
  const map = new Map<string, CborValue>([
    ['leaf_type', 'RECOVERY'],
    ['account_commitment', 'aa'],
    ['factor_commitment', 'bb'],
    ['ready_at_height', 1n],
    ['created_at', 2n],
    ['smuggled_field', 'x'],
  ])
  assert.equal(parseRecoveryLeaf(encodeCbor(map)), null)
})

test('finalize refuses before the published delay elapses, then succeeds after', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-11')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, false)
  if (result.refused) return

  const early = finalizeRecovery(world, tickets, result.pending.ticketId)
  assert.equal(early.refused, true)
  assert.ok(early.refused && /delay/i.test(early.reason))

  for (let i = 0; i < RECOVERY_DELAY_BLOCKS; i++) world.chain.mine(null)
  const late = finalizeRecovery(world, tickets, result.pending.ticketId)
  assert.equal(late.refused, false)
  assert.ok(!late.refused && late.newAccountKey.length > 0)
})

test('a fabricated ticket id cannot be finalized: only initiateRecovery issues valid ones', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const tickets = createRecoveryTicketStore()
  for (let i = 0; i < RECOVERY_DELAY_BLOCKS; i++) world.chain.mine(null)
  const result = finalizeRecovery(world, tickets, toHex(randomBytes(16)))
  assert.equal(result.refused, true)
  assert.ok(result.refused && /ticket/i.test(result.reason))
})

test('a recovery ticket cannot be finalized twice: the second attempt is refused', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-REC-12')
  const { kit, shares } = setupRecoveryKit(record.accountId, [])
  const tickets = createRecoveryTicketStore()
  const result = initiateRecovery(world, tickets, {
    kit,
    submissions: [
      { kind: 'recovery_key', share: shares.recovery_key },
      { kind: 'device', share: shares.device },
    ],
  })
  assert.equal(result.refused, false)
  if (result.refused) return

  for (let i = 0; i < RECOVERY_DELAY_BLOCKS; i++) world.chain.mine(null)
  const first = finalizeRecovery(world, tickets, result.pending.ticketId)
  assert.equal(first.refused, false)
  const second = finalizeRecovery(world, tickets, result.pending.ticketId)
  assert.equal(second.refused, true)
  assert.ok(second.refused && /ticket/i.test(second.reason))
})

// Registering an auth key now requires proving control of the enrolled
// account key (spec 12.3), so tests authenticate rather than assert.
function mustRegisterAccountKey(enrolled: ReturnType<typeof mustEnroll>) {
  const { publicKey, privateKey } = generateAccountAuthKey()
  const outcome = registerAccountKey({
    record: enrolled.record,
    newPublicKey: publicKey,
    signature: signAccountKeyRegistration(
      enrolled.accountPrivateKey,
      enrolled.record.accountId,
      publicKey,
    ),
  })
  assert.equal(outcome.registered, true)
  if (!outcome.registered) throw new Error('unreachable')
  return { authKey: outcome.authKey, privateKey }
}

// --- Renewal (spec 12.3) -----------------------------------------------------

test('renewal via a valid account-key signature links a new enrollment and supersedes the old', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-1')
  const ledger = createSupersessionLedger()
  const { authKey, privateKey } = mustRegisterAccountKey(old)
  const signature = signRenewalContinuity(
    privateKey,
    old.record.enrollmentId,
    'DOC-REN-NEW-1',
  )

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-1',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey,
    ledger,
  })

  assert.equal(result.refused, false)
  if (result.refused) return
  assert.notEqual(
    toHex(result.newRecord.enrollmentId),
    toHex(old.record.enrollmentId),
  )
  assert.notEqual(
    toHex(result.newRecord.tracks.standard.ciphertextHash),
    toHex(old.record.tracks.standard.ciphertextHash),
  )
  assert.ok(isSuperseded(ledger, old.record.enrollmentId))
  assert.equal(result.link.personLinkage, 'not_claimed')
  assert.ok(!JSON.stringify(result.link).includes(PERSON.fullLegalName))
})

test('the old enrollment is superseded, not deleted: it still decrypts after renewal', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-2')
  const ledger = createSupersessionLedger()
  const { authKey, privateKey } = mustRegisterAccountKey(old)
  const signature = signRenewalContinuity(
    privateKey,
    old.record.enrollmentId,
    'DOC-REN-NEW-2',
  )
  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-2',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey,
    ledger,
  })
  assert.equal(result.refused, false)

  const out = await performUnseal(world, old.record, {})
  assert.ok(out.ok)
  assert.equal(out.identity?.attrs.fullLegalName, PERSON.fullLegalName)
})

test('renewal via a satisfied recovery quorum is also accepted as continuity', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-3')
  const ledger = createSupersessionLedger()
  const { kit, shares } = setupRecoveryKit(old.record.accountId, [])

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-3',
    attrs: PERSON,
    continuity: {
      kind: 'recovery_quorum',
      kit,
      submissions: [
        { kind: 'recovery_key', share: shares.recovery_key },
        { kind: 'device', share: shares.device },
      ],
    },
    authKey: null,
    ledger,
  })
  assert.equal(result.refused, false)
})

test('renewal is refused without valid continuity, and the candidate document stays unconsumed', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-4')
  const ledger = createSupersessionLedger()
  const { authKey } = mustRegisterAccountKey(old)
  const wrongPrivateKey = ed25519.utils.randomSecretKey()
  const signature = signRenewalContinuity(
    wrongPrivateKey,
    old.record.enrollmentId,
    'DOC-REN-NEW-4',
  )

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-4',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey,
    ledger,
  })
  assert.equal(result.refused, true)
  assert.ok(!isSuperseded(ledger, old.record.enrollmentId))

  const fresh = enroll(world, 'DOC-REN-NEW-4', PERSON)
  assert.ok(
    !('error' in fresh),
    'the refused renewal never consumed the nullifier',
  )
})

test('a recovery-quorum continuity claim is re-derived, not trusted: an insufficient submission set is refused', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-5')
  const ledger = createSupersessionLedger()
  const { kit, shares } = setupRecoveryKit(old.record.accountId, [])

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-5',
    attrs: PERSON,
    continuity: {
      kind: 'recovery_quorum',
      kit,
      submissions: [{ kind: 'device', share: shares.device }],
    },
    authKey: null,
    ledger,
  })
  assert.equal(result.refused, true)
})

test('a malformed account-key signature is refused, not thrown', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-6')
  const ledger = createSupersessionLedger()
  const { authKey } = mustRegisterAccountKey(old)

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-6',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature: randomBytes(10) },
    authKey,
    ledger,
  })
  assert.equal(result.refused, true)
})

test('a malformed registered public key is refused, not thrown', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-REN-OLD-7')
  const ledger = createSupersessionLedger()
  const { privateKey } = mustRegisterAccountKey(old)
  const signature = signRenewalContinuity(
    privateKey,
    old.record.enrollmentId,
    'DOC-REN-NEW-7',
  )
  const brokenAuthKey = {
    accountId: old.record.accountId,
    publicKey: randomBytes(10),
  }

  const result = renewEnrollment(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-REN-NEW-7',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey: brokenAuthKey,
    ledger,
  })
  assert.equal(result.refused, true)
})

test('a null prior record is refused, not thrown, through renewal and migration', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const bogusInput = {
    priorRecord: null as unknown as EnrollmentRecord,
    newDocumentIssuanceId: 'DOC-BOGUS',
    attrs: PERSON,
    continuity: {
      kind: 'account_key' as const,
      signature: randomBytes(64),
    },
    authKey: null,
    ledger: createSupersessionLedger(),
  }
  const renewed = renewEnrollment(world, bogusInput)
  assert.equal(renewed.refused, true)
  const migrated = migrateAccount(world, bogusInput)
  assert.equal(migrated.refused, true)
})

// --- Migration (spec 13.2 path 1) -------------------------------------------

test('migration is refused when the active epoch has not changed', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-MIG-OLD-1')
  const ledger = createSupersessionLedger()
  const { authKey, privateKey } = mustRegisterAccountKey(old)
  const signature = signRenewalContinuity(
    privateKey,
    old.record.enrollmentId,
    'DOC-MIG-NEW-1',
  )
  const result = migrateAccount(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-MIG-NEW-1',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey,
    ledger,
  })
  assert.equal(result.refused, true)
  assert.ok(result.refused && /epoch/i.test(result.reason))
})

test('migration after rotation lands the new record on the new epoch and keeps the old epoch retained', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-MIG-OLD-2')
  assert.equal(old.record.escrowEpoch, 1)

  rotateEpoch(world)
  const ledger = createSupersessionLedger()
  const { authKey, privateKey } = mustRegisterAccountKey(old)
  const signature = signRenewalContinuity(
    privateKey,
    old.record.enrollmentId,
    'DOC-MIG-OLD-2',
  )
  const result = migrateAccount(world, {
    priorRecord: old.record,
    // Migration rewraps the SAME document, so the id matches the prior one.
    newDocumentIssuanceId: 'DOC-MIG-OLD-2',
    attrs: PERSON,
    continuity: { kind: 'account_key', signature },
    authKey,
    ledger,
  })
  assert.equal(result.refused, false)
  if (result.refused) return
  assert.equal(result.newRecord.escrowEpoch, 2)
  assert.ok(isSuperseded(ledger, old.record.enrollmentId))

  const openedOld = await performUnseal(world, old.record, {})
  assert.ok(
    openedOld.ok,
    'the old ciphertext still opens under the retained epoch-1 key',
  )
  assert.equal(openedOld.identity?.attrs.fullLegalName, PERSON.fullLegalName)

  const openedNew = await performUnseal(world, result.newRecord, {
    skipDelay: true,
  })
  assert.ok(openedNew.ok, 'the migrated record opens under the new epoch')
})

// --- 12.1 daily authentication: registering a key requires owning the account ---

test('nobody can register an auth key for an account they do not control (spec 12.3)', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const victim = mustEnroll(world, 'DOC-12-1-VICTIM')
  const attacker = mustEnroll(world, 'DOC-12-1-ATTACKER')
  const { publicKey } = generateAccountAuthKey()

  const honest = registerAccountKey({
    record: victim.record,
    newPublicKey: publicKey,
    signature: signAccountKeyRegistration(
      victim.accountPrivateKey,
      victim.record.accountId,
      publicKey,
    ),
  })
  assert.equal(honest.registered, true, 'positive control: the owner registers')

  // The attacker holds a real account key, just not the victim's.
  const hijack = registerAccountKey({
    record: victim.record,
    newPublicKey: publicKey,
    signature: signAccountKeyRegistration(
      attacker.accountPrivateKey,
      victim.record.accountId,
      publicKey,
    ),
  })
  assert.equal(hijack.registered, false, 'an attacker registered a victim key')
  if (hijack.registered) return
  assert.match(hijack.reason, /not signed by the enrolled account key/i)

  // Substituting the attacker's own public key is unrepresentable: the id and
  // the key both come from one record, so they cannot be mixed.
  const spliced = registerAccountKey({
    record: { ...victim.record, accountId: attacker.record.accountId },
    newPublicKey: publicKey,
    signature: signAccountKeyRegistration(
      victim.accountPrivateKey,
      victim.record.accountId,
      publicKey,
    ),
  })
  assert.equal(
    spliced.registered,
    false,
    'an account id spliced onto another key was accepted',
  )

  const wrongKeyInChallenge = registerAccountKey({
    record: victim.record,
    newPublicKey: publicKey,
    signature: signAccountKeyRegistration(
      victim.accountPrivateKey,
      victim.record.accountId,
      generateAccountAuthKey().publicKey,
    ),
  })
  assert.equal(
    wrongKeyInChallenge.registered,
    false,
    'a signature over a different key was accepted',
  )
})

test('registerAccountKey refuses malformed signatures and keys rather than throwing', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const account = mustEnroll(world, 'DOC-12-1-FUZZ')
  const { publicKey } = generateAccountAuthKey()

  const hostile = [
    new Uint8Array(0),
    new Uint8Array(63),
    new Uint8Array(64),
    new Uint8Array(65).fill(0xff),
    randomBytes(64),
  ]
  for (const signature of hostile) {
    assert.doesNotThrow(() => {
      const outcome = registerAccountKey({
        record: account.record,
        newPublicKey: publicKey,
        signature,
      })
      assert.equal(outcome.registered, false)
    })
  }

  assert.doesNotThrow(() => {
    const outcome = registerAccountKey({
      record: { ...account.record, accountPublicKey: new Uint8Array(5) },
      newPublicKey: publicKey,
      signature: randomBytes(64),
    })
    assert.equal(outcome.registered, false)
  })
})

test('migration keeps one nullifier per document, so an auditor counting enrollments does not overcount (spec 7.4, 13.2)', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const old = mustEnroll(world, 'DOC-MIG-STABLE')
  const ledger = createSupersessionLedger()
  const { authKey, privateKey } = mustRegisterAccountKey(old)
  const nullifiersBefore = world.nullifiers.size

  rotateEpoch(world)
  const outcome = migrateAccount(world, {
    priorRecord: old.record,
    newDocumentIssuanceId: 'DOC-MIG-STABLE',
    attrs: PERSON,
    continuity: {
      kind: 'account_key',
      signature: signRenewalContinuity(
        privateKey,
        old.record.enrollmentId,
        'DOC-MIG-STABLE',
      ),
    },
    authKey,
    ledger,
  })

  assert.equal(outcome.refused, false)
  if (outcome.refused) return

  assert.deepEqual(
    outcome.newRecord.documentNullifier,
    old.record.documentNullifier,
    'migration minted a second nullifier for one document',
  )
  assert.equal(
    world.nullifiers.size,
    nullifiersBefore,
    'the nullifier set grew during a migration',
  )
  assert.notDeepEqual(
    outcome.newRecord.enrollmentId,
    old.record.enrollmentId,
    'migration must still mint a fresh enrollment id',
  )
  assert.equal(outcome.newRecord.escrowEpoch, world.activeEpoch)
  assert.notEqual(world.activeEpoch, old.record.escrowEpoch)
})
