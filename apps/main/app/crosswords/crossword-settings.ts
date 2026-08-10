export type GameSettings = {
  showTimer: boolean
  skipFilled: boolean
  autoCheck: boolean
  soundLevel: SoundLevel
  solveMode: SolveMode
  largeText: boolean
  highContrast: boolean
}

export type SolveMode = 'guided' | 'standard'
export type SoundLevel = 0 | 1 | 2 | 3

export type Scope = 'cell' | 'answer' | 'puzzle'

export const MAX_SOUND_LEVEL: SoundLevel = 3
export const SOUND_GAINS = {
  carriageShift: [0, 0.05, 0.08, 0.11],
  deadKey: [0, 0.07, 0.11, 0.15],
  fanfare: [0, 0.35, 0.6, 0.85],
  keyClick: [0, 0.055, 0.09, 0.12],
  typewriterBell: [0, 0.08, 0.12, 0.16],
} as const

export const SOLVE_MODES = ['standard', 'guided'] as const
export const SCOPE_VALUES = ['cell', 'answer', 'puzzle'] as const

export const DEFAULT_SETTINGS: GameSettings = {
  showTimer: true,
  skipFilled: true,
  autoCheck: false,
  soundLevel: 3,
  solveMode: 'standard',
  largeText: false,
  highContrast: false,
}

export const SETTINGS_KEY = 'crossword:v1:settings'
export const LOCALE_KEY = 'crossword:v1:locale'

const BOOLEAN_SETTINGS = [
  'showTimer',
  'skipFilled',
  'autoCheck',
  'largeText',
  'highContrast',
] as const

type SavedSettings = Partial<GameSettings> & { keySounds?: boolean }

const restoredSoundLevel = (saved: SavedSettings): SoundLevel => {
  const { soundLevel } = saved
  if (
    typeof soundLevel === 'number' &&
    soundLevel >= 0 &&
    soundLevel <= MAX_SOUND_LEVEL
  ) {
    return soundLevel as SoundLevel
  }
  // pre-soundLevel saves stored a keySounds boolean
  if (saved.keySounds === false) return 0
  return DEFAULT_SETTINGS.soundLevel
}

export const parseSavedSettings = (value: unknown): GameSettings => {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS
  const saved = value as SavedSettings
  const next = { ...DEFAULT_SETTINGS }
  for (const key of BOOLEAN_SETTINGS) {
    const flag = saved[key]
    if (typeof flag === 'boolean') next[key] = flag
  }
  next.soundLevel = restoredSoundLevel(saved)
  if (saved.solveMode === 'guided' || saved.solveMode === 'standard') {
    next.solveMode = saved.solveMode
  }
  return next
}
