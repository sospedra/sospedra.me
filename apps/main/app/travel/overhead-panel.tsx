import cn from 'clsx'
import type { MouseEvent as ReactMouseEvent } from 'react'
import Link from 'services/link'
import { DESTINATIONS, REGIONS } from './destinations'
import fxq from './fx-quiet.module.css'
import css from './overhead-panel.module.css'
import powerRocker from './power-rocker.module.css'
import stationIdentity from './station-identity.module.css'
import stickyNote from './sticky-note.module.css'
import type { VisitorNote } from './travel-uplink'

export default function OverheadPanel(props: {
  poweredOff: boolean
  visitorNote: VisitorNote
  visitorNoteBusy: boolean
  turnOff: (event: ReactMouseEvent<HTMLAnchorElement>) => void
  locateVisitor: () => Promise<void>
}) {
  const { poweredOff, visitorNote, visitorNoteBusy, turnOff, locateVisitor } =
    props

  return (
    <header className={css.overheadPanel}>
      <nav className={css.utilityRail} aria-label='Console power'>
        <Link
          url='/'
          className={cn(
            powerRocker.backLink,
            poweredOff && powerRocker.powerOff,
          )}
          aria-label='Turn off the traveler’s console and return home'
          onClick={turnOff}
        >
          <span className={powerRocker.powerRocker} aria-hidden='true'>
            <span className={powerRocker.powerRockerFace}>
              <i className={cn(powerRocker.powerLight, fxq.powerLight)} />
              <i className={powerRocker.powerDots} />
              <i className={powerRocker.powerCharacters} />
              <i className={powerRocker.powerShine} />
              <i className={powerRocker.powerShadow} />
            </span>
          </span>
          <span className={powerRocker.powerLabel}>Turn off</span>
        </Link>
      </nav>
      <div className={stationIdentity.stationIdentity}>
        <p>RS–05 · VENTURES SIGNAL ROOM</p>
        <h1 id='travel-control-title'>Traveler&apos;s signalscope</h1>
        <span>Ship log · Barcelona is home. For now.</span>
      </div>
      <button
        type='button'
        className={cn(stickyNote.headerStickyNote)}
        onClick={() => void locateVisitor()}
        disabled={visitorNoteBusy}
        aria-busy={visitorNoteBusy}
        aria-label={
          visitorNoteBusy
            ? 'Checking your approximate position'
            : 'Check your approximate position again'
        }
      >
        <span className={stickyNote.headerStickyLabel}>NOTE TO SELF</span>
        <strong>{visitorNote.title}</strong>
        <small>{visitorNote.detail}</small>
        <span className={stickyNote.headerStickyAction}>
          {visitorNoteBusy ? '… CHECKING' : '↻ CHECK AGAIN'}
        </span>
      </button>
      <dl
        className={stationIdentity.missionStats}
        aria-label='Ship log summary'
      >
        <div>
          <dt>Found</dt>
          <dd>{String(DESTINATIONS.length).padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>Signals</dt>
          <dd>{String(REGIONS.length).padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>Home</dt>
          <dd>CAT</dd>
        </div>
      </dl>
      <div className={css.annunciators}>
        <span data-state='live'>SIGNALSCOPE</span>
        <span data-state='live'>TRAVELERS</span>
        <span data-state='home'>BCN 05</span>
      </div>
      <span className={css.headerWear} aria-hidden='true'>
        <i data-wear='scratch-a' />
        <i data-wear='scratch-b' />
        <i data-wear='decal-ghost' />
      </span>
    </header>
  )
}
