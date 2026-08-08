export const short = (hex: string): string => hex.slice(0, 8)

export const sample = <T>(items: T[], count: number): T[] => {
  const pool = [...items]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const a = pool[index] as T
    pool[index] = pool[swap] as T
    pool[swap] = a
  }
  return pool.slice(0, count)
}
