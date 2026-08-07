import assert from 'node:assert/strict'
import { test } from 'node:test'
import { concatBytes, randomBytes, utf8 } from '../src/core/bytes.ts'
import { anchorHead, SimBitcoin } from '../src/core/chain.ts'
import {
  chainedWork,
  requiredDifficulty,
  verifyWork,
} from '../src/core/congestion.ts'
import { dhash, sha256 } from '../src/core/hash.ts'
import {
  detectEquivocation,
  leafHash,
  type SignedTreeHead,
  TransparencyLog,
  verifyConsistency,
  verifyHead,
  verifyInclusion,
} from '../src/core/merkle.ts'

function headAt(
  heads: readonly SignedTreeHead[],
  size: number,
): SignedTreeHead {
  const head = heads[size]
  if (head === undefined) throw new Error(`no head recorded for size ${size}`)
  return head
}

test('inclusion proofs verify at every tree size up to 8', () => {
  const log = new TransparencyLog()
  const leaves: Uint8Array[] = []
  for (let n = 0; n < 8; n++) {
    const leaf = utf8(`leaf-${n}`)
    leaves.push(leaf)
    log.append(leaf)
    const sth = log.signHead()
    assert.ok(verifyHead(log.publicKey, sth))
    for (let i = 0; i <= n; i++) {
      const proof = log.inclusionProof(i)
      const expectedLeaf = leaves[i]
      if (expectedLeaf === undefined) throw new Error(`leaf ${i} undefined`)
      assert.ok(
        verifyInclusion(expectedLeaf, i, sth.treeSize, proof, sth.rootHash),
        `size ${n + 1} index ${i}`,
      )
    }
    assert.ok(
      !verifyInclusion(
        utf8('absent'),
        0,
        sth.treeSize,
        log.inclusionProof(0),
        sth.rootHash,
      ),
    )
  }
})

test('consistency proofs verify for every size pair up to 16', () => {
  const log = new TransparencyLog()
  const heads: SignedTreeHead[] = [log.signHead()]
  for (let n = 1; n <= 16; n++) {
    log.append(utf8(`leaf-${n}`))
    heads.push(log.signHead())
  }
  for (let oldSize = 0; oldSize <= 16; oldSize++) {
    for (let newSize = oldSize; newSize <= 16; newSize++) {
      const proof = log.consistencyProof(oldSize, newSize)
      const ok = verifyConsistency(
        headAt(heads, oldSize),
        headAt(heads, newSize),
        proof,
      )
      assert.ok(ok, `old ${oldSize} new ${newSize}`)
    }
  }
})

test('consistency proof lengths match the RFC 9162 worked example', () => {
  const log = new TransparencyLog()
  for (let n = 0; n < 7; n++) log.append(utf8(`d${n}`))
  assert.equal(log.consistencyProof(3, 7).length, 4)
  assert.equal(log.consistencyProof(4, 7).length, 1)
  assert.equal(log.consistencyProof(6, 7).length, 3)
})

test('a consistency proof across a forked branch never verifies', () => {
  const shared = 5
  const total = 11
  const logA = new TransparencyLog()
  const logB = new TransparencyLog()
  for (let n = 0; n < shared; n++) {
    const leaf = utf8(`shared-${n}`)
    logA.append(leaf)
    logB.append(leaf)
  }
  const sharedHead = logA.signHead()
  for (let n = shared; n < total; n++) {
    logA.append(utf8(`a-${n}`))
    logB.append(utf8(`b-${n}`))
  }
  const headA = logA.signHead()
  const headB = logB.signHead()
  assert.notDeepEqual(headA.rootHash, headB.rootHash)

  const proofFromA = logA.consistencyProof(shared, total)
  assert.ok(verifyConsistency(sharedHead, headA, proofFromA))
  assert.ok(!verifyConsistency(sharedHead, headB, proofFromA))

  const proofFromB = logB.consistencyProof(shared, total)
  assert.ok(verifyConsistency(sharedHead, headB, proofFromB))
  assert.ok(!verifyConsistency(sharedHead, headA, proofFromB))
})

