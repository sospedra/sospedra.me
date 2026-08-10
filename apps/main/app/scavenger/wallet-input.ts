import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { navigateBackOrHome } from 'services/navigation-history'
import { prefersQuietFx } from 'services/theme'
import {
  clampSpread,
  type FloatFrom,
  spreadDiscs,
  type WalletEvent,
  type WalletState,
} from './wallet'
import { walletSfx } from './wallet-sfx'

export const CARD_ID = 'scavenger-liner'
export const EJECT_MS = 280
export const RETURN_MS = 600
export const CLOSE_MS = 2200

const BOOT_OPEN_MS = 500
const BOOT_DONE_MS = 2000
const FLIP_COOLDOWN_MS = 320
const WHEEL_THRESHOLD = 6
const SWIPE_THRESHOLD = 36
const DRAG_THRESHOLD = 48
const DRAG_CLICK_GRACE_MS = 250
const TAP_SLOP_PX = 16

/* mirrors the scavenger portrait media query: under it the book folds
   top over bottom and pages hinge on X */
export const PORTRAIT_BOOK_QUERY =
  '(max-width: 700px) and (orientation: portrait)'

const portraitBook = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(PORTRAIT_BOOK_QUERY).matches

let lastDragFlipAt = 0

const markDragFlip = () => {
  lastDragFlipAt = Date.now()
}

// a drag release also fires a click; interactive targets must ignore it
export const dragFlipJustEnded = () =>
  Date.now() - lastDragFlipAt < DRAG_CLICK_GRACE_MS

