import { bls12_381 } from '@noble/curves/bls12-381.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { open, type Sealed, seal } from '../core/aead.ts'
import {
  bytesEqual,
  bytesToBigInt,
  randomBytes,
  toHex,
  u32be,
  utf8,
} from '../core/bytes.ts'
import {
  asSafeCount,
  type CborValue,
  decodeCbor,
  strictCborMap,
} from '../core/cbor.ts'
import { type Anchor, anchorHead, SimBitcoin } from '../core/chain.ts'
import {
  type CongestionPolicy,
  chainedWork,
  requiredDifficulty,
  STAMP_GENESIS,
  verifyWork,
  type WorkStamp,
  windowCount,
} from '../core/congestion.ts'
import { dhash } from '../core/hash.ts'
import {
  checkEncapsulationPoint,
  combineContributions,
  deriveContribution,
  type EpochKeys,
  encapsulate,
  gateIdentity,
  genEpoch,
  verifyEncapsulation,
} from '../core/kem.ts'
import { type LhtlpParams, setupParams } from '../core/lhtlp.ts'
import {
  type SignedTreeHead,
  TransparencyLog,
  verifyConsistency,
  verifyHead,
  verifyInclusion,
} from '../core/merkle.ts'
import { scalarCommitment } from '../core/shamir.ts'
import {
  proveVtd,
  solveVtd,
  type VtdProfile,
  type VtdProof,
  verifyVtd,
} from '../core/vtd.ts'
import { cborToVtdProof } from '../core/vtd-cbor.ts'
import {
  accountCommitment,
  caseReferenceCommitment,
  DELAY_PROFILE_ID,
  ENVELOPE_SCHEMA_VERSION,
  encodeEnvelope,
  encodeIdentityAttrs,
  encodeInnerPayload,
  escrowCiphertextHash,
  IDENTITY_ATTRIBUTE_NAMES,
  identityCommitment,
  innerAd,
  innerKey,
  mappingExplanationCommitment,
  escrowContext as sharedEscrowContext,
  transcriptHash,
  tryDocumentNullifier,
} from './derivations.ts'
import {
  type AdapterTrackInput,
  DEMO_CREDENTIAL_PROFILE_ID,
  DEMO_POLICY_ID,
  DEMO_PROOF_SYSTEM_ID,
  DEMO_TRUST_SNAPSHOT_ID,
  seenNonceDeps,
  verifyThroughSpecVerifier,
} from './enrollment-adapter.ts'
import { SUBMITTER_REFUSAL_MESSAGE } from './enrollment-verifier.ts'
import {
  attestationMessage,
  buildCeremonyTranscript,
  type CongestionScheduleEvidence,
  commitDecryptionResult,
  type EvidenceBundleV1,
  type EvidencePublicKeys,
  encodeClosingLeafV1,
  type HsmAttestation,
  orderDocumentSignatureMessage,
  orderSignatureEvidenceCommitment,
  type RedactedOrderSignatureEvidence,
  reviewerApprovalMessage,
} from './evidence.ts'
import {
  bitcoinAnchorRecord,
  enrollmentAcceptedLeaf,
  heartbeatLeaf,
  recordHeader,
  signedHeadRecord,
} from './log-records.ts'
import {
  CONGESTION_FLOOR,
  LHTLP_PRIME_BITS,
  tuned,
  VTD_PROFILE,
} from './params.ts'
import { type AuthorityProfile, GENERIC } from './profile.ts'
import {
  type BitcoinAnchorV1,
  congestionStampLeafHash,
  coreSignedTreeHead,
  type EnrollmentRecordV1,
  type EscrowCiphertextV1,
  encodeLogLeafV1,
  enrollmentRecordV1,
  escrowCiphertextForTrack,
  hashEnrollmentRecordV1,
  hashSignedTreeHeadV1,
  hashUnsealAuthorizationV1,
  type LeafType,
  type LogLeafV1,
  logLeafV1,
  parseLeaf,
  type SignedTreeHeadV1,
  TRACKS,
  type Track,
  type UnsealAuthorizationV1,
  unsealAuthorizationV1,
  zeroStampOutput,
} from './records.ts'
import {
  buildClosingLeaf,
  buildUnsealEvidence,
  buildUnsealSolutionProof,
  type PublishedLeaf,
} from './unseal-evidence.ts'

const Fr = bls12_381.fields.Fr

// verifyConsistency reads only treeSize and rootHash; verifyHead owns signatures.
const EMPTY_SIG = new Uint8Array(64)

export type Role = string

export type DemoPolicy = {
  t: number // sequential squarings per escrow
  k: number // required anchor confirmations
  vtdProfile: VtdProfile
  acceptedRoles: Role[]
  congestion: CongestionPolicy
  emergencyRatificationBlocks: number
}

// An emergency unseal skips the delay, so its only protection is that it is
// counted apart and must be ratified in public inside a published window.
export type EmergencyUnseal = {
  authorizationHash: Uint8Array
  leafIndex: number
  anchorHeight: number
  ratifiedAtHeight: number | null
}

type KeyPair = {
  priv: Uint8Array
  pub: Uint8Array
}

function keyPair(): KeyPair {
  const priv = ed25519.utils.randomSecretKey()
  return { priv, pub: ed25519.getPublicKey(priv) }
}

export type LogGateState = {
  // Enrollment id to the hash of the record the log accepted for it. The gates
  // sign hashUnsealAuthorizationV1, which carries the pin, but a signature over
  // a value is not a check of it. Without enrollment-time memory the operator
  // simply issues the order against a record he forged first.
  acceptedRecordHashes: Map<string, string>
  treeSize: number
  rootHash: Uint8Array | null
  stateHash: Uint8Array
  lastStampOutput: Uint8Array
  lastAnchorHeight: number
  unsealAnchorHeights: number[]
  consumed: Set<string>
}

export type DemoWorld = {
  networkId: Uint8Array
  profile: AuthorityProfile
  activeEpoch: number
  epochs: Map<number, EpochKeys>
  policy: DemoPolicy
  delayParams: LhtlpParams
  roles: Record<string, KeyPair>
  reviewers: [KeyPair, KeyPair]
  warrantHsmKey: KeyPair
  logHsmKey: KeyPair
  log: TransparencyLog
  chain: SimBitcoin
  logGateState: LogGateState
  nullifiers: Set<string>
  seenVtdNonces: Set<string>
  seenServerNonces: Set<string>
  // Operator-only. Refusal reasons land here so no submitter can read them.
  operatorJournal: string[]
  clockMs: number
  emergencyUnseals: EmergencyUnseal[]
  lockdown: boolean
}

export function createWorld(
  profile: AuthorityProfile = GENERIC,
  overrides?: Partial<DemoPolicy>,
): DemoWorld {
  const policy: DemoPolicy = {
    t: tuned(1500),
    k: 3,
    vtdProfile: VTD_PROFILE,
    acceptedRoles: [...profile.acceptedRoles],
    congestion: {
      dFloor: tuned(CONGESTION_FLOOR),
      baseline: 1,
      cap: 4,
      windowBlocks: 1000,
    },
    emergencyRatificationBlocks: 10,
    ...overrides,
  }
  const { params: delayParams } = setupParams(LHTLP_PRIME_BITS, policy.t)
  return {
    networkId: utf8('sige-demo-net'),
    profile,
    activeEpoch: 1,
    epochs: new Map([[1, genEpoch(1)]]),
    policy,
    delayParams,
    roles: Object.fromEntries(profile.roles.map((r) => [r, keyPair()])),
    reviewers: [keyPair(), keyPair()],
    warrantHsmKey: keyPair(),
    logHsmKey: keyPair(),
    log: new TransparencyLog(),
    chain: new SimBitcoin(),
    logGateState: {
      acceptedRecordHashes: new Map(),
      treeSize: 0,
      rootHash: null,
      stateHash: dhash('monotonic-genesis'),
      lastStampOutput: STAMP_GENESIS,
      lastAnchorHeight: -1,
      unsealAnchorHeights: [],
      consumed: new Set(),
    },
    nullifiers: new Set(),
    seenVtdNonces: new Set(),
    seenServerNonces: new Set(),
    operatorJournal: [],
    clockMs: 1_700_000_000_000,
    emergencyUnseals: [],
    lockdown: false,
  }
}

// Old epochs stay available: rotation never makes existing ciphertexts
// decryptable under new keys (SIGE spec section 11.5).
export function activeEpoch(world: DemoWorld): EpochKeys {
  const epoch = world.epochs.get(world.activeEpoch)
  if (!epoch)
    throw new Error(`active epoch ${world.activeEpoch} is not registered`)
  return epoch
}

export function rotateEpoch(world: DemoWorld): EpochKeys {
  const next = world.activeEpoch + 1
  const keys = genEpoch(next)
  world.epochs.set(next, keys)
  world.activeEpoch = next
  return keys
}

export function currentDifficulty(world: DemoWorld): number {
  const state = world.logGateState
  const count = windowCount(
    world.policy.congestion,
    state.unsealAnchorHeights,
    world.chain.tipHeight(),
  )
  return requiredDifficulty(world.policy.congestion, count)
}

