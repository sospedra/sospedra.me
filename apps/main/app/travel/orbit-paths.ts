export type OrbitPoint = {
  front: boolean
  x: number
  y: number
}

export type OrbitTrails = {
  back: string
  front: string
}

const mark = (point: OrbitPoint): string =>
  `${point.x.toFixed(1)} ${point.y.toFixed(1)}`

const opening = (point: OrbitPoint): OrbitTrails =>
  point.front
    ? { back: '', front: `M ${mark(point)}` }
    : { back: `M ${mark(point)}`, front: '' }

/* A limb crossing draws its segment on both trails so neither one gaps */
const extended = (
  trails: OrbitTrails,
  previous: OrbitPoint,
  next: OrbitPoint,
): OrbitTrails => {
  const line = ` L ${mark(next)}`
  if (previous.front === next.front) {
    return next.front
      ? { ...trails, front: trails.front + line }
      : { ...trails, back: trails.back + line }
  }
  const branch = ` M ${mark(previous)}${line}`
  return previous.front
    ? { back: trails.back + branch, front: trails.front + line }
    : { back: trails.back + line, front: trails.front + branch }
}

export const orbitPaths = (points: readonly OrbitPoint[]): OrbitTrails => {
  const [first] = points
  if (!first) return { back: '', front: '' }
  return points
    .slice(1)
    .reduce(
      (trails, next, index) => extended(trails, points[index], next),
      opening(first),
    )
}
