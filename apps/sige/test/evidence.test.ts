import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesEqual, randomBytes, utf8 } from '../src/core/bytes.ts'
import { type CongestionPolicy, chainedWork } from '../src/core/congestion.ts'
import { dhash } from '../src/core/hash.ts'
import { setupParams } from '../src/core/lhtlp.ts'
import { leafHash, TransparencyLog } from '../src/core/merkle.ts'
import { scalarCommitment } from '../src/core/shamir.ts'
import { proveVtd } from '../src/core/vtd.ts'
import { escrowCiphertextHash } from '../src/world/derivations.ts'
import {
  attestationMessage,
  buildCeremonyTranscript,
  buildTimedCommitmentSolutionProof,
  type ClosingLeafV1,
  commitDecryptionResult,
  type EvidenceBundleV1,
  type EvidencePublicKeys,
  encodeClosingLeafV1,
  encodeEvidenceBundleV1,
  type HsmAttestation,
  hashEvidenceBundleV1,
  orderDocumentSignatureMessage,
  orderSignatureEvidenceCommitment,
  reviewerApprovalMessage,
  solutionProofCommitment,
  unopenedPuzzleIndices,
  verifyDecryptionResultOpening,
  verifyEvidenceBundle,
} from '../src/world/evidence.ts'
import { enrollmentAcceptedLeaf } from '../src/world/log-records.ts'
import {
  bitcoinAnchorV1,
  congestionStampLeafHash,
  type EnrollmentRecordV1,
  encodeLogLeafV1,
  enrollmentRecordV1,
  hashBitcoinAnchorV1,
  hashEnrollmentRecordV1,
  hashSignedTreeHeadV1,
  hashUnsealAuthorizationV1,
  logLeafV1,
  RECORD_SCHEMA_VERSION,
  signedTreeHeadV1,
  type UnsealAuthorizationV1,
  unsealAuthorizationV1,
  zeroStampOutput,
} from '../src/world/records.ts'

const FIXTURE_NETWORK_ID = utf8('sige-demo-net')
const VTD_PROFILE = { n: 6, k: 3, o: 2 }
const VTD_SECRET = 777n
const { params: VTD_PARAMS } = setupParams(320, 1)
const ISSUING_ROLE = 'court'
const CONGESTION_DIFFICULTY = 4
const CONGESTION_POLICY: CongestionPolicy = {
  dFloor: 4,
  baseline: 1,
  cap: 4,
  windowBlocks: 1000,
}

// THIRTEENTH-REVIEW. These loops asserted `notEqual(null)`, so a weakened guard
// stayed green: the NaN-difficulty case fell through to a later check and still
// returned a string. Every case is now pinned to the exact refusal it earns.
// Three of them earn a refusal from the inclusion proof rather than from the
// guard their label names, which this table now makes visible.
const EXPECTED_REFUSAL: Record<string, string> = {
  'truncated warrant signature':
    'warrant attestation signature does not verify against the pinned hsm key',
  'truncated log signature':
    'log attestation signature does not verify against the pinned hsm key',
  'truncated order signature':
    'order-signature evidence does not match the authorization commitment',
  'giant congestion difficulty':
    'log leaf is not included under the presented tree head',
  'NaN congestion difficulty':
    'congestion stamp difficulty is not a valid non-negative integer',
  'negative leaf index':
    'log leaf is not included under the presented tree head',
  'huge leaf index': 'log leaf is not included under the presented tree head',
  'oversized inclusion proof': 'inclusion proof is implausibly long',
  'oversized consistency proof': 'consistency proof is implausibly long',
  'empty commitments in solution proof':
    'timed-commitment proof failed verification: commitment count does not match the threshold',
  'out-of-range subset in solution proof':
    'solution proof subset is not a valid set of unopened puzzle indices',
  'huge subset in solution proof':
    'solution proof subset is not a valid set of unopened puzzle indices',
  'out-of-range recovered scalar':
    'solution proof recovered scalar is out of range for the scalar field',
  'zero-length recovered scalar':
    'solution proof recovered scalar is out of range for the scalar field',
  'short decryption commitment':
    'decryption result commitment must be a 32-byte digest',
  'empty ceremony steps':
    'closing leaf does not commit this ceremony transcript',
  'oversized ceremony steps':
    'closing leaf does not commit this ceremony transcript',
  'negative anchor block height':
    'anchor block height is not a valid non-negative integer',
  'zero anchor chain work': 'anchor observed chain work must be positive',
  'oversized anchor merkle proof':
    'anchor transaction merkle proof is implausibly long',
  'oversized closing inclusion proof':
    'closing inclusion proof is implausibly long',
  'wrong-length log public key':
    'signed tree head does not verify against the pinned log key',
  'wrong-length warrant hsm public key':
    'warrant attestation signature does not verify against the pinned hsm key',
  'wrong-length log hsm public key':
    'log attestation signature does not verify against the pinned hsm key',
  'empty role keys':
    'order-signature evidence signature does not verify against a pinned role key',
  'negative min confirmations':
    'minimum confirmations policy is not a valid non-negative integer',
}

function signAttestation(
  gate: 'warrant' | 'log',
  authorization: ReturnType<typeof unsealAuthorizationV1>,
  logLeaf: ReturnType<typeof logLeafV1>,
  hsmPriv: Uint8Array,
): HsmAttestation {
  const message = attestationMessage(gate, authorization, logLeaf)
  return { gate, message, signature: ed25519.sign(message, hsmPriv) }
}

