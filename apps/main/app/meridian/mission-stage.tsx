import type { Dispatch, Ref } from 'react'
import { useMemo } from 'react'
import type { ExternalStore } from 'services/external-store'
import { TextAnswerConsole } from './answer-console'
import { FeedbackBar } from './answer-feedback'
import frame from './artifact-frame.module.css'
import { mergeCapitalAutocompleteOptions } from './city-options'
import { OFFICIAL_COUNTRY_OPTIONS } from './country-lexicon'
import type { currentQuestion, GeoGameAction, GeoGameState } from './game-state'
import { roundName } from './geo-format'
import GeoMap, { type GeoMapLabels } from './geo-map'
import type { GeoLocale, GeoMessages } from './geo-messages'
import { Countdown, RoundSummary, VisibilityPause } from './mission-overlays'
import css from './mission-stage.module.css'
import type { GeoCoordinate, LocalizedOption, Question, Round } from './model'
import { roundTimeLimitMs } from './model'
import artwork from './prompt-artifact.module.css'
import { RoundTelemetry } from './round-telemetry'

export function PromptArtifact({
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
      <div className={artwork.promptOrbit}>
        <img
          className={artwork.shapeAsset}
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
      <div className={artwork.flagStage}>
        <img
          className={artwork.flagAsset}
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

export const getGeoMapLabels = (copy: GeoMessages): GeoMapLabels => ({
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
})

const optionsForRoundType = (
  rounds: GeoGameState['challenge']['rounds'],
  type: Question['type'],
) =>
  rounds
    .filter((round) => round.type === type)
    .flatMap((round) =>
      round.questions.flatMap((candidate) =>
        candidate.type === 'map' ? [] : candidate.options,
      ),
    )

const autocompleteOptionsFor = (
  question: Question | null,
  cityOptions: GeoGameState['challenge']['cityOptions'],
  rounds: GeoGameState['challenge']['rounds'],
) => {
  if (!question || question.type === 'map') return []
  const roundOptions = optionsForRoundType(rounds, question.type)
  if (question.type === 'capital') {
    return mergeCapitalAutocompleteOptions(cityOptions, roundOptions)
  }

  const optionsById = new Map(
    OFFICIAL_COUNTRY_OPTIONS.map((option) => [option.id, option]),
  )
  for (const option of roundOptions) optionsById.set(option.id, option)
  return [...optionsById.values()]
}

const mapFeedbackFor = (lastAnswer: GeoGameState['lastAnswer']) => {
  const mapAnswer = lastAnswer?.kind === 'map-pin' ? lastAnswer : null
  if (mapAnswer?.distanceKm == null) return undefined
  return {
    answerCoordinate: mapAnswer.answerCoordinate,
    distanceKm: mapAnswer.distanceKm,
  }
}

export function MissionStage({
  copy,
  countdown,
  dispatch,
  locale,
  onKeystroke,
  options,
  passQuestion,
  practiceTimed,
  question,
  questionAttemptKey,
  questionHeadingRef,
  round,
  roundClock,
  selectedCoordinate,
  setMarker,
  state,
  submitMap,
  submitTextAnswer,
}: {
  copy: GeoMessages
  countdown: number
  dispatch: Dispatch<GeoGameAction>
  locale: GeoLocale
  onKeystroke: () => void
  options: LocalizedOption[]
  passQuestion: () => void
  practiceTimed: boolean
  question: Question | null
  questionAttemptKey: string
  questionHeadingRef: Ref<HTMLHeadingElement>
  round: Round | null
  roundClock: ExternalStore<number>
  selectedCoordinate: GeoCoordinate | null
  setMarker: (marker: { attemptKey: string; coordinate: GeoCoordinate }) => void
  state: GeoGameState
  submitMap: (coordinate: GeoCoordinate) => void
  submitTextAnswer: (answer: {
    optionId: string | null
    submittedText: string
  }) => void
}) {
  const autocompleteOptions = useMemo(
    () =>
      autocompleteOptionsFor(
        question,
        state.challenge.cityOptions,
        state.challenge.rounds,
      ),
    [question, state.challenge.cityOptions, state.challenge.rounds],
  )

  const answerPlaceholder =
    question?.type === 'capital' ? copy.typeCapital : copy.typeCountry

  const mapLabels = getGeoMapLabels(copy)

  const mapFeedback = mapFeedbackFor(state.lastAnswer)

  return (
    <div className={css.missionGrid} data-direct-map={question?.type === 'map'}>
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
                roundClock={roundClock}
                roundLimitMs={roundTimeLimitMs(round)}
                state={state}
              />
            </header>
            <div className={frame.artifactFrame} data-type={question.type}>
              <span className={frame.artifactReadout}>
                <span>LIVE {' // '} ITEM</span>
                <span>{String(state.questionIndex + 1).padStart(2, '0')}</span>
              </span>
              {question.type === 'capital' ? (
                <div className={frame.capitalArtifact}>
                  <span aria-hidden='true'>CAP {' // '} TX</span>
                  <h2
                    id='geo-question-title'
                    ref={questionHeadingRef}
                    className={frame.capitalPrompt}
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
          onKeystroke={onKeystroke}
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
  )
}
