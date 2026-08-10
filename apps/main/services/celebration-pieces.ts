import { range } from 'es-toolkit'

export type ConfettiPiece = {
  id: string
  x: number
  peak: number
  fall: number
  spin: number
  delay: number
  duration: number
  width: number
  height: number
  tone: string
}

export const CELEBRATION_TONES = [
  '#d7653c',
  '#476f8f',
  '#62a996',
  '#e3b84a',
  '#bd4e3b',
  '#f3eedf',
] as const

/* Deterministic scatter: index-hashed values dodge Math.random so every
   render (and any hydration) agrees on the same burst. */
export const confettiPieces = (
  tones: readonly string[] = CELEBRATION_TONES,
): ConfettiPiece[] =>
  range(26).map((index) => ({
    id: `piece-${index + 1}`,
    x: (((index * 7) % 13) / 12 - 0.5) * 34,
    peak: -(3.4 + ((index * 53) % 40) / 10),
    fall: 17 + ((index * 29) % 9),
    spin: (index % 2 === 0 ? 1 : -1) * (420 + ((index * 47) % 360)),
    delay: (index * 83) % 340,
    duration: 1500 + ((index * 37) % 700),
    width: 0.3 + ((index * 11) % 4) * 0.05,
    height: 0.55 + ((index * 19) % 5) * 0.07,
    tone: tones[index % tones.length],
  }))
