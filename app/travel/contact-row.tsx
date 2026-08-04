import { clamp } from 'es-toolkit'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useRef } from 'react'
import cityPin from './city-pin.module.css'
import css from './contact-row.module.css'
import { type Destination, flagOf } from './destinations'
import { formatBearing, formatCoords, formatRange } from './travel-format'

const CITY_PIN_LANDINGS = [
  { rotate: '-18deg', x: '0%', y: '0%' },
  { rotate: '9deg', x: '28%', y: '0%' },
  { rotate: '-11deg', x: '62%', y: '0%' },
  { rotate: '18deg', x: '100%', y: '0%' },
  { rotate: '-23deg', x: '0%', y: '48%' },
  { rotate: '14deg', x: '34%', y: '42%' },
  { rotate: '-8deg', x: '68%', y: '56%' },
  { rotate: '21deg', x: '100%', y: '50%' },
  { rotate: '11deg', x: '0%', y: '100%' },
  { rotate: '-17deg', x: '36%', y: '100%' },
  { rotate: '23deg', x: '72%', y: '100%' },
  { rotate: '-10deg', x: '100%', y: '100%' },
] as const

export const CITY_PIN_LANDING_COUNT = CITY_PIN_LANDINGS.length

export type CityPinPoint = {
  x: number
  y: number
}

export default function ContactRow(props: {
  index: number
  spot: Destination
  tracked: boolean
  pinLanding: number
  pinPoint: CityPinPoint | null
  onTrack: (spot: Destination, pinPoint?: CityPinPoint) => void
}) {
  const { index, spot, tracked, pinLanding, pinPoint, onTrack } = props
  const pinPosition = CITY_PIN_LANDINGS[pinLanding] ?? CITY_PIN_LANDINGS[0]
  const mouseActivationRef = useRef(false)
  const pinX = pinPoint ? `${pinPoint.x}%` : pinPosition.x
  const pinY = pinPoint ? `${pinPoint.y}%` : pinPosition.y

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    mouseActivationRef.current =
      event.pointerType === 'mouse' && event.button === 0 && event.isPrimary
  }

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const activatedWithMouse = mouseActivationRef.current
    mouseActivationRef.current = false

    if (!activatedWithMouse || event.detail === 0) {
      onTrack(spot)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      onTrack(spot)
      return
    }

    const clampPercent = (value: number): number =>
      clamp(Math.round(value * 100) / 100, 0, 100)

    onTrack(spot, {
      x: clampPercent(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampPercent(((event.clientY - bounds.top) / bounds.height) * 100),
    })
  }

  return (
    <li>
      <button
        type='button'
        className={css.contact}
        aria-pressed={tracked}
        aria-label={`Tune the signalscope to ${spot.name}. ${formatCoords(spot)}. Bearing ${formatBearing(spot)}; ${formatRange(spot)} from home. Ship log: ${spot.log}`}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        {tracked && (
          <span
            key={pinLanding}
            className={cityPin.cityPin}
            data-landing={pinLanding}
            style={
              {
                '--pin-rotate': pinPosition.rotate,
                '--pin-x': pinX,
                '--pin-y': pinY,
              } as CSSProperties
            }
            aria-hidden='true'
          >
            <span className={cityPin.cityPinHead} />
          </span>
        )}
        <span className={css.contactIndex} aria-hidden='true'>
          {String(index).padStart(2, '0')}
        </span>
        <span className={css.contactIdentity}>
          <span className={css.name}>
            <span aria-hidden='true'>{flagOf(spot.country)}</span>
            {spot.name}
            {spot.home && <em>HOME</em>}
          </span>
          <span className={css.coords}>{formatCoords(spot)}</span>
          <span className={css.contactNote}>{spot.log}</span>
        </span>
        <span className={css.contactRange}>
          <span className={css.code}>{spot.code}</span>
          <span>
            {formatBearing(spot)} · {formatRange(spot)}
          </span>
        </span>
      </button>
    </li>
  )
}
