import { randomBytes, toHex } from '../mesh/bytes.ts'
import { NOSTR_KIND } from '../mesh/constants.ts'
import { type NostrEvent, topicOf, verifyEvent } from '../mesh/nostr-event.ts'

export type RelayState = 'connecting' | 'open' | 'closed'

type PoolDeps = {
  urls: string[]
  log(line: string): void
  onState(url: string, state: RelayState): void
}

type Subscription = {
  id: string
  topic: string
  onEvent(event: NostrEvent): void
}

const BACKOFF_START_MS = 1000
const BACKOFF_CAP_MS = 30_000
const SEEN_CAP = 512

export class NostrPool {
  private readonly deps: PoolDeps
  private readonly sockets = new Map<string, WebSocket>()
  private readonly backoff = new Map<string, number>()
  private subscription: Subscription | null = null
  private readonly seenIds = new Set<string>()
  private readonly seenQueue: string[] = []
  private stopped = false

  constructor(deps: PoolDeps) {
    this.deps = deps
  }

  start(): void {
    for (const url of this.deps.urls) this.connect(url)
  }

  subscribe(topic: string, onEvent: (event: NostrEvent) => void): void {
    this.subscription = { id: `aol-${toHex(randomBytes(4))}`, topic, onEvent }
    for (const socket of this.openSockets()) this.sendReq(socket)
  }

  publish(event: NostrEvent): number {
    const payload = JSON.stringify(['EVENT', event])
    const sockets = this.openSockets()
    for (const socket of sockets) socket.send(payload)
    return sockets.length
  }

  stop(): void {
    this.stopped = true
    for (const socket of this.sockets.values()) socket.close()
    this.sockets.clear()
  }

  private openSockets(): WebSocket[] {
    return [...this.sockets.values()].filter(
      (socket) => socket.readyState === WebSocket.OPEN,
    )
  }

  private connect(url: string): void {
    if (this.stopped) return
    this.deps.onState(url, 'connecting')
    const socket = new WebSocket(url)
    this.sockets.set(url, socket)
    socket.addEventListener('open', () => {
      this.backoff.set(url, BACKOFF_START_MS)
      this.deps.onState(url, 'open')
      this.sendReq(socket)
    })
    socket.addEventListener('message', (event) => {
      this.handleMessage(String(event.data))
    })
    socket.addEventListener('close', () => this.scheduleReconnect(url))
    socket.addEventListener('error', () => socket.close())
  }

  private scheduleReconnect(url: string): void {
    this.deps.onState(url, 'closed')
    if (this.stopped) return
    const wait = this.backoff.get(url) ?? BACKOFF_START_MS
    this.backoff.set(url, Math.min(wait * 2, BACKOFF_CAP_MS))
    setTimeout(() => this.connect(url), wait)
  }

  private sendReq(socket: WebSocket): void {
    if (this.subscription === null) return
    const filter = {
      kinds: [NOSTR_KIND],
      '#t': [this.subscription.topic],
      since: Math.floor(Date.now() / 1000) - 180,
    }
    socket.send(JSON.stringify(['REQ', this.subscription.id, filter]))
  }

  private handleMessage(data: string): void {
    const parsed = parseRelayMessage(data)
    if (parsed === null) return
    if (parsed[0] === 'NOTICE') {
      this.deps.log(`relay notice: ${String(parsed[1]).slice(0, 120)}`)
      return
    }
    if (parsed[0] === 'OK' && parsed[2] === false) {
      this.deps.log(`relay rejected event: ${String(parsed[3]).slice(0, 120)}`)
      return
    }
    if (parsed[0] === 'EVENT') this.handleEvent(parsed[2])
  }

  private handleEvent(raw: unknown): void {
    const subscription = this.subscription
    if (subscription === null) return
    const event = verifyEvent(raw)
    if (event === null || topicOf(event) !== subscription.topic) return
    if (this.seenIds.has(event.id)) return
    this.remember(event.id)
    subscription.onEvent(event)
  }

  private remember(id: string): void {
    this.seenIds.add(id)
    this.seenQueue.push(id)
    if (this.seenQueue.length <= SEEN_CAP) return
    const oldest = this.seenQueue.shift()
    if (oldest !== undefined) this.seenIds.delete(oldest)
  }
}

const parseRelayMessage = (data: string): unknown[] | null => {
  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
