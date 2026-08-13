import type { ReactNode } from 'react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useGameInput } from 'services/hotkeys'
import { FEEDBACK_ATTRS, feedbackResult } from './answer-feedback'
import { Completion } from './completion-report'
import { GameDialogs } from './game-dialogs'
import { currentQuestion, currentRound, type GeoGameState } from './game-state'
import css from './geo-game.module.css'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import { DailyBriefing, PracticeBriefing } from './mission-briefing'
import { AppHeader, ProgressTrack } from './mission-header'
import { MissionStage } from './mission-stage'
import type { GeoCoordinate, GeoSettings, Round } from './model'
import { geoGameReducer } from './reducer'
import { useRunControls } from './run-controls'
import { useMissionCues } from './run-cues'
import type { GeoGameMode, PracticeRound } from './run-mode'
import { useRunStorage } from './run-storage'
import { useCountdown, usePhaseTimers, useRoundClock } from './run-timers'

const TIMED_PHASES = new Set<GeoGameState['phase']>([
  'question',
  'feedback',
  'countdown',
])

// Wrong answers keep the shared round clock ticking through feedback: the
// correction-reading time IS the error penalty. Correct feedback is free.
const roundClockShouldRun = (state: GeoGameState): boolean =>
  state.phase === 'question' ||
  (state.phase === 'feedback' && state.lastAnswer?.correct === false)

const feedbackAttrFor = (state: GeoGameState) =>
  state.phase === 'feedback' && state.lastAnswer
    ? FEEDBACK_ATTRS[feedbackResult(state.lastAnswer)]
    : undefined

const roundAttrFor = (state: GeoGameState, round: Round | null) => {
  if (state.phase === 'idle' || state.phase === 'completed') return 'idle'
  return round?.type ?? 'idle'
}

