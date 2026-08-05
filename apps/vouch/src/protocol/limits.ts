export const LIMITS = {
  bytesField: 65536,
  listCount: 4096,
  payload: 4096,
  nonce: 64,
  accountId: 64,
  result: 65536,
  proofEvents: 64,
  proofAccesses: 4096,
  migrationChain: 8,
  // encodeTransferLogV1 output (4 + 32*n) must fit inside LIMITS.result (65536)
  transferLogEntries: 2047,
} as const
