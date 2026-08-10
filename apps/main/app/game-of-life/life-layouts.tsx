import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react'
import { tapHaptic } from 'services/haptics'
import { isKeyboardClick } from 'services/keyboard-click'
import { GoBack, LinkBack } from 'services/link'
import css from './cockpit.module.css'
import cockpitCrown from './cockpit-crown.module.css'
import controlDeck from './control-deck.module.css'
import { CrtAssembly } from './crt-assembly'
import type { LifeState } from './engine'
import { FieldControls } from './field-controls'
import { GridPilot } from './grid-pilot'
import identityPlate from './identity-plate.module.css'
import type { LifeMechanicalSound } from './life-audio'
import type { LifeCanvasUi } from './life-canvas'
import modeButton from './mode-button.module.css'
import { PatternBay } from './pattern-bay'
import patternHandle from './pattern-handle.module.css'
import { PatternTrigger } from './pattern-trigger'
import { PopulationPod } from './population-pod'
import { PresetRail } from './preset-rail'
import { type InteractiveLifePreset, LIFE_PRESETS, presetById } from './presets'
import { SpeedControl } from './speed-control'
import { TransportControls } from './transport-controls'

export type { LifeTool } from './life-canvas'

export type LifeLayoutProps = {
  state: LifeState
  running: boolean
  speed: number
  status: string
  seedName: string
  patternBayOpen: boolean
  canvas: LifeCanvasUi
  loadPreset: (preset: InteractiveLifePreset) => void
  toggleRunning: () => void
  stepOnce: () => void
  resetUniverse: () => void
  clearUniverse: () => void
  setSpeed: (speed: number) => void
  setPatternBayOpen: (open: boolean) => void
  soundEnabled: boolean
  toggleSound: () => void
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  unlockAudio: () => void
}

const isDisabledControl = (control: HTMLElement) =>
  control.matches(':disabled') ||
  control.getAttribute('aria-disabled') === 'true' ||
  control.getAttribute('data-disabled') === 'true' ||
  control.querySelector(':disabled') !== null

