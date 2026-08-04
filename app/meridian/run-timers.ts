import { clamp } from 'es-toolkit'
import type { Dispatch, RefObject } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  createExternalStore,
  type ExternalStore,
} from 'services/external-store'
import type { GeoGameAction, GeoGameState } from './game-state'
import type { Round } from './model'
import { roundTimeLimitMs } from './model'
import { DEFAULT_GEO_CHALLENGE_RULES } from './scoring'

const START_COUNTDOWN_SECONDS = 3
const START_COUNTDOWN_MS = START_COUNTDOWN_SECONDS * 1000
const RESUME_COUNTDOWN_MS = 1000

export const useRoundClock = ({
  dispatch,
  gameRef,
  initialRoundElapsedMs,
  practiceTimed,
  round,
  roundClockRunning,
  state,
}: {
  dispatch: Dispatch<GeoGameAction>
  gameRef: RefObject<HTMLDivElement | null>
  initialRoundElapsedMs: number
  practiceTimed: boolean
  round: Round | null
  roundClockRunning: boolean
  state: GeoGameState
}) => {
  const [roundClock] = useState(() =>
    createExternalStore(initialRoundElapsedMs),
  )
  const questionElapsedRef = useRef(state.questionElapsedMs)

  const applyRoundClock = useCallback(
    (elapsedMs: number, limitMs: number) => {
      roundClock.set(elapsedMs)
      const ratio =
        limitMs > 0 ? Math.max(0, (limitMs - elapsedMs) / limitMs) : 0
      gameRef.current?.style.setProperty('--timer-ratio', String(ratio))
    },
    [roundClock],
  )

  useEffect(() => {
    if (state.phase !== 'question' || !round) return
    const baseElapsed = state.questionElapsedMs
    const startedAt = performance.now()
    let frame = 0
    questionElapsedRef.current = baseElapsed

    const update = (now: number) => {
      const cappedElapsed = clamp(
        baseElapsed + now - startedAt,
        0,
        round.questionLimitMs,
      )
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
    applyRoundClock(baseElapsed, limitMs)

    const update = (now: number) => {
      const cappedElapsed = clamp(baseElapsed + now - startedAt, 0, limitMs)
      applyRoundClock(cappedElapsed, limitMs)

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
  }, [
    applyRoundClock,
    practiceTimed,
    round,
    roundClockRunning,
    state.roundElapsedMs,
  ])

  useLayoutEffect(() => {
    if (roundClockRunning) return
    applyRoundClock(state.roundElapsedMs, round ? roundTimeLimitMs(round) : 0)
  }, [applyRoundClock, round, roundClockRunning, state.roundElapsedMs])

  return { questionElapsedRef, roundClock }
}

export const useCountdown = ({
  dispatch,
  state,
}: {
  dispatch: Dispatch<GeoGameAction>
  state: GeoGameState
}) => {
  const [countdown, setCountdown] = useState(START_COUNTDOWN_SECONDS)

  useEffect(() => {
    if (state.phase !== 'countdown') return
    const duration =
      state.countdownReason === 'resume'
        ? RESUME_COUNTDOWN_MS
        : START_COUNTDOWN_MS
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

  return countdown
}

export const usePhaseTimers = ({
  dispatch,
  roundClock,
  state,
}: {
  dispatch: Dispatch<GeoGameAction>
  roundClock: ExternalStore<number>
  state: GeoGameState
}) => {
  useEffect(() => {
    if (state.phase !== 'feedback') return
    const rules = state.challenge.rules
    const answer = state.lastAnswer
    // Map answers carry the reveal (true pin, distance) and always hold long.
    const holdsShort = answer?.correct && answer.kind !== 'map-pin'
    const duration = holdsShort
      ? (rules?.feedbackMs ?? DEFAULT_GEO_CHALLENGE_RULES.feedbackMs)
      : (rules?.wrongFeedbackMs ?? DEFAULT_GEO_CHALLENGE_RULES.wrongFeedbackMs)
    const timeout = window.setTimeout(() => {
      dispatch({
        type: 'FEEDBACK_FINISHED',
        completedAt: new Date().toISOString(),
        roundElapsedMs: roundClock.get(),
      })
    }, duration)
    return () => window.clearTimeout(timeout)
  }, [roundClock, state.challenge.rules, state.lastAnswer, state.phase])

  useEffect(() => {
    // Untimed practice holds the summary for the Continue button (WCAG 2.2.1).
    if (state.phase !== 'round-summary' || !state.timed) return
    const duration =
      state.challenge.rules?.roundSummaryMs ??
      DEFAULT_GEO_CHALLENGE_RULES.roundSummaryMs
    const timeout = window.setTimeout(() => {
      dispatch({ type: 'ROUND_SUMMARY_FINISHED' })
    }, duration)
    return () => window.clearTimeout(timeout)
  }, [state.challenge.rules?.roundSummaryMs, state.phase, state.timed])
}
