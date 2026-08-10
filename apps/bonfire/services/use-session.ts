'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { randomBytes } from './mesh/bytes.ts'
import {
  APP_ID,
  DEFAULT_RELAYS,
  KEEPALIVE_MS,
  NOSTR_KIND,
  PRESENCE_MS,
  SWEEP_MS,
} from './mesh/constants.ts'
import { buildEvent } from './mesh/nostr-event.ts'
import { NostrPool, type RelayState } from './mesh/nostr-pool.ts'
import { deriveGroupKey } from './mesh/seal.ts'
import { sessionTopic } from './mesh/topics.ts'
import type { PlanMode } from './plans.ts'
import {
  createSessionLink,
  decodePayload,
  encodePayload,
  INITIAL_RUNTIME,
  INITIAL_SNAPSHOT,
  initialSeq,
  parseSessionHash,
  reduceSession,
  type SessionLink,
  type SessionPayload,
  type SessionRuntime,
  type SessionSnapshot,
  sessionHash,
} from './session.ts'
import { useInterval } from './use-interval.ts'

export type PlaybackState = {
  trackIndex: number
  positionMs: number
  playing: boolean
}

export type PlaybackSource = () => Promise<PlaybackState | null>

export type Session = {
  runtime: SessionRuntime
  shareSession: (nick: string) => void
  seat: (nick: string) => void
  rename: (nick: string) => void
  startPlan: (mode: PlanMode) => void
  finishPlan: () => void
  publishNow: () => void
  bindPlayback: (source: PlaybackSource | null) => void
}

type Transport = {
  pool: NostrPool
  key: Uint8Array
  topic: string
  signer: Uint8Array
  pubkey: string
}

type HostMarker = { nick: string; snapshot: SessionSnapshot }

const hostMarkerKey = (sessionId: string): string => `bonfire-host:${sessionId}`

const readHostMarker = (sessionId: string): HostMarker | null => {
  try {
    const raw = window.sessionStorage.getItem(hostMarkerKey(sessionId))
    return raw === null ? null : (JSON.parse(raw) as HostMarker)
  } catch {
    return null
  }
}

const persistHostMarker = (
  sessionId: string,
  nick: string,
  snapshot: SessionSnapshot,
): void => {
  window.sessionStorage.setItem(
    hostMarkerKey(sessionId),
    JSON.stringify({ nick, snapshot }),
  )
}

const selfPubkeyOf = (transport: Transport): string => {
  const probe = buildEvent({
    secret: transport.signer,
    kind: NOSTR_KIND,
    tags: [],
    content: '',
    createdAtSec: 0,
  })
  return probe.pubkey
}

