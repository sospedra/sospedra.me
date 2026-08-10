import {
  $case,
  $hint,
  $leet,
  $password,
  $random,
  $renew,
  $reset,
  $slider,
  $symbols,
} from './elements.ts'
import { tapHaptic } from './haptics.ts'
import { loadSettings, saveSettings } from './settings.ts'
import type { Generator, GeneratorOptions } from './spg/generator.ts'
import { spg } from './spg/spg.ts'

const OFFLINE_MESSAGE = 'wikipedia is unreachable, hit renew'

const DEFAULT_SETTINGS: GeneratorOptions = {
  case: false,
  length: 24,
  leet: false,
  random: false,
  symbols: false,
}

const STRENGTH_LABEL = {
  weak: 'Weak',
  good: 'Good',
  strong: 'Strong 💪',
} as const

type Strength = keyof typeof STRENGTH_LABEL

const strengthFor = (password: string): Strength => {
  const surplus = password.length - 8

  if (surplus < 18) return 'weak'
  if (surplus < 24) return 'good'
  return 'strong'
}

const readOptions = (): GeneratorOptions => ({
  case: $case.checked,
  length: Number($slider.value),
  leet: $leet.checked,
  random: $random.checked,
  symbols: $symbols.checked,
})

const applySettings = (settings: GeneratorOptions): void => {
  $case.checked = settings.case
  $leet.checked = settings.leet
  $random.checked = settings.random
  $symbols.checked = settings.symbols
  $slider.value = String(settings.length)
}

export function setupGenerator(): void {
  const state: { generator: Generator | null } = { generator: null }

  applySettings(loadSettings() ?? DEFAULT_SETTINGS)

  const update = () => {
    const options = readOptions()
    const password = state.generator ? state.generator(options) : null
    if (password === null) return

    saveSettings(options)

    const strength = strengthFor(password)
    $hint.textContent = `${password.length} chars · ${STRENGTH_LABEL[strength]}`
    $hint.dataset.strength = strength
    $password.value = password
  }

  const renew = async () => {
    $password.placeholder = 'loading . . .'
    $password.classList.add('is-loading')

    try {
      state.generator = await spg()
      update()
    } catch {
      $password.placeholder = OFFLINE_MESSAGE
      $hint.textContent = OFFLINE_MESSAGE
      delete $hint.dataset.strength
    } finally {
      $password.classList.remove('is-loading')
    }
  }

  $renew.addEventListener('click', () => {
    tapHaptic()
    void renew()
  })

  $reset.addEventListener('click', () => {
    tapHaptic()
    applySettings(DEFAULT_SETTINGS)
    update()
  })

  for (const control of [$case, $leet, $random, $symbols]) {
    control.addEventListener('change', () => {
      tapHaptic()
      update()
    })
  }

  $slider.addEventListener('input', update)

  void renew()
}
