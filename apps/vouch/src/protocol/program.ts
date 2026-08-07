import { sha256 } from '@noble/hashes/sha2.js'
import programManifestFixture from '../../fixtures/protocol-v1/program-manifest.json' with {
  type: 'json',
}
import { ascii, concat, u32be, unhex } from './bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from './constants.ts'
import { DecodeError, Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import { LIMITS } from './limits.ts'

export type ProgramKind = 'update' | 'query'

export type ProgramManifestV1 = {
  executionMode: number
  sourceRepository: Uint8Array
  sourceCommit: Uint8Array
  lockfileHash: Uint8Array
  toolchainHash: Uint8Array
  buildRecipeHash: Uint8Array
  programSourceHash: Uint8Array
  programId: Uint8Array
  protocolVersion: number
}

function requireExecutionMode(mode: number): number {
  if (mode !== 1 && mode !== 2) {
    throw new DecodeError(`executionMode: invalid discriminant ${mode}`)
  }
  return mode
}

export function encodeManifest(m: ProgramManifestV1): Uint8Array {
  const w = new Writer()
  w.u8(m.executionMode)
  w.bytes(m.sourceRepository, LIMITS.bytesField)
  w.bytes(m.sourceCommit, LIMITS.bytesField)
  w.fixed(m.lockfileHash, 32)
  w.fixed(m.toolchainHash, 32)
  w.fixed(m.buildRecipeHash, 32)
  w.fixed(m.programSourceHash, 32)
  w.fixed(m.programId, 32)
  w.u16(m.protocolVersion)
  return w.done()
}

export function decodeManifest(buf: Uint8Array): ProgramManifestV1 {
  const r = new Reader(buf)
  const executionMode = requireExecutionMode(r.u8())
  const sourceRepository = r.bytes(LIMITS.bytesField)
  const sourceCommit = r.bytes(LIMITS.bytesField)
  const lockfileHash = r.fixed(32)
  const toolchainHash = r.fixed(32)
  const buildRecipeHash = r.fixed(32)
  const programSourceHash = r.fixed(32)
  const programId = r.fixed(32)
  const protocolVersion = r.version(PROTOCOL_VERSION)
  r.finish()
  return {
    executionMode,
    sourceRepository,
    sourceCommit,
    lockfileHash,
    toolchainHash,
    buildRecipeHash,
    programSourceHash,
    programId,
    protocolVersion,
  }
}

export function manifestHash(m: ProgramManifestV1): Uint8Array {
  return hash('program-id', encodeManifest(m))
}

export function framedDigest(parts: Uint8Array[]): Uint8Array {
  const framed = parts.flatMap((part) => [u32be(part.length), part])
  return sha256(concat(...framed))
}

export type SourceFileDigest = { path: string; digest: Uint8Array }

function byPath(a: SourceFileDigest, b: SourceFileDigest): number {
  if (a.path < b.path) return -1
  if (a.path > b.path) return 1
  return 0
}

export function deriveProgramSourceHash(files: SourceFileDigest[]): Uint8Array {
  const sorted = files.toSorted(byPath)
  const parts = sorted.flatMap((file) => [ascii(file.path), file.digest])
  return framedDigest(parts)
}

export type ProgramIdInputs = {
  lockfileHash: Uint8Array
  toolchainHash: Uint8Array
  buildRecipeHash: Uint8Array
  programSourceHash: Uint8Array
}

export function deriveProgramId(inputs: ProgramIdInputs): Uint8Array {
  return hash(
    'program-id',
    inputs.lockfileHash,
    inputs.toolchainHash,
    inputs.buildRecipeHash,
    inputs.programSourceHash,
  )
}

export function scenarioFixture(label: string): Uint8Array {
  return hash('scenario-fixture', ascii(label))
}

export function simulatedManifestFor(label: string): ProgramManifestV1 {
  const field = (name: string) =>
    hash('scenario-fixture', ascii(`${label}-manifest-${name}`))
  return {
    executionMode: 1,
    sourceRepository: ascii(`scenario-fixture:${label}`),
    sourceCommit: new Uint8Array(0),
    lockfileHash: field('lockfileHash'),
    toolchainHash: field('toolchainHash'),
    buildRecipeHash: field('buildRecipeHash'),
    programSourceHash: field('programSourceHash'),
    programId: scenarioFixture(label),
    protocolVersion: PROTOCOL_VERSION,
  }
}

function programSourceHashFor(kind: ProgramKind): Uint8Array {
  const files = programManifestFixture.programs[kind].sourceFiles.map(
    (file) => ({ path: file.path, digest: unhex(file.sha256) }),
  )
  return deriveProgramSourceHash(files)
}

export function manifestFor(kind: ProgramKind): ProgramManifestV1 {
  const lockfileHash = unhex(programManifestFixture.lockfile.lockfileHash)
  const toolchainHash = unhex(programManifestFixture.toolchain.toolchainHash)
  const buildRecipeHash = unhex(
    programManifestFixture.buildRecipe.buildRecipeHash,
  )
  const programSourceHash = programSourceHashFor(kind)
  return {
    executionMode: 1,
    sourceRepository: ascii(programManifestFixture.sourceRepository),
    sourceCommit: ascii(programManifestFixture.sourceCommit),
    lockfileHash,
    toolchainHash,
    buildRecipeHash,
    programSourceHash,
    programId: deriveProgramId({
      lockfileHash,
      toolchainHash,
      buildRecipeHash,
      programSourceHash,
    }),
    protocolVersion: PROTOCOL_VERSION,
  }
}

export const PROGRAM = {
  updateV1: manifestFor('update').programId,
  updateV2: scenarioFixture('vouch-update-v2-simulated'),
  queryV1: manifestFor('query').programId,
  queryV2: scenarioFixture('vouch-query-v2-simulated'),
}

export type ProgramMigrationV1 = {
  nextUpdateProgramId: Uint8Array
  nextQueryProgramId: Uint8Array
  nextProgramManifestHash: Uint8Array
  activationSequence: bigint
  governanceAuthorization: Uint8Array
}

export function encodeMigration(m: ProgramMigrationV1): Uint8Array {
  const w = new Writer()
  w.fixed(m.nextUpdateProgramId, 32)
  w.fixed(m.nextQueryProgramId, 32)
  w.fixed(m.nextProgramManifestHash, 32)
  w.u64(m.activationSequence)
  w.bytes(m.governanceAuthorization, 256)
  return w.done()
}

export function decodeMigration(buf: Uint8Array): ProgramMigrationV1 {
  const r = new Reader(buf)
  const nextUpdateProgramId = r.fixed(32)
  const nextQueryProgramId = r.fixed(32)
  const nextProgramManifestHash = r.fixed(32)
  const activationSequence = r.u64()
  const governanceAuthorization = r.bytes(256)
  r.finish()
  return {
    nextUpdateProgramId,
    nextQueryProgramId,
    nextProgramManifestHash,
    activationSequence,
    governanceAuthorization,
  }
}

export function manifestPairHash(
  update: ProgramManifestV1,
  query: ProgramManifestV1,
): Uint8Array {
  return hash(
    'program-manifest-pair',
    encodeManifest(update),
    encodeManifest(query),
  )
}

export function migrationDigest(m: ProgramMigrationV1): Uint8Array {
  return hash('program-migration', encodeMigration(m))
}

export function chainNext(
  prev: Uint8Array,
  migration: ProgramMigrationV1,
): Uint8Array {
  return hash('program-chain', prev, migrationDigest(migration))
}

export const GENESIS_MIGRATION: ProgramMigrationV1 = {
  nextUpdateProgramId: PROGRAM.updateV1,
  nextQueryProgramId: PROGRAM.queryV1,
  nextProgramManifestHash: manifestPairHash(
    manifestFor('update'),
    manifestFor('query'),
  ),
  activationSequence: 0n,
  governanceAuthorization: new Uint8Array(0),
}

export const GENESIS_CHAIN = chainNext(ZERO32, GENESIS_MIGRATION)
