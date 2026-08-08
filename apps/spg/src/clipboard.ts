import { $password, $toast } from './elements.ts'

const TOAST_VISIBLE_MS = 3000

export function setupClipboard(): void {
  const state = { timer: 0 }

  const showToast = () => {
    $toast.textContent = 'Copied to your clipboard!'
    $toast.classList.add('is-visible')
    window.clearTimeout(state.timer)
    state.timer = window.setTimeout(() => {
      $toast.classList.remove('is-visible')
    }, TOAST_VISIBLE_MS)
  }

  $password.addEventListener('click', () => {
    if ($password.value === '') return

    $password.select()
    navigator.clipboard
      .writeText($password.value)
      .then(showToast, () => undefined)
  })
}
