import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { randomBytes, toHex, utf8 } from '../src/core/bytes.ts'
import { type CborValue, encodeCbor } from '../src/core/cbor.ts'
import type { CongestionPolicy } from '../src/core/congestion.ts'
import { chainedWork, STAMP_GENESIS } from '../src/core/congestion.ts'
import { setupParams } from '../src/core/lhtlp.ts'
import {
  type SignedTreeHead,
  TransparencyLog,
  verifyHead,
} from '../src/core/merkle.ts'
import type { EvidencePublicKeys } from '../src/world/evidence.ts'
import { encodeClosingLeafV1 } from '../src/world/evidence.ts'
import {
  createKeylessVerifier,
  detectEquivocation,
  type PublicLeafView,
  type PublicLogView,
  provenLeaves,
  reconcileAgainstDocket,
  transparencyReport,
  verifyAnchor,
  verifyHeadConsistency,
  verifyLeafInclusion,
  verifyShareArtifact,
} from '../src/world/keyless-verifier.ts'
import { tuned } from '../src/world/params.ts'
import { GENERIC } from '../src/world/profile.ts'
import {
  congestionStampLeafHash,
  coreSignedTreeHead,
  encodeLogLeafV1,
  hashSignedTreeHeadV1,
  logLeafV1,
  parseLeaf,
  zeroStampOutput,
} from '../src/world/records.ts'
import {
  anchorSignedHead,
  createWorld,
  enroll,
  performUnseal,
  signHeadRecord,
} from '../src/world/world.ts'

const CONGESTION_POLICY: CongestionPolicy = {
  dFloor: 1,
  baseline: 1,
  cap: 4,
  windowBlocks: 1000,
}

// Pairs an anchored head record with a consistency proof to the pinned tree.
function anchoredAt(
  world: ReturnType<typeof createWorld>,
  head: ReturnType<typeof signHeadRecord>,
  pinnedSize: number,
) {
  return {
    head,
    consistencyProof:
      head.tree_size === pinnedSize
        ? []
        : world.log.consistencyProof(head.tree_size, pinnedSize),
  }
}

function publicKeysOf(world: ReturnType<typeof createWorld>) {
  const { params } = setupParams(320, 1)
  const keys: EvidencePublicKeys = {
    roleKeys: new Map(
      Object.entries(world.roles).map(([role, pair]) => [role, pair.pub]),
    ),
    logPublicKey: world.log.publicKey,
    reviewerKeys: world.reviewers.map((reviewer) => reviewer.pub),
    warrantHsmPublicKey: world.warrantHsmKey.pub,
    logHsmPublicKey: world.logHsmKey.pub,
    delayParams: params,
    expectedVtdProfile: world.policy.vtdProfile,
    minConfirmations: 1,
    minReviewerApprovals: 2,
    congestionPolicy: CONGESTION_POLICY,
  }
  return keys
}

function verifierFor(world: ReturnType<typeof createWorld>) {
  return createKeylessVerifier({
    evidenceKeys: publicKeysOf(world),
    congestionPolicy: CONGESTION_POLICY,
    minConfirmations: 1,
  })
}

test('the keyless verifier is constructed from public data only: no secret is reachable from its surface', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)

  const secrets = [
    toHex(world.warrantHsmKey.priv),
    toHex(world.logHsmKey.priv),
    toHex(world.reviewers[0].priv),
    ...[...world.epochs.values()].flatMap((epoch) => [
      epoch.xA.toString(16),
      epoch.xB.toString(16),
    ]),
  ]

  const serialized = JSON.stringify(verifier, (_key, value) => {
    if (value instanceof Uint8Array) return toHex(value)
    if (typeof value === 'bigint') return value.toString(16)
    return value
  })
  for (const secret of secrets) {
    assert.equal(
      serialized.includes(secret),
      false,
      'a secret is reachable from the keyless verifier',
    )
  }

  // The claim is structural, not incidental: no statement in the module names
  // a secret. Comments are stripped so prose about secrets does not count.
  const code = readFileSync(
    new URL('../src/world/keyless-verifier.ts', import.meta.url),
    'utf8',
  )
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
  for (const forbidden of ['priv', 'secret', 'Secret', '.xA', '.xB']) {
    assert.equal(
      code.includes(forbidden),
      false,
      `keyless-verifier.ts code references ${forbidden}`,
    )
  }
})

test('the keyless verifier checks inclusion and consistency, and refuses a forged head', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)

  world.log.append(new Uint8Array([1]))
  const oldHead = world.log.signHead()
  const index = world.log.append(new Uint8Array([2]))
  const newHead = world.log.signHead()

  const leaf: PublicLeafView = {
    index,
    bytes: new Uint8Array([2]),
    inclusionProof: world.log.inclusionProof(index),
  }

  assert.equal(
    verifyLeafInclusion(
      verifier,
      leaf,
      newHead,
      world.log.inclusionProof(index),
    ),
    null,
  )
  assert.equal(
    verifyHeadConsistency(
      verifier,
      oldHead,
      newHead,
      world.log.consistencyProof(oldHead.treeSize, newHead.treeSize),
    ),
    null,
  )

  const forged = { ...newHead, rootHash: randomBytes(32) }
  assert.notEqual(
    verifyLeafInclusion(
      verifier,
      leaf,
      forged,
      world.log.inclusionProof(index),
    ),
    null,
  )
  assert.notEqual(
    verifyHeadConsistency(verifier, oldHead, newHead, []),
    null,
    'a dropped consistency proof was accepted',
  )
})

test('the keyless verifier prints the ASSUMED tier when it accepts an anchor', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  world.log.append(new Uint8Array([1]))
  const anchor = anchorSignedHead(world, signHeadRecord(world, null))

  const verdict = verifyAnchor(verifier, world.chain, anchor)
  assert.equal(verdict.accepted, true)
  if (!verdict.accepted) return
  assert.equal(verdict.tier, 'ASSUMED')
  assert.match(verdict.note, /not proof of publication/i)
})

test('the keyless verifier detects log equivocation at one tree size', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)

  world.log.append(new Uint8Array([1]))
  const honest = world.log.signHead()
  assert.equal(detectEquivocation(verifier, [honest, honest]), null)

  const forkLog = createWorld(GENERIC, { t: tuned(64) })
  forkLog.log.append(new Uint8Array([9]))
  const otherKeyHead = forkLog.log.signHead()
  assert.equal(
    detectEquivocation(verifier, [honest, otherKeyHead]),
    null,
    'a head signed by a different log is not this log equivocating',
  )
})

test('a share issued by the interface with no anchored leaf is flagged', () => {
  assert.match(
    verifyShareArtifact(
      { authorizationHash: 'ff', issuedByInterface: true },
      [],
    ) ?? '',
    /no anchored leaf/i,
  )
  assert.equal(
    verifyShareArtifact(
      { authorizationHash: 'ff', issuedByInterface: false },
      [],
    ),
    null,
  )
})

