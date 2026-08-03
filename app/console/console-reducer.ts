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
export type State = { seq: number; cwd: string[]; entries: Entry[] }
export type Event =
  | { type: 'ran'; prompt: string; command: string; result: ConsoleResult }
  | { type: 'note'; output: ConsoleOutput[] }
  | { type: 'clear' }

export const promptFor = (cwd: string[]) => `S:${joinPath(cwd).toUpperCase()}>`

const append = (state: State, entry: Omit<Entry, 'id'>): State => ({
  ...state,
  seq: state.seq + 1,
  entries: [...state.entries, { ...entry, id: state.seq }],
})

export const reduce = (state: State, event: Event): State => {
  switch (event.type) {
    case 'ran':
      return {
        ...append(state, {
          prompt: event.prompt,
          command: event.command,
          output: event.result.output,
        }),
        cwd: event.result.cwd,
      }
    case 'note':
      return append(state, { output: event.output })
    case 'clear':
      return { ...state, entries: [] }
  }
}

export const initialState = (): State => ({ seq: 0, cwd: [], entries: [] })
