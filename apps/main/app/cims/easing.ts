import { clamp } from 'es-toolkit'

export const smoother = (t: number): number =>
  t * t * t * (t * (6 * t - 15) + 10)

export const sstep = (t: number): number => {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

export const wrapPI = (a: number): number =>
  ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI

export const padDigits = (n: number, width: number): string =>
  String(Math.round(n)).padStart(width, '0')

export const dampFactor = (dt: number, tau: number): number =>
  1 - Math.exp(-dt / tau)
