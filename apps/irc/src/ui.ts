import { NICK_MAX } from './mesh/messages.ts'
import type { RelayState } from './platform/nostr-pool.ts'
import type { PeerEntry } from './platform/room.ts'
import { short } from './util.ts'

export type UiHandles = {
  setIdentity(peerIdHex: string): void
  setRoom(roomId: string): void
  setNick(nick: string): void
  appendChat(input: {
    nick: string
    text: string
    ts: number
    self: boolean
  }): void
  appendPresence(input: {
    hex: string
    nick?: string
    action: 'joined' | 'left'
  }): void
  setPeers(active: PeerEntry[], passiveCount: number): void
  setRelay(url: string, state: RelayState): void
  log(line: string): void
  onSend(callback: (text: string) => void): void
  onNick(callback: (nick: string) => void): void
  onNewRoom(callback: () => void): void
  onCopyLink(callback: () => void): void
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

const timeOf = (ts: number): string => {
  const stamp = new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `[${stamp}]`
}

const titleBar = (text: string): { bar: HTMLElement; title: HTMLElement } => {
  const title = el('div', 'title-bar-text', text)
  const controls = el('div', 'title-bar-controls')
  for (const label of ['Minimize', 'Maximize', 'Close']) {
    const control = el('button')
    control.setAttribute('aria-label', label)
    control.disabled = true
    controls.append(control)
  }
  const bar = el('div', 'title-bar')
  bar.append(title, controls)
  return { bar, title }
}

const group = (legend: string): HTMLFieldSetElement => {
  const box = el('fieldset')
  box.append(el('legend', '', legend))
  return box
}

export const mountStandby = (root: HTMLElement): void => {
  root.replaceChildren()
  const { bar } = titleBar('irc')
  const body = el('div', 'window-body')
  body.append(
    el('p', '', 'the mesh runs in another tab of this room.'),
    el('p', '', 'close that tab and this one takes over.'),
  )
  const box = el('div', 'window standby-window')
  box.append(bar, body)
  root.append(box)
}

export const mountUi = (root: HTMLElement): UiHandles => {
  root.replaceChildren()

  const { bar, title } = titleBar('irc')

  const nickInput = el('input')
  nickInput.maxLength = NICK_MAX
  nickInput.id = 'nick'
  const nickLabel = el('label', '', 'nick')
  nickLabel.htmlFor = 'nick'
  const nickForm = el('form', 'nick-form')
  nickForm.append(nickLabel, nickInput)

  const newRoomButton = el('button', '', 'new room')
  const copyButton = el('button', '', 'copy invite link')
  const spacer = el('span', 'spacer')
  const toolbar = el('div', 'toolbar')
  toolbar.append(newRoomButton, copyButton, spacer, nickForm)

  const messages = el('div', 'messages sunken-panel')
  const input = el('input')
  input.maxLength = 2000
  input.placeholder = 'message the room'
  input.setAttribute('aria-label', 'message the room')
  const sendButton = el('button', '', 'send')
  const composer = el('form', 'composer')
  composer.append(input, sendButton)
  const chat = el('div', 'chat')
  chat.append(messages, composer)

  const peersList = el('ul', 'panel-list')
  const peersSection = group('peers')
  peersSection.append(peersList)
  const relaysList = el('ul', 'panel-list')
  const relaysSection = group('relays')
  relaysSection.append(relaysList)
  const logBox = el('div', 'eventlog sunken-panel')
  const logSection = group('events')
  logSection.append(logBox)
  const aside = el('aside')
  aside.append(peersSection, relaysSection, logSection)

  const content = el('div', 'content')
  content.append(chat, aside)

  const windowBody = el('div', 'window-body app-body')
  windowBody.append(toolbar, content)

  const identityField = el('p', 'status-bar-field', 'you —')
  const roomField = el('p', 'status-bar-field', 'room —')
  const peersField = el('p', 'status-bar-field', '0 active · 0 passive')
  const statusBar = el('div', 'status-bar')
  statusBar.append(identityField, roomField, peersField)

  const appWindow = el('div', 'window app-window')
  appWindow.append(bar, windowBody, statusBar)
  root.append(appWindow)

  const relayItems = new Map<string, HTMLLIElement>()
  let sendCallback: (text: string) => void = () => {}
  let nickCallback: (nick: string) => void = () => {}

  composer.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (text.length === 0) return
    sendCallback(text)
    input.value = ''
  })

  nickForm.addEventListener('submit', (event) => {
    event.preventDefault()
    nickCallback(nickInput.value)
    nickInput.blur()
  })
  nickInput.addEventListener('change', () => nickCallback(nickInput.value))

  return {
    setIdentity(peerIdHex) {
      identityField.textContent = `you ${short(peerIdHex)}`
    },
    setRoom(roomId) {
      title.textContent = `irc - #${roomId}`
      roomField.textContent = `room #${roomId}`
    },
    setNick(nick) {
      nickInput.value = nick
    },
    appendChat(entry) {
      const row = el('div', entry.self ? 'message self' : 'message')
      row.append(
        el('span', 'meta', timeOf(entry.ts)),
        el('span', 'who', `<${entry.nick}>`),
        el('span', 'body', entry.text),
      )
      messages.append(row)
      messages.scrollTop = messages.scrollHeight
    },
    appendPresence(entry) {
      const name = entry.nick ?? short(entry.hex)
      const row = el('div', 'message system')
      row.append(
        el('span', 'meta', timeOf(Date.now())),
        el('span', 'body', `*** ${name} has ${entry.action} the room`),
      )
      messages.append(row)
      messages.scrollTop = messages.scrollHeight
    },
    setPeers(active, passiveCount) {
      peersList.replaceChildren()
      for (const peer of active) {
        const item = el('li', 'open')
        item.append(
          el('span', 'dot'),
          el('span', '', peer.nick ?? short(peer.hex)),
        )
        peersList.append(item)
      }
      peersField.textContent = `${active.length} active · ${passiveCount} passive`
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
    onNick(callback) {
      nickCallback = callback
    },
    onNewRoom(callback) {
      newRoomButton.addEventListener('click', callback)
    },
    onCopyLink(callback) {
      copyButton.addEventListener('click', callback)
    },
  }
}
