export type Handler<T> = {
  readonly is: (value: unknown) => value is T
  readonly len: (value: T) => number
}

export type HandlerLike = {
  readonly is: (value: unknown) => value is unknown
  readonly len: (value: never) => number
}

export type ValidateHandlers<H extends readonly HandlerLike[]> = {
  readonly [K in keyof H]: H[K] extends {
    readonly is: (value: unknown) => value is infer T
  }
    ? { readonly is: H[K]['is']; readonly len: (value: T) => number }
    : never
}

export type Handled<H extends readonly HandlerLike[]> = {
  [K in keyof H]: H[K]['is'] extends (value: unknown) => value is infer T
    ? T
    : never
}[number]

export type ErasedHandler = {
  is(value: unknown): boolean
  len(value: unknown): number
}

export const defineHandler = <T>(
  is: (value: unknown) => value is T,
  len: (value: T) => number,
): Handler<T> => ({ is, len })

export const isString = (value: unknown): value is string =>
  typeof value === 'string'
