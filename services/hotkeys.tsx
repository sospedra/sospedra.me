import { clamp, debounce } from 'es-toolkit'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { readLocal, writeLocal } from 'services/storage'
import { prefersQuietFx } from 'services/theme'
import { VBODY_ID } from 'services/vbody'
import { tinykeys } from 'tinykeys'

export type Trap = [string | string[], (event: KeyboardEvent) => void]

export const sceneTrap =
  (press: () => void) =>
  (event: KeyboardEvent): void => {
    event.preventDefault()
    press()
  }

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const
const KONAMI_WINDOW = 3000
const SUCCESS_KEY_HOLD_MS = 750
const konamiDirectionalKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])
const capturedEvents = new WeakSet<KeyboardEvent>()
const konamiListeners = new Set<() => void>()
let konamiCursor = 0
let konamiTimeout: number | null = null
let successKey: string | null = null
let gameInputClaims = 0

// WCAG 2.1.4: bare character shortcuts must have an off switch
const LETTER_KEYS_KEY = 'midnight-io:letter-keys'
let letterKeysOff: boolean | null = null
const letterKeysListeners = new Set<() => void>()

export const letterKeysDisabled = () => {
  if (typeof window === 'undefined') return false
  letterKeysOff ??= readLocal(LETTER_KEYS_KEY) === 'off'
  return letterKeysOff
}

export const setLetterKeysEnabled = (enabled: boolean) => {
  letterKeysOff = !enabled
  writeLocal(LETTER_KEYS_KEY, enabled ? 'on' : 'off')
  for (const listener of letterKeysListeners) listener()
}

const subscribeLetterKeys = (listener: () => void) => {
  letterKeysListeners.add(listener)
  return () => {
    letterKeysListeners.delete(listener)
  }
}

export const useLetterKeysEnabled = () =>
  useSyncExternalStore(
    subscribeLetterKeys,
    () => !letterKeysDisabled(),
    () => true,
  )

// shift does not count: Shift+G is still a character-only shortcut
const isCharacterCombo = (combo: string) => {
  const parts = combo.split('+')
  const key = parts.at(-1) ?? ''
  const hasRealModifier = parts
    .slice(0, -1)
    .some((part) => part.toLowerCase() !== 'shift')
  return !hasRealModifier && key.length === 1
}

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
    ),
  )
}

const hasUnexpectedModifier = (event: KeyboardEvent, combo: string) => {
  const binding = combo.toLowerCase()
  const usesMod = binding.includes('$mod+')
  const matchesShiftedCharacter =
    event.shiftKey && !binding.includes('+') && event.key === combo

  const unexpectedMeta = event.metaKey && !usesMod && !binding.includes('meta+')
  const unexpectedCtrl =
    event.ctrlKey &&
    !usesMod &&
    !binding.includes('control+') &&
    !binding.includes('ctrl+')
  const unexpectedAlt = event.altKey && !binding.includes('alt+')
  const unexpectedShift =
    event.shiftKey && !binding.includes('shift+') && !matchesShiftedCharacter

  return unexpectedMeta || unexpectedCtrl || unexpectedAlt || unexpectedShift
}

const clearKonamiSession = () => {
  konamiCursor = 0
  if (konamiTimeout !== null) {
    window.clearTimeout(konamiTimeout)
    konamiTimeout = null
  }
}

const startKonamiSession = () => {
  clearKonamiSession()
  konamiCursor = 1
  konamiTimeout = window.setTimeout(clearKonamiSession, KONAMI_WINDOW)
}

const captureEvent = (event: KeyboardEvent) => {
  capturedEvents.add(event)
  event.preventDefault()
  event.stopImmediatePropagation()
}

const scheduleSuccessKeyClear = debounce(() => {
  successKey = null
}, SUCCESS_KEY_HOLD_MS)

const clearSuccessKey = () => {
  successKey = null
  scheduleSuccessKeyClear.cancel()
}

