export const DAY_MS = 86_400_000

export const utcDayString = (date: Date): string =>
  date.toISOString().slice(0, 10)
