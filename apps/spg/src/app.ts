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

const hintFor = (password: string): string => {
  const surplus = password.length - 8

  if (surplus < 18) return 'Weak'
  if (surplus < 24) return 'Good'
  return 'Strong 💪'
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

    $hint.textContent = hintFor(password)
    $password.value = password
  }

  const renew = async () => {
    $password.placeholder = 'loading . . .'
    $password.classList.add('is-loading')

    try {
      state.generator = await spg()
      update()
    } catch {
      $password.placeholder = 'wikipedia is unreachable, hit renew'
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