// ---------------------------------------------------------------------------
// Enrollment (SIGE spec section 7)

export type IdentityAttributes = {
  fullLegalName: string
  dateOfBirth: string
  documentNumber: string
}

const IDENTITY_ATTRS_KEYS: ReadonlySet<string> = new Set([
  'fullLegalName',
  'dateOfBirth',
  'documentNumber',
])

function cborToIdentityAttrs(value: CborValue): IdentityAttributes | null {
  const map = strictCborMap(value, IDENTITY_ATTRS_KEYS)
  const fullLegalName = map?.get('fullLegalName')
  const dateOfBirth = map?.get('dateOfBirth')
  const documentNumber = map?.get('documentNumber')
  if (
    typeof fullLegalName !== 'string' ||
    typeof dateOfBirth !== 'string' ||
    typeof documentNumber !== 'string'
  ) {
    return null
  }
  return { fullLegalName, dateOfBirth, documentNumber }
}

const INNER_PAYLOAD_KEYS: ReadonlySet<string> = new Set(['attrs', 'opening'])

function decodeInnerPayload(bytes: Uint8Array): IdentityPayload | null {
  const decoded = decodeCbor(bytes)
  if (!decoded.ok) return null
  const map = strictCborMap(decoded.value, INNER_PAYLOAD_KEYS)
  const attrsValue = map?.get('attrs')
  const opening = map?.get('opening')
  if (attrsValue === undefined || !(opening instanceof Uint8Array)) {
    return null
  }
  const attrs = cborToIdentityAttrs(attrsValue)
  return attrs ? { attrs, opening } : null
}

// Version 1 enrolls one escrow envelope per track (SIGE spec 5.5C). Both are
// proven well-formed at signup; the escrow context separates their keys.
export type TrackEscrow = {
  U: Uint8Array
  outer: Sealed
  ciphertextHash: Uint8Array
}

export type EnrollmentRecord = {
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  escrowEpoch: number
  transcriptHash: Uint8Array // stored: the Draft 0.1 launch-blocking fix
  identityCommitment: Uint8Array
  documentNullifier: Uint8Array
  idWarrant: Uint8Array
  idLog: Uint8Array
  tracks: Record<Track, TrackEscrow>
  t: number
  acceptedLeaf: { leaf: LogLeafV1; index: number; blinding: Uint8Array }
  // The §6.2.1 record the operator persists. An evidence bundle names it, so
  // it is minted once at enrollment, never reconstructed at unseal time.
  stored: EnrollmentRecordV1
}

export type Enrolled = {
  record: EnrollmentRecord
  attrs: IdentityAttributes
  // Spec 7.5 conditions this build cannot actually check. Surfaced on the
  // result so the placeholder half is visible in the API, not only in a doc.
  placeholderConditions: readonly string[]
  // The caller retains the blinding, or no party can ever open the account
  // commitment on the published leaf.
  acceptedLeaf: {
    bytes: Uint8Array
    index: number
    blinding: Uint8Array
  }
  // The account keeps this. Spec 12.3 requires authenticating the existing
  // account, which is impossible if enrollment discards its only key.
  accountPrivateKey: Uint8Array
}

// ROW 5. A submitter learns THAT it was refused, never WHY. Any reachable
// refusal string is an oracle on the exact predicate that failed, and the
// enrollment verifier checks eleven of them. The operator reason goes to
// `world.operatorJournal` instead, which no submitter can read.
export type EnrollResult =
  | Enrolled
  | { error: 'ENROLLMENT_REFUSED'; message: typeof SUBMITTER_REFUSAL_MESSAGE }

// DelayedIdentityEnvelopeV1 (SIGE spec section 5.5A): the puzzle now opens to
// a scalar with a published commitment and proof, not an asserted hash.
export type DelayedIdentityEnvelopeV1 = {
  schemaVersion: number
  delayProfileId: string
  t: number
  hS: Uint8Array
  proof: VtdProof
  innerNonce: Uint8Array
  innerCiphertext: Uint8Array
}

const DELAYED_IDENTITY_ENVELOPE_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'delayProfileId',
  't',
  'hS',
  'proof',
  'innerNonce',
  'innerCiphertext',
])

function cborToDelayedIdentityEnvelope(
  value: CborValue,
): DelayedIdentityEnvelopeV1 | null {
  const map = strictCborMap(value, DELAYED_IDENTITY_ENVELOPE_KEYS)
  const schemaVersion = asSafeCount(map?.get('schemaVersion'))
  const delayProfileId = map?.get('delayProfileId')
  const t = asSafeCount(map?.get('t'))
  if (
    schemaVersion === null ||
    typeof delayProfileId !== 'string' ||
    t === null
  ) {
    return null
  }
  const hS = map?.get('hS')
  const proof = cborToVtdProof(map?.get('proof'))
  const innerNonce = map?.get('innerNonce')
  const innerCiphertext = map?.get('innerCiphertext')
  if (
    !(hS instanceof Uint8Array) ||
    !proof ||
    !(innerNonce instanceof Uint8Array) ||
    !(innerCiphertext instanceof Uint8Array)
  ) {
    return null
  }
  return {
    schemaVersion,
    delayProfileId,
    t,
    hS,
    proof,
    innerNonce,
    innerCiphertext,
  }
}

function decodeEnvelope(bytes: Uint8Array): DelayedIdentityEnvelopeV1 | null {
  const decoded = decodeCbor(bytes)
  return decoded.ok ? cborToDelayedIdentityEnvelope(decoded.value) : null
}

export type EscrowBinding = {
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  escrowEpoch: number
  track: Track
}

export function escrowContext(
  world: DemoWorld,
  binding: EscrowBinding,
): Uint8Array {
  return sharedEscrowContext({ ...binding, networkId: world.networkId })
}

// ---------------------------------------------------------------------------
// Escrow key reconstruction from a stored EnrollmentRecordV1 (SIGE spec 18.2)

export type EscrowKeyResult =
  | { refused: false; key: Uint8Array; context: Uint8Array }
  | { refused: true; reason: string }

export function reconstructEscrowKey(
  world: DemoWorld,
  record: EnrollmentRecordV1,
  track: Track,
): EscrowKeyResult {
  const epoch = world.epochs.get(record.escrow_epoch)
  if (!epoch) {
    return {
      refused: true,
      reason: `escrow epoch ${record.escrow_epoch} is not available`,
    }
  }
  const u = escrowCiphertextForTrack(record, track).u
  const pointIssue = checkEncapsulationPoint(u)
  if (pointIssue) return { refused: true, reason: pointIssue }

  const idWarrant = gateIdentity(
    'warrant',
    world.networkId,
    record.account_id,
    record.enrollment_id,
    record.escrow_epoch,
  )
  const idLog = gateIdentity(
    'log',
    world.networkId,
    record.account_id,
    record.enrollment_id,
    record.escrow_epoch,
  )
  const context = escrowContext(world, {
    accountId: record.account_id,
    accountPublicKey: record.account_public_key,
    enrollmentId: record.enrollment_id,
    escrowEpoch: record.escrow_epoch,
    track,
  })
  const key = combineContributions(
    deriveContribution('warrant', idWarrant, epoch.xA, u),
    deriveContribution('log', idLog, epoch.xB, u),
    record.transcript_hash,
    context,
  )
  return { refused: false, key, context }
}

// Decrypts the named track's escrow ciphertext using only fields carried by
// the record itself: the §18.2 regression against the Draft 0.1 K-loss bug.
export function openEscrowCiphertextV1(
  world: DemoWorld,
  record: EnrollmentRecordV1,
  track: Track,
): Uint8Array | null {
  const result = reconstructEscrowKey(world, record, track)
  if (result.refused) return null
  const ciphertext = escrowCiphertextForTrack(record, track)
  return open(
    result.key,
    ciphertext.nonce,
    ciphertext.ciphertext,
    result.context,
  )
}

type ProofAdjustment = (proof: VtdProof) => VtdProof

// Detection tag (spec 6.2.3): PRF(key, counter). The account holds the key
// and can scan the public log for its own tags; a third party cannot link one.
export function detectionTag(
  detectionTagKey: Uint8Array,
  eventCounter: number,
): Uint8Array {
  return dhash('unseal-detection-tag', detectionTagKey, u32be(eventCounter))
}

export function scanForOwnTags(
  detectionTagKey: Uint8Array,
  publishedTags: readonly Uint8Array[],
  maxEvents = 64,
): number[] {
  const mine = new Set(
    Array.from({ length: maxEvents }, (_, i) =>
      toHex(detectionTag(detectionTagKey, i)),
    ),
  )
  return publishedTags
    .map((tag, index) => (mine.has(toHex(tag)) ? index : -1))
    .filter((index) => index >= 0)
}

