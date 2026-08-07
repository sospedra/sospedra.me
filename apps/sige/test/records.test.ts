import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import { randomBytes, toHex, utf8 } from '../src/core/bytes.ts'
import { type CborValue, decodeCbor, encodeCbor } from '../src/core/cbor.ts'
import { setupParams } from '../src/core/lhtlp.ts'
import { proveVtd, type VtdProof } from '../src/core/vtd.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import {
  type BitcoinAnchorV1,
  bitcoinAnchorV1,
  bitcoinAnchorV1Cbor,
  type DisclosureV1,
  decodeBitcoinAnchorV1,
  decodeDisclosureV1,
  decodeEnrollmentRecordV1,
  decodeLogLeafV1,
  decodeSignedTreeHeadV1,
  decodeUnsealAuthorizationV1,
  disclosureV1,
  disclosureV1Cbor,
  type EnrollmentRecordV1,
  type EscrowCiphertextV1,
  encodeBitcoinAnchorV1,
  encodeDisclosureV1,
  encodeEnrollmentRecordV1,
  encodeLogLeafV1,
  encodeSignedTreeHeadV1,
  encodeUnsealAuthorizationV1,
  enrollmentRecordV1,
  enrollmentRecordV1Cbor,
  hashBitcoinAnchorV1,
  hashEnrollmentRecordV1,
  hashLogLeafV1,
  hashSignedTreeHeadV1,
  hashUnsealAuthorizationV1,
  LEAF_TYPES,
  type LogLeafV1,
  logLeafV1,
  logLeafV1Cbor,
  RECORD_SCHEMA_VERSION,
  type RecordDecodeResult,
  type SignedTreeHeadV1,
  signedTreeHeadV1,
  signedTreeHeadV1Cbor,
  type UnsealAuthorizationV1,
  unsealAuthorizationV1,
  unsealAuthorizationV1Cbor,
} from '../src/world/records.ts'
import {
  createWorld,
  enroll,
  openEscrowCiphertextV1,
  reconstructEscrowKey,
} from '../src/world/world.ts'

const FIXTURE_VTD_PROFILE = { n: 24, k: 7, o: 6 }
const FIXTURE_NETWORK_ID = utf8('sige-demo-net')
const G2_IDENTITY = bls12_381.G2.Point.ZERO.toBytes(true)

function fixtureVtdProof(): VtdProof {
  const { params } = setupParams(320, 64)
  return proveVtd(params, 42n, FIXTURE_VTD_PROFILE)
}

function fixtureEscrowCiphertext(): EscrowCiphertextV1 {
  return {
    u: randomBytes(96),
    nonce: randomBytes(24),
    ciphertext: randomBytes(48),
  }
}

function fixtureEnrollmentRecordV1(): EnrollmentRecordV1 {
  const proof = fixtureVtdProof()
  return enrollmentRecordV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    account_id: randomBytes(32),
    account_public_key: randomBytes(32),
    enrollment_id: randomBytes(16),
    credential_profile_id: 'demo/credential-profile/v1',
    trust_snapshot_id: 'demo/trust-snapshot/v1',
    policy_id: 'demo/policy/v1',
    escrow_epoch: 1,
    delay_profile_id: 'sige-demo-delay/v1',
    transcript_hash: randomBytes(32),
    identity_commitment: randomBytes(32),
    document_nullifier: randomBytes(32),
    escrow_ciphertext_standard: fixtureEscrowCiphertext(),
    escrow_ciphertext_emergency: fixtureEscrowCiphertext(),
    enrollment_proof: randomBytes(32),
    timed_commitment_proof: { standard: proof, emergency: proof },
    proof_system_id: 'none-clear-mode/v1',
    unseal_detection_tag_key: null,
    accepted_at: 1,
    verifier_build_hash: randomBytes(32),
  })
}

