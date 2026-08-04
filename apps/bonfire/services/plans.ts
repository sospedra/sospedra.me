import { toMilliseconds } from './time.ts'

export type PlanMode = 'long' | 'short'

export type Segment = {
  id: string
  type: 'work' | 'rest'
  time: number
}

export const PLANS: Record<PlanMode, Segment[]> = {
  long: [
    { id: 'work-1', type: 'work', time: toMilliseconds(20) },
    { id: 'rest-1', type: 'rest', time: toMilliseconds(5) },
    { id: 'work-2', type: 'work', time: toMilliseconds(25) },
    { id: 'rest-2', type: 'rest', time: toMilliseconds(10) },
    { id: 'work-3', type: 'work', time: toMilliseconds(25) },
    { id: 'rest-3', type: 'rest', time: toMilliseconds(5) },
    { id: 'work-4', type: 'work', time: toMilliseconds(15) },
  ],
  short: [
    { id: 'work-1', type: 'work', time: toMilliseconds(20) },
    { id: 'rest-1', type: 'rest', time: toMilliseconds(5) },
    { id: 'work-2', type: 'work', time: toMilliseconds(20) },
  ],
}
