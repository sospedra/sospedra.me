export const isObject = (candidate: unknown): candidate is object =>
  typeof candidate === 'object' && candidate !== null

export const detectNode = (): boolean =>
  typeof process !== 'undefined' &&
  Object.prototype.toString.call(process) === '[object process]'

export const attempt = (effect: () => void): void => {
  try {
    effect()
  } catch {
    return
  }
}

export const attemptGet = <T>(read: () => T): T | undefined => {
  try {
    return read()
  } catch {
    return undefined
  }
}

const noop = () => undefined

const CONSOLE_METHODS = [
  'assert',
  'clear',
  'count',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'table',
  'time',
  'timeEnd',
  'timeStamp',
  'trace',
  'warn',
] as const

type ConsoleHolder = { console?: Record<string, unknown> }

export const consoleFallback = (): void => {
  if (typeof window === 'undefined') return

  const holder = window as unknown as ConsoleHolder
  const target = holder.console ?? {}
  holder.console = target

  for (const method of CONSOLE_METHODS) {
    target[method] ??= noop
  }
}
