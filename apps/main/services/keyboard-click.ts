// click events fired by Enter or Space carry detail 0
export const isKeyboardClick = (event: { detail: number }): boolean =>
  event.detail === 0
