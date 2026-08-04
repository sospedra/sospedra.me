import { backgroundFor } from './hue.ts'

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

const $which = query<HTMLInputElement>('#js-which')
const $code = query<HTMLInputElement>('#js-code')
const $key = query<HTMLInputElement>('#js-key')
const $toast = query<HTMLElement>('#js-toast')

$toast.addEventListener('animationend', () => {
  $toast.classList.remove('toast-in')
})

const copyOnClick = ($input: HTMLInputElement) => {
  $input.addEventListener('click', async () => {
    $input.select()
    try {
      await navigator.clipboard.writeText($input.value)
      $toast.classList.add('toast-in')
    } catch {
      // clipboard denied: the selection stays, manual copy still works
    }
  })
}

for (const $input of [$which, $code, $key]) copyOnClick($input)

document.body.addEventListener('keydown', (event) => {
  $which.value = `${event.which}`
  $code.value = event.code
  $key.value = event.key
  document.body.style.background = backgroundFor(event.which)
})
