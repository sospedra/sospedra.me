import type { GeneratorOptions } from './spg/generator.ts'

const STORAGE_KEY = 'spg-settings'

const parseSettings = (value: unknown): GeneratorOptions | null => {
  if (typeof value !== 'object' || value === null) return null

  const record = value as Partial<Record<keyof GeneratorOptions, unknown>>
  const flags = [record.case, record.leet, record.random, record.symbols]

  if (!flags.every((flag) => typeof flag === 'boolean')) return null
  if (typeof record.length !== 'number' || !Number.isFinite(record.length)) {
    return null
  }

  return {
    case: record.case === true,
    length: record.length,
    leet: record.leet === true,
    random: record.random === true,
    symbols: record.symbols === true,
  }
}

export const loadSettings = (): GeneratorOptions | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    return parseSettings(JSON.parse(raw))
  } catch {
    return null
  }
}

export const saveSettings = (settings: GeneratorOptions): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage can be unavailable (private mode); the app works without it
  }
}