export function recordEmergencyUnseal(
  world: DemoWorld,
  auth: UnsealAuthorizationV1,
  pub: PublishedLeaf,
): void {
  world.emergencyUnseals.push({
    authorizationHash: hashUnsealAuthorizationV1(auth),
    leafIndex: pub.leafIndex,
    anchorHeight: pub.anchor.blockHeight,
    ratifiedAtHeight: null,
  })
}

export function ratifyEmergencyUnseal(
  world: DemoWorld,
  authorizationHashHex: string,
): boolean {
  const pending = world.emergencyUnseals.find(
    (entry) =>
      toHex(entry.authorizationHash) === authorizationHashHex &&
      entry.ratifiedAtHeight === null,
  )
  if (!pending) return false
  pending.ratifiedAtHeight = world.chain.tipHeight()
  return true
}

// A missing ratification past the window is a public alarm, not a refusal:
// the unseal already happened and the log is what makes it answerable.
export function unratifiedEmergencyAlarms(world: DemoWorld): EmergencyUnseal[] {
  const deadline =
    world.chain.tipHeight() - world.policy.emergencyRatificationBlocks
  return world.emergencyUnseals.filter(
    (entry) => entry.ratifiedAtHeight === null && entry.anchorHeight < deadline,
  )
}

export function unsealCountsByTrack(world: DemoWorld): Record<Track, number> {
  const emergency = world.emergencyUnseals.length
  return {
    standard: world.logGateState.consumed.size - emergency,
    emergency,
  }
}

export function reserveNullifier(
  world: DemoWorld,
  nullifier: Uint8Array,
): boolean {
  const key = toHex(nullifier)
  if (world.nullifiers.has(key)) return false
  world.nullifiers.add(key)
  return true
}

function randomVtdSecret(): bigint {
  for (;;) {
    const s = Fr.create(bytesToBigInt(randomBytes(48)))
    if (s !== 0n) return s
  }
}

type EnvelopeInput = {
  secret: bigint
  innerAd: Uint8Array
  payload: Uint8Array
  adjustProof: ProofAdjustment
}

function buildEnvelope(
  world: DemoWorld,
  input: EnvelopeInput,
): DelayedIdentityEnvelopeV1 {
  const { secret, innerAd, payload, adjustProof } = input
  const hS = scalarCommitment(secret)
  const proof = adjustProof(
    proveVtd(world.delayParams, secret, world.policy.vtdProfile),
  )
  const inner = seal(innerKey(secret), payload, innerAd)
  return {
    schemaVersion: ENVELOPE_SCHEMA_VERSION,
    delayProfileId: DELAY_PROFILE_ID,
    t: world.policy.t,
    hS,
    proof,
    innerNonce: inner.nonce,
    innerCiphertext: inner.ciphertext,
  }
}

// A stateless verifier cannot see nonce reuse across enrollments, and a
// repeated nonce repeats the derived polynomial (pools to zero squarings).
function checkEnvelope(
  world: DemoWorld,
  envelope: DelayedIdentityEnvelopeV1,
): string | null {
  if (world.seenVtdNonces.has(toHex(envelope.proof.nonce))) {
    return 'refused: this proof nonce has already been used'
  }
  const expectations = { hS: envelope.hS, profile: world.policy.vtdProfile }
  const invalid = verifyVtd(world.delayParams, envelope.proof, expectations)
  return invalid ? `refused: vtd proof rejected: ${invalid}` : null
}

// dhash length-frames every part, so decimal text is unambiguous and no
// operator-supplied number can push an encoder out of range.
function verifierBuildHash(world: DemoWorld): Uint8Array {
  const { n, k, o } = world.policy.vtdProfile
  return dhash(
    'sige/v1/verifier-build',
    utf8(DEMO_PROOF_SYSTEM_ID),
    utf8(DEMO_POLICY_ID),
    utf8(DEMO_TRUST_SNAPSHOT_ID),
    utf8(DELAY_PROFILE_ID),
    utf8(String(world.policy.t)),
    utf8(`${n}/${k}/${o}`),
  )
}

function escrowCiphertextOf(escrow: TrackEscrow): EscrowCiphertextV1 {
  return {
    u: escrow.U,
    nonce: escrow.outer.nonce,
    ciphertext: escrow.outer.ciphertext,
  }
}

type StoredEnrollmentInput = {
  accountId: Uint8Array
  accountPublicKey: Uint8Array
  enrollmentId: Uint8Array
  escrowEpoch: number
  transcriptHash: Uint8Array
  identityCommitment: Uint8Array
  documentNullifier: Uint8Array
  tracks: Record<Track, TrackEscrow>
  envelopes: Record<Track, DelayedIdentityEnvelopeV1>
}

function storedEnrollmentRecord(
  world: DemoWorld,
  input: StoredEnrollmentInput,
): EnrollmentRecordV1 {
  return enrollmentRecordV1({
    ...recordHeader(world.networkId),
    account_id: input.accountId,
    account_public_key: input.accountPublicKey,
    enrollment_id: input.enrollmentId,
    credential_profile_id: DEMO_CREDENTIAL_PROFILE_ID,
    trust_snapshot_id: DEMO_TRUST_SNAPSHOT_ID,
    policy_id: DEMO_POLICY_ID,
    escrow_epoch: input.escrowEpoch,
    delay_profile_id: DELAY_PROFILE_ID,
    transcript_hash: input.transcriptHash,
    identity_commitment: input.identityCommitment,
    document_nullifier: input.documentNullifier,
    escrow_ciphertext_standard: escrowCiphertextOf(input.tracks.standard),
    escrow_ciphertext_emergency: escrowCiphertextOf(input.tracks.emergency),
    // none-clear-mode publishes no succinct proof, so this stays empty rather
    // than carrying bytes that prove nothing.
    enrollment_proof: new Uint8Array(0),
    timed_commitment_proof: {
      standard: input.envelopes.standard.proof,
      emergency: input.envelopes.emergency.proof,
    },
    proof_system_id: DEMO_PROOF_SYSTEM_ID,
    unseal_detection_tag_key: null,
    accepted_at: world.clockMs,
    verifier_build_hash: verifierBuildHash(world),
  })
}

type EnrollInput = {
  documentIssuanceId: string
  attrs: IdentityAttributes
  adjustProof?: ProofAdjustment
  // Migration rewraps one credential under a new epoch. Reusing the prior
  // nullifier keeps spec 7.4's stable-per-document property intact.
  continuityNullifier?: Uint8Array
}