test('the transparency report recomputes every counter from the authenticated leaf bytes', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const first = enroll(world, 'DOC-C2-A', {
    fullLegalName: 'A',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-1',
  })
  assert.ok(!('error' in first))
  if ('error' in first) return

  const outcome = await performUnseal(world, first.record, { skipDelay: true })
  assert.equal(outcome.ok, true)
  const published = outcome.published
  assert.ok(published)

  const log: PublicLogView = {
    heads: [world.log.signHead()],
    leaves: [
      {
        index: published.leafIndex,
        bytes: published.leafBytes,
        inclusionProof: world.log.inclusionProof(published.leafIndex),
      },
    ],
    anchors: [published.anchor],
  }

  const report = transparencyReport(verifier, {
    log,
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: world.log.signHead(),
  })

  assert.deepEqual(report.unsealsByRole, { court: 1 })
  assert.deepEqual(report.unsealsByTrack, { standard: 1, emergency: 0 })
  assert.equal(report.notIncluded + report.unparsable, 0)
  assert.equal(report.treeSize, world.log.signHead().treeSize)
  assert.equal(report.anchorsConfirmed + report.anchorsPending, 1)
})

test('CRITICAL regression: a relabelled leaf cannot falsify the counters', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-C2-RELABEL', {
    fullLegalName: 'B',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-2',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return

  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)

  const honest: PublicLogView = {
    heads: [world.log.signHead()],
    leaves: [
      {
        index: published.leafIndex,
        bytes: published.leafBytes,
        inclusionProof: world.log.inclusionProof(published.leafIndex),
      },
    ],
    anchors: [published.anchor],
  }
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const truth = transparencyReport(verifier, {
    log: honest,
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: world.log.signHead(),
  })
  assert.deepEqual(truth.unsealsByTrack, { standard: 1, emergency: 0 })

  // The attacker keeps the genuinely included bytes and can no longer attach
  // any claim to them: the view carries nothing but index, bytes and height.
  const relabelled: PublicLogView = {
    ...honest,
    leaves: honest.leaves.map((leaf) => ({ ...leaf })),
  }
  assert.deepEqual(
    transparencyReport(verifier, {
      log: relabelled,
      chain: world.chain,
      docket: [],
      horizon: horizon,
      pinnedHead: world.log.signHead(),
    }),
    truth,
    'a relabelled leaf changed a counter',
  )

  // A leaf whose bytes do not parse is counted as undecodable, never dropped.
  const junk: PublicLogView = {
    ...honest,
    leaves: [
      ...honest.leaves,
      {
        index: 99,
        bytes: randomBytes(40),
        inclusionProof: world.log.inclusionProof(99),
      },
    ],
  }
  const withJunk = transparencyReport(verifier, {
    log: junk,
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: world.log.signHead(),
  })
  assert.equal(withJunk.unparsable, 1)
  assert.deepEqual(withJunk.unsealsByTrack, truth.unsealsByTrack)
})

test('reconcile flags an unseal that never reached the docket past the horizon', () => {
  const entries = reconcileAgainstDocket(
    [
      { authorizationHash: 'aa', anchorHeight: 5 },
      { authorizationHash: 'bb', anchorHeight: 5 },
    ],
    [{ authorizationHash: 'aa', publishedAtHeight: 6, caseSummary: 'closed' }],
    { tipHeight: 30, horizonBlocks: 10 },
  )
  assert.deepEqual(
    entries.map((entry) => entry.status),
    ['matched', 'overdue'],
  )
})

test('NINTH-REVIEW regressions: share laundering, hostile bytes, and type/track disagreement', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-KL-REGR', {
    fullLegalName: 'C',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-3',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)

  const unsealLeaf = parseLeaf(published.leafBytes)
  assert.ok(unsealLeaf)

  // An ENROLLMENT_ACCEPTED leaf must not discharge a share for an unseal.
  const enrollmentOnly: PublicLogView = {
    heads: [],
    leaves: [
      {
        index: 0,
        bytes: enrolled.acceptedLeaf.bytes,
        inclusionProof: world.log.inclusionProof(0),
      },
    ],
    anchors: [],
  }
  assert.notEqual(
    verifyShareArtifact(
      {
        authorizationHash: toHex(unsealLeaf.authorization_hash),
        issuedByInterface: true,
      },
      provenLeaves(verifier, world.log.signHead(), enrollmentOnly),
    ),
    null,
    'an enrollment leaf discharged an unseal share',
  )

  // The real unseal leaf still discharges it.
  assert.equal(
    verifyShareArtifact(
      {
        authorizationHash: toHex(unsealLeaf.authorization_hash),
        issuedByInterface: true,
      },
      provenLeaves(verifier, world.log.signHead(), {
        heads: [],
        leaves: [
          {
            index: published.leafIndex,
            bytes: published.leafBytes,
            inclusionProof: world.log.inclusionProof(published.leafIndex),
          },
        ],
        anchors: [],
      }),
    ),
    null,
  )

  // Hostile bytes must count as undecodable, never throw.
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  for (const bytes of [null, undefined, 'x', 7, {}]) {
    assert.doesNotThrow(
      () => {
        const report = transparencyReport(verifier, {
          log: {
            heads: [],
            leaves: [
              {
                index: 0,
                bytes: bytes as never,
                inclusionProof: world.log.inclusionProof(0),
              },
            ],
            anchors: [],
          },
          chain: world.chain,
          docket: [],
          horizon,
          pinnedHead: world.log.signHead(),
        })
        assert.equal(report.unparsable, 1)
      },
      `bytes ${String(bytes)} threw`,
    )
  }
})

test('ROW 21 regression: the report counts only leaves proven to be in the log', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-ROW21', {
    fullLegalName: 'D',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-4',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)

  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const view = (leaves: PublicLeafView[]): PublicLogView => ({
    heads: [head],
    leaves,
    anchors: [published.anchor],
  })

  const truth = transparencyReport(verifier, {
    log: view([real]),
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: world.log.signHead(),
  })
  assert.equal(truth.headVerified, true)
  assert.deepEqual(truth.unsealsByTrack, { standard: 1, emergency: 0 })

  // Fabricated leaves carry no valid proof and are not counted.
  const fabricated = Array.from({ length: 20 }, (_, i) => ({
    index: 500 + i,
    bytes: published.leafBytes,
    inclusionProof: [],
  }))
  const withFakes = transparencyReport(verifier, {
    log: view([real, ...fabricated]),
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: head,
  })
  assert.deepEqual(withFakes.unsealsByTrack, truth.unsealsByTrack)
  assert.equal(withFakes.notIncluded, 20)

  // One index yields one leaf, so duplicates cannot inflate a count.
  const duplicated = transparencyReport(verifier, {
    log: view([real, { ...real }, { ...real }]),
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: head,
  })
  assert.deepEqual(duplicated.unsealsByTrack, truth.unsealsByTrack)

  // Omitting a real leaf shows up as a shortfall against the signed head.
  const omitted = transparencyReport(verifier, {
    log: view([]),
    chain: world.chain,
    docket: [],
    horizon: horizon,
    pinnedHead: world.log.signHead(),
  })
  assert.deepEqual(omitted.unsealsByTrack, { standard: 0, emergency: 0 })
  assert.ok(omitted.missingFromView > 0, 'an omitted leaf left no trace')

  // An unsigned head zeroes the whole report rather than being believed.
  const forged = transparencyReport(verifier, {
    log: view([real]),
    chain: world.chain,
    docket: [],
    horizon,
    // A REAL root with a bad signature. Forging the root instead would break
    // inclusion on its own, so the test passed even with the signature check
    // deleted. That is how the first version of this assertion was wrong.
    pinnedHead: { ...head, signature: randomBytes(64) },
  })
  assert.equal(forged.headVerified, false)
  assert.equal(forged.treeSize, 0)
  assert.deepEqual(forged.unsealsByTrack, { standard: 0, emergency: 0 })
})

