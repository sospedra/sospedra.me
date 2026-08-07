import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { seal } from '../src/core/aead.ts'
import {
  bytesEqual,
  bytesToBigInt,
  randomBytes,
  toHex,
  utf8,
} from '../src/core/bytes.ts'
import { dhash } from '../src/core/hash.ts'
import {
  type EpochKeys,
  encapsulate,
  gateIdentity,
  genEpoch,
} from '../src/core/kem.ts'
import { setupParams } from '../src/core/lhtlp.ts'
import { scalarCommitment } from '../src/core/shamir.ts'
import {
  coefficientsDeriveFromSecret,
  proveVtd,
  type VtdProfile,
  verifyVtd,
} from '../src/core/vtd.ts'
import {
  transcriptHash,
  tryDocumentNullifier,
} from '../src/world/derivations.ts'
import {
  type AcceptedEnrollmentFields,
  type ActivePolicy,
  activateAfterInclusion,
  checkActivePolicyMaterial,
  checkCredentialChainRoot,
  checkCredentialNotRevoked,
  checkCredentialSignature,
  checkCredentialTypeAndValidity,
  checkDelayMatchesProfile,
  checkDocumentNullifierDerivation,
  checkEscrowDecryptsToEnvelope,
  checkIdentityCommitment,
  checkInnerKeyBindsToPublishedCommitment,
  checkKeyReconstructibleFromStoredFields,
  checkNormalizedFieldsAuthenticated,
  checkRelationInternal,
  checkRequestShape,
  checkTimedCommitmentProof,
  checkTranscriptBinding,
  computeCredentialAttestedAttrsHash,
  computeDocumentNullifier,
  computeEnvelopePlaintext,
  computeEscrowContext,
  computeIdentityCommitment,
  computeInnerAd,
  computeInnerKey,
  computePayloadPlaintext,
  computeTranscriptHash,
  type EnrollmentAcceptance,
  type EnrollmentAcceptedLeaf,
  type EnrollmentDependencies,
  type EnrollmentOutcome,
  type EnrollmentStatement,
  type EnrollmentWitness,
  MAX_ESCROW_EPOCH,
  MAX_SUBMITTED_VTD_K,
  type NormalizedIdentityAttributes,
  persistAcceptance,
  SUBMITTER_REFUSAL_MESSAGE,
  type SubmittedEnrollmentPackage,
  type Track,
  verifyEnrollmentSubmission,
} from '../src/world/enrollment-verifier.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import {
  createWorld,
  enroll,
  enrollForMigration,
  escrowContext as worldEscrowContext,
} from '../src/world/world.ts'

const TRACKS: readonly Track[] = ['standard', 'emergency']
const Fr = bls12_381.fields.Fr

function randomVtdSecret(): bigint {
  for (;;) {
    const s = Fr.create(bytesToBigInt(randomBytes(48)))
    if (s !== 0n) return s
  }
}

const NOW = 1_700_000_000
const NETWORK_ID = utf8('sige-verifier-test-net')
const CHAIN_ROOT = dhash('test-chain-root')
const CREDENTIAL_TYPE = 'national-id'
const CREDENTIAL_PROFILE_ID = 'cred-v1'
// n:6,k:3,o:2 gave ~1.3 soundness bits, so a single tampered puzzle had a
// real chance of evading detection. Matches vtd.test.ts's own fast fixture.
const VTD_PROFILE: VtdProfile = { n: 24, k: 7, o: 6 }
const DELAY_T = 64
const PERSON: NormalizedIdentityAttributes = {
  fullLegalName: 'Ada Voss',
  dateOfBirth: '1990-04-12',
  documentNumber: 'ID-A-4472',
}

function buildActivePolicy(): { policy: ActivePolicy; revoked: Set<string> } {
  const { params } = setupParams(320, DELAY_T)
  const epochKeys: EpochKeys = genEpoch(1)
  const revoked = new Set<string>()
  const policy: ActivePolicy = {
    networkId: NETWORK_ID,
    policyId: 'policy-v1',
    trustSnapshotId: 'trust-v1',
    acceptedCredentialTypes: [CREDENTIAL_TYPE],
    acceptedCredentialProfileIds: [CREDENTIAL_PROFILE_ID],
    acceptedChainRoots: [CHAIN_ROOT],
    isDocumentRevoked: (nullifier) => revoked.has(toHex(nullifier)),
    escrowEpoch: 1,
    epochKeys,
    delayProfileId: 'delay-v1',
    proofSystemId: 'clear-mode-v1',
    vtdProfile: VTD_PROFILE,
    delayT: DELAY_T,
    delayLhtlpParams: params,
  }
  return { policy, revoked }
}

function buildDeps(): {
  deps: EnrollmentDependencies
  consumedNonces: Set<string>
  seenNullifiers: Set<string>
} {
  const consumedNonces = new Set<string>()
  const seenNullifiers = new Set<string>()
  const deps: EnrollmentDependencies = {
    now: () => NOW,
    consumeServerNonce: (nonce) => {
      const key = toHex(nonce)
      if (consumedNonces.has(key)) return false
      consumedNonces.add(key)
      return true
    },
    reserveNullifier: (nullifier) => {
      const key = toHex(nullifier)
      if (seenNullifiers.has(key)) return false
      seenNullifiers.add(key)
      return true
    },
  }
  return { deps, consumedNonces, seenNullifiers }
}

type BuildPackageOptions = {
  attrs?: NormalizedIdentityAttributes
  statementNetworkId?: Uint8Array
  documentIssuanceId?: string
}

