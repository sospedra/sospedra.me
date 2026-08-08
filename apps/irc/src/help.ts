import { el, titleBar } from './dom.ts'

type HelpSection = { heading: string; body: string }

const SECTIONS: HelpSection[] = [
  {
    heading: 'finding peers',
    body: 'to meet, browsers post encrypted WebRTC invitations on public nostr relays. the relays are a bulletin board: they carry signed, expiring envelopes filed under an opaque topic hash, never a message. once two browsers shake hands, the relays are out of the loop.',
  },
  {
    heading: 'rooms',
    body: 'a room is an id plus a secret, and the invite link is the key. the rendezvous topic is sha256(app, room, secret), so without the link a room is unfindable. every payload is sealed with XChaCha20-Poly1305 under a key derived from the secret.',
  },
  {
    heading: 'the mesh',
    body: 'peers talk over WebRTC data channels, up to 8 direct links each. messages flood peer to peer: signed with your ed25519 key, deduplicated, hop-capped, rate-limited. chat never touches anything that is not a member browser.',
  },
  {
    heading: 'identity',
    body: 'your identity is an ed25519 keypair born in this browser and kept in IndexedDB. nicks are self-declared labels on top. no registration exists because there is nothing to register with.',
  },
  {
    heading: 'kicks',
    body: 'moderation is a vote. /kick starts one, and a majority of your view ejects the target: their frames drop, their re-entry offers get refused, and your browser remembers across sessions.',
  },
  {
    heading: 'fine print',
    body: 'relays can see your IP and that somebody posted envelopes on a topic. messages live only in the browsers that received them: close the tab and your copy is gone. a kicked peer that saved the secret can still decrypt frames it captured before the kick.',
  },
]

type Drag = { pointerId: number; offsetX: number; offsetY: number }

const makeDraggable = (bar: HTMLElement, box: HTMLElement): void => {
  let drag: Drag | null = null
  bar.addEventListener('pointerdown', (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('.title-bar-controls') !== null
    )
      return
    const rect = box.getBoundingClientRect()
    box.style.transform = 'none'
    box.style.left = `${rect.left}px`
    box.style.top = `${rect.top}px`
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    bar.setPointerCapture(event.pointerId)
  })
  bar.addEventListener('pointermove', (event) => {
    if (drag === null || event.pointerId !== drag.pointerId) return
    const left = Math.min(
      Math.max(event.clientX - drag.offsetX, 60 - box.offsetWidth),
      window.innerWidth - 60,
    )
    const top = Math.min(
      Math.max(event.clientY - drag.offsetY, 0),
      window.innerHeight - 60,
    )
    box.style.left = `${left}px`
    box.style.top = `${top}px`
  })
  const endDrag = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointerId) return
    drag = null
  }
  bar.addEventListener('pointerup', endDrag)
  bar.addEventListener('pointercancel', endDrag)
}

export type HelpWindow = { root: HTMLElement; open(): void }

export const buildHelpWindow = (): HelpWindow => {
  const { bar, minimizeButton, maximizeButton, closeButton } =
    titleBar('sIRC help')
  minimizeButton.disabled = true
  maximizeButton.disabled = true

  const body = el('div', 'window-body help-body')
  const hero = el('p', 'help-hero', 'no server. ever.')
  const lead = el(
    'p',
    '',
    'sIRC has no backend. no database, no accounts, no message logs. irc.sospedra.me hands your browser a static bundle and leaves. everything after that is browsers talking to browsers.',
  )
  body.append(hero, lead)
  for (const section of SECTIONS) {
    body.append(
      el('h3', 'help-heading', section.heading),
      el('p', '', section.body),
    )
  }
  const homeLink = el('a', '', 'by sospedra.me')
  homeLink.href = 'https://sospedra.me'
  homeLink.rel = 'noreferrer'
  const footer = el('p', 'help-footer')
  footer.append(homeLink)
  body.append(footer)

  const root = el('div', 'window help-window')
  root.hidden = true
  root.tabIndex = -1
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', 'sIRC help')
  root.append(bar, body)

  const close = (): void => {
    root.hidden = true
  }
  closeButton.addEventListener('click', close)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) close()
  })
  makeDraggable(bar, root)

  return {
    root,
    open() {
      root.hidden = false
      root.focus()
    },
  }
}