export function useBootSequence(
  state: WalletState,
  dispatch: React.Dispatch<WalletEvent>,
): void {
  useEffect(() => {
    let open: number | undefined
    let settle: number | undefined
    // deferred: the fx-quiet class lands in a parent effect, after this one
    const decide = window.setTimeout(() => {
      if (prefersQuietFx()) {
        dispatch({ type: 'BOOTED' })
        return
      }
      open = window.setTimeout(() => dispatch({ type: 'OPEN' }), BOOT_OPEN_MS)
      settle = window.setTimeout(
        () => dispatch({ type: 'BOOTED' }),
        BOOT_DONE_MS,
      )
    }, 0)
    return () => {
      window.clearTimeout(decide)
      window.clearTimeout(open)
      window.clearTimeout(settle)
    }
  }, [dispatch])

  const booting = state.phase === 'boot' || state.phase === 'opening'

  useEffect(() => {
    if (!booting) return
    const skip = () => {
      // a skip press also fires a click; the drag grace swallows it
      markDragFlip()
      dispatch({ type: 'BOOTED' })
    }
    window.addEventListener('pointerdown', skip, { passive: true })
    window.addEventListener('wheel', skip, { passive: true })
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [booting, dispatch])
}

type TimedStep = { ms: number; fire: () => WalletEvent }

// eject fires with the lifted pose measured, so the floater takes over
// exactly where the sleeve animation left the disc
const timedStep = (
  state: WalletState,
  actions: WalletActions,
): TimedStep | null => {
  if (state.phase === 'eject') {
    return {
      ms: EJECT_MS,
      fire: () => ({
        type: 'EJECTED',
        from: floatFromRect(
          actions.discButtons.current
            .get(state.disc)
            ?.firstElementChild?.getBoundingClientRect(),
        ),
      }),
    }
  }
  if (state.phase === 'return') {
    return { ms: RETURN_MS, fire: () => ({ type: 'RETURNED' }) }
  }
  if (state.phase === 'insert') {
    return { ms: EJECT_MS, fire: () => ({ type: 'INSERTED' }) }
  }
  return null
}

export function useWalletTimers(
  state: WalletState,
  actions: WalletActions,
  dispatch: React.Dispatch<WalletEvent>,
): void {
  useEffect(() => {
    const step = timedStep(state, actions)
    if (!step) return
    const delay = prefersQuietFx() ? 0 : step.ms
    const timer = window.setTimeout(() => dispatch(step.fire()), delay)
    return () => window.clearTimeout(timer)
  }, [state, actions, dispatch])
}

export function useCloseNavigation(state: WalletState): void {
  const router = useRouter()

  useEffect(() => {
    if (state.phase !== 'closing') return
    const delay = prefersQuietFx() ? 60 : CLOSE_MS
    const timer = window.setTimeout(
      () => navigateBackOrHome(() => router.push('/')),
      delay,
    )
    return () => window.clearTimeout(timer)
  }, [state, router])
}

export type WalletActions = {
  flip: (direction: 1 | -1) => void
  putBack: () => void
  toggleDisc: (disc: number) => void
  closeWallet: () => void
  registerButton: (disc: number, node: HTMLButtonElement | null) => void
  discButtons: React.RefObject<Map<number, HTMLButtonElement>>
  zipButton: React.RefObject<HTMLButtonElement | null>
  prevButton: React.RefObject<HTMLButtonElement | null>
  nextButton: React.RefObject<HTMLButtonElement | null>
}

const floatFromRect = (rect: DOMRect | undefined): FloatFrom | null =>
  rect
    ? {
        dx: rect.left + rect.width / 2 - window.innerWidth / 2,
        dy: rect.top + rect.height / 2 - window.innerHeight / 2,
        size: rect.width,
      }
    : null

export function useWalletActions(
  state: WalletState,
  dispatch: React.Dispatch<WalletEvent>,
): WalletActions {
  const flipLockUntil = useRef(0)
  const discButtons = useRef(new Map<number, HTMLButtonElement>())
  const zipButton = useRef<HTMLButtonElement | null>(null)
  const prevButton = useRef<HTMLButtonElement | null>(null)
  const nextButton = useRef<HTMLButtonElement | null>(null)

  const flip = useCallback(
    (direction: 1 | -1) => {
      if (state.phase !== 'browse') return
      const now = Date.now()
      if (now < flipLockUntil.current) return
      if (clampSpread(state.spread + direction) === state.spread) return
      flipLockUntil.current = now + FLIP_COOLDOWN_MS
      walletSfx.flip()
      dispatch({ type: 'FLIP', direction })
    },
    [state, dispatch],
  )

  const putBack = useCallback(() => {
    if (state.phase !== 'out') return
    walletSfx.settle()
    discButtons.current.get(state.disc)?.focus()
    dispatch({ type: 'PUT_BACK' })
  }, [state, dispatch])

  const toggleDisc = useCallback(
    (disc: number) => {
      if (dragFlipJustEnded()) return
      if (state.phase === 'out') {
        putBack()
        return
      }
      if (state.phase !== 'browse') return
      if (!spreadDiscs(state.spread).includes(disc)) return
      walletSfx.pull()
      dispatch({ type: 'PULL', disc })
    },
    [state, putBack, dispatch],
  )

  const closeWallet = useCallback(() => {
    if (dragFlipJustEnded()) return
    if (state.phase !== 'browse') return
    walletSfx.zip()
    dispatch({ type: 'CLOSE' })
  }, [state, dispatch])

  const registerButton = useCallback(
    (disc: number, node: HTMLButtonElement | null) => {
      if (node) discButtons.current.set(disc, node)
      else discButtons.current.delete(disc)
    },
    [],
  )

  return {
    flip,
    putBack,
    toggleDisc,
    closeWallet,
    registerButton,
    discButtons,
    zipButton,
    prevButton,
    nextButton,
  }
}

/* the portrait book hinges on X: an upward swipe lifts the page, so it
   advances; the desktop mapping keeps its drag-the-content feel */
const dragDirection = (dx: number, dy: number): 1 | -1 | null => {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dx) < DRAG_THRESHOLD) return null
    return dx > 0 ? -1 : 1
  }
  if (Math.abs(dy) < SWIPE_THRESHOLD) return null
  if (portraitBook()) return dy < 0 ? 1 : -1
  return dy < 0 ? -1 : 1
}

