import {
  $case,
  $hint,
  $leet,
  $password,
  $random,
  $renew,
  $slider,
  $symbols,
} from './elements.ts'
import type { Generator } from './spg/generator.ts'
import { spg } from './spg/spg.ts'

const OFFLINE_MESSAGE = 'wikipedia is unreachable, hit renew'

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

const readOptions = () => ({
  case: $case.checked,
  length: Number($slider.value),
  leet: $leet.checked,
  random: $random.checked,
  symbols: $symbols.checked,
})

export function setupGenerator(): void {
  const state: { generator: Generator | null } = { generator: null }

  const update = () => {
    const password = state.generator ? state.generator(readOptions()) : null
    if (password === null) return

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
    void renew()
  })

  for (const control of [$case, $leet, $random, $symbols]) {
    control.addEventListener('change', update)
  }

  $slider.addEventListener('input', update)

  void renew()
}
