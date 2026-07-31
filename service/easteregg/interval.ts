import { useEffect, useRef } from 'react'

export const useInterval = (callback: () => void, delay: number | null) => {
  const memo = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    memo.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    const interval = setInterval(() => memo.current?.(), delay)
    return () => clearInterval(interval)
  }, [delay])
}