function enrollCore(
  world: DemoWorld,
  input: EnrollInput,
): EnrollResult | string {
  const {
    documentIssuanceId,
    attrs,
    adjustProof = (proof: VtdProof) => proof,
  } = input
  const reusing = input.continuityNullifier !== undefined
  const nullifier =
    input.continuityNullifier ??
    tryDocumentNullifier(world.networkId, documentIssuanceId)
  if (nullifier === null) {
    return 'refused: document issuance id is ambiguous or empty'
  }
  // Reserve on read, release on refusal: a later async build must not open a
  // window where a second submission passes the same uniqueness check.
  // A distinct tag here answered, before any curve operation, whether a given
  // document is already enrolled. Probing with junk attributes then enumerates
  // the enrolled population, which is the linkage this system exists to stop.
  if (!reusing && !reserveNullifier(world, nullifier)) {
    return 'refused: the credential is already enrolled'
  }
  const releaseOnRefusal = <T>(value: T): T => {
    if (!reusing) world.nullifiers.delete(toHex(nullifier))
    return value
  }

  const account = keyPair()
  const accountId = dhash('account', account.pub)
  const enrollmentId = randomBytes(16)
  const serverNonce = randomBytes(32)
  const clientNonce = randomBytes(32)
  const transcript = transcriptHash({
    networkId: world.networkId,
    accountId,
    accountPublicKey: account.pub,
    enrollmentId,
    serverNonce,
    clientNonce,
    policyId: DEMO_POLICY_ID,
    trustSnapshotId: DEMO_TRUST_SNAPSHOT_ID,
    escrowEpoch: world.activeEpoch,
    delayProfileId: DELAY_PROFILE_ID,
  })

  const opening = randomBytes(32)
  const attrsBytes = encodeIdentityAttrs(attrs)
  const commitment = identityCommitment(attrsBytes, account.pub, opening)

  const ad = innerAd(accountId, enrollmentId)
  const payload = encodeInnerPayload(attrs, opening)
  const envelopes = {} as Record<Track, DelayedIdentityEnvelopeV1>
  const trackSecrets = {} as Record<Track, bigint>
  for (const track of TRACKS) {
    const secret = randomVtdSecret()
    const envelope = buildEnvelope(world, {
      secret,
      innerAd: ad,
      payload,
      adjustProof,
    })
    const rejection = checkEnvelope(world, envelope)
    if (rejection) return releaseOnRefusal(rejection)
    world.seenVtdNonces.add(toHex(envelope.proof.nonce))
    envelopes[track] = envelope
    trackSecrets[track] = secret
  }

  const epoch = activeEpoch(world)
  const idWarrant = gateIdentity(
    'warrant',
    world.networkId,
    accountId,
    enrollmentId,
    epoch.epoch,
  )
  const idLog = gateIdentity(
    'log',
    world.networkId,
    accountId,
    enrollmentId,
    epoch.epoch,
  )
  const tracks = {} as Record<Track, TrackEscrow>
  for (const track of TRACKS) {
    const context = escrowContext(world, {
      accountId,
      accountPublicKey: account.pub,
      enrollmentId,
      escrowEpoch: epoch.epoch,
      track,
    })
    const envelopeBytes = encodeEnvelope(envelopes[track])
    const { U, K } = encapsulate({
      ids: { warrant: idWarrant, log: idLog },
      keys: { pkA: epoch.pkA, pkB: epoch.pkB },
      transcriptHash: transcript,
      context,
      plaintext: envelopeBytes,
    })
    const outer = seal(K, envelopeBytes, context)
    tracks[track] = {
      U,
      outer,
      ciphertextHash: escrowCiphertextHash(U, outer.nonce, outer.ciphertext),
    }
  }

  const verdict = verifyThroughSpecVerifier(
    {
      networkId: world.networkId,
      accountId,
      accountPublicKey: account.pub,
      enrollmentId,
      serverNonce,
      clientNonce,
      transcriptHash: transcript,
      identityCommitment: commitment,
      documentNullifier: nullifier,
      documentIssuanceId,
      attrs,
      commitmentOpening: opening,
      escrowEpoch: epoch.epoch,
      epochKeys: epoch,
      vtdProfile: world.policy.vtdProfile,
      delayT: world.policy.t,
      delayLhtlpParams: world.delayParams,
      tracks: Object.fromEntries(
        TRACKS.map((track) => [
          track,
          {
            secret: trackSecrets[track],
            hS: envelopes[track].hS,
            proof: envelopes[track].proof,
            innerNonce: envelopes[track].innerNonce,
            innerCiphertext: envelopes[track].innerCiphertext,
            escrowCiphertext: {
              u: tracks[track].U,
              nonce: tracks[track].outer.nonce,
              ciphertext: tracks[track].outer.ciphertext,
            },
          },
        ]),
      ) as Record<Track, AdapterTrackInput>,
      now: world.clockMs,
    },
    {
      networkId: world.networkId,
      escrowEpoch: epoch.epoch,
      epochKeys: epoch,
      vtdProfile: world.policy.vtdProfile,
      delayT: world.policy.t,
      delayLhtlpParams: world.delayParams,
    },
    seenNonceDeps(world.seenServerNonces, nullifier, world.clockMs),
  )
  if (!verdict.outcome.accepted) {
    return releaseOnRefusal(`refused: ${verdict.outcome.operatorReason}`)
  }

  const stored = storedEnrollmentRecord(world, {
    accountId,
    accountPublicKey: account.pub,
    enrollmentId,
    escrowEpoch: epoch.epoch,
    transcriptHash: transcript,
    identityCommitment: commitment,
    documentNullifier: nullifier,
    tracks,
    envelopes,
  })
  // Its own blinding. Reusing `opening` would publish the value that also
  // opens identity_commitment, handing out a dictionary oracle on the attrs.
  const enrollmentLeafBlinding = randomBytes(32)
  const acceptedLeaf = enrollmentAcceptedLeaf({
    networkId: world.networkId,
    stored,
    accountCommitment: accountCommitment(accountId, enrollmentLeafBlinding),
    createdAt: world.clockMs,
  })
  const acceptedLeafBytes = encodeLogLeafV1(acceptedLeaf)
  const acceptedLeafIndex = world.log.append(acceptedLeafBytes)
  world.logGateState.acceptedRecordHashes.set(
    toHex(enrollmentId),
    toHex(hashEnrollmentRecordV1(stored)),
  )

  const record: EnrollmentRecord = {
    accountId,
    accountPublicKey: account.pub,
    enrollmentId,
    escrowEpoch: epoch.epoch,
    transcriptHash: transcript,
    identityCommitment: commitment,
    documentNullifier: nullifier,
    idWarrant,
    idLog,
    tracks,
    t: world.policy.t,
    stored,
    acceptedLeaf: {
      leaf: acceptedLeaf,
      index: acceptedLeafIndex,
      blinding: enrollmentLeafBlinding,
    },
  }
  return {
    record,
    attrs,
    accountPrivateKey: account.priv,
    placeholderConditions: verdict.placeholderConditions,
    acceptedLeaf: {
      bytes: acceptedLeafBytes,
      index: acceptedLeafIndex,
      blinding: enrollmentLeafBlinding,
    },
  }
}

// The reason is recorded where the operator can read it and the submitter
// cannot. Returning it would turn every refusal into a probe.
function refuseEnrollment(
  world: DemoWorld,
  operatorReason: string,
): EnrollResult {
  world.operatorJournal.push(operatorReason)
  return { error: 'ENROLLMENT_REFUSED', message: SUBMITTER_REFUSAL_MESSAGE }
}

export function enroll(
  world: DemoWorld,
  documentIssuanceId: string,
  attrs: IdentityAttributes,
): EnrollResult {
  const result = enrollCore(world, { documentIssuanceId, attrs })
  return typeof result === 'string' ? refuseEnrollment(world, result) : result
}

// Spec 13.2 path 1: a migration is a rewrap of the same credential, so it
// mints a new enrollment id and new epoch-keyed ciphertexts, not a nullifier.
export function enrollForMigration(
  world: DemoWorld,
  priorRecord: EnrollmentRecord,
  attrs: IdentityAttributes,
  documentIssuanceId: string,
): EnrollResult {
  // Deriving the nullifier and comparing proves the migration really is the
  // same document, rather than trusting the caller to say so.
  const derived = tryDocumentNullifier(world.networkId, documentIssuanceId)
  if (derived === null || !bytesEqual(derived, priorRecord.documentNullifier)) {
    return refuseEnrollment(
      world,
      'refused: migration names a different document than the prior enrollment',
    )
  }
  const result = enrollCore(world, {
    documentIssuanceId,
    attrs,
    continuityNullifier: priorRecord.documentNullifier,
  })
  return typeof result === 'string' ? refuseEnrollment(world, result) : result
}

const FAULT_INJECTION_ATTRS: IdentityAttributes = {
  fullLegalName: 'Fault Injection',
  dateOfBirth: '1970-01-01',
  documentNumber: 'FAULT',
}

export function enrollWithTamperedProof(
  world: DemoWorld,
  documentIssuanceId: string,
): string | null {
  const tamperCommitment: ProofAdjustment = (proof) => ({
    ...proof,
    commitments: {
      a: [
        proof.commitments.a[1],
        proof.commitments.a[0],
        ...proof.commitments.a.slice(2),
      ],
    },
  })
  const result = enrollCore(world, {
    documentIssuanceId,
    attrs: FAULT_INJECTION_ATTRS,
    adjustProof: tamperCommitment,
  })
  return typeof result === 'string' ? result : null
}

export function enrollReusingProofNonce(
  world: DemoWorld,
  documentIssuanceId: string,
  priorRecord: EnrollmentRecord,
): string | null {
  const priorContributions = deriveBothOutOfInterface(world, priorRecord, {
    unsafe: true,
  })
  const priorOpened = openOuter(world, priorRecord, priorContributions)
  if (!priorOpened) {
    return 'refused: could not recover a prior nonce to test reuse against'
  }
  const priorNonce = priorOpened.envelope.proof.nonce
  const reuseNonce: ProofAdjustment = (proof) => ({
    ...proof,
    nonce: priorNonce,
  })
  const result = enrollCore(world, {
    documentIssuanceId,
    attrs: FAULT_INJECTION_ATTRS,
    adjustProof: reuseNonce,
  })
  return typeof result === 'string' ? result : null
}

export function verifyCommitmentOpening(
  record: EnrollmentRecord,
  attrs: IdentityAttributes,
  opening: Uint8Array,
): boolean {
  const again = identityCommitment(
    encodeIdentityAttrs(attrs),
    record.accountPublicKey,
    opening,
  )
  return bytesEqual(again, record.identityCommitment)
}

// ---------------------------------------------------------------------------
// Legal orders and authorization (SIGE spec section 9)

export type OrderEvidence = {
  orderHash: Uint8Array
  role: Role
  signature: Uint8Array
}

// The role signs the domain-tagged message the evidence bundle checks, so one
// signature serves the gate and the offline auditor.
export function issueOrder(
  world: DemoWorld,
  role: string,
  orderText: string,
): OrderEvidence {
  const signer = world.roles[role]
  if (!signer) throw new Error(`unknown role: ${role}`)
  const orderHash = dhash('order', utf8(orderText))
  return {
    orderHash,
    role,
    signature: ed25519.sign(
      orderDocumentSignatureMessage(orderHash),
      signer.priv,
    ),
  }
}

export function forgeOrder(role: Role, orderText: string): OrderEvidence {
  const orderHash = dhash('order', utf8(orderText))
  const rogue = keyPair()
  return {
    orderHash,
    role,
    signature: ed25519.sign(
      orderDocumentSignatureMessage(orderHash),
      rogue.priv,
    ),
  }
}

