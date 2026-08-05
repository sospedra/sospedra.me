import { hex } from '../protocol/bytes.ts'
import {
  decodeAuthorEvent,
  type GlobalEventRecordV1,
} from '../protocol/events.ts'
import type { SignedHead } from '../protocol/evidence.ts'
import { GENESIS_ROOT } from '../protocol/genesis.ts'
import { decodeLatestHead, headSigningInput } from '../protocol/head.ts'
import { decodeOpenAccount, decodeTransfer, OP } from '../protocol/ops.ts'
import { GENESIS_CHAIN, PROGRAM } from '../protocol/program.ts'
import { decodeGetBalanceBody, decodeQueryRequest } from '../protocol/query.ts'
import {
  decodeTransitionJournal,
  type TransparentTransitionProofV1,
} from '../protocol/transition.ts'
import type { CheckLog } from '../protocol/verify.ts'
import { obj, type TraceStep } from './trace.ts'

export function genesisAnchorsStep(
  label = 'genesis anchors pinned by the client',
): TraceStep {
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      obj('genesis-anchors', 'genesis-anchors', GENESIS_ROOT, {
        genesisRoot: hex(GENESIS_ROOT),
        updateProgramId: hex(PROGRAM.updateV1),
        queryProgramId: hex(PROGRAM.queryV1),
        programChainHash: hex(GENESIS_CHAIN),
      }),
    ],
  }
}

export function batchSealStep(
  proof: TransparentTransitionProofV1,
  label: string,
): TraceStep {
  const journal = decodeTransitionJournal(proof.journal)
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      {
        ...obj('batch-seal', 'transition-journal', proof.journal, {
          startRoot: hex(journal.startRoot),
          endRoot: hex(journal.endRoot),
          startSequence: journal.startSequence.toString(),
          endSequence: journal.endSequence.toString(),
          updateProgramId: hex(journal.updateProgramId),
        }),
        hash: hex(journal.batchHash),
      },
    ],
  }
}

export function accountIdFromRequest(requestBytes: Uint8Array): string {
  return decodeGetBalanceBody(decodeQueryRequest(requestBytes).body).accountId
}

export function headStatementStep(
  name: string,
  label: string,
  statement: SignedHead,
): TraceStep {
  const head = decodeLatestHead(statement.headBytes)
  return {
    actor: 'server',
    kind: 'object',
    label,
    objects: [
      {
        ...obj(name, 'latest-head', statement.headBytes, {
          sequence: head.head.sequence.toString(),
          stateRoot: hex(head.head.stateRoot),
          latestAsOfMs: head.latestAsOfMs.toString(),
          headKeyId: hex(head.headKeyId),
          signature: hex(statement.signature),
        }),
        hash: hex(headSigningInput(statement.headBytes)),
      },
    ],
  }
}

export function checkStep(check: CheckLog, who?: string): TraceStep {
  return {
    actor: 'client',
    kind: 'check',
    label: who ? `${who}: ${check.name}` : check.name,
    detail: check.skipped ? 'skipped' : undefined,
    check: { name: check.name, pass: check.pass, error: check.error },
  }
}

export function authorEventStep(
  record: GlobalEventRecordV1,
  label: string,
): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  return {
    actor: 'author',
    kind: 'object',
    label,
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}

export function balanceOpenedAuthorEventStep(
  record: GlobalEventRecordV1,
): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  const open = decodeOpenAccount(event.payload)
  return authorEventStep(
    record,
    `alice opens account ${open.accountId} with balance ${open.initialBalance}`,
  )
}

const ALICE_EVENT_DESCRIBERS: Record<number, (payload: Uint8Array) => string> =
  {
    [OP.OPEN_ACCOUNT]: (payload) =>
      `alice opens account ${decodeOpenAccount(payload).accountId}`,
    [OP.TRANSFER]: (payload) => {
      const transfer = decodeTransfer(payload)
      return `alice transfers ${transfer.amount} to ${transfer.to}`
    },
  }

function describeAliceEvent(record: GlobalEventRecordV1): string {
  const event = decodeAuthorEvent(record.authorEvent)
  return (
    ALICE_EVENT_DESCRIBERS[event.operation]?.(event.payload) ?? 'author event'
  )
}

export function describedAuthorEventStep(
  record: GlobalEventRecordV1,
): TraceStep {
  const event = decodeAuthorEvent(record.authorEvent)
  return {
    actor: 'author',
    kind: 'object',
    label: describeAliceEvent(record),
    objects: [
      {
        ...obj('author-event', 'author-event', record.authorEvent, {
          authorKeyId: hex(event.authorKeyId),
          authorSequence: event.authorSequence.toString(),
          globalSequence: record.globalSequence.toString(),
          operation: event.operation.toString(),
        }),
        hash: hex(record.eventHash),
      },
    ],
  }
}
