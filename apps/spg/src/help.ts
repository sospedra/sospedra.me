import { $dialog, $help } from './elements.ts'

export function setupHelp(): void {
  $help.addEventListener('click', () => {
    $dialog.showModal()
  })

  $dialog.addEventListener('click', (event) => {
    if (event.target === $dialog) $dialog.close()
  })
}
