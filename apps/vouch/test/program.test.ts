import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hex, unhex } from '../src/protocol/bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from '../src/protocol/constants.ts'
import {
  chainNext,
  decodeManifest,
  deriveProgramId,
  deriveProgramSourceHash,
  encodeManifest,
  GENESIS_CHAIN,
  GENESIS_MIGRATION,
  manifestFor,
  PROGRAM,
  type ProgramMigrationV1,
  scenarioFixture,
  simulatedManifestFor,
} from '../src/protocol/program.ts'

test('update and query program ids are real, derived, and distinct from each other', () => {
  const update = manifestFor('update')
  const query = manifestFor('query')
  assert.equal(hex(PROGRAM.updateV1), hex(update.programId))
  assert.equal(hex(PROGRAM.queryV1), hex(query.programId))
  assert.notEqual(hex(update.programId), hex(query.programId))
})

test('update and query manifests share build-wide facts but differ in source hash', () => {
  const update = manifestFor('update')
  const query = manifestFor('query')
  assert.equal(hex(update.lockfileHash), hex(query.lockfileHash))
  assert.equal(hex(update.toolchainHash), hex(query.toolchainHash))
  assert.equal(hex(update.buildRecipeHash), hex(query.buildRecipeHash))
  assert.notEqual(hex(update.programSourceHash), hex(query.programSourceHash))
})

test('deriveProgramId is a pure, deterministic function of its four inputs', () => {
  const inputs = {
    lockfileHash: unhex('11'.repeat(32)),
    toolchainHash: unhex('22'.repeat(32)),
    buildRecipeHash: unhex('33'.repeat(32)),
    programSourceHash: unhex('44'.repeat(32)),
  }
  const a = deriveProgramId(inputs)
  const b = deriveProgramId(inputs)
  assert.equal(hex(a), hex(b))

  const changed = deriveProgramId({
    ...inputs,
    programSourceHash: unhex('55'.repeat(32)),
  })
  assert.notEqual(hex(a), hex(changed))
})

test('deriveProgramSourceHash sorts by path and is sensitive to path and content', () => {
  const fileA = { path: 'a.ts', digest: unhex('aa'.repeat(32)) }
  const fileB = { path: 'b.ts', digest: unhex('bb'.repeat(32)) }

  const forward = deriveProgramSourceHash([fileA, fileB])
  const reversedInput = deriveProgramSourceHash([fileB, fileA])
  assert.equal(hex(forward), hex(reversedInput))

  const renamed = deriveProgramSourceHash([{ ...fileA, path: 'z.ts' }, fileB])
  assert.notEqual(hex(forward), hex(renamed))

  const tampered = deriveProgramSourceHash([
    { ...fileA, digest: unhex('cc'.repeat(32)) },
    fileB,
  ])
  assert.notEqual(hex(forward), hex(tampered))
})

test('scenarioFixture ids are stable, and v2 program ids are labeled simulations, not derived ids', () => {
  assert.equal(
    hex(scenarioFixture('vouch-update-v2-simulated')),
    hex(PROGRAM.updateV2),
  )
  assert.equal(
    hex(scenarioFixture('vouch-query-v2-simulated')),
    hex(PROGRAM.queryV2),
  )
  assert.notEqual(hex(PROGRAM.updateV1), hex(PROGRAM.updateV2))
  assert.notEqual(hex(PROGRAM.queryV1), hex(PROGRAM.queryV2))
})

test('simulated manifests are labeled in-band and never collide with a real manifest', () => {
  const simulated = simulatedManifestFor('vouch-update-v2-simulated')
  const real = manifestFor('update')
  assert.notEqual(hex(simulated.programId), hex(real.programId))
  assert.ok(
    new TextDecoder()
      .decode(simulated.sourceRepository)
      .startsWith('scenario-fixture:'),
  )
})

test('chain advances deterministically and binds activation', () => {
  const base: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: ZERO32,
    activationSequence: 12n,
    governanceAuthorization: new Uint8Array(0),
  }
  const a = chainNext(GENESIS_CHAIN, base)
  const b = chainNext(GENESIS_CHAIN, { ...base, activationSequence: 13n })
  assert.notEqual(hex(a), hex(b))
})

test('decodeManifest round trips a real manifest', () => {
  const manifest = manifestFor('update')
  assert.deepEqual(decodeManifest(encodeManifest(manifest)), manifest)
})

test('decodeManifest rejects an unsupported protocol version', () => {
  const manifest = manifestFor('update')
  const forged = encodeManifest({
    ...manifest,
    protocolVersion: PROTOCOL_VERSION + 1,
  })
  assert.throws(() => decodeManifest(forged), {
    code: 'UNSUPPORTED_PROTOCOL_VERSION',
  })
})

test('decodeManifest round trips executionMode and rejects an unsupported discriminant', () => {
  const sourceManifest = manifestFor('update')
  assert.equal(sourceManifest.executionMode, 1)
  const guestManifest = { ...sourceManifest, executionMode: 2 }
  assert.deepEqual(decodeManifest(encodeManifest(guestManifest)), guestManifest)
  const forged = encodeManifest({ ...sourceManifest, executionMode: 0 })
  assert.throws(() => decodeManifest(forged), {
    code: 'MALFORMED_CANONICAL_OBJECT',
  })
})

test('chainNext binds every byte of the migration object', () => {
  const base: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: new Uint8Array(32).fill(7),
    activationSequence: 9n,
    governanceAuthorization: new Uint8Array(64).fill(3),
  }
  const chain = chainNext(GENESIS_CHAIN, base)
  const forgedAuthorization = chainNext(GENESIS_CHAIN, {
    ...base,
    governanceAuthorization: new Uint8Array(64).fill(4),
  })
  const forgedManifest = chainNext(GENESIS_CHAIN, {
    ...base,
    nextProgramManifestHash: new Uint8Array(32).fill(8),
  })
  assert.notDeepEqual(chain, forgedAuthorization)
  assert.notDeepEqual(chain, forgedManifest)
})

test('the genesis chain is the digest of the era-0 migration object', () => {
  assert.deepEqual(GENESIS_MIGRATION.nextUpdateProgramId, PROGRAM.updateV1)
  assert.equal(GENESIS_MIGRATION.activationSequence, 0n)
  assert.equal(GENESIS_MIGRATION.governanceAuthorization.length, 0)
  assert.deepEqual(GENESIS_CHAIN, chainNext(ZERO32, GENESIS_MIGRATION))
})
