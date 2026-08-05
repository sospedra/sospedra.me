import type { SignedHeadResult } from '../actors/server.ts'
import { Server } from '../actors/server.ts'
import { concat } from '../protocol/bytes.ts'
import {
  type Evidence,
  headConflict,
  type SignedHead,
} from '../protocol/evidence.ts'
import { buildGenesis, seqRecords } from '../protocol/genesis.ts'
import { encodeOpenAccount, OP } from '../protocol/ops.ts'
import { accountKey, decodeAccount, encodeAccount } from '../protocol/state.ts'
import {
  balanceOpenedAuthorEventStep,
  batchSealStep,
  genesisAnchorsStep,
  headStatementStep,
} from './helpers.ts'
import { obj, type Scenario, type Trace, type TraceStep } from './trace.ts'

const SHADOW_BALANCE_MULTIPLIER = 1_000n

function toSignedHead(result: SignedHeadResult): SignedHead {
  return { headBytes: result.headBytes, signature: result.sig }
}

function requireAccountBytes(bytes: Uint8Array | null): Uint8Array {
  if (bytes === null) throw new Error('s12: expected alice account to exist')
  return bytes
}

function evidenceStep(evidence: Evidence): TraceStep {
  return {
    actor: 'peer',
    kind: 'object',
    label: `client A and client B gossip their signed heads directly; comparing them surfaces "${evidence.detail}"`,
    objects: [
      obj('head-conflict-evidence', 'evidence', concat(...evidence.objects), {
        kind: evidence.kind,
        taxonomy: evidence.taxonomy,
        detail: evidence.detail,
        objectCount: evidence.objects.length.toString(),
      }),
    ],
  }
}

function run(): Trace {
  const world = buildGenesis()
  const server = new Server(world)

  const records = seqRecords(world, [
    [
      'alice',
      OP.OPEN_ACCOUNT,
      encodeOpenAccount({ accountId: 'alice', initialBalance: 5_000n }),
    ],
  ])
  for (const record of records) server.submit(record)
  const sealProof = server.sealBatch()

  const pinnedMs = server.clockMs
  const canonicalSignedHead = toSignedHead(server.signedHead(pinnedMs))

  const honestBalance = decodeAccount(
    requireAccountBytes(server.tree.get(accountKey('alice'))),
  ).balance
  const shadowTree = server.tree.clone()
  shadowTree.set(
    accountKey('alice'),
    encodeAccount({ balance: honestBalance * SHADOW_BALANCE_MULTIPLIER }),
  )
  server.tree = shadowTree
  const shadowSignedHead = toSignedHead(server.signedHead(pinnedMs))

  const evidence = headConflict(canonicalSignedHead, shadowSignedHead)
  if (evidence === null) {
    throw new Error('s12: expected head-conflict evidence, got null')
  }

  const steps: TraceStep[] = [
    genesisAnchorsStep(),
    ...records.map(balanceOpenedAuthorEventStep),
    batchSealStep(
      sealProof,
      "the honest server seals alice's opening balance into a transition proof",
    ),
    headStatementStep(
      'head-canonical',
      `the receipt-signing key signs a latest-head statement for client A, honestly claiming the canonical root at latestAsOfMs ${pinnedMs}`,
      canonicalSignedHead,
    ),
    headStatementStep(
      'head-shadow',
      `the same receipt-signing key also signs a second latest-head statement for client B, at the identical latestAsOfMs ${pinnedMs}, claiming a different root`,
      shadowSignedHead,
    ),
    evidenceStep(evidence),
  ]

  return {
    steps,
    checks: [],
    verdict: {
      kind: 'EVIDENCE',
      note: `the receipt-signing key signed two mutually exclusive latest-head statements for the identical latestAsOfMs ${pinnedMs}, one claiming the canonical root and one claiming a shadow root. Local verification alone cannot prevent this signer from equivocating this way, but headConflict reports "${evidence.detail}" and returns both signed statements together as portable, self-authenticating proof of the equivocation, taxonomy ${evidence.taxonomy}.`,
    },
  }
}

export const scenario: Scenario = {
  meta: {
    id: 12,
    slug: 'head-conflict-gossip',
    title: 'Gossiped head conflict evidence',
    taxonomy: 'PROVABLE_ON_RECORD',
    specRefs: ['6.2', '14.1', '14.3'],
    expected: 'EVIDENCE (head-conflict)',
  },
  run,
}
