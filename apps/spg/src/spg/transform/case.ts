import { low } from '../shall.ts'

export function transformCase(base: string): string {
  return [...base].map((char) => (low() ? char.toUpperCase() : char)).join('')
}
