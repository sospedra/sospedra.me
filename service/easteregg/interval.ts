import { useEffect, useRef } from 'react'

export const useInterval = (callback: Function, delay: number) => {
  const memo = useRef<Function>()

  useEffect(() => {
    memo.current = callback
  }, [callback])

  useEffect(() => {
    const tick = () => memo.current && memo.current()
    const interval = setInterval(tick, delay)

    return () => clearInterval(interval)
  }, [delay])
}