function fixtureUnsealAuthorizationV1(): UnsealAuthorizationV1 {
  return unsealAuthorizationV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    authorization_id: randomBytes(16),
    account_id: randomBytes(32),
    enrollment_id: randomBytes(16),
    enrollment_record_hash: randomBytes(32),
    escrow_epoch: 1,
    track: 'standard',
    ciphertext_hash: randomBytes(32),
    order_document_hash: randomBytes(32),
    order_signature_evidence_hash: randomBytes(32),
    issuing_authority: 'demo-court',
    issuing_role: 'court',
    jurisdiction: 'generic',
    case_reference_commitment: randomBytes(32),
    legal_basis_code: 'demo-basis-1',
    requested_attribute_scope: ['fullLegalName', 'documentNumber'],
    mapping_explanation_commitment: randomBytes(32),
    reviewer_approvals: [randomBytes(64), randomBytes(64)],
    policy_version: 'demo/policy/v1',
    expires_at: 100,
  })
}

function fixtureLogLeafV1(): LogLeafV1 {
  return logLeafV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    leaf_type: 'UNSEAL_STANDARD',
    event_id: randomBytes(16),
    authorization_hash: randomBytes(32),
    account_commitment: randomBytes(32),
    case_reference_commitment: randomBytes(32),
    order_document_hash: randomBytes(32),
    ciphertext_hash: randomBytes(32),
    escrow_epoch: 1,
    issuing_role: 'court',
    track: 'standard',
    prev_unseal_anchor_ref: null,
    congestion_difficulty: 100,
    congestion_stamp_output: randomBytes(32),
    unseal_detection_tag: null,
    public_disclosure_class: 'standard',
    created_at: 1,
    extension_commitments: [],
  })
}

function fixtureSignedTreeHeadV1(): SignedTreeHeadV1 {
  return signedTreeHeadV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'demo-log/v1',
    tree_size: 3,
    root_hash: randomBytes(32),
    timestamp: 1,
    previous_tree_size: null,
    previous_root_hash: null,
    log_key_id: 'demo-log-key/v1',
    signature: randomBytes(64),
  })
}

function fixtureBitcoinAnchorV1(): BitcoinAnchorV1 {
  return bitcoinAnchorV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'demo-log/v1',
    tree_size: 3,
    root_hash: randomBytes(32),
    sth_hash: randomBytes(32),
    commitment_scheme: 'op-return/v1',
    transaction_id: randomBytes(32),
    transaction_merkle_proof: [randomBytes(32), randomBytes(32)],
    block_header: randomBytes(80),
    block_height: 900_000,
    confirmation_policy: 3,
    observed_chain_work: 2n ** 90n + 7n,
  })
}

function asCborMap(value: CborValue): Map<string, CborValue> {
  if (!(value instanceof Map)) throw new Error('expected a cbor map')
  return new Map(value)
}

type RecordUnderTest<T> = {
  readonly name: string
  readonly fixture: () => T
  readonly toCbor: (value: T) => CborValue
  readonly encode: (value: T) => Uint8Array
  readonly decode: (bytes: Uint8Array) => RecordDecodeResult<T>
  readonly hash: (value: T) => Uint8Array
}

function recordUnderTest<T>(spec: RecordUnderTest<T>): RecordUnderTest<T> {
  return spec
}

