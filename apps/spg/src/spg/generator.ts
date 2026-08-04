import { getLength, getMaxLength } from './password.ts'
import { randomInt } from './random-int.ts'
import { transformCase } from './transform/case.ts'
import { transformLeet } from './transform/leet.ts'
import { transformLength } from './transform/length.ts'
import { transformRandom } from './transform/random.ts'
import { transformSymbols } from './transform/symbols.ts'

export type GeneratorOptions = {
  case: boolean
  length: number
  leet: boolean
  random: boolean
  symbols: boolean
}

export type GeneratorArgs = number | Partial<GeneratorOptions>

export type Generator = (args?: GeneratorArgs) => string | null

const DEFAULT_OPTIONS: GeneratorOptions = {
  case: false,
  length: 24,
  leet: false,
  random: false,
  symbols: false,
}

const resolveOptions = (args: GeneratorArgs = {}): GeneratorOptions => {
  if (typeof args === 'number') return { ...DEFAULT_OPTIONS, length: args }
  return { ...DEFAULT_OPTIONS, ...args }
}

export function createGenerator(sentences: string[] = ['']): Generator {
  const maxLength = getMaxLength(sentences)

  return function generate(args) {
    const options = resolveOptions(args)
    const length = getLength(options.length, maxLength)
    const candidates = sentences.filter((sentence) => sentence.length >= length)
    const base = candidates.at(randomInt(0, candidates.length - 1))

    if (!base) return null

    // transformSymbols consumes the spaces, so it stays last
    const pipeline = [
      transformLength(length),
      ...(options.leet ? [transformLeet] : []),
      ...(options.case ? [transformCase] : []),
      ...(options.random ? [transformRandom] : []),
      transformSymbols(options.symbols),
    ]

    return pipeline.reduce((memo, transform) => transform(memo), base)
  }
}
