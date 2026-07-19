import { useEffect } from 'react'
import mousetrap from 'mousetrap'
import Router from 'next/router'

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
  useMousetrap([
    ['b', () => Router.pathname !== '/' && Router.back()],
    ['h', () => Router.push('/')],
    ['p', () => Router.push('/papers')],
    ['a', () => Router.push('/about')],
  ])

  return <>{props.children}</>
}

export const trigger = (key: string) => {
  mousetrap.trigger(key)
}
