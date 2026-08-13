import { useEffect } from 'react'
import type { CrosswordKeyEvent } from './use-crossword-keyboard'

/* with the letter bank up nothing holds focus, so hardware keydowns land on
   window; skip anything a focused control already handled */
export const useHardwareKeys = ({
  enabled,
  handleKeyDown,
  playing,
}: {
  enabled: boolean
  handleKeyDown: (event: CrosswordKeyEvent) => void
  playing: boolean
}) => {
  useEffect(() => {
    if (!enabled || !playing) return
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const onControl =
        event.target instanceof HTMLElement &&
        event.target.closest('button, input, select, textarea, a, dialog')
      if (onControl) return
      handleKeyDown({
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        nativeEvent: event,
        preventDefault: () => event.preventDefault(),
        shiftKey: event.shiftKey,
      })
    }
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [enabled, playing, handleKeyDown])
}
