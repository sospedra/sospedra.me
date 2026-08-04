import type { CSSProperties } from 'react'
import aux from './aux-cluster.module.css'
import AxisDial from './axis-dial'
import { type Destination, HOME } from './destinations'
import css from './scope-control-deck.module.css'
import {
  formatBearing,
  formatCoords,
  formatPitchAria,
  formatRange,
  formatViewHeading,
  normalizeHeading,
} from './travel-format'
import { TRAVEL_PITCH_MAX, type TravelGlobe } from './use-travel-globe'
import zoom from './zoom-keys.module.css'

type Rgb = [number, number, number]

const SUN_CORE_YOUNG: Rgb = [255, 233, 176]
const SUN_CORE_OLD: Rgb = [255, 90, 42]
const SUN_EDGE_YOUNG: Rgb = [255, 154, 60]
const SUN_EDGE_OLD: Rgb = [184, 31, 5]

const mixChannel = (from: number, to: number, t: number): number =>
  Math.round(from + (to - from) * t)

const mixRgb = (from: Rgb, to: Rgb, t: number): string =>
  `rgb(${mixChannel(from[0], to[0], t)} ${mixChannel(from[1], to[1], t)} ${mixChannel(from[2], to[2], t)})`

const sunStyle = (phase: number): CSSProperties =>
  ({
    '--sun-core': mixRgb(SUN_CORE_YOUNG, SUN_CORE_OLD, phase),
    '--sun-edge': mixRgb(SUN_EDGE_YOUNG, SUN_EDGE_OLD, phase),
    '--sun-scale': String(1 + phase * 0.5),
  }) as CSSProperties

export default function ScopeControlDeck(props: {
  tracked: Destination
  globe: TravelGlobe
  supernova: { phase: number; countdown: string }
  pressedZoom: 'in' | 'out' | null
  zoomInAtLimit: boolean
  zoomOutAtLimit: boolean
  actuateZoom: (direction: 'in' | 'out') => void
  armTravelAudio: () => void
  playTravelRotaryTick: (direction: -1 | 1) => void
}) {
  const {
    tracked,
    globe,
    supernova,
    pressedZoom,
    zoomInAtLimit,
    zoomOutAtLimit,
    actuateZoom,
    armTravelAudio,
    playTravelRotaryTick,
  } = props

  return (
    <div className={css.scopeControlDeck}>
      <p className={css.readout}>
        <span className={css.readoutKey}>MFD 05 ▸</span>
        <span>{tracked.name}</span>
        <span className={css.readoutCoords}>{formatCoords(tracked)}</span>
        <span className={css.readoutCoords}>BRG {formatBearing(tracked)}</span>
        <span className={css.readoutRange}>{formatRange(tracked)}</span>
        <span
          className={css.loopMeter}
          style={sunStyle(supernova.phase)}
          title='Time until the sun has other plans'
        >
          <i className={css.sun} aria-hidden='true' />
          <span className='sr-only'>Time until the sun has other plans </span>
          {supernova.countdown}
        </span>
        <span className={css.blink} aria-hidden='true'>
          ▮
        </span>
      </p>
      <div className={css.rangeAssembly}>
        <fieldset className={css.rangeDial}>
          <legend className='sr-only'>Signalscope position dials</legend>
          <AxisDial
            id='travel-orbit-dial'
            leftLimit='E'
            rightLimit='W'
            min={0}
            max={359}
            initialValue={normalizeHeading(HOME.lon)}
            initialKnobAngle={-normalizeHeading(HOME.lon)}
            orientation='horizontal'
            increaseKnobDirection={-1}
            ariaLabel='Globe orbit heading'
            hint='Turn clockwise and the globe rolls west. Turn counterclockwise and it rolls east. Hold Shift for tiny turns.'
            formatAriaValue={(value) => `${formatViewHeading(value)} heading`}
            controlRef={globe.orbitControlRef}
            knobRef={globe.orbitKnobRef}
            onTurn={globe.orbitBy}
            onSetValue={globe.orbitTo}
            onInteractionChange={globe.setDialControlActive}
            armAudio={armTravelAudio}
            playRotaryTick={playTravelRotaryTick}
          />
          <AxisDial
            id='travel-pitch-dial'
            leftLimit='N'
            rightLimit='S'
            min={-Math.floor(TRAVEL_PITCH_MAX)}
            max={Math.floor(TRAVEL_PITCH_MAX)}
            initialValue={HOME.lat}
            initialKnobAngle={-HOME.lat}
            orientation='vertical'
            increaseKnobDirection={-1}
            ariaLabel='Globe vertical pitch'
            hint='Turn clockwise and the globe tips south. Turn counterclockwise and it tips north. Hold Shift for tiny turns.'
            formatAriaValue={formatPitchAria}
            controlRef={globe.pitchControlRef}
            knobRef={globe.pitchKnobRef}
            onTurn={globe.pitchBy}
            onSetValue={globe.pitchTo}
            onInteractionChange={globe.setDialControlActive}
            armAudio={armTravelAudio}
            playRotaryTick={playTravelRotaryTick}
          />
        </fieldset>
        <fieldset className={zoom.zoomControls}>
          <legend>Range</legend>
          <button
            type='button'
            aria-label='Zoom in'
            aria-disabled={zoomInAtLimit}
            data-pressed={pressedZoom === 'in'}
            onClick={() => actuateZoom('in')}
          >
            <span className={zoom.zoomKeyFace} aria-hidden='true'>
              +
            </span>
          </button>
          <button
            type='button'
            aria-label='Zoom out'
            aria-disabled={zoomOutAtLimit}
            data-pressed={pressedZoom === 'out'}
            onClick={() => actuateZoom('out')}
          >
            <span className={zoom.zoomKeyFace} aria-hidden='true'>
              −
            </span>
          </button>
        </fieldset>
        <div className={aux.auxCluster}>
          <div className={aux.analogGauge} aria-hidden='true'>
            <i />
            <span>SUN</span>
          </div>
          <fieldset className={aux.signalBank}>
            <legend className='sr-only'>Scope status</legend>
            <span>SCOPE</span>
            <span>LOG</span>
            <span>CAMP</span>
          </fieldset>
        </div>
      </div>
    </div>
  )
}