const isModifiedOrRepeatedKey = (event: KeyboardEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  event.shiftKey ||
  event.repeat

const dropModifiedKonamiInput = (event: KeyboardEvent) => {
  if (konamiCursor > 0 && !konamiDirectionalKeys.has(event.key)) {
    captureEvent(event)
  }
  clearKonamiSession()
}

const advanceKonamiSequence = (event: KeyboardEvent) => {
  // Directional keys stay available to local UI (the Papers remote, native
  // scrolling, games) while Konami listens in capture phase. The tail keys
  // are consumed so `b`/`a` cannot trigger global routes mid-sequence.
  if (!konamiDirectionalKeys.has(event.key)) captureEvent(event)

  if (event.key !== KONAMI_SEQUENCE[konamiCursor]) {
    if (event.key === KONAMI_SEQUENCE[0]) startKonamiSession()
    else clearKonamiSession()
    return
  }

  konamiCursor += 1
  if (konamiCursor !== KONAMI_SEQUENCE.length) return

  clearKonamiSession()
  successKey = event.key
  scheduleSuccessKeyClear()
  for (const listener of konamiListeners) listener()
}

const captureKonamiInput = (event: KeyboardEvent) => {
  // arcade pages own the keyboard: their steering walks the konami prefix,
  // and the trap would eat the next space/5/enter for the whole window
  if (gameInputClaims > 0) return

  if (successKey === event.key) {
    captureEvent(event)
    scheduleSuccessKeyClear()
    return
  }

  if (event.isComposing || isEditableTarget(event.target)) {
    clearKonamiSession()
    return
  }

  if (isModifiedOrRepeatedKey(event)) {
    dropModifiedKonamiInput(event)
    return
  }

  if (konamiCursor === 0) {
    if (event.key === KONAMI_SEQUENCE[0]) startKonamiSession()
    return
  }

  advanceKonamiSequence(event)
}

const releaseKonamiSuccessKey = (event: KeyboardEvent) => {
  if (event.key !== successKey) return
  clearSuccessKey()
}

const GOTO_ROUTES: Record<string, Route> = {
  h: '/',
  p: '/papers',
  a: '/about',
  b: '/bazaar',
  m: '/manual',
  r: '/rubiks',
  u: '/uses',
  c: '/console',
  t: '/videoclub',
  v: '/travel',
}

const GOTO_WINDOW = 1400
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])
let gotoPending = false
let gotoTimeout: number | null = null

const clearGotoSession = () => {
  gotoPending = false
  if (gotoTimeout !== null) {
    window.clearTimeout(gotoTimeout)
    gotoTimeout = null
  }
}

const startGotoSession = () => {
  clearGotoSession()
  gotoPending = true
  gotoTimeout = window.setTimeout(clearGotoSession, GOTO_WINDOW)
}

const resolveGotoKey = (
  event: KeyboardEvent,
  navigate: (url: Route) => void,
) => {
  if (isModifiedOrRepeatedKey(event)) return
  if (event.key === 'g') {
    captureEvent(event)
    scrollToPageEdge(-1)
    return
  }
  const route = GOTO_ROUTES[event.key]
  if (!route) return
  captureEvent(event)
  navigate(route)
}

// vim-style leader: `g` arms a goto window, the next key picks the sector.
// Capture phase, like konami: the second key must never reach single-key
// traps (`g b` warps to the bazaar instead of also triggering "back").
const handleGotoCapture = (
  event: KeyboardEvent,
  navigate: (url: Route) => void,
) => {
  const inactive =
    letterKeysDisabled() || gameInputClaims > 0 || MODIFIER_KEYS.has(event.key)
  if (inactive) return
  if (event.isComposing || isEditableTarget(event.target)) {
    clearGotoSession()
    return
  }
  if (gotoPending) {
    clearGotoSession()
    resolveGotoKey(event, navigate)
    return
  }
  if (event.key === 'g' && !isModifiedOrRepeatedKey(event)) {
    startGotoSession()
  }
}

