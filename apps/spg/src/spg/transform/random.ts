import { randomInt } from '../random-int.ts'
import { common } from '../shall.ts'

const ASCII_LOWER = 37
const ASCII_HIGHER = 126

const randomChar = () => {
  if (common()) return ''
  return String.fromCharCode(randomInt(ASCII_LOWER, ASCII_HIGHER))
}

export function transformRandom(base: string): string {
  return base
    .split(' ')
    .map((word) => `${randomChar()}${word}${randomChar()}`)
    .join(' ')
}
