import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesEqual, randomBytes, toHex } from '../src/core/bytes.ts'
import {
  attestationMessage,
  type EvidenceBundleV1,
  hashEvidenceBundleV1,
  orderDocumentSignatureMessage,
  orderSignatureEvidenceCommitment,
  verifyDecryptionResultOpening,
  verifyEvidenceBundle,
} from '../src/world/evidence.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import type { Track } from '../src/world/records.ts'
import {
  encodeLogLeafV1,
  hashEnrollmentRecordV1,
  hashUnsealAuthorizationV1,
} from '../src/world/records.ts'
import type { DemoWorld, UnsealOutcome } from '../src/world/world.ts'
import {
  createWorld,
  enroll,
  evidencePublicKeys,
  performUnseal,
} from '../src/world/world.ts'

// The supported unseal path must emit an EvidenceBundleV1 that the offline
// verifier accepts. Before this suite existed, nothing produced one at all.

function newWorld(): DemoWorld {
  return createWorld(GENERIC, { t: tuned(64) })
}

function mustEnroll(world: DemoWorld, doc: string) {
  const result = enroll(world, doc, {
    fullLegalName: 'Evidence Subject',
    dateOfBirth: '1990-04-12',
    documentNumber: doc,
  })
  assert.ok(!('error' in result), `fixture enrollment failed for ${doc}`)
  if ('error' in result) throw new Error('unreachable')
  return result
}

async function runCeremony(
  world: DemoWorld,
  doc: string,
  track: Track = 'standard',
): Promise<UnsealOutcome> {
  const enrolled = mustEnroll(world, doc)
  const outcome = await performUnseal(world, enrolled.record, { track })
  assert.equal(outcome.ok, true, `${doc} unseal did not complete`)
  return outcome
}

async function ceremonyBundle(
  world: DemoWorld,
  doc: string,
): Promise<EvidenceBundleV1> {
  const outcome = await runCeremony(world, doc)
  const bundle = outcome.bundle
  assert.ok(bundle, `${doc} produced no evidence bundle`)
  return bundle
}

// Bump the LAST byte. Bumping the first pushes a scalar whose top byte is
// 0x73 past Fr.ORDER, which changes the refusal string 0.87% of runs.
function bumpByte(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes)
  const last = copy.length - 1
  if (last >= 0) copy[last] = ((copy[last] ?? 0) + 1) % 256
  return copy
}

test('the supported unseal path emits an evidence bundle the offline verifier accepts', async () => {
  const world = newWorld()
  const outcome = await runCeremony(world, 'DOC-EV-HAPPY')
  const bundle = outcome.bundle
  assert.ok(bundle, 'performUnseal produced no evidence bundle')
  assert.equal(outcome.bundleGap, undefined)

  const keys = evidencePublicKeys(world)
  assert.equal(verifyEvidenceBundle(bundle, keys), null)
})

test('the bundle names the bytes the log actually stored, not a reconstruction', async () => {
  const world = newWorld()
  const outcome = await runCeremony(world, 'DOC-EV-BYTES')
  const bundle = outcome.bundle
  const published = outcome.published
  assert.ok(bundle)
  assert.ok(published)

  assert.equal(
    bytesEqual(encodeLogLeafV1(bundle.logLeaf), published.leafBytes),
    true,
    'the bundle leaf re-encodes to different bytes than the log holds',
  )
  assert.equal(bundle.leafIndex, published.leafIndex)
  assert.equal(
    bytesEqual(bundle.signedHead.root_hash, published.head.root_hash),
    true,
  )
  assert.equal(
    bytesEqual(
      bundle.enrollmentRecord.account_id,
      bundle.authorization.account_id,
    ),
    true,
  )
})

test('the decryption-result commitment opens to the plaintext the ceremony recovered', async () => {
  const world = newWorld()
  const outcome = await runCeremony(world, 'DOC-EV-OPENING')
  const bundle = outcome.bundle
  assert.ok(bundle)
  assert.ok(outcome.identity)
  assert.ok(outcome.decryptionOpening)

  assert.equal(
    verifyDecryptionResultOpening(
      bundle.decryptionResultCommitment,
      outcome.identity.payload,
      outcome.decryptionOpening,
    ),
    true,
  )
  assert.equal(
    verifyDecryptionResultOpening(
      bundle.decryptionResultCommitment,
      bumpByte(outcome.identity.payload),
      outcome.decryptionOpening,
    ),
    false,
  )
})

