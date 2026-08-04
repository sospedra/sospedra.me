export const EQ_FREQUENCIES = [
  60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000,
] as const

export const formatFrequency = (frequency: number): string =>
  frequency >= 1000 ? `${frequency / 1000}k` : String(frequency)

export const dbToGain = (decibels: number): number => 10 ** (decibels / 20)
