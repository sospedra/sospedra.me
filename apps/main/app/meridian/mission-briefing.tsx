import type { ReactNode } from 'react'
import geoControls from './geo-controls.module.css'
import { formatDate, roundName } from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import css from './mission-briefing.module.css'
import type { DailyGeoChallenge, Round } from './model'
import { briefingTimingNotice, PlanetInstrument } from './planet-instrument'
import type { GeoGameMode } from './run-mode'
import { PRACTICE_ROUNDS, type PracticeRound } from './run-mode'
import stageFrame from './stage-frame.module.css'

export function BriefingFrame({
  challenge,
  controls,
  copy,
  displayRounds,
  lead,
  locale,
  mode,
  onStart,
}: {
  challenge: DailyGeoChallenge
  controls?: ReactNode
  copy: GeoMessages
  displayRounds: Round[]
  lead: {
    body: string
    eyebrow?: string
    note: string
    timing: string
    title: string
  }
  locale: GeoLocale
  mode: GeoGameMode
  onStart: () => void
}) {
  const introChallenge = { ...challenge, rounds: displayRounds }

  return (
    <section
      className={stageFrame.briefing}
      data-mode={mode}
      aria-labelledby='geo-briefing-title'
    >
      <div className={css.briefingCopy}>
        <div className={css.briefingLead}>
          {lead.eyebrow !== undefined && (
            <p className={geoControls.eyebrow}>{lead.eyebrow}</p>
          )}
          <h2 id='geo-briefing-title' className={stageFrame.briefingTitle}>
            {lead.title}
          </h2>
          <p className={css.briefingBody}>{lead.body}</p>

          <div className={css.briefingMeta}>
            <p>{lead.note}</p>
            <p>{lead.timing}</p>
          </div>
        </div>

        <div className={css.briefingControls}>
          {controls}
          <button
            type='button'
            className={geoControls.primaryButton}
            onClick={onStart}
          >
            <span>{copy.start}</span>
            <span className={geoControls.buttonArrow} aria-hidden='true'>
              ↗
            </span>
          </button>
        </div>
      </div>
      <PlanetInstrument challenge={introChallenge} copy={copy} />
      <span className={shell.srOnly}>
        {formatDate(challenge.publicationDate, locale)}
      </span>
    </section>
  )
}

export function DailyBriefing({
  challenge,
  copy,
  displayRounds,
  locale,
  onStart,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
  displayRounds: Round[]
  locale: GeoLocale
  onStart: () => void
}) {
  return (
    <BriefingFrame
      challenge={challenge}
      copy={copy}
      displayRounds={displayRounds}
      lead={{
        body: copy.introBody,
        eyebrow: copy.introEyebrow,
        note: copy.officialAttempt,
        timing: briefingTimingNotice(challenge, copy),
        title: copy.introTitle,
      }}
      locale={locale}
      mode='daily'
      onStart={onStart}
    />
  )
}

export function PracticeBriefing({
  challenge,
  copy,
  displayRounds,
  locale,
  onPracticeRoundChange,
  onPracticeTimedChange,
  onStart,
  practiceRound,
  practiceTimed,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
  displayRounds: Round[]
  locale: GeoLocale
  onPracticeRoundChange: (round: PracticeRound) => void
  onPracticeTimedChange: (timed: boolean) => void
  onStart: () => void
  practiceRound: PracticeRound
  practiceTimed: boolean
}) {
  return (
    <BriefingFrame
      challenge={challenge}
      controls={
        <div className={css.practiceControls}>
          <label className={css.selectField}>
            <span>{copy.practiceRound}</span>
            <select
              value={practiceRound}
              onChange={(event) =>
                onPracticeRoundChange(event.target.value as PracticeRound)
              }
            >
              {PRACTICE_ROUNDS.map((round) => (
                <option key={round} value={round}>
                  {round === 'all' ? copy.allRounds : roundName(copy, round)}
                </option>
              ))}
            </select>
          </label>
          <button
            type='button'
            className={css.practiceTiming}
            data-active={practiceTimed}
            aria-pressed={practiceTimed}
            onClick={() => onPracticeTimedChange(!practiceTimed)}
          >
            <span>{practiceTimed ? copy.timed : copy.untimed}</span>
            <span className={geoControls.toggle} data-active={practiceTimed} />
          </button>
        </div>
      }
      copy={copy}
      displayRounds={displayRounds}
      lead={{
        body: copy.practiceBody,
        note: copy.practiceNote,
        timing: practiceTimed
          ? briefingTimingNotice(challenge, copy)
          : copy.untimedNotice,
        title: copy.practiceTitle,
      }}
      locale={locale}
      mode='practice'
      onStart={onStart}
    />
  )
}