// statementNetworkId forges the client-declared network_id while
// gateIdentity/computeEscrowContext below keep the real policy.networkId.
function buildPackage(
  policy: ActivePolicy,
  options: BuildPackageOptions = {},
): SubmittedEnrollmentPackage {
  const attrs = options.attrs ?? PERSON
  const statementNetworkId = options.statementNetworkId ?? policy.networkId
  const accountKey = ed25519.utils.randomSecretKey()
  const accountPublicKey = ed25519.getPublicKey(accountKey)
  const accountId = dhash('test-account', accountPublicKey)
  const enrollmentId = randomBytes(16)
  const serverNonce = randomBytes(32)
  const clientNonce = randomBytes(32)

  const transcriptHash = computeTranscriptHash({
    networkId: statementNetworkId,
    accountId,
    accountPublicKey,
    enrollmentId,
    serverNonce,
    clientNonce,
    policyId: policy.policyId,
    trustSnapshotId: policy.trustSnapshotId,
    escrowEpoch: policy.escrowEpoch,
    delayProfileId: policy.delayProfileId,
  })

  const opening = randomBytes(32)
  const identityCommitment = computeIdentityCommitment(
    attrs,
    accountPublicKey,
    opening,
  )
  const documentIssuanceId =
    options.documentIssuanceId ?? `doc-${toHex(randomBytes(8))}`
  const documentNullifier = computeDocumentNullifier(
    statementNetworkId,
    documentIssuanceId,
  )

  const documentKey = ed25519.utils.randomSecretKey()
  const documentPublicKey = ed25519.getPublicKey(documentKey)
  const documentSignature = ed25519.sign(transcriptHash, documentKey)
  const credentialAttestedAttrsHash = computeCredentialAttestedAttrsHash(attrs)

  const escrowContextFor = (track: Track) =>
    computeEscrowContext(
      {
        accountId,
        accountPublicKey,
        enrollmentId,
        escrowEpoch: policy.escrowEpoch,
      },
      policy,
      track,
    )
  const innerAd = computeInnerAd(accountId, enrollmentId)
  const payloadPlaintext = computePayloadPlaintext(attrs, opening)

  const trackStatements = {} as EnrollmentStatement['tracks']
  const trackWitnesses = {} as EnrollmentWitness['tracks']

  for (const track of TRACKS) {
    const secret = randomVtdSecret()
    const hS = scalarCommitment(secret)
    const proof = proveVtd(policy.delayLhtlpParams, secret, policy.vtdProfile)

    const innerKey = computeInnerKey(secret)
    const innerSealed = seal(innerKey, payloadPlaintext, innerAd)

    const partialTrackStatement = {
      escrowCiphertext: {
        u: new Uint8Array(96),
        nonce: new Uint8Array(24),
        ciphertext: new Uint8Array(),
      },
      hS,
      t: policy.delayT,
      proof,
    }
    const envelopePlaintext = computeEnvelopePlaintext(
      partialTrackStatement,
      innerSealed.nonce,
      innerSealed.ciphertext,
    )

    const idWarrant = gateIdentity(
      'warrant',
      policy.networkId,
      accountId,
      enrollmentId,
      policy.escrowEpoch,
    )
    const idLog = gateIdentity(
      'log',
      policy.networkId,
      accountId,
      enrollmentId,
      policy.escrowEpoch,
    )
    const trackContext = escrowContextFor(track)
    const { U, K } = encapsulate({
      ids: { warrant: idWarrant, log: idLog },
      keys: { pkA: policy.epochKeys.pkA, pkB: policy.epochKeys.pkB },
      transcriptHash,
      context: trackContext,
      plaintext: envelopePlaintext,
    })
    const outerSealed = seal(K, envelopePlaintext, trackContext)

    trackStatements[track] = {
      escrowCiphertext: {
        u: U,
        nonce: outerSealed.nonce,
        ciphertext: outerSealed.ciphertext,
      },
      hS,
      t: policy.delayT,
      proof,
    }
    trackWitnesses[track] = {
      secret,
      innerNonce: innerSealed.nonce,
      innerCiphertext: innerSealed.ciphertext,
    }
  }

  const statement: EnrollmentStatement = {
    networkId: statementNetworkId,
    accountId,
    accountPublicKey,
    enrollmentId,
    serverNonce,
    transcriptHash,
    policyId: policy.policyId,
    trustSnapshotId: policy.trustSnapshotId,
    escrowEpoch: policy.escrowEpoch,
    delayProfileId: policy.delayProfileId,
    proofSystemId: policy.proofSystemId,
    identityCommitment,
    documentNullifier,
    proofExpirationTime: NOW + 10_000,
    credentialProfileId: CREDENTIAL_PROFILE_ID,
    tracks: trackStatements,
  }
  const witness: EnrollmentWitness = {
    clientNonce,
    credentialChainRootHash: CHAIN_ROOT,
    credentialType: CREDENTIAL_TYPE,
    credentialValidFrom: NOW - 10_000,
    credentialValidUntil: NOW + 10_000,
    documentPublicKey,
    documentSignature,
    credentialAttestedAttrsHash,
    normalizedAttrs: attrs,
    commitmentOpening: opening,
    documentIssuanceId,
    tracks: trackWitnesses,
  }
  return { statement, witness }
}

function clonePackage(
  pkg: SubmittedEnrollmentPackage,
): SubmittedEnrollmentPackage {
  return structuredClone(pkg)
}

function assertAccepted(outcome: EnrollmentOutcome): EnrollmentAcceptance {
  assert.equal(
    outcome.accepted,
    true,
    (outcome as { operatorReason?: string }).operatorReason,
  )
  return outcome as EnrollmentAcceptance
}

function assertRefused(outcome: EnrollmentOutcome): string {
  assert.equal(outcome.accepted, false)
  const refusal = outcome as {
    submitterMessage: string
    operatorReason: string
  }
  assert.equal(refusal.submitterMessage, SUBMITTER_REFUSAL_MESSAGE)
  return refusal.operatorReason
}

test('a fully valid submission is accepted end to end', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const pkg = buildPackage(policy)
  const outcome = verifyEnrollmentSubmission(pkg, policy, deps)
  const acceptance = assertAccepted(outcome)
  assert.deepEqual(
    Object.keys(acceptance.record).sort(),
    [
      'accountId',
      'accountPublicKey',
      'credentialProfileId',
      'delayProfileId',
      'documentNullifier',
      'enrollmentId',
      'escrowEpoch',
      'identityCommitment',
      'policyId',
      'proofSystemId',
      'trustSnapshotId',
      'tracks',
      'transcriptHash',
    ].sort(),
  )
  const leaked = [
    'secret',
    'commitmentOpening',
    'documentSignature',
    'clientNonce',
  ].some((key) => key in acceptance.record)
  assert.equal(leaked, false)
})