test('a consistency proof from one tree is refused against another tree entirely', () => {
  const oldSize = 4
  const newSize = 9
  const logA = new TransparencyLog()
  const logC = new TransparencyLog()
  const headsA: SignedTreeHead[] = [logA.signHead()]
  const headsC: SignedTreeHead[] = [logC.signHead()]
  for (let n = 0; n < newSize; n++) {
    logA.append(utf8(`a-${n}`))
    logC.append(utf8(`c-${n}`))
    headsA.push(logA.signHead())
    headsC.push(logC.signHead())
  }
  const proofFromA = logA.consistencyProof(oldSize, newSize)
  const ok = verifyConsistency(
    headAt(headsC, oldSize),
    headAt(headsC, newSize),
    proofFromA,
  )
  assert.ok(!ok)
})

test('a truncated or padded consistency proof is refused', () => {
  const oldSize = 3
  const newSize = 7
  const log = new TransparencyLog()
  const heads: SignedTreeHead[] = [log.signHead()]
  for (let n = 1; n <= newSize; n++) {
    log.append(utf8(`leaf-${n}`))
    heads.push(log.signHead())
  }
  const oldHead = headAt(heads, oldSize)
  const newHead = headAt(heads, newSize)
  const proof = log.consistencyProof(oldSize, newSize)
  assert.ok(proof.length > 1)
  assert.ok(verifyConsistency(oldHead, newHead, proof))

  const truncated = proof.slice(0, -1)
  assert.ok(!verifyConsistency(oldHead, newHead, truncated))

  const padded = [...proof, randomBytes(32)]
  assert.ok(!verifyConsistency(oldHead, newHead, padded))

  assert.ok(!verifyConsistency(oldHead, newHead, []))
})

test('malformed size ordering and non-integer sizes fail closed without throwing', () => {
  const log = new TransparencyLog()
  for (let n = 0; n < 8; n++) log.append(utf8(`leaf-${n}`))
  const head = log.signHead()
  const negative = { ...head, treeSize: -1 }
  const shrunk = { ...head, treeSize: 0 }
  assert.doesNotThrow(() => verifyConsistency(negative, head, []))
  assert.ok(!verifyConsistency(negative, head, []))
  assert.doesNotThrow(() => verifyConsistency(head, shrunk, []))
  assert.ok(!verifyConsistency(head, shrunk, []))
  assert.equal(log.consistencyProof(5, 2).length, 0)

  const consistencyProofCases = [
    [0.5, 1],
    [Number.NaN, 0],
    [1.5, 10],
    [Number.POSITIVE_INFINITY, Number.NaN],
  ]
  for (const [oldSize, newSize] of consistencyProofCases) {
    assert.doesNotThrow(() => log.consistencyProof(oldSize, newSize))
    assert.equal(log.consistencyProof(oldSize, newSize).length, 0)
  }

  const sevenLeaf = new TransparencyLog()
  for (let n = 0; n < 7; n++) sevenLeaf.append(utf8(`d${n}`))
  assert.equal(sevenLeaf.consistencyProof(3, 7).length, 4)
  assert.doesNotThrow(() => sevenLeaf.consistencyProof(3, 7.5))
  assert.equal(sevenLeaf.consistencyProof(3, 7.5).length, 0)

  const verifyConsistencyCases = [
    [0.5, 8],
    [Number.NaN, 8],
    [1.5, 8],
    [8, Number.POSITIVE_INFINITY],
    [8, Number.NaN],
  ]
  for (const [oldSize, newSize] of verifyConsistencyCases) {
    const oldSth = { ...head, treeSize: oldSize }
    const newSth = { ...head, treeSize: newSize }
    assert.doesNotThrow(() => verifyConsistency(oldSth, newSth, []))
    assert.ok(!verifyConsistency(oldSth, newSth, []))
  }
})

test('equivocation needs same size, different root, both signed', () => {
  const log = new TransparencyLog()
  log.append(utf8('a'))
  const honest = log.signHead()
  const forged = log.signArbitraryHead(honest.treeSize, randomBytes(32))
  assert.notEqual(detectEquivocation(log.publicKey, honest, forged), null)
  assert.equal(detectEquivocation(log.publicKey, honest, honest), null)
  const otherSize = log.signArbitraryHead(honest.treeSize + 1, randomBytes(32))
  assert.equal(detectEquivocation(log.publicKey, honest, otherSize), null)
})

