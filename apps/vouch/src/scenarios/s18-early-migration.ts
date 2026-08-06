import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle, type ResponseBundle } from '../protocol/bundle.ts'
import { hex } from '../protocol/bytes.ts'
import {
  PROTOCOL_VERSION,
  TIMELOCK_MIGRATION_MIN,
  ZERO32,
} from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead, type LatestHeadV1 } from '../protocol/head.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import {
  decodeMigration,
  encodeMigration,
  GENESIS_CHAIN,
  manifestHash,
  PROGRAM,
  type ProgramMigrationV1,
  scenarioFixture,
  simulatedManifestFor,
} from '../protocol/program.ts'
import {
  encodeGetBalanceBody,
  encodeQueryRequest,
  REQ,
} from '../protocol/query.ts'
import { decodeTransitionJournal } from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import {
  authorEventStep,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
} from './helpers.ts'
import type { Actor } from './trace.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const COMMIT_SEQUENCE = 1n
const ACTIVATION_SEQUENCE = COMMIT_SEQUENCE + TIMELOCK_MIGRATION_MIN
const CLAIMED_ACTIVATION_SEQUENCE = ACTIVATION_SEQUENCE - 1n

const MIGRATION_MANIFEST_HASH = manifestHash(
  simulatedManifestFor('vouch-update-v2-simulated'),
)
const GOVERNANCE_AUTHORIZATION = scenarioFixture(
  'governance-authorization-v1-to-v2',
)

function requireHead(latestHead: Uint8Array | null): LatestHeadV1 {
  if (latestHead === null) {
    throw new Error('s18: expected a latest-head statement')
  }
  return decodeLatestHead(latestHead)
}

function requireMigrationBytes(migrations: Uint8Array[]): Uint8Array {
  const [migrationBytes] = migrations
  if (!migrationBytes) throw new Error('s18: expected a committed migration')
  return migrationBytes
}

type MigrationDetailInput = {
  name: string
  actor: Actor
  label: string
  migration: ProgramMigrationV1
  migrationBytes: Uint8Array
}

function migrationDetailStep(input: MigrationDetailInput): TraceStep {
  const { name, actor, label, migration, migrationBytes } = input
  return {
    actor,
    kind: 'object',
    label,
    objects: [
      obj(name, 'program-migration', migrationBytes, {
        nextUpdateProgramId: hex(migration.nextUpdateProgramId),
        nextQueryProgramId: hex(migration.nextQueryProgramId),
        activationSequence: migration.activationSequence.toString(),
      }),
    ],
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const migration: ProgramMigrationV1 = {
    nextUpdateProgramId: PROGRAM.updateV2,
    nextQueryProgramId: PROGRAM.queryV2,
    nextProgramManifestHash: MIGRATION_MANIFEST_HASH,
    activationSequence: ACTIVATION_SEQUENCE,
    governanceAuthorization: GOVERNANCE_AUTHORIZATION,
  }

  const setupRecords = seqRecords(world, [
    ['governance', OP.COMMIT_MIGRATION, encodeMigration(migration)],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 10_000n }),
    ],
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'bob', initialBalance: 0n }),
    ],
  ])
  for (const record of setupRecords) server.submit(record)
  const setupProof = server.sealBatch()

  server.updateId = PROGRAM.updateV2
  const boundaryRecords = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'carol', initialBalance: 0n }),
    ],
  ])
  for (const record of boundaryRecords) server.submit(record)
  const boundaryProof = server.sealBatch()

  const requestBytes = encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId: 'alice' }),
  })
  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's18-early-migration-client')
  const { nonce } = client.request(requestBytes)
  const { receiptBytes } = server.execute(requestBytes, nonce)
  const honestBundle = server.proofFor({ receiptBytes, sinceSequence: 0n })

  const committedMigrationBytes = requireMigrationBytes(honestBundle.migrations)
  const committedMigration = decodeMigration(committedMigrationBytes)
  const claimedMigration: ProgramMigrationV1 = {
    ...committedMigration,
    activationSequence: CLAIMED_ACTIVATION_SEQUENCE,
  }
  const claimedMigrationBytes = encodeMigration(claimedMigration)
  const bundle: ResponseBundle = {
    ...honestBundle,
    migrations: [claimedMigrationBytes],
  }

  const head = requireHead(bundle.latestHead)
  const result = client.acceptBundle(encodeBundle(bundle), head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s18: expected REJECT, got ACCEPT')
  }

  const setupJournal = decodeTransitionJournal(setupProof.journal)
  const boundaryJournal = decodeTransitionJournal(boundaryProof.journal)

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    authorEventStep(
      setupRecords[0],
      `governance commits a v1 -> v2 program migration, activating at sequence ${migration.activationSequence}`,
    ),
    ...setupRecords.slice(1).map(describedAuthorEventStep),
    batchSealStep(
      setupProof,
      `the honest server seals the setup batch under v1, reaching sequence ${setupJournal.endSequence}`,
    ),
    ...boundaryRecords.map(describedAuthorEventStep),
    batchSealStep(
      boundaryProof,
      `the honest server seals the boundary record under v2; the rollover fires exactly at the committed activation sequence ${migration.activationSequence}, reaching sequence ${boundaryJournal.endSequence}`,
    ),
    migrationDetailStep({
      name: 'committed-migration',
      actor: 'server',
      label: `governance's real, signed commitment: activation sequence ${committedMigration.activationSequence}`,
      migration: committedMigration,
      migrationBytes: committedMigrationBytes,
    }),
    migrationDetailStep({
      name: 'attached-migration',
      actor: 'attacker',
      label: `the bundle instead attaches a migration object claiming activation sequence ${claimedMigration.activationSequence}, one sequence before the segment's own start`,
      migration: claimedMigration,
      migrationBytes: claimedMigrationBytes,
    }),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `governance committed the migration with activation sequence ${migration.activationSequence}, and the transition itself honestly rolls over exactly there; the bundle handed to the client instead attaches a migration object claiming activation sequence ${claimedMigration.activationSequence}, one sequence before the segment's own start -- the client's migration walk checks the claimed activation against the segment's own sequence range and finds it does not fit, so rule "${result.rule}" catches the disagreement at step ${result.checks.length}`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 18,
    slug: 'early-migration',
    title: 'Rejected early era rollover',
    taxonomy: 'POSSIBLE_UNDER_GOVERNANCE',
    specRefs: ['16.2', '15', '17'],
    expected: 'REJECT INVALID_PROGRAM_CHAIN (migration-activation-sequence)',
  },
  run,
}