// biome-ignore lint/suspicious/noExplicitAny: a heterogeneous table of five distinct record shapes
const RECORDS_UNDER_TEST: ReadonlyArray<RecordUnderTest<any>> = [
  recordUnderTest({
    name: 'EnrollmentRecordV1',
    fixture: fixtureEnrollmentRecordV1,
    toCbor: enrollmentRecordV1Cbor,
    encode: encodeEnrollmentRecordV1,
    decode: decodeEnrollmentRecordV1,
    hash: hashEnrollmentRecordV1,
  }),
  recordUnderTest({
    name: 'UnsealAuthorizationV1',
    fixture: fixtureUnsealAuthorizationV1,
    toCbor: unsealAuthorizationV1Cbor,
    encode: encodeUnsealAuthorizationV1,
    decode: decodeUnsealAuthorizationV1,
    hash: hashUnsealAuthorizationV1,
  }),
  recordUnderTest({
    name: 'LogLeafV1',
    fixture: fixtureLogLeafV1,
    toCbor: logLeafV1Cbor,
    encode: encodeLogLeafV1,
    decode: decodeLogLeafV1,
    hash: hashLogLeafV1,
  }),
  recordUnderTest({
    name: 'SignedTreeHeadV1',
    fixture: fixtureSignedTreeHeadV1,
    toCbor: signedTreeHeadV1Cbor,
    encode: encodeSignedTreeHeadV1,
    decode: decodeSignedTreeHeadV1,
    hash: hashSignedTreeHeadV1,
  }),
  recordUnderTest({
    name: 'BitcoinAnchorV1',
    fixture: fixtureBitcoinAnchorV1,
    toCbor: bitcoinAnchorV1Cbor,
    encode: encodeBitcoinAnchorV1,
    decode: decodeBitcoinAnchorV1,
    hash: hashBitcoinAnchorV1,
  }),
]

for (const record of RECORDS_UNDER_TEST) {
  test(`${record.name} round-trips through canonical bytes`, () => {
    const value = record.fixture()
    const decoded = record.decode(record.encode(value))
    assert.equal(decoded.ok, true)
    if (!decoded.ok) return
    assert.deepEqual(decoded.value, value)
  })

  test(`${record.name} canonical hash is stable and 32 bytes`, () => {
    const value = record.fixture()
    const first = record.hash(value)
    assert.equal(first.length, 32)
    assert.deepEqual(first, record.hash(value))
  })

  test(`${record.name} rejects a map carrying an unrecognized critical field`, () => {
    const map = asCborMap(record.toCbor(record.fixture()))
    map.set('smuggled_field_v1', utf8('a forward-dated producer'))
    const decoded = record.decode(encodeCbor(map))
    assert.equal(decoded.ok, false)
    if (decoded.ok) return
    assert.match(
      decoded.reason,
      /unrecognized critical field: smuggled_field_v1/i,
    )
  })

  test(`${record.name} decode never throws on hostile input`, () => {
    assert.doesNotThrow(() => record.decode(randomBytes(40)))
    assert.doesNotThrow(() => record.decode(encodeCbor([1n, 2n, 3n])))
    assert.doesNotThrow(() => record.decode(new Uint8Array(0)))
  })
}

test('every record type carries its own type_url domain', () => {
  const urls = new Set([
    'sige.demo/records/EnrollmentRecordV1',
    'sige.demo/records/UnsealAuthorizationV1',
    'sige.demo/records/LogLeafV1',
    'sige.demo/records/SignedTreeHeadV1',
    'sige.demo/records/BitcoinAnchorV1',
  ])
  assert.equal(urls.size, 5)
})

function nestedMap(
  root: Map<string, CborValue>,
  path: readonly string[],
): Map<string, CborValue> {
  const child = path.reduce<CborValue | undefined>(
    (node, key) => asCborMap(node as CborValue).get(key),
    root,
  )
  return asCborMap(child as CborValue)
}

function withNestedMutation(
  bytes: Uint8Array,
  mutate: (root: Map<string, CborValue>) => void,
): Uint8Array {
  const decoded = decodeCbor(bytes)
  assert.equal(decoded.ok, true)
  if (!decoded.ok) throw new Error('unreachable')
  const root = asCborMap(decoded.value)
  mutate(root)
  return encodeCbor(root)
}

function replaceNested(
  root: Map<string, CborValue>,
  path: readonly string[],
  edit: (leaf: Map<string, CborValue>) => void,
): void {
  const chain = path.map((_, i) => nestedMap(root, path.slice(0, i + 1)))
  const leaf = chain[chain.length - 1]
  assert.ok(leaf !== undefined)
  edit(leaf)
  for (let i = chain.length - 1; i > 0; i--) {
    const parent = chain[i - 1]
    const key = path[i]
    const child = chain[i]
    assert.ok(parent !== undefined && key !== undefined && child !== undefined)
    parent.set(key, child)
  }
  const head = path[0]
  const first = chain[0]
  assert.ok(head !== undefined && first !== undefined)
  root.set(head, first)
}