test('chain anchors commit the digest they are given and count confirmations', () => {
  const chain = new SimBitcoin()
  const log = new TransparencyLog()
  log.append(utf8('x'))
  const digest = dhash('test-sth', log.signHead().rootHash)
  const anchor = anchorHead(chain, digest)
  const block = chain.blocks[anchor.blockHeight]
  if (block === undefined) throw new Error('block undefined')
  assert.deepEqual(block.payload, digest)
  assert.deepEqual(anchor.sthHash, digest)
  assert.equal(chain.confirmations(anchor.blockHeight), 1)
  chain.mine(null)
  chain.mine(null)
  assert.equal(chain.confirmations(anchor.blockHeight), 3)
})

test('every simulated block carries an 80-byte header and strictly growing work', () => {
  const chain = new SimBitcoin()
  const genesis = chain.blocks[0]
  if (genesis === undefined) throw new Error('genesis undefined')
  const digest = dhash('test-sth', randomBytes(8))
  const anchored = chain.mine(digest)

  assert.equal(genesis.header.length, 80)
  assert.equal(anchored.header.length, 80)
  // The merkle root slot spans bytes 36..68 and must be the anchored payload.
  assert.deepEqual(anchored.header.slice(36, 68), digest)
  assert.equal(anchored.chainWork > genesis.chainWork, true)
  assert.equal(genesis.chainWork > 0n, true)
})

test('congestion difficulty doubles above baseline and is verifiable', () => {
  const policy = { dFloor: 100, baseline: 1, cap: 4, windowBlocks: 1000 }
  const schedule = [0, 1, 2, 3, 4, 5, 6].map((n) =>
    requiredDifficulty(policy, n),
  )
  assert.deepEqual(schedule, [100, 100, 200, 400, 800, 1600, 1600])
  const prev = randomBytes(32)
  const leaf = randomBytes(32)
  const stamp = chainedWork(prev, leaf, 200)
  assert.ok(verifyWork(stamp, prev, leaf, 200))
  assert.ok(!verifyWork(stamp, prev, leaf, 400))
  assert.ok(!verifyWork(stamp, randomBytes(32), leaf, 200))
  const lazy = { output: stamp.output, difficulty: 100 }
  assert.ok(!verifyWork(lazy, prev, leaf, 200))
})

// TWELFTH-REVIEW regression. `verifyInclusion` guarded only `index >= treeSize`,
// and the walk coerced through ToInt32 via `idx ^ 1` and `idx >> 1`. So
// `index - k*2^32` produced the same walk as `index` and one leaf verified
// under unboundedly many indices. The transparency report keys its dedup map on
// the raw index, so 50 aliases of one genuine unseal leaf reported as 51.
//
// Every alias below carries the REAL leaf bytes, the REAL proof and the REAL
// root. Only the lower-bound and integer tests on `index` can reject them.
test('an included leaf verifies under exactly one index', () => {
  const log = new TransparencyLog()
  const leaves = Array.from({ length: 7 }, (_, i) => utf8(`leaf-${i}`))
  for (const leaf of leaves) log.append(leaf)
  const root = log.root()

  for (const real of [0, 1, 5, 6]) {
    const proof = log.inclusionProof(real)
    assert.equal(
      verifyInclusion(leaves[real], real, 7, proof, root),
      true,
      `positive control at ${real}`,
    )
    const aliases = [
      real - 2 ** 32,
      real - 3 * 2 ** 32,
      real + 2 ** 32,
      real + 0.5,
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      -0.5,
    ]
    for (const alias of aliases) {
      assert.equal(
        verifyInclusion(leaves[real], alias, 7, proof, root),
        false,
        `index ${alias} aliased the real index ${real}`,
      )
    }
  }
})

// A NaN tree size skips the walk entirely: `while (NaN > 1)` never runs, so
// the proof-length test and the root comparison both pass on an empty proof
// against the leaf's own hash. Every other guard is inert here, which is what
// makes this the input that isolates the tree-size test.
test('a NaN tree size cannot make a leaf its own inclusion proof', () => {
  const leaf = utf8('no-tree-at-all')
  assert.equal(
    verifyInclusion(leaf, 0, Number.NaN, [], leafHash(leaf)),
    false,
    'a leaf proved inclusion in a tree that does not exist',
  )
})

