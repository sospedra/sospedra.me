import { weird } from '../shall.ts'

const LEET_DICT: Record<string, string> = {
  a: '4',
  b: '8',
  e: '3',
  g: '9',
  l: '1',
  o: '0',
  s: '5',
  t: '7',
  z: '2',
}

export function transformLeet(base: string): string {
  return [...base]
    .map((char) => {
      const leet = LEET_DICT[char.toLowerCase()]
      return leet && weird() ? leet : char
    })
    .join('')
}
