function element<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error(`Missing element: ${selector}`)
  return node
}

export const $case = element<HTMLInputElement>('#js-case')
export const $hint = element<HTMLParagraphElement>('#js-hint')
export const $leet = element<HTMLInputElement>('#js-leet')
export const $password = element<HTMLInputElement>('#js-password')
export const $random = element<HTMLInputElement>('#js-random')
export const $renew = element<HTMLButtonElement>('#js-renew')
export const $slider = element<HTMLInputElement>('#js-slider')
export const $symbols = element<HTMLInputElement>('#js-symbols')
export const $toast = element<HTMLElement>('#js-toast')