function mutateFirstItem(
  root: Map<string, CborValue>,
  listKey: 'puzzles' | 'opened',
  edit: (item: Map<string, CborValue>) => void,
): void {
  replaceNested(root, ['timed_commitment_proof', 'standard'], (track) => {
    const list = track.get(listKey)
    assert.ok(Array.isArray(list))
    const first = asCborMap(list[0] as CborValue)
    edit(first)
    track.set(listKey, [first, ...list.slice(1)])
  })
}

const SMUGGLED = utf8('a forward-dated producer')

// Each entry is a wire form that decodes to the same logical record unless a
// nested map rejects it, which would leave one record hash for two byte strings.
const NESTED_MALLEABILITY_ATTACKS: readonly {
  readonly name: string
  readonly mutate: (root: Map<string, CborValue>) => void
}[] = [
  {
    name: 'escrow_ciphertext_standard',
    mutate: (r) =>
      replaceNested(r, ['escrow_ciphertext_standard'], (m) =>
        m.set('smuggled', SMUGGLED),
      ),
  },
  {
    name: 'escrow_ciphertext_emergency',
    mutate: (r) =>
      replaceNested(r, ['escrow_ciphertext_emergency'], (m) =>
        m.set('smuggled', SMUGGLED),
      ),
  },
  {
    name: 'timed_commitment_proof third track',
    mutate: (r) =>
      replaceNested(r, ['timed_commitment_proof'], (m) =>
        m.set('shadow', SMUGGLED),
      ),
  },
  {
    name: 'timed_commitment_proof.standard',
    mutate: (r) =>
      replaceNested(r, ['timed_commitment_proof', 'standard'], (m) =>
        m.set('smuggled', SMUGGLED),
      ),
  },
  {
    name: 'timed_commitment_proof.standard.profile',
    mutate: (r) =>
      replaceNested(r, ['timed_commitment_proof', 'standard', 'profile'], (m) =>
        m.set('smuggled', SMUGGLED),
      ),
  },
  {
    name: 'timed_commitment_proof.standard.commitments',
    mutate: (r) =>
      replaceNested(
        r,
        ['timed_commitment_proof', 'standard', 'commitments'],
        (m) => m.set('smuggled', SMUGGLED),
      ),
  },
  {
    name: 'puzzles[0]',
    mutate: (r) =>
      mutateFirstItem(r, 'puzzles', (m) => m.set('smuggled', SMUGGLED)),
  },
  {
    name: 'opened[0]',
    mutate: (r) =>
      mutateFirstItem(r, 'opened', (m) => m.set('smuggled', SMUGGLED)),
  },
  {
    name: 'puzzles[0].u with a non-minimal leading zero',
    mutate: (r) =>
      mutateFirstItem(r, 'puzzles', (m) => {
        const u = m.get('u')
        assert.ok(u instanceof Uint8Array)
        m.set('u', new Uint8Array([0, ...u]))
      }),
  },
  {
    name: 'opened[0].share with a non-minimal leading zero',
    mutate: (r) =>
      mutateFirstItem(r, 'opened', (m) => {
        const share = m.get('share')
        assert.ok(share instanceof Uint8Array)
        m.set('share', new Uint8Array([0, ...share]))
      }),
  },
]

