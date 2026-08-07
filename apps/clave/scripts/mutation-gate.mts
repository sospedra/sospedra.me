// Mutation gate.
//
// Each entry names one guard, a WORKING weaker version of it, and the tests
// that must go red when it is applied. A mutation that stays green means the
// guard is undefended, and the gate fails the build.
//
// Rules, each learned from a real incident on a previous project:
//   - Assert the match count. A replace that matches nothing leaves the guard
//     in place and the run looks like a pass.
//   - Restore by diff against a snapshot, never by grepping for a marker. A
//     deleted line leaves no marker.
//   - Replace with a working weaker version, not a syntax error. A compile
//     failure reddens everything and proves nothing.
//   - The weaker version must actually be weaker. A replacement that is
//     semantically identical survives every time and proves nothing, which is
//     indistinguishable from an undefended guard until you read it.
//
// Not every property is mutatable. The platform's country key set is enforced
// by the type: PublicInputs has no field for it, so a submission cannot carry
// one. There is no weaker runtime form to substitute, and the test
// 'the platform trusts its own country keys' documents the property instead.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const say = (line: string) => process.stdout.write(`${line}\n`)

type Mutation = {
  name: string
  file: string
  find: string
  replace: string
  tests: string[]
}

const ESCROW = ['test/escrow.test.ts']
const PROTOCOL = ['test/protocol.test.ts']

const MUTATIONS: Mutation[] = [
  {
    name: 'escrow:challenge-recomputed',
    file: 'src/escrow/proof.ts',
    find: '  const same = expected.every((index, i) => index === got[i])\n',
    replace: '  const same = true\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:feldman-check',
    file: 'src/escrow/proof.ts',
    find: '  if (!bytesEqual(scalarCommitment(opening.share), onPolynomial)) {\n    return `opening ${index} does not match its Feldman commitment`\n  }\n',
    replace: '  void onPolynomial\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:ciphertext-recomputation',
    file: 'src/escrow/proof.ts',
    find: '  if (\n    !bytesEqual(recomputed.u, published.u) ||\n    !bytesEqual(recomputed.v, published.v)\n  ) {\n    return `opening ${index} does not recompute the published ciphertext`\n  }\n',
    replace: '  void recomputed\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:c0-equals-hs',
    file: 'src/escrow/proof.ts',
    find: "  if (!c0 || !bytesEqual(c0, proof.hS)) {\n    return 'commitment zero is not the published hS'\n  }\n",
    replace: '  void c0\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:hs-matches-credential',
    file: 'src/escrow/proof.ts',
    find: "  if (!bytesEqual(proof.hS, expectedHS)) {\n    return 'hS does not match the value the credential proof committed to'\n  }\n",
    replace: '  void expectedHS\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:openings-below-threshold',
    file: 'src/escrow/proof.ts',
    find: "  if (p.o >= p.k) return 'o must be below k, or the openings leak the secret'\n",
    replace: '  ',
    tests: ESCROW,
  },
  {
    name: 'escrow:recovery-validates-candidates',
    file: 'src/escrow/proof.ts',
    find: '  const onPolynomial = commitmentFor(proof.commitments, index)\n  if (!bytesEqual(scalarCommitment(value), onPolynomial)) return null\n  return value\n',
    replace: '  return value\n',
    tests: ESCROW,
  },
  {
    name: 'escrow:recovery-final-check',
    file: 'src/escrow/proof.ts',
    find: '  if (!bytesEqual(scalarCommitment(secret), proof.hS)) {\n',
    replace: '  if (false) {\n',
    tests: ESCROW,
  },
  {
    name: 'relation:chip-presence',
    file: 'src/enrollment/relation.ts',
    find: "  return answered ? null : 'the chip did not answer this challenge'\n",
    replace: '  void answered\n  return null\n',
    tests: PROTOCOL,
  },
  {
    name: 'relation:seal-binding',
    file: 'src/enrollment/relation.ts',
    find: "  if (!bytesEqual(recomputed, p.sealedIdentity)) {\n    return 'the sealed bytes are not the signed identity under this key'\n  }\n",
    replace: '  void recomputed\n',
    tests: PROTOCOL,
  },
  {
    name: 'relation:country-signature',
    file: 'src/enrollment/relation.ts',
    find: "  return signed ? null : 'no trusted country key signed these data groups'\n",
    replace: '  void signed\n  return null\n',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:escrow-account-binding',
    file: 'src/protocol.ts',
    find: "  if (record.escrow.accountId !== record.accountId) {\n    return { ok: false, reason: 'escrow proof is for another account' }\n  }\n",
    replace: '  ',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:nullifier-uniqueness',
    file: 'src/protocol.ts',
    find: "  if (platform.nullifiers.has(nullifier)) {\n    return { ok: false, reason: 'this document has already enrolled' }\n  }\n",
    replace: '  ',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:request-must-be-confirmed',
    file: 'src/protocol.ts',
    find: '  const observed = await chain.observeRequests(policy.minConfirmations)\n',
    replace: '  const observed = await chain.observeRequests(0)\n',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:credential-account-binding',
    file: 'src/protocol.ts',
    find: "  if (record.statement.publicInputs.accountId !== record.accountId) {\n    return { ok: false, reason: 'credential proof is for another account' }\n  }\n",
    replace: '  ',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:reason-matches-commitment',
    file: 'src/protocol.ts',
    find: "  if (match.reasonHash !== toHex(sha256(utf8(input.reason)))) {\n    return { ok: false, reason: 'reason does not match the committed hash' }\n  }\n",
    replace: '  ',
    tests: PROTOCOL,
  },
  {
    name: 'protocol:policy-owns-disclosure-round',
    file: 'src/protocol.ts',
    find: '  const round = beacon.currentRound() + policy.disclosureDelayRounds\n',
    replace: '  const round = beacon.currentRound() + 1\n',
    tests: PROTOCOL,
  },
  {
    name: 'relation:witness-snapshot',
    file: 'src/enrollment/relation.ts',
    find: '  const w = snapshot(witness)\n',
    replace: '  const w = witness\n',
    tests: PROTOCOL,
  },
  {
    name: 'beacon:sealed-until-round',
    file: 'src/beacon/beacon.ts',
    find: '    if (this.round < capsule.round) return null\n',
    replace: '    ',
    tests: PROTOCOL,
  },
]

function testsPass(tests: string[]): boolean {
  try {
    execFileSync('node', ['--test', '--experimental-strip-types', ...tests], {
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
  const original = snapshots.get(mutation.file) ?? ''
  const count = original.split(mutation.find).length - 1
  if (count !== 1) {
    unmatched.push(`${mutation.name} (matched ${count} times)`)
    continue
  }
  writeFileSync(
    mutation.file,
    original.replace(mutation.find, mutation.replace),
  )
  const stillGreen = testsPass(mutation.tests)
  writeFileSync(mutation.file, original)
  if (stillGreen) {
    survived.push(mutation.name)
    say(`SURVIVED  ${mutation.name}`)
  } else {
    say(`killed    ${mutation.name}`)
  }
}

// Restore by content, then confirm.
for (const [file, original] of snapshots) {
  writeFileSync(file, original)
  if (readFileSync(file, 'utf8') !== original) {
    say(`RESTORE FAILED for ${file}`)
    process.exit(1)
  }
}

say('')
say(`${MUTATIONS.length} mutations, ${survived.length} survived`)
if (unmatched.length > 0) {
  say('')
  say('Patterns that did not match exactly once:')
  for (const name of unmatched) say(`  ${name}`)
}
if (survived.length > 0 || unmatched.length > 0) process.exit(1)
