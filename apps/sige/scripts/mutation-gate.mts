// Mutation gate.
//
// The measurement this exists for: over seventeen adversarial rounds on this
// package, reading the code found almost nothing and attacking it found
// everything. Twenty-six defects were tests that passed for a reason other
// than the guard they named, and eight rounds put a new defect inside the
// previous round's fix. A green suite is not evidence here.
//
// So each entry below names ONE guard, the working weaker version of it, and
// the test that must go red when it is applied. A mutation that stays green
// means the guard is undefended and the gate fails.
//
// Rules learned the hard way, each from a real incident:
//   - Assert the match count. A replace that matches nothing leaves the guard
//     in place and the run looks like a pass (ledger D20, and again in D75).
//   - Restore by diff against a snapshot, never by grepping for a marker. A
//     deleted line leaves no marker, and a driver killed mid-run once left a
//     guard missing for two later runs (D47).
//   - Replace with a WORKING weaker version, not a syntax error. A compile
//     failure reddens everything and proves nothing.
//   - Run with SIGE_FAST=1. Without it the time-lock path runs for real and
//     slow tests time out, which reads as a defect and is not (D22).

import { execFileSync } from 'node:child_process'

import { readFileSync, writeFileSync } from 'node:fs'

function say(line: string): void {
  process.stdout.write(`${line}\n`)
}

type Mutation = {
  name: string
  file: string
  find: string
  replace: string
  tests: string[]
}