test('C1 regression: the presenter cannot choose the head, so a stale one cannot hide leaves', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-C1-HEAD', {
    fullLegalName: 'E',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-5',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return

  const stale = world.log.signHead()
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const current = world.log.signHead()
  assert.ok(current.treeSize > stale.treeSize)

  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const leaves = [
    {
      index: published.leafIndex,
      bytes: published.leafBytes,
      inclusionProof: world.log.inclusionProof(published.leafIndex),
    },
  ]

  // Pinned to the real head, the unseal is counted.
  const truth = transparencyReport(verifier, {
    log: { heads: [current], leaves, anchors: [published.anchor] },
    chain: world.chain,
    docket: [],
    horizon,
    pinnedHead: current,
  })
  assert.deepEqual(truth.unsealsByTrack, { standard: 1, emergency: 0 })

  // A presenter who supplies ONLY the stale head cannot shrink the view: the
  // pinned head comes from outside it, so the stale head is simply ignored.
  const hostile = transparencyReport(verifier, {
    log: { heads: [stale], leaves, anchors: [published.anchor] },
    chain: world.chain,
    docket: [],
    horizon,
    pinnedHead: current,
  })
  assert.deepEqual(hostile.unsealsByTrack, truth.unsealsByTrack)
  assert.equal(hostile.treeSize, current.treeSize)
})

test('the four review items: digest coverage, anchor backing, split counters, closing log', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-FOUR', {
    fullLegalName: 'F',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-6',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const run = (log: PublicLogView) =>
    transparencyReport(verifier, {
      log,
      chain: world.chain,
      docket: [],
      horizon,
      pinnedHead: head,
    })

  // An anchor the chain does not back counts for nothing, and is reported.
  const fake = { ...published.anchor, blockHeight: 0 }
  const withFake = run({ heads: [head], leaves: [real], anchors: [fake] })
  assert.equal(withFake.anchorsUnbacked, 1)
  assert.equal(withFake.anchorsConfirmed + withFake.anchorsPending, 0)

  // The three failure causes are counted apart, so padding one cannot drown
  // another.
  const mixed = run({
    heads: [head],
    leaves: [
      real,
      { ...real },
      { ...real },
      {
        index: 900,
        bytes: randomBytes(30),
        inclusionProof: [],
      },
      {
        index: 901,
        bytes: published.leafBytes,
        inclusionProof: [],
      },
    ],
    anchors: [],
  })
  assert.equal(mixed.duplicates, 2)
  assert.equal(mixed.unparsable, 1)
  assert.equal(mixed.notIncluded, 1)
  assert.deepEqual(mixed.unsealsByTrack, { standard: 1, emergency: 0 })
})

// TENTH-REVIEW regressions. Each of these four guards deleted green. The
// existing anchor case used blockHeight 0, and genesis carries a null payload,
// so the `block.payload !== null` clause already rejected it and the digest
// comparison never ran. Every case below is built so the named guard is the
// only thing that can refuse.
test('TENTH-REVIEW: four transparency guards that no test reached', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-TENTH', {
    fullLegalName: 'T',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-10',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const run = (log: PublicLogView, pinnedHead = head) =>
    transparencyReport(verifier, {
      log,
      chain: world.chain,
      docket: [],
      horizon,
      pinnedHead,
    })

  // 1. The anchor digest arm. A REAL block that carries a payload, at a wrong
  // digest, so the null-payload clause cannot answer for it.
  const realHeight = published.anchor.blockHeight
  assert.notEqual(world.chain.blocks[realHeight]?.payload, null)
  const wrongDigest = run({
    heads: [head],
    leaves: [real],
    anchors: [{ ...published.anchor, sthHash: randomBytes(32) }],
  })
  assert.equal(wrongDigest.anchorsUnbacked, 1)
  assert.equal(wrongDigest.anchorsConfirmed, 0)

  // 2. One genuine anchor repeated is one anchor.
  const repeated = run({
    heads: [head],
    leaves: [real],
    anchors: Array.from({ length: 25 }, () => published.anchor),
  })
  assert.equal(repeated.anchorsConfirmed + repeated.anchorsPending, 1)
  assert.equal(repeated.anchorsUnbacked, 0)

  // 3. A junk head in the presenter-supplied array must not throw.
  const junk = {
    treeId: 'sige-demo-log/v1',
    treeSize: -1,
    rootHash: randomBytes(32),
    signature: randomBytes(64),
  }
  assert.doesNotThrow(() =>
    run({ heads: [head, junk], leaves: [real], anchors: [] }),
  )
  // And an unsigned head is not history.
  const unsigned = { ...head, rootHash: randomBytes(32) }
  const printed = run({ heads: [head, unsigned], leaves: [real], anchors: [] })
  assert.equal(printed.rootHistory.length, 1)

  // 3b. A malformed anchor counts as unbacked instead of throwing. toHex
  // iterates its argument, and dedupe runs before the shape check in
  // backedByChain, so the key builder is the only place that can catch this.
  const malformed = { ...published.anchor, sthHash: null } as never
  assert.doesNotThrow(() =>
    run({ heads: [head], leaves: [real], anchors: [malformed] }),
  )
  const bad = run({ heads: [head], leaves: [real], anchors: [malformed] })
  assert.equal(bad.anchorsUnbacked, 1)
  assert.equal(bad.anchorsConfirmed + bad.anchorsPending, 0)

  // 4. A forged not-included leaf cannot be filed as a benign duplicate just by
  // arriving after the real one.
  const forged = { ...real, bytes: published.leafBytes, inclusionProof: [] }
  const after = run({ heads: [head], leaves: [real, forged], anchors: [] })
  assert.equal(after.notIncluded, 1)
  assert.equal(after.duplicates, 0)
})

