import { useEffect, useRef, useState } from 'react'

export const useInterval = (callback: () => void, delay: number) => {
  const memo = useRef<(() => void) | undefined>(undefined)
  const [interval, saveInterval] = useState<ReturnType<typeof setInterval>>()

  useEffect(() => {
    memo.current = callback
  }, [callback])

  useEffect(() => {
    const tick = () => memo.current?.()
    const interval = setInterval(tick, delay)
    saveInterval(interval)

    return () => clearInterval(interval)
  }, [delay])

  return interval
}