export const useSession = (): Session => {
  const [runtime, dispatch] = useReducer(reduceSession, INITIAL_RUNTIME)
  const runtimeRef = useRef(runtime)
  const transportRef = useRef<Transport | null>(null)
  const sourceRef = useRef<PlaybackSource | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    runtimeRef.current = runtime
  }, [runtime])

  const publish = useCallback((payload: SessionPayload) => {
    const transport = transportRef.current
    if (!transport) return
    const event = buildEvent({
      secret: transport.signer,
      kind: NOSTR_KIND,
      tags: [['t', transport.topic]],
      content: encodePayload(transport.key, payload),
      createdAtSec: Math.floor(Date.now() / 1000),
    })
    transport.pool.publish(event)
  }, [])

  const commandState = useCallback(
    (overrides: Partial<SessionSnapshot>) => {
      const base = runtimeRef.current.snapshot ?? INITIAL_SNAPSHOT
      seqRef.current += 1
      const snapshot: SessionSnapshot = {
        ...base,
        ...overrides,
        seq: seqRef.current,
      }
      dispatch({ type: 'commanded', snapshot })
      publish({ type: 'state', ...snapshot })
      const { link, nick } = runtimeRef.current
      if (link) persistHostMarker(link.sessionId, nick, snapshot)
    },
    [publish],
  )

  const publishState = useCallback(async () => {
    const audio = (await sourceRef.current?.()) ?? null
    commandState(audio ? { ...audio, positionEpoch: Date.now() } : {})
  }, [commandState])

  const openTransport = useCallback(
    (link: SessionLink) => {
      const relayStates = new Map<string, RelayState>()
      const pool = new NostrPool({
        urls: DEFAULT_RELAYS,
        log: () => undefined,
        onState: (url, state) => {
          relayStates.set(url, state)
          const open = [...relayStates.values()].filter(
            (value) => value === 'open',
          ).length
          dispatch({ type: 'relays', open })
        },
      })
      const transport: Transport = {
        pool,
        key: deriveGroupKey(link.secret),
        topic: sessionTopic(APP_ID, link.sessionId, link.secret),
        signer: randomBytes(32),
        pubkey: '',
      }
      transport.pubkey = selfPubkeyOf(transport)
      transportRef.current = transport
      pool.start()
      pool.subscribe(transport.topic, (event) => {
        const payload = decodePayload(transport.key, event.content)
        if (payload === null) return
        const before = runtimeRef.current
        dispatch({
          type: 'received',
          payload,
          pubkey: event.pubkey,
          nowMs: Date.now(),
        })
        const isNewPeer =
          payload.type === 'presence' &&
          event.pubkey !== transport.pubkey &&
          before.peers[event.pubkey] === undefined
        if (before.phase === 'host' && isNewPeer) void publishState()
      })
      return transport
    },
    [publishState],
  )

  useEffect(() => {
    const link = parseSessionHash(window.location.hash)
    if (link === null) return
    const marker = readHostMarker(link.sessionId)
    if (marker === null) {
      dispatch({ type: 'gated', link })
    } else {
      const transport = openTransport(link)
      seqRef.current = Math.max(initialSeq(Date.now()), marker.snapshot.seq + 1)
      const snapshot = { ...marker.snapshot, seq: seqRef.current }
      dispatch({
        type: 'hosted',
        link,
        nick: marker.nick,
        selfPubkey: transport.pubkey,
        snapshot,
      })
      publish({ type: 'state', ...snapshot })
      publish({ type: 'presence', nick: marker.nick })
    }
    return () => {
      transportRef.current?.pool.stop()
      transportRef.current = null
    }
  }, [openTransport, publish])

  const shareSession = useCallback(
    (nick: string) => {
      if (runtimeRef.current.phase !== 'solo') return
      const link = createSessionLink()
      window.history.replaceState(null, '', sessionHash(link))
      const transport = openTransport(link)
      seqRef.current = initialSeq(Date.now())
      const snapshot = { ...INITIAL_SNAPSHOT, seq: seqRef.current }
      persistHostMarker(link.sessionId, nick, snapshot)
      dispatch({
        type: 'hosted',
        link,
        nick,
        selfPubkey: transport.pubkey,
        snapshot,
      })
      publish({ type: 'state', ...snapshot })
      publish({ type: 'presence', nick })
    },
    [openTransport, publish],
  )

  const seat = useCallback(
    (nick: string) => {
      const { phase, link } = runtimeRef.current
      if (phase !== 'gate' || link === null) return
      const transport = openTransport(link)
      dispatch({ type: 'seated', nick, selfPubkey: transport.pubkey })
      publish({ type: 'presence', nick })
    },
    [openTransport, publish],
  )

  const startPlan = useCallback(
    (mode: PlanMode) => {
      if (runtimeRef.current.phase !== 'host') return
      commandState({ plan: mode, planEpoch: Date.now() })
    },
    [commandState],
  )

  const finishPlan = useCallback(() => {
    if (runtimeRef.current.phase !== 'host') return
    commandState({ plan: null, planEpoch: 0 })
  }, [commandState])

  useInterval(() => {
    if (runtimeRef.current.phase === 'host') void publishState()
  }, KEEPALIVE_MS)

  useInterval(() => {
    const { phase, nick } = runtimeRef.current
    if (phase === 'host' || phase === 'seated')
      publish({ type: 'presence', nick })
  }, PRESENCE_MS)

  useInterval(() => {
    if (runtimeRef.current.phase !== 'solo')
      dispatch({ type: 'swept', nowMs: Date.now() })
  }, SWEEP_MS)

  const flushedRef = useRef(false)
  useEffect(() => {
    if (flushedRef.current || runtime.openRelays === 0) return
    const { phase, nick } = runtime
    if (phase !== 'host' && phase !== 'seated') return
    flushedRef.current = true
    if (phase === 'host') void publishState()
    publish({ type: 'presence', nick })
  }, [runtime, publish, publishState])

  useEffect(() => {
    const sayBye = () => {
      const phase = runtimeRef.current.phase
      if (phase === 'host' || phase === 'seated') publish({ type: 'bye' })
    }
    window.addEventListener('beforeunload', sayBye)
    return () => window.removeEventListener('beforeunload', sayBye)
  }, [publish])

  return {
    runtime,
    shareSession,
    seat,
    rename: useCallback(
      (nick: string) => dispatch({ type: 'renamed', nick }),
      [],
    ),
    startPlan,
    finishPlan,
    publishNow: useCallback(() => void publishState(), [publishState]),
    bindPlayback: useCallback((source: PlaybackSource | null) => {
      sourceRef.current = source
    }, []),
  }
}
