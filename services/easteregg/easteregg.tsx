import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useMemo, useReducer } from 'react'
import { type Trap, trigger, useHotkeys, useKonami } from 'services/hotkeys'
import { useShake } from 'services/shake'
import { useSystem } from 'services/system'
import { useTheme } from 'services/theme'
import { useLog } from './log'

const Egg = dynamic(() => import('./egg'))
const Tap = dynamic(() => import('./tap'))

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
      return state.phase === 'idle' ? state : { phase: 'idle' }
    case 'SHOW_TAP':
      return { phase: 'tap' }
  }
}

const EasterEgg: React.FC<{ children: React.ReactNode }> = (props) => {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })
  const { anomalies, discover, notify } = useSystem()
  const { fxMode } = useTheme()
  const pathname = usePathname()

  const activate = () => dispatch({ type: 'ACTIVATE', exitFullscreen: false })
  const activateThenExitFullscreen = () =>
    dispatch({ type: 'ACTIVATE', exitFullscreen: true })
  const complete = () => dispatch({ type: 'DISMISS' })

  useKonami(() => {
    // discover() only announces the first run; repeats still need audio feedback
    if (anomalies.includes('konami')) notify('OVERRIDE REPLAYED ▼')
    discover('konami')
    activate()
  })

  const dismissTraps = useMemo<Trap[]>(
    () => [['Escape', () => dispatch({ type: 'DISMISS' })]],
    [],
  )
  useHotkeys(dismissTraps)

  // quiet mode also disables motion actuation (WCAG 2.5.4);
  // the konami sequence stays as the equivalent UI path
  useShake(
    () => {
      // synthetic Escape dismisses a running egg before the tap shows
      trigger('Escape')
      dispatch({ type: 'SHOW_TAP' })
    },
    !pathname.startsWith('/papers/') && fxMode === 'full',
  )

  useLog()

  return (
    <>
      {state.phase === 'tap' && (
        <Tap
          activate={activate}
          activateThenExitFullscreen={activateThenExitFullscreen}
        />
      )}
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
