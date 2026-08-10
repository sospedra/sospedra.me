import { tapHaptic } from './haptics.ts'

export const TASKBAR_HEIGHT = 34

const TITLE_GRAB_MIN = 60

type Rect = { left: number; top: number; width: number; height: number }

type HiddenVia = 'minimized' | 'closed'

type WindowMode =
  | { kind: 'floating' }
  | { kind: 'maximized' }
  | {
      kind: 'hidden'
      via: HiddenVia
      prev: 'floating' | 'maximized'
      rect: Rect
    }

type DesktopParts = {
  appWindow: HTMLElement
  titleBar: HTMLElement
  minimizeButton: HTMLButtonElement
  maximizeButton: HTMLButtonElement
  closeButton: HTMLButtonElement
  taskButton: HTMLButtonElement
  desktopIcon: HTMLButtonElement
  clock: HTMLElement
}

type Drag = { pointerId: number; offsetX: number; offsetY: number }

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), Math.max(low, high))

const rectOf = (element: Element): Rect => {
  const box = element.getBoundingClientRect()
  return { left: box.left, top: box.top, width: box.width, height: box.height }
}

const viewportRect = (): Rect => ({
  left: 0,
  top: 0,
  width: window.innerWidth,
  height: window.innerHeight - TASKBAR_HEIGHT,
})

