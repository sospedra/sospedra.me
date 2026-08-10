export const APP_ID = 'bonfire/v0'

export const NOSTR_KIND = 21_315
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://nostr.mom',
]

export const PAD_BUCKETS = [256, 1024, 4096, 16_384] as const

export const KEEPALIVE_MS = 10_000
export const PRESENCE_MS = 15_000
export const PRESENCE_MISS = 3
export const HOST_SILENT_MS = 30_000
export const SWEEP_MS = 5_000
export const DRIFT_TOLERANCE_MS = 2_000
export const NICK_MAX = 24
