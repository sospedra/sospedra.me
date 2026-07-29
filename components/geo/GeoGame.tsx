'use client'

import {
  type AnswerResult,
  calculateDailyPlayStreak,
  calculateRunStatistics,
  createGeoGameState,
  createOfficialRunRecord,
  currentQuestion,
  currentRound,
  type DailyGeoChallenge,
  deriveDailyChallenge,
  deriveRunChallenge,
  differentRunNonce,
  formatGeoShareCard,
  type GeoCoordinate,
  type GeoGameState,
  type GeoSettings,
  geoGameReducer,
  getBrowserGeoStorage,
  isMeaningfulGeoAnswerInput,
  type LocalizedOption,
  loadGeoRun,
  loadGeoSettings,
  loadGeoStats,
  type MapPinAnswerResult,
  mergeCapitalAutocompleteOptions,
  OFFICIAL_COUNTRY_OPTIONS,
  personalBestFor,
  type Round,
  type RoundType,
  type RunNonce,
  rankGeoAutocompleteCandidates,
  recordOfficialRun,
  removeGeoRun,
  resolveExactGeoOptionId,
  restoreGeoGameState,
  roundTimeLimitMs,
  saveGeoRun,
  saveGeoSettings,
  saveGeoStats,
  serializeGeoRun,
} from 'lib/geo'
import {
  formatGeoMessage,
  type GeoLocale,
  type GeoMessages,
  getGeoMessages,
} from 'messages/geo'
import type {
  CSSProperties,
  FormEvent,
  MutableRefObject,
  ReactNode,
} from 'react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { useDailyCountdown } from 'service/daily-countdown'
import { useGameInput } from 'service/hotkeys'
import css from './GeoGame.module.css'
import GeoMap, { type GeoMapLabels } from './GeoMap'
import { createGeoAudio, type GeoSound } from './geo-audio'

export type GeoGameMode = 'daily' | 'practice'
export type GeoRouteKind = 'today' | 'archive' | 'practice'

export interface GeoGameProps {
  challenge: DailyGeoChallenge
  locale: GeoLocale
  mode?: GeoGameMode
  onLocaleChange?: (locale: GeoLocale) => void
  onModeChange?: (mode: GeoGameMode) => void
  routeKind?: GeoRouteKind
}

type PracticeRound = 'all' | RoundType

const PRACTICE_ROUNDS: PracticeRound[] = [
  'all',
  'shape',
  'flag',
  'capital',
  'map',
]

const formatScore = (score: number, locale: GeoLocale) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES').format(score)

const formatDate = (date: string, locale: GeoLocale) =>
  new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))

const formatDuration = (milliseconds: number | null, locale: GeoLocale) => {
  if (milliseconds === null) return '—'
  const seconds = milliseconds / 1000
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(seconds)} s`
}

const formatRoundClock = (remainingMs: number) => {
  const safeRemaining = Math.max(0, remainingMs)
  if (safeRemaining <= 10_000 && safeRemaining > 0) {
    return `${Math.floor(safeRemaining / 1000)}.${Math.floor(
      (safeRemaining % 1000) / 100,
    )}`
  }

  const totalSeconds = Math.ceil(safeRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const roundSeconds = (round: Round) =>
  Math.max(1, Math.round(roundTimeLimitMs(round) / 1000))

const DIFFICULTY_TIERS = [1, 2, 3, 4] as const

const formatDistance = (kilometres: number | null, locale: GeoLocale) => {
  if (kilometres === null) return '—'
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 0,
  }).format(kilometres)} km`
}

const challengeSequence = (challenge: DailyGeoChallenge) => {
  if (challenge.sequence) return challenge.sequence
  const date = new Date(`${challenge.publicationDate}T00:00:00Z`)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.floor((date.getTime() - yearStart) / 86_400_000) + 1
}

const createSessionNonce = (fallback: RunNonce = 'practice'): RunNonce => {
  if (typeof window === 'undefined') return fallback

  try {
    return window.crypto.randomUUID()
  } catch {
    // Older secure contexts may expose getRandomValues without randomUUID.
  }

  try {
    const values = new Uint32Array(4)
    window.crypto.getRandomValues(values)
    return [...values]
      .map((value) => value.toString(16).padStart(8, '0'))
      .join('')
  } catch {
    return `${String(fallback)}:${Date.now()}`
  }
}

const roundName = (copy: GeoMessages, type: RoundType) => copy[type]

const roundInstruction = (copy: GeoMessages, type: RoundType) => {
  if (type === 'shape') return copy.shapeInstruction
  if (type === 'flag') return copy.flagInstruction
  if (type === 'capital') return copy.capitalInstruction
  return copy.mapInstruction
}

const routeFor = (
  locale: GeoLocale,
  routeKind: GeoRouteKind,
  publicationDate: string,
) => {
  if (routeKind === 'practice') return `/${locale}/games/geo/practice`
  if (routeKind === 'archive') {
    return `/${locale}/games/geo/${publicationDate}`
  }
  return `/${locale}/games/geo`
}

const practiceChallenge = (
  challenge: DailyGeoChallenge,
  practiceRound: PracticeRound,
): DailyGeoChallenge => {
  if (practiceRound === 'all') {
    return { ...challenge, id: `${challenge.id}:practice:all` }
  }
  return {
    ...challenge,
    id: `${challenge.id}:practice:${practiceRound}`,
    rounds: challenge.rounds.filter((round) => round.type === practiceRound),
  }
}

