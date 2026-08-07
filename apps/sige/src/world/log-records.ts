import type { Block } from '../core/chain.ts'
import type { SignedTreeHead } from '../core/merkle.ts'
import type {
  BitcoinAnchorV1,
  EnrollmentRecordV1,
  LogLeafV1,
  RecordHeaderV1,
  SignedTreeHeadV1,
} from './records.ts'
import {
  bitcoinAnchorV1,
  hashEnrollmentRecordV1,
  hashSignedTreeHeadV1,
  logLeafV1,
  RECORD_SCHEMA_VERSION,
  signedTreeHeadV1,
  zeroStampOutput,
} from './records.ts'

// Constructors for the §6.2.4 and §6.2.5 records the demo log emits. Kept
// apart from world.ts so the evidence producer can build them without it.

export const TREE_ID = 'sige-demo-log/v1'
export const LOG_KEY_ID = 'sige-demo-log-key/v1'
export const ANCHOR_COMMITMENT_SCHEME = 'op-return/v1'

export function recordHeader(networkId: Uint8Array): RecordHeaderV1 {
  return { schema_version: RECORD_SCHEMA_VERSION, network_id: networkId }
}

export type HeadRecordInput = {
  networkId: Uint8Array
  head: SignedTreeHead
  timestamp: number
  previous: SignedTreeHeadV1 | null
}

export function signedHeadRecord(input: HeadRecordInput): SignedTreeHeadV1 {
  const { networkId, head, timestamp, previous } = input
  return signedTreeHeadV1({
    ...recordHeader(networkId),
    tree_id: TREE_ID,
    tree_size: head.treeSize,
    root_hash: head.rootHash,
    timestamp,
    previous_tree_size: previous?.tree_size ?? null,
    previous_root_hash: previous?.root_hash ?? null,
    log_key_id: LOG_KEY_ID,
    signature: head.signature,
  })
}

export type AnchorRecordInput = {
  networkId: Uint8Array
  head: SignedTreeHeadV1
  block: Block
  confirmationPolicy: number
}

// The simulated block carries one transaction, the head commitment itself, so
// the transaction is the merkle root and the inclusion path is empty.
export function bitcoinAnchorRecord(input: AnchorRecordInput): BitcoinAnchorV1 {
  const { networkId, head, block, confirmationPolicy } = input
  return bitcoinAnchorV1({
    ...recordHeader(networkId),
    tree_id: head.tree_id,
    tree_size: head.tree_size,
    root_hash: head.root_hash,
    sth_hash: hashSignedTreeHeadV1(head),
    commitment_scheme: ANCHOR_COMMITMENT_SCHEME,
    transaction_id: block.payload ?? new Uint8Array(0),
    transaction_merkle_proof: [],
    block_header: block.header,
    block_height: block.height,
    confirmation_policy: confirmationPolicy,
    observed_chain_work: block.chainWork,
  })
}

// The ENROLLMENT_ACCEPTED leaf. It commits the hash of the exact canonical
// record that was persisted, so activation can verify what the log holds.
export function enrollmentAcceptedLeaf(input: {
  networkId: Uint8Array
  stored: EnrollmentRecordV1
  accountCommitment: Uint8Array
  createdAt: number
}): LogLeafV1 {
  return logLeafV1({
    ...recordHeader(input.networkId),
    leaf_type: 'ENROLLMENT_ACCEPTED',
    event_id: input.stored.enrollment_id,
    authorization_hash: hashEnrollmentRecordV1(input.stored),
    account_commitment: input.accountCommitment,
    case_reference_commitment: new Uint8Array(32),
    order_document_hash: new Uint8Array(32),
    ciphertext_hash: new Uint8Array(32),
    escrow_epoch: input.stored.escrow_epoch,
    issuing_role: 'operator',
    track: 'standard',
    prev_unseal_anchor_ref: null,
    congestion_difficulty: 0,
    congestion_stamp_output: zeroStampOutput(),
    unseal_detection_tag: null,
    public_disclosure_class: 'enrollment',
    created_at: input.createdAt,
    extension_commitments: [],
  })
}