const createGotoCapture =
  (navigate: (url: Route) => void) => (event: KeyboardEvent) =>
    handleGotoCapture(event, navigate)

const canScrollVertically = (element: HTMLElement) => {
  if (element.scrollHeight - element.clientHeight <= 1) return false
  const overflow = getComputedStyle(element).overflowY
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

const MAX_ANCESTOR_HOPS = 32

const findScrollableAncestor = (
  seed: HTMLElement | null,
  root: HTMLElement,
) => {
  let candidate = seed
  for (let hop = 0; candidate && hop < MAX_ANCESTOR_HOPS; hop += 1) {
    if (canScrollVertically(candidate)) return candidate
    if (candidate === root) break
    candidate = candidate.parentElement
  }
  return null
}

const surfaceFrom = (node: Element | null, root: HTMLElement) =>
  node instanceof HTMLElement && root.contains(node)
    ? findScrollableAncestor(node, root)
    : null

const getActiveScrollSurface = () => {
  // shell-less scenes scroll their own <main> instead of #vbody
  const root =
    document.getElementById(VBODY_ID) ??
    document.querySelector<HTMLElement>('main')
  if (!root) return null

  return (
    surfaceFrom(document.activeElement, root) ??
    surfaceFrom(
      document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2),
      root,
    ) ??
    surfaceFrom(root, root)
  )
}

const getScrollBehavior = (): ScrollBehavior =>
  prefersQuietFx() ? 'auto' : 'smooth'

const nearestSceneIndex = (scenes: HTMLElement[], surfaceTop: number) => {
  const distances = scenes.map((scene) =>
    Math.abs(scene.getBoundingClientRect().top - surfaceTop),
  )
  return distances.indexOf(Math.min(...distances))
}

// The Bazaar is a scene sequence, so j/k should select the next authored
// stage rather than land between rows with a generic percentage scroll.
const scrollSceneSequence = (
  scenes: HTMLElement[],
  direction: -1 | 1,
  surface: HTMLElement,
) => {
  const current = nearestSceneIndex(scenes, surface.getBoundingClientRect().top)
  const next = clamp(current + direction, 0, scenes.length - 1)
  if (next === current) return false

  scenes[next]?.scrollIntoView({
    behavior: getScrollBehavior(),
    block: 'start',
  })
  return true
}

const PAGE_SCROLL_MIN_PX = 240
const PAGE_SCROLL_MAX_PX = 720
const PAGE_SCROLL_VIEWPORT_SHARE = 0.68

const scrollSurfaceByPage = (surface: HTMLElement, direction: -1 | 1) => {
  const atStart = surface.scrollTop <= 1
  const atEnd =
    surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 1
  const atBoundary = direction === -1 ? atStart : atEnd
  if (atBoundary) return false

  const distance = clamp(
    Math.round(surface.clientHeight * PAGE_SCROLL_VIEWPORT_SHARE),
    PAGE_SCROLL_MIN_PX,
    PAGE_SCROLL_MAX_PX,
  )

  surface.scrollBy({ behavior: getScrollBehavior(), top: distance * direction })
  return true
}

const scrollActivePage = (direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  // responsive twins render both trees; only the displayed one has extent
  const marketScenes = Array.from(
    surface.querySelectorAll<HTMLElement>('[data-market-scene]'),
  ).filter((scene) => scene.getBoundingClientRect().height > 0)
  if (marketScenes.length > 1) {
    return scrollSceneSequence(marketScenes, direction, surface)
  }

  return scrollSurfaceByPage(surface, direction)
}

const hasOpenModal = () =>
  Boolean(document.querySelector('dialog[open], [aria-modal="true"]'))

const scrollToPageEdge = (direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  surface.scrollTo({
    behavior: getScrollBehavior(),
    top: direction === -1 ? 0 : surface.scrollHeight,
  })
  return true
}