export function orderSignatureEvidence(
  order: OrderEvidence,
): RedactedOrderSignatureEvidence {
  return {
    orderDocumentHash: order.orderHash,
    issuingRole: order.role,
    signature: order.signature,
  }
}

export type BuiltLeaf = {
  bytes: Uint8Array
  leaf: LogLeafV1
  blinding: Uint8Array // the caller retains it, or no Disclosure can ever open the commitment
}

export const UNSEAL_LEAF_TYPE = {
  standard: 'UNSEAL_STANDARD',
  emergency: 'UNSEAL_EMERGENCY',
} satisfies Record<Track, LeafType>

const DISCLOSURE_CLASS = {
  standard: 'standard',
  emergency: 'emergency',
} satisfies Record<Track, string>

// The emergency track is exempt from congestion (SIGE spec 5.5C). Its
// protection is auditability and separate counting, not delay.
export function requiredDifficultyForTrack(
  world: DemoWorld,
  track: Track,
): number {
  return track === 'emergency' ? 0 : currentDifficulty(world)
}

// Public unseal leaf: role, track, and congestion parameters in the clear,
// account behind a hiding commitment (SIGE spec section 6.2.3).
export function buildUnsealLeaf(
  world: DemoWorld,
  auth: UnsealAuthorizationV1,
): BuiltLeaf {
  const blinding = randomBytes(32)
  const state = world.logGateState
  const leaf = logLeafV1({
    ...recordHeader(world.networkId),
    leaf_type: UNSEAL_LEAF_TYPE[auth.track],
    event_id: randomBytes(16),
    authorization_hash: hashUnsealAuthorizationV1(auth),
    account_commitment: accountCommitment(auth.account_id, blinding),
    case_reference_commitment: auth.case_reference_commitment,
    order_document_hash: auth.order_document_hash,
    ciphertext_hash: auth.ciphertext_hash,
    escrow_epoch: auth.escrow_epoch,
    issuing_role: auth.issuing_role,
    track: auth.track,
    prev_unseal_anchor_ref:
      state.lastAnchorHeight < 0 ? null : state.lastAnchorHeight,
    congestion_difficulty: requiredDifficultyForTrack(world, auth.track),
    congestion_stamp_output: zeroStampOutput(),
    unseal_detection_tag: null,
    public_disclosure_class: DISCLOSURE_CLASS[auth.track],
    created_at: world.clockMs,
    extension_commitments: [],
  })
  return { bytes: encodeLogLeafV1(leaf), leaf, blinding }
}

// The stamp is computed over the leaf with its output field zeroed, then the
// output is written back in. Both are the same leaf, one before and one after.
export function stampUnsealLeaf(
  built: BuiltLeaf,
  output: Uint8Array,
): BuiltLeaf {
  const leaf = logLeafV1({ ...built.leaf, congestion_stamp_output: output })
  return { bytes: encodeLogLeafV1(leaf), leaf, blinding: built.blinding }
}

export type AuthorizationInput = {
  record: EnrollmentRecord
  order: OrderEvidence
  track?: Track
  caseReference?: string
}

export type IssuedAuthorization = {
  authorization: UnsealAuthorizationV1
  // Opens both hiding commitments the authorization carries. Discard it and
  // no Disclosure can ever name the case or the mapping.
  commitmentSalt: Uint8Array
}

const AUTHORIZATION_VALIDITY_MS = 3_600_000

export function createAuthorization(
  world: DemoWorld,
  input: AuthorizationInput,
): IssuedAuthorization {
  const { record, order } = input
  const track = input.track ?? 'standard'
  const caseReference =
    input.caseReference ?? `case-${toHex(order.orderHash).slice(0, 16)}`
  const commitmentSalt = randomBytes(32)
  const unapproved = unsealAuthorizationV1({
    ...recordHeader(world.networkId),
    authorization_id: randomBytes(16),
    account_id: record.accountId,
    enrollment_id: record.enrollmentId,
    enrollment_record_hash: hashEnrollmentRecordV1(record.stored),
    escrow_epoch: record.escrowEpoch,
    track,
    ciphertext_hash: record.tracks[track].ciphertextHash,
    order_document_hash: order.orderHash,
    order_signature_evidence_hash: orderSignatureEvidenceCommitment(
      orderSignatureEvidence(order),
    ),
    issuing_authority: world.profile.title,
    issuing_role: order.role,
    jurisdiction: world.profile.id,
    case_reference_commitment: caseReferenceCommitment(
      caseReference,
      commitmentSalt,
    ),
    legal_basis_code: world.profile.legalBasisCode,
    requested_attribute_scope: [...IDENTITY_ATTRIBUTE_NAMES],
    mapping_explanation_commitment: mappingExplanationCommitment(
      `${order.role} order maps to enrollment ${toHex(record.enrollmentId)}`,
      commitmentSalt,
    ),
    reviewer_approvals: [],
    policy_version: DEMO_POLICY_ID,
    expires_at: world.clockMs + AUTHORIZATION_VALIDITY_MS,
  })
  const message = reviewerApprovalMessage(unapproved)
  return {
    authorization: {
      ...unapproved,
      reviewer_approvals: world.reviewers.map((r) =>
        ed25519.sign(message, r.priv),
      ),
    },
    commitmentSalt,
  }
}

// ---------------------------------------------------------------------------
// Gates (SIGE spec sections 5.6, 8.4, 11)

export type Refusal = {
  refused: true
  gate: 'warrant' | 'log'
  reason: string
}

export type Release = {
  refused: false
  contribution: Uint8Array
  attestation: { message: Uint8Array; signature: Uint8Array }
}

export type GateOutcome = Refusal | Release

export type WarrantGateRequest = {
  auth: UnsealAuthorizationV1
  order: OrderEvidence
  leafBytes: Uint8Array
}

// Every field a gate releases against must be bound to the target record and
// to the published leaf. An unbound field is a release the public log misreports.
// Signing a value is not checking it. Both gates sign
// hashUnsealAuthorizationV1, which carries enrollment_record_hash, so the pin
// travels under an HSM signature and nothing validated it. Without this the
// operator issues the order against a record he forged before the order.
// Three facts about one stamp: it pays the required work, the leaf the log
// publishes carries its output, and the leaf does not understate the
// difficulty. Without the second the offline auditor is back to a free field.
function checkCongestionStamp(
  world: DemoWorld,
  req: LogGateRequest,
  leaf: LogLeafV1,
  state: LogGateState,
): string | null {
  const required = requiredDifficultyForTrack(world, req.auth.track)
  const lh = congestionStampLeafHash(leaf)
  if (!verifyWork(req.stamp, state.lastStampOutput, lh, required)) {
    return `congestion stamp below required difficulty ${required}`
  }
  if (!bytesEqual(leaf.congestion_stamp_output, req.stamp.output)) {
    return 'leaf does not carry the stamp output the gate verified'
  }
  return leaf.congestion_difficulty < required
    ? 'leaf understates the required congestion difficulty'
    : null
}

function checkGateAuthority(
  world: DemoWorld,
  auth: UnsealAuthorizationV1,
): string | null {
  if (auth.expires_at <= world.clockMs) {
    return 'authorization has expired'
  }
  const accepted = world.logGateState.acceptedRecordHashes.get(
    toHex(auth.enrollment_id),
  )
  if (accepted === undefined) {
    return 'authorization names an enrollment this gate never accepted'
  }
  return accepted === toHex(auth.enrollment_record_hash)
    ? null
    : 'authorization pins a record this enrollment never accepted'
}

function checkAuthorizationBinding(
  auth: UnsealAuthorizationV1,
  record: EnrollmentRecord,
  leaf: LogLeafV1,
): string | null {
  const escrow = record.tracks[auth.track]
  if (!escrow) return 'authorization names an unknown track'
  if (!bytesEqual(auth.ciphertext_hash, escrow.ciphertextHash)) {
    return 'authorization does not match the target ciphertext'
  }
  if (!bytesEqual(auth.account_id, record.accountId)) {
    return 'authorization targets another account'
  }
  if (!bytesEqual(auth.enrollment_id, record.enrollmentId)) {
    return 'authorization targets another enrollment'
  }
  if (!bytesEqual(leaf.authorization_hash, hashUnsealAuthorizationV1(auth))) {
    return 'leaf does not commit this authorization'
  }
  if (!bytesEqual(leaf.ciphertext_hash, escrow.ciphertextHash)) {
    return 'leaf targets another ciphertext'
  }
  if (leaf.issuing_role !== auth.issuing_role) {
    return 'leaf role does not match the authorization'
  }
  // Without this an emergency unseal launders itself onto a standard leaf,
  // escaping separate counting and the ratification requirement (5.5C req 1).
  if (leaf.track !== auth.track) {
    return 'leaf track does not match the authorization'
  }
  if (leaf.leaf_type !== UNSEAL_LEAF_TYPE[auth.track]) {
    return 'leaf type does not match the authorization track'
  }
  return null
}

