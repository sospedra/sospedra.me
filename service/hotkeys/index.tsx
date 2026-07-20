import { useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect } from 'react'
import { tinykeys } from 'tinykeys'

type Trap = [string | string[], (event: KeyboardEvent) => void]

const isEditableTarget = (target: EventTarget | null) => {
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

  return (
    (event.metaKey && !usesMod && !binding.includes('meta+')) ||
    (event.ctrlKey &&
      !usesMod &&
      !binding.includes('control+') &&
      !binding.includes('ctrl+')) ||
    (event.altKey && !binding.includes('alt+')) ||
    (event.shiftKey && !binding.includes('shift+') && !matchesShiftedCharacter)
  )
}

export const useHotkeys = (traps: Trap[]) => {
  useEffect(() => {
    const bindings = traps.flatMap(([keys, handler]) => {
      const combos = Array.isArray(keys) ? keys : [keys]
      return combos.map(
        (combo) =>
          [
            combo,
            (event: KeyboardEvent) => {
              if (
                event.defaultPrevented ||
                event.isComposing ||
                isEditableTarget(event.target) ||
                hasUnexpectedModifier(event, combo)
              ) {
                return
              }

              handler(event)
            },
          ] as const,
      )
    })
    return tinykeys(window, Object.fromEntries(bindings))
  }, [traps])
}

export const Hotkeys: React.FC<{ children: React.ReactNode }> = (props) => {
  const router = useRouter()

  useHotkeys([
    [
      'b',
      (event) => {
        event.preventDefault()
        if (window.location.pathname !== '/') router.back()
      },
    ],
    [
      'h',
      (event) => {
        event.preventDefault()
        router.push('/')
      },
    ],
    [
      'p',
      (event) => {
        event.preventDefault()
        router.push('/papers')
      },
    ],
    [
      'a',
      (event) => {
        event.preventDefault()
        router.push('/about')
      },
    ],
  ])

  return <>{props.children}</>
}

// synthetic keydown: tinykeys has no programmatic trigger
export const trigger = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}