test('the gates and the bundle sign one attestation message, not two conventions', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-DOMAIN')
  const keys = evidencePublicKeys(world)

  for (const gate of ['warrant', 'log'] as const) {
    const attestation =
      gate === 'warrant' ? bundle.warrantAttestation : bundle.logAttestation
    const expected = attestationMessage(gate, bundle.authorization, {
      ...bundle.logLeaf,
    })
    assert.equal(bytesEqual(attestation.message, expected), true, gate)
  }
  assert.equal(
    ed25519.verify(
      bundle.orderSignatureEvidence.signature,
      orderDocumentSignatureMessage(
        bundle.orderSignatureEvidence.orderDocumentHash,
      ),
      keys.roleKeys.get(bundle.orderSignatureEvidence.issuingRole) ??
        new Uint8Array(32),
    ),
    true,
    'the world signs an order message the evidence verifier does not recognize',
  )
})

test('evidencePublicKeys exposes only published values', async () => {
  const world = newWorld()
  const keys = evidencePublicKeys(world)
  const secrets = [
    world.warrantHsmKey.priv,
    world.logHsmKey.priv,
    world.reviewers[0].priv,
    ...Object.values(world.roles).map((pair) => pair.priv),
  ].map(toHex)
  const exposed = [
    keys.logPublicKey,
    keys.warrantHsmPublicKey,
    keys.logHsmPublicKey,
    ...keys.roleKeys.values(),
  ].map(toHex)

  assert.equal(
    exposed.some((value) => secrets.includes(value)),
    false,
  )
  assert.equal(
    bytesEqual(keys.warrantHsmPublicKey, world.warrantHsmKey.pub),
    true,
  )
  assert.equal(keys.minConfirmations, world.policy.k)
})

// Six independent mutations of a REAL bundle. Each must be refused, and each
// must be refused by the check that owns it, or the bundle is decorative.
test('negative controls: every mutation of a real bundle is refused by name', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-NEG-1')
  const other = await ceremonyBundle(world, 'DOC-EV-NEG-2')
  const keys = evidencePublicKeys(world)
  assert.equal(
    verifyEvidenceBundle(bundle, keys),
    null,
    'positive control: the real bundle verifies',
  )
  assert.equal(verifyEvidenceBundle(other, keys), null)

  const rogue = ed25519.utils.randomSecretKey()
  const forgedEvidence = {
    ...bundle.orderSignatureEvidence,
    signature: ed25519.sign(
      orderDocumentSignatureMessage(
        bundle.orderSignatureEvidence.orderDocumentHash,
      ),
      rogue,
    ),
  }
  const forgedAttestationMessage = attestationMessage(
    'warrant',
    bundle.authorization,
    bundle.logLeaf,
  )

  const cases: Array<[string, EvidenceBundleV1, RegExp]> = [
    [
      'order signed by a key outside the pinned trust list',
      {
        ...bundle,
        orderSignatureEvidence: forgedEvidence,
        authorization: {
          ...bundle.authorization,
          order_signature_evidence_hash:
            orderSignatureEvidenceCommitment(forgedEvidence),
        },
      },
      /signature does not verify against a pinned role key/,
    ],
    [
      'leaf swapped for another ceremony leaf',
      { ...bundle, logLeaf: other.logLeaf },
      /log leaf does not commit this authorization/,
    ],
    [
      'anchor altered to commit a different root',
      {
        ...bundle,
        bitcoinAnchor: {
          ...bundle.bitcoinAnchor,
          root_hash: randomBytes(32),
        },
      },
      /anchor commits a different root hash/,
    ],
    [
      'consistency proof dropped',
      { ...bundle, consistencyProof: [] },
      /consistency proof is absent/,
    ],
    [
      'solution proof scalar tampered',
      bundle.solutionProof === null
        ? bundle
        : {
            ...bundle,
            solutionProof: {
              ...bundle.solutionProof,
              recoveredScalar: bumpByte(bundle.solutionProof.recoveredScalar),
            },
          },
      /recovered scalar does not match the published H_s/,
    ],
    [
      'warrant attestation forged with a rogue hsm key',
      {
        ...bundle,
        warrantAttestation: {
          gate: 'warrant',
          message: forgedAttestationMessage,
          signature: ed25519.sign(forgedAttestationMessage, rogue),
        },
      },
      /warrant attestation signature does not verify/,
    ],
    [
      'enrollment record swapped for another account',
      {
        ...bundle,
        enrollmentRecord: other.enrollmentRecord,
        enrollmentRecordHash: other.enrollmentRecordHash,
      },
      /is not the one this authorization was issued against/,
    ],
    [
      'closing leaf taken from another ceremony',
      {
        ...bundle,
        closingLeaf: other.closingLeaf,
        closingLeafIndex: other.closingLeafIndex,
        closingInclusionProof: other.closingInclusionProof,
        closingSignedHead: other.closingSignedHead,
      },
      /closing leaf does not reference this unseal leaf/,
    ],
    [
      'bundle presented as its own predecessor',
      { ...bundle, previousSignedHead: bundle.signedHead },
      /does not precede the signed head/,
    ],
    [
      'reviewer approval dropped',
      {
        ...bundle,
        authorization: {
          ...bundle.authorization,
          reviewer_approvals: bundle.authorization.reviewer_approvals.slice(1),
        },
      },
      /reviewer approvals, policy requires 2/,
    ],
    [
      'reviewer approval replaced, count kept',
      {
        ...bundle,
        authorization: {
          ...bundle.authorization,
          reviewer_approvals: [
            randomBytes(64),
            ...bundle.authorization.reviewer_approvals.slice(1),
          ],
        },
      },
      // ROW 18. Before the bundle held reviewer keys this was caught only by
      // the leaf hash. Now the approval itself fails to verify, which names the
      // actual fault instead of a downstream symptom.
      /carries 1 verified reviewer approvals, policy requires 2/,
    ],
  ]

  for (const [label, tampered, pattern] of cases) {
    const reason = verifyEvidenceBundle(tampered, keys)
    assert.notEqual(reason, null, `${label} was accepted`)
    assert.match(String(reason), pattern, label)
  }
})

