import { initDesktop } from './desktop.ts'
import { el, logoImg, titleBar } from './dom.ts'
import { buildHelpWindow } from './help.ts'
import { NICK_MAX } from './mesh/messages.ts'
import type { RelayState } from './platform/nostr-pool.ts'
import type { PeerEntry } from './platform/room.ts'
import { short } from './util.ts'

export type UiHandles = {
  setIdentity(peerIdHex: string): void
  setNick(nick: string): void
  addRoom(roomId: string): void
  removeRoom(roomId: string): void
  setActiveRoom(roomId: string): void
  appendChat(
    roomId: string,
    input: { nick: string; text: string; ts: number; self: boolean },
  ): void
  appendPresence(
    roomId: string,
    input: { hex: string; nick?: string; action: 'joined' | 'left' },
  ): void
  appendSystem(roomId: string, line: string, command?: string): void
  setPeers(roomId: string, active: PeerEntry[], passiveCount: number): void
  setRelay(url: string, state: RelayState): void
  log(line: string): void
  setNotifyState(on: boolean): void
  onSend(callback: (text: string) => void): void
  onNick(callback: (nick: string) => void): void
  onNewRoom(callback: () => void): void
  onCopyLink(callback: () => void): void
  onSelectRoom(callback: (roomId: string) => void): void
  onCloseRoom(callback: (roomId: string) => void): void
  onKickPeer(callback: (hex: string) => void): void
  onToggleNotifications(callback: () => void): void
}

const LOG_CAP = 150
const PANE_CAP = 500

type Command = { name: string; usage: string; hint: string }

const COMMANDS: Command[] = [
  {
    name: '/kick',
    usage: '/kick <nick>',
    hint: 'start a kick vote against a peer',
  },
]

type Suggestion = {
  title: string
  hint: string
  insert: string
  dismissAfter: boolean
}

const fuzzyRank = (candidate: string, query: string): number | null => {
  if (query.length === 0) return 0
  const lower = candidate.toLowerCase()
  if (lower.startsWith(query)) return 0
  if (lower.includes(query)) return 1
  let matched = 0
  for (const char of lower) {
    if (char === query[matched]) matched += 1
  }
  return matched === query.length ? 2 : null
}

type RoomView = {
  pane: HTMLDivElement
  item: HTMLLIElement
  button: HTMLButtonElement
  name: HTMLSpanElement
  badge: HTMLSpanElement
  peers: PeerEntry[]
  passive: number
  unread: number
}

const timeOf = (ts: number): string => {
  const stamp = new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `[${stamp}]`
}

const group = (legend: string): HTMLFieldSetElement => {
  const box = el('fieldset')
  box.append(el('legend', '', legend))
  return box
}

export const mountStandby = (root: HTMLElement): void => {
  root.replaceChildren()
  const { bar, minimizeButton, maximizeButton, closeButton } = titleBar('sIRC')
  minimizeButton.disabled = true
  maximizeButton.disabled = true
  closeButton.disabled = true
  const body = el('div', 'window-body')
  body.append(
    el('p', '', 'the mesh runs in another tab.'),
    el('p', '', 'close that tab and this one takes over.'),
  )
  const box = el('div', 'window standby-window')
  box.append(bar, body)
  root.append(box)
}