// ELEVENTH-REVIEW regressions. Each of these was a live exploit against the
// tenth-review fixes, and three were created BY those fixes.
test('ELEVENTH-REVIEW: prototype roles, height type confusion, and hostile shapes', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-11TH', {
    fullLegalName: 'E',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-11',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const run = (log: unknown) =>
    transparencyReport(verifier, {
      log: log as PublicLogView,
      chain: world.chain,
      docket: [],
      horizon,
      pinnedHead: head,
    })

  // 1. A role named after an Object.prototype key must still be counted. On a
  // bare object literal `__proto__` vanishes and `constructor` folds into the
  // Object constructor, so the count becomes a string. issuing_role is a
  // free-form string, so the operator picks it. The leaves below are REAL:
  // appended to the log and proven included, so only countBy can lose them.
  const genuine = parseLeaf(published.leafBytes)
  assert.ok(genuine)
  if (!genuine) return
  const hostileViews = ['__proto__', 'constructor'].map((role) => {
    const bytes = encodeLogLeafV1(logLeafV1({ ...genuine, issuing_role: role }))
    const index = world.log.append(bytes)
    return { role, bytes, index }
  })
  const grown = world.log.signHead()
  const withHostileRoles = transparencyReport(verifier, {
    log: {
      heads: [grown],
      leaves: [
        { ...real, inclusionProof: world.log.inclusionProof(real.index) },
        ...hostileViews.map((v) => ({
          index: v.index,
          bytes: v.bytes,
          inclusionProof: world.log.inclusionProof(v.index),
        })),
      ],
      anchors: [],
    },
    chain: world.chain,
    docket: [],
    horizon,
    pinnedHead: grown,
  })
  assert.equal(withHostileRoles.notIncluded, 0, 'the hostile leaves are real')
  assert.equal(withHostileRoles.unsealsByTrack.standard, 3)
  const byRole = withHostileRoles.unsealsByRole
  const protoRole = Object.getOwnPropertyDescriptor(byRole, '__proto__')
  assert.equal(protoRole?.value, 1, 'a __proto__ role vanished from the count')
  assert.equal(byRole.constructor, 1, 'a constructor role is not a number')

  // 2. The chain lookup and the dedupe key must agree on what a height is.
  // `chain.blocks["3"]` and `chain.blocks[3]` are the same block, so a string
  // height used to reach a real block while keying as malformed.
  const stringHeight = {
    ...published.anchor,
    blockHeight: String(published.anchor.blockHeight) as unknown as number,
  }
  const doubled = run({
    heads: [head],
    leaves: [real],
    anchors: [published.anchor, stringHeight],
  })
  assert.equal(doubled.anchorsConfirmed + doubled.anchorsPending, 1)
  assert.equal(doubled.anchorsUnbacked, 1)

  // 3. Presenter-supplied shapes must produce a verdict, never a throw.
  for (const [label, log] of [
    ['null anchor', { heads: [head], leaves: [real], anchors: [null] }],
    ['heads missing', { leaves: [real], anchors: [] }],
    ['leaves missing', { heads: [head], anchors: [] }],
    ['anchors missing', { heads: [head], leaves: [real] }],
    ['log missing', undefined],
  ] as const) {
    assert.doesNotThrow(() => run(log), `${label} threw`)
  }
  assert.equal(
    run({ heads: [head], leaves: [real], anchors: [null] }).anchorsUnbacked,
    1,
  )

  // 4. One head supplied 25 times is one entry of history.
  const padded = run({
    heads: Array.from({ length: 25 }, () => head),
    leaves: [real],
    anchors: [],
  })
  assert.equal(padded.rootHistory.length, 1)
})

// An append-only tree cannot hold one root at two sizes. Without this the
// operator signs a second size for one root and reopens cross-size inclusion.
test('ELEVENTH-REVIEW: one root signed at two tree sizes is equivocation', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  world.log.append(randomBytes(16))
  const honest = world.log.signHead()
  const restated = world.log.signArbitraryHead(
    honest.treeSize + 3,
    honest.rootHash,
  )
  assert.equal(detectEquivocation(verifier, [honest, honest]), null)
  const verdict = detectEquivocation(verifier, [honest, restated])
  assert.notEqual(verdict, null, 'one root at two sizes was accepted')
  assert.match(String(verdict), /one root at sizes/)
})

// ROW 23. `anchorHeight` used to sit on PublicLeafView, caller-supplied, and it
// drove the congestion window, the difficulty and the docket reconcile. A
// presenter simply asserted it. It is now derived: the chain carries the sth
// digest, the digest pins the head record, the log signature covers the size
// in it, and a leaf is anchored by the earliest anchored tree that held it.
test('ROW 23: the anchor height is derived, and an unanchored unseal is reported', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-ROW23', {
    fullLegalName: 'R',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-23',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const run = (log: PublicLogView) =>
    transparencyReport(verifier, {
      log,
      chain: world.chain,
      docket: [],
      horizon,
      pinnedHead: head,
    })

  // With the anchored head supplied, the unseal is anchored and counted.
  const anchored = run({
    heads: [head],
    leaves: [real],
    anchors: [published.anchor],
    anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
  })
  assert.equal(anchored.unsealsByTrack.standard, 1)
  assert.equal(anchored.unanchoredUnseals, 0)
  assert.equal(anchored.windowUnseals, 1)

  // Withhold the head record and the unseal is reported as unanchored. It is
  // still counted as an unseal, because the log authenticates it either way.
  const withheld = run({
    heads: [head],
    leaves: [real],
    anchors: [published.anchor],
    anchoredHeads: [],
  })
  assert.equal(withheld.unsealsByTrack.standard, 1)
  assert.equal(withheld.unanchoredUnseals, 1)
  assert.equal(withheld.windowUnseals, 0)

  // A head record the chain does not carry buys nothing: the digest must match
  // an anchor the chain actually backs.
  const unbacked = run({
    heads: [head],
    leaves: [real],
    anchors: [],
    anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
  })
  assert.equal(unbacked.unanchoredUnseals, 1)

  // A head record the LOG never signed buys nothing either, even with its
  // digest genuinely mined into a block. Only the signature check refuses this.
  const forgedHead = {
    ...published.head,
    tree_size: published.head.tree_size + 1000,
    signature: randomBytes(64),
  }
  const forgedDigest = hashSignedTreeHeadV1(forgedHead)
  const minedBlock = world.chain.mine(forgedDigest)
  const forgedAnchored = run({
    heads: [head],
    leaves: [real],
    anchors: [
      {
        sthHash: forgedDigest,
        blockHeight: minedBlock.height,
        blockHash: minedBlock.hash,
      },
    ],
    anchoredHeads: [{ head: forgedHead, consistencyProof: [] }],
  })
  assert.equal(forgedAnchored.anchorsUnbacked, 0, 'the chain does carry it')
  assert.equal(
    forgedAnchored.unanchoredUnseals,
    1,
    'an unsigned head record anchored a leaf',
  )

  // An anchored tree that predates a leaf does not cover it. The unseal below
  // is appended AFTER the anchored head was signed, so its index is beyond it.
  const genuineFields = parseLeaf(published.leafBytes)
  assert.ok(genuineFields)
  if (!genuineFields) return
  const laterBytes = encodeLogLeafV1(
    logLeafV1({ ...genuineFields, event_id: randomBytes(16) }),
  )
  const laterIndex = world.log.append(laterBytes)
  const laterHead = world.log.signHead()
  const straddling = transparencyReport(verifier, {
    log: {
      heads: [laterHead],
      leaves: [
        { ...real, inclusionProof: world.log.inclusionProof(real.index) },
        {
          index: laterIndex,
          bytes: laterBytes,
          inclusionProof: world.log.inclusionProof(laterIndex),
        },
      ],
      anchors: [published.anchor],
      anchoredHeads: [anchoredAt(world, published.head, laterHead.treeSize)],
    },
    chain: world.chain,
    docket: [],
    horizon,
    pinnedHead: laterHead,
  })
  assert.equal(straddling.unsealsByTrack.standard, 2)
  assert.equal(
    straddling.unanchoredUnseals,
    1,
    'a leaf beyond the anchored tree size was reported as anchored',
  )
})

