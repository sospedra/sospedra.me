import assert from 'node:assert/strict'
import { createHash, hkdfSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { bls12_381 } from '@noble/curves/bls12-381.js'
import {
  bigIntToBytes,
  bytesToBigInt,
  concatBytes,
  toHex,
  u32be,
  u64be,
  utf8,
} from '../src/core/bytes.ts'
import { decodeCbor, encodeCbor } from '../src/core/cbor.ts'
import {
  chainedWork,
  requiredDifficulty,
  verifyWork,
} from '../src/core/congestion.ts'
import {
  combineContributions,
  deriveContribution,
  encapsulate,
  gateIdentity,
  verifyEncapsulation,
} from '../src/core/kem.ts'
import {
  addPuzzles,
  createPuzzle,
  type LhtlpParams,
  type LhtlpPuzzle,
  scalePuzzle,
  solvePuzzle,
} from '../src/core/lhtlp.ts'
import { TransparencyLog, verifyInclusion } from '../src/core/merkle.ts'
import { objectHash } from '../src/core/object-hash.ts'
import { scalarCommitment } from '../src/core/shamir.ts'
import {
  buildVtdProof,
  cborValueFromJson,
  hexToBytes,
  type JsonCborValue,
  lhtlpParamsFromPrimes,
  seededBytes,
  seededScalar,
  seededSquareUnit,
  type VectorFile,
  vtdCoefficient,
} from '../src/core/vectors.ts'
import {
  coefficientsDeriveFromSecret,
  solveVtd,
  soundnessBits,
  type VtdProfile,
  verifyVtd,
  worstCaseSolves,
} from '../src/core/vtd.ts'

const Fr = bls12_381.fields.Fr
const G2 = bls12_381.G2.Point

function readVectorFile<TFile>(name: string): TFile {
  const text = readFileSync(
    new URL(`../vectors/${name}.json`, import.meta.url),
    'utf8',
  )
  return JSON.parse(text) as TFile
}

type CborVector = {
  readonly id: string
  readonly description: string
  readonly value: JsonCborValue
  readonly expectedHex: string
}

const cborFile = readVectorFile<VectorFile<CborVector>>('cbor')

for (const vector of cborFile.vectors) {
  test(`cbor vector: ${vector.id} encodes to the published hex`, () => {
    const encoded = encodeCbor(cborValueFromJson(vector.value))
    assert.equal(toHex(encoded), vector.expectedHex)
  })

  test(`cbor vector: ${vector.id} decodes from the published hex`, () => {
    const result = decodeCbor(hexToBytes(vector.expectedHex))
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.value, cborValueFromJson(vector.value))
  })
}

type ObjectHashVector = {
  readonly id: string
  readonly description: string
  readonly typeUrl: string
  readonly value: JsonCborValue
  readonly expectedHex: string
}

const objectHashFile =
  readVectorFile<VectorFile<ObjectHashVector>>('object-hash')

for (const vector of objectHashFile.vectors) {
  test(`object hash vector: ${vector.id}`, () => {
    const digest = objectHash(vector.typeUrl, cborValueFromJson(vector.value))
    assert.equal(toHex(digest), vector.expectedHex)
  })

  test(`object hash vector: ${vector.id} matches an independent node:crypto framing`, () => {
    const typeUrlBytes = utf8(vector.typeUrl)
    const cbor = encodeCbor(cborValueFromJson(vector.value))
    const framed = concatBytes(
      utf8('SIGE/object-hash/v1'),
      u32be(typeUrlBytes.length),
      typeUrlBytes,
      u64be(cbor.length),
      cbor,
    )
    const nodeDigest = createHash('sha256').update(framed).digest('hex')
    assert.equal(nodeDigest, vector.expectedHex)
  })
}

type GateIdentityVector = {
  readonly id: string
  readonly description: string
  readonly gate: 'warrant' | 'log'
  readonly networkIdHex: string
  readonly accountIdHex: string
  readonly enrollmentIdHex: string
  readonly epoch: number
  readonly expectedHex: string
}

