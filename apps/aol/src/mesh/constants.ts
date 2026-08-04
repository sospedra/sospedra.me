export const APP_ID = 'aol/v0'

export const ROOM_CAP = 1024
export const ACTIVE_VIEW = 8
export const PASSIVE_VIEW = 40
export const HOP_CAP = 8
export const HEARTBEAT_MS = 10_000
export const HEARTBEAT_MISS = 3
export const OFFER_REFRESH_MS = 120_000
export const VIEW_GOSSIP_MS = 30_000
export const PAYLOAD_MAX = 16_384
export const RATE_LIMIT_FRAMES = 10
export const RATE_LIMIT_WINDOW_MS = 10_000
export const SEQ_WINDOW_BACK = 64
export const SEQ_WINDOW_AHEAD = 1024
export const PAD_BUCKETS = [256, 1024, 4096, 16_384] as const
export const CLOCK_SKEW_MS = 120_000

export const NOSTR_KIND = 21_313
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://nostr.mom',
]
export const STUN_SERVERS = [
  'stun:stun.cloudflare.com:3478',
  'stun:stun.l.google.com:19302',
]

export const SEQ_EPOCH_SEC = 1_767_225_600
export const SEQ_IDLE_MS = 600_000
export const FORWARD_BUDGET_BYTES_PER_SEC = 262_144
export const SCORE_FLOOR = -50
export const OFFER_COOLDOWN_MS = 600_000
export const BUFFERED_HIGH_WATER = 1_048_576
export const DIAL_TIMEOUT_MS = 15_000
export const ICE_GATHER_TIMEOUT_MS = 5_000