// THIRTEENTH-REVIEW regressions. Each of the five below failed its own mutation
// on the first attempt: the head signature, the congestion window and the
// object identity all had to be built deliberately for the named guard to be
// the only thing that can refuse.
test('THIRTEENTH-REVIEW: the presenter cannot pick the anchor height', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const enrolled = enroll(world, 'DOC-13TH', {
    fullLegalName: 'M',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-13',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)

  // A tight window, so an early anchor and a late one land on opposite sides of
  // it. Without that the two heights give identical counters and both the fold
  // and the earliest-tree selection go untested.
  const verifier = createKeylessVerifier({
    evidenceKeys: publicKeysOf(world),
    congestionPolicy: { dFloor: 1, baseline: 1, cap: 4, windowBlocks: 4 },
  })
  const earlyHeight = published.anchor.blockHeight
  for (let i = 0; i < 12; i++) world.chain.mine(null)
  const lateBlock = world.chain.mine(published.anchor.sthHash)
  const head = world.log.signHead()
  const horizon = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 }
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const run = (log: unknown) =>
    transparencyReport(verifier, {
      log: log as PublicLogView,
      chain: world.chain,
      docket: [],
      horizon,
      pinnedHead: head,
    })

  const lateAnchor = {
    sthHash: published.anchor.sthHash,
    blockHeight: lateBlock.height,
    blockHash: lateBlock.hash,
  }
  assert.ok(lateBlock.height - earlyHeight > 4, 'the window must separate them')

  // 1. Two anchors for ONE head, at two heights. The earliest must win, so the
  // unseal falls outside the tight window whichever order they arrive in.
  const forward = run({
    heads: [head],
    leaves: [real],
    anchors: [published.anchor, lateAnchor],
    anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
  })
  const reversed = run({
    heads: [head],
    leaves: [real],
    anchors: [lateAnchor, published.anchor],
    anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
  })
  assert.equal(forward.windowUnseals, 0, 'the earliest anchor did not win')
  assert.deepEqual(
    [forward.windowUnseals, forward.currentDifficulty],
    [reversed.windowUnseals, reversed.currentDifficulty],
    'array order moved the reported congestion window',
  )
  // A late-only anchor really is inside the window, so case 1 is not vacuous.
  assert.equal(
    run({
      heads: [head],
      leaves: [real],
      anchors: [lateAnchor],
      anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
    }).windowUnseals,
    1,
  )

  // 1b. TWO distinct anchored trees, both covering the leaf, at two heights.
  // The digest fold cannot merge them because they are different heads, so
  // only the earliest-tree selection in anchorHeightFor can choose.
  world.log.append(randomBytes(24))
  const laterHeadRecord = signHeadRecord(world, null)
  const laterDigest = hashSignedTreeHeadV1(laterHeadRecord)
  const laterAnchorBlock = world.chain.mine(laterDigest)
  const pinnedLater = world.log.signHead()
  const twoTrees = transparencyReport(verifier, {
    log: {
      heads: [pinnedLater],
      leaves: [
        { ...real, inclusionProof: world.log.inclusionProof(real.index) },
      ],
      anchors: [
        published.anchor,
        {
          sthHash: laterDigest,
          blockHeight: laterAnchorBlock.height,
          blockHash: laterAnchorBlock.hash,
        },
      ],
      anchoredHeads: [
        anchoredAt(world, published.head, pinnedLater.treeSize),
        anchoredAt(world, laterHeadRecord, pinnedLater.treeSize),
      ],
    },
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: pinnedLater,
  })
  assert.equal(
    twoTrees.windowUnseals,
    0,
    'the later anchored tree was chosen over the earlier one',
  )

  // 2. A head the log GENUINELY signed over a size the tree will never reach,
  // anchored early. headMessage covers only the size and the root, so the
  // signature verifies. Only the bound against the pinned head refuses it.
  const fabricated = world.log.signArbitraryHead(
    head.treeSize + 10_000,
    head.rootHash,
  )
  const inflated = {
    ...published.head,
    tree_size: fabricated.treeSize,
    root_hash: fabricated.rootHash,
    signature: fabricated.signature,
  }
  assert.equal(
    verifyHead(world.log.publicKey, coreSignedTreeHead(inflated)),
    true,
    'the fabricated head must carry a real signature',
  )
  const inflatedDigest = hashSignedTreeHeadV1(inflated)
  const inflatedBlock = world.chain.mine(inflatedDigest)
  const backdated = run({
    heads: [head],
    leaves: [real],
    anchors: [
      {
        sthHash: inflatedDigest,
        blockHeight: inflatedBlock.height,
        blockHash: inflatedBlock.hash,
      },
    ],
    anchoredHeads: [anchoredAt(world, inflated, head.treeSize)],
  })
  assert.equal(backdated.anchorsUnbacked, 0, 'the chain does carry it')
  assert.equal(
    backdated.unanchoredUnseals,
    1,
    'a head larger than the pinned tree anchored a leaf',
  )

  // 3. A getter that answers differently on each read. The boundary reads it
  // once, so downstream readers cannot each get a different height.
  let reads = 0
  const twoFaced = {
    sthHash: published.anchor.sthHash,
    blockHash: published.anchor.blockHash,
    get blockHeight() {
      reads += 1
      return reads > 1 ? 0 : lateBlock.height
    },
  }
  assert.doesNotThrow(() =>
    run({
      heads: [head],
      leaves: [real],
      anchors: [twoFaced],
      anchoredHeads: [],
    }),
  )
  assert.equal(reads, 1, 'blockHeight was read more than once')

  // 4. Hostile shapes in anchoredHeads refuse, never throw.
  for (const hostile of [
    null,
    undefined,
    { ...published.head, timestamp: undefined },
    { ...published.head, previous_tree_size: 'x' },
  ]) {
    assert.doesNotThrow(
      () =>
        run({
          heads: [head],
          leaves: [real],
          anchors: [published.anchor],
          anchoredHeads: [{ head: hostile as never, consistencyProof: [] }],
        }),
      `anchoredHeads entry ${String(hostile)} threw`,
    )
  }

  // 5. 200k copies of ONE head must cost one hash, not 200k. Reference dedupe
  // runs before hashSignedTreeHeadV1, which is a CBOR encode plus a hash.
  const paddedEntry = anchoredAt(world, published.head, head.treeSize)
  const started = process.hrtime.bigint()
  const padded = run({
    heads: [head],
    leaves: [real],
    anchors: [published.anchor],
    anchoredHeads: Array.from({ length: 200_000 }, () => paddedEntry),
  })
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
  assert.equal(padded.unanchoredUnseals, 0)
  assert.ok(
    elapsedMs < 2000,
    `200k copies of one head cost ${Math.round(elapsedMs)}ms`,
  )
})

