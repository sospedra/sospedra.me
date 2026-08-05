export type JukeRecord = {
  id: string
  title: string
  oneLiner: string
  url: string
  pressed: number
  lastSpin?: string
  stack: string
  status: 'pressed' | 'test-pressing'
}

/* the strip frame reads in columns of six: letter = column, number = slot */
export const selectorCode = (index: number): string => {
  const letter = String.fromCharCode(65 + Math.floor(index / 6))
  const slot = (index % 6) + 1
  return `${letter}${slot}`
}

export const RECORDS: JukeRecord[] = [
  {
    id: 'vouch',
    title: 'vouch',
    oneLiner: 'Signed API responses with sparse merkle witnesses.',
    url: 'https://vouch.sospedra.me',
    pressed: 2026,
    stack: 'TypeScript, ed25519',
    status: 'test-pressing',
  },
  {
    id: 'sige',
    title: 'sige',
    oneLiner: 'Sealed-identity escrow behind a time-lock delay.',
    url: 'https://sige.sospedra.me',
    pressed: 2026,
    stack: 'TypeScript, sequential squaring',
    status: 'test-pressing',
  },
  {
    id: 'aol',
    title: 'aol',
    oneLiner: 'A serverless peer mesh in the browser.',
    url: 'https://aol.sospedra.me',
    pressed: 2026,
    stack: 'WebRTC, gossip',
    status: 'test-pressing',
  },
  {
    id: 'olympics',
    title: 'olympics',
    oneLiner: 'Tokyo 2020 results, frozen in amber.',
    url: 'https://olympics.sospedra.me',
    pressed: 2021,
    stack: 'Static snapshot',
    status: 'test-pressing',
  },
  {
    id: 'bonfire',
    title: 'bonfire',
    oneLiner: 'A quiet fire to sit around.',
    url: 'https://bonfire.sospedra.me',
    pressed: 2020,
    stack: 'Next, Tailwind',
    status: 'pressed',
  },
  {
    id: 'wkc',
    title: 'which key code',
    oneLiner: 'Press any key, read its code.',
    url: 'https://keycodes.sospedra.me',
    pressed: 2019,
    stack: 'Vite, vanilla TS',
    status: 'test-pressing',
  },
  {
    id: 'spg',
    title: 'semantic password generator',
    oneLiner: 'Passwords you can read out loud.',
    url: 'https://spg.sospedra.me',
    pressed: 2017,
    stack: 'TypeScript, zero deps',
    status: 'test-pressing',
  },
  {
    id: 'len',
    title: 'len',
    oneLiner: 'Safe array length access.',
    url: 'https://len.sospedra.me',
    pressed: 2017,
    stack: 'TypeScript micro-lib',
    status: 'test-pressing',
  },
  {
    id: 'sti',
    title: 'sti',
    oneLiner: 'Semver to integer, safely.',
    url: 'https://sti.sospedra.me',
    pressed: 2017,
    stack: 'TypeScript micro-lib',
    status: 'test-pressing',
  },
  {
    id: 'logatim',
    title: 'logatim',
    oneLiner: 'Isomorphic logger with levels and ANSI styles.',
    url: 'https://logatim.sospedra.me',
    pressed: 2016,
    stack: 'TypeScript, ESM',
    status: 'test-pressing',
  },
  {
    id: 'rfm',
    title: 'rfm',
    oneLiner: 'Live issue search over the old repo.',
    url: 'https://rfm.sospedra.me',
    pressed: 2016,
    stack: 'GitHub issues API',
    status: 'test-pressing',
  },
]