test('a bundle from one world does not verify under another world keys', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-FOREIGN')
  const foreign = newWorld()

  assert.equal(verifyEvidenceBundle(bundle, evidencePublicKeys(world)), null)
  const reason = verifyEvidenceBundle(bundle, evidencePublicKeys(foreign))
  assert.notEqual(reason, null, 'a foreign trust list accepted the bundle')
  assert.match(String(reason), /pinned role key|pinned log key/)
})

test('the authorization hash the leaf commits is the record the bundle carries', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-AUTHHASH')
  assert.equal(
    bytesEqual(
      bundle.logLeaf.authorization_hash,
      hashUnsealAuthorizationV1(bundle.authorization),
    ),
    true,
  )
  assert.equal(bundle.authorization.reviewer_approvals.length >= 2, true)
  assert.equal(bundle.authorization.requested_attribute_scope.length > 0, true)
  assert.equal(bundle.authorization.legal_basis_code.length > 0, true)
})

test('a ceremony that stops before the delay reports why it has no bundle', async () => {
  const world = newWorld()
  const enrolled = mustEnroll(world, 'DOC-EV-SKIP')
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  assert.equal(outcome.ok, true)
  assert.equal(outcome.bundle, undefined)
  assert.match(String(outcome.bundleGap), /timed commitment/)
})

// KNOWN GAP: checkCongestionPolicyRange demands difficulty >= dFloor for every
// leaf, but spec 5.5C exempts the emergency track. The bundle is otherwise
// sound, so this pins the exact boundary rather than the refusal string.
test('an emergency-track bundle verifies under the real policy, and the exemption cannot be laundered', async () => {
  const world = newWorld()
  const outcome = await runCeremony(world, 'DOC-EV-EMERGENCY', 'emergency')
  const bundle = outcome.bundle
  assert.ok(bundle, 'the emergency ceremony produced no evidence bundle')
  assert.equal(bundle.logLeaf.leaf_type, 'UNSEAL_EMERGENCY')
  assert.equal(bundle.logLeaf.congestion_difficulty, 0)

  const keys = evidencePublicKeys(world)
  assert.ok(
    keys.congestionPolicy.dFloor > 0,
    'the policy must demand real work',
  )
  assert.equal(
    verifyEvidenceBundle(bundle, keys),
    null,
    'spec 5.5C exempts emergency from congestion, so this must verify',
  )

  // A standard ceremony must not borrow the exemption. Relabelling the track
  // is refused before the floor is ever consulted.
  const standard = await ceremonyBundle(world, 'DOC-EV-STANDARD-FLOOR')
  const laundered = verifyEvidenceBundle(
    { ...standard, logLeaf: { ...standard.logLeaf, track: 'emergency' } },
    keys,
  )
  assert.notEqual(laundered, null, 'a standard leaf claimed the exemption')
  assert.match(String(laundered), /track does not match the authorization/i)

  // And a standard bundle below the floor still refuses.
  const underfloor = verifyEvidenceBundle(
    {
      ...standard,
      logLeaf: { ...standard.logLeaf, congestion_difficulty: 0 },
    },
    keys,
  )
  assert.notEqual(underfloor, null, 'a zero-difficulty standard bundle passed')
})