test('persistAcceptance takes one atomic effect, only reachable from an acceptance', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const pkg = buildPackage(policy)
  const outcome = verifyEnrollmentSubmission(pkg, policy, deps)
  const acceptance = assertAccepted(outcome)
  const captured: {
    record: AcceptedEnrollmentFields
    leaf: EnrollmentAcceptedLeaf
  }[] = []
  const leafIndex = persistAcceptance(acceptance, (record, leaf) => {
    captured.push({ record, leaf })
    return 7
  })
  assert.equal(leafIndex, 7)
  assert.equal(captured.length, 1)
  const first = captured[0]
  if (!first) throw new Error('unreachable')
  assert.ok(
    bytesEqual(
      first.record.identityCommitment,
      acceptance.record.identityCommitment,
    ),
  )
  assert.ok(
    bytesEqual(
      first.leaf.identityCommitment,
      acceptance.record.identityCommitment,
    ),
  )
})

test('persistAcceptance cannot leave a stored record with no leaf: there is only one call to fail', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const pkg = buildPackage(policy)
  const acceptance = assertAccepted(
    verifyEnrollmentSubmission(pkg, policy, deps),
  )
  let callCount = 0
  assert.throws(() => {
    persistAcceptance(acceptance, () => {
      callCount += 1
      throw new Error('storage backend unavailable')
    })
  })
  assert.equal(
    callCount,
    1,
    'the record and the leaf are offered to storage in one call, so a failure cannot record one without the other',
  )
})

test('IMPORTANT 5: conditions 1, 2, 3 and 5 are documented placeholders, not soundness: a fabricated identity is accepted', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const fabricated: NormalizedIdentityAttributes = {
    fullLegalName: 'Fabricated Person',
    dateOfBirth: '1900-01-01',
    documentNumber: 'FAKE-0000',
  }
  const pkg = buildPackage(policy, { attrs: fabricated })
  assertAccepted(verifyEnrollmentSubmission(pkg, policy, deps))
})

