import { randomInt } from '../random-int.ts'
import { regular } from '../shall.ts'

const DEFAULT_SYMBOL = '.'
const SYMBOLS = [...`@#$%{}[]()/~,;:><${DEFAULT_SYMBOL}`]

const pickSymbol = (isEnabled: boolean) => {
  if (!isEnabled) return DEFAULT_SYMBOL
  return regular() ? SYMBOLS[randomInt(0, SYMBOLS.length - 1)] : ''
}

export function transformSymbols(isEnabled: boolean) {
  return (base: string): string =>
    base.replaceAll(' ', () => pickSymbol(isEnabled))
}
