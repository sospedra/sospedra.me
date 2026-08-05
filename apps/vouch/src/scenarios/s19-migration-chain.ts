import { Client } from '../actors/client.ts'
import { Server } from '../actors/server.ts'
import { encodeBundle } from '../protocol/bundle.ts'
import { hex, u64be } from '../protocol/bytes.ts'
import {
  PROTOCOL_VERSION,
  TIMELOCK_MIN,
  ZERO32,
} from '../protocol/constants.ts'
import { buildGenesis, GENESIS_ROOT, seqRecords } from '../protocol/genesis.ts'
import { decodeLatestHead, type LatestHeadV1 } from '../protocol/head.ts'
import { encodeOpenAccount, encodeTransfer, OP } from '../protocol/ops.ts'
import {
  chainNext,
  encodeMigration,
  GENESIS_CHAIN,
  manifestFor,
  manifestHash,
  PROGRAM,
  type ProgramMigrationV1,
  programId,
} from '../protocol/program.ts'
import {
  decodeBalanceResult,
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
const ACTIVATION_SEQUENCE = COMMIT_SEQUENCE + TIMELOCK_MIN
const BOUNDARY_TRANSFER_AMOUNT = 999n
const GENESIS_FEE_BP = 250n

const MIGRATION_MANIFEST_HASH = manifestHash(manifestFor('vouch-update-v2'))
const GOVERNANCE_AUTHORIZATION = programId('governance-authorization-v1-to-v2')

function floorFeeBp(amount: bigint, feeBp: bigint): bigint {
  return (amount * feeBp) / 10_000n
}

function ceilFeeBp(amount: bigint, feeBp: bigint): bigint {
  return (amount * feeBp + 9_999n) / 10_000n
}

function requireHead(latestHead: Uint8Array | null): LatestHeadV1 {
  if (latestHead === null) {
    throw new Error('s19: expected a latest-head statement')
  }
  return decodeLatestHead(latestHead)
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

function migrationCommitmentStep(
  migration: ProgramMigrationV1,
  migrationBytes: Uint8Array,
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label: `governance's committed migration: activation sequence ${migration.activationSequence}, program ids change v1 -> v2; the manifest hash and governance authorization are committed to state but not covered by the chain-hash function the client's walk checks`,
    objects: [
      obj('migration-commitment', 'program-migration', migrationBytes, {
        nextUpdateProgramId: hex(migration.nextUpdateProgramId),
        nextQueryProgramId: hex(migration.nextQueryProgramId),
        activationSequence: migration.activationSequence.toString(),
        nextProgramManifestHash: hex(migration.nextProgramManifestHash),
        manifestHashCoverage: 'committed, not covered by chainNext',
        governanceAuthorizationCoverage: 'committed, not covered by chainNext',
      }),
    ],
  }
}

function chainAdvanceStep(
  previousChainHash: Uint8Array,
  migration: ProgramMigrationV1,
  journalChainHash: Uint8Array,
): TraceStep {
  const computed = chainNext(
    previousChainHash,
    migration.nextUpdateProgramId,
    migration.nextQueryProgramId,
    migration.activationSequence,
  )
  return {
    actor: 'client',
    kind: 'object',
    label:
      "the client's migration walk recomputes chainNext(previous, v2, v2Id, activation) and finds it matches the journal's own programChainHash exactly",
    objects: [
      obj('chain-advance', 'program-chain-hash', computed, {
        matchesJournal: String(hex(computed) === hex(journalChainHash)),
      }),
    ],
  }
}

function feeCeilingStep(
  amount: bigint,
  feeBp: bigint,
  creditedBalance: bigint,
): TraceStep {
  const floor = floorFeeBp(amount, feeBp)
  const ceil = ceilFeeBp(amount, feeBp)
  const actualFee = amount - creditedBalance
  return {
    actor: 'client',
    kind: 'object',
    label: `at ${feeBp}bp on ${amount}, v1 would floor the fee to ${floor} but v2 ceils it to ${ceil}; the post-migration transfer actually charged ${actualFee}, the ceiling value, not the floor`,
    objects: [
      obj('fee-ceiling-comparison', 'fee-comparison', u64be(actualFee), {
        amount: amount.toString(),
        feeBp: feeBp.toString(),
        v1FloorFee: floor.toString(),
        v2CeilFee: ceil.toString(),
        actualFeeCharged: actualFee.toString(),
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
  const client = new Client(trust, 's19-migration-chain-client')
  const { nonce } = client.request(requestBytes)
  const { receiptBytes } = server.execute(requestBytes, nonce)
  const bundle = server.proofFor({ receiptBytes, sinceSequence: 0n })
  const head = requireHead(bundle.latestHead)
  const result = client.acceptBundle(encodeBundle(bundle), head.latestAsOfMs)
  if (!result.ok) {
    throw new Error(`s19: expected ACCEPT, got ${result.error}`)
  }

  const [migrationBytes] = bundle.migrations
  if (!migrationBytes) {
    throw new Error('s19: expected a committed migration in the bundle')
  }

  const creditedBalance = decodeBalanceResult(result.result).balance
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
      `the server seals from the activation sequence under v2; the rollover writes the new chain state, reaching sequence ${rolloverJournal.endSequence}`,
    ),
    migrationCommitmentStep(migration, migrationBytes),
    chainAdvanceStep(
      previousChainHash,
      migration,
      rolloverJournal.programChainHash,
    ),
    queryRequestStep(requestBytes, nonce),
    feeCeilingStep(BOUNDARY_TRANSFER_AMOUNT, GENESIS_FEE_BP, creditedBalance),
    ...result.checks.map((check) => checkStep(check)),
  ]

  return {
    steps,
    checks: result.checks,
    verdict: {
      kind: 'ACCEPT',
      note: `the client walks the chain across the era change: transitions are continuous from genesis, chainNext(previous, v2, v2Id, ${migration.activationSequence}) matches the sealed journal's own programChainHash, and the post-migration query proves get-balance(bob) = ${creditedBalance}, crediting the transfer at the v2 ceiling fee (${ceilFeeBp(BOUNDARY_TRANSFER_AMOUNT, GENESIS_FEE_BP)}), not the v1 floor (${floorFeeBp(BOUNDARY_TRANSFER_AMOUNT, GENESIS_FEE_BP)}) -- the migration's manifest hash and governance authorization are committed but not checked by this walk`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 19,
    slug: 'migration-chain',
    title: 'Valid v1 to v2 migration chain',
    taxonomy: 'POSSIBLE_UNDER_GOVERNANCE',
    specRefs: ['9.4', '15', '17'],
    expected: 'ACCEPT',
  },
  run,
}
