import { clamp } from 'es-toolkit'
import { nonNegativeFinite } from './numeric'

export interface MonotonicClock {
  now: () => number
}

export type RoundTimerStatus = 'idle' | 'running' | 'paused' | 'frozen'

export interface RoundTimer {
  limitMs: number
  accruedMs: number
  startedAtMs: number | null
  deadlineMs: number | null
  status: RoundTimerStatus
}

export interface RoundTimerReading {
  elapsedMs: number
  remainingMs: number
  progress: number
  expired: boolean
}

const validNow = (now: number) => (Number.isFinite(now) ? now : 0)

export interface ManualClock extends MonotonicClock {
  advanceBy: (milliseconds: number) => number
  set: (milliseconds: number) => number
}

export const createManualClock = (initialNowMs = 0): ManualClock => {
  let nowMs = validNow(initialNowMs)

  return {
    now: () => nowMs,
    advanceBy: (milliseconds) => {
      nowMs += nonNegativeFinite(milliseconds)
      return nowMs
    },
    set: (milliseconds) => {
      nowMs = Math.max(nowMs, validNow(milliseconds))
      return nowMs
    },
  }
}

export const createRoundTimer = (
  roundLimitMs: number,
  initialElapsedMs = 0,
): RoundTimer => {
  const limitMs = nonNegativeFinite(roundLimitMs)

  return {
    limitMs,
    accruedMs: clamp(nonNegativeFinite(initialElapsedMs), 0, limitMs),
    startedAtMs: null,
    deadlineMs: null,
    status: 'idle',
  }
}

export const readRoundTimer = (
  timer: RoundTimer,
  now: number,
): RoundTimerReading => {
  const limitMs = nonNegativeFinite(timer.limitMs)
  const accruedMs = clamp(nonNegativeFinite(timer.accruedMs), 0, limitMs)
  const remainingMs =
    timer.status === 'running' && timer.deadlineMs !== null
      ? clamp(timer.deadlineMs - validNow(now), 0, limitMs)
      : Math.max(0, limitMs - accruedMs)
  const elapsedMs = limitMs - remainingMs

  return {
    elapsedMs,
    remainingMs,
    progress: limitMs > 0 ? elapsedMs / limitMs : 1,
    expired: remainingMs <= 0,
  }
}

export const startRoundTimer = (timer: RoundTimer, now: number): RoundTimer => {
  if (timer.status === 'running' || timer.status === 'frozen') return timer

  const timestamp = validNow(now)
  const reading = readRoundTimer(timer, timestamp)

  return {
    ...timer,
    accruedMs: reading.elapsedMs,
    startedAtMs: timestamp,
    deadlineMs: timestamp + reading.remainingMs,
    status: 'running',
  }
}

export const pauseRoundTimer = (timer: RoundTimer, now: number): RoundTimer => {
  if (timer.status !== 'running') return timer

  const reading = readRoundTimer(timer, now)
  return {
    ...timer,
    accruedMs: reading.elapsedMs,
    startedAtMs: null,
    deadlineMs: null,
    status: 'paused',
  }
}

export const resumeRoundTimer = startRoundTimer
