'use client'

import { createSfxKit } from 'services/audio/kit'

export type MenuSfx = ReturnType<typeof createMenuSfx>

export const createMenuSfx = () => {
  const kit = createSfxKit({ attack: 0.006 })

  const breath = (spec: {
    from: number
    to: number
    duration: number
    peak: number
    attack?: number
  }) => kit.sweep({ ...spec, q: 2.2 })

  return {
    dispose: kit.dispose,
    tick: () => {
      kit.tone({ from: 1244, to: 932, duration: 0.07, peak: 0.055 })
      kit.tone({ from: 2489, duration: 0.045, peak: 0.028 })
    },
    confirm: () => {
      breath({ from: 900, to: 4200, duration: 0.22, peak: 0.04 })
      kit.tone({ from: 622, to: 1245, duration: 0.16, peak: 0.075 })
      kit.tone({ from: 1867, duration: 0.34, peak: 0.05, attack: 0.03 })
    },
    cancel: () => {
      kit.tone({
        from: 932,
        to: 415,
        duration: 0.18,
        peak: 0.07,
        shape: 'triangle',
      })
      kit.tone({ from: 466, duration: 0.12, peak: 0.045 })
    },
    // reveal fires from a load timer, not a gesture: play only when a prior
    // gesture already unlocked audio
    reveal: () => {
      if (!navigator.userActivation?.hasBeenActive) return
      if (kit.ensure()?.state !== 'running') return
      breath({
        from: 480,
        to: 2600,
        duration: 0.55,
        peak: 0.038,
        attack: 0.12,
      })
      kit.tone({ from: 1568, duration: 0.7, peak: 0.03, attack: 0.09 })
      kit.tone({ from: 784, duration: 0.55, peak: 0.024, attack: 0.12 })
    },
  }
}
