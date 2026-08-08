import '98.css'
import './style.css'
import { randomBytes, toHex } from './mesh/bytes.ts'
import { DEFAULT_RELAYS } from './mesh/constants.ts'
import { isValidNick, NICK_MAX } from './mesh/messages.ts'
import { kvGet, kvPut } from './platform/idb.ts'
import { loadStoredIdentity } from './platform/identity-store.ts'
import { Room, type RoomEvent } from './platform/room.ts'
import { awaitTabOwnership, claimTabOwnership } from './platform/tab-owner.ts'
import { mountStandby, mountUi, type UiHandles } from './ui.ts'

const NICK_KEY = 'nickname'

const roomFromHash = (): { roomId: string; topicSecret: string } => {
  const params = new URLSearchParams(location.hash.slice(1))
  const roomId = params.get('r')
  const topicSecret = params.get('s')
  if (roomId !== null && topicSecret !== null) return { roomId, topicSecret }
  const fresh = {
    roomId: toHex(randomBytes(4)),
    topicSecret: toHex(randomBytes(16)),
  }
  location.hash = `r=${fresh.roomId}&s=${fresh.topicSecret}`
  return fresh
}

const dispatchToUi = (ui: UiHandles, event: RoomEvent): void => {
  switch (event.kind) {
    case 'chat': {
      ui.appendChat(event)
      return
    }
    case 'presence': {
      ui.appendPresence(event)
      return
    }
    case 'log': {
      ui.log(event.line)
      return
    }
    case 'peers': {
      ui.setPeers(event.active, event.passive)
      return
    }
    case 'relay': {
      ui.setRelay(event.url, event.state)
      return
    }
  }
}

const boot = async (): Promise<void> => {
  const root = document.querySelector('#app')
  if (!(root instanceof HTMLElement)) return
  const { roomId, topicSecret } = roomFromHash()

  const owner = await claimTabOwnership(`irc:${roomId}`)
  if (!owner) {
    mountStandby(root)
    await awaitTabOwnership(`irc:${roomId}`)
    location.reload()
    return
  }

  const ui = mountUi(root)
  ui.setRoom(roomId)

  const identity = await loadStoredIdentity()
  const storedNick = await kvGet<string>(NICK_KEY)
  let nick = storedNick ?? `guest-${identity.peerIdHex.slice(0, 4)}`
  ui.setIdentity(identity.peerIdHex)
  ui.setNick(nick)

  const room = new Room({
    identity,
    roomId,
    topicSecret,
    nick,
    relays: DEFAULT_RELAYS,
    onEvent: (event) => dispatchToUi(ui, event),
  })
  room.join()

  ui.onSend((text) => room.broadcastChat(text))
  ui.onNick((value) => {
    const clean = value.trim().slice(0, NICK_MAX)
    if (!isValidNick(clean) || clean === nick) {
      ui.setNick(nick)
      return
    }
    nick = clean
    void kvPut(NICK_KEY, clean)
    room.setNick(clean)
    ui.setNick(clean)
    ui.log(`nick set to ${clean}`)
  })
  ui.onNewRoom(() => {
    location.hash = ''
    location.reload()
  })
  ui.onCopyLink(() => {
    void navigator.clipboard
      .writeText(location.href)
      .then(() => ui.log('invite link copied'))
  })

  window.addEventListener('pagehide', () => room.leave())
  window.addEventListener('hashchange', () => location.reload())
}

void boot()
