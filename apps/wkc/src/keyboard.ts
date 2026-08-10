import { tapHaptic } from './haptics.ts'
import { KEY_ROWS, type KeyPress, pressFor } from './signal.ts'

const WORD_LABELS: Record<string, string> = {
  Backspace: 'back',
  Tab: 'tab',
  CapsLock: 'caps',
  Enter: 'enter',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  Space: 'space',
}

const SPOKEN_NAMES: Record<string, string> = {
  Backquote: 'backquote',
  Minus: 'minus',
  Equal: 'equal',
  BracketLeft: 'left bracket',
  BracketRight: 'right bracket',
  Backslash: 'backslash',
  Semicolon: 'semicolon',
  Quote: 'quote',
  Comma: 'comma',
  Period: 'period',
  Slash: 'slash',
}

const SPANS: Record<string, number> = {
  Backspace: 2,
  Tab: 1.5,
  Backslash: 1.5,
  CapsLock: 1.75,
  Enter: 2.25,
  ShiftLeft: 2.25,
  ShiftRight: 2.75,
}

const COMPACT_TRIM = new Set([
  'Backquote',
  'Minus',
  'Equal',
  'Tab',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'CapsLock',
  'Semicolon',
  'Quote',
  'ShiftLeft',
  'ShiftRight',
])

const labelFor = (code: string): string =>
  WORD_LABELS[code] ?? pressFor(code).key

const keyButton = (code: string): HTMLButtonElement => {
  const $key = document.createElement('button')
  $key.type = 'button'
  $key.className = COMPACT_TRIM.has(code) ? 'key key-trim' : 'key'
  $key.dataset.code = code
  $key.tabIndex = -1
  $key.textContent = labelFor(code)
  const span = SPANS[code]
  if (span) $key.style.flexGrow = String(span)
  const spoken = SPOKEN_NAMES[code]
  if (spoken) $key.setAttribute('aria-label', spoken)
  return $key
}

const codeAt = (target: EventTarget | null): string | undefined =>
  target instanceof Element
    ? target.closest<HTMLElement>('.key')?.dataset.code
    : undefined

export const mountKeyboard = (
  $host: HTMLElement,
  onPress: (press: KeyPress) => void,
): void => {
  for (const codes of KEY_ROWS) {
    const $row = document.createElement('div')
    $row.className = 'keys-row'
    $row.append(...codes.map(keyButton))
    $host.append($row)
  }

  $host.addEventListener('pointerdown', (event) => {
    const code = codeAt(event.target)
    if (!code) return
    tapHaptic()
    onPress(pressFor(code))
  })

  $host.addEventListener('click', (event) => {
    const code = codeAt(event.target)
    if (!code) return
    if (event.detail === 0) onPress(pressFor(code))
    else if (event.target instanceof HTMLElement) event.target.blur()
  })
}
