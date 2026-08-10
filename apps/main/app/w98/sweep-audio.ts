import { playFanfare } from 'services/audio/fanfare'
import { createSfxKit } from 'services/audio/kit'

export type SweepAudio = ReturnType<typeof createSweepAudio>

export const createSweepAudio = () => {
  const kit = createSfxKit({ attack: 0.004 })

  return {
    dispose: kit.dispose,
    setEnabled: kit.setEnabled,
    sweep() {
      kit.tone({
        from: 1500,
        to: 950,
        duration: 0.04,
        peak: 0.045,
        shape: 'square',
      })
    },
    flagOn() {
      kit.tone({
        from: 620,
        to: 1240,
        duration: 0.07,
        peak: 0.06,
        shape: 'triangle',
      })
    },
    flagOff() {
      kit.tone({
        from: 1240,
        to: 620,
        duration: 0.07,
        peak: 0.05,
        shape: 'triangle',
      })
    },
    // manual redeals only: resize redeals stay silent
    deal() {
      kit.burst({ frequency: 320, duration: 0.09, peak: 0.05, q: 1.2 })
    },
    boom() {
      kit.burst({ frequency: 140, duration: 0.55, peak: 0.28, q: 0.6 })
      kit.tone({ from: 170, to: 42, duration: 0.45, peak: 0.22, shape: 'sine' })
    },
    win() {
      const context = kit.ensure()
      if (context) playFanfare(context, { volume: 0.85 })
    },
  }
}
