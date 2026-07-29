export const EQ_FREQUENCIES = [
  60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000,
] as const

export type EqualizerPresetId = 'flat' | 'focus' | 'night' | 'warm'

export type EqualizerPreset = {
  bands: readonly number[]
  id: EqualizerPresetId
  label: string
  preamp: number
}

export const EQUALIZER_PRESETS: readonly EqualizerPreset[] = [
  {
    id: 'flat',
    label: 'Flat',
    preamp: 0,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'warm',
    label: 'Warm relay',
    preamp: -1,
    bands: [4, 3, 2, 1, 0, -1, -2, -2, -1, 0],
  },
  {
    id: 'focus',
    label: 'Voice focus',
    preamp: -2,
    bands: [-3, -2, -1, 1, 3, 4, 3, 1, -1, -2],
  },
  {
    id: 'night',
    label: 'Night drive',
    preamp: -2,
    bands: [5, 3, 1, -1, -2, 0, 2, 4, 5, 3],
  },
] as const

export const DEFAULT_EQ_BANDS = [...EQUALIZER_PRESETS[1].bands]

export const formatFrequency = (frequency: number): string =>
  frequency >= 1000 ? `${frequency / 1000}k` : String(frequency)

export const dbToGain = (decibels: number): number => 10 ** (decibels / 20)
