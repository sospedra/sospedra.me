import { useRouter } from 'next/navigation'
import type React from 'react'
import { useEffect } from 'react'
import { tinykeys } from 'tinykeys'

type Trap = [string | string[], (event: KeyboardEvent) => void]

export const useHotkeys = (traps: Trap[]) => {
  useEffect(() => {
    const bindings = traps.flatMap(([keys, handler]) => {
      const combos = Array.isArray(keys) ? keys : [keys]
      return combos.map((combo) => [combo, handler] as const)
    })
    return tinykeys(window, Object.fromEntries(bindings))
  }, [traps])
}

export const Hotkeys: React.FC<{ children: React.ReactNode }> = (props) => {
  const router = useRouter()

  useHotkeys([
    [
      'b',
      () => {
        if (window.location.pathname !== '/') router.back()
      },
    ],
    ['h', () => router.push('/')],
    ['p', () => router.push('/papers')],
    ['a', () => router.push('/about')],
  ])

  return <>{props.children}</>
}

// synthetic keydown: tinykeys has no programmatic trigger
export const trigger = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}