export const mountUi = (root: HTMLElement): UiHandles => {
  root.replaceChildren()

  const { bar, title, minimizeButton, maximizeButton, closeButton } =
    titleBar('sIRC')

  const nickInput = el('input')
  nickInput.type = 'text'
  nickInput.maxLength = NICK_MAX
  nickInput.id = 'nick'
  const nickLabel = el('label', '', 'nick')
  nickLabel.htmlFor = 'nick'
  const nickForm = el('form', 'nick-form')
  nickForm.append(nickLabel, nickInput)

  const newRoomButton = el('button', '', 'new room')
  const leaveRoomButton = el('button', '', 'leave room')
  const copyButton = el('button', '', 'copy invite link')
  const helpButton = el('button', '', 'help')
  const spacer = el('span', 'spacer')
  const toolbar = el('div', 'toolbar')
  toolbar.append(
    newRoomButton,
    leaveRoomButton,
    copyButton,
    helpButton,
    spacer,
    nickForm,
  )

  const roomList = el('ul', 'room-list')
  const channelsSection = group('channels')
  const channelsScroll = el('div', 'channels sunken-panel')
  channelsScroll.append(roomList)
  channelsSection.append(channelsScroll)

  const panes = el('div', 'panes')
  const input = el('input')
  input.type = 'text'
  input.maxLength = 2000
  input.placeholder = 'message the room'
  input.setAttribute('aria-label', 'message the room')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', 'command-popup')
  input.setAttribute('aria-expanded', 'false')
  const commandList = el('ul', 'command-popup')
  commandList.id = 'command-popup'
  commandList.setAttribute('role', 'listbox')
  commandList.hidden = true
  const sendButton = el('button', '', 'send')
  const composer = el('form', 'composer')
  composer.append(commandList, input, sendButton)
  const chat = el('div', 'chat')
  chat.append(panes, composer)

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
  content.append(channelsSection, chat, aside)

  const windowBody = el('div', 'window-body app-body')
  windowBody.append(toolbar, content)

  const identityField = el('p', 'status-bar-field identity-field', 'you —')
  const roomField = el('p', 'status-bar-field', 'room —')
  const peersField = el('p', 'status-bar-field', '0 active · 0 passive')
  const byLink = el('a', '', 'by sospedra.me')
  byLink.href = 'https://sospedra.me'
  byLink.rel = 'noreferrer'
  const byField = el('p', 'status-bar-field by-line')
  byField.append(byLink)
  const statusBar = el('div', 'status-bar')
  statusBar.append(identityField, roomField, peersField, byField)

  const appWindow = el('div', 'window app-window')
  appWindow.append(bar, windowBody, statusBar)

  const startFlag = el('span', 'start-flag')
  for (let pane = 0; pane < 4; pane++) startFlag.append(el('i'))
  const startButton = el('button', 'start-button')
  startButton.append(startFlag, el('span', '', 'start'))
  startButton.setAttribute('aria-haspopup', 'menu')
  startButton.setAttribute('aria-expanded', 'false')
  const taskButton = el('button', 'task-button')
  const taskLabel = el('span', '', 'sIRC')
  taskButton.append(logoImg('task-icon', 16), taskLabel)
  taskButton.setAttribute('aria-pressed', 'true')
  const clock = el('div', 'task-clock')
  const taskbar = el('div', 'taskbar')
  taskbar.append(startButton, taskButton, clock)

  const menuNewRoom = el('button', 'menu-item', 'new room')
  const menuNotify = el('button', 'menu-item', 'notifications: off')
  const menuHelp = el('button', 'menu-item', 'help')
  const menuHome = el('a', 'menu-item', 'sospedra.me')
  menuHome.href = 'https://sospedra.me'
  menuHome.rel = 'noreferrer'
  const startMenu = el('div', 'start-menu')
  startMenu.hidden = true
  startMenu.append(menuNewRoom, menuNotify, menuHelp, menuHome)

  const desktopIcon = el('button', 'desktop-icon')
  desktopIcon.append(
    logoImg('desktop-icon-img', 32),
    el('span', 'desktop-icon-label', 'sIRC'),
  )
  desktopIcon.setAttribute('aria-label', 'open sIRC')

  const help = buildHelpWindow()
  root.append(desktopIcon, appWindow, help.root, taskbar, startMenu)

  const views = new Map<string, RoomView>()
  const relayItems = new Map<string, HTMLLIElement>()
  let activeId: string | null = null
  let sendCallback: (text: string) => void = () => {}
  let nickCallback: (nick: string) => void = () => {}
  let selectCallback: (roomId: string) => void = () => {}
  let closeCallback: (roomId: string) => void = () => {}
  let newRoomCallback: () => void = () => {}
  let notifyCallback: () => void = () => {}
  let kickCallback: (hex: string) => void = () => {}

  const updateTaskLabel = (): void => {
    const total = [...views.values()].reduce(
      (sum, view) => sum + view.unread,
      0,
    )
    const room = activeId === null ? '' : ` — #${activeId}`
    taskLabel.textContent = `sIRC${room}${total > 0 ? ` (${total})` : ''}`
  }

  const renderBadge = (view: RoomView): void => {
    view.badge.textContent = view.unread > 0 ? String(view.unread) : ''
    updateTaskLabel()
  }

  const closeMenu = (): void => {
    startMenu.hidden = true
    startButton.setAttribute('aria-expanded', 'false')
  }

  startButton.addEventListener('click', () => {
    startMenu.hidden = !startMenu.hidden
    startButton.setAttribute('aria-expanded', String(!startMenu.hidden))
  })
  document.addEventListener('pointerdown', (event) => {
    if (startMenu.hidden) return
    const target = event.target
    const insideMenu =
      target instanceof Element &&
      target.closest('.start-menu, .start-button') !== null
    if (!insideMenu) closeMenu()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
  })
  menuNewRoom.addEventListener('click', () => {
    closeMenu()
    newRoomCallback()
  })
  menuNotify.addEventListener('click', () => {
    closeMenu()
    notifyCallback()
  })
  helpButton.addEventListener('click', help.open)
  menuHelp.addEventListener('click', () => {
    closeMenu()
    help.open()
  })

  const renderPeers = (view: RoomView): void => {
    peersList.replaceChildren()
    for (const peer of view.peers) {
      const kickButton = el('button', 'kick-button', 'kick')
      kickButton.setAttribute(
        'aria-label',
        `kick ${peer.nick ?? short(peer.hex)}`,
      )
      kickButton.addEventListener('click', () => kickCallback(peer.hex))
      const item = el('li', 'open')
      item.append(
        el('span', 'dot'),
        el('span', '', peer.nick ?? short(peer.hex)),
        kickButton,
      )
      peersList.append(item)
    }
    peersField.textContent = `${view.peers.length} active · ${view.passive} passive`
  }

  const appendRow = (roomId: string, row: HTMLDivElement): void => {
    const view = views.get(roomId)
    if (view === undefined) return
    view.pane.append(row)
    while (view.pane.childElementCount > PANE_CAP)
      view.pane.firstElementChild?.remove()
    if (roomId === activeId) {
      view.pane.scrollTop = view.pane.scrollHeight
      return
    }
    view.unread += 1
    renderBadge(view)
  }

  let suggestionMatches: Suggestion[] = []
  let suggestionIndex = 0
  let suggestionsDismissed = false

  const activePeers = (): PeerEntry[] =>
    activeId === null ? [] : (views.get(activeId)?.peers ?? [])

  const closeCommands = (): void => {
    commandList.hidden = true
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
  }

  const completeSuggestion = (suggestion: Suggestion): void => {
    input.value = suggestion.insert
    if (suggestion.dismissAfter) {
      suggestionsDismissed = true
      closeCommands()
    } else {
      suggestionsDismissed = false
      renderSuggestions()
    }
    input.focus()
  }

  const commandSuggestions = (token: string): Suggestion[] =>
    COMMANDS.filter((command) => command.name.startsWith(token)).map(
      (command) => ({
        title: command.usage,
        hint: command.hint,
        insert: `${command.name} `,
        dismissAfter: false,
      }),
    )

  const peerSuggestions = (partial: string): Suggestion[] => {
    const query = partial.toLowerCase()
    const ranked = activePeers()
      .map((peer) => {
        const name = peer.nick ?? short(peer.hex)
        return { name, hex: peer.hex, rank: fuzzyRank(name, query) }
      })
      .filter((entry) => entry.rank !== null)
    ranked.sort(
      (a, b) => (a.rank ?? 0) - (b.rank ?? 0) || a.name.localeCompare(b.name),
    )
    return ranked.map((entry) => ({
      title: entry.name,
      hint: short(entry.hex),
      insert: `/kick ${entry.name}`,
      dismissAfter: true,
    }))
  }

  const buildSuggestions = (): Suggestion[] => {
    const value = input.value
    if (!value.startsWith('/')) return []
    const spaceIndex = value.indexOf(' ')
    if (spaceIndex === -1) return commandSuggestions(value)
    if (value.slice(0, spaceIndex) !== '/kick') return []
    return peerSuggestions(value.slice(spaceIndex + 1).trim())
  }

  const suggestionOption = (
    suggestion: Suggestion,
    index: number,
  ): HTMLLIElement => {
    const active = index === suggestionIndex
    const item = el('li', active ? 'command-option active' : 'command-option')
    item.id = `command-option-${index}`
    item.setAttribute('role', 'option')
    item.setAttribute('aria-selected', String(active))
    item.append(
      el('span', 'command-name', suggestion.title),
      el('span', 'command-hint', suggestion.hint),
    )
    item.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      completeSuggestion(suggestion)
    })
    return item
  }

  const renderSuggestions = (): void => {
    suggestionMatches = suggestionsDismissed ? [] : buildSuggestions()
    if (suggestionMatches.length === 0) {
      closeCommands()
      return
    }
    suggestionIndex = Math.min(suggestionIndex, suggestionMatches.length - 1)
    commandList.replaceChildren(...suggestionMatches.map(suggestionOption))
    commandList.hidden = false
    input.setAttribute('aria-expanded', 'true')
    input.setAttribute(
      'aria-activedescendant',
      `command-option-${suggestionIndex}`,
    )
  }

  const moveSuggestion = (delta: number): void => {
    const count = suggestionMatches.length
    suggestionIndex = (suggestionIndex + delta + count) % count
    renderSuggestions()
  }

  const prefillCommand = (command: string): void => {
    input.value = command
    suggestionsDismissed = true
    closeCommands()
    input.focus()
  }

  input.addEventListener('input', () => {
    suggestionsDismissed = false
    suggestionIndex = 0
    renderSuggestions()
  })
  input.addEventListener('blur', closeCommands)
  input.addEventListener('keydown', (event) => {
    if (commandList.hidden || event.isComposing) return
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        moveSuggestion(1)
        return
      }
      case 'ArrowUp': {
        event.preventDefault()
        moveSuggestion(-1)
        return
      }
      case 'Enter':
      case 'Tab': {
        event.preventDefault()
        completeSuggestion(suggestionMatches[suggestionIndex])
        return
      }
      case 'Escape': {
        suggestionsDismissed = true
        renderSuggestions()
        return
      }
    }
  })

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

  leaveRoomButton.addEventListener('click', () => {
    if (activeId !== null) closeCallback(activeId)
  })

  initDesktop({
    appWindow,
    titleBar: bar,
    minimizeButton,
    maximizeButton,
    closeButton,
    taskButton,
    desktopIcon,
    clock,
  })

  return {
    setIdentity(peerIdHex) {
      identityField.textContent = `you ${short(peerIdHex)}`
    },
    setNick(nick) {
      nickInput.value = nick
    },
    addRoom(roomId) {
      if (views.has(roomId)) return
      const pane = el('div', 'messages sunken-panel')
      pane.hidden = true
      panes.append(pane)
      const name = el('span', 'room-name', `#${roomId}`)
      const badge = el('span', 'room-badge')
      const button = el('button', 'room-button')
      button.type = 'button'
      button.append(name, badge)
      button.addEventListener('click', () => selectCallback(roomId))
      const item = el('li')
      item.append(button)
      roomList.append(item)
      views.set(roomId, {
        pane,
        item,
        button,
        name,
        badge,
        peers: [],
        passive: 0,
        unread: 0,
      })
    },
    removeRoom(roomId) {
      const view = views.get(roomId)
      if (view === undefined) return
      view.pane.remove()
      view.item.remove()
      views.delete(roomId)
      if (activeId === roomId) activeId = null
    },
    setActiveRoom(roomId) {
      const view = views.get(roomId)
      if (view === undefined) return
      const previous = activeId === null ? undefined : views.get(activeId)
      if (previous !== undefined) {
        previous.pane.hidden = true
        previous.button.classList.remove('active')
      }
      activeId = roomId
      view.pane.hidden = false
      view.button.classList.add('active')
      view.unread = 0
      renderBadge(view)
      view.pane.scrollTop = view.pane.scrollHeight
      view.button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      title.textContent = `sIRC - #${roomId}`
      roomField.textContent = `room #${roomId}`
      renderPeers(view)
      input.focus()
    },
    appendChat(roomId, entry) {
      const row = el('div', entry.self ? 'message self' : 'message')
      row.append(
        el('span', 'meta', timeOf(entry.ts)),
        el('span', 'who', `<${entry.nick}>`),
        el('span', 'body', entry.text),
      )
      appendRow(roomId, row)
    },
    appendPresence(roomId, entry) {
      const name = entry.nick ?? short(entry.hex)
      const row = el('div', 'message system')
      row.append(
        el('span', 'meta', timeOf(Date.now())),
        el('span', 'body', `*** ${name} has ${entry.action} the room`),
      )
      appendRow(roomId, row)
    },
    appendSystem(roomId, line, command) {
      const row = el('div', 'message system')
      let body: HTMLElement
      if (command === undefined) {
        body = el('span', 'body', line)
      } else {
        const action = el('button', 'body vote-action', line)
        action.type = 'button'
        action.addEventListener('click', () => prefillCommand(command))
        body = action
      }
      row.append(el('span', 'meta', timeOf(Date.now())), body)
      appendRow(roomId, row)
    },
    setPeers(roomId, active, passiveCount) {
      const view = views.get(roomId)
      if (view === undefined) return
      view.peers = active
      view.passive = passiveCount
      if (roomId === activeId) renderPeers(view)
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
    setNotifyState(on) {
      menuNotify.textContent = `notifications: ${on ? 'on' : 'off'}`
    },
    onSend(callback) {
      sendCallback = callback
    },
    onNick(callback) {
      nickCallback = callback
    },
    onNewRoom(callback) {
      newRoomCallback = callback
      newRoomButton.addEventListener('click', callback)
    },
    onCopyLink(callback) {
      copyButton.addEventListener('click', callback)
    },
    onSelectRoom(callback) {
      selectCallback = callback
    },
    onCloseRoom(callback) {
      closeCallback = callback
    },
    onKickPeer(callback) {
      kickCallback = callback
    },
    onToggleNotifications(callback) {
      notifyCallback = callback
    },
  }
}