export function useDragGestures(flip: (direction: 1 | -1) => void): void {
  const dragStart = useRef<{ x: number; y: number; id: number } | null>(null)

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return
      flip(event.deltaY > 0 ? -1 : 1)
    }
    const onPointerDown = (event: PointerEvent) => {
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      }
    }
    // iOS fires pointercancel freely (edge swipes, multi-touch); a stale
    // start point turns the next tap into a phantom flip
    const onPointerCancel = () => {
      dragStart.current = null
    }
    const onPointerUp = (event: PointerEvent) => {
      const start = dragStart.current
      dragStart.current = null
      if (!start || start.id !== event.pointerId) return
      const direction = dragDirection(
        event.clientX - start.x,
        event.clientY - start.y,
      )
      if (!direction) return
      markDragFlip()
      flip(direction)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, {
      passive: true,
    })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [flip])
}

const pointInRectEllipse = (x: number, y: number, rect: DOMRect): boolean => {
  const dx = (x - (rect.left + rect.width / 2)) / (rect.width / 2)
  const dy = (y - (rect.top + rect.height / 2)) / (rect.height / 2)
  return dx * dx + dy * dy <= 1
}

const discAtPoint = (
  event: MouseEvent,
  spread: number,
  discButtons: Map<number, HTMLButtonElement>,
): number | undefined =>
  spreadDiscs(spread).find((disc) => {
    const rect = discButtons.get(disc)?.getBoundingClientRect()
    return rect ? pointInRectEllipse(event.clientX, event.clientY, rect) : false
  })

/* a disc button on a buried page is inert: it hit-tests but never fires,
   so the fallback must claim it instead of bailing */
const interactiveTarget = (event: MouseEvent): boolean => {
  const target = event.target as Element | null
  const interactive = target?.closest(`button, a, #${CARD_ID}`)
  return Boolean(interactive && !interactive.closest('[inert]'))
}

const pointInRect = (x: number, y: number, rect: DOMRect): boolean =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

const controlAtPoint = (
  event: MouseEvent,
  actions: WalletActions,
): (() => void) | null => {
  const controls: Array<
    [React.RefObject<HTMLButtonElement | null>, () => void]
  > = [
    [actions.zipButton, actions.closeWallet],
    [actions.prevButton, () => actions.flip(-1)],
    [actions.nextButton, () => actions.flip(1)],
  ]
  const hit = controls.find(([button]) => {
    const rect = button.current?.getBoundingClientRect()
    return rect ? pointInRect(event.clientX, event.clientY, rect) : false
  })
  return hit ? hit[1] : null
}

const fallbackAction = (
  event: MouseEvent,
  state: WalletState,
  actions: WalletActions,
): (() => void) | null => {
  if (dragFlipJustEnded()) return null
  if (interactiveTarget(event)) return null
  if (state.phase === 'out') return actions.putBack
  if (state.phase !== 'browse') return null
  const control = controlAtPoint(event, actions)
  if (control) return control
  const hit = discAtPoint(event, state.spread, actions.discButtons.current)
  return hit === undefined ? null : () => actions.toggleDisc(hit)
}

// chromium's input hit test misroutes clicks inside the preserve-3d stack,
// so bare-scene clicks resolve the disc from projected button geometry.
// The primary listener is pointerup: iOS never synthesizes a window click
// from a tap on a bare div, and the click twin is swallowed when handled.
export function usePointerFallback(
  state: WalletState,
  actions: WalletActions,
): void {
  useEffect(() => {
    let acted = false
    let start: { x: number; y: number; id: number } | null = null
    const onPointerDown = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY, id: event.pointerId }
    }
    const onPointerCancel = () => {
      start = null
    }
    const onPointerUp = (event: PointerEvent) => {
      acted = false
      const from = start
      start = null
      if (!from || from.id !== event.pointerId) return
      const travel = Math.hypot(event.clientX - from.x, event.clientY - from.y)
      if (travel > TAP_SLOP_PX) return
      const action = fallbackAction(event, state, actions)
      if (!action) return
      acted = true
      action()
    }
    const onClick = (event: MouseEvent) => {
      if (acted) {
        acted = false
        return
      }
      fallbackAction(event, state, actions)?.()
    }
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, {
      passive: true,
    })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('click', onClick)
    }
  }, [state, actions])
}