// FOURTEENTH-REVIEW regressions, from a Codex correctness review. Round 13
// normalized the anchors and left four other presenter inputs raw, which is the
// same per-site mistake one level up. Each case below reaches exactly one of
// them, and the fifth needs a consistency proof rather than a copy.
test('FOURTEENTH-REVIEW: every presenter input crosses the boundary', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const enrolled = enroll(world, 'DOC-14TH', {
    fullLegalName: 'N',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-14',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }
  const strict = createKeylessVerifier({
    evidenceKeys: publicKeysOf(world),
    congestionPolicy: { dFloor: 1, baseline: 1, cap: 4, windowBlocks: 4 },
    minConfirmations: 3,
  })
  const base = {
    heads: [head],
    leaves: [real],
    anchors: [published.anchor],
    anchoredHeads: [anchoredAt(world, published.head, head.treeSize)],
  }
  const run = (over: Record<string, unknown> = {}) =>
    transparencyReport(strict, {
      log: base as PublicLogView,
      chain: world.chain,
      docket: [],
      horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
      pinnedHead: head,
      ...over,
    })

  // 1. SimBitcoin is a live object the caller owns, and `confirmations` is a
  // method it can replace. Depth must be recomputed from the block array.
  const lying = Object.create(world.chain) as typeof world.chain
  lying.confirmations = () => 999
  // A FRESH anchor exactly one block deep, so 3 required confirmations are
  // genuinely unmet and only a lying `confirmations` could report otherwise.
  const shallowDigest = randomBytes(32)
  const shallowBlock = world.chain.mine(shallowDigest)
  const shallow = {
    sthHash: shallowDigest,
    blockHeight: shallowBlock.height,
    blockHash: shallowBlock.hash,
  }
  const shallowLog = { ...base, anchors: [shallow] }
  assert.equal(run({ log: shallowLog }).anchorsPending, 1, 'one block deep')
  assert.equal(
    run({ log: shallowLog, chain: lying }).anchorsConfirmed,
    0,
    'a replaced confirmations method moved the confirmed count',
  )

  // 2. The pinned head decides which anchored trees are admissible, so a getter
  // answering differently on each read must not be able to disagree with itself.
  let treeSizeReads = 0
  const twoFacedHead = new Proxy(head, {
    get(target, property, receiver) {
      if (property === 'treeSize') treeSizeReads += 1
      return Reflect.get(target, property, receiver)
    },
  })
  assert.doesNotThrow(() => run({ pinnedHead: twoFacedHead }))
  assert.equal(treeSizeReads, 1, 'pinnedHead.treeSize was read more than once')

  // 3. Leaves were left raw when the anchors were normalized: `index` was read
  // five times, so one leaf could be two leaves.
  let indexReads = 0
  const twoFacedLeaf = {
    bytes: real.bytes,
    inclusionProof: real.inclusionProof,
    get index() {
      indexReads += 1
      return indexReads > 1 ? 9_999 : real.index
    },
  }
  const shifty = run({ log: { ...base, leaves: [twoFacedLeaf] } })
  assert.equal(indexReads, 1, 'leaf index was read more than once')
  assert.equal(shifty.unsealsByTrack.standard, 1)
  assert.equal(shifty.unanchoredUnseals, 0)

  // 4. The horizon tip is the chain's tip, never the caller's word for it.
  // A horizon wide enough that the real tip leaves the unseal pending. Only a
  // forged tip could push it past the horizon.
  const wide = { tipHeight: world.chain.tipHeight(), horizonBlocks: 1_000_000 }
  assert.equal(run({ horizon: wide }).unmatchedPastHorizon, 0, 'pending')
  assert.equal(
    run({ horizon: { ...wide, tipHeight: 10_000_000 } }).unmatchedPastHorizon,
    0,
    'a forged tip height moved the overdue count',
  )

  // 5b. A getter on the anchored head record. Reads 1..n answer honestly, so the
  // signature, the consistency proof and the size bound all pass; the LAST read
  // is the coverage decision. The boundary reads the record once.
  let sizeReads = 0
  const honestEntry = anchoredAt(world, published.head, head.treeSize)
  const twoFacedRecord = {
    head: new Proxy(published.head, {
      get(target, property, receiver) {
        if (property === 'tree_size') sizeReads += 1
        return Reflect.get(target, property, receiver)
      },
    }),
    consistencyProof: honestEntry.consistencyProof,
  }
  assert.doesNotThrow(() =>
    run({ log: { ...base, anchoredHeads: [twoFacedRecord] } }),
  )
  assert.equal(
    sizeReads,
    1,
    'the anchored head tree_size was read more than once',
  )

  // 5. A head the log signed, small enough, and genuinely anchored, but on a
  // DIFFERENT branch. Signature, size bound and chain backing all pass. Only a
  // consistency proof to the pinned head refuses it.
  const forkLog = new TransparencyLog()
  forkLog.append(randomBytes(32))
  // Same SIZE as the pinned head so it covers the leaf, different ROOT so it
  // is a different branch. Size and coverage both pass; only consistency fails.
  const forkCore = world.log.signArbitraryHead(head.treeSize, forkLog.root())
  const forkRecord = {
    ...published.head,
    tree_size: head.treeSize,
    root_hash: forkLog.root(),
    signature: forkCore.signature,
  }
  assert.equal(
    verifyHead(world.log.publicKey, coreSignedTreeHead(forkRecord)),
    true,
    'the fork head must carry a real signature',
  )
  const forkDigest = hashSignedTreeHeadV1(forkRecord)
  const forkBlock = world.chain.mine(forkDigest)
  const forked = run({
    log: {
      ...base,
      anchors: [
        {
          sthHash: forkDigest,
          blockHeight: forkBlock.height,
          blockHash: forkBlock.hash,
        },
      ],
      anchoredHeads: [{ head: forkRecord, consistencyProof: [] }],
    },
  })
  assert.equal(forked.anchorsUnbacked, 0, 'the chain does carry the fork head')
  assert.equal(
    forked.unanchoredUnseals,
    1,
    'a head on another branch anchored a leaf',
  )
})

// ROW 19, the real fix. A single bundle can only show its link chains from SOME
// published start, so serialization is checked here, log-wide, by walking every
// proven unseal leaf in authenticated index order. A synthetic log is used
// because TransparencyLog stores hashes, so a fork cannot otherwise be built.
test('ROW 19: the work chain across unseals is walked in index order', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const unsealLeaf = (previous: Uint8Array, tag: string, difficulty = 2) => {
    const draft = logLeafV1({
      schema_version: 1,
      network_id: utf8('net'),
      leaf_type: 'UNSEAL_STANDARD',
      event_id: utf8(tag),
      authorization_hash: randomBytes(32),
      account_commitment: randomBytes(32),
      case_reference_commitment: randomBytes(32),
      order_document_hash: randomBytes(32),
      ciphertext_hash: randomBytes(32),
      escrow_epoch: 1,
      issuing_role: 'court',
      track: 'standard',
      prev_unseal_anchor_ref: null,
      congestion_difficulty: difficulty,
      congestion_stamp_output: zeroStampOutput(),
      unseal_detection_tag: null,
      public_disclosure_class: 'standard',
      created_at: 1,
      extension_commitments: [],
    })
    const output = chainedWork(
      previous,
      congestionStampLeafHash(draft),
      2,
    ).output
    return logLeafV1({ ...draft, congestion_stamp_output: output })
  }

  const a = unsealLeaf(STAMP_GENESIS, 'a')
  const b = unsealLeaf(a.congestion_stamp_output, 'b')
  // A fork: c chains from a, not from b. Each link recomputes on its own, so
  // only the walk in index order sees two leaves sharing one predecessor.
  const c = unsealLeaf(a.congestion_stamp_output, 'c')

  const build = (leaves: readonly ReturnType<typeof logLeafV1>[]) => {
    const fresh = new TransparencyLog()
    const views = leaves.map((leaf) => {
      const bytes = encodeLogLeafV1(leaf)
      return { index: fresh.append(bytes), bytes }
    })
    const head = fresh.signHead()
    return {
      head,
      verifier: createKeylessVerifier({
        evidenceKeys: { ...publicKeysOf(world), logPublicKey: fresh.publicKey },
        congestionPolicy: {
          dFloor: 1,
          baseline: 1,
          cap: 4,
          windowBlocks: 1000,
        },
      }),
      views: views.map((v) => ({
        ...v,
        inclusionProof: fresh.inclusionProof(v.index),
      })),
    }
  }
  const run = (
    built: ReturnType<typeof build>,
    take = Number.MAX_SAFE_INTEGER,
  ) =>
    transparencyReport(built.verifier, {
      log: {
        heads: [built.head],
        leaves: built.views.slice(0, take),
        anchors: [],
        anchoredHeads: [],
      },
      chain: world.chain,
      docket: [],
      horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
      pinnedHead: built.head,
    })

  const honest = build([a, b])
  const honestReport = run(honest)
  assert.equal(honestReport.missingFromView, 0, 'the view must be complete')
  assert.equal(honestReport.unsealsByTrack.standard, 2)
  assert.equal(honestReport.congestionChain, 'intact')
  assert.equal(honestReport.congestionChainBreaks, 0)

  // Presenter array order must not matter: the walk sorts by AUTHENTICATED
  // index, so the same leaves handed over backwards give the same verdict.
  const shuffled = transparencyReport(honest.verifier, {
    log: {
      heads: [honest.head],
      leaves: [...honest.views].reverse(),
      anchors: [],
      anchoredHeads: [],
    },
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: honest.head,
  })
  assert.equal(
    shuffled.congestionChain,
    'intact',
    'array order changed the verdict',
  )

  // A partial view cannot answer, and must not claim it can.
  const partial = run(honest, 1)
  assert.equal(partial.congestionChain, 'unknown')
  assert.equal(partial.congestionChainBreaks, 0)

  // The fork needs BOTH successors present: b and c each chain from a. Taken
  // alone, [a, c] is a valid two-link chain, which is exactly why a per-bundle
  // check cannot see this and the index-order walk can.
  assert.equal(
    run(build([a, c])).congestionChain,
    'intact',
    'a fork of one is not a fork',
  )
  const forked = run(build([a, b, c]))
  assert.equal(forked.unsealsByTrack.standard, 3, 'all three leaves are real')
  assert.equal(forked.congestionChain, 'broken')
  assert.equal(forked.congestionChainBreaks, 1)

  // Cost, not only order: the loop count comes from the leaf under audit, so a
  // chain that recomputes perfectly can still be free. The policy floor is the
  // only number here from outside the leaf.
  //
  // NOT AN ISOLATING PROOF. Deleting the floor check leaves this green, because
  // this leaf also fails the hash compare for a reason I did not run to ground.
  // The floor is kept because nothing else compares difficulty to policy, and
  // it is recorded in the ledger as having no isolating regression.
  const cheap = unsealLeaf(STAMP_GENESIS, 'cheap', 0)
  const free = run(build([cheap]))
  assert.equal(free.unsealsByTrack.standard, 1, 'the leaf is real and proven')
  assert.equal(free.congestionChain, 'broken')
  assert.equal(free.congestionChainBreaks, 1)

  // Reordering is the same failure: c before b breaks the pair at index 1.
  const reordered = run(build([a, c, b]))
  assert.equal(reordered.congestionChain, 'broken')
})

