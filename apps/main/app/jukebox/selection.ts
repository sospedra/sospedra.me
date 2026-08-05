import { type JukeRecord, RECORDS } from './records.ts'

export type SelectionState =
  | { phase: 'idle' }
  | { phase: 'armed'; letter: string }
  | { phase: 'playing'; record: JukeRecord }

export type SelectionEvent =
  | { type: 'LETTER'; letter: string }
  | { type: 'NUMBER'; digit: number }
  | { type: 'PICK'; record: JukeRecord }
  | { type: 'CANCEL' }
  | { type: 'RESET' }

export const keyToEvent = (key: string): SelectionEvent | null => {
  if (key === 'Escape') return { type: 'CANCEL' }
  const letter = key.toUpperCase()
  if (letter === 'A' || letter === 'B') return { type: 'LETTER', letter }
  const digit = Number.parseInt(key, 10)
  if (digit >= 1 && digit <= 6) return { type: 'NUMBER', digit }
  return null
}

const COLUMN = 6

export const recordAt = (letter: string, digit: number): JukeRecord | null => {
  if (digit < 1 || digit > COLUMN) return null
  const index = (letter.charCodeAt(0) - 65) * COLUMN + digit - 1
  return RECORDS[index] ?? null
}

const play = (record: JukeRecord | null): SelectionState => {
  if (record?.status !== 'pressed') return { phase: 'idle' }
  return { phase: 'playing', record }
}

export const reduce = (
  state: SelectionState,
  event: SelectionEvent,
): SelectionState => {
  switch (event.type) {
    case 'LETTER':
      return state.phase === 'playing'
        ? state
        : { phase: 'armed', letter: event.letter }
    case 'NUMBER':
      return state.phase === 'armed'
        ? play(recordAt(state.letter, event.digit))
        : state
    case 'PICK':
      return state.phase === 'playing' ? state : play(event.record)
    case 'CANCEL':
      return state.phase === 'playing' ? state : { phase: 'idle' }
    case 'RESET':
      return { phase: 'idle' }
  }
}
