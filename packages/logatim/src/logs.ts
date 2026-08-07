import { EOL, STYLES, type StyleName } from './constants.ts'
import { isObject } from './utils.ts'

export type Chunk =
  | { key: 'str'; val: unknown }
  | { key: 'style'; val: StyleName }

const resolveArg = (arg: unknown): unknown =>
  typeof arg === 'function' ? arg() : arg

const stringifyArg = (arg: unknown): string =>
  isObject(arg) ? JSON.stringify(arg) : String(arg)

export const castMessage = (args: unknown[]): string =>
  args
    .map(resolveArg)
    .reduce<string>((memo, arg) => `${memo} ${stringifyArg(arg)}`.trim(), '')

const ansiOf = (chunk: Chunk): string =>
  chunk.key === 'style' ? STYLES[chunk.val].ansi : String(chunk.val)

export const buildNodeOutput = (chunks: Chunk[], message: string): string =>
  `${chunks.map(ansiOf).join('')}${message}${EOL}`

// browser output shape: ['%cone%ctwo tail', ...one css declaration block per %c]
export const buildBrowserOutput = (
  chunks: Chunk[],
  message: string,
): string[] => {
  const messages: string[] = []
  const styles: string[] = []
  const pending: string[] = []

  const flushPending = () => {
    if (pending.length === 0) return
    styles.push(pending.join(';'))
    pending.length = 0
  }

  for (const chunk of chunks) {
    if (chunk.key === 'style') {
      pending.push(STYLES[chunk.val].css)
      continue
    }

    messages.push(`%c${chunk.val}`)
    flushPending()
  }
  flushPending()

  if (message) {
    const lastChunk = chunks.at(-1)
    messages.push(lastChunk?.key === 'style' ? `%c${message}` : message)
  }

  return [messages.join(''), ...styles]
}
