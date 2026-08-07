// Wagner-Fischer with two rows
export const levenshtein = (left: string, right: string): number => {
  if (left === right) return 0
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length
  let row = Array.from({ length: left.length + 1 }, (_, index) => index)
  for (let j = 1; j <= right.length; j += 1) {
    const next = [j]
    for (let i = 1; i <= left.length; i += 1) {
      const substitution = row[i - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      next.push(Math.min(row[i] + 1, next[i - 1] + 1, substitution))
    }
    row = next
  }
  return row[left.length]
}

export const closest = (
  query: string,
  candidates: readonly string[],
): string | undefined => {
  if (candidates.length === 0) return undefined
  return candidates.reduce((best, candidate) =>
    levenshtein(query, candidate) < levenshtein(query, best) ? candidate : best,
  )
}
