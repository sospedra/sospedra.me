import { sumBy } from 'es-toolkit'
import { useEffect, useRef } from 'react'
import { currentRound, type GeoGameState } from './game-state'
import geoControls from './geo-controls.module.css'
import {
  formatRoundClock,
  formatScore,
  roundInstruction,
  roundName,
  roundSeconds,
} from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import css from './mission-overlays.module.css'
import type { Round } from './model'
import { roundTimeLimitMs } from './model'

export function RoundSummary({
  copy,
  locale,
  onContinue,
  state,
}: {
  copy: GeoMessages
  locale: GeoLocale
  onContinue: () => void
  state: GeoGameState
}) {
  const round = currentRound(state)
  if (!round) return null
  const answers = state.answers.filter((answer) => answer.roundId === round.id)
  const score = sumBy(answers, (answer) => answer.score)
  const correct = answers.filter((answer) => answer.correct).length
  const timedOut = state.roundElapsedMs >= roundTimeLimitMs(round)

  return (
    <div className={css.overlay}>
      <section
        className={css.summaryPanel}
        data-timeout={timedOut || undefined}
        aria-labelledby='geo-round-summary-title'
        tabIndex={-1}
      >
        <p className={geoControls.eyebrow}>
          {roundName(copy, round.type)}
          {' // '}0{state.roundIndex + 1}
        </p>
        <h2 id='geo-round-summary-title'>{copy.roundComplete}</h2>
        <div className={css.summaryStats}>
          <span className={css.summaryStat}>
            <span>{copy.roundScore}</span>
            <strong>{formatScore(score, locale)}</strong>
          </span>
          <span className={css.summaryStat}>
            <span>{copy.roundAccuracy}</span>
            <strong>
              {correct}/{answers.length}
            </strong>
          </span>
        </div>
        <button
          type='button'
          className={geoControls.secondaryButton}
          onClick={onContinue}
        >
          <span>{copy.continueEarly}</span>
          <span aria-hidden='true'>→</span>
        </button>
        <span className={css.summaryTimer} aria-hidden='true'>
          <span />
        </span>
      </section>
    </div>
  )
}

export function Countdown({
  copy,
  count,
  round,
  resume,
}: {
  copy: GeoMessages
  count: number
  round: Round | null
  resume: boolean
}) {
  const roundLabel = round ? roundName(copy, round.type) : copy.briefing
  const label = resume ? copy.resumeCountdown : roundLabel

  return (
    <div className={css.overlay}>
      <section
        className={css.countdownPanel}
        aria-label={resume ? copy.resumeCountdown : copy.briefing}
        aria-live='assertive'
      >
        <span className={css.countdownLabel}>{label}</span>
        <strong className={css.countdownNumber} key={count}>
          {count}
        </strong>
        <span className={css.countdownRound}>
          {round ? roundInstruction(copy, round.type) : copy.loading}
        </span>
        {round && (
          <small className={css.countdownMeta}>
            {formatRoundClock(roundSeconds(round) * 1000)} {' // '}{' '}
            {copy.difficultyRises}
          </small>
        )}
      </section>
    </div>
  )
}

export function VisibilityPause({
  copy,
  onResume,
}: {
  copy: GeoMessages
  onResume: () => void
}) {
  const resumeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    window.requestAnimationFrame(() => resumeRef.current?.focus())
  }, [])

  return (
    <div className={css.overlay}>
      <section
        className={css.pausePanel}
        aria-labelledby='geo-visibility-pause-title'
      >
        <p className={geoControls.eyebrow}>UTC {' // '} HOLD</p>
        <h2 id='geo-visibility-pause-title'>{copy.visibilityPaused}</h2>
        <p>{copy.visibilityPausedBody}</p>
        <button
          ref={resumeRef}
          type='button'
          className={geoControls.primaryButton}
          onClick={onResume}
        >
          <span>{copy.resume}</span>
          <span aria-hidden='true'>↗</span>
        </button>
      </section>
    </div>
  )
}
