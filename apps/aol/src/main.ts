import './style.css'
import { randomBytes, toHex } from './mesh/bytes.ts'
import { DEFAULT_RELAYS } from './mesh/constants.ts'
import type { Identity } from './mesh/keys.ts'
import {
  hasPasskeyCredential,
  loadStoredIdentity,
  passkeyIdentity,
} from './platform/identity-store.ts'
import { Room, type RoomEvent } from './platform/room.ts'
import { awaitTabOwnership, claimTabOwnership } from './platform/tab-owner.ts'
import { mountStandby, mountUi, type UiHandles } from './ui.ts'

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

  const owner = await claimTabOwnership(`aol:${roomId}`)
  if (!owner) {
    mountStandby(root)
    await awaitTabOwnership(`aol:${roomId}`)
    location.reload()
    return
  }

  const ui = mountUi(root)
  ui.setRoom(roomId)
  ui.setPasskeyLabel(
    (await hasPasskeyCredential()) ? 'unlock passkey' : 'create passkey',
  )

  let room: Room | null = null
  const startRoom = (identity: Identity): void => {
    room?.leave()
    ui.setIdentity(identity.peerIdHex, identity.tier)
    room = new Room({
      identity,
      roomId,
      topicSecret,
      relays: DEFAULT_RELAYS,
      onEvent: (event) => dispatchToUi(ui, event),
    })
    room.join()
  }

  startRoom(await loadStoredIdentity())

  ui.onSend((text) => room?.broadcastChat(text))
  ui.onNewRoom(() => {
    location.hash = ''
    location.reload()
  })
  ui.onCopyLink(() => {
    void navigator.clipboard
      .writeText(location.href)
      .then(() => ui.log('invite link copied'))
  })
  ui.onPasskey(() => {
    void passkeyIdentity()
      .then((identity) => {
        ui.setPasskeyLabel('unlock passkey')
        ui.log('passkey identity active, rejoining')
        startRoom(identity)
      })
      .catch((error: unknown) => ui.log(`passkey failed: ${String(error)}`))
  })

  window.addEventListener('pagehide', () => room?.leave())
  window.addEventListener('hashchange', () => location.reload())
}

void boot()