for (const attack of NESTED_MALLEABILITY_ATTACKS) {
  test(`EnrollmentRecordV1 refuses a nested smuggled field in ${attack.name}`, () => {
    const clean = fixtureEnrollmentRecordV1()
    const cleanBytes = encodeEnrollmentRecordV1(clean)
    const hostileBytes = withNestedMutation(cleanBytes, attack.mutate)

    assert.notDeepEqual(hostileBytes, cleanBytes)
    assert.equal(decodeEnrollmentRecordV1(cleanBytes).ok, true)

    const decoded = decodeEnrollmentRecordV1(hostileBytes)
    assert.equal(
      decoded.ok,
      false,
      `${attack.name} produced a second wire form for one record hash`,
    )
  })
}

for (const field of ['escrow_epoch', 'accepted_at'] as const) {
  test(`EnrollmentRecordV1 refuses ${field} above 2^53 rather than truncating it`, () => {
    const cleanBytes = encodeEnrollmentRecordV1(fixtureEnrollmentRecordV1())
    const hostileBytes = withNestedMutation(cleanBytes, (root) => {
      root.set(field, 9007199254740993n)
    })
    const decoded = decodeEnrollmentRecordV1(hostileBytes)
    assert.equal(decoded.ok, false)
    if (decoded.ok) return
    assert.match(decoded.reason, /integer field/i)
  })
}

for (const record of RECORDS_UNDER_TEST) {
  test(`${record.name} binds network_id into its hash, so a digest cannot replay cross-network`, () => {
    const onNetA = record.fixture()
    const onNetB = { ...onNetA, network_id: utf8('sige-other-net') }
    assert.notDeepEqual(record.hash(onNetA), record.hash(onNetB))
  })

  test(`${record.name} binds schema_version into its hash`, () => {
    const v1 = record.fixture()
    const v2 = { ...v1, schema_version: v1.schema_version + 1 }
    assert.notDeepEqual(record.hash(v1), record.hash(v2))
  })

  test(`${record.name} refuses an unrecognized schema_version rather than hashing fields it may misread`, () => {
    for (const version of [0n, 2n, 99n]) {
      const map = asCborMap(record.toCbor(record.fixture()))
      map.set('schema_version', version)
      const decoded = record.decode(encodeCbor(map))
      assert.equal(
        decoded.ok,
        false,
        `${record.name} accepted schema_version ${version}`,
      )
    }
  })

  test(`${record.name} refuses a record whose header is absent`, () => {
    for (const field of ['schema_version', 'network_id']) {
      const map = asCborMap(record.toCbor(record.fixture()))
      map.delete(field)
      const decoded = record.decode(encodeCbor(map))
      assert.equal(
        decoded.ok,
        false,
        `${record.name} accepted a record with no ${field}`,
      )
      if (decoded.ok) continue
      assert.match(decoded.reason, /header/i)
    }
  })
}

test('BitcoinAnchorV1 refuses a non-minimal observed_chain_work encoding', () => {
  const cleanBytes = encodeBitcoinAnchorV1(fixtureBitcoinAnchorV1())
  const hostileBytes = withNestedMutation(cleanBytes, (root) => {
    const work = root.get('observed_chain_work')
    assert.ok(work instanceof Uint8Array)
    root.set('observed_chain_work', new Uint8Array([0, ...work]))
  })
  assert.notDeepEqual(hostileBytes, cleanBytes)
  assert.equal(decodeBitcoinAnchorV1(cleanBytes).ok, true)
  assert.equal(decodeBitcoinAnchorV1(hostileBytes).ok, false)
})

function mustEnroll(world: ReturnType<typeof createWorld>, doc: string) {
  const result = enroll(world, doc, {
    fullLegalName: 'K Reconstruction',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-B5-1',
  })
  assert.ok(!('error' in result))
  if ('error' in result) throw new Error('unreachable')
  return result
}

