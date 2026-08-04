import { join, map, pipe, uniq } from 'es-toolkit/fp'
import { formatRoundClock, roundName, roundSeconds } from './geo-format'
import { formatGeoMessage, type GeoMessages } from './geo-messages'
import type { DailyGeoChallenge } from './model'
import css from './planet-instrument.module.css'

export function PlanetInstrument({
  challenge,
  copy,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
}) {
  const durations = pipe(challenge.rounds, map(roundSeconds), uniq())
  const durationReadout =
    durations.length === 1
      ? `${challenge.rounds.length}×${formatRoundClock(durations[0] * 1000)}`
      : durations.map((seconds) => formatRoundClock(seconds * 1000)).join('/')

  return (
    <div className={css.instrumentStage} aria-hidden='true'>
      <div className={css.planetInstrument}>
        <span className={css.orbitOuter} />
        <span className={css.orbitInner} />
        <span className={css.orbitPulse} />
        <div className={css.planetCore}>
          <img
            src='/games/geo/assets/map/world-map.svg'
            alt=''
            width='1000'
            height='500'
          />
        </div>
        <ol className={css.roundNodes}>
          {challenge.rounds.map((round, index) => (
            <li className={css.roundNode} key={round.id}>
              <span>
                {copy.round} 0{index + 1}
              </span>
              <strong>{roundName(copy, round.type)}</strong>
            </li>
          ))}
        </ol>
        <div className={css.planetReadout}>
          <span>LAT +00.000 {' // '} LON +00.000</span>
          <span>
            UTC {' // '} {durationReadout}
          </span>
        </div>
      </div>
    </div>
  )
}

export const briefingTimingNotice = (
  challenge: DailyGeoChallenge,
  copy: GeoMessages,
) =>
  formatGeoMessage(copy.timingNotice, {
    seconds: pipe(challenge.rounds, map(roundSeconds), uniq(), join('/')),
  })
