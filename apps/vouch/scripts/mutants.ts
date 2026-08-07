import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Mutant = {
  rule: string
  file: string
  find: string
  replace: string
}

const VERIFY = 'src/protocol/verify.ts'
const TRANSITION = 'src/protocol/transition.ts'

export const MUTANTS: Mutant[] = [
  {
    rule: 'receipt-key-op',
    file: VERIFY,
    find: `  if (access.op !== 1) return { error: 'INVALID_PROOF', rule: 'receipt-key-op' }`,
    replace: `  if (false) return { error: 'INVALID_PROOF', rule: 'receipt-key-op' }`,
  },
  {
    rule: 'receipt-key-target',
    file: VERIFY,
    find: `  if (!bytesEqual(access.key, expectedKey)) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-target' }
  }`,
    replace: `  if (false) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-target' }
  }`,
  },
  {
    rule: 'receipt-key-witness',
    file: VERIFY,
    find: `  if (
    !verifyWitness(receipt.stateRoot, access.key, access.value, access.witness)
  ) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-witness' }
  }`,
    replace: `  if (false) {
    return { error: 'INVALID_PROOF', rule: 'receipt-key-witness' }
  }`,
  },
  {
    rule: 'receipt-key-absent',
    file: VERIFY,
    find: `  if (access.value === null) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-absent' }
  }`,
    replace: `  if (false) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-absent' }
  }`,
  },
  {
    rule: 'receipt-key-decode',
    file: VERIFY,
    find: `  } catch {
    return { error: 'MALFORMED_CANONICAL_OBJECT', rule: 'receipt-key-decode' }
  }`,
    replace: `  } catch {
    return null
  }`,
  },
  {
    rule: 'receipt-key-status',
    file: VERIFY,
    find: `  if (decoded.status !== 1) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-status' }
  }`,
    replace: `  if (false) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-status' }
  }`,
  },
  {
    rule: 'receipt-key-since',
    file: VERIFY,
    find: `  if (decoded.sinceSequence > receipt.stateSequence) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-since' }
  }`,
    replace: `  if (false) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'receipt-key-since' }
  }`,
  },
  {
    rule: 'query-proof-decode',
    file: VERIFY,
    find: `    checks.push({
      step: 12,
      name: 'verify query proof',
      pass: false,
      error: 'INVALID_PROOF',
    })
    return {
      checks,
      ok: false,
      error: 'INVALID_PROOF',
      rule: 'query-proof-decode',
    }`,
    replace: `    checks.push({ step: 12, name: 'verify query proof', pass: true })
    return { checks, ok: true, value: undefined }`,
  },
  {
    rule: 'state-root',
    file: VERIFY,
    find: `  if (!bytesEqual(journal.stateRoot, receipt.stateRoot)) return 'state-root'`,
    replace: `  if (false) return 'state-root'`,
  },
  {
    rule: 'state-sequence',
    file: VERIFY,
    find: `  if (journal.stateSequence !== receipt.stateSequence) return 'state-sequence'`,
    replace: `  if (false) return 'state-sequence'`,
  },
  {
    rule: 'request-hash',
    file: VERIFY,
    find: `  if (!bytesEqual(journal.requestHash, receipt.requestHash))
    return 'request-hash'`,
    replace: `  if (false)
    return 'request-hash'`,
  },
  {
    rule: 'result-hash',
    file: VERIFY,
    find: `  if (!bytesEqual(journal.resultHash, receipt.resultHash)) return 'result-hash'`,
    replace: `  if (false) return 'result-hash'`,
  },
  {
    rule: 'query-program-id',
    file: VERIFY,
    find: `  if (!bytesEqual(journal.queryProgramId, receipt.queryProgramId)) {
    return 'query-program-id'
  }`,
    replace: `  if (false) {
    return 'query-program-id'
  }`,
  },
  {
    rule: 'program-chain-hash',
    file: VERIFY,
    find: `  if (!bytesEqual(journal.programChainHash, receipt.programChainHash)) {
    return 'program-chain-hash'
  }`,
    replace: `  if (false) {
    return 'program-chain-hash'
  }`,
  },
  {
    rule: 'transition-decode',
    file: VERIFY,
    find: `    return { ok: false, error: 'INVALID_PROOF', rule: 'transition-decode' }`,
    replace: `    throw new Error('transition decode failure is no longer classified')`,
  },
  {
    rule: 'continuity',
    file: VERIFY,
    find: `    if (journal.startSequence !== sequence) {
      return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
    }`,
    replace: `    if (false) {
      return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
    }`,
  },
  {
    rule: 'continuity',
    file: VERIFY,
    find: `  if (!endpointOk) {
    return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
  }`,
    replace: `  if (false) {
    return { ok: false, error: 'INVALID_PROOF', rule: 'continuity' }
  }`,
  },
  {
    rule: 'migration-missing',
    file: VERIFY,
    find: `  if (position.cursor >= migrations.length) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-missing',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-missing',
    }
  }`,
  },
  {
    rule: 'migration-decode',
    file: VERIFY,
    find: `    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-decode',
    }`,
    replace: `    return { ok: true, value: { era: nextEra, cursor: position.cursor + 1 } }`,
  },
  {
    rule: 'migration-unknown-program',
    file: VERIFY,
    find: `  if (
    !isRegistryProgramId(migration.nextUpdateProgramId) ||
    !isRegistryProgramId(migration.nextQueryProgramId)
  ) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-unknown-program',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-unknown-program',
    }
  }`,
  },
  {
    rule: 'migration-update-id',
    file: VERIFY,
    find: `  if (!bytesEqual(migration.nextUpdateProgramId, journal.updateProgramId)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-update-id',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-update-id',
    }
  }`,
  },
  {
    rule: 'migration-query-id',
    file: VERIFY,
    find: `  if (!bytesEqual(migration.nextQueryProgramId, journal.activeQueryProgramId)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-query-id',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-query-id',
    }
  }`,
  },
  {
    rule: 'migration-activation-sequence',
    file: VERIFY,
    find: `  if (!activationWithinSegment(journal, migration.activationSequence)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-activation-sequence',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-activation-sequence',
    }
  }`,
  },
  {
    rule: 'migration-chain-hash',
    file: VERIFY,
    find: `  if (!bytesEqual(expectedChainHash, journal.programChainHash)) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-chain-hash',
    }
  }`,
    replace: `  if (false) {
    return {
      ok: false,
      error: 'INVALID_PROGRAM_CHAIN',
      rule: 'migration-chain-hash',
    }
  }`,
  },
  {
    rule: 'migration-surplus',
    file: VERIFY,
    find: `  if (position.cursor !== migrations.length) return 'migration-surplus'`,
    replace: `  if (false) return 'migration-surplus'`,
  },
  {
    rule: 'final-query-program-id',
    file: VERIFY,
    find: `  if (!bytesEqual(position.era.queryProgramId, receipt.queryProgramId)) {
    return 'final-query-program-id'
  }`,
    replace: `  if (false) {
    return 'final-query-program-id'
  }`,
  },
  {
    rule: 'final-chain-hash',
    file: VERIFY,
    find: `  if (!bytesEqual(position.era.chainHash, receipt.programChainHash)) {
    return 'final-chain-hash'
  }`,
    replace: `  if (false) {
    return 'final-chain-hash'
  }`,
  },
  {
    rule: 'head-freshness',
    file: VERIFY,
    find: `  if (freshness === 'ok') return null
  if (freshness === 'STALE_HEAD' && !requireFreshHead) return null
  return { error: freshness, rule: 'head-freshness' }`,
    replace: `  return null`,
  },
  {
    rule: 'head-signature',
    file: VERIFY,
    find: `  if (!verifySig(headSigningInput(headBytes), signature, head.headKeyId)) {
    return { error: 'INVALID_SIGNATURE', rule: 'head-signature' }
  }`,
    replace: `  if (false) {
    return { error: 'INVALID_SIGNATURE', rule: 'head-signature' }
  }`,
  },
  {
    rule: 'head-key-era',
    file: VERIFY,
    find: `  if (!bytesEqual(head.headKeyId, receipt.receiptKeyId)) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'head-key-era' }
  }`,
    replace: `  if (false) {
    return { error: 'UNAUTHORIZED_KEY', rule: 'head-key-era' }
  }`,
  },
  {
    rule: 'head-sequence',
    file: VERIFY,
    find: `  if (
    head.head.sequence < receipt.stateSequence ||
    head.head.sequence < trust.highestSequence
  ) {
    return { error: 'ROLLBACK_DETECTED', rule: 'head-sequence' }
  }`,
    replace: `  if (false) {
    return { error: 'ROLLBACK_DETECTED', rule: 'head-sequence' }
  }`,
  },
  {
    rule: 'head-root',
    file: VERIFY,
    find: `  if (
    head.head.sequence === receipt.stateSequence &&
    !bytesEqual(head.head.stateRoot, receipt.stateRoot)
  ) {
    return { error: 'JOURNAL_MISMATCH', rule: 'head-root' }
  }`,
    replace: `  if (false) {
    return { error: 'JOURNAL_MISMATCH', rule: 'head-root' }
  }`,
  },
  {
    rule: 'head-absent',
    file: VERIFY,
    find: `    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      error: 'STALE_HEAD',
    })
    return { checks, ok: false, error: 'STALE_HEAD', rule: 'head-absent' }`,
    replace: `    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      skipped: true,
    })
    return { checks, ok: true, value: null }`,
  },
  {
    rule: 'head-decode',
    file: VERIFY,
    find: `    checks.push({
      step: 16,
      name: 'verify latest-head freshness',
      pass: false,
      error: 'MALFORMED_CANONICAL_OBJECT',
    })
    return {
      checks,
      ok: false,
      error: 'MALFORMED_CANONICAL_OBJECT',
      rule: 'head-decode',
    }`,
    replace: `    checks.push({ step: 16, name: 'verify latest-head freshness', pass: true })
    return { checks, ok: true, value: null }`,
  },
  {
    rule: 'unexpected',
    file: VERIFY,
    find: `    const step = checks.length + 1
    const error = STEP_PRIMARY_ERROR[step] ?? 'MALFORMED_TRANSPORT'
    checks.push({ step, name: 'unexpected internal error', pass: false, error })
    return { ok: false, error, rule: 'unexpected', checks }`,
    replace: `    throw err`,
  },
  {
    rule: 'commit-migration-role-gate',
    file: TRANSITION,
    find: `  [OP.COMMIT_MIGRATION]: [GOVERNANCE_ROLE],`,
    replace: `  [OP.COMMIT_MIGRATION]: AUTHOR_ROLES,`,
  },
  {
    rule: 'activation-boundary',
    file: TRANSITION,
    find: `  if (
    record.globalSequence > migration.activationSequence &&
    !bytesEqual(chain.updateProgramId, migration.nextUpdateProgramId)
  ) {
    throw new RuleError('era-boundary')
  }`,
    replace: `  if (false) {
    throw new RuleError('era-boundary')
  }`,
  },
]

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const COPIED = ['package.json', 'src', 'test', 'scripts', 'fixtures']

