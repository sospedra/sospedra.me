export function transformLength(length: number) {
  return (base: string): string => {
    const words = base.split(' ')
    const kept: string[] = []
    let stack = 0

    for (const word of words) {
      kept.push(word)
      stack += word.length
      if (stack >= length) break
    }

    return kept.join(' ')
  }
}
