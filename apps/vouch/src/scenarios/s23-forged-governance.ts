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
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import {
  chainNext,
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
  requestHash,
} from '../protocol/query.ts'
import { decodeTransitionJournal } from '../protocol/transition.ts'
import { genesisTrust } from '../protocol/trust.ts'
import {
  accountIdFromRequest,
  authorEventStep,
  batchSealStep,
  checkStep,
  describedAuthorEventStep,
  genesisAnchorsStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const COMMIT_SEQUENCE = 1n
const ACTIVATION_SEQUENCE = COMMIT_SEQUENCE + TIMELOCK_MIGRATION_MIN
const BOUNDARY_TRANSFER_AMOUNT = 999n

const MIGRATION_MANIFEST_HASH = manifestHash(
  simulatedManifestFor('vouch-update-v2-simulated'),
)
const GOVERNANCE_AUTHORIZATION = scenarioFixture(
  'governance-authorization-v1-to-v2',
)

function flipFirstByte(bytes: Uint8Array): Uint8Array {
  const flipped = bytes.slice()
  flipped[0] ^= 1
  return flipped
}

function requireHead(latestHead: Uint8Array | null): LatestHeadV1 {
  if (latestHead === null) {
    throw new Error('s23: expected a latest-head statement')
  }
  return decodeLatestHead(latestHead)
}

function requireMigrationBytes(migrations: Uint8Array[]): Uint8Array {
  const [migrationBytes] = migrations
  if (!migrationBytes) throw new Error('s23: expected a committed migration')
  return migrationBytes
}

function balanceRequest(accountId: string): Uint8Array {
  return encodeQueryRequest({
    requestType: REQ.GET_BALANCE,
    requestVersion: 1,
    body: encodeGetBalanceBody({ accountId }),
  })
}

function queryRequestStep(
  requestBytes: Uint8Array,
  nonce: Uint8Array,
): TraceStep {
  const accountId = accountIdFromRequest(requestBytes)
  return {
    actor: 'client',
    kind: 'act',
    label: `client requests get-balance(${accountId}) with a fresh nonce, under the post-migration v2 era`,
    detail: `nonce ${hex(nonce)}`,
    objects: [
      {
        ...obj('query-request', 'query-request', requestBytes, {
          requestType: String(REQ.GET_BALANCE),
          accountId,
        }),
        hash: hex(requestHash(requestBytes)),
      },
    ],
  }
}

function committedMigrationStep(
  migration: ProgramMigrationV1,
  migrationBytes: Uint8Array,
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: `governance's real, signed commitment: activation sequence ${migration.activationSequence}, governanceAuthorization ${hex(migration.governanceAuthorization)}`,
    objects: [
      obj('committed-migration', 'program-migration', migrationBytes, {
        activationSequence: migration.activationSequence.toString(),
        governanceAuthorization: hex(migration.governanceAuthorization),
      }),
    ],
  }
}

function forgedMigrationStep(
  forged: ProgramMigrationV1,
  forgedBytes: Uint8Array,
): TraceStep {
  return {
    actor: 'attacker',
    kind: 'object',
    label: `the bundle handed to the client instead attaches a migration object with its first governanceAuthorization byte flipped to ${hex(forged.governanceAuthorization)}, every other field byte-identical to the committed migration`,
    objects: [
      obj('forged-migration', 'program-migration', forgedBytes, {
        activationSequence: forged.activationSequence.toString(),
        governanceAuthorization: hex(forged.governanceAuthorization),
      }),
    ],
  }
}