test('condition 1: credential chain root not accepted', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.credentialChainRootHash = dhash('some-other-root')
  assert.match(checkCredentialChainRoot(pkg.witness, policy) ?? '', /chain/i)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 2: credential type not accepted', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.credentialType = 'unaccepted-type'
  assert.match(
    checkCredentialTypeAndValidity(pkg.witness, policy, NOW) ?? '',
    /type/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 2: credential expired at proof time', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.credentialValidUntil = NOW - 1
  assert.match(
    checkCredentialTypeAndValidity(pkg.witness, policy, NOW) ?? '',
    /valid/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 2: a NaN validity window refuses rather than silently passing', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.credentialValidFrom = Number.NaN
  assert.match(
    checkCredentialTypeAndValidity(pkg.witness, policy, NOW) ?? '',
    /valid/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 3: revoked credential is refused', () => {
  const { policy, revoked } = buildActivePolicy()
  const pkg = buildPackage(policy)
  revoked.add(toHex(pkg.statement.documentNullifier))
  assert.match(
    checkCredentialNotRevoked(pkg.statement, policy) ?? '',
    /revoked/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 4: tampered document signature is refused', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.documentSignature = new Uint8Array(
    pkg.witness.documentSignature.length,
  )
  assert.match(
    checkCredentialSignature(pkg.statement, pkg.witness) ?? '',
    /signature/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 5: normalized fields do not match the credential-attested hash', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.credentialAttestedAttrsHash = dhash('unrelated')
  assert.match(
    checkNormalizedFieldsAuthenticated(pkg.witness) ?? '',
    /normalized/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 6: identity commitment does not open with the witnessed opening', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.commitmentOpening = randomBytes(32)
  assert.match(
    checkIdentityCommitment(pkg.statement, pkg.witness) ?? '',
    /commitment/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 7: document nullifier does not derive from the issuance id', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.documentNullifier = dhash('unrelated-nullifier')
  assert.match(
    checkDocumentNullifierDerivation(pkg.statement, pkg.witness) ?? '',
    /nullifier/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 8, branch 1: an invalid encapsulation point means the key does not reconstruct', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.escrowCiphertext.u = new Uint8Array(10)
  assert.match(
    checkEscrowDecryptsToEnvelope('standard', pkg, policy) ?? '',
    /key does not reconstruct/,
  )
})

test('condition 8, branch 2: a tampered outer ciphertext byte does not decrypt', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const bytes = pkg.statement.tracks.standard.escrowCiphertext.ciphertext
  bytes[0] = (bytes[0] ?? 0) ^ 0xff
  assert.match(
    checkEscrowDecryptsToEnvelope('standard', pkg, policy) ?? '',
    /does not decrypt under the declared epoch/,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 8, branch 3: the outer envelope decrypts but does not match the witnessed inner ciphertext', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.tracks.standard.innerNonce = randomBytes(24)
  assert.match(
    checkEscrowDecryptsToEnvelope('standard', pkg, policy) ?? '',
    /witnessed envelope/,
  )
})

test('condition 8, branch 4: a wrong witnessed secret means the inner ciphertext does not decrypt', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.tracks.standard.secret = randomVtdSecret()
  assert.match(
    checkEscrowDecryptsToEnvelope('standard', pkg, policy) ?? '',
    /inner ciphertext does not decrypt/,
  )
})

test('condition 8, branch 5: the inner ciphertext decrypts but the payload does not match the witnessed fields', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.commitmentOpening = randomBytes(32)
  assert.match(
    checkEscrowDecryptsToEnvelope('standard', pkg, policy) ?? '',
    /inner payload does not contain/,
  )
})

test('condition 9: published H_s does not bind to the witnessed secret', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.hS = scalarCommitment(999_999_999n)
  assert.match(
    checkInnerKeyBindsToPublishedCommitment(
      'standard',
      pkg.statement,
      pkg.witness,
    ) ?? '',
    /inner key/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 10: declared t does not match the active delay profile', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.t = policy.delayT + 1
  assert.match(
    checkDelayMatchesProfile('standard', pkg.statement, policy) ?? '',
    /delay/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 11: transcript_hash is not bound to the client nonce actually used', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.clientNonce = randomBytes(32)
  assert.match(
    checkTranscriptBinding(pkg.statement, pkg.witness, NOW) ?? '',
    /transcript/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('condition 11: an expired proof is refused', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.proofExpirationTime = NOW - 1
  assert.match(
    checkTranscriptBinding(pkg.statement, pkg.witness, NOW) ?? '',
    /expired/i,
  )
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('pi_vtd: a tampered puzzle byte is refused by verifyVtd', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.proof.puzzles[0].u += 1n
  const reason = checkTimedCommitmentProof('standard', pkg, policy)
  assert.match(reason ?? '', /pi_vtd rejected/)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('coefficientsDeriveFromSecret closes the gap verifyVtd alone leaves open', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const realProof = pkg.statement.tracks.standard.proof
  const realHs = pkg.statement.tracks.standard.hS

  // verifyVtd alone never sees the witness secret, so it cannot detect a
  // witness secret that disagrees with the proof's own bound coefficients.
  assert.equal(
    verifyVtd(policy.delayLhtlpParams, realProof, {
      hS: realHs,
      profile: policy.vtdProfile,
    }),
    null,
  )

  const wrongSecret = 42n
  assert.notEqual(coefficientsDeriveFromSecret(wrongSecret, realProof), null)

  pkg.witness.tracks.standard.secret = wrongSecret
  const reason = checkTimedCommitmentProof('standard', pkg, policy)
  assert.match(reason ?? '', /coefficients do not derive/)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('a submitted profile over the transport ceiling is refused before any derivation runs, at any array size', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const hostileProfile: VtdProfile = { n: 1_000_000, k: 1_000_000, o: 999_999 }
  pkg.statement.tracks.standard.proof = {
    profile: hostileProfile,
    nonce: new Uint8Array(32),
    commitments: { a: [] },
    puzzles: [],
    opened: [],
  }
  const started = performance.now()
  const reason = checkRequestShape(pkg)
  const elapsedMs = performance.now() - started
  assert.match(reason ?? '', /transport size ceiling/)
  assert.ok(elapsedMs < 50, `ceiling check took ${elapsedMs}ms, expected O(1)`)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('MAX_SUBMITTED_VTD_K is a small, finite, positive number', () => {
  assert.ok(MAX_SUBMITTED_VTD_K > 0 && MAX_SUBMITTED_VTD_K < 1000)
})

test('IMPORTANT 6: a 64 MiB escrow ciphertext is refused before any derivation runs', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.escrowCiphertext.ciphertext = new Uint8Array(
    64 * 1024 * 1024,
  )
  assert.match(checkRequestShape(pkg) ?? '', /size ceiling/)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('IMPORTANT 6: a 32 MiB text field is refused before any derivation runs', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.documentIssuanceId = 'x'.repeat(32 * 1024 * 1024)
  assert.match(checkRequestShape(pkg) ?? '', /text field exceeds/)
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('IMPORTANT 6: a legitimate real-profile-sized ciphertext still passes the large-field ceiling', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.standard.escrowCiphertext.ciphertext = new Uint8Array(
    300 * 1024,
  )
  assert.equal(checkRequestShape(pkg), null)
})

test('a hostile accessor on the timed-commitment threshold is read once and cannot defeat the ceiling', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  let reads = 0
  const hostileProfile = {
    n: 8,
    get k() {
      reads += 1
      return reads === 1 ? 3 : 1_000_000
    },
    o: 2,
  }
  pkg.statement.tracks.standard.proof = {
    ...pkg.statement.tracks.standard.proof,
    profile: hostileProfile,
  }
  const started = performance.now()
  const outcome = verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
  const elapsedMs = performance.now() - started
  assert.equal(outcome.accepted, false)
  assert.ok(
    elapsedMs < 500,
    `hostile accessor cost ${elapsedMs}ms, expected a snapshot to bound this`,
  )
  assert.ok(
    reads <= 1,
    `profile.k was read ${reads} times; a snapshot must read it exactly once`,
  )
})

test('step 1: a missing track is refused', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const { standard } = pkg.statement.tracks
  pkg.statement.tracks = { standard } as EnrollmentStatement['tracks']
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 1/)
})

test('step 2: a server nonce already consumed is refused', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const pkg = buildPackage(policy)
  const first = verifyEnrollmentSubmission(pkg, policy, deps)
  assertAccepted(first)
  const replay = clonePackage(pkg)
  const reason = assertRefused(verifyEnrollmentSubmission(replay, policy, deps))
  assert.match(reason, /step 2/)
})

test('CRITICAL 1: checkPolicyIdentifiers refuses a mismatched network_id', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy, {
    statementNetworkId: utf8('forged-network'),
  })
  assert.match(
    checkActivePolicyMaterial(pkg.statement, policy) ?? '',
    /network_id/,
  )
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 3/)
})

test('CRITICAL 1 regression: one document issuance cannot mint several accepted nullifiers via a forged network_id', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const documentIssuanceId = 'doc-shared-issuance'
  const outcomes = ['net-a', 'net-b', 'net-c', 'net-d'].map((label) =>
    verifyEnrollmentSubmission(
      buildPackage(policy, {
        statementNetworkId: utf8(label),
        documentIssuanceId,
      }),
      policy,
      deps,
    ),
  )
  assert.ok(outcomes.every((outcome) => outcome.accepted === false))
})

test('step 3: an inactive policy_id is refused', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.policyId = 'stale-policy'
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 3/)
  assert.match(
    checkActivePolicyMaterial(pkg.statement, policy) ?? '',
    /policy_id/,
  )
})

test('step 3: a track profile that does not match the pinned delay profile is refused', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.tracks.emergency.proof = {
    ...pkg.statement.tracks.emergency.proof,
    profile: { n: 8, k: 4, o: 3 },
  }
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 3/)
  assert.match(
    checkActivePolicyMaterial(pkg.statement, policy) ?? '',
    /emergency track profile/,
  )
})

test('IMPORTANT 9: an unaccepted credential_profile_id is refused at step 3', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.credentialProfileId = 'unaccepted-profile'
  assert.match(
    checkActivePolicyMaterial(pkg.statement, policy) ?? '',
    /credential_profile_id/,
  )
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 3/)
})