const SKIPPED_IN_SCRATCH = new Set([
  'test/mutants-table.test.ts',
  // program identity hashes repo-root files and pins source digests, so it
  // reddens on any edit, in a tree that does not carry the repo root at all
  'test/program-identity.test.ts',
])

type Manifest = { scripts: { test: string } }

function suiteFiles(): string[] {
  const raw = readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')
  const manifest = JSON.parse(raw) as Manifest
  const files = manifest.scripts.test
    .split(/\s+/)
    .filter((arg) => arg.endsWith('.test.ts') && !SKIPPED_IN_SCRATCH.has(arg))
  if (files.length === 0) {
    throw new Error(
      'mutants: the test script named no test files, node would fall back to discovery',
    )
  }
  return files
}

function stageScratch(): string {
  const scratch = mkdtempSync(join(tmpdir(), 'vouch-mutant-'))
  for (const entry of COPIED) {
    cpSync(join(PACKAGE_ROOT, entry), join(scratch, entry), { recursive: true })
  }
  symlinkSync(
    join(PACKAGE_ROOT, 'node_modules'),
    join(scratch, 'node_modules'),
    'dir',
  )
  return scratch
}

function applyMutant(scratch: string, mutant: Mutant): void {
  const target = join(scratch, mutant.file)
  const source = readFileSync(target, 'utf8')
  if (!source.includes(mutant.find)) {
    throw new Error(`${mutant.rule}: find-string absent from ${mutant.file}`)
  }
  writeFileSync(target, source.replace(mutant.find, mutant.replace))
}

