import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  computeProgramManifest,
  type ProgramManifestFixture,
} from '../scripts/program-id.ts'
import { hex } from '../src/protocol/bytes.ts'
import { manifestFor, PROGRAM } from '../src/protocol/program.ts'

const FIXTURE_URL = new URL(
  '../fixtures/protocol-v1/program-manifest.json',
  import.meta.url,
)

function readCommitted(): ProgramManifestFixture {
  return JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as ProgramManifestFixture
}

test('recomputing from the checked-out source reproduces the committed content', () => {
  const recomputed = computeProgramManifest()
  const committed = readCommitted()

  assert.deepEqual(recomputed.toolchain, committed.toolchain)
  assert.deepEqual(recomputed.buildRecipe, committed.buildRecipe)
  assert.deepEqual(recomputed.lockfile, committed.lockfile)
  assert.deepEqual(recomputed.programs, committed.programs)
  assert.equal(recomputed.sourceRepository, committed.sourceRepository)
})

test('sourceCommit is either a real 40-hex-char commit or explicitly empty, never fabricated', () => {
  const recomputed = computeProgramManifest()
  assert.match(recomputed.sourceCommit, /^[0-9a-f]{40}$|^$/)
})

test('the recomputed update and query program ids match the running PROGRAM constants', () => {
  const recomputed = computeProgramManifest()
  assert.equal(hex(PROGRAM.updateV1), recomputed.programs.update.programId)
  assert.equal(hex(PROGRAM.queryV1), recomputed.programs.query.programId)
  assert.equal(
    hex(manifestFor('update').programId),
    recomputed.programs.update.programId,
  )
  assert.equal(
    hex(manifestFor('query').programId),
    recomputed.programs.query.programId,
  )
})

test('recomputation is deterministic across repeated runs in the same checkout', () => {
  const first = computeProgramManifest()
  const second = computeProgramManifest()
  assert.deepEqual(first, second)
})

test('every source file entry is a real repo-relative path with a real sha256', () => {
  const recomputed = computeProgramManifest()
  for (const kind of ['update', 'query'] as const) {
    const program = recomputed.programs[kind]
    assert.ok(
      program.sourceFiles.length > 0,
      `${kind}: expected at least one source file`,
    )
    for (const file of program.sourceFiles) {
      assert.ok(
        !file.path.startsWith('/'),
        `${kind}: ${file.path} must be repo-relative, not absolute`,
      )
      assert.match(
        file.sha256,
        /^[0-9a-f]{64}$/,
        `${kind}: ${file.path} sha256 must be a real 32-byte digest`,
      )
    }
  }
})

test('the update program pulls in every shared infrastructure file the query program uses, plus its own', () => {
  const recomputed = computeProgramManifest()
  const updatePaths = new Set(
    recomputed.programs.update.sourceFiles.map((f) => f.path),
  )
  const queryEntry = recomputed.programs.query.entryFile
  const sharedQueryPaths = recomputed.programs.query.sourceFiles
    .map((f) => f.path)
    .filter((path) => path !== queryEntry)
  for (const path of sharedQueryPaths) {
    assert.ok(updatePaths.has(path), `update set is missing ${path}`)
  }
  assert.ok(
    !updatePaths.has(queryEntry),
    'update program must not pull in the query program entry file',
  )
  assert.ok(
    recomputed.programs.update.sourceFiles.length >
      recomputed.programs.query.sourceFiles.length,
    'update program should pull in strictly more files (events, keys) than query',
  )
})