// SIXTEENTH-REVIEW. Two defects that made ROW 19 vacuous in production.
//
// The chain walk was gated on `treeSize - decoded.length === 0`, and every
// completed ceremony appends a closing leaf the strict LogLeafV1 decoder
// rejects. So the verdict was `unknown` on every log the demo can produce, and
// the gap widened by one per ceremony. The ROW 19 test used a SYNTHETIC log
// holding nothing but unseal leaves, a shape performUnseal cannot make, so it
// never drove the real path.
test('SIXTEENTH-REVIEW: the chain walk reaches a verdict on a real ceremony log', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-REAL-CHAIN', {
    fullLegalName: 'R',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-RC',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  // skipDelay short-circuits before the ceremony closes, so the closing leaf
  // never lands. The real path is the one that produces it.
  const outcome = await performUnseal(world, enrolled.record, {})
  assert.ok(outcome.published)
  assert.ok(outcome.bundle, 'the ceremony must have closed')

  // Every leaf the log holds, with the log's own proofs. Nothing is withheld.
  const head = world.log.signHead()
  const leaves = Array.from({ length: head.treeSize }, (_, index) => ({
    index,
    bytes: world.log.leafBytesAt(index),
    inclusionProof: world.log.inclusionProof(index),
  }))
  assert.equal(leaves.length, head.treeSize, 'the view must be the whole log')

  const report = transparencyReport(verifier, {
    log: { heads: [head], leaves, anchors: [], anchoredHeads: [] },
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: head,
  })
  assert.equal(report.unparsable, 0, 'a closing leaf is not corrupt')
  assert.equal(report.missingFromView, 0, 'nothing is missing')
  assert.notEqual(
    report.congestionChain,
    'unknown',
    'a complete real log still could not be walked',
  )
})