// `[` / `]` on authored sequences (manual sheets): jump to the sibling
// element marked with the selector instead of a percentage scroll
export const scrollMarkedScene = (selector: string, direction: -1 | 1) => {
  if (hasOpenModal()) return false

  const surface = getActiveScrollSurface()
  if (!surface) return false

  const scenes = Array.from(surface.querySelectorAll<HTMLElement>(selector))
  if (scenes.length < 2) return false
  return scrollSceneSequence(scenes, direction, surface)
}

// Space and Enter must keep activating a focused control (WCAG 2.1.1);
// scene traps on them only fire when focus rests on a non-interactive node
const ACTIVATION_COMBOS = new Set(['space', 'enter'])

const isActivationTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('a, button, [role="button"], summary'))

const shouldIgnoreTrap = (event: KeyboardEvent, combo: string) =>
  gameInputClaims > 0 ||
  (letterKeysDisabled() && isCharacterCombo(combo)) ||
  (ACTIVATION_COMBOS.has(combo.toLowerCase()) &&
    isActivationTarget(event.target)) ||
  capturedEvents.has(event) ||
  event.defaultPrevented ||
  event.isComposing ||
  isEditableTarget(event.target) ||
  hasUnexpectedModifier(event, combo)

export const useHotkeys = (traps: Trap[]) => {
  useEffect(() => {
    const bindings = traps.flatMap(([keys, handler]) => {
      const combos = Array.isArray(keys) ? keys : [keys]
      return combos.map(
        (combo) =>
          [
            combo,
            (event: KeyboardEvent) => {
              if (shouldIgnoreTrap(event, combo)) return
              handler(event)
            },
          ] as const,
      )
    })
    return tinykeys(window, Object.fromEntries(bindings))
  }, [traps])
}

export const useGameInput = () => {
  useEffect(() => {
    gameInputClaims += 1
    clearKonamiSession()
    return () => {
      gameInputClaims -= 1
    }
  }, [])
}

export const useKonami = (handler: () => void) => {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const notify = () => handlerRef.current()
    konamiListeners.add(notify)
    return () => {
      konamiListeners.delete(notify)
    }
  }, [])
}

export const Hotkeys: React.FC<{ children: React.ReactNode }> = (props) => {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const captureGotoInput = createGotoCapture((url) => router.push(url))
    window.addEventListener('keydown', captureKonamiInput, { capture: true })
    window.addEventListener('keydown', captureGotoInput, { capture: true })
    window.addEventListener('keyup', releaseKonamiSuccessKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', captureKonamiInput, {
        capture: true,
      })
      window.removeEventListener('keydown', captureGotoInput, {
        capture: true,
      })
      window.removeEventListener('keyup', releaseKonamiSuccessKey, {
        capture: true,
      })
      clearKonamiSession()
      clearGotoSession()
      clearSuccessKey()
    }
  }, [router])

  useHotkeys([
    [
      'b',
      (event) => {
        event.preventDefault()
        if (pathname !== '/') router.back()
      },
    ],
    ...(['h', 'p', 'a'] as const).map(
      (key): Trap => [
        key,
        (event) => {
          event.preventDefault()
          router.push(GOTO_ROUTES[key])
        },
      ],
    ),
    [
      'j',
      (event) => {
        if (scrollActivePage(1)) event.preventDefault()
      },
    ],
    [
      'k',
      (event) => {
        if (scrollActivePage(-1)) event.preventDefault()
      },
    ],
    [
      // 'G' alone would also match a bare 'g': tinykeys compares keys
      // case-insensitively, so the shift modifier must be explicit
      'Shift+G',
      (event) => {
        if (scrollToPageEdge(1)) event.preventDefault()
      },
    ],
  ])

  return <>{props.children}</>
}

// synthetic keydown: tinykeys has no programmatic trigger
export const trigger = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}
