export const nonNegativeFinite = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0