const gateIdentityFile =
  readVectorFile<VectorFile<GateIdentityVector>>('gate-identity')

function manualGateIdentity(vector: GateIdentityVector): Uint8Array {
  const label = vector.gate === 'warrant' ? 'SIGE/v1/warrant' : 'SIGE/v1/log'
  const networkId = hexToBytes(vector.networkIdHex)
  const accountId = hexToBytes(vector.accountIdHex)
  const enrollmentId = hexToBytes(vector.enrollmentIdHex)
  return concatBytes(
    utf8(label),
    u32be(networkId.length),
    networkId,
    u32be(accountId.length),
    accountId,
    u32be(enrollmentId.length),
    enrollmentId,
    u32be(vector.epoch),
  )
}

for (const vector of gateIdentityFile.vectors) {
  test(`gate identity vector: ${vector.id}`, () => {
    const actual = gateIdentity(
      vector.gate,
      hexToBytes(vector.networkIdHex),
      hexToBytes(vector.accountIdHex),
      hexToBytes(vector.enrollmentIdHex),
      vector.epoch,
    )
    assert.equal(toHex(actual), vector.expectedHex)
  })

  test(`gate identity vector: ${vector.id} matches an independent byte-for-byte rebuild`, () => {
    assert.equal(toHex(manualGateIdentity(vector)), vector.expectedHex)
  })
}

type LhtlpParamsJson = {
  readonly pDecimal: string
  readonly qDecimal: string
  readonly nDecimal: string
  readonly t: number
  readonly gSeed: string
  readonly gDecimal: string
  readonly hDecimal: string
}

type LhtlpCreateVector = {
  readonly id: string
  readonly description: string
  readonly operation: 'create'
  readonly secretDecimal: string
  readonly rSeed: string
  readonly rDecimal: string
  readonly uDecimal: string
  readonly vDecimal: string
  readonly solvedDecimal: string
}

type LhtlpAddVector = {
  readonly id: string
  readonly description: string
  readonly operation: 'add'
  readonly left: string
  readonly right: string
  readonly uDecimal: string
  readonly vDecimal: string
  readonly solvedDecimal: string
}

type LhtlpScaleVector = {
  readonly id: string
  readonly description: string
  readonly operation: 'scale'
  readonly source: string
  readonly scalarDecimal: string
  readonly uDecimal: string
  readonly vDecimal: string
  readonly solvedDecimal: string
}

type LhtlpVector = LhtlpCreateVector | LhtlpAddVector | LhtlpScaleVector

type LhtlpFile = VectorFile<LhtlpVector> & { readonly params: LhtlpParamsJson }

const lhtlpFile = readVectorFile<LhtlpFile>('lhtlp')
const lhtlpP = BigInt(lhtlpFile.params.pDecimal)
const lhtlpQ = BigInt(lhtlpFile.params.qDecimal)
const lhtlpN = lhtlpP * lhtlpQ
const lhtlpG = seededSquareUnit(lhtlpFile.params.gSeed, lhtlpN)
const lhtlpParams = lhtlpParamsFromPrimes(
  lhtlpP,
  lhtlpQ,
  lhtlpFile.params.t,
  lhtlpG,
)

test('lhtlp params reproduce from the published primes and seed', () => {
  assert.equal(lhtlpN.toString(), lhtlpFile.params.nDecimal)
  assert.equal(lhtlpG.toString(), lhtlpFile.params.gDecimal)
  assert.equal(lhtlpParams.h.toString(), lhtlpFile.params.hDecimal)
})

// A second, recursive-halving modPow: structurally different from puzzle.ts's
// iterative loop, so agreement is a real cross-check, not a restatement.
function independentModPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (exp === 0n) return 1n % mod
  const half = independentModPow(base, exp / 2n, mod)
  const halfSquared = (half * half) % mod
  return exp % 2n === 0n ? halfSquared : (halfSquared * (base % mod)) % mod
}

