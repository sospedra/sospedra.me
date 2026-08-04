import {
  DEFAULT_LEVEL,
  LEVELS,
  type LevelName,
  LOG_METHOD_NAMES,
  type LogMethodName,
  STYLE_NAMES,
  type StyleName,
} from './constants.ts'
import {
  levelNameOf,
  parseLevel,
  persistLevel,
  readPersistedLevel,
} from './levels.ts'
import {
  buildBrowserOutput,
  buildNodeOutput,
  type Chunk,
  castMessage,
} from './logs.ts'
import { consoleFallback, detectNode } from './utils.ts'

type LogMethod = (...args: unknown[]) => void

type StyleChain = { readonly [K in StyleName]: Logatim }

export type Logatim = StyleChain & {
  (message?: unknown): Logatim
  getLevel(): LevelName
  setLevel(level: string | number): void
  setEnv(env: 'node' | 'browser'): void
  raw(message?: unknown): string | string[]
  trace: LogMethod
  debug: LogMethod
  info: LogMethod
  warn: LogMethod
  error: LogMethod
}

export const createLogatim = (): Logatim => {
  const state = {
    level: DEFAULT_LEVEL,
    isNode: detectNode(),
    chunks: [] as Chunk[],
  }

  if (!state.isNode) consoleFallback()

  const resetChunks = () => {
    state.chunks = []
  }

  const noop = (): void => {
    resetChunks()
  }

  const takeOutput = (message: string): string | string[] => {
    const output = state.isNode
      ? buildNodeOutput(state.chunks, message)
      : buildBrowserOutput(state.chunks, message)

    resetChunks()
    return output
  }

  const consoleMethodOf = (method: LogMethodName): LogMethodName =>
    state.isNode && method === 'debug' ? 'info' : method

  const emit = (method: LogMethodName, output: string | string[]): void => {
    if (typeof output === 'string') {
      console[method](output)
      return
    }

    console[method](...output)
  }

  const createLogMethod =
    (method: LogMethodName): LogMethod =>
    (...args: unknown[]) => {
      emit(consoleMethodOf(method), takeOutput(castMessage(args)))
    }

  const addMessageChunk = (message: unknown): void => {
    if (!message) return

    const val = typeof message === 'function' ? message() : message
    state.chunks.push({ key: 'str', val })
  }

  const refreshLogMethods = (speaker: Logatim): void => {
    for (const method of LOG_METHOD_NAMES) {
      const active = LEVELS[method.toUpperCase() as LevelName] >= state.level
      speaker[method] = active ? createLogMethod(method) : noop
    }
  }

  const makeSpeaker = (): Logatim => {
    const call = (message?: unknown): Logatim => {
      addMessageChunk(message)
      return makeSpeaker()
    }

    const speaker = call as Logatim

    speaker.getLevel = () => levelNameOf(state.level)
    speaker.setLevel = (level) => {
      state.level = parseLevel(level)
      persistLevel(state.level, state.isNode)
      refreshLogMethods(speaker)
    }
    speaker.setEnv = (env) => {
      state.isNode = env === 'node'
      refreshLogMethods(speaker)
    }
    speaker.raw = (message) => takeOutput(castMessage([message || '']))

    for (const styleName of STYLE_NAMES) {
      Object.defineProperty(speaker, styleName, {
        get: () => {
          state.chunks.push({ key: 'style', val: styleName })
          return makeSpeaker()
        },
      })
    }

    speaker.setLevel(
      state.isNode ? state.level : readPersistedLevel(state.level),
    )

    return speaker
  }

  return makeSpeaker()
}
