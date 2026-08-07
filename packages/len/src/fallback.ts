export type FallbackMode = 'throw' | 'zero' | 'null'

const constructorName = (target: object): string | undefined => {
  const { name } =
    (target as { constructor?: { name?: unknown } }).constructor ?? {}
  return typeof name === 'string' && name !== '' ? name : undefined
}

const describeTarget = (target: unknown): string => {
  if (target === null) return 'null'
  if (typeof target !== 'object') return typeof target
  return constructorName(target) ?? 'object'
}

const throwNotLenable = (target: unknown): never => {
  throw new TypeError(
    `invalid argument (${describeTarget(target)}) for built-in len`,
  )
}

export const FALLBACKS: Record<
  FallbackMode,
  (target: unknown) => number | null
> = {
  throw: throwNotLenable,
  zero: () => 0,
  null: () => null,
}
