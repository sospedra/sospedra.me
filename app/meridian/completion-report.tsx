import { useEffect, useRef } from 'react'
import DailyCountdownPanel from 'services/daily-countdown-panel'
import { shareHandled, shareText } from 'services/share'
import css from './completion-report.module.css'
import type { GeoGameState } from './game-state'
import geoControls from './geo-controls.module.css'
import {
  challengeSequence,
  formatDistance,
  formatDuration,
  formatScore,
  roundName,
} from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import type { loadGeoStats } from './persistence'
import { formatGeoShareCard } from './share'
import stageFrame from './stage-frame.module.css'
import {
  calculateDailyPlayStreak,
  calculateRunStatistics,
  personalBestFor,
} from './stats'

export function Completion({
  announce,
  copy,
  locale,
  onNewPracticeGame,
  state,
  stats,
}: {
  announce: (message: string) => void
  copy: GeoMessages
  locale: GeoLocale
  onNewPracticeGame: () => void
  state: GeoGameState
  stats: ReturnType<typeof loadGeoStats>['value']
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const result = calculateRunStatistics(state.challenge, state.answers)
  const dailyStreak = calculateDailyPlayStreak(stats.runs)
  const personalBest =
    personalBestFor(stats.runs, state.challenge.rulesVersion) ??
    result.totalScore

  useEffect(() => {
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }, [])

  const copyResult = async () => {
    const result = formatGeoShareCard({
      challenge: state.challenge,
      answers: state.answers,
      locale,
      challengeNumber: challengeSequence(state.challenge),
    })
    try {
      await navigator.clipboard.writeText(result)
      announce(copy.copied)
    } catch {
      announce(copy.shareFailed)
    }
  }

  const shareResult = async () => {
    const result = formatGeoShareCard({
      challenge: state.challenge,
      answers: state.answers,
      locale,
      challengeNumber: challengeSequence(state.challenge),
    })
    const outcome = await shareText({ text: result, title: copy.brand })
    if (shareHandled(outcome)) return
    await copyResult()
  }

  return (
    <section
      className={stageFrame.completion}
      aria-labelledby='geo-complete-title'
    >
      <div className={css.completionLead}>
        <p className={geoControls.eyebrow}>{copy.completeEyebrow}</p>
        <h2
          ref={headingRef}
          id='geo-complete-title'
          className={stageFrame.completionTitle}
          tabIndex={-1}
        >
          {copy.completeTitle}
        </h2>
        <div className={css.completionScore}>
          <strong>{formatScore(result.totalScore, locale)}</strong>
          <span>{copy.totalScore}</span>
        </div>
        <span className={css.completionStatus}>
          {state.runKind === 'official'
            ? `${copy.officialResult} · ${copy.returnTomorrow}`
            : copy.replayResult}
        </span>
        {state.runKind === 'official' && (
          <DailyCountdownPanel
            classes={{
              panel: css.nextGame,
              readout: css.nextGameReadout,
              ready: css.nextGameReady,
              track: css.nextGameTrack,
            }}
            labels={{ countdown: copy.nextGameIn, ready: copy.nextGameReady }}
          />
        )}
        <div className={geoControls.completionActions}>
          <button
            type='button'
            className={geoControls.primaryButton}
            onClick={() => void shareResult()}
          >
            <span>{copy.share}</span>
            <span aria-hidden='true'>↗</span>
          </button>
          <button
            type='button'
            className={geoControls.secondaryButton}
            onClick={() => void copyResult()}
          >
            {copy.copyResult}
          </button>
          {state.runKind === 'practice' && (
            <button
              type='button'
              className={geoControls.secondaryButton}
              onClick={onNewPracticeGame}
            >
              {copy.replay}
            </button>
          )}
        </div>
      </div>

      <div className={css.resultsPanel}>
        <div className={css.roundResults}>
          {result.rounds.map((round) => {
            const roundAnswers = state.answers.filter(
              (answer) => answer.roundType === round.type,
            )
            return (
              <div className={css.roundResult} key={round.type}>
                <strong>{roundName(copy, round.type)}</strong>
                <span className={css.resultCells} aria-hidden='true'>
                  {roundAnswers.map((answer, answerIndex) => (
                    <span
                      className={css.resultCell}
                      data-correct={answer.correct}
                      key={`${answer.roundId}:${answer.attemptIndex ?? answerIndex}`}
                    />
                  ))}
                </span>
                <span>{formatScore(round.score, locale)}</span>
              </div>
            )
          })}
        </div>

        <div className={css.statsGrid}>
          <span className={css.statCard}>
            <span>{copy.accuracy}</span>
            <strong>
              {result.correctAnswers}/{result.totalQuestions} ·{' '}
              {Math.round(result.accuracyPercentage)}%
            </strong>
          </span>
          <span className={css.statCard}>
            <span>{copy.bestStreak}</span>
            <strong>{result.bestCorrectStreak}</strong>
          </span>
          <span className={css.statCard}>
            <span>{copy.medianTime}</span>
            <strong>
              {formatDuration(result.medianChoiceResponseMs, locale)}
            </strong>
          </span>
          <span className={css.statCard}>
            <span>{copy.medianDistance}</span>
            <strong>{formatDistance(result.medianMapErrorKm, locale)}</strong>
          </span>
          <span className={css.statCard}>
            <span>{copy.dailyStreak}</span>
            <strong>
              {dailyStreak} {copy.days}
            </strong>
          </span>
          <span className={css.statCard}>
            <span>{copy.personalBest}</span>
            <strong>{formatScore(personalBest, locale)}</strong>
          </span>
        </div>
      </div>
    </section>
  )
}
