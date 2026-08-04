import type React from 'react'
import { useEffect, useRef } from 'react'
import { letterKeysDisabled } from 'services/hotkeys'
import { readLocal, writeLocal } from 'services/storage'
import { type GameEvent, type GameState, type Phase, stepMsFor } from './engine'
import { KEY_SELECT, KEY_TURNS, spotForKey } from './hotspots'
import { play, transitionSound } from './sound'

type Dispatch = React.Dispatch<GameEvent>
type SetPressed = React.Dispatch<React.SetStateAction<ReadonlySet<string>>>

const TOP_KEY = 'snake-top'
const LEVEL_KEY = 'snake-level'

export const useStoredProgress = (state: GameState, dispatch: Dispatch) => {
  const levelPersistReady = useRef(false)

  useEffect(() => {
    const top = Number(readLocal(TOP_KEY))
    if (top > 0) dispatch({ type: 'TOP', top })
    const level = Number(readLocal(LEVEL_KEY))
    if (level > 0) dispatch({ type: 'LEVEL', level })
  }, [dispatch])

  useEffect(() => {
    if (state.phase === 'over' && state.top > 0) {
      writeLocal(TOP_KEY, String(state.top))
    }
  }, [state.phase, state.top])

  // skip the mount pass: writing the default would clobber the stored level
  useEffect(() => {
    if (!levelPersistReady.current) {
      levelPersistReady.current = true
      return
    }
    writeLocal(LEVEL_KEY, String(state.level))
  }, [state.level])
}

export const useGameClock = (
  phase: Phase,
  level: number,
  dispatch: Dispatch,
) => {
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(
      () => dispatch({ type: 'TICK', roll: Math.random() }),
      stepMsFor(level),
    )
    return () => window.clearInterval(id)
  }, [phase, level, dispatch])
}

export const useKeypad = (dispatch: Dispatch, setPressed: SetPressed) => {
  useEffect(() => {
    const lightSpot = (key: string, down: boolean) =>
      setPressed((prev) => {
        const spot = spotForKey(key)
        if (!spot) return prev
        const next = new Set(prev)
        if (down) next.add(spot)
        else next.delete(spot)
        return next
      })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return
      }
      // letter/digit steering obeys the shortcut switch; arrows and space stay
      if (event.key.length === 1 && event.key !== ' ' && letterKeysDisabled()) {
        return
      }
      lightSpot(event.key, true)
      const dir = KEY_TURNS[event.key]
      if (dir) {
        event.preventDefault()
        play('key')
        dispatch({ type: 'TURN', dir, roll: Math.random() })
        return
      }
      if (!KEY_SELECT.has(event.key)) return
      // a focused link or button keeps its native Enter and Space
      if (event.target instanceof Element && event.target.closest('a, button'))
        return
      event.preventDefault()
      dispatch({ type: 'SELECT', roll: Math.random() })
    }

    const onKeyUp = (event: KeyboardEvent) => {
      lightSpot(event.key, false)
    }

    const releaseAll = () => setPressed(new Set())

    // capture phase: the global hotkeys (a → /about, j/k scroll) skip
    // defaultPrevented events, so wasd stays on the snake
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
      window.removeEventListener('blur', releaseAll)
    }
  }, [dispatch, setPressed])
}

export const usePauseOnHide = (dispatch: Dispatch) => {
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: 'HIDE' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [dispatch])
}

export const useTransitionSounds = (state: GameState) => {
  const prevRef = useRef(state)

  useEffect(() => {
    const sound = transitionSound(prevRef.current, state)
    prevRef.current = state
    if (sound) play(sound)
  }, [state])
}
