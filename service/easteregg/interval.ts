import { useEffect, useRef, useState } from 'react'

export const useInterval = (callback: Function, delay: number) => {
  const memo = useRef<Function>()
  const [interval, saveInterval] = useState<ReturnType<typeof setInterval>>()

  useEffect(() => {
    memo.current = callback
  }, [callback])

  useEffect(() => {
    const tick = () => memo.current && memo.current()
    const interval = setInterval(tick, delay)
    saveInterval(interval)

    return () => clearInterval(interval)
  }, [delay])

  return interval
}
