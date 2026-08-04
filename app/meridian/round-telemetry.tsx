import { clamp } from 'es-toolkit'
import { type ExternalStore, useStoreSelector } from 'services/external-store'
import type { GeoGameState } from './game-state'
import {
  formatRoundClock,
  formatScore,
  LOW_TIME_THRESHOLD_MS,
} from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import css from './round-telemetry.module.css'

export const DIFFICULTY_TIERS = [1, 2, 3, 4] as const

export function DifficultyMeter({
  difficulty,
  label,
  shortLabel,
}: {
  difficulty: number
  label: string
  shortLabel: string
}) {
  const displayedDifficulty = clamp(
    Math.round(difficulty),
    1,
    DIFFICULTY_TIERS.length,
  )

  return (
    <span className={css.difficulty}>
      <span className={shell.srOnly}>
        {label} {displayedDifficulty}/{DIFFICULTY_TIERS.length}
      </span>
      <strong className={css.difficultyLabel} aria-hidden='true'>
        {shortLabel} {displayedDifficulty}/{DIFFICULTY_TIERS.length}
      </strong>
      <span className={css.difficultyBars} aria-hidden='true'>
        {DIFFICULTY_TIERS.map((level) => (
          <span key={level} data-lit={level <= displayedDifficulty} />
        ))}
      </span>
    </span>
  )
}

export function RoundTelemetry({
  attempt,
  copy,
  difficulty,
  locale,
  onPass,
  practiceTimed,
  roundClock,
  roundLimitMs,
  state,
}: {
  attempt: number
  copy: GeoMessages
  difficulty: number
  locale: GeoLocale
  onPass: () => void
  practiceTimed: boolean
  roundClock: ExternalStore<number>
  roundLimitMs: number
  state: GeoGameState
}) {
  const clockText = useStoreSelector(roundClock, (elapsedMs: number) =>
    formatRoundClock(roundLimitMs - elapsedMs),
  )
  const lowTime = useStoreSelector(
    roundClock,
    (elapsedMs: number) => roundLimitMs - elapsedMs <= LOW_TIME_THRESHOLD_MS,
  )
  const urgent = practiceTimed && lowTime

  return (
    <div className={css.questionTelemetry}>
      <span
        className={css.questionMetric}
        data-urgent={urgent}
        role='timer'
        aria-label={`${copy.time}: ${practiceTimed ? clockText : copy.untimed}`}
      >
        <span>{copy.time}</span>
        <strong>{practiceTimed ? clockText : '∞'}</strong>
        {urgent && <small>{copy.lowTime}</small>}
      </span>
      <span className={css.questionMetric}>
        <span>{copy.attempt}</span>
        <strong>Q{String(attempt).padStart(2, '0')}</strong>
      </span>
      <DifficultyMeter
        difficulty={difficulty}
        label={copy.difficulty}
        shortLabel={copy.levelShort}
      />
      <span className={`${css.questionMetric} ${css.scoreMetric}`}>
        <span>{copy.score}</span>
        <strong>{formatScore(state.score, locale)}</strong>
      </span>
      <button
        type='button'
        className={css.passButton}
        disabled={state.phase !== 'question'}
        onClick={onPass}
      >
        <span>{copy.pass}</span>
        <kbd>P</kbd>
      </button>
      <span
        className={`${css.timerTrack} ${css.roundTimerTrack}`}
        aria-hidden='true'
      >
        <span />
      </span>
    </div>
  )
}