// ELEVENTH-REVIEW regression. The shift loops in the consistency walk use `&`
// and `>>`, which coerce through ToInt32. At any nonzero multiple of 2^32,
// `oldSize - 1` becomes -1, `-1 & 1` is 1 and `-1 >> 1` is -1, so the loop
// never ends. A synchronous hang blocks the event loop, so the per-test timeout
// cannot fire: removing the size bound HANGS the runner rather than reddening
// this test. That is the proof, and it is the reason the bound exists.
test('a consistency proof beyond u32 is refused instead of hanging', () => {
  for (const size of [2 ** 32, 2 ** 33, 3 * 2 ** 32, Number.MAX_SAFE_INTEGER]) {
    const oldSth = head(size)
    const newSth = head(size + 1)
    assert.equal(
      verifyConsistency(oldSth, newSth, [randomBytes(32)]),
      false,
      `size ${size}`,
    )
  }
})

function head(treeSize: number) {
  return {
    treeId: 'sige-demo-log/v1',
    treeSize,
    rootHash: randomBytes(32),
    signature: randomBytes(64),
  }
}

function node(l: Uint8Array, r: Uint8Array): Uint8Array {
  return sha256(concatBytes(Uint8Array.of(1), l, r))
}

// A tree of 2^33 leaves is not constructible, but a proof for one is: index 0
// is all-left, so the root is a 33-node fold. This is the ONLY shape where the
// size bound answers alone. A random root would be refused by the hash compare,
// and a short proof by the length compare, so neither would isolate it.
test('an inclusion proof for a tree size beyond u32 is refused', () => {
  const leaf = utf8('leaf-beyond-u32')
  const size = 2 ** 33
  const proof = Array.from({ length: 33 }, (_, i) => sha256(utf8(`sib-${i}`)))
  const root = proof.reduce(
    (acc, sibling) => node(acc, sibling),
    leafHash(leaf),
  )
  assert.equal(
    verifyInclusion(leaf, 0, size, proof, root),
    false,
    'a tree size no signed head can express carried an inclusion proof',
  )
})

// THIRTEENTH-REVIEW regression. `stamp.difficulty < required` is false for NaN
// and for Infinity, so both cleared the congestion floor. `i < NaN` is then
// false, so the recomputation ran ZERO rounds and cost one sha256 against a
// required 2,000,000. Infinity cleared the floor and hung the loop instead,
// which no try and no timer recovers because it blocks the event loop.
test('a difficulty that is not a count is refused, never cheap and never a hang', () => {
  const prev = randomBytes(32)
  const leaf = randomBytes(32)
  const required = 64
  const honest = chainedWork(prev, leaf, required)
  assert.ok(verifyWork(honest, prev, leaf, required), 'positive control')

  // Each of these used to clear the floor. The output is the honest one, so
  // the recomputation and the byte compare cannot answer for the guard.
  for (const difficulty of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    64.5,
    2 ** 53,
  ]) {
    assert.equal(
      verifyWork({ output: honest.output, difficulty }, prev, leaf, required),
      false,
      `difficulty ${difficulty} cleared the floor`,
    )
  }

  // The producer side refuses by name rather than looping or silently
  // returning a stamp that cost nothing.
  for (const difficulty of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.throws(
      () => chainedWork(prev, leaf, difficulty),
      /is not a count/,
      `chainedWork accepted difficulty ${difficulty}`,
    )
  }
})

// ROW 7. The tree id is inside the head signature, so "a head from a different
// log" is a signature failure rather than a field comparison the presenter
// controls. Before this, `headMessage` covered only the size and the root, so
// one log's head verified against another log's key-and-id pairing.
test('a head is bound to the log that signed it', () => {
  const alpha = new TransparencyLog('alpha/v1')
  const beta = new TransparencyLog('beta/v1')
  alpha.append(utf8('a'))
  beta.append(utf8('a'))

  const head = alpha.signHead()
  assert.ok(verifyHead(alpha.publicKey, head), 'positive control')

  // Same size, same root, same signature, only the id relabelled. The other
  // fields are identical, so the id is the only thing that can refuse it.
  const relabelled = { ...head, treeId: 'beta/v1' }
  assert.deepEqual(relabelled.rootHash, head.rootHash)
  assert.equal(
    verifyHead(alpha.publicKey, relabelled),
    false,
    'a relabelled head verified against the log that signed the original',
  )
  assert.equal(relabelled.treeId, beta.treeId)
})