function Modal({
  children,
  close,
  labelId,
  open,
}: {
  children: ReactNode
  close: () => void
  labelId: string
  open: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      window.requestAnimationFrame(() => {
        dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
      })
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={css.dialog}
      aria-labelledby={labelId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      {children}
    </dialog>
  )
}

function DialogHeader({
  close,
  copy,
  eyebrow,
  id,
  title,
}: {
  close: () => void
  copy: GeoMessages
  eyebrow: string
  id: string
  title: string
}) {
  return (
    <header className={css.dialogHeader}>
      <div>
        <p>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <button
        type='button'
        className={css.dialogClose}
        aria-label={copy.close}
        onClick={close}
      >
        <span aria-hidden='true'>×</span>
      </button>
    </header>
  )
}

function AppHeader({
  challenge,
  copy,
  locale,
  mode,
  onLocaleChange,
  onModeChange,
  onSoundToggle,
  openHelp,
  openSettings,
  routeKind,
  soundEnabled,
  timedState,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
  locale: GeoLocale
  mode: GeoGameMode
  onLocaleChange?: (locale: GeoLocale) => void
  onModeChange?: (mode: GeoGameMode) => void
  onSoundToggle: () => void
  openHelp: (button: HTMLButtonElement) => void
  openSettings: (button: HTMLButtonElement) => void
  routeKind: GeoRouteKind
  soundEnabled: boolean
  timedState: boolean
}) {
  const alternateLocale = locale === 'en' ? 'es' : 'en'

  return (
    <header className={css.topbar}>
      <div className={css.brandCluster}>
        <a className={css.homeLink} href='/' aria-label={copy.home}>
          <span aria-hidden='true'>←</span>
          <span className={css.srOnly}>{copy.home}</span>
        </a>
        <div className={css.brandLockup}>
          <span className={css.brandMark} aria-hidden='true'>
            {copy.brandMark}
          </span>
          <div className={css.brandCopy}>
            <p>{copy.edition}</p>
            <h1>{copy.brand}</h1>
          </div>
        </div>
      </div>

      <div className={css.dateLockup}>
        <span>
          {copy.signal}
          {' // '}
          {copy.challenge}{' '}
          {String(challengeSequence(challenge)).padStart(3, '0')}
        </span>
        <strong>{formatDate(challenge.publicationDate, locale)}</strong>
        <span>
          {challenge.rulesVersion}
          {' // '}
          {challenge.sourceRevision}
        </span>
      </div>

      <div className={css.headerTools}>
        <nav className={css.modeNav} aria-label={copy.edition}>
          {onModeChange ? (
            <>
              <button
                type='button'
                className={css.modeLink}
                data-active={mode === 'daily'}
                aria-pressed={mode === 'daily'}
                disabled={timedState}
                onClick={() => onModeChange('daily')}
              >
                {copy.daily}
              </button>
              <button
                type='button'
                className={css.modeLink}
                data-active={mode === 'practice'}
                aria-pressed={mode === 'practice'}
                disabled={timedState}
                onClick={() => onModeChange('practice')}
              >
                {copy.practice}
              </button>
            </>
          ) : (
            <>
              <a
                className={css.modeLink}
                data-active={mode === 'daily'}
                href={`/${locale}/games/geo`}
              >
                {copy.daily}
              </a>
              <a
                className={css.modeLink}
                data-active={mode === 'practice'}
                href={`/${locale}/games/geo/practice`}
              >
                {copy.practice}
              </a>
            </>
          )}
          <span className={css.headerDivider} aria-hidden='true' />
          {onLocaleChange ? (
            <>
              <button
                type='button'
                className={css.languageLink}
                data-active={locale === 'en'}
                aria-label={`${copy.language}: ${copy.english}`}
                aria-pressed={locale === 'en'}
                onClick={() => onLocaleChange('en')}
              >
                EN
              </button>
              <button
                type='button'
                className={css.languageLink}
                data-active={locale === 'es'}
                aria-label={`${copy.language}: ${copy.spanish}`}
                aria-pressed={locale === 'es'}
                onClick={() => onLocaleChange('es')}
              >
                ES
              </button>
            </>
          ) : (
            <>
              <a
                className={css.languageLink}
                data-active='true'
                href={routeFor(locale, routeKind, challenge.publicationDate)}
                hrefLang={locale}
                aria-label={`${copy.language}: ${
                  locale === 'en' ? copy.english : copy.spanish
                }`}
              >
                {locale.toUpperCase()}
              </a>
              <a
                className={css.languageLink}
                data-active='false'
                href={routeFor(
                  alternateLocale,
                  routeKind,
                  challenge.publicationDate,
                )}
                hrefLang={alternateLocale}
                aria-label={
                  alternateLocale === 'en' ? copy.english : copy.spanish
                }
              >
                {alternateLocale.toUpperCase()}
              </a>
            </>
          )}
        </nav>
        <button
          type='button'
          className={css.headerButton}
          aria-label={`${copy.sound}: ${
            soundEnabled ? copy.soundOn : copy.soundOff
          }`}
          aria-pressed={soundEnabled}
          onClick={onSoundToggle}
        >
          <span aria-hidden='true'>{soundEnabled ? '♪' : '∅'}</span>
        </button>
        <button
          type='button'
          className={css.headerButton}
          disabled={timedState}
          aria-label={copy.settings}
          aria-haspopup='dialog'
          onClick={(event) => openSettings(event.currentTarget)}
        >
          <span aria-hidden='true'>◉</span>
        </button>
        <button
          type='button'
          className={css.headerButton}
          disabled={timedState}
          aria-label={copy.help}
          aria-haspopup='dialog'
          onClick={(event) => openHelp(event.currentTarget)}
        >
          <span aria-hidden='true'>?</span>
        </button>
      </div>
    </header>
  )
}

function ProgressTrack({
  challenge,
  roundElapsedMs,
  state,
  timed,
}: {
  challenge: DailyGeoChallenge
  roundElapsedMs: number
  state: GeoGameState
  timed: boolean
}) {
  const activeRound = challenge.rounds[state.roundIndex]
  const activeRoundLimit = activeRound ? roundTimeLimitMs(activeRound) : 0
  const timeRatio =
    timed && activeRoundLimit > 0
      ? Math.max(0, 1 - roundElapsedMs / activeRoundLimit)
      : 1

  return (
    <div
      className={css.progressTrack}
      aria-hidden='true'
      style={{
        gridTemplateColumns: `repeat(${challenge.rounds.length}, 1fr)`,
      }}
    >
      {challenge.rounds.map((round, index) => {
        const currentRoundFinished =
          index === state.roundIndex &&
          (state.phase === 'round-summary' ||
            state.phase === 'between-rounds-paused')
        const status =
          state.phase === 'completed' ||
          index < state.roundIndex ||
          currentRoundFinished
            ? 'completed'
            : index === state.roundIndex && state.phase !== 'idle'
              ? 'current'
              : 'pending'
        return (
          <span
            key={round.id}
            className={css.progressSegment}
            data-state={status}
            style={
              index === state.roundIndex
                ? ({
                    '--round-time-ratio': timeRatio,
                  } as CSSProperties)
                : undefined
            }
          />
        )
      })}
    </div>
  )
}

function PlanetInstrument({
  challenge,
  copy,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
}) {
  const durations = [
    ...new Set(challenge.rounds.map((round) => roundSeconds(round))),
  ]
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

function Briefing({
  challenge,
  copy,
  displayRounds,
  locale,
  mode,
  onPracticeRoundChange,
  onPracticeTimedChange,
  onStart,
  practiceRound,
  practiceTimed,
  restored,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
  displayRounds: Round[]
  locale: GeoLocale
  mode: GeoGameMode
  onPracticeRoundChange: (round: PracticeRound) => void
  onPracticeTimedChange: (timed: boolean) => void
  onStart: () => void
  practiceRound: PracticeRound
  practiceTimed: boolean
  restored: boolean
}) {
  const introChallenge = { ...challenge, rounds: displayRounds }
  const durationSeconds = [
    ...new Set(challenge.rounds.map((round) => roundSeconds(round))),
  ].join('/')
  const timingNotice = formatGeoMessage(copy.timingNotice, {
    seconds: durationSeconds,
  })

  return (
    <section
      className={css.briefing}
      data-mode={mode}
      aria-labelledby='geo-briefing-title'
    >
      <div className={css.briefingCopy}>
        <div className={css.briefingLead}>
          {mode !== 'practice' && (
            <p className={css.eyebrow}>{copy.introEyebrow}</p>
          )}
          <h2 id='geo-briefing-title' className={css.briefingTitle}>
            {mode === 'practice' ? copy.practiceTitle : copy.introTitle}
          </h2>
          <p className={css.briefingBody}>
            {mode === 'practice' ? copy.practiceBody : copy.introBody}
          </p>

          <div className={css.briefingMeta}>
            <p>
              {mode === 'practice' ? copy.practiceNote : copy.officialAttempt}
            </p>
            <p>
              {mode === 'practice' && !practiceTimed
                ? copy.untimedNotice
                : timingNotice}
            </p>
          </div>
        </div>

        <div className={css.briefingControls}>
          {mode === 'practice' && (
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
                      {round === 'all'
                        ? copy.allRounds
                        : roundName(copy, round)}
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
                <span className={css.toggle} data-active={practiceTimed} />
              </button>
            </div>
          )}

          <button type='button' className={css.primaryButton} onClick={onStart}>
            <span>{restored ? copy.resumeRun : copy.start}</span>
            <span className={css.buttonArrow} aria-hidden='true'>
              ↗
            </span>
          </button>
        </div>
      </div>
      <PlanetInstrument challenge={introChallenge} copy={copy} />
      <span className={css.srOnly}>
        {formatDate(challenge.publicationDate, locale)}
      </span>
    </section>
  )
}

function DifficultyMeter({
  difficulty,
  label,
  shortLabel,
}: {
  difficulty: number
  label: string
  shortLabel: string
}) {
  const displayedDifficulty = Math.min(
    DIFFICULTY_TIERS.length,
    Math.max(1, Math.round(difficulty)),
  )

  return (
    <span className={css.difficulty}>
      <span className={css.srOnly}>
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

function PromptArtifact({
  copy,
  locale,
  mapFeedback,
  mapLabels,
  onMapCoordinateChange,
  onMapSubmit,
  question,
  selectedCoordinate,
  state,
}: {
  copy: GeoMessages
  locale: GeoLocale
  mapFeedback?: { answerCoordinate: GeoCoordinate; distanceKm: number }
  mapLabels: GeoMapLabels
  onMapCoordinateChange: (coordinate: GeoCoordinate) => void
  onMapSubmit: (coordinate: GeoCoordinate) => void
  question: NonNullable<ReturnType<typeof currentQuestion>>
  selectedCoordinate: GeoCoordinate | null
  state: GeoGameState
}) {
  if (question.type === 'shape' && question.assetUrl) {
    return (
      <div className={css.promptOrbit}>
        <img
          className={css.shapeAsset}
          src={question.assetUrl}
          alt={copy.shapePromptAlt}
          width='1000'
          height='700'
        />
      </div>
    )
  }

  if (question.type === 'flag' && question.assetUrl) {
    return (
      <div className={css.flagStage}>
        <img
          className={css.flagAsset}
          src={question.assetUrl}
          alt={copy.flagPromptAlt}
          width='640'
          height='480'
        />
      </div>
    )
  }

  if (question.type === 'capital') {
    return null
  }

  return (
    <GeoMap
      locale={locale}
      labels={mapLabels}
      prompt={question.prompt[locale]}
      disabled={state.phase !== 'question'}
      selectedCoordinate={selectedCoordinate}
      onSelectedCoordinateChange={onMapCoordinateChange}
      onSubmit={onMapSubmit}
      feedback={mapFeedback}
    />
  )
}

const selectedOptionFor = (answer: AnswerResult | null): string | null => {
  if (!answer || answer.kind === 'map-pin') return null
  return answer.selectedOptionId
}

const correctOptionFor = (answer: AnswerResult | null): string | null => {
  if (!answer || answer.kind === 'map-pin') return null
  return answer.correctOptionId
}

const isPerfectAnswer = (answer: AnswerResult | null): boolean =>
  answer?.kind === 'map-pin' && answer.distanceBand === 'within-100'

type FeedbackResult = 'correct' | 'expired' | 'incorrect' | 'passed' | 'perfect'

const feedbackResult = (answer: AnswerResult): FeedbackResult => {
  if (answer.expired) return 'expired'
  if (answer.skipped) return 'passed'
  if (isPerfectAnswer(answer)) return 'perfect'
  return answer.correct ? 'correct' : 'incorrect'
}

const feedbackHeadline = (answer: AnswerResult, copy: GeoMessages): string => {
  const headlines: Record<FeedbackResult, string> = {
    correct: copy.correct,
    expired: copy.expired,
    incorrect: copy.incorrect,
    passed: copy.passed,
    perfect: copy.perfect,
  }
  return headlines[feedbackResult(answer)]
}

const FEEDBACK_GLYPHS: Record<FeedbackResult, string> = {
  correct: '✓',
  expired: '×',
  incorrect: '×',
  passed: '↷',
  perfect: '◎',
}

const FEEDBACK_ATTRS: Record<FeedbackResult, string> = {
  correct: 'correct',
  expired: 'incorrect',
  incorrect: 'incorrect',
  passed: 'pass',
  perfect: 'perfect',
}

const feedbackDetail = (
  answer: AnswerResult,
  copy: GeoMessages,
  locale: GeoLocale,
  submittedLabel: string | undefined,
): string => {
  if (answer.kind === 'map-pin') {
    if (answer.distanceKm === null) return ''
    return copy.distanceAway.replace(
      '{distance}',
      new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
        maximumFractionDigits: 0,
      }).format(answer.distanceKm),
    )
  }
  if (!submittedLabel) return ''
  return `${copy.yourAnswer}: ${submittedLabel}`
}

function FeedbackBar({
  answer,
  copy,
  locale,
  options,
}: {
  answer: AnswerResult
  copy: GeoMessages
  locale: GeoLocale
  options: LocalizedOption[]
}) {
  const result = feedbackResult(answer)
  const correctOption = options.find(
    (option) => option.id === correctOptionFor(answer),
  )
  const selectedOption = options.find(
    (option) => option.id === selectedOptionFor(answer),
  )
  const submittedText =
    answer.kind === 'choice' ? answer.submittedText?.trim() : undefined
  const detail = feedbackDetail(
    answer,
    copy,
    locale,
    submittedText ?? selectedOption?.label[locale],
  )
  const correction = answer.correct ? null : correctOption

  return (
    <div className={css.feedbackBar} data-result={result}>
      <span className={css.feedbackIcon} aria-hidden='true'>
        {FEEDBACK_GLYPHS[result]}
      </span>
      <span className={css.feedbackCopy}>
        <strong>{feedbackHeadline(answer, copy)}</strong>
        <span>{detail}</span>
      </span>
      <span className={css.feedbackPoints}>
        <strong>
          {answer.score > 0 ? `+${formatScore(answer.score, locale)}` : '0'}
        </strong>
        <span>
          {answer.score > 0
            ? `×${answer.streakMultiplier.toFixed(1)} ${copy.multiplier}`
            : copy.noPoints}
        </span>
      </span>
      {correction && (
        <div className={css.feedbackCorrection}>
          <span>{copy.correctAnswer}</span>
          <strong>{correction.label[locale]}</strong>
        </div>
      )}
    </div>
  )
}

function RoundTelemetry({
  attempt,
  copy,
  difficulty,
  locale,
  onPass,
  practiceTimed,
  roundElapsedMs,
  roundLimitMs,
  state,
}: {
  attempt: number
  copy: GeoMessages
  difficulty: number
  locale: GeoLocale
  onPass: () => void
  practiceTimed: boolean
  roundElapsedMs: number
  roundLimitMs: number
  state: GeoGameState
}) {
  const remainingMs = Math.max(0, roundLimitMs - roundElapsedMs)
  const timerRatio = roundLimitMs > 0 ? remainingMs / roundLimitMs : 0
  const urgent = practiceTimed && remainingMs <= 10_000

  return (
    <div className={css.questionTelemetry}>
      <span
        className={css.questionMetric}
        data-urgent={urgent}
        role='timer'
        aria-label={`${copy.time}: ${
          practiceTimed ? formatRoundClock(remainingMs) : copy.untimed
        }`}
      >
        <span>{copy.time}</span>
        <strong>{practiceTimed ? formatRoundClock(remainingMs) : '∞'}</strong>
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
        style={
          {
            '--timer-ratio': timerRatio,
          } as CSSProperties
        }
      >
        <span />
      </span>
    </div>
  )
}

function TextAnswerConsole({
  copy,
  lexicon,
  locale,
  onAnswer,
  options,
  placeholder,
  state,
}: {
  copy: GeoMessages
  lexicon: LocalizedOption[]
  locale: GeoLocale
  onAnswer: (answer: { optionId: string | null; submittedText: string }) => void
  options: LocalizedOption[]
  placeholder: string
  state: GeoGameState
}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const listboxId = useId()
  const active = state.phase === 'question'
  const candidates = useMemo(
    () =>
      rankGeoAutocompleteCandidates(value, lexicon, locale, {
        maxResults: 8,
        minimumCharacters: 1,
      }),
    [lexicon, locale, value],
  )
  const expanded = active && focused && !dismissed && candidates.length > 0
  const meaningful = isMeaningfulGeoAnswerInput(value, locale)

  useEffect(() => {
    if (!active) return
    window.requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    )
  }, [active])

  const transmit = (answer: string) => {
    const submittedText = answer.trim()
    if (!submittedText || !active) return
    onAnswer({
      optionId: resolveExactGeoOptionId(submittedText, options, locale),
      submittedText,
    })
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return

    const exactCurrentOption = resolveExactGeoOptionId(value, options, locale)
    if (exactCurrentOption) {
      transmit(value)
      return
    }

    const candidate = expanded ? candidates[activeIndex] : null
    transmit(candidate?.label ?? value)
  }

  return (
    <aside
      className={css.answerConsole}
      data-mode='text'
      aria-label={copy.answerInput}
    >
      <form className={css.chatForm} onSubmit={submitForm}>
        <label id={`${inputId}-label`} className={css.srOnly} htmlFor={inputId}>
          {copy.answerInput}
        </label>
        <div className={css.commandLine}>
          <span className={css.commandPrefix} aria-hidden='true'>
            TX&gt;
          </span>
          <input
            ref={inputRef}
            id={inputId}
            className={css.answerInput}
            type='text'
            value={value}
            disabled={!active}
            maxLength={64}
            autoCapitalize='words'
            autoComplete='off'
            enterKeyHint='send'
            spellCheck={false}
            placeholder={placeholder}
            role='combobox'
            aria-autocomplete='list'
            aria-labelledby={`${inputId}-label geo-question-title`}
            aria-controls={listboxId}
            aria-expanded={expanded}
            aria-activedescendant={
              expanded ? `${listboxId}-option-${activeIndex}` : undefined
            }
            aria-describedby={`${inputId}-hint`}
            onBlur={() => setFocused(false)}
            onFocus={() => {
              setFocused(true)
              setDismissed(false)
            }}
            onChange={(event) => {
              setValue(event.target.value)
              setActiveIndex(0)
              setDismissed(false)
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'ArrowDown' &&
                candidates.length > 0 &&
                !dismissed
              ) {
                event.preventDefault()
                setActiveIndex((index) => (index + 1) % candidates.length)
              } else if (
                event.key === 'ArrowUp' &&
                candidates.length > 0 &&
                !dismissed
              ) {
                event.preventDefault()
                setActiveIndex(
                  (index) =>
                    (index - 1 + candidates.length) % candidates.length,
                )
              } else if (event.key === 'Escape' && expanded) {
                event.preventDefault()
                setDismissed(true)
              }
            }}
          />
          <button
            type='submit'
            className={css.sendButton}
            disabled={!active || value.trim().length === 0}
          >
            <span>{copy.sendAnswer}</span>
            <span aria-hidden='true'>↗</span>
          </button>
        </div>

        <span id={`${inputId}-hint`} className={css.answerHint}>
          {copy.answerHint}
        </span>

        {expanded && (
          <div
            id={listboxId}
            className={css.autocompleteList}
            role='listbox'
            aria-label={copy.autocompleteResults}
          >
            {candidates.map((candidate, index) => (
              <button
                id={`${listboxId}-option-${index}`}
                key={candidate.optionId}
                type='button'
                role='option'
                aria-selected={index === activeIndex}
                tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => transmit(candidate.label)}
              >
                <span>{candidate.label}</span>
                <span className={css.autocompleteArrow} aria-hidden='true'>
                  ↗
                </span>
              </button>
            ))}
          </div>
        )}

        {active &&
          focused &&
          meaningful &&
          candidates.length === 0 &&
          !dismissed && (
            <span className={css.noAutocompleteResults} role='status'>
              {copy.noAutocompleteResults}
            </span>
          )}
      </form>
      <span className={css.streakReadout}>
        {copy.streak} <strong>×{state.currentStreak}</strong>
      </span>
    </aside>
  )
}