test('IMPORTANT 9 regression: a NUL byte and markup in credential_profile_id are refused, not stored', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.statement.credentialProfileId = '\0<script>alert(1)</script>'
  assertRefused(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('step 4: a valid package passes checkRelation directly, and the full pipeline accepts it', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  assert.equal(checkRelationInternal(pkg, policy, NOW), null)
  assertAccepted(verifyEnrollmentSubmission(pkg, policy, buildDeps().deps))
})

test('step 4: reached once steps 1-3 pass, and names the failing condition when the relation itself fails', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  assert.equal(checkRequestShape(pkg), null)
  assert.equal(checkActivePolicyMaterial(pkg.statement, policy), null)
  pkg.witness.documentSignature = new Uint8Array(64) // condition 4 only; steps 1-3 stay valid
  const reason = assertRefused(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )
  assert.match(reason, /step 4/)
})

test('step 5: a corrupted stored transcript_hash is refused independently of the live relation check', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  assert.equal(
    checkRelationInternal(pkg, policy, NOW),
    null,
    'the live submission must be valid',
  )
  const record: AcceptedEnrollmentFields = {
    accountId: pkg.statement.accountId,
    accountPublicKey: pkg.statement.accountPublicKey,
    enrollmentId: pkg.statement.enrollmentId,
    policyId: pkg.statement.policyId,
    trustSnapshotId: pkg.statement.trustSnapshotId,
    escrowEpoch: pkg.statement.escrowEpoch,
    delayProfileId: pkg.statement.delayProfileId,
    proofSystemId: pkg.statement.proofSystemId,
    credentialProfileId: pkg.statement.credentialProfileId,
    transcriptHash: dhash('corrupted-during-storage'), // the Draft 0.1 regression class
    identityCommitment: pkg.statement.identityCommitment,
    documentNullifier: pkg.statement.documentNullifier,
    tracks: {
      standard: { ...pkg.statement.tracks.standard },
      emergency: { ...pkg.statement.tracks.emergency },
    },
  }
  const reason = checkKeyReconstructibleFromStoredFields(
    record,
    pkg.statement,
    policy,
  )
  assert.match(reason ?? '', /stored transcript_hash/)
})

test('step 6: a duplicate document nullifier is refused', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const first = buildPackage(policy)
  assertAccepted(verifyEnrollmentSubmission(first, policy, deps))

  const second = buildPackage(policy)
  second.statement.documentNullifier = first.statement.documentNullifier
  second.witness.documentIssuanceId = first.witness.documentIssuanceId
  const reason = assertRefused(verifyEnrollmentSubmission(second, policy, deps))
  assert.match(reason, /step 6/)
})

test('step 9: activation succeeds once the leaf appears in a signed head, and refuses before then', async () => {
  const { TransparencyLog } = await import('../src/core/merkle.ts')
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const pkg = buildPackage(policy)
  const acceptance = assertAccepted(
    verifyEnrollmentSubmission(pkg, policy, deps),
  )

  const log = new TransparencyLog()
  const leafBytes = (
    await import('../src/world/enrollment-verifier.ts')
  ).enrollmentAcceptedLeafBytes(acceptance.leaf)
  const leafIndex = log.append(leafBytes)

  const notYetSigned = activateAfterInclusion({
    leaf: acceptance.leaf,
    leafIndex,
    sth: {
      treeId: 'sige-demo-log/v1',
      treeSize: 0,
      rootHash: new Uint8Array(32),
      signature: new Uint8Array(64),
    },
    inclusionProof: [],
    logPublicKey: log.publicKey,
  })
  assert.equal(notYetSigned.activated, false)

  const sth = log.signHead()
  const inclusionProof = log.inclusionProof(leafIndex)
  const activated = activateAfterInclusion({
    leaf: acceptance.leaf,
    leafIndex,
    sth,
    inclusionProof,
    logPublicKey: log.publicKey,
  })
  assert.equal(activated.activated, true)
})

function timeMs(fn: () => void): number {
  const started = performance.now()
  fn()
  return performance.now() - started
}

function medianMs(samples: number[]): number {
  const sorted = samples.toSorted((a, b) => a - b)
  const middle = sorted[Math.floor(sorted.length / 2)]
  return middle ?? 0
}

test('CRITICAL 2: relation failures, a duplicate nullifier, and acceptance cost about the same', () => {
  const { policy } = buildActivePolicy()
  const TRIALS = 5

  const acceptSamples = Array.from({ length: TRIALS }, () => {
    const pkg = buildPackage(policy)
    const { deps } = buildDeps()
    return timeMs(() => {
      verifyEnrollmentSubmission(pkg, policy, deps)
    })
  })

  const badSignatureSamples = Array.from({ length: TRIALS }, () => {
    const pkg = buildPackage(policy)
    pkg.witness.documentSignature = new Uint8Array(64)
    return timeMs(() => {
      verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
    })
  })

  const badTranscriptSamples = Array.from({ length: TRIALS }, () => {
    const pkg = buildPackage(policy)
    pkg.witness.clientNonce = randomBytes(32)
    return timeMs(() => {
      verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
    })
  })

  const badPiVtdSamples = Array.from({ length: TRIALS }, () => {
    const pkg = buildPackage(policy)
    pkg.statement.tracks.standard.proof.puzzles[0].u += 1n
    return timeMs(() => {
      verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
    })
  })

  const duplicateSamples = Array.from({ length: TRIALS }, () => {
    const { deps } = buildDeps()
    const documentIssuanceId = `doc-dup-${toHex(randomBytes(8))}`
    assertAccepted(
      verifyEnrollmentSubmission(
        buildPackage(policy, { documentIssuanceId }),
        policy,
        deps,
      ),
    )
    const second = buildPackage(policy, { documentIssuanceId })
    return timeMs(() => {
      verifyEnrollmentSubmission(second, policy, deps)
    })
  })

  const medians = {
    accept: medianMs(acceptSamples),
    badSignature: medianMs(badSignatureSamples),
    badTranscript: medianMs(badTranscriptSamples),
    badPiVtd: medianMs(badPiVtdSamples),
    duplicate: medianMs(duplicateSamples),
  }
  const values = Object.values(medians)
  const spreadRatio = Math.max(...values) / Math.min(...values)
  // These five buckets all reach the expensive relation tail, so they cluster.
  // That is NOT evidence of constant time: a structural refusal at step 1
  // returns in microseconds. The honest claim is narrow, so assert only it.
  assert.ok(
    spreadRatio < 3,
    `late-refusal median spread ${spreadRatio.toFixed(2)}x: ${JSON.stringify(medians)}`,
  )
})

