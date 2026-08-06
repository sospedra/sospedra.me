import { createSfxKit, type SfxKit } from 'services/audio/kit'
import { soundPreference } from '../bazaar/sounds'

let kit: SfxKit | null = null

const active = (): SfxKit | null => {
  if (!soundPreference.isEnabled()) return null
  kit ??= createSfxKit()
  return kit
}

// stall-spec sleeve flip: a rising band-passed rasp closed by one soft click
const flip = (): void => {
  const sfx = active()
  if (!sfx) return
  sfx.sweep({ from: 900, to: 2200, q: 6, duration: 0.09, peak: 0.1 })
  sfx.tone({
    from: 1300,
    shape: 'square',
    at: 0.07,
    duration: 0.03,
    peak: 0.035,
  })
}

const pull = (): void => {
  const sfx = active()
  if (!sfx) return
  sfx.sweep({ from: 600, to: 2600, q: 3, duration: 0.2, peak: 0.09 })
  sfx.tone({
    from: 320,
    to: 480,
    shape: 'triangle',
    at: 0.14,
    duration: 0.1,
    peak: 0.06,
  })
}

const settle = (): void => {
  const sfx = active()
  if (!sfx) return
  sfx.sweep({ from: 2000, to: 700, q: 3, duration: 0.16, peak: 0.07 })
  sfx.tone({ from: 160, to: 70, at: 0.1, duration: 0.1, peak: 0.09 })
}

const zip = (): void => {
  const sfx = active()
  if (!sfx) return
  sfx.sweep({ from: 2600, to: 480, q: 4, duration: 0.32, peak: 0.1 })
  sfx.tone({ from: 220, to: 90, at: 0.3, duration: 0.09, peak: 0.09 })
}

export const walletSfx = { flip, pull, settle, zip }
