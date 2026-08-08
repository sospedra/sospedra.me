import { usePathname, useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect } from 'react'
import {
  clearGotoSession,
  createGotoCapture,
  GOTO_ROUTES,
} from 'services/goto-nav'
import {
  clearKonamiSession,
  clearSuccessKey,
  createKonamiCapture,
  releaseKonamiSuccessKey,
  useKonami,
} from 'services/konami'
import {
  letterKeysDisabled,
  setLetterKeysEnabled,
  useLetterKeysEnabled,
} from 'services/letter-keys'
import { navigateBackOrHome } from 'services/navigation-history'
import {
  scrollActivePage,
  scrollMarkedScene,
  scrollToPageEdge,
} from 'services/scroll-nav'
import {
  ACTIVATION_COMBOS,
  capturedEvents,
  hasUnexpectedModifier,
  isActivationTarget,
  isCharacterCombo,
  isEditableTarget,
} from 'services/trap-guards'
import { tinykeys } from 'tinykeys'

export type Trap = [string | string[], (event: KeyboardEvent) => void]

export const sceneTrap =
  (press: () => void) =>
  (event: KeyboardEvent): void => {
    event.preventDefault()
    press()
  }

let gameInputClaims = 0

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

export const Hotkeys: React.FC<{ children: React.ReactNode }> = (props) => {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isGameInputClaimed = () => gameInputClaims > 0
    const captureGotoInput = createGotoCapture(
      (url) => router.push(url),
      isGameInputClaimed,
    )
    const captureKonamiInput = createKonamiCapture(isGameInputClaimed)
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
        if (pathname !== '/') {
          navigateBackOrHome(() => router.push('/'))
        }
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

export {
  isEditableTarget,
  letterKeysDisabled,
  scrollMarkedScene,
  setLetterKeysEnabled,
  useKonami,
  useLetterKeysEnabled,
}