// ROW 13. This slot held an assertion that a structural refusal is at least 10x
// cheaper than an accept. That test protected the weakness rather than the
// property: any move toward constant time would have broken CI, and it flaked
// on a busy host. The timing fact is now stated in the CLAIMS known-gaps table
// where it belongs. What matters to a submitter is the RETURNED VALUE, and the
// test below proves that is identical for every refusal cause.

test('every refusal cause reaches the submitter as the same opaque message, while the operator reason differs', () => {
  const { policy } = buildActivePolicy()
  const mutate = (
    mutator: (pkg: SubmittedEnrollmentPackage) => void,
  ): EnrollmentOutcome => {
    const pkg = buildPackage(policy)
    mutator(pkg)
    return verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
  }

  const outcomes: EnrollmentOutcome[] = [
    mutate((p) => {
      p.witness.credentialChainRootHash = dhash('x1')
    }),
    mutate((p) => {
      p.witness.credentialType = 'x2'
    }),
    mutate((p) => {
      p.witness.documentSignature = new Uint8Array(64)
    }),
    mutate((p) => {
      p.statement.identityCommitment = dhash('x3')
    }),
    mutate((p) => {
      p.statement.documentNullifier = dhash('x4')
    }),
    mutate((p) => {
      p.statement.tracks.standard.hS = scalarCommitment(7n)
    }),
    mutate((p) => {
      p.statement.tracks.standard.t = 5
    }),
    mutate((p) => {
      p.witness.clientNonce = randomBytes(32)
    }),
    mutate((p) => {
      p.statement.policyId = 'other'
    }),
    mutate((p) => {
      p.statement.proofExpirationTime = NOW - 1
    }),
  ]

  for (const outcome of outcomes) assert.equal(outcome.accepted, false)
  const refusals = outcomes as {
    submitterMessage: string
    operatorReason: string
  }[]

  const submitterMessages = new Set(refusals.map((r) => r.submitterMessage))
  assert.deepEqual([...submitterMessages], [SUBMITTER_REFUSAL_MESSAGE])

  const operatorReasons = new Set(refusals.map((r) => r.operatorReason))
  assert.ok(
    operatorReasons.size > 5,
    `expected the operator channel to distinguish causes, got ${operatorReasons.size} distinct reasons`,
  )
})

test('a duplicate-nullifier refusal is submitter-indistinguishable from a bad-relation refusal', () => {
  const { policy } = buildActivePolicy()
  const { deps } = buildDeps()
  const first = buildPackage(policy)
  assertAccepted(verifyEnrollmentSubmission(first, policy, deps))

  const dup = buildPackage(policy)
  dup.statement.documentNullifier = first.statement.documentNullifier
  dup.witness.documentIssuanceId = first.witness.documentIssuanceId
  const dupOutcome = verifyEnrollmentSubmission(dup, policy, deps)

  const bad = buildPackage(policy)
  bad.witness.documentSignature = new Uint8Array(64)
  const badOutcome = verifyEnrollmentSubmission(bad, policy, deps)

  assert.equal(dupOutcome.accepted, false)
  assert.equal(badOutcome.accepted, false)
  const dupRefusal = dupOutcome as {
    submitterMessage: string
    operatorReason: string
  }
  const badRefusal = badOutcome as {
    submitterMessage: string
    operatorReason: string
  }
  assert.equal(dupRefusal.submitterMessage, badRefusal.submitterMessage)
  assert.notEqual(dupRefusal.operatorReason, badRefusal.operatorReason)
})

function collectHexLeaves(value: unknown, acc: string[] = []): string[] {
  if (value instanceof Uint8Array) {
    acc.push(toHex(value))
  } else if (typeof value === 'bigint') {
    acc.push(value.toString(16))
  } else if (Array.isArray(value)) {
    for (const item of value) collectHexLeaves(item, acc)
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectHexLeaves(item, acc)
  }
  return acc
}

function collectWitnessSecrets(witness: EnrollmentWitness): string[] {
  const secrets = [
    toHex(witness.commitmentOpening),
    toHex(witness.documentSignature),
    toHex(witness.documentPublicKey),
    toHex(witness.clientNonce),
  ]
  for (const track of TRACKS) {
    secrets.push(witness.tracks[track].secret.toString(16))
    secrets.push(toHex(witness.tracks[track].innerNonce))
  }
  return secrets
}

test('the witness is discarded: no witness secret is reachable from an acceptance', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const outcome = verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
  const acceptance = assertAccepted(outcome)
  const present = new Set(collectHexLeaves(acceptance))
  for (const secret of collectWitnessSecrets(pkg.witness)) {
    assert.ok(
      !present.has(secret),
      `outcome retained a witness value: ${secret.slice(0, 16)}...`,
    )
  }
})

test('the witness is discarded: no witness secret is reachable from a refusal', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  pkg.witness.documentSignature = new Uint8Array(64)
  const outcome = verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
  assert.equal(outcome.accepted, false)
  const present = new Set(collectHexLeaves(outcome))
  for (const secret of collectWitnessSecrets(pkg.witness)) {
    assert.ok(
      !present.has(secret),
      `refusal retained a witness value: ${secret.slice(0, 16)}...`,
    )
  }
})

