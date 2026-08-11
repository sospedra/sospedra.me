/**
 * The companion's phase machine: what to do with your eyes, minute by minute,
 * for one site's circumstances. Pure data in, pure data out, so the whole
 * evening is testable without a clock.
 */

import type { Circumstances } from './shadow-engine.ts'

export type GlassesState = 'on' | 'off'

export type CompanionPhase = {
  id: string
  name: string
  instruction: string
  glasses: GlassesState
  start: number
  end: number
}

const MINUTE = 60

const totalityPhases = (
  timeline: NonNullable<Circumstances['timeline']>,
  totality: NonNullable<Circumstances['totality']>,
): CompanionPhase[] => [
  {
    id: 'bite',
    name: 'The bite',
    instruction:
      'Glasses on. A black bite creeps across the orange cookie. Check your west-northwest horizon is still clear.',
    glasses: 'on',
    start: timeline.firstContact,
    end: totality.start - 30 * MINUTE,
  },
  {
    id: 'dimming',
    name: 'The dimming',
    instruction:
      'Shadows sharpen to knife edges and the light turns metallic. Cameras will not capture it. Keep the glasses on.',
    glasses: 'on',
    start: totality.start - 30 * MINUTE,
    end: totality.start - 10 * MINUTE,
  },
  {
    id: 'purkinje',
    name: 'The Purkinje window',
    instruction:
      'Red collapses to gray and green turns luminous. The temperature slides. Birds fly home. Glasses stay on.',
    glasses: 'on',
    start: totality.start - 10 * MINUTE,
    end: totality.start - 90,
  },
  {
    id: 'bands',
    name: 'Shadow bands',
    instruction:
      'Ripples race over white ground. Face west-northwest: the umbra arrives as a wall of dusk. Glasses on.',
    glasses: 'on',
    start: totality.start - 90,
    end: totality.start - 20,
  },
  {
    id: 'diamond',
    name: 'The diamond ring',
    instruction:
      'Baily’s beads fire through the last lunar valleys. Watch the final bead collapse. Glasses on until it breaks.',
    glasses: 'on',
    start: totality.start - 20,
    end: totality.start,
  },
  {
    id: 'totality',
    name: 'Totality',
    instruction:
      'Glasses OFF. Look up. The corona, the pink prominences, Venus, a sunset on every horizon. This is the whole trip.',
    glasses: 'off',
    start: totality.start,
    end: totality.end,
  },
  {
    id: 'second-diamond',
    name: 'The second diamond ring',
    instruction:
      'The first flash on the far edge means it is over. Glasses back ON before you look again.',
    glasses: 'on',
    start: totality.end,
    end: totality.end + 20,
  },
  {
    id: 'waning',
    name: 'The waning partial',
    instruction:
      'The show runs in reverse. Most people leave now. The roads are why you stay for the cookie to close.',
    glasses: 'on',
    start: totality.end + 20,
    end: timeline.lastContact,
  },
]

const partialPhases = (
  timeline: NonNullable<Circumstances['timeline']>,
): CompanionPhase[] => [
  {
    id: 'bite',
    name: 'The bite',
    instruction:
      'Glasses on, and they never come off here. A black bite creeps across the sun.',
    glasses: 'on',
    start: timeline.firstContact,
    end: timeline.maximum - 20 * MINUTE,
  },
  {
    id: 'deep',
    name: 'The deep partial',
    instruction:
      'Punch a hole in cardboard or raid the kitchen for a colander: the ground fills with crescent suns.',
    glasses: 'on',
    start: timeline.maximum - 20 * MINUTE,
    end: timeline.maximum,
  },
  {
    id: 'maximum',
    name: 'Past maximum',
    instruction:
      'That was the peak. The corona never showed, because outside the band it never does.',
    glasses: 'on',
    start: timeline.maximum,
    end: timeline.maximum + 20 * MINUTE,
  },
  {
    id: 'waning',
    name: 'The waning partial',
    instruction: 'The bite recedes. Glasses on to the last contact.',
    glasses: 'on',
    start: timeline.maximum + 20 * MINUTE,
    end: timeline.lastContact,
  },
]

export const phasesFor = (circumstances: Circumstances): CompanionPhase[] => {
  const { timeline, totality } = circumstances
  if (!timeline) return []
  if (totality) return totalityPhases(timeline, totality)
  return partialPhases(timeline)
}

export type CompanionMoment =
  | { kind: 'nowhere' }
  | { kind: 'before'; secondsToFirst: number; first: CompanionPhase }
  | {
      kind: 'during'
      phase: CompanionPhase
      secondsLeft: number
      next: CompanionPhase | null
    }
  | { kind: 'after' }

export const momentOf = (
  phases: CompanionPhase[],
  now: number,
): CompanionMoment => {
  const [first] = phases
  if (!first) return { kind: 'nowhere' }
  if (now < first.start) {
    return { kind: 'before', secondsToFirst: first.start - now, first }
  }
  const index = phases.findIndex(
    (phase) => now >= phase.start && now < phase.end,
  )
  if (index === -1) return { kind: 'after' }
  return {
    kind: 'during',
    phase: phases[index],
    secondsLeft: phases[index].end - now,
    next: phases[index + 1] ?? null,
  }
}

export const formatCountdown = (totalSeconds: number): string => {
  const whole = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(whole / 86_400)
  const hours = Math.floor((whole % 86_400) / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const seconds = whole % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  if (days > 0) return `${days} d ${pad(hours)} h ${pad(minutes)} m`
  if (hours > 0) return `${hours} h ${pad(minutes)} m ${pad(seconds)} s`
  return `${minutes} m ${pad(seconds)} s`
}