const MUTATIONS: Mutation[] = [
  {
    name: 'merkle:index-lower-bound',
    file: 'src/core/merkle.ts',
    find: '  if (!Number.isSafeInteger(index) || index < 0) return false\n',
    replace: '  ',
    tests: ['test/log.test.ts'],
  },
  {
    name: 'merkle:tree-size-bound',
    file: 'src/core/merkle.ts',
    find: '  if (!Number.isSafeInteger(treeSize) || treeSize > MAX_TREE_SIZE) return false\n',
    replace: '  if (!Number.isSafeInteger(treeSize)) return false\n',
    tests: ['test/log.test.ts'],
  },
  {
    name: 'merkle:tree-id-in-signature',
    file: 'src/core/merkle.ts',
    find: "  return dhash('tree-head', utf8(treeId), u32be(treeSize), rootHash)\n",
    replace: "  return dhash('tree-head', u32be(treeSize), rootHash)\n",
    tests: ['test/log.test.ts'],
  },
  {
    name: 'congestion:difficulty-integer',
    file: 'src/core/congestion.ts',
    find: '  if (!Number.isSafeInteger(stamp.difficulty)) return false\n',
    replace: '  ',
    tests: ['test/log.test.ts'],
  },
  {
    name: 'cbor:bigint-bound',
    file: 'src/core/cbor.ts',
    find: '  if (value.length > MAX_BIGINT_BYTES) return null\n',
    replace: '  ',
    tests: ['test/cbor.test.ts'],
  },
  {
    name: 'keyless:anchored-head-copy',
    file: 'src/world/keyless-verifier.ts',
    find: '      head: { ...head },\n',
    replace: '      head,\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:pinned-head-copy',
    file: 'src/world/keyless-verifier.ts',
    find: '  const pinnedHead = readHead(inputs.pinnedHead)\n',
    replace: '  const pinnedHead = inputs.pinnedHead\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:leaf-view-copy',
    file: 'src/world/keyless-verifier.ts',
    find: '    leaves: readLeafViews(inputs.log?.leaves ?? []),\n',
    replace: '    leaves: inputs.log?.leaves ?? [],\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:horizon-tip',
    file: 'src/world/keyless-verifier.ts',
    find: '    tipHeight: chain.tipHeight,\n',
    replace: '    tipHeight: inputs.horizon?.tipHeight ?? chain.tipHeight,\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:branch-consistency',
    file: 'src/world/keyless-verifier.ts',
    find: '    if (\n      !verifyConsistency(coreSignedTreeHead(head), pinned, [\n        ...entry.consistencyProof,\n      ])\n    ) {\n      return null\n    }\n',
    replace: '    ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:earliest-tree',
    file: 'src/world/keyless-verifier.ts',
    find: '      tree.treeSize > leafIndex && (best === null || tree.height < best)\n',
    replace:
      '      tree.treeSize > leafIndex && (best === null || tree.height > best)\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:countby-prototype',
    file: 'src/world/keyless-verifier.ts',
    find: '  const out = Object.create(null) as Record<K, number>\n',
    replace: '  const out = {} as Record<K, number>\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:chain-walk',
    file: 'src/world/keyless-verifier.ts',
    find: '    if (\n      expected === null ||\n      !bytesEqual(expected, leaf.fields.congestion_stamp_output)\n    ) {\n      breaks += 1\n    }\n',
    replace: '    ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:chain-order',
    file: 'src/world/keyless-verifier.ts',
    find: '  const ordered = [...unseals].sort((a, b) => a.view.index - b.view.index)\n',
    replace: '  const ordered = [...unseals]\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:chain-completeness',
    file: 'src/world/keyless-verifier.ts',
    find: "  if (!complete) return { verdict: 'unknown', breaks: 0 }\n",
    replace: '  ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:mismatch-bucket',
    file: 'src/world/keyless-verifier.ts',
    find: '  const mismatched = claimedUnseals.filter(\n    (leaf) =>\n      leaf.fields.leaf_type !== UNSEAL_LEAF_TYPE_FOR_TRACK[leaf.fields.track],\n  )\n',
    replace: '  const mismatched: DecodedLeaf[] = []\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'evidence:enrollment-pin',
    file: 'src/world/evidence.ts',
    find: "  if (!bytesEqual(recordHash, authorization.enrollment_record_hash)) {\n    return 'enrollment record is not the one this authorization was issued against'\n  }\n",
    replace: '  ',
    tests: ['test/evidence.test.ts', 'test/unseal-evidence.test.ts'],
  },
  {
    name: 'evidence:reviewer-signatures',
    file: 'src/world/evidence.ts',
    find: '    try {\n      return ed25519.verify(signature, message, key)\n    } catch {\n      return false\n    }\n',
    replace: '    return signature.length === 64\n',
    tests: ['test/evidence.test.ts'],
  },
  {
    name: 'evidence:closing-consistency',
    file: 'src/world/evidence.ts',
    find: "  return verifyConsistency(\n    coreSignedTreeHead(bundle.signedHead),\n    coreSignedTreeHead(bundle.closingSignedHead),\n    [...bundle.closingConsistencyProof],\n  )\n    ? null\n    : 'closing head is not a consistent extension of the unseal head'\n",
    replace: '  return null\n',
    tests: ['test/evidence.test.ts'],
  },
  {
    name: 'evidence:track-same-secret',
    file: 'src/world/evidence.ts',
    find: "  if (bytesEqual(standard.commitments.a[0], emergency.commitments.a[0])) {\n    return 'both tracks lock the same secret'\n  }\n",
    replace: '  ',
    tests: ['test/evidence.test.ts'],
  },
  {
    name: 'evidence:transcript-in-leaf',
    file: 'src/world/evidence.ts',
    find: "  if (\n    !bytesEqual(\n      closingLeaf.ceremonyTranscriptHash,\n      bundle.ceremonyTranscript.finalHash,\n    )\n  ) {\n    return 'closing leaf does not commit this ceremony transcript'\n  }\n",
    replace: '  ',
    tests: ['test/evidence.test.ts'],
  },
  {
    name: 'world:gate-record-pin',
    file: 'src/world/world.ts',
    find: "  return accepted === toHex(auth.enrollment_record_hash)\n    ? null\n    : 'authorization pins a record this enrollment never accepted'\n",
    replace: '  return null\n',
    tests: ['test/conformance.test.ts'],
  },
  {
    name: 'world:gate-expiry',
    file: 'src/world/world.ts',
    find: "  if (auth.expires_at <= world.clockMs) {\n    return 'authorization has expired'\n  }\n",
    replace: '  ',
    tests: ['test/conformance.test.ts'],
  },
  {
    name: 'world:state-copy',
    file: 'src/world/world.ts',
    find: '  state.lastStampOutput = Uint8Array.from(req.stamp.output)\n',
    replace: '  state.lastStampOutput = req.stamp.output\n',
    tests: ['test/world.test.ts'],
  },
  {
    name: 'world:duplicate-opaque',
    file: 'src/world/world.ts',
    find: "    return 'refused: the credential is already enrolled'\n",
    replace:
      "    return { error: 'ENROLLMENT_REFUSED', message: SUBMITTER_REFUSAL_MESSAGE } as never\n",
    tests: ['test/enrollment.test.ts'],
  },
  {
    name: 'keyless:entry-normalizes-head',
    file: 'src/world/keyless-verifier.ts',
    find: '  const safeHead = readHead(head)\n  if (!safeVerifyHead(verifier.logPublicKey, safeHead)) {\n',
    replace:
      '  const safeHead = head as SafeHead\n  if (!safeVerifyHead(verifier.logPublicKey, safeHead)) {\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:equivocation-normalizes',
    file: 'src/world/keyless-verifier.ts',
    find: '  for (const head of readHeads(heads)) {\n',
    replace: '  for (const head of heads as readonly SafeHead[]) {\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:proven-leaves-normalizes',
    file: 'src/world/keyless-verifier.ts',
    find: '  const safeHead = readHead(head)\n  return safeVerifyHead(verifier.logPublicKey, safeHead)\n',
    replace:
      '  const safeHead = head as SafeHead\n  return safeVerifyHead(verifier.logPublicKey, safeHead)\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:witness-positional',
    file: 'src/core/merkle.ts',
    find: '    const key = policy.keys[i]\n    if (key === undefined) return false\n',
    replace:
      '    const key = policy.keys.find((candidate) => {\n      try {\n        return ed25519.verify(signature, message, candidate)\n      } catch {\n        return false\n      }\n    })\n    if (key === undefined) return false\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:witness-absent-is-null',
    file: 'src/world/keyless-verifier.ts',
    find: '  if (policy === null) return { count: null, ok: false }\n',
    replace: '  if (policy === null) return { count: 0, ok: true }\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:witness-threshold',
    file: 'src/world/keyless-verifier.ts',
    find: '    return { count, ok: count >= policy.threshold }\n',
    replace: '    return { count, ok: count >= 0 }\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:heartbeat-never-is-breach',
    file: 'src/world/keyless-verifier.ts',
    find: '    return { heartbeatGapBlocks: null, heartbeatBreached: true }\n',
    replace:
      '    return { heartbeatGapBlocks: null, heartbeatBreached: false }\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'world:heartbeat-names-tip',
    file: 'src/world/log-records.ts',
    find: '    prev_unseal_anchor_ref: input.tipHeight,\n',
    replace: '    prev_unseal_anchor_ref: 0,\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:cosign-domain-tag',
    file: 'src/core/merkle.ts',
    find: "    'tree-head-cosign',\n",
    replace: "    'tree-head',\n",
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:witness-memory',
    file: 'src/core/merkle.ts',
    find: '    if (!verifyConsistency(previous, head, consistencyProof)) return null\n',
    replace: '    if (previous === head) return null\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:cosign-count-bound',
    file: 'src/core/merkle.ts',
    find: '  if (cosigned.cosignatures.length > policy.keys.length) return 0\n',
    replace: '  ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:policy-duplicate-key',
    file: 'src/core/merkle.ts',
    find: "    if (seen.has(hex)) return 'a witness key appears twice in the roster'\n",
    replace: '    ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:policy-self-witness',
    file: 'src/core/merkle.ts',
    find: "    if (bytesEqual(key, logPublicKey)) return 'the log witnesses itself'\n",
    replace: '    ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:policy-threshold-floor',
    file: 'src/core/merkle.ts',
    find: "  if (policy.threshold < 1) return 'threshold must be at least one witness'\n",
    replace: '  ',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'merkle:serve-proof-copy',
    file: 'src/core/merkle.ts',
    find: '        const sibl = level[idx ^ 1]\n        if (sibl !== undefined) path.push(Uint8Array.from(sibl))\n',
    replace:
      '        const sibl = level[idx ^ 1]\n        if (sibl !== undefined) path.push(sibl)\n',
    tests: ['test/log.test.ts'],
  },
  {
    name: 'keyless:heartbeat-tip-hash',
    file: 'src/world/keyless-verifier.ts',
    find: '  return bytesEqual(hash, leaf.fields.order_document_hash) ? height : null\n',
    replace: '  return height\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:heartbeat-worst-gap',
    file: 'src/world/keyless-verifier.ts',
    find: '  const worst = heights.reduce<number>(\n    (gap, height, i) => Math.max(gap, height - (heights[i - 1] ?? height)),\n    chain.tipHeight - (heights[heights.length - 1] ?? 0),\n  )\n',
    replace:
      '  const worst = chain.tipHeight - (heights[heights.length - 1] ?? 0)\n',
    tests: ['test/keyless.test.ts'],
  },
  {
    name: 'keyless:unsigned-head-unwitnessed',
    file: 'src/world/keyless-verifier.ts',
    find: '      witnessCount: null,\n      witnessed: false,\n',
    replace:
      '      witnessCount: witness.count,\n      witnessed: witness.ok,\n',
    tests: ['test/keyless.test.ts'],
  },
]

