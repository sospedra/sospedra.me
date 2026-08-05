const PREFIX_LEN = 8
const SUFFIX_LEN = 4
const ELLIPSIS = '…'

export function shortHash(hexValue: string): string {
  if (hexValue.length <= PREFIX_LEN + SUFFIX_LEN) return hexValue
  const prefix = hexValue.slice(0, PREFIX_LEN)
  const suffix = hexValue.slice(-SUFFIX_LEN)
  return `${prefix}${ELLIPSIS}${suffix}`
}

export function ms(value: number): string {
  return `${value.toFixed(1)} ms`
}
