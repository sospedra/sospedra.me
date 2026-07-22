import dynamic from 'next/dynamic'
import type React from 'react'
import { useCallback, useReducer } from 'react'
import { trigger, useHotkeys, useKonami } from 'service/hotkeys'
import { useShake } from 'service/screen'
import { useSystem } from 'service/system'
import { useLog } from './log'

const Egg = dynamic(() => import('./Egg'))
const Tap = dynamic(() => import('./Tap'))

type EggState =
  | { phase: 'idle' }
  | { phase: 'tap' }
  | { phase: 'egg'; run: number; exitFullscreen: boolean }

type EggEvent =
  | { type: 'ACTIVATE'; exitFullscreen: boolean }
  | { type: 'DISMISS' }
  | { type: 'SHOW_TAP' }

const reducer = (state: EggState, event: EggEvent): EggState => {
  switch (event.type) {
    case 'ACTIVATE':
      return {
        phase: 'egg',
        // the run key remounts the egg when konami fires mid-run
        run: state.phase === 'egg' ? state.run + 1 : 0,
        exitFullscreen: event.exitFullscreen,
      }
    case 'DISMISS':
      return state.phase === 'egg' ? { phase: 'idle' } : state
    case 'SHOW_TAP':
      return { phase: 'tap' }
  }
}

const EasterEgg: React.FC<{ children: React.ReactNode }> = (props) => {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })
  const { discover } = useSystem()

  const activate = useCallback((exitFullscreen = false) => {
    dispatch({ type: 'ACTIVATE', exitFullscreen })
  }, [])

  const complete = useCallback(() => dispatch({ type: 'DISMISS' }), [])

  useKonami(() => {
    discover('konami')
    activate()
  })

  useHotkeys([['Escape', () => dispatch({ type: 'DISMISS' })]])

  useShake(() => {
    // synthetic Escape dismisses a running egg before the tap shows
    trigger('Escape')
    dispatch({ type: 'SHOW_TAP' })
  })

  useLog()

  return (
    <>
      {state.phase === 'tap' && <Tap activate={activate} />}
      {state.phase === 'egg' && (
        <Egg
          key={state.run}
          exitFullscreenOnComplete={state.exitFullscreen}
          onComplete={complete}
        />
      )}
      {props.children}
    </>
  )
}

export default EasterEgg
