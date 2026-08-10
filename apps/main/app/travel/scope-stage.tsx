import cn from 'clsx'
import type { ReactNode } from 'react'
import compass from './compass-rose.module.css'
import consoleShell from './console-shell.module.css'
import { type Destination, HOME } from './destinations'
import lunar from './lunar-layer.module.css'
import canvasCss from './scope-canvas.module.css'
import css from './scope-stage.module.css'
import screenWell from './screen-well.module.css'
import {
  formatRange,
  formatViewHeading,
  formatViewLatitude,
} from './travel-format'
import type { TravelGlobe, TravelMoonRefs } from './use-travel-globe'

export default function ScopeStage(props: {
  tracked: Destination
  globe: TravelGlobe
  moon: TravelMoonRefs
  children: ReactNode
}) {
  const { tracked, globe, moon, children } = props

  return (
    <section className={css.stage} aria-labelledby='position-display-title'>
      <header className={css.scopeHeader}>
        <div>
          <strong id='position-display-title'>
            {tracked.code} / {tracked.name}
          </strong>
          <small>
            CAT → {tracked.code} · {formatRange(tracked)}
          </small>
        </div>
      </header>
      <div className={css.scopeMachine}>
        <div className={css.cabinBrace} aria-hidden='true'>
          <i />
          <i />
          <i />
        </div>
        <div className={css.scopeBezel}>
          <div className={screenWell.screenWell}>
            <span className={screenWell.screenWalls} aria-hidden='true'>
              <i data-side='top' />
              <i data-side='right' />
              <i data-side='bottom' />
              <i data-side='left' />
            </span>
            <div className={cn(screenWell.viewport, canvasCss.viewport)}>
              <div className={consoleShell.tube}>
                <svg
                  ref={moon.back.svg}
                  className={cn(lunar.lunarLayer, lunar.lunarLayerBack)}
                  viewBox='0 0 1000 1000'
                  aria-hidden='true'
                >
                  <defs>
                    <radialGradient
                      id='travel-moon-back'
                      cx='34%'
                      cy='30%'
                      r='72%'
                    >
                      <stop offset='0' stopColor='#d8ded6' />
                      <stop offset='62%' stopColor='#79837a' />
                      <stop offset='100%' stopColor='#4a524b' />
                    </radialGradient>
                  </defs>
                  <path
                    ref={moon.back.orbit}
                    className={lunar.lunarOrbitPath}
                  />
                  <g
                    ref={moon.back.body}
                    className={lunar.attlerock}
                    opacity='0'
                  >
                    <circle r='7.2' fill='url(#travel-moon-back)' />
                    <circle
                      className={lunar.moonCrater}
                      cx='-2.2'
                      cy='-1.5'
                      r='1.35'
                    />
                    <circle
                      className={lunar.moonCrater}
                      cx='2.1'
                      cy='2'
                      r='0.9'
                    />
                    <text
                      ref={moon.back.label}
                      className={lunar.moonLabel}
                      x='12'
                      y='4'
                    >
                      MOON
                    </text>
                  </g>
                </svg>
                <canvas
                  id='travel-globe-canvas'
                  ref={globe.canvasRef}
                  className={canvasCss.canvas}
                  role='img'
                  aria-label='Interactive world signalscope. Drag the sky, turn the dials, or choose a ship-log entry to tune a signal.'
                  aria-describedby='scope-instructions'
                  onPointerDown={globe.onPointerDown}
                  onPointerMove={globe.onPointerMove}
                  onPointerUp={globe.onPointerUp}
                  onPointerCancel={globe.onPointerCancel}
                  onPointerLeave={globe.onPointerLeave}
                >
                  The globe fell asleep. Pick a place from the ship log.
                </canvas>
                <svg
                  ref={moon.front.svg}
                  className={cn(lunar.lunarLayer, lunar.lunarLayerFront)}
                  viewBox='0 0 1000 1000'
                  aria-hidden='true'
                >
                  <defs>
                    <radialGradient
                      id='travel-moon-front'
                      cx='34%'
                      cy='30%'
                      r='72%'
                    >
                      <stop offset='0' stopColor='#edf1e9' />
                      <stop offset='58%' stopColor='#919c91' />
                      <stop offset='100%' stopColor='#525b53' />
                    </radialGradient>
                  </defs>
                  <path
                    ref={moon.front.orbit}
                    className={lunar.lunarOrbitPath}
                  />
                  <g
                    ref={moon.front.body}
                    className={lunar.attlerock}
                    opacity='0'
                  >
                    <circle r='7.2' fill='url(#travel-moon-front)' />
                    <circle
                      className={lunar.moonCrater}
                      cx='-2.2'
                      cy='-1.5'
                      r='1.35'
                    />
                    <circle
                      className={lunar.moonCrater}
                      cx='2.1'
                      cy='2'
                      r='0.9'
                    />
                    <text
                      ref={moon.front.label}
                      className={lunar.moonLabel}
                      x='12'
                      y='4'
                    >
                      MOON
                    </text>
                  </g>
                </svg>
                <div className={compass.screenCompass} aria-hidden='true'>
                  <span className={compass.compassRose}>
                    <span
                      ref={globe.screenCompassRef}
                      className={compass.compassCard}
                    >
                      <span className={compass.north}>N</span>
                      <span className={compass.compassNeedle} />
                      <span className={compass.compassCardHub} />
                    </span>
                    <span className={compass.compassLubber} />
                  </span>
                  <p>
                    <span
                      ref={globe.screenCompassHeadingRef}
                      className={compass.bearingValue}
                    >
                      {formatViewHeading(HOME.lon)}
                    </span>
                    <span className={compass.compassMeta}>
                      <span ref={globe.screenCompassLatitudeRef}>
                        {formatViewLatitude(HOME.lat)}
                      </span>{' '}
                      LAT
                    </span>
                  </p>
                </div>
              </div>
              <div
                className={canvasCss.scopeFallback}
                data-visible={globe.status !== 'ready'}
                role='status'
              >
                <strong>
                  {globe.status === 'loading'
                    ? 'WAKING THE SIGNALSCOPE'
                    : 'SIGNALSCOPE FELL ASLEEP'}
                </strong>
                <span>
                  {globe.status === 'loading'
                    ? 'Give it a moment. The glass is remembering the sky.'
                    : 'That’s all right. The ship log still remembers every place.'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}
