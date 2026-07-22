'use client'

import { scrollMarkedScene, useHotkeys } from 'service/hotkeys'

const PAGE_SELECTOR = '[data-manual-page]'

// `[` / `]` flip between the manual's authored sheets
export default function ManualKeys() {
  useHotkeys([
    [
      '[',
      (event) => {
        if (scrollMarkedScene(PAGE_SELECTOR, -1)) event.preventDefault()
      },
    ],
    [
      ']',
      (event) => {
        if (scrollMarkedScene(PAGE_SELECTOR, 1)) event.preventDefault()
      },
    ],
  ])

  return null
}