test('hostile mutations never throw: the verifier always returns a value', () => {
  const { policy } = buildActivePolicy()
  const mutations: ((pkg: SubmittedEnrollmentPackage) => void)[] = [
    (p) => {
      p.statement.tracks.standard.proof.opened = []
    },
    (p) => {
      p.statement.tracks.standard.proof.commitments.a = []
    },
    (p) => {
      p.witness.tracks.standard.secret = -1n
    },
    (p) => {
      p.statement.escrowEpoch = -1
    },
    (p) => {
      p.statement.escrowEpoch = Number.NaN
    },
    (p) => {
      p.statement.proofExpirationTime = Number.POSITIVE_INFINITY
    },
    (p) => {
      p.statement.tracks.standard.t = -5
    },
    (p) => {
      p.statement.tracks.standard.escrowCiphertext.u = new Uint8Array(3)
    },
    (p) => {
      p.statement.tracks.standard.escrowCiphertext.nonce = new Uint8Array(0)
    },
    (p) => {
      p.witness.documentPublicKey = new Uint8Array(1)
    },
    (p) => {
      p.witness.documentSignature = new Uint8Array(0)
    },
    (p) => {
      p.witness.normalizedAttrs = {
        fullLegalName: '',
        dateOfBirth: '',
        documentNumber: '',
      }
    },
    (p) => {
      p.statement.tracks.standard.proof.puzzles = []
    },
  ]

  for (const mutate of mutations) {
    const pkg = buildPackage(policy)
    mutate(pkg)
    const outcome = verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
    assert.ok(outcome.accepted === true || outcome.accepted === false)
  }
})

test('activateAfterInclusion never throws on hostile evidence', () => {
  const { policy } = buildActivePolicy()
  const pkg = buildPackage(policy)
  const acceptance = assertAccepted(
    verifyEnrollmentSubmission(pkg, policy, buildDeps().deps),
  )

  const hostileEvidenceCases = [
    { leafIndex: -1 },
    { leafIndex: 999_999 },
    { inclusionProof: [new Uint8Array(1)] },
    { logPublicKey: new Uint8Array(1) },
    {
      sth: {
        treeId: 'other-log/v1',
        treeSize: -1,
        rootHash: new Uint8Array(0),
        signature: new Uint8Array(0),
      },
    },
  ]
  for (const partial of hostileEvidenceCases) {
    const outcome = activateAfterInclusion({
      leaf: acceptance.leaf,
      leafIndex: 0,
      sth: {
        treeId: 'sige-demo-log/v1',
        treeSize: 1,
        rootHash: new Uint8Array(32),
        signature: new Uint8Array(64),
      },
      inclusionProof: [],
      logPublicKey: new Uint8Array(32),
      ...partial,
    })
    assert.ok(outcome.activated === true || outcome.activated === false)
  }
})

test('IMPORTANT 4: activateAfterInclusion refuses null/undefined evidence instead of throwing', () => {
  const outcomes = [
    activateAfterInclusion(
      null as unknown as Parameters<typeof activateAfterInclusion>[0],
    ),
    activateAfterInclusion(
      undefined as unknown as Parameters<typeof activateAfterInclusion>[0],
    ),
  ]
  for (const outcome of outcomes) {
    assert.equal(outcome.activated, false)
  }
})

test('IMPORTANT 3: a non-Error, non-stringifiable throw is described without crashing', () => {
  const hostileDeps: EnrollmentDependencies = {
    now: () => NOW,
    consumeServerNonce: () => true,
    reserveNullifier: () => {
      throw Object.create(null)
    },
  }
  const { policy } = buildActivePolicy()
  const outcome = verifyEnrollmentSubmission(
    buildPackage(policy),
    policy,
    hostileDeps,
  )
  assert.equal(outcome.accepted, false)

  const symbolMessage = Object.create(Error.prototype)
  symbolMessage.message = Symbol('hostile message')
  const hostileDeps2: EnrollmentDependencies = {
    now: () => NOW,
    consumeServerNonce: () => true,
    reserveNullifier: () => {
      throw symbolMessage
    },
  }
  const outcome2 = verifyEnrollmentSubmission(
    buildPackage(policy),
    policy,
    hostileDeps2,
  )
  assert.equal(outcome2.accepted, false)
})

test('CRITICAL regression: the verifier escrow context separates the tracks, so one gate release cannot open both', () => {
  const { policy } = buildActivePolicy()
  const binding = {
    accountId: randomBytes(32),
    accountPublicKey: randomBytes(32),
    enrollmentId: randomBytes(16),
    escrowEpoch: policy.escrowEpoch,
  }

  const standard = computeEscrowContext(binding, policy, 'standard')
  const emergency = computeEscrowContext(binding, policy, 'emergency')
  assert.notDeepEqual(
    standard,
    emergency,
    'one escrow context served both tracks',
  )

  // These bytes must equal world.ts's context, or a record accepted here
  // will not reconstruct there. Both must carry the track separator.
  assert.equal(standard.length, 32)
  assert.equal(emergency.length, 32)
})

test('IMPORTANT regression: eleven spellings of one document issuance id give one nullifier', () => {
  const { policy } = buildActivePolicy()
  const base = 'DOC-CANON-1'
  const spellings = [
    base,
    base.normalize('NFD'),
    ` ${base}`,
    `${base} `,
    `${base}\u0000`,
    `${base}\u200b`,
    `${base}\ufeff`,
    `\u200e${base}`,
    `  ${base}  `,
  ]

  const nullifiers = new Set(
    spellings.map((id) =>
      toHex(computeDocumentNullifier(policy.networkId, id)),
    ),
  )
  assert.equal(
    nullifiers.size,
    1,
    `one document issuance minted ${nullifiers.size} nullifiers`,
  )

  // A genuinely different document must still get its own nullifier.
  assert.notEqual(
    toHex(computeDocumentNullifier(policy.networkId, base)),
    toHex(computeDocumentNullifier(policy.networkId, 'DOC-CANON-2')),
  )
})

test('the verifier and the world compute ONE escrow context, so the two cannot drift apart', () => {
  const { policy } = buildActivePolicy()
  const world = createWorld(GENERIC, { t: tuned(64) })
  world.networkId = policy.networkId

  const binding = {
    accountId: randomBytes(32),
    accountPublicKey: randomBytes(32),
    enrollmentId: randomBytes(16),
    escrowEpoch: policy.escrowEpoch,
  }

  for (const track of TRACKS) {
    assert.deepEqual(
      computeEscrowContext(binding, policy, track),
      worldEscrowContext(world, { ...binding, track }),
      `${track} escrow context differs between the verifier and the world`,
    )
  }

  // And the separator still separates.
  assert.notDeepEqual(
    computeEscrowContext(binding, policy, 'standard'),
    computeEscrowContext(binding, policy, 'emergency'),
  )
})