export const initDesktop = (parts: DesktopParts): void => {
  const desktopMedia = window.matchMedia('(min-width: 721px)')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let mode: WindowMode = { kind: 'floating' }
  let savedRect: Rect | null = null
  let drag: Drag | null = null

  const { appWindow, titleBar, taskButton } = parts

  const fly = (from: Rect, to: Rect, done: () => void): void => {
    if (reducedMotion.matches) {
      done()
      return
    }
    const frame = document.createElement('div')
    frame.className = 'wireframe'
    document.body.append(frame)
    const animation = frame.animate(
      [
        {
          left: `${from.left}px`,
          top: `${from.top}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
        },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          width: `${to.width}px`,
          height: `${to.height}px`,
        },
      ],
      {
        duration: 200,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fill: 'forwards',
      },
    )
    animation.onfinish = () => {
      frame.remove()
      done()
    }
  }

  const place = (left: number, top: number): void => {
    appWindow.style.left = `${left}px`
    appWindow.style.top = `${top}px`
  }

  const ensureFloatingPosition = (): void => {
    if (appWindow.classList.contains('floating')) return
    const rect = rectOf(appWindow)
    appWindow.classList.add('floating')
    appWindow.style.width = `${rect.width}px`
    appWindow.style.height = `${rect.height}px`
    place(rect.left, rect.top)
  }

  const applyFloating = (rect: Rect): void => {
    appWindow.classList.remove('minimized', 'maximized')
    appWindow.classList.add('floating')
    appWindow.style.width = `${rect.width}px`
    appWindow.style.height = `${rect.height}px`
    place(rect.left, rect.top)
    mode = { kind: 'floating' }
    parts.maximizeButton.setAttribute('aria-label', 'Maximize')
    taskButton.setAttribute('aria-pressed', 'true')
  }

  const applyMaximized = (): void => {
    appWindow.classList.remove('minimized', 'floating')
    appWindow.classList.add('maximized')
    appWindow.style.left = ''
    appWindow.style.top = ''
    appWindow.style.width = ''
    appWindow.style.height = ''
    mode = { kind: 'maximized' }
    parts.maximizeButton.setAttribute('aria-label', 'Restore')
    taskButton.setAttribute('aria-pressed', 'true')
  }

  const toggleMaximize = (): void => {
    if (!desktopMedia.matches) return
    if (mode.kind === 'maximized') {
      const target = savedRect ?? rectOf(appWindow)
      fly(rectOf(appWindow), target, () => applyFloating(target))
      return
    }
    if (mode.kind !== 'floating') return
    ensureFloatingPosition()
    savedRect = rectOf(appWindow)
    fly(savedRect, viewportRect(), applyMaximized)
  }

  const hide = (via: HiddenVia): void => {
    if (!desktopMedia.matches || mode.kind === 'hidden') return
    const from = rectOf(appWindow)
    const target =
      via === 'closed' ? rectOf(parts.desktopIcon) : rectOf(taskButton)
    mode = { kind: 'hidden', via, prev: mode.kind, rect: from }
    appWindow.classList.add('minimized')
    taskButton.hidden = via === 'closed'
    taskButton.setAttribute('aria-pressed', 'false')
    fly(from, target, () => {})
  }

  const restore = (): void => {
    if (mode.kind !== 'hidden') return
    const { via, prev, rect } = mode
    taskButton.hidden = false
    const from =
      via === 'closed' ? rectOf(parts.desktopIcon) : rectOf(taskButton)
    const target = prev === 'maximized' ? viewportRect() : rect
    fly(from, target, () => {
      if (prev === 'maximized') {
        appWindow.classList.remove('minimized')
        applyMaximized()
        return
      }
      applyFloating(target)
    })
  }

  const insideControls = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest('.title-bar-controls') !== null

  titleBar.addEventListener('pointerdown', (event) => {
    if (!desktopMedia.matches || mode.kind !== 'floating') return
    if (insideControls(event.target)) return
    ensureFloatingPosition()
    const rect = rectOf(appWindow)
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    titleBar.setPointerCapture(event.pointerId)
  })

  titleBar.addEventListener('pointermove', (event) => {
    if (drag === null || event.pointerId !== drag.pointerId) return
    const width = appWindow.offsetWidth
    const left = clamp(
      event.clientX - drag.offsetX,
      TITLE_GRAB_MIN - width,
      window.innerWidth - TITLE_GRAB_MIN,
    )
    const top = clamp(
      event.clientY - drag.offsetY,
      0,
      window.innerHeight - TASKBAR_HEIGHT - 28,
    )
    place(left, top)
  })

  const endDrag = (event: PointerEvent): void => {
    if (drag === null || event.pointerId !== drag.pointerId) return
    drag = null
  }
  titleBar.addEventListener('pointerup', endDrag)
  titleBar.addEventListener('pointercancel', endDrag)

  titleBar.addEventListener('dblclick', (event) => {
    if (insideControls(event.target)) return
    toggleMaximize()
  })

  const openFromIcon = (): void => {
    parts.desktopIcon.classList.remove('selected')
    if (mode.kind === 'hidden') restore()
  }

  parts.minimizeButton.addEventListener('click', () => hide('minimized'))
  parts.maximizeButton.addEventListener('click', () => {
    tapHaptic()
    toggleMaximize()
  })
  parts.closeButton.addEventListener('click', () => hide('closed'))
  taskButton.addEventListener('click', () => {
    if (mode.kind === 'hidden') {
      restore()
      return
    }
    hide('minimized')
  })
  parts.desktopIcon.addEventListener('click', (event) => {
    if (event.detail === 0) {
      openFromIcon()
      return
    }
    parts.desktopIcon.classList.toggle('selected')
  })
  parts.desktopIcon.addEventListener('dblclick', openFromIcon)

  window.addEventListener('resize', () => {
    if (!desktopMedia.matches || mode.kind !== 'floating') return
    if (!appWindow.classList.contains('floating')) return
    const rect = rectOf(appWindow)
    place(
      clamp(
        rect.left,
        TITLE_GRAB_MIN - rect.width,
        window.innerWidth - TITLE_GRAB_MIN,
      ),
      clamp(rect.top, 0, window.innerHeight - TASKBAR_HEIGHT - 28),
    )
  })

  desktopMedia.addEventListener('change', () => {
    if (desktopMedia.matches) return
    drag = null
    mode = { kind: 'floating' }
    savedRect = null
    appWindow.classList.remove('floating', 'maximized', 'minimized')
    appWindow.style.left = ''
    appWindow.style.top = ''
    appWindow.style.width = ''
    appWindow.style.height = ''
    parts.maximizeButton.setAttribute('aria-label', 'Maximize')
    taskButton.hidden = false
    taskButton.setAttribute('aria-pressed', 'true')
  })

  const tickClock = (): void => {
    parts.clock.textContent = new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  tickClock()
  setInterval(tickClock, 30_000)
}