test('h reproduces under an independent modPow implementation', () => {
  const expected = independentModPow(
    lhtlpG,
    2n ** BigInt(lhtlpFile.params.t),
    lhtlpN,
  )
  assert.equal(expected, lhtlpParams.h)
})

function computeLhtlpPuzzle(
  vector: LhtlpVector,
  params: LhtlpParams,
  puzzlesById: ReadonlyMap<string, LhtlpPuzzle>,
): LhtlpPuzzle {
  switch (vector.operation) {
    case 'create':
      return createPuzzle(
        params,
        BigInt(vector.secretDecimal),
        seededScalar(vector.rSeed, params.n),
      )
    case 'add': {
      const left = puzzlesById.get(vector.left)
      const right = puzzlesById.get(vector.right)
      if (!left || !right)
        throw new Error(`lhtlp vector ${vector.id}: missing operand`)
      return addPuzzles(params, left, right)
    }
    case 'scale': {
      const source = puzzlesById.get(vector.source)
      if (!source) throw new Error(`lhtlp vector ${vector.id}: missing operand`)
      return scalePuzzle(params, source, BigInt(vector.scalarDecimal))
    }
  }
}

const lhtlpPuzzlesById = new Map<string, LhtlpPuzzle>()
for (const vector of lhtlpFile.vectors) {
  lhtlpPuzzlesById.set(
    vector.id,
    computeLhtlpPuzzle(vector, lhtlpParams, lhtlpPuzzlesById),
  )
}

for (const vector of lhtlpFile.vectors) {
  test(`lhtlp vector: ${vector.id} matches u and v`, () => {
    const puzzle = lhtlpPuzzlesById.get(vector.id)
    if (!puzzle) throw new Error('unreachable')
    assert.equal(puzzle.u.toString(), vector.uDecimal)
    assert.equal(puzzle.v.toString(), vector.vDecimal)
  })

  test(`lhtlp vector: ${vector.id} solves to the published value`, async () => {
    const puzzle = lhtlpPuzzlesById.get(vector.id)
    if (!puzzle) throw new Error('unreachable')
    const solved = await solvePuzzle(lhtlpParams, puzzle)
    assert.equal(solved.toString(), vector.solvedDecimal)
  })
}

type KemVector = {
  readonly id: string
  readonly description: string
  readonly networkIdHex: string
  readonly accountIdHex: string
  readonly enrollmentIdHex: string
  readonly epoch: number
  readonly idWarrantHex: string
  readonly idLogHex: string
  readonly xASeed: string
  readonly xADecimal: string
  readonly xBSeed: string
  readonly xBDecimal: string
  readonly pkAHex: string
  readonly pkBHex: string
  readonly transcriptHashSeed: string
  readonly transcriptHashHex: string
  readonly contextSeed: string
  readonly contextHex: string
  readonly plaintextUtf8: string
  readonly UHex: string
  readonly KHex: string
  readonly zAHex: string
  readonly zBHex: string
}

const kemFile = readVectorFile<VectorFile<KemVector>>('kem')
const kemVector = kemFile.vectors[0]
if (!kemVector) throw new Error('kem.json: expected at least one vector')

