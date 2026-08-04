export function randomInt(min: number, max: number): number {
  const range = max - min + 1
  const [value] = crypto.getRandomValues(new Uint32Array(1))

  // modulo bias is negligible for the tiny ranges used here
  return min + (value % range)
}