// Builds one internally consistent bundle plus its public keys. Every
// negative test clones this and mutates exactly one thing.
//
// `mutateRecord` runs BEFORE the authorization is issued, so the whole ceremony
// is rebuilt around the mutated record: the authorization pins its hash, the
// leaf commits it, and both HSMs sign over it. Cloning a finished bundle and
// editing its record instead only ever reaches the record-hash check, which is
// how the epoch and ciphertext guards went untested.
function buildFixture(
  congestionDifficulty = CONGESTION_DIFFICULTY,
  mutateRecord: (record: EnrollmentRecordV1) => EnrollmentRecordV1 = (r) => r,
  mutateAuth: (auth: UnsealAuthorizationV1) => UnsealAuthorizationV1 = (a) => a,
): {
  bundle: EvidenceBundleV1
  keys: EvidencePublicKeys
  rolePriv: Uint8Array
} {
  const rolePriv = ed25519.utils.randomSecretKey()
  const rolePub = ed25519.getPublicKey(rolePriv)
  const warrantHsmPriv = ed25519.utils.randomSecretKey()
  const warrantHsmPub = ed25519.getPublicKey(warrantHsmPriv)
  const logHsmPriv = ed25519.utils.randomSecretKey()
  const logHsmPub = ed25519.getPublicKey(logHsmPriv)
  const reviewerPrivs = [
    ed25519.utils.randomSecretKey(),
    ed25519.utils.randomSecretKey(),
  ]
  const reviewerPubs = reviewerPrivs.map((priv) => ed25519.getPublicKey(priv))

  const orderDocumentHash = dhash('fixture-order', utf8('order text'))
  const orderSignatureEvidence = {
    orderDocumentHash,
    issuingRole: ISSUING_ROLE,
    signature: ed25519.sign(
      orderDocumentSignatureMessage(orderDocumentHash),
      rolePriv,
    ),
  }

  // The record's ciphertext and the authorization's hash must agree, exactly
  // as they do in a real ceremony, or checkEnrollmentBinding refuses.
  const fixtureEscrow = {
    u: randomBytes(96),
    nonce: randomBytes(24),
    ciphertext: randomBytes(48),
  }
  const fixtureCiphertextHash = escrowCiphertextHash(
    fixtureEscrow.u,
    fixtureEscrow.nonce,
    fixtureEscrow.ciphertext,
  )

  // The record exists before the order that opens it, so the fixture builds it
  // first and the authorization names its hash. Reversing that order is what
  // let the operator mint a second record for one authorization.
  const accountId = randomBytes(32)
  const enrollmentId = randomBytes(16)
  const vtdProof = proveVtd(VTD_PARAMS, VTD_SECRET, VTD_PROFILE)
  // ROW 10. The two tracks must lock DIFFERENT secrets under different nonces.
  // This fixture used one proof for both, which is the shape the verifier now
  // refuses, so the fixture was modelling an insecure record.
  const emergencyProof = proveVtd(VTD_PARAMS, VTD_SECRET + 1n, VTD_PROFILE)
  const enrollmentRecord = mutateRecord(
    enrollmentRecordV1({
      schema_version: RECORD_SCHEMA_VERSION,
      network_id: FIXTURE_NETWORK_ID,
      account_id: accountId,
      account_public_key: randomBytes(32),
      enrollment_id: enrollmentId,
      credential_profile_id: 'demo/credential-profile/v1',
      trust_snapshot_id: 'demo/trust-snapshot/v1',
      policy_id: 'demo/policy/v1',
      escrow_epoch: 1,
      delay_profile_id: 'sige-demo-delay/v1',
      transcript_hash: randomBytes(32),
      identity_commitment: randomBytes(32),
      document_nullifier: randomBytes(32),
      escrow_ciphertext_standard: fixtureEscrow,
      escrow_ciphertext_emergency: {
        u: randomBytes(96),
        nonce: randomBytes(24),
        ciphertext: randomBytes(48),
      },
      enrollment_proof: randomBytes(32),
      timed_commitment_proof: { standard: vtdProof, emergency: emergencyProof },
      proof_system_id: 'none-clear-mode/v1',
      unseal_detection_tag_key: null,
      accepted_at: 1,
      verifier_build_hash: randomBytes(32),
    }),
  )
  const enrollmentRecordHash = hashEnrollmentRecordV1(enrollmentRecord)

  // Approvals are real signatures over the approval-free pre-image, exactly as
  // the gates require. Random bytes here would leave the quorum untested.
  const unapproved = unsealAuthorizationV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    authorization_id: randomBytes(16),
    account_id: accountId,
    enrollment_id: enrollmentId,
    enrollment_record_hash: enrollmentRecordHash,
    escrow_epoch: 1,
    track: 'standard',
    ciphertext_hash: fixtureCiphertextHash,
    order_document_hash: orderDocumentHash,
    order_signature_evidence_hash: orderSignatureEvidenceCommitment(
      orderSignatureEvidence,
    ),
    issuing_authority: 'demo-court',
    issuing_role: ISSUING_ROLE,
    jurisdiction: 'generic',
    case_reference_commitment: randomBytes(32),
    legal_basis_code: 'demo-basis-1',
    requested_attribute_scope: ['fullLegalName'],
    mapping_explanation_commitment: randomBytes(32),
    reviewer_approvals: [],
    policy_version: 'demo/policy/v1',
    expires_at: 1000,
  })
  // mutateAuth runs BEFORE the approvals are signed and before the leaf and
  // attestations are built, so the whole ceremony is consistent with it. Editing
  // a finished bundle instead only ever reaches the quorum or the leaf binding.
  const mutated = mutateAuth(unapproved)
  const approvalMessage = reviewerApprovalMessage(mutated)
  const authorization = unsealAuthorizationV1({
    ...mutated,
    reviewer_approvals: reviewerPrivs.map((priv) =>
      ed25519.sign(approvalMessage, priv),
    ),
  })

  const unstampedLeaf = logLeafV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    leaf_type: 'UNSEAL_STANDARD',
    event_id: randomBytes(16),
    authorization_hash: hashUnsealAuthorizationV1(authorization),
    account_commitment: randomBytes(32),
    case_reference_commitment: authorization.case_reference_commitment,
    order_document_hash: authorization.order_document_hash,
    ciphertext_hash: authorization.ciphertext_hash,
    escrow_epoch: authorization.escrow_epoch,
    issuing_role: authorization.issuing_role,
    track: authorization.track,
    prev_unseal_anchor_ref: null,
    congestion_difficulty: congestionDifficulty,
    unseal_detection_tag: null,
    public_disclosure_class: 'standard',
    created_at: 10,
    extension_commitments: [],
    congestion_stamp_output: zeroStampOutput(),
  })

  // The stamp covers the leaf with its output field zeroed, then the output is
  // written back in, exactly as the gate protocol requires.
  const previousStampOutput = dhash('fixture-stamp-genesis')
  const stamp = chainedWork(
    previousStampOutput,
    congestionStampLeafHash(unstampedLeaf),
    congestionDifficulty,
  )
  const congestionEvidence = { stamp, previousStampOutput }
  const logLeaf = logLeafV1({
    ...unstampedLeaf,
    congestion_stamp_output: stamp.output,
  })

  // ROW 7: the tree id is inside the head signature now, so the log and the
  // record must name the same one or the signature will not verify.
  const log = new TransparencyLog('evidence-fixture-log/v1')
  log.append(randomBytes(12))
  // The enrollment leaf must be really included, as it is in a real ceremony.
  const enrollmentLeaf = enrollmentAcceptedLeaf({
    networkId: FIXTURE_NETWORK_ID,
    stored: enrollmentRecord,
    accountCommitment: randomBytes(32),
    createdAt: 1,
  })
  const enrollmentLeafIndex = log.append(encodeLogLeafV1(enrollmentLeaf))
  const previousHeadCore = log.signHead()
  const leafIndex = log.append(encodeLogLeafV1(logLeaf))
  log.append(randomBytes(12))
  const headCore = log.signHead()
  const inclusionProof = log.inclusionProof(leafIndex)
  // Proved at the SAME tree state as the head the anchor binds.
  const enrollmentInclusionProof = log.inclusionProof(enrollmentLeafIndex)
  const consistencyProof = log.consistencyProof(
    previousHeadCore.treeSize,
    headCore.treeSize,
  )

  const previousSignedHead = signedTreeHeadV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'evidence-fixture-log/v1',
    tree_size: previousHeadCore.treeSize,
    root_hash: previousHeadCore.rootHash,
    timestamp: 1,
    previous_tree_size: null,
    previous_root_hash: null,
    log_key_id: 'evidence-fixture-log-key/v1',
    signature: previousHeadCore.signature,
  })
  const signedHead = signedTreeHeadV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'evidence-fixture-log/v1',
    tree_size: headCore.treeSize,
    root_hash: headCore.rootHash,
    timestamp: 2,
    previous_tree_size: previousSignedHead.tree_size,
    previous_root_hash: previousSignedHead.root_hash,
    log_key_id: 'evidence-fixture-log-key/v1',
    signature: headCore.signature,
  })

  const bitcoinAnchor = bitcoinAnchorV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'evidence-fixture-log/v1',
    tree_size: signedHead.tree_size,
    root_hash: signedHead.root_hash,
    sth_hash: hashSignedTreeHeadV1(signedHead),
    commitment_scheme: 'op-return/v1',
    transaction_id: randomBytes(32),
    transaction_merkle_proof: [randomBytes(32), randomBytes(32)],
    block_header: randomBytes(80),
    block_height: 900_000,
    confirmation_policy: 3,
    observed_chain_work: 2n ** 90n + 7n,
  })

  const warrantAttestation = signAttestation(
    'warrant',
    authorization,
    logLeaf,
    warrantHsmPriv,
  )
  const logAttestation = signAttestation(
    'log',
    authorization,
    logLeaf,
    logHsmPriv,
  )

  const hS = scalarCommitment(VTD_SECRET)
  const subset = unopenedPuzzleIndices(vtdProof).slice(0, VTD_PROFILE.k)
  const solutionProof = buildTimedCommitmentSolutionProof({
    params: VTD_PARAMS,
    track: 'standard',
    proof: vtdProof,
    hS,
    subset,
    recoveredScalar: VTD_SECRET,
  })

  const decryptionResultCommitment = commitDecryptionResult(
    utf8('recovered-identity'),
    randomBytes(16),
  )

  const ceremonyTranscript = buildCeremonyTranscript({
    authorization,
    warrantAttestation,
    logAttestation,
    solutionProof,
    decryptionResultCommitment,
  })

  const closingLeaf: ClosingLeafV1 = {
    unsealLeafHash: leafHash(encodeLogLeafV1(logLeaf)),
    anchorHash: hashBitcoinAnchorV1(bitcoinAnchor),
    solutionProofCommitment: solutionProofCommitment(solutionProof),
    decryptionResultCommitment,
    ceremonyTranscriptHash: ceremonyTranscript.finalHash,
    closedAt: 20,
  }
  const closingLeafIndex = log.append(encodeClosingLeafV1(closingLeaf))
  const closingHeadCore = log.signHead()
  const closingInclusionProof = log.inclusionProof(closingLeafIndex)
  const closingSignedHead = signedTreeHeadV1({
    schema_version: RECORD_SCHEMA_VERSION,
    network_id: FIXTURE_NETWORK_ID,
    tree_id: 'evidence-fixture-log/v1',
    tree_size: closingHeadCore.treeSize,
    root_hash: closingHeadCore.rootHash,
    timestamp: 3,
    previous_tree_size: signedHead.tree_size,
    previous_root_hash: signedHead.root_hash,
    log_key_id: 'evidence-fixture-log-key/v1',
    signature: closingHeadCore.signature,
  })

  const bundle: EvidenceBundleV1 = {
    authorization,
    orderSignatureEvidence,
    logLeaf,
    leafIndex,
    inclusionProof,
    signedHead,
    previousSignedHead,
    consistencyProof,
    bitcoinAnchor,
    congestionEvidence,
    warrantAttestation,
    logAttestation,
    solutionProof,
    enrollmentRecord,
    enrollmentRecordHash,
    enrollmentLeaf,
    enrollmentLeafIndex,
    enrollmentInclusionProof,
    decryptionResultCommitment,
    ceremonyTranscript,
    closingLeaf,
    closingLeafIndex,
    closingInclusionProof,
    closingSignedHead,
    closingConsistencyProof: log.consistencyProof(
      signedHead.tree_size,
      closingSignedHead.tree_size,
    ),
  }

  const keys: EvidencePublicKeys = {
    roleKeys: new Map([[ISSUING_ROLE, rolePub]]),
    logPublicKey: log.publicKey,
    warrantHsmPublicKey: warrantHsmPub,
    logHsmPublicKey: logHsmPub,
    delayParams: VTD_PARAMS,
    expectedVtdProfile: VTD_PROFILE,
    minConfirmations: 1,
    minReviewerApprovals: 2,
    reviewerKeys: reviewerPubs,
    congestionPolicy: CONGESTION_POLICY,
  }

  return { bundle, keys, rolePriv }
}