function chainMismatchStep(
  previousChainHash: Uint8Array,
  forged: ProgramMigrationV1,
  journalChainHash: Uint8Array,
): TraceStep {
  const computed = chainNext(previousChainHash, forged)
  return {
    actor: 'client',
    kind: 'object',
    label:
      "the client's migration walk recomputes chainNext(previous, migration) over the presented, forged migration object; one flipped governanceAuthorization byte changes migrationDigest, so the recomputed chain hash does not match the sealed journal's own programChainHash",
    objects: [
      obj('chain-mismatch', 'program-chain-hash', computed, {
        matchesJournal: String(hex(computed) === hex(journalChainHash)),
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
  const preMigrationProof = server.sealBatch()
  const previousChainHash = server.chainHash

  server.updateId = PROGRAM.updateV2
  const boundaryRecords = seqRecords(world, [
    [
      'alice',
      OP.TRANSFER,
      encodeTransfer({
        from: 'alice',
        to: 'bob',
        amount: BOUNDARY_TRANSFER_AMOUNT,
      }),
    ],
  ])
  for (const record of boundaryRecords) server.submit(record)
  const rolloverProof = server.sealBatch()

  const requestBytes = balanceRequest('bob')
  const trust = genesisTrust({
    protocolVersion: PROTOCOL_VERSION,
    genesisRoot: GENESIS_ROOT,
    programChainHash: GENESIS_CHAIN,
    updateProgramId: PROGRAM.updateV1,
    queryProgramId: PROGRAM.queryV1,
    keyStateHash: ZERO32,
  })
  const client = new Client(trust, 's23-forged-governance-client')
  const { nonce } = client.request(requestBytes)
  const { receiptBytes } = server.execute(requestBytes, nonce)
  const honestBundle = server.proofFor({ receiptBytes, sinceSequence: 0n })
  const honestMigrationBytes = requireMigrationBytes(honestBundle.migrations)

  const forged: ProgramMigrationV1 = {
    ...migration,
    governanceAuthorization: flipFirstByte(migration.governanceAuthorization),
  }
  const forgedMigrationBytes = encodeMigration(forged)
  const bundle: ResponseBundle = {
    ...honestBundle,
    migrations: [forgedMigrationBytes],
  }

  const head = requireHead(bundle.latestHead)
  const result = client.acceptBundle(encodeBundle(bundle), head.latestAsOfMs)
  if (result.ok) {
    throw new Error('s23: expected REJECT, got ACCEPT')
  }

  const preMigrationJournal = decodeTransitionJournal(preMigrationProof.journal)
  const rolloverJournal = decodeTransitionJournal(rolloverProof.journal)

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    authorEventStep(
      setupRecords[0],
      `governance commits a v1 -> v2 migration, activating at sequence ${migration.activationSequence}`,
    ),
    ...setupRecords.slice(1).map(describedAuthorEventStep),
    batchSealStep(
      preMigrationProof,
      `the server seals to sequence ${preMigrationJournal.endSequence}, one before activation, under v1`,
    ),
    ...boundaryRecords.map(describedAuthorEventStep),
    batchSealStep(
      rolloverProof,
      `the server honestly seals from the activation sequence under v2, reaching sequence ${rolloverJournal.endSequence}`,
    ),
    queryRequestStep(requestBytes, nonce),
    committedMigrationStep(migration, honestMigrationBytes),
    forgedMigrationStep(forged, forgedMigrationBytes),
    chainMismatchStep(
      previousChainHash,
      forged,
      rolloverJournal.programChainHash,
    ),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'REJECT',
      error: result.error,
      note: `governance's real migration commits governanceAuthorization ${hex(migration.governanceAuthorization)}, and the honest v2 rollover's own programChainHash is chainNext(previous, that migration) -- exactly the full object the chain digest covers; the bundle handed to the client instead attaches a migration object with one flipped governanceAuthorization byte (${hex(forged.governanceAuthorization)}), every other field byte-identical, so the client's walk recomputes the digest from those presented bytes, finds it disagrees with the sealed journal, and rule "${result.rule}" catches it`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 23,
    slug: 'forged-governance',
    title: 'Forged governance authorization',
    taxonomy: 'PREVENTED_BY_MATH',
    specRefs: ['16.2', '15', '17'],
    expected: 'REJECT INVALID_PROGRAM_CHAIN (migration-chain-hash)',
  },
  run,
}
