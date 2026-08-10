import '98.css'
import './style.css'
import { pulseHaptic } from './haptics.ts'
import { isHexOfBytes, randomBytes, toHex } from './mesh/bytes.ts'
import { DEFAULT_RELAYS } from './mesh/constants.ts'
import { isValidNick, NICK_MAX } from './mesh/messages.ts'
import { kvGet, kvPut } from './platform/idb.ts'
import { loadStoredIdentity } from './platform/identity-store.ts'
import { NostrPool } from './platform/nostr-pool.ts'
import { Room, type RoomEvent } from './platform/room.ts'
import { awaitTabOwnership, claimTabOwnership } from './platform/tab-owner.ts'
import { mountStandby, mountUi } from './ui.ts'

const NICK_KEY = 'nickname'
const ROOMS_KEY = 'rooms'
const ACTIVE_KEY = 'active-room'
const NOTIFY_KEY = 'notify-pref'
const APP_LOCK = 'irc:app'
const ROOM_ID_MAX = 32
const SECRET_MAX = 64
const EJECTED_MAX = 256

type StoredRoom = { roomId: string; topicSecret: string; ejected?: string[] }

const freshRoom = (): StoredRoom => ({
  roomId: toHex(randomBytes(4)),
  topicSecret: toHex(randomBytes(16)),
})

const isEjectedList = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.length <= EJECTED_MAX &&
    value.every((entry) => isHexOfBytes(entry, 32)))

const isStoredRoom = (value: unknown): value is StoredRoom => {
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.roomId === 'string' &&
    record.roomId.length > 0 &&
    record.roomId.length <= ROOM_ID_MAX &&
    typeof record.topicSecret === 'string' &&
    record.topicSecret.length > 0 &&
    record.topicSecret.length <= SECRET_MAX &&
    isEjectedList(record.ejected)
  )
}

const roomFromHash = (): StoredRoom | null => {
  const params = new URLSearchParams(location.hash.slice(1))
  const candidate = { roomId: params.get('r'), topicSecret: params.get('s') }
  return isStoredRoom(candidate) ? (candidate as StoredRoom) : null
}

const restoreRooms = async (
  joinRoom: (spec: StoredRoom) => void,
  roomIds: () => string[],
): Promise<string> => {
  const stored = ((await kvGet<unknown[]>(ROOMS_KEY)) ?? []).filter(
    isStoredRoom,
  )
  const fromHash = roomFromHash()
  for (const spec of stored) joinRoom(spec)
  if (fromHash !== null) joinRoom(fromHash)
  if (roomIds().length === 0) joinRoom(freshRoom())
  if (fromHash !== null) return fromHash.roomId
  const storedActive = await kvGet<string>(ACTIVE_KEY)
  if (storedActive !== undefined && roomIds().includes(storedActive))
    return storedActive
  return roomIds()[0]
}