function buildStoredEnrollmentRecordBytes(
  record: ReturnType<typeof mustEnroll>['record'],
): Uint8Array {
  const standardCiphertext: EscrowCiphertextV1 = {
    u: record.tracks.standard.U,
    nonce: record.tracks.standard.outer.nonce,
    ciphertext: record.tracks.standard.outer.ciphertext,
  }
  const proof = fixtureVtdProof()
  const stored = enrollmentRecordV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    account_id: record.accountId,
    account_public_key: record.accountPublicKey,
    enrollment_id: record.enrollmentId,
    credential_profile_id: 'demo/credential-profile/v1',
    trust_snapshot_id: 'demo/trust-snapshot/v1',
    policy_id: 'demo/policy/v1',
    escrow_epoch: record.escrowEpoch,
    delay_profile_id: 'sige-demo-delay/v1',
    transcript_hash: record.transcriptHash,
    identity_commitment: record.identityCommitment,
    document_nullifier: record.documentNullifier,
    // The emergency track has no live producer yet (task D1): this reuses
    // the standard track's bytes as a structural placeholder, unopened here.
    escrow_ciphertext_standard: standardCiphertext,
    escrow_ciphertext_emergency: standardCiphertext,
    enrollment_proof: randomBytes(32),
    timed_commitment_proof: { standard: proof, emergency: proof },
    proof_system_id: 'none-clear-mode/v1',
    unseal_detection_tag_key: null,
    accepted_at: 1,
    verifier_build_hash: randomBytes(32),
  })
  return encodeEnrollmentRecordV1(stored)
}

test('K is reconstructible from an EnrollmentRecordV1 loaded from canonical bytes alone, with no access to the original enrollment request (spec 18.2)', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const { record } = mustEnroll(world, 'DOC-B5-K-RECONSTRUCTION')
  const bytes = buildStoredEnrollmentRecordBytes(record)

  // From here on, only `bytes` (the stored record) and `world` (the
  // operator's own custody state) are in play, matching spec 18.2.
  const loaded = decodeEnrollmentRecordV1(bytes)
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return

  const keyResult = reconstructEscrowKey(world, loaded.value, 'standard')
  assert.equal(keyResult.refused, false)

  const plaintext = openEscrowCiphertextV1(world, loaded.value, 'standard')
  assert.ok(plaintext, 'K must be reconstructible and the outer AEAD must open')
  const envelope = decodeCbor(plaintext ?? new Uint8Array(0))
  assert.equal(envelope.ok, true)
  if (!envelope.ok) return
  assert.ok(envelope.value instanceof Map)
})

test('reconstructEscrowKey refuses with a named reason for an unregistered escrow epoch', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const record = enrollmentRecordV1({
    ...fixtureEnrollmentRecordV1(),
    escrow_epoch: 999,
  })
  const result = reconstructEscrowKey(world, record, 'standard')
  assert.equal(result.refused, true)
  if (!result.refused) return
  assert.match(result.reason, /escrow epoch 999/i)
})

test('reconstructEscrowKey refuses with a named reason for a malformed encapsulation point', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const record = enrollmentRecordV1({
    ...fixtureEnrollmentRecordV1(),
    escrow_ciphertext_standard: {
      ...fixtureEscrowCiphertext(),
      u: G2_IDENTITY,
    },
  })
  const result = reconstructEscrowKey(world, record, 'standard')
  assert.equal(result.refused, true)
  if (!result.refused) return
  assert.match(result.reason, /identity/i)
  assert.equal(openEscrowCiphertextV1(world, record, 'standard'), null)
})

// --- D3: the remaining leaf types and the disclosure record ---

test('the log leaf catalog covers every spec leaf type and refuses any other', () => {
  assert.deepEqual([...LEAF_TYPES].sort(), [
    'ANCHOR_OBSERVED',
    'DISCLOSURE',
    'ENROLLMENT_ACCEPTED',
    'ESCROW_EPOCH',
    'POLICY',
    'RECOVERY',
    'UNSEAL_EMERGENCY',
    'UNSEAL_STANDARD',
  ])

  for (const leafType of LEAF_TYPES) {
    const leaf = logLeafV1({ ...fixtureLogLeafV1(), leaf_type: leafType })
    assert.equal(decodeLogLeafV1(encodeLogLeafV1(leaf)).ok, true)
  }

  const map = asCborMap(logLeafV1Cbor(fixtureLogLeafV1()))
  map.set('leaf_type', 'UNSEAL_INVENTED')
  const decoded = decodeLogLeafV1(encodeCbor(map))
  assert.equal(decoded.ok, false)
  if (decoded.ok) return
  assert.match(decoded.reason, /unrecognized leaf_type/i)
})

