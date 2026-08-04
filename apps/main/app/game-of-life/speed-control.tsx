import type { CSSProperties } from 'react'
import controlDeck from './control-deck.module.css'
import type { LifeMechanicalSound } from './life-audio'
import { KNOB_MIN_ANGLE, KNOB_SWEEP } from './life-instruments'
import css from './throttle.module.css'

const SPEED_MIN = 1
const SPEED_MAX = 30

export const SpeedControl = ({
  playMechanicalSound,
  speed,
  setSpeed,
}: {
  playMechanicalSound: (kind: LifeMechanicalSound) => void
  speed: number
  setSpeed: (speed: number) => void
}) => {
  const progress = ((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100
  const knobAngle = KNOB_MIN_ANGLE + (progress / 100) * KNOB_SWEEP
  const style = {
    '--throttle': `${progress}%`,
    '--knob-angle': `${knobAngle}deg`,
  } as CSSProperties

  return (
    <section
      className={`${controlDeck.controlModule} ${css.throttleModule}`}
      style={style}
    >
      <header>
        <span>Cycle throttle</span>
        <output htmlFor='cycle-throttle'>
          {String(speed).padStart(2, '0')} Hz
        </output>
      </header>
      <label className={css.throttle} htmlFor='cycle-throttle'>
        <span className='sr-only'>Simulation speed</span>
        <span className={css.speedKnobAssembly} aria-hidden='true'>
          <span className={css.speedKnobScale} />
          <b className={css.speedKnob}>
            <span className={css.speedKnobFace}>
              <i />
            </span>
          </b>
        </span>
        <input
          id='cycle-throttle'
          type='range'
          min={SPEED_MIN}
          max={SPEED_MAX}
          step='1'
          value={speed}
          aria-valuetext={`${speed} ${speed === 1 ? 'generation' : 'generations'} per second`}
          onChange={(event) => {
            playMechanicalSound('knob')
            setSpeed(Number(event.target.value))
          }}
        />
        <small aria-hidden='true'>
          <span>01</span>
          <span>15</span>
          <span>30</span>
        </small>
      </label>
    </section>
  )
}