function runTests(tests: string[]): boolean {
  try {
    execFileSync('node', ['--test', '--experimental-strip-types', ...tests], {
      env: { ...process.env, SIGE_FAST: '1' },
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}

const snapshots = new Map<string, string>()
for (const mutation of MUTATIONS) {
  if (!snapshots.has(mutation.file)) {
    snapshots.set(mutation.file, readFileSync(mutation.file, 'utf8'))
  }
}

const survived: string[] = []
const unmatched: string[] = []

for (const mutation of MUTATIONS) {
  const original = snapshots.get(mutation.file) as string
  const occurrences = original.split(mutation.find).length - 1
  if (occurrences !== 1) {
    unmatched.push(`${mutation.name} (matched ${occurrences} times)`)
    continue
  }
  writeFileSync(
    mutation.file,
    original.replace(mutation.find, mutation.replace),
  )
  const stillGreen = runTests(mutation.tests)
  writeFileSync(mutation.file, original)
  if (stillGreen) survived.push(mutation.name)
  say(`${stillGreen ? 'SURVIVED' : 'killed  '}  ${mutation.name}`)
}

// Restore by content, then prove it, per D47.
for (const [file, original] of snapshots) {
  writeFileSync(file, original)
  if (readFileSync(file, 'utf8') !== original) {
    say(`RESTORE FAILED: ${file}`)
    process.exit(2)
  }
}

say(`\n${MUTATIONS.length} mutations, ${survived.length} survived`)
if (unmatched.length > 0) {
  say('\nPatterns that did not match exactly once:')
  for (const name of unmatched) say(`  ${name}`)
}
if (survived.length > 0) {
  say('\nGuards with no test behind them:')
  for (const name of survived) say(`  ${name}`)
}
if (survived.length > 0 || unmatched.length > 0) process.exit(1)