const boot = async (): Promise<void> => {
  const root = document.querySelector('#app')
  if (!(root instanceof HTMLElement)) return

  const owner = await claimTabOwnership(APP_LOCK)
  if (!owner) {
    mountStandby(root)
    await awaitTabOwnership(APP_LOCK)
    location.reload()
    return
  }

  const ui = mountUi(root)
  const identity = await loadStoredIdentity()
  const storedNick = await kvGet<string>(NICK_KEY)
  let nick = storedNick ?? `guest-${identity.peerIdHex.slice(0, 4)}`
  ui.setIdentity(identity.peerIdHex)
  ui.setNick(nick)

  const pool = new NostrPool({
    urls: DEFAULT_RELAYS,
    log: (line) => ui.log(line),
    onState: (url, state) => ui.setRelay(url, state),
  })
  pool.start()

  const rooms = new Map<
    string,
    { secret: string; room: Room; ejected: string[] }
  >()
  let activeId: string | null = null
  let notifyOn = (await kvGet<string>(NOTIFY_KEY)) === 'on'

  const canNotify = (): boolean =>
    'Notification' in window && Notification.permission === 'granted'

  const maybeNotify = (
    roomId: string,
    event: { nick: string; text: string; self: boolean },
  ): void => {
    if (event.self || !notifyOn || !canNotify() || !document.hidden) return
    const notification = new Notification(`irc — #${roomId}`, {
      body: `<${event.nick}> ${event.text}`,
      tag: `irc-${roomId}`,
    })
    notification.onclick = () => {
      window.focus()
      setActive(roomId)
      notification.close()
    }
  }

  const persistRooms = (): void => {
    const list = [...rooms.entries()].map(([roomId, entry]) => ({
      roomId,
      topicSecret: entry.secret,
      ejected: entry.ejected,
    }))
    void kvPut(ROOMS_KEY, list)
  }

  const dispatch = (roomId: string, event: RoomEvent): void => {
    switch (event.kind) {
      case 'chat': {
        ui.appendChat(roomId, event)
        maybeNotify(roomId, event)
        return
      }
      case 'presence': {
        ui.appendPresence(roomId, event)
        return
      }
      case 'system': {
        ui.appendSystem(roomId, event.line, event.command)
        return
      }
      case 'ejected': {
        const entry = rooms.get(roomId)
        if (entry === undefined || entry.ejected.includes(event.hex)) return
        entry.ejected.push(event.hex)
        persistRooms()
        return
      }
      case 'peers': {
        ui.setPeers(roomId, event.active, event.passive)
        return
      }
      case 'log': {
        ui.log(`#${roomId} ${event.line}`)
        return
      }
    }
  }

  const joinRoom = (spec: StoredRoom): void => {
    if (rooms.has(spec.roomId)) return
    const ejected = spec.ejected ?? []
    const room = new Room({
      identity,
      roomId: spec.roomId,
      topicSecret: spec.topicSecret,
      nick,
      ejected,
      pool,
      onEvent: (event) => dispatch(spec.roomId, event),
    })
    rooms.set(spec.roomId, { secret: spec.topicSecret, room, ejected })
    ui.addRoom(spec.roomId)
    room.join()
    persistRooms()
  }

  const writeHash = (roomId: string): void => {
    const secret = rooms.get(roomId)?.secret
    if (secret === undefined) return
    history.replaceState(null, '', `#r=${roomId}&s=${secret}`)
  }

  const setActive = (roomId: string): void => {
    if (!rooms.has(roomId)) return
    activeId = roomId
    ui.setActiveRoom(roomId)
    writeHash(roomId)
    void kvPut(ACTIVE_KEY, roomId)
  }

  const closeRoom = (roomId: string): void => {
    const entry = rooms.get(roomId)
    if (entry === undefined) return
    const sure = window.confirm(
      `leave #${roomId}? without the invite link you cannot come back.`,
    )
    if (!sure) return
    entry.room.leave()
    rooms.delete(roomId)
    ui.removeRoom(roomId)
    persistRooms()
    ui.log(`#${roomId} closed`)
    if (activeId !== roomId) return
    const next = [...rooms.keys()][0]
    if (next !== undefined) {
      setActive(next)
      return
    }
    const fresh = freshRoom()
    joinRoom(fresh)
    setActive(fresh.roomId)
  }

  setActive(await restoreRooms(joinRoom, () => [...rooms.keys()]))

  const runCommand = (room: Room, text: string): void => {
    const [command, ...rest] = text.split(' ')
    if (command !== '/kick') {
      ui.log(`unknown command ${command}`)
      return
    }
    const nick = rest.join(' ').trim()
    if (nick.length === 0) {
      ui.log('usage: /kick <nick>')
      return
    }
    const result = room.kickByNick(nick)
    if (!result.ok) ui.log(result.error)
  }

  ui.onSend((text) => {
    if (activeId === null) return
    const entry = rooms.get(activeId)
    if (entry === undefined) return
    if (text.startsWith('/')) {
      runCommand(entry.room, text)
      return
    }
    entry.room.broadcastChat(text)
  })
  ui.onKickPeer((hex) => {
    if (activeId !== null) rooms.get(activeId)?.room.kick(hex)
  })
  ui.onNick((value) => {
    const clean = value.trim().slice(0, NICK_MAX)
    if (!isValidNick(clean) || clean === nick) {
      ui.setNick(nick)
      return
    }
    nick = clean
    void kvPut(NICK_KEY, clean)
    for (const entry of rooms.values()) entry.room.setNick(clean)
    ui.setNick(clean)
    ui.log(`nick set to ${clean}`)
  })
  ui.onNewRoom(() => {
    const fresh = freshRoom()
    joinRoom(fresh)
    setActive(fresh.roomId)
  })
  ui.onCopyLink(() => {
    if (activeId === null) return
    const secret = rooms.get(activeId)?.secret
    if (secret === undefined) return
    const link = `${location.origin}${location.pathname}#r=${activeId}&s=${secret}`
    void navigator.clipboard.writeText(link).then(() => {
      pulseHaptic()
      ui.log('invite link copied')
    })
  })
  ui.onSelectRoom(setActive)
  ui.onCloseRoom(closeRoom)

  const toggleNotifications = async (): Promise<void> => {
    if (notifyOn) {
      notifyOn = false
      void kvPut(NOTIFY_KEY, 'off')
      ui.setNotifyState(false)
      ui.log('notifications off')
      return
    }
    if (!('Notification' in window)) {
      ui.log('this browser lacks notifications')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      ui.log('notifications blocked by the browser')
      return
    }
    notifyOn = true
    void kvPut(NOTIFY_KEY, 'on')
    ui.setNotifyState(true)
    ui.log('notifications on')
  }
  ui.setNotifyState(notifyOn && canNotify())
  ui.onToggleNotifications(() => {
    void toggleNotifications()
  })

  window.addEventListener('hashchange', () => {
    const spec = roomFromHash()
    if (spec === null) return
    joinRoom(spec)
    setActive(spec.roomId)
  })
  window.addEventListener('pagehide', () => {
    for (const entry of rooms.values()) entry.room.leave()
    pool.stop()
  })
}

void boot()
