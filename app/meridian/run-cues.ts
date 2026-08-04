import { sumBy } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  correctOptionFor,
  FEEDBACK_SOUNDS,
  feedbackHeadline,
  feedbackResult,
} from './answer-feedback'
import type { GeoGameState } from './game-state'
import { createGeoAudio } from './geo-audio'
import { formatScore } from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import type { GeoSettings, LocalizedOption, Round } from './model'
import { roundTimeLimitMs } from './model'

export const useMissionCues = ({
  copy,
  locale,
  options,
  practiceTimed,
  round,
  settings,
  state,
}: {
  copy: GeoMessages
  locale: GeoLocale
  options: LocalizedOption[]
  practiceTimed: boolean
  round: Round | null
  settings: GeoSettings
  state: GeoGameState
}) => {
  const [announcement, setAnnouncement] = useState('')

  const [audio] = useState(createGeoAudio)

  const announcementNonceRef = useRef(false)

  const playedFeedbackRef = useRef(
    new Set(
      state.phase === 'feedback' && state.lastAnswer
        ? [state.lastAnswer.answeredAt]
        : [],
    ),
  )

  const playedTimeoutRoundsRef = useRef(
    new Set(state.phase === 'round-summary' ? [state.roundIndex] : []),
  )

  const announce = useCallback((message: string) => {
    announcementNonceRef.current = !announcementNonceRef.current
    setAnnouncement(`${message}${announcementNonceRef.current ? '\u200B' : ''}`)
  }, [])

  useEffect(() => () => audio.dispose(), [audio])

  useEffect(() => {
    audio.setEnabled(settings.sound)
  }, [audio, settings.sound])

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
    audio.play(FEEDBACK_SOUNDS[feedbackResult(answer)])
  }, [announce, audio, copy, locale, options, state.lastAnswer, state.phase])

  useEffect(() => {
    if (state.phase !== 'round-summary' || !round) return
    const roundAnswers = state.answers.filter(
      (answer) => answer.roundId === round.id,
    )
    const score = sumBy(roundAnswers, (answer) => answer.score)
    const correct = roundAnswers.filter((answer) => answer.correct).length
    announce(
      `${copy.roundComplete}. ${copy.roundScore}: ${formatScore(score, locale)}. ${copy.roundAccuracy}: ${correct}/${roundAnswers.length}.`,
    )
  }, [
    announce,
    copy.roundAccuracy,
    copy.roundComplete,
    copy.roundScore,
    locale,
    round,
    state.answers,
    state.phase,
  ])

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
    if (state.phase !== 'visibility-paused') return
    announce(copy.visibilityPaused)
  }, [announce, copy.visibilityPaused, state.phase])

  return { announce, announcement, audio }
}