function bumpByte(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes)
  copy[0] = (copy[0] + 1) % 256
  return copy
}

test('a well-formed bundle verifies clean', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)
})

test('negative: an altered order hash is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    orderSignatureEvidence: {
      ...bundle.orderSignatureEvidence,
      orderDocumentHash: bumpByte(
        bundle.orderSignatureEvidence.orderDocumentHash,
      ),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /order-signature evidence/)
})

test('negative: an altered account mapping (case reference) is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    authorization: {
      ...bundle.authorization,
      case_reference_commitment: bumpByte(
        bundle.authorization.case_reference_commitment,
      ),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  // Editing a finished bundle invalidates the approvals, which is itself a
  // correct refusal. The leaf binding gets its own case below, built through
  // the fixture so the approvals stay valid over the altered authorization.
  assert.match(String(reason), /verified reviewer approvals/)

  const rebuilt = buildFixture(CONGESTION_DIFFICULTY, undefined, (auth) => ({
    ...auth,
    case_reference_commitment: bumpByte(auth.case_reference_commitment),
  }))
  assert.equal(
    verifyEvidenceBundle(
      { ...rebuilt.bundle, logLeaf: bundle.logLeaf },
      rebuilt.keys,
    ),
    'log leaf does not commit this authorization',
  )
})

