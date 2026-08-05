import { noise, tone } from '../bazaar/sounds'

const BAR_NOTES = [523, 659, 784, 1046]

export const jukeSfx = {
  hover: () =>
    tone({ shape: 'sine', from: 1318, to: 1046, duration: 0.04, peak: 0.03 }),
  kaChunk: () => {
    noise({ duration: 0.05, peak: 0.14, frequency: 600 })
    tone({ shape: 'square', from: 196, duration: 0.07, peak: 0.06, at: 0.02 })
  },
  crackle: () =>
    noise({ duration: 0.3, peak: 0.03, filter: 'highpass', frequency: 3500 }),
  bar: () => {
    for (const [index, from] of BAR_NOTES.entries()) {
      tone({
        shape: 'square',
        from,
        duration: 0.14,
        peak: 0.045,
        at: index * 0.15,
      })
    }
    tone({ shape: 'triangle', from: 262, duration: 0.6, peak: 0.03 })
  },
}
