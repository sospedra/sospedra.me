export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

export const logoImg = (className: string, size: number): HTMLImageElement => {
  const img = el('img', className)
  img.src = '/logo-32.png'
  img.alt = ''
  img.width = size
  img.height = size
  return img
}

export type TitleBarParts = {
  bar: HTMLElement
  title: HTMLElement
  minimizeButton: HTMLButtonElement
  maximizeButton: HTMLButtonElement
  closeButton: HTMLButtonElement
}

export const titleBar = (text: string): TitleBarParts => {
  const title = el('div', 'title-bar-text', text)
  const brand = el('div', 'title-bar-brand')
  brand.append(logoImg('title-icon', 16), title)
  const controls = el('div', 'title-bar-controls')
  const buttons = ['Minimize', 'Maximize', 'Close'].map((label) => {
    const control = el('button')
    control.setAttribute('aria-label', label)
    controls.append(control)
    return control
  })
  const bar = el('div', 'title-bar')
  bar.append(brand, controls)
  return {
    bar,
    title,
    minimizeButton: buttons[0],
    maximizeButton: buttons[1],
    closeButton: buttons[2],
  }
}