// TENTH-REVIEW rewrite. This test used to assert with a regex alternation, and
// the first branch was row 22's leaf check, which fires before every guard the
// test names. Deleting the epoch or ciphertext guard left it green. Those two
// guards now have fixture-built cases in `evidence.test.ts` that reach them.
// What this test proves in the real-world path is the authorization pin: the
// HSM gates sign the record hash, so no rewritten record survives, whatever
// field was rewritten and whatever hash the bundle declares for it.
test('CRITICAL regression: a rewritten enrollment record cannot pass the authorization pin', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const bundle = await ceremonyBundle(world, 'DOC-EV-BIND')
  const keys = evidencePublicKeys(world)
  assert.equal(verifyEvidenceBundle(bundle, keys), null, 'positive control')

  const wrongEpoch = {
    ...bundle.enrollmentRecord,
    escrow_epoch: bundle.enrollmentRecord.escrow_epoch + 4241,
  }
  const epochVerdict = verifyEvidenceBundle(
    {
      ...bundle,
      enrollmentRecord: wrongEpoch,
      enrollmentRecordHash: hashEnrollmentRecordV1(wrongEpoch),
    },
    keys,
  )
  assert.equal(
    epochVerdict,
    'enrollment record is not the one this authorization was issued against',
  )

  const wrongCiphertext = {
    ...bundle.enrollmentRecord,
    escrow_ciphertext_standard: {
      ...bundle.enrollmentRecord.escrow_ciphertext_standard,
      ciphertext: randomBytes(
        bundle.enrollmentRecord.escrow_ciphertext_standard.ciphertext.length,
      ),
    },
  }
  const ctVerdict = verifyEvidenceBundle(
    {
      ...bundle,
      enrollmentRecord: wrongCiphertext,
      enrollmentRecordHash: hashEnrollmentRecordV1(wrongCiphertext),
    },
    keys,
  )
  assert.notEqual(
    ctVerdict,
    null,
    'a record with a foreign ciphertext verified',
  )
  assert.equal(
    ctVerdict,
    'enrollment record is not the one this authorization was issued against',
  )
})

test('ROW 22 regression: a bundle cannot name an enrollment record the log never published', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-ROW22')
  const keys = evidencePublicKeys(world)
  assert.equal(verifyEvidenceBundle(bundle, keys), null, 'positive control')

  // Forge the record, recompute its hash so the old check still passes. The
  // enrollment leaf still commits the honest record, so this must refuse.
  const forged = {
    ...bundle.enrollmentRecord,
    identity_commitment: randomBytes(32),
    document_nullifier: randomBytes(32),
    transcript_hash: randomBytes(32),
  }
  const verdict = verifyEvidenceBundle(
    {
      ...bundle,
      enrollmentRecord: forged,
      enrollmentRecordHash: hashEnrollmentRecordV1(forged),
    },
    keys,
  )
  assert.equal(
    verdict,
    'enrollment record is not the one this authorization was issued against',
  )

  // A dropped or wrong inclusion proof is refused too.
  assert.notEqual(
    verifyEvidenceBundle({ ...bundle, enrollmentInclusionProof: [] }, keys),
    null,
    'an empty enrollment inclusion proof was accepted',
  )
  assert.notEqual(
    verifyEvidenceBundle({ ...bundle, enrollmentLeafIndex: 999 }, keys),
    null,
    'a wrong enrollment leaf index was accepted',
  )

  // And a leaf of the wrong type cannot stand in.
  assert.match(
    String(
      verifyEvidenceBundle({ ...bundle, enrollmentLeaf: bundle.logLeaf }, keys),
    ),
    /not an ENROLLMENT_ACCEPTED leaf/i,
  )
})

test('the bundle digest covers the enrollment fields the verifier reads', async () => {
  const world = newWorld()
  const bundle = await ceremonyBundle(world, 'DOC-EV-DIGEST')
  const base = toHex(hashEvidenceBundleV1(bundle))

  // Read-but-unhashed is worse than hashed-but-unread: an archive pinning a
  // bundle by digest could not see a substituted enrollment proof.
  const other = await ceremonyBundle(newWorld(), 'DOC-EV-DIGEST-2')
  const swapped = {
    ...bundle,
    enrollmentLeaf: other.enrollmentLeaf,
    enrollmentLeafIndex: other.enrollmentLeafIndex,
    enrollmentInclusionProof: other.enrollmentInclusionProof,
  }
  assert.notEqual(
    toHex(hashEvidenceBundleV1(swapped)),
    base,
    'swapping the enrollment proof left the digest unchanged',
  )

  // And the swap is refused, so digest and verdict agree.
  assert.notEqual(
    verifyEvidenceBundle(swapped, evidencePublicKeys(world)),
    null,
  )
})
