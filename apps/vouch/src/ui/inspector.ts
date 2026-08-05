import type { TraceObject } from '../scenarios/trace.ts'

const HEX_BYTES_PER_LINE = 32

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function renderObjectHeader(o: TraceObject): HTMLElement {
  const header = el('div', 'object-header')
  header.append(
    el('span', 'object-name', o.name),
    el('span', 'object-type', o.type),
  )
  return header
}

function renderFieldRow([key, value]: [string, string]): HTMLElement {
  const th = el('th', 'field-key', key)
  th.scope = 'row'
  const row = el('tr')
  row.append(th, el('td', 'field-value', value))
  return row
}

function renderFieldsTable(decoded: Record<string, string>): HTMLElement {
  const table = el('table', 'object-fields')
  const body = el('tbody')
  body.append(...Object.entries(decoded).map(renderFieldRow))
  table.append(body)
  return table
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const count = Math.ceil(items.length / size)
  return Array.from({ length: count }, (_, index) =>
    items.slice(index * size, index * size + size),
  )
}

function toBytePairs(hexValue: string): string[] {
  const byteCount = Math.floor(hexValue.length / 2)
  return Array.from({ length: byteCount }, (_, index) =>
    hexValue.slice(index * 2, index * 2 + 2),
  )
}

function hexLines(hexValue: string): string[] {
  return chunk(toBytePairs(hexValue), HEX_BYTES_PER_LINE).map((line) =>
    line.join(' '),
  )
}

function renderObjectHash(hash: string): HTMLElement {
  const line = el('p', 'object-hash')
  line.append(
    el('span', 'object-hash-label', 'hash'),
    el('code', 'object-hash-value', hash),
  )
  return line
}

function renderHexView(o: TraceObject): HTMLElement {
  const view = el('div', 'object-hex-view')
  view.hidden = true
  const pre = el('pre', 'object-hex-block')
  pre.textContent = hexLines(o.hex).join('\n')
  view.append(pre)
  if (o.hash) view.append(renderObjectHash(o.hash))
  return view
}

const TOGGLE_LABEL = { decoded: 'show hex', hex: 'show decoded' } as const

function createViewToggle(
  decodedView: HTMLElement,
  hexView: HTMLElement,
): HTMLButtonElement {
  const button = el('button', 'view-toggle', TOGGLE_LABEL.decoded)
  button.type = 'button'
  button.setAttribute('aria-pressed', 'false')
  button.addEventListener('click', () => {
    const showingHex = button.getAttribute('aria-pressed') === 'true'
    button.setAttribute('aria-pressed', String(!showingHex))
    button.textContent = showingHex ? TOGGLE_LABEL.decoded : TOGGLE_LABEL.hex
    decodedView.hidden = !showingHex
    hexView.hidden = showingHex
  })
  return button
}

export function renderObject(o: TraceObject): HTMLElement {
  const decodedView = renderFieldsTable(o.decoded)
  const hexView = renderHexView(o)
  const card = el('div', 'object-card')
  card.append(
    renderObjectHeader(o),
    createViewToggle(decodedView, hexView),
    decodedView,
    hexView,
  )
  return card
}
