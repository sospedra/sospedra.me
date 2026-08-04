import { randomInt } from './random-int.ts'

const MAX = 100

const shall = (ratio: number) => randomInt(0, MAX - 1) < ratio

export const weird = () => shall(10)
export const low = () => shall(25)
export const regular = () => shall(50)
export const common = () => shall(90)