function RoundSummary({
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
  const score = answers.reduce((total, answer) => total + answer.score, 0)
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
        <p className={css.eyebrow}>
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
          className={css.secondaryButton}
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

function Countdown({
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
  return (
    <div className={css.overlay}>
      <section
        className={css.countdownPanel}
        aria-label={resume ? copy.resumeCountdown : copy.briefing}
        aria-live='assertive'
      >
        <span className={css.countdownLabel}>
          {resume
            ? copy.resumeCountdown
            : round
              ? roundName(copy, round.type)
              : copy.briefing}
        </span>
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

function VisibilityPause({
  copy,
  onResume,
}: {
  copy: GeoMessages
  onResume: () => void
}) {
  return (
    <div className={css.overlay}>
      <section
        className={css.pausePanel}
        aria-labelledby='geo-visibility-pause-title'
      >
        <p className={css.eyebrow}>UTC {' // '} HOLD</p>
        <h2 id='geo-visibility-pause-title'>{copy.visibilityPaused}</h2>
        <p>{copy.visibilityPausedBody}</p>
        <button
          type='button'
          className={css.primaryButton}
          data-initial-focus
          onClick={onResume}
        >
          <span>{copy.resume}</span>
          <span aria-hidden='true'>↗</span>
        </button>
      </section>
    </div>
  )
}

function NextGameCountdown({ copy }: { copy: GeoMessages }) {
  const countdown = useDailyCountdown()
  if (!countdown.label) return null
  if (countdown.ready) {
    return (
      <button
        type='button'
        className={css.nextGameReady}
        onClick={() => window.location.reload()}
      >
        {copy.nextGameReady}
      </button>
    )
  }
  return (
    <div className={css.nextGame}>
      <p className={css.nextGameReadout}>
        <span>{copy.nextGameIn}</span>
        <strong>{countdown.label}</strong>
      </p>
      <span
        className={css.nextGameTrack}
        aria-hidden='true'
        style={
          {
            '--remaining': countdown.remainingFraction ?? 0,
          } as CSSProperties
        }
      >
        <span />
      </span>
    </div>
  )
}

function Completion({
  copy,
  locale,
  onCopy,
  onNewPracticeGame,
  onShare,
  state,
  stats,
}: {
  copy: GeoMessages
  locale: GeoLocale
  onCopy: () => void
  onNewPracticeGame: () => void
  onShare: () => void
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

  return (
    <section className={css.completion} aria-labelledby='geo-complete-title'>
      <div className={css.completionLead}>
        <p className={css.eyebrow}>{copy.completeEyebrow}</p>
        <h2
          ref={headingRef}
          id='geo-complete-title'
          className={css.completionTitle}
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
        {state.runKind === 'official' && <NextGameCountdown copy={copy} />}
        <div className={css.completionActions}>
          <button type='button' className={css.primaryButton} onClick={onShare}>
            <span>{copy.share}</span>
            <span aria-hidden='true'>↗</span>
          </button>
          <button
            type='button'
            className={css.secondaryButton}
            onClick={onCopy}
          >
            {copy.copyResult}
          </button>
          {state.runKind === 'practice' && (
            <button
              type='button'
              className={css.secondaryButton}
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

function GameDialogs({
  copy,
  onClose,
  onSettingsChange,
  opener,
  settings,
  state,
}: {
  copy: GeoMessages
  onClose: () => void
  onSettingsChange: (settings: GeoSettings) => void
  opener: MutableRefObject<HTMLElement | null>
  settings: GeoSettings
  state: GeoGameState
}) {
  const close = () => {
    onClose()
    window.requestAnimationFrame(() => opener.current?.focus())
  }

  const toggle = (key: 'sound' | 'reducedMotion') => {
    onSettingsChange({ ...settings, [key]: !settings[key] })
  }

  return (
    <>
      <Modal
        open={state.overlay === 'settings'}
        labelId='geo-settings-title'
        close={close}
      >
        <DialogHeader
          close={close}
          copy={copy}
          eyebrow='SYSTEM // CONFIG'
          id='geo-settings-title'
          title={copy.settingsTitle}
        />
        <div className={css.dialogBody}>
          <ul className={css.settingsList}>
            {(
              [
                ['sound', copy.sound],
                ['reducedMotion', copy.reducedMotion],
              ] as const
            ).map(([key, label], index) => (
              <li className={css.settingRow} key={key}>
                <span>{label}</span>
                <button
                  type='button'
                  className={css.toggle}
                  data-active={settings[key]}
                  aria-pressed={settings[key]}
                  aria-label={label}
                  data-initial-focus={index === 0 ? '' : undefined}
                  onClick={() => toggle(key)}
                />
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <Modal
        open={state.overlay === 'help'}
        labelId='geo-help-title'
        close={close}
      >
        <DialogHeader
          close={close}
          copy={copy}
          eyebrow='INPUT // KEYBOARD'
          id='geo-help-title'
          title={copy.helpTitle}
        />
        <div className={css.dialogBody}>
          <ul className={css.helpList}>
            {[
              [['A…', 'Enter'], copy.keyAnswer],
              [['P'], copy.keyPass],
              [['←', '↑', '↓', '→'], copy.keyArrows],
              [['Enter'], copy.keyEnter],
              [['+', '−'], copy.keyMapZoom],
              [['Home'], copy.keyHome],
              [['M'], copy.keySound],
              [['?'], copy.keyHelp],
              [['Esc'], copy.keyEscape],
            ].map(([keys, description], index) => (
              <li className={css.helpRow} key={description as string}>
                <span className={css.helpKeys}>
                  {(keys as string[]).map((key) => (
                    <kbd
                      key={key}
                      data-initial-focus={index === 0 ? '' : undefined}
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
                <span>{description as string}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  )
}

function GeoSession({
  copy,
  displayRounds,
  initialState,
  locale,
  mode,
  onLocaleChange,
  onModeChange,
  onNewPracticeGame,
  onPracticeRoundChange,
  onPracticeTimedChange,
  onSettingsChange,
  practiceRound,
  practiceTimed,
  routeKind,
  settings,
}: {
  copy: GeoMessages
  displayRounds: Round[]
  initialState: GeoGameState
  locale: GeoLocale
  mode: GeoGameMode
  onLocaleChange?: (locale: GeoLocale) => void
  onModeChange?: (mode: GeoGameMode) => void
  onNewPracticeGame: () => void
  onPracticeRoundChange: (round: PracticeRound) => void
  onPracticeTimedChange: (timed: boolean) => void
  onSettingsChange: (settings: GeoSettings) => void
  practiceRound: PracticeRound
  practiceTimed: boolean
  routeKind: GeoRouteKind
  settings: GeoSettings
}) {
  const [state, dispatch] = useReducer(geoGameReducer, initialState)
  const [questionElapsedMs, setQuestionElapsedMs] = useState(
    state.questionElapsedMs,
  )
  const [roundElapsedMs, setRoundElapsedMs] = useState(state.roundElapsedMs)
  const [countdown, setCountdown] = useState(3)
  const [marker, setMarker] = useState<{
    attemptKey: string
    coordinate: GeoCoordinate
  } | null>(null)
  const [stats, setStats] = useState(
    () => loadGeoStats(getBrowserGeoStorage()).value,
  )
  const [announcement, setAnnouncement] = useState('')
  const [audio] = useState(createGeoAudio)
  const stateRef = useRef(state)
  const questionElapsedRef = useRef(questionElapsedMs)
  const roundElapsedRef = useRef(roundElapsedMs)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const recordedCompletionRef = useRef<string | null>(null)
  const announcementNonceRef = useRef(false)
  const playedFeedbackRef = useRef(
    new Set(
      state.phase === 'feedback' && state.lastAnswer
        ? [state.lastAnswer.answeredAt]
        : [],
    ),
  )
  const question = currentQuestion(state)
  const round = currentRound(state)
  const playedTimeoutRoundsRef = useRef(
    new Set(state.phase === 'round-summary' ? [state.roundIndex] : []),
  )
  const questionId = question?.id ?? ''
  const questionAttemptKey = `${state.roundIndex}:${state.questionIndex}:${questionId}`
  const selectedCoordinate =
    marker?.attemptKey === questionAttemptKey ? marker.coordinate : null
  const options = useMemo(
    () => (question && question.type !== 'map' ? question.options : []),
    [question],
  )
  const autocompleteOptions = useMemo(() => {
    if (!question || question.type === 'map') return []
    const roundOptions = state.challenge.rounds
      .filter((item) => item.type === question.type)
      .flatMap((item) =>
        item.questions.flatMap((candidate) =>
          candidate.type === 'map' ? [] : candidate.options,
        ),
      )
    if (question.type === 'capital') {
      return mergeCapitalAutocompleteOptions(
        state.challenge.cityOptions,
        roundOptions,
      )
    }

    const optionsById = new Map(
      OFFICIAL_COUNTRY_OPTIONS.map((option) => [option.id, option]),
    )
    for (const option of roundOptions) optionsById.set(option.id, option)
    return [...optionsById.values()]
  }, [question, state.challenge.cityOptions, state.challenge.rounds])
  const answerPlaceholder =
    question?.type === 'capital' ? copy.typeCapital : copy.typeCountry
  // Wrong answers keep the shared round clock ticking through feedback — the
  // correction-reading time IS the error penalty. Correct feedback is free.
  const roundClockRunning =
    state.phase === 'question' ||
    (state.phase === 'feedback' && state.lastAnswer?.correct === false)
  useGameInput()

  const announce = useCallback((message: string) => {
    announcementNonceRef.current = !announcementNonceRef.current
    setAnnouncement(`${message}${announcementNonceRef.current ? '\u200B' : ''}`)
  }, [])

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    audio.setEnabled(settings.sound)
  }, [audio, settings.sound])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    questionElapsedRef.current = questionElapsedMs
  }, [questionElapsedMs])

  useEffect(() => {
    roundElapsedRef.current = roundElapsedMs
  }, [roundElapsedMs])

  useEffect(() => {
    if (state.phase !== 'question' || !round) return
    const baseElapsed = state.questionElapsedMs
    const startedAt = performance.now()
    let frame = 0
    setQuestionElapsedMs(baseElapsed)
    questionElapsedRef.current = baseElapsed

    const update = (now: number) => {
      const nextElapsed = Math.max(0, baseElapsed + now - startedAt)
      const cappedElapsed = Math.min(round.questionLimitMs, nextElapsed)
      setQuestionElapsedMs(cappedElapsed)
      questionElapsedRef.current = cappedElapsed
      if (cappedElapsed >= round.questionLimitMs) return
      frame = window.requestAnimationFrame(update)
    }

    frame = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frame)
  }, [round, state.phase, state.questionElapsedMs])

  useEffect(() => {
    if (!roundClockRunning || !round || !practiceTimed) return
    const limitMs = roundTimeLimitMs(round)
    const baseElapsed = state.roundElapsedMs
    const startedAt = performance.now()
    let frame = 0
    let expired = false
    setRoundElapsedMs(baseElapsed)
    roundElapsedRef.current = baseElapsed

    const update = (now: number) => {
      const nextElapsed = Math.max(0, baseElapsed + now - startedAt)
      const cappedElapsed = Math.min(limitMs, nextElapsed)
      setRoundElapsedMs(cappedElapsed)
      roundElapsedRef.current = cappedElapsed

      if (cappedElapsed >= limitMs && !expired) {
        expired = true
        dispatch({
          type: 'ROUND_TIME_EXPIRED',
          roundElapsedMs: limitMs,
          answeredAt: new Date().toISOString(),
        })
        return
      }
      frame = window.requestAnimationFrame(update)
    }

    frame = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frame)
  }, [practiceTimed, round, roundClockRunning, state.roundElapsedMs])

  useEffect(() => {
    if (roundClockRunning) return
    setRoundElapsedMs(state.roundElapsedMs)
    roundElapsedRef.current = state.roundElapsedMs
  }, [roundClockRunning, state.roundElapsedMs])

  useEffect(() => {
    if (state.phase !== 'countdown') return
    const duration = state.countdownReason === 'resume' ? 1000 : 3000
    const startedAt = performance.now()
    let hiddenAt: number | null = document.hidden ? startedAt : null
    let hiddenElapsed = 0
    let frame = 0

    const handleVisibility = () => {
      const now = performance.now()
      if (document.hidden) {
        hiddenAt = now
      } else if (hiddenAt !== null) {
        hiddenElapsed += now - hiddenAt
        hiddenAt = null
      }
    }

    const update = (now: number) => {
      if (document.hidden) {
        frame = window.requestAnimationFrame(update)
        return
      }
      const progressed = now - startedAt - hiddenElapsed
      const remaining = Math.max(0, duration - progressed)
      setCountdown(Math.max(1, Math.ceil(remaining / 1000)))
      if (remaining <= 0) {
        dispatch({ type: 'COUNTDOWN_FINISHED' })
        return
      }
      frame = window.requestAnimationFrame(update)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    frame = window.requestAnimationFrame(update)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.cancelAnimationFrame(frame)
    }
  }, [state.countdownReason, state.phase])

  useEffect(() => {
    if (state.phase !== 'feedback') return
    const rules = state.challenge.rules
    const answer = state.lastAnswer
    // Map answers carry the reveal (true pin, distance) and always hold long.
    const holdsShort = answer?.correct && answer.kind !== 'map-pin'
    const duration = holdsShort
      ? (rules?.feedbackMs ?? 650)
      : (rules?.wrongFeedbackMs ?? 2500)
    const timeout = window.setTimeout(() => {
      dispatch({
        type: 'FEEDBACK_FINISHED',
        completedAt: new Date().toISOString(),
        roundElapsedMs: roundElapsedRef.current,
      })
    }, duration)
    return () => window.clearTimeout(timeout)
  }, [state.challenge.rules, state.lastAnswer, state.phase])

  useEffect(() => {
    if (state.phase !== 'round-summary') return
    const duration = state.challenge.rules?.roundSummaryMs ?? 3000
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'ROUND_SUMMARY_FINISHED' })
    }, duration)
    return () => window.clearTimeout(timeout)
  }, [state.challenge.rules?.roundSummaryMs, state.phase])

  useEffect(() => {
    if (state.phase !== 'question' || question?.type !== 'map') return
    window.requestAnimationFrame(() => questionHeadingRef.current?.focus())
  }, [question?.type, state.phase])

  useEffect(() => {
    if (state.phase !== 'feedback' || !state.lastAnswer) return
    const answer = state.lastAnswer
    if (playedFeedbackRef.current.has(answer.answeredAt)) return
    playedFeedbackRef.current.add(answer.answeredAt)

    const message = feedbackHeadline(answer, copy)
    const correctLabel = options.find(
      (option) => option.id === correctOptionFor(answer),
    )?.label[locale]
    announce(
      answer.correct || !correctLabel
        ? message
        : `${message}. ${copy.correctAnswer}: ${correctLabel}`,
    )
    const sounds: Record<FeedbackResult, GeoSound> = {
      correct: 'correct',
      expired: 'timeout',
      incorrect: 'incorrect',
      passed: 'pass',
      perfect: 'perfect',
    }
    audio.play(sounds[feedbackResult(answer)])
  }, [announce, audio, copy, locale, options, state.lastAnswer, state.phase])

  useEffect(() => {
    if (
      state.phase !== 'round-summary' ||
      !round ||
      !practiceTimed ||
      state.roundElapsedMs < roundTimeLimitMs(round) ||
      playedTimeoutRoundsRef.current.has(state.roundIndex)
    ) {
      return
    }
    playedTimeoutRoundsRef.current.add(state.roundIndex)
    announce(copy.expired)
    audio.play('timeout')
  }, [
    announce,
    audio,
    copy.expired,
    practiceTimed,
    round,
    state.phase,
    state.roundElapsedMs,
    state.roundIndex,
  ])

  useEffect(() => {
    const serialized = serializeGeoRun(state)
    if (!serialized) return
    saveGeoRun(
      getBrowserGeoStorage(),
      state.challenge.publicationDate,
      serialized,
    )
  }, [state])

  useEffect(() => {
    if (
      state.phase !== 'completed' ||
      state.runKind !== 'official' ||
      !state.completedAt ||
      recordedCompletionRef.current === state.completedAt
    ) {
      return
    }
    recordedCompletionRef.current = state.completedAt
    const storage = getBrowserGeoStorage()
    const loaded = loadGeoStats(storage).value
    const record = createOfficialRunRecord({
      answers: state.answers,
      challenge: state.challenge,
      completedAt: state.completedAt,
    })
    const next = recordOfficialRun(loaded, record)
    saveGeoStats(storage, next)
    setStats(next)
  }, [state])

  useEffect(() => {
    const freezeAndSave = () => {
      const current = stateRef.current
      if (
        current.phase !== 'question' &&
        current.phase !== 'feedback' &&
        current.phase !== 'countdown'
      ) {
        return
      }
      const frozen = geoGameReducer(current, {
        type: 'VISIBILITY_HIDDEN',
        elapsedMs: questionElapsedRef.current,
        roundElapsedMs: roundElapsedRef.current,
      })
      const serialized = serializeGeoRun(frozen)
      if (serialized) {
        saveGeoRun(
          getBrowserGeoStorage(),
          current.challenge.publicationDate,
          serialized,
        )
      }
      dispatch({
        type: 'VISIBILITY_HIDDEN',
        elapsedMs: questionElapsedRef.current,
        roundElapsedMs: roundElapsedRef.current,
      })
    }
    const handleVisibility = () => {
      if (document.hidden) freezeAndSave()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', freezeAndSave)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', freezeAndSave)
    }
  }, [])

  const submitChoice = useCallback((optionId: string) => {
    const current = stateRef.current
    const activeQuestion = currentQuestion(current)
    if (
      current.phase !== 'question' ||
      !activeQuestion ||
      activeQuestion.type === 'map'
    ) {
      return
    }
    dispatch({
      type: 'SUBMIT_CHOICE',
      optionId,
      elapsedMs: questionElapsedRef.current,
      roundElapsedMs: roundElapsedRef.current,
      answeredAt: new Date().toISOString(),
    })
  }, [])

  const submitTextAnswer = useCallback(
    ({
      optionId,
      submittedText,
    }: {
      optionId: string | null
      submittedText: string
    }) => {
      const current = stateRef.current
      const activeQuestion = currentQuestion(current)
      if (
        current.phase !== 'question' ||
        !activeQuestion ||
        activeQuestion.type === 'map'
      ) {
        return
      }
      dispatch({
        type: 'SUBMIT_TEXT',
        optionId,
        submittedText,
        elapsedMs: questionElapsedRef.current,
        roundElapsedMs: roundElapsedRef.current,
        answeredAt: new Date().toISOString(),
      })
    },
    [],
  )

  const submitMap = useCallback((coordinate: GeoCoordinate) => {
    dispatch({
      type: 'SUBMIT_MAP',
      coordinate,
      elapsedMs: questionElapsedRef.current,
      roundElapsedMs: roundElapsedRef.current,
      answeredAt: new Date().toISOString(),
    })
  }, [])

  const passQuestion = useCallback(() => {
    const current = stateRef.current
    if (current.phase !== 'question' || !currentQuestion(current)) return
    dispatch({
      type: 'SKIP_QUESTION',
      elapsedMs: questionElapsedRef.current,
      roundElapsedMs: roundElapsedRef.current,
      answeredAt: new Date().toISOString(),
    })
  }, [])

  const start = useCallback(() => {
    const current = stateRef.current
    if (current.phase === 'visibility-paused') {
      dispatch({ type: 'RESUME_FROM_VISIBILITY' })
    } else {
      dispatch({ type: 'START', startedAt: new Date().toISOString() })
    }
    audio.play('start')
  }, [audio])

  const toggleSound = useCallback(() => {
    const sound = !settings.sound
    audio.setEnabled(sound)
    onSettingsChange({ ...settings, sound })
    announce(sound ? copy.soundOn : copy.soundOff)
    if (sound) audio.play('start')
  }, [announce, audio, copy.soundOff, copy.soundOn, onSettingsChange, settings])

  const openOverlay = useCallback(
    (overlay: 'settings' | 'help', opener: HTMLButtonElement | null) => {
      openerRef.current = opener
      dispatch({ type: 'OPEN_OVERLAY', overlay })
    },
    [],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return
      }
      const element = event.target instanceof Element ? event.target : null
      const editable = element?.closest(
        'input, textarea, select, [contenteditable], [role="textbox"]',
      )
      if (editable) return

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault()
        toggleSound()
        return
      }

      if (stateRef.current.overlay) {
        if (event.key === 'Escape') {
          event.preventDefault()
          dispatch({ type: 'CLOSE_OVERLAY' })
          window.requestAnimationFrame(() => openerRef.current?.focus())
        }
        return
      }

      if (
        event.key === '?' &&
        stateRef.current.phase !== 'question' &&
        stateRef.current.phase !== 'countdown'
      ) {
        event.preventDefault()
        openOverlay('help', null)
        return
      }

      const current = stateRef.current
      if (current.phase === 'idle' && event.key === 'Enter') {
        if (element?.closest('button, a, input, select')) return
        event.preventDefault()
        start()
        return
      }
      if (current.phase === 'visibility-paused' && event.key === 'Enter') {
        event.preventDefault()
        dispatch({ type: 'RESUME_FROM_VISIBILITY' })
        return
      }
      if (current.phase !== 'question') return

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        passQuestion()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openOverlay, passQuestion, start, submitChoice, toggleSound])

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
    if (navigator.share) {
      try {
        await navigator.share({ text: result, title: copy.brand })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyResult()
  }

  const mapLabels: GeoMapLabels = {
    map: copy.worldMap,
    instructions: copy.mapInstructions,
    zoomIn: copy.zoomIn,
    zoomOut: copy.zoomOut,
    recenter: copy.resetMap,
    submit: copy.placeMarker,
    latitude: copy.latitude,
    longitude: copy.longitude,
    position: copy.position,
    projection: copy.projectionNote,
    zoom: copy.zoom,
    selectedPoint: copy.selectedPoint,
    correctPoint: copy.correctPoint,
    distance: copy.distance,
    kilometres: copy.kilometres,
    regions: {
      africa: copy.africa,
      antarctic: copy.antarctic,
      arctic: copy.arctic,
      asia: copy.asia,
      europe: copy.europe,
      northAmerica: copy.northAmerica,
      oceania: copy.oceania,
      ocean: copy.ocean,
      southAmerica: copy.southAmerica,
    },
  }
  const mapAnswer =
    state.lastAnswer?.kind === 'map-pin'
      ? (state.lastAnswer as MapPinAnswerResult)
      : null
  const mapFeedback =
    mapAnswer?.distanceKm !== null && mapAnswer?.distanceKm !== undefined
      ? {
          answerCoordinate: mapAnswer.answerCoordinate,
          distanceKm: mapAnswer.distanceKm,
        }
      : undefined
  const timedState =
    state.phase === 'question' ||
    state.phase === 'feedback' ||
    state.phase === 'countdown'

  return (
    <div
      className={css.game}
      lang={locale}
      data-reduced-motion={settings.reducedMotion}
      data-phase={state.phase}
      data-feedback={
        state.phase === 'feedback' && state.lastAnswer
          ? FEEDBACK_ATTRS[feedbackResult(state.lastAnswer)]
          : undefined
      }
      data-round={
        state.phase === 'idle' || state.phase === 'completed'
          ? 'idle'
          : (round?.type ?? 'idle')
      }
    >
      <span className={css.grain} aria-hidden='true' />
      <AppHeader
        challenge={state.challenge}
        copy={copy}
        locale={locale}
        mode={mode}
        onLocaleChange={onLocaleChange}
        onModeChange={onModeChange}
        onSoundToggle={toggleSound}
        routeKind={routeKind}
        soundEnabled={settings.sound}
        timedState={timedState}
        openSettings={(button) => openOverlay('settings', button)}
        openHelp={(button) => openOverlay('help', button)}
      />
      <ProgressTrack
        challenge={state.challenge}
        roundElapsedMs={roundElapsedMs}
        state={state}
        timed={practiceTimed}
      />

      <div className={css.viewport}>
        {state.phase === 'idle' ? (
          <Briefing
            challenge={state.challenge}
            copy={copy}
            displayRounds={displayRounds}
            locale={locale}
            mode={mode}
            onPracticeRoundChange={onPracticeRoundChange}
            onPracticeTimedChange={onPracticeTimedChange}
            onStart={start}
            practiceRound={practiceRound}
            practiceTimed={practiceTimed}
            restored={false}
          />
        ) : state.phase === 'completed' ? (
          <Completion
            copy={copy}
            locale={locale}
            onCopy={() => void copyResult()}
            onNewPracticeGame={onNewPracticeGame}
            onShare={() => void shareResult()}
            state={state}
            stats={stats}
          />
        ) : (
          <div
            className={css.missionGrid}
            data-direct-map={question?.type === 'map'}
          >
            <section className={css.questionDeck}>
              {question && round && (
                <>
                  <header className={css.questionHeader}>
                    <div className={css.questionHeaderCopy}>
                      <p>
                        {copy.round} {state.roundIndex + 1}/
                        {state.challenge.rounds.length}
                        {' · '}
                        {roundName(copy, round.type)}
                        {' · '}
                        {copy.attempt} {state.questionIndex + 1}
                      </p>
                      {question.type !== 'capital' && (
                        <h2
                          id='geo-question-title'
                          ref={questionHeadingRef}
                          tabIndex={-1}
                        >
                          {question.prompt[locale]}
                        </h2>
                      )}
                    </div>
                    <RoundTelemetry
                      attempt={state.questionIndex + 1}
                      copy={copy}
                      difficulty={question.difficulty}
                      locale={locale}
                      onPass={passQuestion}
                      practiceTimed={practiceTimed}
                      roundElapsedMs={roundElapsedMs}
                      roundLimitMs={roundTimeLimitMs(round)}
                      state={state}
                    />
                  </header>
                  <div className={css.artifactFrame} data-type={question.type}>
                    <span className={css.artifactReadout}>
                      <span>LIVE {' // '} ITEM</span>
                      <span>
                        {String(state.questionIndex + 1).padStart(2, '0')}
                      </span>
                    </span>
                    {question.type === 'capital' ? (
                      <div className={css.capitalArtifact}>
                        <span aria-hidden='true'>CAP {' // '} TX</span>
                        <h2
                          id='geo-question-title'
                          ref={questionHeadingRef}
                          className={css.capitalPrompt}
                          tabIndex={-1}
                        >
                          {question.prompt[locale]}
                        </h2>
                      </div>
                    ) : (
                      <PromptArtifact
                        copy={copy}
                        locale={locale}
                        mapFeedback={mapFeedback}
                        mapLabels={mapLabels}
                        onMapCoordinateChange={(coordinate) =>
                          setMarker({
                            attemptKey: questionAttemptKey,
                            coordinate,
                          })
                        }
                        onMapSubmit={submitMap}
                        question={question}
                        selectedCoordinate={selectedCoordinate}
                        state={state}
                      />
                    )}
                  </div>
                  <div className={css.feedbackSlot}>
                    {state.phase === 'feedback' && state.lastAnswer && (
                      <FeedbackBar
                        answer={state.lastAnswer}
                        copy={copy}
                        locale={locale}
                        options={options}
                      />
                    )}
                  </div>
                </>
              )}
            </section>
            {question && question.type !== 'map' && (
              <TextAnswerConsole
                key={questionAttemptKey}
                copy={copy}
                lexicon={autocompleteOptions}
                locale={locale}
                onAnswer={submitTextAnswer}
                options={question.options}
                placeholder={answerPlaceholder}
                state={state}
              />
            )}
            {state.phase === 'countdown' && (
              <Countdown
                copy={copy}
                count={countdown}
                round={round}
                resume={state.countdownReason === 'resume'}
              />
            )}
            {state.phase === 'round-summary' && (
              <RoundSummary
                copy={copy}
                locale={locale}
                state={state}
                onContinue={() => dispatch({ type: 'ROUND_SUMMARY_FINISHED' })}
              />
            )}
            {state.phase === 'visibility-paused' && (
              <VisibilityPause
                copy={copy}
                onResume={() => dispatch({ type: 'RESUME_FROM_VISIBILITY' })}
              />
            )}
          </div>
        )}
      </div>

      <GameDialogs
        copy={copy}
        onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        onSettingsChange={onSettingsChange}
        opener={openerRef}
        settings={settings}
        state={state}
      />
      <p className={css.liveRegion} aria-live='polite' aria-atomic='true'>
        {announcement}
      </p>
    </div>
  )
}

export default function GeoGame({
  challenge,
  locale,
  mode = 'daily',
  onLocaleChange,
  onModeChange,
  routeKind = mode === 'practice' ? 'practice' : 'today',
}: GeoGameProps) {
  const copy = getGeoMessages(locale)
  const [settings, setSettings] = useState<GeoSettings | null>(null)
  const [restoredState, setRestoredState] = useState<
    GeoGameState | null | undefined
  >(undefined)
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [sessionNonce, setSessionNonce] = useState(() =>
    mode === 'practice' ? createSessionNonce() : 0,
  )
  const [practiceRound, setPracticeRound] = useState<PracticeRound>('all')
  const [practiceTimed, setPracticeTimed] = useState(true)
  const officialChallenge = useMemo(
    () => deriveDailyChallenge(challenge),
    [challenge],
  )
  const activeChallenge = useMemo(() => {
    if (mode === 'practice') {
      return deriveRunChallenge(
        practiceChallenge(challenge, practiceRound),
        sessionNonce,
      )
    }
    return officialChallenge
  }, [challenge, mode, officialChallenge, practiceRound, sessionNonce])

  useEffect(() => {
    const previous = document.documentElement.lang
    document.documentElement.lang = locale
    return () => {
      document.documentElement.lang = previous
    }
  }, [locale])

  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => {
      document.documentElement.style.setProperty(
        '--geo-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      )
    }
    update()
    viewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
      document.documentElement.style.removeProperty('--geo-viewport-height')
    }
  }, [])

  useEffect(() => {
    const storage = getBrowserGeoStorage()
    const loadedSettings = loadGeoSettings(storage)
    setSettings(loadedSettings.value)

    if (mode === 'practice') {
      setRestoredState(null)
      return
    }

    const loadedRun = loadGeoRun(storage, officialChallenge)
    if (loadedRun.status === 'invalid') {
      removeGeoRun(storage, officialChallenge.publicationDate)
      setRecoveryNotice(copy.storageRecovered)
      setRestoredState(null)
      return
    }
    setRestoredState(
      loadedRun.value
        ? restoreGeoGameState(officialChallenge, loadedRun.value, {
            runKind: 'official',
          })
        : null,
    )
  }, [copy.storageRecovered, mode, officialChallenge])

  const updateSettings = useCallback((next: GeoSettings) => {
    setSettings(next)
    saveGeoSettings(getBrowserGeoStorage(), next)
  }, [])

  if (!settings || restoredState === undefined) {
    return (
      <>
        <a className={css.skipLink} href='#main-content'>
          {copy.skipToGame}
        </a>
        <div id='vbody' className={css.shell}>
          <main id='main-content' className={css.game}>
            <div className={css.overlay}>
              <section className={css.countdownPanel} role='status'>
                <span className={css.countdownLabel}>{copy.loading}</span>
                <strong className={css.countdownNumber}>M</strong>
              </section>
            </div>
          </main>
        </div>
      </>
    )
  }

  const initialState =
    restoredState ??
    createGeoGameState(activeChallenge, {
      runKind: mode === 'practice' ? 'practice' : 'official',
      timed: practiceTimed,
    })

  return (
    <>
      <a className={css.skipLink} href='#main-content'>
        {copy.skipToGame}
      </a>
      <div id='vbody' className={css.shell}>
        <main id='main-content' tabIndex={-1}>
          <GeoSession
            key={`${sessionNonce}:${activeChallenge.id}:${practiceTimed ? 'timed' : 'untimed'}`}
            copy={copy}
            displayRounds={challenge.rounds}
            initialState={initialState}
            locale={locale}
            mode={mode}
            onLocaleChange={onLocaleChange}
            onModeChange={onModeChange}
            onNewPracticeGame={() => {
              if (mode !== 'practice') return
              const source = practiceChallenge(challenge, practiceRound)
              const randomNonce = createSessionNonce(sessionNonce)
              const nextNonce = differentRunNonce(
                source,
                activeChallenge,
                randomNonce,
              )
              setRestoredState(null)
              setSessionNonce(nextNonce)
            }}
            onPracticeRoundChange={setPracticeRound}
            onPracticeTimedChange={setPracticeTimed}
            practiceRound={practiceRound}
            practiceTimed={practiceTimed}
            routeKind={routeKind}
            settings={settings}
            onSettingsChange={updateSettings}
          />
        </main>
      </div>
      <p className={css.liveRegion} aria-live='polite'>
        {recoveryNotice}
      </p>
    </>
  )
}