test('negative: a swapped leaf is refused', () => {
  const { bundle, keys } = buildFixture()
  const swapped: EvidenceBundleV1 = {
    ...bundle,
    logLeaf: { ...bundle.logLeaf, public_disclosure_class: 'DIFFERENT-CLASS' },
  }
  assert.equal(
    bytesEqual(
      swapped.logLeaf.authorization_hash,
      bundle.logLeaf.authorization_hash,
    ),
    true,
  )
  const reason = verifyEvidenceBundle(swapped, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /not included/)
})

test('negative: a spliced anchor is refused', () => {
  const { bundle, keys } = buildFixture()
  const splicedAnchor = {
    ...bundle.bitcoinAnchor,
    tree_size: bundle.bitcoinAnchor.tree_size + 1,
    root_hash: randomBytes(32),
    sth_hash: randomBytes(32),
  }
  const tampered: EvidenceBundleV1 = { ...bundle, bitcoinAnchor: splicedAnchor }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /anchor commits a different tree size/)
})

test('negative: an under-difficulty congestion stamp is refused', () => {
  const { bundle, keys } = buildFixture()
  const weakStamp = { ...bundle.congestionEvidence.stamp, difficulty: 0 }
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    congestionEvidence: { ...bundle.congestionEvidence, stamp: weakStamp },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /congestion stamp difficulty does not match/)
})

test('negative: an absent solution proof is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = { ...bundle, solutionProof: null }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /no timed-commitment solution proof/)
})

test('fix round 2: a rogue proof for a self-chosen secret is refused', () => {
  const { bundle, keys } = buildFixture()
  const rogueSecret = 424242n
  const rogueProof = proveVtd(VTD_PARAMS, rogueSecret, VTD_PROFILE)
  const rogueHs = scalarCommitment(rogueSecret)
  const rogueSubset = unopenedPuzzleIndices(rogueProof).slice(0, VTD_PROFILE.k)
  const rogueSolutionProof = buildTimedCommitmentSolutionProof({
    params: VTD_PARAMS,
    track: 'standard',
    proof: rogueProof,
    hS: rogueHs,
    subset: rogueSubset,
    recoveredScalar: rogueSecret,
  })
  // The rogue proof is internally honest, so verifyVtd alone accepts it. Two
  // independent bindings catch it: the enrollment's published commitment
  // fires first, and the closing leaf still catches it if that is bypassed.
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    solutionProof: rogueSolutionProof,
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(
    String(reason),
    /solution proof H_s is not the commitment this enrollment published/,
  )

  // The attacker's counter-move: supply a record that DOES publish the rogue
  // commitment, and declare its hash. Both self-consistency checks now pass.
  // Only the authorization's own pin refuses, and no operator can mint that.
  const rogueRecord = {
    ...bundle.enrollmentRecord,
    timed_commitment_proof: {
      standard: rogueProof,
      emergency: rogueProof,
    },
  }
  const deeper = verifyEvidenceBundle(
    {
      ...tampered,
      enrollmentRecord: rogueRecord,
      enrollmentRecordHash: hashEnrollmentRecordV1(rogueRecord),
    },
    keys,
  )
  assert.equal(
    deeper,
    'enrollment record is not the one this authorization was issued against',
  )
})

test('fix round 2: a blanked cut-and-choose (opened shares removed) is refused', () => {
  const { bundle, keys } = buildFixture()
  if (bundle.solutionProof === null)
    throw new Error('fixture must carry a solution proof')
  const blankedProof = { ...bundle.solutionProof.proof, opened: [] }
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    solutionProof: { ...bundle.solutionProof, proof: blankedProof },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /timed-commitment proof failed verification/)
})

test('fix round 2: a weaker-profile proof for the same secret is refused', () => {
  const { bundle, keys } = buildFixture()
  const weakProfile = { n: 3, k: 2, o: 1 }
  const weakProof = proveVtd(VTD_PARAMS, VTD_SECRET, weakProfile)
  const hS = scalarCommitment(VTD_SECRET)
  const subset = unopenedPuzzleIndices(weakProof).slice(0, weakProfile.k)
  const weakSolutionProof = buildTimedCommitmentSolutionProof({
    params: VTD_PARAMS,
    track: 'standard',
    proof: weakProof,
    hS,
    subset,
    recoveredScalar: VTD_SECRET,
  })
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    solutionProof: weakSolutionProof,
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /timed-commitment proof failed verification/)
})

test('fix round 2: a mismatched previous signed head is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    previousSignedHead: {
      ...bundle.previousSignedHead,
      tree_size: bundle.previousSignedHead.tree_size + 5,
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /does not precede the signed head/)
})

test('fix round 2: replacing the decryption commitment with random bytes is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    decryptionResultCommitment: randomBytes(32),
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(
    String(reason),
    /closing leaf does not commit the same decryption result/,
  )
})

test('fix round 2: an emergency-track unseal on a standard leaf type is refused', () => {
  const relabelled = buildFixture(CONGESTION_DIFFICULTY, undefined, (auth) => ({
    ...auth,
    track: 'emergency' as const,
  }))
  const logLeaf = {
    ...relabelled.bundle.logLeaf,
    track: 'emergency' as const,
  }
  const tampered: EvidenceBundleV1 = { ...relabelled.bundle, logLeaf }
  const reason = verifyEvidenceBundle(tampered, relabelled.keys)
  assert.notEqual(reason, null)
  assert.match(
    String(reason),
    /leaf type does not match the authorization track/,
  )
})

test('fix round 2: an anchor naming a different log is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    bitcoinAnchor: { ...bundle.bitcoinAnchor, tree_id: 'a-different-log/v1' },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /anchor names a different log/)
})

test('fix round 2: anchor shape (block height, chain work, header length) is checked', () => {
  const { bundle, keys } = buildFixture()
  const cases: Array<[string, Partial<typeof bundle.bitcoinAnchor>, RegExp]> = [
    ['negative block height', { block_height: -5 }, /block height/],
    [
      'zero chain work',
      { observed_chain_work: 0n },
      /chain work must be positive/,
    ],
    ['short block header', { block_header: randomBytes(79) }, /80 bytes/],
  ]
  for (const [label, patch, pattern] of cases) {
    const tampered: EvidenceBundleV1 = {
      ...bundle,
      bitcoinAnchor: { ...bundle.bitcoinAnchor, ...patch },
    }
    const reason = verifyEvidenceBundle(tampered, keys)
    assert.notEqual(reason, null, label)
    assert.match(String(reason), pattern, label)
  }
})