const kemXA = seededScalar(kemVector.xASeed, Fr.ORDER)
const kemXB = seededScalar(kemVector.xBSeed, Fr.ORDER)
const kemPkA = G2.BASE.multiply(kemXA)
const kemPkB = G2.BASE.multiply(kemXB)
const kemNetworkId = hexToBytes(kemVector.networkIdHex)
const kemAccountId = hexToBytes(kemVector.accountIdHex)
const kemEnrollmentId = hexToBytes(kemVector.enrollmentIdHex)
const kemIdWarrant = gateIdentity(
  'warrant',
  kemNetworkId,
  kemAccountId,
  kemEnrollmentId,
  kemVector.epoch,
)
const kemIdLog = gateIdentity(
  'log',
  kemNetworkId,
  kemAccountId,
  kemEnrollmentId,
  kemVector.epoch,
)
const kemTranscriptHash = seededBytes(kemVector.transcriptHashSeed, 32)
const kemContext = seededBytes(kemVector.contextSeed, 32)
const kemPlaintext = utf8(kemVector.plaintextUtf8)
const kemEnc = encapsulate({
  ids: { warrant: kemIdWarrant, log: kemIdLog },
  keys: { pkA: kemPkA, pkB: kemPkB },
  transcriptHash: kemTranscriptHash,
  context: kemContext,
  plaintext: kemPlaintext,
})
const kemZA = deriveContribution('warrant', kemIdWarrant, kemXA, kemEnc.U)
const kemZB = deriveContribution('log', kemIdLog, kemXB, kemEnc.U)

test('kem vector: xA and xB reproduce from their seeds', () => {
  assert.equal(kemXA.toString(), kemVector.xADecimal)
  assert.equal(kemXB.toString(), kemVector.xBDecimal)
})

test('kem vector: pkA and pkB reproduce', () => {
  assert.equal(toHex(kemPkA.toBytes(true)), kemVector.pkAHex)
  assert.equal(toHex(kemPkB.toBytes(true)), kemVector.pkBHex)
})

test('kem vector: gate identities reproduce', () => {
  assert.equal(toHex(kemIdWarrant), kemVector.idWarrantHex)
  assert.equal(toHex(kemIdLog), kemVector.idLogHex)
})

test('kem vector: U and K reproduce from encapsulate', () => {
  assert.equal(toHex(kemEnc.U), kemVector.UHex)
  assert.equal(toHex(kemEnc.K), kemVector.KHex)
})

test('kem vector: both gate contributions reproduce and recombine to K', () => {
  assert.equal(toHex(kemZA), kemVector.zAHex)
  assert.equal(toHex(kemZB), kemVector.zBHex)
  const combined = combineContributions(
    kemZA,
    kemZB,
    kemTranscriptHash,
    kemContext,
  )
  assert.equal(toHex(combined), kemVector.KHex)
})

test('kem vector: verifyEncapsulation accepts the honest U', () => {
  const ok = verifyEncapsulation({
    transcriptHash: kemTranscriptHash,
    context: kemContext,
    plaintext: kemPlaintext,
    U: kemEnc.U,
  })
  assert.equal(ok, true)
})

function nodeDhash(domain: string, ...parts: Uint8Array[]): Uint8Array {
  const h = createHash('sha256')
  h.update(utf8('SIGE-DEMO/v1'))
  h.update(u32be(domain.length))
  h.update(utf8(domain))
  for (const p of parts) {
    h.update(u32be(p.length))
    h.update(p)
  }
  return h.digest()
}

function independentFoRandomness(): bigint {
  let digest = nodeDhash(
    'fo-randomness',
    kemPlaintext,
    kemTranscriptHash,
    kemContext,
  )
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = Fr.create(bytesToBigInt(digest))
    if (r !== 0n) return r
    digest = nodeDhash('fo-randomness', digest, kemTranscriptHash, kemContext)
  }
  throw new Error('independent FO-randomness rederivation did not converge')
}

test('kem vector: U reproduces under an independent FO-randomness rederivation', () => {
  const r = independentFoRandomness()
  assert.equal(toHex(G2.BASE.multiply(r).toBytes(true)), kemVector.UHex)
})

test('kem vector: K reproduces under an independent node:crypto hkdf', () => {
  const ikm = concatBytes(kemZA, kemZB)
  const nodeK = hkdfSync('sha256', ikm, kemTranscriptHash, kemContext, 32)
  assert.equal(toHex(new Uint8Array(nodeK)), kemVector.KHex)
})

type VtdPuzzleJson = { readonly uDecimal: string; readonly vDecimal: string }
type VtdOpenedJson = {
  readonly index: number
  readonly shareDecimal: string
  readonly blindingDecimal: string
}

