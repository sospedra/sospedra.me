import type { CSSProperties, Ref } from 'react'
import { type ExternalStore, useStoreSelector } from 'services/external-store'
import type { GeoGameState } from './game-state'
import { challengeSequence, formatDate } from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import css from './mission-header.module.css'
import type { DailyGeoChallenge } from './model'
import { roundTimeLimitMs } from './model'
import progress from './progress-track.module.css'
import type { GeoGameMode } from './run-mode'

export function AppHeader({
  challenge,
  copy,
  helpButtonRef,
  locale,
  mode,
  onLocaleChange,
  onModeChange,
  onSoundToggle,
  openHelp,
  openSettings,
  soundEnabled,
  timedState,
}: {
  challenge: DailyGeoChallenge
  copy: GeoMessages
  helpButtonRef: Ref<HTMLButtonElement>
  locale: GeoLocale
  mode: GeoGameMode
  onLocaleChange: (locale: GeoLocale) => void
  onModeChange: (mode: GeoGameMode) => void
  onSoundToggle: () => void
  openHelp: (button: HTMLButtonElement) => void
  openSettings: (button: HTMLButtonElement) => void
  soundEnabled: boolean
  timedState: boolean
}) {
  return (
    <header className={css.topbar}>
      <div className={css.brandCluster}>
        <a className={css.homeLink} href='/' aria-label={copy.home}>
          <span aria-hidden='true'>←</span>
          <span className={shell.srOnly}>{copy.home}</span>
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
          <span className={css.headerDivider} aria-hidden='true' />
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
          ref={helpButtonRef}
          type='button'
          className={`${css.headerButton} ${css.helpButton}`}
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

const progressSegmentStatus = (
  state: GeoGameState,
  index: number,
): 'completed' | 'current' | 'pending' => {
  const currentRoundFinished =
    index === state.roundIndex &&
    (state.phase === 'round-summary' || state.phase === 'between-rounds-paused')
  if (
    state.phase === 'completed' ||
    index < state.roundIndex ||
    currentRoundFinished
  ) {
    return 'completed'
  }
  if (index === state.roundIndex && state.phase !== 'idle') return 'current'
  return 'pending'
}

const selectClockDecisecond = (elapsedMs: number) => Math.floor(elapsedMs / 100)

export function ProgressTrack({
  challenge,
  roundClock,
  state,
  timed,
}: {
  challenge: DailyGeoChallenge
  roundClock: ExternalStore<number>
  state: GeoGameState
  timed: boolean
}) {
  const elapsedDeciseconds = useStoreSelector(roundClock, selectClockDecisecond)
  const activeRound = challenge.rounds[state.roundIndex]
  const activeRoundLimit = activeRound ? roundTimeLimitMs(activeRound) : 0
  const timeRatio =
    timed && activeRoundLimit > 0
      ? Math.max(0, 1 - (elapsedDeciseconds * 100) / activeRoundLimit)
      : 1

  return (
    <div
      className={progress.progressTrack}
      aria-hidden='true'
      style={{
        gridTemplateColumns: `repeat(${challenge.rounds.length}, 1fr)`,
      }}
    >
      {challenge.rounds.map((round, index) => {
        const status = progressSegmentStatus(state, index)
        return (
          <span
            key={round.id}
            className={progress.progressSegment}
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