test('fix round 2: congestion difficulty below the policy floor is refused', () => {
  const { bundle, keys } = buildFixture(0)
  const reason = verifyEvidenceBundle(bundle, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /outside the policy-allowed range/)
})

test('fix round 2: congestion difficulty right but chain corrupt names the chain, not the difficulty', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    congestionEvidence: {
      ...bundle.congestionEvidence,
      previousStampOutput: randomBytes(32),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /does not recompute the expected hash chain/)
})

test('fix round 2: minConfirmations hostile types all refuse instead of silently passing', () => {
  const { bundle, keys } = buildFixture()
  const hostileValues: unknown[] = [null, undefined, 'not-a-number', [], {}]
  for (const value of hostileValues) {
    const hostileKeys: EvidencePublicKeys = {
      ...keys,
      minConfirmations: value as unknown as number,
    }
    let reason: string | null = null
    assert.doesNotThrow(() => {
      reason = verifyEvidenceBundle(bundle, hostileKeys)
    })
    assert.notEqual(
      reason,
      null,
      `minConfirmations=${JSON.stringify(value)} must refuse`,
    )
  }
})

test('fix round 2: a bare (non-domain-tagged) order-document signature is refused', () => {
  const { bundle, keys, rolePriv } = buildFixture()
  const bareSignature = ed25519.sign(
    bundle.orderSignatureEvidence.orderDocumentHash,
    rolePriv,
  )
  const evidence = {
    ...bundle.orderSignatureEvidence,
    signature: bareSignature,
  }
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    orderSignatureEvidence: evidence,
    authorization: {
      ...bundle.authorization,
      order_signature_evidence_hash: orderSignatureEvidenceCommitment(evidence),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(
    String(reason),
    /signature does not verify against a pinned role key/,
  )
})

test('bonus negative: a broken consistency proof is refused', () => {
  const { bundle, keys } = buildFixture()
  const corrupted = [...bundle.consistencyProof]
  const last = corrupted[corrupted.length - 1]
  assert.ok(last, 'the fixture must carry a real consistency proof')
  corrupted[corrupted.length - 1] = randomBytes(last.length)
  const reason = verifyEvidenceBundle(
    { ...bundle, consistencyProof: corrupted },
    keys,
  )
  assert.notEqual(reason, null)
  assert.match(String(reason), /consistent extension/)
})

test('CRITICAL regression: a bundle naming itself as its own predecessor with an empty proof is refused', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(
    verifyEvidenceBundle(bundle, keys),
    null,
    'positive control: the honest bundle verifies',
  )

  // verifyConsistency returns true on the degenerate oldSize === newSize
  // branch, so without an ordering check this passes with zero content.
  const selfPredecessor: EvidenceBundleV1 = {
    ...bundle,
    previousSignedHead: bundle.signedHead,
    consistencyProof: [],
  }
  const reason = verifyEvidenceBundle(selfPredecessor, keys)
  assert.notEqual(reason, null, 'a bundle was its own predecessor')
  assert.match(String(reason), /does not precede the signed head/)

  const droppedProof = verifyEvidenceBundle(
    { ...bundle, consistencyProof: [] },
    keys,
  )
  assert.notEqual(droppedProof, null, 'an empty consistency proof was accepted')
  assert.match(String(droppedProof), /consistency proof is absent/)
})

test('bonus negative: a forged hsm attestation signature is refused', () => {
  const { bundle, keys } = buildFixture()
  const rogueKey = ed25519.utils.randomSecretKey()
  const forgedMessage = attestationMessage(
    'warrant',
    bundle.authorization,
    bundle.logLeaf,
  )
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    warrantAttestation: {
      gate: 'warrant',
      message: forgedMessage,
      signature: ed25519.sign(forgedMessage, rogueKey),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /warrant attestation signature/)
})

test('bonus negative: a tampered ceremony transcript is refused', () => {
  const { bundle, keys } = buildFixture()
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    ceremonyTranscript: {
      ...bundle.ceremonyTranscript,
      steps: bundle.ceremonyTranscript.steps.map((step, i) =>
        i === 0 ? { ...step, commitment: bumpByte(step.commitment) } : step,
      ),
    },
  }
  const reason = verifyEvidenceBundle(tampered, keys)
  assert.notEqual(reason, null)
  assert.match(String(reason), /ceremony transcript/)
})

test('the decryption-result commitment opens later without being in the bundle', () => {
  const resultBytes = utf8('recovered-identity')
  const opening = randomBytes(16)
  const commitment = commitDecryptionResult(resultBytes, opening)
  assert.equal(
    verifyDecryptionResultOpening(commitment, resultBytes, opening),
    true,
  )
  assert.equal(
    verifyDecryptionResultOpening(commitment, utf8('wrong-identity'), opening),
    false,
  )
})

test('the canonical encoding and hash are stable and change under tampering', () => {
  const { bundle } = buildFixture()
  const bytesA = encodeEvidenceBundleV1(bundle)
  const bytesB = encodeEvidenceBundleV1(bundle)
  assert.equal(bytesEqual(bytesA, bytesB), true)
  assert.equal(
    bytesEqual(hashEvidenceBundleV1(bundle), hashEvidenceBundleV1(bundle)),
    true,
  )
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    leafIndex: bundle.leafIndex + 1,
  }
  assert.equal(
    bytesEqual(hashEvidenceBundleV1(bundle), hashEvidenceBundleV1(tampered)),
    false,
  )
})

test('verifyEvidenceBundle never throws even on a null-prototype throw deep in encoding', () => {
  const { bundle, keys } = buildFixture()
  // encodeMap reads `.size` before `.entries()`; both are needed to reach the throw.
  const hostileDisclosureClass = {
    size: 0,
    entries: () => {
      throw Object.create(null)
    },
  }
  const tampered: EvidenceBundleV1 = {
    ...bundle,
    logLeaf: {
      ...bundle.logLeaf,
      public_disclosure_class: hostileDisclosureClass as unknown as string,
    },
  }
  let reason: string | null = null
  assert.doesNotThrow(() => {
    reason = verifyEvidenceBundle(tampered, keys)
  })
  assert.match(
    String(reason),
    /evidence bundle is malformed: unrecognized error shape/,
  )
})

