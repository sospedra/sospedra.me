import { FALLBACKS, type FallbackMode } from './fallback.ts'
import type {
  ErasedHandler,
  Handled,
  HandlerLike,
  ValidateHandlers,
} from './handler.ts'
import { type Lenable, measureBuiltin } from './measure.ts'

type Config = {
  readonly fallback?: FallbackMode
  readonly handlers?: readonly HandlerLike[]
}

const assertDistinctPredicates = (handlers: readonly HandlerLike[]): void => {
  const seen = new Map<HandlerLike['is'], number>()
  for (const [index, handler] of handlers.entries()) {
    const first = seen.get(handler.is)
    if (first !== undefined) {
      throw new TypeError(
        `handlers ${first} and ${index} share one is predicate`,
      )
    }
    seen.set(handler.is, index)
  }
}

export function createLen<
  const H extends readonly HandlerLike[] = [],
>(config?: {
  readonly fallback?: 'throw'
  readonly handlers?: H & ValidateHandlers<H>
}): (target: Lenable | Handled<H>) => number
export function createLen<const H extends readonly HandlerLike[] = []>(config: {
  readonly fallback: 'zero'
  readonly handlers?: H & ValidateHandlers<H>
}): (target: unknown) => number
export function createLen<const H extends readonly HandlerLike[] = []>(config: {
  readonly fallback: 'null'
  readonly handlers?: H & ValidateHandlers<H>
}): (target: unknown) => number | null
export function createLen(
  config: Config = {},
): (target: unknown) => number | null {
  const { fallback = 'throw', handlers = [] } = config
  const measureFallback: ((target: unknown) => number | null) | undefined =
    FALLBACKS[fallback]
  if (measureFallback === undefined) {
    throw new TypeError(`invalid fallback mode (${String(fallback)})`)
  }
  assertDistinctPredicates(handlers)
  const custom = handlers as readonly ErasedHandler[]
  return (target) => {
    const handler = custom.find((candidate) => candidate.is(target))
    if (handler) return handler.len(target)
    return measureBuiltin(target) ?? measureFallback(target)
  }
}
