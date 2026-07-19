import { useEffect } from 'react'
import mousetrap from 'mousetrap'
import { useRouter } from 'next/navigation'

type Trap = [string | string[], (e: KeyboardEvent, combo: string) => void]

export const useMousetrap = (traps: Trap[]) => {
  useEffect(() => {
    for (const [key, clbk] of traps) {
      mousetrap.bind(key, clbk)
    }
    return () => {
      for (const [key] of traps) {
        mousetrap.unbind(key)
      }
    }
  }, [])
}

export const Mousetrap: React.FC<{ children: React.ReactNode }> = (props) => {
  const router = useRouter()

  useMousetrap([
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

export const trigger = (key: string) => {
  mousetrap.trigger(key)
}