test('verifyEvidenceBundle completes fast: it never calls solveVtd regardless of t', () => {
  const { params: slowParams } = setupParams(320, 3_000_000)
  const proof = proveVtd(slowParams, VTD_SECRET, VTD_PROFILE)
  const hS = scalarCommitment(VTD_SECRET)
  const subset = unopenedPuzzleIndices(proof).slice(0, VTD_PROFILE.k)
  const solutionProof = buildTimedCommitmentSolutionProof({
    params: slowParams,
    track: 'standard',
    proof,
    hS,
    subset,
    recoveredScalar: VTD_SECRET,
  })
  const { bundle, keys } = buildFixture()
  const decryptionResultCommitment = bundle.decryptionResultCommitment
  const ceremonyTranscript = buildCeremonyTranscript({
    authorization: bundle.authorization,
    warrantAttestation: bundle.warrantAttestation,
    logAttestation: bundle.logAttestation,
    solutionProof,
    decryptionResultCommitment,
  })
  const closingLeaf: ClosingLeafV1 = {
    ...bundle.closingLeaf,
    solutionProofCommitment: solutionProofCommitment(solutionProof),
  }
  const slowBundle: EvidenceBundleV1 = {
    ...bundle,
    solutionProof,
    ceremonyTranscript,
    closingLeaf,
  }
  const slowKeys: EvidencePublicKeys = { ...keys, delayParams: slowParams }
  const start = performance.now()
  verifyEvidenceBundle(slowBundle, slowKeys)
  const elapsedMs = performance.now() - start
  assert.ok(
    elapsedMs < 2000,
    `verifyEvidenceBundle took ${elapsedMs}ms; solveVtd at t=3,000,000 would take far longer`,
  )
})

test('hostile input never throws: malformed bundle fields all refuse by name', () => {
  const { bundle, keys } = buildFixture()

  const hostileCases: Array<[string, EvidenceBundleV1]> = [
    [
      'truncated warrant signature',
      {
        ...bundle,
        warrantAttestation: {
          ...bundle.warrantAttestation,
          signature: bundle.warrantAttestation.signature.slice(0, 3),
        },
      },
    ],
    [
      'truncated log signature',
      {
        ...bundle,
        logAttestation: {
          ...bundle.logAttestation,
          signature: bundle.logAttestation.signature.slice(0, 3),
        },
      },
    ],
    [
      'truncated order signature',
      {
        ...bundle,
        orderSignatureEvidence: {
          ...bundle.orderSignatureEvidence,
          signature: bundle.orderSignatureEvidence.signature.slice(0, 3),
        },
      },
    ],
    [
      'giant congestion difficulty',
      {
        ...bundle,
        logLeaf: {
          ...bundle.logLeaf,
          congestion_difficulty: Number.MAX_SAFE_INTEGER,
        },
        congestionEvidence: {
          ...bundle.congestionEvidence,
          stamp: {
            ...bundle.congestionEvidence.stamp,
            difficulty: Number.MAX_SAFE_INTEGER,
          },
        },
      },
    ],
    [
      'NaN congestion difficulty',
      {
        ...bundle,
        congestionEvidence: {
          ...bundle.congestionEvidence,
          stamp: { ...bundle.congestionEvidence.stamp, difficulty: Number.NaN },
        },
      },
    ],
    ['negative leaf index', { ...bundle, leafIndex: -1 }],
    ['huge leaf index', { ...bundle, leafIndex: 999_999_999 }],
    [
      'oversized inclusion proof',
      {
        ...bundle,
        inclusionProof: Array.from({ length: 500 }, () => randomBytes(32)),
      },
    ],
    [
      'oversized consistency proof',
      {
        ...bundle,
        consistencyProof: Array.from({ length: 500 }, () => randomBytes(32)),
      },
    ],
    [
      'empty commitments in solution proof',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: {
              ...bundle.solutionProof,
              proof: { ...bundle.solutionProof.proof, commitments: { a: [] } },
            },
          },
    ],
    [
      'out-of-range subset in solution proof',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: { ...bundle.solutionProof, subset: [0, 999] },
          },
    ],
    [
      'huge subset in solution proof',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: {
              ...bundle.solutionProof,
              subset: Array.from({ length: 5000 }, (_, i) => i + 1),
            },
          },
    ],
    [
      'out-of-range recovered scalar',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: {
              ...bundle.solutionProof,
              recoveredScalar: new Uint8Array(64).fill(0xff),
            },
          },
    ],
    [
      'zero-length recovered scalar',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: {
              ...bundle.solutionProof,
              recoveredScalar: new Uint8Array(0),
            },
          },
    ],
    [
      'short decryption commitment',
      { ...bundle, decryptionResultCommitment: new Uint8Array(4) },
    ],
    [
      'empty ceremony steps',
      {
        ...bundle,
        ceremonyTranscript: { steps: [], finalHash: randomBytes(32) },
      },
    ],
    [
      'oversized ceremony steps',
      {
        ...bundle,
        ceremonyTranscript: {
          steps: Array.from({ length: 50 }, () => ({
            label: 'x',
            commitment: randomBytes(32),
          })),
          finalHash: randomBytes(32),
        },
      },
    ],
    [
      'negative anchor block height',
      {
        ...bundle,
        bitcoinAnchor: { ...bundle.bitcoinAnchor, block_height: -5 },
      },
    ],
    [
      'zero anchor chain work',
      {
        ...bundle,
        bitcoinAnchor: { ...bundle.bitcoinAnchor, observed_chain_work: 0n },
      },
    ],
    [
      'oversized anchor merkle proof',
      {
        ...bundle,
        bitcoinAnchor: {
          ...bundle.bitcoinAnchor,
          transaction_merkle_proof: Array.from({ length: 500 }, () =>
            randomBytes(32),
          ),
        },
      },
    ],
    [
      'oversized closing inclusion proof',
      {
        ...bundle,
        closingInclusionProof: Array.from({ length: 500 }, () =>
          randomBytes(32),
        ),
      },
    ],
  ]

  // THIRTEENTH-REVIEW. `notEqual(null)` let a weakened guard stay green: the
  // NaN-difficulty case fell through to a different check and still returned a
  // string. Every refusal here is now pinned to the check that owns it.
  for (const [label, hostileBundle] of hostileCases) {
    let reason: string | null = null
    assert.doesNotThrow(() => {
      reason = verifyEvidenceBundle(hostileBundle, keys)
    }, `${label} must not throw`)
    assert.notEqual(reason, null, `${label} must be refused, not accepted`)
    assert.equal(reason, EXPECTED_REFUSAL[label], label)
  }
})