function verifiesEd25519(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

export const REVIEWER_QUORUM = 2

function reviewerQuorum(world: DemoWorld, auth: UnsealAuthorizationV1): number {
  const message = reviewerApprovalMessage(auth)
  return auth.reviewer_approvals.filter((signature, i) => {
    // ROW 16. A roster shorter than the approvals list must count the extras
    // as unverified, never index past the end.
    const reviewer = world.reviewers[i]
    return (
      reviewer !== undefined &&
      verifiesEd25519(signature, message, reviewer.pub)
    )
  }).length
}

export function verifyOrderAuthenticity(
  world: DemoWorld,
  order: OrderEvidence,
): string | null {
  if (!world.policy.acceptedRoles.includes(order.role)) {
    return `issuing role "${order.role}" is not in the accepted set`
  }
  const signer = world.roles[order.role]
  if (!signer) {
    return `issuing role "${order.role}" has no key on the pinned trust list`
  }
  const message = orderDocumentSignatureMessage(order.orderHash)
  if (!verifiesEd25519(order.signature, message, signer.pub)) {
    return 'order signature does not chain to the pinned trust list'
  }
  return null
}

export function warrantGate(
  world: DemoWorld,
  req: WarrantGateRequest,
  record: EnrollmentRecord,
): GateOutcome {
  const refuse = (reason: string): Refusal => ({
    refused: true,
    gate: 'warrant',
    reason,
  })
  const { auth, order } = req
  if (world.lockdown) return refuse('lockdown')

  const authenticity = verifyOrderAuthenticity(world, order)
  if (authenticity) return refuse(authenticity)
  if (!bytesEqual(order.orderHash, auth.order_document_hash)) {
    return refuse('authorization does not reference this order')
  }
  if (auth.issuing_role !== order.role)
    return refuse('authorization role does not match the order')
  if (reviewerQuorum(world, auth) < REVIEWER_QUORUM)
    return refuse('reviewer quorum not met')

  const leaf = parseLeaf(req.leafBytes)
  if (!leaf) return refuse('leaf is not a canonical unseal leaf')
  const authority = checkGateAuthority(world, auth)
  if (authority) return refuse(authority)
  const binding = checkAuthorizationBinding(auth, record, leaf)
  if (binding) return refuse(binding)

  const epoch = world.epochs.get(record.escrowEpoch)
  if (!epoch)
    return refuse(`escrow epoch ${record.escrowEpoch} is not available`)
  const escrow = record.tracks[auth.track]
  const pointIssue = checkEncapsulationPoint(escrow.U)
  if (pointIssue) return refuse(pointIssue)

  const contribution = deriveContribution(
    'warrant',
    record.idWarrant,
    epoch.xA,
    escrow.U,
  )
  const message = attestationMessage('warrant', auth, leaf)
  return {
    refused: false,
    contribution,
    attestation: {
      message,
      signature: ed25519.sign(message, world.warrantHsmKey.priv),
    },
  }
}

export type LogGateRequest = {
  auth: UnsealAuthorizationV1
  leafBytes: Uint8Array
  leafIndex: number
  inclusion: Uint8Array[]
  consistency?: Uint8Array[]
  sth: SignedTreeHeadV1
  anchor: Anchor
  stamp: WorkStamp
}

// The gate compares against its OWN last accepted head. A caller-supplied
// treeSize of 0 must never stand in for "no prior state" (spec 10.5).
function checkHeadConsistency(
  state: LogGateState,
  head: SignedTreeHead,
  proof: Uint8Array[],
): string | null {
  const priorRoot = state.rootHash
  if (priorRoot === null) return null
  const consistent = verifyConsistency(
    {
      treeId: head.treeId,
      treeSize: state.treeSize,
      rootHash: priorRoot,
      signature: EMPTY_SIG,
    },
    head,
    proof,
  )
  return consistent
    ? null
    : 'tree head is not consistent with the last accepted head'
}

function checkChainState(world: DemoWorld, req: LogGateRequest): string | null {
  const state = world.logGateState
  const head = coreSignedTreeHead(req.sth)
  if (!verifyHead(world.log.publicKey, head))
    return 'tree head signature invalid'
  if (head.treeSize < state.treeSize) {
    return 'rollback: tree head is older than accepted monotonic state'
  }
  const consistency = checkHeadConsistency(state, head, req.consistency ?? [])
  if (consistency) return consistency
  if (
    !verifyInclusion(
      req.leafBytes,
      req.leafIndex,
      head.treeSize,
      req.inclusion,
      head.rootHash,
    )
  ) {
    return 'leaf is not included under the presented tree head'
  }
  const block = world.chain.blocks[req.anchor.blockHeight]
  const anchored = hashSignedTreeHeadV1(req.sth)
  if (!block?.payload || !bytesEqual(block.payload, anchored)) {
    return 'anchor does not commit this tree head'
  }
  if (world.chain.confirmations(req.anchor.blockHeight) < world.policy.k) {
    return `anchor depth below required ${world.policy.k} confirmations`
  }
  // D1 serial anchoring: unseal n anchors strictly later than unseal n-1,
  // paced by block production the operator cannot accelerate.
  if (req.anchor.blockHeight <= state.lastAnchorHeight) {
    return 'anchor must be later than the previous unseal anchor'
  }
  return null
}

export function logGate(
  world: DemoWorld,
  req: LogGateRequest,
  record: EnrollmentRecord,
): GateOutcome {
  const refuse = (reason: string): Refusal => ({
    refused: true,
    gate: 'log',
    reason,
  })
  const state = world.logGateState
  if (world.lockdown) return refuse('lockdown')

  const authHash = hashUnsealAuthorizationV1(req.auth)
  const authHex = toHex(authHash)
  if (state.consumed.has(authHex))
    return refuse('authorization already released')

  const chain = checkChainState(world, req)
  if (chain) return refuse(chain)

  const leaf = parseLeaf(req.leafBytes)
  if (!leaf) return refuse('leaf is not a canonical unseal leaf')
  const authority = checkGateAuthority(world, req.auth)
  if (authority) return refuse(authority)
  const binding = checkAuthorizationBinding(req.auth, record, leaf)
  if (binding) return refuse(binding)

  const epoch = world.epochs.get(record.escrowEpoch)
  if (!epoch)
    return refuse(`escrow epoch ${record.escrowEpoch} is not available`)
  const escrow = record.tracks[req.auth.track]
  const pointIssue = checkEncapsulationPoint(escrow.U)
  if (pointIssue) return refuse(pointIssue)

  const lh = congestionStampLeafHash(leaf)
  const congestion = checkCongestionStamp(world, req, leaf, state)
  if (congestion) return refuse(congestion)

  // Advance hardware-backed monotonic state (SIGE spec section 11.4).
  state.treeSize = req.sth.tree_size
  // Copied, never aliased. Storing the caller's array made one Uint8Array the
  // published leaf field, the stamp output, this chain head and the next
  // bundle's starting value at once, so one `.set()` rewrote the gate's memory.
  state.rootHash = Uint8Array.from(req.sth.root_hash)
  state.lastStampOutput = Uint8Array.from(req.stamp.output)
  state.lastAnchorHeight = req.anchor.blockHeight
  state.unsealAnchorHeights.push(req.anchor.blockHeight)
  state.consumed.add(authHex)
  state.stateHash = dhash('monotonic', state.stateHash, authHash, lh)

  const contribution = deriveContribution(
    'log',
    record.idLog,
    epoch.xB,
    escrow.U,
  )
  const message = attestationMessage('log', req.auth, leaf)
  return {
    refused: false,
    contribution,
    attestation: {
      message,
      signature: ed25519.sign(message, world.logHsmKey.priv),
    },
  }
}

// Out-of-interface derivation: both master secrets, no gates, no leaf, no
// attestation. Deliberately demonstrated honest gap (SIGE spec section 19).
export function deriveBothOutOfInterface(
  world: DemoWorld,
  record: EnrollmentRecord,
  opts?: { unsafe?: boolean; track?: Track },
): { zA: Uint8Array; zB: Uint8Array } {
  if (!opts?.unsafe) {
    throw new Error(
      'refused: out-of-interface derivation requires { unsafe: true }',
    )
  }
  const epoch = world.epochs.get(record.escrowEpoch)
  if (!epoch)
    throw new Error(`escrow epoch ${record.escrowEpoch} is not available`)
  const { U } = record.tracks[opts.track ?? 'standard']
  return {
    zA: deriveContribution('warrant', record.idWarrant, epoch.xA, U),
    zB: deriveContribution('log', record.idLog, epoch.xB, U),
  }
}

// ---------------------------------------------------------------------------
// Ceremony (SIGE spec section 10)

export type OpenedEnvelope = {
  envelope: DelayedIdentityEnvelopeV1
}

export function openOuter(
  world: DemoWorld,
  record: EnrollmentRecord,
  contributions: { zA: Uint8Array; zB: Uint8Array },
  track: Track = 'standard',
): OpenedEnvelope | null {
  const escrow = record.tracks[track]
  const context = escrowContext(world, { ...record, track })
  const K = combineContributions(
    contributions.zA,
    contributions.zB,
    record.transcriptHash,
    context,
  )
  const envelopeBytes = open(
    K,
    escrow.outer.nonce,
    escrow.outer.ciphertext,
    context,
  )
  if (!envelopeBytes) return null
  const reencapsulates = verifyEncapsulation({
    transcriptHash: record.transcriptHash,
    context,
    plaintext: envelopeBytes,
    U: escrow.U,
  })
  if (!reencapsulates) return null
  const envelope = decodeEnvelope(envelopeBytes)
  return envelope ? { envelope } : null
}

export type IdentityPayload = {
  attrs: IdentityAttributes
  opening: Uint8Array
}

// The recovered secret and the exact plaintext are what the evidence bundle
// commits to, so the ceremony returns them instead of discarding them.
export type RecoveredIdentity = IdentityPayload & {
  secret: bigint
  payload: Uint8Array
}

export type PayDelayInput = {
  record: EnrollmentRecord
  opened: OpenedEnvelope
  onProgress?: (done: number, total: number) => void
}

export async function payDelayAndDecrypt(
  world: DemoWorld,
  input: PayDelayInput,
): Promise<RecoveredIdentity | null> {
  const { record, opened, onProgress } = input
  const { envelope } = opened
  // The record's declared delay is only evidence if it equals the delay the
  // authenticated envelope actually charges, and the world's own params.
  if (envelope.t !== record.t || envelope.t !== world.delayParams.t) {
    return null
  }
  const expectations = { hS: envelope.hS, profile: world.policy.vtdProfile }
  if (verifyVtd(world.delayParams, envelope.proof, expectations)) return null
  const secret = await solveVtd(world.delayParams, envelope.proof, onProgress)
  const derivedKey = innerKey(secret)
  const ad = innerAd(record.accountId, record.enrollmentId)
  const payload = open(
    derivedKey,
    envelope.innerNonce,
    envelope.innerCiphertext,
    ad,
  )
  if (!payload) return null
  const decoded = decodeInnerPayload(payload)
  return decoded ? { ...decoded, secret, payload } : null
}

// ---------------------------------------------------------------------------
// Full supported unseal flow with fault injection for the scenarios.

export type UnsealOptions = {
  role?: Role
  track?: Track
  forgedOrder?: boolean
  skipLeafAppend?: boolean
  confirmations?: number
  presentStaleHead?: SignedTreeHeadV1
  skipDelay?: boolean
  reuse?: {
    leafBytes: Uint8Array
    leafIndex: number
    head: SignedTreeHeadV1
    anchor: Anchor
  }
  onStep?: (label: string, ok: boolean, detail?: string) => void
  onProgress?: (done: number, total: number) => void
}

export type UnsealOutcome = {
  ok: boolean
  refusal?: Refusal
  identity?: RecoveredIdentity
  stampDifficulty?: number
  published?: PublishedLeaf
  bundle?: EvidenceBundleV1
  // Opens decryptionResultCommitment. Without it the bundle proves an unseal
  // happened but nobody can show what came out of it.
  decryptionOpening?: Uint8Array
  // Names why a completed ceremony still produced no bundle.
  bundleGap?: string
}

type Step = (label: string, ok: boolean, detail?: string) => void

function refusedBefore(
  gate: 'warrant' | 'log',
  reason: string,
  step: Step,
): UnsealOutcome {
  step(`${gate} gate refused: ${reason}`, true)
  return { ok: false, refusal: { refused: true, gate, reason } }
}

export function signHeadRecord(
  world: DemoWorld,
  previous: SignedTreeHeadV1 | null,
): SignedTreeHeadV1 {
  return signedHeadRecord({
    networkId: world.networkId,
    head: world.log.signHead(),
    timestamp: world.clockMs,
    previous,
  })
}

export function anchorSignedHead(
  world: DemoWorld,
  head: SignedTreeHeadV1,
): Anchor {
  return anchorHead(world.chain, hashSignedTreeHeadV1(head))
}

function anchorRecordFor(
  world: DemoWorld,
  head: SignedTreeHeadV1,
  anchor: Anchor,
): BitcoinAnchorV1 | null {
  const block = world.chain.blocks[anchor.blockHeight]
  if (!block) return null
  return bitcoinAnchorRecord({
    networkId: world.networkId,
    head,
    block,
    confirmationPolicy: world.policy.k,
  })
}

type PublishInput = {
  authorization: UnsealAuthorizationV1
  enrollmentLeafIndex: number
  opts: UnsealOptions
  step: Step
  built: BuiltLeaf
}

function appendPublishedLeaf(
  world: DemoWorld,
  opts: UnsealOptions,
  leafBytes: Uint8Array,
): number {
  if (opts.reuse) return opts.reuse.leafIndex
  if (opts.skipLeafAppend) return -1
  return world.log.append(leafBytes)
}

// Publication comes after authenticity validation: a forged order must not
// leave a public unseal event behind (SIGE spec section 10.2, steps 2 and 5).
function publish(world: DemoWorld, input: PublishInput): PublishedLeaf {
  const { opts, step, built } = input
  const reuse = opts.reuse
  const previousHead = signHeadRecord(world, null)
  const leafBytes = reuse?.leafBytes ?? built.bytes
  const leafIndex = appendPublishedLeaf(world, opts, leafBytes)
  step(
    leafIndex < 0
      ? 'leaf NOT appended to the public log (fault injected)'
      : `unseal leaf appended at index ${leafIndex}, role and difficulty in the clear`,
    true,
  )

  const head =
    opts.presentStaleHead ?? reuse?.head ?? signHeadRecord(world, previousHead)
  const anchor = reuse?.anchor ?? anchorSignedHead(world, head)
  const confirmations = opts.confirmations ?? world.policy.k
  for (let i = 1; i < confirmations; i++) world.chain.mine(null)
  step(
    `head anchored, ${world.chain.confirmations(anchor.blockHeight)} confirmations`,
    true,
  )

  return {
    leafBytes,
    leaf: reuse ? parseLeaf(leafBytes) : built.leaf,
    blinding: reuse ? new Uint8Array(0) : built.blinding,
    leafIndex,
    inclusionProof: leafIndex >= 0 ? world.log.inclusionProof(leafIndex) : [],
    enrollmentInclusionProof: world.log.inclusionProof(
      input.enrollmentLeafIndex,
    ),
    previousHead,
    head,
    consistencyProof: world.log.consistencyProof(
      previousHead.tree_size,
      head.tree_size,
    ),
    anchor,
    anchorRecord: anchorRecordFor(world, head, anchor),
  }
}

type GateRelease = {
  published: PublishedLeaf
  congestion: CongestionScheduleEvidence
  warrantAttestation: HsmAttestation
  logAttestation: HsmAttestation
  contributions: { zA: Uint8Array; zB: Uint8Array }
  required: number
}

type GateStage =
  | { released: true; release: GateRelease }
  | { released: false; outcome: UnsealOutcome }

type GateStageInput = {
  world: DemoWorld
  record: EnrollmentRecord
  authorization: UnsealAuthorizationV1
  order: OrderEvidence
  opts: UnsealOptions
  step: Step
}

function runGates(input: GateStageInput): GateStage {
  const { world, record, authorization, order, opts, step } = input
  // The stamp must exist before the leaf is appended, because the leaf carries
  // its output. Build, stamp over the zeroed pre-image, then publish.
  const required = requiredDifficultyForTrack(world, authorization.track)
  const previousStampOutput = world.logGateState.lastStampOutput
  const built = buildUnsealLeaf(world, authorization)
  const stamp = chainedWork(
    previousStampOutput,
    congestionStampLeafHash(built.leaf),
    required,
  )
  const published = publish(world, {
    authorization,
    enrollmentLeafIndex: record.acceptedLeaf.index,
    opts,
    step,
    built: stampUnsealLeaf(built, stamp.output),
  })
  step(`congestion stamp computed at difficulty ${required}`, true)

  const warrant = warrantGate(
    world,
    { auth: authorization, order, leafBytes: published.leafBytes },
    record,
  )
  if (warrant.refused) {
    return {
      released: false,
      outcome: refusedBefore('warrant', warrant.reason, step),
    }
  }
  step('warrant gate released its contribution with attestation', true)

  const logOutcome = logGate(
    world,
    {
      auth: authorization,
      leafBytes: published.leafBytes,
      leafIndex: Math.max(published.leafIndex, 0),
      inclusion: published.inclusionProof,
      consistency: world.log.consistencyProof(
        world.logGateState.treeSize,
        published.head.tree_size,
      ),
      sth: published.head,
      anchor: published.anchor,
      stamp,
    },
    record,
  )
  if (logOutcome.refused) {
    return {
      released: false,
      outcome: {
        ...refusedBefore('log', logOutcome.reason, step),
        published,
      },
    }
  }
  step('log gate released its contribution and advanced monotonic state', true)

  return {
    released: true,
    release: {
      published,
      congestion: { stamp, previousStampOutput },
      warrantAttestation: { gate: 'warrant', ...warrant.attestation },
      logAttestation: { gate: 'log', ...logOutcome.attestation },
      contributions: { zA: warrant.contribution, zB: logOutcome.contribution },
      required,
    },
  }
}

type EvidenceResult =
  | { built: true; bundle: EvidenceBundleV1 }
  | { built: false; reason: string }

type CloseCeremonyInput = {
  world: DemoWorld
  record: EnrollmentRecord
  authorization: UnsealAuthorizationV1
  order: OrderEvidence
  release: GateRelease
  envelope: DelayedIdentityEnvelopeV1
  identity: RecoveredIdentity
  decryptionOpening: Uint8Array
}

function closeCeremony(input: CloseCeremonyInput): EvidenceResult {
  const { world, record, authorization, release, envelope, identity } = input
  const published = release.published
  if (published.leaf === null) {
    return { built: false, reason: 'the published leaf is not a LogLeafV1' }
  }
  if (published.anchorRecord === null) {
    return { built: false, reason: 'the anchor names no block on this chain' }
  }
  if (published.consistencyProof.length === 0) {
    return {
      built: false,
      reason: 'the log has no earlier head to prove consistency against',
    }
  }
  const solutionProof = buildUnsealSolutionProof({
    params: world.delayParams,
    track: authorization.track,
    proof: envelope.proof,
    hS: envelope.hS,
    recoveredScalar: identity.secret,
  })
  if (solutionProof === null) {
    return {
      built: false,
      reason: 'the timed commitment has too few unopened puzzles to fold',
    }
  }
  const decryptionResultCommitment = commitDecryptionResult(
    identity.payload,
    input.decryptionOpening,
  )
  // The same transcript the bundle carries. Publishing its hash in the closing
  // leaf is what turns a self-recomputable value into a logged commitment.
  const ceremonyTranscript = buildCeremonyTranscript({
    authorization,
    warrantAttestation: release.warrantAttestation,
    logAttestation: release.logAttestation,
    solutionProof,
    decryptionResultCommitment,
  })
  const closingLeaf = buildClosingLeaf({
    logLeaf: published.leaf,
    bitcoinAnchor: published.anchorRecord,
    solutionProof,
    decryptionResultCommitment,
    ceremonyTranscriptHash: ceremonyTranscript.finalHash,
    closedAt: world.clockMs,
  })
  const closingLeafIndex = world.log.append(encodeClosingLeafV1(closingLeaf))
  const closingHead = signHeadRecord(world, published.head)
  return {
    built: true,
    bundle: buildUnsealEvidence({
      authorization,
      orderSignatureEvidence: orderSignatureEvidence(input.order),
      logLeaf: published.leaf,
      leafIndex: published.leafIndex,
      inclusionProof: published.inclusionProof,
      previousHead: published.previousHead,
      head: published.head,
      consistencyProof: published.consistencyProof,
      bitcoinAnchor: published.anchorRecord,
      congestionEvidence: release.congestion,
      warrantAttestation: release.warrantAttestation,
      logAttestation: release.logAttestation,
      solutionProof,
      enrollmentRecord: record.stored,
      enrollmentLeaf: record.acceptedLeaf.leaf,
      enrollmentLeafIndex: record.acceptedLeaf.index,
      enrollmentInclusionProof: published.enrollmentInclusionProof,
      decryptionResultCommitment,
      closing: {
        leaf: closingLeaf,
        leafIndex: closingLeafIndex,
        inclusionProof: world.log.inclusionProof(closingLeafIndex),
        head: closingHead,
        consistencyProof: world.log.consistencyProof(
          published.head.tree_size,
          closingHead.tree_size,
        ),
      },
    }),
  }
}

type CompleteUnsealInput = {
  world: DemoWorld
  record: EnrollmentRecord
  authorization: UnsealAuthorizationV1
  order: OrderEvidence
  opened: OpenedEnvelope
  release: GateRelease
  opts: UnsealOptions
  step: Step
}

async function completeUnseal(
  input: CompleteUnsealInput,
): Promise<UnsealOutcome> {
  const { world, record, opened, release, opts, step } = input
  const identity = await payDelayAndDecrypt(world, {
    record,
    opened,
    onProgress: opts.onProgress,
  })
  if (!identity) {
    step(
      'inner decryption failed or the declared delay did not match the puzzle',
      false,
    )
    return { ok: false }
  }
  const bound = verifyCommitmentOpening(
    record,
    identity.attrs,
    identity.opening,
  )
  step(
    `delay paid (${opened.envelope.t} squarings), identity recovered and commitment ${bound ? 'verified' : 'MISMATCH'}`,
    bound,
  )
  const outcome: UnsealOutcome = {
    ok: bound,
    identity,
    stampDifficulty: release.required,
    published: release.published,
  }
  if (!bound) return outcome

  const decryptionOpening = randomBytes(32)
  const evidence = closeCeremony({
    world,
    record,
    authorization: input.authorization,
    order: input.order,
    release,
    envelope: opened.envelope,
    identity,
    decryptionOpening,
  })
  step(
    evidence.built
      ? 'closing leaf appended, offline evidence bundle emitted'
      : `no evidence bundle: ${evidence.reason}`,
    evidence.built,
  )
  return evidence.built
    ? { ...outcome, bundle: evidence.bundle, decryptionOpening }
    : { ...outcome, bundleGap: evidence.reason }
}

function issueUnsealOrder(
  world: DemoWorld,
  record: EnrollmentRecord,
  opts: UnsealOptions,
): OrderEvidence {
  const defaultRole = world.profile.acceptedRoles[0]
  if (!defaultRole) throw new Error('profile declares no accepted roles')
  const role = opts.role ?? defaultRole
  const orderText = `order-${toHex(record.enrollmentId)}`
  return opts.forgedOrder
    ? forgeOrder(role, orderText)
    : issueOrder(world, role, orderText)
}

export async function performUnseal(
  world: DemoWorld,
  record: EnrollmentRecord,
  opts: UnsealOptions = {},
): Promise<UnsealOutcome> {
  const step: Step = opts.onStep ?? (() => {})
  const track = opts.track ?? 'standard'
  const order = issueUnsealOrder(world, record, opts)
  step(
    `order issued by ${order.role}${opts.forgedOrder ? ' (forged signature)' : ''}`,
    true,
  )

  const authenticity = verifyOrderAuthenticity(world, order)
  if (authenticity) {
    step('order authenticity check failed, nothing published', true)
    return refusedBefore('warrant', authenticity, step)
  }
  step('order authenticity validated against the pinned trust list', true)

  const { authorization } = createAuthorization(world, { record, order, track })
  step('two-person mapping approved the authorization', true)

  const gates = runGates({ world, record, authorization, order, opts, step })
  if (!gates.released) return gates.outcome
  const release = gates.release

  if (track === 'emergency') {
    recordEmergencyUnseal(world, authorization, release.published)
    step(
      `emergency unseal counted apart, ratification due within ${world.policy.emergencyRatificationBlocks} blocks`,
      true,
    )
  }

  const opened = openOuter(world, record, release.contributions, track)
  if (!opened) {
    step('outer envelope failed to open', false)
    return { ok: false }
  }
  step('outer envelope open: timed puzzle exposed, identity still sealed', true)
  if (opts.skipDelay) {
    return {
      ok: true,
      stampDifficulty: release.required,
      published: release.published,
      bundleGap: 'the ceremony stopped before the timed commitment was solved',
    }
  }

  return await completeUnseal({
    world,
    record,
    authorization,
    order,
    opened,
    release,
    opts,
    step,
  })
}

// Every field is published. A verifier built from this cannot hold a secret,
// which is what makes the keyless claim structural (SIGE spec 5.8).
// The promise: one heartbeat every `heartbeatIntervalBlocks`. Its absence is
// the only signal that separates a frozen log from an idle one, and freezing
// is the cheapest way to hide a leaf the gate forced you to write.
export function publishHeartbeat(world: DemoWorld): number {
  const tip = world.chain.blocks[world.chain.tipHeight()]
  if (tip === undefined) throw new RangeError('chain has no tip')
  return world.log.append(
    encodeLogLeafV1(
      heartbeatLeaf({
        networkId: world.networkId,
        tipHeight: tip.height,
        tipHash: tip.hash,
        createdAt: world.clockMs,
      }),
    ),
  )
}

export function evidencePublicKeys(world: DemoWorld): EvidencePublicKeys {
  return {
    roleKeys: new Map(
      Object.entries(world.roles).map(([role, keys]) => [role, keys.pub]),
    ),
    logPublicKey: world.log.publicKey,
    warrantHsmPublicKey: world.warrantHsmKey.pub,
    logHsmPublicKey: world.logHsmKey.pub,
    delayParams: world.delayParams,
    expectedVtdProfile: world.policy.vtdProfile,
    minConfirmations: world.policy.k,
    minReviewerApprovals: REVIEWER_QUORUM,
    reviewerKeys: world.reviewers.map((reviewer) => reviewer.pub),
    congestionPolicy: world.policy.congestion,
  }
}