type VtdVector = {
  readonly id: string
  readonly description: string
  readonly lhtlpParams: LhtlpParamsJson
  readonly profile: VtdProfile
  readonly secretSeed: string
  readonly secretDecimal: string
  readonly hSHex: string
  readonly nonceSeed: string
  readonly nonceHex: string
  readonly blindingSeeds: readonly string[]
  readonly blindingDecimals: readonly string[]
  readonly commitmentsHex: readonly string[]
  readonly puzzles: readonly VtdPuzzleJson[]
  readonly opened: readonly VtdOpenedJson[]
  readonly soundnessBits: number
  readonly worstCaseSolves: number
}

const vtdFile = readVectorFile<VectorFile<VtdVector>>('vtd')
const vtdVector = vtdFile.vectors[0]
if (!vtdVector) throw new Error('vtd.json: expected at least one vector')

function lhtlpParamsFromJson(json: LhtlpParamsJson): LhtlpParams {
  const p = BigInt(json.pDecimal)
  const q = BigInt(json.qDecimal)
  const g = seededSquareUnit(json.gSeed, p * q)
  return lhtlpParamsFromPrimes(p, q, json.t, g)
}

const vtdParams = lhtlpParamsFromJson(vtdVector.lhtlpParams)
const vtdSecret = seededScalar(vtdVector.secretSeed, Fr.ORDER)
const vtdNonce = seededBytes(vtdVector.nonceSeed, 32)
const vtdBlindings = vtdVector.blindingSeeds.map((seed) =>
  seededScalar(seed, vtdParams.n),
)
const vtdProof = buildVtdProof({
  params: vtdParams,
  secret: vtdSecret,
  nonce: vtdNonce,
  profile: vtdVector.profile,
  blindings: vtdBlindings,
})
const vtdHS = scalarCommitment(vtdSecret)

test('vtd vector: lhtlp params reproduce', () => {
  assert.equal(vtdParams.n.toString(), vtdVector.lhtlpParams.nDecimal)
  assert.equal(vtdParams.g.toString(), vtdVector.lhtlpParams.gDecimal)
  assert.equal(vtdParams.h.toString(), vtdVector.lhtlpParams.hDecimal)
})

test('vtd vector: secret, nonce, blindings and hS reproduce from their seeds', () => {
  assert.equal(vtdSecret.toString(), vtdVector.secretDecimal)
  assert.equal(toHex(vtdNonce), vtdVector.nonceHex)
  assert.deepEqual(
    vtdBlindings.map((b) => b.toString()),
    vtdVector.blindingDecimals,
  )
  assert.equal(toHex(vtdHS), vtdVector.hSHex)
})

test('vtd vector: the built proof reproduces every published field', () => {
  assert.deepEqual(vtdProof.commitments.a.map(toHex), vtdVector.commitmentsHex)
  const puzzles = vtdProof.puzzles.map((p) => ({
    uDecimal: p.u.toString(),
    vDecimal: p.v.toString(),
  }))
  assert.deepEqual(puzzles, vtdVector.puzzles)
  const opened = vtdProof.opened.map((o) => ({
    index: o.index,
    shareDecimal: o.share.toString(),
    blindingDecimal: o.blinding.toString(),
  }))
  assert.deepEqual(opened, vtdVector.opened)
})

test('vtd vector: verifyVtd accepts the honest proof', () => {
  const expectations = { hS: vtdHS, profile: vtdVector.profile }
  assert.equal(verifyVtd(vtdParams, vtdProof, expectations), null)
})

test('vtd vector: solveVtd recovers the published secret', async () => {
  assert.equal(await solveVtd(vtdParams, vtdProof), vtdSecret)
})

test('vtd vector: coefficientsDeriveFromSecret accepts the honest proof', () => {
  assert.equal(coefficientsDeriveFromSecret(vtdSecret, vtdProof), null)
})