type SuiteRun = { green: boolean; output: string }

function runSuite(scratch: string, files: string[]): SuiteRun {
  const run = spawnSync(process.execPath, ['--test', ...files], {
    cwd: scratch,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
  return { green: run.status === 0, output }
}

function withScratch<T>(run: (scratch: string) => T): T {
  const scratch = stageScratch()
  try {
    return run(scratch)
  } finally {
    rmSync(scratch, { force: true, recursive: true })
  }
}

function checkBaseline(files: string[]): void {
  const baseline = withScratch((scratch) => runSuite(scratch, files))
  if (baseline.green) return
  const tail = baseline.output.split('\n').slice(-30).join('\n')
  process.stderr.write(
    `baseline suite is red in the scratch tree, no mutant can run\n${tail}\n`,
  )
  process.exit(1)
}

const REPORTED_FAILURES = /^(?:ℹ|#) fail (\d+)/m

function sawFailingTest(output: string): boolean {
  const match = REPORTED_FAILURES.exec(output)
  if (!match) return false
  return Number(match[1]) > 0
}

function killed(mutant: Mutant, files: string[]): boolean {
  return withScratch((scratch) => {
    applyMutant(scratch, mutant)
    const run = runSuite(scratch, files)
    if (run.green) return false
    if (sawFailingTest(run.output)) return true
    const tail = run.output.split('\n').slice(-20).join('\n')
    throw new Error(
      `${mutant.rule}: suite exited non-zero with no failing test\n${tail}`,
    )
  })
}

type MutantOutcome = { index: number; total: number; dead: boolean }

function report(mutant: Mutant, outcome: MutantOutcome): void {
  const position = `${String(outcome.index + 1).padStart(2, '0')}/${outcome.total}`
  const label = `${position} ${mutant.rule}`
  process.stdout.write(
    `${label.padEnd(44)}${outcome.dead ? 'killed' : 'SURVIVED'}\n`,
  )
}

function main(): void {
  const filter = process.argv[2] ?? ''
  const selected = MUTANTS.filter((mutant) => mutant.rule.includes(filter))
  const files = suiteFiles()
  checkBaseline(files)

  const outcomes = selected.map((mutant, index) => {
    const dead = killed(mutant, files)
    report(mutant, { index, total: selected.length, dead })
    return dead
  })

  const dead = outcomes.filter(Boolean).length
  const survived = outcomes.length - dead
  process.stdout.write(
    `${outcomes.length} mutants, ${dead} killed, ${survived} survived\n`,
  )
  if (survived > 0) process.exit(1)
}

if (import.meta.main) main()