test('hostile input never throws: malformed public keys all refuse by name', () => {
  const { bundle, keys } = buildFixture()

  const hostileKeyCases: Array<[string, EvidencePublicKeys]> = [
    [
      'wrong-length log public key',
      { ...keys, logPublicKey: keys.logPublicKey.slice(0, 3) },
    ],
    [
      'wrong-length warrant hsm public key',
      { ...keys, warrantHsmPublicKey: keys.warrantHsmPublicKey.slice(0, 3) },
    ],
    [
      'wrong-length log hsm public key',
      { ...keys, logHsmPublicKey: keys.logHsmPublicKey.slice(0, 3) },
    ],
    ['empty role keys', { ...keys, roleKeys: new Map() }],
    ['negative min confirmations', { ...keys, minConfirmations: -1 }],
  ]

  for (const [label, hostileKeys] of hostileKeyCases) {
    let reason: string | null = null
    assert.doesNotThrow(() => {
      reason = verifyEvidenceBundle(bundle, hostileKeys)
    }, `${label} must not throw`)
    assert.notEqual(reason, null, `${label} must be refused, not accepted`)
    assert.equal(reason, EXPECTED_REFUSAL[label], label)
  }
})

test('the authorization legal predicates are read, not merely hashed', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)

  const noReviewers = verifyEvidenceBundle(
    {
      ...bundle,
      authorization: { ...bundle.authorization, reviewer_approvals: [] },
    },
    keys,
  )
  assert.notEqual(noReviewers, null, 'zero reviewer approvals verified')
  assert.equal(
    noReviewers,
    'authorization carries 0 verified reviewer approvals, policy requires 2',
  )

  // ROW 18. Two approvals of the right shape, signed by a key outside the
  // pinned roster. Counting them satisfied the quorum; verifying them does not.
  const stranger = ed25519.utils.randomSecretKey()
  const forgedApprovals = buildFixture(
    CONGESTION_DIFFICULTY,
    undefined,
    (auth) => auth,
  )
  const message = reviewerApprovalMessage({
    ...forgedApprovals.bundle.authorization,
    reviewer_approvals: [],
  })
  assert.equal(
    verifyEvidenceBundle(
      {
        ...forgedApprovals.bundle,
        authorization: {
          ...forgedApprovals.bundle.authorization,
          reviewer_approvals: [
            ed25519.sign(message, stranger),
            ed25519.sign(message, stranger),
          ],
        },
      },
      forgedApprovals.keys,
    ),
    'authorization carries 0 verified reviewer approvals, policy requires 2',
  )

  // One reviewer cannot be the whole quorum. The roster is positional, so
  // approval i must verify under reviewer i. Only that indexing refuses this.
  const solo = buildFixture()
  const soloMessage = reviewerApprovalMessage({
    ...solo.bundle.authorization,
    reviewer_approvals: [],
  })
  const firstKey = solo.keys.reviewerKeys[0]
  assert.ok(firstKey)
  const doubled = solo.bundle.authorization.reviewer_approvals[0]
  assert.ok(doubled)
  assert.equal(
    ed25519.verify(doubled, soloMessage, firstKey),
    true,
    'the duplicated approval is a real signature by reviewer 0',
  )
  assert.equal(
    verifyEvidenceBundle(
      {
        ...solo.bundle,
        authorization: {
          ...solo.bundle.authorization,
          reviewer_approvals: [doubled, doubled],
        },
      },
      solo.keys,
    ),
    'authorization carries 1 verified reviewer approvals, policy requires 2',
  )

  // The expiry predicate needs the ceremony rebuilt, because expires_at is
  // inside the approval pre-image and inside the leaf's authorization hash.
  const stale = buildFixture(CONGESTION_DIFFICULTY, undefined, (auth) => ({
    ...auth,
    expires_at: 1,
  }))
  const expired = verifyEvidenceBundle(stale.bundle, stale.keys)
  assert.notEqual(expired, null, 'an expired authorization verified')
  assert.match(String(expired), /expired/i)

  const noScope = verifyEvidenceBundle(
    {
      ...bundle,
      authorization: {
        ...bundle.authorization,
        requested_attribute_scope: [],
      },
    },
    keys,
  )
  assert.notEqual(noScope, null, 'an empty attribute scope verified')

  const noBasis = verifyEvidenceBundle(
    {
      ...bundle,
      authorization: { ...bundle.authorization, legal_basis_code: '' },
    },
    keys,
  )
  assert.notEqual(noBasis, null, 'a missing legal basis verified')
})

test('verifyEvidenceBundle does not throw on a value whose prototype trap throws', () => {
  const { bundle, keys } = buildFixture()
  const hostile = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error('prototype trap')
      },
      get() {
        throw new Error('get trap')
      },
    },
  )
  assert.doesNotThrow(() => {
    const reason = verifyEvidenceBundle(
      { ...bundle, authorization: hostile as never },
      keys,
    )
    assert.notEqual(reason, null)
  })
})

test('the enrollment record binds the recovered secret to the named account', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)

  const wrongHash = verifyEvidenceBundle(
    { ...bundle, enrollmentRecordHash: randomBytes(32) },
    keys,
  )
  assert.notEqual(wrongHash, null, 'the record hash is still inert')
  assert.match(String(wrongHash), /does not match the declared record hash/i)

  // Built through the fixture, so the account mismatch is the ONLY thing wrong:
  // the authorization pins this record, the leaf commits it, the HSMs sign it.
  const crossed = buildFixture(CONGESTION_DIFFICULTY, (record) => ({
    ...record,
    account_id: randomBytes(32),
  }))
  const verdict = verifyEvidenceBundle(crossed.bundle, crossed.keys)
  assert.notEqual(verdict, null, 'a record for another account verified')
  assert.equal(verdict, 'enrollment record is for another account')
})

// TENTH-REVIEW regression. Deleting any of these four guards left the suite
// green, because every negative test cloned a finished bundle and edited the
// record, which only ever reached the record-hash check. Each case below is
// built through the fixture, so the named disagreement is the only fault in an
// otherwise real ceremony, and the refusal is asserted exactly.
test('each enrollment binding guard refuses on its own', () => {
  const cases: Array<{
    name: string
    mutate: (record: EnrollmentRecordV1) => EnrollmentRecordV1
    refusal: string
  }> = [
    {
      name: 'escrow epoch',
      mutate: (record) => ({ ...record, escrow_epoch: 4242 }),
      refusal: 'enrollment record names another escrow epoch',
    },
    {
      name: 'enrollment id',
      mutate: (record) => ({ ...record, enrollment_id: randomBytes(16) }),
      refusal: 'enrollment record is for another enrollment',
    },
    {
      name: 'track ciphertext',
      mutate: (record) => ({
        ...record,
        escrow_ciphertext_standard: {
          ...record.escrow_ciphertext_standard,
          ciphertext: randomBytes(
            record.escrow_ciphertext_standard.ciphertext.length,
          ),
        },
      }),
      refusal:
        'enrollment record does not carry the ciphertext this authorization opened',
    },
  ]

  for (const { name, mutate, refusal } of cases) {
    const { bundle, keys } = buildFixture(CONGESTION_DIFFICULTY, mutate)
    assert.equal(verifyEvidenceBundle(bundle, keys), refusal, name)
  }
})

