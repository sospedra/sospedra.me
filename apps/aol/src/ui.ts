import type { RelayState } from './platform/nostr-pool.ts'
import { short } from './util.ts'

export type UiHandles = {
  setIdentity(peerIdHex: string, tier: string): void
  setRoom(roomId: string): void
  appendChat(input: {
    from: string
    text: string
    ts: number
    self: boolean
  }): void
  setPeers(active: string[], passiveCount: number): void
  setRelay(url: string, state: RelayState): void
  log(line: string): void
  onSend(callback: (text: string) => void): void
  onNewRoom(callback: () => void): void
  onCopyLink(callback: () => void): void
  onPasskey(callback: () => void): void
  setPasskeyLabel(label: string): void
}

const LOG_CAP = 150

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

const timeOf = (ts: number): string =>
  new Date(ts).toLocaleTimeString(undefined, { hour12: false })

export const mountStandby = (root: HTMLElement): void => {
  root.replaceChildren()
  const box = el('div', 'standby')
  box.append(
    el('p', '', 'the mesh runs in another tab of this room.'),
    el('p', '', 'close that tab and this one takes over.'),
  )
  root.append(box)
}

export const mountUi = (root: HTMLElement): UiHandles => {
  root.replaceChildren()

  const identityChip = el('span', 'chip')
  const roomChip = el('span', 'chip')
  const passkeyButton = el('button', '', 'create passkey')
  const newRoomButton = el('button', '', 'new room')
  const copyButton = el('button', '', 'copy invite link')
  const spacer = el('span', 'spacer')
  const header = el('header')
  header.append(
    el('span', 'brand', 'aol'),
    roomChip,
    identityChip,
    spacer,
    passkeyButton,
    newRoomButton,
    copyButton,
  )

  const messages = el('div', 'messages')
  const input = el('input')
  input.maxLength = 2000
  input.placeholder = 'message the room'
  input.setAttribute('aria-label', 'message the room')
  const sendButton = el('button', '', 'send')
  const composer = el('form', 'composer')
  composer.append(input, sendButton)
  const chat = el('div', 'chat')
  chat.append(messages, composer)

  const peersList = el('ul')
  const peersSection = el('section')
  peersSection.append(el('h2', '', 'peers'), peersList)
  const relaysList = el('ul')
  const relaysSection = el('section')
  relaysSection.append(el('h2', '', 'relays'), relaysList)
  const logBox = el('div', 'eventlog')
  const logSection = el('section')
  logSection.append(el('h2', '', 'events'), logBox)
  const aside = el('aside')
  aside.append(peersSection, relaysSection, logSection)

  const main = el('main')
  main.append(chat, aside)
  root.append(header, main)

  const relayItems = new Map<string, HTMLLIElement>()
  let sendCallback: (text: string) => void = () => {}

  composer.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (text.length === 0) return
    sendCallback(text)
    input.value = ''
  })

  return {
    setIdentity(peerIdHex, tier) {
      identityChip.replaceChildren('you ', el('strong', '', short(peerIdHex)))
      identityChip.append(` · ${tier}`)
      identityChip.classList.toggle('prf', tier === 'PRF')
    },
    setRoom(roomId) {
      roomChip.replaceChildren('room ', el('strong', '', roomId))
    },
    appendChat(entry) {
      const row = el('div', entry.self ? 'message self' : 'message')
      row.append(
        el('span', 'meta', timeOf(entry.ts)),
        el('span', 'who', entry.self ? 'you' : short(entry.from)),
        el('span', 'body', entry.text),
      )
      messages.append(row)
      messages.scrollTop = messages.scrollHeight
    },
    setPeers(active, passiveCount) {
      peersList.replaceChildren()
      for (const hex of active) {
        const item = el('li', 'open')
        item.append(el('span', 'dot'), el('span', '', short(hex)))
        peersList.append(item)
      }
      const summary = el('li')
      summary.append(
        el('span', '', `${active.length} active · ${passiveCount} passive`),
      )
      peersList.append(summary)
    },
    setRelay(url, state) {
      const existing = relayItems.get(url)
      const item = existing ?? el('li')
      if (existing === undefined) {
        item.append(
          el('span', 'dot'),
          el('span', '', url.replace('wss://', '')),
        )
        relaysList.append(item)
        relayItems.set(url, item)
      }
      item.className = state
    },
    log(line) {
      logBox.prepend(el('p', '', `${timeOf(Date.now())} ${line}`))
      while (logBox.childElementCount > LOG_CAP)
        logBox.lastElementChild?.remove()
    },
    onSend(callback) {
      sendCallback = callback
    },
    onNewRoom(callback) {
      newRoomButton.addEventListener('click', callback)
    },
    onCopyLink(callback) {
      copyButton.addEventListener('click', callback)
    },
    onPasskey(callback) {
      passkeyButton.addEventListener('click', callback)
    },
    setPasskeyLabel(label) {
      passkeyButton.textContent = label
    },
  }
}
