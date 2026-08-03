import type { Effect, Output } from './command-shell'
import { joinPath } from './console-path'

export type TreeOutput = { kind: 'tree'; segments: string[] }
export type ConsoleOutput = Output | TreeOutput
export type ConsoleResult = {
  output: ConsoleOutput[]
  cwd: string[]
  effect?: Effect
}
export type Entry = {
  id: number
  prompt?: string
  command?: string
  output: ConsoleOutput[]
}
export type Mode =
  | { kind: 'shell' }
  | { kind: 'gated' }
  | { kind: 'hacker'; typed: number }
  | { kind: 'anim'; frames: string[]; index: number }
export type State = {
  nextId: number
  cwd: string[]
  entries: Entry[]
  mode: Mode
}
export type Event =
  | { type: 'ran'; prompt: string; command: string; result: ConsoleResult }
  | { type: 'note'; output: ConsoleOutput[] }
  | { type: 'gate' }
  | { type: 'boot' }
  | { type: 'hacker-type' }
  | { type: 'hacker-exit' }
  | { type: 'anim-tick' }
  | { type: 'anim-stop' }

export const HACKER_CHUNK = 3

const SHELL: Mode = { kind: 'shell' }

const HACKER_EXIT_NOTE: ConsoleOutput = {
  kind: 'text',
  text: 'ACCESS GRANTED · trace wiped · welcome back to S-DOS',
  tone: 'bright',
}

export const promptFor = (cwd: string[]) => `S:${joinPath(cwd).toUpperCase()}>`

const append = (state: State, entry: Omit<Entry, 'id'>): State => ({
  ...state,
  nextId: state.nextId + 1,
  entries: [...state.entries, { ...entry, id: state.nextId }],
})

const modeAfter = (mode: Mode, effect?: Effect): Mode => {
  if (effect?.kind === 'hacker') return { kind: 'hacker', typed: 0 }
  if (effect?.kind === 'animate') {
    return { kind: 'anim', frames: effect.frames, index: 0 }
  }
  return mode
}

const ran = (state: State, event: Extract<Event, { type: 'ran' }>): State => {
  const appended = append(state, {
    prompt: event.prompt,
    command: event.command,
    output: event.result.output,
  })
  return {
    ...appended,
    cwd: event.result.cwd,
    mode: modeAfter(state.mode, event.result.effect),
    entries: event.result.effect?.kind === 'clear' ? [] : appended.entries,
  }
}

export const reduce = (state: State, event: Event): State => {
  const { mode } = state
  switch (event.type) {
    case 'ran':
      return ran(state, event)
    case 'note':
      return append(state, { output: event.output })
    case 'gate':
      return mode.kind === 'shell'
        ? { ...state, mode: { kind: 'gated' } }
        : state
    case 'boot':
      return mode.kind === 'gated' ? { ...state, mode: SHELL } : state
    case 'hacker-type':
      return mode.kind === 'hacker'
        ? {
            ...state,
            mode: { kind: 'hacker', typed: mode.typed + HACKER_CHUNK },
          }
        : state
    case 'hacker-exit':
      return mode.kind === 'hacker'
        ? { ...append(state, { output: [HACKER_EXIT_NOTE] }), mode: SHELL }
        : state
    case 'anim-tick':
      return mode.kind === 'anim'
        ? {
            ...state,
            mode: { ...mode, index: (mode.index + 1) % mode.frames.length },
          }
        : state
    case 'anim-stop':
      return mode.kind === 'anim' ? { ...state, mode: SHELL } : state
  }
}

export const initialState = (): State => ({
  nextId: 0,
  cwd: [],
  entries: [],
  mode: SHELL,
})
