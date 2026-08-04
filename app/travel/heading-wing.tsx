import cn from 'clsx'
import type { RefObject } from 'react'
import compass from './compass-rose.module.css'
import contactSolution from './contact-solution.module.css'
import { type Destination, flagOf, HOME } from './destinations'
import css from './heading-wing.module.css'
import {
  formatBearing,
  formatCoords,
  formatCountry,
  formatRange,
  formatViewHeading,
  formatViewLatitude,
} from './travel-format'

export default function HeadingWing(props: {
  tracked: Destination
  compassRef: RefObject<HTMLSpanElement | null>
  compassHeadingRef: RefObject<HTMLSpanElement | null>
  compassLatitudeRef: RefObject<HTMLSpanElement | null>
}) {
  const { tracked, compassRef, compassHeadingRef, compassLatitudeRef } = props

  return (
    <aside
      className={cn(
        css.instrumentWing,
        css.portWing,
        compass.portWing,
        contactSolution.portWing,
      )}
    >
      <header>
        <span>01</span>
        <strong className={css.instrumentLabel}>Heading reference</strong>
      </header>
      <div className={compass.compassModule}>
        <div className={compass.compassRose} aria-hidden='true'>
          <span ref={compassRef} className={compass.compassCard}>
            <span className={compass.north}>N</span>
            <span className={compass.compassNeedle} />
            <span className={compass.compassCardHub} />
          </span>
          <span className={compass.compassLubber} />
        </div>
        <p>
          <small className={compass.compassMeta}>HDG</small>
          {/* spans, not <output>: idle drift rewrites these ~5×/s */}
          <span ref={compassHeadingRef} className={compass.bearingValue}>
            {formatViewHeading(HOME.lon)}
          </span>
          <span className={compass.compassMeta}>
            <span ref={compassLatitudeRef}>{formatViewLatitude(HOME.lat)}</span>{' '}
            LAT
          </span>
        </p>
      </div>
      <section className={contactSolution.contactSolution} aria-live='polite'>
        <header>
          <span>02 · SELECTED CITY</span>
          <strong className={contactSolution.solutionState}>
            {tracked.home ? 'HOME' : 'FOUND'}
          </strong>
        </header>
        <div className={contactSolution.solutionIdentity}>
          <span aria-hidden='true'>{flagOf(tracked.country)}</span>
          <strong>{tracked.name}</strong>
          <em>{tracked.code}</em>
        </div>
        <dl>
          <div>
            <dt>Country</dt>
            <dd>{formatCountry(tracked.country)}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>{formatCoords(tracked)}</dd>
          </div>
          <div>
            <dt>From home</dt>
            <dd>{formatRange(tracked)}</dd>
          </div>
          <div>
            <dt>Bearing</dt>
            <dd>{formatBearing(tracked)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  )
}