export function GeoSession({
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
  settings,
}: {
  copy: GeoMessages
  displayRounds: Round[]
  initialState: GeoGameState
  locale: GeoLocale
  mode: GeoGameMode
  onLocaleChange: (locale: GeoLocale) => void
  onModeChange: (mode: GeoGameMode) => void
  onNewPracticeGame: () => void
  onPracticeRoundChange: (round: PracticeRound) => void
  onPracticeTimedChange: (timed: boolean) => void
  onSettingsChange: (settings: GeoSettings) => void
  practiceRound: PracticeRound
  practiceTimed: boolean
  settings: GeoSettings
}) {
  const [state, dispatch] = useReducer(geoGameReducer, initialState)

  const [marker, setMarker] = useState<{
    attemptKey: string
    coordinate: GeoCoordinate
  } | null>(null)

  const stateRef = useRef(state)

  const gameRef = useRef<HTMLDivElement>(null)

  const questionHeadingRef = useRef<HTMLHeadingElement>(null)

  const question = currentQuestion(state)
  const round = currentRound(state)

  const questionId = question?.id ?? ''
  const questionAttemptKey = `${state.roundIndex}:${state.questionIndex}:${questionId}`
  const selectedCoordinate =
    marker?.attemptKey === questionAttemptKey ? marker.coordinate : null

  const options = useMemo(
    () => (question && question.type !== 'map' ? question.options : []),
    [question],
  )

  const roundClockRunning = roundClockShouldRun(state)

  useGameInput()

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const { questionElapsedRef, roundClock } = useRoundClock({
    dispatch,
    gameRef,
    initialRoundElapsedMs: initialState.roundElapsedMs,
    practiceTimed,
    round,
    roundClockRunning,
    state,
  })
  const countdown = useCountdown({ dispatch, state })
  usePhaseTimers({ dispatch, roundClock, state })

  useEffect(() => {
    if (state.phase !== 'question' || question?.type !== 'map') return
    window.requestAnimationFrame(() => questionHeadingRef.current?.focus())
  }, [question?.type, state.phase])

  const { announce, announcement, audio, celebrating } = useMissionCues({
    copy,
    locale,
    options,
    practiceTimed,
    round,
    settings,
    state,
  })
  const { stats } = useRunStorage({
    dispatch,
    questionElapsedRef,
    roundClock,
    state,
    stateRef,
  })
  const {
    helpButtonRef,
    openerRef,
    openOverlay,
    passQuestion,
    start,
    toggleSound,
  } = useRunControls({
    announce,
    audio,
    copy,
    dispatch,
    onSettingsChange,
    questionElapsedRef,
    roundClock,
    settings,
    stateRef,
  })

  const submitChoice = (optionId: string) => {
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
      roundElapsedMs: roundClock.get(),
      answeredAt: new Date().toISOString(),
    })
  }

  const submitMap = (coordinate: GeoCoordinate) => {
    dispatch({
      type: 'SUBMIT_MAP',
      coordinate,
      elapsedMs: questionElapsedRef.current,
      roundElapsedMs: roundClock.get(),
      answeredAt: new Date().toISOString(),
    })
  }

  const timedState = TIMED_PHASES.has(state.phase)
  const feedbackAttr = feedbackAttrFor(state)
  const roundAttr = roundAttrFor(state, round)

  const stage =
    state.phase === 'idle' || state.phase === 'completed'
      ? state.phase
      : 'mission'
  const stageViews: Record<typeof stage, ReactNode> = {
    idle:
      mode === 'practice' ? (
        <PracticeBriefing
          challenge={state.challenge}
          copy={copy}
          displayRounds={displayRounds}
          locale={locale}
          onPracticeRoundChange={onPracticeRoundChange}
          onPracticeTimedChange={onPracticeTimedChange}
          onStart={start}
          practiceRound={practiceRound}
          practiceTimed={practiceTimed}
        />
      ) : (
        <DailyBriefing
          challenge={state.challenge}
          copy={copy}
          displayRounds={displayRounds}
          locale={locale}
          onStart={start}
        />
      ),

    completed: (
      <Completion
        announce={announce}
        celebrate={celebrating}
        copy={copy}
        locale={locale}
        onNewPracticeGame={onNewPracticeGame}
        state={state}
        stats={stats}
      />
    ),
    mission: (
      <MissionStage
        copy={copy}
        countdown={countdown}
        dispatch={dispatch}
        locale={locale}
        onKeystroke={() => audio.play('key')}
        options={options}
        passQuestion={passQuestion}
        practiceTimed={practiceTimed}
        question={question}
        questionAttemptKey={questionAttemptKey}
        questionHeadingRef={questionHeadingRef}
        round={round}
        roundClock={roundClock}
        selectedCoordinate={selectedCoordinate}
        setMarker={setMarker}
        state={state}
        submitChoice={submitChoice}
        submitMap={submitMap}
      />
    ),
  }

  return (
    <div
      ref={gameRef}
      className={css.game}
      lang={locale}
      data-reduced-motion={settings.reducedMotion}
      data-phase={state.phase}
      data-feedback={feedbackAttr}
      data-round={roundAttr}
    >
      <span className={shell.grain} aria-hidden='true' />
      <AppHeader
        challenge={state.challenge}
        copy={copy}
        helpButtonRef={helpButtonRef}
        locale={locale}
        mode={mode}
        onLocaleChange={onLocaleChange}
        onModeChange={onModeChange}
        onSoundToggle={toggleSound}
        soundEnabled={settings.sound}
        timedState={timedState}
        openSettings={(button) => openOverlay('settings', button)}
        openHelp={(button) => openOverlay('help', button)}
      />
      <ProgressTrack
        challenge={state.challenge}
        roundClock={roundClock}
        state={state}
        timed={practiceTimed}
      />

      <div className={shell.viewport}>{stageViews[stage]}</div>

      <GameDialogs
        copy={copy}
        locale={locale}
        mode={mode}
        onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        onLocaleChange={onLocaleChange}
        onModeChange={onModeChange}
        onSettingsChange={onSettingsChange}
        opener={openerRef}
        settings={settings}
        state={state}
        timedState={timedState}
      />
      <p className={shell.liveRegion} aria-live='polite' aria-atomic='true'>
        {announcement}
      </p>
    </div>
  )
}