export const LifeLayout = ({
  canvas,
  clearUniverse,
  loadPreset,
  patternBayOpen,
  playMechanicalSound,
  resetUniverse,
  running,
  seedName,
  setPatternBayOpen,
  setSpeed,
  speed,
  state,
  status,
  stepOnce,
  soundEnabled,
  toggleSound,
  toggleRunning,
  unlockAudio,
}: LifeLayoutProps) => {
  const selectedPreset = presetById(state.presetId)
  const selectedIndex = selectedPreset
    ? LIFE_PRESETS.indexOf(selectedPreset)
    : -1
  const selectedNumber =
    selectedIndex < 0 ? '--' : String(selectedIndex + 1).padStart(2, '0')
  const deckPatternHandleRef = useRef<HTMLButtonElement>(null)
  const presetRailRef = useRef<HTMLElement>(null)
  const pressAnimationsRef = useRef(new Map<HTMLElement, Animation>())

  useEffect(
    () => () => {
      for (const animation of pressAnimationsRef.current.values()) {
        animation.cancel()
      }
      pressAnimationsRef.current.clear()
    },
    [],
  )

  const pulseMechanicalControl = (
    origin: EventTarget | null,
    keyboardActivation = false,
  ) => {
    if (!(origin instanceof Element)) return
    const control = origin.closest<HTMLElement>(
      'button:not(:disabled), a[href]',
    )
    if (!control) return
    const keyboardReset =
      keyboardActivation && control.classList.contains(modeButton.modeButton)
    if (control.hasAttribute('data-no-press-pulse') && !keyboardReset) return
    if (control.getAttribute('aria-disabled') === 'true') return

    const surface = keyboardReset
      ? (control.querySelector<HTMLElement>(`.${modeButton.modeButtonTop}`) ??
        control)
      : control.classList.contains(patternHandle.patternHandle)
        ? (control.querySelector<HTMLElement>(
            `.${patternHandle.patternHandleAction}`,
          ) ?? control)
        : control
    pressAnimationsRef.current.get(surface)?.cancel()

    const style = window.getComputedStyle(surface)
    const restTransform =
      style.transform === 'none' ? 'translateY(0)' : style.transform
    const restShadow = style.boxShadow
    const restFilter = style.filter
    const pressedShadow =
      style.getPropertyValue('--life-key-pressed').trim() || restShadow
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const animation = surface.animate(
      reduceMotion
        ? [
            { boxShadow: restShadow, filter: restFilter, offset: 0 },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.88)',
              offset: 0.35,
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.88)',
              offset: 0.65,
            },
            { boxShadow: restShadow, filter: restFilter, offset: 1 },
          ]
        : [
            {
              boxShadow: restShadow,
              filter: restFilter,
              offset: 0,
              transform: restTransform,
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.86) saturate(0.92)',
              offset: 0.42,
              transform: 'translateY(0.34rem) scale(0.985)',
            },
            {
              boxShadow: pressedShadow,
              filter: 'brightness(0.86) saturate(0.92)',
              offset: 0.62,
              transform: 'translateY(0.34rem) scale(0.985)',
            },
            {
              boxShadow: restShadow,
              filter: 'brightness(1.06)',
              offset: 0.82,
              transform: 'translateY(-0.14rem) scale(1.005)',
            },
            {
              boxShadow: restShadow,
              filter: restFilter,
              offset: 1,
              transform: restTransform,
            },
          ],
      {
        duration: reduceMotion ? 180 : 300,
        easing: 'cubic-bezier(0.2, 0.84, 0.2, 1)',
      },
    )
    pressAnimationsRef.current.set(surface, animation)
    void animation.finished
      .catch(() => undefined)
      .then(() => {
        if (pressAnimationsRef.current.get(surface) === animation) {
          pressAnimationsRef.current.delete(surface)
        }
      })
  }

  const cueMechanicalControl = (origin: EventTarget | null) => {
    if (!(origin instanceof Element)) return
    const declared = origin.closest<HTMLElement>('[data-life-sfx]')
    const control =
      declared ?? origin.closest<HTMLElement>('button:not(:disabled), a[href]')
    if (!control) return
    if (isDisabledControl(control)) return

    const kind = (declared?.dataset.lifeSfx ?? 'key') as LifeMechanicalSound
    playMechanicalSound(kind)
    tapHaptic()
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    pulseMechanicalControl(event.target)
    cueMechanicalControl(event.target)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') unlockAudio()
  }

  const handleMechanicalClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!isKeyboardClick(event)) {
      unlockAudio()
      return
    }
    pulseMechanicalControl(event.target, true)
    cueMechanicalControl(event.target)
  }

  const returnFocusToPatternHandle = () => {
    requestAnimationFrame(() => {
      const activeRailPreset =
        presetRailRef.current?.querySelector<HTMLElement>(
          '[aria-current="true"]',
        ) ??
        presetRailRef.current?.querySelector<HTMLElement>('button, a[href]')
      const visibleTarget = [
        deckPatternHandleRef.current,
        activeRailPreset,
      ].find((target) => target && target.getClientRects().length > 0)
      visibleTarget?.focus()
    })
  }
  const closePatternBay = () => {
    setPatternBayOpen(false)
    returnFocusToPatternHandle()
  }
  const loadFromPatternBay = (preset: InteractiveLifePreset) => {
    loadPreset(preset)
    returnFocusToPatternHandle()
  }
  const togglePatternBay = () => {
    patternBayOpen ? closePatternBay() : setPatternBayOpen(true)
  }

  return (
    <article
      className={css.cockpit}
      data-running={running ? 'true' : 'false'}
      aria-labelledby='life-engine-title'
      onClickCapture={handleMechanicalClick}
      onPointerDownCapture={handlePointerDown}
      onPointerUpCapture={handlePointerUp}
    >
      <header className={cockpitCrown.crown}>
        <GoBack className={cockpitCrown.backKey} aria-label='Go back'>
          <LinkBack className={cockpitCrown.backKeyControl}>Back</LinkBack>
          <small>Eject</small>
        </GoBack>

        <div className={identityPlate.identityPlate}>
          <span>Conway field instrument</span>
          <h1 id='life-engine-title'>
            Life engine <em>C-70</em>
          </h1>
        </div>

        <div className={identityPlate.programPlate}>
          <span>Docked program / {selectedNumber}</span>
          <strong>{seedName}</strong>
        </div>

        <div
          className={identityPlate.systemLamp}
          data-running={running ? 'true' : 'false'}
          data-empty={state.cells.size === 0 ? 'true' : 'false'}
        >
          <i aria-hidden='true' />
          <span>System</span>
          <strong>{status}</strong>
        </div>
      </header>

      <div className={css.workbench}>
        <PresetRail
          railRef={presetRailRef}
          loadPreset={loadPreset}
          state={state}
        />
        <section className={css.forwardBay}>
          <CrtAssembly
            canvas={canvas}
            running={running}
            seedName={seedName}
            state={state}
            status={status}
          />
          <PopulationPod state={state} />
        </section>

        <section
          className={controlDeck.controlDeck}
          aria-label='Simulation controls'
        >
          <FieldControls
            canvas={canvas}
            playMechanicalSound={playMechanicalSound}
            resetUniverse={resetUniverse}
          />
          <SpeedControl
            playMechanicalSound={playMechanicalSound}
            speed={speed}
            setSpeed={setSpeed}
          />
          <TransportControls
            canvas={canvas}
            clearUniverse={clearUniverse}
            running={running}
            soundEnabled={soundEnabled}
            state={state}
            stepOnce={stepOnce}
            toggleSound={toggleSound}
            toggleRunning={toggleRunning}
          />
          <GridPilot
            canvas={canvas}
            playMechanicalSound={playMechanicalSound}
          />

          <PatternTrigger
            buttonRef={deckPatternHandleRef}
            className={patternHandle.patternHandleDeck}
            onToggle={togglePatternBay}
            open={patternBayOpen}
            seedName={seedName}
            selectedNumber={selectedNumber}
          />
        </section>
      </div>

      {patternBayOpen ? (
        <PatternBay
          close={closePatternBay}
          loadPreset={loadFromPatternBay}
          state={state}
        />
      ) : null}
    </article>
  )
}
