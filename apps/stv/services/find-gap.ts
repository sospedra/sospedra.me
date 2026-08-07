// times read as HHMM numbers: a difference of 200 is exactly two hours
const GAP_THRESHOLD = 200

export const findGap = (left: string, right: string): boolean => {
  const gap = Number(right.replace(':', '')) - Number(left.replace(':', ''))
  return gap >= GAP_THRESHOLD
}