// ROW 20. The transcript is recomputable byte for byte from the bundle's own
// fields, so checking it against itself constrained nothing. What gives it
// content is the closing leaf: the log published the transcript hash under a
// signed head, and the auditor proves that leaf's inclusion.
test('the closing leaf must commit the ceremony transcript the bundle carries', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)

  // A transcript the log never published. Both the bundle's own transcript and
  // the closing leaf's commitment move together, so a self-consistent forgery
  // is exactly what the old check could not see.
  const rogue = randomBytes(32)
  // Either side alone disagrees with the logged commitment.
  assert.equal(
    verifyEvidenceBundle(
      {
        ...bundle,
        ceremonyTranscript: { ...bundle.ceremonyTranscript, finalHash: rogue },
      },
      keys,
    ),
    'closing leaf does not commit this ceremony transcript',
  )
  assert.equal(
    verifyEvidenceBundle(
      {
        ...bundle,
        closingLeaf: { ...bundle.closingLeaf, ceremonyTranscriptHash: rogue },
      },
      keys,
    ),
    'closing leaf does not commit this ceremony transcript',
  )

  // Moving both sides together is what defeated the old self-check. It cannot
  // work now: the hash lives in the leaf bytes the log published, so editing it
  // breaks the inclusion proof. That refusal IS the property row 20 adds.
  assert.equal(
    verifyEvidenceBundle(
      {
        ...bundle,
        ceremonyTranscript: { ...bundle.ceremonyTranscript, finalHash: rogue },
        closingLeaf: { ...bundle.closingLeaf, ceremonyTranscriptHash: rogue },
      },
      keys,
    ),
    'closing leaf is not included under the presented closing tree head',
  )
})

// ROW 19, narrowed after a Codex review. This test mutates an ALREADY PUBLISHED
// honest leaf, so what it proves is that a start cannot be restated after the
// fact. It does not prove the start was constrained when the producer built the
// leaf: the pre-image zeroes the output field, so any start was available then.
test('the congestion stamp output is the one the log published', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)

  // A producer who wants a different starting point recomputes its own stamp.
  // The leaf the log signed still carries the honest output, so it is refused.
  const chosenStart = randomBytes(32)
  const restamped = chainedWork(
    chosenStart,
    congestionStampLeafHash(bundle.logLeaf),
    bundle.congestionEvidence.stamp.difficulty,
  )
  assert.equal(
    verifyEvidenceBundle(
      {
        ...bundle,
        congestionEvidence: {
          stamp: restamped,
          previousStampOutput: chosenStart,
        },
      },
      keys,
    ),
    'congestion stamp output is not the one the log published',
  )

  // Moving the leaf's field to match breaks the leaf's own inclusion proof,
  // which is the whole point of putting the output in log-signed bytes.
  assert.equal(
    verifyEvidenceBundle(
      {
        ...bundle,
        logLeaf: {
          ...bundle.logLeaf,
          congestion_stamp_output: restamped.output,
        },
        congestionEvidence: {
          stamp: restamped,
          previousStampOutput: chosenStart,
        },
      },
      keys,
    ),
    'log leaf is not included under the presented tree head',
  )
})

test('an implausibly long enrollment inclusion proof is refused by length', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null)
  const padded: EvidenceBundleV1 = {
    ...bundle,
    enrollmentInclusionProof: Array.from({ length: 65 }, () => randomBytes(32)),
  }
  assert.equal(
    verifyEvidenceBundle(padded, keys),
    'enrollment inclusion proof is implausibly long',
  )
})

// ROWS 6, 8 and 10. Three properties the bundle asserted and never checked.
test('ROWS 6, 8, 10: heads are bound to one branch, one log, and the tracks are separate', () => {
  const { bundle, keys } = buildFixture()
  assert.equal(verifyEvidenceBundle(bundle, keys), null, 'positive control')

  // ROW 6. A closing head that is LATER, correctly signed and names the same
  // log, but sits on another branch. Only consistency to the unseal head sees
  // it. The proof is dropped rather than the head edited, because editing the
  // head would break its own signature instead.
  assert.equal(
    verifyEvidenceBundle({ ...bundle, closingConsistencyProof: [] }, keys),
    'closing head is not a consistent extension of the unseal head',
  )

  // ROW 8. The head signature covers the size and the root and nothing else, so
  // these four fields were free on all three heads. Each makes a byte-distinct
  // bundle that used to earn the same verdict.
  const cases: Array<
    [string, Partial<typeof bundle.closingSignedHead>, string]
  > = [
    [
      'tree_id',
      { tree_id: 'other-log/v1' },
      'closing head names a different log than the signed head',
    ],
    [
      'log_key_id',
      { log_key_id: 'other-key/v1' },
      'closing head names a different log key than the signed head',
    ],
    [
      'schema_version',
      { schema_version: bundle.signedHead.schema_version + 1 },
      'closing head declares a different schema version',
    ],
    [
      'network_id',
      { network_id: randomBytes(8) },
      'closing head names a different network',
    ],
  ]
  for (const [label, patch, refusal] of cases) {
    assert.equal(
      verifyEvidenceBundle(
        {
          ...bundle,
          closingSignedHead: { ...bundle.closingSignedHead, ...patch },
        },
        keys,
      ),
      refusal,
      label,
    )
  }

  // ROW 10. One secret and one nonce across both tracks means the emergency
  // track's separate authorization path buys nothing.
  const shared = buildFixture(CONGESTION_DIFFICULTY, (record) => ({
    ...record,
    timed_commitment_proof: {
      standard: record.timed_commitment_proof.standard,
      emergency: record.timed_commitment_proof.standard,
    },
  }))
  assert.equal(
    verifyEvidenceBundle(shared.bundle, shared.keys),
    'both tracks reuse one timed-commitment nonce',
  )
  const sharedNonce = buildFixture(CONGESTION_DIFFICULTY, (record) => ({
    ...record,
    escrow_ciphertext_emergency: {
      ...record.escrow_ciphertext_emergency,
      nonce: record.escrow_ciphertext_standard.nonce,
    },
  }))
  assert.equal(
    verifyEvidenceBundle(sharedNonce.bundle, sharedNonce.keys),
    'both tracks reuse one escrow nonce',
  )
})
