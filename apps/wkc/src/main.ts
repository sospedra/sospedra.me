import { mountKeyboard } from './keyboard.ts'
import {
  captionFor,
  glyphFit,
  type KeyPress,
  noteFor,
  waveFor,
} from './signal.ts'
import { createSynth } from './synth.ts'
import { mountWave, type WaveHandle } from './wave.ts'

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

const $code = query<HTMLInputElement>('#js-code')
const $key = query<HTMLInputElement>('#js-key')
const $which = query<HTMLInputElement>('#js-which')
const $tune = query<HTMLElement>('#js-tune')
const $toast = query<HTMLElement>('#js-toast')

const tryMountWave = (): WaveHandle | null => {
  try {
    return mountWave(query<HTMLCanvasElement>('#js-wave'))
  } catch {
    return null
  }
}

const wave = tryMountWave()
const synth = createSynth()
const $sound = query<HTMLButtonElement>('#js-sound')

const SOUND_KEY = 'wkc-sound'

const readSoundSetting = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

const persistSoundSetting = (on: boolean): void => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // private mode: the setting lives for this page only
  }
}

let soundOn = readSoundSetting()

const renderSoundSwitch = (): void => {
  $sound.textContent = soundOn ? 'sound on' : 'sound off'
  $sound.setAttribute('aria-pressed', String(soundOn))
}

renderSoundSwitch()

$sound.addEventListener('click', (event) => {
  soundOn = !soundOn
  persistSoundSetting(soundOn)
  renderSoundSwitch()
  if (event.detail > 0) $sound.blur()
})

const TOAST_DWELL_MS = 1400
let toastTimer = 0

const showToast = () => {
  $toast.classList.add('toast-show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    $toast.classList.remove('toast-show')
  }, TOAST_DWELL_MS)
}

const copyOnClick = ($input: HTMLInputElement) => {
  $input.addEventListener('click', async () => {
    $input.select()
    try {
      await navigator.clipboard.writeText($input.value)
      showToast()
    } catch {
      // clipboard denied: the selection stays, manual copy still works
    }
  })
}

for (const $input of [$code, $key, $which]) copyOnClick($input)

const showCode = (code: string) => {
  $code.value = code
  $code.style.setProperty('--glyph-fit', glyphFit(code.length))
  $code.classList.remove('is-idle')
}

const applyPress = (press: KeyPress, repeat = false): void => {
  const note = noteFor(press)
  if (soundOn && !repeat) synth.play(note)
  showCode(press.code)
  $key.value = press.key
  $which.value = String(press.which)
  const params = waveFor(press)
  $tune.textContent = `${captionFor(params)} · ${note.name}`
  wave?.retune(params)
}

document.body.addEventListener('keydown', (event) => {
  applyPress(
    { which: event.which, code: event.code, key: event.key },
    event.repeat,
  )
})

mountKeyboard(query<HTMLElement>('#js-keys'), applyPress)