test('vtd vector: soundnessBits and worstCaseSolves match the published numbers', () => {
  assert.ok(
    Math.abs(soundnessBits(vtdVector.profile) - vtdVector.soundnessBits) < 1e-9,
  )
  assert.equal(worstCaseSolves(vtdVector.profile), vtdVector.worstCaseSolves)
})

test('vtd vector: soundnessBits matches the hand-derived closed form for this profile', () => {
  const { n, k, o } = vtdVector.profile
  assert.deepEqual({ n, k, o }, { n: 6, k: 3, o: 2 })
  // C(n,o)/C(n-b,o) with b=n-o-k+1=2 is C(6,2)/C(4,2) = 15/6 = 2.5 exactly.
  assert.ok(Math.abs(soundnessBits(vtdVector.profile) - Math.log2(2.5)) < 1e-9)
})

function independentCoefficient(
  secret: bigint,
  nonce: Uint8Array,
  j: number,
): bigint {
  for (let attempt = 0; attempt < 100; attempt++) {
    const info = concatBytes(
      utf8('sige-vtd/coefficient'),
      nonce,
      u32be(j),
      u32be(attempt),
    )
    const digest = hkdfSync(
      'sha256',
      bigIntToBytes(secret),
      new Uint8Array(0),
      info,
      48,
    )
    const candidate = Fr.create(bytesToBigInt(new Uint8Array(digest)))
    if (candidate !== 0n) return candidate
  }
  throw new Error(`independentCoefficient: coefficient ${j} did not converge`)
}

test('vtd vector: coefficients reproduce under an independent node:crypto hkdf', () => {
  for (const j of [1, 2]) {
    assert.equal(
      independentCoefficient(vtdSecret, vtdNonce, j),
      vtdCoefficient(vtdSecret, vtdNonce, j),
    )
  }
})

type InclusionProofVector = {
  readonly index: number
  readonly treeSize: number
  readonly proofHex: readonly string[]
}

type MerkleVector = {
  readonly id: string
  readonly description: string
  readonly leavesHex: readonly string[]
  readonly rootHex: string
  readonly inclusionProofs: readonly InclusionProofVector[]
}

const merkleFile = readVectorFile<VectorFile<MerkleVector>>('merkle')
const merkleVector = merkleFile.vectors[0]
if (!merkleVector) throw new Error('merkle.json: expected at least one vector')

const merkleLog = new TransparencyLog()
const merkleLeaves = merkleVector.leavesHex.map(hexToBytes)
for (const leaf of merkleLeaves) merkleLog.append(leaf)
const merkleRoot = merkleLog.root()

test('merkle vector: root reproduces from the published leaves', () => {
  assert.equal(toHex(merkleRoot), merkleVector.rootHex)
})

for (const proofVector of merkleVector.inclusionProofs) {
  test(`merkle vector: inclusion proof at index ${proofVector.index} reproduces and verifies`, () => {
    const proof = merkleLog.inclusionProof(proofVector.index)
    assert.deepEqual(proof.map(toHex), proofVector.proofHex)
    const leaf = merkleLeaves[proofVector.index]
    if (!leaf) throw new Error('unreachable')
    const ok = verifyInclusion(
      leaf,
      proofVector.index,
      proofVector.treeSize,
      proof,
      merkleRoot,
    )
    assert.ok(ok)
  })
}

test('merkle vector: inclusion proof rejects a wrong leaf', () => {
  const proof = merkleLog.inclusionProof(0)
  assert.ok(!verifyInclusion(utf8('nope'), 0, 7, proof, merkleRoot))
})

function nodeLeafHash(leaf: Uint8Array): Uint8Array {
  return createHash('sha256').update(Uint8Array.of(0)).update(leaf).digest()
}

function nodeNodeHash(l: Uint8Array, r: Uint8Array): Uint8Array {
  return createHash('sha256')
    .update(Uint8Array.of(1))
    .update(l)
    .update(r)
    .digest()
}

