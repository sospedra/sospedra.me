/* iOS Safari has no Vibration API; toggling a hidden switch control plays
   the system haptic instead (iOS 17.4+, discovered by haptics.lochie.me).
   The switch tick has one fixed strength, so patterns become spaced ticks. */

let switchLabel: HTMLLabelElement | null = null

const ensureSwitchLabel = () => {
  if (switchLabel?.isConnected) return switchLabel
  const label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.display = 'none'
  const control = document.createElement('input')
  control.type = 'checkbox'
  control.setAttribute('switch', '')
  control.tabIndex = -1
  label.append(control)
  document.body.append(label)
  switchLabel = label
  return label
}

const clickSwitch = () => ensureSwitchLabel().click()

const play = (pattern: readonly number[], tickDelays: readonly number[]) => {
  if (typeof window === 'undefined') return
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate([...pattern])
    return
  }
  for (const delay of tickDelays) {
    if (delay === 0) clickSwitch()
    else window.setTimeout(clickSwitch, delay)
  }
}

/** one light tick: key presses, toggles, gesture commits */
export const tapHaptic = () => play([10], [0])

/** two ticks: success, completion, copied */
export const pulseHaptic = () => play([12, 80, 12], [0, 90])

/** three beats: errors, losses, timeouts */
export const buzzHaptic = () => play([35, 70, 35, 70, 35], [0, 100, 200])
