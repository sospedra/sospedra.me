import { useEffect } from 'react'
import mousetrap from 'mousetrap'
import Router from 'next/router'

export const useMousetrap = (
  traps: [
    string | string[],
    (e: ExtendedKeyboardEvent, combo: string) => any,
  ][],
) => {
  useEffect(() => {
    traps.map(([key, clbk]) => {
      mousetrap.bind(key, clbk)
      return () => {
        mousetrap.unbind(key)
      }
    })
  }, [])
}

export const Mousetrap: React.FC<{}> = (props) => {
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
