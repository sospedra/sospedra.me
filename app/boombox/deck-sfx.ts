'use client'

import { createSfxKit, type SfxBed } from 'service/audio/kit'

/* synthesized tape-deck foley; no recorded samples yet */

export type DeckSfx = ReturnType<typeof createDeckSfx>

export const createDeckSfx = () => {
  const kit = createSfxKit()
  let motor: SfxBed | null = null

  const snap = (frequency: number, duration: number, peak: number, at = 0) =>
    kit.burst({ frequency, q: 1.4, duration, peak, at })

  return {
    /* mechanical key latch: noise snap + case resonance */
    click: () => {
      snap(2600 + Math.random() * 600, 0.06, 0.14)
      kit.tone({ from: 190, to: 70, duration: 0.09, peak: 0.1 })
    },
    /* stop key: heavier, lower, slower */
    clunk: () => {
      snap(1100, 0.09, 0.12)
      kit.tone({ from: 120, to: 42, duration: 0.22, peak: 0.22 })
    },
    /* cassette settling into the bay */
    insert: () => {
      snap(1900, 0.05, 0.08)
      snap(1300, 0.07, 0.12, 0.09)
      kit.tone({ from: 150, to: 55, duration: 0.28, peak: 0.2, at: 0.15 })
    },
    /* fast-forward zip for a skipped attempt */
    zip: () => {
      kit.sweep({
        from: 700,
        to: 3400,
        ramp: 0.26,
        q: 6,
        duration: 0.28,
        peak: 0.16,
      })
    },
    /* transport hiss + head rumble while the tape rolls */
    motorOn: () => {
      motor ??= kit.bed({
        filter: 'lowpass',
        frequency: 380,
        level: 0.022,
        fadeIn: 0.15,
      })
    },
    motorOff: () => {
      motor?.stop()
      motor = null
    },
  }
}