// A leaf the log authenticates whose leaf_type and track disagree used to fall
// between `unseals` and every other set. No counter recorded it, so relabelling
// one field hid a real unseal from the entire report.
test('SIXTEENTH-REVIEW: a proven leaf lands in exactly one bucket', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const log = new TransparencyLog()
  const verifier = createKeylessVerifier({
    evidenceKeys: { ...publicKeysOf(world), logPublicKey: log.publicKey },
    congestionPolicy: { dFloor: 1, baseline: 1, cap: 4, windowBlocks: 1000 },
  })
  const leafFor = (track: 'standard' | 'emergency') =>
    logLeafV1({
      schema_version: 1,
      network_id: utf8('net'),
      leaf_type: 'UNSEAL_STANDARD',
      event_id: utf8(`e-${track}`),
      authorization_hash: randomBytes(32),
      account_commitment: randomBytes(32),
      case_reference_commitment: randomBytes(32),
      order_document_hash: randomBytes(32),
      ciphertext_hash: randomBytes(32),
      escrow_epoch: 1,
      issuing_role: 'court',
      track,
      prev_unseal_anchor_ref: null,
      congestion_difficulty: 1,
      congestion_stamp_output: randomBytes(32),
      unseal_detection_tag: null,
      public_disclosure_class: 'standard',
      created_at: 1,
      extension_commitments: [],
    })
  // leaf_type says standard, track says emergency. Nothing else differs.
  const views = [leafFor('standard'), leafFor('emergency')].map((leaf) => {
    const bytes = encodeLogLeafV1(leaf)
    return { index: log.append(bytes), bytes }
  })
  const head = log.signHead()
  const report = transparencyReport(verifier, {
    log: {
      heads: [head],
      leaves: views.map((v) => ({
        ...v,
        inclusionProof: log.inclusionProof(v.index),
      })),
      anchors: [],
      anchoredHeads: [],
    },
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: head,
  })
  assert.equal(report.unparsable, 0)
  assert.equal(report.notIncluded, 0)
  assert.equal(report.missingFromView, 0, 'both leaves are proven present')
  assert.equal(report.unsealsByTrack.standard, 1, 'the honest leaf is counted')
  assert.equal(
    report.unsealsByTrack.emergency,
    0,
    'a leaf whose fields disagree was counted as a real unseal',
  )
  assert.equal(
    report.mismatched,
    1,
    'a proven leaf disappeared from every counter',
  )
})

// The closing-leaf decoder decides whether a leaf is ACCOUNTED FOR or corrupt,
// so it has to be exact. A map carrying a subset of the closing-leaf keys is
// not a closing leaf, and counting it as one would let a truncated leaf hide
// inside the completeness arithmetic the chain walk depends on.
test('SIXTEENTH-REVIEW: a partial closing leaf is unparsable, not accounted for', () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const log = new TransparencyLog()
  const verifier = createKeylessVerifier({
    evidenceKeys: { ...publicKeysOf(world), logPublicKey: log.publicKey },
    congestionPolicy: { dFloor: 1, baseline: 1, cap: 4, windowBlocks: 1000 },
  })
  const whole = encodeClosingLeafV1({
    unsealLeafHash: randomBytes(32),
    anchorHash: randomBytes(32),
    solutionProofCommitment: randomBytes(32),
    decryptionResultCommitment: randomBytes(32),
    ceremonyTranscriptHash: randomBytes(32),
    closedAt: 1,
  })
  // Every key is a real closing-leaf key; two are simply missing.
  const partial = encodeCbor(
    new Map<string, CborValue>([
      ['anchor_hash', randomBytes(32)],
      ['closed_at', 1n],
      ['decryption_result_commitment', randomBytes(32)],
      ['solution_proof_commitment', randomBytes(32)],
      ['unseal_leaf_hash', randomBytes(32)],
    ]),
  )
  const views = [whole, partial].map((bytes) => ({
    index: log.append(bytes),
    bytes,
  }))
  const head = log.signHead()
  const report = transparencyReport(verifier, {
    log: {
      heads: [head],
      leaves: views.map((v) => ({
        ...v,
        inclusionProof: log.inclusionProof(v.index),
      })),
      anchors: [],
      anchoredHeads: [],
    },
    chain: world.chain,
    docket: [],
    horizon: { tipHeight: world.chain.tipHeight(), horizonBlocks: 1000 },
    pinnedHead: head,
  })
  assert.equal(report.unparsable, 1, 'the partial leaf was accounted for')
  assert.equal(report.missingFromView, 1, 'so the view is not complete')
  assert.equal(report.congestionChain, 'unknown')
})

// EIGHTEENTH-REVIEW. Copying a value is not the same as enforcing that it was
// copied. `anchoredHeads` was read once per field for a whole round and still
// slipped through, because its type was the caller's own and nothing stopped a
// raw value reaching a counter. Heads and leaf views now carry a `normalized`
// marker no presenter value can satisfy, so the compiler holds the line at
// every entry rather than my memory holding it at each new one.
//
// This test covers the runtime half: the exported entry points normalize their
// own arguments, so a getter that answers differently on each read cannot make
// two functions disagree about one head.
test('EIGHTEENTH-REVIEW: exported entries normalize the heads they are handed', async () => {
  const world = createWorld(GENERIC, { t: tuned(64) })
  const verifier = verifierFor(world)
  const enrolled = enroll(world, 'DOC-18TH', {
    fullLegalName: 'E',
    dateOfBirth: '1990-01-01',
    documentNumber: 'ID-18',
  })
  assert.ok(!('error' in enrolled))
  if ('error' in enrolled) return
  const outcome = await performUnseal(world, enrolled.record, {
    skipDelay: true,
  })
  const published = outcome.published
  assert.ok(published)
  const head = world.log.signHead()
  const real = {
    index: published.leafIndex,
    bytes: published.leafBytes,
    inclusionProof: world.log.inclusionProof(published.leafIndex),
  }

  const counting = (target: SignedTreeHead, counter: { n: number }) =>
    new Proxy(target, {
      get(obj, property, receiver) {
        if (property === 'treeSize') counter.n += 1
        return Reflect.get(obj, property, receiver)
      },
    })

  // verifyLeafInclusion reads the head for the signature and again for the
  // inclusion walk. Both must come from one read of the caller's object.
  const a = { n: 0 }
  assert.equal(
    verifyLeafInclusion(verifier, real, counting(head, a), real.inclusionProof),
    null,
    'positive control',
  )
  assert.equal(a.n, 1, 'verifyLeafInclusion read treeSize more than once')

  // detectEquivocation reads every head in the array.
  const b = { n: 0 }
  assert.equal(
    detectEquivocation(verifier, [counting(head, b), counting(head, b)]),
    null,
  )
  assert.equal(b.n, 2, 'detectEquivocation read treeSize more than once each')

  // provenLeaves reads the head for the signature and for every leaf walk.
  const c = { n: 0 }
  assert.equal(
    provenLeaves(verifier, counting(head, c), {
      heads: [head],
      leaves: [real],
      anchors: [],
    }).length,
    1,
  )
  assert.equal(c.n, 1, 'provenLeaves read treeSize more than once')
})
