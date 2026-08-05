import { ascii, u64be } from './bytes.ts'
import { PROTOCOL_VERSION, ZERO32 } from './constants.ts'
import { Reader, Writer } from './encode.ts'
import { hash } from './hash.ts'
import { LIMITS } from './limits.ts'

export function programId(name: string): Uint8Array {
  return hash('program-id', ascii(name))
}

export const PROGRAM = {
  updateV1: programId('vouch-update-v1'),
  updateV2: programId('vouch-update-v2'),
  queryV1: programId('vouch-query-v1'),
  queryV2: programId('vouch-query-v2'),
}

export type ProgramManifestV1 = {
  sourceRepository: Uint8Array
  sourceCommit: Uint8Array
  cargoLockHash: Uint8Array
  rustToolchainHash: Uint8Array
  buildRecipeHash: Uint8Array
  guestBinaryHash: Uint8Array
  programId: Uint8Array
  protocolVersion: number
}

export function encodeManifest(m: ProgramManifestV1): Uint8Array {
  const w = new Writer()
  w.bytes(m.sourceRepository, LIMITS.bytesField)
  w.bytes(m.sourceCommit, LIMITS.bytesField)
  w.fixed(m.cargoLockHash, 32)
  w.fixed(m.rustToolchainHash, 32)
  w.fixed(m.buildRecipeHash, 32)
  w.fixed(m.guestBinaryHash, 32)
  w.fixed(m.programId, 32)
  w.u16(m.protocolVersion)
  return w.done()
}

export function decodeManifest(buf: Uint8Array): ProgramManifestV1 {
  const r = new Reader(buf)
  const sourceRepository = r.bytes(LIMITS.bytesField)
  const sourceCommit = r.bytes(LIMITS.bytesField)
  const cargoLockHash = r.fixed(32)
  const rustToolchainHash = r.fixed(32)
  const buildRecipeHash = r.fixed(32)
  const guestBinaryHash = r.fixed(32)
  const programIdField = r.fixed(32)
  const protocolVersion = r.version(PROTOCOL_VERSION)
  r.finish()
  return {
    sourceRepository,
    sourceCommit,
    cargoLockHash,
    rustToolchainHash,
    buildRecipeHash,
    guestBinaryHash,
    programId: programIdField,
    protocolVersion,
  }
}

export function manifestHash(m: ProgramManifestV1): Uint8Array {
  return hash('program-id', encodeManifest(m))
}

export function manifestFor(name: string): ProgramManifestV1 {
  return {
    sourceRepository: hash(
      'program-id',
      ascii(`${name}-manifest-sourceRepository`),
    ),
    sourceCommit: hash('program-id', ascii(`${name}-manifest-sourceCommit`)),
    cargoLockHash: hash('program-id', ascii(`${name}-manifest-cargoLockHash`)),
    rustToolchainHash: hash(
      'program-id',
      ascii(`${name}-manifest-rustToolchainHash`),
    ),
    buildRecipeHash: hash(
      'program-id',
      ascii(`${name}-manifest-buildRecipeHash`),
    ),
    guestBinaryHash: hash(
      'program-id',
      ascii(`${name}-manifest-guestBinaryHash`),
    ),
    programId: programId(name),
    protocolVersion: 1,
  }
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

export function chainNext(
  prev: Uint8Array,
  updateId: Uint8Array,
  queryId: Uint8Array,
  activationSequence: bigint,
): Uint8Array {
  return hash(
    'program-chain',
    prev,
    updateId,
    queryId,
    u64be(activationSequence),
  )
}

export const GENESIS_CHAIN = chainNext(
  ZERO32,
  PROGRAM.updateV1,
  PROGRAM.queryV1,
  0n,
)