test('CRITICAL regression: two DIFFERENT document ids never share a nullifier', () => {
  const { policy } = buildActivePolicy()
  const distinct = [
    'TR-PASSPORT-\u0131D-77', // Turkish dotless i
    'TR-PASSPORT-iD-77',
    'GR-\u03c2-1', // Greek final sigma
    'GR-\u03c3-1',
    'S-\u017f-1', // long s
    'S-s-1',
    'M-\u00b5-1', // micro sign
    'M-\u03bc-1',
    'RN-\u2160-1', // Roman numeral one
    'RN-I-1',
    'FF-\uff21-1', // fullwidth A
    'FF-A-1',
    'LG-\ufb01-1', // fi ligature
    'LG-fi-1',
    'case-1',
    'CASE-1',
  ]

  const seen = new Map<string, string>()
  for (const id of distinct) {
    const key = toHex(computeDocumentNullifier(policy.networkId, id))
    const clash = seen.get(key)
    assert.equal(
      clash,
      undefined,
      `${JSON.stringify(id)} and ${JSON.stringify(clash)} share one nullifier`,
    )
    seen.set(key, id)
  }
  assert.equal(seen.size, distinct.length)
})

test('an ambiguous or empty document issuance id is refused, not silently folded', () => {
  const { policy } = buildActivePolicy()
  for (const bad of ['', '   ', '\u200b\u200b', '\ud800', 'ok\udfff']) {
    assert.equal(
      tryDocumentNullifier(policy.networkId, bad),
      null,
      `${JSON.stringify(bad)} produced a nullifier`,
    )
  }
  // The spellings that are genuinely one id still collapse to one nullifier.
  const base = 'DOC-CANON-1'
  const same = [base, base.normalize('NFD'), ` ${base} `, `${base}\u200b`]
  const nullifiers = new Set(
    same.map((id) => toHex(computeDocumentNullifier(policy.networkId, id))),
  )
  assert.equal(nullifiers.size, 1)
})

test('STEP 3 regression: the escrow epoch has one bound, and no two epochs share a transcript', () => {
  const { policy } = buildActivePolicy()
  const base = {
    networkId: policy.networkId,
    accountId: randomBytes(32),
    accountPublicKey: randomBytes(32),
    enrollmentId: randomBytes(16),
    serverNonce: randomBytes(32),
    clientNonce: randomBytes(32),
    policyId: 'p',
    trustSnapshotId: 't',
    delayProfileId: 'd',
  }

  // safeU32be folded everything at or above 2^32 to four zero bytes, so these
  // two epochs used to produce one transcript hash.
  const epochs = [0, 1, 2 ** 32, 2 ** 32 + 1, Number.MAX_SAFE_INTEGER]
  const seen = new Map<string, number>()
  for (const escrowEpoch of epochs) {
    const key = toHex(transcriptHash({ ...base, escrowEpoch }))
    const clash = seen.get(key)
    assert.equal(
      clash,
      undefined,
      `epoch ${escrowEpoch} collides with ${clash}`,
    )
    seen.set(key, escrowEpoch)
  }

  // Non-integers stay distinct too, rather than all folding together.
  const odd = [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]
  for (const escrowEpoch of odd) {
    const key = toHex(transcriptHash({ ...base, escrowEpoch }))
    assert.equal(
      seen.has(key),
      false,
      `${escrowEpoch} collides with a real epoch`,
    )
    seen.set(key, escrowEpoch)
  }
  assert.equal(seen.size, epochs.length + odd.length)
})

test('STEP 3 regression: an out-of-range escrow epoch is refused by name, never thrown', () => {
  const { policy } = buildActivePolicy()
  for (const escrowEpoch of [
    MAX_ESCROW_EPOCH + 1,
    2 ** 53,
    -1,
    1.5,
    Number.NaN,
  ]) {
    const pkg = buildPackage(policy)
    pkg.statement.escrowEpoch = escrowEpoch
    assert.doesNotThrow(() => {
      const outcome = verifyEnrollmentSubmission(pkg, policy, buildDeps().deps)
      assert.equal(outcome.accepted, false, `epoch ${escrowEpoch} was accepted`)
    })
  }

  // The honest control still passes.
  assert.equal(
    verifyEnrollmentSubmission(buildPackage(policy), policy, buildDeps().deps)
      .accepted,
    true,
  )
})

// ROWS 5 and 11. A submitter learns THAT it was refused, never WHY. One public
// tag, one opaque message, and the specific reason goes to an operator journal
// no submitter can read. Before this the reason string came back to the caller,
// which is an oracle on the exact predicate that failed.
test('ROWS 5, 11: enroll() refuses opaquely and journals the reason', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const person = {
    fullLegalName: 'Opaque Subject',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-OPAQUE',
  }
  const first = enroll(world, 'DOC-OPAQUE', person)
  assert.ok(!('error' in first))

  const duplicate = enroll(world, 'DOC-OPAQUE', person)
  // A duplicate must be indistinguishable from any other refusal. Probing with
  // junk attributes otherwise enumerates the enrolled population.
  assert.deepEqual(duplicate, {
    error: 'ENROLLMENT_REFUSED',
    message: SUBMITTER_REFUSAL_MESSAGE,
  })

  assert.match(
    String(world.operatorJournal.at(-1)),
    /already enrolled/,
    'the duplicate reason must reach the operator',
  )

  const before = world.operatorJournal.length
  // A migration naming a different document. The submitter gets the same
  // opaque shape as any other refusal; only the journal says which.
  if ('error' in first) return
  const migrated = enrollForMigration(world, first.record, person, 'DOC-OTHER')
  assert.deepEqual(migrated, {
    error: 'ENROLLMENT_REFUSED',
    message: SUBMITTER_REFUSAL_MESSAGE,
  })
  assert.equal(
    Object.keys(migrated).includes('reason'),
    false,
    'a reason string reached the submitter',
  )
  assert.equal(world.operatorJournal.length, before + 1)
  assert.match(
    String(world.operatorJournal.at(-1)),
    /different document/,
    'the operator journal lost the specific reason',
  )
})