function largestPowerOfTwoBelow(n: number): number {
  let k = 1
  while (k * 2 < n) k *= 2
  return k
}

// RFC 9162's MTH: split at the largest power of two below n, recurse both
// sides. Verified against merkle.ts's iterative algorithm for every n in 1..32.
function independentRoot(hashes: readonly Uint8Array[]): Uint8Array {
  const only = hashes[0]
  if (hashes.length === 1) {
    if (!only) throw new Error('unreachable')
    return only
  }
  const mid = largestPowerOfTwoBelow(hashes.length)
  const left = independentRoot(hashes.slice(0, mid))
  const right = independentRoot(hashes.slice(mid))
  return nodeNodeHash(left, right)
}

test('merkle vector: root reproduces under an independent recursive tree over node:crypto sha256', () => {
  const root = independentRoot(merkleLeaves.map(nodeLeafHash))
  assert.equal(toHex(root), merkleVector.rootHex)
})

type CongestionPolicyJson = {
  readonly dFloor: number
  readonly baseline: number
  readonly cap: number
  readonly windowBlocks: number
}

type CongestionScheduleVector = {
  readonly id: string
  readonly description: string
  readonly kind: 'schedule'
  readonly policy: CongestionPolicyJson
  readonly windowedUnseals: readonly number[]
  readonly expectedDifficulties: readonly number[]
}

type CongestionChainedWorkVector = {
  readonly id: string
  readonly description: string
  readonly kind: 'chained-work'
  readonly prevOutputSeed: string
  readonly prevOutputHex: string
  readonly leafHashSeed: string
  readonly leafHashHex: string
  readonly difficulty: number
  readonly expectedOutputHex: string
}

type CongestionVector = CongestionScheduleVector | CongestionChainedWorkVector

const congestionFile =
  readVectorFile<VectorFile<CongestionVector>>('congestion')

function isScheduleVector(
  vector: CongestionVector,
): vector is CongestionScheduleVector {
  return vector.kind === 'schedule'
}

function isChainedWorkVector(
  vector: CongestionVector,
): vector is CongestionChainedWorkVector {
  return vector.kind === 'chained-work'
}

for (const vector of congestionFile.vectors.filter(isScheduleVector)) {
  test(`congestion vector: ${vector.id}`, () => {
    const schedule = vector.windowedUnseals.map((n) =>
      requiredDifficulty(vector.policy, n),
    )
    assert.deepEqual(schedule, vector.expectedDifficulties)
  })
}

for (const vector of congestionFile.vectors.filter(isChainedWorkVector)) {
  test(`congestion vector: ${vector.id} chains and verifies`, () => {
    const prevOutput = seededBytes(vector.prevOutputSeed, 32)
    const leafHash = seededBytes(vector.leafHashSeed, 32)
    assert.equal(toHex(prevOutput), vector.prevOutputHex)
    assert.equal(toHex(leafHash), vector.leafHashHex)
    const stamp = chainedWork(prevOutput, leafHash, vector.difficulty)
    assert.equal(toHex(stamp.output), vector.expectedOutputHex)
    assert.ok(verifyWork(stamp, prevOutput, leafHash, vector.difficulty))
    assert.ok(!verifyWork(stamp, prevOutput, leafHash, vector.difficulty + 1))
  })

  test(`congestion vector: ${vector.id} output reproduces under an independent node:crypto sha256 chain`, () => {
    const prevOutput = hexToBytes(vector.prevOutputHex)
    const leafHash = hexToBytes(vector.leafHashHex)
    let h = createHash('sha256')
      .update(utf8('SIGE-DEMO-UWC'))
      .update(prevOutput)
      .update(leafHash)
      .digest()
    for (let i = 0; i < vector.difficulty; i++)
      h = createHash('sha256').update(h).digest()
    assert.equal(toHex(h), vector.expectedOutputHex)
  })
}
