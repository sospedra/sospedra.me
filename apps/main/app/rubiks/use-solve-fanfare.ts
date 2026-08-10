import { useCallback, useEffect, useRef } from 'react'
import { playFanfare } from 'services/audio/fanfare'
import { ensureRunning } from 'services/audio/kit'

export const useSolveFanfare = () => {
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(
    () => () => {
      const context = contextRef.current
      contextRef.current = null
      if (context && context.state !== 'closed') {
        void context.close().catch(() => {})
      }
    },
    [],
  )

  return useCallback(() => {
    try {
      if (!contextRef.current || contextRef.current.state === 'closed') {
        contextRef.current = new AudioContext()
      }
      const context = contextRef.current
      ensureRunning(context)
      playFanfare(context)
    } catch {
      // audio is celebration polish; a blocked context must never break the solve
    }
  }, [])
}
