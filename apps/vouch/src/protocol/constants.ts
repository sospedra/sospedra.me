export const MAGIC = new TextEncoder().encode('VOUCH')
export const PROTOCOL_VERSION = 1
export const ZERO32 = new Uint8Array(32)
export const TIMELOCK_CONFIG_MIN = 2n
export const TIMELOCK_MIGRATION_MIN = 3n
export const FRESHNESS = { maxHeadAgeMs: 60_000n, clockSkewMs: 5_000n } as const