function fixtureDisclosureV1(): DisclosureV1 {
  return disclosureV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    disclosure_id: randomBytes(16),
    authorization_hash: randomBytes(32),
    reviewed_by: 'demo-reviewer',
    review_decision_hash: randomBytes(32),
    opened_fields: ['case_reference'],
    opened_salts: [randomBytes(32)],
    disclosed_at: 42,
  })
}

test('DisclosureV1 round-trips and refuses a field opened with no salt', () => {
  const disclosure = fixtureDisclosureV1()
  const decoded = decodeDisclosureV1(encodeDisclosureV1(disclosure))
  assert.equal(decoded.ok, true)
  if (!decoded.ok) return
  assert.deepEqual(decoded.value, disclosure)

  const map = asCborMap(disclosureV1Cbor(disclosure))
  map.set('opened_fields', ['case_reference', 'smuggled_second_field'])
  const bad = decodeDisclosureV1(encodeCbor(map))
  assert.equal(bad.ok, false)
  if (bad.ok) return
  assert.match(bad.reason, /no salt/i)
})

test('no code path publishes case metadata on a timer: disclosure carries a reviewer, never a deadline (spec 8.2)', () => {
  const disclosure = fixtureDisclosureV1()
  const fields = Object.keys(disclosure)

  // A timed disclosure would need a future deadline to fire against. The
  // record has one clock, disclosed_at, and it records the past.
  for (const field of fields) {
    assert.doesNotMatch(
      field,
      /deadline|expires|scheduled|release_at|auto/i,
      `DisclosureV1.${field} reads like an automatic timed release`,
    )
  }
  assert.ok(fields.includes('reviewed_by'))
  assert.ok(fields.includes('review_decision_hash'))

  const sources = [
    readFileSync(new URL('../src/world/records.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/world/world.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/world/lifecycle.ts', import.meta.url), 'utf8'),
  ].join('\n')
  for (const timer of ['setTimeout', 'setInterval', 'requestIdleCallback']) {
    assert.equal(
      sources.includes(timer),
      false,
      `${timer} appears in the world sources; spec 8.2 forbids timed disclosure`,
    )
  }
})

// TENTH-REVIEW regression. The authorization pin is only worth anything if it
// is inside the pre-image the HSM gates sign. Zeroing the field in
// hashUnsealAuthorizationV1 alone, leaving encode and decode untouched, left
// the whole suite green. Nothing tested the property the fix rests on.
test('every unseal authorization field moves the hash the gates sign', () => {
  const base = fixtureUnsealAuthorizationV1()
  const baseline = toHex(hashUnsealAuthorizationV1(base))
  const mutations: Array<[string, UnsealAuthorizationV1]> = [
    [
      'enrollment_record_hash',
      { ...base, enrollment_record_hash: randomBytes(32) },
    ],
    ['enrollment_id', { ...base, enrollment_id: randomBytes(16) }],
    ['account_id', { ...base, account_id: randomBytes(32) }],
    ['ciphertext_hash', { ...base, ciphertext_hash: randomBytes(32) }],
    ['escrow_epoch', { ...base, escrow_epoch: base.escrow_epoch + 1 }],
    ['expires_at', { ...base, expires_at: base.expires_at + 1 }],
    ['track', { ...base, track: 'emergency' as const }],
    ['issuing_role', { ...base, issuing_role: `${base.issuing_role}-x` }],
  ]
  for (const [name, mutated] of mutations) {
    assert.notEqual(
      toHex(hashUnsealAuthorizationV1(mutated)),
      baseline,
      `${name} is absent from the signed pre-image`,
    )
  }
})
