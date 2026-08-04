import { $password, $toast } from './elements.ts'

const showToast = () => {
  $toast.style.animation = 'fadein 4s'
  $toast.addEventListener(
    'animationend',
    () => {
      $toast.style.animation = ''
    },
    { once: true },
  )
}

export function setupClipboard(): void {
  $password.addEventListener('click', () => {
    if ($password.value === '') return

    $password.select()
    navigator.clipboard
      .writeText($password.value)
      .then(showToast, () => undefined)
  })
}
