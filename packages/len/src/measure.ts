export type Lenable =
  | string
  | readonly unknown[]
  | ArrayBufferView
  | ArrayBufferLike
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>

const utf8 = new TextEncoder()

const isAnyArrayBuffer = (target: unknown): target is ArrayBufferLike => {
  if (target instanceof ArrayBuffer) return true
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    target instanceof SharedArrayBuffer
  )
}

const viewLength = (view: ArrayBufferView): number => {
  if (view instanceof DataView) return view.byteLength
  const elements = (view as { length?: unknown }).length
  return typeof elements === 'number' ? elements : view.byteLength
}

export const measureBuiltin = (target: unknown): number | undefined => {
  if (typeof target === 'string') return utf8.encode(target).byteLength
  if (Array.isArray(target)) return target.length
  if (ArrayBuffer.isView(target)) return viewLength(target)
  if (isAnyArrayBuffer(target)) return target.byteLength
  if (target instanceof Map) return target.size
  if (target instanceof Set) return target.size
  return undefined
}
