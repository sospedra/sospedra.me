export const capturedEvents = new WeakSet<KeyboardEvent>()

export const captureEvent = (event: KeyboardEvent) => {
  capturedEvents.add(event)
  event.preventDefault()
  event.stopImmediatePropagation()
}

// shift does not count: Shift+G is still a character-only shortcut
export const isCharacterCombo = (combo: string) => {
  const parts = combo.split('+')
  const key = parts.at(-1) ?? ''
  const hasRealModifier = parts
    .slice(0, -1)
    .some((part) => part.toLowerCase() !== 'shift')
  return !hasRealModifier && key.length === 1
}

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
    ),
  )
}

export const hasUnexpectedModifier = (event: KeyboardEvent, combo: string) => {
  const binding = combo.toLowerCase()
  const usesMod = binding.includes('$mod+')
  const matchesShiftedCharacter =
    event.shiftKey && !binding.includes('+') && event.key === combo

  const unexpectedMeta = event.metaKey && !usesMod && !binding.includes('meta+')
  const unexpectedCtrl =
    event.ctrlKey &&
    !usesMod &&
    !binding.includes('control+') &&
    !binding.includes('ctrl+')
  const unexpectedAlt = event.altKey && !binding.includes('alt+')
  const unexpectedShift =
    event.shiftKey && !binding.includes('shift+') && !matchesShiftedCharacter

  return unexpectedMeta || unexpectedCtrl || unexpectedAlt || unexpectedShift
}

export const isModifiedOrRepeatedKey = (event: KeyboardEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.altKey ||
  event.shiftKey ||
  event.repeat

// Space and Enter must keep activating a focused control (WCAG 2.1.1);
// scene traps on them only fire when focus rests on a non-interactive node
export const ACTIVATION_COMBOS = new Set(['space', 'enter'])

export const isActivationTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('a, button, [role="button"], summary'))
